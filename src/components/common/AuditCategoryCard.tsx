import React from 'react';
import { Category } from '../../types/audit';
import { 
  Search, 
  Gauge, 
  Eye, 
  ShieldCheck, 
  Cookie, 
  FileSearch, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  Lock,
  CheckSquare,
  Shield,
  Server,
  Activity
} from 'lucide-react';

interface AuditCategoryCardProps {
  category: Category | string;
  score: number;
  findingCount: number;
  criticalCount?: number;
  highCount?: number;
  onClick?: () => void;
  isSelected?: boolean;
}

const CATEGORY_META: Record<
  string,
  { label: string; icon: React.ElementType; description: string }
> = {
  seo: {
    label: 'SEO & Crawlability',
    icon: Search,
    description: 'Title, meta tags, sitemap discovery, canonicals, and robots.txt structure.',
  },
  performance: {
    label: 'Lighthouse Performance',
    icon: Gauge,
    description: 'Core Web Vitals, render-blocking scripts, and large asset diagnostics.',
  },
  accessibility: {
    label: 'Accessibility Signals',
    icon: Eye,
    description: 'WCAG contrast, image alt texts, aria labels, and semantic DOM elements.',
  },
  security: {
    label: 'Web & Transport Security',
    icon: ShieldCheck,
    description: 'TLS posture, CSP, XSS defenses, CORS, SQLi checks, and security headers.',
  },
  cookies: {
    label: 'Browser & Cookie Security',
    icon: Cookie,
    description: 'Secure, HttpOnly, SameSite flags, and detected tracker disclosures.',
  },
  exposure: {
    label: 'Exposure & Sensitive Artifacts',
    icon: FileSearch,
    description: 'Public source maps, git artifacts, debug pages, and exposed secrets.',
  },
  privacy: {
    label: 'DPDP Act (2023) & Privacy',
    icon: Lock,
    description: 'Affirmative consent, reject parity, Grievance Officer, and DPDP Act compliance.',
  },
  completeness: {
    label: 'Completeness & Trust',
    icon: CheckSquare,
    description: 'Footer completeness, contact, about, legal pages, 404 handler, and link integrity.',
  },
  trust: {
    label: 'Trust & Signals',
    icon: Shield,
    description: 'RFC 9116 security.txt, domain reputation signals, and trust verification.',
  },
  infrastructure: {
    label: 'Infrastructure & DNS',
    icon: Server,
    description: 'SPF, DMARC email authentication, and DNS security posture.',
  },
  abuse: {
    label: 'Abuse Prevention',
    icon: Activity,
    description: 'Rate limiting, burst mitigation, and brute force defenses.',
  },
};

export const AuditCategoryCard: React.FC<AuditCategoryCardProps> = ({
  category,
  score,
  findingCount,
  criticalCount = 0,
  highCount = 0,
  onClick,
  isSelected = false,
}) => {
  const meta = CATEGORY_META[category] || {
    label: category,
    icon: ShieldCheck,
    description: 'Category diagnostics',
  };
  const Icon = meta.icon;

  // Determine score color
  let scoreColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
  let badgeColor = 'bg-emerald-500';
  if (score < 60 || criticalCount > 0) {
    scoreColor = 'text-red-700 bg-red-50 border-red-200';
    badgeColor = 'bg-red-500';
  } else if (score < 80 || highCount > 0) {
    scoreColor = 'text-amber-700 bg-amber-50 border-amber-200';
    badgeColor = 'bg-amber-500';
  }

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === ' ' || e.key === 'Enter')) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`rounded-2xl border p-5 transition-all duration-200 ${
        isSelected
          ? 'border-brand-emerald bg-brand-card-green ring-2 ring-brand-emerald shadow-subtle'
          : 'border-brand-border bg-white hover:border-slate-300 hover:shadow-subtle'
      } ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-mint text-brand-emerald-dark flex items-center justify-center border border-brand-border">
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-brand-text leading-tight">{meta.label}</h4>
            <span className="text-[11px] text-brand-text-secondary mt-0.5 block">
              {findingCount === 0 ? 'No issues detected' : `${findingCount} finding${findingCount > 1 ? 's' : ''}`}
            </span>
          </div>
        </div>

        {/* Score Pill */}
        <div className={`px-2.5 py-1 rounded-lg border font-mono font-bold text-sm ${scoreColor}`}>
          {score}/100
        </div>
      </div>

      <p className="mt-3 text-xs text-brand-text-secondary line-clamp-2 leading-relaxed">
        {meta.description}
      </p>

      {/* Mini Progress Bar */}
      <div className="mt-4">
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${badgeColor}`}
            style={{ width: `${Math.max(5, score)}%` }}
          />
        </div>
      </div>

      {(criticalCount > 0 || highCount > 0) && (
        <div className="mt-3 flex items-center gap-2 text-[11px] font-semibold text-red-700 bg-red-50/70 px-2 py-1 rounded-md border border-red-100">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            {criticalCount > 0 ? `${criticalCount} critical` : ''}
            {criticalCount > 0 && highCount > 0 ? ', ' : ''}
            {highCount > 0 ? `${highCount} high risk` : ''}
          </span>
        </div>
      )}
    </div>
  );
};
