# Environment Notes

## Recommended separation

- `.env.server.example` : template only, safe to commit
- `.env.server.local` : local development defaults
- `.env.server` : active runtime file, do not commit real secrets
- `.env.local.example` : frontend template
- `.env.local` : local frontend runtime file

## Important

The current project previously contained real secrets in `.env.server`.
If those values were ever committed, shared, or uploaded, rotate:

- database password
- JWT_SECRET
- ADMIN_API_KEY
- any FCM service account credentials

## Local development rule

For local work, prefer copying from the example/local templates instead of reusing production secrets.
