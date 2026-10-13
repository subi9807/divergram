# Mask fit and visibility guide verification - 2026-09-23

- Guide ID: `eefd6d5d-9a5b-4bd0-ad48-71bdccadb745`
- Status: `published`
- Category: `equipment`
- Sort order: `170`
- Hosted artwork: https://api.divergram.com/api/uploads/42aad699-731b-4e7c-9142-039b4639a72b.png
- Local artwork: `docs/content/assets/mask-fit-visibility-2026-09-23.png`
- SHA-256: `2b8d77566a48c8608847972dbd9352992914cc5ca8535854ef927496c6c4b0de`
- Deep link: https://divergram.com/guides/eefd6d5d-9a5b-4bd0-ad48-71bdccadb745

## Verification

- Korean, English, Japanese and Chinese public lists each include the guide exactly once.
- All four localized detail endpoints return the expected localized title and a non-empty body without cross-language fallback.
- The hosted PNG returns HTTP 200 with `image/png`.
- The public deep link returns HTTP 200.
- `node --test api/server/lib/diveGuide.test.js`: 3 passed, 0 failed.
- The artwork SHA-256 differs from the previous daily-guide artwork.
- The artwork is a newly generated AI concept illustration and was not reused from an earlier guide.

## Safety references

The article was independently written for Divergram. Equipment and safety facts were cross-checked against these official sources; no source text or media was copied.

- Divers Alert Network, Mask Squeeze (Facial Barotrauma): https://dan.org/health-medicine/health-resources/diseases-conditions/mask-squeeze-aka-facial-barotrauma/
- DAN World, Preventing Mask Squeeze During Your Dives: https://world.dan.org/id/alert-diver/article/preventing-mask-squeeze/
- PADI, Masks: https://www.padi.com/gear/masks
- Divers Alert Network, A Clear Picture: https://dan.org/alert-diver/article/a-clear-picture/

## Artwork prompt

Original 16:9 editorial-realism dive-guide cover showing two adult Asian buddies on a shaded dive-boat deck checking a tempered-glass mask's silicone skirt, hair and comfortable fit before entry. Manufacturer-compatible defog and fresh rinse water sit on a clean mat, scuba units are secured in racks, and a small visual inset shows a clear, comfortable underwater mask with a gentle nose exhale. No text, logos or watermarks.
