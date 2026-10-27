import React, { useState } from 'react';
import { useAudit } from '../../context/AuditContext';
import { Button } from '../common/Button';
import { 
  Globe, 
  ShieldCheck, 
  Lock, 
  Plus, 
  CheckCircle2, 
  Copy, 
  Check, 
  RefreshCw, 
  ExternalLink,
  AlertTriangle,
  Terminal,
  FileCode
} from 'lucide-react';

export const SavedWebsitesView: React.FC = () => {
  const { savedWebsites, verifyDomain, addSavedWebsite, openNewScanModal } = useAudit();
  const [newDomainInput, setNewDomainInput] = useState('');
  const [selectedSiteToVerify, setSelectedSiteToVerify] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyMethod, setVerifyMethod] = useState<'dns_txt' | 'html_meta'>('dns_txt');
  const [copiedToken, setCopiedToken] = useState(false);
  const [successNotice, setSuccessNotice] = useState('');

  const activeSite = savedWebsites.find(s => s.id === selectedSiteToVerify);

  const handleAddDomain = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomainInput.trim()) return;
    const created = addSavedWebsite(newDomainInput);
    setNewDomainInput('');
    setSelectedSiteToVerify(created.id);
  };

  const handleVerifyNow = async () => {
    if (!selectedSiteToVerify) return;
    setIsVerifying(true);
    await verifyDomain(selectedSiteToVerify);
    setIsVerifying(false);
    setSuccessNotice('Domain ownership verified successfully! Deeper OWASP ZAP & Nuclei checks are now unlocked for this domain.');
    setTimeout(() => setSuccessNotice(''), 5000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-text">
            Saved Websites & Domain Verification
          </h1>
          <p className="text-xs sm:text-sm text-brand-text-secondary mt-1">
            Prove domain ownership via DNS TXT or HTML meta tokens to enable deeper security testing.
          </p>
        </div>

        {/* Add Domain Form */}
        <form onSubmit={handleAddDomain} className="flex items-center gap-2">
          <input
            type="text"
            value={newDomainInput}
            onChange={(e) => setNewDomainInput(e.target.value)}
            placeholder="subdomain.example.com"
            className="text-xs px-3 py-2 rounded-xl border border-brand-border bg-white focus:outline-none focus:border-brand-emerald w-48 sm:w-64"
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Website
          </Button>
        </form>
      </div>

      {successNotice && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Grid of Saved Domains */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {savedWebsites.map((site) => (
          <div
            key={site.id}
            className={`rounded-2xl bg-white border p-6 flex flex-col justify-between shadow-subtle transition-all ${
              site.isVerified ? 'border-brand-border' : 'border-amber-200 bg-amber-50/20'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  site.isVerified 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                    : 'bg-amber-100 text-amber-800 border-amber-300'
                }`}>
                  {site.isVerified ? 'Verified Domain' : 'Verification Pending'}
                </span>

                <Globe className="w-4 h-4 text-brand-text-secondary" />
              </div>

              <h3 className="text-base font-bold font-mono text-brand-text mb-1 truncate">
                {site.hostname}
              </h3>

              <div className="text-xs text-brand-text-secondary space-y-1 my-3">
                <div>Audit Score: <span className="font-bold text-brand-text">{site.lastScanScore ? `${site.lastScanScore}/100` : 'Not scanned yet'}</span></div>
                <div>Status: {site.isVerified ? `Verified via ${site.verificationMethod}` : 'Baseline Public Only'}</div>
              </div>
            </div>

            <div className="pt-4 border-t border-brand-border flex items-center justify-between gap-2">
              {!site.isVerified ? (
                <button
                  onClick={() => setSelectedSiteToVerify(site.id)}
                  className="text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 w-full justify-center"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Verify Ownership</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={() => openNewScanModal(site.normalizedUrl)}
                    className="text-xs font-semibold text-brand-emerald hover:underline flex items-center gap-1"
                  >
                    <span>Run Deep Audit</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>

                  <span className="text-[11px] text-brand-text-secondary font-mono">
                    Authorized
                  </span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Verification Challenge Drawer / Modal if selected */}
      {activeSite && !activeSite.isVerified && (
        <div className="rounded-2xl bg-white border-2 border-brand-emerald p-6 sm:p-8 shadow-elevated space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-brand-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-mint text-brand-emerald-dark flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-brand-text">
                  Verify Domain Ownership for: <span className="font-mono text-brand-emerald">{activeSite.hostname}</span>
                </h3>
                <p className="text-xs text-brand-text-secondary">
                  Complete one of the challenges below so our scanner can confirm target ownership.
                </p>
              </div>
            </div>

            <button
              onClick={() => setSelectedSiteToVerify(null)}
              className="text-xs text-brand-text-secondary hover:text-brand-text"
            >
              Close
            </button>
          </div>

          {/* Verification Method Tabs */}
          <div className="flex gap-4 border-b border-brand-border text-xs font-medium">
            <button
              onClick={() => setVerifyMethod('dns_txt')}
              className={`pb-2 transition-colors border-b-2 ${
                verifyMethod === 'dns_txt' 
                  ? 'border-brand-emerald text-brand-emerald-dark font-bold' 
                  : 'border-transparent text-brand-text-secondary'
              }`}
            >
              Option A: DNS TXT Record (Recommended)
            </button>
            <button
              onClick={() => setVerifyMethod('html_meta')}
              className={`pb-2 transition-colors border-b-2 ${
                verifyMethod === 'html_meta' 
                  ? 'border-brand-emerald text-brand-emerald-dark font-bold' 
                  : 'border-transparent text-brand-text-secondary'
              }`}
            >
              Option B: HTML Meta Tag in &lt;head&gt;
            </button>
          </div>

          {/* DNS TXT Instructions */}
          {verifyMethod === 'dns_txt' ? (
            <div className="space-y-4 text-xs">
              <p className="text-brand-text-secondary">
                Add the following TXT record to your DNS management console (Cloudflare, AWS Route 53, Namecheap, Vercel DNS):
              </p>

              <div className="p-4 bg-gray-900 text-gray-100 rounded-xl space-y-2 font-mono">
                <div className="flex justify-between items-center text-gray-400 text-[11px]">
                  <span>Record Type: TXT</span>
                  <span>Host: @ (or _siteready-challenge)</span>
                </div>
                <div className="flex items-center justify-between text-emerald-400 bg-gray-800 p-2 rounded">
                  <span className="truncate">{activeSite.verificationToken || 'siteready-verify=89f41b2a7e'}</span>
                  <button
                    onClick={() => copyToClipboard(activeSite.verificationToken || 'siteready-verify=89f41b2a7e')}
                    className="text-gray-300 hover:text-white flex items-center gap-1 pl-2"
                  >
                    {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedToken ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              <p className="text-brand-text-secondary">
                Paste this meta tag inside the <code className="text-brand-emerald font-mono">&lt;head&gt;</code> element of your homepage HTML:
              </p>

              <div className="p-4 bg-gray-900 text-gray-100 rounded-xl space-y-2 font-mono">
                <div className="flex items-center justify-between text-emerald-400 bg-gray-800 p-2 rounded">
                  <span className="truncate">&lt;meta name="siteready-verification" content="{activeSite.verificationToken?.split('=')[1] || '89f41b2a7e'}" /&gt;</span>
                  <button
                    onClick={() => copyToClipboard(`<meta name="siteready-verification" content="${activeSite.verificationToken?.split('=')[1] || '89f41b2a7e'}" />`)}
                    className="text-gray-300 hover:text-white flex items-center gap-1 pl-2"
                  >
                    {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedToken ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Action to perform simulated verification */}
          <div className="pt-4 border-t border-brand-border flex items-center justify-between">
            <span className="text-xs text-brand-text-secondary">
              DNS propagation can take between 10 seconds and 5 minutes.
            </span>

            <Button
              variant="primary"
              size="md"
              isLoading={isVerifying}
              onClick={handleVerifyNow}
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              Verify Challenge Now
            </Button>
          </div>
        </div>
      )}

      {/* Safety Policy Box */}
      <div className="p-6 bg-brand-muted rounded-2xl border border-brand-border text-xs text-brand-text-secondary space-y-1">
        <h4 className="font-bold text-brand-text text-sm">
          Why is domain verification mandatory?
        </h4>
        <p className="leading-relaxed">
          Active security scanners and penetration suites (OWASP ZAP and ProjectDiscovery Nuclei) generate observable test traffic. To ensure strict compliance with international cyber laws and cloud terms of service, active templates can only be dispatched against web origins where ownership has been positively established.
        </p>
      </div>

    </div>
  );
};
