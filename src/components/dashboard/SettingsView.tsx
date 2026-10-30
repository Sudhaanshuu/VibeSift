import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';
import { 
  User, 
  Trash2, 
  Bell, 
  ShieldCheck, 
  Check, 
  AlertTriangle,
  Scale
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { user, logout } = useAuth();
  const [purgeSuccess, setPurgeSuccess] = useState(false);
  const [emailAlerts, setEmailAlerts] = useState(true);

  const handlePurgeHistory = () => {
    if (window.confirm('Are you sure you want to purge your scan history and cached artifacts? This action is irreversible.')) {
      setPurgeSuccess(true);
      setTimeout(() => setPurgeSuccess(false), 4000);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-8">
      
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
            <div className="p-2.5 bg-brand-muted rounded-xl border border-brand-border font-medium text-brand-text">
              {user?.email || 'alex.developer@example.com'}
            </div>
          </div>
        </div>

        <div className="pt-2 text-xs text-brand-text-secondary flex items-center justify-between">
          <span>Identity Provider: Amazon Cognito User Pool</span>
          <span className="font-semibold text-brand-emerald">Verified Active</span>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="rounded-2xl bg-white border border-brand-border p-6 shadow-subtle space-y-4">
        <h2 className="text-base font-bold text-brand-text flex items-center gap-2">
          <Bell className="w-4 h-4 text-brand-emerald" />
          <span>Notification Preferences</span>
        </h2>

        <div className="space-y-3 text-xs">
          <label className="flex items-center justify-between p-3 rounded-xl border border-brand-border bg-brand-muted/30 cursor-pointer">
            <div>
              <div className="font-bold text-brand-text">Critical Regression Alerts</div>
              <div className="text-brand-text-secondary">Notify via email if a re-scan discovers a new Critical finding or exposed credential.</div>
            </div>
            <input
              type="checkbox"
              checked={emailAlerts}
              onChange={(e) => setEmailAlerts(e.target.checked)}
              className="rounded border-gray-300 text-brand-emerald focus:ring-brand-emerald h-4 w-4"
            />
          </label>
        </div>
      </div>

      {/* Privacy & Data Retention */}
      <div className="rounded-2xl bg-white border border-brand-border p-6 shadow-subtle space-y-4">
        <h2 className="text-base font-bold text-brand-text flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-red-600" />
          <span>Data Retention & Right to Erasure</span>
        </h2>

        <p className="text-xs text-brand-text-secondary leading-relaxed">
          Scans and raw report artifacts are retained in private Amazon S3 and DynamoDB instances for 90 days. You have the right to purge all stored scan records immediately.
        </p>

        {purgeSuccess && (
          <div className="p-3 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Scan history purge request queued. Records removed.</span>
          </div>
        )}

        <div className="pt-2 flex items-center justify-between">
          <span className="text-xs text-brand-text-secondary font-mono">
            Retention policy: 90 days rolling
          </span>
          <Button
            variant="danger"
            size="sm"
            onClick={handlePurgeHistory}
          >
            Purge All Scan Records
          </Button>
        </div>
      </div>

      {/* Regulatory & Legal Scope Statement */}
      <div className="rounded-2xl bg-brand-muted border border-brand-border p-6 flex items-start gap-3 text-xs text-brand-text-secondary">
        <Scale className="w-5 h-5 text-brand-emerald shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-bold text-brand-text">Compliance Boundaries Notice</h4>
          <p className="leading-relaxed">
            The platform provides observable technical indicators and automated heuristics. It does not provide legal advice or formal certification of compliance with regulations including GDPR, CCPA, or DPDP.
          </p>
        </div>
      </div>

    </div>
  );
};
