# Daily guide: 2026-09-16

- Published ID: `ab21e209-9416-4287-ac77-f54c58427ade`.
- Category: `environment`; sort order: 100.
- Payload: `respectful-wildlife-observation-2026-09-16.json`.
- Original AI artwork: `assets/respectful-wildlife-observation-2026-09-16.png`.
- Hosted artwork: https://api.divergram.com/api/uploads/ca895ede-38c2-45a1-8736-1e0e9580fff2.png
- Read existing admin records before writing: nine published guides; no matching title, body or image URL.
- New article was published once through the existing publisher. Other guides and automations were not changed.
- Preflight: all four locales populated; no Korean in non-Korean payloads; required Divergram credit and concept-art notice present.
- Visual review: two neutrally buoyant divers observe a sea turtle from a clear distance with an open route; no contact, bait, text or third-party marks.
- Tests: `node --test api/server/lib/diveGuide.test.js`: 3 passed.
- Public verification: ko/en/ja/zh lists contain this ID exactly once; all detail titles, summaries and bodies match the payload; the cover URL matches and returns HTTP 200 with `image/png`.
- Image integrity: hosted and local artwork have the same SHA-256 hash, `da672f9dfaa94929eb76b58240539e4ab16a9b644e57b1a26c0ebb598f626108`.
- Verification scope: public API and generated image, not device UI rendering.

## Factual cross-checks (not imported content)

Consulted official NOAA and PADI AWARE guidance for keeping distance, leaving escape routes open, avoiding touch, feeding and pursuit, controlling buoyancy and securing equipment around reefs. The article was independently authored; no external article text or media was downloaded for publication.

- https://oceanservice.noaa.gov/facts/ocean-etiquette.html
- https://floridakeys.noaa.gov/visitor_information/things-to-do/responsible-diving.html
- https://pros-blog.padi.com/wp-content/uploads/2018/10/PA_10Tips_Poster.pdf

Public detail: https://api.divergram.com/api/dive-guides/ab21e209-9416-4287-ac77-f54c58427ade?locale=ko
