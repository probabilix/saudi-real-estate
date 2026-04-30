import React from 'react';
import { VerificationGuard } from '@/components/auth/VerificationGuard';
import { ListingForm } from '@/components/listings/ListingForm';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function PostPropertyPage({ params: { locale } }: { params: { locale: string } }) {
  return (
    <VerificationGuard>
      <div className="min-h-screen bg-slate-50">
        {/* Top Navigation Bar (Standalone) */}
        <div className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <Link 
              href={`/${locale}/dashboard/listings`}
              className="flex items-center gap-2 text-slate-500 hover:text-[#064e4b] transition-all font-bold uppercase text-[10px] tracking-widest group"
            >
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-[#064e4b]/10 group-hover:text-[#064e4b] transition-all">
                <ChevronLeft className="w-5 h-5" />
              </div>
              Cancel & Exit
            </Link>

            <div className="flex items-center gap-4">
              <div className="text-right hidden md:block">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Listing Mode</p>
                <p className="text-sm font-black text-emerald-900">PREMIUM AUTHORIZATION</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-900 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4">
          <ListingForm isStandalone={true} />
        </div>
      </div>
    </VerificationGuard>
  );
}

// Minimal icons for the standalone page
function ShieldCheck({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
