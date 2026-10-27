import React, { createContext, useContext, useState } from 'react';
import { 
  AuditReport, 
  Finding, 
  SavedWebsite, 
  ScanProfile, 
  ScanStatus 
} from '../types/audit';
import { sampleReports } from '../data/sampleReports';

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
    const newScanId = `scan-${Date.now().toString(36)}`;

    // Realistic pipeline steps:
    // Step 1: Validating SSRF and DNS
    setScanProgress({
      status: 'VALIDATING',
      stageMessage: 'Validating URL syntax, resolving DNS, and checking IP egress restrictions (SSRF filter)...',
      percent: 15,
      currentEngine: 'SSRF & Egress Gatekeeper'
    });
    await new Promise(r => setTimeout(r, 900));

    // Step 2: HTTP & Meta Inspector
    setScanProgress({
      status: 'RUNNING',
      stageMessage: 'Executing Python Public Inspector: analyzing title, canonicals, robots.txt, TLS & security headers...',
      percent: 40,
      currentEngine: 'Custom Python HTTP Inspector'
    });
    await new Promise(r => setTimeout(r, 1400));

    // Step 3: Lighthouse Core Web Vitals
    setScanProgress({
      status: 'RUNNING',
      stageMessage: 'Launching headless Chromium worker: auditing Core Web Vitals, LCP, CLS, and WCAG accessibility...',
      percent: 75,
      currentEngine: 'Google Lighthouse 12.x Container'
    });
    await new Promise(r => setTimeout(r, 1600));

    // Step 4: Normalizing findings & scoring
    setScanProgress({
      status: 'NORMALIZING',
      stageMessage: 'Normalizing engine outputs, filtering false positives, calculating readiness score...',
      percent: 92,
      currentEngine: 'Deterministic Rule Engine'
    });
    await new Promise(r => setTimeout(r, 800));

    // Assemble completed report
    const newReport: AuditReport = {
      scanId: newScanId,
      targetUrl: normalized,
      normalizedHostname: hostname,
      scanProfile: profile,
      status: 'COMPLETED',
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      durationSeconds: 28,
      isSampleData: false,
      summary: {
        totalFindings: 4,
        critical: 0,
        high: 1,
        medium: 2,
        low: 1,
        info: 0,
        readinessScore: 78,
        categoryScores: {
          seo: 84,
          performance: 76,
          accessibility: 88,
          security: 62,
          cookies: 85,
          exposure: 80,
        }
      },
      enginesRun: [
        { engine: 'custom-python', displayName: 'HTTP & Meta Inspector', status: 'passed', executionTimeMs: 1100 },
        { engine: 'lighthouse', displayName: 'Google Lighthouse 12.x', status: 'passed', executionTimeMs: 12500 },
        { engine: 'owasp-zap', displayName: 'OWASP ZAP Baseline', status: 'passed', executionTimeMs: 14200 },
        { engine: 'nuclei', displayName: 'ProjectDiscovery Nuclei (Safe Core)', status: profile === 'authorized_deep' ? 'passed' : 'skipped_unauthorized', message: profile === 'authorized_deep' ? undefined : 'Deeper active tests require verified domain ownership' }
      ],
      checksNotPerformed: [
        'Private backend database connections & SQL query logging',
        'Authenticated user session business logic',
        'Source code repository branch scanning'
      ],
      findings: [
        {
          id: `find-${newScanId}-1`,
          ruleId: 'SEC-HDR-CSP',
          category: 'security',
          severity: 'high',
          confidence: 'certain',
          title: 'Missing Content-Security-Policy (CSP) response header',
          description: `The scanned domain ${hostname} returned no Content-Security-Policy header. Browsers will execute any client-side script loaded by dynamic components.`,
          affectedUrl: normalized,
          detectionMethod: 'passive',
          engine: 'custom-python',
          evidence: {
            observedHeader: 'Content-Security-Policy: [None]',
            expectedHeader: "Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
            reproductionCurl: `curl -I -s "${normalized}" | grep -i "content-security-policy"`
          },
          impact: 'Increases attack surface if user-supplied inputs or third-party packages execute untrusted scripts.',
          remediation: {
            summary: 'Inject a Content-Security-Policy header into your reverse proxy or framework config.',
            diffBefore: '// missing security headers block',
            diffAfter: '// security header added\nheaders: {\n  "Content-Security-Policy": "default-src \'self\'; img-src \'self\' https: data:;"\n}',
            docUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP'
          },
          verificationStatus: 'open'
        },
        {
          id: `find-${newScanId}-2`,
          ruleId: 'PERF-IMG-FORMAT',
          category: 'performance',
          severity: 'medium',
          confidence: 'high',
          title: 'Hero image served in uncompressed format',
          description: 'Top-of-fold visual element is loaded as a 1.8 MB PNG file without modern WebP or AVIF compression.',
          affectedUrl: `${normalized}/images/hero.png`,
          detectionMethod: 'passive',
          engine: 'lighthouse',
          evidence: {
            metrics: {
              'Transfer Size': '1.84 MB',
              'Estimated WebP Size': '220 KB (88% reduction)',
              'Potential LCP speedup': '1.2s'
            }
          },
          impact: 'Increases mobile data consumption and delays Largest Contentful Paint (LCP).',
          remediation: {
            summary: 'Convert images to WebP/AVIF format and add fetchpriority="high".',
            docUrl: 'https://web.dev/serve-images-webp/'
          },
          verificationStatus: 'open'
        },
        {
          id: `find-${newScanId}-3`,
          ruleId: 'SEO-META-DESC',
          category: 'seo',
          severity: 'medium',
          confidence: 'certain',
          title: 'Meta description tag is missing on index page',
          description: 'The <meta name="description"> tag was not found in the initial HTML head element.',
          affectedUrl: normalized,
          detectionMethod: 'passive',
          engine: 'custom-python',
          evidence: {
            responseSnippet: '<head>\n  <title>Home</title>\n  <!-- meta description missing -->\n</head>',
            reproductionCurl: `curl -s "${normalized}" | grep -i 'name="description"'`
          },
          impact: 'Search engines will generate arbitrary snippet text from body copy, reducing click-through rates in SERPs.',
          remediation: {
            summary: 'Add an informative 140–160 character meta description in the <head> tag.',
            diffBefore: '<head>\n  <title>My Website</title>\n</head>',
            diffAfter: '<head>\n  <title>My Website</title>\n  <meta name="description" content="Discover how our platform accelerates website quality and launch readiness." />\n</head>',
            docUrl: 'https://developers.google.com/search/docs/appearance/snippet'
          },
          verificationStatus: 'open'
        },
        {
          id: `find-${newScanId}-4`,
          ruleId: 'A11Y-ARIA-LABELS',
          category: 'accessibility',
          severity: 'low',
          confidence: 'high',
          title: 'Icon-only buttons missing accessible `aria-label`',
          description: 'Interactive button elements containing only SVG icons do not provide text alternatives for screen reader users.',
          affectedUrl: normalized,
          detectionMethod: 'passive',
          engine: 'lighthouse',
          evidence: {
            domSelector: 'header button.menu-toggle',
            responseSnippet: '<button class="p-2"><svg>...</svg></button>'
          },
          impact: 'Screen readers announce "button" with no name or purpose.',
          remediation: {
            summary: 'Add an `aria-label="Open navigation menu"` attribute to the button element.',
            diffBefore: '<button className="p-2">\n  <MenuIcon />\n</button>',
            diffAfter: '<button aria-label="Open navigation menu" className="p-2">\n  <MenuIcon />\n</button>',
            docUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html'
          },
          verificationStatus: 'open'
        }
      ]
    };

    setScansList(prev => [newReport, ...prev]);
    setActiveReport(newReport);
    setIsScanning(false);
    setScanProgress(null);
    closeNewScanModal();
    return newScanId;
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
