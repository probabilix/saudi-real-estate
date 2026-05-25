'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminTopBar } from '@/components/AdminSidebar';
import { adminApi, AdminStats } from '@/lib/api';
import {
  Users, Building2, ShieldCheck, TrendingUp,
  Activity, AlertCircle, CheckCircle2, Clock,
  ArrowUpRight, ArrowDownRight, UserPlus, Home
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import clsx from 'clsx';

// ── Mock stats for initial render (replace with real API call once admin routes are built)
const MOCK_STATS: AdminStats = {
  totalUsers: 1284,
  totalListings: 3921,
  activeListings: 2847,
  pendingVerifications: 23,
  totalRevenueSar: 487500,
  newUsersToday: 14,
  newListingsToday: 37,
  platformHealth: 'healthy',
  usersByRole: { ADMIN: 2, FIRM: 45, AGENT: 187, SOLO_BROKER: 234, OWNER: 312, BUYER: 504 },
  listingsByStatus: { ACTIVE: 2847, DRAFT: 612, FLAGGED: 23, SOLD: 318, RENTED: 121 },
  listingsByCity: { Riyadh: 1423, Jeddah: 987, Dammam: 412, Mecca: 234, Medina: 189, Other: 676 },
  revenueByMonth: [
    { month: 'Oct', revenue: 32000 },
    { month: 'Nov', revenue: 45000 },
    { month: 'Dec', revenue: 38000 },
    { month: 'Jan', revenue: 62000 },
    { month: 'Feb', revenue: 71000 },
    { month: 'Mar', revenue: 89000 },
    { month: 'Apr', revenue: 104000 },
    { month: 'May', revenue: 46500 },
  ],
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#10b981',
  DRAFT: '#94a3b8',
  FLAGGED: '#f59e0b',
  SOLD: '#6366f1',
  RENTED: '#0ea5e9',
};

const CITY_COLORS = ['#0D7377', '#14BDBD', '#0ea5e9', '#6366f1', '#8b5cf6', '#94a3b8'];

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin', FIRM: 'Firms', AGENT: 'Agents',
  SOLO_BROKER: 'Solo Brokers', OWNER: 'Owners', BUYER: 'Buyers'
};

