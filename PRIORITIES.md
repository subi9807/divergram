# Divergram First Priorities

## 1. Security / secret hygiene
- Remove production secrets from active local workflow
- Confirm `.env.server` real secrets are not committed
- Decide whether `metabytree_idcserver.pub` belongs in repo
- Rotate DB/JWT/admin keys if previously exposed

## 2. Local reproducible dev boot
- Verify local PostgreSQL boot path works on this Mac
- Boot API/Web/Admin together and confirm routes
- Confirm `/api/health` and signup/login work locally

## 3. Auth and seed flow
- Make sure local auth seed users can actually log in
- Add a simple smoke test for signup/login/profile fetch

## 4. API modularization
- `server/index.js` is large and should be split by domain
- Start with auth, admin, chat/messages route separation

## 5. Deployment parity
- Compare local env, docker env, and production env
- Document required variables and safe defaults

## Recommended immediate next task
1. Verify local DB starts
2. Run API/Web/Admin
3. Test signup/login
4. Fix any boot/runtime errors before feature work
