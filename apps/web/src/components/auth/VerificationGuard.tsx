'use client';

import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { ShieldAlert, CheckCircle2, ChevronRight } from 'lucide-react';
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

  // If user is verified, just render the content
  if (user?.regaVerified) {
    return <>{children}</>;
  }

  // If not verified, show the professional "Gate" UI
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
