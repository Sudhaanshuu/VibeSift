import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAudit } from '../context/AuditContext';
import { PublicNavbar } from '../components/layout/PublicNavbar';
import { HeroSection } from '../components/landing/HeroSection';
import { CapabilityStrip } from '../components/landing/CapabilityStrip';
import { LaunchStudioSection } from '../components/landing/LaunchStudioSection';
import { BeforeAfterPrecisionSection } from '../components/landing/BeforeAfterPrecisionSection';
import { ShowcaseUseCasesSection } from '../components/landing/ShowcaseUseCasesSection';
import { ProblemSection } from '../components/landing/ProblemSection';
import { HowItWorksSection } from '../components/landing/HowItWorksSection';
import { CoreCapabilitiesGrid } from '../components/landing/CoreCapabilitiesGrid';
import { InteractiveReportPreview } from '../components/landing/InteractiveReportPreview';
import { BeforeAfterSection } from '../components/landing/BeforeAfterSection';
import { SampleReportsSection } from '../components/landing/SampleReportsSection';
import { OutputRemediationSection } from '../components/landing/OutputRemediationSection';
import { PrivacyTestingScopeSection } from '../components/landing/PrivacyTestingScopeSection';
import { FaqSection } from '../components/landing/FaqSection';
import { PreFooterCta } from '../components/landing/PreFooterCta';
import { Footer } from '../components/landing/Footer';
import { PolicyModal } from '../components/common/PolicyModals';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { loadSampleReport } = useAudit();

  const [policyModal, setPolicyModal] = useState<{
    isOpen: boolean;
    type: 'security' | 'privacy';
  }>({
    isOpen: false,
    type: 'security',
  });

  const handleSelectSample = (sampleKey: string) => {
    loadSampleReport(sampleKey);
    const el = document.getElementById('sample-reports');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white text-brand-text font-sans antialiased selection:bg-brand-mint selection:text-brand-emerald-deep">
      {/* Public Navbar with Router navigation */}
      <PublicNavbar />

      <main className="flex-1">
        {/* 1. Hero with URL input & sample report link */}
        <HeroSection
          onViewSampleReport={() => {
            const el = document.getElementById('sample-reports');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
        />

        {/* 2. Capability Strip */}
        <CapabilityStrip />

        {/* 3. Launch Studio: Drop Any Website URL & Developer Avatars */}
        <LaunchStudioSection />

        {/* 4. Precision Benchmark: Before / After Split Slider with Real Mockup Images */}
        <BeforeAfterPrecisionSection />

        {/* 5. Multi-Sector Showcase: 4 Visual Image Cards */}
        <ShowcaseUseCasesSection
          onExploreReport={() => {
            const el = document.getElementById('sample-reports');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
        />

        {/* 6. Product Value Proposition */}
        <div id="features">
          <ProblemSection
            onExploreRemediation={() => {
              const el = document.getElementById('sample-reports');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
          />
        </div>

        {/* 7. How It Works */}
        <div id="how-it-works">
          <HowItWorksSection />
        </div>

        {/* 8. Feature Grid: Core Capabilities */}
        <CoreCapabilitiesGrid />

        {/* 9. Real Product Dashboard Preview (Pure React/CSS) */}
        <div id="interactive-preview">
          <InteractiveReportPreview />
        </div>

        {/* 10. Before-and-After Fix Comparison with Code Diffs */}
        <BeforeAfterSection />

        {/* 11. Sample Report Cards */}
        <div id="sample-reports">
          <SampleReportsSection onSelectSample={handleSelectSample} />
        </div>

        {/* 12. What the User Receives (Output & Remediation) */}
        <OutputRemediationSection />

        {/* 13. Privacy and Scanning-Scope Explanation */}
        <PrivacyTestingScopeSection />

        {/* 14. FAQs */}
        <div id="faq">
          <FaqSection />
        </div>

        {/* 15. Pre-Footer Call to Action */}
        <PreFooterCta />
      </main>

      {/* 16. Multi-Column Footer */}
      <Footer
        onNavigateToApp={() => navigate('/app')}
        onNavigateToPrivacy={() => navigate('/privacy')}
        onNavigateToSecurity={() => navigate('/security')}
        onOpenPrivacyNotice={() => setPolicyModal({ isOpen: true, type: 'privacy' })}
        onOpenSecurityPolicy={() => setPolicyModal({ isOpen: true, type: 'security' })}
      />

      {/* Legal & Policy Modals */}
      <PolicyModal
        isOpen={policyModal.isOpen}
        onClose={() => setPolicyModal({ isOpen: false, type: 'security' })}
        type={policyModal.type}
        onNavigateToPrivacy={() => navigate('/privacy')}
        onNavigateToSecurity={() => navigate('/security')}
      />
    </div>
  );
};
