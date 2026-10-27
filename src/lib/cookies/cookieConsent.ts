export interface CookiePreferences {
  version: string;
  necessary: boolean; // Always true
  analytics: boolean;
  preferences: boolean;
  updatedAt: string;
}

const STORAGE_KEY = 'vibesift_cookie_consent_v1';
export const COOKIE_CHANGE_EVENT = 'vibesift:cookie-consent-changed';
export const OPEN_COOKIE_MODAL_EVENT = 'vibesift:open-cookie-settings';

export const getCookieConsent = (): CookiePreferences | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CookiePreferences;
  } catch {
    return null;
  }
};

export const saveCookieConsent = (
  prefs: { analytics: boolean; preferences: boolean }
): CookiePreferences => {
  const record: CookiePreferences = {
    version: '1.0',
    necessary: true,
    analytics: Boolean(prefs.analytics),
    preferences: Boolean(prefs.preferences),
    updatedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    window.dispatchEvent(new CustomEvent(COOKIE_CHANGE_EVENT, { detail: record }));
  } catch (err) {
    console.warn('Failed to save cookie preferences to localStorage', err);
  }

  return record;
};

export const acceptAllCookies = (): CookiePreferences => {
  return saveCookieConsent({ analytics: true, preferences: true });
};

export const rejectNonEssentialCookies = (): CookiePreferences => {
  return saveCookieConsent({ analytics: false, preferences: false });
};

export const hasConsented = (): boolean => {
  return getCookieConsent() !== null;
};

export const triggerCookieSettingsModal = (): void => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(OPEN_COOKIE_MODAL_EVENT));
  }
};
