import React, { useState, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuditProvider, useAudit } from './context/AuditContext';
import { brandConfig } from './config/brand';

// Home Landing Page Components
import { Navbar } from './components/landing/Navbar';
import { HeroSection } from './components/landing/HeroSection';
import { CapabilityStrip } from './components/landing/CapabilityStrip';
import { LaunchStudioSection } from './components/landing/LaunchStudioSection';
import { BeforeAfterPrecisionSection } from './components/landing/BeforeAfterPrecisionSection';
import { ShowcaseUseCasesSection } from './components/landing/ShowcaseUseCasesSection';
import { HowItWorksSection } from './components/landing/HowItWorksSection';
import { PrivacyTestingScopeSection } from './components/landing/PrivacyTestingScopeSection';
import { FaqSection } from './components/landing/FaqSection';
import { PreFooterCta } from './components/landing/PreFooterCta';
import { Footer } from './components/landing/Footer';

// Dedicated Technical Methodology, Sample Reports, and Remediation Pages
import { AuditMethodologyPage } from './components/pages/AuditMethodologyPage';
import { SampleReportsPage } from './components/pages/SampleReportsPage';
import { RemediationSpecsPage } from './components/pages/RemediationSpecsPage';
import { PrivacyPolicyPage } from './components/pages/PrivacyPolicyPage';
import { SecurityPolicyPage } from './components/pages/SecurityPolicyPage';

// Dashboard Components
import { DashboardLayout } from './components/dashboard/DashboardLayout';
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { ScanHistoryView } from './components/dashboard/ScanHistoryView';
import { SavedWebsitesView } from './components/dashboard/SavedWebsitesView';
import { FullReportView } from './components/dashboard/FullReportView';
import { SettingsView } from './components/dashboard/SettingsView';

// Global Modals & Legal Utilities
import { NewScanModal } from './components/dashboard/NewScanModal';
import { LoginModal } from './components/common/LoginModal';
import { PolicyModal } from './components/common/PolicyModals';
import { CookieConsentBanner } from './components/common/CookieConsentBanner';

type AppView = 'landing' | 'methodology' | 'sample-reports' | 'remediation' | 'privacy' | 'security' | 'dashboard';

