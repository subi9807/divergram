# Divergram audit remediation and build verification

Date: 2026-09-05 (KST). Scope: the 13 findings in SYSTEM_CODE_AUDIT_2026-09-05.md.
The original report and its saved pre-fix probe output remain historical evidence.

## Remediation matrix

| Finding | Fix | Verification |
| --- | --- | --- |
| 1. Cross-owner upsert | Existing owner predicate in ON CONFLICT; ownership/relation fields excluded from updates | Route regression and real PostgreSQL upsert rejection |
| 2. Arbitrary room membership/message edits | Generic room/membership creation rejected; message changes require sender ownership; web uses transactional direct-chat and read-receipt endpoints | Route regressions; web typecheck/build |
| 3. Foreign Cloudinary deletion | Validate the owner segment against the signed-upload folder convention; reject ambiguous/legacy paths | Mocked transport proves foreign deletion makes no external call |
| 4. JWT purpose confusion | One session verifier rejects purpose/scope-bound and non-session tokens; legacy login tokens still accepted | Session/email/Wallet/link token regressions |
| 5. Blocked/deleted allowlisted admin | Always check current DB user, blocking, role and current email | Missing/blocked admin regressions |
| 6. Self-approved certification | User create/edit sets pending; explicit non-pending review changes rejected | Forged approval route test |
| 7. Date-valued refund calculation | Calendar date normalization and invalid-date rejection | Date-object refund returns USD 100 nineteen days before booking |
| 8. Concurrent overbooking | Lock existing resort row FOR UPDATE; availability edits use same lock; reject reducing capacity below occupied count and reopening terminal bookings | Two independent PostgreSQL connections compete for one seat; only one booking remains |
| 9. External API bypass | External creation uses same transactional capacity, closure, enabled and notice checks; external reference checked under lock | Shared-helper regressions and PostgreSQL concurrency test |
| 10. Public private-profile fields | Explicit projection omits license number/image and raw import fields; hidden fields cannot be filtered/sorted by public callers | SQL projection tests, read-only production schema check, live public response |
| 11. Whole-table reads | Parameterized SQL filtering, sorting and pagination; bounded pages; app combines larger requests in batches and scopes feed relations to current posts | SQL compiler tests and app typecheck |
| 12. First-100 resort search | Fetch all resort pages with stable ID ordering instead of two capped first-100 requests | App lint/typecheck; existing client search and ten-item rendering retained |
| 13. Korean notification templates | Server reads recipient language and selects Korean/English/Japanese/Chinese activity template | Five locale/fallback regression cases |

Additional app fixes: clear React Query cache on logout, always release pull-to-refresh state in finally, use app.json build numbers instead of hardcoded 52 in dynamic Expo config.

## Tests

- `npm --prefix api test`: 62 passed, zero failed.
- `npm run check`: app lint/typecheck, API syntax, web lint/typecheck, admin/web production bundles passed. Existing nonfatal lint warnings and admin chunk-size warning remain.
- `tools/booking-postgres-regression.mjs`: ran against a disposable `dg_codex_test_20260905` database on PostgreSQL 14; two connection capacity race and protected upsert passed. The database was dropped afterward.
- Production projection queries used `BEGIN READ ONLY` and `LIMIT 0`. No member records were printed or modified.
- Live API: health 200; posts/profiles 200; unauthenticated notification read and data write 401; public license number/image fields absent.
- Logs: `artifacts/system-audit-20260905/fix-tests.log` and `fix-check.log`.

## Deployment

API changes were deployed with PM2 restart, preserving environment variables and unrelated services.
Backup: `/home/divergram/api/.backup/security-fixes-20260905-0955.tar.gz`.

The production auth route differs from the working tree because of pending SNS work. Only session-token verification changes were applied to that production baseline, not unrelated SNS changes. Other changed API files were compared to the deployed baseline before copying.

Web chat compatibility updates were built on the server using its existing source baseline.
Backup: `/home/divergram/api/.backup/web-chat-20260905-0955.tar.gz`.

## Mobile builds

App version stays **1.2.9**. Both build numbers are **54**.

- Android: https://expo.dev/accounts/subi9806/projects/divergram/builds/20a08159-2675-4364-81e3-d97e9995c7eb
- iOS: https://expo.dev/accounts/subi9806/projects/divergram/builds/7bb8c6d1-b2d8-490b-9a3c-0af972ddaa2f
- Both iOS and Android status: FINISHED. Signed IPA and AAB generated, version 1.2.9 / build 54.
- iOS artifact: `app/.release/20260905/Divergram-1.2.9-54.ipa`; Info.plist confirms `1.2.9`, `54`, `com.divergram.app.ios`. `codesign --verify --deep --strict` passed.
- iOS IPA SHA-256: `60a1f9fb640af01446064b805b984a871465b0e7afb856109061d841ae097d5f`.
- Android artifact: `app/.release/20260905/Divergram-1.2.9-54.aab`.
- Android AAB SHA-256: `354a2a8a12011d97eb19aa52aaf41ba7f1135cc83707ca96bb0c5a65a88cc7f7`.
- Android `bundletool validate` and ZIP integrity checks passed. Manifest confirms `versionName=1.2.9`, `versionCode=54`, package `com.divergram.app`.
- Android `jarsigner -verify` returned `jar verified` (exit 0), with self-signed certificate, absent timestamp and JarInputStream/manifest-order warnings. These are recorded in `android-signature-check.log`; Play upload acceptance has not been tested. Bundle validation passed independently.
- Follow-up test submission: iOS submission `f6c40a19-51a8-4c1e-87d1-f4322617f371` is FINISHED (App Store Connect upload). TestFlight processing and tester installation are not independently verified.
- Android closed-test (alpha) submission `b2c54284-75a5-49a3-961b-e9bc01676577` is FINISHED with no submission error, using the existing build 54. Google review/tester availability and physical-device installation remain unverified. No production-track rollout was requested.
- Submission pages: https://expo.dev/accounts/subi9806/projects/divergram/submissions/f6c40a19-51a8-4c1e-87d1-f4322617f371 and https://expo.dev/accounts/subi9806/projects/divergram/submissions/b2c54284-75a5-49a3-961b-e9bc01676577

## Limits

- Automated and targeted integration checks do not prove every app screen is defect-free. Physical-device iOS/Android UI testing, real payments, external OAuth authorization and actual Wallet issuance were not rerun here.
- Existing historical notification bodies and user-authored Korean content were not rewritten.
- Legacy Cloudinary files outside the signed owner-folder format need verified ownership migration before deletion is allowed.
- Resort search completeness is fixed, but the app still loads all catalog pages before its local search. Server-search/infinite-network pagination is a separate performance improvement.
- Mocked route tests do not replace complete end-to-end flows; actual PostgreSQL was additionally used for the two database-level security/concurrency cases described above.
