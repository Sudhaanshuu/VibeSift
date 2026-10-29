import React, { createContext, useContext, useState } from 'react';
import { 
  AuditReport, 
  Finding, 
  SavedWebsite, 
  ScanProfile, 
  ScanStatus 
} from '../types/audit';
import { sampleReports } from '../data/sampleReports';
import { buildBasicAuditReport, buildDeepAuditReport } from '../data/auditReportBuilder';
import { submitScan } from '../lib/api/scans';
import { getReport } from '../lib/api/reports';
import { getAuthToken, USE_MOCK_API } from '../lib/api/client';
import { authService } from '../lib/api/auth';

interface AuditContextType {
  activeReport: AuditReport | null;
  setActiveReport: (report: AuditReport | null) => void;
  loadSampleReport: (sampleKey: string) => void;
  scansList: AuditReport[];
  savedWebsites: SavedWebsite[];
  isScanning: boolean;
  scanProgress: {
    status: ScanStatus;
    stageMessage: string;
    percent: number;
    currentEngine?: string;
  } | null;
  startNewScan: (url: string, profile: ScanProfile) => Promise<string>;
  rescanWebsite: (scanId: string) => Promise<void>;
  markFindingResolved: (findingId: string) => void;
  verifyDomain: (siteId: string) => Promise<boolean>;
  addSavedWebsite: (hostname: string) => SavedWebsite;
  isNewScanModalOpen: boolean;
  openNewScanModal: (defaultUrl?: string) => void;
  closeNewScanModal: () => void;
  prefilledScanUrl: string;
}

const initialSavedWebsites: SavedWebsite[] = [
  {
    id: 'site-001',
    hostname: 'vibe-landing-demo.dev',
    normalizedUrl: 'https://vibe-landing-demo.dev',
    isVerified: true,
    verificationMethod: 'dns_txt',
    verificationToken: 'siteready-verify=89f41b2a7e',
    verifiedAt: '2026-10-25T14:20:00Z',
    lastScanId: 'scan-demo-vite-001',
    lastScanDate: '2026-10-27T08:16:04Z',
    lastScanScore: 74,
    openFindingsCount: 6
  },
  {
    id: 'site-002',
    hostname: 'saas-market-starter.vercel.app',
    normalizedUrl: 'https://saas-market-starter.vercel.app',
    isVerified: false,
    verificationToken: 'siteready-verify=72c09ef43d',
    lastScanId: 'scan-demo-next-002',
    lastScanDate: '2026-10-27T07:31:02Z',
    lastScanScore: 68,
    openFindingsCount: 5
  },
  {
    id: 'site-003',
    hostname: 'vibe-pulse-app.io',
    normalizedUrl: 'https://vibe-pulse-app.io',
    isVerified: true,
    verificationMethod: 'html_meta',
    verificationToken: 'siteready-verify=41ea63db19',
    verifiedAt: '2026-10-26T09:45:00Z',
    lastScanId: 'scan-demo-saas-003',
    lastScanDate: '2026-10-27T06:11:12Z',
    lastScanScore: 71,
    openFindingsCount: 6
  }
];

const initialScans: AuditReport[] = Object.values(sampleReports);

const AuditContext = createContext<AuditContextType | undefined>(undefined);

