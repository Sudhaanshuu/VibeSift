export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type Category = 
  | 'seo' 
  | 'performance' 
  | 'accessibility' 
  | 'security' 
  | 'cookies' 
  | 'exposure'
  | 'privacy'
  | 'completeness'
  | 'trust'
  | 'infrastructure'
  | 'abuse';

export type Confidence = 'certain' | 'high' | 'medium' | 'low';

export type DetectionMethod = 'passive' | 'heuristic' | 'active';

export type EngineType = 'custom-python' | 'lighthouse' | 'owasp-zap' | 'nuclei';

export type VerificationStatus = 'open' | 'fixed' | 'waived' | 'cannot_verify';

export type CheckStatus = 
  | 'pass' 
  | 'fail' 
  | 'warning' 
  | 'info' 
  | 'not_tested' 
  | 'unknown' 
  | 'not_applicable';

export type FindingType = 
  | 'confirmed' 
  | 'suspected' 
  | 'informational'
  | 'confirmed_vulnerability'
  | 'potential_risk'
  | 'hardening_signal'
  | 'inconclusive';

export type AuditMode = 
  | 'basic' 
  | 'deep' 
  | 'privacy'
  | 'both'
  | 'baseline_public'
  | 'authorized_deep';

export interface FindingEvidence {
  request?: string;
  responseSnippet?: string;
  domSelector?: string;
  observedHeader?: string;
  expectedHeader?: string;
  metrics?: Record<string, string | number>;
  reproductionCurl?: string;
  cwe?: string;
  owaspCategory?: string;
  testedUrl?: string;
  statusCode?: number;
  injectedPayload?: string;
  linesCount?: number;
  urlCount?: number;
  [key: string]: any;
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
  firstSeenAt?: string;
  lastSeenAt?: string;
}

export interface AuditCheckResult {
  checkId: string;
  name: string;
  category: Category | string;
  status: CheckStatus;
  severity?: Severity;
  findingType?: FindingType;
  auditMode?: AuditMode;
  mode?: string;
  explanation?: string;
  description?: string;
  impact?: string;
  remediation?: FindingRemediation | string | any;
  evidence?: FindingEvidence | any;
  testTimestamp?: string;
  scope?: string;
  isIndependent?: boolean;
  isSecurityVulnerability?: boolean;
  executionReason?: string;
  legalCitation?: string;
}

export interface PrivacyComplianceSummary {
  applicableLaw: string;
  disclaimer: string;
  complianceRating?: 'compliant' | 'needs_attention' | 'high_risk' | 'partially_compliant' | 'non_compliant' | 'needs_review';
  overallRating?: 'compliant' | 'needs_attention' | 'high_risk' | 'partially_compliant' | 'non_compliant' | 'needs_review';
  checksPassed?: number;
  checksTotal?: number;
  checksFailed?: number;
  checksWarning?: number;
  hasGrievanceOfficer?: boolean;
  hasRejectParity?: boolean;
  hasTrackersBeforeConsent?: boolean;
  hasChildrenDataClause?: boolean;
  keyDeficiencies?: string[];
  dpdpChecks?: any[];
}

export interface DeepAuditComparison {
  additionalChecksExecuted?: number;
  independentTestsCount?: number;
  reusedEvidenceCount?: number;
  notTestedCount?: number;
  confirmedVulnerabilitiesCount?: number;
  potentialRisksCount?: number;
  additionalTestNames?: string[];
  additionalSecurityTests?: string[];
  totalBasicChecks?: number;
  totalDeepChecks?: number;
  skippedBasicChecksInDeep?: string[];
  scopeDifferenceDescription?: string;
  skippedTestReasons?: Record<string, string>;
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
  status: 'passed' | 'partial' | 'failed' | 'skipped_unauthorized' | 'skipped_profile';
  message?: string;
  errorMessage?: string;
  executionTimeMs?: number;
  rawArtifactKey?: string;
}

export interface ReportSummary {
  totalFindings: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  readinessScore: number; // 0 to 100
  categoryScores: Record<string, number>;
  executiveSummary?: string;
  totalChecks?: number;
  totalChecksEvaluated?: number;
  passedChecks?: number;
  checksPassed?: number;
  failedChecks?: number;
  checksFailed?: number;
  warningChecks?: number;
  checksWarning?: number;
  infoChecks?: number;
  notTestedChecks?: number;
  checksNotTested?: number;
  unknownChecks?: number;
  notApplicableChecks?: number;
  checksNotApplicable?: number;
  confirmedVulnerabilities?: number;
  potentialRisks?: number;
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
  checks?: AuditCheckResult[];
  privacyCompliance?: PrivacyComplianceSummary;
  deepComparison?: DeepAuditComparison;
  isSampleData?: boolean;
  errorCategory?: string;
  errorMessage?: string;
}

export interface SavedWebsite {
  id: string;
  hostname: string;
  normalizedUrl: string;
  isVerified: boolean;
  verificationMethod?: 'dns_txt' | 'html_meta' | 'http_file' | 'owner_attestation';
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
