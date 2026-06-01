'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { Menu, X, Globe, Building2, User, LogOut, LayoutDashboard, ChevronDown, Phone, Download, Sparkles, PlusCircle, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';
import { MANAGED_MODE, hasManagementAccess } from '@/lib/config';
import { API_BASE_URL } from '@/lib/api';

interface HeaderProps {
  locale: string;
}

export default function Header({ locale }: HeaderProps) {
  const t = useTranslations('navigation');
  const tCommon = useTranslations('common');
  const tDashboard = useTranslations('dashboard');
  const { user, logout, isAuthenticated } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [contactPhone, setContactPhone] = useState(tCommon('supportPhone'));

  // Fetch live contact phone from DB settings
  useEffect(() => {
    fetch(`${API_BASE_URL}/system/settings`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        const phone = json?.data?.contact_phone;
        if (phone) setContactPhone(phone);
      })
      .catch(() => {});
  }, []);

  // Scroll visibility
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.user-menu-container')) {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

  const pathname = usePathname();
  const isDashboard = pathname.includes('/dashboard');
  const isRTL = locale === 'ar';
  const otherLocale = locale === 'en' ? 'ar' : 'en';
  const switchLabel = locale === 'en' ? t('switchToArabic') : t('switchToEnglish');
  const localeSwitchHref = pathname.replace(`/${locale}`, `/${otherLocale}`);

  const navLinks = [
    { href: `/${locale}`, label: t('home') },
    { href: `/${locale}/listings`, label: t('listings') },
    ...(!MANAGED_MODE ? [{ href: `/${locale}/packages`, label: t('packages') }] : []),
    { href: `/${locale}/about`, label: t('about') },
    { href: `/${locale}/contact`, label: t('contact') },
  ];

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] w-full transition-all duration-300">
      {/* ── Marketplace Strip (Premium Light) ── */}
      <div className="bg-gray-50/80 backdrop-blur-sm border-b border-gray-100 py-2 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center text-[10px] uppercase tracking-widest font-bold text-gray-500">
          <div className="flex gap-6 items-center">
            <span className="flex items-center gap-1.5 hover:text-primary-600 transition-colors cursor-pointer">
              <Download className="w-3 h-3" />
              {tCommon('downloadApp')}
            </span>
            <Link href={`/${locale}/news`} className="flex items-center gap-1.5 hover:text-primary-600 transition-colors border-inline-start border-gray-100 ps-6 group/news">
              <Sparkles className="w-3 h-3 text-amber-500 group-hover/news:scale-110 transition-transform" />
              {tCommon('realEstateNews')}
            </Link>
            {isAuthenticated && (
              <Link href={`/${locale}/favorites`} className="flex items-center gap-1.5 hover:text-primary-600 transition-colors border-inline-start border-gray-100 ps-6">
                <Heart className="w-3 h-3" />
                {tDashboard('menu.favorites')}
              </Link>
            )}
          </div>
          <div className="flex gap-6 items-center">
            <Link href={localeSwitchHref} className="flex items-center gap-1.5 hover:text-primary-600 transition-all">
              <Globe className="w-3 h-3" />
              {switchLabel}
            </Link>
            <span className="border-inline-start border-gray-100 ps-6 flex items-center gap-1.5">
              <Phone className="w-3 h-3" />
              <a href={`tel:${contactPhone.replace(/\s/g, '')}`} className="hover:text-primary-600 transition-colors">
                {contactPhone}
              </a>
            </span>
          </div>
        </div>
      </div>

      {/* ── Main Navigation ── */}
      <header
        className={`w-full transition-all duration-500 bg-white border-b border-gray-100 ${(scrolled || isDashboard) ? 'shadow-[0_4px_30px_rgba(0,0,0,0.03)] py-1.5' : 'py-3'
          }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Logo */}
          <Link href={`/${locale}`} className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center shadow-lg shadow-primary-600/20 group-hover:scale-105 transition-all">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <span className={`text-2xl font-bold tracking-tight text-gray-900 ${locale === 'ar' ? 'font-arabic' : 'font-serif'}`}>
              {tCommon('appName')}
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-4">
            {navLinks.filter(l => l.href !== `/${locale}/dashboard`).map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${isActive
                    ? 'text-primary-700 bg-primary-50'
                    : 'text-gray-500 hover:text-primary-600 hover:bg-gray-50'
                    }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-4">
            {/* Management buttons removed from web app Header */}

            {isAuthenticated ? (
              <div className="relative group">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="user-menu-container flex items-center gap-2 p-1 ps-3 border border-gray-100 rounded-full hover:bg-gray-50 transition-all"
                >
                  <div className={`flex flex-col hidden md:flex ${isRTL ? 'items-start' : 'items-end'}`}>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{tCommon('myAccount')}</span>
                    <span className="text-xs font-bold text-gray-900 max-w-[100px] truncate">{user?.name?.split(' ')[0]}</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center border border-primary-100 overflow-hidden shrink-0 relative">
                    {user?.avatarUrl && !imgError ? (
                      <img 
                        src={user.avatarUrl} 
                        alt={user.name || 'User'} 
                        className="w-full h-full object-cover"
                        onError={() => setImgError(true)}
                      />
                    ) : (
                      <span className="text-xs font-black text-primary-700 uppercase">{(user?.name || user?.email || 'U')[0]}</span>
                    )}
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-300 ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className={`absolute ${isRTL ? 'left-0' : 'right-0'} top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 overflow-hidden`}
                    >
                      <div className="p-4 border-b border-gray-50 mb-2">
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">{tCommon('signedInAs')}</p>
                        <p className="text-sm font-bold truncate text-gray-900">{user?.email}</p>
                      </div>
                      {isAuthenticated && (
                        <>
                          <Link
                            href={`/${locale}/dashboard/settings`}
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 rounded-xl transition-all"
                          >
                            <User className="w-4 h-4 text-primary-600" />
                            {tDashboard('menu.settings')}
                          </Link>
                          <Link
                            href={`/${locale}/favorites`}
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 rounded-xl transition-all"
                          >
                            <Heart className="w-4 h-4 text-red-500" />
                            {tDashboard('menu.favorites')}
                          </Link>
                          <hr className="my-1 border-gray-50" />
                        </>
                      )}
                      <button
                        onClick={() => {
                          logout();
                          setUserMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <LogOut className="w-4 h-4" />
                        {tCommon('logout')}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                href={`/${locale}/auth/login`}
                className="px-6 py-2.5 border-2 border-primary-600 text-primary-600 rounded-xl text-sm font-bold hover:bg-primary-50 transition-all"
              >
                {tCommon('login')}
              </Link>
            )}

            <button className="lg:hidden p-2 text-gray-600" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Drawer */}
        <AnimatePresence>
          {mobileOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] lg:hidden"
              />
              {/* Drawer */}
              <motion.div
                initial={{ x: isRTL ? '-100%' : '100%' }}
                animate={{ x: 0 }}
                exit={{ x: isRTL ? '-100%' : '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className={`fixed top-0 bottom-0 ${isRTL ? 'left-0' : 'right-0'} w-[280px] bg-white z-[120] lg:hidden shadow-2xl flex flex-col`}
              >
                <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                   <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-white" />
                   </div>
                   <button onClick={() => setMobileOpen(false)} className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
                      <X className="w-6 h-6" />
                   </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-2">
                  {/* Language Switcher at Top */}
                  <div className="mb-6 px-4 py-3 bg-gray-50 rounded-2xl flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{tCommon('languages.English')} / {tCommon('languages.Arabic')}</span>
                    <Link href={localeSwitchHref} className="flex items-center gap-2 text-xs font-bold text-primary-600 px-3 py-1.5 bg-white rounded-lg shadow-sm">
                      <Globe className="w-3 h-3" />
                      {switchLabel}
                    </Link>
                  </div>

                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="block px-4 py-4 rounded-2xl text-sm font-bold text-gray-600 hover:bg-primary-50 hover:text-primary-700 transition-all"
                      onClick={() => setMobileOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ))}
                  
                  {/* Additional Strip Links for Mobile */}
                  <div className="pt-4 mt-4 border-t border-gray-50 space-y-2">
                    <Link
                      href={`/${locale}/news`}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-4 py-4 text-sm font-bold text-gray-600 hover:bg-gray-50 rounded-2xl"
                    >
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      {tCommon('realEstateNews')}
                    </Link>
                    <div className="flex items-center gap-3 px-4 py-4 text-sm font-bold text-gray-600 hover:bg-gray-50 rounded-2xl cursor-pointer">
                      <Download className="w-4 h-4 text-primary-600" />
                      {tCommon('downloadApp')}
                    </div>
                  </div>
                  
                  {isAuthenticated && (
                    <div className="pt-4 mt-4 border-t border-gray-50 space-y-2">
                      <Link
                        href={`/${locale}/dashboard/settings`}
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-3 px-4 py-4 text-sm font-bold text-gray-600 hover:bg-gray-50 rounded-2xl"
                      >
                        <User className="w-4 h-4 text-primary-600" />
                        {tDashboard('menu.settings')}
                      </Link>
                      <Link
                        href={`/${locale}/favorites`}
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-3 px-4 py-4 text-sm font-bold text-gray-600 hover:bg-gray-50 rounded-2xl"
                      >
                        <Heart className="w-4 h-4 text-red-500" />
                        {tDashboard('menu.favorites')}
                      </Link>
                      <button
                        onClick={() => {
                          logout();
                          setMobileOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-4 text-sm font-bold text-red-600 hover:bg-red-50 rounded-2xl"
                      >
                        <LogOut className="w-4 h-4" />
                        {tCommon('logout')}
                      </button>
                    </div>
                  )}
                </div>

                {!isAuthenticated && (
                  <div className="p-6 border-t border-gray-50">
                    <Link
                      href={`/${locale}/auth/login`}
                      onClick={() => setMobileOpen(false)}
                      className="block w-full text-center py-4 bg-primary-600 text-white rounded-2xl font-bold shadow-lg shadow-primary-600/20"
                    >
                      {tCommon('login')}
                    </Link>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </header>
    </div>
  );
}
