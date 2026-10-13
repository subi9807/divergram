# Daily guide: 2026-09-18

- Published ID: `fc0f00f2-0316-45b8-ab6c-1cf0b04204c2`.
- Category: `equipment`; sort order: 120.
- Payload: `dive-computer-before-entry-2026-09-18.json`.
- Original AI artwork: `assets/dive-computer-before-entry-2026-09-18.png`.
- Hosted artwork: https://api.divergram.com/api/uploads/b89d0d31-9225-4bec-848a-287eb2d4b94b.png
- Read existing admin records before writing: eleven published guides; no matching title, body or image URL.
- New article was published once through the existing publisher. Other guides and automations were not changed.
- Preflight: all four locales populated; no Korean in non-Korean payloads; required Divergram credit and concept-art notice present.
- Visual review: a diver reviews a wrist computer and a plan on the boat; no readable figures, text or third-party marks.
- Tests: `node --test api/server/lib/diveGuide.test.js`: 3 passed.
- Public verification: ko/en/ja/zh lists contain this ID exactly once; all detail titles, summaries and bodies match the payload; the cover URL matches and returns HTTP 200 with `image/png`.
- Image integrity: hosted and local artwork have the same SHA-256 hash, `381c7044ed072f08efdd7a9b16ed1cbe167978e127fff74b5dc894ff8bc023ce`.
- Verification scope: public API and generated image, not device UI rendering.

## Factual cross-checks (not imported content)

Consulted official DAN and PADI guidance for reading the manual, checking battery and settings, using the correct breathing-gas setting, understanding differences between computers, and not treating a computer as a guarantee of safety. The article was independently authored; no external article text or media was downloaded for publication.

- https://dan.org/health-medicine/health-resource/dive-medical-reference-books/decompression-sickness/use-of-dive-computers/
- https://www.padi.com/ja/diving-gear/dive-computer
- https://blog.padi.com/basic-equipment-checks-for-scuba-divers/

Public detail: https://api.divergram.com/api/dive-guides/fc0f00f2-0316-45b8-ab6c-1cf0b04204c2?locale=ko
