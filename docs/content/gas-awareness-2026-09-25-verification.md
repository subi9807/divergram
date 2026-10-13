# Gas awareness guide verification - 2026-09-25

- Guide ID: `40784564-0432-4b59-a0b9-0d86f5671f1b`
- Status: `published`
- Category: `safety`
- Sort order: `190`
- Hosted artwork: https://api.divergram.com/api/uploads/b37bb690-488e-42b2-8c5d-aea7c2b28ab7.png
- Local artwork: `docs/content/assets/gas-awareness-2026-09-25.png`
- SHA-256: `d23897042444ad575b9637f2a72a7a05dfc26baa4d037e4b01a0a4f78ba01953`
- Deep link: https://divergram.com/guides/40784564-0432-4b59-a0b9-0d86f5671f1b

## Verification

- Korean, English, Japanese and Chinese public lists each include the guide exactly once.
- All four localized detail endpoints return the expected localized title and a non-empty body without cross-language fallback.
- The hosted PNG returns HTTP 200 with `image/png`.
- The public deep link returns HTTP 200.
- `node --test api/server/lib/diveGuide.test.js`: 3 passed, 0 failed.
- The artwork SHA-256 differs from all existing daily-guide artwork in `docs/content/assets`.
- The artwork is a newly generated AI concept illustration and was not reused from an earlier guide.

## Safety references

The article was independently written for Divergram. Equipment and safety facts were cross-checked against these official sources; no source text or media was copied.

- PADI, SPG (Submersible Pressure Gauges): https://www.padi.com/gear/spgs
- PADI, The Golden Rules of Scuba Diving: https://blog.padi.com/the-golden-rules-of-scuba-diving/
- Divers Alert Network, Tank Valves and Out-of-Air Emergencies: https://dan.org/alert-diver/article/tank-valves-and-out-of-air-emergencies/
- Divers Alert Network, Dive Smarter: https://dan.org/wp-content/uploads/2020/05/SmartGuide_Air_2017_LoRes.pdf

## Artwork prompt

Original 16:9 scientific-educational editorial illustration showing two adult Asian recreational divers maintaining neutral buoyancy over a rocky reef. One calmly reads a securely clipped analog SPG while the buddy confirms communication, with the planned return toward a distant moored dive boat visible in context. No text, logos, exact pressure limits, dangling equipment or unsafe behavior.
