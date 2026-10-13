# Dive Log numbered progress

Updated: 2026-09-06. Numbering follows section 25 of the additional UX request.

| Number | Work | Status |
| --- | --- | --- |
| 1 | Existing screen analysis | Completed; both main logs.tsx and imported-log editor identified |
| 2 | UX problem identification | Completed; findings in DIVE_LOG_UX_INCREMENT_2026-09-05.md |
| 3 | UX improvement | Implemented increments; iOS disclosure and photo flow verified, full save/recovery gates pending |
| 4 | Data source structure | Original snapshots and correction sources implemented; canonical integration pending |
| 5 | EXIF/GPS | Shared parser, review UI, confirmation and private validation implemented; platform/persistence gates pending |
| 6 | Photo and dive time matching | Implemented with explicit user confirmation; unit tested |
| 7 | Photo AI analysis | Authenticated, consent-gated suggestion API and review UI implemented; live provider test pending |
| 8 | Voice input / speech-to-text | Native recording and consent-gated transcription implemented; iOS native compile passed, live transcription pending |
| 9 | AI Dive Log Generator | Reviewed inputs, editable draft and explicit acceptance implemented; prompt regression tested |
| 10 | Weather / marine structure | Current-only lookup policy and per-log environment card implemented; historical provider pending |
| 11 | Dive computer integration layer | Capability registry implemented; unverified BLE log protocols explicitly remain unsupported |
| 12 | Legacy import wizard | JSON/CSV preview-review-import flow implemented; canonical server promotion pending |
| 13 | Marine Life Collection | Confirmed-candidate collection implemented in Dive Discovery |
| 14 | Statistics | Missing-aware personal statistics implemented in Dive Discovery |
| 15 | Natural Language Search | Deterministic multilingual filters implemented; no generated SQL execution |
| 16 | AI Insights | Evidence-counted local insights implemented without safety or medical claims |
| 17 | AI Copilot review | Evidence-backed Accept/Edit/Ignore inbox implemented; ignored IDs recover with drafts |
| 18 | AI cost policy | Task-specific server model policy and owner-scoped narrative cache implemented |
| 19 | Field source details | Expandable EXIF, AI, environment, import and user-review source details implemented |
| 20 | One-Tap readiness | Compact required/optional preparation checklist implemented in the editor |
| 21 | Canonical legacy import bridge | Reviewed imports persist to the private API before entering the local list; production migration pending |
| 22 | Dive editor localization | Removed Korean literals from the editor and localized validation, recovery, media and save states in four languages |
| 23 | Dive detail localization | Localized the detail summary, measurements, source, visibility and edit action |
| 24 | AI settings localization | Localized AI feature controls, storage source and synchronization state |
| 25 | Dive Log management localization | Localized filters, sync failures, date formatting and manual import feedback |
| 26 | Shared Dive Log components | Localized card fallbacks, source labels and all synchronization badges |
| 27 | Main log form fallback safety | Removed Korean defaultValue fallbacks from the primary log and daily-post form |
| 28 | Resort detail localization | Added complete four-language labels for 66 amenities and localized favorite accessibility actions |
| 29 | Resort list localization | Removed Korean fallbacks and localized resort ads, favorites, sorting and empty states |

## Earlier checkpoint: step 3

The simulator's main Log Creation screen is distinct from DiveLogEditScreen.
Previous layout changes cover the imported-log editor, not the entire primary
creation screen. Do not report step 3 complete based only on those changes.

Observed main-screen bug: empty coordinates were displayed as 0.000000,
0.000000 because Number('') equals zero. The parser now preserves unknown
coordinates as null, retains real zero, and rejects out-of-range values.
Three regression tests cover these cases.

Remaining step-3 gates:

- Reconcile the main creation UX with the imported-log review UI, retaining
  daily-post, gas and existing publishing functionality.
- Test unchanged edit, collapsed detail retention, incomplete input, server
  failure, draft restoration and explicit AI confirmation.
- Authenticated iOS and Android interactive validation. Bundle generation and
  unit checks alone do not satisfy this gate.

At this checkpoint the completed-through number was 2. The user's subsequent
request explicitly extends implementation through 5; see the checkpoint below.

## 2026-09-06: main form disclosure verified on iOS

