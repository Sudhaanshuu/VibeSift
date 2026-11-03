import React, { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { BrandLogo } from '../brand/BrandLogo';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';
import {
  LayoutDashboard,
  PlusCircle,
  History,
  Globe,
  Settings,
  LogOut,
  Menu,
  X,
  ExternalLink,
} from 'lucide-react';

export const AppShell: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/app/scans/new', label: 'New Scan', icon: PlusCircle },
    { to: '/app/history', label: 'Scan History', icon: History },
    { to: '/app/sites', label: 'Saved Websites', icon: Globe },
    { to: '/app/settings', label: 'Settings', icon: Settings },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-brand-muted flex flex-col md:flex-row antialiased text-brand-text">
      {/* Mobile Top Header */}
      <header className="md:hidden bg-white border-b border-brand-border px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <NavLink to="/" className="flex items-center gap-2">
          <BrandLogo size="sm" />
        </NavLink>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2.5 rounded-xl text-brand-text-secondary hover:bg-slate-100 hover:text-brand-text min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5 text-brand-text" />}
        </button>
      </header>

      {/* Mobile Backdrop & Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        >
          <div
            className="w-72 bg-white h-dvh max-h-screen p-5 flex flex-col justify-between shadow-elevated"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Mobile Navigation"
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-brand-border">
                <BrandLogo size="sm" />
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-3 rounded-xl text-xs font-semibold min-h-[44px] transition-colors ${
                          isActive
                            ? 'bg-brand-mint text-brand-emerald-deep font-bold border border-brand-border/60'
                            : 'text-brand-text-secondary hover:bg-slate-50 hover:text-brand-text'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-brand-border space-y-3">
              <div className="flex items-center gap-2.5 px-1">
                <div className="w-8 h-8 rounded-full bg-brand-mint text-brand-emerald-deep flex items-center justify-center font-mono font-bold text-xs border border-brand-border shrink-0">
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold text-brand-text truncate">{user?.name || 'Developer'}</p>
                  <p className="text-[10px] text-slate-400 font-mono truncate">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50 min-h-[44px] transition-colors"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-brand-border min-h-screen md:h-dvh sticky top-0 z-30 select-none">
        {/* Brand Header */}
        <div className="p-5 border-b border-brand-border">
          <NavLink to="/" className="block">
            <BrandLogo size="md" />
          </NavLink>
        </div>

        {/* Action Button */}
        <div className="p-4">
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/app/scans/new')}
            className="w-full justify-center shadow-subtle"
            leftIcon={<PlusCircle className="w-4 h-4" />}
          >
            New Audit Scan
          </Button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-brand-mint text-brand-emerald-deep font-bold shadow-subtle border border-brand-border/60'
                      : 'text-brand-text-secondary hover:bg-slate-50 hover:text-brand-text'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Profile & Logout Bottom */}
        <div className="p-4 border-t border-brand-border space-y-3 bg-brand-muted/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-brand-mint text-brand-emerald-deep flex items-center justify-center font-mono font-bold text-xs border border-brand-border shrink-0">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-brand-text truncate">{user?.name || 'Developer'}</p>
              <span className="text-[10px] text-slate-400 font-mono truncate block">{user?.email || 'developer@example.com'}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <NavLink
              to="/"
              className="text-[11px] text-slate-500 hover:text-brand-emerald-deep flex items-center gap-1 font-medium transition-colors"
            >
              <span>Public Landing</span>
              <ExternalLink className="w-3 h-3" />
            </NavLink>
            <button
              onClick={handleLogout}
              className="text-[11px] text-red-600 hover:text-red-700 font-medium flex items-center gap-1 p-1 rounded-md transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-3 h-3" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>

        {/* Authenticated Footer */}
        <footer className="border-t border-brand-border bg-white px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-brand-text-secondary">
          <div className="flex items-center gap-2">
            <span>© 2026 Pixir Operations</span>
            <span>·</span>
            <span>support@pixir.in</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium">
            <NavLink to="/pricing" className="hover:text-brand-emerald-deep transition-colors">
              Pricing (₹39 Deep)
            </NavLink>
            <span>·</span>
            <NavLink to="/terms" className="hover:text-brand-emerald-deep transition-colors">
              Terms & Consent
            </NavLink>
            <span>·</span>
            <NavLink to="/refund-policy" className="hover:text-brand-emerald-deep transition-colors">
              Cancellation & Refund
            </NavLink>
            <span>·</span>
            <NavLink to="/privacy" className="hover:text-brand-emerald-deep transition-colors">
              Privacy & DPDP
            </NavLink>
            <span>·</span>
            <NavLink to="/contact" className="hover:text-brand-emerald-deep transition-colors">
              Support
            </NavLink>
            <span>·</span>
            <a
              href="/robots.txt"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-brand-emerald-deep transition-colors font-mono"
            >
              robots.txt
            </a>
            <span>·</span>
            <a
              href="/.well-known/security.txt"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-brand-emerald-deep transition-colors font-mono"
            >
              security.txt
            </a>
            <span>·</span>
            <a
              href="/sitemap.xml"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-brand-emerald-deep transition-colors font-mono"
            >
              sitemap.xml
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
};
