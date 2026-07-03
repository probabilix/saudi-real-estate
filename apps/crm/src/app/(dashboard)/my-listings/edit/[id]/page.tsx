'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { CrmTopBar } from '@/components/CrmSidebar';
import ListingForm from '@/components/listings/ListingForm';
import { crmApi } from '@/lib/api';
import { Loader2 } from 'lucide-react';

export default function EditListingPage() {
  const params = useParams();
  const id = params.id as string;
  
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProperty() {
      if (!id) return;
      try {
        const res = await crmApi.getListingById(id);
        if (res.success && res.data) {
          setListing(res.data);
        } else {
          setError(res.error || res.message || 'Failed to load property details.');
        }
      } catch (err: any) {
        setError(err.message || 'Network error occurred.');
      } finally {
        setLoading(false);
      }
    }
    loadProperty();
  }, [id]);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <CrmTopBar 
        title="Edit Property Listing" 
        subtitle={listing?.shortId ? `Modify details for property ${listing.shortId}` : 'Update your property details'} 
      />
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="w-10 h-10 text-emerald-800 animate-spin mb-4" />
            <p className="text-slate-500 font-semibold italic animate-pulse">Loading property details...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 p-5 rounded-2xl max-w-lg mx-auto mt-10">
            <h4 className="font-bold text-sm">Error Loading Property</h4>
            <p className="text-xs mt-1.5 font-medium">{error}</p>
          </div>
        ) : (
          <ListingForm initialData={listing} isEdit={true} />
        )}
      </div>
    </div>
  );
}
