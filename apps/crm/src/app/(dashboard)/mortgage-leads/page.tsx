'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { crmApi, CrmMortgageLead } from '@/lib/api';
import { CrmTopBar } from '@/components/CrmSidebar';
import { useCrmAuth } from '@/hooks/use-crm-auth';
import {
  Loader2,
  CreditCard,
  Mail,
  Phone,
  Calendar,
  Search,
  AlertCircle,
  X,
  ChevronDown,
  FileDown,
  ArrowUpRight,
  Building2
} from 'lucide-react';
import clsx from 'clsx';

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const BANKS_LIST = [
  { slug: 'alrajhi', name: 'Al Rajhi Bank' },
  { slug: 'snb', name: 'SNB (AlAhli)' },
  { slug: 'riyad', name: 'Riyad Bank' },
  { slug: 'alinma', name: 'Alinma Bank' },
  { slug: 'bsf', name: 'Banque Saudi Fransi' },
  { slug: 'sabb', name: 'SABB (Alawwal)' },
  { slug: 'anb', name: 'Arab National Bank' },
  { slug: 'bid', name: 'Bank AlBilad' },
  { slug: 'jazeera', name: 'Bank AlJazira' },
  { slug: 'srec', name: 'Saudi Real Estate Refinance Company' },
];

