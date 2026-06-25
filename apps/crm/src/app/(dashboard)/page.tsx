'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { crmApi, CrmDashboardData, CRM_STAGES, WEBSITE_LEAD_STATUSES } from '@/lib/api';
import { CrmTopBar } from '@/components/CrmSidebar';
import { useCrmAuth } from '@/hooks/use-crm-auth';
import {
  TrendingUp, Users, Megaphone, Globe, CheckCircle2,
  AlertCircle, Calendar, ArrowUpRight, Loader2, Clock
} from 'lucide-react';
import clsx from 'clsx';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

const SOURCE_COLORS: Record<string, string> = {
  META_ADS:  '#1877F2',
  SNAPCHAT:  '#FFFC00',
  TIKTOK:    '#fe2c55',
  WHATSAPP:  '#25D366',
  MANUAL:    '#64748b',
};
const SOURCE_LABELS: Record<string, string> = {
  META_ADS: 'Meta Ads', SNAPCHAT: 'Snapchat', TIKTOK: 'TikTok', WHATSAPP: 'WhatsApp', MANUAL: 'Manual',
};

const SHORT_LABELS: Record<string, string> = {
  'AI Qualified (Awaiting Agent)': 'AI Qualified',
  'Agent Attempted Contact': 'Attempted Contact',
  'Agent Contacted': 'Contacted',
  'Site Visit Scheduled': 'Site Visit',
  'Property Viewing': 'Viewing',
  'Offer Submitted': 'Offer',
  'Closed Won': 'Won',
  'Closed Lost': 'Lost',
  'AI Disqualified': 'AI Disqualified'
};

const CAMPAIGN_SHORT_LABELS: Record<string, string> = {
  'New': 'New',
  'AI Attempting': 'AI Att.',
  'AI Qualified': 'AI Qual.',
  'AI Disqualified': 'AI Disq.',
  'AI Unreached': 'AI Unreach.',
  'Attempted Contact': 'Attempted',
  'Contacted': 'Contacted',
  'Site Visit': 'Site Visit',
  'Viewing': 'Viewing',
  'Offer Submitted': 'Offer',
  'Closed Won': 'Won',
  'Closed Lost': 'Lost',
};

