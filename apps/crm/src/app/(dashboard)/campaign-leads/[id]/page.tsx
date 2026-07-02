'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { crmApi, CampaignLeadDetail, CrmAgent, CRM_STAGES, CrmActivity, CrmFollowup, CrmProjectUnit } from '@/lib/api';
import { CrmTopBar } from '@/components/CrmSidebar';
import { useCrmAuth } from '@/hooks/use-crm-auth';
import SourceBadge from '@/components/SourceBadge';
import LeadScorePill from '@/components/LeadScorePill';
import {
  ArrowLeft, Phone, Mail, MapPin, Building2, MessageCircle,
  Plus, Calendar, CheckCircle2, Loader2, Trash2,
  RefreshCw, User, Clock, MessageSquare, Star,
  ChevronDown, Info, Check, Search, Edit2,
  Facebook, Instagram, ExternalLink
} from 'lucide-react';
import clsx from 'clsx';

function getCampaignStatusLabel(status: string): string {
  const cfg = CRM_STAGES.find(s => s.key === status);
  return cfg?.label ?? status;
}

function activityLabel(a: CrmActivity): string {
  switch (a.activityType) {
    case 'CREATED': return `Lead created via ${(a.metadata as any)?.source?.replace('_', ' ')}`;
    case 'STATUS_CHANGE': {
      const from = (a.metadata as any)?.from;
      const to = (a.metadata as any)?.to;
      return `Status: ${getCampaignStatusLabel(from)} → ${getCampaignStatusLabel(to)}`;
    }
    case 'NOTE_ADDED': return 'Note added';
    case 'FOLLOWUP_SCHEDULED': return `Follow-up scheduled for ${new Date((a.metadata as any)?.scheduledAt).toLocaleDateString()}`;
    case 'FOLLOWUP_COMPLETED': return 'Follow-up completed';
    case 'WHATSAPP_CONTACT': return 'WhatsApp contact initiated';
    case 'ASSIGNED': return `Assigned to agent`;
    case 'SCORE_UPDATED': return `Lead score updated to ${(a.metadata as any)?.score}★`;
    default: return a.activityType.replace(/_/g, ' ').toLowerCase();
  }
}

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  CREATED: <Star className="w-3 h-3" />,
  STATUS_CHANGE: <RefreshCw className="w-3 h-3" />,
  NOTE_ADDED: <MessageSquare className="w-3 h-3" />,
  FOLLOWUP_SCHEDULED: <Calendar className="w-3 h-3" />,
  FOLLOWUP_COMPLETED: <CheckCircle2 className="w-3 h-3" />,
  WHATSAPP_CONTACT: <MessageCircle className="w-3 h-3" />,
  ASSIGNED: <User className="w-3 h-3" />,
  SCORE_UPDATED: <Star className="w-3 h-3" />,
};

