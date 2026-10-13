#!/usr/bin/env node

import fs from 'node:fs';
import pg from 'pg';

const env = {};
for (const line of fs.readFileSync(new URL('../.env', import.meta.url), 'utf8').split(/\r?\n/)) {
  const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (match) env[match[1]] = match[2];
}

const pool = new pg.Pool({
  host: env.PGHOST || undefined,
  port: Number(env.PGPORT || 5432),
  database: env.PGDATABASE,
  user: env.PGUSER,
  password: env.PGPASSWORD,
});

const assetBase = (env.EDITORIAL_ASSET_BASE_URL || 'https://divergram.com').replace(/\/$/, '');
const avatars = {
  'editorial:dg_reefnotes_ko': 'dg-reefnotes-ko.png',
  'editorial:dg_bluehour_ko': 'dg-bluehour-ko.png',
  'editorial:dg_reefnotes_en': 'dg-reefnotes-en.png',
  'editorial:dg_bluehour_en': 'dg-bluehour-en.png',
  'editorial:dg_reefnotes_ja': 'dg-reefnotes-ja.png',
  'editorial:dg_bluehour_ja': 'dg-bluehour-ja.png',
};

try {
  await pool.query('BEGIN');
  let updated = 0;
  for (const [id, file] of Object.entries(avatars)) {
    const result = await pool.query(
      `UPDATE app_profiles
          SET avatar_url=$1
        WHERE id=$2
          AND is_synthetic=true
          AND COALESCE(NULLIF(btrim(avatar_url),''),'')=''
        RETURNING id`,
      [`${assetBase}/assets/editorial-avatars/${file}`, id],
    );
    updated += result.rowCount;
  }
  await pool.query('COMMIT');
  console.log(JSON.stringify({ ok: true, updated }));
} catch (error) {
  await pool.query('ROLLBACK');
  console.error(error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
