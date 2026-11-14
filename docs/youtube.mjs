const HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be', 'www.youtu.be', 'youtube-nocookie.com', 'www.youtube-nocookie.com']);
const TRACKING = new Set(['si', 'pp', 'ra', 'feature', 'fbclid', 'gclid', 'dclid', 'igshid', 'mc_cid', 'mc_eid', 'app', 'ab_channel', 'embeds_referring_euri', 'source_ve_path']);
const ID = /^[A-Za-z0-9_-]{11}$/;

/** @param {string} input @param {boolean} stripTracking */
export function convertYouTubeUrl(input, stripTracking = false) {
  if (typeof input !== 'string' || !input.trim() || input.length > 4096 || /[\s\\]/.test(input.trim())) throw new Error('invalid-url');
  let url;
  try { url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(input.trim()) ? input.trim() : 'https://' + input.trim()); }
  catch { throw new Error('invalid-url'); }
  if (!['https:', 'http:'].includes(url.protocol) || !HOSTS.has(url.hostname) || url.username || url.password || url.port) throw new Error('invalid-url');
  const selectors = url.searchParams.getAll('v');
  if (selectors.length > 1) throw new Error('ambiguous-url');
  let id = '';
  if (['youtu.be', 'www.youtu.be'].includes(url.hostname)) {
    id = url.pathname.match(/^\/([A-Za-z0-9_-]{11})\/?$/)?.[1] ?? '';
  } else if (url.hostname.endsWith('youtube-nocookie.com')) {
    id = url.pathname.match(/^\/embed\/([A-Za-z0-9_-]{11})\/?$/)?.[1] ?? '';
  } else if (url.pathname === '/watch' || url.pathname === '/watch/') {
    id = selectors[0] ?? '';
  } else {
    id = url.pathname.match(/^\/(?:live|shorts|embed)\/([A-Za-z0-9_-]{11})\/?$/)?.[1] ?? '';
  }
  if (!ID.test(id) || (selectors.length && selectors[0] !== id)) throw new Error('invalid-video');
  const output = new URL('https://www.youtube.com/live/' + id);
  const removed = [];
  for (const [key, value] of url.searchParams) {
    if (key === 'v') continue;
    if (stripTracking && (TRACKING.has(key.toLowerCase()) || key.toLowerCase().startsWith('utm_'))) {
      if (!removed.includes(key)) removed.push(key);
    } else output.searchParams.append(key, value);
  }
  output.hash = url.hash;
  return { id, url: output.href, removed, preserved: [...new Set(output.searchParams.keys())] };
}
