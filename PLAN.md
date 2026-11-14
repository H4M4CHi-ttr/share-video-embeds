# Browser edition
The user requested a separate public GitHub Pages tool with no inspection server. Preserve the existing Sites app.
Use buildless HTML/CSS/ES modules, official YouTube iframe embeds and the IFrame Player API. Reuse the existing strict URL converter; do not include metadata fetching or Card classification. A PLAYING event confirms playback started on this page, not X Card support.
User correction: tracking removal defaults OFF, with ON/OFF stored in localStorage and safely restored; unavailable storage does not break the tool.
Files: docs/ (static site), tests/ (Node built-in tests), scripts/build.mjs and serve.mjs, .github/workflows/pages.yml, README.md.
Checks: URL validation, timestamp conversion, preference persistence/failure, player ready vs playback/error states, real browser playback, mobile layout and deployed Pages flow.
Publish only this new repository and static build. No secrets or Sites identity copied.
