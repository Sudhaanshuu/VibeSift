export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type Category = 
  | 'seo' 
  | 'performance' 
  | 'accessibility' 
  | 'security' 
  | 'cookies' 
  | 'exposure';

export type Confidence = 'certain' | 'high' | 'medium' | 'low';

export type DetectionMethod = 'passive' | 'heuristic' | 'active';

export type EngineType = 'custom-python' | 'lighthouse' | 'owasp-zap' | 'nuclei';

export type VerificationStatus = 'open' | 'fixed' | 'waived' | 'cannot_verify';

export interface FindingEvidence {
  request?: string;
  responseSnippet?: string;
  domSelector?: string;
  observedHeader?: string;
  expectedHeader?: string;
  metrics?: Record<string, string | number>;
  reproductionCurl?: string;
}

export interface FindingRemediation {
  summary: string;
  codeSnippet?: string;
  diffBefore?: string;
  diffAfter?: string;
  frameworkNotes?: string;
  docUrl?: string;
}

export interface Finding {
  id: string;
  ruleId: string;
  category: Category;
  severity: Severity;
  confidence: Confidence;
  title: string;
  description: string;
  affectedUrl: string;
  detectionMethod: DetectionMethod;
  engine: EngineType;
  evidence: FindingEvidence;
  impact: string;
  remediation: FindingRemediation;
  verificationStatus: VerificationStatus;
  aiExplanation?: string;
}

export type ScanStatus = 
  | 'QUEUED' 
  | 'VALIDATING' 
  | 'RUNNING' 
  | 'NORMALIZING' 
  | 'COMPLETED' 
  | 'PARTIAL' 
  | 'FAILED' 
  | 'CANCELLED';

export type ScanProfile = 'baseline_public' | 'authorized_deep';

export interface EngineExecutionStatus {
  engine: EngineType | string;
  displayName: string;
  status: 'passed' | 'partial' | 'failed' | 'skipped_unauthorized';
  message?: string;
  executionTimeMs?: number;
}

export interface ReportSummary {
  totalFindings: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  readinessScore: number; // 0 to 100
  categoryScores: Record<Category, number>;
  executiveSummary?: string;
}

export interface AuditReport {
  scanId: string;
  targetUrl: string;
  normalizedHostname: string;
  scanProfile: ScanProfile;
  status: ScanStatus;
  createdAt: string;
  completedAt?: string;
  durationSeconds?: number;
  summary: ReportSummary;
  enginesRun: EngineExecutionStatus[];
  checksNotPerformed: string[];
  findings: Finding[];
  isSampleData?: boolean;
}

export interface SavedWebsite {
  id: string;
  hostname: string;
  normalizedUrl: string;
  isVerified: boolean;
  verificationMethod?: 'dns_txt' | 'html_meta';
  verificationToken?: string;
  verifiedAt?: string;
  lastScanId?: string;
  lastScanDate?: string;
  lastScanScore?: number;
  openFindingsCount?: number;
  totalScans?: number;
  latestScore?: number;
  lastScannedAt?: string;
  latestScanId?: string;
  averageScore?: number;
  scoreTrend?: { prevScore: number; delta: number };
}

export interface ScoreHistoryItem {
  scanId: string;
  createdAt: string;
  readinessScore: number;
  critical: number;
  high: number;
  medium?: number;
}

export interface SiteStats {
  hostname: string;
  siteId?: string;
  totalScans: number;
  latestScore: number | null;
  previousScore?: number | null;
  scoreDelta?: number | null;
  averageScore: number | null;
  lastScannedAt: string | null;
  latestScanId?: string | null;
  scoreHistory: ScoreHistoryItem[];
  categoryAverages: Record<string, number>;
  findingsSummary: {
    total: number;
    open: number;
    fixed: number;
    waived: number;
  };
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  isDemoUser: boolean;
  plan: 'free' | 'verified_developer';
}
