'use client';
import { useEffect, useState } from 'react';
import { crmApi, SystemSetting } from '@/lib/api';
import { CrmTopBar } from '@/components/CrmSidebar';
import { useCrmAuth } from '@/hooks/use-crm-auth';
import {
  Settings, Eye, EyeOff, Save, Check, Loader2,
  Webhook, Copy, CheckCircle2, User, FileText
} from 'lucide-react';
import clsx from 'clsx';

const WEBHOOK_SETTINGS = [
  {
    section: 'Meta Lead Ads',
    color: 'bg-blue-500',
    description: 'Connect Meta Business Lead Ads to automatically capture leads from Facebook & Instagram campaigns.',
    webhookPath: '/api/v1/crm/webhooks/meta',
    keys: [
      { key: 'META_VERIFY_TOKEN', label: 'Verify Token', hint: 'A random secret string you create — set this same value in Meta Business Suite' },
      { key: 'META_PAGE_ACCESS_TOKEN', label: 'Page Access Token', hint: 'Generate from Meta Business Suite → Webhooks → Page Token' },
    ],
  },
  {
    section: 'Snapchat Ads',
    color: 'bg-yellow-400',
    description: 'Connect Snapchat Lead Generation Ads. (Coming soon — save token now, activate later)',
    webhookPath: '/api/v1/crm/webhooks/snapchat',
    keys: [
      { key: 'SNAPCHAT_ACCESS_TOKEN', label: 'Access Token', hint: 'From Snapchat Business Manager → Lead Generation API' },
    ],
  },
  {
    section: 'TikTok Ads',
    color: 'bg-rose-500',
    description: 'Connect TikTok Lead Generation Ads. (Coming soon — save token now, activate later)',
    webhookPath: '/api/v1/crm/webhooks/tiktok',
    keys: [
      { key: 'TIKTOK_ACCESS_TOKEN', label: 'Access Token', hint: 'From TikTok Ads Manager → Lead Generation → API' },
    ],
  },
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') ?? 'http://localhost:3001';

export default function CrmSettingsPage() {
  const { isAdmin } = useCrmAuth();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  // Profile Settings States
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [nationality, setNationality] = useState('');
  const [city, setCity] = useState('');
  const [regaLicence, setRegaLicence] = useState('');
  const [bio, setBio] = useState('');
  const [submittingProfile, setSubmittingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (isAdmin) {
        const res = await crmApi.getCrmSettings();
        if (res.success && res.data) {
          const map: Record<string, string> = {};
          for (const s of res.data) map[s.key] = s.value;
          setSettings(map);
          setEditValues(map);
        }
      } else {
        const res = await crmApi.getProfile();
        if (res.success && res.data) {
          const u = res.data.user;
          const p = res.data.profile;
          setName(u.name || '');
          setPhone(u.phone || '');
          setNationality(u.nationality || '');
          setCity(u.city || '');
          setRegaLicence(u.regaLicence || '');
          setBio(p?.bioEn || '');
        }
      }
      setLoading(false);
    }
    load();
  }, [isAdmin]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingProfile(true);
    setProfileSuccess(null);
    setProfileError(null);
    try {
      const res = await crmApi.updateProfile({
        name,
        phone,
        nationality,
        city,
        bioEn: bio,
        bioAr: bio
      });
      if (res.success) {
        setProfileSuccess('Profile updated successfully!');
      } else {
        setProfileError(res.message || 'Failed to update profile.');
      }
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile.');
    } finally {
      setSubmittingProfile(false);
    }
  };

  async function handleSave(key: string) {
    setSaving(p => ({ ...p, [key]: true }));
    await crmApi.updateCrmSetting(key, editValues[key] ?? '');
    setSettings(p => ({ ...p, [key]: editValues[key] ?? '' }));
    setSaving(p => ({ ...p, [key]: false }));
    setSaved(p => ({ ...p, [key]: true }));
    setTimeout(() => setSaved(p => ({ ...p, [key]: false })), 2000);
  }

  function copyWebhookUrl(path: string) {
    const url = `${API_BASE}${path}`;
    navigator.clipboard.writeText(url);
    setCopied(p => ({ ...p, [path]: true }));
    setTimeout(() => setCopied(p => ({ ...p, [path]: false })), 2000);
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
    </div>
  );

  if (!isAdmin) {
    // Render Broker Profile Settings
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        <CrmTopBar title="Profile Settings" subtitle="Update your broker profile, REGA license, bio, and languages" />
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-2xl">
          {profileSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{profileSuccess}</span>
            </div>
          )}
          {profileError && (
            <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 text-xs font-semibold rounded-2xl flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-rose-600 shrink-0 animate-pulse" />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5 shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <User className="w-4 h-4 text-[#064e4b]" />
              <h3 className="text-sm font-bold text-slate-900">Personal Information</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 block uppercase">Full Name</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#064e4b] focus:bg-white transition-all rounded-xl py-2.5 px-3.5 text-xs font-semibold outline-none text-slate-900"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 block uppercase">Phone Number</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#064e4b] focus:bg-white transition-all rounded-xl py-2.5 px-3.5 text-xs font-semibold outline-none text-slate-900"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 block uppercase">Nationality</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#064e4b] focus:bg-white transition-all rounded-xl py-2.5 px-3.5 text-xs font-semibold outline-none text-slate-900"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 block uppercase">City</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#064e4b] focus:bg-white transition-all rounded-xl py-2.5 px-3.5 text-xs font-semibold outline-none text-slate-900"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 pt-3">
              <FileText className="w-4 h-4 text-[#064e4b]" />
              <h3 className="text-sm font-bold text-slate-900">Brokerage Details & Compliance</h3>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 block uppercase">REGA Falcon License (read-only)</label>
              <input
                type="text"
                disabled
                className="w-full bg-slate-100 border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs font-semibold outline-none text-slate-500 cursor-not-allowed font-mono"
                value={regaLicence}
              />
              <p className="text-[10px] text-slate-400">To change your REGA license, please contact admin support.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 block uppercase">Professional Bio</label>
              <textarea
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#064e4b] focus:bg-white transition-all rounded-xl py-2.5 px-3.5 text-xs font-semibold outline-none text-slate-900 resize-none"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={submittingProfile}
                className="py-2.5 px-4 bg-[#064e4b] hover:bg-[#043a37] text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-colors"
              >
                {submittingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save Profile Settings</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <CrmTopBar title="Integrations & Settings" subtitle="Webhook tokens and platform connections" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-3xl">
        {/* Webhook instructions */}
        <div className="crm-card p-5 border-l-4 border-primary-500">
          <div className="flex items-start gap-3">
            <Webhook className="w-5 h-5 text-primary-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-bold text-surface-800 mb-1">How to connect your ad platforms</h2>
              <ol className="text-xs text-surface-600 space-y-1 list-decimal pl-4">
                <li>Copy the webhook URL for your platform below</li>
                <li>In your ad platform's Business Manager, create a webhook and paste the URL</li>
                <li>Save the verification token both here and in the ad platform's settings</li>
                <li>Submit a test lead — it will appear in your Unassigned pool within seconds</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Platform sections */}
        {WEBHOOK_SETTINGS.map(section => (
          <div key={section.section} className="crm-card overflow-hidden">
            {/* Section header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-100">
              <div className={clsx('w-3 h-3 rounded-full shrink-0', section.color)} />
              <div className="flex-1">
                <h3 className="text-sm font-bold text-surface-800">{section.section}</h3>
                <p className="text-xs text-surface-400 mt-0.5">{section.description}</p>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Webhook URL */}
              <div>
                <label className="crm-label">Webhook URL</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-3 bg-surface-900 rounded-xl font-mono text-xs text-emerald-300 truncate">
                    {API_BASE}{section.webhookPath}
                  </div>
                  <button
                    onClick={() => copyWebhookUrl(section.webhookPath)}
                    className={clsx(
                      'btn-secondary text-xs gap-1.5 shrink-0 transition-all',
                      copied[section.webhookPath] && 'bg-emerald-50 border-emerald-200 text-emerald-600'
                    )}
                  >
                    {copied[section.webhookPath] ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied[section.webhookPath] ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Token fields */}
              {section.keys.map(({ key, label, hint }) => (
                <div key={key}>
                  <label className="crm-label">{label}</label>
                  <p className="text-[10px] text-surface-400 mb-2">{hint}</p>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showKeys[key] ? 'text' : 'password'}
                        value={editValues[key] ?? ''}
                        onChange={e => setEditValues(p => ({ ...p, [key]: e.target.value }))}
                        placeholder={`Enter ${label.toLowerCase()}...`}
                        className="crm-input text-xs pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKeys(p => ({ ...p, [key]: !p[key] }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
                      >
                        {showKeys[key] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <button
                      onClick={() => handleSave(key)}
                      disabled={saving[key] || editValues[key] === settings[key]}
                      className={clsx(
                        'shrink-0 transition-all',
                        saved[key]
                          ? 'btn-secondary text-emerald-600 border-emerald-200 bg-emerald-50 text-xs gap-1.5'
                          : 'btn-primary text-xs gap-1.5'
                      )}
                    >
                      {saving[key] ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : saved[key] ? (
                        <><Check className="w-3 h-3" /> Saved!</>
                      ) : (
                        <><Save className="w-3 h-3" /> Save</>
                      )}
                    </button>
                  </div>
                  {settings[key] && (
                    <p className="text-[10px] text-emerald-600 mt-1.5 flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Token configured
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
