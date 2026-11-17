import assert from 'node:assert/strict';
import { strings } from '../docs/i18n.mjs';
import { iosShortcutLink } from '../docs/settings.mjs';

const root = 'https://h4m4chi-ttr.github.io/share-video-embeds/';
const escapeHtml = value => String(value).replace(/[&<>"']/gu, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);

export function renderHtml(template, language) {
  const t = strings[language];
  assert.ok(t, 'Unsupported page language');
  const title = 'Share Video Embeds | ' + t.subtitle;
  const url = root + (language === 'en' ? 'en.html' : '');
  const locale = language === 'en' ? 'en_US' : 'ja_JP';
  const metadata = {
    description: t.metaDescription,
    'og:title': title,
    'og:description': t.metaDescription,
    'og:locale': locale,
    'og:locale:alternate': language === 'en' ? 'ja_JP' : 'en_US',
    'og:url': url,
    'og:image:alt': t.socialImageAlt,
    'twitter:title': title,
    'twitter:description': t.metaDescription,
    'twitter:image:alt': t.socialImageAlt,
  };
  let html = template
    .replace('<html lang="ja">', '<html lang="' + language + '">')
    .replace(/<title>[^<]*<\/title>/u, '<title>' + escapeHtml(title) + '</title>')
    .replace(/(<link rel="canonical" href=")[^"]*(">)/u, '$1' + url + '$2')
    .replace(/(<([a-z][\w-]*)\b[^>]*\bdata-i18n="([^"]+)"[^>]*>)[^<]*(<\/\2>)/gu,
      (_match, opening, _tag, key, closing) => {
        assert.equal(typeof t[key], 'string', 'Missing translation: ' + key);
        return opening + escapeHtml(t[key]) + closing;
      })
    .replace('<option value="' + language + '">', '<option value="' + language + '" selected>')
    .replace(/(<a id="(?:ios-shortcut|install-shortcut)"\b)/gu, '$1 href="' + iosShortcutLink(language) + '"')
    .replace(/href="\.\/privacy\.html"/gu, 'href="./privacy.html#' + language + '"');

  for (const [name, value] of Object.entries(metadata)) {
    const pattern = new RegExp('(<meta (?:name|property)="' + name + '" content=")[^"]*(">)', 'u');
    assert.match(html, pattern, 'Missing metadata: ' + name);
    html = html.replace(pattern, (_match, before, after) => before + escapeHtml(value) + after);
  }
  return html;
}
