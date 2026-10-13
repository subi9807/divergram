# AI Dive Log: first implementation increment

## Scope

This is a small, additive subset of Phase 1 in
`AI_DIVE_LOG_PLATFORM_ANALYSIS_2026-09-05.md`, not completion of Phase 1 or the
whole AI platform. Existing feed creation, device imports, log editing and
publication behavior are unchanged. App version/build numbers are unchanged.

Implemented:

- Owner-only server archive with create, paginated list, detail, source read and
  optimistic-concurrency edit endpoints.
- Separate original submission, effective document and revision history.
- Manual input is USER. Client-imported data is UNVERIFIED_IMPORT, never falsely
  labeled as verified device measurements. Corrections become USER values.
- Unknown measurements remain missing/null; dates are not filled with today.
- A repeat create with the same identity and normalized payload returns the
  existing document. Different content with an existing identity returns 409.
- Updates require baseRevision. A stale update returns 409 without overwriting.
- Source/history writes and effective writes share a transaction.
- Authenticated, unblocked owner checks and no-store response headers.
- Mobile entry: DiveLog management > Private log review. Users can manually
  create a private log, reload saved logs, compare first-submitted values and
  edit memo, depth and duration. The new screen supports ko/en/ja/zh.
- Account-keyed screen state is discarded on account changes. Failed saves keep
  inputs. Timed-out creates retain their identity for safe retries.

Original submissions are preserved by the API, but are not independently
attested measurements. No AI generation or device attestation is implemented
in this increment. Server original/history tables have no update endpoints;
database administrators can still modify data with direct SQL.

## Schema and API

Migration: `api/db/migrations/20260905000100_add_private_dive_logs.sql`.

- app_dive_logs: owner + id primary key, effective JSON, integer revision.
- app_dive_log_sources: immutable-through-API initial submission.
- app_dive_log_revisions: successive document snapshots.
- Owner reference is app_profiles.id; profile deletion cascades into all three.

Endpoints:

| Method | Path | Payload/result |
| --- | --- | --- |
| GET | /api/dive-logs | limit <= 100, after cursor; data + nextCursor |
| POST | /api/dive-logs | {data}; 201 new, 200 identical retry, 409 changed retry |
| GET | /api/dive-logs/:id | owner-only document |
| GET | /api/dive-logs/:id/source | owner-only initial submission |
| PATCH | /api/dive-logs/:id | {baseRevision, patch}; new revision or 409 |

The broader normalized facts/provenance schema in the design report remains a
follow-up, particularly for AI proposals, provider evidence and field-level
confidence. These new endpoints do not read or publish app_posts.

## Activation and rollback

No production deployment, production migration or mobile store build was run.
These are source changes only. A server without the new tables responds 503
with dive_logs_migration_required; the mobile screen does not claim a save.

Before production:

1. Back up the target database and apply the migration to a disposable staging
   database containing app_users and app_profiles. Confirm existing ownership
   identifiers match the foreign key.
2. Exercise real PostgreSQL concurrent PATCH/create and transaction rollback,
   then run authenticated mobile save/reload/account-switch tests.
3. Apply the additive migration before activating the new API and mobile entry.
   Example, using an explicitly selected staging connection:
   `psql "$STAGING_DATABASE_URL" -v ON_ERROR_STOP=1 -f api/db/migrations/20260905000100_add_private_dive_logs.sql`
4. Roll back by disabling the new mobile entry/API registration while retaining
   the new tables and user data. Do not drop tables after users have saved logs.

## Validation performed

- `npm --prefix api test`: 72 tests passed, including 10 new tests for validation,
  provenance, ownership, retry identity, stale revisions, rollback and paging.
- App `npx tsc --noEmit`: passed.
- ESLint on the added/modified app TSX/TS files: passed.
- New API module syntax checks and changed-file whitespace check: passed.
- iOS simulator was running. Opening the new route after reload reached the
  login screen; an authenticated visual/save test was not completed.

Route tests use a transaction-aware fake. They do NOT validate PostgreSQL SQL
execution, actual lock concurrency or native end-to-end persistence. Local
PostgreSQL was not installed/running on this host. Android native testing was
not performed.

## Remaining work, in order

1. Real database integration and authenticated iOS/Android tests; deploy only
   after those pass.
2. Connect existing edit/import/store flow to this repository, with owner-scoped
   drafts, recovery, correct unit/date normalization, preview and duplicate keys.
3. Extend the review UI beyond memo/depth/duration and provide explicit publish
   integration without weakening private-log ownership.
4. Preserve and validate full device profile/raw files. Add private media storage
   and access control before attaching sensitive originals. Existing HTTPS
   image URLs are not made private merely by storing their reference here.
5. Add normalized facts/proposals and EXIF time/GPS matching, then cached photo
   analysis and user-approved AI drafts according to the design report.

Legacy in-memory logs are NOT automatically migrated, imported or made durable
by this increment. The new archive is deliberately separate until that bridge
can be tested without losing data or changing publication semantics.
