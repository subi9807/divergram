# Daily guide: 2026-09-20

- Published ID: `0de4ebc8-8e99-4587-bd20-d7f8f7d31c29`.
- Category: `safety`; sort order: 140.
- Payload: `surface-visibility-2026-09-20.json`.
- Original AI artwork: `assets/surface-visibility-2026-09-20.png`.
- Hosted artwork: https://api.divergram.com/api/uploads/c05ac0aa-4bcd-4adb-b2c0-30d4eb108b9c.png
- Read existing admin records before writing: thirteen published guides; no matching title, body or image URL.
- New article was published once through the existing admin API. Other guides and automations were not changed.
- Preflight: all four locales populated; no Korean in non-Korean payloads; required Divergram credit and concept-art notice present.
- Visual review: two divers remain together below an upright orange surface marker while a dive boat stays at a safe distance; no readable text, third-party marks, reef contact or procedural deployment sequence.
- Tests: `node --test api/server/lib/diveGuide.test.js`: 3 passed.
- Public verification: ko/en/ja/zh lists contain this ID exactly once; all detail titles, summaries and bodies match the payload; the cover URL matches and returns HTTP 200 with `image/png`.
- Image integrity: hosted and local artwork have the same SHA-256 hash, `86bf4102d02bed67a733dfa8de60d9027b7120854490a3642e51392175c3624c`.
- Deep-link landing page: https://divergram.com/guides/0de4ebc8-8e99-4587-bd20-d7f8f7d31c29 returns HTTP 200.
- Verification scope: public API, admin API, deep-link landing page and generated image; not device UI rendering.

## Factual cross-checks (not imported content)

Consulted official DAN and PADI guidance on boat awareness, dive flags, surface markers, maintaining visibility and learning DSMB use through appropriate training. The article was independently authored; no external article text or media was downloaded for publication.

- https://dan.org/safety-prevention/diver-safety/psa/safe-boating-guidelines/
- https://store.padi.com/en-us/ns/courses/delayed-surface-marker-buoy-dsmb-diver/p/delayed-surface-marker-buoy-dsmb-diver/
- https://blog.padi.com/good-scuba-surface-habits/

Public detail: https://api.divergram.com/api/dive-guides/0de4ebc8-8e99-4587-bd20-d7f8f7d31c29?locale=ko
