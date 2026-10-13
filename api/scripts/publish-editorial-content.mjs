#!/usr/bin/env node

import fs from 'node:fs';
import crypto from 'node:crypto';
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

const START_DATE = env.EDITORIAL_START_DATE || '2026-09-01';
const DAYS = 30;
const TIME_ZONE = 'Asia/Seoul';
const command = process.argv[2] || '--run';

const sites = [
  { country: 'Philippines', region: 'Cebu', site: 'Moalboal', ko: '필리핀 모알보알', ja: 'フィリピン・モアルボアル' },
  { country: 'Philippines', region: 'Batangas', site: 'Anilao', ko: '필리핀 아닐라오', ja: 'フィリピン・アニラオ' },
  { country: 'Philippines', region: 'Palawan', site: 'Coron', ko: '필리핀 코론', ja: 'フィリピン・コロン' },
  { country: 'Indonesia', region: 'Bali', site: 'Amed', ko: '발리 아메드', ja: 'バリ島アメッド' },
  { country: 'Indonesia', region: 'Bali', site: 'Tulamben', ko: '발리 툴람벤', ja: 'バリ島トランベン' },
  { country: 'Indonesia', region: 'Bali', site: 'Nusa Penida', ko: '발리 누사페니다', ja: 'バリ島ヌサペニダ' },
  { country: 'Australia', region: 'Queensland', site: 'Great Barrier Reef', ko: '호주 그레이트 배리어 리프', ja: 'オーストラリア・グレートバリアリーフ' },
  { country: 'Australia', region: 'Western Australia', site: 'Ningaloo Reef', ko: '호주 닝갈루 리프', ja: 'オーストラリア・ニンガルーリーフ' },
  { country: 'Mexico', region: 'Quintana Roo', site: 'Cozumel', ko: '멕시코 코수멜', ja: 'メキシコ・コスメル' },
  { country: 'Mexico', region: 'Quintana Roo', site: 'Cenote Route', ko: '멕시코 세노테 루트', ja: 'メキシコ・セノーテルート' },
];

const languages = ['ko', 'en', 'ja'];
const slots = [
  '07:10','07:37','08:05','08:34','09:02','09:31','10:03','10:36','11:08','11:42',
  '12:14','12:47','13:19','13:53','14:26','14:58','15:31','16:04','16:38','17:11',
  '17:45','18:18','18:52','19:25','19:59','20:32','21:04','21:37','22:09','22:40',
];
const launchDaySlots = Array.from({ length: 30 }, (_, index) => {
  const totalMinutes = 18 * 60 + 10 + index * 10;
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
});

const editorialAssetBase = (env.EDITORIAL_ASSET_BASE_URL || 'https://divergram.com').replace(/\/$/, '');
const profiles = [
  ['dg_reefnotes_ko','Reef Notes','ko','필리핀과 발리의 바다를 기록하는 Divergram 에디토리얼','dg-reefnotes-ko.png'],
  ['dg_bluehour_ko','Blue Hour','ko','천천히 즐기는 다이빙과 섬의 일상을 소개합니다 · Divergram','dg-bluehour-ko.png'],
  ['dg_reefnotes_en','Reef Notes','en','Divergram editorial notes from warm-water dive regions','dg-reefnotes-en.png'],
  ['dg_bluehour_en','Blue Hour','en','Slow dives, island mornings and practical ocean notes · Divergram','dg-bluehour-en.png'],
  ['dg_reefnotes_ja','Reef Notes','ja','海と旅を記録するDivergram編集アカウント','dg-reefnotes-ja.png'],
  ['dg_bluehour_ja','Blue Hour','ja','ダイビングと島の日常を紹介するDivergram編集アカウント','dg-bluehour-ja.png'],
];

