import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BrandLogo } from '../components/brand/BrandLogo';
import { Button } from '../components/common/Button';
import { ShieldCheck, Mail, Lock, ArrowRight, AlertTriangle, Sparkles, KeyRound, CheckCircle2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { login, confirmSignup, resendCode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const destination = (location.state as any)?.from?.pathname || '/app';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your account email address.');
      return;
    }
    if (!password) {
      setError('Please enter your account password.');
      return;
    }
    setError(null);
    setInfoMessage(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(destination, { replace: true });
    } catch (err: any) {
      if (err.code === 'USER_NOT_CONFIRMED') {
        setNeedsConfirmation(true);
        setInfoMessage('Account is not confirmed. Please enter the verification code sent to your email.');
      } else {
        setError(err.message || 'Login failed. Please verify credentials.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmAndLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationCode.trim()) {
      setError('Please enter the verification code.');
      return;
    }
    setError(null);
    setInfoMessage(null);
    setSubmitting(true);
    try {
      await confirmSignup(email, confirmationCode.trim());
      await login(email, password);
      navigate(destination, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Confirmation failed. Please check the code.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
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
    <div className="min-h-screen bg-brand-muted flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-block mb-4">
          <BrandLogo size="lg" />
        </Link>
        <h2 className="text-2xl font-extrabold text-brand-text">
          {needsConfirmation ? 'Confirm Account' : 'Sign in to your audit dashboard'}
        </h2>
        <p className="mt-1.5 text-xs text-brand-text-secondary">
          {needsConfirmation
            ? `Enter the confirmation code sent to ${email}`
            : 'Track previous scans, verify website ownership, and resolve findings.'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-8 rounded-2xl border border-brand-border shadow-card space-y-6">

          {!needsConfirmation ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-brand-text-secondary mb-1">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@example.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-brand-border text-xs font-mono text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-emerald"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-brand-text-secondary mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-brand-border text-xs font-mono text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-emerald"
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
                className="w-full justify-center"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Sign In
              </Button>
            </form>
          ) : (
            <form onSubmit={handleConfirmAndLogin} className="space-y-4">
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
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={confirmationCode}
                    onChange={(e) => setConfirmationCode(e.target.value)}
                    placeholder="123456"
                    maxLength={10}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-brand-border text-sm font-mono tracking-widest text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-emerald text-center"
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
                className="w-full justify-center"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Verify & Sign In
              </Button>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={submitting}
                  className="text-xs text-brand-emerald hover:underline font-semibold"
                >
                  Resend Code
                </button>
                <button
                  type="button"
                  onClick={() => setNeedsConfirmation(false)}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}

          <div className="text-center pt-2 border-t border-brand-border">
            <p className="text-xs text-brand-text-secondary">
              Need an account?{' '}
              <Link to="/signup" className="font-semibold text-brand-emerald hover:underline">
                Create account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
