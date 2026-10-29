import React from 'react';
import { Category } from '../../types/audit';
import { Compass, Zap, Eye, ShieldCheck, Lock, AlertOctagon, CheckSquare, Shield, Server, Activity } from 'lucide-react';

interface CategoryBadgeProps {
  category: Category | string;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({ 
  category, 
  size = 'md',
  showIcon = true 
}) => {
  const configs: Record<string, { label: string; icon: React.ElementType; classes: string }> = {
    seo: {
      label: 'SEO',
      icon: Compass,
      classes: 'bg-emerald-50/70 text-brand-emerald-dark border-emerald-200/80',
    },
    performance: {
      label: 'Performance',
      icon: Zap,
      classes: 'bg-blue-50/80 text-blue-800 border-blue-200/80',
    },
    accessibility: {
      label: 'Accessibility',
      icon: Eye,
      classes: 'bg-purple-50/80 text-purple-800 border-purple-200/80',
    },
    security: {
      label: 'Security',
      icon: ShieldCheck,
      classes: 'bg-teal-50/80 text-teal-800 border-teal-200/80',
    },
    cookies: {
      label: 'Cookies & Privacy',
      icon: Lock,
      classes: 'bg-indigo-50/80 text-indigo-800 border-indigo-200/80',
    },
    exposure: {
      label: 'Exposure / Leak',
      icon: AlertOctagon,
      classes: 'bg-rose-50/80 text-rose-800 border-rose-200/80',
    },
    privacy: {
      label: 'DPDP / Privacy',
      icon: Lock,
      classes: 'bg-violet-50/80 text-violet-800 border-violet-200/80',
    },
    completeness: {
      label: 'Completeness & Trust',
      icon: CheckSquare,
      classes: 'bg-cyan-50/80 text-cyan-800 border-cyan-200/80',
    },
    trust: {
      label: 'Trust & Signals',
      icon: Shield,
      classes: 'bg-amber-50/80 text-amber-800 border-amber-200/80',
    },
    infrastructure: {
      label: 'Infrastructure / DNS',
      icon: Server,
      classes: 'bg-sky-50/80 text-sky-800 border-sky-200/80',
    },
    abuse: {
      label: 'Abuse Prevention',
      icon: Activity,
      classes: 'bg-orange-50/80 text-orange-800 border-orange-200/80',
    },
  };

  const config = configs[category] || { label: category, icon: ShieldCheck, classes: 'bg-gray-100 text-gray-800 border-gray-200' };
  const Icon = config.icon;

  const sizeClasses = size === 'sm' 
    ? 'text-[11px] px-2 py-0.5 gap-1 font-medium' 
    : 'text-xs px-2.5 py-1 gap-1.5 font-medium';

  return (
    <span className={`inline-flex items-center rounded-md border ${config.classes} ${sizeClasses}`}>
      {showIcon && <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5 shrink-0'} />}
      <span>{config.label}</span>
    </span>
  );
};
