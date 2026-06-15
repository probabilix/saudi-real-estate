'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { crmApi, WebsiteLead, WEBSITE_LEAD_STATUSES } from '@/lib/api';
import { CrmTopBar } from '@/components/CrmSidebar';
import { useCrmAuth } from '@/hooks/use-crm-auth';
import {
  Search, Sparkles, ExternalLink, ChevronLeft, ChevronRight,
  Loader2, RefreshCw, Filter, Columns, LayoutList
} from 'lucide-react';
import clsx from 'clsx';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

function IntentScore({ score }: { score: number }) {
  const color = score >= 70 ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
    : score >= 40 ? 'text-amber-600 bg-amber-50 border-amber-200'
    : 'text-red-500 bg-red-50 border-red-200';
  return (
    <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border', color)}>
      <Sparkles className="w-2.5 h-2.5" />
      {score}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg = WEBSITE_LEAD_STATUSES.find(s => s.key === status);
  const colorMap: Record<string, string> = {
    CONTACTED: 'badge-amber',
    ATTEMPTED_CONTACT: 'badge-red',
    AGENT_CONTACTED: 'badge-blue',
    SITE_VISIT_SCHEDULED: 'badge-indigo',
    PROPERTY_VIEWING: 'badge-gold',
    OFFER_SUBMITTED: 'badge-gray',
    CLOSED_WON: 'badge-green',
    CLOSED_LOST: 'badge-gray',
    AI_DISQUALIFIED: 'badge-gray',
  };
  return <span className={clsx('badge', colorMap[status] ?? 'badge-gray')}>{cfg?.label ?? status}</span>;
}

export default function WebsiteLeadsPage() {
  const { isAdmin } = useCrmAuth();
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [leads, setLeads] = useState<WebsiteLead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterQualified, setFilterQualified] = useState('');
  const [dragging, setDragging] = useState<{ id: string; fromStatus: string } | null>(null);
  const dragOver = useRef<string | null>(null);

  const LIMIT = 25;
  const totalPages = Math.ceil(total / LIMIT);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [filterStatus, filterQualified, debouncedSearch]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await crmApi.getWebsiteLeads({
      page: view === 'kanban' ? 1 : page,
      limit: view === 'kanban' ? 200 : LIMIT,
      status: filterStatus || undefined,
      isQualified: filterQualified === 'true' ? true : filterQualified === 'false' ? false : undefined,
      search: debouncedSearch || undefined,
    });
    if (res.success && res.data) {
      setLeads(res.data.leads);
      setTotal(res.data.total);
    }
    setLoading(false);
  }, [page, filterStatus, filterQualified, debouncedSearch, view]);

  useEffect(() => { load(); }, [load]);

  function onDragStart(leadId: string, fromStatus: string) {
    setDragging({ id: leadId, fromStatus });
  }

  async function onDropToColumn(toStatus: string) {
    if (!dragging || dragging.fromStatus === toStatus) { setDragging(null); return; }
    // Optimistic update
    setLeads(prev => prev.map(row =>
      row.lead.id === dragging.id
        ? { ...row, lead: { ...row.lead, status: toStatus } }
        : row
    ));
    setDragging(null);
    await crmApi.updateWebsiteLeadStatus(dragging.id, toStatus);
  }

  // Group by status for Kanban
  const grouped: Record<string, WebsiteLead[]> = {};
  for (const stage of WEBSITE_LEAD_STATUSES) {
    grouped[stage.key] = [];
  }
  for (const row of leads) {
    if (grouped[row.lead.status]) {
      grouped[row.lead.status].push(row);
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <CrmTopBar title="Website Leads" subtitle="AI-qualified leads from your platform" />

      {/* Filters / Toolbar */}
      <div className="shrink-0 border-b border-surface-200 bg-white px-5 py-3">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search leads..."
              className="crm-input pl-9 text-xs py-2"
            />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="crm-input w-auto text-xs py-2 pr-8">
            <option value="">All Statuses</option>
            {WEBSITE_LEAD_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <select value={filterQualified} onChange={e => setFilterQualified(e.target.value)} className="crm-input w-auto text-xs py-2 pr-8">
            <option value="">All Leads</option>
            <option value="true">AI Qualified ✓</option>
            <option value="false">Not Qualified</option>
          </select>
          <button onClick={load} className="btn-ghost text-xs gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
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

          <div className="ml-auto text-xs text-surface-400 font-medium">{total} total</div>
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
            {WEBSITE_LEAD_STATUSES.map(stage => (
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
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: stage.color }} />
                  <span className="text-xs font-bold text-surface-700 flex-1 truncate">{stage.label}</span>
                  <span className="text-[10px] font-bold text-surface-500 bg-white border border-surface-200 rounded-full px-1.5 py-0.5">
                    {grouped[stage.key]?.length ?? 0}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                  <div className="flex flex-col gap-3 min-h-[150px]">
                    <AnimatePresence mode="popLayout">
                      {(grouped[stage.key] ?? []).map(row => (
                        <WebsiteKanbanCard
                          key={row.lead.id}
                          row={row}
                          onDragStart={() => onDragStart(row.lead.id, row.lead.status)}
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
            {leads.length === 0 ? (
              <div className="text-center py-16 text-surface-400">
                <Sparkles className="w-8 h-8 mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium">No website leads found</p>
                <p className="text-xs mt-1">Leads from AI conversations will appear here</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="crm-table">
                  <thead>
                    <tr>
                      <th>Lead</th>
                      <th>Property / Project</th>
                      <th>Intent Score</th>
                      <th>Budget</th>
                      <th>Status</th>
                      <th>Agent</th>
                      <th>Date</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map(({ lead, listing, buyer, agent, project }) => (
                      <tr key={lead.id}>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-primary-600">
                                {(buyer?.name || 'Anonymous Visitor').charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-surface-800">
                                {lead.isQualified && <Sparkles className="inline w-2.5 h-2.5 text-gold mr-1" />}
                                {buyer?.name || 'Anonymous Visitor'}
                              </div>
                              <div className="text-[10px] text-surface-400">{new Date(lead.createdAt).toLocaleDateString()}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          {listing ? (
                            <div className="flex items-center gap-2">
                              {listing.photos?.[0] && (
                                <img src={listing.photos[0]} className="w-8 h-8 rounded-lg object-cover shrink-0" alt="" />
                              )}
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-surface-700 truncate max-w-[140px]">
                                  {project ? (
                                    <>
                                      {project.nameEn} — {(() => {
                                        const label = listing.enTitle ? listing.enTitle.replace(`${project.nameEn} - `, '') : '';
                                        return label.toLowerCase().includes('layout') ? label : `${label} Layout`;
                                      })()}
                                    </>
                                  ) : (
                                    listing.enTitle || listing.arTitle
                                  )}
                                </div>
                                <div className="text-[10px] text-surface-400">{listing.city} · {listing.price?.toLocaleString()} SAR</div>
                              </div>
                            </div>
                          ) : <span className="text-surface-300 text-xs">—</span>}
                        </td>
                        <td>
                          {buyer ? <IntentScore score={buyer.intentScore} /> : <span className="text-surface-300 text-xs">—</span>}
                        </td>
                        <td>
                          <span className="text-xs text-surface-600">{lead.buyerBudgetDisplay ?? '—'}</span>
                        </td>
                        <td><StatusBadge status={lead.status} /></td>
                        <td>
                          <span className="text-xs text-surface-600">{agent?.name ?? '—'}</span>
                        </td>
                        <td>
                          <span className="text-xs text-surface-400">{new Date(lead.createdAt).toLocaleDateString()}</span>
                        </td>
                        <td>
                          <Link href={`/website-leads/${lead.id}`} className="btn-ghost text-xs px-2.5 py-1.5 gap-1">
                            View <ExternalLink className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-surface-100">
                <span className="text-xs text-surface-400">Page {page} of {totalPages}</span>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="btn-secondary text-xs px-2.5 py-1.5 disabled:opacity-40">
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="btn-secondary text-xs px-2.5 py-1.5 disabled:opacity-40">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function WebsiteKanbanCard({
  row,
  onDragStart,
}: {
  row: WebsiteLead;
  onDragStart: () => void;
}) {
  const { lead, listing, buyer, agent, project } = row;
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
      <Link href={`/website-leads/${lead.id}`} className="block w-full min-w-0">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-primary-600">
                {(buyer?.name || 'Visitor').charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-surface-800 truncate">
                {lead.isQualified && <Sparkles className="inline w-2.5 h-2.5 text-gold mr-0.5" />}
                {buyer?.name || 'Anonymous Visitor'}
              </div>
            </div>
          </div>
          {buyer && <IntentScore score={buyer.intentScore} />}
        </div>

        {/* Listing interest preview */}
        {listing && (
          <div className="flex items-center gap-1.5 p-1.5 bg-surface-50 border border-surface-100 rounded-xl mb-2.5">
            {listing.photos?.[0] && (
              <img src={listing.photos[0]} className="w-7 h-7 rounded-lg object-cover shrink-0" alt="" />
            )}
            <div className="min-w-0">
              <div className="text-[9px] font-bold text-surface-700 truncate">
                {project ? (
                  `${project.nameEn} — ${(() => {
                    const label = listing.enTitle ? listing.enTitle.replace(`${project.nameEn} - `, '') : '';
                    return label.toLowerCase().includes('layout') ? label : `${label} Layout`;
                  })()}`
                ) : (
                  listing.enTitle || listing.arTitle
                )}
              </div>
              <div className="text-[8px] text-surface-400 truncate">{listing.city} · {listing.price?.toLocaleString()} SAR</div>
            </div>
          </div>
        )}

        {/* Details & Tags */}
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          {lead.buyerBudgetDisplay && (
            <span className="text-[9px] bg-indigo-50/50 text-indigo-600 border border-indigo-100 px-1.5 py-0.5 rounded-md font-medium">
              💰 {lead.buyerBudgetDisplay}
            </span>
          )}
          {lead.buyerTimelineDisplay && (
            <span className="text-[9px] bg-amber-50/50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded-md font-medium">
              ⏱ {lead.buyerTimelineDisplay}
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-surface-100">
          {/* Agent */}
          {agent ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                <span className="text-[8px] font-bold text-primary-600">
                  {(agent.name ?? agent.email).charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-[9px] text-surface-500 font-medium truncate max-w-[80px]">
                {agent.name ?? 'Agent'}
              </span>
            </div>
          ) : (
            <span className="text-[9px] text-surface-400 italic">No Agent</span>
          )}

          {/* Time */}
          <span className={clsx('text-[9px] font-medium', isStale ? 'text-red-400' : 'text-surface-400')}>
            {daysSince === 0 ? 'Today' : `${daysSince}d ago`}
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
