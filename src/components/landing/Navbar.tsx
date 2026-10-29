import React, { useState } from 'react';
import { BrandLogo } from '../brand/BrandLogo';
import { Button } from '../common/Button';
import { useAuth } from '../../context/AuthContext';
import { useAudit } from '../../context/AuditContext';
import { Menu, X, ArrowRight, ShieldCheck, User, LogOut } from 'lucide-react';

interface NavbarProps {
  onNavigateToApp?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigateToApp }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout, openLoginModal } = useAuth();
  const { openNewScanModal } = useAudit();

  const navLinks = [
    { label: 'Product', href: '#studio' },
    { label: 'How it works', href: '#how-it-works' },
    { label: 'Precision Engine', href: '#precision' },
    { label: 'Showcase', href: '#showcase' },
    { label: 'FAQ', href: '#faq' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-brand-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo */}
          <div className="flex items-center gap-3">
            <a href="#" className="flex items-center">
              <BrandLogo size="md" showTagline={false} />
            </a>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-brand-text-secondary">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="transition-colors hover:text-brand-text hover:text-brand-emerald-dark"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onNavigateToApp}
                  leftIcon={<ShieldCheck className="w-4 h-4 text-brand-emerald" />}
                  className="rounded-full px-4"
                >
                  Dashboard
                </Button>
                <div className="flex items-center gap-1.5 pl-2 border-l border-brand-border text-xs text-brand-text-secondary">
                  <User className="w-3.5 h-3.5" />
                  <span className="font-medium text-brand-text truncate max-w-[100px]">{user?.name}</span>
                  <button 
                    onClick={logout} 
                    title="Sign Out" 
                    className="p-1 hover:text-red-600 transition-colors"
                    aria-label="Sign out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={openLoginModal}
                  className="text-sm font-medium text-brand-text-secondary hover:text-brand-text px-3 py-1.5 transition-colors"
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => openNewScanModal()}
                  className="inline-flex items-center justify-center font-bold text-sm px-5 py-2.5 rounded-full bg-brand-emerald hover:bg-brand-emerald-dark text-white shadow-subtle hover:shadow-card transition-all active:scale-[0.98] gap-1.5"
                >
                  <span>Run a free scan</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => openNewScanModal()}
              className="text-xs font-bold px-3 py-1.5 rounded-full bg-brand-emerald text-white"
            >
              Scan
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-brand-text-secondary hover:text-brand-text focus:outline-none"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-brand-border bg-white px-4 pt-2 pb-6 space-y-3 shadow-card">
          <div className="flex flex-col space-y-2.5 py-2">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-medium text-brand-text-secondary hover:text-brand-text py-1.5"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="pt-3 border-t border-brand-border flex flex-col gap-2">
            {isAuthenticated ? (
              <>
                <Button
                  variant="primary"
                  size="md"
                  className="w-full rounded-full"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (onNavigateToApp) onNavigateToApp();
                  }}
                >
                  Go to Dashboard
                </Button>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="text-xs text-center text-red-600 py-1"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openNewScanModal();
                  }}
                  className="w-full py-2.5 rounded-full bg-brand-emerald hover:bg-brand-emerald-dark text-white font-bold text-sm shadow-subtle"
                >
                  Run a free scan
                </button>
                <Button
                  variant="outline"
                  size="md"
                  className="w-full rounded-full"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openLoginModal();
                  }}
                >
                  Sign In
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