export default function CampaignLeadDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { user, isAdmin } = useCrmAuth();

  useEffect(() => {
    if (user?.role === 'SOLO_BROKER') {
      router.replace('/');
    }
  }, [user, router]);
  const [detail, setDetail] = useState<CampaignLeadDetail | null>(null);
  const [agents, setAgents] = useState<CrmAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [showFollowup, setShowFollowup] = useState(false);
  const [fuDate, setFuDate] = useState('');
  const [fuNote, setFuNote] = useState('');
  const [addingFu, setAddingFu] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showCampaignDetails, setShowCampaignDetails] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  // Property inventory lookup states
  const [selectedListing, setSelectedListing] = useState<any | null>(null);
  const [listingSearchQuery, setListingSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchingListings, setSearchingListings] = useState(false);
  const [units, setUnits] = useState<CrmProjectUnit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);

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
      crmApi.getCampaignLead(id),
      isAdmin ? crmApi.getAgents() : Promise.resolve({ success: true, data: [] }),
    ]);
    if (res.success && res.data) setDetail(res.data);
    if (agentRes.success && agentRes.data) setAgents(agentRes.data as CrmAgent[]);
    setLoading(false);
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
    await crmApi.updateCampaignLeadStatus(id, status);
    await load();
    setUpdatingStatus(false);
  }

  async function handleScoreChange(score: number) {
    await crmApi.updateCampaignLeadScore(id, score);
    await load();
  }

  async function handleAddNote() {
    if (!noteText.trim()) return;
    setAddingNote(true);
    await crmApi.addCampaignLeadNote(id, noteText);
    setNoteText('');
    await load();
    setAddingNote(false);
  }

  async function handleAddFollowup() {
    if (!fuDate) return;
    setAddingFu(true);
    await crmApi.addCampaignLeadFollowup(id, fuDate, fuNote || undefined);
    setFuDate(''); setFuNote(''); setShowFollowup(false);
    await load();
    setAddingFu(false);
  }

  async function handleWhatsapp() {
    if (!detail) return;
    const phone = detail.lead.phone.replace(/\D/g, '');
    const msg = encodeURIComponent(`Hello ${detail.lead.name}, we saw your interest and would love to help you find the perfect property. How can we assist?`);
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
    await crmApi.logCampaignLeadWhatsapp(id);
    await load();
  }

  async function handleDelete() {
    if (!confirm('Delete this lead? This cannot be undone.')) return;
    await crmApi.deleteCampaignLead(id);
    router.replace('/campaign-leads');
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

  const { lead, agent, notes, activities, followups } = detail;
  const currentStage = CRM_STAGES.find(s => s.key === lead.status);
  const pendingFollowups = followups.filter(f => !f.isCompleted);
  const completedFollowups = followups.filter(f => f.isCompleted);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <CrmTopBar title="Campaign Lead" subtitle={`${lead.source.replace('_', ' ')} · ${lead.name}`} />

      <div className="flex-1 overflow-y-auto p-6">
        <button onClick={() => router.back()} className="btn-ghost text-xs mb-4 gap-1.5">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Campaign Leads
        </button>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
          {/* Left Pane */}
          <div className="xl:col-span-2 space-y-4">
            {/* Contact Card */}
            <div className="crm-card p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-surface-100 flex items-center justify-center shrink-0">
                    <span className="text-lg font-bold text-surface-600">{lead.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-surface-800">{lead.name}</span>
                      {lead.isDuplicate && (
                        <span className="badge badge-amber text-[9px]">⚠ Duplicate</span>
                      )}
                    </div>
                    <div className="mt-1">
                      <SourceBadge source={lead.source} />
                    </div>
                  </div>
                </div>
                {isAdmin && (
                  <button onClick={handleDelete} className="btn-ghost text-xs text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Contact details */}
              <div className="space-y-2">
                <a href={`tel:${lead.phone}`} className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-surface-50 transition-colors group">
                  <Phone className="w-3.5 h-3.5 text-surface-400 group-hover:text-primary-600 transition-colors" />
                  <span className="text-xs text-surface-700 font-medium">{lead.phone}</span>
                </a>
                {lead.email && (
                  <a href={`mailto:${lead.email}`} className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-surface-50 transition-colors group">
                    <Mail className="w-3.5 h-3.5 text-surface-400 group-hover:text-primary-600 transition-colors" />
                    <span className="text-xs text-surface-700 font-medium">{lead.email}</span>
                  </a>
                )}
                {lead.cityPreference && (
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl">
                    <MapPin className="w-3.5 h-3.5 text-surface-400" />
                    <span className="text-xs text-surface-700 font-medium">{lead.cityPreference}</span>
                  </div>
                )}
                {lead.propertyInterest && (
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl">
                    <Building2 className="w-3.5 h-3.5 text-surface-400" />
                    <span className="text-xs text-surface-700 font-medium">{lead.propertyInterest.replace(/_/g, ' ')}</span>
                  </div>
                )}
              </div>

              {/* Lead Score */}
              <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-xl">
                <div className="text-xs font-semibold text-surface-600 shrink-0">Lead Score</div>
                <LeadScorePill score={lead.leadScore} editable onScoreChange={handleScoreChange} />
              </div>
              
              {/* Pipeline status */}
              <div className="relative" id="status-dropdown-container" ref={statusDropdownRef}>
                <label className="crm-label">Pipeline Stage</label>
                <button
                  type="button"
                  disabled={updatingStatus}
                  onClick={() => setShowStatusDropdown(p => !p)}
                  className="crm-input text-xs flex items-center justify-between text-left bg-white"
                >
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: currentStage?.dotColor || '#cbd5e1' }} />
                    <span>{currentStage?.label || lead.status}</span>
                  </span>
                  <ChevronDown className="w-4 h-4 text-surface-400 shrink-0" />
                </button>
                {showStatusDropdown && (
                  <div className="absolute left-0 right-0 mt-1.5 p-1 bg-white border border-surface-200 rounded-xl shadow-card z-50 max-h-60 overflow-y-auto space-y-0.5">
                    {CRM_STAGES.map(s => (
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
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.dotColor }} />
                        <span className="flex-1 text-left">{s.label}</span>
                        {lead.status === s.key && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Assign agent (admin only) */}
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
                            await crmApi.assignCampaignLead(id, null);
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
                                  await crmApi.assignCampaignLead(id, a.id);
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
                  {agent && (
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-[8px] font-bold text-primary-600">{(agent.name ?? agent.email).charAt(0).toUpperCase()}</span>
                      </div>
                      <span className="text-[10px] text-surface-500">{agent.name ?? agent.email}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Call, Email, WhatsApp CTA Group */}
              <div className="grid grid-cols-3 gap-2 w-full pt-2">
                {lead.phone ? (
                  <a
                    href={`tel:${lead.phone}`}
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

                {lead.email ? (
                  <a
                    href={`mailto:${lead.email}`}
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

                <button
                  onClick={handleWhatsapp}
                  className="flex flex-col items-center justify-center gap-1 py-2 bg-[#25D366] hover:bg-[#1da851] text-white text-[10px] font-bold rounded-xl transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-white" />
                  <span>WhatsApp</span>
                </button>
              </div>
            </div>



            {/* Property Inventory Lookup & Availability */}
            <div className="crm-card p-4 space-y-4">
              <div className="text-xs font-bold text-surface-600 uppercase tracking-wide flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-primary-500" />
                Property Inventory Lookup
              </div>

              {!selectedListing ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-400" />
                    <input
                      type="text"
                      placeholder="Type property name or code..."
                      value={listingSearchQuery}
                      onChange={async (e) => {
                        const val = e.target.value;
                        setListingSearchQuery(val);
                        if (val.trim().length > 2) {
                          setSearchingListings(true);
                          try {
                            const res = await crmApi.request<any>(`/listings?q=${encodeURIComponent(val)}&limit=5`);
                            if (res.success && res.data) {
                              setSearchResults(res.data.items || []);
                            }
                          } catch (err) {
                            console.error(err);
                          } finally {
                            setSearchingListings(false);
                          }
                        } else {
                          setSearchResults([]);
                        }
                      }}
                      className="crm-input pl-9 text-xs py-2"
                    />
                  </div>

                  {searchingListings && (
                    <div className="text-[10px] text-surface-400 flex items-center gap-1">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-500" />
                      Searching...
                    </div>
                  )}

                  {searchResults.length > 0 && (
                    <div className="border border-surface-200 rounded-xl bg-white p-1 max-h-40 overflow-y-auto space-y-0.5 shadow-sm">
                      {searchResults.map(item => (
                        <button
                          key={item.id}
                          onClick={async () => {
                            setSelectedListing(item);
                            setSearchResults([]);
                            setListingSearchQuery('');
                            setLoadingUnits(true);
                            try {
                              const uRes = await crmApi.getListingUnits(item.id);
                              if (uRes.success && uRes.data) {
                                setUnits(uRes.data);
                              }
                            } catch (err) {
                              console.error(err);
                            } finally {
                              setLoadingUnits(false);
                            }
                          }}
                          className="w-full text-left px-2.5 py-2 rounded-lg text-xs hover:bg-surface-50 transition-colors flex items-center justify-between"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-surface-800 truncate">{item.enTitle || item.arTitle}</div>
                            <div className="text-[10px] text-surface-400 font-mono mt-0.5">{item.city} • {item.price?.toLocaleString()} SAR</div>
                          </div>
                          <span className="text-[10px] bg-primary-50 text-primary-600 font-bold px-1.5 py-0.5 rounded ml-2 shrink-0">Select</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Selected Listing Card */}
                  <div className="flex gap-3 items-start bg-surface-50 p-3 rounded-xl border border-surface-200">
                    {selectedListing.photos?.[0] && (
                      <img src={selectedListing.photos[0]} className="w-12 h-12 rounded-lg object-cover shrink-0" alt="" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-surface-800 leading-snug truncate">{selectedListing.enTitle || selectedListing.arTitle}</div>
                      <div className="text-[10px] text-surface-400 mt-0.5">{selectedListing.city} · {selectedListing.price?.toLocaleString()} SAR</div>
                      <button
                        onClick={() => {
                          setSelectedListing(null);
                          setUnits([]);
                        }}
                        className="text-[9px] font-bold text-red-600 hover:underline mt-1 block"
                      >
                        Clear Selection
                      </button>
                    </div>
                  </div>

                  {/* Units Availability matrix */}
                  {loadingUnits ? (
                    <div className="flex items-center gap-2 py-2 text-xs text-surface-500">
                      <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                      <span>Loading inventory...</span>
                    </div>
                  ) : units.length === 0 ? (
                    <div className="text-center py-4 bg-surface-50/50 border border-dashed border-surface-200 rounded-xl">
                      <p className="text-[10px] text-surface-400 font-medium">This listing has no units in its compound inventory.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-surface-100 max-h-56 overflow-y-auto pr-1">
                      {(() => {
                        const unitsByFloor = units.reduce((acc: Record<number, CrmProjectUnit[]>, unit) => {
                          if (!acc[unit.floor]) acc[unit.floor] = [];
                          acc[unit.floor].push(unit);
                          return acc;
                        }, {});
                        const sortedFloors = Object.keys(unitsByFloor).map(Number).sort((a, b) => b - a);

                        return sortedFloors.map(floor => (
                          <div key={floor} className="py-2 first:pt-0 last:pb-0">
                            <div className="text-[9px] font-bold text-surface-400 uppercase tracking-wider mb-1.5">
                              Floor {floor}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {unitsByFloor[floor].map(unit => (
                                <div key={unit.id} className={clsx(
                                  "pl-2 pr-1.5 py-0.5 rounded-lg border flex items-center gap-1.5 text-[9px] font-bold transition-all",
                                  unit.status === 'AVAILABLE' ? "bg-emerald-50/70 border-emerald-200 text-emerald-800" :
                                  unit.status === 'RESERVED' ? "bg-amber-50/70 border-amber-200 text-amber-800" :
                                  "bg-red-50/70 border-red-200 text-red-800"
                                )}>
                                  <span>Unit {unit.unitNumber}</span>
                                  
                                  <div className="border-l border-current/25 pl-1 ml-0.5 select-none">
                                    <select
                                      value={unit.status}
                                      onChange={async (e) => {
                                        const newStatus = e.target.value;
                                        try {
                                          const res = await crmApi.updateListingUnit(selectedListing.id, unit.id, { status: newStatus });
                                          if (res.success) {
                                            setUnits(prev => prev.map(u => u.id === unit.id ? { ...u, status: newStatus } : u));
                                          }
                                        } catch (err) {
                                          console.error(err);
                                        }
                                      }}
                                      className="bg-transparent border-none p-0 text-[8px] font-black focus:ring-0 cursor-pointer outline-none w-16 text-current"
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
            </div>

            {/* Follow-ups */}
            <div className="crm-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-bold text-surface-600 uppercase tracking-wide">
                  Follow-ups {pendingFollowups.length > 0 && <span className="text-amber-600">({pendingFollowups.length} pending)</span>}
                </div>
                <button onClick={() => setShowFollowup(p => !p)} className="btn-ghost text-xs gap-1 py-1">
                  <Plus className="w-3 h-3" /> Schedule
                </button>
              </div>

              {showFollowup && (
                <div className="bg-surface-50 rounded-xl p-3 mb-3 space-y-2">
                  <input type="datetime-local" value={fuDate} onChange={e => setFuDate(e.target.value)} className="crm-input text-xs" />
                  <input placeholder="Reminder note (optional)" value={fuNote} onChange={e => setFuNote(e.target.value)} className="crm-input text-xs" />
                  <div className="flex gap-2">
                    <button onClick={handleAddFollowup} disabled={addingFu || !fuDate} className="btn-primary text-xs py-1.5 flex-1 justify-center">
                      {addingFu ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save Follow-up'}
                    </button>
                    <button onClick={() => setShowFollowup(false)} className="btn-secondary text-xs py-1.5">Cancel</button>
                  </div>
                </div>
              )}

              {pendingFollowups.length === 0 && completedFollowups.length === 0 ? (
                <p className="text-xs text-surface-400 text-center py-2">No follow-ups scheduled</p>
              ) : (
                <div className="space-y-2">
                  {[...pendingFollowups, ...completedFollowups].map(fu => (
                    <div key={fu.id} className={clsx(
                      'flex items-start gap-2.5 p-2.5 rounded-xl',
                      fu.isCompleted ? 'opacity-50 bg-surface-50' : 'bg-amber-50 border border-amber-100'
                    )}>
                      <button onClick={() => completeFollowup(fu.id)} disabled={fu.isCompleted}>
                        <CheckCircle2 className={clsx('w-4 h-4 shrink-0 mt-0.5', fu.isCompleted ? 'text-emerald-500' : 'text-surface-300 hover:text-emerald-400 transition-colors')} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-surface-700">{fu.note ?? 'Follow-up task'}</div>
                        <div className="text-[10px] text-surface-400 mt-0.5 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {new Date(fu.scheduledAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right pane — Notes + Timeline */}
          <div className="xl:col-span-3 space-y-4">
            {/* Campaign Metadata */}
            {lead.campaignDetails && (() => {
              const info = lead.campaignDetails as any;
              const hasAnswers = info.answers && Object.keys(info.answers).length > 0;
              
              // Filter out standard contact fields from custom answers
              const skipKeys = ['full_name', 'first_name', 'last_name', 'email', 'phone_number', 'phone'];
              const customAnswers = hasAnswers 
                ? Object.entries(info.answers).filter(([k]) => !skipKeys.includes(k)) 
                : [];

              return (
                <div className="crm-card p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-surface-100 pb-3">
                    <Info className="w-4 h-4 text-primary-600" />
                    <span className="text-sm font-bold text-surface-800">Campaign & Ad Information</span>
                  </div>

                  {/* Campaign Structure Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-surface-50 p-2.5 rounded-xl border border-surface-100">
                      <div className="text-[10px] text-surface-400 font-semibold uppercase">Campaign</div>
                      <div className="text-surface-700 font-bold mt-0.5 truncate" title={info.campaign_name}>{info.campaign_name || 'N/A'}</div>
                    </div>
                    <div className="bg-surface-50 p-2.5 rounded-xl border border-surface-100">
                      <div className="text-[10px] text-surface-400 font-semibold uppercase">Ad Set</div>
                      <div className="text-surface-700 font-bold mt-0.5 truncate" title={info.ad_set_name}>{info.ad_set_name || 'N/A'}</div>
                    </div>
                    <div className="bg-surface-50 p-2.5 rounded-xl border border-surface-100">
                      <div className="text-[10px] text-surface-400 font-semibold uppercase">Ad Name</div>
                      <div className="text-surface-700 font-bold mt-0.5 truncate" title={info.ad_name}>{info.ad_name || 'N/A'}</div>
                    </div>
                    <div className="bg-surface-50 p-2.5 rounded-xl border border-surface-100">
                      <div className="text-[10px] text-surface-400 font-semibold uppercase">Form Name</div>
                      <div className="text-surface-700 font-bold mt-0.5 truncate" title={info.form_id}>{info.form_id || 'N/A'}</div>
                    </div>
                  </div>

                  {/* Creative Links */}
                  {(info.facebook_post_url || info.instagram_post_url) && (
                    <div className="space-y-2 pt-1">
                      <div className="text-[10px] text-surface-400 font-bold uppercase tracking-wider">Ad Creative Posts</div>
                      <div className="flex gap-2">
                        {info.facebook_post_url && (
                          <a
                            href={info.facebook_post_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-[#1877F2] hover:bg-[#166fe5] text-white text-[10px] font-bold rounded-xl transition-all shadow-sm"
                          >
                            <Facebook className="w-3.5 h-3.5 text-white" />
                            <span>Facebook Ad</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-80" />
                          </a>
                        )}
                        {info.instagram_post_url && (
                          <a
                            href={info.instagram_post_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F56040] hover:opacity-90 text-white text-[10px] font-bold rounded-xl transition-all shadow-sm"
                          >
                            <Instagram className="w-3.5 h-3.5 text-white" />
                            <span>Instagram Ad</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-80" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Custom Form Answers */}
                  {customAnswers.length > 0 ? (
                    <div className="space-y-2 pt-2 border-t border-surface-100">
                      <div className="text-[10px] text-surface-400 font-bold uppercase tracking-wider mb-2">Form Questions & Answers</div>
                      <div className="space-y-2">
                        {customAnswers.map(([question, answer]) => (
                          <div key={question} className="p-2.5 bg-surface-50 border border-surface-200 rounded-xl space-y-1 hover:border-primary-300 transition-colors">
                            <div className="text-[9px] text-surface-500 font-bold capitalize">
                              {question.replace(/_/g, ' ')}
                            </div>
                            <div className="text-xs text-surface-800 font-semibold leading-relaxed">
                              {String(answer)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    // Show standard details in JSON if there's no custom answers yet (e.g. old test leads)
                    <div className="space-y-2 pt-2 border-t border-surface-100">
                      <div className="text-[10px] text-surface-400 font-bold uppercase tracking-wider mb-1">Raw Lead Metadata</div>
                      <div className="bg-surface-900 rounded-xl p-3 overflow-x-auto">
                        <pre className="text-[10px] text-emerald-300 font-mono leading-relaxed whitespace-pre-wrap">
                          {JSON.stringify(info, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                  
                  <div className="text-[9px] text-surface-400 text-center pt-2">
                    Lead ID: {info.leadgen_id || 'N/A'}
                  </div>
                </div>
              );
            })()}

            {/* Notes */}
            <div className="crm-card p-5">
              <div className="text-sm font-bold text-surface-800 mb-3">Notes</div>
              <div className="flex gap-2 mb-4">
                <textarea
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder="Add a note about this lead..."
                  rows={3}
                  className="crm-input text-xs resize-none flex-1"
                />
                <button
                  onClick={handleAddNote}
                  disabled={addingNote || !noteText.trim()}
                  className="btn-primary text-xs px-3 self-end shrink-0 py-2"
                >
                  {addingNote ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                </button>
              </div>
              {notes.length === 0 ? (
                <div className="text-center py-6 text-surface-400">
                  <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">No notes yet. Add context about this lead.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notes.map(n => {
                    const isEditing = editingNoteId === n.id;
                    const canEdit = isAdmin || user?.id === n.agentId || user?.id === lead.assignedAgentId;
                    return (
                      <div key={n.id} className="p-3 bg-surface-50 rounded-xl border-l-2 border-primary-300 space-y-2">
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
              <div className="text-sm font-bold text-surface-800 mb-4">
                Activity Timeline
                <span className="ml-2 text-xs font-normal text-surface-400">{activities.length} events</span>
              </div>
              {activities.length === 0 ? (
                <p className="text-xs text-surface-400">No activity recorded</p>
              ) : (
                <div className="relative pl-5">
                  <div className="absolute left-[7px] top-2 bottom-2 w-px bg-surface-200" />
                  <div className="space-y-5">
                    {activities.map((a, i) => (
                      <div key={a.id} className="relative flex items-start gap-3">
                        <div className={clsx(
                          'absolute -left-5 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5',
                          i === 0 ? 'bg-primary-600 border-primary-600' : 'bg-white border-surface-300'
                        )}>
                          {i === 0 && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <div className="flex-1 min-w-0 ml-1">
                          <div className="flex items-center gap-2">
                            <span className={clsx('text-surface-400', i === 0 && 'text-primary-500')}>
                              {ACTIVITY_ICONS[a.activityType] ?? <Clock className="w-3 h-3" />}
                            </span>
                            <p className="text-xs font-medium text-surface-700">{activityLabel(a)}</p>
                          </div>
                          <p className="text-[10px] text-surface-400 mt-0.5 ml-5">{new Date(a.createdAt).toLocaleString()}</p>
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
