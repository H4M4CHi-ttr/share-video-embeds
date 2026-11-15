import { convertYouTubeUrl } from './youtube.mjs';
import { buildEmbedUrl, initialPlayback, updatePlayback } from './player.mjs';
import { readTrackingPreference, saveTrackingPreference } from './settings.mjs';
import { strings } from './i18n.mjs';

const byId = id => document.getElementById(id);
const input = byId('video-url');
const strip = byId('strip-tracking');
const output = byId('converted-url');
const host = byId('player-host');
let storage;
try { storage = window.localStorage; } catch { storage = null; }
let language = navigator.language.startsWith('ja') ? 'ja' : 'en';
try { const saved = storage?.getItem('youtube-live-link-pages.language'); if (['ja','en'].includes(saved)) language = saved; } catch { /* Preference is optional. */ }
let converted = null;
let playback = initialPlayback();
let player = null;
let sequence = 0;
let watchdog;
let previewTimer;
let apiPromise;
let noticeKey = '';
let inputError = '';
strip.checked = readTrackingPreference(storage);

function translate() {
  const t = strings[language];
  document.documentElement.lang = language;
  document.title = 'YouTube to X Player — ' + t.subtitle;
  byId('language').value = language;
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t[el.dataset.i18n];
  const frame = host.querySelector('iframe');
  if (frame) frame.title = t.iframeTitle;
  renderConversion();
  renderPlayback();
  renderNotice();
  renderError();
}

function renderNotice() { byId('notice').textContent = noticeKey ? strings[language][noticeKey] : ''; }
function renderError() {
  byId('input-error').textContent = inputError ? strings[language][inputError] : '';
  byId('input-error').hidden = !inputError;
  input.setAttribute('aria-invalid', String(!!inputError));
  input.setAttribute('aria-describedby', inputError ? 'input-error' : 'input-hint');
}
function renderConversion() {
  const t = strings[language];
  byId('output-panel').hidden = !converted;
  byId('load-player').disabled = !converted;
  byId('clear').hidden = !input.value;
  if (!converted) return;
  output.value = converted.url;
  byId('open-youtube').href = converted.url;
  byId('removed-info').textContent = !strip.checked ? t.trackingKept : converted.removed.length ? t.removed + ': ' + converted.removed.join(', ') : t.noneRemoved;
}
function renderPlayback() {
  const t = strings[language];
  const visible = !!host.querySelector('iframe');
  byId('player-status').hidden = !visible;
  byId('load-player').textContent = visible ? t.reload : t.show;
  byId('unload-player').hidden = !visible;
  byId('play-muted').hidden = !visible;
  byId('play-muted').disabled = !player || ['loading', 'unconfirmed', 'restricted', 'error', 'different'].includes(playback.phase);
  byId('status-title').textContent = t['state_' + playback.phase];
  byId('status-body').textContent = t['error' + playback.error] || t['body_' + playback.phase];
  byId('player-error-code').textContent = playback.error === null ? '' : t.errorCode + ': ' + playback.error;
  byId('player-status').classList.toggle('confirmed', playback.phase === 'playing');
  byId('playback-proof').hidden = !playback.played;
}
function emit(event, token) {
  if (token !== sequence) return;
  playback = updatePlayback(playback, event);
  if (event.type === 'ready' || event.type === 'error' || event.type === 'state') clearTimeout(watchdog);
  renderPlayback();
}
function unload() {
  clearTimeout(previewTimer);
  sequence++;
  clearTimeout(watchdog);
  if (player) { try { player.destroy(); } catch { /* Removing the frame also stops playback. */ } }
  player = null;
  host.replaceChildren();
  host.hidden = true;
  byId('empty-preview').hidden = false;
  byId('embed-details').hidden = true;
  playback = initialPlayback();
  renderPlayback();
}
function resetInput() {
  unload();
  converted = null;
  inputError = '';
  noticeKey = '';
  renderConversion(); renderError(); renderNotice();
}
function convert(showErrors = true) {
  unload();
  converted = null;
  inputError = ''; noticeKey = '';
  if (input.value.trim()) {
    try { converted = convertYouTubeUrl(input.value, strip.checked); }
    catch (error) { if (showErrors) inputError = error.message === 'ambiguous-url' ? 'ambiguous' : 'invalid'; }
  }
  renderConversion(); renderError(); renderNotice();
  // Avoid repeated YouTube connections while a URL is still being edited.
  if (converted) previewTimer = setTimeout(loadPlayer, 350);
}

function loadApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const timer = setTimeout(fail, 15000);
    function fail() {
      clearTimeout(timer);
      script.remove();
      apiPromise = null;
      reject(new Error('iframe-api-unavailable'));
    }
    window.onYouTubeIframeAPIReady = () => {
      clearTimeout(timer);
      if (window.YT?.Player) resolve(window.YT); else fail();
    };
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = fail;
    document.head.append(script);
  });
  return apiPromise;
}

async function loadPlayer() {
  if (!converted) return;
  unload();
  const token = sequence;
  const expectedId = converted.id;
  const frame = document.createElement('iframe');
  try { frame.src = buildEmbedUrl(converted.url, location.origin); }
  catch { inputError = 'invalid'; renderError(); return; }
  frame.id = 'youtube-player';
  frame.title = strings[language].iframeTitle;
  frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
  frame.allowFullscreen = true;
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  frame.width = '640'; frame.height = '360';
  host.append(frame);
  host.hidden = false;
  byId('empty-preview').hidden = true;
  byId('embed-url').textContent = frame.src;
  byId('embed-details').hidden = false;
  emit({ type: 'load' }, token);
  watchdog = setTimeout(() => emit({ type: 'unconfirmed' }, token), 20000);
  try {
    const YT = await loadApi();
    if (token !== sequence) return;
    player = new YT.Player(frame, { events: {
      onReady: () => emit({ type: 'ready' }, token),
      onStateChange: event => {
        if (token !== sequence) return;
        if (event.data === 1) {
          try {
            if (convertYouTubeUrl(event.target.getVideoUrl(), false).id !== expectedId) {
              emit({ type: 'different-video' }, token); return;
            }
          } catch { emit({ type: 'unconfirmed' }, token); return; }
        }
        emit({ type: 'state', value: event.data }, token);
      },
      onError: event => emit({ type: 'error', value: event.data }, token),
      onAutoplayBlocked: () => emit({ type: 'blocked' }, token),
    } });
  } catch { emit({ type: 'unconfirmed' }, token); }
}

byId('converter-form').addEventListener('submit', event => { event.preventDefault(); convert(); });
input.addEventListener('input', () => convert(false));
input.addEventListener('blur', () => { if (input.value.trim() && !converted) convert(); });
byId('clear').addEventListener('click', () => { input.value = ''; resetInput(); input.focus(); });
byId('example').addEventListener('click', () => { input.value = strings[language].exampleUrl; convert(); });
strip.addEventListener('change', () => {
  const saved = saveTrackingPreference(storage, strip.checked);
  if (converted) convert();
  if (!saved) { noticeKey = 'storageFailed'; renderNotice(); }
});
byId('language').addEventListener('change', event => {
  language = event.target.value;
  try { storage?.setItem('youtube-live-link-pages.language', language); } catch { /* Language still changes in this tab. */ }
  translate();
});
byId('copy').addEventListener('click', async () => {
  if (!converted) return;
  const value = converted.url;
  try {
    await navigator.clipboard.writeText(value);
    if (converted?.url !== value) return;
    noticeKey = 'copied';
  } catch {
    if (converted?.url !== value) return;
    output.focus(); output.select(); noticeKey = 'copyFailed';
  }
  renderNotice();
});
output.addEventListener('focus', () => output.select());
byId('load-player').addEventListener('click', loadPlayer);
byId('unload-player').addEventListener('click', unload);
byId('play-muted').addEventListener('click', () => {
  try { player?.mute(); player?.playVideo(); }
  catch { emit({ type: 'unconfirmed' }, sequence); }
});
window.addEventListener('pagehide', unload);
translate();
