export interface BrandConfig {
  name: string;
  shortName: string;
  subBrand: string;
  tagline: string;
  domain: string;
  heroHeadline: string;
  heroSubtitle: string;
  scopeNotice: string;
  contactEmail: string;
  copyrightYear: number;
  palette: {
    bg: string;
    text: string;
    secondaryText: string;
    paleMint: string;
    lightGreenCard: string;
    primaryEmerald: string;
    darkEmerald: string;
    vibrantGreen: string;
    border: string;
    mutedBg: string;
  };
}

export const brandConfig: BrandConfig = {
  name: "VibeSift",
  shortName: "VibeSift",
  subBrand: "by Pixir",
  tagline: "Website launch-readiness auditor",
  domain: "vibesift.pixir.in",
  heroHeadline: "Find what your AI-built website missed before launch.",
  heroSubtitle: "Audit SEO, performance, accessibility, and website security configuration in one evidence-backed report. Find problems before your users do.",
  scopeNotice: "Start with public website checks. Deeper security testing requires verified ownership or explicit authorization.",
  contactEmail: "audit@pixir.in",
  copyrightYear: 2026,
  palette: {
    bg: "#FFFFFF",
    text: "#17221C",
    secondaryText: "#65736A",
    paleMint: "#EAF4EC",
    lightGreenCard: "#F4FAF6",
    primaryEmerald: "#22C55E",
    darkEmerald: "#16A34A",
    vibrantGreen: "#22C55E",
    border: "#DFE9E2",
    mutedBg: "#F7FAF8",
  }
};
