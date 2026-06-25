'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCrmAuth } from '@/hooks/use-crm-auth';
import {
  LayoutDashboard, Globe, Megaphone, Settings,
  LogOut, ChevronRight, ChevronLeft, Building2,
  X, Menu, AlertCircle, CreditCard
} from 'lucide-react';
import { useState, useEffect } from 'react';
import clsx from 'clsx';

const NAV_ADMIN = [
  {
    label: 'Overview',
    items: [{ href: '/', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Lead Modules',
    items: [
      { href: '/website-leads',  label: 'Website Leads',  icon: Globe,      desc: 'AI-qualified' },
      { href: '/campaign-leads', label: 'Campaign Leads', icon: Megaphone,  desc: 'Ads & Manual' },
    ],
  },
  {
    label: 'System',
    items: [{ href: '/settings', label: 'Integrations', icon: Settings }],
  },
];

const NAV_AGENT = [
  {
    label: 'Overview',
    items: [{ href: '/', label: 'My Dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Properties',
    items: [
      { href: '/my-listings', label: 'My Listings', icon: Building2 }
    ]
  },
  {
    label: 'My Leads',
    items: [
      { href: '/website-leads',  label: 'Website Leads',  icon: Globe },
      { href: '/campaign-leads', label: 'Campaign Leads', icon: Megaphone },
    ],
  },
  {
    label: 'Billing & Account',
    items: [
      { href: '/billing', label: 'Billing & Credits', icon: CreditCard },
      { href: '/settings', label: 'Profile Settings', icon: Settings }
    ]
  }
];

interface CrmSidebarProps {
  unassigned?: number;
}

export function CrmSidebar({ unassigned = 0 }: CrmSidebarProps) {
  const pathname = usePathname();
  const { user, logout, isAdmin } = useCrmAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isLoadingLogo, setIsLoadingLogo] = useState(true);

  useEffect(() => {
    async function fetchLogo() {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
        const res = await fetch(`${apiBase}/system/settings`);
        const json = await res.json();
        if (json.success && json.data) {
          setLogoUrl(json.data.logo_url || null);
        }
      } catch (e) {
        console.error('Failed to fetch dynamic logo', e);
      } finally {
        setIsLoadingLogo(false);
      }
    }
    fetchLogo();
  }, []);

  const nav = isAdmin ? NAV_ADMIN : NAV_AGENT;

  useEffect(() => {
    const handleToggle = () => setMobileOpen(p => !p);
    const handleClose  = () => setMobileOpen(false);
    window.addEventListener('crm-sidebar-toggle', handleToggle);
    window.addEventListener('crm-sidebar-close', handleClose);
    return () => {
      window.removeEventListener('crm-sidebar-toggle', handleToggle);
      window.removeEventListener('crm-sidebar-close', handleClose);
    };
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  return (
    <>
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      <aside className={clsx(
        'flex flex-col h-screen bg-sidebar-bg border-r border-sidebar-border transition-all duration-300 shrink-0 z-50',
        'fixed md:static inset-y-0 left-0 transform md:transform-none',
        mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        collapsed ? 'w-16' : 'w-64'
      )}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border relative">
          {isLoadingLogo ? (
            <div className="w-8 h-8 rounded-xl bg-sidebar-border/30 animate-pulse shrink-0" />
          ) : logoUrl ? (
            collapsed ? (
              <div className="w-8 h-8 rounded-xl overflow-hidden shrink-0 flex items-center justify-center bg-white p-0.5 animate-in fade-in duration-300">
                <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
              </div>
            ) : (
              <div className="h-9 w-auto max-w-[120px] shrink-0 flex items-center justify-center bg-white rounded-lg px-2 py-0.5 overflow-hidden animate-in fade-in duration-300">
                <img src={logoUrl} alt="Logo" className="max-h-full w-auto object-contain" />
              </div>
            )
          ) : (
            <div className="w-8 h-8 rounded-xl bg-primary-600 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4 text-white" />
            </div>
          )}
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-bold text-white truncate">Tamleeq</div>
              <div className="text-[10px] text-primary-400 font-semibold uppercase tracking-wider">CRM Workspace</div>
            </div>
          )}
          <button onClick={() => setMobileOpen(false)} className="md:hidden ml-auto text-sidebar-text hover:text-white shrink-0">
            <X className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCollapsed(p => !p)}
            className="hidden md:flex absolute -right-3 top-6 w-6 h-6 rounded-full bg-primary-600 text-white items-center justify-center border border-sidebar-border hover:bg-primary-700 transition-all shadow-md z-50 hover:scale-110 active:scale-95"
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Unassigned alert (admin only) */}
        {!collapsed && isAdmin && unassigned > 0 && (
          <div className="mx-3 mt-3 p-2.5 bg-red-900/20 border border-red-800/30 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span className="text-xs text-red-400 font-semibold">{unassigned} unassigned</span>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5">
          {nav.map(group => (
            <div key={group.label}>
              {!collapsed && (
                <div className="px-3 mb-2 text-[10px] font-black uppercase tracking-widest text-surface-600">
                  {group.label}
                </div>
              )}
              <ul className="space-y-0.5">
                {group.items.map(item => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        className={clsx(
                          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative',
                          isActive
                            ? 'bg-primary-600/20 text-primary-400 border border-primary-500/20'
                            : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white'
                        )}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        {!collapsed && (
                          <>
                            <div className="flex-1 min-w-0">
                              <div className="truncate">{item.label}</div>
                              {'desc' in item && !isActive && (
                                <div className="text-[10px] text-surface-600 group-hover:text-surface-400">
                                  {item.desc}
                                </div>
                              )}
                            </div>
                            {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-60 shrink-0" />}
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
                  {user?.name?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-white truncate">{user?.name || 'Agent'}</div>
                <div className="text-[10px] text-surface-500 truncate">{user?.role}</div>
              </div>
              <button onClick={logout} title="Sign out" className="text-surface-500 hover:text-red-400 transition-colors shrink-0">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button onClick={logout} title="Sign out" className="w-full flex items-center justify-center py-2 text-surface-500 hover:text-red-400 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}

export function CrmTopBar({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="h-14 bg-white border-b border-surface-200 flex items-center justify-between px-5 shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('crm-sidebar-toggle'))}
          className="md:hidden p-1.5 hover:bg-surface-100 rounded-xl text-surface-500 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-sm md:text-base font-bold text-surface-800">{title}</h1>
          {subtitle && <p className="text-[11px] text-surface-400 font-medium">{subtitle}</p>}
        </div>
      </div>
    </header>
  );
}
