'use client';

import { useState, useEffect } from 'react';
import { AdminTopBar } from '@/components/AdminSidebar';
import { adminApi, AdminReportedProperty, AdminPropertyReport } from '@/lib/api';
import {
  Flag, Search, AlertCircle, CheckCircle2,
  Clock, X, Loader2, Building2, ArrowUpRight,
  Check, Trash2, EyeOff
} from 'lucide-react';
import clsx from 'clsx';

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000';

const REASON_LABELS: Record<string, string> = {
  INCORRECT_LOCATION: 'Incorrect location details',
  MISLEADING_PHOTOS: 'Misleading or outdated photos',
  COPYRIGHT_VIOLATION: 'Copyright violation / Copied media',
  UNAVAILABLE_SOLD: 'Listing already sold or rented',
  OTHER: 'Other issues',
};

export default function ReportedPropertiesPage() {
  const [properties, setProperties] = useState<AdminReportedProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'RESOLVED_DISMISSED'>('PENDING');

  // Drawer state
  const [selectedProperty, setSelectedProperty] = useState<AdminReportedProperty | null>(null);
  const [reports, setReports] = useState<AdminPropertyReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadReportedProperties();
  }, []);

  async function loadReportedProperties() {
    setLoading(true);
    try {
      const result = await adminApi.getReportedProperties();
      if (result.success && result.data) {
        setProperties(result.data);
      }
    } catch (err) {
      console.error('Failed to load reported properties:', err);
    } finally {
      setLoading(false);
    }
  }

  // Load individual reports when selected property changes
  useEffect(() => {
    if (selectedProperty) {
      loadListingReports(selectedProperty.listingId);
    } else {
      setReports([]);
    }
  }, [selectedProperty]);

  async function loadListingReports(listingId: string) {
    setLoadingReports(true);
    try {
      const result = await adminApi.getListingReports(listingId);
      if (result.success && result.data) {
        setReports(result.data);
      }
    } catch (err) {
      console.error('Failed to load listing reports:', err);
    } finally {
      setLoadingReports(false);
    }
  }

  const handleUpdateStatus = async (status: 'RESOLVED' | 'DISMISSED') => {
    if (!selectedProperty) return;
    setActionLoading(true);
    try {
      const result = await adminApi.updateReportsStatus(selectedProperty.listingId, status);
      if (result.success) {
        // Reload list and close drawer
        await loadReportedProperties();
        setSelectedProperty(null);
      }
    } catch (err) {
      console.error(`Failed to mark reports as ${status}:`, err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteListing = async () => {
    if (!selectedProperty) return;
    if (!confirm('Are you sure you want to permanently delete this listing? All corresponding reports will also be cleaned up.')) {
      return;
    }
    setActionLoading(true);
    try {
      const result = await adminApi.deleteListing(selectedProperty.listingId);
      if (result.success) {
        // Reload list and close drawer
        await loadReportedProperties();
        setSelectedProperty(null);
      }
    } catch (err) {
      console.error('Failed to delete listing:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const getListingStatusLabel = (prop: AdminReportedProperty) => {
    if (prop.pendingCount > 0) return 'Pending Review';
    if (prop.resolvedCount > 0 && prop.pendingCount === 0) return 'Resolved';
    if (prop.dismissedCount > 0 && prop.pendingCount === 0) return 'Dismissed';
    return 'Resolved';
  };

  // Client side filtering
  const filteredProperties = properties.filter((prop) => {
    const matchesSearch =
      prop.enTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prop.arTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prop.shortId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prop.city.toLowerCase().includes(searchTerm.toLowerCase());

    const isPending = prop.pendingCount > 0;

    if (filterStatus === 'PENDING') {
      return matchesSearch && isPending;
    } else if (filterStatus === 'RESOLVED_DISMISSED') {
      return matchesSearch && !isPending;
    }
    return matchesSearch;
  });

  const totalPendingReportsCount = properties.reduce((acc, curr) => acc + curr.pendingCount, 0);

  return (
    <div className="flex flex-col h-full bg-canvas/30">
      <AdminTopBar title="Reported Properties Registry" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Header section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Flag className="w-6 h-6 text-red-500 animate-pulse" />
              Reported Inventory
            </h1>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              Review and act on property listings reported by site visitors for inaccuracies or copyright issues
            </p>
          </div>
        </div>

        {/* Stats summary row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="stat-card">
            <div className="stat-icon bg-red-50 text-red-600 border border-red-100">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Unresolved Issues</div>
              <div className="text-xl font-black text-slate-800 mt-1">
                {properties.filter(p => p.pendingCount > 0).length} Listings
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">{totalPendingReportsCount} pending user complaints</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon bg-emerald-50 text-emerald-600 border border-emerald-100">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Handled</div>
              <div className="text-xl font-black text-slate-800 mt-1">
                {properties.filter(p => p.pendingCount === 0 && (p.resolvedCount > 0 || p.dismissedCount > 0)).length} Listings
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Resolved or dismissed reports</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon bg-slate-50 text-slate-600 border border-slate-200">
              <Flag className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Reports Registered</div>
              <div className="text-xl font-black text-slate-800 mt-1">
                {properties.reduce((sum, p) => sum + p.reportCount, 0)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Aggregate complaints database size</div>
            </div>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            {/* Search Input */}
            <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 shadow-inner transition-all focus-within:border-primary-400 focus-within:ring-1 focus-within:ring-primary-400 w-full sm:max-w-xs">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search listing, short ID, city..."
                className="bg-transparent border-none focus:ring-0 outline-none text-xs w-full text-slate-700 placeholder-slate-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Status tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setFilterStatus('PENDING')}
                className={clsx(
                  'px-4 py-1.5 rounded-lg text-xs font-bold transition-all',
                  filterStatus === 'PENDING'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                Pending Review
              </button>
              <button
                onClick={() => setFilterStatus('RESOLVED_DISMISSED')}
                className={clsx(
                  'px-4 py-1.5 rounded-lg text-xs font-bold transition-all',
                  filterStatus === 'RESOLVED_DISMISSED'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                Resolved / Dismissed
              </button>
              <button
                onClick={() => setFilterStatus('ALL')}
                className={clsx(
                  'px-4 py-1.5 rounded-lg text-xs font-bold transition-all',
                  filterStatus === 'ALL'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                All Reports
              </button>
            </div>
          </div>
        </div>

        {/* Listings Table */}
        <div className="admin-card overflow-hidden border border-slate-100 shadow-sm rounded-2xl">
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="font-black uppercase tracking-wider text-[10px] text-slate-400 bg-slate-50/50 py-3.5">Property Listing</th>
                  <th className="font-black uppercase tracking-wider text-[10px] text-slate-400 bg-slate-50/50 py-3.5">Short ID</th>
                  <th className="font-black uppercase tracking-wider text-[10px] text-slate-400 bg-slate-50/50 py-3.5">Location</th>
                  <th className="font-black uppercase tracking-wider text-[10px] text-slate-400 bg-slate-50/50 py-3.5">Price</th>
                  <th className="font-black uppercase tracking-wider text-[10px] text-slate-400 bg-slate-50/50 py-3.5">Complaints</th>
                  <th className="font-black uppercase tracking-wider text-[10px] text-slate-400 bg-slate-50/50 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto" />
                      <p className="text-xs text-slate-500 mt-2 font-medium">Retrieving reported catalog...</p>
                    </td>
                  </tr>
                ) : filteredProperties.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-slate-100">
                        <Flag className="w-6 h-6 text-slate-300" />
                      </div>
                      <p className="text-sm font-bold text-slate-700">No reported properties found</p>
                      <p className="text-xs text-slate-400 mt-1">Properties flagged by users will list here</p>
                    </td>
                  </tr>
                ) : (
                  filteredProperties.map((prop) => (
                    <tr
                      key={prop.listingId}
                      onClick={() => setSelectedProperty(prop)}
                      className="group cursor-pointer hover:bg-slate-50/40 transition-colors"
                    >
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/10 to-pink-500/10 text-red-600 flex items-center justify-center font-bold text-sm border border-red-500/5 shadow-sm">
                            <Building2 className="w-5 h-5 text-red-500" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-slate-800 truncate max-w-[280px]">
                              {prop.enTitle || 'Untitled Listing'}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium">
                              {prop.arTitle}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 py-0.5 px-1.5 rounded">
                          {prop.shortId}
                        </span>
                      </td>
                      <td>
                        <span className="text-xs font-semibold text-slate-500">
                          {prop.city || 'N/A'}
                        </span>
                      </td>
                      <td>
                        <span className="text-xs font-black text-slate-700">
                          {prop.price ? `${prop.price.toLocaleString()} SAR` : 'N/A'}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <span className={clsx(
                            'badge font-black text-[10px] px-2 py-0.5 rounded-full',
                            prop.pendingCount > 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                          )}>
                            {prop.reportCount} {prop.reportCount === 1 ? 'report' : 'reports'}
                          </span>
                          {prop.pendingCount > 0 && (
                            <span className="text-[10px] font-semibold text-red-500">
                              ({prop.pendingCount} pending)
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={clsx(
                          'badge font-black uppercase tracking-wider text-[9px] py-1 px-2.5 border',
                          prop.pendingCount > 0 && 'badge-red bg-red-50 text-red-700 border-red-100',
                          prop.pendingCount === 0 && prop.resolvedCount > 0 && 'badge-green bg-emerald-50 text-emerald-700 border-emerald-100',
                          prop.pendingCount === 0 && prop.dismissedCount > 0 && 'badge-gray bg-slate-100 text-slate-600 border-slate-200'
                        )}>
                          {getListingStatusLabel(prop)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Slide-Over Drawer for Reported Property Details */}
      {selectedProperty && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-in fade-in"
            onClick={() => setSelectedProperty(null)}
          />

          <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col z-10 animate-slide-in-right">
            {/* Drawer Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-pink-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-red-100">
                  <Flag className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-800 truncate max-w-[400px]" title={selectedProperty.enTitle}>
                    {selectedProperty.enTitle}
                  </h2>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    Short ID: {selectedProperty.shortId} | Database ID: {selectedProperty.listingId}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedProperty(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Actions Panel */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <a
                  href={`${WEB_URL}/en/listings/${selectedProperty.shortId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary py-2 px-3 text-xs"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  View Public Page
                </a>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleUpdateStatus('DISMISSED')}
                  disabled={actionLoading}
                  className="btn-secondary text-xs text-slate-600 py-2 px-3 hover:bg-slate-100"
                >
                  <EyeOff className="w-4 h-4" />
                  Dismiss Reports
                </button>
                <button
                  onClick={() => handleUpdateStatus('RESOLVED')}
                  disabled={actionLoading}
                  className="btn-primary bg-emerald-600 hover:bg-emerald-700 text-xs py-2 px-3"
                >
                  <Check className="w-4 h-4" />
                  Mark Resolved
                </button>
                <button
                  onClick={handleDeleteListing}
                  disabled={actionLoading}
                  className="btn-danger bg-red-600 hover:bg-red-700 text-xs py-2 px-3"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Property
                </button>
              </div>
            </div>

            {/* Drawer Body - Reports List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                User Reports ({reports.length})
              </h3>

              {loadingReports ? (
                <div className="py-20 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto" />
                  <p className="text-xs text-slate-500 mt-2">Loading customer report filings...</p>
                </div>
              ) : reports.length === 0 ? (
                <div className="py-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-sm font-bold text-slate-600">No reports retrieved</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reports.map((report) => (
                    <div
                      key={report.id}
                      className={clsx(
                        'border rounded-2xl p-5 bg-white shadow-sm space-y-3.5 transition-all',
                        report.status === 'PENDING' ? 'border-red-100 bg-red-50/10' : 'border-slate-200'
                      )}
                    >
                      {/* Submitter info & status badge */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-xs font-black text-slate-800">
                            {report.reporterName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {report.reporterEmail}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={clsx(
                            'badge font-black uppercase tracking-wider text-[9px] py-0.5 px-2 border',
                            report.status === 'PENDING' && 'badge-red bg-red-50 text-red-700 border-red-100',
                            report.status === 'RESOLVED' && 'badge-green bg-emerald-50 text-emerald-700 border-emerald-100',
                            report.status === 'DISMISSED' && 'badge-gray bg-slate-100 text-slate-600 border-slate-200'
                          )}>
                            {report.status}
                          </span>
                          <div className="text-[9px] text-slate-400 mt-1 font-semibold">
                            {new Date(report.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </div>

                      <hr className="border-slate-100" />

                      {/* Reason & Details */}
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                          Report Category
                        </div>
                        <div className="text-xs font-black text-slate-800">
                          {REASON_LABELS[report.reason] || report.reason}
                        </div>
                      </div>

                      {report.description && (
                        <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                            Submitter Details / Explanation
                          </div>
                          <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                            {report.description}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
