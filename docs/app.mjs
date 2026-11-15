import { convertYouTubeUrl, MAX_YOUTUBE_SECONDS, parseYouTubeSeconds, readYouTubeStartTime, withYouTubeStartTime } from './youtube.mjs';
import { buildEmbedUrl, initialPlayback, updatePlayback } from './player.mjs';
import {
  iosShortcutLink, readTrackingPreference, saveTrackingPreference, readTitlePreference, saveTitlePreference,
  readAutoPreviewPreference, saveAutoPreviewPreference, hasPrivacyAgreement, savePrivacyAgreement,
} from './settings.mjs';
import { strings } from './i18n.mjs';
import { readSharedInput } from './shared-input.mjs';
import { createBookmarklet } from './bookmarklet.mjs';

const byId = id => document.getElementById(id);
const input = byId('video-url');
const strip = byId('strip-tracking');
const output = byId('converted-url');
const startHours = byId('start-hours');
const startMinutes = byId('start-minutes');
const startSeconds = byId('start-seconds');
const startTimeError = byId('start-time-error');
const host = byId('player-host');
const previewPanel = byId('preview-panel');
const autoPreview = byId('auto-preview');
const postTitle = byId('post-title');
const includeTitle = byId('include-title');
const bookmarklet = byId('bookmarklet');
const previewTest = document.documentElement.dataset.previewTest === 'true'
  && ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
let storage;
try { storage = window.localStorage; } catch { storage = null; }
let language = navigator.language.startsWith('ja') ? 'ja' : 'en';
try { const saved = storage?.getItem('youtube-live-link-pages.language'); if (['ja','en'].includes(saved)) language = saved; } catch { /* Preference is optional. */ }
let converted = null;
// The original link supplies the start time until the user sets or clears it.
let startOverride;
let playback = initialPlayback();
let player = null;
let sequence = 0;
let watchdog;
let previewTimer;
let previewAbort;
let noticeKey = '';
let inputError = '';
const onIos = /iPad|iPhone|iPod/i.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const onAndroid = /Android/i.test(navigator.userAgent)
  || navigator.userAgentData?.platform === 'Android';
let installed = window.matchMedia?.('(display-mode: standalone)').matches ?? false;
let openedFromShare = false;
let installDismissed = false;
let policyAccepted = !previewTest || hasPrivacyAgreement(storage);
strip.checked = readTrackingPreference(storage);
includeTitle.checked = readTitlePreference(storage);
autoPreview.checked = previewTest && readAutoPreviewPreference(storage);

function translate() {
  const t = strings[language];
  document.documentElement.lang = language;
  document.title = 'Share Video Embeds | ' + t.subtitle;
  bookmarklet.href = createBookmarklet(new URL('./', location.href).href, t.bookmarkletWrongPage);
  for (const id of ['privacy-link', 'consent-privacy-link']) {
    byId(id).href = './privacy.html#' + language;
  }
  byId('language').value = language;
  for (const id of ['ios-shortcut', 'install-shortcut']) byId(id).href = iosShortcutLink(language);
  byId('dismiss-install').setAttribute('aria-label', t.dismissInstall);
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
  byId('clear').hidden = !input.value;
  renderXShare();
  if (!converted) return;
  output.value = converted.url;
  byId('open-youtube').href = converted.url;
  const start = readYouTubeStartTime(converted.url);
  byId('start-time-value').textContent = start === null ? t.startUnset : formatStartTime(start);
  byId('start-back').disabled = start === null || start === 0;
  byId('start-forward').disabled = start === MAX_YOUTUBE_SECONDS;
  byId('removed-info').textContent = !strip.checked ? t.trackingKept : converted.removed.length ? t.removed + ': ' + converted.removed.join(', ') : t.noneRemoved;
}
function renderXShare() {
  byId('post-title-field').hidden = !includeTitle.checked;
  const share = byId('share-x');
  if (!converted) {
    share.removeAttribute('href');
    return;
  }
  const intent = new URL('https://x.com/intent/tweet');
  if (includeTitle.checked && postTitle.value.trim()) intent.searchParams.set('text', postTitle.value.trim());
  intent.searchParams.set('url', converted.url);
  share.href = intent.href;
}

function renderAccess() {
  byId('privacy-consent').hidden = policyAccepted;
  byId('converter-workspace').hidden = !policyAccepted;
  byId('preview-options').hidden = !previewTest;
  byId('preview-guide').hidden = !previewTest;
  renderMobileInstall();
}

function renderMobileInstall() {
  const visible = policyAccepted && !openedFromShare && !installDismissed;
  const shortcut = byId('install-shortcut');
  const app = byId('install-share-app');
  shortcut.hidden = !visible || !onIos;
  app.hidden = !visible || !onAndroid || installed;
  byId('mobile-install').hidden = shortcut.hidden && app.hidden;
}

function dismissInstallBar() {
  installDismissed = true;
  renderMobileInstall();
}

