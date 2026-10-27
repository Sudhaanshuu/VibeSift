import React, { useState, useEffect } from 'react';
import { ShieldCheck, Cookie, Settings2, Check, X, Lock, Sliders } from 'lucide-react';
import {
  getCookieConsent,
  saveCookieConsent,
  acceptAllCookies,
  rejectNonEssentialCookies,
  CookiePreferences,
  COOKIE_CHANGE_EVENT,
  OPEN_COOKIE_MODAL_EVENT
} from '../../lib/cookies/cookieConsent';

interface CookieConsentBannerProps {
  onOpenPrivacyPolicy?: () => void;
}

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({ onOpenPrivacyPolicy }) => {
  const [showBanner, setShowBanner] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [analytics, setAnalytics] = useState<boolean>(false);
  const [preferences, setPreferences] = useState<boolean>(false);

  useEffect(() => {
    const existing = getCookieConsent();
    if (!existing) {
      // Delay showing banner slightly for smooth initial page paint
      const timer = setTimeout(() => setShowBanner(true), 800);
      return () => clearTimeout(timer);
    } else {
      setAnalytics(existing.analytics);
      setPreferences(existing.preferences);
    }
  }, []);

  // Listen to external triggers to reopen preferences modal
  useEffect(() => {
    const handleOpenModal = () => {
      const current = getCookieConsent();
      if (current) {
        setAnalytics(current.analytics);
        setPreferences(current.preferences);
      }
      setShowModal(true);
    };

    const handleConsentChange = (e: Event) => {
      const custom = e as CustomEvent<CookiePreferences>;
      if (custom.detail) {
        setAnalytics(custom.detail.analytics);
        setPreferences(custom.detail.preferences);
      }
    };

    window.addEventListener(OPEN_COOKIE_MODAL_EVENT, handleOpenModal);
    window.addEventListener(COOKIE_CHANGE_EVENT, handleConsentChange);

    return () => {
      window.removeEventListener(OPEN_COOKIE_MODAL_EVENT, handleOpenModal);
      window.removeEventListener(COOKIE_CHANGE_EVENT, handleConsentChange);
    };
  }, []);

  const handleAcceptAll = () => {
    acceptAllCookies();
    setShowBanner(false);
    setShowModal(false);
  };

  const handleRejectNonEssential = () => {
    rejectNonEssentialCookies();
    setShowBanner(false);
    setShowModal(false);
  };

  const handleSavePreferences = () => {
    saveCookieConsent({ analytics, preferences });
    setShowBanner(false);
    setShowModal(false);
  };

  return (
    <>
      {/* 1. Floating Banner */}
      {showBanner && !showModal && (
        <aside
          role="region"
          aria-label="Cookie consent banner"
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-fade-in"
        >
          <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-brand-border shadow-elevated p-5 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-mint text-brand-emerald-dark flex items-center justify-center shrink-0">
                <Cookie className="w-5 h-5 text-brand-emerald-deep" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-brand-text flex items-center gap-1.5">
                  <span>Privacy & Cookie Preferences</span>
                </h3>
                <p className="text-xs text-brand-text-secondary leading-relaxed">
                  We use strictly necessary cookies to operate secure scanning sessions. With your permission, we also use privacy-first telemetry and saved UI preferences to improve the auditor.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-brand-border/60">
              <button
                type="button"
                onClick={handleAcceptAll}
                className="flex-1 min-w-[100px] text-xs font-bold px-3 py-2 rounded-lg bg-brand-emerald hover:bg-brand-emerald-dark text-white shadow-subtle transition-colors text-center"
              >
                Accept All
              </button>

              <button
                type="button"
                onClick={handleRejectNonEssential}
                className="text-xs font-semibold px-3 py-2 rounded-lg border border-brand-border hover:bg-brand-muted text-brand-text transition-colors"
              >
                Essential Only
              </button>

              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="text-xs font-medium px-2.5 py-2 text-brand-text-secondary hover:text-brand-text flex items-center gap-1 transition-colors"
                aria-label="Customize cookie settings"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Customize</span>
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* 2. Granular Preferences Modal */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-settings-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
        >
          <div className="bg-white w-full max-w-xl max-h-[90vh] rounded-2xl border border-brand-border shadow-elevated overflow-hidden flex flex-col">
            
            {/* Header */}
            <div className="p-5 border-b border-brand-border flex items-center justify-between bg-brand-card-green/40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand-mint text-brand-emerald-dark flex items-center justify-center">
                  <Settings2 className="w-4 h-4 text-brand-emerald-deep" />
                </div>
                <div>
                  <h3 id="cookie-settings-title" className="text-sm font-bold text-brand-text">
                    Cookie & Data Storage Settings
                  </h3>
                  <p className="text-[11px] text-brand-text-secondary">
                    Manage how VibeSift stores state and telemetry on your device.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Close cookie settings"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              
              {/* Category 1: Strictly Necessary */}
              <div className="p-4 rounded-xl border border-brand-border bg-brand-muted/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-brand-emerald-dark" />
                    <span className="font-bold text-brand-text text-xs sm:text-sm">
                      Strictly Necessary (Required)
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-brand-mint text-brand-emerald-deep">
                    ALWAYS ACTIVE
                  </span>
                </div>
                <p className="text-brand-text-secondary leading-relaxed text-[11px]">
                  Essential for basic site functionality, maintaining secure login sessions, CSRF token validation, and preventing unauthorized API requests. Cannot be disabled.
                </p>
              </div>

              {/* Category 2: Performance & Telemetry */}
              <div className="p-4 rounded-xl border border-brand-border bg-white space-y-2 hover:border-brand-emerald/40 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-brand-emerald" />
                    <label htmlFor="analytics-toggle" className="font-bold text-brand-text text-xs sm:text-sm cursor-pointer">
                      Performance & Scan Telemetry
                    </label>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      id="analytics-toggle"
                      type="checkbox"
                      checked={analytics}
                      onChange={(e) => setAnalytics(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:width-4 after:transition-all peer-checked:bg-brand-emerald"></div>
                  </label>
                </div>
                <p className="text-brand-text-secondary leading-relaxed text-[11px]">
                  Allows us to measure scan worker dispatch latencies, aggregate Core Web Vitals statistics, and detect browser rendering errors. No individual personal data is shared.
                </p>
              </div>

              {/* Category 3: UI Preferences & Functional */}
              <div className="p-4 rounded-xl border border-brand-border bg-white space-y-2 hover:border-brand-emerald/40 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-brand-emerald" />
                    <label htmlFor="preferences-toggle" className="font-bold text-brand-text text-xs sm:text-sm cursor-pointer">
                      UI Preferences & Functional Memory
                    </label>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      id="preferences-toggle"
                      type="checkbox"
                      checked={preferences}
                      onChange={(e) => setPreferences(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:width-4 after:transition-all peer-checked:bg-brand-emerald"></div>
                  </label>
                </div>
                <p className="text-brand-text-secondary leading-relaxed text-[11px]">
                  Remembers your dashboard table density, severity filter toggles, export formats, and dismissed guidance banners across sessions.
                </p>
              </div>

              {/* Policy note */}
              <p className="text-[11px] text-brand-text-secondary pt-1">
                For detailed disclosures regarding automated secret redaction, AWS storage encryption, and your erasure rights, consult our{' '}
                {onOpenPrivacyPolicy ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      onOpenPrivacyPolicy();
                    }}
                    className="text-brand-emerald-deep font-bold underline hover:text-brand-emerald"
                  >
                    Privacy & Data Collection Policy
                  </button>
                ) : (
                  <span className="font-bold">Privacy Policy</span>
                )}
                .
              </p>

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-brand-border bg-brand-muted/40 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleRejectNonEssential}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-brand-border bg-white hover:bg-gray-50 text-brand-text transition-colors"
              >
                Reject Non-Essential
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSavePreferences}
                  className="text-xs font-bold px-4 py-2 rounded-lg border border-brand-border bg-white hover:bg-brand-muted text-brand-text transition-colors"
                >
                  Save Choices
                </button>
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="text-xs font-bold px-4 py-2 rounded-lg bg-brand-emerald hover:bg-brand-emerald-dark text-white shadow-subtle transition-colors"
                >
                  Accept All
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
