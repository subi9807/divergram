import fs from 'node:fs';
import readline from 'node:readline';
import path from 'node:path';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: process.env.DIVERGRAM_ENV_FILE || path.resolve(process.cwd(), '.env') });
const filename = process.argv[2];
if (!filename) throw new Error('Usage: node scripts/import-resort-staging.mjs <ndjson-file>');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL ? { rejectUnauthorized:false } : undefined });
const stream = readline.createInterface({ input: fs.createReadStream(filename), crlfDelay: Infinity });
let imported = 0; let skippedCoordinates = 0; let invalid = 0;
for await (const line of stream) {
  if (!line.trim()) continue;
  try {
    const row = JSON.parse(line);
    const hasCoordinates = row.latitude !== null && row.latitude !== undefined && String(row.latitude).trim() !== '' && row.longitude !== null && row.longitude !== undefined && String(row.longitude).trim() !== '';
    const lat = Number(row.latitude); const lng = Number(row.longitude);
    if (!hasCoordinates || !Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) { skippedCoordinates += 1; continue; }
    await pool.query(`INSERT INTO app_resort_import_staging(record_key,source,source_record_id,source_url,name,address,country,country_code,region,city,latitude,longitude,phones,emails,certifications,source_image_urls,raw_data,collected_at,updated_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14::jsonb,$15::jsonb,$16::jsonb,$17::jsonb,$18,now())
      ON CONFLICT(record_key) DO UPDATE SET source_url=EXCLUDED.source_url,name=EXCLUDED.name,address=EXCLUDED.address,country=EXCLUDED.country,country_code=EXCLUDED.country_code,region=EXCLUDED.region,city=EXCLUDED.city,latitude=EXCLUDED.latitude,longitude=EXCLUDED.longitude,phones=EXCLUDED.phones,emails=EXCLUDED.emails,certifications=EXCLUDED.certifications,raw_data=EXCLUDED.raw_data,collected_at=EXCLUDED.collected_at,updated_at=now()`,
      [String(row.record_key),String(row.source||'unknown'),String(row.source_record_id||''),String(row.source_url||''),String(row.name||'Unnamed resort'),row.address||null,row.country||null,row.country_code||null,row.region||null,row.city||null,lat,lng,JSON.stringify(row.phones||[]),JSON.stringify(row.emails||[]),JSON.stringify(row.certifications||[]),JSON.stringify(row.image_urls||[]),JSON.stringify(row.raw||{}),row.collected_at||null]);
    imported += 1;
  } catch { invalid += 1; }
}
await pool.end();
console.log(JSON.stringify({ imported, skippedCoordinates, invalid }));
