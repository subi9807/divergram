# Feed cards: 2026-09-13

## Implemented

- Shared outer geometry: 22px radius, 16px horizontal margin, 20px bottom spacing, clipped content, 1px border.
- Applied to posts, marine-life cards, native/web ad cards and new discovery cards.
- Post carousel uses measured card width rather than window width, including page-index calculations.
- Public resort data uses the existing resorts query/cache; image-bearing resorts are capped at 12 recommendations. This currently reuses the full resort list fetch rather than a dedicated recommendations endpoint.
- Published guides load with the current supported locale and no cross-language fallback.
- Every two posts, rotate marine life, guide and resort cards; preserve existing post/ad order. Short feeds still expose one available card per discovery type.
- Discovery cards have namespaced unique IDs and open existing detail routes. They are not labeled as paid advertisements.
- Pull-to-refresh includes marine life, resorts and guides; its indicator waits for those requests too.
- Supplementary query failures do not throw away successful post data. Existing post-query failure UI is unchanged.

## Verification

- TypeScript: passed.
- App tests: 71 passed (including three new mixing/geometry tests).
- iOS and Android Expo bundle export: passed; this is not an App Store or Play upload or a full native build.
- iOS simulator: rounded post and resort cards visually checked; live guide and resort entries present in feed; both detail routes opened with matching data.
- Android device UI was not exercised.
- AdMob test validator reported advertiser assets outside the native ad view during inspection. Added non-collapsible layout containers to retain native asset ancestry. A subsequent ad slot failed to load, so clearance of the advertiser-specific SDK warning is NOT confirmed. Keep this as a release verification item, not a passed test.
- Simulator left on the feed. No store release was submitted for this change.
