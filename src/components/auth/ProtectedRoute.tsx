import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { RefreshCw } from 'lucide-react';

export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-muted flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 rounded-2xl bg-brand-mint text-brand-emerald-dark flex items-center justify-center border border-brand-border mb-3 shadow-subtle">
          <RefreshCw className="w-5 h-5 animate-spin" />
        </div>
        <p className="text-xs font-mono text-brand-text-secondary">Verifying session credentials...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};
