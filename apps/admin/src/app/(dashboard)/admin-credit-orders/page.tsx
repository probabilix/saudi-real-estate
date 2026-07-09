'use client';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { AdminTopBar } from '@/components/AdminSidebar';
import { adminApi, AdminCreditOrder } from '@/lib/api';
import {
  Loader2, CheckCircle, Clock, XCircle,
  RefreshCw, ChevronLeft, ChevronRight, Search, Users, CreditCard,
  Download, X, Calendar
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
  const router = useRouter();
  const [orders, setOrders] = useState<AdminCreditOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const LIMIT = 25;
  const totalPages = Math.ceil(total / LIMIT);

  // Detail View Modal State
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [selectedOrderLoading, setSelectedOrderLoading] = useState(false);

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

  // Detect orderId in URL query params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('orderId');
    if (orderId) {
      fetchAndOpenOrderDetails(orderId);
    }
  }, []);

  const fetchAndOpenOrderDetails = async (orderId: string) => {
    setSelectedOrderLoading(true);
    try {
      const res = await adminApi.getCreditOrderDetails(orderId);
      if (res.success && res.data) {
        setSelectedOrder(res.data);
      }
    } catch (err) {
      console.error('Failed to load order details:', err);
    } finally {
      setSelectedOrderLoading(false);
    }
  };

  const handleExportOrders = async () => {
    setExporting(true);
    try {
      const res = await adminApi.getCreditOrders({
        status: filterStatus || undefined,
        limit: 5000
      });
      if (res.success && res.data) {
        const ordersToExport = res.data.data;
        const csvRows = [
          ['Broker Name', 'Broker Email', 'Package Key', 'Package Name', 'Credits Amount', 'Price (SAR)', 'Status', 'Moyasar ID', 'Date']
        ];
        ordersToExport.forEach(o => {
          csvRows.push([
            o.brokerName || '',
            o.brokerEmail || '',
            o.packageKey || '',
            o.packageNameEn || '',
            String(o.creditsAmount || 0),
            String(o.priceSar || 0),
            o.status || '',
            o.moyasarPaymentId || '',
            new Date(o.createdAt).toLocaleDateString('en-GB')
          ]);
        });
        
        const csvContent = "\uFEFF" + csvRows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `orders_export_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('Failed to export orders:', err);
    } finally {
      setExporting(false);
    }
  };

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

          <button onClick={handleExportOrders} disabled={exporting}
            className="h-9 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors flex items-center gap-2 text-sm ml-auto disabled:opacity-50 shadow-sm font-semibold"
          >
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-slate-500" />}
            <span>Export Orders</span>
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
                    <tr
                      key={order.id}
                      onClick={() => fetchAndOpenOrderDetails(order.id)}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                      title="Click to view full order details"
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800 text-sm hover:text-primary-750 transition-colors">{order.brokerName ?? '—'}</div>
                        <div className="text-xs text-slate-400 select-all font-mono">{order.brokerEmail}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded-lg text-slate-700">{order.packageKey}</span>
                        <div className="text-xs text-slate-500 mt-0.5">{order.packageNameEn}</div>
                      </td>
                      <td className="px-4 py-3 font-black text-[#064e4b]">{order.creditsAmount.toLocaleString()}</td>
                      <td className="px-4 py-3 font-bold text-slate-700">{order.priceSar.toLocaleString()}</td>
                      <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-[10.5px] text-slate-500 select-all">
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

      {/* ── Order Details Modal ── */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 animate-scale-up">
            {/* Header */}
            <div className="bg-gradient-to-br from-[#0a3d35] to-[#064e4b] p-6 text-white flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#a3cbc8]">Order Details</p>
                <h3 className="text-lg font-black mt-1 truncate max-w-[280px]">
                  {selectedOrder.packageNameEn || 'Credits Package'}
                </h3>
                <p className="text-xs text-[#a3cbc8] font-mono mt-0.5">{selectedOrder.id}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedOrder(null);
                  router.replace('/admin-credit-orders', { scroll: false });
                }}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Order Status Bar */}
              <div className="flex justify-between items-center bg-slate-50 border border-slate-100 rounded-2xl p-4">
                <div>
                  <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Status</span>
                  <div className="mt-1"><StatusBadge status={selectedOrder.status} /></div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Price Paid</span>
                  <span className="text-lg font-black text-[#064e4b]">{selectedOrder.priceSar.toLocaleString()} SAR</span>
                </div>
              </div>

              {/* Grid details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Credits Purchased</span>
                  <span className="font-black text-slate-800 text-base">{selectedOrder.creditsAmount.toLocaleString()} credits</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Package Key</span>
                  <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded-lg inline-block text-slate-700">{selectedOrder.packageKey}</span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Broker Info</h4>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-medium">Name:</span>
                    <span className="font-semibold text-slate-800">{selectedOrder.brokerName ?? '—'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-medium">Email:</span>
                    <span className="font-mono text-slate-800 select-all">{selectedOrder.brokerEmail}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-medium">Phone:</span>
                    <span className="font-semibold text-slate-800">{selectedOrder.brokerPhone ?? '—'}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Transaction Info</h4>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-medium">Moyasar Payment ID:</span>
                    <span className="font-mono text-slate-800 select-all">{selectedOrder.moyasarPaymentId ?? '—'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-medium">Order Created:</span>
                    <span className="text-slate-700">{new Date(selectedOrder.createdAt).toLocaleString()}</span>
                  </div>
                  {selectedOrder.creditedAt && (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400 font-medium">Wallet Credited:</span>
                      <span className="text-slate-700">{new Date(selectedOrder.creditedAt).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Raw Moyasar Metadata */}
              {selectedOrder.metadata && Object.keys(selectedOrder.metadata).length > 0 && (
                <div className="border-t border-slate-100 pt-4 space-y-2">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Moyasar Metadata</h4>
                  <pre className="text-[10px] bg-slate-900 text-slate-200 p-4 rounded-2xl overflow-x-auto max-h-40 font-mono leading-relaxed select-all">
                    {JSON.stringify(selectedOrder.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay for URL loading */}
      {selectedOrderLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <Loader2 className="w-10 h-10 text-white animate-spin" />
        </div>
      )}
    </div>
  );
}