const copy = {
  ko: {
    scuba: [
      '{place}에서의 스쿠버다이빙은 입수 전 브리핑부터 시작됩니다. 포인트의 지형과 출수 계획을 확인하고, 버디와 신호를 맞춘 뒤 각자의 훈련 범위 안에서 천천히 바다를 살펴보세요.',
      '{place}의 수중 풍경은 같은 포인트도 시간과 날씨에 따라 다르게 보입니다. 오늘의 기록에는 실제로 확인한 시야와 수온만 남기고, 변동 가능한 정보는 현지 운영자에게 다시 확인하는 것이 좋습니다.',
      '빠르게 이동하기보다 호흡과 부력을 가다듬으며 바라본 {place}. 산호와 해양생물에는 거리를 두고, 장비가 바닥에 닿지 않도록 살피는 순간도 다이빙의 일부입니다.',
      '{place} 다이빙을 준비한다면 인증 범위, 최근 경험, 장비 상태를 먼저 확인해 보세요. 현지 가이드의 브리핑과 버디 체크는 익숙한 포인트에서도 생략하지 않습니다.',
    ],
    freediving: [
      '{place}에서 프리다이빙을 즐길 때는 기록보다 편안함과 회복이 먼저입니다. 혼자 입수하지 않고, 훈련받은 버디와 서로를 직접 확인할 수 있는 범위에서 진행하세요.',
      '수면의 호흡부터 천천히 시작한 {place} 프리다이빙. 깊이나 시간을 경쟁하지 않고, 그날의 컨디션에 맞춰 충분히 쉬는 과정까지 하나의 세션으로 기록합니다.',
      '{place}의 맑은 수면 아래를 바라보는 짧은 순간. 과호흡을 피하고, 버디 시스템과 현지 운영자의 안내를 지키며 자신의 훈련 범위 안에서 즐기는 것이 우선입니다.',
      '프리다이빙 장비는 단순해 보여도 마스크, 핀, 웨이트와 랜야드 상태를 차분히 확인해야 합니다. {place}의 환경 정보도 입수 직전에 다시 확인해 주세요.',
    ],
    daily: [
      '{place}의 아침은 장비를 서두르지 않고 정리하는 시간으로 시작됩니다. 물병을 챙기고, 카메라 배터리를 확인하고, 오늘 바다 상태를 현지 운영자에게 묻는 평범한 준비도 여행의 기록이 됩니다.',
      '다이빙이 없는 오후의 {place}. 젖은 장비를 그늘에서 말리고 로그를 정리하며, 지역 식당과 작은 거리를 천천히 둘러보는 시간도 바다 여행의 일부입니다.',
      '{place}에서 보낸 하루를 기록합니다. 멋진 장면만 고르기보다 이동, 장비 정리, 수면 휴식처럼 실제 여행을 이루는 작은 순간을 함께 남겨보세요.',
      '오늘의 {place} 메모: 일회용품을 줄이고, 리필 물병을 사용하고, 야생동물을 만지거나 먹이를 주지 않았습니다. 여행지에서의 작은 선택이 다음 바다를 만나는 방식이 됩니다.',
    ],
    cta: '여러분의 실제 로그와 현지 팁도 Divergram에 남겨 주세요.',
  },
  en: {
    scuba: [
      'A scuba day in {place} starts with the briefing, not the giant stride. Review the site, exit plan and hand signals with your buddy, then explore within your training and current comfort level.',
      'The same site in {place} can look different with changing weather and water conditions. Log only the temperature and visibility you actually observed, and confirm current conditions with a local operator.',
      'Slowing down made the details in {place} easier to notice. Keep a respectful distance from marine life, watch your buoyancy and make sure no loose equipment touches the reef.',
      'Before diving in {place}, check certification limits, recent experience and equipment condition. A local briefing and a complete buddy check still matter at a familiar site.',
    ],
    freediving: [
      'A freediving session in {place} is about comfort and recovery before numbers. Never dive alone; stay with a trained buddy who can maintain direct supervision throughout the session.',
      'Starting slowly at the surface in {place}. Depth and time are not a competition, and generous surface recovery is part of every session—not an interval to rush through.',
      'A quiet look below the surface in {place}. Avoid hyperventilation, follow the local operator’s guidance and remain well inside the limits of your training and condition.',
      'Simple gear still deserves a careful check. Before entering at {place}, inspect mask, fins, weights and lanyard, then confirm the latest site conditions locally.',
    ],
    daily: [
      'A regular morning in {place}: refill the water bottle, check camera batteries, sort damp gear and ask the local team about today’s sea conditions. The small routines are part of the trip too.',
      'A no-dive afternoon in {place}. Drying gear in the shade, updating the logbook and walking to a neighborhood café can be as memorable as the boat ride.',
      'A few notes from an ordinary day in {place}. Travel is also made of transfers, surface intervals and rinsing equipment—not only the highlight reel.',
      'Today in {place}: used a refillable bottle, avoided single-use items and left wildlife undisturbed. Small choices shape the way we return to the ocean.',
    ],
    cta: 'Share your verified dive log and local tips with the Divergram community.',
  },
  ja: {
    scuba: [
      '{place}でのスクーバダイビングは、エントリー前のブリーフィングから始まります。地形、エキジット方法、ハンドシグナルをバディと確認し、トレーニングの範囲内で楽しみましょう。',
      '{place}の同じポイントでも、天候や海況によって見え方は変わります。水温や透明度は実際に確認した値だけを記録し、最新情報は現地オペレーターに確認します。',
      '急がずに泳ぐと、{place}の小さな景色が見えてきます。生き物との距離を保ち、器材がサンゴや海底に触れないよう浮力を整えましょう。',
      '{place}で潜る前に、認定範囲、最近の経験、器材の状態を確認。慣れたポイントでも現地ブリーフィングとバディチェックは省略しません。',
    ],
    freediving: [
      '{place}でのフリーダイビングは、記録より快適さと回復を優先します。単独では潜らず、訓練を受けたバディが直接見守れる範囲で行いましょう。',
      '{place}の水面で呼吸を整えるところから、ゆっくりスタート。深度や時間を競わず、その日の体調に合わせた十分な水面休息もセッションの一部です。',
      '{place}の水面下を静かに眺める時間。過換気を避け、現地の案内とバディシステムを守り、トレーニングの範囲内で楽しみます。',
      'シンプルな器材でも確認は丁寧に。{place}へ入る前にマスク、フィン、ウエイト、ランヤードを点検し、最新の海況も確認しましょう。',
    ],
    daily: [
      '{place}の朝。ボトルに水を補充し、カメラの電池と濡れた器材を確認して、現地スタッフに今日の海況を聞きます。何気ない準備も旅の記録です。',
      '潜らない日の{place}。器材を日陰で乾かし、ログを整理して、近所の店まで歩く時間も海の旅の一部です。',
      '{place}で過ごした普通の一日。移動や水面休息、器材洗いなど、ハイライト以外の小さな時間も残してみます。',
      '今日の{place}では、詰め替えボトルを使い、使い捨て品を減らし、野生生物には触れませんでした。小さな選択が次の海につながります。',
    ],
    cta: '実際のダイブログや現地情報をDivergramで共有してください。',
  },
};

