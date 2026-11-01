import '@testing-library/jest-dom/vitest';
import { beforeEach, afterEach, vi } from 'vitest';
import { testMockStore } from './fixtures/mockApi';

const originalFetch = globalThis.fetch;

beforeEach(() => {
  // Setup simulated API handler for testing environment
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const url = new URL(urlStr, 'http://localhost:4000');
    const pathname = url.pathname;
    const method = (init?.method || 'GET').toUpperCase();

    // Helper to return JSON Response
    const jsonResponse = (data: any, status = 200) => {
      return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    // Scans endpoints
    if (pathname === '/api/scans' || pathname === '/scans') {
      if (method === 'POST') {
        const body = JSON.parse(init?.body as string || '{}');
        const scan = testMockStore.submitScan(body.url, body.profile);
        return jsonResponse({
          scanId: scan.scanId,
          status: scan.status,
          targetUrl: scan.targetUrl,
          createdAt: scan.createdAt,
        }, 201);
      }
      if (method === 'GET') {
        const search = url.searchParams.get('search') || undefined;
        const profile = url.searchParams.get('profile') as any;
        let list = testMockStore.getScans();
        if (profile) list = list.filter((s) => s.scanProfile === profile);
        if (search) list = list.filter((s) => s.targetUrl.includes(search) || s.scanId.includes(search));
        return jsonResponse(list);
      }
    }

    // Single scan endpoints
    const scanMatch = pathname.match(/^\/(?:api\/)?scans\/([^/]+)$/);
    if (scanMatch && method === 'GET') {
      const scanId = decodeURIComponent(scanMatch[1]);
      const scan = testMockStore.getScan(scanId);
      if (!scan) {
        return jsonResponse({ error: `Scan not found: ${scanId}`, code: 'NOT_FOUND' }, 404);
      }
      return jsonResponse(scan);
    }

    // Rescan endpoint
    const rescanMatch = pathname.match(/^\/(?:api\/)?scans\/([^/]+)\/rescan$/);
    if (rescanMatch && method === 'POST') {
      const scanId = decodeURIComponent(rescanMatch[1]);
      const newScan = testMockStore.rescan(scanId);
      return jsonResponse({
        scanId: newScan.scanId,
        status: newScan.status,
        targetUrl: newScan.targetUrl,
        createdAt: newScan.createdAt,
      }, 201);
    }

    // Cancel scan endpoint
    const cancelMatch = pathname.match(/^\/(?:api\/)?scans\/([^/]+)\/cancel$/);
    if (cancelMatch && method === 'POST') {
      const scanId = decodeURIComponent(cancelMatch[1]);
      testMockStore.cancelScan(scanId);
      return jsonResponse({ success: true });
    }

    // Reports endpoints
    const reportMatch = pathname.match(/^\/(?:api\/)?reports\/([^/]+)$/);
    if (reportMatch && method === 'GET') {
      const scanId = decodeURIComponent(reportMatch[1]);
      const scan = testMockStore.getScan(scanId);
      if (!scan) {
        return jsonResponse({ error: `Report not found: ${scanId}`, code: 'NOT_FOUND' }, 404);
      }
      return jsonResponse(scan);
    }

    // Resolve finding endpoint
    const resolveMatch = pathname.match(/^\/(?:api\/)?reports\/([^/]+)\/findings\/([^/]+)$/);
    if (resolveMatch && method === 'PATCH') {
      const scanId = decodeURIComponent(resolveMatch[1]);
      const findingId = decodeURIComponent(resolveMatch[2]);
      const body = JSON.parse(init?.body as string || '{}');
      testMockStore.resolveFinding(scanId, findingId, body.status);
      return jsonResponse({ success: true });
    }

    // Sites endpoints
    if (pathname === '/api/sites' || pathname === '/sites') {
      if (method === 'GET') {
        return jsonResponse(testMockStore.getSites());
      }
      if (method === 'POST') {
        const body = JSON.parse(init?.body as string || '{}');
        const site = testMockStore.addSite(body.hostname);
        return jsonResponse(site, 201);
      }
    }

    const siteVerifyReq = pathname.match(/^\/(?:api\/)?sites\/([^/]+)\/verify-request$/);
    if (siteVerifyReq && method === 'POST') {
      const siteId = decodeURIComponent(siteVerifyReq[1]);
      const site = testMockStore.getSite(siteId);
      const token = site?.verificationToken || `siteready-verify=${siteId}`;
      return jsonResponse({
        method: 'dns_txt',
        token,
        dnsHostRecord: '@',
        dnsRecordType: 'TXT',
        metaHtmlTag: `<meta name="vibesift-site-verification" content="${token}" />`,
        httpFilePath: '/.well-known/vibesift-verification.txt',
        httpFileContent: token,
      });
    }

    const siteVerifyConfirm = pathname.match(/^\/(?:api\/)?sites\/([^/]+)\/verify-confirm$/);
    if (siteVerifyConfirm && method === 'POST') {
      const siteId = decodeURIComponent(siteVerifyConfirm[1]);
      const res = testMockStore.confirmVerification(siteId);
      return jsonResponse(res);
    }

    // Auth endpoints
    if (pathname.includes('/auth/me')) {
      const rawUser = localStorage.getItem('vibesift_user_session');
      if (rawUser) {
        return jsonResponse(JSON.parse(rawUser));
      }
      return jsonResponse({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);
    }

    if (pathname.includes('/auth/login')) {
      const body = JSON.parse(init?.body as string || '{}');
      const user = {
        id: 'usr_test123',
        email: body.email || 'developer@example.com',
        name: (body.email || 'developer').split('@')[0],
        isDemoUser: false,
        plan: 'verified_developer',
      };
      return jsonResponse({ user, token: 'test-jwt-token' });
    }

    // Fallback to original fetch if available
    if (typeof originalFetch === 'function') {
      return originalFetch(input, init);
    }

    return jsonResponse({ error: 'Not Found' }, 404);
  });
});

afterEach(() => {
  testMockStore.reset();
});
