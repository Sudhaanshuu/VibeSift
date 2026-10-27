import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSavedSites, useAddSavedSite, useDeleteSavedSite, useConfirmVerification } from '../hooks/useSites';
import { requestDomainVerification, VerificationInstructions } from '../lib/api/sites';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { CardSkeleton } from '../components/common/LoadingSkeleton';
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
  FileCode,
  Trash2,
  X,
} from 'lucide-react';

export const SitesPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: sites, isLoading, error, refetch } = useSavedSites();
  const addSiteMutation = useAddSavedSite();
  const deleteSiteMutation = useDeleteSavedSite();
  const confirmVerifyMutation = useConfirmVerification();

  const [newDomainInput, setNewDomainInput] = useState('');
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [verifyInstructions, setVerifyInstructions] = useState<VerificationInstructions | null>(null);
  const [verifyMethod, setVerifyMethod] = useState<'dns_txt' | 'html_meta' | 'http_file'>('dns_txt');
  const [copiedToken, setCopiedToken] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ success: boolean; message: string } | null>(null);

  // Delete dialog state
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const savedSites = sites || [];
  const selectedSite = savedSites.find((s) => s.id === selectedSiteId);

  const handleOpenVerification = async (siteId: string) => {
    setSelectedSiteId(siteId);
    setVerifyResult(null);
    try {
      const instructions = await requestDomainVerification(siteId, verifyMethod);
      setVerifyInstructions(instructions);
    } catch {
      // Error handled
    }
  };

  const handleMethodChange = async (method: 'dns_txt' | 'html_meta' | 'http_file') => {
    setVerifyMethod(method);
    if (selectedSiteId) {
      const instructions = await requestDomainVerification(selectedSiteId, method);
      setVerifyInstructions(instructions);
    }
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomainInput.trim()) return;
    try {
      const created = await addSiteMutation.mutateAsync(newDomainInput);
      setNewDomainInput('');
      handleOpenVerification(created.id);
    } catch {
      // Handled
    }
  };

  const handleConfirmVerification = async () => {
    if (!selectedSiteId) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await confirmVerifyMutation.mutateAsync(selectedSiteId);
      setVerifyResult({ success: res.verified, message: res.message });
      if (res.verified) {
        refetch();
      }
    } catch (err: any) {
      setVerifyResult({ success: false, message: err.message || 'Verification check failed.' });
    } finally {
      setVerifying(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleDeleteSite = async () => {
    if (!deleteTargetId) return;
    await deleteSiteMutation.mutateAsync(deleteTargetId);
    if (selectedSiteId === deleteTargetId) {
      setSelectedSiteId(null);
      setVerifyInstructions(null);
    }
    setDeleteTargetId(null);
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="h-10 w-48 bg-slate-200 rounded-lg animate-pulse" />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-text">
            Saved Websites & Domain Verification
          </h1>
          <p className="text-xs sm:text-sm text-brand-text-secondary mt-1">
            Prove domain ownership via DNS or HTML tags to unlock authorized deep security scanning (OWASP ZAP & Nuclei).
          </p>
        </div>
      </div>

      {/* Domain Verification Notice */}
      <div className="p-4 rounded-2xl bg-brand-card-green border border-brand-border flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-brand-emerald flex-shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-bold text-brand-text">Why does deep security testing require domain verification?</p>
          <p className="text-brand-text-secondary leading-relaxed">
            Unlike baseline public audits, active penetration testing actively probes endpoints. In compliance with security standards and law, deeper scans are restricted to proven domain owners. A frontend checkbox alone does not grant authorization.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Add Domain & List */}
        <div className="lg:col-span-7 space-y-6">
          {/* Add Domain Input Box */}
          <div className="bg-white rounded-2xl border border-brand-border p-5 shadow-subtle space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary">
              Register New Domain Target
            </h3>
            <form onSubmit={handleAddDomain} className="flex gap-2">
              <input
                type="text"
                value={newDomainInput}
                onChange={(e) => setNewDomainInput(e.target.value)}
                placeholder="app.yourdomain.com"
                className="flex-1 px-4 py-2.5 rounded-xl border border-brand-border font-mono text-xs text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-emerald"
              />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={addSiteMutation.isPending}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add Domain
              </Button>
            </form>
          </div>

          {/* Websites List */}
          {savedSites.length === 0 ? (
            <EmptyState
              icon={Globe}
              title="No Websites Added Yet"
              description="Add your first website domain to configure domain verification challenges and schedule audits."
            />
          ) : (
            <div className="space-y-3">
              {savedSites.map((site) => {
                const isSelected = selectedSiteId === site.id;

                return (
                  <div
                    key={site.id}
                    onClick={() => handleOpenVerification(site.id)}
                    className={`rounded-2xl border p-5 transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'border-brand-emerald bg-brand-card-green ring-2 ring-brand-emerald shadow-subtle'
                        : 'border-brand-border bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 truncate">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-brand-text truncate">
                            {site.hostname}
                          </span>
                          {site.isVerified ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                              <Lock className="w-3 h-3 text-amber-600" />
                              Unverified
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-brand-text-secondary font-mono">
                          {site.normalizedUrl}
                        </p>
                      </div>

                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setDeleteTargetId(site.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                          title="Delete saved domain"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-brand-border flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-brand-text-secondary">
                      <div className="flex items-center gap-3">
                        <span>
                          Score:{' '}
                          <strong className="text-brand-text">
                            {site.latestScore !== undefined && site.latestScore !== null ? `${site.latestScore}/100` : site.lastScanScore ? `${site.lastScanScore}/100` : 'Not audited'}
                          </strong>
                          {site.scoreTrend?.delta !== undefined && site.scoreTrend.delta !== 0 && (
                            <span className={`ml-1.5 font-bold ${site.scoreTrend.delta > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                              ({site.scoreTrend.delta > 0 ? `+${site.scoreTrend.delta}` : site.scoreTrend.delta})
                            </span>
                          )}
                        </span>
                        <span>
                          Total Scans:{' '}
                          <strong className="text-brand-text">
                            {site.totalScans ?? (site.lastScanScore ? 1 : 0)}
                          </strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/app/scans/new?url=${encodeURIComponent(site.normalizedUrl)}`);
                          }}
                          className="text-xs"
                        >
                          Run Audit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenVerification(site.id);
                          }}
                          className="text-xs"
                        >
                          {site.isVerified ? 'Verification Details' : 'Verify Ownership'}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Verification Procedure Drawer */}
        <div className="lg:col-span-5">
          {selectedSite && verifyInstructions ? (
            <div className="bg-white rounded-2xl border border-brand-border p-6 shadow-subtle space-y-6 sticky top-24">
              <div className="flex items-center justify-between pb-4 border-b border-brand-border">
                <div>
                  <span className="text-[10px] font-mono uppercase font-bold text-brand-text-secondary">
                    Domain Verification Challenge
                  </span>
                  <h3 className="text-base font-extrabold font-mono text-brand-text mt-0.5">
                    {selectedSite.hostname}
                  </h3>
                </div>
                {selectedSite.isVerified ? (
                  <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified
                  </span>
                ) : (
                  <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" />
                    Pending
                  </span>
                )}
              </div>

              {/* Method Switcher */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-brand-text-secondary block">
                  Select Verification Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleMethodChange('dns_txt')}
                    className={`p-2.5 rounded-xl border text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      verifyMethod === 'dns_txt'
                        ? 'border-brand-emerald bg-brand-card-green text-brand-emerald-dark'
                        : 'border-brand-border bg-white text-brand-text-secondary hover:bg-slate-50'
                    }`}
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>DNS TXT Record</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMethodChange('html_meta')}
                    className={`p-2.5 rounded-xl border text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      verifyMethod === 'html_meta'
                        ? 'border-brand-emerald bg-brand-card-green text-brand-emerald-dark'
                        : 'border-brand-border bg-white text-brand-text-secondary hover:bg-slate-50'
                    }`}
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    <span>HTML Meta Tag</span>
                  </button>
                </div>
              </div>

              {/* Instructions Display */}
              {verifyMethod === 'dns_txt' ? (
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-brand-border text-xs">
                  <p className="text-brand-text-secondary leading-relaxed">
                    Add the following TXT record to your DNS provider (Cloudflare, Route53, Namecheap):
                  </p>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Host / Name
                    </span>
                    <code className="block bg-white p-2 rounded border border-brand-border font-mono text-[11px] text-brand-text">
                      {verifyInstructions.dnsHostRecord}
                    </code>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      TXT Value
                    </span>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-white p-2 rounded border border-brand-border font-mono text-[11px] text-brand-text truncate">
                        {verifyInstructions.token}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(verifyInstructions.token)}
                        className="text-xs p-2"
                      >
                        {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-brand-border text-xs">
                  <p className="text-brand-text-secondary leading-relaxed">
                    Place this meta tag in the <code className="font-mono bg-white px-1 py-0.5 rounded">&lt;head&gt;</code> of your homepage index.html:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white p-2.5 rounded border border-brand-border font-mono text-[11px] text-brand-text break-all">
                      {verifyInstructions.metaHtmlTag}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(verifyInstructions.metaHtmlTag)}
                      className="text-xs p-2"
                    >
                      {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>
              )}

              {/* Verification Feedback Banner */}
              {verifyResult && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                    verifyResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-red-50 border-red-200 text-red-900'
                  }`}
                >
                  {verifyResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <span>{verifyResult.message}</span>
                </div>
              )}

              {/* Action Button */}
              <Button
                variant="primary"
                size="md"
                onClick={handleConfirmVerification}
                isLoading={verifying}
                leftIcon={<RefreshCw className="w-4 h-4" />}
                className="w-full justify-center shadow-subtle"
              >
                {selectedSite.isVerified ? 'Re-Verify Domain Record' : 'Check Verification Now'}
              </Button>
            </div>
          ) : (
            <div className="bg-brand-muted/40 rounded-2xl border border-dashed border-brand-border p-8 text-center space-y-2">
              <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-brand-text">No Website Selected</h4>
              <p className="text-xs text-brand-text-secondary">
                Select a domain from the list on the left to view or initiate its verification challenge.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTargetId)}
        title="Remove Saved Domain?"
        message="Removing this website will clear domain verification records and unlink stored scan associations."
        confirmLabel="Delete Domain"
        isDestructive={true}
        isLoading={deleteSiteMutation.isPending}
        onConfirm={handleDeleteSite}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
};
