export interface CapabilityItem {
  id: string;
  title: string;
  shortDesc: string;
  icon: string;
  toolsUsed?: string[];
}

export const capabilityStripItems: CapabilityItem[] = [
  {
    id: 'seo',
    title: 'SEO & Indexability',
    shortDesc: 'Meta tags, canonicals, robots.txt, sitemaps & crawl latency',
    icon: 'Compass',
    toolsUsed: ['Custom Python Engine']
  },
  {
    id: 'performance',
    title: 'Performance & Vitals',
    shortDesc: 'Core Web Vitals, LCP, CLS, render-blocking scripts & asset size',
    icon: 'Zap',
    toolsUsed: ['Google Lighthouse']
  },
  {
    id: 'accessibility',
    title: 'Accessibility (a11y)',
    shortDesc: 'Color contrast, ARIA labels, semantic HTML & image alt text',
    icon: 'Eye',
    toolsUsed: ['Lighthouse a11y']
  },
  {
    id: 'security-config',
    title: 'Security Configuration',
    shortDesc: 'CSP, HSTS, X-Frame-Options, TLS version & cipher strength',
    icon: 'ShieldCheck',
    toolsUsed: ['Custom Python Engine', 'OWASP ZAP']
  },
  {
    id: 'exposure',
    title: 'Exposure Checks',
    shortDesc: 'Public source maps, exposed .env, .git directories & admin routes',
    icon: 'AlertOctagon',
    toolsUsed: ['Custom Python Engine']
  },
  {
    id: 'privacy',
    title: 'Privacy Indicators',
    shortDesc: 'Cookie flags (HttpOnly, SameSite), tracker detection & policy checks',
    icon: 'Lock',
    toolsUsed: ['Custom Python Engine']
  }
];

export interface ProblemCard {
  id: string;
  title: string;
  findingCode: string;
  findingTitle: string;
  realWorldConsequence: string;
  aiOrigin: string;
  icon: string;
}

export const problemCards: ProblemCard[] = [
  {
    id: 'prob-1',
    title: 'Secret Keys & Public Source Maps Exposed',
    findingCode: 'SEC-EXP-SOURCEMAP',
    findingTitle: 'Production .js.map files served on public routes',
    realWorldConsequence: 'Competitors and bad actors reverse-engineer your entire frontend TypeScript codebase, private API paths, and internal comments in seconds.',
    aiOrigin: 'Vibe-coding prompts enable source maps for client-side debugging, but the AI forgets to strip them from production build configuration.',
    icon: 'FileCode'
  },
  {
    id: 'prob-2',
    title: 'Missing Security Headers (No CSP / HSTS)',
    findingCode: 'SEC-HDR-CSP',
    findingTitle: 'Zero Content-Security-Policy or Strict-Transport-Security',
    realWorldConsequence: 'Your domain has no baseline browser defense against client-side script injection, clickjacking, or insecure HTTP downgrades.',
    aiOrigin: 'AI website builders generate beautiful HTML/CSS components, but rarely configure reverse proxy headers or serverless response policies.',
    icon: 'ShieldAlert'
  },
  {
    id: 'prob-3',
    title: 'Broken Core Web Vitals & Hydration Delays',
    findingCode: 'PERF-LCP-HERO',
    findingTitle: '3.8s Largest Contentful Paint with uncompressed 3MB assets',
    realWorldConsequence: 'Over 40% of mobile users abandon the site before the first screen renders, while Google search algorithms depress index rankings.',
    aiOrigin: 'Generative AI tools insert high-res PNG mockups directly into JSX templates without responsive picture tags, WebP compression, or preload hints.',
    icon: 'Zap'
  },
  {
    id: 'prob-4',
    title: 'Insecure Cookie Attributes & Tracking Missteps',
    findingCode: 'SEC-COOKIE-FLAGS',
    findingTitle: 'Session cookies missing HttpOnly and SameSite flags',
    realWorldConsequence: 'User auth tokens are directly exposed to document.cookie, making session hijacking trivial if any third-party script is compromised.',
    aiOrigin: 'AI coding tools often generate simplistic client-side cookie helpers (`document.cookie = ...`) rather than secure server-set HTTP cookies.',
    icon: 'Lock'
  }
];

export interface HowItWorksStep {
  stepNumber: string;
  title: string;
  headline: string;
  description: string;
  bullets: string[];
  scopeNote?: string;
  icon: string;
}

export const howItWorksSteps: HowItWorksStep[] = [
  {
    stepNumber: '01',
    title: 'Submit Target URL',
    headline: 'Enter your live or staging URL',
    description: 'Provide any publicly reachable web address. Our engine performs instant domain normalization, protocol validation, and strict SSRF / private IP safety filtering before any scan begins.',
    bullets: [
      'HTTPS / HTTP normalization',
      'SSRF validation blocking internal AWS / cloud metadata',
      'Select Baseline Public scan or Authorized Deep scan'
    ],
    scopeNote: 'Baseline scan requires no setup or code access.',
    icon: 'Globe'
  },
  {
    stepNumber: '02',
    title: 'Safe Multi-Engine Audit',
    headline: 'Checks run strictly within your chosen scope',
    description: 'Our containerized scanning pipeline dispatches isolated inspections: public HTTP/meta analysis, Google Lighthouse headless execution, and passive header auditing.',
    bullets: [
      'Automated SEO, performance, and accessibility indicators',
      'Passive security header and cookie attribute analysis',
      'Controlled exposure probing for common build leakage'
    ],
    scopeNote: 'Deeper active scans require domain DNS or HTML challenge verification.',
    icon: 'Cpu'
  },
  {
    stepNumber: '03',
    title: 'Evidence-Backed Action',
    headline: 'Fix issues with reproducible evidence and diffs',
    description: 'Review prioritized findings classified by severity. Each finding includes the affected URL, exact HTTP headers or DOM selector, impact analysis, and ready-to-copy code remediation diffs.',
    bullets: [
      'Evidence snippets, curl commands, and DOM selectors',
      'Framework-specific fix snippets (Next.js, Vite, Express)',
      '1-click rescan to verify resolution before public launch'
    ],
    scopeNote: 'Reports distinguish observed facts from tests not performed.',
    icon: 'CheckCircle2'
  }
];