function StatCard({ label, value, icon: Icon, color, delta }: { label: string; value: number | string; icon: React.ElementType; color: string; delta?: string }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-bold text-surface-900">{value}</div>
        <div className="text-xs text-surface-500 font-medium mt-0.5">{label}</div>
        {delta && <div className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1"><ArrowUpRight className="w-3 h-3" />{delta}</div>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAdmin } = useCrmAuth();
  const [data, setData] = useState<CrmDashboardData | null>(null);
  const [followups, setFollowups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'campaign' | 'website'>('campaign');

  useEffect(() => {
    async function load() {
      const [dashRes, fuRes] = await Promise.all([
        crmApi.getDashboard(),
        crmApi.getTodayFollowups(),
      ]);
      if (dashRes.success && dashRes.data) setData(dashRes.data);
      if (fuRes.success && fuRes.data) setFollowups(fuRes.data);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
    </div>
  );

  const totalCampaign = data?.campaignByStatus.reduce((s, r) => s + Number(r.count), 0) ?? 0;
  const totalWebsite  = data?.websiteByStatus.reduce((s, r) => s + Number(r.count), 0) ?? 0;
  const wonCampaign   = data?.campaignByStatus.find(r => r.status === 'CLOSED_WON')?.count ?? 0;

  // Build funnel data from campaign statuses
  const funnelData = CRM_STAGES.map(s => ({
    name: CAMPAIGN_SHORT_LABELS[s.label] ?? s.label,
    fullName: s.label,
    count: Number(data?.campaignByStatus.find(r => r.status === s.key)?.count ?? 0),
    color: s.dotColor,
  }));

  // Build funnel data from website statuses
  const websiteFunnelData = WEBSITE_LEAD_STATUSES.map(s => ({
    name: SHORT_LABELS[s.label] ?? s.label,
    fullName: s.label,
    count: Number(data?.websiteByStatus.find(r => r.status === s.key)?.count ?? 0),
    color: s.color,
  }));

  const sourceData = (data?.campaignBySource ?? []).map(r => ({
    name: SOURCE_LABELS[r.source] ?? r.source,
    value: Number(r.count),
    color: SOURCE_COLORS[r.source] ?? '#64748b',
  }));

  return (
    <div className="flex-1 overflow-y-auto">
      <CrmTopBar
        title={isAdmin ? 'CRM Dashboard' : `Welcome, ${user?.name?.split(' ')[0]}`}
        subtitle={isAdmin ? 'Platform-wide overview' : 'Your personal pipeline overview'}
      />

      <div className="p-6 space-y-6">
        {/* Unassigned Alert */}
        {isAdmin && (data?.unassignedCount ?? 0) > 0 && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <div className="flex-1">
              <span className="font-bold text-red-700">{data!.unassignedCount} campaign lead{data!.unassignedCount !== 1 ? 's' : ''} unassigned.</span>
              <span className="text-red-600 text-sm ml-1">Assign them to agents to begin follow-up.</span>
            </div>
            <a href="/campaign-leads?assigned=false" className="btn-danger text-xs px-3 py-1.5">Review Now</a>
          </div>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Campaign Leads" value={totalCampaign} icon={Megaphone} color="bg-indigo-500" />
          <StatCard label="Website Leads" value={totalWebsite} icon={Globe} color="bg-primary-600" />
          <StatCard label="Deals Won" value={wonCampaign} icon={TrendingUp} color="bg-emerald-500" />
          <StatCard label="Due Today" value={data?.todayFollowupCount ?? 0} icon={Calendar} color="bg-amber-500" />
        </div>

        {/* Dashboard Tabs Selector */}
        <div className="flex gap-2 p-1 bg-surface-100/50 rounded-xl max-w-md border border-surface-200/50">
          <button
            onClick={() => setActiveTab('campaign')}
            className={clsx(
              'flex-1 py-2 px-4 text-xs font-bold rounded-lg transition-all',
              activeTab === 'campaign'
                ? 'bg-white text-surface-800 shadow-sm'
                : 'text-surface-500 hover:text-surface-700'
            )}
          >
            Campaign Leads
          </button>
          <button
            onClick={() => setActiveTab('website')}
            className={clsx(
              'flex-1 py-2 px-4 text-xs font-bold rounded-lg transition-all',
              activeTab === 'website'
                ? 'bg-white text-surface-800 shadow-sm'
                : 'text-surface-500 hover:text-surface-700'
            )}
          >
            Website & AI Concierge
          </button>
        </div>

        {activeTab === 'campaign' ? (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Pipeline Funnel */}
            <div className="xl:col-span-2 crm-card p-5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-sm font-bold text-surface-800">Campaign Lead Pipeline</h2>
                  <p className="text-xs text-surface-400 mt-0.5">Leads by stage</p>
                </div>
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                <div className="min-w-[1000px]">
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={funnelData} barSize={28} margin={{ top: 10, right: 15, left: -20, bottom: 35 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 9, fill: '#94a3b8' }} 
                        interval={0} 
                        height={60} 
                        angle={-30}
                        textAnchor="end"
                        axisLine={false} 
                        tickLine={false} 
                      />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 12 }}
                        cursor={{ fill: '#f8fafb' }}
                        formatter={(value, name, props) => [value, props.payload.fullName]}
                      />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {funnelData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Source Donut */}
            <div className="crm-card p-5">
              <h2 className="text-sm font-bold text-surface-800 mb-1">Lead Sources</h2>
              <p className="text-xs text-surface-400 mb-4">Campaign leads by channel</p>
              {sourceData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={sourceData} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3}>
                        {sourceData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-2">
                    {sourceData.map(s => (
                      <div key={s.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                          <span className="text-xs text-surface-600 font-medium">{s.name}</span>
                        </div>
                        <span className="text-xs font-bold text-surface-800">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-40 text-surface-400 text-xs">No campaign leads yet</div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Website Pipeline Funnel */}
            <div className="xl:col-span-3 crm-card p-5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-sm font-bold text-surface-800">Website & AI Lead Pipeline</h2>
                  <p className="text-xs text-surface-400 mt-0.5">Leads by stage</p>
                </div>
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                <div className="min-w-[1000px]">
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={websiteFunnelData} barSize={28} margin={{ top: 10, right: 15, left: -20, bottom: 35 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 9, fill: '#94a3b8' }} 
                        interval={0} 
                        height={60} 
                        angle={-30}
                        textAnchor="end"
                        axisLine={false} 
                        tickLine={false} 
                      />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 12 }}
                        cursor={{ fill: '#f8fafb' }}
                        formatter={(value, name, props) => [value, props.payload.fullName]}
                      />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {websiteFunnelData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Today's Follow-ups */}
          <div className="crm-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-surface-800">Today's Follow-ups</h2>
                <p className="text-xs text-surface-400 mt-0.5">{followups.length} task{followups.length !== 1 ? 's' : ''} due today</p>
              </div>
              <Calendar className="w-4 h-4 text-surface-400" />
            </div>
            {followups.length === 0 ? (
              <div className="text-center py-8 text-surface-400">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                <p className="text-sm font-medium">All caught up!</p>
                <p className="text-xs mt-1">No follow-ups due today.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {followups.slice(0, 6).map(fu => {
                  const url = fu.leadType === 'WEBSITE'
                    ? `/website-leads/${fu.leadId}`
                    : `/campaign-leads/${fu.leadId}`;
                  return (
                    <button
                      key={fu.id}
                      onClick={() => router.push(url)}
                      className="w-full text-left flex items-start gap-3 p-3 bg-surface-50 hover:bg-surface-100 border border-surface-100 hover:border-surface-200 rounded-xl transition-all cursor-pointer group"
                    >
                      <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0 mt-1.5 animate-pulse-dot" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-surface-800 group-hover:text-primary-600 transition-colors truncate">
                            {fu.leadName || 'Anonymous Lead'}
                          </p>
                          <span className={clsx(
                            'text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 uppercase tracking-wider',
                            fu.leadType === 'WEBSITE'
                              ? 'text-teal-600 bg-teal-50 border border-teal-100'
                              : 'text-indigo-600 bg-indigo-50 border border-indigo-100'
                          )}>
                            {fu.leadType}
                          </span>
                        </div>
                        {fu.propertyName && (
                          <p className="text-[10px] text-surface-500 font-medium truncate mt-0.5">
                            {fu.propertyName}
                          </p>
                        )}
                        {fu.note && (
                          <p className="text-xs text-surface-600 mt-1 truncate bg-white/50 px-2 py-1 rounded border border-surface-100/50">
                            "{fu.note}"
                          </p>
                        )}
                        <p className="text-[10px] text-surface-400 mt-1.5 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-surface-400" />
                          {new Date(fu.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Agent Leaderboard (Admin only) */}
          {isAdmin && (
            <div className="crm-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold text-surface-800">Agent Leaderboard</h2>
                  <p className="text-xs text-surface-400 mt-0.5">Campaign leads performance</p>
                </div>
                <Users className="w-4 h-4 text-surface-400" />
              </div>
              {(data?.agentLeaderboard ?? []).length === 0 ? (
                <div className="text-center py-8 text-surface-400 text-sm">No agent data yet</div>
              ) : (
                <div className="space-y-2">
                  {data!.agentLeaderboard.slice(0, 7).map((agent, i) => {
                    const convRate = agent.total > 0 ? Math.round((Number(agent.won) / agent.total) * 100) : 0;
                    return (
                      <div key={agent.agentId ?? i} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-50 transition-colors">
                        <div className={clsx(
                          'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                          i === 0 ? 'bg-gold text-white' : i === 1 ? 'bg-surface-300 text-surface-700' : i === 2 ? 'bg-amber-600 text-white' : 'bg-surface-100 text-surface-500'
                        )}>{i + 1}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-surface-800 truncate">{agent.agentName ?? 'Unassigned'}</p>
                          <p className="text-[10px] text-surface-400">{agent.total} leads · {Number(agent.won)} won</p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={clsx('text-xs font-bold', convRate >= 30 ? 'text-emerald-600' : convRate >= 10 ? 'text-amber-600' : 'text-surface-400')}>
                            {convRate}%
                          </div>
                          <div className="text-[10px] text-surface-400">conv.</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
