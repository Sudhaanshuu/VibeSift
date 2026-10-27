import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => {
  return (
    <div
      className={`animate-pulse bg-slate-200/80 rounded-lg ${className}`}
      aria-hidden="true"
    />
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="rounded-2xl border border-brand-border bg-white p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="w-32 h-4" />
            <Skeleton className="w-20 h-3" />
          </div>
        </div>
        <Skeleton className="w-16 h-7 rounded-lg" />
      </div>
      <Skeleton className="w-full h-8" />
      <Skeleton className="w-3/4 h-3" />
    </div>
  );
};

export const ReportSkeleton: React.FC = () => {
  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 sm:p-8 animate-fade-in">
      {/* Header Skeleton */}
      <div className="rounded-2xl border border-brand-border bg-white p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="w-48 h-6" />
            <Skeleton className="w-72 h-4" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="w-24 h-9 rounded-xl" />
            <Skeleton className="w-24 h-9 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Summary Skeleton */}
      <div className="rounded-2xl border border-brand-border bg-white p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <Skeleton className="h-44 rounded-xl" />
        <Skeleton className="h-44 rounded-xl" />
        <Skeleton className="h-44 rounded-xl" />
      </div>

      {/* Findings Skeleton */}
      <div className="space-y-4">
        <Skeleton className="w-36 h-5" />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
};
