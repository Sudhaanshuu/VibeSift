import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BrandLogo } from '../components/brand/BrandLogo';
import { Button } from '../components/common/Button';
import { TurnstileWidget } from '../components/common/TurnstileWidget';
import { Mail, Lock, User, ArrowRight, AlertTriangle, KeyRound, CheckCircle2 } from 'lucide-react';

export const SignupPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [step, setStep] = useState<'register' | 'confirm'>('register');
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const [turnstileResetKey, setTurnstileResetKey] = useState<number>(0);

  const { signup, confirmSignup, login, resendCode } = useAuth();
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !name.trim() || !password.trim()) {
      setError('Please complete all registration fields.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (!turnstileToken) {
      setError('Please complete the bot protection security challenge before creating an account.');
      return;
    }
    setError(null);
    setInfoMessage(null);
    setSubmitting(true);
    try {
      const result = await signup(email, password, name, turnstileToken);
      if (result.userConfirmed) {
        navigate('/app', { replace: true });
      } else {
        setStep('confirm');
        setInfoMessage('Verification code sent to your email. Please enter it below to activate your account.');
      }
    } catch (err: any) {
      setTurnstileResetKey((k) => k + 1);
      setTurnstileToken('');
      setError(err.message || 'Account registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationCode.trim()) {
      setError('Please enter the verification code.');
      return;
    }
    setError(null);
    setInfoMessage(null);
    setSubmitting(true);
    try {
      const result = await confirmSignup(email, confirmationCode.trim(), password);
      if (result.user || result.token) {
        navigate('/app', { replace: true });
        return;
      }
      // Seamless auto-login fallback if session wasn't directly bundled
      if (password) {
        await login(email, password);
        navigate('/app', { replace: true });
        return;
      }
      navigate('/login', {
        replace: true,
        state: {
          email,
          message: 'Email verified successfully! Please sign in with your credentials.',
        },
      });
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check the code.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    setError(null);
    setInfoMessage(null);
    setSubmitting(true);
    try {
      await resendCode(email);
      setInfoMessage('A new verification code has been sent to your email.');
    } catch (err: any) {
      setError(err.message || 'Failed to resend code.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh bg-brand-muted flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-block mb-4">
          <BrandLogo size="lg" />
        </Link>
        <h2 className="text-2xl font-extrabold text-brand-text">
          {step === 'register' ? 'Create developer account' : 'Verify your email'}
        </h2>
        <p className="mt-1.5 text-xs text-brand-text-secondary">
          {step === 'register'
            ? 'Audit AI-coded applications, verify domains, and track remediation.'
            : `Enter the code sent to ${email} to activate your Cognito account.`}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md w-full">
        <div className="bg-white py-8 px-6 sm:px-8 rounded-2xl border border-brand-border shadow-card space-y-6">
          {step === 'register' ? (
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-brand-text-secondary mb-1">
                  Developer Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Developer"
                    autoComplete="name"
                    className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 rounded-xl border border-brand-border text-xs font-mono text-brand-text placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-emerald focus:border-brand-emerald"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-brand-text-secondary mb-1">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@example.com"
                    autoComplete="email"
                    className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 rounded-xl border border-brand-border text-xs font-mono text-brand-text placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-emerald focus:border-brand-emerald"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-brand-text-secondary mb-1">
                  Password (min 8 characters)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="new-password"
                    className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 rounded-xl border border-brand-border text-xs font-mono text-brand-text placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-emerald focus:border-brand-emerald"
                    required
                  />
                </div>
              </div>

              {/* Cloudflare Turnstile Bot Protection */}
              <TurnstileWidget
                onVerify={(token) => {
                  setTurnstileToken(token);
                  setError(null);
                }}
                onExpire={() => setTurnstileToken('')}
                resetKey={turnstileResetKey}
                action="signup"
                label="Developer Registration Security Check"
              />

              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={submitting}
                className="w-full justify-center min-h-[44px]"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Create Account
              </Button>
            </form>
          ) : (
            <form onSubmit={handleConfirm} className="space-y-4">
              {infoMessage && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                  <span>{infoMessage}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase text-brand-text-secondary mb-1">
                  Verification Code
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={confirmationCode}
                    onChange={(e) => setConfirmationCode(e.target.value)}
                    placeholder="123456"
                    maxLength={10}
                    className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 rounded-xl border border-brand-border text-sm font-mono tracking-widest text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-emerald focus:border-brand-emerald text-center"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={submitting}
                className="w-full justify-center min-h-[44px]"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Confirm & Sign In
              </Button>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={submitting}
                  className="min-h-[44px] text-xs text-brand-emerald hover:underline font-semibold flex items-center"
                >
                  Resend Code
                </button>
                <button
                  type="button"
                  onClick={() => setStep('register')}
                  className="min-h-[44px] text-xs text-slate-500 hover:text-slate-700 flex items-center"
                >
                  Change details
                </button>
              </div>
            </form>
          )}

          <div className="text-center pt-2 border-t border-brand-border">
            <p className="text-xs text-brand-text-secondary">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-brand-emerald hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
