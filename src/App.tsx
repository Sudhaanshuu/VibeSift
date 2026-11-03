import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuditProvider, useAudit } from './context/AuditContext';

// Landing Page Components
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

// Real App Routes & Pages
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';
import { DashboardPage } from './pages/DashboardPage';
import { NewScanPage } from './pages/NewScanPage';
import { ScanDetailPage } from './pages/ScanDetailPage';
import { HistoryPage } from './pages/HistoryPage';
import { SitesPage } from './pages/SitesPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { NotFoundPage } from './pages/NotFoundPage';

// Global Modals & Legal Utilities
import { NewScanModal } from './components/dashboard/NewScanModal';
import { LoginModal } from './components/common/LoginModal';
import { PolicyModal } from './components/common/PolicyModals';
import { CookieConsentBanner } from './components/common/CookieConsentBanner';
import { ErrorBoundary } from './components/common/ErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, openLoginModal } = useAuth();
  const { setActiveReport, scansList } = useAudit();

  // Policy Modals State
  const [policyModal, setPolicyModal] = useState<{ isOpen: boolean; type: 'security' | 'privacy' }>({
    isOpen: false,
    type: 'security',
  });

  // Dynamic SEO metadata & title manager based on route
  useEffect(() => {
    const path = location.pathname.toLowerCase();
    if (path.startsWith('/app/scans/new')) {
      document.title = 'New Launch Audit — VibeSift';
    } else if (path.startsWith('/app/scans/')) {
      document.title = 'Audit Report & Diffs — VibeSift';
    } else if (path.startsWith('/app/history')) {
      document.title = 'Scan History — VibeSift';
    } else if (path.startsWith('/app/sites')) {
      document.title = 'Saved Websites & Verification — VibeSift';
    } else if (path.startsWith('/app/settings')) {
      document.title = 'Settings & Account — VibeSift';
    } else if (path.startsWith('/app')) {
      document.title = 'Developer Console & Live Audits — VibeSift by Pixir';
    } else if (path === '/methodology') {
      document.title = 'Audit Methodology & Detection Vectors — VibeSift by Pixir';
    } else if (path === '/sample-reports') {
      document.title = 'Sample Launch Readiness Reports & Diffs — VibeSift by Pixir';
    } else if (path === '/remediation') {
      document.title = 'Actionable Remediation Specs & Quick Fixes — VibeSift by Pixir';
    } else if (path === '/privacy') {
      document.title = 'Privacy Policy & Data Collection Disclosures — VibeSift by Pixir';
    } else if (path === '/security') {
      document.title = 'Security & Responsible Disclosure (RFC 9116) — VibeSift by Pixir';
    } else if (path === '/login') {
      document.title = 'Sign In — VibeSift';
    } else if (path === '/signup') {
      document.title = 'Create Developer Account — VibeSift';
    } else {
      document.title = 'VibeSift by Pixir — Website Launch-Readiness Auditor';
    }
  }, [location.pathname]);

  const onBackToHome = () => {
    navigate('/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToDashboard = () => {
    if (!isAuthenticated) {
      openLoginModal();
      return;
    }
    navigate('/app');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToMethodology = () => {
    navigate('/methodology');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToSampleReports = () => {
    navigate('/sample-reports');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToRemediation = () => {
    navigate('/remediation');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToPrivacy = () => {
    navigate('/privacy');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToSecurity = () => {
    navigate('/security');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const commonNavProps = {
    onBackToHome,
    onNavigateToApp: navigateToDashboard,
    onNavigateToMethodology: navigateToMethodology,
    onNavigateToSampleReports: navigateToSampleReports,
    onNavigateToRemediation: navigateToRemediation,
    onNavigateToPrivacy: navigateToPrivacy,
    onNavigateToSecurity: navigateToSecurity,
    onOpenPrivacyNotice: () => setPolicyModal({ isOpen: true, type: 'privacy' }),
    onOpenSecurityPolicy: () => setPolicyModal({ isOpen: true, type: 'security' }),
  };

  return (
    <div className="min-h-screen bg-white text-brand-text font-sans antialiased selection:bg-brand-mint selection:text-brand-emerald-deep">
      <Routes>
        {/* View 1: Home Landing Page */}
        <Route
          path="/"
          element={
            <div className="flex flex-col min-h-screen">
              <Navbar onNavigateToApp={navigateToDashboard} />

              <main className="flex-1">
                <HeroSection onViewSampleReport={navigateToSampleReports} />
                <CapabilityStrip />
                <LaunchStudioSection />
                <BeforeAfterPrecisionSection />
                <ShowcaseUseCasesSection onExploreReport={navigateToSampleReports} />
                <HowItWorksSection />
                <PrivacyTestingScopeSection />
                <FaqSection />
                <PreFooterCta />
              </main>

              <Footer {...commonNavProps} />
            </div>
          }
        />

        {/* View 2: Dedicated Audit Methodology & Vectors Page */}
        <Route
          path="/methodology"
          element={<AuditMethodologyPage {...commonNavProps} />}
        />

        {/* View 3: Dedicated Sample Audit Reports & Diffs Page */}
        <Route
          path="/sample-reports"
          element={<SampleReportsPage {...commonNavProps} />}
        />

        {/* View 4: Dedicated Actionable Remediation Specs Page */}
        <Route
          path="/remediation"
          element={<RemediationSpecsPage {...commonNavProps} />}
        />

        {/* View 5: Dedicated Privacy Policy & Data Collection Page */}
        <Route
          path="/privacy"
          element={<PrivacyPolicyPage {...commonNavProps} />}
        />

        {/* View 6: Dedicated Security & Responsible Disclosure (RFC 9116) Page */}
        <Route
          path="/security"
          element={<SecurityPolicyPage {...commonNavProps} />}
        />

        {/* Auth Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Authenticated Dashboard Routes */}
        <Route path="/app" element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="scans/new" element={<NewScanPage />} />
            <Route
              path="scans/:scanId"
              element={
                <ErrorBoundary>
                  <ScanDetailPage />
                </ErrorBoundary>
              }
            />
            <Route path="history" element={<HistoryPage />} />
            <Route path="sites" element={<SitesPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>

        {/* Legacy /dashboard alias */}
        <Route path="/dashboard" element={<Navigate to="/app" replace />} />

        {/* 404 Catch-All */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      {/* Global Modals */}
      <NewScanModal
        onScanComplete={(scanId) => {
          if (scanId) {
            const found = scansList.find((s) => s.scanId === scanId);
            if (found) {
              setActiveReport(found);
            }
            navigate(`/app/scans/${scanId}`);
          } else {
            navigate('/app');
          }
          window.scrollTo({ top: 0, behavior: 'smooth' });
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
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AuditProvider>
            <AppContent />
          </AuditProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};
