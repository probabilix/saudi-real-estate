'use client';
import { useState, useEffect, useCallback } from 'react';
import { AdminTopBar } from '@/components/AdminSidebar';
import { adminApi, CreditPackage } from '@/lib/api';
import {
  Loader2, Plus, Edit3, CheckCircle,
  XCircle, ToggleLeft, ToggleRight, Save, X, Layers
} from 'lucide-react';
import clsx from 'clsx';

function PackageModal({
  pkg,
  onClose,
  onSave,
}: {
  pkg: Partial<CreditPackage> | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const isNew = !pkg?.id;
  const [form, setForm] = useState({
    key: pkg?.key ?? '',
    nameEn: pkg?.nameEn ?? '',
    nameAr: pkg?.nameAr ?? '',
    descriptionEn: pkg?.descriptionEn ?? '',
    descriptionAr: pkg?.descriptionAr ?? '',
    credits: pkg?.credits ?? 1000,
    priceSar: pkg?.priceSar ?? 799,
    isPopular: pkg?.isPopular ?? false,
    isActive: pkg?.isActive ?? true,
    sortOrder: pkg?.sortOrder ?? 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!form.key || !form.nameEn || !form.credits || !form.priceSar) {
      setError('Key, English name, credits, and SAR price are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = isNew
        ? await adminApi.createCreditPackage(form as any)
        : await adminApi.updateCreditPackage(pkg!.id!, form as any);

      if (res.success) {
        onSave();
        onClose();
      } else {
        setError(res.message || 'Failed to save package.');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-br from-[#0a3d35] to-[#064e4b] p-5 text-white flex items-center justify-between">
          <h2 className="font-black text-lg">{isNew ? 'New Credit Package' : 'Edit Package'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Package Key (unique slug)</label>
              <input
                value={form.key}
                onChange={e => setForm(f => ({ ...f, key: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                placeholder="e.g. starter, growth"
                disabled={!isNew}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#064e4b] bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Name (English)</label>
              <input value={form.nameEn} onChange={e => setForm(f => ({ ...f, nameEn: e.target.value }))}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#064e4b]" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Name (Arabic)</label>
              <input value={form.nameAr} onChange={e => setForm(f => ({ ...f, nameAr: e.target.value }))}
                dir="rtl" className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#064e4b]" />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Description (English)</label>
              <input value={form.descriptionEn} onChange={e => setForm(f => ({ ...f, descriptionEn: e.target.value }))}
                placeholder="Short description for brokers"
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#064e4b]" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Credits</label>
              <input type="number" min={1} value={form.credits} onChange={e => setForm(f => ({ ...f, credits: parseInt(e.target.value) || 0 }))}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#064e4b]" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Price (SAR)</label>
              <input type="number" min={1} value={form.priceSar} onChange={e => setForm(f => ({ ...f, priceSar: parseInt(e.target.value) || 0 }))}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#064e4b]" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Sort Order</label>
              <input type="number" min={0} value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#064e4b]" />
            </div>
            <div className="flex items-end gap-4 pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <button type="button" onClick={() => setForm(f => ({ ...f, isPopular: !f.isPopular }))}
                  className={clsx('transition-colors', form.isPopular ? 'text-amber-500' : 'text-slate-300')}>
                  {form.isPopular ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
                </button>
                <span className="text-sm font-medium text-slate-700">Popular</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <button type="button" onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                  className={clsx('transition-colors', form.isActive ? 'text-emerald-500' : 'text-slate-300')}>
                  {form.isActive ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
                </button>
                <span className="text-sm font-medium text-slate-700">Active</span>
              </label>
            </div>
          </div>

          {form.credits > 0 && form.priceSar > 0 && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
              Cost per credit: <span className="font-bold text-slate-700">{(form.priceSar / form.credits).toFixed(2)} SAR/credit</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose}
              className="flex-1 h-10 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 h-10 rounded-xl bg-[#064e4b] text-white text-sm font-black hover:bg-[#0a3d35] transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isNew ? 'Create Package' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminCreditPackagesPage() {
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editPkg, setEditPkg] = useState<Partial<CreditPackage> | null | 'new'>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminApi.getCreditPackages();
    if (res.success && res.data) setPackages(res.data as CreditPackage[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleActive(pkg: CreditPackage) {
    await adminApi.updateCreditPackage(pkg.id, { isActive: !pkg.isActive });
    load();
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <AdminTopBar title="Credit Packages" />

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div className="flex justify-end">
          <button
            onClick={() => setEditPkg('new')}
            className="h-9 px-4 bg-[#064e4b] text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-[#0a3d35] transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Package
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-[#064e4b] animate-spin" />
            </div>
          ) : packages.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <p className="text-sm">No packages yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {['Key', 'Name', 'Credits', 'SAR Price', 'Cost/cr', 'Popular', 'Active', 'Order', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {packages.map(pkg => (
                    <tr key={pkg.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{pkg.key}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{pkg.nameEn}</td>
                      <td className="px-4 py-3 font-black text-[#064e4b]">{pkg.credits.toLocaleString()}</td>
                      <td className="px-4 py-3 font-bold text-slate-700">{pkg.priceSar.toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{(pkg.priceSar / pkg.credits).toFixed(2)} SAR/cr</td>
                      <td className="px-4 py-3">
                        {pkg.isPopular
                          ? <CheckCircle className="w-4 h-4 text-amber-500" />
                          : <XCircle className="w-4 h-4 text-slate-300" />}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleActive(pkg)}>
                          {pkg.isActive
                            ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                            : <XCircle className="w-4 h-4 text-red-400" />}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{pkg.sortOrder}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setEditPkg(pkg)}
                          className="h-7 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold flex items-center gap-1 transition-colors">
                          <Edit3 className="w-3 h-3" />Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-700">
          <strong>⚠️ Note:</strong> Changing a package&apos;s credits or SAR price only affects <em>new</em> orders. Existing orders retain their original snapshot values and are not affected.
        </div>
      </div>

      {editPkg !== null && (
        <PackageModal
          pkg={editPkg === 'new' ? null : editPkg}
          onClose={() => setEditPkg(null)}
          onSave={load}
        />
      )}
    </div>
  );
}
