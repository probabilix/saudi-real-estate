import React from 'react';
import { VerificationGuard } from '@/components/auth/VerificationGuard';
import { ListingForm } from '@/components/listings/ListingForm';

export default function NewListingPage() {

  return (
    <VerificationGuard>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
            Create New Listing
          </h1>
          <p className="text-slate-500">
            Fill in the details below to list your property on Saudi RE.
          </p>
        </div>

        <ListingForm />
      </div>
    </VerificationGuard>
  );
}
