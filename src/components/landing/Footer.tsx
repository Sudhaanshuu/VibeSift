import React, { useState } from 'react';
import { BrandLogo } from '../brand/BrandLogo';
import { brandConfig } from '../../config/brand';
import { triggerCookieSettingsModal } from '../../lib/cookies/cookieConsent';
import { 
  ShieldCheck, 
  Mail, 
  Globe, 
  ArrowRight, 
  Check, 
  Lock,
  FileText,
  Sliders,
  ExternalLink
} from 'lucide-react';

interface FooterProps {
  onNavigateToApp?: () => void;
  onNavigateToMethodology?: () => void;
  onNavigateToSampleReports?: () => void;
  onNavigateToRemediation?: () => void;
  onNavigateToPrivacy?: () => void;
  onNavigateToSecurity?: () => void;
  onOpenPrivacyNotice?: () => void;
  onOpenSecurityPolicy?: () => void;
  onOpenCookiePreferences?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ 
  onNavigateToApp,
  onNavigateToMethodology,
  onNavigateToSampleReports,
  onNavigateToRemediation,
  onNavigateToPrivacy,
  onNavigateToSecurity,
  onOpenPrivacyNotice,
  onOpenSecurityPolicy,
  onOpenCookiePreferences
}) => {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setSubscribed(true);
    setTimeout(() => {
      setSubscribed(false);
      setNewsletterEmail('');
    }, 4000);
  };

  return (
    <footer className="bg-brand-mint-dark border-t border-brand-border text-brand-text pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 mb-14">
          
          {/* Brand & Mission Column (Span 4) */}
          <div className="lg:col-span-4 space-y-4">
            <BrandLogo size="md" showTagline={false} />
            
            <p className="text-xs sm:text-sm text-brand-text-secondary leading-relaxed max-w-sm">
              Independent pre-launch auditor for web applications built with AI coding assistants, website builders, and modern development frameworks.
            </p>

            <div className="pt-2 text-xs text-brand-text-secondary space-y-1.5 font-mono">
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-brand-emerald" />
                <span>Domain: </span>
                <a href="https://vibesift.pixir.in" className="text-brand-emerald-deep font-bold hover:underline">
                  {brandConfig.domain}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-brand-emerald" />
                <span>Contact: </span>
                <a href={`mailto:${brandConfig.contactEmail}`} className="text-brand-emerald-deep font-bold hover:underline">
                  {brandConfig.contactEmail}
                </a>
              </div>
            </div>

            {/* System Status Pill */}
            <div className="pt-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-brand-border text-xs text-brand-emerald-deep font-bold shadow-subtle">
                <span className="flex h-2 w-2 rounded-full bg-brand-emerald animate-pulse" />
                <span>All 24 Scanning Engines Operational</span>
              </div>
            </div>
          </div>

          {/* Links Column 1: Studio & Capabilities (Span 3) */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-brand-text">
              Studio & Capabilities
            </h4>
            <ul className="space-y-2 text-xs text-brand-text-secondary">
              <li><a href="#precision" className="hover:text-brand-emerald-deep font-medium transition-colors">Precision Benchmark</a></li>
              <li><a href="#studio" className="hover:text-brand-emerald-deep font-medium transition-colors">Pre-Launch Studio</a></li>
              <li><a href="#showcase" className="hover:text-brand-emerald-deep font-medium transition-colors">Showcase Matrix</a></li>
              
              {/* Separate Page Links */}
              <li className="pt-1.5 border-t border-brand-border/60">
                <button
                  type="button"
                  onClick={onNavigateToMethodology}
                  className="hover:text-brand-emerald-deep font-semibold text-brand-emerald-deep transition-colors text-left flex items-center gap-1"
                >
                  <span>Audit Methodology & Vectors</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onNavigateToSampleReports}
                  className="hover:text-brand-emerald-deep font-semibold text-brand-emerald-deep transition-colors text-left flex items-center gap-1"
                >
                  <span>Sample Audit Reports & Diffs</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onNavigateToRemediation}
                  className="hover:text-brand-emerald-deep font-semibold text-brand-emerald-deep transition-colors text-left flex items-center gap-1"
                >
                  <span>Actionable Remediation Specs</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </li>
            </ul>
          </div>

          {/* Links Column 2: Governance & Policies (Span 2) */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-brand-text">
              Trust & Legal
            </h4>
            <ul className="space-y-2 text-xs text-brand-text-secondary">
              <li>
                <button 
                  onClick={onNavigateToSecurity || onOpenSecurityPolicy} 
                  className="hover:text-brand-emerald-deep font-medium transition-colors text-left"
                >
                  Responsible Scanning (RFC 9116)
                </button>
              </li>
              <li>
                <button 
                  onClick={onNavigateToPrivacy || onOpenPrivacyNotice} 
                  className="hover:text-brand-emerald-deep font-medium transition-colors text-left"
                >
                  Privacy & Data Collection
                </button>
              </li>
              <li>
                <button 
                  onClick={() => {
                    if (onOpenCookiePreferences) {
                      onOpenCookiePreferences();
                    } else {
                      triggerCookieSettingsModal();
                    }
                  }} 
                  className="hover:text-brand-emerald-deep font-medium transition-colors text-left flex items-center gap-1"
                >
                  <Sliders className="w-3 h-3 text-brand-emerald" />
                  <span>Cookie Preferences</span>
                </button>
              </li>
              <li className="pt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-mono text-brand-text-secondary">
                <a href="/robots.txt" target="_blank" rel="noopener noreferrer" className="hover:text-brand-emerald-deep underline">
                  robots.txt
                </a>
                <span>·</span>
                <a href="/.well-known/security.txt" target="_blank" rel="noopener noreferrer" className="hover:text-brand-emerald-deep underline">
                  security.txt
                </a>
                <span>·</span>
                <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer" className="hover:text-brand-emerald-deep underline">
                  sitemap.xml
                </a>
              </li>
              <li><a href="#scope" className="hover:text-brand-emerald-deep font-medium transition-colors">Testing Scope Boundaries</a></li>
              <li><a href="#faq" className="hover:text-brand-emerald-deep font-medium transition-colors">Audit Engine FAQ</a></li>
              <li><button onClick={onNavigateToApp} className="hover:text-brand-emerald-deep font-medium transition-colors text-left font-semibold">Developer Console</button></li>
            </ul>
          </div>

          {/* Column 3: Newsletter & Security Updates (Span 3) */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-brand-text">
              Pre-Launch Intelligence
            </h4>
            <p className="text-xs text-brand-text-secondary leading-relaxed">
              Get weekly updates on common AI-scaffolding defects, new browser security headers, and Core Web Vitals changes.
            </p>

            <form onSubmit={handleSubscribe} className="space-y-2 pt-1">
              <div className="flex rounded-full bg-white border border-brand-border p-1 shadow-subtle focus-within:border-brand-emerald">
                <input
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="developer@company.com"
                  className="text-xs bg-transparent px-3 py-1.5 w-full focus:outline-none font-mono text-brand-text"
                  required
                />
                <button
                  type="submit"
                  className="p-1.5 rounded-full bg-brand-emerald hover:bg-brand-emerald-dark text-white shrink-0 transition-colors"
                  aria-label="Subscribe"
                >
                  {subscribed ? <Check className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                </button>
              </div>

              {subscribed && (
                <p className="text-[11px] text-brand-emerald-deep font-bold">Subscribed! Welcome to VibeSift.</p>
              )}
            </form>

            <div className="pt-2 text-[11px] text-brand-text-secondary flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-brand-emerald" />
              <span>Zero spam · One-click unsubscribe</span>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-brand-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-brand-text-secondary">
          <div className="flex flex-wrap items-center gap-2">
            <span>© {brandConfig.copyrightYear}</span>
            <strong className="text-brand-text font-bold">VibeSift by Pixir</strong>
            <span>· All rights reserved.</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium">
            <button
              onClick={onNavigateToPrivacy || onOpenPrivacyNotice}
              className="hover:text-brand-emerald-deep hover:underline transition-colors"
            >
              Privacy Policy
            </button>
            <span>·</span>
            <button
              onClick={onNavigateToSecurity || onOpenSecurityPolicy}
              className="hover:text-brand-emerald-deep hover:underline transition-colors"
            >
              Security Policy
            </button>
            <span>·</span>
            <button
              onClick={() => {
                if (onOpenCookiePreferences) onOpenCookiePreferences();
                else triggerCookieSettingsModal();
              }}
              className="hover:text-brand-emerald-deep hover:underline transition-colors"
            >
              Cookie Settings
            </button>
            <span>·</span>
            <span className="flex items-center gap-1 text-brand-emerald-deep">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald"></span>
              Client-Safe Engine
            </span>
            <span>·</span>
            <span>vibesift.pixir.in</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
