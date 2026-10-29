import { z } from 'zod';

export const ScanStatusEnum = z.enum([
  'QUEUED',
  'VALIDATING',
  'RUNNING',
  'NORMALIZING',
  'COMPLETED',
  'PARTIAL',
  'FAILED',
  'CANCELLED',
]);

export const ScanProfileEnum = z.enum([
  'baseline_public',
  'authorized_deep',
]);

export const SeverityEnum = z.enum([
  'critical',
  'high',
  'medium',
  'low',
  'info',
]);

export const CategoryEnum = z.enum([
  'seo',
  'performance',
  'accessibility',
  'security',
  'cookies',
  'exposure',
  'privacy',
  'completeness',
  'trust',
  'infrastructure',
  'abuse',
]);

export const ConfidenceEnum = z.enum([
  'certain',
  'high',
  'medium',
  'low',
]);

export const DetectionMethodEnum = z.enum([
  'passive',
  'heuristic',
  'active',
]);

export const EngineTypeEnum = z.enum([
  'custom-python',
  'lighthouse',
  'owasp-zap',
  'nuclei',
]);

export const VerificationStatusEnum = z.enum([
  'open',
  'fixed',
  'waived',
  'cannot_verify',
]);

export const FindingEvidenceSchema = z.object({
  request: z.string().optional(),
  responseSnippet: z.string().optional(),
  domSelector: z.string().optional(),
  observedHeader: z.string().optional(),
  expectedHeader: z.string().optional(),
  metrics: z.record(z.union([z.string(), z.number()])).optional(),
  reproductionCurl: z.string().optional(),
  cwe: z.string().optional(),
  owaspCategory: z.string().optional(),
});

export const FindingRemediationSchema = z.object({
  summary: z.string(),
  codeSnippet: z.string().optional(),
  diffBefore: z.string().optional(),
  diffAfter: z.string().optional(),
  frameworkNotes: z.string().optional(),
  docUrl: z.string().optional(),
});

export const FindingSchema = z.object({
  id: z.string(),
  scanId: z.string(),
  ruleId: z.string(),
  category: CategoryEnum,
  severity: SeverityEnum,
  confidence: ConfidenceEnum,
  title: z.string(),
  description: z.string(),
  affectedUrl: z.string(),
  detectionMethod: DetectionMethodEnum,
  engine: EngineTypeEnum,
  evidence: FindingEvidenceSchema,
  impact: z.string(),
  remediation: FindingRemediationSchema,
  verificationStatus: VerificationStatusEnum.default('open'),
  firstSeenAt: z.string().optional(),
  lastSeenAt: z.string().optional(),
});

export const EngineExecutionStatusSchema = z.object({
  engine: z.string(),
  displayName: z.string(),
  status: z.enum(['passed', 'partial', 'failed', 'skipped_unauthorized', 'skipped_profile']),
  message: z.string().optional(),
  errorMessage: z.string().optional(),
  executionTimeMs: z.number().optional(),
  rawArtifactKey: z.string().optional(),
});

export const CheckStatusEnum = z.enum([
  'pass',
  'fail',
  'warning',
  'info',
  'not_tested',
  'unknown',
  'not_applicable',
]);

export const FindingTypeEnum = z.enum([
  'confirmed',
  'suspected',
  'informational',
  'confirmed_vulnerability',
  'potential_risk',
  'hardening_signal',
  'inconclusive',
]);

export const AuditCheckResultSchema = z.object({
  checkId: z.string(),
  name: z.string(),
  category: z.string(),
  status: CheckStatusEnum,
  severity: SeverityEnum.optional(),
  findingType: FindingTypeEnum.optional(),
  auditMode: z.enum(['basic', 'deep', 'privacy', 'both', 'baseline_public', 'authorized_deep']).default('basic'),
  explanation: z.string().optional(),
  description: z.string().optional(),
  impact: z.string().optional(),
  remediation: z.union([FindingRemediationSchema, z.string()]).optional(),
  evidence: z.union([FindingEvidenceSchema, z.record(z.any())]).optional(),
  testTimestamp: z.string().optional(),
  scope: z.string().optional(),
  isIndependent: z.boolean().optional(),
  isSecurityVulnerability: z.boolean().optional(),
  executionReason: z.string().optional(),
  legalCitation: z.string().optional(),
});

