'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { crmApi, CrmLead, CrmLeadStatus, CRM_STAGES, CrmAgent } from '@/lib/api';
import { CrmTopBar } from '@/components/CrmSidebar';
import { useCrmAuth } from '@/hooks/use-crm-auth';
import {
  Search, Plus, LayoutList, Columns, RefreshCw, Loader2,
  Megaphone, Globe, Filter, X, ChevronDown, AlertTriangle, ChevronLeft, ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import ManualLeadDrawer from '@/components/ManualLeadDrawer';
import SourceBadge from '@/components/SourceBadge';
import LeadScorePill from '@/components/LeadScorePill';

type ViewMode = 'kanban' | 'list';

interface GroupedLeads {
  [key: string]: { lead: CrmLead; agent: CrmAgent | null }[];
}

export default function CampaignLeadsPage() {
  const { user, isAdmin } = useCrmAuth();
  const router = useRouter();

  useEffect(() => {
    if (user?.role === 'SOLO_BROKER') {
      router.replace('/');
    }
  }, [user, router]);
  const [allLeads, setAllLeads] = useState<{ lead: CrmLead; agent: CrmAgent | null }[]>([]);
  const [unassigned, setUnassigned] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('kanban');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterAssigned, setFilterAssigned] = useState('');
  const [showDrawer, setShowDrawer] = useState(false);
  const [dragging, setDragging] = useState<{ id: string; fromStatus: string } | null>(null);
  const dragOver = useRef<string | null>(null);

  const [page, setPage] = useState(1);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filterSource, debouncedSearch, filterAssigned]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await crmApi.getCampaignLeads({
      page,
      limit: 50,
      source: filterSource || undefined,
      search: debouncedSearch || undefined,
      assigned: filterAssigned || undefined,
    });
    if (res.success && res.data) {
      setAllLeads(res.data.leads);
      setTotal(res.data.total);
      setUnassigned(res.data.unassigned);
    }
    setLoading(false);
  }, [page, filterSource, debouncedSearch, filterAssigned]);

  useEffect(() => { load(); }, [load]);

  // Group by status for Kanban
  const grouped: GroupedLeads = {};
  for (const stage of CRM_STAGES) grouped[stage.key] = [];
  for (const row of allLeads) {
    if (grouped[row.lead.status]) grouped[row.lead.status].push(row);
  }

  // Drag and drop handlers
  function onDragStart(leadId: string, fromStatus: string) {
    setDragging({ id: leadId, fromStatus });
  }

  async function onDropToColumn(toStatus: string) {
    if (!dragging || dragging.fromStatus === toStatus) { setDragging(null); return; }
    // Optimistic update
    setAllLeads(prev => prev.map(r =>
      r.lead.id === dragging.id ? { ...r, lead: { ...r.lead, status: toStatus as CrmLeadStatus } } : r
    ));
    setDragging(null);
    await crmApi.updateCampaignLeadStatus(dragging.id, toStatus);
  }

  const stageStats = CRM_STAGES.map(s => ({
    ...s,
    count: grouped[s.key]?.length ?? 0,
  }));

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <CrmTopBar title="Campaign Leads" subtitle="Ad leads from Meta, Snapchat, TikTok & manual entries" />

      {/* Toolbar */}
      <div className="shrink-0 border-b border-surface-200 bg-white px-5 py-3">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search leads..."
              className="crm-input pl-9 text-xs py-2"
            />
          </div>

          {/* Source filter */}
          <select value={filterSource} onChange={e => setFilterSource(e.target.value)} className="crm-input w-auto text-xs py-2 pr-8">
            <option value="">All Sources</option>
            <option value="META_ADS">Meta Ads</option>
            <option value="SNAPCHAT">Snapchat</option>
            <option value="TIKTOK">TikTok</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="MANUAL">Manual</option>
          </select>

          {isAdmin && (
            <select value={filterAssigned} onChange={e => setFilterAssigned(e.target.value)} className="crm-input w-auto text-xs py-2 pr-8">
              <option value="">All Leads</option>
              <option value="false">Unassigned Only</option>
            </select>
          )}

          <button onClick={load} className="btn-ghost text-xs gap-1.5">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>

          {/* View toggle */}
          <div className="flex items-center bg-surface-100 rounded-xl p-0.5 gap-0.5">
            <button
              onClick={() => setView('kanban')}
              className={clsx('p-1.5 rounded-lg transition-all', view === 'kanban' ? 'bg-white shadow-sm text-primary-600' : 'text-surface-400 hover:text-surface-700')}
            >
              <Columns className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setView('list')}
              className={clsx('p-1.5 rounded-lg transition-all', view === 'list' ? 'bg-white shadow-sm text-primary-600' : 'text-surface-400 hover:text-surface-700')}
            >
              <LayoutList className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {isAdmin && unassigned > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-red-600 font-semibold bg-red-50 border border-red-200 px-2.5 py-1.5 rounded-xl">
                <AlertTriangle className="w-3 h-3" />
                {unassigned} unassigned
              </div>
            )}
            <div className="text-xs text-surface-400 font-medium">{total} total</div>
            <button onClick={() => setShowDrawer(true)} className="btn-primary text-xs gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Lead
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
        </div>
      ) : view === 'kanban' ? (
        /* ── KANBAN BOARD ── */
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {CRM_STAGES.map(stage => (
              <div
                key={stage.key}
                className={clsx(
                  'flex flex-col w-full rounded-2xl border transition-all h-[480px]',
                  dragging
                    ? dragging.fromStatus === stage.key
                      ? 'border-surface-200 bg-surface-50/30 opacity-60'
                      : 'border-dashed border-primary-300 bg-primary-50/20 ring-2 ring-primary-100/30'
                    : 'border-surface-200 bg-surface-50/70 hover:shadow-sm hover:border-surface-300'
                )}
                onDragOver={e => { e.preventDefault(); dragOver.current = stage.key; }}
                onDrop={() => onDropToColumn(stage.key)}
              >
                {/* Column Header */}
                <div className="flex items-center gap-2 px-3.5 py-3 border-b border-surface-200 shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: stage.dotColor }} />
                  <span className="text-xs font-bold text-surface-700 flex-1 truncate">{stage.label}</span>
                  <span className="text-[10px] font-bold text-surface-500 bg-white border border-surface-200 rounded-full px-1.5 py-0.5">
                    {grouped[stage.key]?.length ?? 0}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                  <div className="flex flex-col gap-3 min-h-[150px]">
                    <AnimatePresence mode="popLayout">
                      {(grouped[stage.key] ?? []).map(({ lead, agent }) => (
                        <KanbanCard
                          key={lead.id}
                          lead={lead}
                          agent={agent}
                          onDragStart={() => onDragStart(lead.id, lead.status)}
                        />
                      ))}
                    </AnimatePresence>
                    {(grouped[stage.key] ?? []).length === 0 && (
                      <div className="text-center py-6 text-surface-300 text-xs">No leads</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* ── LIST VIEW ── */
        <div className="flex-1 overflow-y-auto p-5">
          <div className="crm-card overflow-hidden">
            {allLeads.length === 0 ? (
              <div className="text-center py-16 text-surface-400">
                <Megaphone className="w-8 h-8 mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium">No campaign leads found</p>
                <p className="text-xs mt-1">Add a lead manually or connect Meta Ads webhook</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="crm-table">
                  <thead>
                    <tr>
                      <th>Lead</th>
                      <th>Source</th>
                      <th>Status</th>
                      <th>Score</th>
                      <th>City</th>
                      <th>Agent</th>
                      <th>Date</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {allLeads.map(({ lead, agent }) => {
                      const stage = CRM_STAGES.find(s => s.key === lead.status);
                      return (
                        <tr key={lead.id}>
                          <td>
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-surface-100">
                                <span className="text-xs font-bold text-surface-600">{lead.name.charAt(0).toUpperCase()}</span>
                              </div>
                              <div>
                                <div className="text-xs font-semibold text-surface-800">{lead.name}</div>
                                <div className="text-[10px] text-surface-400">{lead.phone}</div>
                              </div>
                            </div>
                          </td>
                          <td><SourceBadge source={lead.source} /></td>
                          <td>
                            <span className={clsx('badge border', stage?.colorClass)}>
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: stage?.dotColor }} />
                              {stage?.label ?? lead.status}
                            </span>
                          </td>
                          <td><LeadScorePill score={lead.leadScore} /></td>
                          <td><span className="text-xs text-surface-600">{lead.cityPreference ?? '—'}</span></td>
                          <td><span className="text-xs text-surface-600">{agent?.name ?? <span className="text-red-400 font-medium">Unassigned</span>}</span></td>
                          <td><span className="text-xs text-surface-400">{new Date(lead.createdAt).toLocaleDateString()}</span></td>
                          <td>
                            <Link href={`/campaign-leads/${lead.id}`} className="btn-ghost text-xs px-2.5 py-1">View</Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pagination controls */}
      {!loading && allLeads.length > 0 && (
        <div className="shrink-0 border-t border-surface-200 bg-white px-5 py-3 flex items-center justify-between">
          <div className="text-xs text-surface-500 font-medium">
            Showing <b>{allLeads.length}</b> of <b>{total}</b> campaign leads
          </div>
          <div className="flex items-center gap-2">
            <button
              className="btn-secondary p-1.5 disabled:opacity-50"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-xs font-bold text-surface-700 px-3 bg-white border border-surface-200 py-1.5 rounded-lg">
              Page {page} of {Math.ceil(total / 50) || 1}
            </div>
            <button
              className="btn-secondary p-1.5 disabled:opacity-50"
              disabled={page * 50 >= total}
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Manual Lead Drawer */}
      <ManualLeadDrawer open={showDrawer} onClose={() => setShowDrawer(false)} onCreated={load} />
    </div>
  );
}

function KanbanCard({
  lead, agent, onDragStart,
}: { lead: CrmLead; agent: CrmAgent | null; onDragStart: () => void }) {
  const daysSince = Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / 86_400_000);
  const isStale = daysSince > 7;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      draggable
      onDragStart={onDragStart}
      className="kanban-card select-none w-full min-w-0"
    >
      <Link href={`/campaign-leads/${lead.id}`} className="block w-full min-w-0">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-surface-100 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-surface-600">{lead.name.charAt(0).toUpperCase()}</span>
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-surface-800 truncate">{lead.name}</div>
              {lead.isDuplicate && (
                <span className="text-[9px] text-amber-600 font-semibold">⚠ Duplicate</span>
              )}
            </div>
          </div>
          <SourceBadge source={lead.source} compact />
        </div>

        {/* Phone */}
        <div className="text-[10px] text-surface-500 mb-2">{lead.phone}</div>

        {/* Tags */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {lead.cityPreference && (
            <span className="text-[9px] bg-surface-100 text-surface-500 px-1.5 py-0.5 rounded-md font-medium">
              {lead.cityPreference}
            </span>
          )}
          {lead.propertyInterest && (
            <span className="text-[9px] bg-surface-100 text-surface-500 px-1.5 py-0.5 rounded-md font-medium">
              {lead.propertyInterest}
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-surface-100">
          {/* Agent avatar or unassigned */}
          {agent ? (
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-[8px] font-bold text-primary-600">
                  {(agent.name ?? agent.email).charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-[9px] text-surface-500 font-medium truncate max-w-[70px]">{agent.name ?? 'Agent'}</span>
            </div>
          ) : (
            <span className="text-[9px] text-red-400 font-semibold">Unassigned</span>
          )}

          {/* Time in stage */}
          <span className={clsx('text-[9px] font-medium', isStale ? 'text-red-400' : 'text-surface-400')}>
            {daysSince === 0 ? 'Today' : `${daysSince}d`}
          </span>

          <LeadScorePill score={lead.leadScore} compact />
        </div>
      </Link>
    </motion.div>
  );
}
