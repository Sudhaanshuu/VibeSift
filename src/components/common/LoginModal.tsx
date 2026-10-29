import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from './Button';
import { BrandLogo } from '../brand/BrandLogo';
import { X, Mail, Lock, ShieldCheck, ArrowRight, AlertTriangle, User, KeyRound, CheckCircle2, RotateCw } from 'lucide-react';

export const LoginModal: React.FC = () => {
  const { isLoginModalOpen, closeLoginModal, login, signup, confirmSignup, resendCode, loginAsDemoUser } = useAuth();
  
  const [mode, setMode] = useState<'signin' | 'signup' | 'verify'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  if (!isLoginModalOpen) return null;

  const resetForm = () => {
    setError(null);
    setInfoMessage(null);
    setPassword('');
    setConfirmationCode('');
  };

  const handleSwitchMode = (newMode: 'signin' | 'signup' | 'verify') => {
    resetForm();
    setMode(newMode);
  };

  // 1. Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please provide both email and password.');
      return;
    }
    setError(null);
    setInfoMessage(null);
    setSubmitting(true);
    try {
      await login(email.trim().toLowerCase(), password);
      closeLoginModal();
    } catch (err: any) {
      if (err.code === 'USER_NOT_CONFIRMED') {
        setMode('verify');
        setInfoMessage('Your email is not verified yet. Please enter the 6-digit verification code sent to your email.');
      } else {
        setError(err.message || 'Incorrect email or password. Please verify your credentials.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Sign Up
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || !name.trim()) {
      setError('Please fill in your name, email, and password.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    setError(null);
    setInfoMessage(null);
    setSubmitting(true);
    try {
      const result = await signup(email.trim().toLowerCase(), password, name.trim());
      if (result.userConfirmed) {
        closeLoginModal();
      } else {
        setMode('verify');
        setInfoMessage(`A 6-digit confirmation code was sent to ${email.trim()}. Please enter it below to activate your account.`);
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. An account with this email may already exist.');
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Confirm Email (OTP)
  const handleConfirmCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationCode.trim()) {
      setError('Please enter the 6-digit verification code from your email.');
      return;
    }
    setError(null);
    setInfoMessage(null);
    setSubmitting(true);
    try {
      await confirmSignup(email.trim().toLowerCase(), confirmationCode.trim());
      // Auto login after verification if password is available
      if (password) {
        await login(email.trim().toLowerCase(), password);
        closeLoginModal();
      } else {
        setMode('signin');
        setInfoMessage('Email verified successfully! Please sign in with your password.');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid or expired verification code. Please check your email or request a new code.');
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Resend Code
  const handleResendCode = async () => {
    if (!email.trim()) {
      setError('Please enter your email address first.');
      return;
    }
    setError(null);
    setResending(true);
    try {
      await resendCode(email.trim().toLowerCase());
      setInfoMessage('A fresh verification code has been dispatched to your email.');
    } catch (err: any) {
      setError(err.message || 'Failed to resend code. Please try again in a few moments.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl border border-brand-border shadow-elevated overflow-hidden p-6 space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-brand-border">
          <BrandLogo size="sm" />
          <button
            onClick={closeLoginModal}
            className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switchers (only in signin or signup mode) */}
        {mode !== 'verify' ? (
          <div className="flex rounded-xl bg-brand-muted p-1 border border-brand-border">
            <button
              type="button"
              onClick={() => handleSwitchMode('signin')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                mode === 'signin'
                  ? 'bg-white text-brand-emerald-dark shadow-subtle'
                  : 'text-brand-text-secondary hover:text-brand-text'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => handleSwitchMode('signup')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                mode === 'signup'
                  ? 'bg-white text-brand-emerald-dark shadow-subtle'
                  : 'text-brand-text-secondary hover:text-brand-text'
              }`}
            >
              Create Account
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-mint text-brand-emerald-deep text-xs font-bold w-fit border border-brand-border">
            <KeyRound className="w-3.5 h-3.5 text-brand-emerald" />
            <span>Email Verification Required</span>
          </div>
        )}

        {/* Subtitle */}
        <div>
          <h3 className="text-lg font-extrabold text-brand-text">
            {mode === 'signin' && 'Sign in to VibeSift'}
            {mode === 'signup' && 'Create your developer account'}
            {mode === 'verify' && 'Verify your email address'}
          </h3>
          <p className="text-xs text-brand-text-secondary mt-1 leading-relaxed">
            {mode === 'signin' && 'Authenticate with your Amazon Cognito developer credentials to access audit reports.'}
            {mode === 'signup' && 'Register with email verification (OTP) to save audits, track history, and verify domains.'}
            {mode === 'verify' && `Enter the 6-digit OTP code sent to ${email || 'your email'} to activate your account.`}
          </p>
        </div>

        {/* Status Alerts */}
        {infoMessage && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{infoMessage}</span>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2 animate-fade-in">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* MODE 1: Sign In Form */}
        {mode === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase text-brand-text-secondary">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="developer@example.com"
                  required
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-brand-border bg-white focus:outline-none focus:border-brand-emerald"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase text-brand-text-secondary">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-brand-border bg-white focus:outline-none focus:border-brand-emerald"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full rounded-xl"
              isLoading={submitting}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In
            </Button>
          </form>
        )}

        {/* MODE 2: Sign Up Form */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-3.5">
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase text-brand-text-secondary">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Developer"
                  required
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-brand-border bg-white focus:outline-none focus:border-brand-emerald"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase text-brand-text-secondary">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="developer@example.com"
                  required
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-brand-border bg-white focus:outline-none focus:border-brand-emerald"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase text-brand-text-secondary">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-brand-border bg-white focus:outline-none focus:border-brand-emerald"
                />
              </div>
              <p className="text-[10px] text-brand-text-secondary">Must be at least 8 characters with numbers and letters.</p>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full rounded-xl"
              isLoading={submitting}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Create Account & Send Verification Code
            </Button>
          </form>
        )}

        {/* MODE 3: Email OTP Verification Form */}
        {mode === 'verify' && (
          <form onSubmit={handleConfirmCode} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase text-brand-text-secondary">6-Digit Verification Code</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={confirmationCode}
                  onChange={(e) => setConfirmationCode(e.target.value)}
                  placeholder="123456"
                  required
                  maxLength={6}
                  autoFocus
                  className="w-full text-center text-lg tracking-[0.4em] font-mono font-bold py-2.5 rounded-xl border-2 border-brand-emerald/40 bg-white focus:outline-none focus:border-brand-emerald"
                />
              </div>
              <p className="text-[10px] text-brand-text-secondary">Check your email inbox or spam folder for the code from AWS Cognito.</p>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full rounded-xl"
              isLoading={submitting}
              rightIcon={<ShieldCheck className="w-4 h-4" />}
            >
              Verify & Sign In
            </Button>

            <div className="flex items-center justify-between text-xs pt-1 text-brand-text-secondary">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resending}
                className="font-medium text-brand-emerald hover:underline flex items-center gap-1 disabled:opacity-50"
              >
                <RotateCw className={`w-3 h-3 ${resending ? 'animate-spin' : ''}`} />
                <span>Resend verification code</span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchMode('signin')}
                className="hover:text-brand-text transition-colors"
              >
                Back to Sign In
              </button>
            </div>
          </form>
        )}

        {/* Development Helper link */}
        <div className="pt-2 border-t border-brand-border/60 text-center">
          <p className="text-[11px] text-brand-text-secondary">
            Need quick demo access?{' '}
            <button
              type="button"
              onClick={async () => {
                await loginAsDemoUser();
                closeLoginModal();
              }}
              className="font-semibold text-brand-emerald hover:underline"
            >
              Sign In as Demo Developer
            </button>
          </p>
        </div>

      </div>
    </div>
  );
};
