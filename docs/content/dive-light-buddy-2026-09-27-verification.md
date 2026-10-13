# Dive light and buddy communication guide verification - 2026-09-27

- Guide ID: `6ba26689-5a76-4665-913f-5c8a5ab13e5f`
- Status: `published`
- Category: `equipment`
- Sort order: `210`
- Hosted artwork: https://api.divergram.com/api/uploads/df01e50d-f475-4a5c-b9ca-bd967535d95c.png
- Local artwork: `docs/content/assets/dive-light-buddy-2026-09-27.png`
- SHA-256: `2edcc5b608eacfa77a12a7c44f04e67bc776a190d6776333f0f05e642c1f33ff`
- Deep link: https://divergram.com/guides/6ba26689-5a76-4665-913f-5c8a5ab13e5f

## Verification

- Korean, English, Japanese and Chinese public lists each include the guide exactly once.
- All four localized detail endpoints return the expected title and complete body without cross-language fallback.
- Each localized body includes its Divergram content-production credit.
- The hosted artwork returns HTTP 200 with `image/png`, and its hosted SHA-256 matches the local source.
- The public deep link returns HTTP 200.
- `node --test api/server/lib/diveGuide.test.js`: 3 passed, 0 failed.
- The artwork SHA-256 differs from all existing daily-guide artwork in `docs/content/assets`.
- The artwork is a newly generated AI concept illustration and was not reused from an earlier guide.
- Production monitoring: 12 passed, 0 failed.

## Safety references

The article was independently written for Divergram. Equipment and safety facts were cross-checked against these official sources; no source text or media was copied.

- PADI, Dive Light: https://www.padi.com/gear/lights
- Divers Alert Network, Night Diving: https://dan.org/alert-diver/article/night-diving/
- PADI, Scuba Diving Hand Signals: https://blog.padi.com/scuba-diving-hand-signals/
- Divers Alert Network, Low-Visibility Diving: https://dan.org/alert-diver/article/low-visibility-diving/

## Artwork prompt

Original 16:9 scientific-educational editorial illustration showing two adult Korean recreational divers maintaining neutral buoyancy during a calm night dive. Each diver has a streamlined primary and secured backup light, and one illuminates a clear hand signal without shining into the buddy's face. A moored boat and softly lit exit point remain visible in the distance. No text, logos, overhead penetration, distress, reef contact or unsafe behavior.
