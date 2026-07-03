'use client';

import React from 'react';
import { CrmTopBar } from '@/components/CrmSidebar';
import ListingForm from '@/components/listings/ListingForm';

export default function CreateListingPage() {
  return (
    <div className="flex flex-col h-full bg-slate-50">
      <CrmTopBar 
        title="Post New Property" 
        subtitle="Advertise a new real estate inventory unit on the consumer marketplace" 
      />
      <div className="flex-1 overflow-y-auto p-6">
        <ListingForm />
      </div>
    </div>
  );
}
