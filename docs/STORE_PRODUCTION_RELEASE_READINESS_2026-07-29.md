# Divergram Production Release Readiness

Updated: 2026-07-29

This is an engineering and store-submission checklist, not final legal advice.
Do not remove or disable an existing SDK, login provider, AdMob, push feature,
or app capability without the user's explicit approval.

## Release decision

Status: **BLOCKED for public production launch** until every P0 item is closed.
Closed testing and TestFlight testing may continue.

## P0: store submission blockers

- [x] Complete the Google Play content-rating questionnaire (Korea: age 12+).
- [x] Change Google Play advertising declaration from "no ads" to "contains ads".
- [x] Replace the Google Play account-deletion URL with
  `https://divergram.com/account-deletion`.
- [x] Complete and submit Google Play Data safety. Collection, sharing,
  required/optional status, purposes, privacy URL, and deletion URLs were
  submitted for review on 2026-07-29.
- [x] Change App access from unrestricted to login-required and provide a
  non-expiring reviewer account. Production email login was verified with HTTP 200.
- [ ] Confirm the intended minimum audience. The app currently requires age 14+,
  while Play includes the 13-15 bucket.
- [ ] Satisfy the closed-test production-access requirement: at least 12 opted-in
  testers continuously enrolled for the required period shown by Play Console.
- [ ] Publish legally approved canonical terms and privacy documents.

## Reviewer access

Provide a stable email review account that:

- is not pending deletion, blocked, or dependent on expiring OTP;
- can open feed, profile, dive log, map, messages, notification inbox, and settings;
- has sample content for review;
- documents how Google, Apple, and Instagram login behave;
- explains permission-denied paths for photo, camera, notification, Bluetooth, and location.

Never store the reviewer password in Git. Put credentials only in the store's
encrypted review-access field.

Completed on 2026-07-29: a dedicated, email-verified, unblocked reviewer account
was created in production, verified through the production login API, and saved
only in Google Play's review-access field.

Suggested reviewer navigation:

1. Sign in with the review account.
2. Feed: verify user-generated content and AdMob slots.
3. Full menu > Notifications: verify inbox and read/unread state.
4. Profile > Settings > Account management: verify account deletion.
5. Point map and dive log: verify location permission purpose.
6. Full menu > License management: verify license/OCR flow.

## Google Play Data safety inventory

Every row must be reviewed for collected/shared, required/optional, purpose,
retention, and deletion. "Shared" includes SDK transmission to service providers.

| Category | Representative data | Purpose | Current systems |
| --- | --- | --- | --- |
| Personal info | email, display name, handle, phone | authentication, profile, support | API/DB, OAuth |
| Account identifiers | internal user ID, Google/Apple/Instagram subject ID | sign-in and account linking | API/DB |
| Photos and videos | avatar, feed/reel media, license image | social content and profile | API/media storage |
| User content | posts, comments, messages, dive logs | core service | API/DB |
| Location | coarse, precise, dive point and route | map and dive tracking | device, API/DB |
| App activity | follows, likes, searches, notification reads | service features and operations | API/DB |
| Device identifiers | FCM/APNs token, advertising ID where allowed | push and advertising | Firebase, AdMob, API/DB |
| Diagnostics | crash and performance metadata when enabled | stability | Sentry/Expo/native logs |
| Preferences | privacy, units, notification and display settings | multi-device synchronization | device, API/DB |
| Sensitive user input | emergency contact, insurance, diving license | safety and diving profile | API/DB |

Required declarations:

- Data is encrypted in transit with HTTPS.
- Passwords are one-way hashed and are not decryptable.
- Sensitive server preference/integration values use authenticated encryption
  where implemented.
- Optional fields and permissions are identified as optional.
- Account deletion covers primary DB records, media objects, OAuth links, push
  tokens, caches, and documented backup expiry.
- AdMob, Firebase, Apple, Meta/Instagram, Expo/EAS, Sentry, PayPal, media/CDN,
  and infrastructure providers are disclosed only when actually active.

## Advertising and tracking

- [x] Google Play advertising descriptor is Yes and the update is under review.
- [ ] App Store age-rating Advertising descriptor is Yes.
- [ ] Production AdMob IDs and test IDs are environment-separated.
- [ ] Test devices never generate invalid production traffic.
- [x] EEA/UK UMP consent refresh, required-form display, and ad-request gating
  are implemented at app startup.
