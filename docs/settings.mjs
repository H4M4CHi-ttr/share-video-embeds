export const TRACKING_KEY = 'youtube-live-link-pages.strip-tracking';
export const AUTO_PREVIEW_KEY = 'youtube-live-link-pages.auto-preview';
export const PRIVACY_KEY = 'youtube-live-link-pages.privacy-agreement';
export const PRIVACY_VERSION = '1';

export function readAutoPreviewPreference(storage) {
  try { return storage?.getItem(AUTO_PREVIEW_KEY) === 'true'; }
  catch { return false; }
}

export function saveAutoPreviewPreference(storage, enabled) {
  try {
    if (!storage) return false;
    if (enabled) storage.setItem(AUTO_PREVIEW_KEY, 'true');
    else storage.removeItem(AUTO_PREVIEW_KEY);
    return true;
  } catch { return false; }
}

export function hasPrivacyAgreement(storage) {
  try { return storage?.getItem(PRIVACY_KEY) === PRIVACY_VERSION; }
  catch { return false; }
}

export function savePrivacyAgreement(storage) {
  try { storage?.setItem(PRIVACY_KEY, PRIVACY_VERSION); }
  catch { /* Agreement still applies to the current page. */ }
}

// Set this to the published iCloud link to show the shortcut installation link.
const IOS_SHORTCUT_URL = '';

export function iosShortcutLink(value = IOS_SHORTCUT_URL) {
  try {
    const url = new URL(value);
    if (url.origin === 'https://www.icloud.com' && !url.username && !url.password
        && /^\/shortcuts\/[a-z0-9-]+\/?$/i.test(url.pathname)) return url.href;
  } catch { /* An unconfigured link leaves the manual steps visible. */ }
  return null;
}

export function readTrackingPreference(storage) {
  try { return storage?.getItem(TRACKING_KEY) === 'true'; }
  catch { return false; }
}

export function saveTrackingPreference(storage, enabled) {
  try {
    if (!storage) return false;
    storage.setItem(TRACKING_KEY, String(enabled));
    return true;
  } catch { return false; }
}
