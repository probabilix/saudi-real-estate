'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import {
  LayoutDashboard, Users, Building2, Newspaper,
  Settings, FileText, LogOut, ChevronRight, ChevronLeft,
  ShieldCheck, Bell, Menu, X, CreditCard,
  BarChart3, Megaphone, Star, HelpCircle, Mail, Sparkles, Clock,
  Layers, Flag
} from 'lucide-react';
import { useState, useEffect } from 'react';
import clsx from 'clsx';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Marketplace',
    items: [
      { href: '/projects', label: 'Projects', icon: Layers },
      { href: '/listings', label: 'All Inventory', icon: Building2 },
      { href: '/listings?status=FLAGGED', label: 'Pending Approvals', icon: Clock },
      { href: '/listings/featured', label: 'Featured Inventory', icon: Star },
      { href: '/users', label: 'Users & Brokers', icon: Users },
      { href: '/verifications', label: 'Verifications', icon: ShieldCheck },
      { href: '/leads', label: 'Leads & CRM', icon: Sparkles },
      { href: '/mortgage-leads', label: 'Mortgage Leads', icon: CreditCard },
      { href: '/reported-properties', label: 'Reported Properties', icon: Flag },
    ],
  },
  {
    label: 'Content',
    items: [
      { href: '/inbox', label: 'Inbox', icon: Mail },
      { href: '/news', label: 'News & Blog', icon: Newspaper },
      { href: '/faqs', label: 'FAQs Management', icon: HelpCircle },
      { href: '/legal', label: 'Legal Pages', icon: FileText },
      { href: '/announcements', label: 'Announcements', icon: Megaphone },
    ],
  },
  {
    label: 'Platform',
    items: [
      { href: '/settings', label: 'Site Settings', icon: Settings },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const statusParam = searchParams.get('status');
  const { user, logout } = useAdminAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleToggle = () => setMobileOpen(prev => !prev);
    const handleClose = () => setMobileOpen(false);

    window.addEventListener('toggle-admin-sidebar', handleToggle);
    window.addEventListener('close-admin-sidebar', handleClose);
    return () => {
      window.removeEventListener('toggle-admin-sidebar', handleToggle);
      window.removeEventListener('close-admin-sidebar', handleClose);
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
        />
      )}

      <aside
        className={clsx(
          'flex flex-col h-screen bg-sidebar-bg border-r border-sidebar-border transition-all duration-300 shrink-0 z-50',
          'fixed md:static inset-y-0 left-0 transform md:transform-none',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border relative">
        <div className="w-8 h-8 rounded-xl bg-primary-600 flex items-center justify-center shrink-0">
          <Building2 className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-sm font-bold text-white truncate">Saudi RE</div>
            <div className="text-[10px] text-primary-400 font-semibold uppercase tracking-wider">Admin Panel</div>
          </div>
        )}
        
        {/* Mobile close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden ml-auto text-sidebar-text hover:text-white transition-colors shrink-0"
          title="Close Sidebar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Desktop floating circular collapse toggle button */}
        <button
          onClick={() => setCollapsed(p => !p)}
          className="hidden md:flex absolute -right-3 top-6 w-6 h-6 rounded-full bg-primary-600 text-white items-center justify-center border border-sidebar-border hover:bg-primary-700 transition-all shadow-md z-50 hover:scale-110 active:scale-95"
          title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5">
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            {!collapsed && (
              <div className="px-3 mb-2 text-[10px] font-black uppercase tracking-widest text-surface-600">
                {group.label}
              </div>
            )}
            <ul className="space-y-0.5">
              {group.items.map(item => {
                const Icon = item.icon;
                let isActive = false;
                if (item.href.includes('?status=FLAGGED')) {
                  isActive = pathname === '/listings' && statusParam === 'FLAGGED';
                } else if (item.href === '/listings') {
                  isActive = pathname === '/listings' && !statusParam;
                } else {
                  isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                }
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={clsx(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group',
                        isActive
                          ? 'bg-primary-600/20 text-primary-400 border border-primary-500/20'
                          : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white'
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate">{item.label}</span>
                          {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
                        </>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-sidebar-border p-3">
        {!collapsed ? (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary-800 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-primary-300">
                {user?.name?.charAt(0)?.toUpperCase() || 'A'}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-white truncate">{user?.name || 'Admin'}</div>
              <div className="text-[10px] text-surface-500 truncate">{user?.email}</div>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="text-surface-500 hover:text-red-400 transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={logout}
            title="Sign out"
            className="w-full flex items-center justify-center py-2 text-surface-500 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
    </>
  );
}

export function AdminTopBar({ title }: { title: string }) {
  const handleToggle = () => {
    window.dispatchEvent(new CustomEvent('toggle-admin-sidebar'));
  };

  return (
    <header className="h-14 bg-white border-b border-surface-200 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={handleToggle}
          className="md:hidden p-1.5 hover:bg-surface-100 rounded-xl text-surface-500 transition-colors shrink-0"
          title="Toggle Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-sm md:text-base font-bold text-surface-800 truncate">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <button className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-100 text-surface-500 transition-colors">
          <Bell className="w-4.5 h-4.5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
        </button>
      </div>
    </header>
  );
}