export default function DashboardPage() {
  const [stats, setStats] = useState<AdminStats>(MOCK_STATS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);
    const r = await adminApi.getStats();
    if (r.success && r.data) {
      setStats(r.data);
    }
    setLoading(false);
  }

  const listingStatusData = Object.entries(stats.listingsByStatus).map(([name, value]) => ({ name, value }));
  const cityData = Object.entries(stats.listingsByCity).map(([name, value]) => ({ name, value }));
  const userRoleData = Object.entries(stats.usersByRole)
    .filter(([role]) => role !== 'ADMIN')
    .map(([role, value]) => ({ name: ROLE_LABELS[role] || role, value }));

  return (
    <div className="flex flex-col h-full">
      <AdminTopBar title="Dashboard Overview" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Health Banner */}
        <div className={clsx(
          'flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium',
          stats.platformHealth === 'healthy'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-amber-50 border-amber-200 text-amber-700'
        )}>
          {stats.platformHealth === 'healthy'
            ? <CheckCircle2 className="w-4 h-4" />
            : <AlertCircle className="w-4 h-4" />
          }
          Platform is running healthy — All systems operational.
          {stats.pendingVerifications > 0 && (
            <span className="ml-auto flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {stats.pendingVerifications} verifications awaiting review
            </span>
          )}
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Users"
            value={stats.totalUsers.toLocaleString()}
            sub={`+${stats.newUsersToday} today`}
            trend="up"
            icon={<Users className="w-5 h-5 text-blue-600" />}
            iconBg="bg-blue-50"
          />
          <StatCard
            label="Active Listings"
            value={stats.activeListings.toLocaleString()}
            sub={`${stats.totalListings.toLocaleString()} total`}
            trend="up"
            icon={<Building2 className="w-5 h-5 text-primary-600" />}
            iconBg="bg-primary-50"
          />
          <StatCard
            label="Revenue (SAR)"
            value={`${(stats.totalRevenueSar / 1000).toFixed(0)}K`}
            sub="Cumulative"
            trend="up"
            icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
            iconBg="bg-emerald-50"
          />
          <StatCard
            label="Pending Verifs."
            value={stats.pendingVerifications.toString()}
            sub="Needs attention"
            trend={stats.pendingVerifications > 10 ? 'warn' : 'neutral'}
            icon={<ShieldCheck className="w-5 h-5 text-amber-600" />}
            iconBg="bg-amber-50"
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Revenue Area Chart */}
          <div className="admin-card p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-sm font-bold text-surface-800">Revenue Over Time</h2>
                <p className="text-xs text-surface-400 mt-0.5">Monthly subscription & placement revenue (SAR)</p>
              </div>
              <span className="badge badge-green">
                <Activity className="w-3 h-3" /> Live
              </span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={stats.revenueByMonth}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0D7377" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#0D7377" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: number) => [`${v.toLocaleString()} SAR`, 'Revenue']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Area type="monotone" dataKey="revenue" stroke="#0D7377" strokeWidth={2} fill="url(#revenueGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Listing Status Pie */}
          <div className="admin-card p-5">
            <h2 className="text-sm font-bold text-surface-800 mb-1">Listings by Status</h2>
            <p className="text-xs text-surface-400 mb-4">Distribution across all states</p>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={listingStatusData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                  {listingStatusData.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [v.toLocaleString(), 'Listings']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Listings by City */}
          <div className="admin-card p-5">
            <h2 className="text-sm font-bold text-surface-800 mb-1">Listings by City</h2>
            <p className="text-xs text-surface-400 mb-4">Geographic distribution of inventory</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={cityData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={55} />
                <Tooltip formatter={(v: number) => [v.toLocaleString(), 'Listings']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {cityData.map((_, i) => (
                    <Cell key={i} fill={CITY_COLORS[i % CITY_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Users by Role */}
          <div className="admin-card p-5">
            <h2 className="text-sm font-bold text-surface-800 mb-1">Users by Role</h2>
            <p className="text-xs text-surface-400 mb-4">Platform user composition breakdown</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={userRoleData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number) => [v.toLocaleString(), 'Users']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="value" fill="#0D7377" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="admin-card p-5">
          <h2 className="text-sm font-bold text-surface-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Review Verifications', href: '/verifications', color: 'bg-amber-50 border-amber-200 text-amber-700', icon: ShieldCheck },
              { label: 'Manage Users', href: '/users', color: 'bg-blue-50 border-blue-200 text-blue-700', icon: Users },
              { label: 'Flag Review Queue', href: '/listings?status=FLAGGED', color: 'bg-red-50 border-red-200 text-red-700', icon: AlertCircle },
              { label: 'Edit Site Settings', href: '/settings', color: 'bg-primary-50 border-primary-200 text-primary-700', icon: Home },
            ].map(action => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border font-semibold text-xs transition-all hover:shadow-card-hover ${action.color}`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {action.label}
                </Link>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

function StatCard({
  label, value, sub, trend, icon, iconBg
}: {
  label: string;
  value: string;
  sub: string;
  trend: 'up' | 'down' | 'warn' | 'neutral';
  icon: React.ReactNode;
  iconBg: string;
}) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${iconBg}`}>{icon}</div>
      <div className="min-w-0">
        <div className="text-xs text-surface-500 font-medium mb-0.5">{label}</div>
        <div className="text-2xl font-bold text-surface-900">{value}</div>
        <div className={clsx(
          'flex items-center gap-1 text-xs font-medium mt-1',
          trend === 'up' ? 'text-emerald-600' : trend === 'warn' ? 'text-amber-600' : 'text-surface-400'
        )}>
          {trend === 'up' && <ArrowUpRight className="w-3.5 h-3.5" />}
          {trend === 'down' && <ArrowDownRight className="w-3.5 h-3.5" />}
          {sub}
        </div>
      </div>
    </div>
  );
}
