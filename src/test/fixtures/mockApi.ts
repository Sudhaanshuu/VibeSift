import { AuditReport, SavedWebsite, ScanProfile, ScanStatus, VerificationStatus } from '../../types/audit';
import { buildBasicAuditReport, buildDeepAuditReport } from '../../data/auditReportBuilder';

export interface TestScanStore {
  scans: Map<string, AuditReport>;
  sites: Map<string, SavedWebsite>;
}

class TestMockDataStore {
  private scans: Map<string, AuditReport> = new Map();
  private sites: Map<string, SavedWebsite> = new Map();

  public reset() {
    this.scans.clear();
    this.sites.clear();
  }

  public getScans(): AuditReport[] {
    return Array.from(this.scans.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getScan(scanId: string): AuditReport | null {
    return this.scans.get(scanId) || null;
  }

  public getSites(): SavedWebsite[] {
    return Array.from(this.sites.values());
  }

  public getSite(siteId: string): SavedWebsite | null {
    return this.sites.get(siteId) || null;
  }

  public addSite(hostname: string): SavedWebsite {
    const cleanHost = hostname.replace(/^https?:\/\//i, '').split('/')[0].toLowerCase();
    const existing = Array.from(this.sites.values()).find((s) => s.hostname.toLowerCase() === cleanHost);
    if (existing) return existing;

    const token = `siteready-verify=${Math.random().toString(36).substring(2, 12)}`;
    const newSite: SavedWebsite = {
      id: `site-${Date.now().toString(36)}`,
      hostname: cleanHost,
      normalizedUrl: `https://${cleanHost}`,
      isVerified: false,
      verificationToken: token,
      openFindingsCount: 0,
    };
    this.sites.set(newSite.id, newSite);
    return newSite;
  }

  public confirmVerification(siteId: string): { verified: boolean; message: string } {
    const site = this.sites.get(siteId);
    if (!site) {
      return { verified: false, message: 'Website not found' };
    }
    site.isVerified = true;
    site.verifiedAt = new Date().toISOString();
    site.verificationMethod = 'dns_txt';
    this.sites.set(site.id, site);
    return {
      verified: true,
      message: `Domain ${site.hostname} has been successfully verified via DNS_TXT.`,
    };
  }

  public deleteSite(siteId: string): void {
    this.sites.delete(siteId);
  }

  public resolveFinding(scanId: string, findingId: string, status: VerificationStatus): boolean {
    const scan = this.scans.get(scanId);
    if (!scan) return false;
    const finding = scan.findings.find((f) => f.id === findingId);
    if (!finding) return false;
    finding.verificationStatus = status;
    this.scans.set(scan.scanId, scan);
    return true;
  }

  public submitScan(url: string, profile: ScanProfile): AuditReport {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    const hostname = parsed.hostname;
    const scanId = `scan-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    const fullReport: AuditReport =
      profile === 'authorized_deep'
        ? buildDeepAuditReport(url, scanId)
        : buildBasicAuditReport(url, scanId);

    const isFailTarget = url.toLowerCase().includes('fail') || url.toLowerCase().includes('error');

    const newScan: AuditReport = {
      ...fullReport,
      scanId,
      targetUrl: url,
      normalizedHostname: hostname,
      scanProfile: profile,
      status: 'QUEUED',
      createdAt: new Date().toISOString(),
    };

    if (isFailTarget) {
      setTimeout(() => {
        const current = this.scans.get(scanId);
        if (current) {
          current.status = 'FAILED';
          current.errorMessage = 'Target website is unreachable or connection timed out.';
          current.findings = [];
          this.scans.set(scanId, current);
        }
      }, 50);
    } else {
      setTimeout(() => {
        const current = this.scans.get(scanId);
        if (current && current.status !== 'CANCELLED') {
          current.status = 'COMPLETED';
          current.completedAt = new Date().toISOString();
          current.durationSeconds = 6;
          this.scans.set(scanId, current);
        }
      }, 50);
    }

    this.scans.set(scanId, newScan);
    return newScan;
  }

  public rescan(scanId: string): AuditReport {
    const existing = this.scans.get(scanId);
    if (!existing) {
      throw new Error(`Scan ${scanId} not found`);
    }
    return this.submitScan(existing.targetUrl, existing.scanProfile);
  }

  public cancelScan(scanId: string): void {
    const scan = this.scans.get(scanId);
    if (scan && scan.status !== 'COMPLETED' && scan.status !== 'FAILED') {
      scan.status = 'CANCELLED';
      this.scans.set(scanId, scan);
    }
  }
}

export const testMockStore = new TestMockDataStore();
