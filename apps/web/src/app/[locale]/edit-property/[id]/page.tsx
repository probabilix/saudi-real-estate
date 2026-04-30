'use client';

import React, { useEffect, useState } from 'react';
import { VerificationGuard } from '@/components/auth/VerificationGuard';
import { ListingForm } from '@/components/listings/ListingForm';
import { api } from '@/lib/api';
import { Loader2, ArrowLeft, History } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';

export default function StandaloneEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [listing, setListing] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchListing() {
      try {
        const res = await api.getListingById(id);
        if (res.success && res.data) {
          setListing(res.data);
        } else {
          console.error(res.error || 'Failed to fetch listing');
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        console.error(err.message || 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    }
    if (id) fetchListing();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-slate-50">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-900" />
        <p className="text-slate-400 font-black uppercase tracking-[0.5em] text-[10px]">Retrieving Asset Records...</p>
      </div>
    );
  }

  return (
    <VerificationGuard>
      <div className="min-h-screen bg-slate-50">
        {/* Simple Header */}
        <div className="max-w-7xl mx-auto px-6 py-8 flex items-center justify-between">
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-3 text-slate-400 hover:text-emerald-900 transition-all group"
          >
            <div className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center group-hover:border-emerald-900 group-hover:bg-emerald-900 group-hover:text-white transition-all">
              <ArrowLeft className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">Cancel & Exit</span>
          </button>

          <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm">
            <div className="text-right">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Listing Mode</p>
              <p className="text-[10px] font-black text-emerald-900 uppercase tracking-widest">Premium Authorization</p>
            </div>
            <div className="w-8 h-8 bg-emerald-900 text-white rounded-lg flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
          </div>
        </div>

        <ListingForm key={listing?.id} initialData={listing} isEdit={true} isStandalone={true} />
      </div>
    </VerificationGuard>
  );
}
