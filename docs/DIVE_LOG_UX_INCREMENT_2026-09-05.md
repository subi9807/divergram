# Dive Log UX: incremental implementation

## AS-IS -> problem -> TO-BE -> reason

| Existing behavior | Problem | Change | Reason |
| --- | --- | --- | --- |
| Media tools precede site and measurements | Users cannot quickly review a dive | Site/date and measurement summary first | Review instead of retyping |
| Coordinates, buddy and equipment always expanded | Excess scrolling | Collapsible additional details | Reduce visible fields without removing capabilities |
| Point name required | Incomplete logs cannot be saved | Optional point for an existing log | Missing values can be filled later |
| Save runs summary/caption generation | Hidden API calls, no review | Explicit generation, editable preview and acceptance | AI never runs solely because Save is pressed |
| EXIF GPS fills entry, exit and site name | Photo location is misrepresented as dive location | Ask before applying to entry only; never invent exit/site | Preserve uncertainty |
| Baseline uses different coordinate keys than draft | Unchanged form appears dirty | Use matching comparison keys | Accurate unsaved-change state |

## Boundaries

No migration, production database write, authentication change, manufacturer
protocol implementation, payment change or deletion of existing user records.
The existing in-memory editor's final-save persistence is still a separate
follow-up; do not claim this UI change completes server persistence.

Next gates: PostgreSQL staging integration for the prior archive, owner-scoped
draft migration plan, then editor/import repository connection. Photo capture
time matching requires known timezone/offset; missing metadata must remain
unknown. Voice, species recognition, weather history, import wizard and
collection remain pending, not simulated as completed integrations.

## Implemented follow-through (2026-09-06)

- Existing imported-log editor now starts with site/date, optional hero photo,
  a four-value summary and honest source labels. No missing number/date is invented.
- Location/buddy/equipment/tags inputs are collapsed; their state remains intact.
- Save does not invoke AI. Explicit summary/caption generation uses the selected
  language and exposes errors rather than substituting a success-like fallback.
  Preview is editable, requires acceptance and never changes measurements.
- Unconfirmed AI text is retained only in the local draft, not sent to server
  draft storage. Equal-timestamp recovery prefers that fuller local draft.
- Save awaits the existing server-draft API before changing the local log cache.
  It is labeled as a server draft, not canonical final-log persistence. Automatic
  draft writes are queued so older requests cannot overtake newer requests from
  this mounted editor. Cross-device draft concurrency remains a follow-up.
- GPS parser handles decimal/DMS/rational values and hemisphere references,
  rejects invalid ranges and missing data, and preserves legitimate zero values.
- No EXIF time matching, speech recognition, species recognition or device
  attestation is claimed. Existing unrelated hardcoded editor text still needs
  a dedicated localization pass; new UI strings are in all four locale files.

## Verification

- API suite: 72 passed.
- GPS parser unit tests: 3 passed (Node 26 TypeScript stripping).
- App TypeScript check and edited-file ESLint: passed.
- Native platform bundle export is checked separately from device testing.
  iOS export (4,631 modules) and Android export (4,721 modules) succeeded in
  `/tmp/divergram-ux-ios-20260906` and `/tmp/divergram-ux-android-20260906`.
  No IPA/AAB, store submission or production migration is part of this increment.
- Authenticated iOS/Android save/recovery, AI provider failure and actual photo
  picker interactions still require device-level verification. Unit/static/bundle
  checks do not substitute for those tests; further integrations remain gated.