- Main logs.tsx keeps depth/duration visible and groups resort, temperature,
  visibility and buddy behind a collapsed additional-details control.
- The control reports the filled count and its expanded accessibility state.
  FieldCard inputs now have meaningful accessibility labels.
- Existing zero values survive edit hydration. The existing buddy_name column
  is projected as buddyName, separately from the legacy resort/buddy column.
- iPhone 17 Pro simulator: entered temporary temperature 0 and QA Buddy,
  collapsed and reopened the section, confirmed both values and count 2.
  Both temporary inputs were cleared; count returned to 0. No post was saved
  or published. The empty-coordinate 0,0 display is gone.
- Three new supplement tests plus coordinate/GPS tests: 9 passed. TypeScript
  and edited screen/helper ESLint passed. Native Android, posting and server
  draft recovery are still unverified; step 3 remains in progress.
- Restarted the stopped Expo server. localhost initially bound only to ::1,
  so the simulator's 127.0.0.1 connection failed. Running Expo with --lan on
  port 8081 restored the connection; the current iOS development bundle loaded.

## 2026-09-06: requested implementation through step 5

Implementation reached step 5. Full end-to-end acceptance is NOT complete;
do not report all five steps as fully verified. Completed-through remains 2
under the original cross-platform/save/recovery acceptance criteria.

### Step 3: UX and regression checks

- Existing disclosure changes retained. iOS sample photo selection shows
  metadata in an expandable section, keeping the writing form compact.
- Canceling the photo GPS prompt leaves the location unchanged. Selecting two
  simulator sample photos with different GPS positions shows the conflict
  notice and does not choose the first image's position.
- Test selections were discarded by the development reload. The simulator
  was returned to the empty writing screen. No upload or post save was made.

### Step 4: source and original separation

- External imports keep a detached originalSource payload. Existing records
  are not backfilled with invented originals. fieldSources distinguishes
  UNVERIFIED_IMPORT, USER corrections and accepted AI text (AI_REVIEWED).
- Unchanged fields retain their provenance, both in the store and private
  API. Original snapshots are included in imported-editor drafts. Editor and
  detail screens display saved-source counts and original availability.
- Provider durations now require explicit minute/second fields or a unit;
  ambiguous values remain in rawPayload, not guessed from numeric magnitude.
  Missing dates remain empty, date/time use the same source calendar, null
  numbers remain unknown, and nested GPS bounds are checked.
- This is not proof of manufacturer-origin authenticity. Existing missing-ID
  fallback, owner-scoped store restoration and canonical archive integration
  still require follow-up; no production data migration was performed.

### Step 5: EXIF and GPS before matching/AI

- Both pickers use photoGps.ts. Original capture wall clock, optional offset,
  derived UTC only with an offset, camera and orientation are retained per
  image. Invalid dates, offsets and coordinates remain unknown.
- Multiple different GPS positions never silently pick the first. Main form
  location replacement requires confirmation and does not infer a site name.
  Imported editor suggests only an empty entry location, never an exit point.
- Private MediaFile drafts retain metadata. Private API validation retains a
  bounded projection and recomputes UTC rather than trusting client UTC/source.
  Main public-post media deliberately does not publish raw EXIF/GPS/camera
  metadata: it is currently selection-time state only. A private persistence
  bridge for that main-post flow is not implemented in this increment.
- Expo image-picker video duration is milliseconds per installed SDK types;
  the imported editor now converts to seconds instead of storing milliseconds.
- New UI strings are present in Korean, English, Japanese and Chinese.
- Step 6 photo-to-dive time matching was NOT implemented or claimed.

### Validation and remaining gates

- App helper tests: 19 passed. API suite including draft round trips, owner
  isolation, failed DB writes and metadata validation: 78 passed.
- TypeScript and changed-file ESLint passed. Android Metro export succeeded
  (4725 modules), output /tmp/divergram-step5-android; this is not an APK/AAB
  release or native UI test.
- iOS sample EXIF observed: 2018-03-30T12:14:19, Apple iPhone X, orientation 3,
  GPS present, offset unknown. Cancellation and multi-location conflict tested.
- Android medium_phone booted and adb connected, but CUA cannot resolve the
  emulator window. Interactive Android acceptance remains unverified.
