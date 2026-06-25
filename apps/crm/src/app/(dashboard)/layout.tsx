'use client';
import { CrmSidebar } from '@/components/CrmSidebar';
import { useCrmAuth } from '@/hooks/use-crm-auth';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { crmApi } from '@/lib/api';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, isAuthenticated } = useCrmAuth();
  const [unassigned, setUnassigned] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    async function fetchUnassigned() {
      const res = await crmApi.getDashboard();
      if (res.success && res.data) setUnassigned(res.data.unassignedCount);
    }
    if (isAuthenticated) {
      fetchUnassigned();
      const interval = setInterval(fetchUnassigned, 300000); // Poll every 5 minutes
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary-600 flex items-center justify-center animate-pulse">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
          <p className="text-sm text-surface-500 font-medium">Loading CRM...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen bg-canvas overflow-hidden">
      <CrmSidebar unassigned={unassigned} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