export interface CoreCapability {
  title: string;
  badge: string;
  description: string;
  scopeType: 'Externally Observable' | 'Authorized Target Only';
  checksIncluded: string[];
  icon: string;
}

export const coreCapabilities: CoreCapability[] = [
  {
    title: 'Technical SEO & Crawlability',
    badge: 'Baseline Public',
    scopeType: 'Externally Observable',
    description: 'Verifies title tags, meta descriptions, canonical URLs, robots.txt directives, XML sitemap discovery, heading hierarchies, and crawl latency hops.',
    checksIncluded: ['HTML Title & Meta Description', 'Self-referencing Canonical Links', 'Robots.txt syntax & sitemap discovery', 'Redirect chains & 301/308 loops'],
    icon: 'Compass'
  },
  {
    title: 'Performance & Core Web Vitals',
    badge: 'Baseline Public',
    scopeType: 'Externally Observable',
    description: 'Headless Chromium Lighthouse audits measuring Largest Contentful Paint (LCP), Cumulative Layout Shift (CLS), render-blocking resources, and payload sizes.',
    checksIncluded: ['Core Web Vitals metrics', 'Unoptimized imagery (PNG to WebP)', 'Render-blocking CSS/JS imports', 'Total page weight and transfer costs'],
    icon: 'Zap'
  },
  {
    title: 'Accessibility Indicators (a11y)',
    badge: 'Baseline Public',
    scopeType: 'Externally Observable',
    description: 'Automated WCAG 2.1 AA checks highlighting color contrast failures, missing ARIA attributes, empty button labels, and root HTML language definitions.',
    checksIncluded: ['Color contrast compliance (4.5:1 ratio)', 'Image alt attributes and decorative tags', 'Accessible form input labels', 'Keyboard focusability indicators'],
    icon: 'Eye'
  },
  {
    title: 'HTTPS & Security Headers',
    badge: 'Baseline Public',
    scopeType: 'Externally Observable',
    description: 'Inspects HTTP-to-HTTPS redirect enforcement, TLS protocol versions, and essential defensive headers like CSP, HSTS, X-Frame-Options, and X-Content-Type-Options.',
    checksIncluded: ['Content-Security-Policy (CSP) presence', 'Strict-Transport-Security (HSTS) preload', 'X-Frame-Options clickjacking protection', 'TLS 1.2 / 1.3 protocol negotiation'],
    icon: 'ShieldCheck'
  },
  {
    title: 'Cookies & Browser Security',
    badge: 'Baseline Public',
    scopeType: 'Externally Observable',
    description: 'Analyzes cookies set by server response headers and client JavaScript, checking for Secure, HttpOnly, and SameSite attributes, and visible consent notices.',
    checksIncluded: ['HttpOnly and Secure cookie flags', 'SameSite attribute configuration', 'Third-party tracking script detection', 'Visible privacy notice presence'],
    icon: 'Lock'
  },
  {
    title: 'Exposure & Build Misconfiguration',
    badge: 'Baseline Public',
    scopeType: 'Externally Observable',
    description: 'Safely probes for commonly leaked build artifacts, publicly exposed `.js.map` source maps, `.env` file fragments, `.git` metadata, or exposed server information headers.',
    checksIncluded: ['Public JavaScript source map detection', 'Common environment file leak checks', 'Server version banner disclosures', 'Unprotected test & debug endpoints'],
    icon: 'AlertOctagon'
  },
  {
    title: 'Deeper Authorized Security Tests',
    badge: 'Authorized Only',
    scopeType: 'Authorized Target Only',
    description: 'Integrates OWASP ZAP and ProjectDiscovery Nuclei using safe, non-destructive vulnerability templates. Requires verified DNS TXT or HTML meta token ownership.',
    checksIncluded: ['OWASP ZAP baseline active checks', 'Nuclei curated vulnerability templates', 'Subdomain scope boundary enforcement', 'Cryptographically verified target ownership'],
    icon: 'Server'
  },
  {
    title: 'Actionable Remediation Reports',
    badge: 'Included in all scans',
    scopeType: 'Externally Observable',
    description: 'Translates technical scan findings into clear, developer-friendly action items with code diffs, framework-specific tips (Next.js, Vite, Caddy), and rescan verification.',
    checksIncluded: ['Before/After code snippets', 'Impact risk and priority ranking', 'Direct links to official specs & MDN', 'Historical fix verification tracking'],
    icon: 'FileCode'
  }
];