- DB tests use a contract harness, not PostgreSQL. Production private-log
  migrations/deployment and authenticated cross-device restart/recovery are
  pending. Existing main-form draft gap and imported in-memory-store limits
  are not resolved by these parser/source additions.
- No app version/build bump, store submission, production deployment, existing
  data deletion, permission/auth changes or destructive DB work performed.

## 2026-09-06: implementation through step 16

Implementation has reached all numbered items through 16. This means the code,
routes and usable screens exist for the safe local scope. It does not mean every
external provider, production database migration or physical-device acceptance
gate is complete. Under the original strict cross-platform/save/recovery
criteria, completed-through remains 2.

### Steps 6-9

- Photo capture wall clock is matched against same-day and overnight dive
  intervals. Overlap and equal-distance matches are ambiguous, missing clocks
  remain unknown, and no match is confirmed without the user.
- Photo AI requires authentication, explicit consent, an owner-scoped draft and
  an uploaded HTTPS image. Results are cached as suggestions and cannot create
  measurements or safety decisions. The user must accept candidates.
- Voice memo uses Expo Audio with a three-minute recording cap. Transcription
  requires an explicit confirmation and the server does not persist the audio
  file. The editable transcript is not appended to the memo until the user acts.
- Dive Story remains user-triggered. Its prompt now combines only supplied dive
  measurements, user memo, confirmed photo candidates and attached environment
  values. Generated text remains editable and unaccepted until review.

### Steps 10-12

- The existing Stormglass service is treated as current-only. A dive more than
  six hours from the current time receives historical_unsupported rather than a
  misleading current forecast. Environment failures do not block log saves.
- The capability registry separates discovery, transport and verified log sync.
  Garmin and Suunto official APIs require vendor approval, Shearwater file import
  has no verified parser, and generic BLE discovery does not claim log sync.
- The import wizard accepts pasted JSON/CSV, previews up to 10,000 rows, supports
  quoted commas/newlines, marks source values as legacy_import/unverified and requires a review
  action. It currently appends to the existing client store; file picking,
  provider-specific parsers and canonical server promotion remain pending.

### Steps 13-16

- Dive Discovery provides Marine Life, Statistics, Search and Insights tabs.
  Marine Life counts only user-confirmed photo suggestions. Unknown numeric
  measurements are excluded from samples rather than converted to zero.
- Natural-language parsing supports deterministic Korean, English, Japanese and
  Chinese year/depth/source filters. It never generates or executes SQL.
- Insights expose their sample size and are descriptive summaries only. They do
  not make medical, decompression, suitability or safety claims.

### Validation

- App helper tests: 38 passed. API suite: 80 passed.
- TypeScript and changed-file ESLint passed. Locale key audit reports no missing
  or empty keys in Korean, English, Japanese or Chinese.
- iOS Metro export passed with 4,658 modules. Android Metro export passed with
  4,748 modules.
- ExpoAudio 56.0.13 was added to iOS Pods. iPhone 17 Pro simulator native build
  completed with zero errors. Dive Log Management, Dive Discovery, Legacy Import
  and the per-log Environment/Voice cards were visually verified after install.
- Android native Gradle build could not run because no Java runtime or Android
  Studio JDK is installed on this host. Android native UI, physical microphone,
  live OpenAI photo/transcription, live Stormglass, production private-log DB
  migration and authenticated cross-device recovery remain release gates.
- App version remains 1.2.9. No build-number bump, store submission, production
  deployment, destructive migration or user-data deletion was performed.

## 2026-09-06: continued implementation through step 21

### Steps 17-20

- The editor now has a compact Copilot review inbox. It only proposes actions
  backed by an unconfirmed photo analysis, a deterministic photo-time match or
  a currently available environment lookup. Every proposal exposes evidence and
  requires Accept, Edit or Ignore; ignored proposal IDs survive draft recovery.
- One-Tap readiness reports base facts, computer source, photos, environment,
  memo and story as ready, optional or requiring review. Optional enrichment is
  not made a save requirement and missing data is never converted to zero.
- Dive details can expand a per-field source view. User input, unverified import,
  reviewed AI, photo EXIF, confirmed photo AI, cached/live environment data and
  user-reviewed photo matching remain distinct display categories.
- AI model names and request limits are centralized in the server policy. Dive
  summary and caption responses use an owner-scoped hashed cache, so prompt text
  is not stored in the cache key and identical requests avoid another provider
  call. Photo and transcription routes use the same model policy.

