import crypto from 'node:crypto';

const STATUSES = new Set(['received', 'consulting', 'assigned', 'in_progress', 'completed', 'cancelled']);
const TRACKS = new Set(['scuba', 'freediving']);
const EDUCATION_CONSENT_VERSION = '2026-08-09';

function text(value, max = 500) {
  return String(value ?? '').trim().slice(0, max);
}

function isValidDateOnly(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

function mapApplication(row) {
  return {
    id: row.id,
    userId: row.user_id,
    userEmail: row.user_email || '',
    username: row.username || '',
    track: row.track,
    courseId: row.course_id,
    courseLevel: row.course_level,
    courseTitle: row.course_title,
    applicantName: row.applicant_name,
    contact: row.contact,
    preferredRegion: row.preferred_region,
    preferredSchedule: row.preferred_schedule,
    preferredDate: row.preferred_date,
    privacyConsent: Boolean(row.privacy_consent),
    thirdPartyConsent: Boolean(row.third_party_consent),
    consentedAt: row.consented_at,
    consentVersion: row.consent_version,
    status: row.status,
    assignedResortId: row.assigned_resort_id,
    assignedResortName: row.assigned_resort_name || '',
    assignedInstructorUserId: row.assigned_instructor_user_id,
    assignedInstructorName: row.assigned_instructor_name || '',
    assignedAdminUserId: row.assigned_admin_user_id,
    adminNote: row.admin_note,
    assignedAt: row.assigned_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT_APPLICATION = `
  SELECT a.*,
         u.email AS user_email, u.username,
         r.full_name AS assigned_resort_name,
         COALESCE(ip.full_name, iu.username, '') AS assigned_instructor_name
    FROM app_education_applications a
    LEFT JOIN app_users u ON u.id::text=a.user_id
    LEFT JOIN app_profiles r ON r.id::text=a.assigned_resort_id AND lower(COALESCE(r.account_type,''))='resort'
    LEFT JOIN app_users iu ON iu.id::text=a.assigned_instructor_user_id
    LEFT JOIN app_profiles ip ON ip.id::text=a.assigned_instructor_user_id
`;

export function registerEducationApplicationRoutes(app, { pool, getAuthUserId, authRateLimit, requireAdmin }) {
  app.get('/api/education-applications/me', authRateLimit(60, 60_000), async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    try {
      const result = await pool.query(`${SELECT_APPLICATION} WHERE a.user_id=$1 ORDER BY a.created_at DESC`, [String(userId)]);
      return res.json({ ok: true, applications: result.rows.map(mapApplication) });
    } catch (error) {
      console.error('[education] user list failed', error);
      return res.status(500).json({ error: 'education_applications_read_failed' });
    }
  });

  app.post('/api/education-applications', authRateLimit(12, 60_000), async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const track = text(req.body?.track, 30);
    const courseId = text(req.body?.courseId, 100);
    const courseTitle = text(req.body?.courseTitle, 160);
    const applicantName = text(req.body?.applicantName, 120);
    const contact = text(req.body?.contact, 200);
    const preferredDate = text(req.body?.preferredDate, 10);
    const dateIsValid = isValidDateOnly(preferredDate);
    const privacyConsent = req.body?.privacyConsent === true;
    const thirdPartyConsent = req.body?.thirdPartyConsent === true;
    if (!TRACKS.has(track) || !courseId || !courseTitle || !applicantName || !contact || !dateIsValid) {
      return res.status(400).json({ error: 'invalid_education_application' });
    }
    if (!privacyConsent || !thirdPartyConsent) {
      return res.status(400).json({ error: 'education_application_consent_required' });
    }
    const id = `edu_${crypto.randomUUID()}`;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const inserted = await client.query(
        `INSERT INTO app_education_applications
          (id,user_id,track,course_id,course_level,course_title,applicant_name,contact,preferred_region,preferred_schedule,
           preferred_date,privacy_consent,third_party_consent,consented_at,consent_version)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true,true,now(),$12) RETURNING *`,
        [id, String(userId), track, courseId, text(req.body?.courseLevel, 50), courseTitle, applicantName, contact,
          text(req.body?.preferredRegion, 200), preferredDate, preferredDate, EDUCATION_CONSENT_VERSION]
      );
      await client.query(
        `INSERT INTO app_education_application_history(application_id,actor_user_id,action,to_status,snapshot)
         VALUES ($1,$2,'created','received',$3::jsonb)`,
        [id, String(userId), JSON.stringify(inserted.rows[0])]
      );
      await client.query('COMMIT');
      return res.status(201).json({ ok: true, application: mapApplication(inserted.rows[0]) });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[education] create failed', error);
      return res.status(500).json({ error: 'education_application_create_failed' });
    } finally {
      client.release();
    }
  });

  app.patch('/api/education-applications/:id/cancel', authRateLimit(12, 60_000), async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const id = text(req.params.id, 120);
    if (!id) return res.status(400).json({ error: 'invalid_education_application' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const current = await client.query(
        'SELECT * FROM app_education_applications WHERE id=$1 AND user_id=$2 FOR UPDATE',
        [id, String(userId)]
      );
      if (!current.rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'education_application_not_found' });
      }
      const previous = current.rows[0];
      if (previous.status !== 'received') {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: 'education_application_cancellation_not_allowed',
          status: previous.status,
        });
      }

      const updated = await client.query(
        `UPDATE app_education_applications
            SET status='cancelled',updated_at=now()
          WHERE id=$1 RETURNING *`,
        [id]
      );
      await client.query(
        `INSERT INTO app_education_application_history(application_id,actor_user_id,action,from_status,to_status,snapshot)
         VALUES ($1,$2,'user_cancelled','received','cancelled',$3::jsonb)`,
        [id, String(userId), JSON.stringify(updated.rows[0])]
      );
      await client.query('COMMIT');
      return res.json({ ok: true, application: mapApplication(updated.rows[0]) });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[education] user cancellation failed', error);
      return res.status(500).json({ error: 'education_application_cancel_failed' });
    } finally {
      client.release();
    }
  });

  app.get('/api/admin/education-applications', requireAdmin, async (req, res) => {
    const status = text(req.query?.status, 30);
    const query = text(req.query?.q, 120).toLowerCase();
    const values = [];
    const where = [];
    if (status && STATUSES.has(status)) { values.push(status); where.push(`a.status=$${values.length}`); }
    if (query) { values.push(`%${query}%`); where.push(`lower(concat_ws(' ',a.applicant_name,a.contact,a.course_title,u.email,u.username)) LIKE $${values.length}`); }
    const limit = Math.min(100, Math.max(10, Number(req.query?.limit || 50)));
    try {
      const result = await pool.query(`${SELECT_APPLICATION} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY a.created_at DESC LIMIT ${limit}`, values);
      const counts = await pool.query('SELECT status,COUNT(*)::int AS count FROM app_education_applications GROUP BY status');
      return res.json({ ok: true, applications: result.rows.map(mapApplication), counts: counts.rows });
    } catch (error) {
      console.error('[education] admin list failed', error);
      return res.status(500).json({ error: 'admin_education_applications_read_failed' });
    }
  });

  app.get('/api/admin/education-applications/options', requireAdmin, async (_req, res) => {
    try {
      const [resorts, instructors] = await Promise.all([
        pool.query(`SELECT id::text AS id,full_name AS name,resort_country AS country,resort_region AS region
                      FROM app_profiles WHERE lower(COALESCE(account_type,''))='resort' ORDER BY full_name LIMIT 1000`),
        pool.query(`SELECT u.id::text AS id,u.email,u.username,COALESCE(p.full_name,u.username) AS name
                      FROM app_users u LEFT JOIN app_profiles p ON p.id::text=u.id::text
                     WHERE lower(COALESCE(p.scuba_level,'')) LIKE '%강사%' OR lower(COALESCE(p.freediving_level,'')) LIKE '%강사%' OR lower(COALESCE(u.role,'')) IN ('resort','instructor','admin')
                     ORDER BY name LIMIT 500`),
      ]);
      return res.json({ ok: true, resorts: resorts.rows, instructors: instructors.rows });
    } catch (error) {
      console.error('[education] options failed', error);
      return res.status(500).json({ error: 'admin_education_options_failed' });
    }
  });

  app.patch('/api/admin/education-applications/:id', requireAdmin, async (req, res) => {
    const id = text(req.params.id, 120);
    const status = text(req.body?.status, 30);
    if (!id || (status && !STATUSES.has(status))) return res.status(400).json({ error: 'invalid_education_assignment' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const before = await client.query('SELECT * FROM app_education_applications WHERE id=$1 FOR UPDATE', [id]);
      if (!before.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'education_application_not_found' }); }
      const previous = before.rows[0];
      const nextStatus = status || previous.status;
      const resortId = text(req.body?.assignedResortId, 120) || null;
      const instructorId = text(req.body?.assignedInstructorUserId, 120) || null;
      const adminId = text(req.adminAuth?.userId, 120) || null;
      const updated = await client.query(
        `UPDATE app_education_applications SET status=$2,assigned_resort_id=$3,assigned_instructor_user_id=$4,
           assigned_admin_user_id=$5,admin_note=$6,
           assigned_at=CASE WHEN $2='assigned' AND assigned_at IS NULL THEN now() ELSE assigned_at END,
           completed_at=CASE WHEN $2='completed' THEN now() ELSE completed_at END,updated_at=now()
         WHERE id=$1 RETURNING *`,
        [id, nextStatus, resortId, instructorId, adminId, text(req.body?.adminNote, 4000)]
      );
      await client.query(
        `INSERT INTO app_education_application_history(application_id,actor_user_id,action,from_status,to_status,note,snapshot)
         VALUES ($1,$2,'admin_updated',$3,$4,$5,$6::jsonb)`,
        [id, adminId, previous.status, nextStatus, text(req.body?.adminNote, 4000), JSON.stringify(updated.rows[0])]
      );
      if (previous.status !== nextStatus) {
        await client.query(
          `INSERT INTO app_notifications(id,user_id,type,title,body,deep_link,source,event_key,data)
           VALUES ($1,$2,'education','교육 신청 상태가 변경되었습니다',$3,'divergram://dive-education','education',$4,$5::jsonb)
           ON CONFLICT (user_id,event_key) WHERE event_key IS NOT NULL AND event_key <> '' DO UPDATE SET title=EXCLUDED.title,body=EXCLUDED.body,data=EXCLUDED.data,is_read=false,updated_at=now()`,
          [`notification_${crypto.randomUUID()}`, previous.user_id, `${previous.course_title} 신청 상태: ${nextStatus}`, `education:${id}:${nextStatus}`, JSON.stringify({ applicationId: id, status: nextStatus })]
        );
      }
      await client.query('COMMIT');
      const full = await pool.query(`${SELECT_APPLICATION} WHERE a.id=$1`, [id]);
      return res.json({ ok: true, application: mapApplication(full.rows[0]) });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[education] admin update failed', error);
      return res.status(500).json({ error: 'admin_education_application_update_failed' });
    } finally {
      client.release();
    }
  });
}
