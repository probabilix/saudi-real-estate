'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { crmApi, WebsiteLeadDetail, CrmNote, CrmActivity, CrmFollowup, WEBSITE_LEAD_STATUSES, CrmAgent, CrmProjectUnit } from '@/lib/api';
import { CrmTopBar } from '@/components/CrmSidebar';
import { useCrmAuth } from '@/hooks/use-crm-auth';
import {
  ArrowLeft, Sparkles, MessageSquare, Phone, Mail, Building2,
  Plus, Calendar, CheckCircle2, Loader2, ExternalLink,
  Clock, User, RefreshCw, MessageCircle, Check, Search, Edit2, ChevronDown,
} from 'lucide-react';
import clsx from 'clsx';

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000';

function ActivityIcon({ type }: { type: string }) {
  const icons: Record<string, React.ReactNode> = {
    STATUS_CHANGE: <RefreshCw className="w-3 h-3" />,
    NOTE_ADDED: <MessageSquare className="w-3 h-3" />,
    FOLLOWUP_SCHEDULED: <Calendar className="w-3 h-3" />,
    FOLLOWUP_COMPLETED: <CheckCircle2 className="w-3 h-3" />,
    WHATSAPP_CONTACT: <MessageCircle className="w-3 h-3" />,
    ASSIGNED: <User className="w-3 h-3" />,
  };
  return icons[type] ?? <Clock className="w-3 h-3" />;
}

function getWebsiteStatusLabel(status: string): string {
  const cfg = WEBSITE_LEAD_STATUSES.find(s => s.key === status);
  return cfg?.label ?? status;
}

function activityLabel(a: CrmActivity): string {
  switch (a.activityType) {
    case 'STATUS_CHANGE': {
      const from = (a.metadata as any)?.from;
      const to = (a.metadata as any)?.to;
      return `Status: ${getWebsiteStatusLabel(from)} → ${getWebsiteStatusLabel(to)}`;
    }
    case 'NOTE_ADDED': return 'Note added';
    case 'FOLLOWUP_SCHEDULED': return `Follow-up scheduled for ${new Date((a.metadata as any)?.scheduledAt).toLocaleDateString()}`;
    case 'FOLLOWUP_COMPLETED': return 'Follow-up marked complete';
    case 'WHATSAPP_CONTACT': return 'WhatsApp contact initiated';
    case 'ASSIGNED': return `Assigned to agent`;
    default: return a.activityType.replace(/_/g, ' ').toLowerCase();
  }
}

