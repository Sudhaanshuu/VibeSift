import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { App } from './App';

describe('VibeSift App Page Load & Smoke Integrity Suite', () => {
  beforeEach(() => {
    // Mock scrollTo in jsdom
    window.scrollTo = vi.fn();
  });

  it('renders App cleanly without throwing router or rendering exceptions', () => {
    // This smoke test guarantees no blank page crashes occur on load
    const { container } = render(<App />);
    expect(container).toBeDefined();
    
    // Header brand verification
    expect(screen.getAllByText(/VibeSift/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/by Pixir/i)[0]).toBeInTheDocument();
  });

  it('renders all core landing page sections properly on the home page', () => {
    render(<App />);

    // 1. Hero Section
    expect(screen.getByText(/Find what your/i)).toBeInTheDocument();
    expect(screen.getByText(/AI-built website/i)).toBeInTheDocument();
    expect(screen.getAllByPlaceholderText(/https:\/\/yourwebsite\.com/i).length).toBeGreaterThanOrEqual(1);

    // 2. Three Pillars Section (Elevated, Non-flat)
    expect(screen.getByText(/Three Core Dimensions/i)).toBeInTheDocument();
    expect(screen.getByText(/Defensive Security & Exposure Guard/i)).toBeInTheDocument();
    expect(screen.getByText(/Edge Performance & Core Web Vitals/i)).toBeInTheDocument();
    expect(screen.getByText(/Technical SEO & Accessibility \(a11y\)/i)).toBeInTheDocument();

    // 3. Pre-Launch Studio
    expect(screen.getByText(/Complete Pre-Launch Studio/i)).toBeInTheDocument();

    // 4. Precision Benchmark
    expect(screen.getByText(/How Does VibeSift Catch Hidden Pre-Launch Defects\?/i)).toBeInTheDocument();

    // 5. Multi-Sector Showcase
    expect(screen.getByText(/One Launch Audit/i)).toBeInTheDocument();
    expect(screen.getByText(/Infinite Pre-Launch Confidence/i)).toBeInTheDocument();

    // 6. How it works
    expect(screen.getByText(/Three steps from uncertainty/i)).toBeInTheDocument();

    // 7. Testing Scope
    expect(screen.getByText(/Clear boundaries/i)).toBeInTheDocument();

    // 8. FAQ
    expect(screen.getByText(/Everything you need to know/i)).toBeInTheDocument();

    // 9. Pre-Footer CTA
    expect(screen.getByText(/Launch with fewer blind spots/i)).toBeInTheDocument();

    // 10. Rich Footer
    expect(screen.getAllByText(/vibesift\.pixir\.in/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/All 24 Scanning Engines Operational/i)).toBeInTheDocument();
  });

  it('submitting a URL in the hero section opens the scan modal', async () => {
    render(<App />);

    const inputs = screen.getAllByPlaceholderText(/https:\/\/yourwebsite\.com/i);
    const heroInput = inputs[0];
    fireEvent.change(heroInput, { target: { value: 'https://mysite.dev' } });

    const scanButtons = screen.getAllByRole('button', { name: /Run free baseline scan/i });
    fireEvent.click(scanButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Configure Pre-Launch Audit/i)).toBeInTheDocument();
    });
  });

  it('navigates to Page 1: "Audit Methodology & Vectors" from footer and returns to Home', async () => {
    render(<App />);

    // Click link in footer
    const methodologyBtn = screen.getByRole('button', { name: /Audit Methodology & Vectors/i });
    fireEvent.click(methodologyBtn);

    // Verify Page 1 mounts cleanly
    await waitFor(() => {
      expect(screen.getByText(/TECHNICAL SPECIFICATION/i)).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Eight Specialized Vectors/i })).toBeInTheDocument();
    });

    // Click Home button in header
    const homeBtn = screen.getAllByRole('button', { name: /^Home$/i })[0];
    fireEvent.click(homeBtn);

    // Verify Home page returns
    await waitFor(() => {
      expect(screen.getByText(/Find what your/i)).toBeInTheDocument();
    });
  });

  it('navigates to Page 2: "Sample Audit Reports & Diffs" from footer and returns to Home', async () => {
    render(<App />);

    // Click link in footer
    const sampleReportsBtn = screen.getByRole('button', { name: /Sample Audit Reports & Diffs/i });
    fireEvent.click(sampleReportsBtn);

    // Verify Page 2 mounts cleanly
    await waitFor(() => {
      expect(screen.getByText(/INTERACTIVE DEMO SUITE/i)).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Sample Audit Reports/i })).toBeInTheDocument();
    });

    // Click Home button in header
    const homeBtn = screen.getAllByRole('button', { name: /^Home$/i })[0];
    fireEvent.click(homeBtn);

    // Verify Home page returns
    await waitFor(() => {
      expect(screen.getByText(/Find what your/i)).toBeInTheDocument();
    });
  });

  it('navigates to Page 3: "Actionable Remediation Specs" from footer and returns to Home', async () => {
    render(<App />);

    // Click link in footer
    const remediationBtn = screen.getByRole('button', { name: /Actionable Remediation Specs/i });
    fireEvent.click(remediationBtn);

    // Verify Page 3 mounts cleanly
    await waitFor(() => {
      expect(screen.getByText(/DEVELOPER REMEDIATION SUITE/i)).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Actionable Remediation Specs/i })).toBeInTheDocument();
    });

    // Click Home button in header
    const homeBtn = screen.getAllByRole('button', { name: /^Home$/i })[0];
    fireEvent.click(homeBtn);

    // Verify Home page returns
    await waitFor(() => {
      expect(screen.getByText(/Find what your/i)).toBeInTheDocument();
    });
  });

  it('navigates to Page 4: "Privacy Policy & Data Collection" from footer and returns to Home', async () => {
    render(<App />);

    // Click Privacy Policy in footer
    const privacyBtn = screen.getAllByRole('button', { name: /Privacy Policy/i })[0];
    fireEvent.click(privacyBtn);

    // Verify Privacy Policy mounts cleanly
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Privacy Policy & Data Collection Disclosures/i })).toBeInTheDocument();
      expect(screen.getByText(/Automated Secret Redaction Policy/i)).toBeInTheDocument();
      expect(screen.getByText(/Zero Model Training & Third-Party Sharing/i)).toBeInTheDocument();
    });

    // Click Home button in header
    const homeBtn = screen.getAllByRole('button', { name: /^Home$/i })[0];
    fireEvent.click(homeBtn);

    // Verify Home page returns
    await waitFor(() => {
      expect(screen.getByText(/Find what your/i)).toBeInTheDocument();
    });
  });

  it('navigates to Page 5: "Security & Responsible Disclosure (RFC 9116)" from footer and returns to Home', async () => {
    render(<App />);

    // Click Security link in footer
    const securityBtn = screen.getAllByRole('button', { name: /Responsible Scanning \(RFC 9116\)|Security Policy/i })[0];
    fireEvent.click(securityBtn);

    // Verify Security Policy mounts cleanly
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Security & Responsible Disclosure Policy/i })).toBeInTheDocument();
      expect(screen.getByText(/Server-Side Request Forgery \(SSRF\) Defense/i)).toBeInTheDocument();
      expect(screen.getByText(/Safe Harbor for Ethical Security Researchers/i)).toBeInTheDocument();
    });

    // Click Home button in header
    const homeBtn = screen.getAllByRole('button', { name: /^Home$/i })[0];
    fireEvent.click(homeBtn);

    // Verify Home page returns
    await waitFor(() => {
      expect(screen.getByText(/Find what your/i)).toBeInTheDocument();
    });
  });

  it('renders and interacts with cookie consent preferences modal', async () => {
    localStorage.clear();
    render(<App />);

    // Click Cookie Settings from footer
    const cookieSettingsBtn = screen.getAllByRole('button', { name: /Cookie Settings|Cookie Preferences/i })[0];
    fireEvent.click(cookieSettingsBtn);

    // Modal should be open
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Cookie & Data Storage Settings/i })).toBeInTheDocument();
      expect(screen.getByText(/Strictly Necessary \(Required\)/i)).toBeInTheDocument();
    });

    // Click Accept All
    const acceptAllBtn = screen.getByRole('button', { name: /Accept All/i });
    fireEvent.click(acceptAllBtn);

    // Local storage should now have consent
    const consent = JSON.parse(localStorage.getItem('vibesift_cookie_consent_v1') || '{}');
    expect(consent.necessary).toBe(true);
    expect(consent.analytics).toBe(true);
    expect(consent.preferences).toBe(true);
  });
});
