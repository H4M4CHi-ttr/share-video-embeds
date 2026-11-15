export const TRACKING_KEY = 'youtube-live-link-pages.strip-tracking';
export const TITLE_KEY = 'youtube-live-link-pages.include-title';
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

export function iosShortcutLink(language) {
  return language === 'ja'
    ? 'https://www.icloud.com/shortcuts/5ee0dc22e8ae4aa6a911aed3deed51c5'
    : 'https://www.icloud.com/shortcuts/84e6c58d40d8494a9e4ce1584605b89a';
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

export function readTitlePreference(storage) {
  try { return storage?.getItem(TITLE_KEY) !== 'false'; }
  catch { return true; }
}

export function saveTitlePreference(storage, enabled) {
  try {
    if (!storage) return false;
    storage.setItem(TITLE_KEY, String(enabled));
    return true;
  } catch { return false; }
}
