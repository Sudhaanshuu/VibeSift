import React, { createContext, useContext, useState } from 'react';
import { 
  AuditReport, 
  Finding, 
  SavedWebsite, 
  ScanProfile, 
  ScanStatus 
} from '../types/audit';
import { sampleReports } from '../data/sampleReports';
import { submitScan } from '../lib/api/scans';
import { getReport } from '../lib/api/reports';
import { getAuthToken } from '../lib/api/client';

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

const AuditContext = createContext<AuditContextType | undefined>(undefined);

export const AuditProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [scansList, setScansList] = useState<AuditReport[]>([]);
  const [activeReport, setActiveReport] = useState<AuditReport | null>(null);
  const [savedWebsites, setSavedWebsites] = useState<SavedWebsite[]>([]);
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
    const hostname = rawUrl.replace(/^https?:\/\//i, '').split('/')[0];
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
    const currentScore = activeReport.summary?.readinessScore ?? 0;
    const newScore = Math.min(100, Math.round(currentScore + (fixedCount * 5)));

    const updatedReport: AuditReport = {
      ...activeReport,
      summary: {
        ...(activeReport.summary || {
          totalFindings: updatedFindings.length,
          readinessScore: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          info: 0,
          categoryScores: {},
        }),
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
            return report.scanId;
          } else if (report.status === 'CANCELLED') {
            setIsScanning(false);
            setScanProgress(null);
            closeNewScanModal();
            return submission.scanId;
          }
        } catch (pollErr: any) {
          if (pollErr.message && !pollErr.message.includes('not exist') && !pollErr.message.includes('404')) {
            throw pollErr;
          }
        }
      }

      // If execution timed out after 60 seconds
      const timeoutReport: AuditReport = {
        scanId: submission.scanId,
        ownerUserId: 'current_user',
        targetUrl: normalized,
        normalizedHostname: hostname,
        scanProfile: profile,
        status: 'FAILED',
        errorMessage: 'Audit scan timed out waiting for engine execution (the target website took longer than 60 seconds to inspect).',
        summary: {
          totalFindings: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          info: 0,
          readinessScore: 0,
          categoryScores: {},
        },
        findings: [],
        enginesRun: [],
        checksNotPerformed: [],
        checks: [],
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        durationSeconds: 60,
      };
      setScansList((prev) => [timeoutReport, ...prev]);
      setActiveReport(timeoutReport);
      setIsScanning(false);
      setScanProgress(null);
      closeNewScanModal();
      return timeoutReport.scanId;
    } catch (err: any) {
      setIsScanning(false);
      setScanProgress(null);
      let message = err.message || 'Scan dispatch failed';
      if (message.includes('Failed to fetch') || message.includes('NetworkError') || message.includes('ECONNREFUSED')) {
        message = 'Could not connect to the backend server. If running locally, make sure the backend is running via "npm run dev".';
      }
      throw new Error(message);
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
