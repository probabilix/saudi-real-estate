'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { AdminTopBar } from '@/components/AdminSidebar';
import { adminApi } from '@/lib/api';
import {
  Mail,
  Search,
  Trash2,
  Loader2,
  CheckCircle,
  AlertTriangle,
  X,
  Copy,
  Check,
  RotateCcw,
  UserX,
  ChevronLeft,
  ChevronRight,
  Download
} from 'lucide-react';

interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  active: number;
  requested: number;
  unsubscribed: number;
}

export default function NewsletterPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [stats, setStats] = useState<Stats>({ active: 0, requested: 0, unsubscribed: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Status Filter: 'ALL' | 'ACTIVE' | 'UNSUBSCRIBE_REQUESTED' | 'UNSUBSCRIBED'
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'UNSUBSCRIBE_REQUESTED' | 'UNSUBSCRIBED'>('ALL');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // On-page Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    onConfirm: () => void;
    isDanger?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    cancelText: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    loadSubscribers();
  }, []);

  async function loadSubscribers() {
    setLoading(true);
    try {
      const res = await adminApi.getNewsletterSubscribers();
      if (res.success && res.data) {
        setSubscribers(res.data.subscribers);
        setStats(res.data.stats);
      }
    } catch (err) {
      console.error('Failed to load subscribers:', err);
    } finally {
      setLoading(false);
    }
  }

  const showConfirm = (options: {
    title: string;
    message: string;
    confirmText: string;
    cancelText?: string;
    onConfirm: () => void | Promise<void>;
    isDanger?: boolean;
  }) => {
    setConfirmModal({
      isOpen: true,
      title: options.title,
      message: options.message,
      confirmText: options.confirmText,
      cancelText: options.cancelText || 'Cancel',
      onConfirm: async () => {
        await options.onConfirm();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      },
      isDanger: options.isDanger
    });
  };

  const handleUpdateStatus = (subscriber: Subscriber, newStatus: string) => {
    const isDeactivate = newStatus === 'UNSUBSCRIBED';
    const title = isDeactivate ? 'Unsubscribe Subscriber' : 'Reactivate Subscriber';
    const message = isDeactivate
      ? `Are you sure you want to mark ${subscriber.email} as Unsubscribed (Inactive)?`
      : `Are you sure you want to reactivate ${subscriber.email} back to Active status?`;

    showConfirm({
      title,
      message,
      confirmText: isDeactivate ? 'Unsubscribe' : 'Reactivate',
      isDanger: isDeactivate,
      onConfirm: async () => {
        try {
          const res = await adminApi.updateNewsletterStatus(subscriber.id, newStatus);
          if (res.success) {
            loadSubscribers();
          }
        } catch (err) {
          console.error('Failed to update subscriber status:', err);
        }
      }
    });
  };

  const handlePermanentDelete = (subscriber: Subscriber) => {
    showConfirm({
      title: 'Permanently Delete Subscriber',
      message: `WARNING: Are you sure you want to permanently delete ${subscriber.email} from the database? This action cannot be undone.`,
      confirmText: 'Delete permanently',
      isDanger: true,
      onConfirm: async () => {
        try {
          const res = await adminApi.deleteNewsletterSubscriber(subscriber.id);
          if (res.success) {
            loadSubscribers();
          }
        } catch (err) {
          console.error('Failed to permanently delete subscriber:', err);
        }
      }
    });
  };

  const handleCopy = (id: string, email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const toggleStatusFilter = (status: 'ACTIVE' | 'UNSUBSCRIBE_REQUESTED' | 'UNSUBSCRIBED') => {
    setStatusFilter(prev => (prev === status ? 'ALL' : status));
    setCurrentPage(1); // Reset pagination
  };

  const handleExportCSV = () => {
    // Generate CSV headers and rows
    const headers = ['Name', 'Email', 'Status', 'Subscribed Date', 'Last Updated'];
    const rows = filteredSubscribers.map(sub => [
      sub.name || 'Anonymous',
      sub.email,
      sub.status,
      new Date(sub.createdAt).toLocaleString(),
      new Date(sub.updatedAt).toLocaleString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Create a Blob and download link with UTF-8 BOM byte (FEFF) for Excel compatibility
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `newsletter_subscribers_${statusFilter.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reset pagination when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  // Filter list by search query and status filter
  const filteredSubscribers = subscribers.filter(s => {
    const matchesSearch = s.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Pagination slicing
  const totalPages = Math.max(1, Math.ceil(filteredSubscribers.length / ITEMS_PER_PAGE));
  const paginatedSubscribers = filteredSubscribers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="flex flex-col h-full bg-surface-50">
      <AdminTopBar title="Newsletter Management" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
              <Mail className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-surface-900">Newsletter Subscribers</h1>
              <p className="text-xs text-surface-500">Manage campaign emails, track active subscriptions, and process unsubscribe requests.</p>
            </div>
          </div>
        </div>

        {/* Stats Cards / Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <button
            onClick={() => toggleStatusFilter('ACTIVE')}
            className={`admin-card p-6 flex items-center gap-4 text-left transition-all border-l-4 ${
              statusFilter === 'ACTIVE'
                ? 'border-l-emerald-600 bg-emerald-50/15 ring-2 ring-emerald-500/20'
                : 'border-l-emerald-500 hover:bg-surface-100/50'
            }`}
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs text-surface-500 font-bold block uppercase tracking-wider">Active Subscribers</span>
              <span className="text-2xl font-black text-surface-900 mt-1 block">
                {loading ? '...' : stats.active}
              </span>
            </div>
            {statusFilter === 'ACTIVE' && (
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">Filtered</span>
            )}
          </button>

          <button
            onClick={() => toggleStatusFilter('UNSUBSCRIBE_REQUESTED')}
            className={`admin-card p-6 flex items-center gap-4 text-left transition-all border-l-4 ${
              statusFilter === 'UNSUBSCRIBE_REQUESTED'
                ? 'border-l-amber-600 bg-amber-50/15 ring-2 ring-amber-500/20'
                : 'border-l-amber-500 hover:bg-surface-100/50'
            }`}
          >
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs text-surface-500 font-bold block uppercase tracking-wider">Unsubscribe Requests</span>
              <span className="text-2xl font-black text-surface-900 mt-1 block">
                {loading ? '...' : stats.requested}
              </span>
            </div>
            {statusFilter === 'UNSUBSCRIBE_REQUESTED' && (
              <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full shrink-0">Filtered</span>
            )}
          </button>

          <button
            onClick={() => toggleStatusFilter('UNSUBSCRIBED')}
            className={`admin-card p-6 flex items-center gap-4 text-left transition-all border-l-4 ${
              statusFilter === 'UNSUBSCRIBED'
                ? 'border-l-surface-600 bg-surface-100 ring-2 ring-surface-500/20'
                : 'border-l-surface-400 hover:bg-surface-100/50'
            }`}
          >
            <div className="w-12 h-12 rounded-xl bg-surface-100 text-surface-600 flex items-center justify-center shrink-0">
              <UserX className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs text-surface-500 font-bold block uppercase tracking-wider">Unsubscribed (Inactive)</span>
              <span className="text-2xl font-black text-surface-900 mt-1 block">
                {loading ? '...' : stats.unsubscribed}
              </span>
            </div>
            {statusFilter === 'UNSUBSCRIBED' && (
              <span className="text-xs font-bold text-surface-600 bg-surface-200 px-2 py-0.5 rounded-full shrink-0">Filtered</span>
            )}
          </button>
        </div>

        {/* Search & Active Filters Bar */}
        <div className="admin-card p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              type="text"
              placeholder="Search subscribers by email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="admin-input pl-10"
            />
          </div>
          <div className="flex items-center gap-3">
            {statusFilter !== 'ALL' && (
              <button
                onClick={() => setStatusFilter('ALL')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-primary-650 bg-primary-50 hover:bg-primary-100 transition-colors"
              >
                Clear Filter ({statusFilter})
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={handleExportCSV}
              disabled={filteredSubscribers.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white font-bold text-xs rounded-xl hover:bg-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-primary-200"
              title="Export filtered subscribers to CSV spreadsheet"
            >
              <Download className="w-4 h-4" />
              Export to Sheet
            </button>
          </div>
        </div>

        {/* Subscriber List Table */}
        <div className="admin-card overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
              <span className="text-sm text-surface-500 font-semibold">Loading subscribers list...</span>
            </div>
          ) : paginatedSubscribers.length === 0 ? (
            <div className="text-center py-16">
              <Mail className="w-12 h-12 text-surface-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-surface-850">No Subscribers Found</h3>
              <p className="text-xs text-surface-400 mt-1">
                {search || statusFilter !== 'ALL' 
                  ? 'No results match your selected search and filters.' 
                  : 'There are no newsletter subscribers in the database.'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-50 border-b border-surface-200 text-xs font-bold text-surface-600 uppercase tracking-wider">
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Email Address</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Subscribed Date</th>
                      <th className="px-6 py-4">Last Updated</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-200 text-sm text-surface-800">
                    {paginatedSubscribers.map((sub) => (
                      <tr key={sub.id} className="hover:bg-surface-50/55 transition-colors">
                        <td className="px-6 py-4 font-semibold text-surface-900">
                          {sub.name || <span className="text-surface-450 italic font-normal text-xs">Anonymous</span>}
                        </td>
                        <td className="px-6 py-4 font-medium flex items-center gap-2">
                          <span className="truncate max-w-xs">{sub.email}</span>
                          <button
                            onClick={() => handleCopy(sub.id, sub.email)}
                            className="p-1 rounded hover:bg-surface-200 text-surface-500 transition-colors"
                            title="Copy Email Address"
                          >
                            {copiedId === sub.id ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          {sub.status === 'UNSUBSCRIBE_REQUESTED' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-250">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                              Unsubscribe Requested
                            </span>
                          ) : sub.status === 'UNSUBSCRIBED' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-150 text-gray-700 border border-gray-250">
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                              Unsubscribed (Inactive)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-250">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              Active
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-surface-500 text-xs">
                          {new Date(sub.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-surface-500 text-xs">
                          {new Date(sub.updatedAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {sub.status === 'UNSUBSCRIBE_REQUESTED' && (
                              <button
                                onClick={() => handleUpdateStatus(sub, 'UNSUBSCRIBED')}
                                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                              >
                                Approve Unsubscribe
                              </button>
                            )}
                            {sub.status === 'ACTIVE' && (
                              <button
                                onClick={() => handleUpdateStatus(sub, 'UNSUBSCRIBED')}
                                className="px-3 py-1.5 bg-surface-100 hover:bg-surface-200 border border-surface-200 text-surface-700 rounded-lg text-xs font-bold transition-colors"
                              >
                                Unsubscribe
                              </button>
                            )}
                            {sub.status === 'UNSUBSCRIBED' && (
                              <button
                                onClick={() => handleUpdateStatus(sub, 'ACTIVE')}
                                className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center gap-1 shadow-sm"
                              >
                                <RotateCcw className="w-3 h-3" />
                                Reactivate
                              </button>
                            )}
                            <button
                              onClick={() => handlePermanentDelete(sub)}
                              className="p-2 rounded-lg hover:bg-red-50 text-surface-50 hover:text-red-650 transition-colors border border-surface-200 hover:border-red-200"
                              title="Delete Subscriber permanently"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 bg-surface-50 border-t border-surface-200 text-xs text-surface-500 font-semibold">
                  <div>
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredSubscribers.length)} of {filteredSubscribers.length} subscribers
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-surface-200 bg-white hover:bg-surface-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4 text-surface-650" />
                    </button>
                    <span className="px-3 py-1.5 rounded-lg border border-surface-200 bg-white font-bold text-surface-850">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-surface-200 bg-white hover:bg-surface-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4 text-surface-650" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Premium On-Page Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl border border-surface-200 max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${confirmModal.isDanger ? 'bg-red-50 text-red-600' : 'bg-primary-50 text-primary-600'}`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-surface-900 leading-tight">{confirmModal.title}</h3>
            </div>
            <p className="text-sm text-surface-550 leading-relaxed font-medium">{confirmModal.message}</p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors border border-gray-200"
              >
                {confirmModal.cancelText}
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className={`px-5 py-2.5 text-white font-bold text-xs rounded-xl transition-all shadow-sm active:scale-95 ${
                  confirmModal.isDanger
                    ? 'bg-red-600 hover:bg-red-750 shadow-md shadow-red-100'
                    : 'bg-primary-600 hover:bg-primary-700 shadow-md shadow-primary-100'
                }`}
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
