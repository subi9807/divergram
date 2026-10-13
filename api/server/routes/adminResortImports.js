import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import multer from 'multer';

const text = (value) => String(value || '').trim();
const list = (value) => Array.from(new Set((Array.isArray(value) ? value : []).map(text).filter(Boolean)));
const slug = (value) => text(value).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 42) || 'resort';
const RESORT_IMAGE_DIR = process.env.MEDIA_UPLOAD_DIR || '/home/divergram/uploads/media';
const IMAGE_EXTENSIONS = new Map([['image/jpeg','jpg'],['image/png','png'],['image/webp','webp'],['image/heic','heic']]);
const resortImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 20 },
  fileFilter: (_req, file, done) => IMAGE_EXTENSIONS.has(String(file.mimetype || '').toLowerCase()) ? done(null,true) : done(new Error('unsupported_image_type')),
});

export function registerAdminResortImportRoutes(app, { pool, requireAdmin, getAuthUserId }) {
  app.post('/api/admin/resort-images', requireAdmin, (req, res) => {
    resortImageUpload.array('files',20)(req,res,async (uploadError) => {
      if (uploadError) return res.status(uploadError?.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ok:false,error:uploadError?.code === 'LIMIT_FILE_SIZE' ? 'resort_image_too_large' : 'resort_image_upload_invalid'});
      const files = Array.isArray(req.files) ? req.files : [];
      if (!files.length) return res.status(400).json({ok:false,error:'resort_images_required'});
      const written = [];
      try {
        await fs.mkdir(RESORT_IMAGE_DIR,{recursive:true,mode:0o755});
        for (const file of files) {
          const extension = IMAGE_EXTENSIONS.get(String(file.mimetype || '').toLowerCase());
          const fileName = `${crypto.randomUUID()}.${extension}`;
          await fs.writeFile(path.join(RESORT_IMAGE_DIR,fileName),file.buffer,{mode:0o644});
          written.push(fileName);
        }
        const base = String(process.env.PUBLIC_API_BASE_URL || 'https://api.divergram.com').replace(/\/+$/,'');
        res.json({ok:true,images:written.map((file) => ({file,url:`${base}/api/uploads/${file}`}))});
      } catch (error) {
        await Promise.all(written.map((file) => fs.unlink(path.join(RESORT_IMAGE_DIR,file)).catch(() => undefined)));
        res.status(500).json({ok:false,error:'resort_image_upload_failed',detail:String(error?.message||error)});
      }
    });
  });

  app.post('/api/resorts/:id/owner-claims', async (req, res) => {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ ok: false, error: 'unauthorized' });
    const resortId = text(req.params.id);
    const evidence = req.body?.evidence && typeof req.body.evidence === 'object' ? req.body.evidence : {};
    try {
      const q = await pool.query(`INSERT INTO app_resort_owner_claims(resort_id,claimant_user_id,evidence,status,updated_at) VALUES($1,$2,$3::jsonb,'pending',now()) ON CONFLICT(resort_id,claimant_user_id) DO UPDATE SET evidence=EXCLUDED.evidence,status='pending',review_note=NULL,reviewed_at=NULL,updated_at=now() RETURNING *`, [resortId,userId,JSON.stringify(evidence)]);
      res.json({ ok:true,claim:q.rows[0] });
    } catch (error) { res.status(500).json({ok:false,error:'owner_claim_failed',detail:String(error?.message||error)}); }
  });

  app.get('/api/admin/resort-imports', requireAdmin, async (req, res) => {
    const requestedStatus = text(req.query.status);
    const status = ['pending', 'approved', 'rejected'].includes(requestedStatus) ? requestedStatus : 'all';
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(10, Number(req.query.limit || 30)));
    const search = text(req.query.q);
    const source = text(req.query.source);
    const country = text(req.query.country);
    const photo = text(req.query.photo);
    const price = text(req.query.price);
    const amenities = text(req.query.amenities);
    const minRating = Math.max(0, Math.min(5, Number(req.query.min_rating || 0)));
    const params = [];
    const conditions = [];
    const addParam = (value) => { params.push(value); return `$${params.length}`; };
    if (status !== 'all') conditions.push(`s.status=${addParam(status)}`);
    if (search) { const ref = addParam(`%${search}%`); conditions.push(`(s.name ILIKE ${ref} OR s.address ILIKE ${ref} OR s.country ILIKE ${ref} OR s.city ILIKE ${ref})`); }
    if (source && source !== 'all') conditions.push(`s.source=${addParam(source)}`);
    if (country && country !== 'all') conditions.push(`s.country=${addParam(country)}`);
    const photoCountSql = `(jsonb_array_length(COALESCE(s.source_image_urls,'[]'::jsonb))+jsonb_array_length(COALESCE(s.mirrored_image_urls,'[]'::jsonb)))`;
    const priceCountSql = `(SELECT COUNT(*) FROM app_resort_prices rp WHERE rp.resort_id=s.approved_resort_id AND rp.is_active=true)`;
    const amenityCountSql = `jsonb_array_length(COALESCE(p.resort_amenities,'[]'::jsonb))`;
    if (photo === 'yes') conditions.push(`${photoCountSql}>0`);
    if (photo === 'no') conditions.push(`${photoCountSql}=0`);
    if (price === 'yes') conditions.push(`${priceCountSql}>0`);
    if (price === 'no') conditions.push(`${priceCountSql}=0`);
    if (amenities === 'yes') conditions.push(`${amenityCountSql}>0`);
    if (amenities === 'no') conditions.push(`${amenityCountSql}=0`);
    if (minRating > 0) conditions.push(`COALESCE(p.resort_rating_avg,0)>=${addParam(minRating)}`);
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const fromSql = `FROM app_resort_import_staging s LEFT JOIN app_profiles p ON p.id=s.approved_resort_id`;
    const count = await pool.query(`SELECT COUNT(*)::int count ${fromSql} ${where}`, params);
    params.push(limit, (page - 1) * limit);
    const rows = await pool.query(`SELECT s.*,
      ${photoCountSql}::int AS photo_count,
      ${priceCountSql}::int AS price_count,
      ${amenityCountSql}::int AS amenity_count,
      COALESCE(p.resort_rating_avg,0)::double precision AS rating_avg,
      COALESCE(p.resort_review_count,0)::int AS review_count
      ${fromSql} ${where} ORDER BY s.created_at DESC,s.id DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
    const [sources, countries] = await Promise.all([
      pool.query(`SELECT source,COUNT(*)::int count FROM app_resort_import_staging WHERE source IS NOT NULL AND btrim(source)<>'' GROUP BY source ORDER BY source`),
      pool.query(`SELECT country,COUNT(*)::int count FROM app_resort_import_staging WHERE country IS NOT NULL AND btrim(country)<>'' GROUP BY country ORDER BY country`),
    ]);
    res.json({ ok: true, items: rows.rows, total: count.rows[0]?.count || 0, page, limit, facets: { sources: sources.rows, countries: countries.rows } });
  });

  app.patch('/api/admin/resort-imports/:id', requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    const status = text(req.body?.status);
    const rights = text(req.body?.image_rights_status);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'invalid_id' });
    const fields = []; const values = [];
    const push = (column, value) => { values.push(value); fields.push(`${column}=$${values.length}`); };
    if (['pending', 'rejected'].includes(status)) push('status', status);
    if (['unverified', 'licensed', 'owner_provided', 'rejected'].includes(rights)) push('image_rights_status', rights);
    if (req.body?.review_note !== undefined) push('review_note', text(req.body.review_note) || null);
    if (req.body?.source_image_urls !== undefined) push('source_image_urls', JSON.stringify(list(req.body.source_image_urls)));
    if (req.body?.name !== undefined) push('name', text(req.body.name));
    if (req.body?.address !== undefined) push('address', text(req.body.address) || null);
    if (req.body?.country !== undefined) push('country', text(req.body.country) || null);
    if (req.body?.country_code !== undefined) push('country_code', text(req.body.country_code).toUpperCase() || null);
    if (req.body?.region !== undefined) push('region', text(req.body.region) || null);
    if (req.body?.city !== undefined) push('city', text(req.body.city) || null);
    if (req.body?.latitude !== undefined) push('latitude', Number(req.body.latitude));
    if (req.body?.longitude !== undefined) push('longitude', Number(req.body.longitude));
    if (req.body?.phones !== undefined) push('phones', JSON.stringify(list(req.body.phones)));
    if (req.body?.emails !== undefined) push('emails', JSON.stringify(list(req.body.emails)));
    if (req.body?.certifications !== undefined) push('certifications', JSON.stringify(list(req.body.certifications)));
    if (req.body?.source_url !== undefined) push('source_url', text(req.body.source_url));
    if (req.body?.website_url !== undefined) push('website_url', text(req.body.website_url) || null);
    if (req.body?.instagram_url !== undefined) push('instagram_url', text(req.body.instagram_url) || null);
    if (req.body?.facebook_url !== undefined) push('facebook_url', text(req.body.facebook_url) || null);
    if (req.body?.youtube_url !== undefined) push('youtube_url', text(req.body.youtube_url) || null);
    if (req.body?.tiktok_url !== undefined) push('tiktok_url', text(req.body.tiktok_url) || null);
    if (!fields.length) return res.status(400).json({ ok: false, error: 'no_fields_to_update' });
    values.push(id);
    const q = await pool.query(`UPDATE app_resort_import_staging SET ${fields.join(',')},reviewed_at=now(),updated_at=now() WHERE id=$${values.length} RETURNING *`, values);
    if (!q.rows.length) return res.status(404).json({ ok: false, error: 'import_not_found' });
    res.json({ ok: true, item: q.rows[0] });
  });

  app.delete('/api/admin/resort-imports/:id', requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok:false,error:'invalid_id' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const found = await client.query('SELECT approved_resort_id,name FROM app_resort_import_staging WHERE id=$1 FOR UPDATE', [id]);
      if (!found.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ok:false,error:'import_not_found'}); }
      const resortId = found.rows[0].approved_resort_id;
      if (resortId) {
        await client.query('DELETE FROM app_profiles WHERE id=$1', [resortId]);
        await client.query(`DELETE FROM app_records WHERE table_name='profiles' AND record_id=$1`, [resortId]);
      }
      await client.query('DELETE FROM app_resort_import_staging WHERE id=$1', [id]);
      await client.query('COMMIT');
      res.json({ok:true,removed:{import_id:id,resort_id:resortId||null}});
    } catch (error) { await client.query('ROLLBACK'); res.status(500).json({ok:false,error:'resort_import_delete_failed',detail:String(error?.message||error)}); }
    finally { client.release(); }
  });

  app.post('/api/admin/resort-imports/:id/discover-images', requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    const q = await pool.query('SELECT source_url,website_url,raw_data,source_image_urls FROM app_resort_import_staging WHERE id=$1', [id]);
    if (!q.rows.length) return res.status(404).json({ ok:false,error:'import_not_found' });
    try {
      const item = q.rows[0];
      const rawPath = text(item.raw_data?.url);
      const sourceOrigin = (() => { try { return new URL(item.source_url).origin; } catch { return ''; } })();
      const rawUrl = (() => { try { return rawPath && sourceOrigin ? new URL(rawPath, sourceOrigin).href : ''; } catch { return ''; } })();
      const candidates = list([item.source_url, item.website_url, rawUrl]);
      let response = null;
      let resolvedSourceUrl = '';
      const failedStatuses = [];
      for (const candidate of candidates) {
        try {
          const candidateResponse = await fetch(candidate, {
            headers: {
              'user-agent': 'Mozilla/5.0 (compatible; DivergramResortReview/1.0; +https://divergram.com)',
              accept: 'text/html,application/xhtml+xml',
              'accept-language': 'en-US,en;q=0.8',
            },
            redirect: 'follow',
            signal: AbortSignal.timeout(12000),
          });
          if (candidateResponse.ok) {
            response = candidateResponse;
            resolvedSourceUrl = candidateResponse.url || candidate;
            break;
          }
          failedStatuses.push(`${candidateResponse.status}:${candidate}`);
        } catch (candidateError) {
          failedStatuses.push(`network:${candidate}:${String(candidateError?.message || candidateError)}`);
        }
      }

      if (!response) {
        const existing = list(item.source_image_urls);
        const updated = await pool.query(
          `UPDATE app_resort_import_staging
             SET review_note=$1,updated_at=now()
           WHERE id=$2 RETURNING *`,
          [`사진 원본 페이지를 찾을 수 없습니다. ${failedStatuses.slice(0,3).join(' | ')}`, id]
        );
        return res.json({
          ok: true,
          item: updated.rows[0],
          imagesFound: existing.length,
          warning: 'source_page_not_found',
          notice: '원본 페이지가 없거나 이동되어 기존 사진 정보를 유지했습니다.',
        });
      }

      const html = await response.text();
      const matches = [...html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["']/gi), ...html.matchAll(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/gi)];
      const discovered = matches.map((match) => {
        try { return new URL(match[1], resolvedSourceUrl).href; } catch { return ''; }
      });
      const urls = list([...list(item.source_image_urls), ...discovered]).filter((url) => /^https?:\/\//i.test(url));
      const updated = await pool.query(`UPDATE app_resort_import_staging SET source_image_urls=$1::jsonb,image_rights_status='unverified',review_note=NULL,updated_at=now() WHERE id=$2 RETURNING *`, [JSON.stringify(urls),id]);
      res.json({ok:true,item:updated.rows[0],imagesFound:urls.length,notice:'Image candidates are not licensed for publication until rights are verified.'});
    } catch (error) { res.status(502).json({ok:false,error:'image_discovery_failed',detail:String(error?.message||error)}); }
  });

  app.post('/api/admin/resort-imports/:id/approve', requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const found = await client.query('SELECT * FROM app_resort_import_staging WHERE id=$1 FOR UPDATE', [id]);
      const item = found.rows[0];
      if (!item) { await client.query('ROLLBACK'); return res.status(404).json({ ok: false, error: 'import_not_found' }); }
      if (item.status === 'approved' && item.approved_resort_id) { await client.query('COMMIT'); return res.json({ ok: true, resort_id: item.approved_resort_id }); }
      const resortId = `resort_${slug(item.name)}_${item.source_record_id || item.id}`;
      const photoUrls = ['licensed', 'owner_provided'].includes(item.image_rights_status) ? list(item.mirrored_image_urls) : [];
      await client.query(`INSERT INTO app_profiles(id,username,full_name,avatar_url,resort_cover_url,resort_photo_urls,website,account_type,resort_address,resort_region,resort_lat,resort_lng,resort_record_key,resort_source,resort_source_record_id,resort_source_url,resort_country,resort_country_code,resort_city,resort_phones,resort_emails,resort_certifications,resort_source_raw,resort_collected_at,resort_instagram_url,resort_facebook_url,resort_youtube_url,resort_tiktok_url,created_at)
        VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,'resort',$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19::jsonb,$20::jsonb,$21::jsonb,$22::jsonb,$23,$24,$25,$26,$27,now())
        ON CONFLICT (resort_record_key) WHERE resort_record_key IS NOT NULL DO UPDATE SET full_name=EXCLUDED.full_name,resort_address=EXCLUDED.resort_address,resort_lat=EXCLUDED.resort_lat,resort_lng=EXCLUDED.resort_lng,website=EXCLUDED.website,resort_source_url=EXCLUDED.resort_source_url,resort_instagram_url=EXCLUDED.resort_instagram_url,resort_facebook_url=EXCLUDED.resort_facebook_url,resort_youtube_url=EXCLUDED.resort_youtube_url,resort_tiktok_url=EXCLUDED.resort_tiktok_url RETURNING id`,
        [resortId, slug(item.name), item.name, photoUrls[0] || '', photoUrls[0] || null, JSON.stringify(photoUrls), item.website_url || item.source_url, item.address, [item.city,item.region,item.country].filter(Boolean).join(', '), item.latitude, item.longitude, item.record_key, item.source, item.source_record_id, item.source_url, item.country, item.country_code, item.city, JSON.stringify(item.phones), JSON.stringify(item.emails), JSON.stringify(item.certifications), JSON.stringify(item.raw_data), item.collected_at, item.instagram_url, item.facebook_url, item.youtube_url, item.tiktok_url]);
      await client.query(`UPDATE app_resort_import_staging SET status='approved',approved_resort_id=$1,reviewed_at=now(),updated_at=now() WHERE id=$2`, [resortId, id]);
      await client.query('COMMIT');
      res.json({ ok: true, resort_id: resortId });
    } catch (error) { await client.query('ROLLBACK'); res.status(500).json({ ok: false, error: 'resort_import_approve_failed', detail: String(error?.message || error) }); }
    finally { client.release(); }
  });

  app.get('/api/admin/resort-owner-claims', requireAdmin, async (_req, res) => {
    const q = await pool.query(`SELECT c.*,p.full_name AS resort_name,u.email AS claimant_email,u.username AS claimant_username FROM app_resort_owner_claims c JOIN app_profiles p ON p.id=c.resort_id JOIN app_users u ON u.id=c.claimant_user_id ORDER BY c.created_at DESC`);
    res.json({ ok: true, claims: q.rows });
  });

  app.patch('/api/admin/resort-owner-claims/:id', requireAdmin, async (req, res) => {
    const status = text(req.body?.status);
    if (!['approved','rejected'].includes(status)) return res.status(400).json({ ok: false, error: 'invalid_status' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const q = await client.query(`UPDATE app_resort_owner_claims SET status=$1,review_note=$2,reviewed_at=now(),updated_at=now() WHERE id=$3 RETURNING *`, [status,text(req.body?.review_note)||null,Number(req.params.id)]);
      if (!q.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ ok:false,error:'claim_not_found' }); }
      if (status === 'approved') await client.query(`UPDATE app_profiles SET resort_owner_user_id=$1,resort_owner_verified_at=now() WHERE id=$2`, [q.rows[0].claimant_user_id,q.rows[0].resort_id]);
      await client.query('COMMIT'); res.json({ ok:true,claim:q.rows[0] });
    } catch (error) { await client.query('ROLLBACK'); res.status(500).json({ok:false,error:'claim_review_failed',detail:String(error?.message||error)}); }
    finally { client.release(); }
  });
}
