export interface FaqItem {
  question: string;
  answer: string;
  category: 'scope' | 'security' | 'technical' | 'privacy';
}

export const faqItems: FaqItem[] = [
  {
    category: 'scope',
    question: "What is checked in a free baseline scan?",
    answer: "A free baseline scan performs safe, non-destructive external inspections against the public URL. This includes technical SEO crawlability (title tags, meta descriptions, canonical links, robots.txt, sitemaps), Core Web Vitals and Lighthouse performance metrics, automated WCAG accessibility indicators, TLS/HTTPS configuration, HTTP security response headers (CSP, HSTS, X-Frame-Options), cookie security flags, and checks for commonly exposed sensitive files (such as public source maps, .env files, or git metadata). It never performs aggressive fuzzing or destructive testing."
  },
  {
    category: 'security',
    question: "Does the scanner modify or disrupt websites?",
    answer: "No. All baseline scans use strictly passive HTTP requests, standard browser rendering (via headless Chromium for Lighthouse), and polite request rates. The scanner never modifies your database, alters your pages, submits destructive forms, or consumes abnormal bandwidth. Rate limits and bounded concurrency ensure minimal server load."
  },
  {
    category: 'security',
    question: "What happens during deeper security testing?",
    answer: "Deeper security testing runs bounded checks using industry-standard tools such as OWASP ZAP and ProjectDiscovery Nuclei with curated, non-destructive vulnerability templates. To protect developers and web hosts, deeper scanning is strictly gated behind cryptographic domain ownership verification (DNS TXT record or HTML meta tag challenge) and explicit authorization. We never run active penetration tests against arbitrary or unverified third-party targets."
  },
  {
    category: 'technical',
    question: "Can it detect SQL injection?",
    answer: "A public URL baseline scan cannot reliably detect backend SQL injection, because it does not have authenticated access, database telemetry, or permission to execute active injection payloads. Deeper authorized scans can identify observable parameter reflection or error anomalies, but cannot inspect your internal SQL queries, ORM layers, or database logic directly."
  },
  {
    category: 'technical',
    question: "Does the platform access private databases or source code?",
    answer: "No. The platform audits the externally observable surface of your deployed web application from an end-user and crawler perspective. It does not connect to your internal VPC, private databases, AWS IAM roles, or private GitHub repositories. However, if your build process accidentally exposes public source maps or configuration files on the web server, the scanner will detect and flag those exposed artifacts."
  },
  {
    category: 'privacy',
    question: "Are the audit results a legal compliance certification?",
    answer: "No. The audit report provides technical findings, observable indicators, and best-practice guidance, not formal legal certification or legal advice. Having a cookie banner, privacy policy link, or robots.txt file alone does not guarantee compliance with GDPR, CCPA, or regional data protection laws (such as India's DPDP Act). Legal compliance depends on your actual data processing agreements, backend storage practices, and legal jurisdiction."
  },
  {
    category: 'privacy',
    question: "How are audit reports stored and handled?",
    answer: "Scans run by signed-in users are securely stored in your private account history in Amazon DynamoDB and encrypted Amazon S3 buckets with strict least-privilege IAM policies. Sensitive values (such as discovered API keys or secret tokens) are automatically redacted in report summaries. You can delete individual reports or your entire scan history at any time from your account settings."
  },
  {
    category: 'scope',
    question: "Can I rescan my website after fixing identified issues?",
    answer: "Yes! Rescanning is a core feature of the platform. After deploying your remediation (e.g. adding a Content-Security-Policy header or compressing hero images), you can trigger an instant rescan. The report will compare results, mark previously open findings as 'Fixed', and update your launch readiness score so you have clear verification before going live."
  }
];