### Step 21

- Reviewed legacy JSON/CSV imports now save each item through the authenticated
  private Dive Log API before appearing in the client list. If server storage
  fails, the local list is unchanged and the same deterministic IDs can retry.
- Arbitrary provider IDs are converted to bounded deterministic server-safe IDs.
  The raw external ID remains in the original payload. The private validator now
  accepts legacy_import and retains bounded heart-rate and profile samples as
  unverified imports rather than claiming device authenticity.
- The additive production migration is still not applied in this work. Real
  PostgreSQL restore/concurrency testing and authenticated cross-device reload
  remain mandatory before calling the canonical bridge production-complete.

### Continued validation

- App helper tests: 44 passed. API suite: 85 passed. TypeScript, edited-file
  ESLint and the four-locale key audit passed with zero missing or empty keys.
- iOS export passed with 4,664 modules. Android export passed with 4,754 modules.
- iPhone 17 Pro simulator visually verified the Copilot readiness card and the
  expandable field-source list, including accessibility expanded state.
- The Android native JDK/device gate and live provider/production DB gates from
  the previous checkpoint remain open. Version 1.2.9 and build 54 were unchanged.

## 2026-09-06: continued implementation through step 22

- The Dive Log editor no longer contains Korean UI literals. Draft recovery,
  unsaved-change navigation, media selection/upload/retry, numeric validation,
  visibility controls, AI settings and save/reset actions now resolve through
  the active locale.
- Korean, English, Japanese and Chinese contain the same 1,374 locale keys with
  no missing or empty values. The repository-wide hardcoded Korean audit count
  decreased from 1,506 to 1,381; the remaining candidates are outside this
  editor and should be migrated incrementally with screen-level regression tests.
- TypeScript, edited-file ESLint, 44 app tests and 85 API tests passed. Fresh
  iOS and Android Expo exports also passed. The current Korean simulator screen
  rendered correctly; interactive locale switching could not be exercised while
  the host Mac was locked.

## 2026-09-06: continued implementation through step 29

- Dive Log detail, AI settings and Dive Log management now resolve every visible
  label, alert, filter and status through the active locale. Management dates use
  the selected locale instead of the device's implicit default.
- Shared Dive Log cards no longer expose Korean sync labels or raw source labels.
  The main log form also no longer carries Korean defaultValue fallbacks that
  could leak into another language after a key regression.
- Resort detail uses key-only amenity metadata. All 66 amenities have explicit
  Korean, English, Japanese and Chinese labels, and both list/detail favorite
  controls expose localized accessibility labels. Resort inline-ad text is also
  localized.
- The four locale files now contain 1,503 matching keys with no missing or empty
  values. The repository-wide hardcoded Korean candidate count is 1,243, down
  from 1,381 at the start of this continuation.
- TypeScript, edited-file ESLint, 44 app tests and 85 API tests passed. Fresh iOS
  and Android Expo exports passed. No version/build change, store submission,
  production migration or production deployment was performed.
- Remaining high-volume candidates are concentrated in BluetoothDeviceScreen,
  IntegrationSettingsScreen, CertificationScreen, legal/admin screens and
  settings. These require screen-level migration and visual regression checks;
  user-visible capabilities must remain intact while they are converted.

## 2026-09-06: continued implementation through step 35

- Step 30 localized the detailed notification settings screen, including its
  loading state, master switch and every notification category.
- Step 31 localized marine weather status, confidence, freshness, warnings,
  hourly conditions and saved-location controls. AI weather guidance now asks
  for the active app language and keeps a localized deterministic fallback.
- Step 32 removed Korean output instructions and fallbacks from the shared AI
  service. Summary, caption, weather-risk and recommendation calls now accept a
  locale without weakening the existing safety wording.
- Step 33 localized license list actions, status/discipline chips, OCR results,
  validation alerts and the complete registration form. Standardized text
  printed on the digital card remains English by design.
- Steps 34-35 localized the complete Bluetooth dive-computer UI and its runtime
  permission, scan, connection, import, validation and full-sync messages.
  Persisted integration status messages now follow the active locale instead of
  storing new Korean-only values.
