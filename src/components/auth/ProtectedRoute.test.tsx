import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import * as AuthContextModule from '../../context/AuthContext';

describe('ProtectedRoute Guard', () => {
  it('redirects unauthenticated users to /login', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
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

    render(
      <MemoryRouter initialEntries={['/app']}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/app" element={<div>Protected Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Dashboard')).not.toBeInTheDocument();
  });

  it('allows access to protected routes when authenticated', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { id: 'usr_123', email: 'alex@example.com', name: 'Alex', isDemoUser: true, plan: 'verified_developer' },
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

    render(
      <MemoryRouter initialEntries={['/app']}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/app" element={<div>Protected Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Protected Dashboard')).toBeInTheDocument();
  });
});
