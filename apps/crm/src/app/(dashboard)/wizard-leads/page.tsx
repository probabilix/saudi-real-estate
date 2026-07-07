'use client';
import { useEffect, useState, useCallback } from 'react';
import { crmApi } from '@/lib/api';
import { CrmTopBar } from '@/components/CrmSidebar';
import { useCrmAuth } from '@/hooks/use-crm-auth';
import { Search, Loader2, RefreshCw, ChevronLeft, ChevronRight, ShieldAlert, Users, CheckCircle, Clock, Tag, Mail, Phone, Globe, Plus, MessageSquare } from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

type WizardLeadStatus = 'in_progress' | 'completed' | 'abandoned';
type ResultKey = 'resident' | 'nonresident-id' | 'nonresident-noid';

interface LeadNote {
  id: string;
  content: string;
  createdAt: string;
}

interface WizardLead {
  id: string;
  wizardId: string;
  status: WizardLeadStatus;
  leadStage: string;
  fullName: string;
  email: string;
  phone: string;
  citizenship: string;
  consent: boolean;
  answers: Record<string, string>;
  resultKey: ResultKey | null;
  leadTags: string[];
  source: string;
  notes?: LeadNote[];
  crmSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const COUNTRY_MAP: Record<string, string> = {
  'SA': 'Saudi Arabia 🇸🇦',
  'AE': 'United Arab Emirates 🇦🇪',
  'KW': 'Kuwait 🇰🇼',
  'QA': 'Qatar 🇶🇦',
  'BH': 'Bahrain 🇧🇭',
  'OM': 'Oman 🇴🇲',
  'US': 'United States 🇺🇸',
  'GB': 'United Kingdom 🇬🇧',
  'EG': 'Egypt 🇪🇬',
  'JO': 'Jordan 🇯🇴',
  'LB': 'Lebanon 🇱🇧',
  'SY': 'Syria 🇸🇾',
  'IQ': 'Iraq 🇮🇶',
  'YE': 'Yemen 🇾🇪',
  'SD': 'Sudan 🇸🇩',
  'MA': 'Morocco 🇲🇦',
  'DZ': 'Algeria 🇩🇿',
  'TN': 'Tunisia 🇹🇳',
  'LY': 'Libya 🇱🇾',
  'PS': 'Palestine 🇵🇸',
  'PK': 'Pakistan 🇵🇰',
  'IN': 'India 🇮🇳',
  'TR': 'Turkey 🇹🇷',
  'CA': 'Canada 🇨🇦',
  'AU': 'Australia 🇦🇺',
  'DE': 'Germany 🇩🇪',
  'FR': 'France 🇫🇷',
  'IE': 'Ireland 🇮🇪',
  'NL': 'Netherlands 🇳🇱',
  'CH': 'Switzerland 🇨🇭',
  'SE': 'Sweden 🇸🇪',
  'MY': 'Malaysia 🇲🇾',
  'SG': 'Singapore 🇸🇬'
};

const getCountryName = (code: string) => {
  if (!code) return '—';
  return COUNTRY_MAP[code.toUpperCase()] || code;
};

const STATUS_CFG: Record<WizardLeadStatus, { label: string; color: string; icon: typeof Clock }> = {
  in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-700 border-amber-200',   icon: Clock },
  completed:   { label: 'Completed',   color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle },
  abandoned:   { label: 'Abandoned',   color: 'bg-slate-100 text-slate-500 border-slate-200',   icon: ShieldAlert },
};

const STAGE_CFG: Record<string, { label: string; color: string }> = {
  'NEW':               { label: 'New', color: 'border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100/50' },
  'CONTACTED':         { label: 'Contacted', color: 'border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100/50' },
  'ATTEMPTED_CONTACT': { label: 'Attempted Contact', color: 'border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100/50' },
  'FOLLOW_UP':         { label: 'Follow Up', color: 'border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100/50' },
  'CLOSED_WON':        { label: 'Closed Won', color: 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100/50' },
  'CLOSED_LOST':       { label: 'Closed Lost', color: 'border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100/50' },
};

const RESULT_CFG: Record<ResultKey, { label: string; color: string }> = {
  'resident':         { label: 'Resident (Inside KSA)',    color: 'bg-blue-100 text-blue-700 border-blue-200' },
  'nonresident-id':   { label: 'Non-resident · Has Dig.ID', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  'nonresident-noid': { label: 'Non-resident · Needs Dig.ID', color: 'bg-orange-100 text-orange-700 border-orange-200' },
};

function StatusBadge({ status }: { status: WizardLeadStatus }) {
  const cfg = STATUS_CFG[status];
  const Icon = cfg.icon;
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border', cfg.color)}>
      <Icon className="w-3 h-3" />{cfg.label}
    </span>
  );
}

function ResultBadge({ resultKey }: { resultKey: ResultKey | null }) {
  if (!resultKey) return <span className="text-surface-400 text-xs">—</span>;
  const cfg = RESULT_CFG[resultKey];
  return (
    <span className={clsx('inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border', cfg.color)}>
      {cfg.label}
    </span>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: any; label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-surface-100 last:border-0">
      <Icon className="w-4 h-4 text-surface-400 mt-0.5 shrink-0" />
      <div>
        <div className="text-[10px] font-black uppercase tracking-wider text-surface-400">{label}</div>
        <div className="text-sm font-medium text-surface-800 mt-0.5 break-all">{value}</div>
      </div>
    </div>
  );
}

function ExpandedRow({ lead, onNoteAdded }: { lead: WizardLead; onNoteAdded: () => void }) {
  const [noteContent, setNoteContent] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim() || submittingNote) return;

    setSubmittingNote(true);
    const res = await crmApi.addWizardLeadNote(lead.id, noteContent);
    if (res.success) {
      setNoteContent('');
      onNoteAdded();
    }
    setSubmittingNote(false);
  };

