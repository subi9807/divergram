# Divergram Production E2E and Monitoring

Updated: 2026-10-06

## Automated production monitoring

`.github/workflows/production-monitor.yml` runs every 30 minutes and can also be started manually. It validates response status and payload semantics rather than only checking that a URL returns HTTP 200.
Large image and video checks use a 1 KiB range probe and cancel the response body, so scheduled checks do not repeatedly download full media files.

The public monitor covers:

- API health and anonymous session behavior
- Google and Apple OAuth availability and production callback URLs
- Dive guide list data in Korean, English, Japanese, and Chinese
- Latest guide detail, deep-link landing page, and cover image
- Public feed, reels, resort, and advertising payloads
- Latest feed/reel media plus post, reel, and resort deep-link landing pages
- PayPal resort payment configuration
- Authentication guards for memberships, bookings, dive logs, notifications, media upload, and admin APIs
- Divergram website, service page, privacy page, and admin login
- iOS Universal Links and Android App Links association files

Run locally:

```bash
node --test tools/monitor-production.test.mjs
node tools/monitor-production.mjs
```

Optional repository secrets:

- `MONITOR_ALERT_WEBHOOK_URL`: receives a failure notification. Never include credentials in this URL or commit it.
- `DIVERGRAM_MONITOR_EMAIL`: dedicated, non-admin production smoke-test account.
- `DIVERGRAM_MONITOR_PASSWORD`: password for that dedicated account.

When both account secrets exist, the monitor also verifies login plus read access to the authenticated session, private dive logs, booking history, annual membership configuration, notification settings, and notification inbox. The token is held only in memory and is never printed.

Do not use a real member or administrator account for scheduled monitoring. The monitor intentionally performs no authenticated writes.

## Write-path E2E gate

The following checks must use a dedicated test account and controlled fixtures. They are not safe to run continuously against arbitrary production data:

1. Create an account and confirm required consent receipts.
2. Complete Google login on Android and iOS.
3. Complete Apple login on iOS.
4. Upload a seeded photo and verify its returned media URL.
5. Create a uniquely tagged private dive log, reload it, then delete only that tagged record.
6. Create a booking against a designated test resort/date and cancel only that booking.
7. Complete annual membership in each store sandbox/test environment.
8. Complete a PayPal sandbox resort deposit and verify webhook-driven status.
9. Send one test push to each physical device, open it, and verify inbox read state and destination routing.
10. Open HTTPS and custom-scheme deep links from cold, warm, and signed-out app states.

Production write automation must remain disabled until the test user, test resort, cleanup policy, and payment sandbox fixtures are explicitly assigned. Use idempotency keys and a run-specific marker for every created record.

## Physical-device matrix

| Workflow | iOS | Android | Automation boundary |
|---|---|---|---|
| Email signup/login | Required | Required | UI automation after seeded account setup |
| Google login | Required | Required | Provider UI and real device interaction required |
| Apple login | Required | Not applicable | Apple account interaction required |
| Photo upload | Required | Required | Seed the same non-sensitive photo on each device |
| Dive log save/read/delete | Required | Required | Use a unique E2E marker |
| Booking and cancellation | Required | Required | Use a dedicated test resort/date |
| Annual membership | Store sandbox | Play test track | Store tester accounts required |
| Resort deposit | PayPal sandbox | PayPal sandbox | Current production config remains sandbox/sample |
| Push and inbox | Required | Required | Real APNs/FCM tokens required |
| Universal/App Links | Required | Required | Install store-signed or release-equivalent builds |

## Current release blockers

- Resort payments currently report PayPal sandbox/sample mode. This is suitable for test payments, not live customer collection.
- Authenticated scheduled monitoring remains read-only until the dedicated monitor account secrets are configured.
- OAuth, push, payment sheets, and cold-start deep links still require the physical-device matrix above before production release.
- Maestro uses Android Studio's bundled JBR on this machine. The signed-in iOS simulator core flow passed on iPhone 17 Pro / iOS 26.5 after handling the simulator's Apple account verification prompt.
- The iOS simulator now passes custom-scheme and HTTPS Universal Link signed-out continuation. Expo Router rewrites canonical public links through `+native-intent` before route resolution, preventing the previous not-found screen.
- The Android 1.2.12 (67) arm64 release APK builds successfully and passes custom-scheme plus HTTPS App Link signed-out continuation on the API 36 emulator without a fatal, AndroidRuntime, or React Native exception. Because the local APK uses the debug signing certificate, the emulator domain was explicitly approved before the HTTPS check; store-signed physical-device verification remains required.

## Incident response

1. Treat a monitor failure as a release blocker until reproduced or explained.
2. Check the failed URL, semantic error, HTTP status, and latency in the GitHub Actions summary.
3. Correlate the timestamp with API, web, and admin deployment logs.
4. Roll back only the affected deployment; do not remove unrelated app capabilities.
5. Re-run the workflow manually and complete the relevant physical-device smoke test before closing the incident.
