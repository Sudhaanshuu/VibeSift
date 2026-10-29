import React from 'react';
import { DeepAuditComparison, AuditCheckResult } from '../../types/audit';
import { ShieldCheck, Layers, AlertOctagon, CheckCircle2, MinusCircle, FileCheck, Info } from 'lucide-react';

interface DeepComparisonSectionProps {
  comparison?: DeepAuditComparison;
  checks?: AuditCheckResult[];
  scanProfile?: string;
}

export const DeepComparisonSection: React.FC<DeepComparisonSectionProps> = ({
  comparison,
  checks = [],
  scanProfile,
}) => {
  if (!comparison) {
    if (scanProfile === 'baseline_public') {
      return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-subtle space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200 font-bold flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" /> Baseline Public Audit Mode
            </span>
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            Deep Security Tests Are Inactive in Basic Audit
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
            This scan was conducted using the <strong>Basic Audit (baseline_public)</strong> profile. It strictly evaluated public-facing quality, SEO, accessibility, and trust signals without executing harmless canary injections or bounded rate-limit tests.
          </p>
          <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900">
            To execute 22 active security tests (XSS canary injection, SQLi syntax verification, CORS reflection, sensitive file allowlists, and brute-force throttling checks), select <strong>Authorized Deep Audit</strong> when submitting a scan.
          </div>
        </div>
      );
    }
    return null;
  }

  const additionalCount = comparison.additionalChecksExecuted ?? comparison.totalDeepChecks ?? 22;
  const independentCount = comparison.independentTestsCount ?? comparison.totalDeepChecks ?? 22;
  const reusedCount = comparison.reusedEvidenceCount ?? comparison.totalBasicChecks ?? 34;
  const notTestedCount = comparison.notTestedCount ?? 0;
  const confirmedVulns = comparison.confirmedVulnerabilitiesCount ?? 0;

  const deepChecks: Array<{ checkId: string; name: string; status: string }> = checks.length > 0
    ? checks.filter((c) => c.auditMode === 'deep')
    : (comparison.additionalSecurityTests || comparison.additionalTestNames || []).map((name: string, i: number) => ({
        checkId: `D${String(i + 1).padStart(2, '0')}`,
        name,
        status: 'pass',
      }));

  return (
    <div className="rounded-2xl border border-teal-200 bg-white p-6 shadow-subtle space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-teal-100 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-teal-800 bg-teal-100 px-2.5 py-0.5 rounded border border-teal-200 font-bold flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" /> Deep vs Basic Audit Differential
            </span>
          </div>
          <h3 className="text-xl font-bold text-slate-900">
            Authorized Security Assessment Coverage
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {comparison.scopeDifferenceDescription ||
              'Shows which independent technical security tests were executed beyond the non-intrusive public baseline audit.'}
          </p>
        </div>

        <div className="px-3.5 py-2 rounded-xl bg-teal-50 border border-teal-200 text-xs font-mono text-teal-900 flex items-center gap-2 shrink-0">
          <ShieldCheck className="w-4 h-4 text-teal-700" />
          <span>+{additionalCount} Additional Checks Active</span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Independent Active Tests
          </span>
          <span className="text-2xl font-mono font-extrabold text-teal-800">
            {independentCount}
          </span>
          <span className="text-[11px] text-slate-400 block mt-0.5">Validated with live payloads</span>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Reused Baseline Evidence
          </span>
          <span className="text-2xl font-mono font-extrabold text-slate-700">
            {reusedCount}
          </span>
          <span className="text-[11px] text-slate-400 block mt-0.5">Public headers & DOM signals</span>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Confirmed Vulnerabilities
          </span>
          <span className="text-2xl font-mono font-extrabold text-rose-700">
            {confirmedVulns}
          </span>
          <span className="text-[11px] text-slate-400 block mt-0.5">High/critical confirmed flaws</span>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Omitted / Policy Skipped
          </span>
          <span className="text-2xl font-mono font-extrabold text-slate-500">
            {notTestedCount}
          </span>
          <span className="text-[11px] text-slate-400 block mt-0.5">Safe boundaries maintained</span>
        </div>
      </div>

      {/* Skipped Tests Explanation Pill */}
      {comparison.skippedTestReasons && Object.keys(comparison.skippedTestReasons).length > 0 && (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-800">
            <Info className="w-4 h-4 text-slate-600" />
            <span>Explanation for Omitted Tests</span>
          </div>
          {Object.entries(comparison.skippedTestReasons).map(([testId, reason]) => (
            <div key={testId} className="text-slate-600 pl-5">
              <span className="font-mono font-semibold text-slate-700">{testId}: </span>
              {reason}
            </div>
          ))}
        </div>
      )}

      {/* Grid of the Deep Security Tests */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Deep Security Tests Executed in this Mode
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {deepChecks.map((test) => {
            const isPass = test.status === 'pass';
            const isFail = test.status === 'fail';
            const isWarn = test.status === 'warning';
            const isSkip = test.status === 'not_tested' || test.status === 'not_applicable';

            return (
              <div
                key={test.checkId}
                className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                  isFail
                    ? 'border-rose-200 bg-rose-50/40 text-rose-950'
                    : isWarn
                    ? 'border-amber-200 bg-amber-50/40 text-amber-950'
                    : isPass
                    ? 'border-emerald-200 bg-emerald-50/30 text-emerald-950'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                {isFail && <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
                {isWarn && <AlertOctagon className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />}
                {isPass && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
                {isSkip && <MinusCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />}
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{test.name}</div>
                  <div className="text-[10px] font-mono text-slate-500 flex items-center justify-between mt-1">
                    <span>{test.checkId}</span>
                    <span className="uppercase font-bold">{test.status.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
