import { convertYouTubeUrl, parseYouTubeSeconds, readYouTubeStartTime } from './youtube.mjs';

export function buildEmbedUrl(input, origin) {
  const converted = convertYouTubeUrl(input, false);
  const host = new URL(origin);
  if (!['https:', 'http:'].includes(host.protocol) || host.origin !== origin) throw new Error('invalid-origin');
  const source = new URL(converted.url);
  const start = readYouTubeStartTime(source);
  const end = parseYouTubeSeconds(source.searchParams.get('end'));
  const embed = new URL('https://www.youtube-nocookie.com/embed/' + converted.id);
  embed.searchParams.set('enablejsapi', '1');
  embed.searchParams.set('origin', origin);
  embed.searchParams.set('autoplay', '0');
  embed.searchParams.set('playsinline', '1');
  embed.searchParams.set('controls', '1');
  if (start !== null && start > 0) embed.searchParams.set('start', String(start));
  if (end !== null && end > (start ?? 0)) embed.searchParams.set('end', String(end));
  return embed.href;
}

export function initialPlayback() {
  return { phase: 'idle', played: false, error: null };
}

export function updatePlayback(previous, event) {
  if (event.type === 'different-video') return { ...initialPlayback(), phase: 'different' };
  if (event.type === 'load') return { ...initialPlayback(), phase: 'loading' };
  if (event.type === 'ready') return previous.error || previous.played ? previous : { ...previous, phase: 'ready' };
  if (event.type === 'unconfirmed') return previous.error || previous.played ? previous : { ...previous, phase: 'unconfirmed' };
  if (event.type === 'error') return { ...previous, error: event.value, phase: [101, 150].includes(event.value) ? 'restricted' : 'error' };
  if (event.type === 'state') {
    if (event.value === 1) return { phase: 'playing', played: true, error: null };
    if (previous.error) return previous;
    const phases = { '-1': 'ready', 0: 'ended', 2: 'paused', 3: 'buffering', 5: 'ready' };
    if (phases[event.value]) return { ...previous, phase: phases[event.value] };
  }
  return previous;
}
