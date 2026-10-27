import React from 'react';
import { ScanStatus } from '../../types/audit';
import { 
  Clock, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  AlertOctagon 
} from 'lucide-react';

interface ScanStatusIndicatorProps {
  status: ScanStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const ScanStatusIndicator: React.FC<ScanStatusIndicatorProps> = ({
  status,
  size = 'md',
  showLabel = true,
}) => {
  const configs: Record<
    ScanStatus,
    {
      label: string;
      icon: React.ElementType;
      colorClass: string;
      dotClass: string;
      isAnimated?: boolean;
      description: string;
    }
  > = {
    QUEUED: {
      label: 'Queued',
      icon: Clock,
      colorClass: 'bg-slate-100 text-slate-700 border-slate-300',
      dotClass: 'bg-slate-400',
      description: 'Waiting in dispatch queue for available Fargate worker.',
    },
    VALIDATING: {
      label: 'Validating Target',
      icon: RefreshCw,
      colorClass: 'bg-blue-50 text-blue-700 border-blue-200',
      dotClass: 'bg-blue-500 animate-pulse',
      isAnimated: true,
      description: 'Resolving DNS, testing reachability, and enforcing SSRF boundary checks.',
    },
    RUNNING: {
      label: 'Audit Running',
      icon: RefreshCw,
      colorClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      dotClass: 'bg-emerald-500 animate-ping',
      isAnimated: true,
      description: 'Executing inspection engines across performance, security, and quality.',
    },
    NORMALIZING: {
      label: 'Normalizing Output',
      icon: RefreshCw,
      colorClass: 'bg-amber-50 text-amber-800 border-amber-200',
      dotClass: 'bg-amber-500 animate-pulse',
      isAnimated: true,
      description: 'Aggregating raw scanner outputs and mapping rules into unified schema.',
    },
    COMPLETED: {
      label: 'Completed',
      icon: CheckCircle2,
      colorClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      dotClass: 'bg-emerald-500',
      description: 'Scan pipeline finished successfully. Report is ready.',
    },
    PARTIAL: {
      label: 'Partial Completion',
      icon: AlertTriangle,
      colorClass: 'bg-amber-50 text-amber-800 border-amber-200',
      dotClass: 'bg-amber-500',
      description: 'Some engine checks completed, but one or more modules encountered errors.',
    },
    FAILED: {
      label: 'Scan Failed',
      icon: XCircle,
      colorClass: 'bg-red-50 text-red-700 border-red-200',
      dotClass: 'bg-red-500',
      description: 'Audit pipeline encountered an unrecoverable failure (e.g. host unreachable or timeout).',
    },
    CANCELLED: {
      label: 'Cancelled',
      icon: AlertOctagon,
      colorClass: 'bg-slate-100 text-slate-600 border-slate-300',
      dotClass: 'bg-slate-400',
      description: 'Audit was cancelled by user request.',
    },
  };

  const config = configs[status] || configs.QUEUED;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-2',
    lg: 'text-sm px-3.5 py-1.5 gap-2.5',
  }[size];

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${config.colorClass} ${sizeClasses}`}
      title={config.description}
    >
      <span className="relative flex h-2 w-2">
        {config.isAnimated && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.dotClass}`}
          />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dotClass}`} />
      </span>

      {showLabel && (
        <span className="flex items-center gap-1 font-mono">
          <Icon className={`${iconSizes} ${config.isAnimated ? 'animate-spin' : ''}`} />
          <span>{config.label}</span>
        </span>
      )}
    </span>
  );
};
