# YouTube to X Player

[Open the tool](https://h4m4chi-ttr.github.io/youtube-to-x-player/) · [日本語](README.md)

Convert YouTube URLs for player embeds on X (Twitter). Paste a URL, copy the result, and use it in your post. Display and playback, including future compatibility, are not guaranteed.

Paste a YouTube URL, copy the converted link, and paste it into your post on X.

**This tool cannot guarantee 100% success for display or playback on X, now or in the future.**

## How to use

1. Paste a YouTube URL
2. Copy the converted URL
3. Paste it into your post on X

## How the conversion works

For the same video, switching the URL to the /live/ format can change the metadata served to X (formerly Twitter) to request an embedded player. This tool uses that difference to change the URL format while keeping the video ID. Metadata tells X how to display a link.

A direct HTTP check on 2026-11-15, using User-Agent `Twitterbot/1.0`, observed the following for the same video:

| URL | twitter:card |
| --- | --- |
| https://www.youtube.com/watch?v=sjRYYBZHGWA | summary_large_image |
| https://www.youtube.com/live/sjRYYBZHGWA | player |

This is an observed example, not a promise for every video. X's [official Player Card sample](https://github.com/xdevplatform/cards-player-samples/blob/main/player/page.html) illustrates the player metadata. This static tool changes URLs; it does not fetch YouTube HTML or inspect the metadata for each submitted URL.

## Compatibility and preview limits

Changes to YouTube or X, video restrictions, and link information cached by X may prevent the player from appearing or playing. This method may stop working in the future.

Playback checks in this preview are optional. Use the converted URL above for your X post.

The player on this page uses the /embed/ URL for the same video. A playback-start event marks it as confirmed here, but this does not inspect metadata for X or test playback on X. It also does not guarantee that the entire video will play.

The preview tests only the selected video. It translates valid timestamps into the iframe start parameter but does not load the copied link's playlist or forward arbitrary player parameters. It verifies the expected video ID before recording a PLAYING event, so a related video cannot inherit the original video's successful result.

Embedding restrictions (101/150), unavailable/private videos (100), referrer/client identification errors (153), and other player errors are reported separately. An unavailable IFrame API is inconclusive: the iframe remains available for manual inspection.

## Features

- Supports watch, youtu.be, shorts, live and embed links.
- Converts valid input immediately and loads the iframe after a 350 ms pause in typing. Playback requires a user action.
- Tracking removal is OFF by default. The ON/OFF choice is saved in localStorage and restored on the next visit.
- Preserves timestamps, playlist information and unknown queries in the copied URL. Known tracking queries are removed only when requested.
- Japanese/English UI, responsive layout, copy, reload, close and optional muted playback check.
- Japanese sample: b7xXmTfcGMQ. English sample: -OkrC6h2H5k. Changing language does not overwrite an entered URL.
- Static files only. No server, proxy, API key, build dependency or tool account is needed.

## Privacy and preferences

Conversion is local. After valid input settles, the browser connects directly to YouTube to load the iframe and YouTube's normal data practices apply. This is not anonymous YouTube playback.

Only language and the tracking-removal preference are stored by the app. The existing keys are retained across the repository rename so saved choices continue to work:
- `youtube-live-link-pages.language`
- `youtube-live-link-pages.strip-tracking`

The app does not store input URLs or playback history. With tracking removal OFF, the copied link retains its queries. The removable names are listed in `docs/youtube.mjs`; this heuristic cannot identify every possible tracking mechanism.

## Development

Requires Node.js 22 or newer. No npm installation is needed.

```sh
npm test
npm run build
npm start
```

Open http://127.0.0.1:5188/. Use HTTP rather than file:// so the IFrame API has a valid origin/referrer. The build copies nine static files into `dist/`. The preview server is development-only.

## Deployment

GitHub Settings → Pages → Source: GitHub Actions.

The pinned workflow runs tests, builds the static files, and deploys `dist/` after a push to `main`. Pull requests only run build checks. Asset paths are relative and support project Pages paths. Forks should update the repository and website links in the README files and `docs/index.html`.

## References

- [YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference)
- [Player parameters and embed URLs](https://developers.google.com/youtube/player_parameters)
- [X official Player Card sample](https://github.com/xdevplatform/cards-player-samples/blob/main/player/page.html)
- [GitHub Pages deployment](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)

The earlier ChatGPT Sites version remains a separate project. No Sites identity or credentials are included here.
