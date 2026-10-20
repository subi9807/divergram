# Rental dive gear guide verification (2026-10-20)

- Published guide ID: `8c22cd73-cf48-4849-9575-30605be91ea1`
- Public route: https://divergram.com/guides/8c22cd73-cf48-4849-9575-30605be91ea1
- Hosted artwork: https://api.divergram.com/api/uploads/d52c7e14-7f65-4abc-aea4-63cc67c4661c.png
- Local artwork: `docs/content/assets/rental-dive-gear-2026-10-20.png`
- Source payload: `docs/content/rental-dive-gear-2026-10-20.json`
- Artwork dimensions: `1672 x 941`
- Artwork SHA-256: `72d904d579d8810ccabe270795ff377096497d184447167dca5d4cafb604934a`
- Duplicate artwork matches in `docs/content/assets`: `0`

## Publication checks

- Existing local content and all 42 operating admin API guides were checked before publication. No existing guide focused on fitting, orienting to and checking an unfamiliar rental scuba configuration before entry.
- The existing duplicate-aware publisher created one guide and returned `published` status.
- The operating admin API contained the new ID and Korean title exactly once after publication, with 43 total guides.
- Korean, English, Japanese and Chinese list responses each contained the new guide exactly once.
- All four localized detail responses returned the expected title, summary, complete body, hosted artwork URL and localized Divergram attribution.
- The hosted PNG returned HTTP 200 with `image/png`, a non-empty 2,324,160-byte payload and the same SHA-256 as the local artwork.
- The public web detail route returned HTTP 200.
- The production monitor passed all guide, API, guard, deep-link and media checks. Its one pre-existing warning states that resort payments remain in PayPal sandbox/sample mode and is unrelated to this publication.

## Originality and artwork

The four localized articles were written specifically for Divergram and do not reproduce external text. The cover was newly generated and then edited to remove visible words, logos and equipment markings. It does not match another file in the daily-guide asset directory.

Image prompt summary: a wide realistic open-air tropical dive-center scene with two adult East Asian recreational divers and a staff member reviewing unfamiliar rental equipment before entry. The staff member indicates the BCD inflator and releases while the buddy checks the setup. Cylinders are secured and hoses are streamlined. The image avoids unsafe handling, emergencies, text, logos and watermarks.

## Safety cross-checks

The article was independently written after checking authoritative guidance on allowing time to understand rental gear, confirming fit and configuration, locating controls and releases, checking computers and air integration, inspecting equipment before every dive, completing a buddy check, and introducing unfamiliar equipment in a controlled or easier environment:

- Divers Alert Network, Renting Dive Gear: https://dan.org/alert-diver/article/renting-dive-gear/
- Divers Alert Network, New Gear Orientation: https://dan.org/alert-diver/article/new-gear-orientation/
- Divers Alert Network, The Importance of a Predive Safety Check: https://dan.org/alert-diver/article/the-importance-of-a-predive-safety-check/
- DAN World, Safe Diving Practices: https://world.dan.org/safety-prevention/diver-safety/safe-diving-practices/
- PADI, Predive Safety Check poster: https://blog.padi.com/wp-content/uploads/2023/03/752DT_BWRAF_Predive_Safety_Check_Poster_8x11.pdf
- NOAA Diving Standards & Safety Manual, Diving and Support Equipment: https://www.omao.noaa.gov/sites/default/files/documents/NDSSM%20Rev%2005%20May%202020.pdf

The public guide does not provide repair, regulator service, emergency-ascent or unfamiliar equipment-removal instructions. It tells readers to use recognized training and the on-site briefing, request replacement or qualified inspection for suspect equipment, keep the first dive conservative when the configuration is new, and postpone the dive if uncertainty remains.
