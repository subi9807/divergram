# Daily guide: 2026-09-13

- Published ID: `345c33f3-8a07-4fbb-b7f6-eaa2a5eaa843`
- Category: `environment`; sort order: 70.
- Payload: `reef-photography-2026-09-13.json`.
- Original AI artwork: `assets/reef-photography-2026-09-13.png`.
- Hosted artwork: https://api.divergram.com/api/uploads/c43a188f-c5a6-4602-949e-6cddb3b7d9d2.png
- Read existing admin records before writing: six published guides, none dedicated to considerate underwater photography; no matching body or image URL.
- New article was published once with the existing publisher. Other guides and automations were not changed.
- Preflight: all four locales populated; no Korean in non-Korean payloads; hosted image bytes equal local original.
- Visual review: two scuba divers clear of the reef; cover identified as conceptual, not training or species-identification material.
- Tests: `node --test api/server/lib/diveGuide.test.js`: 3 passed. Initial plural filename lookup failed; corrected to the existing singular filename.
- Public verification: ko/en/ja/zh lists contain this ID exactly once; all detail titles, summaries and bodies match payload; cover URL matches and image HTTP 200 for each locale.
- Verification scope: public API and generated image, not device UI rendering.

## Factual cross-checks (not imported content)

Consulted official Green Fins photography and environmental guidance for no-touch, buoyancy and wildlife-space principles. Text independently authored; no external article text or media downloaded for publication.

- https://greenfins.net/topic/managing-photographers/
- https://greenfins.net/material/gf_all_eng_bestpracticeuwphotographer_a4/
- https://pros-blog.padi.com/including-environmental-standards-in-your-dive-briefings/

Public detail: https://api.divergram.com/api/dive-guides/345c33f3-8a07-4fbb-b7f6-eaa2a5eaa843?locale=ko