export const AuditProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [scansList, setScansList] = useState<AuditReport[]>(initialScans);
  const [activeReport, setActiveReport] = useState<AuditReport | null>(sampleReports['react-vite-landing']);
  const [savedWebsites, setSavedWebsites] = useState<SavedWebsite[]>(initialSavedWebsites);
  const [isNewScanModalOpen, setIsNewScanModalOpen] = useState(false);
  const [prefilledScanUrl, setPrefilledScanUrl] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<{
    status: ScanStatus;
    stageMessage: string;
    percent: number;
    currentEngine?: string;
  } | null>(null);

  const loadSampleReport = (sampleKey: string) => {
    if (sampleReports[sampleKey]) {
      setActiveReport(sampleReports[sampleKey]);
    }
  };

  const openNewScanModal = (defaultUrl?: string) => {
    if (defaultUrl) setPrefilledScanUrl(defaultUrl);
    setIsNewScanModalOpen(true);
  };

  const closeNewScanModal = () => {
    setIsNewScanModalOpen(false);
    setPrefilledScanUrl('');
  };

  const addSavedWebsite = (rawUrl: string): SavedWebsite => {
    let hostname = rawUrl.replace(/^https?:\/\//i, '').split('/')[0];
    const newSite: SavedWebsite = {
      id: `site-${Date.now().toString(36)}`,
      hostname,
      normalizedUrl: `https://${hostname}`,
      isVerified: false,
      verificationToken: `siteready-verify=${Math.random().toString(36).substring(2, 12)}`,
      openFindingsCount: 0
    };
    setSavedWebsites(prev => [newSite, ...prev]);
    return newSite;
  };

  const verifyDomain = async (siteId: string): Promise<boolean> => {
    // Simulates DNS TXT / HTML Meta tag lookup
    await new Promise(r => setTimeout(r, 1200));
    setSavedWebsites(prev => prev.map(s => {
      if (s.id === siteId) {
        return {
          ...s,
          isVerified: true,
          verificationMethod: 'dns_txt',
          verifiedAt: new Date().toISOString()
        };
      }
      return s;
    }));
    return true;
  };

  const markFindingResolved = (findingId: string) => {
    if (!activeReport) return;
    const updatedFindings = activeReport.findings.map(f => {
      if (f.id === findingId) {
        return { ...f, verificationStatus: (f.verificationStatus === 'fixed' ? 'open' : 'fixed') as Finding['verificationStatus'] };
      }
      return f;
    });

    const fixedCount = updatedFindings.filter(f => f.verificationStatus === 'fixed').length;
    const newScore = Math.min(100, Math.round(activeReport.summary.readinessScore + (fixedCount * 5)));

    const updatedReport: AuditReport = {
      ...activeReport,
      summary: {
        ...activeReport.summary,
        readinessScore: newScore
      },
      findings: updatedFindings
    };

    setActiveReport(updatedReport);
    setScansList(prev => prev.map(s => s.scanId === updatedReport.scanId ? updatedReport : s));
  };

  const startNewScan = async (url: string, profile: ScanProfile): Promise<string> => {
    setIsScanning(true);
    let normalized = url.trim();
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = `https://${normalized}`;
    }
    const hostname = normalized.replace(/^https?:\/\//i, '').split('/')[0];

    // Explicit mock mode (only active when VITE_USE_MOCK_API=true or in mock test environment)
    if (USE_MOCK_API) {
      setScanProgress({
        status: 'VALIDATING',
        stageMessage: 'Validating URL syntax, resolving DNS, and checking IP egress restrictions (SSRF filter)...',
        percent: 15,
        currentEngine: 'SSRF & Egress Gatekeeper',
      });
      await new Promise((r) => setTimeout(r, 600));

      setScanProgress({
        status: 'RUNNING',
        stageMessage: 'Executing Python Public Inspector: analyzing title, canonicals, robots.txt, TLS & security headers...',
        percent: 45,
        currentEngine: 'Custom Python HTTP Inspector',
      });
      await new Promise((r) => setTimeout(r, 800));

      setScanProgress({
        status: 'RUNNING',
        stageMessage: 'Launching headless Chromium worker: auditing Core Web Vitals, LCP, CLS, and WCAG accessibility...',
        percent: 75,
        currentEngine: 'Google Lighthouse 12.x Container',
      });
      await new Promise((r) => setTimeout(r, 800));

      setScanProgress({
        status: 'NORMALIZING',
        stageMessage: 'Normalizing engine outputs, filtering false positives, calculating readiness score...',
        percent: 92,
        currentEngine: 'Deterministic Rule Engine',
      });
      await new Promise((r) => setTimeout(r, 600));

      const newScanId = `scan-${Date.now().toString(36)}`;
      const fullSimulated = profile === 'authorized_deep'
        ? buildDeepAuditReport(normalized, newScanId)
        : buildBasicAuditReport(normalized, newScanId);

      const newReport: AuditReport = {
        ...fullSimulated,
        scanId: newScanId,
        targetUrl: normalized,
        normalizedHostname: hostname,
        scanProfile: profile,
        status: 'COMPLETED',
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        durationSeconds: 28,
        isSampleData: true,
      };

      setScansList((prev) => [newReport, ...prev]);
      setActiveReport(newReport);
      setIsScanning(false);
      setScanProgress(null);
      closeNewScanModal();
      return newScanId;
    }

    // Live backend execution mode (USE_MOCK_API = false)
    let token = getAuthToken();
    if (!token && authService.loginAsDemo) {
      try {
        const session = await authService.loginAsDemo();
        token = session.token;
      } catch (authErr) {
        console.warn('[AuditContext] Demo session note:', authErr);
      }
    }

    try {
      setScanProgress({
        status: 'VALIDATING',
        stageMessage: 'Validating URL syntax, resolving DNS, and checking IP egress restrictions (SSRF filter)...',
        percent: 20,
        currentEngine: 'SSRF & Egress Gatekeeper',
      });

      const submission = await submitScan({
        url: normalized,
        profile,
        acknowledgedTerms: true,
      });

      let attempts = 0;
      while (attempts < 60) {
        attempts++;
        await new Promise((r) => setTimeout(r, 1000));
        try {
          const report = await getReport(submission.scanId);
          if (report.status === 'RUNNING') {
            setScanProgress({
              status: 'RUNNING',
              stageMessage: 'Executing live Python Inspector & Lighthouse metrics...',
              percent: 60,
              currentEngine: 'Python Inspector & Headless Chromium',
            });
          } else if (report.status === 'NORMALIZING') {
            setScanProgress({
              status: 'NORMALIZING',
              stageMessage: 'Normalizing engine outputs, calculating launch readiness score...',
              percent: 90,
              currentEngine: 'Scoring & Normalization Engine',
            });
          } else if (report.status === 'COMPLETED' || report.status === 'PARTIAL') {
            setScanProgress({
              status: report.status,
              stageMessage: report.status === 'PARTIAL' 
                ? 'Audit finished with partial engine results. Loading report...'
                : 'Audit inspection complete! Loading report...',
              percent: 100,
              currentEngine: 'Report Generator',
            });
            await new Promise((r) => setTimeout(r, 400));
            setScansList((prev) => [report, ...prev]);
            setActiveReport(report);
            setIsScanning(false);
            setScanProgress(null);
            closeNewScanModal();
            return report.scanId;
          } else if (report.status === 'FAILED') {
            setScansList((prev) => [report, ...prev]);
            setActiveReport(report);
            setIsScanning(false);
            setScanProgress(null);
            closeNewScanModal();
            const failureReason = report.errorMessage || 'Audit scan encountered an error during engine execution.';
            throw new Error(failureReason);
          } else if (report.status === 'CANCELLED') {
            setIsScanning(false);
            setScanProgress(null);
            closeNewScanModal();
            throw new Error('Audit scan was cancelled.');
          }
        } catch (pollErr: any) {
          if (pollErr.message && !pollErr.message.includes('not exist') && !pollErr.message.includes('404')) {
            throw pollErr;
          }
        }
      }
      throw new Error('Audit scan timed out waiting for engine execution.');
    } catch (err: any) {
      setIsScanning(false);
      setScanProgress(null);
      // Real error is surfaced with actual reason, never silently replaced with mock report
      throw err;
    }
  };

  const rescanWebsite = async (scanId: string) => {
    const existing = scansList.find(s => s.scanId === scanId);
    if (!existing) return;
    await startNewScan(existing.targetUrl, existing.scanProfile);
  };

  return (
    <AuditContext.Provider
      value={{
        activeReport,
        setActiveReport,
        loadSampleReport,
        scansList,
        savedWebsites,
        isScanning,
        scanProgress,
        startNewScan,
        rescanWebsite,
        markFindingResolved,
        verifyDomain,
        addSavedWebsite,
        isNewScanModalOpen,
        openNewScanModal,
        closeNewScanModal,
        prefilledScanUrl
      }}
    >
      {children}
    </AuditContext.Provider>
  );
};

export const useAudit = () => {
  const context = useContext(AuditContext);
  if (!context) {
    throw new Error('useAudit must be used within an AuditProvider');
  }
  return context;
};
