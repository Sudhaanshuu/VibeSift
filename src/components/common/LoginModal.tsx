import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from './Button';
import { BrandLogo } from '../brand/BrandLogo';
import { X, Mail, ShieldCheck, ArrowRight, UserCheck } from 'lucide-react';

export const LoginModal: React.FC = () => {
  const { isLoginModalOpen, closeLoginModal, login, loginAsDemoUser } = useAuth();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  if (!isLoginModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    await login(email, name);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl border border-brand-border shadow-elevated overflow-hidden p-6 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-brand-border">
          <BrandLogo size="sm" />
          <button
            onClick={closeLoginModal}
            className="p-1 text-gray-400 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <h3 className="text-lg font-bold text-brand-text">Sign In to Launch Dashboard</h3>
          <p className="text-xs text-brand-text-secondary mt-1">
            Access your private scan history, saved target websites, and verified reports.
          </p>
        </div>

        {/* 1-Click Demo Sign In */}
        <div className="p-4 rounded-xl bg-brand-mint border border-brand-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-brand-emerald-dark flex items-center gap-1.5">
              <UserCheck className="w-4 h-4" /> Instant Demo Account
            </span>
            <span className="text-[10px] uppercase font-bold text-brand-emerald bg-white px-2 py-0.5 rounded border border-brand-border">
              Ready
            </span>
          </div>
          <p className="text-xs text-brand-text-secondary">
            Pre-loaded with sample websites, verified DNS challenges, and scan history.
          </p>
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="w-full mt-2"
            onClick={loginAsDemoUser}
          >
            Sign In as Demo Developer
          </Button>
        </div>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-brand-border"></div>
          <span className="flex-shrink mx-3 text-[11px] uppercase font-semibold text-gray-400">Or continue with email</span>
          <div className="flex-grow border-t border-brand-border"></div>
        </div>

        {/* Custom Email Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-brand-text">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Developer"
              className="w-full text-xs px-3 py-2 rounded-xl border border-brand-border bg-white focus:outline-none focus:border-brand-emerald"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-brand-text">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@example.com"
              required
              className="w-full text-xs px-3 py-2 rounded-xl border border-brand-border bg-white focus:outline-none focus:border-brand-emerald"
            />
          </div>

          <Button
            type="submit"
            variant="outline"
            size="md"
            className="w-full"
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Sign In (Cognito Auth)
          </Button>
        </form>

        <p className="text-[11px] text-brand-text-secondary text-center pt-2">
          By signing in, you agree to our Responsible Scanning Policy and Terms of Service.
        </p>

      </div>
    </div>
  );
};
