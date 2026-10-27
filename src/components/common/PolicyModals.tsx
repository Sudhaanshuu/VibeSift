import React from 'react';
import { X, ShieldCheck, Lock, ExternalLink, Sliders } from 'lucide-react';
import { triggerCookieSettingsModal } from '../../lib/cookies/cookieConsent';

interface PolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'security' | 'privacy';
  onNavigateToPrivacy?: () => void;
  onNavigateToSecurity?: () => void;
}

export const PolicyModal: React.FC<PolicyModalProps> = ({ 
  isOpen, 
  onClose, 
  type,
  onNavigateToPrivacy,
  onNavigateToSecurity 
}) => {
  if (!isOpen) return null;

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-labelledby="policy-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-white w-full max-w-2xl max-h-[85vh] rounded-2xl border border-brand-border shadow-elevated overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-5 border-b border-brand-border flex items-center justify-between bg-brand-card-green/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-mint text-brand-emerald-dark flex items-center justify-center">
              {type === 'security' ? <ShieldCheck className="w-5 h-5 text-brand-emerald-deep" /> : <Lock className="w-5 h-5 text-brand-emerald-deep" />}
            </div>
            <h3 id="policy-modal-title" className="text-base font-bold text-brand-text">
              {type === 'security' ? 'Responsible Scanning & Safety Policy' : 'Privacy & Data Retention Policy'}
            </h3>
          </div>

          <button 
            onClick={onClose} 
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-brand-text-secondary leading-relaxed">
          {type === 'security' ? (
            <>
              <h4 className="font-bold text-brand-text text-sm">1. Non-Destructive Public Baseline Testing</h4>
              <p>
                Baseline public audits perform exclusively safe HTTP requests, browser rendering (Google Lighthouse), and passive configuration checks. The platform does not alter server files, perform automated exploitation, execute destructive denial-of-service, or tamper with customer databases.
              </p>

              <h4 className="font-bold text-brand-text text-sm">2. Server-Side Request Forgery (SSRF) Defense</h4>
              <p>
                All user-supplied targets pass through rigorous network validation before worker dispatch. Target hostnames are resolved to IP addresses; requests directed toward loopback (127.0.0.1/8), private subnets (RFC 1918), AWS instance metadata (169.254.169.254), or link-local addresses are rejected immediately.
              </p>

              <h4 className="font-bold text-brand-text text-sm">3. Gated Active Scanning with Domain Authorization</h4>
              <p>
                Deeper vulnerability checks using OWASP ZAP and ProjectDiscovery Nuclei templates are strictly reserved for verified domain owners. Authorization must be demonstrated via cryptographic DNS TXT record or HTML meta tag challenge.
              </p>

              <h4 className="font-bold text-brand-text text-sm">4. Rate Limiting and Egress Bounds</h4>
              <p>
                Audit workers enforce polite request pacing, bounded concurrency, and strict execution timeouts (maximum 90 seconds for baseline inspections).
              </p>

              <div className="pt-2">
                <a
                  href="/.well-known/security.txt"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-brand-emerald-deep hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>View RFC 9116 machine-readable file (/.well-known/security.txt)</span>
                </a>
              </div>
            </>
          ) : (
            <>
              <h4 className="font-bold text-brand-text text-sm">1. Data Collected & Redaction</h4>
              <p>
                We inspect publicly accessible HTML, response headers, stylesheets, and client-side JavaScript. If sensitive API keys or credentials are observed in public web responses, our normalization engine automatically redacts the values prior to database storage.
              </p>

              <h4 className="font-bold text-brand-text text-sm">2. AWS-Native Secure Storage</h4>
              <p>
                Scan metadata is saved in Amazon DynamoDB with encryption at rest. Raw artifact files are retained in private Amazon S3 buckets accessible only via signed IAM credentials.
              </p>

              <h4 className="font-bold text-brand-text text-sm">3. Right to Erasure & Deletion</h4>
              <p>
                Users can delete individual scan reports or permanently purge their entire audit history at any time from the Settings dashboard.
              </p>

              <h4 className="font-bold text-brand-text text-sm">4. Zero AI Model Training</h4>
              <p>
                Customer audit reports, code findings, and DOM structures are strictly never used to train public generative AI or LLM models.
              </p>

              <h4 className="font-bold text-brand-text text-sm">5. Compliance Disclaimer</h4>
              <p>
                Our platform provides technical quality indicators and developer recommendations, not legal advice or certification. A cookie consent banner or robots.txt file alone does not guarantee compliance with the GDPR, CCPA, or DPDP Act.
              </p>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    triggerCookieSettingsModal();
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-emerald-deep hover:underline"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Configure Cookie & Storage Preferences</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-brand-border bg-brand-muted flex flex-wrap items-center justify-between gap-2">
          {type === 'security' && onNavigateToSecurity ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigateToSecurity();
              }}
              className="text-xs font-bold text-brand-emerald-deep hover:underline flex items-center gap-1"
            >
              <span>Read Full Security & RFC 9116 Policy</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          ) : type === 'privacy' && onNavigateToPrivacy ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigateToPrivacy();
              }}
              className="text-xs font-bold text-brand-emerald-deep hover:underline flex items-center gap-1"
            >
              <span>Read Full Privacy & Data Collection Policy</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-brand-emerald text-white text-xs font-semibold hover:bg-brand-emerald-dark transition-colors"
          >
            I Understand & Agree
          </button>
        </div>

      </div>
    </div>
  );
};
