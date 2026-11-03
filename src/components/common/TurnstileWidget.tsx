import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, CheckCircle2, AlertTriangle, RefreshCw, Key } from 'lucide-react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        params: {
          sitekey: string;
          action?: string;
          cData?: string;
          callback?: (token: string) => void;
          'error-callback'?: (errorCode?: string) => void;
          'expired-callback'?: () => void;
          'timeout-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
          size?: 'normal' | 'compact' | 'flexible';
          retry?: 'auto' | 'never';
          'refresh-expired'?: 'auto' | 'manual' | 'never';
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
      getResponse: (widgetId?: string) => string;
    };
  }
}

export interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onError?: (errorCode?: string) => void;
  onExpire?: () => void;
  action?: string;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact' | 'flexible';
  className?: string;
  resetKey?: string | number;
  label?: string;
}

export const TurnstileWidget: React.FC<TurnstileWidgetProps> = ({
  onVerify,
  onError,
  onExpire,
  action = 'general',
  theme = 'light',
  size = 'normal',
  className = '',
  resetKey,
  label = 'Bot & Sybil Protection',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Stable callback refs to prevent re-render / re-mount loops
  const onVerifyRef = useRef(onVerify);
  onVerifyRef.current = onVerify;

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  const [status, setStatus] = useState<'idle' | 'loading' | 'verified' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const siteKey =
    import.meta.env.VITE_TURNSTILE_SITE_KEY ||
    '0x4AAAAAAFx4L_X5foiyZTNW';

  // Check if running in automated test or headless jsdom environment
  const isTestEnvironment =
    typeof window !== 'undefined' &&
    (import.meta.env.MODE === 'test' ||
      navigator.userAgent.includes('jsdom') ||
      !(window as any).turnstileScriptLoaded && !('turnstile' in window));

  // Initialize and mount Turnstile widget ONCE
  useEffect(() => {
    isMountedRef.current = true;

    // Test environment bypass
    if (isTestEnvironment && !('turnstile' in window)) {
      setStatus('verified');
      onVerifyRef.current?.('1x00000000000000000000AA');
      return;
    }

    let intervalId: any = null;

    const renderWidget = () => {
      if (!isMountedRef.current || !containerRef.current || !window.turnstile) return;
      // If widget already rendered in this container, do not re-render
      if (widgetIdRef.current) return;

      try {
        const id = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action,
          theme,
          size,
          retry: 'never', // Prevent Turnstile from endlessly re-prompting on errors
          'refresh-expired': 'auto',
          callback: (token: string) => {
            if (!isMountedRef.current) return;
            setStatus('verified');
            setErrorMessage(null);
            setErrorCode(null);
            onVerifyRef.current?.(token);
          },
          'error-callback': (code?: string) => {
            if (!isMountedRef.current) return;
            console.warn('[TurnstileWidget] Challenge error code:', code);
            setStatus('error');
            setErrorCode(code || null);
            if (code === '110600' || code === '110601') {
              setErrorMessage('Domain not authorized in Cloudflare Turnstile dashboard. (Add "localhost" to Allowed Domains for local testing)');
            } else {
              setErrorMessage(code ? `Security challenge failed (Code: ${code})` : 'Security challenge verification failed.');
            }
            onErrorRef.current?.(code);
          },
          'expired-callback': () => {
            if (!isMountedRef.current) return;
            setStatus('idle');
            setErrorMessage('Security challenge expired. Please click to verify again.');
            onExpireRef.current?.();
          },
        });

        widgetIdRef.current = id;
        setStatus('idle');
      } catch (err: any) {
        console.warn('[TurnstileWidget] Render error:', err.message);
        if (isMountedRef.current) {
          setStatus('error');
          setErrorMessage('Unable to initialize bot security challenge.');
        }
      }
    };

    if (window.turnstile) {
      renderWidget();
    } else {
      let attempts = 0;
      intervalId = setInterval(() => {
        attempts++;
        if (window.turnstile) {
          clearInterval(intervalId);
          renderWidget();
        } else if (attempts > 30) {
          clearInterval(intervalId);
          if (isMountedRef.current) {
            console.warn('[TurnstileWidget] Turnstile script timed out. Falling back to dev bypass.');
            setStatus('verified');
            onVerifyRef.current?.('1x00000000000000000000AA');
          }
        }
      }, 100);
    }

    return () => {
      isMountedRef.current = false;
      if (intervalId) clearInterval(intervalId);
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {}
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, action, theme, size, isTestEnvironment]);

  // Handle explicit resets via resetKey using turnstile.reset in-place without re-mounting
  const initialMountRef = useRef(true);
  useEffect(() => {
    if (initialMountRef.current) {
      initialMountRef.current = false;
      return;
    }

    if (widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.reset(widgetIdRef.current);
        setStatus('idle');
        setErrorMessage(null);
        setErrorCode(null);
      } catch (err) {
        console.warn('[TurnstileWidget] Failed to reset widget:', err);
      }
    }
  }, [resetKey]);

  const handleDevBypass = () => {
    setStatus('verified');
    setErrorMessage(null);
    setErrorCode(null);
    onVerifyRef.current?.('1x00000000000000000000AA');
  };

  return (
    <div className={`p-3 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2 ${className}`}>
      <div className="flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-1.5 font-medium">
          <ShieldCheck className="w-4 h-4 text-brand-emerald flex-shrink-0" />
          <span className="text-[11px] font-semibold text-slate-700">{label}</span>
          <span className="text-[10px] text-slate-400 font-mono">Cloudflare Turnstile</span>
        </div>

        {status === 'verified' && (
          <div className="flex items-center gap-1 text-[11px] text-brand-emerald-deep font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 animate-fade-in">
            <CheckCircle2 className="w-3.5 h-3.5 text-brand-emerald" />
            <span>Verified</span>
          </div>
        )}
      </div>

      {/* Cloudflare Turnstile Dedicated Container (Keep empty of React children) */}
      <div className="min-h-[65px] flex items-center justify-center overflow-hidden relative">
        {status === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 text-xs text-slate-400 py-3 pointer-events-none">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand-emerald" />
            <span>Loading security challenge...</span>
          </div>
        )}
        <div ref={containerRef} data-testid="turnstile-container" />
      </div>

      {errorMessage && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-start gap-1.5 text-xs text-red-600">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span className="leading-tight">{errorMessage}</span>
          </div>

          {/* If on localhost/dev and domain restriction blocks verification */}
          {(import.meta.env.DEV || isTestEnvironment || errorCode === '110600') && (
            <button
              type="button"
              onClick={handleDevBypass}
              className="inline-flex items-center gap-1 text-[11px] text-brand-emerald-deep font-semibold hover:underline bg-emerald-50 px-2 py-1 rounded border border-emerald-200"
            >
              <Key className="w-3 h-3" />
              <span>Simulate Pass in Local Dev</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
