# Reef mooring buoy guide verification - 2026-09-24

- Guide ID: `13192de1-d344-41a5-a1af-49e53e88852a`
- Status: `published`
- Category: `environment`
- Sort order: `180`
- Hosted artwork: https://api.divergram.com/api/uploads/6c5be6bc-3ed6-454b-ba8e-7e2ac72ec21a.png
- Local artwork: `docs/content/assets/reef-mooring-buoy-2026-09-24.png`
- SHA-256: `f49c0bf385076300e84d650f106649bef5e0e38aa1dfd64648a46ea1da0ae933`
- Deep link: https://divergram.com/guides/13192de1-d344-41a5-a1af-49e53e88852a

## Verification

- Korean, English, Japanese and Chinese public lists each include the guide exactly once.
- All four localized detail endpoints return the expected localized title and a non-empty body without cross-language fallback.
- The hosted PNG returns HTTP 200 with `image/png`.
- The public deep link returns HTTP 200.
- `node --test api/server/lib/diveGuide.test.js`: 3 passed, 0 failed.
- The artwork SHA-256 differs from all existing daily-guide artwork in `docs/content/assets`.
- The artwork is a newly generated AI concept illustration and was not reused from an earlier guide.

## Safety references

The article was independently written for Divergram. Environmental and operational facts were cross-checked against these official sources; no source text or media was copied.

- National Park Service, Biscayne National Park, Mooring Buoys: https://www.nps.gov/bisc/planyourvisit/mooring-buoys.htm
- NOAA Florida Keys National Marine Sanctuary, Buoys Float On Top: https://floridakeys.noaa.gov/30th/mooring-buoys.html
- NOAA Ocean Service, Other Threats to Coral Reefs: https://oceanservice.noaa.gov/education/tutorial_corals/coral12_other_threats.html
- NOAA Florida Keys National Marine Sanctuary, Buoy Program: https://floridakeys.noaa.gov/mbuoy/

## Artwork prompt

Original 16:9 scientific-educational editorial illustration showing a modest dive boat correctly secured to a reef mooring buoy in a clear above-and-below-water scene. Below the surface, the line remains clear of healthy coral and seagrass while two adult Asian recreational divers observe from a respectful distance. No text, logos, watermark, anchor damage or unsafe behavior.
