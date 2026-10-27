import React, { useState } from 'react';
import { BrandLogo } from '../brand/BrandLogo';
import { useAuth } from '../../context/AuthContext';
import { useAudit } from '../../context/AuditContext';
import { 
  LayoutDashboard, 
  PlusCircle, 
  History, 
  Globe, 
  FileText, 
  Settings, 
  LogOut, 
  ArrowLeft, 
  Menu, 
  X, 
  ShieldCheck, 
  ExternalLink 
} from 'lucide-react';

interface DashboardLayoutProps {
  currentTab: 'overview' | 'new-scan' | 'history' | 'saved-sites' | 'report' | 'settings';
  setCurrentTab: (tab: 'overview' | 'new-scan' | 'history' | 'saved-sites' | 'report' | 'settings') => void;
  onBackToLanding: () => void;
  brandNameOverride?: string;
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  currentTab,
  setCurrentTab,
  onBackToLanding,
  brandNameOverride,
  children
}) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const { openNewScanModal, activeReport } = useAudit();

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'history', label: 'Scan History', icon: History },
    { id: 'saved-sites', label: 'Saved Websites', icon: Globe },
    { id: 'report', label: 'Detailed Report', icon: FileText, badge: activeReport ? 'Active' : undefined },
    { id: 'settings', label: 'Settings & Privacy', icon: Settings },
  ];

  const handleNavClick = (id: any) => {
    setCurrentTab(id);
    setMobileSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-brand-muted flex flex-col md:flex-row">
      
      {/* Mobile Top Header */}
      <div className="md:hidden bg-white border-b border-brand-border px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <BrandLogo size="sm" customName={brandNameOverride} />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => openNewScanModal()}
            className="p-1.5 rounded-lg bg-brand-emerald text-white text-xs font-semibold px-2.5 flex items-center gap-1"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Scan</span>
          </button>
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="p-2 text-brand-text-secondary hover:text-brand-text"
          >
            {mobileSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Persistent Left Sidebar on Desktop */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-brand-border flex flex-col justify-between transition-transform duration-200
        md:translate-x-0 md:static md:h-screen
        ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Top: Logo & Exit to Landing */}
        <div>
          <div className="p-5 border-b border-brand-border flex items-center justify-between">
            <BrandLogo size="sm" customName={brandNameOverride} />
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="md:hidden text-gray-400 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4">
            {/* Quick Action: Start Scan */}
            <button
              onClick={() => openNewScanModal()}
              className="w-full mb-4 py-2.5 px-3.5 rounded-xl bg-brand-emerald text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-subtle hover:bg-brand-emerald-dark transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Audit Scan</span>
            </button>

            {/* Nav list */}
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-brand-card-green text-brand-emerald-dark font-bold border border-brand-border'
                        : 'text-brand-text-secondary hover:text-brand-text hover:bg-brand-muted'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-brand-emerald' : 'text-gray-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] font-mono bg-brand-mint text-brand-emerald-dark px-1.5 py-0.5 rounded">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Bottom User Profile & Back to Landing */}
        <div className="p-4 border-t border-brand-border space-y-3">
          {/* Back to Public Landing */}
          <button
            onClick={onBackToLanding}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs text-brand-text-secondary hover:text-brand-text hover:bg-brand-muted border border-brand-border transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Public Landing Page</span>
          </button>

          {/* User profile row */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-brand-mint text-brand-emerald-dark flex items-center justify-center font-bold text-xs shrink-0 border border-brand-border">
                {user?.name?.[0] || 'U'}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-brand-text truncate">
                  {user?.name || 'Developer'}
                </div>
                <div className="text-[10px] text-brand-text-secondary truncate font-mono">
                  {user?.isDemoUser ? 'Demo Sandbox' : user?.email}
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 overflow-y-auto max-h-screen">
        {children}
      </main>

    </div>
  );
};
