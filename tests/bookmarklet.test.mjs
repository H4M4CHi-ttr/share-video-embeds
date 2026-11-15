import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { createBookmarklet } from '../docs/bookmarklet.mjs';
import { readSharedInput } from '../docs/shared-input.mjs';

const app = 'https://h4m4chi-ttr.github.io/share-video-embeds/';
const guidance = 'YouTubeの動画ページで実行してください。';

function runBookmarklet(href, title) {
  const opened = [];
  const alerts = [];
  const code = decodeURIComponent(createBookmarklet(app, guidance).slice('javascript:'.length));
  runInNewContext(code, {
    location: new URL(href), document: { title }, URLSearchParams,
    window: { open: (...args) => opened.push(args), alert: message => alerts.push(message) },
  });
  return { opened, alerts };
}

test('bookmarklet opens the converter in a new tab with the URL and title in the fragment', () => {
  const video = 'https://www.youtube.com/watch?v=b7xXmTfcGMQ&t=20&si=a%2Bb#t=24';
  const title = '曲名 ＋ 100% "ツアー"';
  const { opened, alerts } = runBookmarklet(video, title + ' - YouTube');
  assert.deepEqual(alerts, []);
  assert.equal(opened.length, 1);
  const [href, target, features] = opened[0];
  assert.equal(target, '_blank');
  assert.equal(features, 'noopener,noreferrer');
  assert.equal(new URL(href).search, '');
  assert.deepEqual(readSharedInput(href), { input: video, title, hasText: true, cleanUrl: app });
});

test('bookmarklet does not read shares from a lookalike domain', () => {
  const result = runBookmarklet('https://www.youtube.com.example.org/watch?v=b7xXmTfcGMQ', 'Wrong site');
  assert.deepEqual(result, { opened: [], alerts: [guidance] });
});
