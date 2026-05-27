'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminTopBar } from '@/components/AdminSidebar';
import { adminApi, AdminStats } from '@/lib/api';
import {
  Users, Building2, ShieldCheck, CheckCircle2, AlertCircle, Clock,
  ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import clsx from 'clsx';

const INITIAL_STATS: AdminStats = {
  totalUsers: 0,
  totalListings: 0,
  activeListings: 0,
  pendingVerifications: 0,
  totalRevenueSar: 0,
  newUsersToday: 0,
  newListingsToday: 0,
  platformHealth: 'healthy',
  usersByRole: {},
  listingsByStatus: {},
  listingsByCity: {},
  revenueByMonth: [],
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
  const [stats, setStats] = useState<AdminStats>(INITIAL_STATS);
  const [loading, setLoading] = useState(true);

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
    <div className="flex flex-col h-full bg-canvas">
      <AdminTopBar title="Dashboard Overview" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Health Banner */}
        <div className={clsx(
          'flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-300',
          loading 
            ? 'bg-surface-50 border-surface-200 text-surface-400 animate-pulse'
            : stats.platformHealth === 'healthy'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-amber-50 border-amber-200 text-amber-700'
        )}>
          {loading ? (
            <div className="h-4 w-4 rounded-full bg-surface-200 shrink-0" />
          ) : stats.platformHealth === 'healthy' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          {loading ? (
            <div className="h-4 w-64 bg-surface-200 rounded" />
          ) : (
            <>
              Platform is running healthy — All systems operational.
              {stats.pendingVerifications > 0 && (
                <span className="ml-auto flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {stats.pendingVerifications} verifications awaiting review
                </span>
              )}
            </>
          )}
        </div>

        {/* KPI Row (3 Columns) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            label="Total Users"
            value={stats.totalUsers.toLocaleString()}
            sub={`+${stats.newUsersToday} today`}
            trend="up"
            icon={<Users className="w-5 h-5 text-blue-600" />}
            iconBg="bg-blue-50"
            loading={loading}
          />
          <StatCard
            label="Active Listings"
            value={stats.activeListings.toLocaleString()}
            sub={`${stats.totalListings.toLocaleString()} total`}
            trend="up"
            icon={<Building2 className="w-5 h-5 text-primary-600" />}
            iconBg="bg-primary-50"
            loading={loading}
          />
          <StatCard
            label="Pending Verifications"
            value={stats.pendingVerifications.toString()}
            sub="Requires attention"
            trend={stats.pendingVerifications > 10 ? 'warn' : 'neutral'}
            icon={<ShieldCheck className="w-5 h-5 text-amber-600" />}
            iconBg="bg-amber-50"
            loading={loading}
          />
        </div>

        {/* Charts Section (3 Columns Layout) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Listings by Status */}
          <div className="admin-card p-5 flex flex-col h-[320px]">
            <h2 className="text-sm font-bold text-surface-800 mb-1">Listings by Status</h2>
            <p className="text-xs text-surface-400 mb-4">Distribution across all states</p>
            <div className="flex-1 min-h-0 relative">
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full border-4 border-surface-200 border-t-primary-600 animate-spin" />
                </div>
              ) : listingStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
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
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-surface-400">
                  No data available
                </div>
              )}
            </div>
          </div>

          {/* Listings by City */}
          <div className="admin-card p-5 flex flex-col h-[320px]">
            <h2 className="text-sm font-bold text-surface-800 mb-1">Listings by City</h2>
            <p className="text-xs text-surface-400 mb-4">Geographic distribution of inventory</p>
            <div className="flex-1 min-h-0 relative">
              {loading ? (
                <div className="absolute inset-0 flex flex-col justify-around py-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="h-3 w-10 bg-surface-200 rounded animate-pulse" />
                      <div className="h-3 flex-1 bg-surface-200 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : cityData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cityData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={65} />
                    <Tooltip formatter={(v: number) => [v.toLocaleString(), 'Listings']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {cityData.map((_, i) => (
                        <Cell key={i} fill={CITY_COLORS[i % CITY_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-surface-400">
                  No data available
                </div>
              )}
            </div>
          </div>

          {/* Users by Role */}
          <div className="admin-card p-5 flex flex-col h-[320px]">
            <h2 className="text-sm font-bold text-surface-800 mb-1">Users by Role</h2>
            <p className="text-xs text-surface-400 mb-4">Platform user composition breakdown</p>
            <div className="flex-1 min-h-0 relative">
              {loading ? (
                <div className="absolute inset-0 flex items-end justify-between px-4 pb-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="flex flex-col items-center gap-2">
                      <div className="w-6 bg-surface-200 rounded animate-pulse" style={{ height: `${i * 20}px` }} />
                      <div className="h-3 w-8 bg-surface-200 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : userRoleData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={userRoleData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: number) => [v.toLocaleString(), 'Users']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="value" fill="#0D7377" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-surface-400">
                  No data available
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="admin-card p-5">
          <h2 className="text-sm font-bold text-surface-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: 'Review Verifications', href: '/verifications', color: 'bg-amber-50 border-amber-200 text-amber-700', icon: ShieldCheck },
              { label: 'Manage Users', href: '/users', color: 'bg-blue-50 border-blue-200 text-blue-700', icon: Users },
              { label: 'Edit Site Settings', href: '/settings', color: 'bg-primary-50 border-primary-200 text-primary-700', icon: Building2 },
            ].map(action => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className={`flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border font-bold text-xs transition-all hover:shadow-card-hover ${action.color}`}
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
  label, value, sub, trend, icon, iconBg, loading
}: {
  label: string;
  value: string;
  sub: string;
  trend: 'up' | 'down' | 'warn' | 'neutral';
  icon: React.ReactNode;
  iconBg: string;
  loading: boolean;
}) {
  return (
    <div className="stat-card relative overflow-hidden transition-all duration-300">
      {loading ? (
        <div className="flex items-center gap-4 w-full h-full">
          <div className="h-10 w-10 rounded-xl bg-surface-100 animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-16 bg-surface-100 rounded animate-pulse" />
            <div className="h-6 w-24 bg-surface-100 rounded animate-pulse" />
            <div className="h-3 w-28 bg-surface-100 rounded animate-pulse" />
          </div>
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
