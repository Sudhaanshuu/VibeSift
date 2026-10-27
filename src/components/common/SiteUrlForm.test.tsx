import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { SiteUrlForm } from './SiteUrlForm';

describe('SiteUrlForm Component', () => {
  it('renders target URL input, scope options, and submit button', () => {
    const onSubmit = vi.fn();
    render(<SiteUrlForm onSubmitScan={onSubmit} />);

    expect(screen.getByLabelText(/Target Website URL/i)).toBeInTheDocument();
    expect(screen.getByText(/Baseline Public Scan/i)).toBeInTheDocument();
    expect(screen.getByText(/Authorized Deep Scan/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Start Website Audit/i })).toBeInTheDocument();
  });

  it('displays validation error when submitting an empty URL', async () => {
    const onSubmit = vi.fn();
    render(<SiteUrlForm onSubmitScan={onSubmit} />);

    const submitBtn = screen.getByRole('button', { name: /Start Website Audit/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Please enter a website URL/i)).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits normalized URL when valid inputs are entered', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<SiteUrlForm onSubmitScan={onSubmit} />);

    const input = screen.getByLabelText(/Target Website URL/i);
    fireEvent.change(input, { target: { value: 'vibesift.pixir.in' } });
    fireEvent.blur(input);

    const submitBtn = screen.getByRole('button', { name: /Start Website Audit/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
  });
});
