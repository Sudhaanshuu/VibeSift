import React from 'react';
import { ReportSummary as ReportSummaryType, Category, AuditReport } from '../../types/audit';
import { ReadinessScoreGauge } from '../charts/ReadinessScoreGauge';
import { SeverityDistributionBar } from '../charts/SeverityDistributionBar';
import { FindingSeverityBadge } from './FindingSeverityBadge';
import { ShieldCheck, AlertTriangle, Layers, Calendar, Clock, Globe } from 'lucide-react';

interface ReportSummaryProps {
  report: AuditReport;
  onCategoryClick?: (category: Category) => void;
}

export const ReportSummary: React.FC<ReportSummaryProps> = ({
  report,
  onCategoryClick,
}) => {
  const { summary, targetUrl, createdAt, durationSeconds, scanProfile, status } = report;

  const categoryNames: Record<Category, string> = {
    seo: 'SEO & Crawl',
    performance: 'Performance',
    accessibility: 'Accessibility',
    security: 'HTTPS & TLS',
    cookies: 'Cookies & Privacy',
    exposure: 'Exposure & Code',
  };

  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="rounded-2xl border border-brand-border bg-white p-6 shadow-subtle space-y-6">
      {/* Top Meta Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-brand-border gap-4">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-brand-emerald-deep bg-brand-mint px-2.5 py-0.5 rounded border border-brand-border font-semibold">
            Executive Summary
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-brand-text mt-2 flex items-center gap-2">
            <span>{report.normalizedHostname}</span>
          </h2>
          <div className="flex flex-wrap items-center gap-3 text-xs text-brand-text-secondary mt-1 font-mono">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {formattedDate}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {durationSeconds ? `${durationSeconds}s runtime` : 'Active'}
            </span>
            <span>·</span>
            <span className="capitalize">{scanProfile.replace('_', ' ')}</span>
          </div>
        </div>

        {report.isSampleData && (
          <div className="px-3 py-1.5 rounded-xl bg-brand-mint border border-brand-border text-xs text-brand-emerald-deep font-mono">
            Demo / Sample Data
          </div>
        )}
      </div>

      {/* Executive Posture Narrative if present */}
      {summary.executiveSummary && (
        <div className="p-4 rounded-xl bg-brand-mint/50 border border-brand-border space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold font-mono text-brand-emerald-deep uppercase tracking-wider">
            <span>Launch Posture Analysis</span>
          </div>
          <p className="text-xs text-brand-text leading-relaxed">
            {summary.executiveSummary}
          </p>
        </div>
      )}

      {/* Grid: Score Gauge + Severity Distribution + Quick Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left: Readiness Gauge */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center p-4 bg-brand-card-green/40 rounded-xl border border-brand-border">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary mb-3">
            Launch Readiness Index
          </span>
          <ReadinessScoreGauge score={summary.readinessScore} size={150} strokeWidth={12} />
          <p className="text-[11px] text-brand-text-secondary mt-3 text-center max-w-xs leading-relaxed">
            Composite score weighting critical security barriers, performance bottlenecks, and SEO crawlability.
          </p>
        </div>

        {/* Center: Findings by Severity */}
        <div className="lg:col-span-4 space-y-4 p-4 rounded-xl border border-brand-border bg-slate-50/50">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary">
              Findings Severity Breakdown
            </h4>
            <span className="font-mono text-xs font-bold text-brand-text">
              {summary.totalFindings} total issue{summary.totalFindings === 1 ? '' : 's'}
            </span>
          </div>

          <SeverityDistributionBar
            counts={{
              critical: summary.critical,
              high: summary.high,
              medium: summary.medium,
              low: summary.low,
              info: summary.info,
            }}
            totalFindings={summary.totalFindings}
          />

          <div className="grid grid-cols-2 gap-2 pt-2">
            <div className="p-2.5 rounded-lg bg-red-50/80 border border-red-200">
              <span className="text-[10px] uppercase font-bold text-red-700 block">Critical Risk</span>
              <span className="text-lg font-mono font-extrabold text-red-800">{summary.critical}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-orange-50/80 border border-orange-200">
              <span className="text-[10px] uppercase font-bold text-orange-700 block">High Priority</span>
              <span className="text-lg font-mono font-extrabold text-orange-800">{summary.high}</span>
            </div>
          </div>
        </div>

        {/* Right: Category Scores Breakdown */}
        <div className="lg:col-span-4 space-y-2.5 p-4 rounded-xl border border-brand-border bg-white">
          <h4 className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary mb-3">
            Category Quality Index
          </h4>
          <div className="space-y-2">
            {(Object.entries(summary.categoryScores) as [Category, number][]).map(([cat, score]) => {
              let barColor = 'bg-emerald-500';
              if (score < 60) barColor = 'bg-red-500';
              else if (score < 80) barColor = 'bg-amber-400';

              return (
                <div
                  key={cat}
                  onClick={() => onCategoryClick && onCategoryClick(cat)}
                  className={`text-xs ${
                    onCategoryClick ? 'cursor-pointer hover:bg-slate-50 p-1 rounded transition-colors' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1 font-mono text-[11px]">
                    <span className="font-medium text-brand-text">{categoryNames[cat] || cat}</span>
                    <span className="font-bold text-brand-text-secondary">{score}/100</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${barColor} rounded-full`} style={{ width: `${score}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