  return (
    <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <td colSpan={8} className="p-0">
        <div className="bg-[#fafaf9] border-b border-surface-200 px-6 py-6 space-y-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl">
            {/* Contact */}
            <div className="bg-white rounded-2xl border border-surface-200 p-4 shadow-sm">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-surface-400 mb-3">Contact Info</h4>
              <DetailRow icon={Mail} label="Email" value={lead.email} />
              <DetailRow icon={Phone} label="Phone" value={lead.phone} />
              <DetailRow icon={Globe} label="Citizenship" value={getCountryName(lead.citizenship)} />
            </div>

            {/* Answers */}
            <div className="bg-white rounded-2xl border border-surface-200 p-4 shadow-sm">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-surface-400 mb-3">Wizard Answers</h4>
              {Object.keys(lead.answers || {}).length === 0 && (
                <p className="text-xs text-surface-400">No answers recorded yet</p>
              )}
              {Object.entries(lead.answers || {}).map(([key, val]) => (
                <div key={key} className="flex justify-between items-center py-1.5 border-b border-surface-100 last:border-0">
                  <span className="text-xs text-surface-500 font-medium capitalize">{key}</span>
                  <span className="text-xs font-bold text-surface-800 capitalize">{val}</span>
                </div>
              ))}
            </div>

            {/* Result & Tags */}
            <div className="bg-white rounded-2xl border border-surface-200 p-4 shadow-sm">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-surface-400 mb-3">Result & Tags</h4>
              <div className="mb-3">
                <ResultBadge resultKey={lead.resultKey} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(lead.leadTags || []).map(tag => (
                  <span key={tag} className="px-2 py-0.5 rounded-full bg-surface-100 text-[10px] font-bold text-surface-600 border border-surface-200">{tag}</span>
                ))}
                {(!lead.leadTags || lead.leadTags.length === 0) && (
                  <span className="text-xs text-surface-400">No tags</span>
                )}
              </div>
              <div className="mt-4 pt-3 border-t border-surface-100">
                <div className="text-[10px] text-surface-400 font-medium">Submitted {new Date(lead.createdAt).toLocaleDateString()}</div>
                {lead.crmSyncedAt && (
                  <div className="text-[10px] text-emerald-500 font-medium mt-0.5">CRM synced {new Date(lead.crmSyncedAt).toLocaleDateString()}</div>
                )}
              </div>
            </div>
          </div>

          {/* Follow-up Notes Section */}
          <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-sm max-w-4xl">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-surface-400 mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary-500" />
              Follow-up Notes
            </h4>
            
