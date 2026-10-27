import React from 'react';
import { ArrowRight, FileCheck, CheckCircle2 } from 'lucide-react';
import { Button } from './Button';

export interface SampleReportCardProps {
  sampleKey: string;
  title: string;
  stack: string;
  target: string;
  description: string;
  findingsCount: number;
  score: number;
  highlights: string[];
  badge?: string;
  onSelect: (sampleKey: string) => void;
}

export const SampleReportCard: React.FC<SampleReportCardProps> = ({
  sampleKey,
  title,
  stack,
  target,
  description,
  findingsCount,
  score,
  highlights,
  badge,
  onSelect,
}) => {
  let scoreClass = 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (score < 70) scoreClass = 'text-red-700 bg-red-50 border-red-200';
  else if (score < 80) scoreClass = 'text-amber-800 bg-amber-50 border-amber-200';

  return (
    <div className="rounded-2xl border border-brand-border bg-white p-6 shadow-subtle hover:border-brand-emerald hover:shadow-card transition-all duration-200 flex flex-col justify-between">
      <div className="space-y-4">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            {badge && (
              <span className="inline-block text-[10px] font-mono font-semibold uppercase text-brand-emerald-deep bg-brand-mint px-2 py-0.5 rounded border border-brand-border mb-2">
                {badge}
              </span>
            )}
            <h3 className="text-base font-bold text-brand-text">{title}</h3>
            <span className="text-xs font-mono text-slate-500 block mt-0.5">{target}</span>
          </div>

          <div className={`px-2.5 py-1 rounded-lg border font-mono font-bold text-sm ${scoreClass}`}>
            {score}/100
          </div>
        </div>

        <p className="text-xs text-brand-text-secondary leading-relaxed line-clamp-3">
          {description}
        </p>

        {/* Highlights */}
        <div className="space-y-1.5 pt-2 border-t border-brand-border">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Flagged in this audit
          </span>
          {highlights.map((h, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-brand-text font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
              <span className="truncate">{h}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-6 mt-4 border-t border-brand-border flex items-center justify-between">
        <span className="text-xs font-mono text-brand-text-secondary">
          {findingsCount} findings analyzed
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSelect(sampleKey)}
          rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          className="text-xs"
        >
          View Report
        </Button>
      </div>
    </div>
  );
};
