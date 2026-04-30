'use client';

import React, { useEffect, useState } from 'react';
import { VerificationGuard } from '@/components/auth/VerificationGuard';
import { ListingForm } from '@/components/listings/ListingForm';
import { api } from '@/lib/api';
import { Loader2 } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function EditListingPage() {
  const params = useParams();
  const id = params.id as string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [listing, setListing] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchListing() {
      try {
        const res = await api.getListingById(id);
        if (res.success && res.data) {
          setListing(res.data);
        } else {
          setError(res.error || 'Failed to fetch listing');
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        setError(err.message || 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    }
    if (id) fetchListing();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-900" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Loading Listing Data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="bg-rose-50 text-rose-600 p-8 rounded-[3rem] text-center border-2 border-rose-100 shadow-xl max-w-md">
          <h2 className="text-2xl font-black mb-2 uppercase">Error</h2>
          <p className="text-sm font-bold opacity-70 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-rose-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-rose-600/20"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <VerificationGuard>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-12 text-center">
          <span className="text-[10px] font-black text-emerald-900 uppercase tracking-[0.4em] mb-4 block">Dashboard / Edit</span>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-2 uppercase tracking-tighter">
            Refine Listing
          </h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">
            ID: <span className="font-mono">{id}</span>
          </p>
        </div>

        <ListingForm key={listing?.id} initialData={listing} isEdit={true} />
      </div>
    </VerificationGuard>
  );
}
