# Daily guide: 2026-09-17

- Published ID: `bf707e8f-849f-4adb-84e3-ee7fdc79b85f`.
- Category: `skills`; sort order: 110.
- Payload: `pre-dive-buddy-briefing-2026-09-17.json`.
- Original AI artwork: `assets/pre-dive-buddy-briefing-2026-09-17.png`.
- Hosted artwork: https://api.divergram.com/api/uploads/bb02af22-b36c-4e86-9a2f-9d42648c53ae.png
- Read existing admin records before writing: ten published guides; no matching title, body or image URL.
- New article was published once through the existing publisher. Other guides and automations were not changed.
- Preflight: all four locales populated; no Korean in non-Korean payloads; required Divergram credit and concept-art notice present.
- Visual review: two divers communicate before entry on a boat; no text or third-party marks in the artwork.
- Tests: `node --test api/server/lib/diveGuide.test.js`: 3 passed.
- Public verification: ko/en/ja/zh lists contain this ID exactly once; all detail titles, summaries and bodies match the payload; the cover URL matches and returns HTTP 200 with `image/png`.
- Image integrity: hosted and local artwork have the same SHA-256 hash, `ce85a1370ac8c55b9eda5d3ad8d6a859a8fb0c78773a606c8d5208c626deeed6`.
- Verification scope: public API and generated image, not device UI rendering.

## Factual cross-checks (not imported content)

Consulted official PADI guidance for mutual pre-dive checks, reviewing communication and the dive plan, site briefings, checking before each dive, and the right of either diver to end the dive. The article was independently authored; no external article text or media was downloaded for publication.

- https://blog.padi.com/never-skip-buddy-check/
- https://blog.padi.com/good-scuba-surface-habits/
- https://blog.padi.com/wp-content/uploads/2023/03/752DT_BWRAF_Predive_Safety_Check_Poster_8x11.pdf

Public detail: https://api.divergram.com/api/dive-guides/bf707e8f-849f-4adb-84e3-ee7fdc79b85f?locale=ko
