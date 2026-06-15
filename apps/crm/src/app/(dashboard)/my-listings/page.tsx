'use client';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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

  // ── Inventory Drawer State ──
  const [inventoryDrawerOpen, setInventoryDrawerOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<CrmListing | null>(null);
  const [projectsList, setProjectsList] = useState<CrmProject[]>([]);
  const [unitsList, setUnitsList] = useState<CrmProjectUnit[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingUnits, setLoadingUnits] = useState(false);
  
  // Link Project Form
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // Add Units Form
  const [unitForm, setUnitForm] = useState({
    unitNumbers: '',
    floor: '',
    type: '',
    status: 'AVAILABLE',
    price: '',
  });

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
        message = `Property ${shortId ? `${shortId} ` : ''}has been successfully listed and sent for review!`;
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

  // ── Inventory Control Handlers ──
  const handleManageInventory = async (listing: CrmListing) => {
    setSelectedListing(listing);
    setInventoryDrawerOpen(true);
    setLoadingProjects(true);
    setLoadingUnits(true);
    
    // Fetch projects
    try {
      const res = await crmApi.getProjects();
      if (res.success && res.data) {
        setProjectsList(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingProjects(false);
    }

    // Load units if listing has projectId
    if (listing.projectId) {
      setSelectedProjectId(listing.projectId);
      await loadUnits(listing.id);
    } else {
      setSelectedProjectId('');
      setUnitsList([]);
      setLoadingUnits(false);
    }
  };

  const loadUnits = async (listingId: string) => {
    setLoadingUnits(true);
    try {
      const res = await crmApi.getListingUnits(listingId);
      if (res.success && res.data) {
        setUnitsList(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUnits(false);
    }
  };

  const handleLinkProject = async () => {
    if (!selectedListing || !selectedProjectId) return;
    setActionLoading(selectedListing.id);
    
    try {
      const res = await crmApi.linkListingProject(selectedListing.id, selectedProjectId);
      if (res.success) {
        setListings(prev => prev.map(l => l.id === selectedListing.id ? { ...l, projectId: selectedProjectId } : l));
        setSelectedListing(prev => prev ? { ...prev, projectId: selectedProjectId } : null);
        setToast({ message: 'Property successfully linked to project!', type: 'success', visible: true });
        await loadUnits(selectedListing.id);
      } else {
        setToast({ message: 'Failed to link property to project.', type: 'info', visible: true });
      }
    } catch (e) {
      console.error(e);
      setToast({ message: 'Failed to link property to project.', type: 'info', visible: true });
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnlinkProject = async () => {
    if (!selectedListing) return;
    setActionLoading(selectedListing.id);
    try {
      const res = await crmApi.linkListingProject(selectedListing.id, null);
      if (res.success) {
        setListings(prev => prev.map(l => l.id === selectedListing.id ? { ...l, projectId: null } : l));
        setSelectedListing(prev => prev ? { ...prev, projectId: null } : null);
        setSelectedProjectId('');
        setUnitsList([]);
        setToast({ message: 'Property unlinked from project successfully.', type: 'success', visible: true });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  const inferFloor = (unitStr: string): number => {
    const clean = unitStr.trim().toUpperCase();
    if (clean.startsWith('G')) return 0;
    if (clean.startsWith('B')) {
      const match = clean.match(/^B(\d+)/);
      if (match) return -parseInt(match[1], 10);
      return -1;
    }
    if (clean.startsWith('M')) return 1;
    
    const digitsMatch = clean.match(/\d+/);
    if (!digitsMatch) return 1;
    
    const numStr = digitsMatch[0];
    const numVal = parseInt(numStr, 10);
    if (numStr.length >= 3) {
      return Math.floor(numVal / 100);
    }
    return 1;
  };

  const handleAddUnits = async () => {
    if (!selectedListing || !selectedListing.projectId) return;
    if (!unitForm.unitNumbers || !unitForm.type) {
      setToast({ message: 'Unit Number(s) and BHK Type are required.', type: 'info', visible: true });
      return;
    }

    const isFloorEmpty = !unitForm.floor.trim();
    let explicitFloorNum = 0;
    if (!isFloorEmpty) {
      explicitFloorNum = parseInt(unitForm.floor, 10);
      if (isNaN(explicitFloorNum)) {
        setToast({ message: 'Floor must be a valid number.', type: 'info', visible: true });
        return;
      }
    }

    const priceOverride = unitForm.price ? parseInt(unitForm.price, 10) : undefined;
    const unitsToAdd: Array<{ unitNumber: string; floor: number; type: string; status: string; price?: number }> = [];
    const rawInput = unitForm.unitNumbers.trim();
    
    if (/^\d+-\d+$/.test(rawInput)) {
      const [start, end] = rawInput.split('-').map(Number);
      if (start <= end) {
        for (let i = start; i <= end; i++) {
          const unitNoStr = String(i);
          const floorVal = isFloorEmpty ? inferFloor(unitNoStr) : explicitFloorNum;
          unitsToAdd.push({
            unitNumber: unitNoStr,
            floor: floorVal,
            type: unitForm.type,
            status: unitForm.status,
            price: priceOverride,
          });
        }
      } else {
        setToast({ message: 'Invalid unit range.', type: 'info', visible: true });
        return;
      }
    } else {
      const parts = rawInput.split(',').map(p => p.trim()).filter(p => p.length > 0);
      parts.forEach(p => {
        const floorVal = isFloorEmpty ? inferFloor(p) : explicitFloorNum;
        unitsToAdd.push({
          unitNumber: p,
          floor: floorVal,
          type: unitForm.type,
          status: unitForm.status,
          price: priceOverride,
        });
      });
    }

    if (unitsToAdd.length === 0) {
      setToast({ message: 'No valid units specified.', type: 'info', visible: true });
      return;
    }

    setLoadingUnits(true);
    try {
      const res = await crmApi.addListingUnits(selectedListing.id, unitsToAdd);
      if (res.success) {
        setToast({ message: `Successfully added ${unitsToAdd.length} units to inventory!`, type: 'success', visible: true });
        setUnitForm({ unitNumbers: '', floor: '', type: '', status: 'AVAILABLE', price: '' });
        await loadUnits(selectedListing.id);
      }
    } catch (e: any) {
      console.error(e);
      setToast({ message: e.message || 'Failed to add units.', type: 'info', visible: true });
    } finally {
      setLoadingUnits(false);
    }
  };

  const handleUpdateUnitStatus = async (unitId: string, newStatus: string) => {
    if (!selectedListing) return;
    try {
      const res = await crmApi.updateListingUnit(selectedListing.id, unitId, { status: newStatus });
      if (res.success) {
        setUnitsList(prev => prev.map(u => u.id === unitId ? { ...u, status: newStatus } : u));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteUnit = async (unitId: string) => {
    if (!selectedListing) return;
    try {
      const res = await crmApi.deleteListingUnit(selectedListing.id, unitId);
      if (res.success) {
        setUnitsList(prev => prev.filter(u => u.id !== unitId));
        setToast({ message: 'Unit removed from inventory.', type: 'success', visible: true });
      }
    } catch (e) {
      console.error(e);
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
            <a 
              href={`${WEB_URL}/en/post-property?from=crm${token ? `&token=${token}` : ''}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#064e4b] hover:bg-[#043a37] text-white py-2.5 px-4 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 shadow-md shadow-[#064e4b]/10"
            >
              <Plus className="w-4 h-4" />
              <span>Post New Property</span>
            </a>
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
              <option value="FLAGGED">Awaiting Review</option>
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
                          {listing.status === 'FLAGGED' ? 'Awaiting Review' : listing.status}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Manage Inventory button */}
                          <button
                            onClick={() => handleManageInventory(listing)}
                            className="p-2 text-slate-400 hover:text-[#064e4b] hover:bg-slate-100 rounded-lg transition-colors"
                            title="Manage Unit Inventory"
                          >
                            <Building2 className="w-4 h-4" />
                          </button>

                          <a
                            href={`${WEB_URL}/${listing.arTitle ? 'ar' : 'en'}/listings/${listing.id}${token ? `?token=${token}` : ''}`}
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

                          <a 
                            href={`${WEB_URL}/en/edit-property/${listing.id}?from=crm${token ? `&token=${token}` : ''}`} 
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-slate-400 hover:text-[#064e4b] hover:bg-slate-100 rounded-lg transition-colors inline-block" 
                            title="Edit Listing"
                          >
                            <Pencil className="w-4 h-4" />
                          </a>

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

      {/* Inventory Drawer */}
      {inventoryDrawerOpen && selectedListing && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setInventoryDrawerOpen(false)} />
          
          <div className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col z-10 animate-slide-in">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#064e4b] flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 truncate max-w-xs md:max-w-sm" dir="rtl">
                    {selectedListing.arTitle}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Project Inventory Controller</p>
                </div>
              </div>
              <button onClick={() => setInventoryDrawerOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Linking Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">1. Project Association</h4>
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-4">
                  {selectedListing.projectId ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <div>
                          <span className="text-xs text-slate-500 block">Linked Project:</span>
                          <span className="text-sm font-bold text-slate-900">
                            {projectsList.find(p => p.id === selectedListing.projectId)?.nameEn || 'Loading Project details...'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={handleUnlinkProject}
                        className="py-1.5 px-3 bg-white hover:bg-red-50 text-xs border border-red-200 text-red-600 font-bold rounded-xl transition-colors"
                      >
                        Unlink
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-500">
                        This property listing is not associated with a project. Link it to unlock multi-unit inventory listing.
                      </p>
                      <div className="flex gap-2">
                        <select
                          className="flex-1 bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold outline-none text-slate-700"
                          value={selectedProjectId}
                          onChange={(e) => setSelectedProjectId(e.target.value)}
                        >
                          <option value="">Select an existing project...</option>
                          {projectsList.map(p => (
                            <option key={p.id} value={p.id}>{p.nameEn} ({p.city})</option>
                          ))}
                        </select>
                        <button
                          onClick={handleLinkProject}
                          disabled={!selectedProjectId}
                          className="py-2 px-4 bg-[#064e4b] hover:bg-[#043a37] text-white font-bold text-xs rounded-xl disabled:opacity-50 transition-colors"
                        >
                          Link Project
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Units Inventory Management */}
              {selectedListing.projectId && (
                <div className="space-y-6">
                  {/* Add Unit Form */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">2. Add Units to Inventory</h4>
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 block">Unit Numbers *</label>
                          <input
                            type="text"
                            placeholder="e.g. 101, 102 (or 101-105)"
                            className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs outline-none focus:border-[#064e4b]"
                            value={unitForm.unitNumbers}
                            onChange={(e) => setUnitForm(p => ({ ...p, unitNumbers: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 block">Floor Number (Optional)</label>
                          <input
                            type="text"
                            placeholder="e.g. 1 (inferred if empty)"
                            className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs outline-none focus:border-[#064e4b]"
                            value={unitForm.floor}
                            onChange={(e) => setUnitForm(p => ({ ...p, floor: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 block">BHK Type *</label>
                          <input
                            type="text"
                            placeholder="e.g. 3BHK"
                            className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs outline-none focus:border-[#064e4b]"
                            value={unitForm.type}
                            onChange={(e) => setUnitForm(p => ({ ...p, type: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 block">Unit Status</label>
                          <select
                            className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs outline-none focus:border-[#064e4b] text-slate-700"
                            value={unitForm.status}
                            onChange={(e) => setUnitForm(p => ({ ...p, status: e.target.value }))}
                          >
                            <option value="AVAILABLE">Available</option>
                            <option value="RESERVED">Reserved</option>
                            <option value="SOLD">Sold</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 block">Price Override (SAR)</label>
                          <input
                            type="number"
                            placeholder="Same as listing"
                            className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs outline-none focus:border-[#064e4b]"
                            value={unitForm.price}
                            onChange={(e) => setUnitForm(p => ({ ...p, price: e.target.value }))}
                          />
                        </div>
                      </div>

                      <button
                        onClick={handleAddUnits}
                        className="w-full py-2.5 bg-[#064e4b] hover:bg-[#043a37] text-white font-bold text-xs rounded-xl shadow-md transition-colors"
                      >
                        Add Unit(s) to Inventory
                      </button>
                    </div>
                  </div>

                  {/* Units List */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">3. Current Units ({unitsList.length})</h4>
                    <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-inner">
                      {loadingUnits ? (
                        <div className="py-8 text-center bg-slate-50">
                          <Loader2 className="w-5 h-5 animate-spin text-[#064e4b] mx-auto" />
                        </div>
                      ) : unitsList.length === 0 ? (
                        <div className="py-8 text-center bg-slate-50 text-xs text-slate-400">
                          No units added to this listing yet.
                        </div>
                      ) : (
                        <table className="w-full text-left text-xs bg-white">
                          <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                            <tr>
                              <th className="py-2.5 px-4">Unit #</th>
                              <th className="py-2.5 px-4">Floor / Type</th>
                              <th className="py-2.5 px-4">Price</th>
                              <th className="py-2.5 px-4">Status</th>
                              <th className="py-2.5 px-4 text-right">Delete</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                            {unitsList.map(unit => (
                              <tr key={unit.id} className="hover:bg-slate-50/50">
                                <td className="py-2.5 px-4 font-bold text-slate-900">{unit.unitNumber}</td>
                                <td className="py-2.5 px-4">Flr {unit.floor} • {unit.type}</td>
                                <td className="py-2.5 px-4">
                                  {unit.price ? `${unit.price.toLocaleString()} SAR` : <span className="text-slate-400">Listing Price</span>}
                                </td>
                                <td className="py-2.5 px-4">
                                  <select
                                    className="bg-transparent border-none text-[11px] font-bold text-[#064e4b] p-0 focus:ring-0 cursor-pointer"
                                    value={unit.status}
                                    onChange={(e) => handleUpdateUnitStatus(unit.id, e.target.value)}
                                  >
                                    <option value="AVAILABLE">Available</option>
                                    <option value="RESERVED">Reserved</option>
                                    <option value="SOLD">Sold</option>
                                  </select>
                                </td>
                                <td className="py-2.5 px-4 text-right">
                                  <button onClick={() => handleDeleteUnit(unit.id)} className="text-slate-400 hover:text-red-500">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
