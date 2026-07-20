# Divergram Release Legal and Operations Checklist

This document is an engineering readiness checklist, not legal advice. A qualified Korean privacy/legal professional must approve the final published text.

## Required policy coverage

- Terms of service: account rules, user content license, prohibited conduct, moderation, termination, liability, governing law, and contact details.
- Privacy policy: identity/profile data, OAuth identifiers, photos/videos, location and dive logs, push tokens, device identifiers, analytics, advertising identifiers, emergency contacts, insurance data, retention, deletion, processors, overseas transfers, and user rights.
- Location terms: foreground/background collection, purpose, retention, revocation, and legal guardian requirements.
- Third-party and overseas transfer disclosures: Google/Firebase, Apple, Meta/Instagram, AdMob, Sentry, PayPal, Cloudinary, Expo/EAS, and infrastructure providers actually used in production.
- Children: enforce the 14-or-older consent represented by the current signup flow.

## Release gates

- Policy version and effective date are visible in the app and API.
- Required consent history is stored with user, policy version, timestamp, locale, and client version.
- Account deletion removes or anonymizes profile, social links, media references, push tokens, preferences, and legal retention exceptions.
- App Store privacy nutrition labels and Google Play Data safety answers match actual SDK and server behavior.
- ATT wording matches AdMob behavior; tracking is not started before consent where required.
- Support and privacy contact addresses are monitored.

## External review required

- Korean Personal Information Protection Act compliance.
- Location Information Act applicability and reporting obligations.
- Cross-border transfer wording and processor contracts.
- PayPal donation, tax, refund, and consumer-protection treatment.
- User-generated content moderation and copyright process.