function hashInt(value) {
  return Number.parseInt(crypto.createHash('sha256').update(value).digest('hex').slice(0, 8), 16);
}

function addDays(date, days) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function scheduledIso(date, hhmm) {
  // Asia/Seoul is UTC+09:00 year-round.
  return new Date(`${date}T${hhmm}:00+09:00`).toISOString();
}

function buildPost(dayIndex, itemIndex) {
  const typeIndex = Math.floor(itemIndex / 10);
  const diveType = ['scuba', 'freediving', 'daily'][typeIndex];
  const withinType = itemIndex % 10;
  const language = languages[(withinType + dayIndex + typeIndex) % languages.length];
  const site = sites[(dayIndex * 3 + itemIndex) % sites.length];
  const place = language === 'ko' ? site.ko : language === 'ja' ? site.ja : `${site.site}, ${site.country}`;
  const options = copy[language][diveType];
  const body = options[(dayIndex + withinType) % options.length].replaceAll('{place}', place);
  const date = addDays(START_DATE, dayIndex);
  const tags = language === 'ko'
    ? '#Divergram #다이버그램 #바다여행'
    : language === 'ja'
      ? '#Divergram #ダイビング #海の旅'
      : '#Divergram #DivingCommunity #OceanTravel';
  const categoryTag = diveType === 'scuba' ? '#ScubaDiving' : diveType === 'freediving' ? '#Freediving' : '#DiveTravel';
  const fieldNote = language === 'ko'
    ? `오늘의 바다 노트 · ${date.replaceAll('-', '.')} · ${place}`
    : language === 'ja'
      ? `今日の海ノート · ${date.replaceAll('-', '.')} · ${place}`
      : `Ocean field note · ${date} · ${place}`;
  const caption = `${body}\n\n${fieldNote}\n${copy[language].cta}\n\n${tags} ${categoryTag}`;
  const id = `editorial_${date.replaceAll('-', '')}_${diveType}_${String(withinType + 1).padStart(2, '0')}`;
  const profilePool = profiles.filter((item) => item[2] === language);
  const profile = profilePool[(dayIndex + itemIndex) % profilePool.length];
  return {
    id,
    userId: `editorial:${profile[0]}`,
    caption,
    location: `${site.site}, ${site.country}`,
    diveType,
    diveDate: diveType === 'daily' ? null : date,
    diveSite: diveType === 'daily' ? null : site.site,
    language,
    scheduledAt: scheduledIso(
      date,
      dayIndex === 0 && START_DATE === '2026-09-01'
        ? launchDaySlots[itemIndex]
        : slots[(itemIndex * 7 + dayIndex) % slots.length],
    ),
  };
}

