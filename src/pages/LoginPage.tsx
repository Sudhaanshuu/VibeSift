import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BrandLogo } from '../components/brand/BrandLogo';
import { Button } from '../components/common/Button';
import { ShieldCheck, Mail, Lock, ArrowRight, AlertTriangle, Sparkles, CheckCircle2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { login, loginAsDemoUser, isMockMode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const destination = (location.state as any)?.from?.pathname || '/app';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your account email address.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(destination, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoSignIn = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await loginAsDemoUser();
      navigate(destination, { replace: true });
    } catch (err: any) {
      setError('Unable to activate demo user mode.');
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
          Sign in to your audit dashboard
        </h2>
        <p className="mt-1.5 text-xs text-brand-text-secondary">
          Track previous scans, verify website ownership, and resolve findings.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-8 rounded-2xl border border-brand-border shadow-card space-y-6">
          
          {/* Quick Demo Mode Sign-In Box */}
          <div className="p-4 rounded-xl bg-brand-mint/60 border border-brand-border space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-brand-emerald-deep flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Developer / Demo Mode
              </span>
              <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-brand-border text-slate-500">
                Instant Access
              </span>
            </div>
            <p className="text-xs text-brand-text-secondary leading-relaxed">
              Explore the full auditing suite without Amazon Cognito credentials using pre-loaded scan telemetry.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDemoSignIn}
              isLoading={submitting}
              className="w-full justify-center bg-white border-brand-emerald text-brand-emerald-deep hover:bg-brand-mint font-semibold text-xs"
            >
              Sign In as Demo Developer (Alex)
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-brand-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-white text-slate-400 font-mono text-[11px]">
                or authenticate with credentials
              </span>
            </div>
          </div>

          {/* Form */}
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
                  placeholder="developer@company.com"
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

          <div className="text-center pt-2 border-t border-brand-border">
            <p className="text-xs text-brand-text-secondary">
              Don't have an account?{' '}
              <Link to="/signup" className="font-semibold text-brand-emerald hover:underline">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
