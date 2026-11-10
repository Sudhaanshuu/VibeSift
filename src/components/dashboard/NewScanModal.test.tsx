import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { NewScanModal } from './NewScanModal';
import * as AuditContextModule from '../../context/AuditContext';
import * as AuthContextModule from '../../context/AuthContext';
import * as scansApi from '../../lib/api/scans';

function renderModal() {
  return render(
    <MemoryRouter>
      <NewScanModal />
    </MemoryRouter>
  );
}

describe('NewScanModal Component', () => {
  const mockStartNewScan = vi.fn();
  const mockCloseNewScanModal = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { id: 'usr_test_1', email: 'user@example.com', name: 'Tester', isDemoUser: false, plan: 'free' },
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

    vi.spyOn(AuditContextModule, 'useAudit').mockReturnValue({
      isNewScanModalOpen: true,
      closeNewScanModal: mockCloseNewScanModal,
      prefilledScanUrl: 'https://pixir.in',
      prefilledScanProfile: 'authorized_deep',
      startNewScan: mockStartNewScan,
      savedWebsites: [],
      isScanning: false,
      scanProgress: null,
      activeReport: null,
      setActiveReport: vi.fn(),
      loadSampleReport: vi.fn(),
      scansList: [],
      rescanWebsite: vi.fn(),
      markFindingResolved: vi.fn(),
      verifyDomain: vi.fn(),
      addSavedWebsite: vi.fn(),
      openNewScanModal: vi.fn(),
    });
  });

  it('passes profile to precheck and triggers Razorpay paywall upon re-audit instead of 402 payment error', async () => {
    const precheckSpy = vi.spyOn(scansApi, 'precheckScanTarget').mockResolvedValue({
      exists: true,
      scanId: 'scn_cached_pixir_deep',
      targetUrl: 'https://pixir.in',
      normalizedHostname: 'pixir.in',
      scanProfile: 'authorized_deep',
      createdAt: new Date().toISOString(),
      readinessScore: 94,
    });

    renderModal();

    // Wait for Turnstile to verify in test environment
    await waitFor(() => {
      expect(screen.getByText('Verified')).toBeInTheDocument();
    });

    const urlInput = screen.getByPlaceholderText(/yourwebsite.com/i);
    fireEvent.change(urlInput, { target: { value: 'https://pixir.in' } });

    // Verify modal is open and has prefilled URL and Deep Search
    expect(screen.getByDisplayValue('https://pixir.in')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Unlock Deep Audit \(₹39\)/i })).toBeInTheDocument();

    // Click submit
    const submitBtn = screen.getByRole('button', { name: /Unlock Deep Audit \(₹39\)/i });
    fireEvent.click(submitBtn);

    // Verify precheck was called with url AND 'authorized_deep' (not treating basic and deep as the same!)
    await waitFor(() => {
      expect(precheckSpy).toHaveBeenCalledWith('https://pixir.in', 'authorized_deep');
    });

    // ExistingAuditModal should be visible
    await waitFor(() => {
      expect(screen.getByText(/Existing Audit Found in S3/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Re-audit Again \(₹39\)/i })).toBeInTheDocument();
    });

    // Click "Re-audit Again (₹39)"
    const reauditBtn = screen.getByRole('button', { name: /Re-audit Again \(₹39\)/i });
    fireEvent.click(reauditBtn);

    // CRITICAL: The Razorpay paywall MUST open now so user can complete payment
    // It should NOT directly call startNewScan without payment!
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Unlock Deep Audit/i })).toBeInTheDocument();
      expect(screen.getByText(/Included in Deep Search:/i)).toBeInTheDocument();
    });

    // startNewScan should NOT have been called yet (user needs to pay via Razorpay first)
    expect(mockStartNewScan).not.toHaveBeenCalled();

    // User should NOT see the 402 error "Payment required: Deep Search costs ₹39 per scan"
    expect(screen.queryByText(/Payment required: Deep Search costs ₹39 per scan/i)).not.toBeInTheDocument();
  });
});
