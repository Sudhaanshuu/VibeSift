import React from 'react';
import { Button } from './Button';
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  errorCode?: string;
  onRetry?: () => void;
  onHome?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'An Error Occurred',
  message = 'We encountered an unexpected issue while communicating with the audit services.',
  errorCode,
  onRetry,
  onHome,
}) => {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50/50 p-8 sm:p-12 text-center max-w-lg mx-auto my-8">
      <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 mx-auto flex items-center justify-center border border-red-200 mb-4">
        <AlertTriangle className="w-6 h-6" />
      </div>

      <h3 className="text-base font-bold text-red-900 mb-1">{title}</h3>
      <p className="text-xs text-red-700 leading-relaxed max-w-sm mx-auto mb-3">
        {message}
      </p>

      {errorCode && (
        <span className="inline-block text-[10px] font-mono bg-white px-2.5 py-1 rounded border border-red-200 text-red-800 mb-6 font-semibold">
          Error code: {errorCode}
        </span>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <Button
            variant="primary"
            size="sm"
            onClick={onRetry}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Retry Request
          </Button>
        )}
        {onHome && (
          <Button
            variant="outline"
            size="sm"
            onClick={onHome}
            leftIcon={<Home className="w-3.5 h-3.5" />}
          >
            Back to Dashboard
          </Button>
        )}
      </div>
    </div>
  );
};
