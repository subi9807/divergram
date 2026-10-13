# Marine debris awareness guide verification - 2026-09-22

- Guide ID: `9ebebf32-5ebf-476e-ad85-b2e078f83e99`
- Status: `published`
- Category: `environment`
- Sort order: `160`
- Hosted artwork: https://api.divergram.com/api/uploads/ab13efaa-2a4d-4815-95b4-5d16f0e36010.png
- Local artwork: `docs/content/assets/marine-debris-awareness-2026-09-22.png`
- SHA-256: `6c2037a917939489acca48f7b83add81134af7f871bed46d1239b830739cd073`
- Deep link: https://divergram.com/guides/9ebebf32-5ebf-476e-ad85-b2e078f83e99

## Verification

- Korean, English, Japanese and Chinese public lists each include the guide exactly once.
- All four localized detail endpoints return the expected localized title and a non-empty body without cross-language fallback.
- The hosted PNG returns HTTP 200 with `image/png`.
- The public deep link returns HTTP 200.
- `node --test api/server/lib/diveGuide.test.js`: 3 passed, 0 failed.
- The artwork SHA-256 does not match any earlier daily-guide artwork in `docs/content/assets`.
- The artwork is a newly generated AI concept illustration and was not reused from an earlier guide.

## Safety references

The article was independently written for Divergram. Safety and environmental facts were cross-checked against these official sources; no source text or media was copied.

- NOAA Marine Debris Program, Marine Debris Handling Guidelines: https://marinedebris.noaa.gov/marine-debris-handling-guidelines
- NOAA Monterey Bay National Marine Sanctuary, Underwater Debris Removal: https://montereybay.noaa.gov/resourcepro/resmanissues/lostgear.html
- NOAA Marine Debris Program, Derelict Fishing Gear: https://marinedebris.noaa.gov/what-marine-debris/derelict-fishing-gear
- NOAA Fisheries, National Marine Mammal Entanglement Response Networks: https://www.fisheries.noaa.gov/national/marine-life-distress/national-marine-mammal-entanglement-response-networks

## Artwork prompt

Original 16:9 editorial-realism underwater guide cover showing two properly equipped recreational scuba divers maintaining neutral buoyancy while observing and documenting a plastic bottle and a short fishing-line segment on sand beside a reef. The divers remain at a safe distance and do not touch, cut, collect or become entangled in debris. No text, logos or watermarks.
