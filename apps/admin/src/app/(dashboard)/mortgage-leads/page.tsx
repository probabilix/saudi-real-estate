'use client';

import { useState, useEffect } from 'react';
import { AdminTopBar } from '@/components/AdminSidebar';
import { adminApi, AdminMortgageLead } from '@/lib/api';
import {
  CreditCard, Search, Calendar, FileDown, CheckCircle2, AlertCircle,
  Clock, ChevronLeft, ChevronRight, Loader2, User, Building2,
  TrendingUp, X, ArrowUpRight, ChevronDown, Check, Coins, ShieldCheck
} from 'lucide-react';
import clsx from 'clsx';

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const BANKS_LIST = [
  { slug: 'emirates-nbd', name: 'Emirates NBD' },
  { slug: 'bsf', name: 'BSF' },
  { slug: 'al-jazira', name: 'Al Jazira' },
  { slug: 'fab', name: 'FAB' },
  { slug: 'al-rajhi', name: 'Al Rajhi' },
  { slug: 'snb', name: 'SNB' },
  { slug: 'riyad-bank', name: 'Riyad Bank' },
  { slug: 'shl', name: 'SHL' },
  { slug: 'sab', name: 'SAB' },
  { slug: 'dar-al-tamleek', name: 'Dar Al Tamleek' }
];

