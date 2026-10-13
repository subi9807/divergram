# iOS Privacy Declaration Audit

Updated: 2026-10-05

## Source-aligned declarations

The app privacy manifest now declares the first-party data used by current features:

- account identity: name, email address, phone number, user ID
- dive and community content: photos or videos, audio, other user content
- dive and resort functions: precise location
- annual membership and resort payments: purchase history
- push and session delivery: device ID
- reliability: crash and performance data

All first-party declarations are marked as not used for tracking. AdMob and other bundled SDKs continue to provide their own privacy manifests; App Store Connect must also reflect the SDK data shown in the final release archive privacy report.

## Permission prompts

Camera, microphone, photo library, location, motion, Bluetooth, and tracking prompts are localized for Korean, English, Japanese, and Simplified Chinese. Prompts state the feature purpose and avoid claiming background collection outside a user-started dive tracking session.

## App Store Connect checklist

Before the next submission, update App Privacy answers to match the release archive:

1. Contact info: name, email address, phone number; linked to identity; app functionality.
2. Location: precise location; linked to identity; app functionality.
3. User content: photos or videos, audio data, other user content; linked to identity; app functionality.
4. Purchases: purchase history; linked to identity; app functionality.
5. Identifiers: user ID and device ID; linked to identity; app functionality.
6. Diagnostics: crash and performance data; not linked; app functionality.
7. Advertising data and tracking: answer from the final AdMob privacy report and the production consent configuration. Do not declare tracking as disabled in App Store Connect if personalized AdMob tracking remains available after consent.

App Store Connect is an external declaration and cannot be completed by the repository change alone. Confirm the values against Xcode's generated privacy report from the exact archive submitted for review.
