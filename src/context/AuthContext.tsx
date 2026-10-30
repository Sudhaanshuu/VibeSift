import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthUser } from '../types/audit';
import { authService, mockAuthService, isMockAuthMode, SignupResult } from '../lib/api/auth';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isMockMode: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<SignupResult>;
  confirmSignup: (email: string, code: string) => Promise<{ success: boolean; message: string }>;
  resendCode: (email: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  isLoginModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  useEffect(() => {
    async function loadInitialSession() {
      try {
        const sessionUser = await authService.getCurrentSession();
        setUser(sessionUser);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    loadInitialSession();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const session = await authService.login({ email, password });
      setUser(session.user);
      setIsLoginModalOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, password: string, name: string): Promise<SignupResult> => {
    setIsLoading(true);
    try {
      const result = await authService.signup({ email, password, name });
      if (result.user) {
        setUser(result.user);
        setIsLoginModalOpen(false);
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const confirmSignup = async (email: string, code: string) => {
    setIsLoading(true);
    try {
      return await authService.confirmSignup({ email, code });
    } finally {
      setIsLoading(false);
    }
  };

  const resendCode = async (email: string) => {
    return await authService.resendCode(email);
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const openLoginModal = () => setIsLoginModalOpen(true);
  const closeLoginModal = () => setIsLoginModalOpen(false);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isMockMode: isMockAuthMode,
        login,
        signup,
        confirmSignup,
        resendCode,
        logout,
        isLoginModalOpen,
        openLoginModal,
        closeLoginModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
