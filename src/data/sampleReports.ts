import { AuditReport } from '../types/audit';

export const sampleReports: Record<string, AuditReport> = {
  'react-vite-landing': {
    scanId: 'scan-demo-vite-001',
    targetUrl: 'https://vibe-landing-demo.dev',
    normalizedHostname: 'vibe-landing-demo.dev',
    scanProfile: 'baseline_public',
    status: 'COMPLETED',
    createdAt: '2026-10-27T08:15:20Z',
    completedAt: '2026-10-27T08:16:04Z',
    durationSeconds: 44,
    isSampleData: true,
    summary: {
      totalFindings: 6,
      critical: 0,
      high: 2,
      medium: 2,
      low: 1,
      info: 1,
      readinessScore: 74,
      categoryScores: {
        seo: 78,
        performance: 65,
        accessibility: 82,
        security: 60,
        cookies: 90,
        exposure: 70,
      }
    },
    enginesRun: [
      { engine: 'custom-python', displayName: 'HTTP & Meta Inspector', status: 'passed', executionTimeMs: 1240 },
      { engine: 'lighthouse', displayName: 'Google Lighthouse 12.x', status: 'passed', executionTimeMs: 14200 },
      { engine: 'owasp-zap', displayName: 'OWASP ZAP Baseline', status: 'passed', executionTimeMs: 18500 },
      { engine: 'nuclei', displayName: 'ProjectDiscovery Nuclei (Safe Core)', status: 'skipped_unauthorized', message: 'Deeper active tests require verified domain ownership' },
    ],
    checksNotPerformed: [
      'Authenticated user dashboard workflows (no session credentials supplied)',
      'Backend SQL injection & database fuzzing (out of scope for public baseline inspection)',
      'Private Git repository and source code analysis',
      'Internal AWS IAM and VPC configuration',
      'Deep active penetration testing (requires explicit domain verification challenge)'
    ],
    findings: [
      {
        id: 'find-001',
        ruleId: 'SEC-EXP-SOURCEMAP',
        category: 'exposure',
        severity: 'high',
        confidence: 'certain',
        title: 'Production JavaScript source maps publicly accessible',
        description: 'Vite production build generated `.js.map` files that are publicly exposed on the web server. This discloses original TypeScript source code, internal component names, and embedded comments.',
        affectedUrl: 'https://vibe-landing-demo.dev/assets/index-D7b3q8Za.js.map',
        detectionMethod: 'passive',
        engine: 'custom-python',
        evidence: {
          request: 'GET /assets/index-D7b3q8Za.js.map HTTP/1.1\nHost: vibe-landing-demo.dev',
          responseSnippet: 'HTTP/1.1 200 OK\nContent-Type: application/json\nContent-Length: 482104\n\n{"version":3,"file":"index-D7b3q8Za.js","sources":["src/components/Hero.tsx", "src/lib/api.ts"...]}',
          reproductionCurl: 'curl -I -s "https://vibe-landing-demo.dev/assets/index-D7b3q8Za.js.map" | head -n 5'
        },
        impact: 'Attackers can reverse-engineer frontend logic, identify unauthenticated endpoints, and inspect client-side state management patterns.',
        remediation: {
          summary: 'Set `build.sourcemap: false` or `hidden` in your vite.config.ts configuration before deploying to production.',
          diffBefore: '// vite.config.ts\nexport default defineConfig({\n  build: {\n    sourcemap: true, // ⚠️ Exposes raw source in prod\n  }\n});',
          diffAfter: '// vite.config.ts\nexport default defineConfig({\n  build: {\n    sourcemap: false, // ✅ Strip sourcemaps from public output\n  }\n});',
          frameworkNotes: 'In Vite, sourcemap defaults to false, but many AI prompts explicitly enable `sourcemap: true` for debugging and forget to disable it for production.',
          docUrl: 'https://vitejs.dev/config/build-options.html#build-sourcemap'
        },
        verificationStatus: 'open'
      },
      {
        id: 'find-002',
        ruleId: 'SEC-HDR-CSP',
        category: 'security',
        severity: 'high',
        confidence: 'certain',
        title: 'Missing Content-Security-Policy (CSP) response header',
        description: 'No Content-Security-Policy header was observed on the root HTML document. Without CSP, the browser has no baseline restrictions against Cross-Site Scripting (XSS) or rogue script injection.',
        affectedUrl: 'https://vibe-landing-demo.dev/',
        detectionMethod: 'passive',
        engine: 'custom-python',
        evidence: {
          observedHeader: 'Content-Security-Policy: [None]',
          expectedHeader: "Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;",
          reproductionCurl: 'curl -I -s "https://vibe-landing-demo.dev/" | grep -i "content-security-policy"'
        },
        impact: 'Leaves the site vulnerable to client-side injection if any user input or third-party package renders unsanitized HTML.',
        remediation: {
          summary: 'Configure your web server (Nginx, Caddy, CloudFront, or Vercel) to return a Content-Security-Policy header.',
          diffBefore: '// vercel.json (missing headers block)',
          diffAfter: '// vercel.json\n{\n  "headers": [{\n    "source": "/(.*)",\n    "headers": [{\n      "key": "Content-Security-Policy",\n      "value": "default-src \'self\'; script-src \'self\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data: https:;"\n    }]\n  }]\n}',
          frameworkNotes: 'For single page apps on S3/CloudFront, configure CloudFront Response Headers Policy to inject security headers.',
          docUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP'
        },
        verificationStatus: 'open'
      },
      {
        id: 'find-003',
        ruleId: 'PERF-LCP-HERO',
        category: 'performance',
        severity: 'medium',
        confidence: 'high',
        title: 'Unoptimized hero image causes Largest Contentful Paint (LCP) of 3.8s',
        description: 'The primary visual element in the hero section is a 2.4 MB uncompressed PNG file loaded without `fetchpriority="high"` or responsive `srcset` scaling.',
        affectedUrl: 'https://vibe-landing-demo.dev/hero-banner.png',
        detectionMethod: 'passive',
        engine: 'lighthouse',
        evidence: {
          domSelector: 'div.hero-container > img.hero-banner',
          metrics: {
            'LCP': '3.82s (Target <= 2.5s)',
            'Image Transfer Size': '2,420 KB',
            'Potential Savings': '2,180 KB via WebP/AVIF'
          }
        },
        impact: 'Poor Core Web Vitals score directly harms search engine ranking and increases mobile bounce rates.',
        remediation: {
          summary: 'Convert the image to modern WebP/AVIF format and add fetchpriority="high" and width/height attributes.',
          diffBefore: '<img src="/hero-banner.png" alt="Product Hero" />',
          diffAfter: '<img \n  src="/hero-banner.webp" \n  fetchpriority="high" \n  decoding="async" \n  width="1200" \n  height="630" \n  alt="Product Hero" \n/>',
          frameworkNotes: 'If using Vite, consider `vite-plugin-image-optimizer` to automate WebP conversion at build time.',
          docUrl: 'https://web.dev/optimize-lcp/'
        },
        verificationStatus: 'open'
      },
      {
        id: 'find-004',
        ruleId: 'SEO-META-CANONICAL',
        category: 'seo',
        severity: 'medium',
        confidence: 'certain',
        title: 'Missing canonical link tag (`<link rel="canonical">`)',
        description: 'The landing page lacks a self-referencing canonical tag. Search engines may crawl URL variations with query parameters or trailing slashes as duplicate pages.',
        affectedUrl: 'https://vibe-landing-demo.dev/',
        detectionMethod: 'passive',
        engine: 'custom-python',
        evidence: {
          domSelector: 'head > link[rel="canonical"]',
          responseSnippet: '<head>\n  <title>Landing Page</title>\n  <!-- canonical tag missing -->\n</head>',
          reproductionCurl: 'curl -s "https://vibe-landing-demo.dev/" | grep -i \'rel="canonical"\''
        },
        impact: 'Dilutes search authority and can lead to incorrect page indexing when UTM or campaign tags are appended.',
        remediation: {
          summary: 'Add an absolute canonical link tag to the <head> element.',
          diffBefore: '<head>\n  <title>Vibe Landing Demo</title>\n</head>',
          diffAfter: '<head>\n  <title>Vibe Landing Demo</title>\n  <link rel="canonical" href="https://vibe-landing-demo.dev/" />\n</head>',
          frameworkNotes: 'In SPA setups, use React Helmet or unhead/react to manage head tags dynamically.',
          docUrl: 'https://developers.google.com/search/docs/crawling-indexing/canonicalization'
        },
        verificationStatus: 'open'
      },
      {
        id: 'find-005',
        ruleId: 'A11Y-BTN-CONTRAST',
        category: 'accessibility',
        severity: 'low',
        confidence: 'certain',
        title: 'Insufficient color contrast on secondary CTA button',
        description: 'The secondary "Learn more" button has a text color of #A0AEC0 on a white background, yielding a contrast ratio of 2.4:1 (WCAG AA requires 4.5:1).',
        affectedUrl: 'https://vibe-landing-demo.dev/',
        detectionMethod: 'passive',
        engine: 'lighthouse',
        evidence: {
          domSelector: 'button.btn-secondary',
          metrics: {
            'Contrast Ratio': '2.4:1',
            'Minimum Required': '4.5:1 (WCAG 2.1 AA)',
            'Foreground': '#A0AEC0',
            'Background': '#FFFFFF'
          }
        },
        impact: 'Users with mild visual impairments or screen glare cannot read the secondary action.',
        remediation: {
          summary: 'Adjust the secondary text color to a darker shade with at least 4.5:1 contrast.',
          diffBefore: '<button className="text-gray-400 bg-white">Learn more</button>',
          diffAfter: '<button className="text-gray-700 bg-white hover:text-gray-900">Learn more</button>',
          frameworkNotes: 'Ensure Tailwind class names provide sufficient contrast tokens (e.g. text-gray-700 instead of text-gray-400).',
          docUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html'
        },
        verificationStatus: 'open'
      },
      {
        id: 'find-006',
        ruleId: 'SEC-INFO-SERVER-HDR',
        category: 'security',
        severity: 'info',
        confidence: 'certain',
        title: 'Server information disclosure header present',
        description: 'Server returns `Server: Caddy/2.7.4` in the HTTP response headers.',
        affectedUrl: 'https://vibe-landing-demo.dev/',
        detectionMethod: 'passive',
        engine: 'custom-python',
        evidence: {
          observedHeader: 'Server: Caddy/2.7.4',
          reproductionCurl: 'curl -I -s "https://vibe-landing-demo.dev/" | grep -i "^server:"'
        },
        impact: 'Provides reconnaissance telemetry about web server versions to automated bots.',
        remediation: {
          summary: 'Mask or remove the Server header in web server configuration.',
          frameworkNotes: 'In Caddy, add `header -Server` inside your site block.',
          docUrl: 'https://caddyserver.com/docs/caddyfile/directives/header'
        },
        verificationStatus: 'open'
      }
    ]
  },

  'nextjs-marketing': {
    scanId: 'scan-demo-next-002',
    targetUrl: 'https://saas-market-starter.vercel.app',
    normalizedHostname: 'saas-market-starter.vercel.app',
    scanProfile: 'baseline_public',
    status: 'COMPLETED',
    createdAt: '2026-10-27T07:30:10Z',
    completedAt: '2026-10-27T07:31:02Z',
    durationSeconds: 52,
    isSampleData: true,
    summary: {
      totalFindings: 5,
      critical: 1,
      high: 1,
      medium: 1,
      low: 1,
      info: 1,
      readinessScore: 68,
      categoryScores: {
        seo: 88,
        performance: 79,
        accessibility: 85,
        security: 45,
        cookies: 82,
        exposure: 40,
      }
    },
    enginesRun: [
      { engine: 'custom-python', displayName: 'HTTP & Meta Inspector', status: 'passed', executionTimeMs: 1450 },
      { engine: 'lighthouse', displayName: 'Google Lighthouse 12.x', status: 'passed', executionTimeMs: 16100 },
      { engine: 'owasp-zap', displayName: 'OWASP ZAP Baseline', status: 'passed', executionTimeMs: 19800 },
      { engine: 'nuclei', displayName: 'ProjectDiscovery Nuclei (Safe Core)', status: 'skipped_unauthorized', message: 'Deeper active tests require verified domain ownership' },
    ],
    checksNotPerformed: [
      'Next.js Server Actions backend authorization bypasses',
      'Database connection pool stress or SQL injection testing',
      'Authenticated session impersonation',
      'Production API rate limits testing'
    ],
    findings: [
      {
        id: 'find-101',
        ruleId: 'SEC-EXP-ENV-FILE',
        category: 'exposure',
        severity: 'critical',
        confidence: 'certain',
        title: 'Exposed `.env.local` configuration file detected on public web path',
        description: 'A misconfigured rewrite rule in Next.js public directory caused the `.env.local` file to be served over HTTP with HTTP 200 OK. Contains API keys and secret tokens.',
        affectedUrl: 'https://saas-market-starter.vercel.app/.env.local',
        detectionMethod: 'passive',
        engine: 'custom-python',
        evidence: {
          request: 'GET /.env.local HTTP/1.1\nHost: saas-market-starter.vercel.app',
          responseSnippet: 'HTTP/1.1 200 OK\nContent-Type: text/plain\n\nDATABASE_URL=postgres://... [REDACTED]\nNEXT_PUBLIC_STRIPE_KEY=pk_test_...\nSUPABASE_SERVICE_ROLE_KEY=ey... [REDACTED]',
          reproductionCurl: 'curl -s -I "https://saas-market-starter.vercel.app/.env.local" | head -n 5'
        },
        impact: 'Severe breach risk: Service role keys and database connection strings allow unauthorized access to production databases.',
        remediation: {
          summary: 'Immediately rotate all exposed keys, delete `.env.local` from the public directory, and verify `.gitignore` excludes all `.env*` files.',
          diffBefore: '# .gitignore\n# Missing .env.local entry',
          diffAfter: '# .gitignore\n.env*.local\n.env\n.env.production\n.env.development',
          frameworkNotes: 'Never place `.env` files inside the `public/` folder in Next.js or Astro. Files in `public/` are served verbatim without build-time protection.',
          docUrl: 'https://nextjs.org/docs/pages/building-your-application/configuring/environment-variables'
        },
        verificationStatus: 'open'
      },
      {
        id: 'find-102',
        ruleId: 'SEC-HDR-HSTS',
        category: 'security',
        severity: 'high',
        confidence: 'certain',
        title: 'Missing Strict-Transport-Security (HSTS) with `includeSubDomains`',
        description: 'The domain enforces HTTPS via 308 redirect, but fails to set the `Strict-Transport-Security` header to instruct modern browsers to never downgrade to insecure HTTP.',
        affectedUrl: 'https://saas-market-starter.vercel.app/',
        detectionMethod: 'passive',
        engine: 'custom-python',
        evidence: {
          observedHeader: 'Strict-Transport-Security: [None]',
          expectedHeader: 'Strict-Transport-Security: max-age=63072000; includeSubDomains; preload',
          reproductionCurl: 'curl -I -s "https://saas-market-starter.vercel.app/" | grep -i "strict-transport-security"'
        },
        impact: 'Users on untrusted Wi-Fi networks may be vulnerable to SSL stripping attacks on initial connection.',
        remediation: {
          summary: 'Add Strict-Transport-Security to Next.js headers configuration in next.config.js.',
          diffBefore: '// next.config.js\nmodule.exports = {\n  reactStrictMode: true,\n};',
          diffAfter: '// next.config.js\nmodule.exports = {\n  async headers() {\n    return [{\n      source: "/:path*",\n      headers: [{\n        key: "Strict-Transport-Security",\n        value: "max-age=63072000; includeSubDomains; preload"\n      }]\n    }];\n  }\n};',
          frameworkNotes: 'Set max-age to at least 1 year (31536000 seconds) to qualify for Chrome HSTS Preload list.',
          docUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security'
        },
        verificationStatus: 'open'
      },
      {
        id: 'find-103',
        ruleId: 'SEO-REDIRECT-CHAIN',
        category: 'seo',
        severity: 'medium',
        confidence: 'certain',
        title: 'Trailing-slash redirect hop adds 280ms crawl latency',
        description: 'Requesting `https://saas-market-starter.vercel.app/pricing/` redirects to `/pricing` via 308 Permanent Redirect, but internal nav links point to the slash version.',
        affectedUrl: 'https://saas-market-starter.vercel.app/pricing/',
        detectionMethod: 'passive',
        engine: 'custom-python',
        evidence: {
          request: 'GET /pricing/ HTTP/1.1',
          responseSnippet: 'HTTP/1.1 308 Permanent Redirect\nLocation: /pricing',
          reproductionCurl: 'curl -I -s "https://saas-market-starter.vercel.app/pricing/"'
        },
        impact: 'Causes unnecessary crawl overhead and latency for search engine crawlers and initial user visits.',
        remediation: {
          summary: 'Standardize all internal `<Link href="/pricing">` components to match the canonical trailing slash strategy.',
          frameworkNotes: 'In Next.js, set `trailingSlash: false` in `next.config.js` and ensure all navigation links omit the trailing slash.',
          docUrl: 'https://nextjs.org/docs/app/api-reference/next-config-js/trailingSlash'
        },
        verificationStatus: 'open'
      },
      {
        id: 'find-104',
        ruleId: 'A11Y-IMG-ALT',
        category: 'accessibility',
        severity: 'low',
        confidence: 'certain',
        title: 'Missing `alt` attributes on user testimonial avatars',
        description: 'Three avatar images inside the testimonial slider lack `alt` attributes or `aria-hidden="true"`.',
        affectedUrl: 'https://saas-market-starter.vercel.app/',
        detectionMethod: 'passive',
        engine: 'lighthouse',
        evidence: {
          domSelector: 'section.testimonials div.avatar-list img:nth-child(2)',
          metrics: {
            'Elements affected': '3 images',
            'Screen reader impact': 'Reads raw filename URL instead of user profile context'
          }
        },
        impact: 'Assistive technologies announce uninformative file paths like "avatar-2983.jpg" to screen reader users.',
        remediation: {
          summary: 'Add descriptive alt text or mark decorative avatars with alt="" or aria-hidden="true".',
          diffBefore: '<Image src="/user-1.jpg" width={48} height={48} />',
          diffAfter: '<Image src="/user-1.jpg" width={48} height={48} alt="Portrait of Sarah Chen, CTO" />',
          frameworkNotes: 'Next.js `next/image` warns during development if `alt` is missing, but does not block build by default.',
          docUrl: 'https://nextjs.org/docs/pages/api-reference/components/image#alt'
        },
        verificationStatus: 'open'
      },
      {
        id: 'find-105',
        ruleId: 'ROBOTS-ALLOW-API',
        category: 'seo',
        severity: 'info',
        confidence: 'high',
        title: 'Robots.txt does not disallow `/api/` crawl paths',
        description: 'Public robots.txt file lacks explicit Disallow directives for backend API routes `/api/`, which may cause search engine crawlers to trigger backend handlers.',
        affectedUrl: 'https://saas-market-starter.vercel.app/robots.txt',
        detectionMethod: 'passive',
        engine: 'custom-python',
        evidence: {
          responseSnippet: 'User-agent: *\nAllow: /\nSitemap: https://saas-market-starter.vercel.app/sitemap.xml',
          reproductionCurl: 'curl -s "https://saas-market-starter.vercel.app/robots.txt"'
        },
        impact: 'Can cause useless crawler traffic to serverless functions, increasing billing costs.',
        remediation: {
          summary: 'Add `Disallow: /api/` to your robots.txt or app/robots.ts route.',
          diffBefore: 'User-agent: *\nAllow: /',
          diffAfter: 'User-agent: *\nAllow: /\nDisallow: /api/',
          frameworkNotes: 'In Next.js App Router, use `app/robots.ts` to generate dynamic robots.txt automatically.',
          docUrl: 'https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots'
        },
        verificationStatus: 'open'
      }
    ]
  },

  'saas-application': {
    scanId: 'scan-demo-saas-003',
    targetUrl: 'https://vibe-pulse-app.io',
    normalizedHostname: 'vibe-pulse-app.io',
    scanProfile: 'baseline_public',
    status: 'COMPLETED',
    createdAt: '2026-10-27T06:10:00Z',
    completedAt: '2026-10-27T06:11:12Z',
    durationSeconds: 72,
    isSampleData: true,
    summary: {
      totalFindings: 6,
      critical: 0,
      high: 2,
      medium: 2,
      low: 1,
      info: 1,
      readinessScore: 71,
      categoryScores: {
        seo: 80,
        performance: 72,
        accessibility: 76,
        security: 58,
        cookies: 65,
        exposure: 88,
      }
    },
    enginesRun: [
      { engine: 'custom-python', displayName: 'HTTP & Meta Inspector', status: 'passed', executionTimeMs: 1620 },
      { engine: 'lighthouse', displayName: 'Google Lighthouse 12.x', status: 'passed', executionTimeMs: 17400 },
      { engine: 'owasp-zap', displayName: 'OWASP ZAP Baseline', status: 'passed', executionTimeMs: 24200 },
      { engine: 'nuclei', displayName: 'ProjectDiscovery Nuclei (Safe Core)', status: 'skipped_unauthorized', message: 'Deeper active tests require verified domain ownership' },
    ],
    checksNotPerformed: [
      'Multi-tenant cross-account data isolation tests',
      'Authenticated Stripe webhooks tampering',
      'Private Redis cache key inspection',
      'Targeted SQL injection payload verification'
    ],
    findings: [
      {
        id: 'find-201',
        ruleId: 'SEC-COOKIE-FLAGS',
        category: 'cookies',
        severity: 'high',
        confidence: 'certain',
        title: 'Authentication session cookie missing `HttpOnly` and `SameSite` flags',
        description: 'The `app_session_token` cookie is set without `HttpOnly` and `SameSite=Lax` or `Strict`. This allows client-side JavaScript access via `document.cookie`.',
        affectedUrl: 'https://vibe-pulse-app.io/login',
        detectionMethod: 'passive',
        engine: 'custom-python',
        evidence: {
          observedHeader: 'Set-Cookie: app_session_token=a8f9c2d1e4...; Path=/',
          expectedHeader: 'Set-Cookie: app_session_token=a8f9c2d1e4...; Path=/; Secure; HttpOnly; SameSite=Lax',
          reproductionCurl: 'curl -i -s "https://vibe-pulse-app.io/login" | grep -i "Set-Cookie"'
        },
        impact: 'If any XSS vulnerability exists on the origin, malicious scripts can read the session token and hijack the user session.',
        remediation: {
          summary: 'Set `HttpOnly; Secure; SameSite=Lax` on all sensitive authentication and session cookies in your backend cookie configuration.',
          diffBefore: 'res.setHeader("Set-Cookie", `app_session_token=${token}; Path=/`);',
          diffAfter: 'res.setHeader("Set-Cookie", `app_session_token=${token}; Path=/; HttpOnly; Secure; SameSite=Lax`);',
          frameworkNotes: 'When using Express or Fastify cookie-session, configure `httpOnly: true, secure: true, sameSite: "lax"`.',
          docUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#restrict_access_to_cookies'
        },
        verificationStatus: 'open'
      },
      {
        id: 'find-202',
        ruleId: 'SEC-HDR-XCTO',
        category: 'security',
        severity: 'high',
        confidence: 'certain',
        title: 'Missing `X-Content-Type-Options: nosniff` header',
        description: 'Server does not include `X-Content-Type-Options: nosniff`. Older and modern browsers may perform MIME-type sniffing on user-uploaded files or static assets.',
        affectedUrl: 'https://vibe-pulse-app.io/',
        detectionMethod: 'passive',
        engine: 'custom-python',
        evidence: {
          observedHeader: 'X-Content-Type-Options: [None]',
          expectedHeader: 'X-Content-Type-Options: nosniff',
          reproductionCurl: 'curl -I -s "https://vibe-pulse-app.io/" | grep -i "x-content-type-options"'
        },
        impact: 'Permits MIME confusion attacks where an uploaded image containing JavaScript might be executed as script by vulnerable browsers.',
        remediation: {
          summary: 'Return `X-Content-Type-Options: nosniff` across all HTTP responses.',
          diffBefore: '// express app without helmet',
          diffAfter: 'import helmet from "helmet";\napp.use(helmet.noSniff());',
          frameworkNotes: 'In Node.js, `helmet` applies this header automatically by default.',
          docUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options'
        },
        verificationStatus: 'open'
      },
      {
        id: 'find-203',
        ruleId: 'PERF-FONTS-BLOCKING',
        category: 'performance',
        severity: 'medium',
        confidence: 'high',
        title: 'Render-blocking Google Fonts stylesheets add 420ms First Contentful Paint delay',
        description: 'Three separate `@import url(...)` directives inside main stylesheet block DOM rendering until fonts.googleapis.com resolves.',
        affectedUrl: 'https://vibe-pulse-app.io/app.css',
        detectionMethod: 'passive',
        engine: 'lighthouse',
        evidence: {
          domSelector: 'head > style',
          metrics: {
            'FCP delay': '420ms',
            'Font Requests': '3 synchronous CSS imports'
          }
        },
        impact: 'Delays visual rendering, causing an apparent blank white screen on 4G mobile connections.',
        remediation: {
          summary: 'Use `<link rel="preconnect">` and swap `@import` for non-blocking `<link rel="preload">` or `@fontsource` npm packages.',
          diffBefore: '/* styles.css */\n@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap");',
          diffAfter: '/* Self-host via @fontsource/inter or preconnect in HTML */\n<link rel="preconnect" href="https://fonts.googleapis.com" />\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />',
          frameworkNotes: 'Self-hosting fonts eliminates the third-party DNS lookup completely.',
          docUrl: 'https://web.dev/optimize-webfont-loading/'
        },
        verificationStatus: 'open'
      },
      {
        id: 'find-204',
        ruleId: 'A11Y-HTML-LANG',
        category: 'accessibility',
        severity: 'medium',
        confidence: 'certain',
        title: 'Missing `lang` attribute on `<html>` root element',
        description: 'The root HTML element is defined as `<html>` instead of `<html lang="en">`. Screen readers cannot determine the spoken pronunciation language.',
        affectedUrl: 'https://vibe-pulse-app.io/',
        detectionMethod: 'passive',
        engine: 'custom-python',
        evidence: {
          domSelector: 'html',
          responseSnippet: '<!DOCTYPE html>\n<html>\n<head>',
          reproductionCurl: 'curl -s "https://vibe-pulse-app.io/" | head -n 3'
        },
        impact: 'Screen readers default to the operating system voice, which causes incorrect pronunciation and translation difficulties.',
        remediation: {
          summary: 'Add the appropriate BCP 47 language code (e.g. `lang="en"`) to the opening `<html>` tag.',
          diffBefore: '<html>\n  <head>',
          diffAfter: '<html lang="en">\n  <head>',
          frameworkNotes: 'In Next.js, configure `app/layout.tsx` to return `<html lang="en">`. In Vite, check `index.html`.',
          docUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/language-of-page.html'
        },
        verificationStatus: 'open'
      },
      {
        id: 'find-205',
        ruleId: 'LEGAL-PRIVACY-BOILERPLATE',
        category: 'cookies',
        severity: 'low',
        confidence: 'high',
        title: 'Privacy policy page contains unmodified boilerplate template placeholders',
        description: 'The page at `/privacy` contains generic AI template placeholder strings such as `[Insert Company Legal Name]` and `[Insert Contact Address]`.',
        affectedUrl: 'https://vibe-pulse-app.io/privacy',
        detectionMethod: 'heuristic',
        engine: 'custom-python',
        evidence: {
          domSelector: 'div.legal-content p:nth-child(2)',
          responseSnippet: '"This Privacy Policy describes how [Insert Company Legal Name] gathers, protects, and discloses personal data..."'
        },
        impact: 'Signals incomplete legal readiness to users, partners, and enterprise review teams.',
        remediation: {
          summary: 'Review and replace all placeholder tokens with your registered legal entity details and operational email addresses.',
          frameworkNotes: 'Ensure privacy disclosures match the exact cookies and telemetry tools actually active in your production bundle.',
          docUrl: 'https://gdpr.eu/privacy-notice/'
        },
        verificationStatus: 'open'
      },
      {
        id: 'find-206',
        ruleId: 'SEC-TLS-CIPHERS',
        category: 'security',
        severity: 'info',
        confidence: 'certain',
        title: 'TLS 1.2 and TLS 1.3 properly configured with modern cipher suites',
        description: 'Server successfully negotiates TLS 1.3 with forward secrecy. Deprecated TLS 1.0 and 1.1 are correctly rejected.',
        affectedUrl: 'https://vibe-pulse-app.io/',
        detectionMethod: 'passive',
        engine: 'custom-python',
        evidence: {
          metrics: {
            'Negotiated Protocol': 'TLSv1.3',
            'Cipher Suite': 'TLS_AES_256_GCM_SHA384',
            'Certificate Expiry': '82 days remaining'
          }
        },
        impact: 'Positive configuration indicator: protects data in transit with modern cryptography.',
        remediation: {
          summary: 'No fix needed. Keep automatic SSL certificate renewal enabled.',
        },
        verificationStatus: 'open'
      }
    ]
  }
};
