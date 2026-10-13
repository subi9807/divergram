# Divergram public website structure

This document is the source-of-truth map for the production site published at `divergram.com`.

## Public pages

- `index.html` — global landing page
- `service.html` — service overview
- `contact.html` — customer support and worldwide partnership inquiries
- `about.html`, `mission.html`, `news.html`, `career.html` — company pages
- `terms.html`, `privacy.html`, `location.html` — core legal terms
- `marketing.html`, `third-party.html`, `consent.html` — consent documents
- `youth.html`, `security.html`, `cookie.html`, `copyright.html` — protection policies
- `openapi.html`, `license.html`, `account-deletion.html`, `sitemap.html` — platform and account policies

Public URLs stay extensionless in links (for example `/terms`), while their source files retain the `.html` extension for the current static-server deployment.

## Assets

```text
assets/
├── divergram-logo-blue.png       # canonical Divergram blue logo
├── favicon.svg / favicon-32.png  # browser icons
├── screens/
│   ├── ko/                       # Korean app captures
│   ├── en/                       # English-localized captures
│   ├── ja/                       # Japanese-localized captures
│   └── zh/                       # Simplified Chinese-localized captures
│       ├── feed.png
│       ├── explore.png
│       ├── resorts.png
│       ├── profile.png
│       ├── reels.png
│       ├── dive-log.png
│       └── license.png
│       └── 01-login.png … 08-license.png # numbered store source captures
└── proposal/                     # partnership proposal reference images
```

Screen filenames are semantic and identical in every language directory. `modern-i18n.js` selects the directory from the active site language, so HTML does not need separate image paths per locale.

## Localization

```text
js/
├── main.js                       # shared header, menu, footer, language state
├── modern-i18n.js                # home, service, contact copy and localized screen selection
├── policy-modern.js              # policy navigation and full legal-body localization
└── policy-shell.js               # shared responsive legal reading shell

content/policies/
├── ko.json
├── en.json
├── ja.json
└── zh.json
```

The selected language is stored in `localStorage` as `divergram-language`. Policy JSON files preserve one translated value for every visible source string so article bodies, headings, descriptions and page titles change together.

## Styles

- `css/modern-i18n.css` — shared language selector and responsive multilingual rules
- `css/policy-modern.css` — responsive legal shell, sidebar, article and table presentation
- `css/contact-new.css`, `css/service-modern.css` — page-specific layouts
- `css/account-policy.css` — account deletion page and its language control

## Build and maintenance tools

- `../tools/build-policy-i18n.mjs` — extracts policy source strings and rebuilds four policy dictionaries
- `../tools/ocr-screen.swift` — recognizes text in approved Korean app captures
- `../tools/capture-localized-simulator.sh` — captures the eight approved screens in all four app locales
- `../tools/sync-app-locale-fallbacks.mjs` — synchronizes code fallback keys across every app locale

## Support and partnership data flow

```text
contact.html + js/contact-new.js
  -> POST /api/public/website-inquiries
  -> api/db/migrations/20260812000100_add_website_inquiries.sql
  -> app_website_inquiries + app_website_inquiry_history
  -> adm/src/sections/WebsiteInquiriesSection.jsx
```

The admin has separate customer-support and partnership-inquiry menus. Public form creation is rate-limited and honeypot-protected; admin reads and status/note changes require admin authentication.

Run generated-content tools from the repository root. Review legal translations with qualified local counsel before jurisdiction-specific publication; Korean remains the source text for rebuilds.