- Korean, English, Japanese and Chinese now contain 1,758 matching locale keys
  with no missing or empty values. The hardcoded Korean candidate count is 928,
  down from 1,243 at the previous checkpoint. Both changed screens have zero
  Korean source literals.
- TypeScript and changed-file ESLint passed. All 44 app helper tests and 85 API
  tests passed. Fresh Expo exports passed for iOS with 4,664 modules and Android
  with 4,754 modules.
- No version or build-number change, store submission, production deployment,
  destructive migration or user-data deletion was performed. Remaining large
  localization groups are IntegrationSettingsScreen, CertificationScreen,
  legal/report screens, stamps and the in-app admin dashboard.

## 2026-09-06: continued implementation through step 42

- Step 36 localized the integration settings screen, including provider status,
  diagnostics, cleanup actions and saved connection messages. Legacy Korean
  status values are still recognized for backward compatibility without being
  rendered as the active-language UI.
- Step 37 localized the shared integration status card and made elapsed-time
  labels and timestamps follow the selected locale.
- Step 38 localized certification presets, OCR feedback, validation, sync state,
  photo requirements and all registration actions without changing the existing
  certification workflow.
- Step 39 localized moderation reporting, including target and reason choices,
  validation, consent gates, queued synchronization and local review history.
  Policy versions now normalize regional language tags before lookup.
- Step 40 localized public member profiles, licenses, dive summaries, follower
  lists, messaging, sharing and reporting. Profile dates now follow the active
  locale rather than always using Korean formatting.
- Step 41 converted the stamp catalog to language-neutral metric definitions.
  Category names, goals and descriptions now render from the four locale files,
  so Japanese, Chinese and English sessions cannot inherit Korean catalog text.
- Step 42 moved signup and re-consent copy from a source-level language table to
  the locale files while preserving remote policy refresh and consent receipts.
- Korean, English, Japanese and Chinese now contain 2,077 matching keys with no
  missing or empty values. The repository-wide hardcoded Korean candidate count
  is 479, down from 928 at the previous checkpoint. TypeScript and changed-file
  ESLint passed. All 44 app helper tests and 85 API tests passed. Fresh Expo
  exports passed for iOS with 4,664 modules and Android with 4,754 modules.
- No app version/build change, store submission, production deployment,
  destructive migration or user-data deletion was performed.

## 2026-09-06: continued implementation through step 49

- Step 43 localized the Stormglass-derived marine weather service output,
  including stale-data summaries, tide descriptions, risk warnings and
  no-dive reasons. Scoring thresholds and safety behavior were not changed.
- Step 44 changed newly persisted integration statuses to language-neutral
  codes and localized them at render time. Existing Korean status values remain
  readable through a compatibility map without leaking into another locale.
- Steps 45-46 localized the location map WebView, native map errors, resort
  markers, Reels controls, empty states and accessibility labels. Localized
  strings injected into map HTML are JSON encoded and escape the opening angle
  bracket before entering the script context.
- Steps 47-48 removed Korean display fallbacks from the Profile and Feed screens.
  Saved-resort labels, dive measurements, preview posts and feed-ad failure
  states now follow the active or explicitly selected preview locale.
- Step 49 localized the remaining direct Apple/Instagram connection warnings
  and account-deletion result messages in Settings Detail. Deletion dates use
  the selected locale.
- Korean, English, Japanese and Chinese now contain 2,191 matching keys with no
  missing or empty values. The repository-wide hardcoded Korean candidate count
  is 367, down from 479 at the previous checkpoint.
- TypeScript and changed-file ESLint passed. All 44 app helper tests and 85 API
  tests passed. Fresh Expo exports passed for iOS with 4,664 modules and Android
  with 4,754 modules at `.codex-artifacts/export-ios-step49` and
  `.codex-artifacts/export-android-step49`.
- These exports validate static bundling, not physical-device interaction. No
  app version/build change, store submission, production deployment, destructive
  migration or user-data deletion was performed.

## 2026-09-06: persistence and import completion increment

- The main Dive Log/post form now keeps a user-scoped local draft and mirrors it
  to the authenticated server draft endpoint after an 800 ms debounce. Local
  recovery remains available when the network fails, successful publication
  clears both copies, and empty defaults do not create a draft.
- A private Dive Log detail deep link now fetches the requested owner-scoped log
  directly when root hydration has not completed. Loading, not-found, retryable
  error and loaded states are distinct instead of rendering an empty card.
