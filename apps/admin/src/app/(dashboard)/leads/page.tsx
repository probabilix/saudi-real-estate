'use client';
import { useState, useEffect } from 'react';
import { AdminTopBar } from '@/components/AdminSidebar';
import { adminApi, AdminLead, AdminChatMessage, AdminLeadStats } from '@/lib/api';
import {
  Sparkles, Search, CheckCircle2, AlertCircle,
  Calendar, DollarSign, Clock, ChevronLeft, ChevronRight,
  Loader2, User, Building, TrendingUp, X,
  ExternalLink, ChevronDown, MessageSquare, ArrowUpRight,
  Bookmark, BadgeAlert, Activity
} from 'lucide-react';
import clsx from 'clsx';

export default function LeadsPage() {
  const [leads, setLeads] = useState<AdminLead[]>([]);
  const [stats, setStats] = useState<AdminLeadStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterQualified, setFilterQualified] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedLead, setSelectedLead] = useState<AdminLead | null>(null);
  const [chatHistory, setChatHistory] = useState<AdminChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page on filter changes
  useEffect(() => {
    setPage(1);
  }, [filterStatus, filterQualified, debouncedSearchTerm]);

  useEffect(() => {
    loadLeads();
  }, [page, filterStatus, filterQualified, debouncedSearchTerm]);

  // Fetch chat history when selected lead changes
  useEffect(() => {
    if (selectedLead) {
      loadChatHistory(selectedLead.id);
    } else {
      setChatHistory([]);
    }
  }, [selectedLead]);

  async function loadLeads() {
    setLoading(true);
    const result = await adminApi.getLeads({
      page,
      status: filterStatus || undefined,
      isQualified: filterQualified === 'true' ? true : filterQualified === 'false' ? false : undefined,
      search: debouncedSearchTerm || undefined,
    });

    if (result.success && result.data) {
      setLeads(result.data.leads);
      setTotal(result.data.total);
      setStats(result.data.stats);
    }
    setLoading(false);
  }

  async function loadChatHistory(leadId: string) {
    setChatLoading(true);
    const result = await adminApi.getLeadChatHistory(leadId);
    if (result.success && result.data) {
      setChatHistory(result.data);
    }
    setChatLoading(false);
  }

  const handleUpdateStatus = async (leadId: string, status: string) => {
    setStatusUpdating(leadId);
    const result = await adminApi.updateLeadStatus(leadId, status);
    if (result.success) {
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: status as any } : l));
      if (selectedLead && selectedLead.id === leadId) {
        setSelectedLead(prev => prev ? { ...prev, status: status as any } : null);
      }
    }
    setStatusUpdating(null);
  };

  return (
    <div className="flex flex-col h-full bg-canvas/30">
      <AdminTopBar title="Leads & CRM Section" />

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Visual Analytics / KPI metrics */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* KPI Card 1: Total Leads */}
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-2xl p-5 shadow-sm transition-all hover:shadow-md hover:scale-[1.01] group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600">Total Leads</span>
                  <h3 className="text-3xl font-black text-slate-800">{stats.totalLeads}</h3>
                </div>
                <div className="p-3 bg-indigo-500/10 text-indigo-600 rounded-xl">
                  <User className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-4 text-[10px] font-semibold text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                <span>Real-time from AI qualification</span>
              </div>
            </div>

            {/* KPI Card 2: AI Qualified */}
            <div className="relative overflow-hidden bg-gradient-to-br from-violet-50 to-white border border-violet-100 rounded-2xl p-5 shadow-sm transition-all hover:shadow-md hover:scale-[1.01] group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-violet-600">AI Qualified</span>
                  <h3 className="text-3xl font-black text-slate-800">{stats.qualifiedLeads}</h3>
                </div>
                <div className="p-3 bg-violet-500/10 text-violet-600 rounded-xl">
                  <Sparkles className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-4 text-[10px] font-semibold text-violet-600">
                <span className="w-2 h-2 rounded-full bg-violet-500 animate-ping" />
                <span>Qualified by pipeline</span>
              </div>
            </div>

            {/* KPI Card 3: Conversion Rate */}
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 rounded-2xl p-5 shadow-sm transition-all hover:shadow-md hover:scale-[1.01] group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Conversion Rate</span>
                  <h3 className="text-3xl font-black text-slate-800">{stats.conversionRate}%</h3>
                </div>
                <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              {/* Mini visual conversion progress bar */}
              <div className="mt-4 w-full bg-emerald-200/40 rounded-full h-1.5 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${stats.conversionRate}%` }} />
              </div>
            </div>

            {/* KPI Card 4: Avg Intent Score */}
            <div className="relative overflow-hidden bg-gradient-to-br from-amber-50 to-white border border-amber-100 rounded-2xl p-5 shadow-sm transition-all hover:shadow-md hover:scale-[1.01] group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-600">Avg Intent Score</span>
                  <h3 className="text-3xl font-black text-slate-800">{stats.avgIntentScore}<span className="text-sm font-bold text-slate-400">/100</span></h3>
                </div>
                <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl">
                  <Activity className="w-5 h-5" />
                </div>
              </div>
              {/* Mini visual intent progress bar */}
              <div className="mt-4 w-full bg-amber-200/40 rounded-full h-1.5 overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full" style={{ width: `${stats.avgIntentScore}%` }} />
              </div>
            </div>

          </div>
        )}

        {/* Filters Header Container */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 bg-white border border-slate-100 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 shadow-inner w-full lg:w-96 transition-all focus-within:border-primary-400 focus-within:ring-1 focus-within:ring-primary-400">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input 
              type="text" 
              placeholder="Search by buyer, broker name, property..."
              className="bg-transparent border-none focus:ring-0 outline-none text-sm w-full text-slate-700 placeholder-slate-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <select 
              className="admin-input py-2.5 w-auto min-w-[150px] bg-white border-slate-200 rounded-xl text-sm"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Lead Stages</option>
              <option value="NEW">New Lead</option>
              <option value="VIEWED">Viewed</option>
              <option value="CONTACTED">Contacted</option>
              <option value="CLOSED_WON">Closed Won</option>
              <option value="CLOSED_LOST">Closed Lost</option>
            </select>
            
            <select 
              className="admin-input py-2.5 w-auto min-w-[150px] bg-white border-slate-200 rounded-xl text-sm"
              value={filterQualified}
              onChange={(e) => setFilterQualified(e.target.value)}
            >
              <option value="">All Qualifications</option>
              <option value="true">AI Qualified Only</option>
              <option value="false">Unqualified Only</option>
            </select>
          </div>
        </div>

        {/* CRM Leads Table */}
        <div className="admin-card overflow-hidden border border-slate-100 shadow-sm rounded-2xl">
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="font-black uppercase tracking-wider text-[10px] text-slate-400 bg-slate-50/50 py-3.5">Buyer / Date</th>
                  <th className="font-black uppercase tracking-wider text-[10px] text-slate-400 bg-slate-50/50 py-3.5">Property Target</th>
                  <th className="font-black uppercase tracking-wider text-[10px] text-slate-400 bg-slate-50/50 py-3.5">Intent Score</th>
                  <th className="font-black uppercase tracking-wider text-[10px] text-slate-400 bg-slate-50/50 py-3.5">AI Qualification</th>
                  <th className="font-black uppercase tracking-wider text-[10px] text-slate-400 bg-slate-50/50 py-3.5">Lead Stage</th>
                  <th className="font-black uppercase tracking-wider text-[10px] text-slate-400 bg-slate-50/50 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto" />
                      <p className="text-xs text-slate-500 mt-2 font-medium">Retrieving lead ledger...</p>
                    </td>
                  </tr>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-slate-100">
                        <Sparkles className="w-6 h-6 text-slate-300" />
                      </div>
                      <p className="text-sm font-bold text-slate-700">No leads recorded yet</p>
                      <p className="text-xs text-slate-400 mt-1">AI-qualification pipelines will sync leads here</p>
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr 
                      key={lead.id} 
                      className="group cursor-pointer hover:bg-slate-50/40 transition-colors"
                      onClick={() => setSelectedLead(lead)}
                    >
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 text-indigo-600 flex items-center justify-center font-bold text-sm border border-indigo-500/5 shadow-sm">
                            {lead.buyer?.name?.charAt(0) || 'B'}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-slate-800 truncate">
                              {lead.buyer?.name || 'Anonymous Client'}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 font-medium">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {new Date(lead.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="max-w-[240px] truncate space-y-0.5">
                          <div className="text-sm font-bold text-slate-700 truncate flex items-center gap-1.5">
                            <Building className="w-3.5 h-3.5 text-slate-400" />
                            {lead.listing?.enTitle || lead.listing?.arTitle || 'Unnamed Property'}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono font-semibold">
                            ID: {lead.listing?.shortId || 'N/A'} • {lead.listing?.city}
                          </div>
                        </div>
                      </td>
                      <td className="align-middle">
                        <div className="flex items-center gap-3 w-32">
                          <span className={clsx(
                            "text-xs font-black min-w-[24px]",
                            (lead.intentScoreAtCreation ?? 0) >= 80 ? "text-emerald-500" : (lead.intentScoreAtCreation ?? 0) >= 50 ? "text-amber-500" : "text-rose-500"
                          )}>
                            {lead.intentScoreAtCreation ?? 0}
                          </span>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div className={clsx(
                              "h-full rounded-full",
                              (lead.intentScoreAtCreation ?? 0) >= 80 ? "bg-emerald-500" : (lead.intentScoreAtCreation ?? 0) >= 50 ? "bg-amber-500" : "bg-rose-500"
                            )} style={{ width: `${lead.intentScoreAtCreation ?? 0}%` }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center">
                          {lead.isQualified ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm shadow-indigo-200">
                              <Sparkles className="w-2.5 h-2.5" /> Qualified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-400 border border-slate-200">
                              Unqualified
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center">
                          <span className={clsx(
                            "badge font-black uppercase tracking-wider text-[9px] py-1 px-2.5 border",
                            lead.status === 'NEW' && "badge-blue bg-blue-50/50 text-blue-600 border-blue-100",
                            lead.status === 'VIEWED' && "badge-gray bg-slate-50 text-slate-600 border-slate-200",
                            lead.status === 'CONTACTED' && "badge-yellow bg-amber-50/50 text-amber-600 border-amber-100",
                            lead.status === 'CLOSED_WON' && "badge-green bg-emerald-50 text-emerald-600 border-emerald-100",
                            lead.status === 'CLOSED_LOST' && "badge-red bg-rose-50 text-rose-600 border-rose-100"
                          )}>
                            {lead.status.replace('_', ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="relative inline-block text-left">
                          <select
                            disabled={statusUpdating === lead.id}
                            value={lead.status}
                            onChange={(e) => handleUpdateStatus(lead.id, e.target.value)}
                            className="bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-[10px] font-bold text-slate-600 py-1.5 pl-2.5 pr-8 focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer appearance-none transition-all"
                          >
                            <option value="NEW">New</option>
                            <option value="VIEWED">Viewed</option>
                            <option value="CONTACTED">Contacted</option>
                            <option value="CLOSED_WON">Won</option>
                            <option value="CLOSED_LOST">Lost</option>
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
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
            <div className="text-xs font-semibold text-slate-400">
              Showing <b>{leads.length}</b> of <b>{total}</b> CRM leads
            </div>
            <div className="flex items-center gap-2">
              <button 
                className="btn-secondary p-1.5 disabled:opacity-50"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-xs font-black text-slate-700 px-3 bg-white border border-slate-200 py-1.5 rounded-lg">Page {page}</div>
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

      {/* CRM Slide-Over drawer */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop blurring effect */}
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedLead(null)}
          />
          
          {/* Drawer Body Panel */}
          <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col z-10 transform transition-transform duration-300 ease-out translate-x-0 animate-slide-in">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-indigo-100">
                  {selectedLead.buyer?.name?.charAt(0) || 'B'}
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                    {selectedLead.buyer?.name || 'Anonymous Client'}
                    {selectedLead.isQualified && (
                      <span className="inline-flex items-center bg-violet-100 text-violet-700 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-violet-200 animate-pulse">AI Qualified</span>
                    )}
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

            {/* Scrollable drawer body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Row 1: AI Qualification Summary */}
              {selectedLead.aiSummary && (
                <div className="space-y-2">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-violet-500" /> AI Qualification Summary
                  </h3>
                  <div className="bg-gradient-to-br from-violet-50/40 via-indigo-50/20 to-white rounded-2xl border border-violet-100 p-5 shadow-inner">
                    <p className="text-sm text-slate-600 font-medium leading-relaxed italic">
                      "{selectedLead.aiSummary}"
                    </p>
                  </div>
                </div>
              )}

              {/* Row 2: Buyer Preferences */}
              <div className="space-y-2">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Buyer Specifications</h3>
                <div className="grid grid-cols-2 gap-4 bg-slate-50/50 rounded-2xl border border-slate-150 p-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Budget Range</span>
                    <span className="text-xs font-black text-slate-700">{selectedLead.buyerBudgetDisplay || 'Not Analyzed'}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Timeline Preference</span>
                    <span className="text-xs font-black text-slate-700">{selectedLead.buyerTimelineDisplay || 'Not Analyzed'}</span>
                  </div>
                  <div className="space-y-1 border-t border-slate-200/50 pt-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Intent Score</span>
                    <span className={clsx(
                      "text-xs font-black",
                      (selectedLead.intentScoreAtCreation ?? 0) >= 80 ? "text-emerald-600" : (selectedLead.intentScoreAtCreation ?? 0) >= 50 ? "text-amber-600" : "text-rose-600"
                    )}>{selectedLead.intentScoreAtCreation ?? 0} / 100</span>
                  </div>
                  <div className="space-y-1 border-t border-slate-200/50 pt-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Phone & WhatsApp</span>
                    <span className="text-xs font-black text-slate-700 font-mono">{selectedLead.buyer?.phone || 'Not provided'}</span>
                  </div>
                </div>
              </div>

              {/* Row 3: Target Listing Card */}
              {selectedLead.listing && (
                <div className="space-y-2">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target Real Estate Property</h3>
                  <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center border border-slate-200">
                        <Building className="w-6 h-6 text-slate-400" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-800 truncate group-hover:text-primary-600 transition-colors">
                          {selectedLead.listing.enTitle || selectedLead.listing.arTitle}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                          ShortID: {selectedLead.listing.shortId} • {selectedLead.listing.city}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div className="hidden sm:block">
                        <span className="text-xs text-slate-400 block font-semibold">Listing Price</span>
                        <span className="text-sm font-black text-slate-800">{selectedLead.listing.price.toLocaleString()} SAR</span>
                      </div>
                      <a 
                        href={`http://localhost:3000/en/listings/${selectedLead.listingId}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-2.5 bg-slate-50 border border-slate-200 text-slate-500 rounded-xl hover:bg-primary-50 hover:text-primary-600 hover:border-primary-100 transition-all shadow-sm"
                        title="Open Listing Details"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Row 4: Conversational Replay Timeline */}
              <div className="space-y-2.5 flex flex-col h-[400px] border-t border-slate-100 pt-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 shrink-0">
                  <MessageSquare className="w-3.5 h-3.5 text-primary-500" /> AI Conversational Replay Timeline
                </h3>
                
                {/* Chat Container window */}
                <div className="flex-1 overflow-y-auto bg-slate-900 border border-slate-850 rounded-2xl p-4 space-y-4 shadow-inner flex flex-col">
                  
                  {chatLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                      <Loader2 className="w-6 h-6 animate-spin text-primary-500 mb-2" />
                      <span className="text-xs font-medium">Reconstructing chat transcript...</span>
                    </div>
                  ) : chatHistory.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-2">
                      <AlertCircle className="w-8 h-8 text-slate-600 stroke-[1]" />
                      <span className="text-xs font-semibold">No conversational history recorded</span>
                      <p className="text-[10px] text-slate-600 max-w-[250px] text-center font-medium">This lead might have been generated without chat qualification metadata.</p>
                    </div>
                  ) : (
                    <>
                      {/* Qualification initialized badge */}
                      <div className="self-center bg-slate-800/80 border border-slate-700/50 rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-wider text-slate-400 shadow-sm shrink-0">
                        AI Session Initialized
                      </div>

                      {chatHistory.map((msg) => {
                        const isAssistant = msg.sender === 'ASSISTANT';
                        return (
                          <div 
                            key={msg.id} 
                            className={clsx(
                              "flex flex-col max-w-[80%] rounded-2xl p-3.5 shadow-sm text-xs font-medium leading-relaxed transition-all",
                              isAssistant 
                                ? "self-start bg-slate-800 border border-slate-700 text-slate-100 rounded-tl-none"
                                : "self-end bg-gradient-to-r from-primary-600 to-indigo-600 text-white rounded-tr-none"
                            )}
                          >
                            <span className="text-[10px] font-black uppercase tracking-wider mb-1.5 opacity-60 block">
                              {isAssistant ? 'AI Assistant' : 'Buyer'}
                            </span>
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                            <span className="text-[8px] font-bold block mt-2 text-right opacity-40">
                              {new Date(msg.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        );
                      })}

                      {selectedLead.isQualified && (
                        <div className="self-center bg-gradient-to-r from-violet-600/20 to-indigo-600/20 border border-indigo-500/20 rounded-full px-3.5 py-1 text-[9px] font-black uppercase tracking-wider text-indigo-300 shadow-sm shrink-0 flex items-center gap-1.5 mt-2 animate-pulse">
                          <Sparkles className="w-3.5 h-3.5 text-violet-400" /> AI Pipeline Completed: Lead Qualified
                        </div>
                      )}
                    </>
                  )}
                  
                </div>
              </div>

            </div>

            {/* Quick action status footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="text-xs font-bold text-slate-500">
                Update Lead Stage:
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={statusUpdating === selectedLead.id}
                  onClick={() => handleUpdateStatus(selectedLead.id, 'CLOSED_LOST')}
                  className={clsx(
                    "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all",
                    selectedLead.status === 'CLOSED_LOST'
                      ? "bg-rose-50 border-rose-200 text-rose-600 font-bold shadow-sm"
                      : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
                  )}
                >
                  Lost
                </button>
                <button
                  disabled={statusUpdating === selectedLead.id}
                  onClick={() => handleUpdateStatus(selectedLead.id, 'CONTACTED')}
                  className={clsx(
                    "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all",
                    selectedLead.status === 'CONTACTED'
                      ? "bg-amber-50 border-amber-200 text-amber-600 font-bold shadow-sm"
                      : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
                  )}
                >
                  Contacted
                </button>
                <button
                  disabled={statusUpdating === selectedLead.id}
                  onClick={() => handleUpdateStatus(selectedLead.id, 'CLOSED_WON')}
                  className={clsx(
                    "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all",
                    selectedLead.status === 'CLOSED_WON'
                      ? "bg-emerald-50 border-emerald-200 text-emerald-600 font-bold shadow-sm shadow-emerald-50"
                      : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
                  )}
                >
                  Won
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
