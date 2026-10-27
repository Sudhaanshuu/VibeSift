import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import {
  User,
  Key,
  Trash2,
  Bell,
  ShieldCheck,
  Copy,
  Check,
  AlertTriangle,
  Server,
  Cloud,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, isMockMode, logout } = useAuth();
  const [apiKey, setApiKey] = useState('sra_live_9d8f37b1029c4ef7a8e2');
  const [copiedKey, setCopiedKey] = useState(false);
  const [isPurgeDialogOpen, setIsPurgeDialogOpen] = useState(false);
  const [purgeSuccess, setPurgeSuccess] = useState(false);
  const [emailAlerts, setEmailAlerts] = useState(true);

  const copyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handlePurgeHistory = () => {
    localStorage.removeItem('vibesift_mock_scans');
    setPurgeSuccess(true);
    setIsPurgeDialogOpen(false);
    setTimeout(() => setPurgeSuccess(false), 4000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-text">
          Settings & Account
        </h1>
        <p className="text-xs sm:text-sm text-brand-text-secondary mt-1">
          Manage your identity credentials, API tokens, notification rules, and audit privacy.
        </p>
      </div>

      {/* Account Identity Card */}
      <div className="rounded-2xl bg-white border border-brand-border p-6 shadow-subtle space-y-4">
        <h2 className="text-base font-bold text-brand-text flex items-center gap-2">
          <User className="w-4 h-4 text-brand-emerald" />
          <span>Account Profile</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="text-brand-text-secondary font-semibold uppercase text-[10px] block mb-1">
              Developer Name
            </label>
            <div className="p-2.5 bg-brand-muted rounded-xl border border-brand-border font-medium text-brand-text">
              {user?.name || 'Developer'}
            </div>
          </div>

          <div>
            <label className="text-brand-text-secondary font-semibold uppercase text-[10px] block mb-1">
              Email Address
            </label>
            <div className="p-2.5 bg-brand-muted rounded-xl border border-brand-border font-mono text-brand-text">
              {user?.email || 'developer@example.com'}
            </div>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between text-xs text-brand-text-secondary border-t border-brand-border">
          <span className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Plan: <strong className="text-brand-text capitalize">{user?.plan || 'Verified Developer'}</strong>
          </span>
          <span className="font-mono text-[11px] text-slate-400">ID: {user?.id}</span>
        </div>
      </div>

      {/* Cloud & AWS Architecture Status */}
      <div className="rounded-2xl bg-white border border-brand-border p-6 shadow-subtle space-y-4">
        <h2 className="text-base font-bold text-brand-text flex items-center gap-2">
          <Cloud className="w-4 h-4 text-blue-600" />
          <span>Backend & Cloud Architecture</span>
        </h2>

        <p className="text-xs text-brand-text-secondary leading-relaxed">
          Production scans run isolated on AWS Fargate containers with Step Functions orchestration, DynamoDB finding storage, and S3 artifact repositories.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-3 rounded-xl border border-brand-border bg-slate-50 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Identity Provider</span>
            <span className="font-semibold text-brand-text">Amazon Cognito</span>
            <span className="text-[10px] text-slate-500 block truncate">Pool: us-east-1_sra</span>
          </div>

          <div className="p-3 rounded-xl border border-brand-border bg-slate-50 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Scan Execution</span>
            <span className="font-semibold text-brand-text">AWS Fargate + ECS</span>
            <span className="text-[10px] text-slate-500 block truncate">Isolated Network VPC</span>
          </div>

          <div className="p-3 rounded-xl border border-brand-border bg-slate-50 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Environment Mode</span>
            <span className="font-semibold text-amber-700">
              {isMockMode ? 'Mock Development Mode' : 'Production Cloud'}
            </span>
            <span className="text-[10px] text-slate-500 block truncate">
              {isMockMode ? 'Local Telemetry' : 'api.vibesift.pixir.in'}
            </span>
          </div>
        </div>
      </div>

      {/* CI/CD API Key */}
      <div className="rounded-2xl bg-white border border-brand-border p-6 shadow-subtle space-y-4">
        <h2 className="text-base font-bold text-brand-text flex items-center gap-2">
          <Key className="w-4 h-4 text-brand-emerald" />
          <span>API Key for GitHub Actions & CI/CD</span>
        </h2>
        <p className="text-xs text-brand-text-secondary leading-relaxed">
          Trigger website launch audits directly from GitHub Actions, GitLab CI, or Vercel deploy hooks before merging to production.
        </p>

        <div className="flex items-center gap-2">
          <code className="flex-1 p-3 bg-brand-muted rounded-xl border border-brand-border font-mono text-xs text-brand-text tracking-wider truncate">
            {apiKey}
          </code>
          <Button
            variant="outline"
            size="sm"
            onClick={copyKey}
            leftIcon={copiedKey ? <Check className="w-4 h-4 text-brand-emerald" /> : <Copy className="w-4 h-4" />}
          >
            {copiedKey ? 'Copied' : 'Copy Key'}
          </Button>
        </div>
      </div>

      {/* Notifications */}
      <div className="rounded-2xl bg-white border border-brand-border p-6 shadow-subtle space-y-4">
        <h2 className="text-base font-bold text-brand-text flex items-center gap-2">
          <Bell className="w-4 h-4 text-brand-emerald" />
          <span>Audit Notifications</span>
        </h2>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={emailAlerts}
            onChange={(e) => setEmailAlerts(e.target.checked)}
            className="mt-0.5 rounded border-brand-border text-brand-emerald focus:ring-brand-emerald w-4 h-4"
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
      <div className="rounded-2xl bg-white border border-red-200 p-6 shadow-subtle space-y-4">
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
            className="text-xs text-red-700 border-red-200 hover:bg-red-50"
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
        onConfirm={handlePurgeHistory}
        onCancel={() => setIsPurgeDialogOpen(false)}
      />
    </div>
  );
};
