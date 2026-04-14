'use client';

import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { Building2 } from 'lucide-react';

export default function Footer() {
  const t = useTranslations('footer');
  const tCommon = useTranslations('common');
  const tNav = useTranslations('navigation');
  const locale = useLocale();

  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-[#1A2332] border-t border-white/5 overflow-hidden">
      {/* Decorative accent */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary-500/50 to-transparent" />

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <Link href={`/${locale}`} className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center shadow-md">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <span className={`text-xl font-bold text-white ${locale === 'ar' ? 'font-arabic' : 'font-serif'}`}>
                {tCommon('appName')}
              </span>
            </Link>
            <p className="text-surface-400 text-sm leading-relaxed mb-6 max-w-xs">
              {t('aboutText')}
            </p>
            <div className="flex items-center gap-2 text-xs text-surface-500">
              <span className="inline-block w-2 h-2 rounded-full bg-primary-500" />
              {t('builtWith')}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-surface-500 mb-6">
              {t('quickLinks')}
            </h3>
            <ul className="space-y-4">
              <li>
                <Link href={`/${locale}/listings`} className="text-sm text-surface-400 hover:text-primary-400 transition-colors">
                  {tNav('listings')}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/packages`} className="text-sm text-surface-400 hover:text-primary-400 transition-colors">
                  {tNav('packages')}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/about`} className="text-sm text-surface-400 hover:text-primary-400 transition-colors">
                  {tNav('about')}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/contact`} className="text-sm text-surface-400 hover:text-primary-400 transition-colors">
                  {tNav('contact')}
                </Link>
              </li>
            </ul>
          </div>

          {/* For Professionals */}
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-surface-500 mb-6">
              {t('forBrokers')}
            </h3>
            <ul className="space-y-4">
              <li>
                <Link href={`/${locale}/auth/register`} className="text-sm text-surface-400 hover:text-primary-400 transition-colors">
                  {tNav('listProperty')}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/auth/login`} className="text-sm text-surface-400 hover:text-primary-400 transition-colors">
                  {tNav('brokerDashboard')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-surface-500 mb-6">
              {t('legal')}
            </h3>
            <ul className="space-y-4">
              <li>
                <Link href={`/${locale}/legal/privacy`} className="text-sm text-surface-400 hover:text-primary-400 transition-colors">
                  {t('privacy')}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/legal/terms`} className="text-sm text-surface-400 hover:text-primary-400 transition-colors">
                  {t('terms')}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/legal/foreign-ownership`} className="text-sm text-surface-400 hover:text-primary-400 transition-colors">
                  {t('foreignOwnership')}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/5 bg-black/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <p className="text-[11px] text-surface-500 font-medium tracking-wide">
            © {currentYear} {tCommon('appName')}. {t('allRightsReserved')}
          </p>
          <div className="flex items-center gap-8">
            <Link href={`/${locale}/legal/privacy`} className="text-[11px] text-surface-500 hover:text-primary-400 transition-colors uppercase tracking-widest font-bold">
              {t('privacy')}
            </Link>
            <Link href={`/${locale}/legal/terms`} className="text-[11px] text-surface-500 hover:text-primary-400 transition-colors uppercase tracking-widest font-bold">
              {t('terms')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
