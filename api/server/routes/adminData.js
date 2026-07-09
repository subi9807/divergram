export function registerAdminDataRoutes(app, { pool, requireAdmin, bcrypt, crypto }) {
  app.post('/api/admin/migrate-normalized', requireAdmin, async (_req, res) => {
    try {
      const mapping = [
        ['profiles', 'app_profiles', ['id','username','full_name','bio','avatar_url','resort_cover_url','resort_photo_urls','resort_amenities','website','account_type','scuba_level','freediving_level','license_type','license_number','license_agency','license_issued_at','license_image_url','created_at']],
        ['posts', 'app_posts', ['id','user_id','image_url','video_url','caption','location','dive_type','dive_date','max_depth','water_temperature','dive_duration','dive_site','visibility','buddy','buddy_name','created_at']],
        ['post_media', 'app_post_media', ['id','post_id','media_url','media_type','order_index','created_at']],
        ['likes', 'app_likes', ['id','post_id','user_id','created_at']],
        ['comments', 'app_comments', ['id','post_id','user_id','content','created_at']],
        ['follows', 'app_follows', ['id','follower_id','following_id','created_at']],
        ['saved_posts', 'app_saved_posts', ['id','user_id','post_id','created_at']],
        ['notifications', 'app_notifications', ['id','user_id','actor_id','type','post_id','is_read','created_at']],
      ];

      const result = {};

      const defaultsByTable = {
        profiles: { bio: '', avatar_url: '', resort_cover_url: '', resort_photo_urls: [], resort_amenities: [], account_type: 'personal' },
        posts: { caption: '' },
        post_media: { media_type: 'image', order_index: 0 },
        comments: { content: '' },
        notifications: { type: 'like', is_read: false },
      };

      for (const [srcTable, dstTable, cols] of mapping) {
        const raw = await pool.query('SELECT data FROM app_records WHERE table_name=$1', [srcTable]);
        let count = 0;
        for (const row of raw.rows) {
          const d = row.data || {};
          const tableDefaults = defaultsByTable[srcTable] || {};
          const values = cols.map((c) => {
            if (c === 'created_at') return d[c] || new Date().toISOString();
            const v = d[c];
            if (v === null || v === undefined) {
              if (Object.prototype.hasOwnProperty.call(tableDefaults, c)) {
                const fallback = tableDefaults[c];
                return Array.isArray(fallback) ? JSON.stringify(fallback) : fallback;
              }
              return null;
            }
            return Array.isArray(v) ? JSON.stringify(v) : v;
          });
          const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
          const updates = cols.filter((c) => c !== 'id').map((c) => `${c}=EXCLUDED.${c}`).join(', ');
          await pool.query(
            `INSERT INTO ${dstTable}(${cols.join(',')}) VALUES (${placeholders})
             ON CONFLICT (id) DO UPDATE SET ${updates}`,
            values
          );
          count += 1;
        }
        result[srcTable] = count;
      }

      res.json({ ok: true, migrated: result });
    } catch (e) {
      res.status(500).json({ ok: false, error: 'normalized_migration_failed', detail: String(e?.message || e) });
    }
  });

  app.post('/api/admin/seed-bulk', requireAdmin, async (req, res) => {
    const usersN = Math.min(Math.max(Number(req.body?.users || 30), 1), 300);
    const postsN = Math.min(Math.max(Number(req.body?.posts || 120), 1), 1200);
    const commentsN = Math.min(Math.max(Number(req.body?.comments || 300), 1), 3000);
    const likesN = Math.min(Math.max(Number(req.body?.likes || 600), 1), 6000);

    try {
      const pass = 'Password123!';
      const hash = await bcrypt.hash(pass, 10);
      const sha = crypto.createHash('sha256').update(pass).digest('hex');

      const firstNames = ['Minji','Jiwon','Seoyeon','Yuna','Haerin','Sujin','Jisoo','Eunji','Mina','Doyeon','Hyunwoo','Joon','Taehyun','Minho','Jiho','Seungwoo','Dongha','Yejun'];
      const lastNames = ['Kim','Lee','Park','Choi','Jung','Kang','Yoon','Lim','Han','Shin'];
      const resorts = [
        {
          full_name: 'BlueFinBali',
          username: 'bluefinbali',
          region: 'Bali, Indonesia',
          address: 'Jl. Labuan Sait, Pecatu, Kuta Selatan, Badung, Bali',
          website: 'https://example.com/bluefinbali',
          avatar_url: 'https://picsum.photos/seed/bluefinbali/256/256',
          lat: -8.4095,
          lng: 115.1889,
        },
        {
          full_name: 'JejuDiveBase',
          username: 'jejudivebase',
          region: 'Jeju, Korea',
          address: '1145 Hamdeok-ri, Jocheon-eup, Jeju-si, Jeju-do',
          website: 'https://example.com/jejudivebase',
          avatar_url: 'https://picsum.photos/seed/jejudivebase/256/256',
          lat: 33.4996,
          lng: 126.5312,
        },
        {
          full_name: 'CebuOceanClub',
          username: 'cebuoceanclub',
          region: 'Cebu, Philippines',
          address: 'Barangay Tan-awan, Oslob, Cebu',
          website: 'https://example.com/cebuoceanclub',
          avatar_url: 'https://picsum.photos/seed/cebuoceanclub/256/256',
          lat: 10.3157,
          lng: 123.8854,
        },
        {
          full_name: 'OkinawaReefLab',
          username: 'okinawareeflab',
          region: 'Okinawa, Japan',
          address: 'Sesoko, Motobu, Kunigami District, Okinawa',
          website: 'https://example.com/okinawareeflab',
          avatar_url: 'https://picsum.photos/seed/okinawareeflab/256/256',
          lat: 26.2124,
          lng: 127.6809,
        },
        {
          full_name: 'SipadanDeepHub',
          username: 'sipadandeephub',
          region: 'Sipadan, Malaysia',
          address: 'Semporna, Sabah, Malaysia',
          website: 'https://example.com/sipadandeephub',
          avatar_url: 'https://picsum.photos/seed/sipadandeephub/256/256',
          lat: 4.1145,
          lng: 118.6287,
        },
        {
          full_name: 'PhuketCoralResort',
          username: 'phuketcoralresort',
          region: 'Phuket, Thailand',
          address: 'Patong Beach, Kathu District, Phuket',
          website: 'https://example.com/phuketcoralresort',
          avatar_url: 'https://picsum.photos/seed/phuketcoralresort/256/256',
          lat: 7.8804,
          lng: 98.3923,
        },
        {
          full_name: 'AnilaoDiveHouse',
          username: 'anilaodivehouse',
          region: 'Anilao, Philippines',
          address: 'Brgy. Bagalangit, Mabini, Batangas',
          website: 'https://example.com/anilaodivehouse',
          avatar_url: 'https://picsum.photos/seed/anilaodivehouse/256/256',
          lat: 13.7000,
          lng: 120.9167,
        },
        {
          full_name: 'MoalboalSeaCamp',
          username: 'moalboalseacamp',
          region: 'Moalboal, Philippines',
          address: 'Panagsama Beach, Moalboal, Cebu',
          website: 'https://example.com/moalboalseacamp',
          avatar_url: 'https://picsum.photos/seed/moalboalseacamp/256/256',
          lat: 9.9478,
          lng: 123.3711,
        },
      ];

      const profileIds = [];
      for (let i = 1; i <= usersN; i++) {
        const isResort = (i % 4 === 0);
        const resortSeed = isResort
          ? resorts[(i / 4) % resorts.length | 0]
          : null;
        const baseName = isResort
          ? resortSeed.full_name
          : `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`;
        const username = isResort
          ? `${resortSeed.username}_${i}`
          : `${firstNames[i % firstNames.length].toLowerCase()}.${lastNames[i % lastNames.length].toLowerCase()}${i}`;
        const email = `${username}@divergram.com`;

        await pool.query(
          `INSERT INTO app_users(email,password_hash,password_sha256,username,role,is_blocked)
           VALUES ($1,$2,$3,$4,'user',false)
           ON CONFLICT (email) DO UPDATE SET username=EXCLUDED.username
           RETURNING id::text`,
          [email, hash, sha, username]
        );
        const id = String((await pool.query('SELECT id::text FROM app_users WHERE email=$1', [email])).rows[0].id);
        profileIds.push(id);
        await pool.query(
          `INSERT INTO app_profiles(id,username,full_name,bio,avatar_url,resort_cover_url,resort_photo_urls,resort_amenities,website,account_type,resort_address,resort_region,resort_lat,resort_lng,resort_rating_avg,resort_review_count)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
           ON CONFLICT (id) DO UPDATE SET
             username=EXCLUDED.username,
             full_name=EXCLUDED.full_name,
             bio=EXCLUDED.bio,
             avatar_url=EXCLUDED.avatar_url,
             resort_cover_url=EXCLUDED.resort_cover_url,
             resort_photo_urls=EXCLUDED.resort_photo_urls,
             resort_amenities=EXCLUDED.resort_amenities,
             website=EXCLUDED.website,
             account_type=EXCLUDED.account_type,
             resort_address=EXCLUDED.resort_address,
             resort_region=EXCLUDED.resort_region,
             resort_lat=EXCLUDED.resort_lat,
             resort_lng=EXCLUDED.resort_lng,
             resort_rating_avg=EXCLUDED.resort_rating_avg,
             resort_review_count=EXCLUDED.resort_review_count`,
          [
            id,
            username,
            baseName,
            isResort ? 'Certified dive center' : 'Ocean lover and diver',
            isResort ? resortSeed.avatar_url : '',
            isResort ? resortSeed.avatar_url : '',
            JSON.stringify([]),
            JSON.stringify([]),
            isResort ? resortSeed.website : '',
            isResort ? 'resort' : 'personal',
            isResort ? resortSeed.address : null,
            isResort ? resortSeed.region : null,
            isResort ? resortSeed.lat : null,
            isResort ? resortSeed.lng : null,
            isResort ? 4.8 : 0,
            isResort ? 0 : 0,
          ]
        );
      }

      const postIds = [];
      for (let i = 1; i <= postsN; i++) {
        const id = `bulk_post_${i}`;
        const userId = profileIds[i % profileIds.length];
        const row = { id, user_id: userId, image_url: `https://picsum.photos/seed/divergram-${i}/1200/900`, caption: `샘플 게시물 ${i}`, location: ['Jeju','Bali','Cebu','Okinawa'][i % 4], created_at: new Date(Date.now() - i * 60000).toISOString() };
        postIds.push(id);
        const diveTypes = ['freediving', 'scuba', 'technical'];
        const diveType = diveTypes[i % diveTypes.length];
        const gasType = diveType === 'freediving' ? null : (i % 3 === 0 ? 'air' : (i % 2 === 0 ? 'nitrox' : 'heliox'));
        const gasPercent = gasType && gasType !== 'air' ? (gasType === 'nitrox' ? 32 : 21) : null;

        await pool.query(
          `INSERT INTO app_posts(
              id,user_id,image_url,caption,location,created_at,
              dive_type,dive_date,max_depth,water_temperature,dive_duration,dive_site,visibility,gas_type,gas_percent,buddy_name
            )
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
           ON CONFLICT (id) DO UPDATE SET
              caption=EXCLUDED.caption, location=EXCLUDED.location, dive_type=EXCLUDED.dive_type, dive_date=EXCLUDED.dive_date,
              max_depth=EXCLUDED.max_depth, water_temperature=EXCLUDED.water_temperature, dive_duration=EXCLUDED.dive_duration,
              dive_site=EXCLUDED.dive_site, visibility=EXCLUDED.visibility, gas_type=EXCLUDED.gas_type,
              gas_percent=EXCLUDED.gas_percent, buddy_name=EXCLUDED.buddy_name`,
          [
            row.id,row.user_id,row.image_url,row.caption,row.location,row.created_at,
            diveType,
            new Date(Date.now() - i * 86400000).toISOString().slice(0,10),
            12 + (i % 24), 18 + (i % 10), 30 + (i % 40),
            ['Jeju Dive Base','Blue Fin Bali','Cebu Ocean Club','Okinawa Reef Lab'][i % 4],
            5 + (i % 20), gasType, gasPercent,
            ['@minji.kim1','@taehyun.yoon2','@bluefinbali_1','@jejudivebase_2'][i % 4]
          ]
        );
      }

      for (let i = 1; i <= commentsN; i++) {
        await pool.query(
          `INSERT INTO app_comments(id,post_id,user_id,content,created_at)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (id) DO UPDATE SET content=EXCLUDED.content`,
          [`bulk_comment_${i}`, postIds[i % postIds.length], profileIds[(i + 3) % profileIds.length], `샘플 댓글 ${i}`, new Date(Date.now() - i * 30000).toISOString()]
        );
      }

      for (let i = 1; i <= likesN; i++) {
        await pool.query(
          `INSERT INTO app_likes(id,post_id,user_id,created_at)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT (id) DO NOTHING`,
          [`bulk_like_${i}`, postIds[i % postIds.length], profileIds[(i + 7) % profileIds.length], new Date(Date.now() - i * 20000).toISOString()]
        );
      }

      const sampleVideos = [
        'https://samplelib.com/lib/preview/mp4/sample-5s.mp4',
        'https://samplelib.com/lib/preview/mp4/sample-10s.mp4',
        'https://samplelib.com/lib/preview/mp4/sample-15s.mp4',
      ];

      for (let i = 1; i <= postsN; i++) {
        const postId = postIds[i % postIds.length];
        const mediaCount = 2 + (i % 4);
        for (let m = 0; m < mediaCount; m++) {
          const useVideo = (m === 0 && i % 12 === 0) || (m > 0 && i % 5 === 0);
          const mediaUrl = useVideo ? sampleVideos[(i + m) % sampleVideos.length] : `https://picsum.photos/seed/media-${i}-${m}/1200/1500`;
          const mediaType = useVideo ? 'video' : 'image';
          await pool.query(
            `INSERT INTO app_post_media(id,post_id,media_url,media_type,order_index,created_at)
             VALUES ($1,$2,$3,$4,$5,$6)
             ON CONFLICT (id) DO NOTHING`,
            [`bulk_media_${i}_${m}`, postId, mediaUrl, mediaType, m, new Date().toISOString()]
          );
        }
      }

      for (let i = 1; i <= Math.min(300, usersN * 2); i++) {
        await pool.query(
          `INSERT INTO app_follows(id,follower_id,following_id,created_at)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT (id) DO NOTHING`,
          [`bulk_follow_${i}`, profileIds[i % profileIds.length], profileIds[(i + 1) % profileIds.length], new Date().toISOString()]
        );
      }

      for (let i = 1; i <= Math.min(500, postsN); i++) {
        await pool.query(
          `INSERT INTO app_saved_posts(id,user_id,post_id,created_at)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT (id) DO NOTHING`,
          [`bulk_saved_${i}`, profileIds[(i + 2) % profileIds.length], postIds[i % postIds.length], new Date().toISOString()]
        );
      }

      for (let i = 1; i <= Math.min(800, likesN); i++) {
        await pool.query(
          `INSERT INTO app_notifications(id,user_id,actor_id,type,post_id,is_read,created_at)
           VALUES ($1,$2,$3,'like',$4,false,$5)
           ON CONFLICT (id) DO NOTHING`,
          [`bulk_noti_${i}`, profileIds[i % profileIds.length], profileIds[(i + 3) % profileIds.length], postIds[i % postIds.length], new Date().toISOString()]
        );
      }

      for (let i = 1; i <= 40; i++) {
        const roomId = `bulk_room_${i}`;
        await pool.query(`INSERT INTO app_rooms(id,type,created_at) VALUES ($1,'direct',$2) ON CONFLICT (id) DO NOTHING`, [roomId, new Date().toISOString()]);
        await pool.query(`INSERT INTO app_participants(id,room_id,user_id,joined_at) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING`, [`bulk_pt_${i}_1`, roomId, profileIds[i % profileIds.length], new Date().toISOString()]);
        await pool.query(`INSERT INTO app_participants(id,room_id,user_id,joined_at) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING`, [`bulk_pt_${i}_2`, roomId, profileIds[(i + 5) % profileIds.length], new Date().toISOString()]);
        await pool.query(`INSERT INTO app_messages(id,room_id,sender_id,content,created_at,read_at) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`, [`bulk_msg_${i}`, roomId, profileIds[i % profileIds.length], `샘플 메시지 ${i}`, new Date().toISOString(), null]);
      }

      for (let i = 1; i <= 80; i++) {
        await pool.query(
          `INSERT INTO app_reports(id,user_id,reason,status,created_at)
           VALUES ($1,$2,$3,'open',$4)
           ON CONFLICT (id) DO NOTHING`,
          [`bulk_report_${i}`, profileIds[i % profileIds.length], `샘플 신고 ${i}`, new Date().toISOString()]
        );
      }

      res.json({ ok: true, seeded: { users: usersN, posts: postsN, comments: commentsN, likes: likesN } });
    } catch {
      res.status(500).json({ ok: false, error: 'seed_bulk_failed' });
    }
  });

  app.get('/api/admin/tables', requireAdmin, async (_req, res) => {
    const tableNames = ['app_users','app_profiles','app_posts','app_post_media','app_likes','app_comments','app_follows','app_saved_posts','app_notifications','app_rooms','app_participants','app_messages','app_reports','app_moderation_actions','app_ad_slots','app_resort_prices','admin_audit_logs'];
    try {
      const out = [];
      for (const t of tableNames) {
        const c = await pool.query(`SELECT COUNT(*)::int AS count FROM ${t}`);
        out.push({ table: t, count: c.rows[0].count });
      }
      res.json({ ok: true, tables: out });
    } catch {
      res.status(500).json({ ok: false, error: 'tables_failed' });
    }
  });

  app.get('/api/admin/table/:name', requireAdmin, async (req, res) => {
    const name = String(req.params.name || '').trim();
    const allow = new Set(['app_users','app_profiles','app_posts','app_post_media','app_likes','app_comments','app_follows','app_saved_posts','app_notifications','app_rooms','app_participants','app_messages','app_reports','app_moderation_actions','app_ad_slots','app_resort_prices','admin_audit_logs']);
    if (!allow.has(name)) return res.status(400).json({ ok: false, error: 'table_not_allowed' });
    const limit = Math.min(Math.max(Number(req.query.limit || 50), 1), 200);
    try {
      const rows = await pool.query(`SELECT * FROM ${name} ORDER BY 1 DESC LIMIT $1`, [limit]);
      res.json({ ok: true, table: name, rows: rows.rows });
    } catch {
      res.status(500).json({ ok: false, error: 'table_rows_failed' });
    }
  });
}
