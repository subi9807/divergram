export const MARINE_AI_FEATURE = 'marine_life_analysis';
export const FREE_MONTHLY_CREDITS = 3;
export const ANNUAL_MONTHLY_CREDITS = 30;

export function marineAnalysisCreditCost(mediaType) {
  return String(mediaType || '').toLowerCase() === 'video' ? 5 : 1;
}

function allowanceResponse(row) {
  const monthlyLimit = Number(row?.monthly_limit || FREE_MONTHLY_CREDITS);
  const usedCredits = Number(row?.used_credits || 0);
  return {
    plan: row?.plan === 'annual' ? 'annual' : 'free',
    monthlyLimit,
    usedCredits,
    remainingCredits: Math.max(0, monthlyLimit - usedCredits),
    periodStart: row?.period_start ? String(row.period_start).slice(0, 10) : null,
    membershipExpiresAt: row?.membership_expires_at || null,
  };
}

const ALLOWANCE_CTE = `
  WITH entitlement AS (
    SELECT expires_at
      FROM app_memberships
     WHERE user_id=$1
       AND plan_code='annual_ai'
       AND status='active'
       AND started_at <= now()
       AND expires_at > now()
     ORDER BY expires_at DESC
     LIMIT 1
  ), allowance AS (
    SELECT CASE WHEN EXISTS (SELECT 1 FROM entitlement) THEN 'annual' ELSE 'free' END AS plan,
           CASE WHEN EXISTS (SELECT 1 FROM entitlement) THEN ${ANNUAL_MONTHLY_CREDITS} ELSE ${FREE_MONTHLY_CREDITS} END AS monthly_limit,
           (SELECT expires_at FROM entitlement) AS membership_expires_at,
           date_trunc('month', now())::date AS period_start
  )`;

export async function getMarineAiAllowance(pool, userId) {
  const result = await pool.query(
    `${ALLOWANCE_CTE}
     SELECT a.plan,a.monthly_limit,a.membership_expires_at,a.period_start,
            COALESCE(u.used_credits,0) AS used_credits
       FROM allowance a
       LEFT JOIN app_ai_usage_monthly u
         ON u.user_id=$1 AND u.feature_code=$2 AND u.period_start=a.period_start`,
    [userId, MARINE_AI_FEATURE]
  );
  return allowanceResponse(result.rows[0]);
}

export async function reserveMarineAiCredits(pool, userId, requestedCredits) {
  const credits = Math.max(1, Number.parseInt(String(requestedCredits || 1), 10) || 1);
  const result = await pool.query(
    `${ALLOWANCE_CTE}, existing AS (
       SELECT used_credits
         FROM app_ai_usage_monthly
        WHERE user_id=$1 AND feature_code=$2
          AND period_start=(SELECT period_start FROM allowance)
     ), reservation AS (
       INSERT INTO app_ai_usage_monthly(user_id,feature_code,period_start,used_credits,updated_at)
       SELECT $1,$2,period_start,$3,now()
         FROM allowance
        WHERE $3 <= monthly_limit
       ON CONFLICT(user_id,feature_code,period_start) DO UPDATE
         SET used_credits=app_ai_usage_monthly.used_credits + EXCLUDED.used_credits,
             updated_at=now()
       WHERE app_ai_usage_monthly.used_credits + EXCLUDED.used_credits <= (SELECT monthly_limit FROM allowance)
       RETURNING used_credits
     )
     SELECT a.plan,a.monthly_limit,a.membership_expires_at,a.period_start,
            COALESCE((SELECT used_credits FROM reservation),(SELECT used_credits FROM existing),0) AS used_credits,
            EXISTS(SELECT 1 FROM reservation) AS reserved
       FROM allowance a`,
    [userId, MARINE_AI_FEATURE, credits]
  );
  const row = result.rows[0] || {};
  return { ...allowanceResponse(row), reserved: row.reserved === true, chargedCredits: credits };
}

export async function releaseMarineAiCredits(pool, userId, credits) {
  await pool.query(
    `UPDATE app_ai_usage_monthly
        SET used_credits=GREATEST(0,used_credits-$3),updated_at=now()
      WHERE user_id=$1 AND feature_code=$2 AND period_start=date_trunc('month',now())::date`,
    [userId, MARINE_AI_FEATURE, Math.max(1, Number(credits) || 1)]
  );
}
