# Dive log learning guide verification (2026-10-25)

- Published guide ID: `920db678-23bf-4227-bcad-2ca7d2f099b2`
- Public route: https://divergram.com/guides/920db678-23bf-4227-bcad-2ca7d2f099b2
- Hosted artwork: https://api.divergram.com/api/uploads/9363e8a0-195e-4083-b5ed-447e74caf85a.png
- Local artwork: `docs/content/assets/dive-log-learning-2026-10-25.png`
- Source payload: `docs/content/dive-log-learning-2026-10-25.json`
- Artwork dimensions: `1672 x 941`
- Artwork SHA-256: `41cba91b621fd094da8f41a7621d81628f61c8c1a6945221cf7e19bc8eae4945`
- Artwork size: `2,438,581` bytes
- Duplicate artwork matches in `docs/content/assets`: `0`

## Publication checks

- Existing local content and all 47 operating admin API guides were checked before publication. No existing guide focused on using a personal dive log to connect actual profile data, conditions, equipment configuration, decisions and a next action.
- Immediately before publication, the operating admin API still contained 47 guides and zero exact matches for the Korean title.
- The existing duplicate-aware publisher was run once, created guide `920db678-23bf-4227-bcad-2ca7d2f099b2` and returned `published` status.
- The operating admin API contained 48 guides after publication, with the new ID and Korean title each appearing exactly once.
- Korean, English, Japanese and Chinese list responses each contained the new guide exactly once.
- All four localized detail responses returned HTTP 200 and exactly matched the expected title, summary, complete body, hosted artwork URL and localized Divergram attribution.
- The hosted PNG returned HTTP 200 with `image/png`, a non-empty 2,438,581-byte payload and the same SHA-256 as the local artwork.
- The public web detail route returned HTTP 200.
- The production monitor passed all guide, API, access-guard, deep-link and media checks. Its one pre-existing warning states that resort payments remain in PayPal sandbox/sample mode and is unrelated to this publication.

## Originality and artwork

The four localized articles were written specifically for Divergram and do not reproduce external text. The cover is a newly generated image and does not match another file in the daily-guide asset directory.

Image prompt summary: a wide realistic scene at a shaded tropical dive center after a calm morning dive. Two adult East Asian buddies compare the actual profile on a wrist dive computer and write observations in a waterproof paper logbook while rinsed equipment dries nearby. The image avoids readable text, logos, recognizable app interfaces, emergencies, alcohol and unsafe cylinder handling.

## Safety cross-checks

The article was independently written after checking authoritative guidance that dive logs can preserve date, location, depth, time, team members, purpose, environmental conditions, equipment issues and potentially dangerous events; that operational logs can help monitor whether divers have safely exited; and that personal records can support proof of recent or environment-specific experience and capture equipment configuration, conditions and lessons for future dives:

- NOAA Repository, Diver Education Series - Recordkeeping for Divers: https://repository.library.noaa.gov/view/noaa/42457
- NOAA Repository, Information Required for Diving Logs: https://repository.library.noaa.gov/view/noaa/35886/noaa_35886_DS1.pdf
- NOAA Diving Program, Dive Unit Logbook guidance: https://www.omao.noaa.gov/sites/default/files/documents/UDS%20Manual%20112415.pdf
- British Sub-Aqua Club, Safe Diving Guide - Dive Management: https://www.bsac.com/safety/safe-diving-guide/dive-management/
- PADI, How to Log a Dive Using a Dive Log App or Diving Logbook: https://blog.padi.com/how-to-log-a-dive/
- PADI, Why Keeping a Logbook Will Help Make You a Better Diver: https://blog.padi.com/why-keeping-a-logbook-will-help-make-you-a-better-diver/

The public guide does not treat a personal log as a substitute for a dive computer, planner, boat roster, professional operations log, incident report, training or medical evaluation. It directs divers to complete immediate safety actions first, preserve actual computer data, distinguish observations from assumptions, keep claims of experience factual, protect unnecessary personal and sensitive-location data, and follow the site's emergency and reporting procedures before making a personal note when an incident or symptom is present.