- Legacy import now accepts selected JSON, CSV and UDDF files up to 2 MB. UDDF
  parsing rejects DTD/entity declarations and retains the original dive subtree.
  Exact retries are excluded; similar date/depth or date/duration candidates
  require explicit user inclusion before import.
- App helper tests increased from 44 to 51. The added checks cover draft
  normalization and byte limits, UDDF measurements/profile samples, XML entity
  rejection, and exact/possible duplicate classification.
- Manufacturer cloud APIs, verified BLE log download, historical weather/marine
  providers and AI voice-to-field acceptance remain external or protocol gates.
  They are not represented as completed by this increment.

## 2026-09-06: native build and runtime verification

- App TypeScript, full direct ESLint, all 51 app tests, all 86 API tests and the
  four-locale audit passed. The normal `expo lint` wrapper is still blocked by
  pnpm's ignored `esbuild` lifecycle-script policy; direct ESLint reports no
  lint finding.
- Fresh Metro exports passed for iOS (4,691 modules) and Android (4,781
  modules). Android `assembleDebug` produced and installed a debug APK, and the
  app loaded the onboarding screen through Metro on an Android emulator without
  a fatal native or React exception.
- CocoaPods contains ExpoDocumentPicker 56.0.4 and ExpoFileSystem 56.0.11. The
  iOS workspace built successfully for an iPhone 17 Pro simulator, installed,
  connected to Metro and rendered the onboarding screen without a React fatal
  error.
- The unsigned iOS simulator build cannot register for remote notifications and
  reports the expected missing `aps-environment`/Keychain registration errors.
  Physical-device push remains a signed-build verification gate. Android also
  reports that the AdMob publisher account has no consent form configured; that
  is an external console configuration rather than a bundle failure.
- Production migration `20260905000100_add_private_dive_logs.sql` was not
  applied. Real PostgreSQL concurrency/recovery, authenticated cross-device
  draft recovery, microphone/BLE hardware and live paid AI/provider calls still
  require controlled integration or physical-device environments.

## 2026-09-06: production persistence verification

- A verified PostgreSQL custom-format backup was created before the schema
  change. The private Dive Log migration was then applied through the new
  checksum ledger and advisory-lock runner; a second invocation returned
  `already_applied`.
- Production schema verification confirmed the log, source and revision tables
  plus the owner/page index. A transaction inserted and joined representative
  rows across all three tables, then rolled the transaction back.
- Only the private Dive Log route and its two supporting libraries were added to
  the running API. Health remained HTTP 200 after restart, while all private log
  endpoints returned HTTP 401 without authentication.
- An isolated temporary account exercised the public HTTPS API end to end:
  create, detail, source, update, list, idempotent retry, draft save/restore/
  delete and optimistic-concurrency conflict handling passed. The temporary
  user, profile, log, revisions, sources and draft were removed and the cleanup
  query returned zero rows.
- This completes the production database and API persistence gate for the
  private-log contract. Physical-device microphone/BLE/push checks, approved
  manufacturer integrations, historical environment providers and live paid AI
  calls remain separate external verification gates.

## 2026-09-06: final regression and localization increment

- User-visible delete confirmation, media errors and accessibility labels,
  donation availability, policy navigation, Wallet fallbacks, SNS share dialog,
  push status and API fallback labels now resolve through the active locale.
  Relative time uses the platform internationalization formatter rather than a
  Korean-only formatter.
- Korean, English, Japanese and Chinese contain the same 2,225 keys with no
  missing or empty values. Repository hardcoded-Korean candidates decreased
  from 367 to 319; most remaining candidates are the in-app administrator
  dashboard, administrator data fixtures, Korean policy source documents and
  legacy persisted-status compatibility checks. They are not counted as a
  completed localization sweep.
- All 51 app tests and 86 API tests passed. TypeScript, full direct ESLint and
  the locale audit passed. Fresh iOS and Android Expo exports completed with
  4,691 and 4,781 modules respectively.
- The final production recheck returned HTTP 200 for API health,
  `already_applied` for the private-log migration, and passed schema rollback
  plus full CRUD/concurrency/draft smoke tests. The migration scripts now load
  project environment variables themselves, so manual SSH runs do not depend
  on PM2-exported variables.
