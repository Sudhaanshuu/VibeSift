import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightAction?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  hint,
  leftIcon,
  rightAction,
  id,
  className = '',
  disabled,
  ...props
}, ref) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  const errorId = inputId ? `${inputId}-error` : undefined;
  const hintId = inputId ? `${inputId}-hint` : undefined;

  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-bold uppercase tracking-wider text-brand-text-secondary"
        >
          {label}
        </label>
      )}

      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            {leftIcon}
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={`w-full py-2.5 rounded-xl border font-mono text-xs sm:text-sm text-brand-text bg-white placeholder-slate-400 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-emerald focus:border-transparent ${
            leftIcon ? 'pl-10' : 'pl-3.5'
          } ${rightAction ? 'pr-10' : 'pr-3.5'} ${
            error
              ? 'border-red-400 bg-red-50/20 focus:ring-red-400'
              : 'border-brand-border hover:border-slate-300'
          } ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-50' : ''} ${className}`}
          {...props}
        />

        {rightAction && (
          <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
            {rightAction}
          </div>
        )}
      </div>

      {error && (
        <p id={errorId} className="text-xs text-red-600 flex items-center gap-1 font-medium">
          <span>{error}</span>
        </p>
      )}

      {hint && !error && (
        <p id={hintId} className="text-[11px] text-slate-400">
          {hint}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