function renderPlayback() {
  const t = strings[language];
  const visible = previewTest && !!host.querySelector('iframe');
  previewPanel.hidden = !visible;
  byId('load-player').hidden = !previewTest || visible;
  byId('load-player').disabled = !converted || !policyAccepted;
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
  previewAbort?.abort();
  previewAbort = null;
  if (player) { try { player.destroy(); } catch { /* Removing the frame also stops playback. */ } }
  player = null;
  host.replaceChildren();
  host.hidden = true;
  byId('embed-details').hidden = true;
  playback = initialPlayback();
  renderPlayback();
}
function formatStartTime(start) {
  const hours = Math.floor(start / 3600);
  const minutes = String(Math.floor(start / 60) % 60);
  const seconds = String(start % 60).padStart(2, '0');
  return hours ? hours + ':' + minutes.padStart(2, '0') + ':' + seconds : minutes + ':' + seconds;
}

function syncStartFields() {
  const start = converted ? readYouTubeStartTime(converted.url) : null;
  startHours.value = start === null ? '' : String(Math.floor(start / 3600));
  startMinutes.value = start === null ? '' : String(Math.floor(start / 60) % 60);
  startSeconds.value = start === null ? '' : String(start % 60).padStart(2, '0');
  startTimeError.hidden = true;
}

function setStartTime(seconds) {
  if (!converted) return;
  startOverride = seconds;
  startTimeError.hidden = true;
  const url = withYouTubeStartTime(converted.url, seconds);
  if (url === converted.url) return;
  converted = { ...converted, url };
  noticeKey = '';
  refreshConversion();
}

function editStartTime() {
  const values = [startHours, startMinutes, startSeconds].map(field => field.value.trim().normalize('NFKC'));
  const [hours, minutes, seconds] = values.map(Number);
  const total = hours * 3600 + minutes * 60 + seconds;
  const valid = values.every(value => /^\d*$/u.test(value))
    && Number.isSafeInteger(total) && total <= MAX_YOUTUBE_SECONDS;
  startTimeError.hidden = valid;
  if (valid) setStartTime(values.some(Boolean) ? total : null);
}

function stepStartTime(delta) {
  if (!converted) return;
  const start = readYouTubeStartTime(converted.url) ?? 0;
  setStartTime(Math.min(MAX_YOUTUBE_SECONDS, Math.max(0, start + delta)));
  syncStartFields();
}

function resetInput(error = '') {
  converted = null;
  startOverride = undefined;
  inputError = error;
  noticeKey = '';
  syncStartFields();
  refreshConversion();
}
function convert(showErrors = true) {
  if (!policyAccepted) return;
  converted = null;
  inputError = ''; noticeKey = '';
  if (input.value.trim()) {
    try { converted = convertYouTubeUrl(input.value, strip.checked); }
    catch (error) { if (showErrors) inputError = error.message === 'ambiguous-url' ? 'ambiguous' : 'invalid'; }
  }
  if (converted && startOverride !== undefined) {
    converted.url = withYouTubeStartTime(converted.url, startOverride);
  } else if (converted) {
    const source = new URL(converted.url);
    const queryStart = parseYouTubeSeconds(source.searchParams.get('t'))
      ?? parseYouTubeSeconds(source.searchParams.get('start'));
    if (queryStart === null) {
      // Move fragment and legacy times into the query that X's crawler receives.
      const start = readYouTubeStartTime(source);
      if (start !== null) converted.url = withYouTubeStartTime(source, start);
    }
  }
  syncStartFields();
  refreshConversion();
}

function refreshConversion() {
  unload();
  renderConversion(); renderError(); renderNotice();
  // Avoid repeated YouTube connections while a URL is still being edited.
  if (previewTest && autoPreview.checked && converted) {
    const source = converted;
    previewTimer = setTimeout(() => {
      if (autoPreview.checked && converted === source) loadPlayer();
    }, 350);
  }
}

function importSharedInput() {
  if (!policyAccepted) return;
  const shared = readSharedInput(location.href);
  if (!shared) return;
  openedFromShare = true;
  renderMobileInstall();
  window.history.replaceState(window.history.state, '', shared.cleanUrl);
  postTitle.value = shared.title ?? '';
  input.value = shared.input ?? '';
  startOverride = undefined;
  if (shared.error) {
    resetInput(shared.error);
    return;
  }
  convert();
  if (converted && shared.hasText) {
    const heading = byId('output-label');
    heading.focus({ preventScroll: true });
    heading.scrollIntoView({ block: 'start', behavior: 'instant' });
  }
}

function loadApi(signal) {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    let settled = false;
    const fail = () => finish(new Error('iframe-api-unavailable'));
    const abort = () => finish(signal.reason);
    const ready = () => window.YT?.Player ? finish() : fail();
    const timer = setTimeout(fail, 15000);

    function finish(error) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      script.onerror = null;
      script.remove();
      if (window.onYouTubeIframeAPIReady === ready) delete window.onYouTubeIframeAPIReady;
      if (error) reject(error);
      else resolve(window.YT);
    }

    window.onYouTubeIframeAPIReady = ready;
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = fail;
    signal.addEventListener('abort', abort, { once: true });
    document.head.append(script);
  });
}

