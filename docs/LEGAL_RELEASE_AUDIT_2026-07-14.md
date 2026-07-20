# Divergram Legal Release Audit

Reviewed on: 2026-07-14

This is an engineering and product compliance audit, not legal advice. A qualified Korean privacy and location-information professional must approve the final published wording.

## Release decision

Status: BLOCKED for public production launch.

The TestFlight and Google Play closed-test releases may continue, but the current production legal documents must not be treated as final public-launch documents.

## Critical findings

### 1. Production legal documents are still drafts

The production API currently returns database documents titled `Divergram 이용약관(초안)` and `개인정보 처리방침·수집이용 동의(초안)`. Their rendered text is approximately 144 and 130 Korean characters respectively. They do not cover the actual app's data processing, advertising, location, media, OAuth, push, AI, payment, or overseas processors in sufficient detail.

Required action: obtain approved final HTML and replace the three `legal_docs` records only after legal approval.

### 2. App and server policies are inconsistent

The app policy catalog uses version `2026.05.22` and contains substantially more policy types. The production API documents do not expose a matching policy version, effective date, locale, or update timestamp.

Required action: establish one canonical policy source and return `version`, `effectiveFrom`, `locale`, and `updatedAt` from the API.

### 3. Consent history is not an immutable audit record

Consent history is synchronized inside the user-preferences JSON payload and is bounded in size. A preference update can replace prior state, so it is not suitable as the sole legal evidence of consent.

Required action: add an append-only consent table containing user ID, policy type, policy version, agreed/withdrawn state, timestamp, locale, client version, and request metadata required by counsel.

### 4. Account deletion behavior and wording are not aligned

The client attempts multiple deletion endpoints and can fall back to creating a local-style deletion request record. The production policy does not define a confirmed deletion schedule, backup retention period, legal retention exceptions, or processor deletion handling.

Required action: implement and verify one production deletion workflow, then describe the exact retention and deletion behavior in the approved policy.

### 5. Third-party and overseas processing disclosures are incomplete

The deployed app uses or is configured for Google/Firebase, Apple, Meta/Instagram, AdMob, Sentry, PayPal, Expo/EAS, Cloudinary or server media storage, and infrastructure providers. The current production privacy document does not identify recipients/processors, countries, transfer timing/method, data categories, purpose, and retention.

Required action: counsel must approve a processor and overseas-transfer table matching the actual production configuration.

### 6. Advertising and tracking declarations need reconciliation

The iOS privacy manifest declares tracking as false, while the AdMob configuration includes tracking-purpose wording. The app's ATT timing, consent flow, personalized-ad setting, App Store privacy labels, and Google Play Data safety form must describe one consistent behavior.

Required action: verify runtime ATT/UMP behavior on a physical iPhone and Android device, then update store declarations and policy wording together.

## High-priority findings

- Confirm whether the Location Information Act applies to background dive tracking, point discovery, and any location sharing.
- Define a monitored privacy/support contact and response workflow. The policy currently references `support@divergram.com`; operational ownership must be verified.
- Define PayPal donation refund, tax, consumer-protection, and receipt handling.
- Define UGC reporting, copyright notice/counter-notice, illegal-content handling, sanctions, and appeals.
- Confirm the 14-or-older signup control and any guardian-consent requirement.
- Document media deletion across primary storage, database references, caches, CDN, and backups.
- Review emergency-contact, insurance, license image/OCR, precise location, and health/safety-related dive data as higher-risk fields.

## Verified technical controls

- Sensitive server preference and integration credentials use AES-256-GCM encryption at rest.
- Device authentication tokens use secure platform storage.
- OAuth provider tokens are redacted from API responses.
- The app displays policy version and effective date for documents sourced from its internal policy catalog.
- Account deletion and privacy settings are discoverable from the app settings UI.
- iOS declares required-reason API usage in `PrivacyInfo.xcprivacy`.

## Approval gate

Public launch approval requires all of the following:

1. Final Korean legal text approved by qualified counsel.
2. Canonical policy versions published by the production API.
3. Append-only server consent history implemented and tested.
4. Account deletion verified end to end, including media and OAuth identities.
5. Store privacy declarations reconciled with physical-device behavior.
6. Support/privacy mailbox ownership and incident response confirmed.
