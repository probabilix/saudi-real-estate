'use client';
import { AdminTopBar } from '@/components/AdminSidebar';
import { ShieldCheck, Clock, CheckCircle2, XCircle, Search, Filter } from 'lucide-react';

export default function VerificationsPage() {
  return (
    <div className="flex flex-col h-full bg-canvas">
      <AdminTopBar title="Verification Queue" />
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mb-4">
          <ShieldCheck className="w-8 h-8 text-primary-600" />
        </div>
        <h2 className="text-xl font-bold text-surface-900">REGA Verification Queue</h2>
        <p className="text-sm text-surface-500 max-w-md mt-2">
          This area will list brokers and agencies awaiting identity and license verification.
        </p>
        <div className="mt-8 admin-card p-8 border-dashed bg-surface-50">
          <p className="text-xs text-surface-400">Queue is currently empty. All brokers are verified.</p>
        </div>
      </div>
    </div>
  );
}
