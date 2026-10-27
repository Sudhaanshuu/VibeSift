import React from 'react';
import { Button } from './Button';
import { LucideIcon, Layers } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Layers,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}) => {
  return (
    <div className="rounded-2xl border border-dashed border-brand-border bg-brand-muted/40 p-8 sm:p-12 text-center max-w-xl mx-auto my-6">
      <div className="w-12 h-12 rounded-2xl bg-brand-mint text-brand-emerald-dark mx-auto flex items-center justify-center border border-brand-border shadow-subtle mb-4">
        <Icon className="w-6 h-6" />
      </div>

      <h3 className="text-base font-bold text-brand-text mb-1.5">{title}</h3>
      <p className="text-xs text-brand-text-secondary leading-relaxed max-w-sm mx-auto mb-6">
        {description}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {actionLabel && onAction && (
          <Button variant="primary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
        {secondaryActionLabel && onSecondaryAction && (
          <Button variant="outline" size="sm" onClick={onSecondaryAction}>
            {secondaryActionLabel}
          </Button>
        )}
      </div>
    </div>
  );
};