- [x] A privacy-settings action opens Google's privacy options form when the
  user's region and consent state require it.
- [ ] Physically test the UMP form with a regulated-region test device before release.
- [ ] iOS ATT timing and `NSUserTrackingUsageDescription` match runtime behavior.
- [ ] App Store privacy labels match the AdMob/Firebase/Sentry configuration.
- [ ] Ads are visually labelled and cannot be confused with user posts.

The current iOS privacy manifest declares tracking false while the AdMob plugin
adds tracking-purpose wording. Resolve this using observed physical-device
behavior before changing either declaration.

## Account deletion contract

Public page: `https://divergram.com/account-deletion`

- [x] Explain the in-app path.
- [x] Explain the 30-day recovery period.
- [x] Explain how users who cannot log in can request deletion.
- [x] Explain in-app deletion of profile, post/reel, dive-log, notification,
  and preference data without closing the account.
- [ ] Verify the production endpoint schedules deletion once and returns exact dates.
- [ ] Verify re-login is restricted to recovery until cancellation.
- [ ] Verify cancellation immediately clears pending-deletion state on every device.
- [ ] Define deletion/anonymization for profiles, OAuth links, preferences, push
  tokens, posts, media, messages, licenses, logs, analytics, and backups.
- [ ] Add an auditable deletion worker and failure alert.
- [ ] Confirm statutory retention exceptions with qualified counsel.

## Android release engineering

- [ ] Generate a release AAB and inspect every native `.so` for 16 KB page alignment.
- [ ] Resolve the Play warning for deprecated Android 15 wide-screen APIs.
- [x] Remove the Android portrait activity lock and allow the Expo app to use
  the device's supported orientation.
- [ ] Test splash, safe areas, Google login, FCM, App Links, AdMob, media upload,
  account deletion/recovery, and cold start on physical Android devices.
- [ ] Generate a Play pre-launch report using the reviewer account.
- [ ] Verify Play App Signing SHA-256 in `assetlinks.json` and Google OAuth.
- [x] Remove the release-to-debug signing fallback. Missing upload credentials
  now fail the release build instead of creating an invalid production artifact.

## iOS release engineering

- [ ] Test the production configuration on a physical iPhone via TestFlight.
- [ ] Test Apple/Google/Instagram sign-in, APNs, Universal Links, AdMob/ATT,
  media upload, account deletion/recovery, and cold start.
- [ ] Reconcile `PrivacyInfo.xcprivacy` with actual collected data and SDK manifests.
- [ ] Confirm Associated Domains, APNs environment, Bundle ID, and Firebase plist.
- [ ] Provide complete App Review notes and a stable reviewer account.
- [ ] Confirm Advertising age-rating descriptor is Yes.

## Store listing quality

- [ ] Upload at least four current phone screenshots.
- [ ] Add 7-inch and 10-inch tablet screenshots, or remove tablet support only
  after explicit user approval.
- [ ] Verify Korean and English descriptions, support URL, privacy URL, and contact email.
- [ ] Keep screenshots free of test data, broken images, debug UI, and personal information.
- [ ] Prepare release notes that match the exact candidate commit.

## Operations gates

- [ ] Health endpoint and dependency checks are monitored.
- [ ] API 5xx, app crash/ANR, push failure, queue backlog, disk, and DB alerts exist.
- [ ] Automated DB/media backups run, and a restore drill is documented.
- [ ] Secrets have named owners, rotation dates, and no repository exposure.
- [ ] Admin actions and bulk push sends have immutable audit records and RBAC.
- [ ] Privacy/support mailboxes have owners and response targets.
- [ ] Incident response and app/API rollback procedures are rehearsed.
- [ ] UGC report, moderation, copyright, sanction, and appeal processes are staffed.

## Final candidate gate

1. Freeze the approved scope without discarding the current dirty worktree.
2. Review and separate unrelated changes.
3. Run API tests, app lint/type checks, web/admin builds, native config checks.
4. Increment one shared marketing version and platform build numbers.
5. Build from one recorded commit SHA.
6. Run Android/iOS physical-device smoke and deep-link tests.
7. Upload to closed testing and TestFlight.
8. Review Play pre-launch report and TestFlight crash feedback.
9. Close all P0 items and obtain legal approval.
10. Apply for production access and submit for review.
