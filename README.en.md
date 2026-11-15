# Share Video Embeds

[Open the tool](https://h4m4chi-ttr.github.io/share-video-embeds/) · [日本語](README.md)

Convert YouTube URLs for player embeds on X (Twitter).

Paste a YouTube URL and select “Share on X” to open the composer. You can also copy the converted URL.

**This tool cannot guarantee 100% success for display or playback on X, now or in the future.**

## How to use

1. Paste a YouTube URL or send a video from your device’s share menu.
2. Select “Share on X”. The composer receives the converted URL and the title from your shared input or from the title field.
3. Review the draft and post it on X. Use “Copy URL for X” to copy just the converted URL.

Edit the optional post title in the app. Leaving the title blank shares only the converted URL.

## Android

1. Open the [tool](https://h4m4chi-ttr.github.io/share-video-embeds/) in Chrome on Android.
2. Open “Use from your phone’s share menu” and select “Install app”. If the button is unavailable, use “Install app” or the install option under “Add to Home screen” in Chrome’s menu. The label depends on the Chrome version.
3. In YouTube or another app, open the share menu and select “Share Video Embeds” (short name: “Video Embeds”). Copy the result or select “Share converted URL” and pick a destination when your device supports it.

If the app is missing from the share menu, check that Chrome installed the web app as an app. A Home Screen bookmark alone is insufficient. [Chrome’s Web Share Target guide](https://developer.chrome.com/docs/capabilities/web-apis/web-share-target)

## iOS

In Safari’s share menu, choose “Add to Home Screen” and enable “Open as Web App” if shown. Set up an Apple shortcut separately to receive URLs from the share sheet. [Safari Home Screen guide](https://support.apple.com/guide/iphone/iphea86e5236/ios) · [Apple’s guide to running shortcuts from the share sheet](https://support.apple.com/guide/shortcuts/launch-a-shortcut-from-another-app-apd163eb9f95/ios)

1. Create a shortcut in the Shortcuts app. In its details, turn on “Show in Share Sheet” and accept URLs and Text.
2. Pass “Shortcut Input” to “Combine Text” and use new lines as the separator.
3. Pass the combined text through “URL Encode” once.
4. In a “Text” action, enter `https://h4m4chi-ttr.github.io/share-video-embeds/#text=` and append the encoded result immediately after it. Leave no space or line break between them.
5. Pass that text to “Open URLs”. The browser runs the conversion when it opens the page. “Get Contents of URL” retrieves the HTML and does not run the page’s JavaScript.

Select the shortcut from YouTube’s share sheet and use the converted URL displayed in the browser.

### Configure the iCloud shortcut link

In the shortcut’s share menu, choose “Copy iCloud Link”. Set `IOS_SHORTCUT_URL` in [`docs/settings.mjs`](docs/settings.mjs) to the resulting `https://www.icloud.com/shortcuts/…` link. After the next build and deployment, a valid link enables “Add shortcut from iCloud”. With the setting empty, the manual steps are available on the page. [Apple’s guide to sharing shortcuts](https://support.apple.com/guide/shortcuts/share-shortcuts-apdf01f8c054/ios)

## Shared input interface

- Shortcuts sends URL-encoded shared text after `#text=`. Use `#url=` to pass an encoded video URL directly.
- Android uses GET parameters `text`, `url`, and `title` on the same page. The app checks all three for video links.
- The presence of `text` or `url` in the fragment takes precedence over the query, even when its value is empty. The app then removes the share fields from the address bar and preserves other fields.
- Share a URL on its own or provide a title and URL separated by spaces or new lines. The app validates candidates with the existing converter and treats identical converted URLs as one candidate. If the results differ, for example by start time, paste just the link you want to convert.
- Outer share parameters are decoded once. Encode the entire shared value to preserve characters such as `&`, `#`, `+` and `%`.

## Offline use and updates

Once the browser has loaded the app online and finished caching its files, you can convert URLs offline. Opening a video or the X composer requires a connection. Resharing depends on the device and the receiving app.

The build identifies each version from the app files and the service worker caches those files by version. A waiting update takes effect after all tabs and windows for the app close. Updates do not force a reload while you are entering a URL. To pick up an update, open the app online, close all instances of it, and open it again. [Service worker lifecycle](https://web.dev/articles/service-worker-lifecycle)

## Device checks

- On Android Chrome, install the app and check that “Share Video Embeds” appears when sharing from YouTube. Verify the converted link appears, the outgoing share contains the `/live/` video URL, and canceling a share shows no error.
- On iPhone or iPad, create the shortcut and try both a URL and shared text containing a title, a new line, and a URL. Check the conversion and repeat the share to the same page.
- On both, check conversion after opening from a share. After the browser caches the app, reopen it in airplane mode and test conversion.

## How the conversion works

For the same video, switching the URL to the /live/ format can change the metadata served to X (formerly Twitter) to request an embedded player. This tool uses that difference to change the URL format while keeping the video ID. Metadata tells X how to display a link.

A direct HTTP check on 2026-11-15, using User-Agent `Twitterbot/1.0`, observed the following for the same video:

| URL | twitter:card |
| --- | --- |
| https://www.youtube.com/watch?v=sjRYYBZHGWA | summary_large_image |
| https://www.youtube.com/live/sjRYYBZHGWA | player |

This is an observed example, not a promise for every video. X's [official Player Card sample](https://github.com/xdevplatform/cards-player-samples/blob/main/player/page.html) illustrates the player metadata. This static tool changes URLs; it does not fetch YouTube HTML or inspect the metadata for each submitted URL.

## Compatibility and local preview testing

Changes to YouTube or X, video restrictions, and link information cached by X may prevent the player from appearing or playing. This method may stop working in the future.

The standard build handles conversion, copy and sharing. The separate loopback-only test build has the player controls. [Policy review](YOUTUBE-POLICY.md)

Run `npm run build:preview` followed by `npm start` to inspect the local test interface. By default it only converts. Select “Show preview” to load the player or enable “Load previews automatically next time” to load it after the next conversion. This preference applies to manual input and both sharing paths. Playback starts from the player's controls. The test build does not perform the required Made For Kids lookup for production embeds.

## Features

- Supports watch, youtu.be, shorts, live and embed links.
- Converts valid input immediately, including Android and iOS share input.
- Tracking removal is OFF by default. The ON/OFF choice is saved in localStorage and restored on the next visit.
- Preserves timestamps, playlist information and unknown queries in the copied URL. Known tracking queries are removed only when requested.
- Japanese/English UI, responsive layout, copy and share.
- Japanese sample: b7xXmTfcGMQ. English sample: -OkrC6h2H5k. Changing language does not overwrite an entered URL.
- Static files only. No server, proxy, API key, build dependency or tool account is needed.

## Privacy and preferences

Conversion runs locally. The public build stores language and tracking-parameter removal preferences. The local test build also stores the policy agreement and a chosen automatic preview setting. [Privacy policy and terms](docs/privacy.html#en)

Existing preference keys:
- `youtube-live-link-pages.language`
- `youtube-live-link-pages.strip-tracking`

The app does not store share text, input URLs, or playback history. The offline cache contains only app files. Shortcut fragments are excluded from HTTP requests. Before a service worker controls the page, a request to GitHub Pages can include the Android share query. The app removes the share fields from the address bar after handling them.

With tracking removal OFF, the copied link retains its queries. The removable names are listed in `docs/youtube.mjs`; this heuristic cannot identify every possible tracking mechanism.

## Development

Requires Node.js 22 or newer. No npm installation is needed.

```sh
npm test
npm run build
npm start
```

Open http://127.0.0.1:5188/share-video-embeds/. The local server uses the same subpath as GitHub Pages and serves loopback HTTP, which supports service worker registration. The build writes the static files and a versioned service worker into `dist/`. The preview server is development-only.

## Deployment

GitHub Settings → Pages → Source: GitHub Actions.

The pinned workflow runs tests, builds the static files, and deploys `dist/` after a push to `main`. Pull requests only run build checks. Asset paths are relative, and the manifest starts and accepts shares at `./`. The manifest ID resolves from the origin. Forks deploying under a different project path should update `id` in `docs/manifest.webmanifest`, the development subpath, and the published URLs in the README files and `docs/index.html`.

## References

- [YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference)
- [Player parameters and embed URLs](https://developers.google.com/youtube/player_parameters)
- [X official Player Card sample](https://github.com/xdevplatform/cards-player-samples/blob/main/player/page.html)
- [GitHub Pages deployment](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)

The earlier ChatGPT Sites version remains a separate project. No Sites identity or credentials are included here.
