'use client';

import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { Building2, Facebook, Instagram, Linkedin, Twitter, Youtube, Phone, MapPin, Globe } from 'lucide-react';
import { api } from '@/lib/api';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { MANAGED_MODE, hasManagementAccess, WHITELISTED_USERS } from '@/lib/config';

// Official Brand Icons (SVGs) for maximum professionalism
const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932 6.064-6.932zm-1.294 19.497h2.039L6.482 3.239H4.293L17.607 20.65z"/></svg>
);
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
);
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.06-2.89-.44-4.22-1.06-.9-.42-1.7-.99-2.42-1.65v7.4c.03 1.44-.43 2.92-1.35 4.02-1.2 1.42-3.11 2.14-4.91 2.03-1.8-.11-3.55-1.07-4.46-2.61-.91-1.54-.95-3.53-.11-5.11.91-1.7 2.86-2.73 4.77-2.67.1 0 .21 0 .31.01v4.11c-.71-.11-1.48.06-2.06.49-.65.48-.96 1.34-.78 2.13.15.82.88 1.43 1.71 1.49.88.06 1.71-.43 2.07-1.21.21-.46.25-.97.24-1.47V0z"/></svg>
);
const SnapchatIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor"><path d="M12 0c-.864 0-1.714.076-2.5.21-.295.051-.582.115-.858.192-.614.17-1.18.423-1.693.743-.332.207-.636.447-.905.717-.506.511-.884 1.135-1.11 1.833-.081.253-.138.513-.171.777-.024.195-.038.391-.04.587v.147c.004.288.033.57.086.842.136.697.433 1.332.85 1.874.152.197.324.378.512.544.181.16.381.303.593.432.083.051.168.1.256.148-.06.037-.118.077-.174.12-.495.385-.863.882-1.071 1.455-.067.185-.11.376-.128.571-.005.048-.008.096-.009.145v.061c.005.347.078.675.21 1.002.046.115.101.226.164.333.125.215.281.411.464.585.127.12.268.225.421.314.281.163.585.257.902.28h.047c.185.011.37.017.555.017h.039c.075 0 .151-.003.226-.007.242-.016.48-.052.712-.108.106-.025.209-.055.311-.09.071-.024.14-.051.209-.08.05-.021.1-.044.148-.069v.036c0 .408.082.812.241 1.196.108.258.251.5.424.717.159.201.345.378.552.53.111.08.229.153.353.216.347.177.72.274 1.107.286h.042c.07 0 .141-.002.211-.006.289-.015.572-.061.846-.135.15-.041.296-.091.439-.15.083-.035.164-.073.243-.114.15-.078.293-.167.426-.267.042-.031.083-.064.123-.098.24-.207.443-.451.603-.726.079-.136.146-.279.199-.427.1-.277.156-.566.166-.86.002-.05.003-.1.003-.151v-.058c-.024.015-.049.028-.074.041-.219.11-.453.189-.696.234-.148.028-.3.045-.454.051h-.037c-.126 0-.251-.012-.375-.035-.389-.071-.749-.241-1.047-.492-.127-.107-.238-.228-.332-.361-.17-.238-.288-.511-.347-.803-.02-.097-.033-.195-.039-.294-.002-.023-.003-.046-.003-.07v-.036c.032.016.064.032.096.046.126.055.257.098.391.13.253.059.513.089.774.089h.034c.142 0 .284-.01.425-.03.294-.042.578-.14.838-.287.054-.031.107-.064.158-.1.218-.155.405-.349.554-.572.072-.108.133-.223.181-.345.105-.264.151-.544.135-.826 0-.012 0-.024-.001-.035v-.147c.01.272.055.54.134.8.069.227.18.44.331.631.139.176.31.328.506.45.18.112.378.199.588.258.077.022.156.039.236.051.046.007.092.012.138.016h.022c.119 0 .238-.01.356-.03.228-.039.444-.122.641-.245.039-.024.076-.051.112-.078.2-.152.368-.344.498-.565.048-.083.089-.17.121-.26.079-.221.116-.454.108-.688 0-.017 0-.034-.002-.051v-.151c.002-.126.012-.251.03-.375.056-.379.2-.736.421-1.048.062-.087.13-.17.204-.249.096-.102.2-.196.312-.281.201-.153.424-.269.66-.342.115-.036.233-.062.353-.08.062-.01.124-.017.186-.022h.016c.14 0 .28.017.418.05.289.069.559.208.795.409.049.041.096.086.139.133.155.17.284.364.384.574.041.086.075.176.101.268.043.153.064.311.064.469v.03c-.02-.124-.047-.247-.08-.368-.085-.316-.226-.615-.417-.887a4.26 4.26 0 00-.495-.59c-.116-.117-.243-.223-.378-.32-.239-.17-.497-.309-.77-.412-.089-.033-.18-.062-.271-.086a4.52 4.52 0 00-.281-.065h-.007c-.156-.024-.313-.036-.471-.036h-.032c-.089 0-.178.004-.267.012-.218.019-.434.058-.646.115-.052.014-.103.03-.154.046-.118.037-.234.081-.347.132-.239.108-.464.241-.67.4-.043.033-.085.068-.126.104-.207.182-.387.391-.535.621-.144.225-.251.469-.32.723a3.53 3.53 0 00-.112.553c-.006.058-.01.116-.011.174v.041c-.048-.066-.101-.129-.158-.188-.13-.134-.275-.254-.432-.358-.239-.159-.504-.279-.784-.356a4.28 4.28 0 00-.28-.064h-.011c-.13-.021-.261-.032-.393-.032h-.033c-.08 0-.159.004-.239.011-.274.025-.542.083-.8.17-.123.042-.243.093-.358.153-.053.028-.105.058-.155.09-.178.113-.341.246-.484.397-.043.045-.084.092-.122.141-.184.238-.328.503-.427.785-.027.078-.049.157-.066.238-.027.132-.041.265-.041.4v.048c-.029-.074-.065-.146-.108-.215a2.53 2.53 0 00-.312-.411 2.21 2.21 0 00-.458-.37c-.125-.078-.26-.141-.4-.188a2.15 2.15 0 00-.422-.091h-.009c-.11-.013-.22-.02-.33-.02h-.033c-.11 0-.22.007-.33.02a2.3 2.3 0 00-.671.189 2.26 2.26 0 00-.638.406c-.053.046-.1.096-.144.15-.125.151-.225.32-.296.501-.027.069-.048.14-.063.212a2.03 2.03 0 00-.036.233c-.002.046-.003.091-.003.137v.033c.038-.095.086-.186.143-.271.11-.164.247-.309.406-.43.109-.083.228-.152.355-.205.176-.074.364-.121.558-.139h.036c.075-.007.151-.011.226-.011h.032c.11 0 .22.008.33.023.238.033.465.116.67.245.053.033.104.07.152.11.199.167.368.373.499.605.071.127.126.262.164.404.041.155.061.314.06.474v.025c.007-.225.048-.446.12-.658.058-.17.142-.329.25-.472.091-.12.2-.224.322-.31.185-.131.396-.226.621-.28a2.58 2.58 0 00-.301.077c-.118.037-.231.087-.338.148-.052.03-.102.062-.15.097-.156.115-.298.249-.422.399a2.3 2.3 0 00-.12.155c-.139.191-.243.406-.307.636a2.43 2.43 0 00-.071.302c-.015.093-.023.187-.024.281v.041c.023-.105.056-.208.099-.306a1.59 1.59 0 01.197-.353c.08-.109.176-.203.284-.28.163-.116.347-.197.544-.239a1.76 1.76 0 01.189-.032h.008c.071-.008.143-.012.215-.012h.032c.07 0 .141.004.211.011.181.019.354.073.512.16.126.069.237.159.329.267a1.64 1.64 0 01.242.368c.054.108.094.225.117.346.021.11.031.221.03.333v.033c.038-.13.093-.254.163-.368.083-.135.185-.255.303-.356a1.95 1.95 0 01.353-.25c.237-.126.497-.191.762-.191h.034c.14 0 .28.018.417.053.287.073.553.218.784.425.109.098.204.211.284.336.08.125.141.261.181.405.04.143.059.292.057.442v.03c.01-.223.061-.441.151-.645.1-.227.243-.433.421-.607.139-.136.301-.248.479-.331.221-.103.461-.157.705-.157h.033c.123 0 .246.014.367.042.327.075.631.236.885.469.111.102.207.218.286.347.1.162.172.338.214.523.041.185.06.374.057.564v.036z"/></svg>
);

