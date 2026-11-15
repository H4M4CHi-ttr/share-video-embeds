import { convertYouTubeUrl } from './youtube.mjs';

const WRAPPERS = new Map([
  ['<', '>'], ['(', ')'], ['[', ']'], ['"', '"'], ["'", "'"],
  ['（', '）'], ['「', '」'], ['『', '』'], ['【', '】'],
]);

function sharedFields(raw, allowed) {
  const entries = [];
  const rest = [];
  for (const field of raw.slice(1).split('&')) {
    const [entry] = new URLSearchParams('?' + field);
    if (entry && allowed.includes(entry[0])) entries.push(entry);
    else rest.push(field);
  }
  return { entries, rest: rest.join('&') };
}

export function readSharedInput(href) {
  const url = new URL(href);
  const fragment = sharedFields(url.hash, ['text', 'url']);
  const query = sharedFields(url.search, ['text', 'url', 'title']);
  const entries = fragment.entries.length ? fragment.entries : query.entries;
  if (!entries.length) return null;

  // Preserve the original spelling and order of unrelated URL fields.
  if (fragment.entries.length) url.hash = fragment.rest ? '#' + fragment.rest : '';
  if (query.entries.length) url.search = query.rest ? '?' + query.rest : '';
  const cleanUrl = url.href;

  const candidates = new Map();
  let suppliedTitle = '';
  let textTitle = '';
  for (const [field, value] of entries) {
    let firstUrlIndex;
    for (const match of value.matchAll(/\S+/gu)) {
      let token = match[0];
      while (token.length > 2 && WRAPPERS.get(token[0]) === token.at(-1)) {
        token = token.slice(1, -1);
      }
      // Keep the entire URL token so a link inside an unsafe URL cannot be promoted.
      let converted;
      try { converted = convertYouTubeUrl(token); }
      catch { continue; }
      firstUrlIndex ??= match.index;
      if (!candidates.has(converted.url)) candidates.set(converted.url, token);
      if (candidates.size > 1) return { cleanUrl, error: 'shareMultiple' };
    }
    const beforeUrl = firstUrlIndex === undefined ? value.trim() : value.slice(0, firstUrlIndex).trim();
    const title = beforeUrl.split(/\r?\n/u).at(-1).trim();
    if (field === 'title') suppliedTitle ||= title;
    if (field === 'text' && firstUrlIndex !== undefined) textTitle ||= title;
  }

  if (candidates.size) {
    const title = suppliedTitle || textTitle;
    return { cleanUrl, input: candidates.values().next().value, ...(title ? { title } : {}) };
  }
  return { cleanUrl, error: entries.some(([, value]) => value.trim()) ? 'shareInvalid' : 'shareEmpty' };
}
