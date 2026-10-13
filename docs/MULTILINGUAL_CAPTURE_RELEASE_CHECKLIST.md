# Divergram multilingual capture and website release checklist

Updated: 2026-08-12

## A. Capture target screens

| No. | File name | App route / state | Purpose | KO | EN | JA | ZH |
|---:|---|---|---|:---:|:---:|:---:|:---:|
| 01 | `01-login.png` | Login | Store entry and authentication | ✓ | ✓ | ✓ | ✓ |
| 02 | `02-feed.png` | Feed | Global dive feed | ✓ | ✓ | ✓ | ✓ |
| 03 | `03-explore.png` | Explore | Photo and point discovery | ✓ | ✓ | ✓ | ✓ |
| 04 | `04-resorts.png` | Resorts | Resort search and detail entry | ✓ | ✓ | ✓ | ✓ |
| 05 | `05-profile.png` | Profile | Diver identity, logs and badges | ✓ | ✓ | ✓ | ✓ |
| 06 | `06-reels.png` | Reels | Video community | ✓ | ✓ | ✓ | ✓ |
| 07 | `07-dive-log.png` | Dive log | Dive record management | ✓ | ✓ | ✓ | ✓ |
| 08 | `08-license.png` | License | Education and certification | ✓ | ✓ | ✓ | ✓ |

Locales: `ko`, `en`, `ja`, `zh`. Every screenshot must be captured from the simulator after setting the app language, not translated by drawing text over an image.

## B. Execution checklist

- [x] Fix the capture list and semantic filenames.
- [x] Compare all locale JSON leaf keys with Korean and remove Korean fallback text from EN/JA/ZH.
- [x] Boot the iOS simulator and install the current app build.
- [x] Seed approved preview data that looks like a real operating feed.
- [x] Capture the eight screens for all four languages.
- [x] Visually inspect all 32 captures for Korean leakage, clipping, test words, personal data and empty/loading states.
- [x] Generate store-ready iPhone source captures and Play Store phone/tablet locale sets.
- [x] Copy the approved source captures to `site/assets/screens/{locale}`.
- [x] Verify the localized home, service, contact and policy surfaces and fix untranslated product copy.
- [x] Replace all legal pages with one stable responsive policy shell.
- [x] Create website inquiry DB migration and public/admin APIs.
- [x] Connect customer support and partnership forms to the API.
- [x] Add separate customer-support and partnership menus to the admin console.
- [x] Test public API validation, CORS, spam controls, DB tables and admin build. (Admin status updates require an authenticated live inquiry.)
- [x] Deploy API, admin and site changes to production.
- [ ] Upload locale screenshots to App Store Connect (blocked: issuer ID missing).
- [x] Upload locale screenshots to Google Play Console.
- [x] Verify the Google Play locale upload order from the Supply upload log.
- [ ] Re-open App Store locales after App Store authentication is configured.
- [x] Complete production smoke tests for site, contact, policy, admin, API health, CORS and DB schema.

## C. Store asset destinations

```text
app/fastlane/screenshots/{ko,en,ja,zh}/
app/fastlane/metadata/android/{ko-KR,en-US,ja-JP,zh-CN}/images/
├── phoneScreenshots/
├── sevenInchScreenshots/
└── tenInchScreenshots/
```

App Store upload uses `fastlane ios upload_store_assets`. Google Play upload uses Fastlane Supply. Upload requires the configured production store credentials and is only complete after a live console verification.

## D. Acceptance rules

- No Korean characters appear in EN, JA or ZH captures unless they are unavoidable user-generated proper nouns explicitly approved for release.
- No `테스트`, placeholder, debug, preview, localhost, development-client or loading UI appears.
- Legal page text is readable at 320 px through desktop width without horizontal overflow.
- Website inquiries persist even if the visitor has no email client configured.
- Admin users can filter, open, assign, annotate and change inquiry status.
- Website, API and admin production checks all return successful responses after deployment.
