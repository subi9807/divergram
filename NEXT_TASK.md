# Recommended Next Task

## Start here
Local boot verification and auth smoke test.

### Why this first
- The project now has local env templates, scripts, and seed helpers.
- Before feature work, verify API/Web/Admin actually boot together.
- Signup/login is the first critical product path and will expose DB/env/runtime issues quickly.

## Concrete steps
1. Start PostgreSQL
2. Run `bash run-local-all.sh`
3. Check `/api/health`
4. Run `npm run seed:local:auth`
5. Test login with seeded users
6. Test signup with a brand new user
7. Note all boot/runtime/API errors

## After that
If auth boot is stable, move to:
- split `server/index.js`
- harden secret handling
- inspect admin workflows
