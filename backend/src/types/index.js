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
  executionTimeMs: z.number().optional(),
  rawArtifactKey: z.string().optional(),
});

export const ReportSummarySchema = z.object({
  totalFindings: z.number(),
  critical: z.number(),
  high: z.number(),
  medium: z.number(),
  low: z.number(),
  info: z.number(),
  readinessScore: z.number().min(0).max(100),
  categoryScores: z.record(CategoryEnum, z.number().min(0).max(100)),
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
  verificationMethod: z.enum(['dns_txt', 'html_meta', 'http_file']).optional(),
  verificationToken: z.string().optional(),
  verifiedAt: z.string().optional(),
  lastScanId: z.string().optional(),
  lastScanDate: z.string().optional(),
  lastScanScore: z.number().optional(),
  openFindingsCount: z.number().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
