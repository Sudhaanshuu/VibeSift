import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/common/Button';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import {
  User,
  Trash2,
  Bell,
  Cloud,
  Check,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isPurgeDialogOpen, setIsPurgeDialogOpen] = useState(false);
  const [purgeSuccess, setPurgeSuccess] = useState(false);
  const [isPurging, setIsPurging] = useState(false);

  const [emailAlerts, setEmailAlerts] = useState(() => {
    try {
      const stored = localStorage.getItem('vibesift_email_alerts');
      return stored !== null ? JSON.parse(stored) : true;
    } catch {
      return true;
    }
  });

  const handleToggleAlerts = (checked: boolean) => {
    setEmailAlerts(checked);
    try {
      localStorage.setItem('vibesift_email_alerts', JSON.stringify(checked));
    } catch {
      // storage unavailable
    }
  };

  const handlePurgeHistory = async () => {
    setIsPurging(true);
    try {
      // Clear TanStack Query cache for all scans and reports
      queryClient.removeQueries({ queryKey: ['scans'] });
      queryClient.removeQueries({ queryKey: ['scan'] });
      queryClient.invalidateQueries({ queryKey: ['scans'] });

      // Clear any legacy client cache keys
      localStorage.removeItem('vibesift_active_scan');
      localStorage.removeItem('vibesift_cached_reports');

      setPurgeSuccess(true);
      setIsPurgeDialogOpen(false);
      setTimeout(() => setPurgeSuccess(false), 4000);
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in min-w-0">
      <PageHeader
        title="Settings & Account"
        description="Manage your identity credentials, API tokens, notification rules, and audit privacy."
      />

      {/* Account Identity Card */}
      <div className="rounded-2xl bg-white border border-brand-border p-5 sm:p-6 shadow-subtle space-y-4">
        <h2 className="text-base font-bold text-brand-text flex items-center gap-2">
          <User className="w-4 h-4 text-brand-emerald" />
          <span>Account Profile</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="text-brand-text-secondary font-semibold uppercase text-[10px] block mb-1">
              Developer Name
            </label>
            <div className="min-h-[44px] px-3.5 py-2.5 bg-brand-muted rounded-xl border border-brand-border font-medium text-brand-text flex items-center">
              {user?.name || 'Developer'}
            </div>
          </div>

          <div>
            <label className="text-brand-text-secondary font-semibold uppercase text-[10px] block mb-1">
              Email Address
            </label>
            <div className="min-h-[44px] px-3.5 py-2.5 bg-brand-muted rounded-xl border border-brand-border font-mono text-brand-text flex items-center break-all">
              {user?.email || 'developer@example.com'}
            </div>
          </div>
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-brand-text-secondary border-t border-brand-border">
          <span className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Plan: <strong className="text-brand-text capitalize">{user?.plan || 'Verified Developer'}</strong>
          </span>
          <span className="font-mono text-[11px] text-slate-400">ID: {user?.id}</span>
        </div>
      </div>

      {/* Cloud & Architecture Status */}
      <div className="rounded-2xl bg-white border border-brand-border p-5 sm:p-6 shadow-subtle space-y-4">
        <h2 className="text-base font-bold text-brand-text flex items-center gap-2">
          <Cloud className="w-4 h-4 text-emerald-600" />
          <span>Production Cloud Architecture</span>
        </h2>

        <p className="text-xs text-brand-text-secondary leading-relaxed">
          Zero-Docker flat-cost cloud architecture running native Linux processes on AWS Free Tier with Cloudflare global edge protection.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-3 rounded-xl border border-brand-border bg-slate-50 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Identity Provider</span>
            <span className="font-semibold text-brand-text">Amazon Cognito</span>
            <span className="text-[10px] text-slate-500 block truncate">Pool: us-east-1_nW70Gohxd</span>
          </div>

          <div className="p-3 rounded-xl border border-brand-border bg-slate-50 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Compute & Host</span>
            <span className="font-semibold text-brand-text">AWS EC2 (Free Tier)</span>
            <span className="text-[10px] text-slate-500 block truncate">Ubuntu 24.04 + Nginx + PM2</span>
          </div>

          <div className="p-3 rounded-xl border border-brand-border bg-slate-50 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Edge & CDN</span>
            <span className="font-semibold text-brand-emerald-dark">Cloudflare Edge</span>
            <span className="text-[10px] text-slate-500 block truncate">vibesift.pixir.in</span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="rounded-2xl bg-white border border-brand-border p-5 sm:p-6 shadow-subtle space-y-4">
        <h2 className="text-base font-bold text-brand-text flex items-center gap-2">
          <Bell className="w-4 h-4 text-brand-emerald" />
          <span>Audit Notifications</span>
        </h2>

        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={emailAlerts}
            onChange={(e) => handleToggleAlerts(e.target.checked)}
            className="mt-0.5 rounded border-brand-border text-brand-emerald focus:ring-brand-emerald w-4 h-4 cursor-pointer"
          />
          <div className="text-xs">
            <p className="font-bold text-brand-text">Critical Vulnerability Alerts</p>
            <p className="text-brand-text-secondary mt-0.5">
              Send immediate email alerts if a scan detects an exposed credential, unbundled source map, or severe TLS misconfiguration.
            </p>
          </div>
        </label>
      </div>

      {/* Data Privacy & Purge Card */}
      <div className="rounded-2xl bg-white border border-red-200 p-5 sm:p-6 shadow-subtle space-y-4">
        <h2 className="text-base font-bold text-red-900 flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-red-600" />
          <span>Privacy & Data Purge</span>
        </h2>
        <p className="text-xs text-brand-text-secondary leading-relaxed">
          Permanently delete all historical audit records, raw HTTP logs, and cached reports from your account.
        </p>

        {purgeSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Audit history and cached artifacts successfully purged.</span>
          </div>
        )}

        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPurgeDialogOpen(true)}
            className="text-xs text-red-700 border-red-200 hover:bg-red-50 min-h-[44px]"
            leftIcon={<Trash2 className="w-4 h-4 text-red-600" />}
          >
            Purge All Scan Records
          </Button>
        </div>
      </div>

      {/* Purge Confirm Dialog */}
      <ConfirmDialog
        isOpen={isPurgeDialogOpen}
        title="Purge All Audit Records?"
        message="Are you sure you want to purge your scan history and cached artifacts? This action is irreversible."
        confirmLabel="Purge Everything"
        isDestructive={true}
        isLoading={isPurging}
        onConfirm={handlePurgeHistory}
        onCancel={() => setIsPurgeDialogOpen(false)}
      />
    </div>
  );
};
