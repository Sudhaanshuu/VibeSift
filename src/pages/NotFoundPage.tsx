import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { BrandLogo } from '../components/brand/BrandLogo';
import { Home, ArrowLeft, ShieldAlert } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-brand-muted flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 text-center antialiased">
      <div className="max-w-md mx-auto space-y-6">
        <Link to="/" className="inline-block">
          <BrandLogo size="lg" />
        </Link>

        <div className="w-16 h-16 rounded-3xl bg-brand-mint text-brand-emerald-dark mx-auto flex items-center justify-center border border-brand-border shadow-card">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-brand-text font-mono">404</h1>
          <h2 className="text-lg font-bold text-brand-text">Target Route Not Found</h2>
          <p className="text-xs text-brand-text-secondary leading-relaxed max-w-sm mx-auto">
            The page or report you requested could not be resolved. It may have expired, or the URL might be malformed.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link to="/app">
            <Button variant="primary" size="sm" leftIcon={<Home className="w-4 h-4" />}>
              Go to Dashboard
            </Button>
          </Link>
          <Link to="/">
            <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back to Homepage
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