            {/* Note form */}
            <form onSubmit={handleAddNote} className="flex gap-2.5 mb-5">
              <input
                type="text"
                value={noteContent}
                onChange={e => setNoteContent(e.target.value)}
                placeholder="Type follow-up details here (e.g., 'Called, will verify Nafath status tomorrow')..."
                className="flex-1 px-4 h-10 rounded-xl border border-surface-200 text-sm focus:outline-none focus:border-primary-400 bg-surface-50 focus:bg-white transition-all"
              />
              <button
                type="submit"
                disabled={!noteContent.trim() || submittingNote}
                className="px-4 h-10 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Note
              </button>
            </form>

            {/* Note list */}
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {(!lead.notes || lead.notes.length === 0) ? (
                <p className="text-xs text-surface-400 italic">No follow-up notes yet. Write notes above to track progress.</p>
              ) : (
                lead.notes.map(note => (
                  <div key={note.id} className="bg-surface-50 p-3.5 rounded-xl border border-surface-100 flex justify-between items-start gap-4">
                    <p className="text-sm text-surface-700 leading-relaxed">{note.content}</p>
                    <span className="text-[10px] text-surface-400 font-bold whitespace-nowrap shrink-0">
                      {new Date(note.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </td>
    </motion.tr>
  );
}

export default function WizardLeadsPage() {
  const { isAdmin } = useCrmAuth();
  const [leads, setLeads] = useState<WizardLead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [filterResult, setFilterResult] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const LIMIT = 25;
  const totalPages = Math.ceil(total / LIMIT);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [filterStatus, filterStage, filterResult, debouncedSearch]);

  const load = useCallback(async () => {
    setLoading(true);
    const q = new URLSearchParams();
    if (filterStatus) q.set('status', filterStatus);
    if (filterStage) q.set('leadStage', filterStage);
    if (filterResult) q.set('resultKey', filterResult);
    if (debouncedSearch) q.set('search', debouncedSearch);
    q.set('page', String(page));
    q.set('limit', String(LIMIT));

    const res = await crmApi.request<{ leads: WizardLead[]; total: number; page: number }>(`/wizard/leads?${q}`);
    if (res.success && res.data) {
      setLeads(res.data.leads);
      setTotal(res.data.total);
    }
    setLoading(false);
  }, [page, filterStatus, filterStage, filterResult, debouncedSearch]);

  useEffect(() => { if (isAdmin) load(); }, [load, isAdmin]);

  if (!isAdmin) {
    return (
      <div className="flex-1 flex flex-col">
        <CrmTopBar title="Wizard Leads" subtitle="Eligibility form submissions" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <ShieldAlert className="w-10 h-10 text-red-400 mx-auto" />
            <h2 className="text-lg font-bold text-surface-800">Admin Access Required</h2>
            <p className="text-sm text-surface-500">Wizard leads are only accessible to administrators.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <CrmTopBar title="Wizard Leads" subtitle="Eligibility form submissions · Admin only" />

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Leads', value: total, icon: Users, color: 'text-primary-600' },
            { label: 'Completed', value: total > 0 ? leads.filter(l => l.status === 'completed').length : 0, icon: CheckCircle, color: 'text-emerald-600' },
            { label: 'Deals Won', value: total > 0 ? leads.filter(l => l.leadStage === 'CLOSED_WON').length : 0, icon: CheckCircle, color: 'text-blue-600' },
          ].map(stat => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-white border border-surface-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
                <div className={`w-9 h-9 rounded-xl bg-surface-50 flex items-center justify-center ${stat.color}`}>
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="text-xl font-black text-surface-800">{stat.value}</div>
                  <div className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">{stat.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="bg-white border border-surface-200 rounded-2xl p-4 flex flex-wrap items-center gap-3 shadow-sm">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 h-9 rounded-xl border border-surface-200 text-sm bg-surface-50 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              id="wizard-leads-search"
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="h-9 px-3 rounded-xl border border-surface-200 text-sm bg-surface-50 focus:outline-none focus:border-primary-400 text-surface-700"
            id="wizard-leads-status-filter"
          >
            <option value="">All Form Statuses</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="abandoned">Abandoned</option>
          </select>
          <select
            value={filterStage}
            onChange={e => setFilterStage(e.target.value)}
            className="h-9 px-3 rounded-xl border border-surface-200 text-sm bg-surface-50 focus:outline-none focus:border-primary-400 text-surface-700"
            id="wizard-leads-stage-filter"
          >
            <option value="">All Lead Stages</option>
            <option value="NEW">New</option>
            <option value="CONTACTED">Contacted</option>
            <option value="ATTEMPTED_CONTACT">Attempted Contact</option>
            <option value="FOLLOW_UP">Follow Up</option>
            <option value="CLOSED_WON">Closed Won</option>
            <option value="CLOSED_LOST">Closed Lost</option>
          </select>
          <select
            value={filterResult}
            onChange={e => setFilterResult(e.target.value)}
            className="h-9 px-3 rounded-xl border border-surface-200 text-sm bg-surface-50 focus:outline-none focus:border-primary-400 text-surface-700"
            id="wizard-leads-result-filter"
          >
            <option value="">All Results</option>
            <option value="resident">Resident</option>
            <option value="nonresident-id">Non-resident · Has ID</option>
            <option value="nonresident-noid">Non-resident · Needs ID</option>
          </select>
          <button
            onClick={() => load()}
            className="h-9 px-3 rounded-xl border border-surface-200 bg-surface-50 text-surface-600 hover:bg-surface-100 transition-colors flex items-center gap-1.5 text-sm"
            id="wizard-leads-refresh"
          >
            <RefreshCw className={clsx('w-3.5 h-3.5', loading && 'animate-spin')} />
            Refresh
          </button>
        </div>

        {/* Table */}
        <div className="bg-white border border-surface-200 rounded-2xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <Users className="w-8 h-8 text-surface-300 mx-auto" />
              <p className="text-surface-500 font-medium">No wizard leads found</p>
              <p className="text-surface-400 text-sm">Submissions from the eligibility wizard will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-100 bg-surface-50">
                    {['Name', 'Email', 'Citizenship', 'Form Status', 'Lead Stage', 'Result', 'Submitted'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-surface-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leads.map(lead => (
                    <>
                      <tr
                        key={lead.id}
                        onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
                        className={clsx(
                          'border-b border-surface-100 cursor-pointer transition-colors',
                          expandedId === lead.id ? 'bg-primary-50/40' : 'hover:bg-surface-50'
                        )}
                      >
                        <td className="px-4 py-3 font-semibold text-surface-800">{lead.fullName}</td>
                        <td className="px-4 py-3 text-surface-600">{lead.email}</td>
                        <td className="px-4 py-3 text-surface-600">{getCountryName(lead.citizenship)}</td>
                        <td className="px-4 py-3"><StatusBadge status={lead.status} /></td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={lead.leadStage || 'NEW'}
                            onChange={async (e) => {
                              const newStage = e.target.value;
                              await crmApi.updateWizardLeadStage(lead.id, newStage);
                              load(); // reload list
                            }}
                            className={clsx(
                              'h-7 px-2 py-0.5 rounded-full text-[11px] font-bold border outline-none bg-white cursor-pointer transition-colors shadow-sm',
                              (STAGE_CFG[lead.leadStage] || STAGE_CFG['NEW']).color
                            )}
                          >
                            <option value="NEW">New</option>
                            <option value="CONTACTED">Contacted</option>
                            <option value="ATTEMPTED_CONTACT">Attempted Contact</option>
                            <option value="FOLLOW_UP">Follow Up</option>
                            <option value="CLOSED_WON">Closed Won</option>
                            <option value="CLOSED_LOST">Closed Lost</option>
                          </select>
                        </td>
                        <td className="px-4 py-3"><ResultBadge resultKey={lead.resultKey} /></td>
                        <td className="px-4 py-3 text-surface-500 text-xs whitespace-nowrap">
                          {new Date(lead.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                      </tr>
                      <AnimatePresence>
                        {expandedId === lead.id && (
                          <ExpandedRow lead={lead} onNoteAdded={load} />
                        )}
                      </AnimatePresence>
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-surface-100 bg-surface-50">
              <span className="text-xs text-surface-500">
                Showing {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, total)} of {total}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-7 w-7 rounded-lg border border-[#e8ddd0] flex items-center justify-center text-surface-500 hover:bg-surface-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-bold text-surface-600">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="h-7 w-7 rounded-lg border border-[#e8ddd0] flex items-center justify-center text-surface-500 hover:bg-surface-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
