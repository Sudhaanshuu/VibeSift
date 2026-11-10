import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { SiteUrlForm } from './SiteUrlForm';
import * as AuthContextModule from '../../context/AuthContext';

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <MemoryRouter>
      {ui}
    </MemoryRouter>
  );
}

describe('SiteUrlForm Component', () => {
  beforeEach(() => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { id: 'usr_test', email: 'test@example.com', name: 'tester', isDemoUser: true, plan: 'free' },
      isAuthenticated: true,
      isLoading: false,
      isMockMode: true,
      login: vi.fn(),
      signup: vi.fn(),
      confirmSignup: vi.fn(),
      resendCode: vi.fn(),
      logout: vi.fn(),
      isLoginModalOpen: false,
      openLoginModal: vi.fn(),
      closeLoginModal: vi.fn(),
    });
  });

  it('renders target URL input, scope options, and submit button', () => {
    const onSubmit = vi.fn();
    renderWithProviders(<SiteUrlForm onSubmitScan={onSubmit} />);

    expect(screen.getByLabelText(/Target Website URL/i)).toBeInTheDocument();
    expect(screen.getByText(/Quick Search/i)).toBeInTheDocument();
    expect(screen.getByText(/Deep Search/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Start Website Audit/i })).toBeInTheDocument();
  });

  it('displays validation error when submitting an empty URL', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<SiteUrlForm onSubmitScan={onSubmit} />);

    const submitBtn = screen.getByRole('button', { name: /Start Website Audit/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Please enter a website URL/i)).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits normalized URL when valid inputs are entered', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<SiteUrlForm onSubmitScan={onSubmit} />);

    const input = screen.getByLabelText(/Target Website URL/i);
    fireEvent.change(input, { target: { value: 'vibesift.pixir.in' } });
    fireEvent.blur(input);

    const submitBtn = screen.getByRole('button', { name: /Start Website Audit/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
  });

  it('updates submit button to Unlock Deep Audit (₹39) when deep profile is selected', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<SiteUrlForm onSubmitScan={onSubmit} />);

    const deepRadio = screen.getByText(/Deep Search/i).closest('[role="radio"]');
    if (deepRadio) fireEvent.click(deepRadio);

    expect(screen.getByRole('button', { name: /Unlock Deep Audit \(₹39\)/i })).toBeInTheDocument();
  });
});
