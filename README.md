# YouTube Live Link — Browser edition

A static, bilingual YouTube URL converter and real iframe playback check for GitHub Pages. No server, API key, build dependency, proxy or account required.

**Live:** https://h4m4chi-ttr.github.io/youtube-live-link-pages/

## Features
- Converts watch, youtu.be, shorts, live and embed URLs to `https://www.youtube.com/live/VIDEO_ID`.
- Tracking removal is **OFF by default**. The ON/OFF choice is saved in localStorage and restored on the next visit. Storage failures do not break conversion.
- Preserves timestamps, playlist information and unknown queries in the copied link. Known tracking queries are removed only when requested.
- Loads an actual YouTube iframe on demand. Nothing connects to YouTube until “Load player” is selected.
- Japanese/English UI, mobile layout, copy, retry, close and muted playback test.
- Marks playback as confirmed only after a YouTube IFrame Player API `PLAYING` event for the expected video ID. A loaded iframe or `onReady` event is **not** a pass.
- Differentiates embedding restriction (101/150), unavailable/private video (100), referrer/client identification (153), other player failures and unavailable API communication.

## What this does and does not prove
The share URL uses **/live/**. The iframe uses **/embed/** with the same video ID; embedding the ordinary /live/ web page is not the YouTube embedding interface.
The preview tests one video only. It translates valid timestamps to the embed start parameter, but does not load the copied link's playlist or forward arbitrary player parameters.

**Successful playback here does not verify an X Player Card or playback inside X.** This version never fetches YouTube HTML or inspects `twitter:card`. X can use a different card type, crawler response, cache, browser environment and rights context. A PLAYING event confirms playback started, not that the whole video will remain playable. Related videos cannot inherit the original video's successful status.

A missing or blocked API script is inconclusive. The iframe remains visible for manual inspection; no false “embedding prohibited” verdict is shown. If scripts or privacy extensions block communication, reload or use the player directly.

## Privacy and preferences
Conversion is local. When loading the iframe, the browser connects directly to YouTube and its normal data practices apply. This is not a claim of anonymous YouTube playback.
Only language and the tracking-removal preference are stored by this app:
- `youtube-live-link-pages.language`
- `youtube-live-link-pages.strip-tracking`

The app does not store input URLs or playback history. Copying a URL with tracking removal OFF retains its queries. The list of removable tracking names is in `docs/youtube.mjs`; this heuristic cannot identify every possible tracking mechanism.

## Development
Requires Node.js 22 or newer. No npm installation is needed.
```sh
npm test
npm run build
npm start
```
Open http://127.0.0.1:5188/. Use HTTP rather than file:// so the IFrame API has a valid origin/referrer. The build copies nine static files into `dist/`. The preview server is development-only and is not deployed.

## Deployment
GitHub Settings → Pages → Source: **GitHub Actions**.
The pinned workflow runs tests, builds the static files, and deploys the `dist/` artifact after a push to `main`. Pull requests only run the build checks.
All asset paths are relative, so project Pages paths work without a custom domain. Forks should update the repository and site links in this README and `docs/index.html`.

## Verification and references
Unit tests cover URL/host validation, timestamp translation, preference persistence and storage failures, loaded-vs-playing states, errors and wrong-video resets. Browser checks additionally exercise the real iframe.

Primary references:
- [Official YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference)
- [Player parameters, origin and embed URLs](https://developers.google.com/youtube/player_parameters)
- [GitHub Pages deployment](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)

The earlier server-backed ChatGPT Sites version is a separate project. No Sites identity or credentials are included in this repository.
