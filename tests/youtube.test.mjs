import { test } from 'node:test';
import assert from 'node:assert/strict';
import { convertYouTubeUrl } from '../docs/youtube.mjs';
const id = 'sjRYYBZHGWA';
const live = 'https://www.youtube.com/live/' + id;
for (const input of [
  'https://www.youtube.com/watch?v=' + id,
  'https://youtu.be/' + id,
  'youtube.com/shorts/' + id,
  'https://m.youtube.com/live/' + id,
  'https://music.youtube.com/watch?v=' + id,
  'https://www.youtube-nocookie.com/embed/' + id,
]) {
  test('converts ' + input, () => assert.equal(convertYouTubeUrl(input).url, live));
}
test('when enabled, removes tracking but preserves playback, playlist, and unknown queries', () => {
  const r = convertYouTubeUrl('https://youtu.be/' + id + '?si=secret&t=1m3s&list=PLabc&index=2&pp=foo&ra=m&utm_source=x&custom=yes#t=9', true);
  assert.equal(r.url, live + '?t=1m3s&list=PLabc&index=2&custom=yes#t=9', true);
  assert.deepEqual(r.removed, ['si', 'pp', 'ra', 'utm_source']);
});
test('opt out preserves trackers; video selector is always moved into path', () => {
  assert.equal(convertYouTubeUrl('https://youtube.com/watch?v=' + id + '&si=a%2Bb&t=20', false).url, live + '?si=a%2Bb&t=20');
});
test('case-insensitive trackers and duplicates are removed', () => {
  assert.equal(convertYouTubeUrl(live + '?SI=a&si=b&UTM_MEDIUM=c&t=5', true).url, live + '?t=5');
});
test('conversion is idempotent and upgrades HTTP', () => {
  const r = convertYouTubeUrl(' http://youtube.com/live/' + id + '?t=4 ');
  assert.equal(convertYouTubeUrl(r.url).url, r.url);
});
for (const input of [
  '', 'hello', 'https://youtube.com.evil.test/watch?v=' + id,
  'https://youtube.com@evil.test/watch?v=' + id,
  'https://evil@youtube.com/watch?v=' + id,
  'ftp://youtube.com/watch?v=' + id,
  'https://youtube.com:9000/watch?v=' + id,
  'https://youtube.com/playlist?list=123',
  'https://youtube.com/watch?v=short',
  'https://youtu.be/' + id + '/extra',
  'https://youtube.com/watch?v=' + id + '&v=FZCoDW52xXA',
  'https://youtube.com/live/' + id + '?v=FZCoDW52xXA',
  'https://youtube.com/watch?v=' + id + '&v=' + id,
  'https://youtube.com/watch?v=' + id + '&x=' + 'x'.repeat(4100),
]) test('rejects unsafe/ambiguous input ' + input.slice(0,80), () => assert.throws(() => convertYouTubeUrl(input)));

test('default preserves tracking until explicitly enabled', () => {
  assert.equal(convertYouTubeUrl('https://youtu.be/' + id + '?si=abc&pp=foo').url, live + '?si=abc&pp=foo');
});