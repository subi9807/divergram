# Login / Signup Smoke Checklist

## Boot
- Start PostgreSQL
- Start API (`bash run-local-api.sh`)
- Start Web (`bash run-local-web.sh`)
- Optional: Start Admin (`bash run-local-admin.sh`)
- Confirm API health: `GET /api/health`

## Signup flow
- Open Web on `http://127.0.0.1:5173`
- Create a brand new account
- Confirm signup succeeds without 500 error
- Confirm login works right after signup
- Confirm JWT/session is stored client-side as expected

## Seeded auth flow
- Run `npm run seed:local:auth`
- Login with:
  - `admin@local.dev / Admin1234!`
  - `user@local.dev / User1234!`
- Confirm both accounts can log in

## Post-login checks
- Profile fetch succeeds
- Feed endpoint returns response
- Creating basic profile/post data does not 500
- Admin page loads if API base is correct

## Failure clues
- 401/403 immediately after login → token parsing or auth header issue
- 500 on signup → DB schema mismatch or missing env
- network/CORS issue → check `CORS_ORIGINS` and `VITE_API_BASE_URL`
- empty login success but broken profile → seeded auth user exists without matching app_profile flow
