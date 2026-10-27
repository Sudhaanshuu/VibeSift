import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { FindingFilters, FindingFilterState } from './FindingFilters';

describe('FindingFilters Component', () => {
  const initialFilters: FindingFilterState = {
    search: '',
    severity: 'all',
    category: 'all',
    verificationStatus: 'all',
  };

  it('renders search input and severity pills', () => {
    const onChange = vi.fn();
    render(
      <FindingFilters
        filters={initialFilters}
        onChange={onChange}
        severityCounts={{ critical: 1, high: 2, medium: 2, low: 1, info: 0 }}
        totalCount={6}
      />
    );

    expect(screen.getByPlaceholderText(/search findings/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /critical/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /high/i })).toBeInTheDocument();
  });

  it('triggers filter change when typing search query', () => {
    const onChange = vi.fn();
    render(<FindingFilters filters={initialFilters} onChange={onChange} />);

    const input = screen.getByPlaceholderText(/search findings/i);
    fireEvent.change(input, { target: { value: 'CSP' } });

    expect(onChange).toHaveBeenCalledWith({
      ...initialFilters,
      search: 'CSP',
    });
  });

  it('triggers filter change when selecting a severity pill', () => {
    const onChange = vi.fn();
    render(<FindingFilters filters={initialFilters} onChange={onChange} />);

    const criticalBtn = screen.getByRole('button', { name: /critical/i });
    fireEvent.click(criticalBtn);

    expect(onChange).toHaveBeenCalledWith({
      ...initialFilters,
      severity: 'critical',
    });
  });
});
