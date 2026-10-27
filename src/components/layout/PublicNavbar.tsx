import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BrandLogo } from '../brand/BrandLogo';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';
import { ArrowRight, Menu, X, ShieldCheck, ExternalLink, Sparkles } from 'lucide-react';

export const PublicNavbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, user, loginAsDemoUser } = useAuth();
  const navigate = useNavigate();

  const handleLaunchApp = () => {
    if (isAuthenticated) {
      navigate('/app');
    } else {
      navigate('/login');
    }
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-brand-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2">
            <BrandLogo size="md" />
          </Link>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-8">
            <button
              onClick={() => scrollToSection('features')}
              className="text-xs font-semibold text-brand-text-secondary hover:text-brand-text transition-colors"
            >
              Audited Categories
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="text-xs font-semibold text-brand-text-secondary hover:text-brand-text transition-colors"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('interactive-preview')}
              className="text-xs font-semibold text-brand-text-secondary hover:text-brand-text transition-colors"
            >
              Interactive Report
            </button>
            <button
              onClick={() => scrollToSection('sample-reports')}
              className="text-xs font-semibold text-brand-text-secondary hover:text-brand-text transition-colors"
            >
              Sample Audits
            </button>
            <button
              onClick={() => scrollToSection('faq')}
              className="text-xs font-semibold text-brand-text-secondary hover:text-brand-text transition-colors"
            >
              FAQ
            </button>
          </nav>

          {/* Right CTA */}
          <div className="hidden sm:flex items-center gap-3">
            {isAuthenticated ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/app')}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Go to Dashboard
              </Button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-xs font-semibold text-brand-text hover:text-brand-emerald px-3 py-2 rounded-lg transition-colors"
                >
                  Sign In
                </Link>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/app/scans/new')}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Start Free Audit
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-brand-text-secondary hover:bg-slate-100"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5 text-brand-text" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-brand-border bg-white px-4 pt-3 pb-6 space-y-3 shadow-card">
          <nav className="flex flex-col space-y-2">
            <button
              onClick={() => scrollToSection('features')}
              className="text-left py-2 text-xs font-semibold text-brand-text hover:text-brand-emerald"
            >
              Audited Categories
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="text-left py-2 text-xs font-semibold text-brand-text hover:text-brand-emerald"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('sample-reports')}
              className="text-left py-2 text-xs font-semibold text-brand-text hover:text-brand-emerald"
            >
              Sample Audits
            </button>
            <button
              onClick={() => scrollToSection('faq')}
              className="text-left py-2 text-xs font-semibold text-brand-text hover:text-brand-emerald"
            >
              FAQ
            </button>
          </nav>

          <div className="pt-3 border-t border-brand-border flex flex-col gap-2">
            {isAuthenticated ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/app')}
                className="w-full justify-center"
              >
                Go to Dashboard
              </Button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="w-full text-center py-2 text-xs font-semibold text-brand-text hover:bg-slate-50 rounded-lg"
                >
                  Sign In
                </Link>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/app/scans/new')}
                  className="w-full justify-center"
                >
                  Start Free Audit
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
