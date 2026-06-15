'use client';

import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { ShieldAlert, CheckCircle2, ChevronRight, Lock } from 'lucide-react';
import { MANAGED_MODE, hasManagementAccess } from '@/lib/config';
import Link from 'next/link';

interface VerificationGuardProps {
  children: React.ReactNode;
}

/**
 * VerificationGuard
 * ──────────────────────────────────────────────
 * Hard gate for listing management. If a user is not REGA-verified,
 * it displays a premium "Verification Required" state instead of the content.
 */
export const VerificationGuard: React.FC<VerificationGuardProps> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const fromAdmin = searchParams?.get('from') === 'admin';
  const fromCrm = searchParams?.get('from') === 'crm';
  const locale = typeof window !== 'undefined' ? window.location.pathname.split('/')[1] || 'en' : 'en';

  // 1. If Managed Mode is ON, block ALL listing/management activity for EVERYONE in the web app.
  // Exception: Admins, Whitelisted users (Firms/Brokers), and verified brokers/solo brokers.
  // Also skip this block if we are coming from the admin panel (fromAdmin) or CRM (fromCrm) so we can show a login prompt instead.
  if (MANAGED_MODE && !hasManagementAccess(user) && !user?.regaVerified && user?.role !== 'SOLO_BROKER' && !fromAdmin && !fromCrm) {
    return (
      <div className="max-w-2xl mx-auto py-24 px-4 text-center">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock className="w-10 h-10 text-slate-400" />
        </div>
        <h2 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">Management Restricted</h2>
        <p className="text-slate-600 mb-8 text-lg">
          Property listing and management are strictly restricted to the <strong>Official Admin Panel</strong>. 
          The public portal is currently in viewer-only mode.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link 
            href={`/${locale}`}
            className="inline-flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10"
          >
            Back to Home
          </Link>
          <Link 
            href={`/${locale}/dashboard/settings`}
            className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-8 py-4 rounded-2xl font-bold hover:bg-slate-50 transition-all"
          >
            Account Settings
          </Link>
        </div>
      </div>
    );
  }

  // 2. If we are coming from admin panel or CRM but not logged in, show a clearer, role-appropriate message
  if (!user && (fromAdmin || fromCrm) && !loading) {
    const isCrm = fromCrm;
    const title = isCrm ? 'Broker Authentication Required' : 'Admin Authentication Required';
    const description = isCrm
      ? 'To manage properties from the CRM Dashboard, you must be logged into your broker account on this portal as well.'
      : 'To manage properties from the Admin Panel, you must be logged into your admin account on this portal as well.';
    const buttonText = isCrm ? 'Login as Broker' : 'Login as Admin';
    
    // CRM uses deep teal (#064e4b) theme, Admin uses standard emerald-900 theme
    const accentColor = isCrm ? 'bg-[#064e4b] hover:bg-[#043a37]' : 'bg-emerald-900 hover:scale-105';
    const iconBg = isCrm ? 'bg-[#064e4b]/10 text-[#064e4b]' : 'bg-emerald-50 text-emerald-900';
    const iconColor = isCrm ? 'text-[#064e4b]' : 'text-emerald-900';

    return (
      <div className="max-w-2xl mx-auto py-24 px-4 text-center animate-in fade-in duration-300">
        <div className={`w-20 h-20 ${iconBg} rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner`}>
          <ShieldAlert className={`w-10 h-10 ${iconColor}`} />
        </div>
        <h2 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">{title}</h2>
        <p className="text-slate-600 mb-8 text-lg leading-relaxed max-w-md mx-auto">
          {description}
        </p>
        <Link 
          href={`/${locale}/auth/login?returnTo=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
          className={`inline-flex items-center gap-2 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-xl ${accentColor}`}
        >
          {buttonText}
        </Link>
      </div>
    );
  }

  // 3. If user is verified OR is whitelisted, allow access
  if (user?.regaVerified || user?.role === 'SOLO_BROKER' || hasManagementAccess(user)) {
    return <>{children}</>;
  }

  // 4. If not verified, show the professional "Gate" UI
  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none text-center">
        <div className="w-20 h-20 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-10 h-10 text-amber-500" />
        </div>
        
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
          Professional Verification Required
        </h2>
        
        <p className="text-slate-600 dark:text-slate-400 text-lg mb-8 max-w-md mx-auto leading-relaxed">
          To comply with Saudi Real Estate Authority (REGA) regulations, 
          you must verify your identity and licenses before listing properties.
        </p>

        <div className="grid gap-4 mb-8 text-left max-w-sm mx-auto">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-1 shrink-0" />
            <p className="text-sm font-medium">National ID / Iqama Verification</p>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-1 shrink-0" />
            <p className="text-sm font-medium">REGA / FAL Professional License</p>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-1 shrink-0" />
            <p className="text-sm font-medium">Firm Association (if applicable)</p>
          </div>
        </div>

        <Link 
          href={`/${user?.id ? 'dashboard/settings' : 'auth/login'}`}
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-primary/20 group"
        >
          Verify My Profile Now
          <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Link>
        
        <p className="mt-6 text-xs text-slate-400">
          Already verified? It may take up to 24 hours for admin approval.
        </p>
      </div>
    </div>
  );
};
