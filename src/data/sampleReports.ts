import { AuditReport } from '../types/audit';
import { buildBasicAuditReport, buildDeepAuditReport } from './auditReportBuilder';

export const sampleReports: Record<string, AuditReport> = {
  'react-vite-landing': buildBasicAuditReport('https://vibe-landing-demo.dev', 'scan-demo-vite-001'),
  'nextjs-marketing': buildDeepAuditReport('https://saas-market-starter.vercel.app', 'scan-demo-next-002'),
  'ecommerce-store': buildDeepAuditReport('https://vibe-pulse-app.io', 'scan-demo-saas-003'),
};