export const PrivacyComplianceSchema = z.object({
  applicableLaw: z.string().default('Digital Personal Data Protection Act, 2023 (India)'),
  disclaimer: z.string(),
  complianceRating: z.enum(['compliant', 'needs_attention', 'high_risk', 'partially_compliant', 'non_compliant', 'needs_review']).optional(),
  overallRating: z.enum(['compliant', 'needs_attention', 'high_risk', 'partially_compliant', 'non_compliant', 'needs_review']).optional(),
  checksPassed: z.number().optional(),
  checksTotal: z.number().optional(),
  checksFailed: z.number().optional(),
  checksWarning: z.number().optional(),
  hasGrievanceOfficer: z.boolean().optional(),
  hasRejectParity: z.boolean().optional(),
  hasTrackersBeforeConsent: z.boolean().optional(),
  hasChildrenDataClause: z.boolean().optional(),
  keyDeficiencies: z.array(z.string()).optional(),
  dpdpChecks: z.array(z.any()).optional(),
});

export const DeepComparisonSchema = z.object({
  additionalChecksExecuted: z.number().optional(),
  independentTestsCount: z.number().optional(),
  reusedEvidenceCount: z.number().optional(),
  notTestedCount: z.number().optional(),
  confirmedVulnerabilitiesCount: z.number().optional(),
  potentialRisksCount: z.number().optional(),
  additionalTestNames: z.array(z.string()).optional(),
  skippedTestReasons: z.record(z.string()).optional(),
  totalBasicChecks: z.number().optional(),
  totalDeepChecks: z.number().optional(),
  additionalSecurityTests: z.array(z.string()).optional(),
  skippedBasicChecksInDeep: z.array(z.string()).optional(),
  scopeDifferenceDescription: z.string().optional(),
});

export const ReportSummarySchema = z.object({
  totalFindings: z.number(),
  critical: z.number(),
  high: z.number(),
  medium: z.number(),
  low: z.number(),
  info: z.number(),
  readinessScore: z.number().min(0).max(100),
  categoryScores: z.record(z.string(), z.number().min(0).max(100)),
  executiveSummary: z.string().optional(),
  totalChecks: z.number().optional(),
  totalChecksEvaluated: z.number().optional(),
  passedChecks: z.number().optional(),
  checksPassed: z.number().optional(),
  failedChecks: z.number().optional(),
  checksFailed: z.number().optional(),
  warningChecks: z.number().optional(),
  checksWarning: z.number().optional(),
  infoChecks: z.number().optional(),
  notTestedChecks: z.number().optional(),
  checksNotTested: z.number().optional(),
  unknownChecks: z.number().optional(),
  notApplicableChecks: z.number().optional(),
  checksNotApplicable: z.number().optional(),
  confirmedVulnerabilities: z.number().optional(),
  potentialRisks: z.number().optional(),
});

export const AuditReportSchema = z.object({
  scanId: z.string(),
  ownerUserId: z.string(),
  targetUrl: z.string(),
  normalizedHostname: z.string(),
  scanProfile: ScanProfileEnum,
  status: ScanStatusEnum,
  createdAt: z.string(),
  completedAt: z.string().optional(),
  durationSeconds: z.number().optional(),
  summary: ReportSummarySchema,
  enginesRun: z.array(EngineExecutionStatusSchema),
  checksNotPerformed: z.array(z.string()),
  findings: z.array(FindingSchema),
  checks: z.array(AuditCheckResultSchema).optional(),
  privacyCompliance: PrivacyComplianceSchema.optional(),
  deepComparison: DeepComparisonSchema.optional(),
  errorCategory: z.string().optional(),
  errorMessage: z.string().optional(),
});

export const ScanSubmissionPayloadSchema = z.object({
  url: z.string().min(1, 'Target URL is required'),
  profile: ScanProfileEnum.default('baseline_public'),
  acknowledgedTerms: z.boolean().refine((val) => val === true, {
    message: 'Terms and audit authorization must be acknowledged',
  }),
  idempotencyKey: z.string().optional(),
});

export const SavedWebsiteSchema = z.object({
  id: z.string(),
  ownerUserId: z.string(),
  hostname: z.string(),
  normalizedUrl: z.string(),
  isVerified: z.boolean(),
  verificationMethod: z.enum(['dns_txt', 'html_meta', 'http_file', 'owner_attestation']).optional(),
  verificationToken: z.string().optional(),
  verifiedAt: z.string().optional(),
  lastScanId: z.string().optional(),
  lastScanDate: z.string().optional(),
  lastScanScore: z.number().optional(),
  openFindingsCount: z.number().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
