import React from 'react';
import { ScanStatus } from '../../types/audit';
import { CheckCircle2, Clock, RefreshCw, AlertTriangle, XCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: ScanStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const configs: Record<ScanStatus, { label: string; icon: React.ElementType; classes: string; animate?: boolean }> = {
    QUEUED: {
      label: 'Queued',
      icon: Clock,
      classes: 'bg-slate-100 text-slate-700 border-slate-200',
    },
    VALIDATING: {
      label: 'Validating Target',
      icon: RefreshCw,
      classes: 'bg-blue-50 text-blue-700 border-blue-200',
      animate: true,
    },
    RUNNING: {
      label: 'Auditing Active',
      icon: RefreshCw,
      classes: 'bg-brand-mint text-brand-emerald-dark border-brand-border',
      animate: true,
    },
    NORMALIZING: {
      label: 'Normalizing',
      icon: RefreshCw,
      classes: 'bg-amber-50 text-amber-700 border-amber-200',
      animate: true,
    },
    COMPLETED: {
      label: 'Completed',
      icon: CheckCircle2,
      classes: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    },
    PARTIAL: {
      label: 'Partial Results',
      icon: AlertTriangle,
      classes: 'bg-amber-50 text-amber-800 border-amber-200',
    },
    FAILED: {
      label: 'Scan Failed',
      icon: XCircle,
      classes: 'bg-red-50 text-red-700 border-red-200',
    },
    CANCELLED: {
      label: 'Cancelled',
      icon: XCircle,
      classes: 'bg-slate-100 text-slate-600 border-slate-200',
    },
  };

  const config = configs[status] || configs.QUEUED;
  const Icon = config.icon;

  const sizeClasses = size === 'sm' 
    ? 'text-[11px] px-2 py-0.5 gap-1 font-medium' 
    : 'text-xs px-2.5 py-1 gap-1.5 font-medium';

  return (
    <span className={`inline-flex items-center rounded-full border ${config.classes} ${sizeClasses}`}>
      <Icon className={`w-3.5 h-3.5 ${config.animate ? 'animate-spin' : ''}`} />
      <span>{config.label}</span>
    </span>
  );
};