export default function MortgageLeadsPage() {
  const [leads, setLeads] = useState<AdminMortgageLead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterBank, setFilterBank] = useState('');
  const [filterCitizen, setFilterCitizen] = useState('');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');

  // Selected Lead for Drawer
  const [selectedLead, setSelectedLead] = useState<AdminMortgageLead | null>(null);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterStatus, filterBank, filterCitizen, filterDateStart, filterDateEnd]);

  useEffect(() => {
    loadLeads();
  }, [page, debouncedSearch, filterStatus, filterBank, filterCitizen, filterDateStart, filterDateEnd]);

  async function loadLeads() {
    setLoading(true);
    try {
      const result = await adminApi.getMortgageLeads({
        page,
        limit: 15,
        search: debouncedSearch || undefined,
        status: filterStatus || undefined,
        bank: filterBank || undefined,
        isCitizen: filterCitizen || undefined,
        dateStart: filterDateStart || undefined,
        dateEnd: filterDateEnd || undefined
      });

      if (result.success && result.data) {
        setLeads(result.data.leads);
        if (result.data.pagination) {
          setTotal(result.data.pagination.total);
          setTotalPages(result.data.pagination.totalPages);
        }
      }
    } catch (err) {
      console.error('Failed to load mortgage leads:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleUpdateStatus = async (leadId: string, status: string) => {
    setStatusUpdating(leadId);
    try {
      const result = await adminApi.updateMortgageLeadStatus(leadId, status);
      if (result.success && result.data) {
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status } : l));
        if (selectedLead && selectedLead.id === leadId) {
          setSelectedLead(prev => prev ? { ...prev, status } : null);
        }
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setStatusUpdating(null);
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const q = new URLSearchParams();
      if (debouncedSearch) q.set('search', debouncedSearch);
      if (filterStatus) q.set('status', filterStatus);
      if (filterBank) q.set('bank', filterBank);
      if (filterCitizen) q.set('isCitizen', filterCitizen);
      if (filterDateStart) q.set('dateStart', filterDateStart);
      if (filterDateEnd) q.set('dateEnd', filterDateEnd);

      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/admin/mortgage-leads/export?${q}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mortgage_leads_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error('Failed to export leads:', err);
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (val: string | number | null) => {
    if (val === null || val === undefined) return '0 SAR';
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return `${Math.round(num).toLocaleString()} SAR`;
  };

  // Check if ID is a standard 36-character UUID
  const isUUID = (str: string) => {
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str);
  };

  return (
    <div className="flex flex-col h-full bg-canvas/30">
      <AdminTopBar title="Mortgage Leads Registry" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* Header section with Stats summary and Export button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-primary-600 animate-pulse" />
              Mortgage Lead Pipelines
            </h1>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              Review and manage high-intent user loan calculation estimates
            </p>
          </div>
          <button
            onClick={handleExportCSV}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-sm disabled:opacity-50"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
            ) : (
              <FileDown className="w-4 h-4 text-slate-500" />
            )}
            Export to CSV
          </button>
        </div>

        {/* Filters Panel */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Search Input */}
            <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 shadow-inner transition-all focus-within:border-primary-400 focus-within:ring-1 focus-within:ring-primary-400 col-span-1 sm:col-span-2 lg:col-span-1">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search name, phone number..."
                className="bg-transparent border-none focus:ring-0 outline-none text-xs w-full text-slate-700 placeholder-slate-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Bank Filter */}
            <select
              className="admin-input py-2.5 bg-white border-slate-200 rounded-xl text-xs"
              value={filterBank}
              onChange={(e) => setFilterBank(e.target.value)}
            >
              <option value="">All Banks</option>
              {BANKS_LIST.map((b) => (
                <option key={b.slug} value={b.slug}>{b.name}</option>
              ))}
            </select>

            {/* Citizenship Filter */}
            <select
              className="admin-input py-2.5 bg-white border-slate-200 rounded-xl text-xs"
              value={filterCitizen}
              onChange={(e) => setFilterCitizen(e.target.value)}
            >
              <option value="">All Citizenships</option>
              <option value="true">Saudi Citizen</option>
              <option value="false">Non-Saudi</option>
            </select>

            {/* Status Filter */}
            <select
              className="admin-input py-2.5 bg-white border-slate-200 rounded-xl text-xs"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {/* Date Filters Row */}
          <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-100 text-xs">
            <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Date Range:</span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                className="admin-input py-1.5 px-3 bg-white border-slate-200 rounded-xl text-xs w-36"
                value={filterDateStart}
                onChange={(e) => setFilterDateStart(e.target.value)}
              />
              <span className="text-slate-400 font-semibold">to</span>
              <input
                type="date"
                className="admin-input py-1.5 px-3 bg-white border-slate-200 rounded-xl text-xs w-36"
                value={filterDateEnd}
                onChange={(e) => setFilterDateEnd(e.target.value)}
              />
            </div>
            {(filterDateStart || filterDateEnd || filterBank || filterCitizen || filterStatus || searchTerm) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterBank('');
                  setFilterCitizen('');
                  setFilterStatus('');
                  setFilterDateStart('');
                  setFilterDateEnd('');
                }}
                className="text-primary-600 hover:text-primary-700 font-black ml-auto text-[10px] uppercase tracking-wider"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Leads Table Card */}
        <div className="admin-card overflow-hidden border border-slate-100 shadow-sm rounded-2xl">
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="font-black uppercase tracking-wider text-[10px] text-slate-400 bg-slate-50/50 py-3.5">User</th>
                  <th className="font-black uppercase tracking-wider text-[10px] text-slate-400 bg-slate-50/50 py-3.5">Property / Target</th>
                  <th className="font-black uppercase tracking-wider text-[10px] text-slate-400 bg-slate-50/50 py-3.5">Bank Deal</th>
                  <th className="font-black uppercase tracking-wider text-[10px] text-slate-400 bg-slate-50/50 py-3.5">Finance Details</th>
                  <th className="font-black uppercase tracking-wider text-[10px] text-slate-400 bg-slate-50/50 py-3.5">Installment</th>
                  <th className="font-black uppercase tracking-wider text-[10px] text-slate-400 bg-slate-50/50 py-3.5">Status</th>
                  <th className="font-black uppercase tracking-wider text-[10px] text-slate-400 bg-slate-50/50 py-3.5 text-right">Stage Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-20 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto" />
                      <p className="text-xs text-slate-500 mt-2 font-medium">Retrieving mortgage ledger...</p>
                    </td>
                  </tr>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-20 text-center">
                      <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-slate-100">
                        <CreditCard className="w-6 h-6 text-slate-300" />
                      </div>
                      <p className="text-sm font-bold text-slate-700">No mortgage leads recorded yet</p>
                      <p className="text-xs text-slate-400 mt-1">Estimations submitted from detail pages will register here</p>
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => {
                    const downPct = Math.round((parseFloat(lead.downPaymentAmount) / parseFloat(lead.propertyPrice)) * 100);
                    return (
                      <tr
                        key={lead.id}
                        onClick={() => setSelectedLead(lead)}
                        className="group cursor-pointer hover:bg-slate-50/40 transition-colors"
                      >
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/10 to-emerald-500/10 text-teal-600 flex items-center justify-center font-bold text-sm border border-teal-500/5 shadow-sm">
                              {lead.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-slate-800 truncate">{lead.fullName}</div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 font-medium">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {new Date(lead.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="max-w-[200px] truncate space-y-0.5">
                            <div className="text-xs font-bold text-slate-800 truncate" title={lead.targetNameEn || lead.propertyExternalId}>
                              {lead.targetNameEn || `ID: ${lead.propertyExternalId}`}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono font-semibold">
                              Base: {formatCurrency(lead.propertyPrice)}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="space-y-0.5">
                            <div className="text-xs font-bold text-slate-700">{lead.bankNameEn}</div>
                            <div className="text-[10px] text-slate-400 font-semibold">{lead.appliedRatePct}% APR</div>
                          </div>
                        </td>
                        <td>
                          <div className="space-y-0.5 text-slate-700">
                            <div className="text-xs font-bold">
                              Loan: {formatCurrency(lead.totalLoanAmount)}
                            </div>
                            <div className="text-[10px] text-slate-400 font-semibold">
                              Down: {formatCurrency(lead.downPaymentAmount)} ({downPct}%)
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="space-y-0.5">
                            <div className="text-xs font-black text-slate-800">{formatCurrency(lead.monthlyInstalment)}/mo</div>
                            <div className="text-[10px] text-slate-400 font-semibold">{lead.loanPeriodYears} yrs duration</div>
                          </div>
                        </td>
                        <td>
                          <span className={clsx(
                            "badge font-black uppercase tracking-wider text-[9px] py-1 px-2.5 border",
                            lead.status === 'new' && "badge-blue bg-blue-50/50 text-blue-600 border-blue-100",
                            lead.status === 'contacted' && "badge-yellow bg-amber-50/50 text-amber-600 border-amber-100",
                            lead.status === 'closed' && "badge-green bg-emerald-50 text-emerald-600 border-emerald-100"
                          )}>
                            {lead.status}
                          </span>
                        </td>
                        <td className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="relative inline-block text-left">
                            <select
                              disabled={statusUpdating === lead.id}
                              value={lead.status}
                              onChange={(e) => handleUpdateStatus(lead.id, e.target.value)}
                              className="bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-[10px] font-bold text-slate-600 py-1.5 pl-2.5 pr-8 focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer appearance-none transition-all"
                            >
                              <option value="new">New</option>
                              <option value="contacted">Contacted</option>
                              <option value="closed">Closed</option>
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-400">
                Showing <b>{leads.length}</b> of <b>{total}</b> mortgage leads
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="btn-secondary p-1.5 disabled:opacity-50"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="text-xs font-black text-slate-700 px-3 bg-white border border-slate-200 py-1.5 rounded-lg">
                  Page {page} of {totalPages}
                </div>
                <button
                  className="btn-secondary p-1.5 disabled:opacity-50"
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Slide-Over Drawer for Mortgage Lead Details */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedLead(null)}
          />

          <div className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col z-10 transform transition-transform duration-300 ease-out translate-x-0 animate-slide-in">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-teal-100">
                  {selectedLead.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                    {selectedLead.fullName}
                  </h2>
                  <span className="text-[10px] text-slate-400 font-semibold">Lead ID: {selectedLead.id}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Target Property */}
              <div className="space-y-2">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target Inventory</h3>
                <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center border border-slate-200">
                      <Building2 className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-slate-800 truncate" title={selectedLead.targetNameEn || selectedLead.propertyExternalId}>
                        {selectedLead.targetNameEn || 'Unknown Property'}
                      </h4>
                      <p className="text-[9px] text-slate-500 font-mono font-semibold mt-0.5">
                        ID: {selectedLead.propertyExternalId}
                      </p>
                    </div>
                  </div>
                  <a
                    href={
                      isUUID(selectedLead.propertyExternalId)
                        ? `${WEB_URL}/en/projects/${selectedLead.propertyExternalId}`
                        : `${WEB_URL}/en/listings/${selectedLead.propertyExternalId}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-slate-50 border border-slate-200 text-slate-500 rounded-lg hover:bg-primary-50 hover:text-primary-600 hover:border-primary-100 transition-all shadow-sm flex items-center gap-1 text-[10px] font-bold"
                  >
                    View Page
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Lead Information */}
              <div className="space-y-2">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Applicant Details</h3>
                <div className="grid grid-cols-2 gap-4 bg-slate-50/50 rounded-2xl border border-slate-100 p-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Phone Number</span>
                    <span className="text-xs font-black text-slate-700 font-mono">{selectedLead.phoneNumber}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Citizenship</span>
                    <span className="text-xs font-black text-slate-700">
                      {selectedLead.isCitizen ? 'Saudi Citizen' : 'Non-Saudi'}
                    </span>
                  </div>
                  <div className="space-y-1 border-t border-slate-200/50 pt-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">First Home Purchase</span>
                    <span className="text-xs font-black text-slate-700">
                      {selectedLead.isFirstHome === null ? 'N/A' : (selectedLead.isFirstHome ? 'Yes' : 'No')}
                    </span>
                  </div>
                  <div className="space-y-1 border-t border-slate-200/50 pt-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">REDF Support</span>
                    <span className="text-xs font-black text-slate-700">
                      {selectedLead.redfSupported ? 'Yes (Supported)' : 'No (Not Supported)'}
                    </span>
                  </div>
                  <div className="space-y-1 border-t border-slate-200/50 pt-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Monthly Income</span>
                    <span className="text-xs font-black text-slate-700">
                      {selectedLead.monthlyIncome ? formatCurrency(selectedLead.monthlyIncome) : 'Not provided'}
                    </span>
                  </div>
                  <div className="space-y-1 border-t border-slate-200/50 pt-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Monthly Obligations</span>
                    <span className="text-xs font-black text-slate-700">
                      {selectedLead.monthlyObligations ? formatCurrency(selectedLead.monthlyObligations) : 'Not provided'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Calculation Snapshot */}
              <div className="space-y-2">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Calculation Snapshot</h3>
                <div className="bg-gradient-to-br from-teal-50/20 to-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Monthly Installment</span>
                      <span className="text-base font-black text-teal-600">
                        {formatCurrency(selectedLead.monthlyInstalment)}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Applied Interest Rate</span>
                      <span className="text-base font-black text-slate-700">
                        {selectedLead.appliedRatePct}% APR
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3 grid grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Selected Bank</span>
                      <span className="font-bold text-slate-700">{selectedLead.bankNameEn}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Loan Period</span>
                      <span className="font-bold text-slate-700">{selectedLead.loanPeriodYears} Years</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3 grid grid-cols-3 gap-2 text-xs">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Down Payment</span>
                      <span className="font-bold text-slate-700">{formatCurrency(selectedLead.downPaymentAmount)}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Loan Amount</span>
                      <span className="font-bold text-slate-700">{formatCurrency(selectedLead.totalLoanAmount)}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Payable</span>
                      <span className="font-bold text-slate-700">{formatCurrency(selectedLead.totalPayableValue)}</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Status updates footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="text-xs font-bold text-slate-500">
                Update Lead Stage:
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={statusUpdating === selectedLead.id}
                  onClick={() => handleUpdateStatus(selectedLead.id, 'new')}
                  className={clsx(
                    "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all",
                    selectedLead.status === 'new'
                      ? "bg-blue-50 border-blue-200 text-blue-600 font-bold shadow-sm"
                      : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
                  )}
                >
                  New
                </button>
                <button
                  disabled={statusUpdating === selectedLead.id}
                  onClick={() => handleUpdateStatus(selectedLead.id, 'contacted')}
                  className={clsx(
                    "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all",
                    selectedLead.status === 'contacted'
                      ? "bg-amber-50 border-amber-200 text-amber-600 font-bold shadow-sm"
                      : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
                  )}
                >
                  Contacted
                </button>
                <button
                  disabled={statusUpdating === selectedLead.id}
                  onClick={() => handleUpdateStatus(selectedLead.id, 'closed')}
                  className={clsx(
                    "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all",
                    selectedLead.status === 'closed'
                      ? "bg-emerald-50 border-emerald-200 text-emerald-600 font-bold shadow-sm"
                      : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
                  )}
                >
                  Closed
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
