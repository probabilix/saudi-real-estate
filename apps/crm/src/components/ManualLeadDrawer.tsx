'use client';
import { useState } from 'react';
import { crmApi, CrmAgent } from '@/lib/api';
import { X, Plus, Loader2, Phone, Mail, Building2, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useEffect } from 'react';
import { useCrmAuth } from '@/hooks/use-crm-auth';

const PROPERTY_TYPES = [
  'APARTMENT', 'VILLA', 'FLOOR', 'TOWNHOUSE', 'DUPLEX',
  'OFFICE', 'WAREHOUSE', 'COMMERCIAL_LAND', 'RESIDENTIAL_LAND',
];

const SOURCES = [
  { key: 'META_ADS', label: 'Meta Ads' },
  { key: 'SNAPCHAT', label: 'Snapchat' },
  { key: 'TIKTOK', label: 'TikTok' },
  { key: 'WHATSAPP', label: 'WhatsApp' },
  { key: 'MANUAL', label: 'Manual (Walk-in)' },
];

const CITIES = ['Riyadh', 'Jeddah', 'Dammam', 'Mecca', 'Madinah', 'Khobar', 'Tabuk', 'Abha', 'NEOM'];

interface ManualLeadDrawerProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function ManualLeadDrawer({ open, onClose, onCreated }: ManualLeadDrawerProps) {
  const { isAdmin } = useCrmAuth();
  const [agents, setAgents] = useState<CrmAgent[]>([]);
  const [form, setForm] = useState({
    name: '', phone: '', email: '', cityPreference: '', propertyInterest: '',
    source: 'MANUAL', assignedAgentId: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dupWarning, setDupWarning] = useState('');

  useEffect(() => {
    if (open && isAdmin) {
      crmApi.getAgents().then(r => { if (r.success && r.data) setAgents(r.data); });
    }
  }, [open, isAdmin]);

  function resetForm() {
    setForm({ name: '', phone: '', email: '', cityPreference: '', propertyInterest: '', source: 'MANUAL', assignedAgentId: '' });
    setError('');
    setDupWarning('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) { setError('Name and phone are required'); return; }
    setLoading(true);
    setError('');
    const res = await crmApi.createCampaignLead({
      name: form.name,
      phone: form.phone,
      email: form.email || undefined,
      cityPreference: form.cityPreference || undefined,
      propertyInterest: form.propertyInterest || undefined,
      source: form.source,
      assignedAgentId: form.assignedAgentId || undefined,
    });
    setLoading(false);
    if (res.success) {
      if ((res as any).isDuplicate) {
        setDupWarning(`⚠ This phone number already exists in CRM (Lead ID: ${(res as any).existingId?.slice(0, 8)}…). Lead was still saved.`);
      }
      resetForm();
      onCreated();
      if (!(res as any).isDuplicate) onClose();
    } else {
      setError(res.error || 'Failed to create lead');
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          />

          {/* Drawer */}
          <motion.aside
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary-600 flex items-center justify-center">
                  <Plus className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-surface-800">Add Manual Lead</h2>
                  <p className="text-[10px] text-surface-400">Walk-in, cold call, or referral</p>
                </div>
              </div>
              <button onClick={() => { resetForm(); onClose(); }} className="btn-ghost p-1.5">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600">{error}</div>
              )}
              {dupWarning && (
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700">{dupWarning}</div>
              )}

              <div>
                <label className="crm-label">Full Name *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-400" />
                  <input
                    value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Mohammed Al-Rashid" required
                    className="crm-input pl-9 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="crm-label">Phone Number *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-400" />
                  <input
                    value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="+966 5X XXX XXXX" required
                    className="crm-input pl-9 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="crm-label">Email (optional)</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-400" />
                  <input
                    type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="example@email.com"
                    className="crm-input pl-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="crm-label">City Interest</label>
                  <select value={form.cityPreference} onChange={e => setForm(p => ({ ...p, cityPreference: e.target.value }))} className="crm-input text-xs">
                    <option value="">Select city</option>
                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="crm-label">Property Type</label>
                  <select value={form.propertyInterest} onChange={e => setForm(p => ({ ...p, propertyInterest: e.target.value }))} className="crm-input text-xs">
                    <option value="">Any type</option>
                    {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="crm-label">Source</label>
                <select value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value }))} className="crm-input text-xs">
                  {SOURCES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </div>

              {isAdmin && agents.length > 0 && (
                <div>
                  <label className="crm-label">Assign to Agent</label>
                  <select value={form.assignedAgentId} onChange={e => setForm(p => ({ ...p, assignedAgentId: e.target.value }))} className="crm-input text-xs">
                    <option value="">Leave unassigned</option>
                    {agents.map(a => <option key={a.id} value={a.id}>{a.name ?? a.email}</option>)}
                  </select>
                </div>
              )}
            </form>

            {/* Footer */}
            <div className="border-t border-surface-100 p-5 flex gap-3 shrink-0">
              <button type="button" onClick={() => { resetForm(); onClose(); }} className="btn-secondary flex-1 justify-center">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="btn-primary flex-1 justify-center"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Lead'}
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