export default function Footer() {
  const t = useTranslations('footer');
  const tCommon = useTranslations('common');
  const tNav = useTranslations('navigation');
  const locale = useLocale();
  const { user } = useAuth();

  const [settings, setSettings] = useState<any>(null);
  const [isLoadingLogo, setIsLoadingLogo] = useState(true);
  const [crmUrl, setCrmUrl] = useState('http://localhost:3003');
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    api.getSystemSettings().then(res => {
      if (res.success) setSettings(res.data);
      setIsLoadingLogo(false);
    }).catch(() => {
      setIsLoadingLogo(false);
    });
    if (typeof window !== 'undefined') {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const url = process.env.NEXT_PUBLIC_CRM_URL || (isLocal ? 'http://localhost:3003' : 'https://saudi-real-estate-crm.vercel.app');
      setCrmUrl(url);
    }
  }, []);

  const isBroker = user && (user.role === 'ADMIN' || user.role === 'SOLO_BROKER' || user.regaVerified || hasManagementAccess(user));

  const getBrokerDashboardHref = () => {
    if (!user) {
      return `/${locale}/auth/login?returnTo=${encodeURIComponent(crmUrl)}`;
    }
    if (isBroker) {
      return crmUrl;
    }
    return `/${locale}/post-property`;
  };

  const socialIcons: any = {
    x: XIcon,
    instagram: Instagram,
    linkedin: Linkedin,
    facebook: Facebook,
    youtube: Youtube,
    whatsapp: WhatsAppIcon,
    tiktok: TikTokIcon,
    snapchat: SnapchatIcon
  };

  return (
    <footer className="relative bg-[#1A2332] border-t border-white/5 overflow-hidden">
      {/* Decorative accent */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary-500/50 to-transparent" />

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <Link href={`/${locale}`} className="flex items-center gap-2 mb-6">
              {isLoadingLogo ? (
                <div className="w-10 h-10 rounded-xl bg-white/5 animate-pulse shrink-0" />
              ) : settings?.logo_url ? (
                <img src={settings.logo_url} alt="Tamleeq" className="h-9 w-auto object-contain" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center shadow-md">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
              )}
              <span className={`text-xl font-bold text-white ${locale === 'ar' ? 'font-arabic' : 'font-serif'}`}>
                {tCommon('appName')}
              </span>
            </Link>
            <p className="text-surface-400 text-sm leading-relaxed mb-6 max-w-xs">
              {t('aboutText')}
            </p>
            <div className="space-y-4">
              {settings?.contact_phone && (
                <div className="flex items-center gap-3 text-surface-400 text-sm">
                  <Phone className="w-4 h-4 text-primary-500" />
                  {settings.contact_phone}
                </div>
              )}
              {settings?.contact_location && (
                <div className="flex items-center gap-3 text-surface-400 text-sm">
                  <MapPin className="w-4 h-4 text-primary-500" />
                  {settings.contact_location}
                </div>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-surface-500 mb-6">
              {t('quickLinks')}
            </h3>
            <ul className="space-y-4">
              <li>
                <Link href={`/${locale}/projects`} className="text-sm text-surface-400 hover:text-primary-400 transition-colors">
                  {tNav('listings')}
                </Link>
              </li>
              {!MANAGED_MODE && (
                <li>
                  <Link href={`/${locale}/packages`} className="text-sm text-surface-400 hover:text-primary-400 transition-colors">
                    {tNav('packages')}
                  </Link>
                </li>
              )}
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
                <Link href={`/${locale}/post-property`} className="text-sm text-surface-400 hover:text-primary-400 transition-colors">
                  {tNav('listProperty')}
                </Link>
              </li>
              <li>
                <Link href={getBrokerDashboardHref()} className="text-sm text-surface-400 hover:text-primary-400 transition-colors">
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

          {/* Social Links */}
          <div className="lg:col-span-1">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-surface-500 mb-6">
              {t('followUs')}
            </h3>
            <div className="flex flex-wrap gap-2.5">
              {/* Ensure all requested icons are displayed professionally */}
              {['instagram', 'whatsapp', 'facebook', 'x', 'tiktok', 'snapchat', 'youtube', 'linkedin'].map((key) => {
                const Icon = socialIcons[key];
                const url = settings?.social_links?.[key === 'x' ? 'twitter' : key] || '#';
                return (
                  <a 
                    key={key}
                    href={url as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-surface-400 hover:text-white hover:bg-primary-600 transition-all border border-white/5 hover:border-primary-500/50 shadow-lg"
                    title={key.charAt(0).toUpperCase() + key.slice(1)}
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                );
              })}
            </div>
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
