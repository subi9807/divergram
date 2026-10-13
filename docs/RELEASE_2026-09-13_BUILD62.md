# Mobile release 1.2.11 (62)

## Scope
- Package the current workspace, including the diving guides and detail navigation.
- Preserve existing integrations and unrelated worktree changes.
- Retain native app version 1.2.11; synchronize package metadata, native build numbers and OTA runtime to build 62.

## Verification
- App TypeScript check: passed.
- App unit tests: 68 passed.
- Guide API unit tests: 3 passed.
- Android JavaScript production export: passed.
- Release readiness script: passed with an existing empty collected-data privacy-manifest warning. Review store privacy declarations and SDK manifests before final iOS review submission.

## Cloud builds and queued uploads
- Android build: 6a85c1d4-218f-4d55-98cc-4a3fdf40ec36
- iOS build: 8d4c7737-b5f4-4d02-a890-ee5aea6dd92c
- Android submission: 9863d82d-32fc-4ac4-a15f-04439c63fb5c (production, completed rollout requested, subject to Google review)
- iOS submission: aae06216-d28f-46c8-aa74-3901b0a72aec (App Store Connect upload, not App Review submission)

Builds and uploads were scheduled, not yet confirmed complete at the time of this record.
Never resubmit an older build as a fallback if either build fails.

## Store snapshot
App Store live version remains 1.2.9 (52). TestFlight 1.2.11 (61) is valid, with external beta review pending. Build 62 is the new release candidate. App Store upload alone does not make this version public.
