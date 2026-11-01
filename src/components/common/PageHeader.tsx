import React from 'react';

export interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  backAction?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  badge,
  action,
  backAction,
  className = '',
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {backAction && (
        <div className="flex items-center">
          {backAction}
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-text tracking-tight">
              {title}
            </h1>
            {badge}
          </div>
          {description && (
            <p className="text-xs sm:text-sm text-brand-text-secondary leading-relaxed max-w-2xl">
              {description}
            </p>
          )}
        </div>
        {action && (
          <div className="flex items-center gap-2.5 shrink-0">
            {action}
          </div>
        )}
      </div>
    </div>
  );
};