export default function MortgageLeadsPage() {
  const { user, isAdmin, loading: authLoading } = useCrmAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.replace('/');
    }
  }, [authLoading, isAdmin, router]);

  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<CrmMortgageLead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterBank, setFilterBank] = useState('');
  const [filterCitizen, setFilterCitizen] = useState('');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');

  // Selected Lead for Drawer
  const [selectedLead, setSelectedLead] = useState<CrmMortgageLead | null>(null);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

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
      const result = await crmApi.getMortgageLeads({
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
      const result = await crmApi.updateMortgageLeadStatus(leadId, status);
      if (result.success) {
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

  const [notesText, setNotesText] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    setNotesText('');
  }, [selectedLead?.id]);

  const handleSaveNotes = async () => {
    if (!selectedLead || !notesText.trim()) return;
    setSavingNotes(true);
    try {
      const result = await crmApi.updateMortgageLeadStatus(selectedLead.id, undefined, notesText.trim());
      if (result.success) {
        const newEntry = { text: notesText.trim(), createdAt: new Date().toISOString() };
        const updatedNotes = [...(selectedLead.notes || []), newEntry];
        setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, notes: updatedNotes } : l));
        setSelectedLead(prev => prev ? { ...prev, notes: updatedNotes } : null);
        setNotesText('');
      }
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setSavingNotes(false);
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

      const token = localStorage.getItem('crmToken');
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

  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-canvas">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="flex flex-col h-full bg-canvas/30">
      <CrmTopBar title="Mortgage Leads Registry" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* Header section with Stats summary and Export button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-primary-600" />
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
              <option value="attempted_contact">Attempted Contact</option>
              <option value="contacted">Contacted</option>
              <option value="on_follow_up">On Follow Up</option>
              <option value="closed_won">Closed Won</option>
              <option value="closed_lost">Closed Lost</option>
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
        <div className="admin-card overflow-hidden border border-slate-100 shadow-sm rounded-2xl bg-white">
          <div className="overflow-x-auto">
            <table className="admin-table w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="font-black uppercase tracking-wider text-[10px] text-slate-400 py-3.5 pl-6 text-left">User</th>
                  <th className="font-black uppercase tracking-wider text-[10px] text-slate-400 py-3.5 text-left">Property / Target</th>
                  <th className="font-black uppercase tracking-wider text-[10px] text-slate-400 py-3.5 text-left">Bank Deal</th>
                  <th className="font-black uppercase tracking-wider text-[10px] text-slate-400 py-3.5 text-left">Finance Details</th>
                  <th className="font-black uppercase tracking-wider text-[10px] text-slate-400 py-3.5 text-left">Installment</th>
                  <th className="font-black uppercase tracking-wider text-[10px] text-slate-400 py-3.5 text-left">Status</th>
                  <th className="font-black uppercase tracking-wider text-[10px] text-slate-400 py-3.5 text-right pr-6">Stage Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-20 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto" />
                      <p className="text-xs text-slate-500 mt-2 font-medium">Retrieving mortgage ledger...</p>
                    </td>
                  </tr>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-20 text-center text-xs font-semibold text-slate-400">
                      No matching mortgage leads found.
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => {
                    const price = parseFloat(lead.propertyPrice);
                    const down = parseFloat(lead.downPaymentAmount);
                    const downPct = price > 0 ? Math.round((down / price) * 100) : 0;
                    return (
                      <tr
                        key={lead.id}
                        onClick={() => setSelectedLead(lead)}
                        className="hover:bg-slate-50/40 cursor-pointer transition-all"
                      >
                        <td className="py-4 pl-6">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-800">{lead.fullName}</span>
                            <span className="text-[10px] text-slate-400 font-semibold font-mono mt-0.5">{lead.phoneNumber}</span>
                          </div>
                        </td>
                        <td>
                          <div className="flex flex-col max-w-[200px]">
                            <span className="text-xs font-bold text-slate-700 truncate">{lead.targetNameEn || 'Unknown Property'}</span>
                            <span className="text-[9px] font-mono text-slate-400 font-semibold truncate mt-0.5">{lead.propertyExternalId}</span>
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
                            "badge font-black uppercase tracking-wider text-[9px] py-1 px-2.5 border rounded-full",
                            lead.status === 'new' && "badge-blue bg-blue-50/50 text-blue-600 border-blue-100",
                            lead.status === 'attempted_contact' && "badge-indigo bg-indigo-50/50 text-indigo-600 border-indigo-100",
                            lead.status === 'contacted' && "badge-yellow bg-amber-50/50 text-amber-600 border-amber-100",
                            lead.status === 'on_follow_up' && "badge-purple bg-purple-50/50 text-purple-600 border-purple-100",
                            lead.status === 'closed_won' && "badge-green bg-emerald-50 text-emerald-600 border-emerald-100",
                            lead.status === 'closed_lost' && "badge-red bg-rose-50 text-rose-600 border-rose-100"
                          )}>
                            {lead.status === 'attempted_contact' ? 'Attempted Contact' :
                             lead.status === 'on_follow_up' ? 'On Follow Up' :
                             lead.status === 'closed_won' ? 'Closed Won' :
                             lead.status === 'closed_lost' ? 'Closed Lost' :
                             lead.status}
                          </span>
                        </td>
                        <td className="text-right pr-6" onClick={(e) => e.stopPropagation()}>
                          <div className="relative inline-block text-left">
                            <select
                              disabled={statusUpdating === lead.id}
                              value={lead.status}
                              onChange={(e) => handleUpdateStatus(lead.id, e.target.value)}
                              className="bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-[10px] font-bold text-slate-600 py-1.5 pl-2.5 pr-8 focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer appearance-none transition-all"
                            >
                              <option value="new">New</option>
                              <option value="attempted_contact">Attempted Contact</option>
                              <option value="contacted">Contacted</option>
                              <option value="on_follow_up">On Follow Up</option>
                              <option value="closed_won">Closed Won</option>
                              <option value="closed_lost">Closed Lost</option>
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
              <div className="flex items-center gap-1.5">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  className="px-3.5 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold rounded-lg text-xs disabled:opacity-50 transition-all"
                >
                  Prev
                </button>
                <span className="text-xs font-bold text-slate-500 px-2">Page {page} of {totalPages}</span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                  className="px-3.5 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold rounded-lg text-xs disabled:opacity-50 transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Details Slideover Drawer */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity"
            onClick={() => setSelectedLead(null)}
          />

          {/* Drawer Body */}
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-10 animate-slide-in border-l border-slate-200">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
              <div>
                <h2 className="text-sm font-black text-slate-800">{selectedLead.fullName}</h2>
                <p className="text-[10px] text-slate-400 font-semibold font-mono mt-0.5">
                  Lead ID: {selectedLead.id}
                </p>
                {selectedLead.email && (
                  <p className="text-[10px] text-[#006169] font-bold font-mono mt-0.5">
                    {selectedLead.email}
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                aria-label="Close details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Target Property block */}
              <div className="space-y-2">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target Inventory</h3>
                <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 flex items-center justify-between gap-4 shadow-sm">
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
                      selectedLead.propertyType === 'project'
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
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm grid grid-cols-2 gap-y-3.5 gap-x-6">
                  <div className="space-y-1 col-span-2 border-b border-slate-200/50 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Phone Number</span>
                      <span className="text-xs font-black text-slate-700 font-mono">{selectedLead.phoneNumber}</span>
                    </div>
                    {selectedLead.email && (
                      <div className="sm:text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Address</span>
                        <span className="text-xs font-black text-slate-700 font-mono">{selectedLead.email}</span>
                      </div>
                    )}
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

              {/* Agent Notes Section */}
              <div className="space-y-2">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Agent Notes</h3>
                <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  {selectedLead.notes && selectedLead.notes.length > 0 && (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {[...selectedLead.notes].reverse().map((note, idx) => (
                        <div key={idx} className="bg-white border border-slate-200 rounded-xl p-3 text-xs">
                          <p className="text-slate-700 font-semibold leading-relaxed">{note.text}</p>
                          <p className="text-[10px] text-slate-400 mt-1.5 font-mono">
                            {new Date(note.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  <textarea
                    className="w-full min-h-[80px] text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500 placeholder-slate-400 bg-white text-slate-700 font-semibold"
                    placeholder="Add a new note..."
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                  />
                  <div className="flex justify-end">
                    <button
                      disabled={savingNotes || !notesText.trim()}
                      onClick={handleSaveNotes}
                      className="px-4 py-2 bg-[#006169] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 shadow-sm flex items-center gap-1.5"
                    >
                      {savingNotes ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" /> : null}
                      Add Note
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* Status updates footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="text-xs font-bold text-slate-500">
                Update Lead Stage:
              </div>
              <div className="relative inline-block text-left">
                <select
                  disabled={statusUpdating === selectedLead.id}
                  value={selectedLead.status}
                  onChange={(e) => handleUpdateStatus(selectedLead.id, e.target.value)}
                  className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-700 py-2 pl-3 pr-9 focus:outline-none focus:ring-1 focus:ring-[#006169] cursor-pointer appearance-none transition-all shadow-sm"
                >
                  <option value="new">New</option>
                  <option value="attempted_contact">Attempted Contact</option>
                  <option value="contacted">Contacted</option>
                  <option value="on_follow_up">On Follow Up</option>
                  <option value="closed_won">Closed Won</option>
                  <option value="closed_lost">Closed Lost</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
