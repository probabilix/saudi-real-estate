'use client';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CrmTopBar } from '@/components/CrmSidebar';
import { crmApi, CrmListing, CrmProject, CrmProjectUnit } from '@/lib/api';
import { useCrmAuth } from '@/hooks/use-crm-auth';
import {
  Building2, Search, MapPin, ArrowUpRight,
  ChevronLeft, ChevronRight, Loader2,
  Trash2, Pencil, Plus, X, AlertTriangle, CheckCircle2,
  AlertCircle, Eye, EyeOff
} from 'lucide-react';
import clsx from 'clsx';

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000';

export default function MyListingsPage() {
  const { user } = useCrmAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [listings, setListings] = useState<CrmListing[]>([]);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(localStorage.getItem('crmToken'));
  }, []);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; shortId?: string; type: 'success' | 'info'; visible: boolean } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    targetId: string;
    message: string;
  } | null>(null);



  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when filters or search term change
  useEffect(() => {
    setPage(1);
  }, [filterStatus, debouncedSearchTerm]);

  useEffect(() => {
    const success = searchParams.get('success');
    const shortId = searchParams.get('shortId');

    if (success) {
      let message = '';
      if (success === 'created') {
        message = `Property ${shortId ? `${shortId} ` : ''}has been successfully listed and is awaiting approval!`;
      } else if (success === 'updated') {
        message = `Property ${shortId ? `${shortId} ` : ''}has been successfully updated!`;
      } else if (success === 'drafted') {
        message = `Draft for property ${shortId ? `${shortId} ` : ''}has been saved successfully!`;
      }

      if (message) {
        setToast({ message, shortId: shortId || undefined, type: 'success', visible: true });

        // Remove search params from URL immediately
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.delete('success');
        newParams.delete('shortId');
        const query = newParams.toString() ? `?${newParams.toString()}` : '';
        router.replace(`/my-listings${query}`);
      }
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (toast && toast.visible) {
      const timer = setTimeout(() => {
        setToast(prev => prev ? { ...prev, visible: false } : null);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [toast?.visible]);

  useEffect(() => {
    if (user) {
      loadListings();
    }
  }, [page, filterStatus, debouncedSearchTerm, user]);

  async function loadListings() {
    setLoading(true);
    try {
      const result = await crmApi.getListings({
        page,
        status: filterStatus || undefined,
        search: debouncedSearchTerm || undefined,
        ownerId: user?.role !== 'ADMIN' ? user?.id : undefined
      });

      if (result.success && result.data) {
        setListings(result.data.items || []);
        setTotal(result.data.total || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const triggerDeleteConfirm = (id: string, shortId?: string) => {
    setConfirmModal({
      isOpen: true,
      targetId: id,
      message: `Are you sure you want to permanently delete the property ${shortId || id}? This will completely remove it from the website and cannot be undone.`,
    });
  };

  const handleDeleteListing = async (id: string) => {
    setActionLoading(id);
    try {
      const result = await crmApi.deleteListing(id);
      if (result.success) {
        setListings(prev => prev.filter(l => l.id !== id));
        setTotal(prev => prev - 1);
        setToast({ message: 'Property deleted successfully!', type: 'success', visible: true });
      } else {
        setToast({ message: 'Failed to delete property.', type: 'info', visible: true });
      }
    } catch (err) {
      console.error(err);
      setToast({ message: 'Failed to delete property.', type: 'info', visible: true });
    } finally {
      setActionLoading(null);
      setConfirmModal(null);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setActionLoading(id);
    try {
      const result = await crmApi.updateListing(id, { status: newStatus });
      if (result.success) {
        setListings(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l));
        setToast({ message: `Property status updated to ${newStatus}!`, type: 'success', visible: true });
      } else {
        setToast({ message: 'Failed to update property status.', type: 'info', visible: true });
      }
    } catch (err) {
      console.error(err);
      setToast({ message: 'Failed to update property status.', type: 'info', visible: true });
    } finally {
      setActionLoading(null);
    }
  };



  return (
    <div className="flex flex-col h-full bg-slate-50">
      <CrmTopBar title="My Properties & Listings" subtitle="Manage your real estate postings, inventory, and analytics" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Premium Toast Alert Banner */}
        {toast && toast.visible && (
          <div className="fixed bottom-6 right-6 z-50 max-w-md w-full animate-in fade-in slide-in-from-bottom-5 duration-300">
            <div className="bg-[#052e2b]/95 backdrop-blur-md border border-emerald-800/30 text-white rounded-2xl shadow-[0_20px_50px_rgba(4,47,46,0.3)] p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
                  <CheckCircle2 className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400/80">System Broadcast</p>
                  <div className="text-xs font-bold text-slate-100 mt-0.5 leading-relaxed">
                    {toast.shortId ? (
                      <>
                        Property{' '}
                        <button
                          onClick={() => {
                            setSearchTerm(toast.shortId!);
                          }}
                          className="underline text-emerald-400 hover:text-emerald-300 font-mono font-black transition-colors duration-150"
                          title="Click to search and highlight this property"
                        >
                          {toast.shortId}
                        </button>
                        {toast.message.split(toast.shortId)[1] || ' has been successfully saved!'}
                      </>
                    ) : (
                      toast.message
                    )}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setToast(prev => prev ? { ...prev, visible: false } : null)}
                className="p-1.5 hover:bg-white/10 rounded-lg text-emerald-400/60 hover:text-white transition-all duration-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Header Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="flex items-center gap-3 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm w-full md:w-96">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by title or ID..."
                className="bg-transparent border-none focus:ring-0 outline-none text-sm w-full text-slate-900"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Link 
              href="/my-listings/create"
              className="bg-[#064e4b] hover:bg-[#043a37] text-white py-2.5 px-4 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 shadow-md shadow-[#064e4b]/10"
            >
              <Plus className="w-4 h-4" />
              <span>Post New Property</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <select
              className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-sm font-semibold outline-none text-slate-700 focus:border-[#064e4b]"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="DRAFT">Draft</option>
              <option value="FLAGGED">Awaiting Approval</option>
              <option value="SOLD">Sold</option>
              <option value="RENTED">Rented</option>
            </select>
          </div>
        </div>

        {/* Listings Table */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <th className="py-4 px-6">Listing / ID</th>
                  <th className="py-4 px-6">Location & Type</th>
                  <th className="py-4 px-6">Price & Views</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-sm font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-[#064e4b] mx-auto" />
                      <p className="text-xs text-slate-400 mt-2">Loading properties...</p>
                    </td>
                  </tr>
                ) : listings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Building2 className="w-6 h-6 text-slate-300" />
                      </div>
                      <p className="text-sm font-semibold text-slate-600">No properties found</p>
                      <p className="text-xs text-slate-400 mt-1">Try listing one or adjusting your filters</p>
                    </td>
                  </tr>
                ) : (
                  listings.map((listing) => (
                    <tr key={listing.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-10 rounded-lg bg-slate-100 flex items-center justify-center relative overflow-hidden">
                            <Building2 className="w-5 h-5 text-slate-400" />
                          </div>
                          <div className="min-w-0 max-w-[280px]">
                            <div className="font-bold text-slate-900 truncate" dir="rtl">
                              {listing.arTitle}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              ID: {listing.shortId || listing.id.slice(0, 8)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 text-slate-600 text-xs">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {listing.city}
                          </div>
                          <div className="text-[10px] font-bold text-[#064e4b] uppercase tracking-wider">
                            {listing.type} • {listing.purpose}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900">
                          {listing.price.toLocaleString()} SAR
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Views: {listing.viewsCount}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className={clsx(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border",
                          listing.status === 'ACTIVE' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                            listing.status === 'FLAGGED' ? "bg-amber-50 text-amber-700 border-amber-100" :
                              "bg-slate-50 text-slate-600 border-slate-100"
                        )}>
                          {listing.status === 'FLAGGED' ? 'Awaiting Approval' : listing.status}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">

                          <a
                            href={listing.projectId
                              ? `${WEB_URL}/${listing.arTitle ? 'ar' : 'en'}/projects/${listing.projectId}?layout=${listing.shortId || listing.id}${token ? `&token=${token}` : ''}`
                              : `${WEB_URL}/${listing.arTitle ? 'ar' : 'en'}/listings/${listing.id}${token ? `?token=${token}` : ''}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-slate-400 hover:text-[#064e4b] hover:bg-slate-100 rounded-lg transition-colors inline-block"
                            title="View Public Page"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </a>
                          
                          {/* Hide / Unhide Action */}
                          {listing.status === 'ACTIVE' ? (
                            <button
                              onClick={() => handleUpdateStatus(listing.id, 'DRAFT')}
                              disabled={!!actionLoading}
                              className="p-2 text-slate-400 hover:text-[#064e4b] hover:bg-slate-100 rounded-lg transition-colors"
                              title="Hide Listing (Draft)"
                            >
                              <EyeOff className="w-4 h-4" />
                            </button>
                          ) : (
                            listing.status === 'DRAFT' && (
                              <button
                                onClick={() => handleUpdateStatus(listing.id, 'ACTIVE')}
                                disabled={!!actionLoading}
                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="Unhide / Activate Listing"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            )
                          )}

                          <Link 
                            href={`/my-listings/edit/${listing.id}`} 
                            className="p-2 text-slate-400 hover:text-[#064e4b] hover:bg-slate-100 rounded-lg transition-colors inline-block" 
                            title="Edit Listing"
                          >
                            <Pencil className="w-4 h-4" />
                          </Link>

                          {/* Delete Property Action */}
                          <button
                            onClick={() => triggerDeleteConfirm(listing.id, listing.shortId || undefined)}
                            disabled={!!actionLoading}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Permanently Delete Listing"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <div className="text-xs text-slate-500 font-semibold">
              Showing <b>{((page - 1) * 20) + 1}–{Math.min(page * 20, total)}</b> of <b>{total}</b> properties
            </div>
            <div className="flex items-center gap-2">
              <button
                className="bg-white border border-slate-200 p-1.5 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <div className="text-xs font-bold px-3 text-slate-700">Page {page}</div>
              <button
                className="bg-white border border-slate-200 p-1.5 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={page * 20 >= total}
                onClick={() => setPage(p => p + 1)}
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Delete confirmation modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden p-6 space-y-5 transform scale-95 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4 text-red-600 bg-red-50 p-4 rounded-2xl">
              <AlertTriangle className="w-6 h-6 shrink-0 text-red-600" />
              <div>
                <h4 className="text-sm font-black uppercase tracking-wider text-red-800">Critical Action</h4>
                <p className="text-xs font-semibold text-red-800/80">This action is permanent and cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 font-semibold leading-relaxed">
              {confirmModal.message}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteListing(confirmModal.targetId)}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-red-600/10"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
