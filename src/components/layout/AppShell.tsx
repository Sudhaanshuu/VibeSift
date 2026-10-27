import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation, Outlet } from 'react-router-dom';
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
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  User,
  FlaskConical,
} from 'lucide-react';

export const AppShell: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout, isMockMode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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
      <div className="md:hidden bg-white border-b border-brand-border px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <NavLink to="/" className="flex items-center gap-2">
          <BrandLogo size="sm" />
        </NavLink>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg text-brand-text-secondary hover:bg-slate-100"
          aria-label="Toggle mobile navigation menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5 text-brand-text" />}
        </button>
      </div>

      {/* Mobile Backdrop & Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-72 bg-white h-full p-5 flex flex-col justify-between shadow-elevated"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-brand-border">
                <BrandLogo size="sm" />
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
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
                        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-brand-mint text-brand-emerald-dark font-bold'
                            : 'text-brand-text-secondary hover:bg-slate-50 hover:text-brand-text'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-brand-border space-y-3">
              <div className="flex items-center gap-2 px-1">
                <div className="w-8 h-8 rounded-full bg-brand-mint text-brand-emerald-dark flex items-center justify-center font-mono font-bold text-xs">
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold text-brand-text truncate">{user?.name}</p>
                  <p className="text-[10px] text-slate-400 font-mono truncate">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-brand-border h-screen sticky top-0 z-30 select-none">
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
            className="w-full justify-center shadow-subtle hover:shadow-glow-green"
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
                      ? 'bg-brand-mint text-brand-emerald-dark font-bold shadow-subtle border border-brand-border/60'
                      : 'text-brand-text-secondary hover:bg-slate-50 hover:text-brand-text'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Profile & Logout Bottom */}
        <div className="p-4 border-t border-brand-border space-y-3 bg-brand-muted/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-brand-mint text-brand-emerald-dark flex items-center justify-center font-mono font-bold text-xs border border-brand-border">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-brand-text truncate">{user?.name || 'Developer'}</p>
              <div className="flex items-center gap-1">
                {user?.isDemoUser && (
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-semibold">
                    Demo Mode
                  </span>
                )}
                <span className="text-[10px] text-slate-400 font-mono truncate">{user?.email}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <NavLink
              to="/"
              className="text-[11px] text-slate-500 hover:text-brand-emerald flex items-center gap-1 font-medium"
            >
              <span>Marketing Site</span>
              <ExternalLink className="w-3 h-3" />
            </NavLink>
            <button
              onClick={handleLogout}
              className="text-[11px] text-red-600 hover:text-red-700 font-medium flex items-center gap-1 p-1 rounded"
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
        {/* Mock Mode Alert Banner */}
        {isMockMode && (
          <div className="bg-amber-500 text-white px-4 py-2 text-xs font-mono flex items-center justify-between shadow-subtle">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 flex-shrink-0" />
              <span>
                <strong>Mock Mode Active:</strong> Running with simulated scan telemetry and local fixtures. No real AWS resources or active scanners are engaged.
              </span>
            </div>
            <span className="hidden sm:inline-block text-[10px] bg-black/20 px-2 py-0.5 rounded font-mono">
              VITE_USE_MOCK_API=true
            </span>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