export const AppContent: React.FC = () => {
  const { isAuthenticated, openLoginModal } = useAuth();
  const { setActiveReport, scansList } = useAudit();

  const getInitialView = (): AppView => {
    if (typeof window === 'undefined') return 'landing';
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();

    if (path === '/privacy' || hash === '#privacy') return 'privacy';
    if (path === '/security' || hash === '#security' || hash === '#hall-of-fame') return 'security';
    if (path === '/methodology' || hash === '#methodology') return 'methodology';
    if (path === '/sample-reports' || hash === '#sample-reports') return 'sample-reports';
    if (path === '/remediation' || hash === '#remediation') return 'remediation';
    if (path === '/dashboard' || path === '/app') return 'dashboard';
    return 'landing';
  };

  // Mode: 'landing' | 'methodology' | 'sample-reports' | 'remediation' | 'privacy' | 'security' | 'dashboard'
  const [currentView, setCurrentView] = useState<AppView>(getInitialView);
  const [dashboardTab, setDashboardTab] = useState<'overview' | 'new-scan' | 'history' | 'saved-sites' | 'report' | 'settings'>('overview');

  // Policy Modals State
  const [policyModal, setPolicyModal] = useState<{ isOpen: boolean; type: 'security' | 'privacy' }>({
    isOpen: false,
    type: 'security'
  });

  // Dynamic SEO metadata & title manager
  useEffect(() => {
    const titles: Record<AppView, string> = {
      landing: 'VibeSift by Pixir — Website Launch-Readiness Auditor',
      methodology: 'Audit Methodology & Detection Vectors — VibeSift by Pixir',
      'sample-reports': 'Sample Launch Readiness Reports & Diffs — VibeSift by Pixir',
      remediation: 'Actionable Remediation Specs & Quick Fixes — VibeSift by Pixir',
      privacy: 'Privacy Policy & Data Collection Disclosures — VibeSift by Pixir',
      security: 'Security & Responsible Disclosure (RFC 9116) — VibeSift by Pixir',
      dashboard: 'Developer Console & Live Audits — VibeSift by Pixir',
    };

    if (titles[currentView]) {
      document.title = titles[currentView];
    }
  }, [currentView]);

  const handleSelectReportInApp = (scanId: string) => {
    const found = scansList.find(s => s.scanId === scanId);
    if (found) {
      setActiveReport(found);
    }
    setDashboardTab('report');
    setCurrentView('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToDashboard = () => {
    if (!isAuthenticated) {
      openLoginModal();
      return;
    }
    setCurrentView('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToLanding = () => {
    setCurrentView('landing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToMethodology = () => {
    setCurrentView('methodology');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToSampleReports = () => {
    setCurrentView('sample-reports');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToRemediation = () => {
    setCurrentView('remediation');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToPrivacy = () => {
    setCurrentView('privacy');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToSecurity = () => {
    setCurrentView('security');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white text-brand-text font-sans antialiased selection:bg-brand-mint selection:text-brand-emerald-deep">
      
      {/* View 1: Clean, Simplified High-Conversion Home Landing Page */}
      {currentView === 'landing' && (
        <div className="flex flex-col min-h-screen">
          <Navbar 
            onNavigateToApp={navigateToDashboard} 
          />

          <main className="flex-1">
            {/* 1. Hero Section with 3D Illustration & Floating Metric Tiles */}
            <HeroSection
              onViewSampleReport={navigateToSampleReports}
            />

            {/* 2. Comprehensive Launch-Readiness Dimensions (Three Core Pillars, Elevated & Non-Flat) */}
            <CapabilityStrip />

            {/* 3. Pre-Launch Studio: Drop Any Website URL & Developer Avatars */}
            <LaunchStudioSection />

            {/* 4. Precision Benchmark: Before / After Split Slider with Real Mockup Images */}
            <BeforeAfterPrecisionSection />

            {/* 5. Multi-Sector Showcase: 3 High-Impact Visual Mockup Cards */}
            <ShowcaseUseCasesSection
              onExploreReport={navigateToSampleReports}
            />

            {/* 6. How It Works (Clean 3-Step Sequence) */}
            <HowItWorksSection />

            {/* 7. Testing Scope Boundaries & Compliance Disclaimers */}
            <PrivacyTestingScopeSection />

            {/* 8. FAQ Accordion */}
            <FaqSection />

            {/* 9. Pre-Footer Call to Action */}
            <PreFooterCta />
          </main>

          {/* 10. Rich Non-Flat Footer with Status Pill, Newsletter & Subpage Routes */}
          <Footer
            onNavigateToApp={navigateToDashboard}
            onNavigateToMethodology={navigateToMethodology}
            onNavigateToSampleReports={navigateToSampleReports}
            onNavigateToRemediation={navigateToRemediation}
            onNavigateToPrivacy={navigateToPrivacy}
            onNavigateToSecurity={navigateToSecurity}
            onOpenPrivacyNotice={() => setPolicyModal({ isOpen: true, type: 'privacy' })}
            onOpenSecurityPolicy={() => setPolicyModal({ isOpen: true, type: 'security' })}
          />
        </div>
      )}

      {/* View 2: Dedicated Audit Methodology & Vectors Page */}
      {currentView === 'methodology' && (
        <AuditMethodologyPage
          onBackToHome={navigateToLanding}
          onNavigateToApp={navigateToDashboard}
          onNavigateToMethodology={navigateToMethodology}
          onNavigateToSampleReports={navigateToSampleReports}
          onNavigateToRemediation={navigateToRemediation}
          onNavigateToPrivacy={navigateToPrivacy}
          onNavigateToSecurity={navigateToSecurity}
          onOpenPrivacyNotice={() => setPolicyModal({ isOpen: true, type: 'privacy' })}
          onOpenSecurityPolicy={() => setPolicyModal({ isOpen: true, type: 'security' })}
        />
      )}

      {/* View 3: Dedicated Sample Audit Reports & Diffs Page */}
      {currentView === 'sample-reports' && (
        <SampleReportsPage
          onBackToHome={navigateToLanding}
          onNavigateToApp={navigateToDashboard}
          onNavigateToMethodology={navigateToMethodology}
          onNavigateToSampleReports={navigateToSampleReports}
          onNavigateToRemediation={navigateToRemediation}
          onNavigateToPrivacy={navigateToPrivacy}
          onNavigateToSecurity={navigateToSecurity}
          onOpenPrivacyNotice={() => setPolicyModal({ isOpen: true, type: 'privacy' })}
          onOpenSecurityPolicy={() => setPolicyModal({ isOpen: true, type: 'security' })}
        />
      )}

      {/* View 4: Dedicated Actionable Remediation Specs Page */}
      {currentView === 'remediation' && (
        <RemediationSpecsPage
          onBackToHome={navigateToLanding}
          onNavigateToApp={navigateToDashboard}
          onNavigateToMethodology={navigateToMethodology}
          onNavigateToSampleReports={navigateToSampleReports}
          onNavigateToRemediation={navigateToRemediation}
          onNavigateToPrivacy={navigateToPrivacy}
          onNavigateToSecurity={navigateToSecurity}
          onOpenPrivacyNotice={() => setPolicyModal({ isOpen: true, type: 'privacy' })}
          onOpenSecurityPolicy={() => setPolicyModal({ isOpen: true, type: 'security' })}
        />
      )}

      {/* View 5: Dedicated Privacy Policy & Data Collection Page */}
      {currentView === 'privacy' && (
        <PrivacyPolicyPage
          onBackToHome={navigateToLanding}
          onNavigateToApp={navigateToDashboard}
          onNavigateToMethodology={navigateToMethodology}
          onNavigateToSampleReports={navigateToSampleReports}
          onNavigateToRemediation={navigateToRemediation}
          onNavigateToPrivacy={navigateToPrivacy}
          onNavigateToSecurity={navigateToSecurity}
          onOpenPrivacyNotice={() => setPolicyModal({ isOpen: true, type: 'privacy' })}
          onOpenSecurityPolicy={() => setPolicyModal({ isOpen: true, type: 'security' })}
        />
      )}

      {/* View 6: Dedicated Security & Responsible Disclosure (RFC 9116) Page */}
      {currentView === 'security' && (
        <SecurityPolicyPage
          onBackToHome={navigateToLanding}
          onNavigateToApp={navigateToDashboard}
          onNavigateToMethodology={navigateToMethodology}
          onNavigateToSampleReports={navigateToSampleReports}
          onNavigateToRemediation={navigateToRemediation}
          onNavigateToPrivacy={navigateToPrivacy}
          onNavigateToSecurity={navigateToSecurity}
          onOpenPrivacyNotice={() => setPolicyModal({ isOpen: true, type: 'privacy' })}
          onOpenSecurityPolicy={() => setPolicyModal({ isOpen: true, type: 'security' })}
        />
      )}

      {/* View 7: Authenticated Developer Dashboard Console */}
      {currentView === 'dashboard' && (
        <DashboardLayout
          currentTab={dashboardTab}
          setCurrentTab={setDashboardTab}
          onBackToLanding={navigateToLanding}
        >
          {dashboardTab === 'overview' && (
            <DashboardOverview
              onViewReport={handleSelectReportInApp}
              onNavigateTab={(tab) => setDashboardTab(tab as any)}
            />
          )}

          {dashboardTab === 'history' && (
            <ScanHistoryView
              onSelectReport={handleSelectReportInApp}
            />
          )}

          {dashboardTab === 'saved-sites' && (
            <SavedWebsitesView />
          )}

          {dashboardTab === 'report' && (
            <FullReportView />
          )}

          {dashboardTab === 'settings' && (
            <SettingsView />
          )}
        </DashboardLayout>
      )}

      {/* Global Modals */}
      <NewScanModal
        onScanComplete={(scanId) => {
          if (scanId) {
            handleSelectReportInApp(scanId);
          } else {
            setCurrentView('dashboard');
            setDashboardTab('report');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
      />
      <LoginModal />
      <PolicyModal
        isOpen={policyModal.isOpen}
        onClose={() => setPolicyModal({ isOpen: false, type: 'security' })}
        type={policyModal.type}
        onNavigateToPrivacy={navigateToPrivacy}
        onNavigateToSecurity={navigateToSecurity}
      />

      {/* Cookie Consent Manager Banner & Preferences Modal */}
      <CookieConsentBanner onOpenPrivacyPolicy={navigateToPrivacy} />

    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AuditProvider>
          <AppContent />
        </AuditProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};
