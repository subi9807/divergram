# Flying after diving guide verification - 2026-09-26

- Guide ID: `d78b905b-7710-4eb9-a287-fdf4041d04d9`
- Status: `published`
- Category: `safety`
- Sort order: `200`
- Hosted artwork: https://api.divergram.com/api/uploads/5e197fa2-753a-4aa7-a3f3-61941b02cfc5.png
- Local artwork: `docs/content/assets/flying-after-diving-2026-09-26.png`
- SHA-256: `b2982b128d9c59aff21ab92c907a3a908aeb36be4b7734794ea04203e36eb2b9`
- Deep link: https://divergram.com/guides/d78b905b-7710-4eb9-a287-fdf4041d04d9

## Verification

- Korean, English, Japanese and Chinese public lists each include the guide exactly once.
- All four localized detail endpoints return the expected localized title and complete body without cross-language fallback.
- Each localized body includes its Divergram content-production credit.
- The hosted artwork returns HTTP 200 with `image/png`, and its hosted SHA-256 matches the local source.
- The public deep link returns HTTP 200 with the Divergram guide page.
- `node --test api/server/lib/diveGuide.test.js`: 3 passed, 0 failed.
- The artwork SHA-256 differs from every existing daily-guide artwork in `docs/content/assets`.
- The artwork is a newly generated AI concept illustration and was not reused from an earlier guide.

## Safety references

The article was independently written for Divergram. Safety facts were cross-checked against these official sources; no source text or media was copied.

- Divers Alert Network, Flying After Diving: https://dan.org/health-medicine/health-resources/diseases-conditions/flying-after-diving/
- DAN World, Health & Safety Guidelines: https://world.dan.org/health-resource-type/health-safety-guidelines/
- PADI, The Golden Rules of Scuba Diving: https://blog.padi.com/the-golden-rules-of-scuba-diving/

## Artwork prompt

Original 16:9 scientific-educational editorial illustration of an adult Korean recreational diver at a coastal resort after diving. She reviews her dive computer together with a travel itinerary and calendar while safely stowed equipment remains beside her and a distant aircraft appears in the sky. The scene communicates an unhurried surface interval and responsible travel planning without text, logos, exact waiting-time numbers, medical emergency imagery or unsafe behavior.
