import React from 'react';
import { ScanStatus, EngineExecutionStatus } from '../../types/audit';
import { ScanStatusIndicator } from './ScanStatusIndicator';
import { CheckCircle2, Clock, RefreshCw, XCircle, AlertTriangle } from 'lucide-react';

interface ScanProgressProps {
  status: ScanStatus;
  enginesRun?: EngineExecutionStatus[];
  durationSeconds?: number;
}

const PHASES: { id: string; label: string; minStatus: ScanStatus[] }[] = [
  { id: 'queued', label: 'Queued', minStatus: ['QUEUED', 'VALIDATING', 'RUNNING', 'NORMALIZING', 'COMPLETED', 'PARTIAL'] },
  { id: 'validating', label: 'DNS & Boundary Validation', minStatus: ['VALIDATING', 'RUNNING', 'NORMALIZING', 'COMPLETED', 'PARTIAL'] },
  { id: 'running', label: 'Multi-Engine Inspection', minStatus: ['RUNNING', 'NORMALIZING', 'COMPLETED', 'PARTIAL'] },
  { id: 'normalizing', label: 'Result Normalization', minStatus: ['NORMALIZING', 'COMPLETED', 'PARTIAL'] },
  { id: 'completed', label: 'Report Generated', minStatus: ['COMPLETED', 'PARTIAL'] },
];

export const ScanProgress: React.FC<ScanProgressProps> = ({
  status,
  enginesRun = [],
  durationSeconds,
}) => {
  const getPhaseState = (phaseMinStatus: ScanStatus[]) => {
    if (status === 'FAILED') return 'failed';
    if (status === 'CANCELLED') return 'cancelled';
    if (phaseMinStatus.includes(status)) {
      if (phaseMinStatus[phaseMinStatus.length - 1] === status || status === 'COMPLETED' || status === 'PARTIAL') {
        return 'completed';
      }
      return 'active';
    }
    return 'pending';
  };

  const getPercent = () => {
    switch (status) {
      case 'QUEUED':
        return 10;
      case 'VALIDATING':
        return 30;
      case 'RUNNING':
        return 65;
      case 'NORMALIZING':
        return 88;
      case 'COMPLETED':
      case 'PARTIAL':
        return 100;
      case 'FAILED':
      case 'CANCELLED':
        return 100;
      default:
        return 0;
    }
  };

  const percent = getPercent();

  return (
    <div className="rounded-2xl border border-brand-border bg-white p-6 shadow-subtle space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-brand-text flex items-center gap-2">
            <span>Audit Execution Telemetry</span>
            <ScanStatusIndicator status={status} size="sm" />
          </h3>
          <p className="text-xs text-brand-text-secondary mt-1">
            Real-time scanner container orchestration status across isolated AWS Fargate tasks.
          </p>
        </div>

        {durationSeconds !== undefined && durationSeconds > 0 && (
          <div className="font-mono text-xs text-brand-text-secondary bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
            Duration: <span className="font-semibold text-brand-text">{durationSeconds}s</span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-brand-text-secondary">
          <span>Overall Pipeline Completion</span>
          <span className="font-bold text-brand-text">{percent}%</span>
        </div>
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-700 ease-out ${
              status === 'FAILED'
                ? 'bg-red-500'
                : status === 'CANCELLED'
                ? 'bg-slate-400'
                : 'bg-brand-emerald'
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Stepper Steps */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-2">
        {PHASES.map((phase, idx) => {
          const state = getPhaseState(phase.minStatus);
          return (
            <div
              key={phase.id}
              className={`p-2.5 rounded-xl border text-xs transition-all ${
                state === 'completed'
                  ? 'border-emerald-200 bg-emerald-50/50 text-emerald-900'
                  : state === 'active'
                  ? 'border-brand-emerald bg-brand-card-green text-brand-emerald-dark ring-1 ring-brand-emerald'
                  : state === 'failed'
                  ? 'border-red-200 bg-red-50 text-red-900'
                  : 'border-slate-200 bg-slate-50 text-slate-500'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1 font-mono text-[10px] uppercase font-semibold">
                <span>Phase {idx + 1}</span>
                {state === 'completed' && <CheckCircle2 className="w-3 h-3 text-emerald-600 ml-auto" />}
                {state === 'active' && <RefreshCw className="w-3 h-3 text-brand-emerald animate-spin ml-auto" />}
              </div>
              <p className="font-medium text-[11px] leading-tight">{phase.label}</p>
            </div>
          );
        })}
      </div>

      {/* Engines Run Status List if present */}
      {enginesRun.length > 0 && (
        <div className="pt-2 border-t border-brand-border">
          <h4 className="text-xs font-bold text-brand-text-secondary uppercase tracking-wider mb-2">
            Inspection Engine Status
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {enginesRun.map((eng) => {
              const isPassed = eng.status === 'passed';
              const isSkipped = eng.status === 'skipped_unauthorized';
              const isFailed = eng.status === 'failed';

              return (
                <div
                  key={eng.displayName}
                  className={`p-2.5 rounded-lg border text-xs font-mono flex items-center justify-between ${
                    isPassed
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                      : isSkipped
                      ? 'bg-slate-50 border-slate-200 text-slate-600'
                      : 'bg-red-50 border-red-200 text-red-900'
                  }`}
                >
                  <span className="truncate pr-2 font-medium">{eng.displayName}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold flex-shrink-0 ${
                      isPassed
                        ? 'bg-emerald-200/60 text-emerald-800'
                        : isSkipped
                        ? 'bg-slate-200 text-slate-700'
                        : 'bg-red-200 text-red-800'
                    }`}
                  >
                    {isPassed ? 'Passed' : isSkipped ? 'Skipped' : 'Error'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