async function loadPlayer() {
  if (!previewTest || !policyAccepted || !converted || host.querySelector('iframe')) return;
  clearTimeout(previewTimer);
  const token = ++sequence;
  const expectedId = converted.id;
  const frame = document.createElement('iframe');
  try { frame.src = buildEmbedUrl(converted.url, location.origin); }
  catch { inputError = 'invalid'; renderError(); return; }
  previewPanel.hidden = false;
  host.hidden = false;
  if (host.clientWidth < 200) {
    host.hidden = true;
    previewPanel.hidden = true;
    noticeKey = 'previewNeedsSpace';
    renderNotice();
    return;
  }
  noticeKey = '';
  renderNotice();
  frame.id = 'youtube-player';
  frame.title = strings[language].iframeTitle;
  frame.allow = "autoplay 'none'; encrypted-media; picture-in-picture; fullscreen";
  frame.allowFullscreen = true;
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  frame.width = '640'; frame.height = '360';
  host.append(frame);
  byId('embed-url').textContent = frame.src;
  byId('embed-details').hidden = false;
  emit({ type: 'load' }, token);
  watchdog = setTimeout(() => emit({ type: 'unconfirmed' }, token), 20000);
  const controller = new AbortController();
  previewAbort = controller;
  try {
    const YT = await loadApi(controller.signal);
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
    } });
  } catch { emit({ type: 'unconfirmed' }, token); }
}

byId('converter-form').addEventListener('submit', event => { event.preventDefault(); convert(); });
input.addEventListener('input', () => {
  startOverride = undefined;
  postTitle.value = '';
  convert(false);
});
input.addEventListener('blur', () => { if (input.value.trim() && !converted) convert(); });
byId('clear').addEventListener('click', () => {
  postTitle.value = '';
  input.value = '';
  resetInput();
  input.focus();
});
byId('example').addEventListener('click', () => {
  startOverride = undefined;
  postTitle.value = '';
  input.value = strings[language].exampleUrl;
  convert();
});
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
postTitle.addEventListener('input', renderXShare);
includeTitle.addEventListener('change', () => {
  const saved = saveTitlePreference(storage, includeTitle.checked);
  renderXShare();
  if (!saved) { noticeKey = 'storageFailed'; renderNotice(); }
});
bookmarklet.addEventListener('click', event => {
  event.preventDefault();
  byId('bookmarklet-notice').hidden = false;
});
const shareButton = byId('share');
shareButton.hidden = typeof navigator.share !== 'function';
shareButton.addEventListener('click', async () => {
  if (!converted) return;
  const value = converted.url;
  try {
    await navigator.share({ url: value });
  } catch (error) {
    if (error?.name === 'AbortError' || converted?.url !== value) return;
    noticeKey = 'shareFailed';
    renderNotice();
  }
});
for (const field of [startHours, startMinutes, startSeconds]) {
  field.addEventListener('input', editStartTime);
  field.addEventListener('change', () => {
    if (startTimeError.hidden) syncStartFields();
  });
}
byId('start-back').addEventListener('click', () => stepStartTime(-10));
byId('start-forward').addEventListener('click', () => stepStartTime(10));
byId('start-clear').addEventListener('click', () => {
  setStartTime(null);
  syncStartFields();
});
output.addEventListener('focus', () => output.select());
byId('load-player').addEventListener('click', loadPlayer);
byId('unload-player').addEventListener('click', unload);
autoPreview.addEventListener('change', () => {
  if (!previewTest || !policyAccepted) return;
  if (!autoPreview.checked) unload();
  if (!saveAutoPreviewPreference(storage, autoPreview.checked)) {
    noticeKey = 'storageFailed';
    renderNotice();
  }
});

byId('accept-privacy').addEventListener('click', () => {
  if (policyAccepted) return;
  policyAccepted = true;
  savePrivacyAgreement(storage);
  renderAccess();
  renderPlayback();
  importSharedInput();
});
const installButton = byId('pwa-install');
let installPrompt;
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
  installButton.hidden = false;
});
window.addEventListener('appinstalled', () => {
  installPrompt = null;
  installButton.hidden = true;
  installed = true;
  renderMobileInstall();
});

async function installShareApp() {
  const prompt = installPrompt;
  installPrompt = null;
  installButton.hidden = true;
  if (prompt) {
    try {
      await prompt.prompt();
      return;
    } catch { /* The Chrome menu is still available. */ }
  }
  dismissInstallBar();
  const guide = byId('mobile-setup');
  guide.open = true;
  guide.scrollIntoView({ block: 'start', behavior: 'instant' });
}

installButton.addEventListener('click', installShareApp);
byId('install-share-app').addEventListener('click', installShareApp);
byId('dismiss-install').addEventListener('click', dismissInstallBar);

window.addEventListener('pagehide', unload);
window.addEventListener('hashchange', importSharedInput);
translate();
renderAccess();
importSharedInput();

navigator.serviceWorker?.register('./sw.js', { scope: './', updateViaCache: 'none' })
  .catch(() => { /* Conversion also works without a service worker. */ });
