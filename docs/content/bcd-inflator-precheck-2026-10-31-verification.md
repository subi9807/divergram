# BCD inflator predive check guide verification (2026-10-31)

- Published guide ID: `d08c1afb-335b-43e4-98ad-dccd3c01889e`
- Public route: https://divergram.com/guides/d08c1afb-335b-43e4-98ad-dccd3c01889e
- Hosted artwork: https://api.divergram.com/api/uploads/3fea2d11-dd4e-4563-84a1-a27a3c946f34.png
- Local artwork: `docs/content/assets/bcd-inflator-precheck-2026-10-31.png`
- Source payload: `docs/content/bcd-inflator-precheck-2026-10-31.json`
- Artwork dimensions: `1672 x 941`
- Artwork SHA-256: `67e25d6bb60c33d54a4bedcf9d24e01b6d9dfe03b8f45b94808f500decbe6ce9`
- Artwork size: `2,349,540` bytes
- Duplicate artwork matches in `docs/content/assets`: `0`

## Publication checks

- Existing local content and all 53 operating admin API guides were checked before publication. No existing guide focused specifically on checking both inflation and exhaust functions of a BCD before entry.
- Immediately before publication, the operating admin API still contained 53 guides and zero exact matches for the Korean title.
- The uploaded PNG returned HTTP 200 with `image/png` and matched the local file in byte size and SHA-256 before publication.
- The existing duplicate-aware publisher was run once, created guide `d08c1afb-335b-43e4-98ad-dccd3c01889e` and returned `published` status.
- The operating admin API contained 54 guides after publication, with the new ID and Korean title each appearing exactly once.
- Korean, English, Japanese and Chinese list responses each contained the new guide exactly once.
- All four localized detail responses returned HTTP 200 and exactly matched the expected title, summary, complete body, hosted artwork URL and localized Divergram attribution.
- The hosted PNG returned HTTP 200 with `image/png`, a non-empty 2,349,540-byte payload and the same SHA-256 as the local artwork.
- The public web detail route returned HTTP 200.
- The production monitor passed all guide, API, access-guard, deep-link and media checks. Its one pre-existing warning states that resort payments remain in PayPal sandbox/sample mode and is unrelated to this publication.

## Originality and artwork

The four localized articles were written specifically for Divergram and do not reproduce external text. The cover was newly generated for this article, contains no visible equipment branding or writing, and does not match another file in the daily-guide asset directory.

Image prompt summary: a wide natural documentary scene showing exactly two adult East Asian divers on a stable dive-boat deck before entry. One operates the plain BCD inflator while the buddy watches and gives an OK signal. Both cylinders and hoses are secured, with no entry, emergency, text, logo, label or watermark.

## Safety and equipment cross-checks

The article was independently written after checking authoritative guidance that BCD inflator and exhaust valves should be inspected for function and damage, a predive check should verify power inflation without auto-inflation, the low-pressure hose and bladder require regular inspection and service, and an equipment problem discovered before entry should not be carried into the dive:

- Divers Alert Network, Pre-Dive Briefings: https://dan.org/wp-content/uploads/2021/05/Pre-dive-safety-briefings.pdf
- DAN World, Diving Equipment: https://world.dan.org/safety-prevention/return-to-diving-safely/diving-equipment/
- Divers Alert Network, Neglecting Proper Gear Maintenance: https://dan.org/health-medicine/health-resource/smart-guides/7-mistakes-divers-make-and-how-to-avoid-them/2-neglecting-proper-gear-maintenance/
- Divers Alert Network, How Old Is Too Old?: https://dan.org/alert-diver/article/how-old-is-too-old/
- NOAA Diving Standards & Safety Manual, Diving & Support Equipment: https://www.omao.noaa.gov/sites/default/files/documents/NDSSM%20Rev%2005%20May%202020.pdf
- PADI, Predive Safety Check: https://blog.padi.com/wp-content/uploads/2023/03/752DT_BWRAF_Predive_Safety_Check_Poster_8x11.pdf
- British Sub-Aqua Club, Safe Diving Guide - Going Diving: https://www.bsac.com/safety/safe-diving-guide/going-diving/

The public guide does not teach a first-time underwater low-pressure hose disconnection, valve disassembly, improvised repair or emergency buoyancy procedure. It directs divers to test before entry, reject sticky or leaking equipment, signal the buddy, avoid descent when controls are abnormal, end the dive through trained procedures if a fault appears underwater, and obtain qualified service.
