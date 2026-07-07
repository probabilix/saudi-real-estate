'use client';
import { useState, useEffect, useCallback } from 'react';
import { AdminTopBar } from '@/components/AdminSidebar';
import { adminApi, AdminCreditOrder } from '@/lib/api';
import {
  Loader2, CheckCircle, Clock, XCircle,
  RefreshCw, ChevronLeft, ChevronRight, Search, Users, CreditCard
} from 'lucide-react';
import clsx from 'clsx';

const ORDER_STATUS_CFG = {
  PENDING:  { label: 'Pending',  color: 'bg-amber-100 text-amber-700 border-amber-200',        icon: Clock },
  PAID:     { label: 'Paid',     color: 'bg-emerald-100 text-emerald-700 border-emerald-200',   icon: CheckCircle },
  FAILED:   { label: 'Failed',   color: 'bg-red-100 text-red-700 border-red-200',               icon: XCircle },
  REFUNDED: { label: 'Refunded', color: 'bg-slate-100 text-slate-600 border-slate-200',         icon: RefreshCw },
} as const;

function StatusBadge({ status }: { status: keyof typeof ORDER_STATUS_CFG }) {
  const cfg = ORDER_STATUS_CFG[status] ?? ORDER_STATUS_CFG.PENDING;
  const Icon = cfg.icon;
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border', cfg.color)}>
      <Icon className="w-3 h-3" />{cfg.label}
    </span>
  );
}

export default function AdminCreditOrdersPage() {
  const [orders, setOrders] = useState<AdminCreditOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const LIMIT = 25;
  const totalPages = Math.ceil(total / LIMIT);

  const paidTotal = orders.filter(o => o.status === 'PAID').reduce((s, o) => s + o.priceSar, 0);
  const paidCount = orders.filter(o => o.status === 'PAID').length;

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminApi.getCreditOrders({ status: filterStatus || undefined, page });
    if (res.success && res.data) {
      setOrders(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    }
    setLoading(false);
  }, [filterStatus, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [filterStatus]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <AdminTopBar title="Credit Orders" />

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Orders', value: total, color: 'text-primary-600', icon: Search },
            { label: 'Paid on Page', value: paidCount, color: 'text-emerald-600', icon: CheckCircle },
            { label: 'Revenue on Page (SAR)', value: paidTotal.toLocaleString(), color: 'text-blue-600', icon: Users },
          ].map(stat => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
                <div className={`w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center ${stat.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xl font-black text-slate-800">{stat.value}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-tight">{stat.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap gap-3 items-center shadow-sm">
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="h-9 px-3 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:border-[#064e4b] text-slate-700"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PAID">Paid</option>
            <option value="FAILED">Failed</option>
            <option value="REFUNDED">Refunded</option>
          </select>
          <button onClick={load}
            className="h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-1.5 text-sm">
            <RefreshCw className={clsx('w-3.5 h-3.5', loading && 'animate-spin')} />
            Refresh
          </button>
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-[#064e4b] animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No orders found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {['Broker', 'Package', 'Credits', 'SAR', 'Status', 'Moyasar ID', 'Date'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800 text-sm">{order.brokerName ?? '—'}</div>
                        <div className="text-xs text-slate-400 truncate max-w-[150px]">{order.brokerEmail}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded-lg">{order.packageKey}</span>
                        <div className="text-xs text-slate-500 mt-0.5">{order.packageNameEn}</div>
                      </td>
                      <td className="px-4 py-3 font-black text-[#064e4b]">{order.creditsAmount.toLocaleString()}</td>
                      <td className="px-4 py-3 font-bold text-slate-700">{order.priceSar.toLocaleString()}</td>
                      <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-[10px] text-slate-400 truncate block max-w-[120px]">
                          {order.moyasarPaymentId ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
              <span className="text-xs text-slate-500">Showing {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, total)} of {total}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="h-7 w-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-bold text-slate-600">{page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="h-7 w-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
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
