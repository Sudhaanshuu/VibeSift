import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { targetUrlSchema, normalizeTargetUrl } from '../../lib/validation/urlSchema';
import { ScanScopeSelector } from './ScanScopeSelector';
import { ScanProfile } from '../../types/audit';
import { Button } from './Button';
import { Globe, ArrowRight, AlertTriangle, ShieldCheck, CheckCircle2, Lock } from 'lucide-react';

const formSchema = z.object({
  url: targetUrlSchema,
  profile: z.enum(['baseline_public', 'authorized_deep'] as const),
  acknowledgedTerms: z.boolean().refine((val) => val === true, {
    message: 'You must confirm that you have permission to audit this website.',
  }),
});

type FormValues = z.infer<typeof formSchema>;

export interface SiteUrlFormProps {
  initialUrl?: string;
  initialProfile?: ScanProfile;
  onSubmitScan: (data: { url: string; profile: ScanProfile; acknowledgedTerms: boolean }) => Promise<void>;
  isSubmitting?: boolean;
  backendError?: string | null;
  savedSites?: { hostname: string; isVerified: boolean }[];
  compact?: boolean;
  onVerifyDomainClick?: (hostname: string) => void;
}

export const SiteUrlForm: React.FC<SiteUrlFormProps> = ({
  initialUrl = '',
  initialProfile = 'baseline_public',
  onSubmitScan,
  isSubmitting = false,
  backendError = null,
  savedSites = [],
  compact = false,
  onVerifyDomainClick,
}) => {
  const [internalError, setInternalError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: initialUrl,
      profile: initialProfile,
      acknowledgedTerms: true,
    },
  });

  const watchedUrl = watch('url');
  const watchedProfile = watch('profile');

  // Check if currently typed domain is verified
  const cleanHostname = (watchedUrl || '').replace(/^https?:\/\//i, '').split('/')[0].toLowerCase();
  const matchedSite = savedSites.find((s) => s.hostname.toLowerCase() === cleanHostname);
  const isDomainVerified = matchedSite ? matchedSite.isVerified : false;

  const onFormSubmit = async (values: FormValues) => {
    setInternalError(null);

    // If deep scan is chosen and domain is not verified, reject submission
    if (values.profile === 'authorized_deep' && !isDomainVerified) {
      setInternalError(
        `Domain "${cleanHostname}" is not yet verified. Deeper security testing requires verified domain ownership via DNS TXT or HTML meta tag.`
      );
      return;
    }

    try {
      await onSubmitScan({
        url: values.url,
        profile: values.profile,
        acknowledgedTerms: values.acknowledgedTerms,
      });
    } catch (err: any) {
      setInternalError(err.message || 'Failed to initiate scan. Please check your network connection.');
    }
  };

  const handleBlurNormalize = () => {
    if (watchedUrl && watchedUrl.trim()) {
      setValue('url', normalizeTargetUrl(watchedUrl), { shouldValidate: true });
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-5" noValidate>
      {/* Target URL Input */}
      <div>
        <label htmlFor="target-url-input" className="block text-xs font-bold uppercase tracking-wider text-brand-text-secondary mb-2">
          Target Website URL
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Globe className="w-5 h-5 text-brand-text-secondary" />
          </div>
          <input
            id="target-url-input"
            type="text"
            {...register('url')}
            onBlur={handleBlurNormalize}
            placeholder="https://example.com or your-app.dev"
            disabled={isSubmitting}
            className={`w-full pl-11 pr-4 py-3 rounded-xl border bg-white font-mono text-sm text-brand-text placeholder-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-brand-emerald ${
              errors.url ? 'border-red-400 bg-red-50/20' : 'border-brand-border hover:border-slate-300'
            } ${isSubmitting ? 'opacity-60 cursor-not-allowed' : ''}`}
            aria-invalid={errors.url ? 'true' : 'false'}
            aria-describedby={errors.url ? 'url-error' : undefined}
          />
        </div>

        {/* Validation Error Message */}
        {errors.url && (
          <p id="url-error" className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{errors.url.message}</span>
          </p>
        )}
      </div>

      {/* Scope Selector */}
      {!compact && (
        <Controller
          name="profile"
          control={control}
          render={({ field }) => (
            <ScanScopeSelector
              value={field.value}
              onChange={(val) => {
                field.onChange(val);
                setInternalError(null);
              }}
              isDomainVerified={isDomainVerified}
              disabled={isSubmitting}
            />
          )}
        />
      )}

      {/* Domain Verification Banner if Authorized Deep selected without verification */}
      {watchedProfile === 'authorized_deep' && !isDomainVerified && cleanHostname && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <Lock className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900">Domain Verification Required</p>
              <p className="text-amber-800 text-[11px] mt-0.5">
                Active security scans require proof of domain control to prevent unauthorized testing. A checkbox alone does not grant ownership.
              </p>
            </div>
          </div>
          {onVerifyDomainClick && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onVerifyDomainClick(cleanHostname)}
              className="text-xs bg-white text-amber-900 border-amber-300 hover:bg-amber-100 flex-shrink-0"
            >
              Verify Domain
            </Button>
          )}
        </div>
      )}

      {/* Authorization Checkbox */}
      <div className="pt-1">
        <label className="flex items-start gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            {...register('acknowledgedTerms')}
            disabled={isSubmitting}
            className="mt-0.5 rounded border-brand-border text-brand-emerald focus:ring-brand-emerald w-4 h-4 cursor-pointer"
          />
          <span className="text-xs text-brand-text-secondary leading-snug">
            I confirm that I own or am authorized to audit this target. Scans are bounded to safe non-destructive inspection.
          </span>
        </label>
        {errors.acknowledgedTerms && (
          <p className="mt-1 text-xs text-red-600 pl-6.5">
            {errors.acknowledgedTerms.message}
          </p>
        )}
      </div>

      {/* Backend / Submission Errors */}
      {(backendError || internalError) && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <span>{backendError || internalError}</span>
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        isLoading={isSubmitting}
        className="w-full justify-center shadow-subtle hover:shadow-glow-green transition-all"
        rightIcon={!isSubmitting ? <ArrowRight className="w-4 h-4" /> : undefined}
      >
        {isSubmitting ? 'Initiating Safe Audit...' : 'Start Website Audit'}
      </Button>
    </form>
  );
};
