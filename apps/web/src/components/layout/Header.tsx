'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { Menu, X, Globe, Building2, User, LogOut, LayoutDashboard, ChevronDown, Phone, Download, Sparkles, PlusCircle, Heart, History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';

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

  // Scroll visibility
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const pathname = usePathname();
  const isDashboard = pathname.includes('/dashboard');
  const isRTL = locale === 'ar';
  const otherLocale = locale === 'en' ? 'ar' : 'en';
  const switchLabel = locale === 'en' ? t('switchToArabic') : t('switchToEnglish');
  const localeSwitchHref = pathname.replace(`/${locale}`, `/${otherLocale}`);

  const navLinks = [
    { href: `/${locale}`, label: t('home') },
    { href: `/${locale}/listings`, label: t('listings') },
    ...(isAuthenticated ? [
      { href: `/${locale}/dashboard`, label: tCommon('manageListings') },
    ] : []),
    { href: `/${locale}/packages`, label: t('packages') },
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
              <>
                <Link href={`/${locale}/dashboard`} className="flex items-center gap-1.5 hover:text-primary-600 transition-colors border-inline-start border-gray-100 ps-6">
                  <LayoutDashboard className="w-3 h-3" />
                  {tCommon('manageListings')}
                </Link>
                <Link href={`/${locale}/favorites`} className="flex items-center gap-1.5 hover:text-primary-600 transition-colors border-inline-start border-gray-100 ps-6">
                  <Heart className="w-3 h-3" />
                  {tDashboard('menu.favorites')}
                </Link>
                <Link href={`/${locale}/dashboard/listings`} className="flex items-center gap-1.5 hover:text-primary-600 transition-colors border-inline-start border-gray-100 ps-6">
                  <History className="w-3 h-3" />
                  {tDashboard('menu.savedSearches')}
                </Link>
              </>
            )}
          </div>
          <div className="flex gap-6 items-center">
            <Link href={localeSwitchHref} className="flex items-center gap-1.5 hover:text-primary-600 transition-all">
              <Globe className="w-3 h-3" />
              {switchLabel}
            </Link>
            <span className="border-inline-start border-gray-100 ps-6 flex items-center gap-1.5">
              <Phone className="w-3 h-3" />
              {tCommon('supportPhone')}
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
            <Link
              href={`/${locale}/listings/post`}
              className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-primary-600/20 hover:bg-primary-500 transition-all active:scale-[0.98]"
            >
              <PlusCircle className="w-4 h-4" />
              {tCommon('postListing')}
            </Link>

            {isAuthenticated ? (
              <div className="relative group">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1 ps-3 border border-gray-100 rounded-full hover:bg-gray-50 transition-all"
                >
                  <div className={`flex flex-col hidden md:flex ${isRTL ? 'items-start' : 'items-end'}`}>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{tCommon('myAccount')}</span>
                    <span className="text-xs font-bold text-gray-900 max-w-[100px] truncate">{user?.name?.split(' ')[0]}</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center border border-primary-100 overflow-hidden shrink-0">
                    <User className="w-4 h-4" />
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
                      {user?.role && ['ADMIN', 'AGENT', 'FIRM', 'SOLO_BROKER', 'OWNER', 'BUYER'].includes(user.role as string) && (
                        <>
                          <Link
                            href={`/${locale}/dashboard`}
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 rounded-xl transition-all"
                          >
                            <LayoutDashboard className="w-4 h-4 text-primary-600" />
                            {tCommon('manageListings')}
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

        {/* Mobile Nav */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="lg:hidden overflow-hidden border-t border-gray-100 bg-white"
            >
              <div className="p-4 flex flex-col gap-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block px-4 py-3 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50"
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="pt-4 border-t border-gray-100 space-y-3">
                  <Link
                    href={`/${locale}/listings/post`}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-primary-600 text-white font-bold"
                  >
                    {tCommon('postListing')}
                  </Link>
                  {user?.role && ['ADMIN', 'AGENT', 'FIRM', 'SOLO_BROKER', 'OWNER', 'BUYER'].includes(user.role as string) && (
                    <Link
                      href={`/${locale}/dashboard`}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-center gap-2 w-full py-4 rounded-xl border-2 border-primary-600 text-primary-600 font-bold"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      {tCommon('manageListings')}
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </div>
  );
}
