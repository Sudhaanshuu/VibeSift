import React from 'react';
import { Severity } from '../../types/audit';

interface SeverityDistributionBarProps {
  counts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  totalFindings: number;
}

export const SeverityDistributionBar: React.FC<SeverityDistributionBarProps> = ({
  counts,
  totalFindings,
}) => {
  if (totalFindings === 0) {
    return (
      <div className="py-2">
        <div className="h-3 w-full bg-emerald-100 rounded-full flex items-center justify-center">
          <span className="text-[10px] font-mono text-emerald-800 font-semibold">100% Clean — 0 findings detected</span>
        </div>
      </div>
    );
  }

  const items: { severity: Severity; count: number; color: string; label: string }[] = [
    { severity: 'critical', count: counts.critical, color: 'bg-red-500', label: 'Critical' },
    { severity: 'high', count: counts.high, color: 'bg-orange-500', label: 'High' },
    { severity: 'medium', count: counts.medium, color: 'bg-amber-400', label: 'Medium' },
    { severity: 'low', count: counts.low, color: 'bg-emerald-500', label: 'Low' },
    { severity: 'info', count: counts.info, color: 'bg-slate-400', label: 'Info' },
  ];

  return (
    <div className="space-y-2">
      {/* Segmented Bar */}
      <div className="h-3 w-full bg-slate-100 rounded-full flex overflow-hidden">
        {items.map((item) => {
          if (item.count === 0) return null;
          const percent = (item.count / totalFindings) * 100;
          return (
            <div
              key={item.severity}
              className={`${item.color} h-full transition-all duration-500 relative group`}
              style={{ width: `${percent}%` }}
              title={`${item.label}: ${item.count} (${Math.round(percent)}%)`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
        {items.map((item) => (
          <div key={item.severity} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
            <span className="text-brand-text-secondary text-[11px]">{item.label}</span>
            <span className="font-mono font-bold text-brand-text text-[11px]">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
