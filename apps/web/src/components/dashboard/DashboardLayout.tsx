'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { 
  User, 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  ChevronRight,
  ShieldCheck,
  Building,
  Users,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';

interface DashboardLayoutProps {
  children: React.ReactNode;
  locale: string;
}

export default function DashboardLayout({ children, locale }: DashboardLayoutProps) {
  const tDashboard = useTranslations('dashboard');
  const { user, loading: authLoading, logout } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isRTL = locale === 'ar';

  const menuItems = [
    {
      title: tDashboard('menu.overview'),
      href: `/${locale}/dashboard`,
      icon: LayoutDashboard,
      roles: ['ADMIN', 'FIRM', 'AGENT', 'SOLO_BROKER', 'OWNER', 'BUYER']
    },
    {
      title: tDashboard('menu.myListings'),
      href: `/${locale}/dashboard/listings`,
      icon: Building,
      roles: ['ADMIN', 'FIRM', 'AGENT', 'SOLO_BROKER', 'OWNER', 'BUYER']
    },
    {
      title: tDashboard('menu.brokers'),
      href: `/${locale}/dashboard/brokers`,
      icon: Users,
      roles: ['FIRM', 'ADMIN']
    },
    {
      title: tDashboard('menu.verifications'),
      href: `/${locale}/admin/verifications`,
      icon: ShieldCheck,
      roles: ['ADMIN']
    },
    {
      title: tDashboard('menu.settings'),
      href: `/${locale}/dashboard/settings`,
      icon: Settings,
      roles: ['ADMIN', 'FIRM', 'AGENT', 'SOLO_BROKER', 'OWNER', 'BUYER']
    }
  ];

  // Ensure menu is only visible when user is fully loaded
  const filteredMenu = (user && !authLoading) 
    ? menuItems.filter(item => item.roles.includes(user.role))
    : [];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white/80 backdrop-blur-xl border-inline-end border-gray-100 shadow-xl shadow-gray-200/20">
      {/* Spacer to align with header height */}
      <div className="h-4" />

      {/* Profile Summary */}
      <div className="px-6 mb-8">
        <div className="p-4 rounded-2xl bg-white border border-gray-200/60 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center border border-primary-100 text-primary-600 font-bold overflow-hidden shrink-0">
              {user?.avatarUrl ? (
                <Image src={user.avatarUrl} alt={user.name ?? ''} fill className="object-cover" unoptimized />
              ) : (
                <User className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 leading-tight block break-words">{user?.name}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                {user?.role ? tDashboard(`roles.${user.role}`) : ''}
              </p>
            </div>
          </div>
          {['FIRM', 'AGENT', 'SOLO_BROKER', 'BUYER'].includes(user?.role || '') && !user?.regaVerified && (
            <Link 
              href={`/${locale}/dashboard/settings`}
              className="block w-full text-center py-2 bg-amber-50 rounded-lg text-[10px] font-bold text-amber-600 border border-amber-100 hover:bg-amber-100 transition-colors"
            >
              {tDashboard('overview.verifyLicense')}
            </Link>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
        {filteredMenu.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 group ${
                isActive 
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-primary-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-primary-600'}`} />
                <span className="text-sm font-bold">{item.title}</span>
              </div>
              <ChevronRight className={`w-4 h-4 transition-transform ${isRTL ? 'rotate-180' : ''} ${isActive ? 'opacity-100' : 'opacity-0'}`} />
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-6 border-t border-gray-50">
        <button 
          onClick={() => logout()}
          className="flex items-center gap-3 w-full px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition-all"
        >
          <LogOut className="w-5 h-5" />
          {tDashboard('menu.logout')}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-80 shrink-0 border-r border-gray-200 bg-white sticky top-[82px] h-[calc(100vh-82px)] overflow-y-auto custom-scrollbar z-20">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] lg:hidden"
            />
            <motion.aside
              initial={{ x: isRTL ? '100%' : '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: isRTL ? '100%' : '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`fixed ${isRTL ? 'right-0' : 'left-0'} top-0 bottom-0 w-80 z-[110] lg:hidden`}
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Dashboard Quick Navigation (Practical Grid) */}
        {!authLoading && filteredMenu.length > 0 && (
          <div className="lg:hidden p-4 bg-white border-b border-gray-100">
             <div className="grid grid-cols-2 gap-3" dir={isRTL ? 'rtl' : 'ltr'}>
                {filteredMenu.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex flex-col items-center justify-center py-4 rounded-2xl transition-all border-2 text-[10px] font-black uppercase tracking-widest gap-2 shadow-sm ${
                        isActive 
                          ? 'bg-primary-50 border-primary-600 text-primary-600' 
                          : 'bg-gray-50/50 border-gray-100 text-gray-400'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {item.title}
                    </Link>
                  );
                })}
             </div>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 px-4 pb-4 md:px-10 md:pb-10 pt-0">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
