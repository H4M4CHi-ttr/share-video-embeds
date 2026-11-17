import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { renderHtml } from '../scripts/render-html.mjs';
import { strings } from '../docs/i18n.mjs';

const template = await readFile(new URL('../docs/index.html', import.meta.url), 'utf8');
const root = 'https://h4m4chi-ttr.github.io/share-video-embeds/';

for (const language of ['ja', 'en']) {
  test(language + ' entry contains readable content and consistent search metadata before JavaScript', () => {
    const html = renderHtml(template, language);
    const url = root + (language === 'en' ? 'en.html' : '');
    assert.ok(html.includes('<html lang="' + language + '">'));
    assert.ok(html.includes('data-i18n="heading">' + strings[language].heading + '</h1>'));
    assert.ok(html.includes('data-i18n="stepPaste">' + strings[language].stepPaste + '</li>'));
    assert.doesNotMatch(html, /data-i18n="[^"]+"><\//u);
    assert.ok(html.includes('<link rel="canonical" href="' + url + '">'));
    assert.ok(html.includes('<meta property="og:url" content="' + url + '">'));
    assert.ok(html.includes('<meta name="description" content="' + strings[language].metaDescription + '">'));
    assert.ok(html.includes('hreflang="ja" href="' + root + '"'));
    assert.ok(html.includes('hreflang="en" href="' + root + 'en.html"'));
    assert.ok(html.includes('<option value="' + language + '" selected>'));
    assert.doesNotMatch(html, /<iframe\b|youtube\.com\/iframe_api/u);
    assert.doesNotMatch(html, /name="robots" content="[^"]*noindex/u);
  });
}

test('translations are escaped as text when generating HTML', () => {
  const changed = { ...strings.en };
  try {
    strings.en.heading = 'Title <img src=x> & "quoted"';
    strings.en.metaDescription = 'Quote " & <test>';
    const html = renderHtml(template, 'en');
    assert.ok(html.includes('Title &lt;img src=x&gt; &amp; &quot;quoted&quot;'));
    assert.ok(html.includes('content="Quote &quot; &amp; &lt;test&gt;"'));
  } finally {
    Object.assign(strings.en, changed);
  }
});

test('the sitemap lists only the clean public canonical pages', async () => {
  const sitemap = await readFile(new URL('../docs/sitemap.xml', import.meta.url), 'utf8');
  assert.ok(sitemap.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'));
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/gu)].map(match => match[1]);
  assert.deepEqual(urls, [root, root + 'en.html', root + 'privacy.html']);
  for (const url of urls) assert.doesNotMatch(url, /[?#]/u);
  assert.doesNotMatch(sitemap, /<priority>|<changefreq>/u);
});
