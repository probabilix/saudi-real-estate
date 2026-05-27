'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { AdminTopBar } from '@/components/AdminSidebar';
import { adminApi, AdminListing } from '@/lib/api';
import {
  Building2, Search, Star, StarOff,
  MapPin, ChevronLeft, ChevronRight, Loader2,
  Trash2, Pencil, Calendar, ChevronUp, ChevronDown,
  ExternalLink, AlertTriangle
} from 'lucide-react';
import clsx from 'clsx';

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000';

export default function FeaturedListingsPage() {
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [homepageLimit, setHomepageLimit] = useState<number>(6);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'unfeature';
    targetId: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    loadFeaturedListings();
    loadSettings();
  }, [page]);

  async function loadFeaturedListings() {
    setLoading(true);
    const result = await adminApi.getListings({
      page,
      isFeatured: true,
    });

    if (result.success && result.data) {
      // Sort them ascending by featuredOrder first, or fallback to index
      const sorted = [...result.data.listings].sort((a, b) => {
        return (a.featuredOrder || 0) - (b.featuredOrder || 0);
      });
      setListings(sorted);
      setTotal(result.data.total);
    }
    setLoading(false);
  }

  async function loadSettings() {
    try {
      const res = await adminApi.getAllSettings();
      if (res.success && res.data) {
        const limitSetting = res.data.find(s => s.key === 'HOMEPAGE_FEATURED_LIMIT');
        if (limitSetting) {
          setHomepageLimit(parseInt(limitSetting.value) || 6);
        }
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  }

  const handleUpdateLimit = async (limit: number) => {
    setHomepageLimit(limit);
    try {
      await adminApi.updateSetting('HOMEPAGE_FEATURED_LIMIT', String(limit));
      setToast({ message: `Homepage featured properties display limit successfully updated to ${limit}!`, type: 'success' });
    } catch (err) {
      console.error('Failed to save settings:', err);
      setToast({ message: 'Failed to update homepage display limit.', type: 'error' });
    }
  };

  const triggerUnfeatureConfirm = (id: string) => {
    setConfirmModal({
      isOpen: true,
      type: 'unfeature',
      targetId: id,
      message: 'Are you sure you want to remove this property from the featured section? This will immediately remove it from homepage promotion.',
    });
  };

  const handleUnfeature = async (id: string) => {
    setActionLoading(id);
    const result = await adminApi.unfeatureListing(id);
    if (result.success) {
      setListings(prev => prev.filter(l => l.id !== id));
      setTotal(prev => prev - 1);
      setToast({ message: 'Property successfully removed from featured properties.', type: 'success' });
    } else {
      setToast({ message: 'Failed to remove from featured properties.', type: 'error' });
    }
    setActionLoading(null);
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const items = [...listings];

    const current = items[index];
    const prev = items[index - 1];

    const currentOrder = current.featuredOrder || (index + 1);
    const prevOrder = prev.featuredOrder || index;

    current.featuredOrder = prevOrder;
    prev.featuredOrder = currentOrder;

    items[index] = prev;
    items[index - 1] = current;

    setListings(items);

    try {
      await adminApi.updateFeaturedOrder(current.id, prevOrder);
      await adminApi.updateFeaturedOrder(prev.id, currentOrder);
      setToast({ message: 'Featured order swapped and saved successfully!', type: 'success' });
    } catch (err) {
      console.error(err);
      setToast({ message: 'Failed to update featured ordering.', type: 'error' });
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index === listings.length - 1) return;
    const items = [...listings];

    const current = items[index];
    const next = items[index + 1];

    const currentOrder = current.featuredOrder || (index + 1);
    const nextOrder = next.featuredOrder || (index + 2);

    current.featuredOrder = nextOrder;
    next.featuredOrder = currentOrder;

    items[index] = next;
    items[index + 1] = current;

    setListings(items);

    try {
      await adminApi.updateFeaturedOrder(current.id, nextOrder);
      await adminApi.updateFeaturedOrder(next.id, currentOrder);
      setToast({ message: 'Featured order swapped and saved successfully!', type: 'success' });
    } catch (err) {
      console.error(err);
      setToast({ message: 'Failed to update featured ordering.', type: 'error' });
    }
  };

  const handleUpdateExpiry = async (id: string, dateStr: string) => {
    if (!dateStr) {
      setListings(prev => prev.map(item => {
        if (item.id === id) {
          return { ...item, featuredUntil: null };
        }
        return item;
      }));

      try {
        await adminApi.featureListing(id, undefined, null as any);
        setToast({ message: 'Promotion updated: set to Permanent!', type: 'success' });
      } catch (err) {
        console.error('Failed to save permanent expiry:', err);
        setToast({ message: 'Failed to update promotion to Permanent.', type: 'error' });
      }
      return;
    }

    const selectedDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      setToast({ message: 'Cannot select a past date for promotional expiry.', type: 'error' });
      return;
    }

    const isoString = selectedDate.toISOString();

    setListings(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, featuredUntil: isoString };
      }
      return item;
    }));

    try {
      await adminApi.featureListing(id, undefined, isoString);
      setToast({ message: 'Promotion expiry date successfully updated and saved!', type: 'success' });
    } catch (err) {
      console.error('Failed to save expiry:', err);
      setToast({ message: 'Failed to save promotion expiry date.', type: 'error' });
    }
  };

  const filteredListings = listings.filter(l =>
    l.arTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.enTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.shortId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-canvas">
      <AdminTopBar title="Featured Inventory Manager" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Stats & Homepage Configuration limit */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="admin-card p-6 bg-gradient-to-br from-amber-50 to-white border-amber-100 flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Star className="w-5 h-5 text-amber-600 fill-amber-600" />
              </div>
              <div>
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Active Promotions</p>
                <h3 className="text-2xl font-bold text-surface-900">{total}</h3>
              </div>
            </div>
            <p className="text-xs text-surface-500">Currently boosted properties visible in "Featured" sections across the site.</p>
          </div>

          <div className="admin-card p-6 bg-white border-surface-200 flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest">Homepage Display Limit</p>
                <h3 className="text-lg font-bold text-surface-900 mt-1">Featured Properties Count</h3>
              </div>
              <div className="flex items-center gap-1 bg-surface-50 p-1.5 rounded-2xl border border-surface-200 shadow-inner">
                {[3, 6, 9, 12].map((num) => (
                  <button
                    key={num}
                    onClick={() => handleUpdateLimit(num)}
                    className={clsx(
                      "px-3 py-1.5 text-xs font-black rounded-xl transition-all duration-300",
                      homepageLimit === num
                        ? "bg-primary-600 text-white shadow-md transform scale-105"
                        : "text-surface-600 hover:text-surface-900 hover:bg-surface-200/50"
                    )}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-surface-500">Choose the number of featured properties to showcase on the main home landing page (multiples of 3).</p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 bg-white px-3.5 py-2 rounded-xl border border-surface-200 shadow-sm w-full md:w-96">
            <Search className="w-4 h-4 text-surface-400" />
            <input
              type="text"
              placeholder="Search featured inventory..."
              className="bg-transparent border-none focus:ring-0 outline-none text-sm w-full text-surface-900"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Listings Table */}
        <div className="admin-card overflow-hidden border-amber-100 shadow-amber-900/5">
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="w-28">Order</th>
                  <th>Property / ID</th>
                  <th>Location</th>
                  <th>Featured Expiry</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto" />
                      <p className="text-xs text-surface-500 mt-2">Loading featured inventory...</p>
                    </td>
                  </tr>
                ) : filteredListings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Star className="w-6 h-6 text-amber-300" />
                      </div>
                      <p className="text-sm font-medium text-surface-600">No featured properties found</p>
                      <p className="text-xs text-surface-400 mt-1">Mark a property as featured in the main inventory to see it here.</p>
                    </td>
                  </tr>
                ) : (
                  filteredListings.map((listing, index) => (
                    <tr key={listing.id} className="group hover:bg-amber-50/30 transition-colors">
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0}
                            className="p-1 hover:bg-surface-100 rounded text-surface-400 hover:text-primary-600 disabled:opacity-20 disabled:pointer-events-none transition-colors"
                            title="Move Up"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleMoveDown(index)}
                            disabled={index === filteredListings.length - 1}
                            className="p-1 hover:bg-surface-100 rounded text-surface-400 hover:text-primary-600 disabled:opacity-20 disabled:pointer-events-none transition-colors"
                            title="Move Down"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          <span className="text-xs font-mono font-bold text-surface-400 ml-1">
                            #{index + 1}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-10 rounded-lg bg-white border border-amber-100 flex items-center justify-center relative overflow-hidden shadow-sm">
                            <Building2 className="w-5 h-5 text-amber-400" />
                            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent" />
                          </div>
                          <div className="min-w-0 max-w-[240px]">
                            <div className="text-sm font-bold text-surface-900 truncate" dir="rtl">
                              {listing.arTitle}
                            </div>
                            <div className="text-[10px] text-surface-400 font-mono mt-0.5">
                              {listing.shortId || listing.id.slice(0, 8)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-xs text-surface-600">
                            <MapPin className="w-3 h-3 text-surface-400" />
                            {listing.city}
                          </div>
                          <div className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider">
                            {listing.type} • {listing.purpose}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col gap-1 justify-center">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-surface-700">
                            <Calendar className="w-3.5 h-3.5 text-amber-500" />
                            <span>
                              {listing.featuredUntil
                                ? new Date(listing.featuredUntil).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })
                                : 'Permanent'}
                            </span>
                          </div>
                          <input
                            type="date"
                            min={new Date().toISOString().split('T')[0]}
                            value={listing.featuredUntil ? new Date(listing.featuredUntil).toISOString().split('T')[0] : ''}
                            onChange={(e) => handleUpdateExpiry(listing.id, e.target.value)}
                            className="text-[10px] bg-white border border-surface-200 rounded px-1.5 py-0.5 outline-none focus:border-amber-500 text-surface-700 w-[110px]"
                            title="Set Expiry Date"
                          />
                        </div>
                      </td>
                      <td>
                        <div className="badge badge-green">LIVE</div>
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => triggerUnfeatureConfirm(listing.id)}
                            disabled={!!actionLoading}
                            className="btn-ghost text-amber-500 hover:text-amber-600 hover:bg-amber-50"
                            title="Remove Promotion"
                          >
                            <StarOff className="w-4 h-4" />
                          </button>
                          <a
                            href={`${WEB_URL}/en/listings/${listing.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-ghost text-surface-400 hover:text-primary-600"
                            title="Preview"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          <a 
                            href={`${WEB_URL}/en/edit-property/${listing.id}?from=admin`} 
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-ghost text-surface-400 hover:text-primary-600" 
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 bg-surface-50 border-t border-surface-200 flex items-center justify-between">
            <div className="text-xs text-surface-500">
              Showing <b>{((page - 1) * 20) + 1}–{Math.min(page * 20, total)}</b> of <b>{total}</b> featured properties
            </div>
            <div className="flex items-center gap-2">
              <button
                className="btn-secondary p-1.5 disabled:opacity-50"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-xs font-bold px-3">Page {page}</div>
              <button
                className="btn-secondary p-1.5 disabled:opacity-50"
                disabled={page * 20 >= total}
                onClick={() => setPage(p => p + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Premium confirmation modal */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-surface-200 shadow-2xl max-w-md w-full overflow-hidden p-6 space-y-6 transform scale-95 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4 text-amber-600 bg-amber-50 p-4 rounded-2xl">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <div>
                <h4 className="text-sm font-black uppercase tracking-wider">Confirm Action</h4>
                <p className="text-xs font-semibold text-amber-800/80">This change will take effect immediately.</p>
              </div>
            </div>
            
            <p className="text-xs text-surface-600 leading-relaxed font-medium">
              {confirmModal.message}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmModal(null)}
                className="btn-secondary px-4 py-2 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const { type, targetId } = confirmModal;
                  setConfirmModal(null);
                  if (type === 'unfeature') handleUnfeature(targetId);
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 text-xs font-bold rounded-xl shadow-md transition-all"
              >
                Remove Promotion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Premium Floating Toast Notifications */}
      {toast && (
        <div className={clsx(
          "fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl border shadow-xl backdrop-blur-md transition-all duration-300 transform translate-y-0 scale-100",
          toast.type === 'success'
            ? "bg-emerald-50/95 border-emerald-200 text-emerald-800"
            : "bg-rose-50/95 border-rose-200 text-rose-800"
        )}>
          <div className={clsx(
            "w-2 h-2 rounded-full",
            toast.type === 'success' ? "bg-emerald-500 animate-pulse" : "bg-rose-500 animate-pulse"
          )} />
          <p className="text-sm font-bold">{toast.message}</p>
        </div>
      )}
    </div>
  );
}
