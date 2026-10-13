# Daily guide: 2026-09-14

- Published ID: `3e6e2bb3-56cd-4644-ad11-b2ef69388893`.
- Category: `equipment`; sort order: 80.
- Payload: `post-dive-gear-care-2026-09-14.json`.
- Original AI artwork: `assets/post-dive-gear-care-2026-09-14.png`.
- Hosted artwork: https://api.divergram.com/api/uploads/4339ac80-a55e-4403-9062-d965c56b252d.png
- Read existing admin records before writing: seven published guides; no matching title, body or image URL.
- New article was published once through the existing publisher. Other guides and automations were not changed.
- Preflight: all four locales populated; no Korean in non-Korean payloads; required Divergram credit and concept-art notice present.
- Visual review: diver inspecting post-dive equipment in a shaded, ventilated wash area; no text or third-party marks in the artwork.
- Tests: `node --test api/server/lib/diveGuide.test.js`: 3 passed.
- Public verification: ko/en/ja/zh lists contain this ID exactly once; all detail titles, summaries and bodies match the payload; the cover URL matches and returns HTTP 200.
- Image integrity: hosted and local artwork have the same SHA-256 hash, `227818ae0057d1b74ce46edf58b9057056e43250c53494cbb049eead773aca40`.
- Verification scope: public API and generated image, not device UI rendering.

## Factual cross-checks (not imported content)

Consulted official DAN and PADI equipment-care guidance for fresh-water rinsing, complete shaded drying, inspection and qualified servicing principles. The article was independently authored; no external article text or media was downloaded for publication.

- https://world.dan.org/safety-prevention/diver-safety/divers-blog/how-to-clean-and-sanitize-your-scuba-equipment/
- https://pros-blog.padi.com/5-tips-pros-maintain-scuba-gear-properly/
- https://blog.padi.com/basic-equipment-checks-for-scuba-divers/

Public detail: https://api.divergram.com/api/dive-guides/3e6e2bb3-56cd-4644-ad11-b2ef69388893?locale=ko
