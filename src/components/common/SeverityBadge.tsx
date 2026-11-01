import React from 'react';
import { Severity } from '../../types/audit';
import { AlertTriangle, AlertCircle, AlertOctagon, Info, CheckCircle2 } from 'lucide-react';

export interface SeverityBadgeProps {
  severity: Severity;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ 
  severity, 
  size = 'md',
  showIcon = true 
}) => {
  const configs = {
    critical: {
      label: 'Critical',
      icon: AlertOctagon,
      classes: 'bg-red-50 text-red-700 border-red-200',
    },
    high: {
      label: 'High',
      icon: AlertTriangle,
      classes: 'bg-orange-50 text-orange-800 border-orange-200',
    },
    medium: {
      label: 'Medium',
      icon: AlertCircle,
      classes: 'bg-amber-50 text-amber-800 border-amber-200',
    },
    low: {
      label: 'Low',
      icon: CheckCircle2,
      classes: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    },
    info: {
      label: 'Info',
      icon: Info,
      classes: 'bg-slate-100 text-slate-700 border-slate-200',
    },
  };

  const config = configs[severity] || configs.info;
  const Icon = config.icon;

  const sizeClasses = size === 'sm' 
    ? 'text-[10px] px-2 py-0.5 gap-1 font-mono font-bold' 
    : 'text-xs px-2.5 py-1 gap-1.5 font-mono font-bold';

  return (
    <span className={`inline-flex items-center rounded-lg border uppercase tracking-wider ${config.classes} ${sizeClasses}`}>
      {showIcon && <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />}
      <span>{config.label}</span>
    </span>
  );
};
