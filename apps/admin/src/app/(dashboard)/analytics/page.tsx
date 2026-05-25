'use client';
import { useState, useEffect } from 'react';
import { AdminTopBar } from '@/components/AdminSidebar';
import { 
  BarChart3, TrendingUp, Users, Eye, 
  MapPin, ArrowUpRight, ArrowDownRight,
  PieChart, LineChart, Calendar
} from 'lucide-react';
import clsx from 'clsx';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar,
  Cell, Pie, PieChart as RePieChart
} from 'recharts';

// Mock data for analytics
const GROWTH_DATA = [
  { name: 'Jan', users: 400, listings: 240 },
  { name: 'Feb', users: 520, listings: 300 },
  { name: 'Mar', users: 600, listings: 350 },
  { name: 'Apr', users: 800, listings: 480 },
  { name: 'May', users: 950, listings: 520 },
  { name: 'Jun', users: 1200, listings: 680 },
];

const CITY_DATA = [
  { name: 'Riyadh', value: 45 },
  { name: 'Jeddah', value: 25 },
  { name: 'Dammam', value: 15 },
  { name: 'Makkah', value: 10 },
  { name: 'Other', value: 5 },
];

import { adminApi, AdminStats } from '@/lib/api';

const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];

export default function AnalyticsPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getStats().then(r => {
      if (r.success && r.data) setStats(r.data);
      setLoading(false);
    });
  }, []);

  const cityData = stats ? Object.entries(stats.listingsByCity).map(([name, value]) => ({ name, value })) : CITY_DATA;
  const growthData = stats ? stats.revenueByMonth.map(m => ({ name: m.month, users: 0, listings: 0, revenue: m.revenue })) : GROWTH_DATA;
  return (
    <div className="flex flex-col h-full bg-canvas">
      <AdminTopBar title="Platform Analytics" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="User Retention" 
            value="84.2%" 
            change="+2.4%" 
            trend="up"
            icon={Users}
            color="blue"
          />
          <StatCard 
            title="Avg. Session Time" 
            value="4m 32s" 
            change="-12s" 
            trend="down"
            icon={Calendar}
            color="amber"
          />
          <StatCard 
            title="Search Conversion" 
            value="12.8%" 
            change="+1.2%" 
            trend="up"
            icon={TrendingUp}
            color="emerald"
          />
          <StatCard 
            title="Page Views" 
            value="142.5k" 
            change="+18%" 
            trend="up"
            icon={Eye}
            color="indigo"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Growth Chart */}
          <div className="admin-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-bold text-surface-900">User & Inventory Growth</h3>
                <p className="text-xs text-surface-500">Trailing 6 months performance</p>
              </div>
              <BarChart3 className="w-5 h-5 text-surface-300" />
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growthData}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="users" stroke="#2563eb" fillOpacity={1} fill="url(#colorUsers)" strokeWidth={2} />
                  <Area type="monotone" dataKey="listings" stroke="#10b981" fillOpacity={0} strokeWidth={2} strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Regional Distribution */}
          <div className="admin-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-bold text-surface-900">Market Share by City</h3>
                <p className="text-xs text-surface-500">Listing volume distribution</p>
              </div>
              <MapPin className="w-5 h-5 text-surface-300" />
            </div>
            <div className="flex items-center h-80">
              <div className="flex-1 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={cityData}
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {CITY_DATA.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-48 space-y-3">
                {cityData.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-xs text-surface-600">{item.name}</span>
                    </div>
                    <span className="text-xs font-bold text-surface-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function StatCard({ title, value, change, trend, icon: Icon, color }: any) {
  const isUp = trend === 'up';
  
  return (
    <div className="admin-card p-5">
      <div className="flex items-start justify-between">
        <div className={clsx(
          "p-2 rounded-xl",
          color === 'blue' ? "bg-blue-50 text-blue-600" :
          color === 'amber' ? "bg-amber-50 text-amber-600" :
          color === 'emerald' ? "bg-emerald-50 text-emerald-600" :
          "bg-indigo-50 text-indigo-600"
        )}>
          <Icon className="w-5 h-5" />
        </div>
        <div className={clsx(
          "flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full",
          isUp ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
        )}>
          {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {change}
        </div>
      </div>
      <div className="mt-4">
        <p className="text-xs font-medium text-surface-500 uppercase tracking-wider">{title}</p>
        <h4 className="text-2xl font-black text-surface-900 mt-1">{value}</h4>
      </div>
    </div>
  );
}
