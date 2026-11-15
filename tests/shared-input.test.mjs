import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readSharedInput } from '../docs/shared-input.mjs';
import { convertYouTubeUrl } from '../docs/youtube.mjs';

const page = 'https://h4m4chi-ttr.github.io/share-video-embeds/';
const video = 'https://youtu.be/b7xXmTfcGMQ';
const other = 'https://www.youtube.com/watch?v=-OkrC6h2H5k';
const encoded = encodeURIComponent;

test('reads both iOS fragment fields and keeps ordinary page state', () => {
  for (const field of ['text', 'url']) {
    const input = field === 'text' ? '動画のタイトル\r\n' + video : video;
    const result = readSharedInput(page + '?lang=ja&custom=%2b#section&' + field + '=' + encoded(input));
    assert.equal(result.input, video);
    assert.equal(result.title, field === 'text' ? '動画のタイトル' : undefined);
    assert.equal(result.cleanUrl, page + '?lang=ja&custom=%2b#section');
  }
});

test('recognizes an Android share through each field, including bare hosts', () => {
  for (const field of ['text', 'url', 'title']) {
    const result = readSharedInput(page + '?' + field + '=' + encoded('動画タイトル\n「youtu.be/b7xXmTfcGMQ」'));
    assert.equal(result.input, 'youtu.be/b7xXmTfcGMQ');
    assert.equal(result.cleanUrl, page);
  }
});

test('fragment wins over query and both kinds of consumed fields are removed', () => {
  const result = readSharedInput(page + '?' + new URLSearchParams({
    title: 'Android title', text: other, url: other, theme: 'light',
  }) + '#text=' + encoded(video) + '&section=%2f&section=');
  assert.deepEqual(result, { input: video, hasText: true, cleanUrl: page + '?theme=light#section=%2f&section=' });
  assert.equal(readSharedInput(page + '?url=' + encoded(video) + '#text=').error, 'shareEmpty');
});

test('a bookmarklet title stays separate from video links and is removed from the fragment', () => {
  const title = '曲名 / https://www.youtube.com/watch?v=-OkrC6h2H5k';
  const fields = new URLSearchParams({ text: video, title, section: 'guide' });
  const result = readSharedInput(page + '#' + fields);
  assert.deepEqual(result, { input: video, hasText: true, title, cleanUrl: page + '#section=guide' });
});

test('ordinary fragments and queries do not trigger a share', () => {
  assert.equal(readSharedInput(page + '?label=abc#intro'), null);
  assert.equal(readSharedInput(page + '#title=Unrelated'), null);
});

test('identical results are deduplicated across all fields', () => {
  const result = readSharedInput(page + '?' + new URLSearchParams({
    title: '動画',
    text: video + '\n' + video,
    url: 'https://www.youtube.com/live/b7xXmTfcGMQ',
  }));
  assert.equal(result.input, video);
  assert.equal(result.title, '動画');
});

test('rejects distinct results, including different start times for the same ID', () => {
  for (const second of [other, video + '?t=8']) {
    const result = readSharedInput(page + '?url=' + encoded(video) + '&url=' + encoded(second));
    assert.equal(result.error, 'shareMultiple');
    assert.equal(result.cleanUrl, page);
  }
});

test('reports no input separately from invalid input', () => {
  assert.equal(readSharedInput(page + '?text=%0D%0A+').error, 'shareEmpty');
  for (const invalid of [
    '動画タイトルのみ',
    'https://youtube.com.evil.example/watch?v=b7xXmTfcGMQ',
    'https://www.youtube.com@evil.example/watch?v=b7xXmTfcGMQ',
    'https://evil.example/?url=' + video,
    'javascript:' + video,
    'ftp://youtu.be/b7xXmTfcGMQ',
    'https://www.youtube.com/watch?v=b7xXmTfcGMQ&v=b7xXmTfcGMQ',
    'https://youtu.be/not-a-valid-id',
  ]) {
    assert.equal(readSharedInput(page + '#text=' + encoded(invalid)).error, 'shareInvalid', invalid);
  }
});

test('decodes the wrapper once and leaves video options to the existing converter', () => {
  const raw = video + '?t=42&list=PLabcd&si=tracking&utm_source=Android&note=A%26B%2BC%2526東京&plus=one+two#t=42&label=日本語+%25';
  for (const prefix of ['?text=', '#text=']) {
    const result = readSharedInput(page + prefix + encoded('動画のタイトル 日本語 + 100%\n' + raw));
    assert.equal(result.input, raw);
    for (const strip of [false, true]) {
      const url = new URL(convertYouTubeUrl(result.input, strip).url);
      assert.equal(url.pathname, '/live/b7xXmTfcGMQ');
      assert.equal(url.searchParams.get('note'), 'A&B+C%26東京');
      assert.equal(url.searchParams.get('plus'), 'one two');
      assert.equal(url.searchParams.get('t'), '42');
      assert.equal(url.searchParams.get('list'), 'PLabcd');
      assert.equal(url.searchParams.has('si'), !strip);
      assert.equal(url.searchParams.has('utm_source'), !strip);
      assert.equal(url.hash, new URL(raw).hash);
    }
  }
  assert.equal(readSharedInput(page + '#url=' + encoded(encoded(video))).error, 'shareInvalid');
});
