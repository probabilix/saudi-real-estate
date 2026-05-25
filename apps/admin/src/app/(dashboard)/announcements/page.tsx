'use client';
import { AdminTopBar } from '@/components/AdminSidebar';
import { Megaphone, Plus, Search } from 'lucide-react';

export default function AnnouncementsPage() {
  return (
    <div className="flex flex-col h-full bg-canvas">
      <AdminTopBar title="Announcements & Notifications" />
      <div className="flex-1 p-6 space-y-6">
        <div className="flex justify-between items-center">
           <h2 className="text-sm font-bold text-surface-900">Broadcast Center</h2>
           <button className="btn-primary"><Plus className="w-4 h-4" /> Create New</button>
        </div>
        <div className="admin-card p-12 text-center border-dashed">
          <Megaphone className="w-8 h-8 text-surface-300 mx-auto mb-3" />
          <p className="text-sm text-surface-500">No active global announcements.</p>
        </div>
      </div>
    </div>
  );
}
