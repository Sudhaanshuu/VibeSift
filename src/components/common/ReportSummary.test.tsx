import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ReportSummary } from './ReportSummary';
import { sampleReports } from '../../data/sampleReports';

describe('ReportSummary Component', () => {
  const sample = sampleReports['react-vite-landing'];

  it('renders target hostname and readiness score', () => {
    render(<ReportSummary report={sample} />);

    expect(screen.getByText(sample.normalizedHostname)).toBeInTheDocument();
    // Check score is displayed
    expect(screen.getByText(sample.summary.readinessScore.toString())).toBeInTheDocument();
    expect(screen.getByText(/Launch Readiness Index/i)).toBeInTheDocument();
  });

  it('renders severity breakdown and category scores', () => {
    render(<ReportSummary report={sample} />);

    expect(screen.getByText(/Critical Risk/i)).toBeInTheDocument();
    expect(screen.getByText(/High Priority/i)).toBeInTheDocument();
    expect(screen.getByText(/Category Quality Index/i)).toBeInTheDocument();
  });
});
