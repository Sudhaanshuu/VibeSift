import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BrandLogo } from '../components/brand/BrandLogo';
import { Button } from '../components/common/Button';
import { ShieldCheck, Mail, Lock, User, ArrowRight, AlertTriangle, Sparkles } from 'lucide-react';

export const SignupPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { signup, loginAsDemoUser } = useAuth();
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !name.trim() || !password.trim()) {
      setError('Please complete all registration fields.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await signup(email, password, name);
      navigate('/app', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Account registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoSignIn = async () => {
    setSubmitting(true);
    try {
      await loginAsDemoUser();
      navigate('/app', { replace: true });
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
          Create developer account
        </h2>
        <p className="mt-1.5 text-xs text-brand-text-secondary">
          Audit AI-coded applications, verify domains, and track remediation.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-8 rounded-2xl border border-brand-border shadow-card space-y-6">
          
          {/* Quick Demo Mode */}
          <div className="p-3.5 rounded-xl bg-brand-mint/60 border border-brand-border flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-mono font-bold text-brand-emerald-deep block">
                Testing the UI?
              </span>
              <p className="text-[11px] text-brand-text-secondary">
                Skip registration and test the full dashboard.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDemoSignIn}
              className="text-xs bg-white text-brand-emerald-deep border-brand-emerald font-semibold"
            >
              Demo Sign In
            </Button>
          </div>

          {/* Form */}
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-brand-text-secondary mb-1">
                Developer Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Developer"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-brand-border text-xs font-mono text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-emerald"
                  required
                />
              </div>
            </div>

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
              Create Account
            </Button>
          </form>

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
