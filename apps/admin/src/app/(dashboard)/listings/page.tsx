'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AdminTopBar } from '@/components/AdminSidebar';
import { adminApi, AdminListing } from '@/lib/api';
import {
  Building2, Search, Filter, MoreVertical,
  CheckCircle2, AlertCircle, Clock, Star, StarOff,
  MapPin, Tag, Eye, EyeOff, ArrowUpRight,
  ChevronLeft, ChevronRight, Loader2,
  Trash2, ShieldCheck, ShieldAlert, Pencil, Plus, X,
  AlertTriangle, Bot, Link as LinkIcon, Unlink as UnlinkIcon
} from 'lucide-react';
import clsx from 'clsx';

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000';

export default function ListingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const requestCountRef = useRef(0);

  useEffect(() => {
    setToken(localStorage.getItem('adminToken'));
  }, []);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; shortId?: string; type: 'success' | 'info'; visible: boolean } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'delete' | 'feature' | 'unfeature';
    targetId: string;
    message: string;
    isCurrentlyFeatured?: boolean;
  } | null>(null);

  // ── Inventory Drawer State ──
  const [inventoryDrawerOpen, setInventoryDrawerOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<AdminListing | null>(null);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [unitsList, setUnitsList] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingUnits, setLoadingUnits] = useState(false);

  // Link Project Form
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [isCreatingNewProject, setIsCreatingNewProject] = useState(false);
  const [newProjectData, setNewProjectData] = useState({
    nameEn: '',
    nameAr: '',
    city: '',
    district: '',
    mapEmbedUrl: '',
  });

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

  // Sync status filter with URL search param
  useEffect(() => {
    const statusParam = searchParams.get('status');
    setFilterStatus(statusParam || '');
  }, [searchParams]);

  useEffect(() => {
    const success = searchParams.get('success');
    const shortId = searchParams.get('shortId');

    if (success) {
      let message = '';
      if (success === 'created') {
        message = `Property ${shortId ? `${shortId} ` : ''}has been successfully listed and is now ACTIVE!`;
      } else if (success === 'updated') {
        message = `Property ${shortId ? `${shortId} ` : ''}has been successfully updated!`;
      } else if (success === 'drafted') {
        message = `Draft for property ${shortId ? `${shortId} ` : ''}has been saved successfully!`;
      }

      if (message) {
        setToast({ message, shortId: shortId || undefined, type: 'success', visible: true });

        // Remove search params from URL immediately to prevent re-triggering on reload
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.delete('success');
        newParams.delete('shortId');
        const query = newParams.toString() ? `?${newParams.toString()}` : '';
        router.replace(`/listings${query}`);
      }
    }
  }, [searchParams, router]);

  // Separate effect to handle toast auto-dismiss safely after 10 seconds without being cancelled by URL replace cleanup
  useEffect(() => {
    if (toast && toast.visible) {
      const timer = setTimeout(() => {
        setToast(prev => prev ? { ...prev, visible: false } : null);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [toast?.visible]);

  useEffect(() => {
    loadListings();
  }, [page, filterStatus, debouncedSearchTerm]);

  async function loadListings() {
    setLoading(true);
    const requestId = ++requestCountRef.current;
    const result = await adminApi.getListings({
      page,
      status: filterStatus || undefined,
      search: debouncedSearchTerm || undefined,
    });

    if (requestId === requestCountRef.current) {
      if (result.success && result.data) {
        setListings(result.data.listings);
        setTotal(result.data.total);
      }
      setLoading(false);
    }
  }

  const triggerDeleteConfirm = (id: string, shortId?: string) => {
    setConfirmModal({
      isOpen: true,
      type: 'delete',
      targetId: id,
      message: `Are you sure you want to permanently delete the property ${shortId || id}? This will completely remove it from the website and database, and cannot be undone.`,
    });
  };

  const handleDeleteListing = async (id: string) => {
    setActionLoading(id);
    try {
      const result = await adminApi.deleteListing(id);
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
    }
    setActionLoading(null);
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    setActionLoading(id);
    const result = await adminApi.updateListingStatus(id, status);
    if (result.success) {
      setListings(prev => prev.map(l => l.id === id ? { ...l, status } : l));
    }
    setActionLoading(null);
  };

  const handleToggleAI = async (id: string, currentStatus: boolean) => {
    setActionLoading(id);
    const newStatus = !currentStatus;
    try {
      const result = await adminApi.toggleListingAI(id, newStatus);
      if (result.success) {
        setListings(prev => prev.map(l => l.id === id ? { ...l, aiQualificationActive: newStatus } : l));

        const listing = listings.find(l => l.id === id);
        const codeStr = listing?.shortId ? `Property ${listing.shortId}` : 'Property';

        setToast({
          message: newStatus
            ? `${codeStr}: AI lead qualification gatekeeper is now ACTIVE.`
            : `${codeStr}: AI lead qualification is now DISABLED (Contact details are visible to everyone).`,
          type: 'success',
          visible: true
        });
      } else {
        setToast({ message: 'Failed to update AI qualification setting.', type: 'info', visible: true });
      }
    } catch (err) {
      console.error(err);
      setToast({ message: 'Failed to update AI qualification setting.', type: 'info', visible: true });
    }
    setActionLoading(null);
  };

  const executeFeatureToggle = async (id: string, isCurrentlyFeatured: boolean) => {
    setActionLoading(id);
    let result;
    if (isCurrentlyFeatured) {
      result = await adminApi.unfeatureListing(id);
    } else {
      result = await adminApi.featureListing(id, 7); // Feature for 7 days
    }

    if (result.success) {
      setListings(prev => prev.map(l => l.id === id ? { ...l, isFeatured: !isCurrentlyFeatured } : l));
      setToast({
        message: isCurrentlyFeatured
          ? 'Property has been successfully removed from Featured!'
          : 'Property has been successfully promoted to Featured!',
        type: 'success',
        visible: true,
      });
      // Re-load to get updated sorting if needed, or just let the local update happen
      if (!isCurrentlyFeatured) loadListings();
    } else {
      setToast({
        message: 'Failed to update featuring status.',
        type: 'info',
        visible: true,
      });
    }
    setActionLoading(null);
  };

  const handleFeature = (id: string, isCurrentlyFeatured: boolean, titleEn?: string) => {
    const listingName = titleEn ? `"${titleEn}"` : 'this property';
    setConfirmModal({
      isOpen: true,
      type: isCurrentlyFeatured ? 'unfeature' : 'feature',
      targetId: id,
      isCurrentlyFeatured,
      message: isCurrentlyFeatured
        ? `Are you sure you want to remove ${listingName} from the Featured section?`
        : `Are you sure you want to promote ${listingName} to Featured? This will highlight it at the top of the listings list.`,
    });
  };

  // ── Inventory Control Handlers ──
  const handleManageInventory = async (listing: AdminListing) => {
    setSelectedListing(listing);
    setInventoryDrawerOpen(true);
    setLoadingProjects(true);
    setLoadingUnits(true);
    setIsCreatingNewProject(false);
    setNewProjectData({ nameEn: '', nameAr: '', city: listing.city, district: '', mapEmbedUrl: '' });

    // Fetch projects
    try {
      const res = await adminApi.getProjects();
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
      const res = await adminApi.getListingUnits(listingId);
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
      const res = await adminApi.request<{ success: boolean; data: any }>(`/listings/${selectedListing.id}`, {
        method: 'PUT',
        body: JSON.stringify({ projectId: selectedProjectId }),
      });
      if (res.success) {
        // Update local listings state to avoid stale UI
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

  const handleCreateAndLinkProject = async () => {
    if (!selectedListing) return;
    if (!newProjectData.nameEn || !newProjectData.nameAr || !newProjectData.city) {
      setToast({ message: 'Project Name (EN/AR) and City are required.', type: 'info', visible: true });
      return;
    }
    setLoadingProjects(true);
    try {
      const res = await adminApi.createProject(newProjectData);
      if (res.success && res.data) {
        const newProj = res.data;
        setProjectsList(prev => [newProj, ...prev]);

        const linkRes = await adminApi.request<{ success: boolean; data: any }>(`/listings/${selectedListing.id}`, {
          method: 'PUT',
          body: JSON.stringify({ projectId: newProj.id }),
        });
        if (linkRes.success) {
          setListings(prev => prev.map(l => l.id === selectedListing.id ? { ...l, projectId: newProj.id } : l));
          setSelectedListing(prev => prev ? { ...prev, projectId: newProj.id } : null);
          setSelectedProjectId(newProj.id);
          setIsCreatingNewProject(false);
          setNewProjectData({ nameEn: '', nameAr: '', city: selectedListing.city, district: '', mapEmbedUrl: '' });
          setToast({ message: 'New project created and property linked successfully!', type: 'success', visible: true });
          await loadUnits(selectedListing.id);
        }
      }
    } catch (e) {
      console.error(e);
      setToast({ message: 'Failed to create and link project.', type: 'info', visible: true });
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleUnlinkProject = async () => {
    if (!selectedListing) return;
    setActionLoading(selectedListing.id);
    try {
      const res = await adminApi.request<{ success: boolean; data: any }>(`/listings/${selectedListing.id}`, {
        method: 'PUT',
        body: JSON.stringify({ projectId: null }),
      });
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
      const res = await adminApi.addListingUnits(selectedListing.id, unitsToAdd);
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
      const res = await adminApi.updateListingUnit(selectedListing.id, unitId, { status: newStatus });
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
      const res = await adminApi.deleteListingUnit(selectedListing.id, unitId);
      if (res.success) {
        setUnitsList(prev => prev.filter(u => u.id !== unitId));
        setToast({ message: 'Unit removed from inventory.', type: 'success', visible: true });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredListings = listings;

  return (
    <div className="flex flex-col h-full">
      <AdminTopBar title="Property Inventory Control" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Header Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="flex items-center gap-3 bg-white px-3.5 py-2 rounded-xl border border-surface-200 shadow-sm w-full md:w-96">
              <Search className="w-4 h-4 text-surface-400" />
              <input
                type="text"
                placeholder="Search by title, ID or city..."
                className="bg-transparent border-none focus:ring-0 outline-none text-sm w-full text-surface-900"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <a
              href={`${WEB_URL}/en/post-property?from=admin${token ? `&token=${token}` : ''}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Post New Property</span>
            </a>
          </div>

          <div className="flex items-center gap-3">
            <select
              className="admin-input py-2 w-auto min-w-[140px]"
              value={filterStatus}
              onChange={(e) => {
                const val = e.target.value;
                setFilterStatus(val);
                const newParams = new URLSearchParams(window.location.search);
                if (val) {
                  newParams.set('status', val);
                } else {
                  newParams.delete('status');
                }
                const query = newParams.toString() ? `?${newParams.toString()}` : '';
                router.replace(`/listings${query}`);
              }}
            >
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="DRAFT">Draft</option>
              <option value="FLAGGED">Awaiting Approval</option>
              <option value="SOLD">Sold</option>
              <option value="RENTED">Rented</option>
            </select>
          </div>
        </div>

        {/* Listings Table */}
        <div className="admin-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Listing / ID</th>
                  <th>Location & Type</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto" />
                      <p className="text-xs text-surface-500 mt-2">Loading inventory...</p>
                    </td>
                  </tr>
                ) : filteredListings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <div className="w-12 h-12 bg-surface-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Building2 className="w-6 h-6 text-surface-300" />
                      </div>
                      <p className="text-sm font-medium text-surface-600">No properties found</p>
                    </td>
                  </tr>
                ) : (
                  filteredListings.map((listing) => (
                    <tr key={listing.id} className="group">
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-10 rounded-lg bg-surface-100 flex items-center justify-center relative overflow-hidden">
                            <Building2 className="w-5 h-5 text-surface-400" />
                            {listing.isFeatured && (
                              <div className="absolute top-0 right-0 w-3 h-3 bg-amber-400 rounded-bl-lg flex items-center justify-center">
                                <Star className="w-2 h-2 text-white fill-white" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 max-w-[240px]">
                            <div className="text-sm font-bold text-surface-900 truncate">
                              {listing.enTitle || listing.arTitle}
                            </div>
                            <div className="text-[10px] text-surface-400 font-mono mt-0.5">
                              ID: {listing.shortId || listing.id.slice(0, 8)}
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
                          <div className="text-[10px] font-semibold text-primary-600 uppercase tracking-wider">
                            {listing.type} • {listing.purpose}
                          </div>
                        </div>
                      </td>
                      <td>
                        {listing.owner ? (
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-surface-700 truncate">{listing.owner.name || 'Anonymous'}</div>
                            <div className="text-[10px] text-surface-400 truncate">{listing.owner.email}</div>
                          </div>
                        ) : (
                          <span className="text-xs text-surface-300">No Owner Data</span>
                        )}
                      </td>
                      <td>
                        <div className={clsx(
                          "badge",
                          listing.status === 'ACTIVE' ? "badge-green" :
                            listing.status === 'FLAGGED' ? "badge-yellow" :
                              "badge-gray"
                        )}>
                          {listing.status === 'FLAGGED' ? 'AWAITING APPROVAL' : listing.status}
                        </div>
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleFeature(listing.id, listing.isFeatured, listing.enTitle || undefined)}
                            disabled={!!actionLoading}
                            className={clsx(
                              "btn-ghost transition-colors",
                              listing.isFeatured ? "text-amber-600 bg-amber-50" : "text-surface-400 hover:text-amber-600 hover:bg-amber-50"
                            )}
                            title={listing.isFeatured ? "Remove from Featured" : "Feature Listing"}
                          >
                            <Star className={clsx("w-4 h-4", listing.isFeatured && "fill-amber-600")} />
                          </button>

                          {/* AI Qualification Gatekeeper Toggle */}
                          <button
                            onClick={() => handleToggleAI(listing.id, listing.aiQualificationActive ?? true)}
                            disabled={!!actionLoading}
                            className={clsx(
                              "btn-ghost transition-all duration-200 relative group/ai",
                              (listing.aiQualificationActive ?? true)
                                ? "text-purple-600 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/20"
                                : "text-surface-400 hover:text-purple-600 hover:bg-purple-50"
                            )}
                            title={(listing.aiQualificationActive ?? true)
                              ? "AI Qualification Active (Require qualification to see contact). Click to bypass."
                              : "AI Qualification Bypassed (Auto-reveal contact for everyone). Click to activate."}
                          >
                            <Bot className="w-4 h-4" />
                            {/* Premium indicator dot */}
                            <span className={clsx(
                              "absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full transition-all duration-200",
                              (listing.aiQualificationActive ?? true) ? "bg-purple-500 animate-pulse" : "bg-surface-300"
                            )} />
                          </button>

                          {/* Manage Inventory button */}
                          <button
                            onClick={() => handleManageInventory(listing)}
                            className="btn-ghost text-surface-400 hover:text-primary-600 hover:bg-surface-50"
                            title="Manage Unit Inventory"
                          >
                            <Building2 className="w-4 h-4" />
                          </button>

                          {/* Hide / Unhide Action */}
                          {listing.status === 'ACTIVE' ? (
                            <button
                              onClick={() => handleUpdateStatus(listing.id, 'DRAFT')}
                              disabled={!!actionLoading}
                              className="btn-ghost text-surface-400 hover:text-primary-600 hover:bg-surface-50"
                              title="Hide Listing (Draft)"
                            >
                              <EyeOff className="w-4 h-4" />
                            </button>
                          ) : (
                            listing.status === 'DRAFT' && (
                              <button
                                onClick={() => handleUpdateStatus(listing.id, 'ACTIVE')}
                                disabled={!!actionLoading}
                                className="btn-ghost text-emerald-600 hover:bg-emerald-50"
                                title="Unhide / Activate Listing"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            )
                          )}

                          {listing.status !== 'FLAGGED' && (
                            <button
                              onClick={() => handleUpdateStatus(listing.id, 'FLAGGED')}
                              disabled={!!actionLoading}
                              className="btn-ghost text-red-600 hover:bg-red-50"
                              title="Flag as Suspicious"
                            >
                              <ShieldAlert className="w-4 h-4" />
                            </button>
                          )}
                          {listing.status === 'FLAGGED' && (
                            <button
                              onClick={() => handleUpdateStatus(listing.id, 'ACTIVE')}
                              disabled={!!actionLoading}
                              className="btn-ghost text-emerald-600 hover:bg-emerald-50"
                              title="Approve Listing"
                            >
                              <ShieldCheck className="w-4 h-4" />
                            </button>
                          )}
                          <a
                            href={`${WEB_URL}/en/listings/${listing.id}${token ? `?token=${token}` : ''}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-ghost text-surface-400 hover:text-primary-600"
                            title="View Public Page"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </a>
                          <a
                            href={`${WEB_URL}/en/edit-property/${listing.id}?from=admin${token ? `&token=${token}` : ''}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-ghost text-surface-400 hover:text-primary-600"
                            title="Edit Listing"
                          >
                            <Pencil className="w-4 h-4" />
                          </a>

                          {/* Delete Property Action */}
                          <button
                            onClick={() => triggerDeleteConfirm(listing.id, listing.shortId || undefined)}
                            disabled={!!actionLoading}
                            className="btn-ghost text-surface-400 hover:text-red-600 hover:bg-red-50"
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
          <div className="p-4 bg-surface-50 border-t border-surface-200 flex items-center justify-between">
            <div className="text-xs text-surface-500">
              Showing <b>{((page - 1) * 20) + 1}–{Math.min(page * 20, total)}</b> of <b>{total}</b> properties
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
            {confirmModal.type === 'delete' ? (
              <div className="flex items-center gap-4 text-red-600 bg-red-50 p-4 rounded-2xl">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <div>
                  <h4 className="text-sm font-black uppercase tracking-wider text-red-800">Critical Action</h4>
                  <p className="text-xs font-semibold text-red-800/80">This action is permanent and cannot be undone.</p>
                </div>
              </div>
            ) : confirmModal.type === 'feature' ? (
              <div className="flex items-center gap-4 text-amber-600 bg-amber-50 p-4 rounded-2xl">
                <Star className="w-6 h-6 shrink-0 fill-amber-600" />
                <div>
                  <h4 className="text-sm font-black uppercase tracking-wider text-amber-800">Promote Listing</h4>
                  <p className="text-xs font-semibold text-amber-800/80">This highlights the property across the platform.</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 text-slate-600 bg-slate-50 p-4 rounded-2xl">
                <StarOff className="w-6 h-6 shrink-0" />
                <div>
                  <h4 className="text-sm font-black uppercase tracking-wider text-slate-800">Remove Promotion</h4>
                  <p className="text-xs font-semibold text-slate-800/80">This removes the listing from featured positions.</p>
                </div>
              </div>
            )}

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
                  const { type, targetId, isCurrentlyFeatured } = confirmModal;
                  setConfirmModal(null);
                  if (type === 'delete') {
                    handleDeleteListing(targetId);
                  } else if (type === 'feature' || type === 'unfeature') {
                    executeFeatureToggle(targetId, !!isCurrentlyFeatured);
                  }
                }}
                className={clsx(
                  "text-white px-4 py-2 text-xs font-bold rounded-xl shadow-md transition-all",
                  confirmModal.type === 'delete' ? "bg-red-600 hover:bg-red-700" :
                    confirmModal.type === 'feature' ? "bg-amber-500 hover:bg-amber-600" :
                      "bg-slate-600 hover:bg-slate-700"
                )}
              >
                {confirmModal.type === 'delete' ? 'Confirm Delete' :
                  confirmModal.type === 'feature' ? 'Confirm Promotion' :
                    'Remove Promotion'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Inventory Side Drawer ── */}
      {inventoryDrawerOpen && selectedListing && (
        <div className="fixed inset-0 z-40 overflow-hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setInventoryDrawerOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 max-w-xl w-full bg-white shadow-2xl flex flex-col z-50 transform transition-transform duration-300 animate-in slide-in-from-right">
            {/* Drawer Header */}
            <div className="px-6 py-5 border-b border-surface-200 flex items-center justify-between bg-surface-50">
              <div>
                <h3 className="text-base font-bold text-surface-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary-600" />
                  <span>Inventory Controller</span>
                </h3>
                <p className="text-xs text-surface-500 mt-1 font-medium truncate max-w-[400px]">
                  {selectedListing.enTitle || selectedListing.arTitle}
                </p>
              </div>
              <button
                onClick={() => setInventoryDrawerOpen(false)}
                className="p-1.5 hover:bg-surface-200 rounded-lg text-surface-400 hover:text-surface-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Section 1: Project Association */}
              <div className="bg-surface-50 border border-surface-200 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-surface-700 flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-primary-600" />
                    Parent Project Association
                  </h4>
                  {selectedListing.projectId && (
                    <button
                      onClick={handleUnlinkProject}
                      className="text-[10px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1 transition-colors"
                    >
                      <UnlinkIcon className="w-3 h-3" />
                      Unlink Project
                    </button>
                  )}
                </div>

                {loadingProjects ? (
                  <div className="flex items-center gap-2 py-2 text-xs text-surface-500">
                    <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                    <span>Loading projects...</span>
                  </div>
                ) : selectedListing.projectId ? (
                  // Linked project display
                  <div className="bg-white border border-surface-200 rounded-xl p-3 flex items-start justify-between">
                    <div>
                      <div className="text-sm font-bold text-surface-800">
                        {projectsList.find(p => p.id === selectedListing.projectId)?.nameEn || 'Linked Project'}
                      </div>
                      <div className="text-xs text-surface-400 font-mono mt-0.5" dir="rtl">
                        {projectsList.find(p => p.id === selectedListing.projectId)?.nameAr}
                      </div>
                      <div className="text-[10px] text-surface-500 flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        {projectsList.find(p => p.id === selectedListing.projectId)?.city}
                        {projectsList.find(p => p.id === selectedListing.projectId)?.district ? ` • ${projectsList.find(p => p.id === selectedListing.projectId)?.district}` : ''}
                      </div>
                    </div>
                    <span className="badge badge-green">Linked</span>
                  </div>
                ) : (
                  // Link Project Selector
                  <div className="space-y-3">
                    {!isCreatingNewProject ? (
                      <div className="space-y-3">
                        <div>
                          <label className="admin-label">Select Compound/Tower Project</label>
                          <select
                            value={selectedProjectId}
                            onChange={(e) => setSelectedProjectId(e.target.value)}
                            className="admin-input"
                          >
                            <option value="">-- Choose existing project --</option>
                            {projectsList.map(proj => (
                              <option key={proj.id} value={proj.id}>
                                {proj.nameEn} ({proj.city})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={handleLinkProject}
                            disabled={!selectedProjectId}
                            className="btn-primary py-2 text-xs font-bold disabled:opacity-50"
                          >
                            Link to Selected Project
                          </button>
                          <button
                            onClick={() => setIsCreatingNewProject(true)}
                            className="text-xs font-bold text-primary-600 hover:underline"
                          >
                            + Create New Project
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Create Project form
                      <div className="space-y-3 pt-2">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="admin-label">Name (English)</label>
                            <input
                              type="text"
                              className="admin-input py-2 text-xs"
                              placeholder="e.g. Suhail Compound"
                              value={newProjectData.nameEn}
                              onChange={(e) => setNewProjectData(prev => ({ ...prev, nameEn: e.target.value }))}
                            />
                          </div>
                          <div>
                            <label className="admin-label">Name (Arabic)</label>
                            <input
                              type="text"
                              className="admin-input py-2 text-xs"
                              placeholder="e.g. مجمع سهيل"
                              value={newProjectData.nameAr}
                              onChange={(e) => setNewProjectData(prev => ({ ...prev, nameAr: e.target.value }))}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="admin-label">City</label>
                            <input
                              type="text"
                              className="admin-input py-2 text-xs"
                              value={newProjectData.city}
                              onChange={(e) => setNewProjectData(prev => ({ ...prev, city: e.target.value }))}
                            />
                          </div>
                          <div>
                            <label className="admin-label">District (Optional)</label>
                            <input
                              type="text"
                              className="admin-input py-2 text-xs"
                              placeholder="e.g. Al Malqa"
                              value={newProjectData.district}
                              onChange={(e) => setNewProjectData(prev => ({ ...prev, district: e.target.value }))}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="admin-label">Google Maps Embed URL</label>
                          <input
                            type="text"
                            className="admin-input py-2 text-xs"
                            placeholder="https://www.google.com/maps/embed?pb=..."
                            value={newProjectData.mapEmbedUrl}
                            onChange={(e) => setNewProjectData(prev => ({ ...prev, mapEmbedUrl: e.target.value }))}
                          />
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                          <button
                            onClick={handleCreateAndLinkProject}
                            className="btn-primary py-2 text-xs font-bold"
                          >
                            Save & Link Project
                          </button>
                          <button
                            onClick={() => setIsCreatingNewProject(false)}
                            className="btn-secondary py-2 text-xs font-bold"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Section 2: Units Inventory */}
              {selectedListing.projectId ? (
                <div className="space-y-6">
                  {/* Add Units form card */}
                  <div className="bg-white border border-surface-200 rounded-2xl p-4 space-y-4 shadow-sm">
                    <h4 className="text-xs font-black uppercase tracking-wider text-surface-700">
                      Add Units to Inventory
                    </h4>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="admin-label">Unit Number(s)</label>
                        <input
                          type="text"
                          className="admin-input py-2 text-xs"
                          placeholder="e.g. 201 OR 201-205 OR 201, 202"
                          value={unitForm.unitNumbers}
                          onChange={(e) => setUnitForm(prev => ({ ...prev, unitNumbers: e.target.value }))}
                        />
                        <span className="text-[10px] text-surface-400 mt-1 block leading-normal">
                          Use dashes for range, commas for list.
                        </span>
                      </div>
                      <div>
                        <label className="admin-label">Floor Number (Optional)</label>
                        <input
                          type="text"
                          className="admin-input py-2 text-xs"
                          placeholder="Auto-detect or e.g. 2"
                          value={unitForm.floor}
                          onChange={(e) => setUnitForm(prev => ({ ...prev, floor: e.target.value }))}
                        />
                        <span className="text-[10px] text-surface-400 mt-1 block leading-normal">
                          Leave blank to auto-detect floor from unit numbers (e.g. 201 → Floor 2).
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="admin-label">BHK Type</label>
                        <input
                          type="text"
                          className="admin-input py-2 text-xs"
                          placeholder="e.g. 2BHK"
                          value={unitForm.type}
                          onChange={(e) => setUnitForm(prev => ({ ...prev, type: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="admin-label">Initial Status</label>
                        <select
                          className="admin-input py-2 text-xs"
                          value={unitForm.status}
                          onChange={(e) => setUnitForm(prev => ({ ...prev, status: e.target.value }))}
                        >
                          <option value="AVAILABLE">Available</option>
                          <option value="RESERVED">Reserved</option>
                          <option value="SOLD">Sold</option>
                        </select>
                      </div>
                      <div>
                        <label className="admin-label">Price Override (SAR)</label>
                        <input
                          type="number"
                          className="admin-input py-2 text-xs"
                          placeholder="Default Listing Price"
                          value={unitForm.price}
                          onChange={(e) => setUnitForm(prev => ({ ...prev, price: e.target.value }))}
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleAddUnits}
                      disabled={loadingUnits}
                      className="btn-primary py-2 text-xs font-bold w-full justify-center"
                    >
                      {loadingUnits ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Adding units...
                        </>
                      ) : 'Add Unit(s) to Inventory'}
                    </button>
                  </div>

                  {/* Units list grouped by floor */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-surface-700">
                      Physical Unit Matrix
                    </h4>

                    {loadingUnits ? (
                      <div className="flex items-center gap-2 py-4 text-xs text-surface-500">
                        <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                        <span>Loading unit list...</span>
                      </div>
                    ) : unitsList.length === 0 ? (
                      <div className="text-center py-8 bg-surface-50 border border-dashed border-surface-200 rounded-2xl">
                        <p className="text-xs text-surface-400 font-medium">No units found. Add units above to track inventory availability.</p>
                      </div>
                    ) : (
                      <div className="bg-white border border-surface-200 rounded-2xl p-4 divide-y divide-surface-150">
                        {(() => {
                          const unitsByFloor = unitsList.reduce((acc: Record<number, any[]>, unit) => {
                            if (!acc[unit.floor]) acc[unit.floor] = [];
                            acc[unit.floor].push(unit);
                            return acc;
                          }, {});
                          const sortedFloors = Object.keys(unitsByFloor).map(Number).sort((a, b) => b - a);

                          return sortedFloors.map(floor => (
                            <div key={floor} className="py-3 first:pt-0 last:pb-0">
                              <div className="text-xs font-black text-surface-400 uppercase tracking-wider mb-2">
                                Floor {floor}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {unitsByFloor[floor].map(unit => (
                                  <div key={unit.id} className={clsx(
                                    "pl-3 pr-2 py-1.5 rounded-xl border flex items-center gap-2 text-[11px] font-bold group/unit transition-all",
                                    unit.status === 'AVAILABLE' ? "bg-emerald-50/70 border-emerald-200 text-emerald-800" :
                                      unit.status === 'RESERVED' ? "bg-amber-50/70 border-amber-200 text-amber-800" :
                                        "bg-red-50/70 border-red-200 text-red-800"
                                  )}>
                                    <span>Unit {unit.unitNumber} ({unit.type})</span>
                                    {unit.price && (
                                      <span className="opacity-75 font-medium">SAR {unit.price.toLocaleString()}</span>
                                    )}

                                    <div className="flex items-center gap-1 border-l border-current/25 pl-1.5 ml-1 select-none">
                                      <select
                                        value={unit.status}
                                        onChange={(e) => handleUpdateUnitStatus(unit.id, e.target.value)}
                                        className="bg-transparent border-none p-0 text-[10px] font-black focus:ring-0 cursor-pointer outline-none w-18 text-current"
                                      >
                                        <option value="AVAILABLE">Available</option>
                                        <option value="RESERVED">Reserved</option>
                                        <option value="SOLD">Sold</option>
                                      </select>
                                      <button
                                        onClick={() => handleDeleteUnit(unit.id)}
                                        className="text-current/60 hover:text-red-700 transition-colors pl-0.5"
                                        title="Delete Unit"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-surface-50 border border-dashed border-surface-200 rounded-2xl p-6 space-y-3">
                  <Building2 className="w-10 h-10 text-surface-300 mx-auto" />
                  <p className="text-xs text-surface-500 font-semibold leading-relaxed">
                    Please link this property layout to a parent compound project first. Once linked, you can define individual apartment numbers, floors, and track real-time sold/reserved status.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
}
