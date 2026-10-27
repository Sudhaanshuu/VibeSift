import React, { useState } from 'react';
import { SeverityBadge } from '../common/SeverityBadge';
import { CategoryBadge } from '../common/CategoryBadge';
import { 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  ArrowRight, 
  Code2, 
  ShieldCheck, 
  Terminal,
  Sparkles
} from 'lucide-react';

export const BeforeAfterSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'csp' | 'title' | 'sourcemap'>('csp');

  const comparisons = {
    csp: {
      title: 'Content-Security-Policy (CSP) Header Verification',
      category: 'security' as const,
      severity: 'high' as const,
      ruleId: 'SEC-HDR-CSP',
      before: {
        status: 'OPEN FINDING · High Severity',
        httpResponse: 'HTTP/2 200 OK\ncontent-type: text/html; charset=utf-8\nserver: cloudflare\n/* Content-Security-Policy header is completely absent */',
        scanResult: 'Browser executes any injected third-party JavaScript without origin restriction.',
        readinessImpact: '-10 pts',
      },
      fix: {
        file: 'next.config.js / vercel.json',
        code: `// vercel.json\n{\n  "headers": [{\n    "source": "/(.*)",\n    "headers": [{\n      "key": "Content-Security-Policy",\n      "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';"\n    }]\n  }]\n}`
      },
      after: {
        status: 'VERIFIED FIXED ON RESCAN',
        httpResponse: 'HTTP/2 200 OK\ncontent-type: text/html; charset=utf-8\ncontent-security-policy: default-src \'self\'; script-src \'self\';\nserver: cloudflare',
        scanResult: 'Automated re-scan confirmed CSP header present and correctly structured.',
        readinessImpact: '+10 pts restored (Launch Ready)',
      }
    },
    title: {
      title: 'Missing Page Title Tag & Open Graph Metadata',
      category: 'seo' as const,
      severity: 'medium' as const,
      ruleId: 'SEO-META-TITLE',
      before: {
        status: 'OPEN FINDING · Medium Severity',
        httpResponse: '<head>\n  <!-- <title> tag missing completely -->\n  <meta name="viewport" content="width=device-width" />\n</head>',
        scanResult: 'Search engine bots crawl the URL as an untitled document, hurting SERP click rates.',
        readinessImpact: '-6 pts',
      },
      fix: {
        file: 'src/App.tsx or index.html',
        code: `<head>\n  <title>VibePulse — Real-Time Developer Analytics</title>\n  <meta name="description" content="Launch-ready uptime and error monitoring for modern web apps." />\n  <link rel="canonical" href="https://vibepulse.dev/" />\n</head>`
      },
      after: {
        status: 'VERIFIED FIXED ON RESCAN',
        httpResponse: '<head>\n  <title>VibePulse — Real-Time Developer Analytics</title>\n  <meta name="description" content="Launch-ready uptime..." />\n</head>',
        scanResult: 'Subsequent crawler verification confirmed 48-character title tag with primary keywords.',
        readinessImpact: '+6 pts restored (Passing)',
      }
    },
    sourcemap: {
      title: 'Public Source Map Exposure',
      category: 'exposure' as const,
      severity: 'high' as const,
      ruleId: 'SEC-EXP-SOURCEMAP',
      before: {
        status: 'OPEN FINDING · High Severity',
        httpResponse: 'GET /assets/main-chunk.js.map HTTP/1.1\nHTTP/1.1 200 OK\nContent-Type: application/json\n/* Source map reveals internal TypeScript files and private comments */',
        scanResult: 'Original unminified frontend source code is publicly accessible on the internet.',
        readinessImpact: '-12 pts',
      },
      fix: {
        file: 'vite.config.ts',
        code: `// vite.config.ts\nexport default defineConfig({\n  build: {\n    sourcemap: false // Strip source maps from public distribution\n  }\n});`
      },
      after: {
        status: 'VERIFIED FIXED ON RESCAN',
        httpResponse: 'GET /assets/main-chunk.js.map HTTP/1.1\nHTTP/1.1 404 Not Found\n/* Source maps no longer deployed to public directory */',
        scanResult: 'Automated probe verified 404 response. Source code leakage eliminated.',
        readinessImpact: '+12 pts restored',
      }
    }
  };

  const current = comparisons[activeTab];

  return (
    <section className="py-16 sm:py-24 bg-white border-b border-brand-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-mint text-brand-emerald-dark text-xs font-semibold mb-3 border border-brand-border">
            <RefreshCw className="w-3.5 h-3.5 text-brand-emerald" />
            <span>Rescan Verification Loop</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-brand-text">
            Fix the issue. <br />
            <span className="text-brand-emerald">Verify the resolution immediately.</span>
          </h2>

          <p className="mt-4 text-base sm:text-lg text-brand-text-secondary leading-relaxed">
            See how a technical finding transitions from an open risk to verified resolution after deploying your fix and running a follow-up audit.
          </p>

          {/* Interactive Case Selector */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => setActiveTab('csp')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                activeTab === 'csp'
                  ? 'bg-brand-emerald text-white border-brand-emerald shadow-subtle'
                  : 'bg-brand-muted text-brand-text-secondary border-brand-border hover:bg-white'
              }`}
            >
              Case 1: Missing CSP Header
            </button>
            <button
              onClick={() => setActiveTab('sourcemap')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                activeTab === 'sourcemap'
                  ? 'bg-brand-emerald text-white border-brand-emerald shadow-subtle'
                  : 'bg-brand-muted text-brand-text-secondary border-brand-border hover:bg-white'
              }`}
            >
              Case 2: Public Source Map Leak
            </button>
            <button
              onClick={() => setActiveTab('title')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                activeTab === 'title'
                  ? 'bg-brand-emerald text-white border-brand-emerald shadow-subtle'
                  : 'bg-brand-muted text-brand-text-secondary border-brand-border hover:bg-white'
              }`}
            >
              Case 3: Missing SEO Title Tag
            </button>
          </div>
        </div>

        {/* Comparison Showcase Container */}
        <div className="rounded-2xl border-2 border-brand-border bg-brand-muted/30 p-6 sm:p-8 shadow-elevated">
          
          {/* Finding Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-brand-border mb-6">
            <div className="flex items-center gap-2">
              <SeverityBadge severity={current.severity} size="sm" />
              <CategoryBadge category={current.category} size="sm" />
              <span className="font-mono text-xs font-bold text-brand-text-secondary bg-white px-2 py-0.5 rounded border border-brand-border">
                {current.ruleId}
              </span>
              <h3 className="text-base sm:text-lg font-bold text-brand-text ml-1">
                {current.title}
              </h3>
            </div>

            <span className="text-[11px] font-medium text-brand-text-secondary italic">
              *Illustrative workflow example
            </span>
          </div>

          {/* 3 Column Grid: Before -> Fix -> After */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* Step 1: Before Fix */}
            <div className="lg:col-span-4 rounded-xl border border-red-200 bg-red-50/40 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-800 bg-red-100 px-2 py-0.5 rounded border border-red-200">
                    Scan 1 · Initial Baseline
                  </span>
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>

                <h4 className="text-sm font-bold text-red-950 mb-2">
                  {current.before.status}
                </h4>

                <div className="bg-white rounded-lg border border-red-200 p-3 font-mono text-[11px] text-red-900 mb-3 overflow-x-auto">
                  <pre className="whitespace-pre-wrap">{current.before.httpResponse}</pre>
                </div>

                <p className="text-xs text-red-800 leading-relaxed">
                  {current.before.scanResult}
                </p>
              </div>

              <div className="pt-4 border-t border-red-200/80 mt-4 flex items-center justify-between text-xs text-red-900 font-bold">
                <span>Readiness Penalty:</span>
                <span className="font-mono text-red-700">{current.before.readinessImpact}</span>
              </div>
            </div>

            {/* Step 2: Code Remediation */}
            <div className="lg:col-span-4 rounded-xl border border-brand-border bg-white p-5 flex flex-col justify-between shadow-subtle">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-emerald bg-brand-mint px-2 py-0.5 rounded border border-brand-border">
                    Developer Remediation
                  </span>
                  <Code2 className="w-5 h-5 text-brand-emerald" />
                </div>

                <h4 className="text-sm font-bold text-brand-text mb-1">
                  Apply Framework Fix
                </h4>
                <p className="text-[11px] font-mono text-brand-text-secondary mb-3">
                  File: {current.fix.file}
                </p>

                <div className="bg-gray-900 rounded-lg p-3 font-mono text-[11px] text-emerald-400 overflow-x-auto shadow-inner">
                  <pre className="whitespace-pre-wrap">{current.fix.code}</pre>
                </div>
              </div>

              <div className="pt-4 border-t border-brand-border mt-4 flex items-center justify-between text-xs text-brand-text-secondary">
                <span>Deploy to production</span>
                <span className="font-semibold text-brand-emerald flex items-center gap-1">
                  Trigger Rescan <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>

            {/* Step 3: Verified After Rescan */}
            <div className="lg:col-span-4 rounded-xl border border-emerald-300 bg-emerald-50/50 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                    Scan 2 · Re-scan Verified
                  </span>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>

                <h4 className="text-sm font-bold text-emerald-950 mb-2">
                  {current.after.status}
                </h4>

                <div className="bg-white rounded-lg border border-emerald-200 p-3 font-mono text-[11px] text-emerald-900 mb-3 overflow-x-auto">
                  <pre className="whitespace-pre-wrap">{current.after.httpResponse}</pre>
                </div>

                <p className="text-xs text-emerald-800 leading-relaxed">
                  {current.after.scanResult}
                </p>
              </div>

              <div className="pt-4 border-t border-emerald-200/80 mt-4 flex items-center justify-between text-xs text-emerald-900 font-bold">
                <span>Score Impact:</span>
                <span className="font-mono text-emerald-700">{current.after.readinessImpact}</span>
              </div>
            </div>

          </div>

          {/* Workflow disclaimer footnote */}
          <div className="mt-6 pt-4 border-t border-brand-border text-center text-xs text-brand-text-secondary">
            <span className="font-semibold text-brand-text">Verification Guarantee: </span>
            Rescans evaluate live target behavior against deterministic rules. We never make fabricated claims that every site becomes completely secure—only that specific observed misconfigurations are confirmed resolved.
          </div>

        </div>

      </div>
    </section>
  );
};
