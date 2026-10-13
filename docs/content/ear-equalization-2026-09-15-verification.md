# Daily guide: 2026-09-15

- Published ID: `8300330c-637d-4650-8162-43f86d95ec33`.
- Category: `safety`; sort order: 90.
- Payload: `ear-equalization-2026-09-15.json`.
- Original AI artwork: `assets/ear-equalization-2026-09-15.png`.
- Hosted artwork: https://api.divergram.com/api/uploads/646b7ead-21c6-4fc9-b70d-9678e598093f.png
- Read existing admin records before writing: eight published guides; no matching title, body or image URL.
- New article was published once through the existing publisher. Other guides and automations were not changed.
- Preflight: all four locales populated; no Korean in non-Korean payloads; required Divergram credit and concept-art notice present.
- Visual review: two equipped divers pause by a descent line; the lead diver indicates an ear concern without distress, text or third-party marks.
- Tests: `node --test api/server/lib/diveGuide.test.js`: 3 passed.
- Public verification: ko/en/ja/zh lists contain this ID exactly once; all detail titles, summaries and bodies match the payload; the cover URL matches and returns HTTP 200 with `image/png`.
- Image integrity: hosted and local artwork have the same SHA-256 hash, `6804383c8cb147a7abacc61e5a3c0ad10cabbf87b234cb2e4e276d73b79dc8bd`.
- Verification scope: public API and generated image, not device UI rendering.

## Factual cross-checks (not imported content)

Consulted official DAN and PADI guidance for early and gentle equalization, stopping descent when discomfort appears, moving slightly shallower rather than forcing the maneuver, aborting when equalization cannot be achieved, and seeking medical assessment for persistent pain, vertigo or hearing changes. The article was independently authored; no external article text or media was downloaded for publication.

- https://world.dan.org/health-medicine/health-resources/diseases-conditions/middle-ear-equalization/
- https://dan.org/health-medicine/health-resource/dive-medical-reference-books/ears-diving/ear-injuries/
- https://blog.padi.com/ear-equalization-and-ear-care-for-scuba-divers/

Public detail: https://api.divergram.com/api/dive-guides/8300330c-637d-4650-8162-43f86d95ec33?locale=ko
