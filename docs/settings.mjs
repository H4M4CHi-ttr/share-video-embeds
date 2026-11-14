export const TRACKING_KEY = 'youtube-live-link-pages.strip-tracking';

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