export default function WebsiteLeadDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { user, isAdmin } = useCrmAuth();
  const [detail, setDetail] = useState<WebsiteLeadDetail | null>(null);
  const [agents, setAgents] = useState<CrmAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [showFollowup, setShowFollowup] = useState(false);
  const [fuDate, setFuDate] = useState('');
  const [fuNote, setFuNote] = useState('');
  const [addingFu, setAddingFu] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [units, setUnits] = useState<CrmProjectUnit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [chatView, setChatView] = useState<'listing' | 'project'>('listing');
  
  // Searchable Agent Assignment States
  const [agentSearch, setAgentSearch] = useState('');
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);

  // Editable Notes States
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Refs for click outside
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const agentDropdownRef = useRef<HTMLDivElement>(null);

  async function load() {
    setLoading(true);
    const [res, agentRes] = await Promise.all([
      crmApi.getWebsiteLead(id),
      isAdmin ? crmApi.getAgents() : Promise.resolve({ success: true, data: [] }),
    ]);
    if (res.success && res.data) {
      setDetail(res.data);
      if (res.data.listing) {
        setLoadingUnits(true);
        try {
          const uRes = await crmApi.getListingUnits(res.data.listing.id);
          if (uRes.success && uRes.data) {
            setUnits(uRes.data);
          }
        } catch (e) {
          console.error('Failed to load project units', e);
        } finally {
          setLoadingUnits(false);
        }
      }
    }
    if (agentRes.success && agentRes.data) setAgents(agentRes.data as CrmAgent[]);
    setLoading(false);
  }

  async function handleUnitStatusChange(unitId: string, newStatus: string) {
    if (!detail?.listing) return;
    try {
      const res = await crmApi.updateListingUnit(detail.listing.id, unitId, { status: newStatus });
      if (res.success) {
        setUnits(prev => prev.map(u => u.id === unitId ? { ...u, status: newStatus } : u));
      }
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => { load(); }, [id]);

  // Click outside to close dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      
      if (agentDropdownRef.current && !agentDropdownRef.current.contains(target)) {
        setShowAgentDropdown(false);
      }

      if (statusDropdownRef.current && !statusDropdownRef.current.contains(target)) {
        setShowStatusDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  async function handleStatusChange(status: string) {
    setUpdatingStatus(true);
    await crmApi.updateWebsiteLeadStatus(id, status);
    await load();
    setUpdatingStatus(false);
  }

  async function handleAddNote() {
    if (!noteText.trim()) return;
    setAddingNote(true);
    await crmApi.addWebsiteLeadNote(id, noteText);
    setNoteText('');
    await load();
    setAddingNote(false);
  }

  async function handleAddFollowup() {
    if (!fuDate) return;
    setAddingFu(true);
    await crmApi.addWebsiteLeadFollowup(id, fuDate, fuNote || undefined);
    setFuDate(''); setFuNote(''); setShowFollowup(false);
    await load();
    setAddingFu(false);
  }

  async function handleWhatsapp(phone: string) {
    const msg = encodeURIComponent('Hello, I noticed your interest in one of our properties. How can I assist you?');
    window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${msg}`, '_blank');
    await crmApi.logWebsiteLeadWhatsapp(id);
    await load();
  }

  async function completeFollowup(fuId: string) {
    await crmApi.completeFollowup(fuId);
    await load();
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
    </div>
  );

  if (!detail) return (
    <div className="flex-1 flex items-center justify-center text-surface-400">Lead not found</div>
  );

  const { lead, listing, buyer, agent, chatHistory, notes, activities, followups } = detail;
  const score = buyer?.intentScore ?? 0;
  
  const getScoreColor = (val: number) => {
    if (val >= 80) return '#8b5cf6'; // Purple (Priority)
    if (val >= 60) return '#10b981'; // Green (Hot)
    if (val >= 30) return '#f59e0b'; // Amber (Warm)
    return '#ef4444'; // Red (Cold)
  };

  const getScoreLabel = (val: number) => {
    if (val >= 80) return 'Priority Lead';
    if (val >= 60) return 'Hot Lead';
    if (val >= 30) return 'Warm Lead';
    return 'Cold Lead';
  };

  const scoreColor = getScoreColor(score);
  const isPurpleGlow = score >= 80;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <CrmTopBar title="Website Lead Detail" subtitle="AI-qualified platform inquiry" />

      <div className="flex-1 overflow-y-auto p-6">
        {/* Back */}
        <button onClick={() => router.back()} className="btn-ghost text-xs mb-4 gap-1.5">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Website Leads
        </button>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
          {/* Left pane — Contact & Intel */}
          <div className="xl:col-span-2 space-y-4">
            {/* Contact Card */}
            <div className="crm-card p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center shrink-0">
                    <User className="w-6 h-6 text-primary-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-surface-800">{buyer?.name || 'Anonymous Visitor'}</span>
                      {lead.isQualified && (
                        <span className="badge badge-gold gap-1 text-[10px]">
                          <Sparkles className="w-2.5 h-2.5" /> AI Qualified
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-surface-400 mt-0.5">Session: {buyer?.sessionId?.slice(0, 12)}…</div>
                    {buyer?.email && (
                      <div className="flex items-center gap-1.5 text-xs text-surface-500 mt-1.5">
                        <Mail className="w-3.5 h-3.5 text-surface-400" />
                        <a href={`mailto:${buyer.email}`} className="hover:underline">{buyer.email}</a>
                      </div>
                    )}
                    {buyer?.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-surface-500 mt-1">
                        <Phone className="w-3.5 h-3.5 text-surface-400" />
                        <a href={`tel:${buyer.phone}`} className="hover:underline">{buyer.phone}</a>
                      </div>
                    )}
                  </div>
                </div>

              {/* AI Intent Score Ring */}
              <div className="flex items-center gap-4 p-3 bg-surface-50 rounded-xl">
                <div className={clsx(
                  "relative w-14 h-14 shrink-0 rounded-full flex items-center justify-center bg-white",
                  isPurpleGlow && "shadow-[0_0_12px_rgba(139,92,246,0.6)] border border-purple-300"
                )}>
                  <svg viewBox="0 0 56 56" className="w-14 h-14 -rotate-90 absolute inset-0">
                    <circle cx="28" cy="28" r="22" fill="none" stroke="#e2e8f0" strokeWidth="6" />
                    <circle cx="28" cy="28" r="22" fill="none" stroke={scoreColor} strokeWidth="6"
                      strokeDasharray={`${2 * Math.PI * 22}`}
                      strokeDashoffset={`${2 * Math.PI * 22 * (1 - score / 100)}`}
                      strokeLinecap="round" />
                  </svg>
                  <span className="text-sm font-black relative z-10" style={{ color: scoreColor }}>{score}</span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-surface-800">AI Intent Score</span>
                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ backgroundColor: `${scoreColor}15`, color: scoreColor }}>
                      {getScoreLabel(score)}
                    </span>
                  </div>
                  <div className="text-[10px] text-surface-400 mt-0.5 max-w-[160px] leading-relaxed">
                    {lead.aiSummary || buyer?.lastAiSummary || 'No AI summary available'}
                  </div>
                </div>
              </div>

              {/* Budget & Timeline */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-surface-50 rounded-xl">
                  <div className="text-[10px] text-surface-400 mb-0.5">Budget</div>
                  <div className="font-semibold text-surface-700">{lead.buyerBudgetDisplay ?? '—'}</div>
                </div>
                <div className="p-2.5 bg-surface-50 rounded-xl">
                  <div className="text-[10px] text-surface-400 mb-0.5">Timeline</div>
                  <div className="font-semibold text-surface-700">{lead.buyerTimelineDisplay ?? '—'}</div>
                </div>
              </div>

              {/* Buyer Search Profile Preferences */}
              <div className="p-4 bg-surface-50/50 border border-surface-200 rounded-2xl space-y-3">
                <div className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Buyer Search Profile</div>
                <div className="space-y-2">
                  {listing?.projectId && (listing as any).project && (
                    <div className="flex justify-between items-center text-xs pb-1.5 border-b border-surface-200/50">
                      <span className="text-surface-500 font-medium">Project Interest</span>
                      <span className="font-bold text-primary-600">{(listing as any).project.nameEn}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-surface-500">Budget Range</span>
                    <span className="font-medium text-surface-800">
                      {buyer?.budgetMin || buyer?.budgetMax
                        ? `${buyer.budgetMin?.toLocaleString() ?? 0} - ${buyer.budgetMax?.toLocaleString() ?? '∞'} SAR`
                        : 'Not specified'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-surface-500">City Preference</span>
                    <span className="font-medium text-surface-800">{buyer?.cityPreference || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-surface-500">District Preference</span>
                    <span className="font-medium text-surface-800">{(buyer as any)?.districtPreference || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-surface-500">Completion Status</span>
                    <span className="font-medium text-surface-800">
                      {(buyer as any)?.completionStatusPreference === 'READY' ? 'Ready to Move' : 
                       (buyer as any)?.completionStatusPreference === 'OFF_PLAN' ? 'Open to Off-Plan' :
                       (buyer as any)?.completionStatusPreference === 'UNDER_CONSTRUCTION' ? 'Under Construction' : 'Not specified'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-surface-500">Timeline</span>
                    <span className="font-medium text-surface-800">
                      {buyer?.timelineMonths ? `${buyer.timelineMonths} months` : 'Not specified'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-surface-500">Buying Purpose</span>
                    <span className="font-medium text-surface-800 capitalize">
                      {buyer?.purpose?.replace(/_/g, ' ') || 'Not specified'}
                    </span>
                  </div>
                  <div className="flex justify-between items-start text-xs gap-4">
                    <span className="text-surface-500 shrink-0">Property Types</span>
                    <span className="font-medium text-surface-800 text-right">
                      {buyer?.propertyType && buyer.propertyType.length > 0
                        ? buyer.propertyType.map((t: string) => t.toLowerCase().replace(/_/g, ' ')).join(', ')
                        : 'Not specified'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status dropdown */}
              <div className="relative" id="status-dropdown-container" ref={statusDropdownRef}>
                <label className="crm-label">Pipeline Status</label>
                <button
                  type="button"
                  disabled={updatingStatus}
                  onClick={() => setShowStatusDropdown(p => !p)}
                  className="crm-input text-xs flex items-center justify-between text-left bg-white"
                >
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: WEBSITE_LEAD_STATUSES.find(s => s.key === lead.status)?.color }} />
                    <span>{WEBSITE_LEAD_STATUSES.find(s => s.key === lead.status)?.label || lead.status}</span>
                  </span>
                  <ChevronDown className="w-4 h-4 text-surface-400 shrink-0" />
                </button>
                {showStatusDropdown && (
                  <div className="absolute left-0 right-0 mt-1.5 p-1 bg-white border border-surface-200 rounded-xl shadow-card z-50 max-h-60 overflow-y-auto space-y-0.5">
                    {WEBSITE_LEAD_STATUSES.map(s => (
                      <button
                        key={s.key}
                        type="button"
                        onClick={async () => {
                          await handleStatusChange(s.key);
                          setShowStatusDropdown(false);
                        }}
                        className={clsx(
                          "w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-surface-50 transition-colors flex items-center gap-2",
                          lead.status === s.key && "text-primary-600 font-bold bg-primary-50"
                        )}
                      >
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                        <span className="flex-1 text-left">{s.label}</span>
                        {lead.status === s.key && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Agent assignment (admin only) */}
              {isAdmin && (
                <div className="relative" id="agent-dropdown-container" ref={agentDropdownRef}>
                  <label className="crm-label">Assigned Agent</label>
                  <button
                    type="button"
                    onClick={() => setShowAgentDropdown(p => !p)}
                    className="crm-input text-xs flex items-center justify-between text-left bg-white"
                  >
                    <span>{agent ? (agent.name || agent.email) : 'Unassigned'}</span>
                    <ChevronDown className="w-4 h-4 text-surface-400 shrink-0" />
                  </button>
                  {showAgentDropdown && (
                    <div className="absolute left-0 right-0 mt-1.5 p-2 bg-white border border-surface-200 rounded-xl shadow-card z-50 space-y-2">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-surface-400" />
                        <input
                          type="text"
                          placeholder="Search agents..."
                          value={agentSearch}
                          onChange={e => setAgentSearch(e.target.value)}
                          className="w-full pl-8 pr-2.5 py-1.5 bg-surface-50 border border-surface-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                        <button
                          type="button"
                          onClick={async () => {
                            await crmApi.assignWebsiteLead(id, '');
                            setShowAgentDropdown(false);
                            setAgentSearch('');
                            await load();
                          }}
                          className={clsx(
                            "w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-surface-50 transition-colors flex items-center justify-between",
                            !agent && "text-primary-600 font-bold bg-primary-50"
                          )}
                        >
                          <span>Unassigned</span>
                          {!agent && <Check className="w-3.5 h-3.5" />}
                        </button>
                        {agents
                          .filter(a => {
                            const term = agentSearch.toLowerCase();
                            return (a.name?.toLowerCase().includes(term) || a.email.toLowerCase().includes(term));
                          })
                          .map(a => {
                            const isSelected = agent?.id === a.id;
                            return (
                              <button
                                key={a.id}
                                type="button"
                                onClick={async () => {
                                  await crmApi.assignWebsiteLead(id, a.id);
                                  setShowAgentDropdown(false);
                                  setAgentSearch('');
                                  await load();
                                }}
                                className={clsx(
                                  "w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-surface-50 transition-colors flex items-center justify-between",
                                  isSelected && "text-primary-600 font-bold bg-primary-50"
                                )}
                              >
                                <span className="truncate">{a.name ?? a.email}</span>
                                {isSelected && <Check className="w-3.5 h-3.5" />}
                              </button>
                            );
                          })}
                        {agents.filter(a => {
                          const term = agentSearch.toLowerCase();
                          return (a.name?.toLowerCase().includes(term) || a.email.toLowerCase().includes(term));
                        }).length === 0 && (
                          <div className="text-center py-2 text-[10px] text-surface-400">No agents found</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Call, Email, WhatsApp CTA Group */}
              <div className="grid grid-cols-3 gap-2 w-full pt-2">
                {buyer?.phone ? (
                  <a
                    href={`tel:${buyer.phone}`}
                    className="flex flex-col items-center justify-center gap-1 py-2 bg-surface-50 border border-surface-200 text-surface-700 hover:bg-surface-100 hover:border-surface-300 text-[10px] font-bold rounded-xl transition-all cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5 text-primary-500" />
                    <span>Call</span>
                  </a>
                ) : (
                  <button
                    disabled
                    className="flex flex-col items-center justify-center gap-1 py-2 bg-surface-50 border border-surface-100 text-surface-300 text-[10px] font-bold rounded-xl cursor-not-allowed"
                  >
                    <Phone className="w-3.5 h-3.5 text-surface-300" />
                    <span>Call</span>
                  </button>
                )}

                {buyer?.email ? (
                  <a
                    href={`mailto:${buyer.email}`}
                    className="flex flex-col items-center justify-center gap-1 py-2 bg-surface-50 border border-surface-200 text-surface-700 hover:bg-surface-100 hover:border-surface-300 text-[10px] font-bold rounded-xl transition-all cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5 text-primary-500" />
                    <span>Email</span>
                  </a>
                ) : (
                  <button
                    disabled
                    className="flex flex-col items-center justify-center gap-1 py-2 bg-surface-50 border border-surface-100 text-surface-300 text-[10px] font-bold rounded-xl cursor-not-allowed"
                  >
                    <Mail className="w-3.5 h-3.5 text-surface-300" />
                    <span>Email</span>
                  </button>
                )}

                {buyer?.phone ? (
                  <button
                    onClick={() => handleWhatsapp(buyer.phone!)}
                    className="flex flex-col items-center justify-center gap-1 py-2 bg-[#25D366] hover:bg-[#1da851] text-white text-[10px] font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-white" />
                    <span>WhatsApp</span>
                  </button>
                ) : (
                  <button
                    disabled
                    className="flex flex-col items-center justify-center gap-1 py-2 bg-surface-50 border border-surface-100 text-surface-300 text-[10px] font-bold rounded-xl cursor-not-allowed"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-surface-300" />
                    <span>WhatsApp</span>
                  </button>
                )}
              </div>
            </div>

            {/* Linked Property */}
            {listing && (
              <div className="crm-card p-4">
                <div className="text-xs font-bold text-surface-600 uppercase tracking-wide mb-3">Linked Property</div>
                <div className="flex gap-3 items-start">
                  {listing.photos?.[0] && (
                    <img src={listing.photos[0]} className="w-16 h-16 rounded-xl object-cover shrink-0" alt="" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-surface-800 leading-snug">{listing.enTitle || listing.arTitle}</div>
                    <div className="text-[10px] text-surface-400 mt-1">{listing.city} {listing.district ? `· ${listing.district}` : ''}</div>
                    <div className="text-xs font-bold text-primary-600 mt-1">{listing.price?.toLocaleString()} SAR</div>
                    <a
                      href={`${WEB_URL}/en/listings/${listing.id}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-[10px] text-primary-500 hover:underline mt-1"
                    >
                      View listing <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Inventory Availability */}
            {listing && units.length > 0 && (
              <div className="crm-card p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-surface-600 uppercase tracking-wide flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-primary-500" />
                    Unit Availability Matrix
                  </div>
                  <span className="text-[10px] bg-primary-50 text-primary-600 font-bold px-2 py-0.5 rounded-full">
                    {units.filter(u => u.status === 'AVAILABLE').length} Available
                  </span>
                </div>

                {loadingUnits ? (
                  <div className="flex items-center gap-2 py-2 text-xs text-surface-500">
                    <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                    <span>Loading inventory...</span>
                  </div>
                ) : (
                  <div className="divide-y divide-surface-100 max-h-72 overflow-y-auto pr-1">
                    {(() => {
                      const unitsByFloor = units.reduce((acc: Record<number, CrmProjectUnit[]>, unit) => {
                        if (!acc[unit.floor]) acc[unit.floor] = [];
                        acc[unit.floor].push(unit);
                        return acc;
                      }, {});
                      const sortedFloors = Object.keys(unitsByFloor).map(Number).sort((a, b) => b - a);

                      return sortedFloors.map(floor => (
                        <div key={floor} className="py-2.5 first:pt-0 last:pb-0">
                          <div className="text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-2">
                            Floor {floor}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {unitsByFloor[floor].map(unit => (
                              <div key={unit.id} className={clsx(
                                "pl-2 pr-1.5 py-1 rounded-xl border flex items-center gap-1.5 text-[10px] font-bold transition-all",
                                unit.status === 'AVAILABLE' ? "bg-emerald-50/70 border-emerald-200 text-emerald-800" :
                                unit.status === 'RESERVED' ? "bg-amber-50/70 border-amber-200 text-amber-800" :
                                "bg-red-50/70 border-red-200 text-red-800"
                              )}>
                                <span>Unit {unit.unitNumber}</span>
                                {unit.price && (
                                  <span className="opacity-75 font-medium">SAR {unit.price.toLocaleString()}</span>
                                )}
                                
                                <div className="border-l border-current/25 pl-1.5 ml-0.5 select-none">
                                  <select
                                    value={unit.status}
                                    onChange={(e) => handleUnitStatusChange(unit.id, e.target.value)}
                                    className="bg-transparent border-none p-0 text-[9px] font-black focus:ring-0 cursor-pointer outline-none w-18 text-current"
                                  >
                                    <option value="AVAILABLE">Available</option>
                                    <option value="RESERVED">Reserved</option>
                                    <option value="SOLD">Sold</option>
                                  </select>
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
            )}

            {/* Follow-ups */}
            <div className="crm-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-bold text-surface-600 uppercase tracking-wide">Follow-ups</div>
                <button onClick={() => setShowFollowup(p => !p)} className="btn-ghost text-xs gap-1 py-1">
                  <Plus className="w-3 h-3" /> Schedule
                </button>
              </div>
              {showFollowup && (
                <div className="bg-surface-50 rounded-xl p-3 mb-3 space-y-2">
                  <input type="datetime-local" value={fuDate} onChange={e => setFuDate(e.target.value)} className="crm-input text-xs" />
                  <input type="text" placeholder="Note (optional)" value={fuNote} onChange={e => setFuNote(e.target.value)} className="crm-input text-xs" />
                  <div className="flex gap-2">
                    <button onClick={handleAddFollowup} disabled={addingFu || !fuDate} className="btn-primary text-xs py-1.5 flex-1">
                      {addingFu ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : 'Save'}
                    </button>
                    <button onClick={() => setShowFollowup(false)} className="btn-secondary text-xs py-1.5">Cancel</button>
                  </div>
                </div>
              )}
              {followups.length === 0 ? (
                <p className="text-xs text-surface-400 text-center py-2">No follow-ups scheduled</p>
              ) : (
                <div className="space-y-2">
                  {followups.map(fu => (
                    <div key={fu.id} className={clsx('flex items-start gap-2.5 p-2.5 rounded-xl', fu.isCompleted ? 'opacity-50 bg-surface-50' : 'bg-amber-50 border border-amber-100')}>
                      <button onClick={() => completeFollowup(fu.id)} disabled={fu.isCompleted} className="shrink-0 mt-0.5">
                        <CheckCircle2 className={clsx('w-4 h-4', fu.isCompleted ? 'text-emerald-500' : 'text-surface-300 hover:text-emerald-400')} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-surface-700">{fu.note ?? 'Follow-up task'}</div>
                        <div className="text-[10px] text-surface-400 mt-0.5">{new Date(fu.scheduledAt).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right pane — Chat, Notes, Timeline */}
          <div className="xl:col-span-3 space-y-4">
            {/* AI Chat History */}
            <div className="crm-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-surface-100 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary-500" />
                  <span className="text-sm font-bold text-surface-800">AI Chat History</span>
                </div>
                {listing?.projectId && (detail as any).projectChatHistory && (
                  <div className="flex bg-surface-100 p-0.5 rounded-lg border border-surface-200">
                    <button
                      onClick={() => setChatView('listing')}
                      className={clsx(
                        "px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all",
                        chatView === 'listing' ? "bg-white text-primary-700 shadow-sm" : "text-surface-500 hover:text-surface-800"
                      )}
                    >
                      This Listing
                    </button>
                    <button
                      onClick={() => setChatView('project')}
                      className={clsx(
                        "px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all",
                        chatView === 'project' ? "bg-white text-primary-700 shadow-sm" : "text-surface-500 hover:text-surface-800"
                      )}
                    >
                      Project Journey
                    </button>
                  </div>
                )}
                <span className="text-[10px] text-surface-400">
                  {chatView === 'listing' ? chatHistory.length : ((detail as any).projectChatHistory || []).length} messages
                </span>
              </div>
              <div className="max-h-[350px] overflow-y-auto p-4 space-y-2.5 bg-surface-50/50">
                {(() => {
                  const currentHistory = chatView === 'listing' ? chatHistory : ((detail as any).projectChatHistory || []);
                  if (currentHistory.length === 0) {
                    return <p className="text-xs text-surface-400 text-center py-4">No chat history available</p>;
                  }
                  return currentHistory.map((msg: any) => (
                    <div key={msg.id} className={clsx('flex', msg.sender === 'USER' ? 'justify-end' : 'justify-start')}>
                      <div className={clsx(
                        'max-w-[75%] px-3.5 py-2 rounded-2xl text-xs leading-relaxed',
                        msg.sender === 'USER'
                          ? 'bg-primary-600 text-white rounded-br-md'
                          : 'bg-white border border-surface-200 text-surface-700 rounded-bl-md'
                      )}>
                        {msg.content}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Notes */}
            <div className="crm-card p-5">
              <div className="text-sm font-bold text-surface-800 mb-3">Notes</div>
              <div className="flex gap-2 mb-4">
                <textarea
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder="Add a note about this lead..."
                  rows={2}
                  className="crm-input text-xs resize-none flex-1"
                />
                <button onClick={handleAddNote} disabled={addingNote || !noteText.trim()} className="btn-primary text-xs px-3 self-end shrink-0">
                  {addingNote ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                </button>
              </div>
              {notes.length === 0 ? (
                <p className="text-xs text-surface-400">No notes yet</p>
              ) : (
                <div className="space-y-2.5">
                  {notes.map(n => {
                    const isEditing = editingNoteId === n.id;
                    const canEdit = isAdmin || user?.id === n.agentId || user?.id === lead.brokerId;
                    return (
                      <div key={n.id} className="p-3 bg-surface-50 rounded-xl space-y-2">
                        {isEditing ? (
                          <div className="space-y-2">
                            <textarea
                              value={editingNoteText}
                              onChange={e => setEditingNoteText(e.target.value)}
                              rows={2}
                              className="crm-input text-xs resize-none"
                            />
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={async () => {
                                  if (!editingNoteText.trim()) return;
                                  setSavingNote(true);
                                  await crmApi.updateNote(n.id, editingNoteText);
                                  setEditingNoteId(null);
                                  setEditingNoteText('');
                                  await load();
                                  setSavingNote(false);
                                }}
                                disabled={savingNote || !editingNoteText.trim()}
                                className="btn-primary text-[10px] py-1 px-2.5"
                              >
                                {savingNote ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                onClick={() => {
                                  setEditingNoteId(null);
                                  setEditingNoteText('');
                                }}
                                className="btn-secondary text-[10px] py-1 px-2.5"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between items-start gap-2">
                              <p className="text-xs text-surface-700 leading-relaxed whitespace-pre-wrap">{n.content}</p>
                              {canEdit && (
                                <button
                                  onClick={() => {
                                    setEditingNoteId(n.id);
                                    setEditingNoteText(n.content);
                                  }}
                                  className="text-surface-400 hover:text-primary-600 transition-colors p-0.5 shrink-0"
                                  title="Edit note"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                            <p className="text-[10px] text-surface-400">{new Date(n.createdAt).toLocaleString()}</p>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Activity Timeline */}
            <div className="crm-card p-5">
              <div className="text-sm font-bold text-surface-800 mb-4">Activity Timeline</div>
              {activities.length === 0 ? (
                <p className="text-xs text-surface-400">No activity yet</p>
              ) : (
                <div className="relative pl-5">
                  <div className="absolute left-[7px] top-2 bottom-2 w-px bg-surface-200" />
                  <div className="space-y-4">
                    {activities.map(a => (
                      <div key={a.id} className="relative flex items-start gap-3">
                        <div className="absolute -left-5 w-3.5 h-3.5 rounded-full bg-white border-2 border-primary-400 flex items-center justify-center shrink-0 mt-0.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-surface-700">{activityLabel(a)}</p>
                          <p className="text-[10px] text-surface-400 mt-0.5">{new Date(a.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
