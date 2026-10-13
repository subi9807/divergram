# Push, Notification Inbox, Deep Link, and Release Checklist

Updated: 2026-10-05

## Change-safety rule

- [x] Do not remove or disable an existing module, SDK, login provider, AdMob feature, push feature, or app capability without explicit user approval.
- [x] Preserve unrelated local changes and verify the final diff before committing.

## 1. Admin push console

- [x] Keep and improve the existing admin push page instead of replacing it.
- [x] Add searchable member selection by email, display name, user ID, and role.
- [x] Show active device count and iOS/Android token availability before sending.
- [x] Support one member, selected members, segments, and all-member delivery.
- [x] Add notification type and custom destination/deep-link selection. Destination presets remain follow-up.
- [x] Add reusable templates, preview, immediate send, and scheduled send. Scheduled cancellation remains follow-up.
- [x] Require confirmation for broad or high-volume sends and prevent accidental duplicate sends.
- [x] Show per-send queued, success, failure, invalid-token, and read/open statistics.
- [x] Keep an immutable admin audit trail without exposing raw device tokens.
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
- [x] Refresh and synchronize the inbox after push receipt, app resume, and login.
- [ ] Provide empty, loading, offline, retry, expired-target, and deleted-content states.

## 4. Deep links and external sharing

- [x] Custom app scheme exists: `divergram://`.
- [x] Add iOS Associated Domains and Universal Links for `https://divergram.com/...`.
- [x] Add Android intent filters and App Links for `https://divergram.com/...`.
- [x] Publish and verify `/.well-known/apple-app-site-association` with HTTP 200 and JSON content type.
- [x] Publish and verify `/.well-known/assetlinks.json` with the Google Play app-signing SHA-256 fingerprint.
- [x] Define canonical public routes for post, reel, profile, resort, guide, and marine-life destinations while retaining internal diving-log, license, and notification compatibility.
- [x] Change external post sharing to canonical HTTPS URLs rather than app-only schemes.
- [x] Add a web landing/fallback page that opens the app when installed.
- [x] Route missing iOS apps to the live App Store listing.
- [x] Route missing Android apps to the Google Play listing.
- [x] Preserve a branded browser fallback with an explicit website continuation link.
- [x] Preserve a pending destination through login and resume the requested content after authentication.
- [ ] Test cold start, warm start, logged-out continuation, and deleted/private content on physical iOS and Android devices after installing the next native build.

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
- [x] Add push delivery retry policy and dead-letter/failure inspection.
- [x] Automatically deactivate only tokens confirmed as unregistered for admin delivery.
- [x] Add public production monitoring with semantic API, website, OAuth, payment, upload-guard, and association-file checks plus an optional failure webhook. Delivery-spike and queue-backlog thresholds remain follow-up.
- [x] Avoid logging raw tokens or private notification payloads.
- [x] Add API tests, app unit tests, deep-link routing tests, and production-monitor contract tests. iOS/Android physical-device tests remain a release gate.
- [ ] Verify accessibility, localization, and notification permission recovery UX.

## 7. Release and Git

- [ ] Review all existing dirty-worktree changes and separate unrelated files from this release.
- [x] Run app/web type checks, API syntax checks, admin/web production builds, and native configuration checks. Physical-device crash smoke tests remain after installation.
- [x] Increment marketing version to 1.2.6, iOS build number to 44, and Android version code to 40.
- [x] Build iOS 1.2.6 (44) successfully and schedule App Store Connect/TestFlight submission (EAS submission 04719092-47d1-45e0-8adb-8ec42218fa66).
- [x] Build Android 1.2.6 (40) and upload it successfully to the Google Play alpha/closed-test track (EAS submission b45ef899-daa2-415a-8448-82067c1508d3).
- [x] Verify Android 1.2.6 (40) from the Google Play closed-test track on a Galaxy S20+: fresh install, notification/location permission flow, cold start, and no fatal/ANR/React Native crash log.
- [x] Verify the current iOS 1.2.6 source build on an iPhone 17 simulator: native build/install, feed startup, and no fatal/exception crash log. TestFlight physical-device validation is still required.
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
- Google Play app-signing SHA-1 is registered in Google Auth Platform as `Divergram-Android-Play`; Google login succeeded on the Play-installed Galaxy S20+ build.
- Admin FCM payload metadata is normalized to strings as required by FCM. Production background delivery, notification-tray display, inbox deep-link navigation, unread count, and mark-read synchronization passed on Android; one stale token was automatically deactivated.
- The production admin push page previews the filtered audience without exposing raw tokens. On 2026-09-06 it reported 22 members and 39 active devices (iOS 9, Android 30), and kept broad-send submission disabled until the operator confirmed the current audience fingerprint.
- Push history now joins notification records through the event key and displays provider acceptance, queued, failed, invalid-token, read, and open counts. The production readback for the single validation notification showed one stored and provider-accepted record without issuing another push.
- Push audit writes are append-only through the admin API. Future audit rows retain actor, filters, counts, message length, and token hashes where needed, but omit raw tokens, message bodies, and custom payload data.
- The app root notification bridge invalidates the authenticated user's notification query after foreground receipt, notification response, app resume, and user/login changes; the notification screen then reloads the server-backed inbox.
- Canonical HTTPS and `divergram://` routes are centralized in `parseAppDeepLink` and `resolveAppDeepLink`; automated tests cover public content, legacy aliases, both schemes, and reject unknown hosts. Public share URL creation is centralized in `buildShareUrl`.
- The app now handles initial and warm-start URLs independently of push notifications, stores a pending destination through authentication, and resumes it after login.
- The mobile-aware `open-app.html` fallback routes iPhone/iPad users to App Store app ID `6769253236` and Android users to Google Play package `com.divergram.app` when the app does not open. Both store endpoints returned HTTP 200 on 2026-09-14.
- Transient per-device push failures retry after 1, 5, and 20 minutes using internal token IDs rather than raw tokens. Invalid tokens are deactivated immediately, permanent or exhausted failures become `admin.push.dead-letter` records, and the admin history distinguishes retries from final failures.
- Current store builds: iOS 1.2.6 (44) submitted successfully to App Store Connect and Android 1.2.6 (40) uploaded successfully to the Google Play alpha/closed-test track. Android installed-build startup passed on a Galaxy S20+; iOS source-build startup passed in the simulator. TestFlight physical-device and feature smoke tests remain release gates.
- The scheduled production monitor now runs every 30 minutes and can optionally use a dedicated non-admin account for read-only authenticated probes. The write-path and physical-device gates are documented in `docs/OPERATIONS_E2E_MONITORING_2026-10-05.md`.
- iPhone 17 Pro / iOS 26.5 simulator automation verifies both `divergram://` and HTTPS Universal Link signed-out continuation. Incoming canonical links are rewritten before Expo Router resolves them, so `/guide/:id` no longer remains on the not-found screen.
- Android 1.2.12 (67) was built as an arm64 release APK and passed the same custom-scheme and HTTPS App Link signed-out continuation flow on the API 36 emulator with no fatal crash log. The local APK was debug-signed for installation, so the emulator domain was manually approved; Google Play-signed physical-device coverage remains open.
