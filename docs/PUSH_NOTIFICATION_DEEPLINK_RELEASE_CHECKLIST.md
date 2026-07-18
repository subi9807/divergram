# Push, Notification Inbox, Deep Link, and Release Checklist

Updated: 2026-07-19

## Change-safety rule

- [x] Do not remove or disable an existing module, SDK, login provider, AdMob feature, push feature, or app capability without explicit user approval.
- [x] Preserve unrelated local changes and verify the final diff before committing.

## 1. Admin push console

- [x] Keep and improve the existing admin push page instead of replacing it.
- [x] Add searchable member selection by email, display name, user ID, and role. Platform/token count remains follow-up.
- [ ] Show active device count and iOS/Android token availability before sending.
- [x] Support one member, selected members, segments, and all-member delivery.
- [x] Add notification type and custom destination/deep-link selection. Destination presets remain follow-up.
- [x] Add reusable templates, preview, immediate send, and scheduled send. Scheduled cancellation remains follow-up.
- [ ] Require confirmation for broad or high-volume sends and prevent accidental duplicate sends.
- [ ] Show per-send queued, success, failure, invalid-token, and read/open statistics.
- [ ] Keep an immutable admin audit trail without exposing raw device tokens.
- [ ] Add role-based permission checks for push creation, approval, and sending.

## 2. Server notification inbox

- [x] Persist admin and supported user-event pushes as server notification records before delivery.
- [x] Extend `app_notifications` with title, body, image, data JSON, destination/deep link, source, sent/read/open timestamps, and delivery status.
- [ ] Add notification list, unread count, mark-one-read, mark-all-read, and delete/archive APIs.
- [x] Make notification creation and push delivery idempotent with an event/deduplication key.
- [x] Add bounded listing and indexes for user ID and creation time. Cursor pagination remains follow-up.
- [ ] Define retention and deletion behavior for account withdrawal and legal retention.

## 3. App notification screen

- [x] Connect the existing full-menu `알림` screen to the server notification inbox.
- [x] Clearly distinguish unread and read items using styling and an unread indicator.
- [x] Show unread count badges in the full menu.
- [x] Mark an item read when opened and support mark-all-read.
- [x] Open the correct app destination when a notification is tapped in foreground, background, or terminated state.
- [ ] Refresh and synchronize the inbox after push receipt, app resume, and login.
- [ ] Provide empty, loading, offline, retry, expired-target, and deleted-content states.

## 4. Deep links and external sharing

- [x] Custom app scheme exists: `divergram://`.
- [x] Add iOS Associated Domains and Universal Links for `https://divergram.com/...`.
- [x] Add Android intent filters and App Links for `https://divergram.com/...`.
- [x] Publish and verify `/.well-known/apple-app-site-association` with HTTP 200 and JSON content type.
- [x] Publish and verify `/.well-known/assetlinks.json` with the Google Play app-signing SHA-256 fingerprint.
- [ ] Define canonical routes for post, reel, profile, diving log, license, and notification destinations.
- [x] Change external post sharing to canonical HTTPS URLs rather than app-only schemes.
- [ ] Add a web landing/fallback page that opens the app when installed.
- [ ] Route missing iOS apps to the live App Store listing.
- [ ] Until Android public release, route Android users to the closed-test/install information page; change to Google Play listing after public release.
- [ ] Preserve browser viewing or a safe fallback when the target content is unavailable.
- [ ] Test cold start, warm start, logged-out flow, login continuation, and deleted/private content.

## 5. Push automation by situation

- [ ] Define an event catalog before enabling automatic sends.
- [x] Start transactional automation for comment, like, follow, and admin notice. Mention, message, certification, and account/security remain follow-up.
- [ ] Add diving-specific events: weather/safety alert, scheduled dive reminder, log processing, and buddy activity.
- [x] Respect each user's notification settings for automated like/comment/follow push delivery.
- [ ] Add quiet hours, timezone handling, frequency caps, batching, and deduplication.
- [ ] Separate mandatory service/security messages from optional marketing messages.
- [ ] Record consent and provide opt-out controls for promotional notifications.

## 6. Quality and operations

- [ ] Verify Firebase projects, iOS APNs production/development keys, Android Firebase app, and service-account project alignment.
- [ ] Add push delivery retry policy and dead-letter/failure inspection.
- [x] Automatically deactivate only tokens confirmed as unregistered for admin delivery.
- [ ] Add monitoring and alerts for delivery failure spikes and queue backlog.
- [ ] Avoid logging raw tokens or private notification payloads.
- [ ] Add API tests, app unit tests, deep-link routing tests, and iOS/Android physical-device tests.
- [ ] Verify accessibility, localization, and notification permission recovery UX.

## 7. Release and Git

- [ ] Review all existing dirty-worktree changes and separate unrelated files from this release.
- [x] Run app/web type checks, API syntax checks, admin/web production builds, and native configuration checks. Physical-device crash smoke tests remain after installation.
- [x] Increment marketing version to 1.2.6, iOS build number to 44, and Android version code to 40.
- [x] Build iOS 1.2.6 (44) successfully and schedule App Store Connect/TestFlight submission (EAS submission 04719092-47d1-45e0-8adb-8ec42218fa66).
- [ ] Build and upload Android to the closed-test track.
- [ ] Verify installed builds, login, push, notification inbox, deep links, sharing, AdMob, and crash-free startup.
- [ ] Update release notes and the project work log.
- [ ] Commit all approved source/configuration changes and push them to GitHub.
- [ ] Do not commit credentials, service-account JSON, APNs keys, signing keys, generated APK/AAB/IPA files, or local environment files.

## Current findings

- Existing admin APIs already provide templates, test sending, immediate/scheduled sending, history, filters, and audit logging.
- Existing app notification UI already lists `app_notifications` and supports individual/all read operations, but admin pushes are not yet persisted into that inbox.
- The custom `divergram://` scheme exists, but iOS Universal Links, Android verified App Links, AASA, and `assetlinks.json` were not found.
- iOS is publicly available; Android fallback behavior must remain test-track aware until public release.
- Production API, notification schema, admin UI, web association files, and root-domain association responses have been deployed and health-checked.
- Current store builds: iOS 1.2.6 (44) and Android 1.2.6 (40). Upload completion and installed-build smoke tests remain release gates.