async function ensureSchema(client) {
  await client.query(`CREATE TABLE IF NOT EXISTS app_editorial_schedule (
    post_id TEXT PRIMARY KEY,
    scheduled_at TIMESTAMPTZ NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','published','failed')),
    published_at TIMESTAMPTZ,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await client.query(`CREATE INDEX IF NOT EXISTS app_editorial_schedule_due_idx ON app_editorial_schedule(status, scheduled_at)`);
  await client.query(`ALTER TABLE app_posts ADD COLUMN IF NOT EXISTS content_language TEXT`);
  await client.query(`ALTER TABLE app_posts ADD COLUMN IF NOT EXISTS content_origin TEXT`);
  await client.query(`ALTER TABLE app_profiles ADD COLUMN IF NOT EXISTS is_synthetic BOOLEAN NOT NULL DEFAULT false`);
  await client.query(`ALTER TABLE app_profiles ADD COLUMN IF NOT EXISTS managed_by TEXT`);
  await client.query(`ALTER TABLE app_profiles ADD COLUMN IF NOT EXISTS content_language TEXT`);
}

async function install(client) {
  await ensureSchema(client);
  for (const [username, fullName, language, bio, avatarFile] of profiles) {
    const id = `editorial:${username}`;
    const avatarUrl = `${editorialAssetBase}/assets/editorial-avatars/${avatarFile}`;
    await client.query(
      `INSERT INTO app_profiles(id,username,full_name,bio,avatar_url,account_type,is_synthetic,managed_by,content_language)
       VALUES($1,$2,$3,$4,$5,'personal',true,'Divergram',$6)
       ON CONFLICT(id) DO UPDATE SET username=EXCLUDED.username,full_name=EXCLUDED.full_name,bio=EXCLUDED.bio,
         avatar_url=COALESCE(NULLIF(app_profiles.avatar_url,''),EXCLUDED.avatar_url),
         is_synthetic=true,managed_by='Divergram',content_language=EXCLUDED.content_language`,
      [id, username, fullName, bio, avatarUrl, language],
    );
  }
  for (let day = 0; day < DAYS; day += 1) {
    for (let item = 0; item < 30; item += 1) {
      const post = buildPost(day, item);
      await client.query(
        `INSERT INTO app_editorial_schedule(post_id,scheduled_at,payload)
         VALUES($1,$2,$3::jsonb) ON CONFLICT(post_id) DO UPDATE SET scheduled_at=EXCLUDED.scheduled_at,payload=EXCLUDED.payload
         WHERE app_editorial_schedule.status='scheduled'`,
        [post.id, post.scheduledAt, JSON.stringify(post)],
      );
    }
  }
}

async function publishDue(client) {
  await client.query('BEGIN');
  try {
    const due = await client.query(
      `SELECT post_id,payload FROM app_editorial_schedule
       WHERE status='scheduled' AND scheduled_at<=now()
       ORDER BY scheduled_at FOR UPDATE SKIP LOCKED LIMIT 30`,
    );
    for (const row of due.rows) {
      const p = row.payload;
      await client.query(
        `INSERT INTO app_posts(id,user_id,caption,location,dive_type,dive_date,dive_site,publish_to_feed,publish_to_reels,created_at,content_language,content_origin)
         VALUES($1,$2,$3,$4,$5,$6,$7,true,false,now(),$8,'divergram_editorial')
         ON CONFLICT(id) DO NOTHING`,
        [p.id,p.userId,p.caption,p.location,p.diveType,p.diveDate,p.diveSite,p.language],
      );
      await client.query(`UPDATE app_editorial_schedule SET status='published',published_at=now(),error=NULL WHERE post_id=$1`, [p.id]);
    }
    await client.query('COMMIT');
    return due.rowCount;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

try {
  if (command === '--preview') {
    const sample = Array.from({length: 30}, (_, index) => buildPost(0,index));
    console.log(JSON.stringify({ok:true,startDate:START_DATE,countPerDay:30,total:DAYS*30,sample},null,2));
    process.exit(0);
  }
  const client = await pool.connect();
  try {
    if (command === '--install') {
      await install(client);
      const summary = await client.query(`SELECT status,count(*)::int count,min(scheduled_at) first_at,max(scheduled_at) last_at FROM app_editorial_schedule GROUP BY status ORDER BY status`);
      console.log(JSON.stringify({ok:true,timeZone:TIME_ZONE,summary:summary.rows},null,2));
    } else if (command === '--run') {
      await ensureSchema(client);
      const published = await publishDue(client);
      console.log(JSON.stringify({ok:true,published},null,2));
    } else {
      throw new Error('Use --preview, --install, or --run');
    }
  } finally {
    client.release();
  }
} catch (error) {
  console.error(JSON.stringify({ok:false,error:String(error?.message || error)},null,2));
  process.exitCode = 1;
} finally {
  await pool.end();
}
