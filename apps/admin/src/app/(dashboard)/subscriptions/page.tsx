'use client';
import { AdminTopBar } from '@/components/AdminSidebar';
import { CreditCard, TrendingUp, Users, DollarSign } from 'lucide-react';

export default function SubscriptionsPage() {
  return (
    <div className="flex flex-col h-full bg-canvas">
      <AdminTopBar title="Subscription Management" />
      <div className="flex-1 p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="admin-card p-5 bg-gradient-to-br from-primary-600 to-primary-700 text-white">
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Monthly Recurring Revenue</p>
            <h3 className="text-2xl font-black mt-1">SAR 12,450</h3>
            <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-emerald-300">
              <TrendingUp className="w-3 h-3" /> +14.2% from last month
            </div>
          </div>
          <div className="admin-card p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-surface-500">Active Subscribers</p>
            <h3 className="text-2xl font-black text-surface-900 mt-1">84</h3>
            <p className="text-[10px] text-surface-400 mt-4">Across all tiers</p>
          </div>
          <div className="admin-card p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-surface-500">Churn Rate</p>
            <h3 className="text-2xl font-black text-surface-900 mt-1">2.4%</h3>
            <p className="text-[10px] text-surface-400 mt-4">Stable performance</p>
          </div>
        </div>

        <div className="admin-card p-8 text-center border-dashed">
          <CreditCard className="w-8 h-8 text-surface-300 mx-auto mb-3" />
          <p className="text-sm text-surface-500">Billing history and revenue reporting will appear here.</p>
        </div>
      </div>
    </div>
  );
}
