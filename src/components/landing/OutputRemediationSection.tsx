import React from 'react';
import { 
  ShieldCheck, 
  Terminal, 
  Code, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  HelpCircle,
  FileText
} from 'lucide-react';

export const OutputRemediationSection: React.FC = () => {
  const outputs = [
    {
      title: 'Severity Classifications',
      description: 'Findings are categorized as Critical, High, Medium, Low, or Informational based on verifiable impact rather than arbitrary inflated scare tactics.',
      icon: AlertTriangle,
    },
    {
      title: 'Reproducible Evidence & Curl',
      description: 'Every finding contains exact HTTP response headers, DOM selectors, or full terminal curl commands so developers can reproduce the observation in seconds.',
      icon: Terminal,
    },
    {
      title: 'Affected URLs & Selectors',
      description: 'Specific targets and code locations are mapped directly to endpoints, stylesheets, or DOM elements rather than vague site-wide generalities.',
      icon: Code,
    },
    {
      title: 'Practical Code Diffs',
      description: 'Before-and-after code snippets tailored to modern web frameworks (Next.js, Vite, Caddy, Vercel) ready to copy directly into configuration files.',
      icon: FileText,
    },
    {
      title: 'Fix Verification Status',
      description: 'Track fixes from Open to Resolved. Re-scan your site to confirm issues are eliminated before public release announcements.',
      icon: CheckCircle2,
    },
    {
      title: 'Checks Not Performed List',
      description: 'Complete transparency on tests that could not be evaluated (e.g. backend SQL fuzzing or private VPC permissions), preventing false security assumptions.',
      icon: HelpCircle,
    },
  ];

  return (
    <section className="py-16 sm:py-24 bg-white border-b border-brand-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-mint text-brand-emerald-dark text-xs font-semibold mb-3 border border-brand-border">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-emerald" />
            <span>Developer-Grade Transparency</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-brand-text">
            What you actually get: <br />
            <span className="text-brand-emerald">Actionable findings, not mystery numbers.</span>
          </h2>

          <p className="mt-4 text-base sm:text-lg text-brand-text-secondary leading-relaxed">
            Most audit tools deliver an opaque grade with generic advice. We provide rigorous, evidence-backed inspection reports designed for developers who need to fix code immediately.
          </p>
        </div>

        {/* 6 Feature Blocks */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {outputs.map((out, idx) => {
            const Icon = out.icon;
            return (
              <div 
                key={idx}
                className="p-6 rounded-2xl bg-brand-card-green/40 border border-brand-border hover:bg-white hover:border-brand-emerald/40 hover:shadow-subtle transition-all duration-200"
              >
                <div className="w-10 h-10 rounded-xl bg-brand-mint text-brand-emerald-dark flex items-center justify-center mb-4 border border-brand-border">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-brand-text mb-2">
                  {out.title}
                </h3>
                <p className="text-xs sm:text-sm text-brand-text-secondary leading-relaxed">
                  {out.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Quality quote banner */}
        <div className="mt-12 p-6 rounded-2xl bg-brand-muted border border-brand-border text-center max-w-3xl mx-auto">
          <p className="text-xs sm:text-sm font-medium text-brand-text italic leading-relaxed">
            "A missing HTTP header may be an important hygiene finding, but it is not automatically a confirmed exploitable vulnerability. Proportionate severity and reproducible evidence build trust."
          </p>
        </div>

      </div>
    </section>
  );
};
