import { AuditReport, SavedWebsite, ScanProfile, ScanStatus, VerificationStatus } from '../../types/audit';
import { sampleReports } from '../../data/sampleReports';
import { buildBasicAuditReport, buildDeepAuditReport } from '../../data/auditReportBuilder';

const STORAGE_KEYS = {
  SCANS: 'vibesift_mock_scans',
  SITES: 'vibesift_mock_sites',
};

// Default initial saved sites
const initialMockSites: SavedWebsite[] = [];

// In-memory mock store
class MockDataStore {
  private scans: Map<string, AuditReport>;
  private sites: Map<string, SavedWebsite>;

  constructor() {
    this.scans = new Map();
    this.sites = new Map();
    this.initialize();
  }

  private initialize() {
    // Load scans
    try {
      const storedScans = localStorage.getItem(STORAGE_KEYS.SCANS);
      if (storedScans) {
        const parsed: AuditReport[] = JSON.parse(storedScans);
        parsed.forEach((scan) => this.scans.set(scan.scanId, scan));
      }
    } catch {
      // Empty by default
    }

    // Load sites
    try {
      const storedSites = localStorage.getItem(STORAGE_KEYS.SITES);
      if (storedSites) {
        const parsed: SavedWebsite[] = JSON.parse(storedSites);
        parsed.forEach((site) => this.sites.set(site.id, site));
      } else {
        initialMockSites.forEach((site) => this.sites.set(site.id, site));
      }
    } catch {
      initialMockSites.forEach((site) => this.sites.set(site.id, site));
    }
  }

  private persistScans() {
    try {
      localStorage.setItem(STORAGE_KEYS.SCANS, JSON.stringify(Array.from(this.scans.values())));
    } catch {
      // Ignore quota errors
    }
  }

  private persistSites() {
    try {
      localStorage.setItem(STORAGE_KEYS.SITES, JSON.stringify(Array.from(this.sites.values())));
    } catch {
      // Ignore quota errors
    }
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
    if (existing) {
      return existing;
    }

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
    this.persistSites();
    return newSite;
  }

  public confirmVerification(siteId: string): { verified: boolean; message: string } {
    const site = this.sites.get(siteId);
    if (!site) {
      return { verified: false, message: 'Website not found' };
    }

    site.isVerified = true;
    site.verifiedAt = new Date().toISOString();
    site.verificationMethod = site.verificationMethod || 'dns_txt';
    this.sites.set(site.id, site);
    this.persistSites();

    return {
      verified: true,
      message: `Domain ${site.hostname} has been successfully verified via ${site.verificationMethod.toUpperCase()}. Deeper scans are now unlocked.`,
    };
  }

  public deleteSite(siteId: string): void {
    this.sites.delete(siteId);
    this.persistSites();
  }

  public resolveFinding(scanId: string, findingId: string, status: VerificationStatus): boolean {
    const scan = this.scans.get(scanId);
    if (!scan) return false;

    const finding = scan.findings.find((f) => f.id === findingId);
    if (!finding) return false;

    finding.verificationStatus = status;
    this.scans.set(scan.scanId, scan);
    this.persistScans();
    return true;
  }

  /**
   * Simulates a real scan pipeline progression:
   * QUEUED (0s) -> VALIDATING (1.5s) -> RUNNING (3.5s) -> NORMALIZING (5.5s) -> COMPLETED (7s)
   */
  public submitScan(url: string, profile: ScanProfile): AuditReport {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    const hostname = parsed.hostname;
    const scanId = `scan-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    // Generate genuine Basic vs Deep Audit report
    const fullReport: AuditReport =
      profile === 'authorized_deep'
        ? buildDeepAuditReport(url, scanId)
        : buildBasicAuditReport(url, scanId);

    const newScan: AuditReport = {
      ...fullReport,
      scanId,
      targetUrl: url,
      normalizedHostname: hostname,
      scanProfile: profile,
      status: 'QUEUED',
      createdAt: new Date().toISOString(),
      isSampleData: true,
    };

    this.scans.set(scanId, newScan);
    this.persistScans();

    // Trigger state machine progression in the background
    this.progressScanSimulation(scanId);

    return newScan;
  }

  private progressScanSimulation(scanId: string) {
    const targetScan = this.scans.get(scanId);
    const shouldFail = targetScan?.targetUrl?.toLowerCase().includes('fail') || targetScan?.targetUrl?.toLowerCase().includes('error');

    const transitions: { status: ScanStatus; delayMs: number }[] = shouldFail
      ? [
          { status: 'VALIDATING', delayMs: 400 },
          { status: 'RUNNING', delayMs: 800 },
          { status: 'FAILED', delayMs: 1200 },
        ]
      : [
          { status: 'VALIDATING', delayMs: 1500 },
          { status: 'RUNNING', delayMs: 3500 },
          { status: 'NORMALIZING', delayMs: 5500 },
          { status: 'COMPLETED', delayMs: 7000 },
        ];

    transitions.forEach(({ status, delayMs }) => {
      setTimeout(() => {
        const scan = this.scans.get(scanId);
        if (scan && scan.status !== 'CANCELLED' && scan.status !== 'FAILED') {
          scan.status = status;
          if (status === 'COMPLETED') {
            scan.completedAt = new Date().toISOString();
            scan.durationSeconds = 7;
          } else if (status === 'FAILED') {
            scan.completedAt = new Date().toISOString();
            scan.errorMessage = 'Target website is unreachable or connection timed out.';
            scan.findings = [];
          }
          this.scans.set(scanId, scan);
          this.persistScans();
        }
      }, delayMs);
    });
  }

  public rescan(scanId: string): AuditReport {
    const existing = this.scans.get(scanId);
    if (!existing) {
      throw new Error(`Scan ${scanId} not found`);
    }
    return this.submitScan(existing.targetUrl, existing.scanProfile);
  }
}

export const mockStore = new MockDataStore();
