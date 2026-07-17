'use client';

import { useEffect, useState } from 'react';
import { crmApi } from '@/lib/api';
import { CrmTopBar } from '@/components/CrmSidebar';
import { useCrmAuth } from '@/hooks/use-crm-auth';
import {
  Loader2,
  Calculator,
  Mail,
  Phone,
  Calendar,
  ExternalLink,
  Search,
  AlertCircle,
  X,
  ChevronDown,
  Building2,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import clsx from 'clsx';

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000';

interface PropertyInteraction {
  propertyExternalId: string;
  propertyType: 'listing' | 'project';
  createdAt: string;
  titleEn: string;
  titleAr: string;
  city: string;
  price: number | null;
}

interface CalculatorLead {
  userId: string;
  name: string;
  email: string;
  phone: string;
  lastActiveAt: string;
  status: string;
  notes: { text: string; createdAt: string }[];
  interactions: PropertyInteraction[];
}

export default function CalculatorLeadsPage() {
  const { user } = useCrmAuth();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<CalculatorLead[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Pagination states
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Drawer details states
  const [selectedLead, setSelectedLead] = useState<CalculatorLead | null>(null);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => timer ? clearTimeout(timer) : undefined;
  }, [searchTerm]);

  // Reset page when search term changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearchTerm]);

  useEffect(() => {
    loadData();
  }, [page, debouncedSearchTerm]);

  async function loadData() {
    setLoading(true);
    try {
      const res = await crmApi.getCalculatorLeads({
        page,
        limit: 20,
        search: debouncedSearchTerm || undefined,
      });
      if (res.success && res.data) {
        if (Array.isArray(res.data)) {
          setLeads(res.data);
          setTotal(res.data.length);
        } else {
          setLeads(res.data.leads);
          setTotal(res.data.total);
        }
      }
    } catch (err) {
      console.error('Failed to load calculator leads', err);
    } finally {
      setLoading(false);
    }
  }

  // Filter leads by search term (name, email, or phone)
  const filteredLeads = leads;

  const handleUpdateStatus = async (userId: string, status: string) => {
    setStatusUpdating(userId);
    try {
      const res = await crmApi.updateCalculatorLeadStatus(userId, status);
      if (res.success) {
        setLeads(prev => prev.map(l => l.userId === userId ? { ...l, status } : l));
        if (selectedLead && selectedLead.userId === userId) {
          setSelectedLead(prev => prev ? { ...prev, status } : null);
        }
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setStatusUpdating(null);
    }
  };

  useEffect(() => {
    setNotesText('');
  }, [selectedLead?.userId]);

  const handleSaveNotes = async () => {
    if (!selectedLead || !notesText.trim()) return;
    setSavingNotes(true);
    try {
      const res = await crmApi.updateCalculatorLeadStatus(selectedLead.userId, undefined, notesText.trim());
      if (res.success) {
        const newEntry = { text: notesText.trim(), createdAt: new Date().toISOString() };
        const updatedNotes = [...(selectedLead.notes || []), newEntry];
        setLeads(prev => prev.map(l => l.userId === selectedLead.userId ? { ...l, notes: updatedNotes } : l));
        setSelectedLead(prev => prev ? { ...prev, notes: updatedNotes } : null);
        setNotesText('');
      }
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setSavingNotes(false);
    }
  };

  const formatCurrency = (val: number | null) => {
    if (val === null || val === undefined) return 'Ask Price';
    return `${Math.round(val).toLocaleString()} SAR`;
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-surface-50 overflow-y-auto">
      <CrmTopBar title="Calculator Leads" />

      <div className="p-6 space-y-6 max-w-7xl w-full mx-auto">
        {/* Intro Banner */}
        <div>
          <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Calculator className="w-6 h-6 text-primary-600 animate-pulse" />
            Calculator Activity (Cold Leads)
          </h1>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">
            Monitor calculator interactions from logged-in buyers to analyze property interest patterns before they submit forms.
          </p>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center p-24">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
              <span className="text-sm font-semibold text-slate-500">Loading calculator leads...</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Search Controls */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white text-slate-700"
                />
              </div>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 py-1.5 px-3.5 rounded-full border border-slate-200 shrink-0">
                Total Leads: {filteredLeads.length} unique buyers
              </span>
            </div>

            {/* Leads Table */}
            {filteredLeads.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center max-w-xl mx-auto shadow-sm">
                <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800">No Calculator Leads Found</h3>
                <p className="text-sm text-slate-500 mt-2">
                  When logged-in users start modifying the loan inputs on property or project detail pages, their cold profiles will appear here.
                </p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-slate-150 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/20">
                        <th className="p-4 pl-6 w-1/3">Buyer Info</th>
                        <th className="p-4 w-1/6 text-center">Calculations</th>
                        <th className="p-4 w-1/5">Last Active</th>
                        <th className="p-4 w-1/6">Status</th>
                        <th className="p-4 pr-6 w-1/12 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredLeads.map((lead) => {
                        const totalCalcs = lead.interactions.length;
                        return (
                          <tr
                            key={lead.userId}
                            onClick={() => setSelectedLead(lead)}
                            className="hover:bg-slate-50/20 transition-colors cursor-pointer"
                          >
                            {/* Buyer Contact info */}
                            <td className="p-4 pl-6 align-middle">
                              <div className="flex flex-col">
                                <span className="font-bold text-sm text-slate-900">
                                  {lead.name}
                                </span>
                                <div className="flex flex-col gap-1 mt-1 text-[11px] text-slate-500 font-medium">
                                  <span className="flex items-center gap-1">
                                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                                    {lead.email}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                                    {lead.phone}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Total calculations */}
                            <td className="p-4 align-middle text-center">
                              <span className="inline-flex items-center justify-center bg-primary-50 text-primary-700 text-xs font-black px-3 py-1 rounded-full border border-primary-100 min-w-[32px]">
                                {totalCalcs} calculations
                              </span>
                            </td>

                            {/* Last Active date */}
                            <td className="p-4 align-middle text-xs text-slate-500 font-semibold">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>
                                  {new Date(lead.lastActiveAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                            </td>

                            {/* Status badge */}
                            <td className="p-4 align-middle" onClick={(e) => e.stopPropagation()}>
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

                            {/* Quick Select Option */}
                            <td className="p-4 pr-6 align-middle text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="relative inline-block text-left">
                                <select
                                  disabled={statusUpdating === lead.userId}
                                  value={lead.status}
                                  onChange={(e) => handleUpdateStatus(lead.userId, e.target.value)}
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
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {!loading && leads.length > 0 && (
                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-xs font-semibold text-slate-400">
                      Showing <b>{leads.length}</b> of <b>{total}</b> calculator leads
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        className="btn-secondary p-1.5 disabled:opacity-50"
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <div className="text-xs font-black text-slate-700 px-3 bg-white border border-slate-200 py-1.5 rounded-lg">Page {page} of {Math.ceil(total / 20) || 1}</div>
                      <button 
                        className="btn-secondary p-1.5 disabled:opacity-50"
                        disabled={page * 20 >= total}
                        onClick={() => setPage(p => p + 1)}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
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
                <h2 className="text-sm font-black text-slate-800">{selectedLead.name}</h2>
                <p className="text-[10px] text-slate-400 font-semibold font-mono mt-0.5">
                  User ID: {selectedLead.userId}
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
              
              {/* Buyer Contact details */}
              <div className="space-y-2">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Buyer Details</h3>
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3.5">
                  <div className="flex justify-between items-center text-xs border-b border-slate-150 pb-2">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Phone Number</span>
                    <span className="font-bold text-slate-700 font-mono">{selectedLead.phone}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-b border-slate-150 pb-2">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Email Address</span>
                    <span className="font-bold text-slate-700 font-mono">{selectedLead.email}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Last Active</span>
                    <span className="font-bold text-slate-700">
                      {new Date(selectedLead.lastActiveAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Calculated Properties list */}
              <div className="space-y-2">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Calculated Properties & Projects</h3>
                <div className="space-y-3">
                  {selectedLead.interactions.map((item, idx) => {
                    const label = item.titleEn || item.titleAr || 'Untitled';
                    const priceText = formatCurrency(item.price);
                    const isListing = item.propertyType === 'listing';
                    const detailUrl = isListing 
                      ? `${WEB_URL}/en/listings/${item.propertyExternalId}` 
                      : `${WEB_URL}/en/projects/${item.propertyExternalId}`;

                    return (
                      <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center border border-slate-200 shrink-0">
                            <Building2 className="w-5 h-5 text-slate-400" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-black text-slate-800 truncate" title={label}>
                              {label}
                            </h4>
                            <p className="text-[9px] text-slate-400 font-bold font-mono mt-0.5 uppercase">
                              Type: {isListing ? 'Listing' : 'Project'} | Price: {priceText}
                            </p>
                          </div>
                        </div>
                        <a
                          href={detailUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-white border border-slate-200 text-slate-500 rounded-lg hover:bg-primary-50 hover:text-primary-600 hover:border-primary-100 transition-all shadow-sm flex items-center gap-1 text-[10px] font-bold shrink-0"
                        >
                          View Page
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    );
                  })}
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
                  disabled={statusUpdating === selectedLead.userId}
                  value={selectedLead.status}
                  onChange={(e) => handleUpdateStatus(selectedLead.userId, e.target.value)}
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
