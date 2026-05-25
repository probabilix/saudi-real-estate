'use client';
import { useState, useEffect } from 'react';
import { AdminTopBar } from '@/components/AdminSidebar';
import { adminApi, SystemSetting, NewsPost } from '@/lib/api';
import {
  Settings, Save, Globe, Share2, CreditCard, 
  Info, Loader2, CheckCircle2, AlertCircle,
  Twitter, Instagram, Linkedin, MessageSquare,
  Youtube, Facebook, Newspaper, Mail, Phone, MapPin
} from 'lucide-react';
import clsx from 'clsx';

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    const result = await adminApi.getAllSettings();
    if (result.success && result.data) {
      setSettings(result.data);
    } else {
      setError('Failed to load settings');
    }
    setLoading(false);
  }

  const getSettingValue = (key: string) => {
    return settings.find(s => s.key === key)?.value || '';
  };

  const handleUpdateSetting = async (key: string, value: string) => {
    setSaving(key);
    setError(null);
    setSuccess(null);
    
    const result = await adminApi.updateSetting(key, value);
    
    if (result.success) {
      setSuccess(`Updated ${key} successfully`);
      setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
    } else {
      setError(result.message || `Failed to update ${key}`);
    }
    setSaving(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <AdminTopBar title="Site Settings" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <AdminTopBar title="Site Settings" />
      
      <div className="flex-1 overflow-y-auto p-6 space-y-8 max-w-4xl">
        
        {/* Status Messages */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm">
            <CheckCircle2 className="w-5 h-5" />
            {success}
          </div>
        )}

        {/* Section: Subscription Plans */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-surface-900">Subscription Plans</h2>
              <p className="text-xs text-surface-500">Manage pricing and tier descriptions</p>
            </div>
          </div>
          
          <div className="admin-card overflow-hidden">
            <SubscriptionEditor 
              value={getSettingValue('subscription_plans')} 
              onSave={(val) => handleUpdateSetting('subscription_plans', val)}
              isSaving={saving === 'subscription_plans'}
            />
          </div>
        </section>

        {/* Section: Social Media */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
              <Share2 className="w-4 h-4 text-primary-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-surface-900">Social Media Links</h2>
              <p className="text-xs text-surface-500">Links displayed in footer and contact sections</p>
            </div>
          </div>
          
          <div className="admin-card p-6">
            <SocialLinksEditor 
              value={getSettingValue('social_links')} 
              onSave={(val) => handleUpdateSetting('social_links', val)}
              isSaving={saving === 'social_links'}
            />
          </div>
        </section>

        {/* Section: Chat & AI Configuration */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-surface-900">Chat & AI Configuration</h2>
              <p className="text-xs text-surface-500">Manage N8N webhooks for the AI assistants</p>
            </div>
          </div>
          
          <div className="admin-card p-6 space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="admin-label">Lead Qualification Webhook (n8n)</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    className="admin-input" 
                    placeholder="https://n8n.your-instance.com/webhook/..."
                    defaultValue={getSettingValue('ai_qualification_webhook')}
                    onBlur={(e) => handleUpdateSetting('ai_qualification_webhook', e.target.value)}
                  />
                  <button className="btn-secondary px-3">
                    {saving === 'ai_qualification_webhook' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-surface-400 mt-2">Used on property pages to vet leads before showing contact info</p>
              </div>

              <div>
                <label className="admin-label">General Assistant Webhook (n8n)</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    className="admin-input" 
                    placeholder="https://n8n.your-instance.com/webhook/..."
                    defaultValue={getSettingValue('ai_general_assistant_webhook')}
                    onBlur={(e) => handleUpdateSetting('ai_general_assistant_webhook', e.target.value)}
                  />
                  <button className="btn-secondary px-3">
                    {saving === 'ai_general_assistant_webhook' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-surface-400 mt-2">The floating bubble assistant for site-wide queries</p>
              </div>

              <div>
                <label className="admin-label">n8n Webhook Secret Key (X-Webhook-Secret)</label>
                <div className="flex gap-2">
                  <input 
                    type="password" 
                    className="admin-input" 
                    placeholder="Shared secret password used for header validation"
                    defaultValue={getSettingValue('n8n_webhook_secret')}
                    onBlur={(e) => handleUpdateSetting('n8n_webhook_secret', e.target.value)}
                  />
                  <button className="btn-secondary px-3">
                    {saving === 'n8n_webhook_secret' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-surface-400 mt-2">Secures your n8n workflows by verifying caller headers.</p>
              </div>

              <div>
                <label className="admin-label">n8n Rest API Key</label>
                <div className="flex gap-2">
                  <input 
                    type="password" 
                    className="admin-input" 
                    placeholder="Authentication API key generated inside your n8n settings"
                    defaultValue={getSettingValue('n8n_api_key')}
                    onBlur={(e) => handleUpdateSetting('n8n_api_key', e.target.value)}
                  />
                  <button className="btn-secondary px-3">
                    {saving === 'n8n_api_key' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-surface-400 mt-2">Permits the backend to communicate programmatically with the self-hosted n8n API.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section: Homepage Featured Articles */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Newspaper className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-surface-900">Homepage Featured Articles</h2>
              <p className="text-xs text-surface-500">Select exactly up to 3 published news posts to feature on the homepage blog grid</p>
            </div>
          </div>
          
          <div className="admin-card">
            <FeaturedArticlesEditor 
              value={getSettingValue('homepage_featured_articles')} 
              onSave={(val) => handleUpdateSetting('homepage_featured_articles', val)}
              isSaving={saving === 'homepage_featured_articles'}
            />
          </div>
        </section>

        {/* Section: Homepage Trust Stats */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
              <Settings className="w-4 h-4 text-teal-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-surface-900">Homepage Trust Stats</h2>
              <p className="text-xs text-surface-500">Numbers shown in the dark Trust section on the homepage</p>
            </div>
          </div>
          <div className="admin-card p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { field: 'listings', label: 'Listings Count', placeholder: '200+' },
              { field: 'transactions', label: 'Transactions Volume', placeholder: 'SAR 50M+' },
              { field: 'cities', label: 'Prime Cities', placeholder: '4' },
              { field: 'ownership', label: 'Direct Ownership %', placeholder: '100%' },
            ].map(({ field, label, placeholder }) => {
              const rawVal = getSettingValue('homepage_stats');
              let parsed: any = {};
              try { parsed = rawVal ? JSON.parse(rawVal) : {}; } catch {}
              return (
                <div key={field}>
                  <label className="admin-label">{label}</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="admin-input"
                      defaultValue={parsed[field] || ''}
                      placeholder={placeholder}
                      onBlur={(e) => {
                        const current = getSettingValue('homepage_stats');
                        let obj: any = {};
                        try { obj = current ? JSON.parse(current) : {}; } catch {}
                        obj[field] = e.target.value;
                        handleUpdateSetting('homepage_stats', JSON.stringify(obj));
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section: General Platform Settings */}

        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <Settings className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-surface-900">Platform Economics</h2>
              <p className="text-xs text-surface-500">Core business variables and costs</p>
            </div>
          </div>
          
          <div className="admin-card p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="admin-label">Listing Cost (Credits)</label>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  className="admin-input" 
                  defaultValue={getSettingValue('listing_cost_credits')}
                  onBlur={(e) => handleUpdateSetting('listing_cost_credits', e.target.value)}
                />
                <button className="btn-secondary px-3">
                  {saving === 'listing_cost_credits' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-surface-400 mt-2">Credits deducted per property published</p>
            </div>
          </div>
        </section>

        {/* Section: Contact & Location Settings */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
              <Phone className="w-4 h-4 text-teal-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-surface-900">Contact & Location Settings</h2>
              <p className="text-xs text-surface-500">Edit the primary platform contact details and office location</p>
            </div>
          </div>
          
          <div className="admin-card p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="admin-label flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-surface-400" />
                Contact Phone
              </label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  className="admin-input" 
                  defaultValue={getSettingValue('contact_phone')}
                  onBlur={(e) => handleUpdateSetting('contact_phone', e.target.value)}
                />
                <button className="btn-secondary px-3">
                  {saving === 'contact_phone' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-surface-400 mt-2">Primary contact phone number displayed across the site</p>
            </div>

            <div>
              <label className="admin-label flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-surface-400" />
                Contact Email
              </label>
              <div className="flex gap-2">
                <input 
                  type="email" 
                  className="admin-input" 
                  defaultValue={getSettingValue('contact_email')}
                  onBlur={(e) => handleUpdateSetting('contact_email', e.target.value)}
                />
                <button className="btn-secondary px-3">
                  {saving === 'contact_email' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-surface-400 mt-2">Primary contact email address for general inquires</p>
            </div>

            <div>
              <label className="admin-label flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-surface-400" />
                Office Location
              </label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  className="admin-input" 
                  defaultValue={getSettingValue('contact_location')}
                  onBlur={(e) => handleUpdateSetting('contact_location', e.target.value)}
                />
                <button className="btn-secondary px-3">
                  {saving === 'contact_location' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-surface-400 mt-2">Office location/address shown in the footers and pages</p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

function SubscriptionEditor({ value, onSave, isSaving }: { value: string, onSave: (val: string) => void, isSaving: boolean }) {
  const [plans, setPlans] = useState<any>({});

  useEffect(() => {
    try {
      if (value) setPlans(JSON.parse(value));
    } catch (e) {
      console.error('Failed to parse plans', e);
    }
  }, [value]);

  const handleChange = (tier: string, field: string, val: any) => {
    setPlans((prev: any) => ({
      ...prev,
      [tier]: { ...prev[tier], [field]: val }
    }));
  };

  return (
    <div className="divide-y divide-surface-100">
      {Object.entries(plans).map(([tier, data]: [string, any]) => (
        <div key={tier} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={clsx(
                "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                tier === 'STARTER' ? "bg-surface-100 text-surface-700" :
                tier === 'PRO' ? "bg-primary-50 text-primary-700" :
                "bg-amber-50 text-amber-700"
              )}>
                {tier} TIER
              </span>
            </div>
            <input 
              className="w-full text-sm font-medium bg-transparent border-none focus:ring-0 p-0 text-surface-900"
              value={data.description}
              onChange={(e) => handleChange(tier, 'description', e.target.value)}
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-surface-400">SAR</span>
              <input 
                type="number"
                className="w-24 admin-input text-right"
                value={data.price}
                onChange={(e) => handleChange(tier, 'price', parseInt(e.target.value))}
              />
            </div>
          </div>
        </div>
      ))}
      <div className="p-4 bg-surface-50 flex justify-end">
        <button 
          onClick={() => onSave(JSON.stringify(plans))}
          disabled={isSaving}
          className="btn-primary"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save All Plans
        </button>
      </div>
    </div>
  );
}

function SocialLinksEditor({ value, onSave, isSaving }: { value: string, onSave: (val: string) => void, isSaving: boolean }) {
  const [links, setLinks] = useState<any>({});

  useEffect(() => {
    try {
      if (value) setLinks(JSON.parse(value));
    } catch (e) {
      console.error('Failed to parse links', e);
    }
  }, [value]);

  const socialIcons: any = {
    twitter: Twitter,
    instagram: Instagram,
    linkedin: Linkedin,
    whatsapp: MessageSquare,
    tiktok: Globe,
    snapchat: Globe,
    youtube: Youtube,
    facebook: Facebook
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.keys(links).map((key) => {
          const Icon = socialIcons[key] || Globe;
          return (
            <div key={key}>
              <label className="admin-label flex items-center gap-2">
                <Icon className="w-3 h-3" />
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </label>
              <input 
                type="text"
                className="admin-input"
                value={links[key]}
                onChange={(e) => setLinks((prev: any) => ({ ...prev, [key]: e.target.value }))}
                placeholder={`https://${key}.com/...`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-end pt-4 border-t border-surface-100">
        <button 
          onClick={() => onSave(JSON.stringify(links))}
          disabled={isSaving}
          className="btn-primary"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Update Social Links
        </button>
      </div>
    </div>
  );
}

function FeaturedArticlesEditor({ value, onSave, isSaving }: { value: string, onSave: (val: string) => void, isSaving: boolean }) {
  const [posts, setPosts] = useState<any[]>([]);
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPosts() {
      try {
        const res = await adminApi.getAllNews();
        if (res.success && res.data) {
          // Filter only published ones
          setPosts(res.data.filter((p: any) => p.isPublished));
        }
      } catch (err) {
        console.error('Failed to load news posts for settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadPosts();
  }, []);

  useEffect(() => {
    try {
      if (value) {
        setSelectedSlugs(JSON.parse(value));
      }
    } catch (e) {
      console.error('Failed to parse featured slugs', e);
    }
  }, [value]);

  const handleToggle = (slug: string) => {
    setSelectedSlugs(prev => {
      if (prev.includes(slug)) {
        return prev.filter(s => s !== slug);
      } else {
        if (prev.length >= 4) {
          alert('You can select a maximum of 4 featured articles for the homepage.');
          return prev;
        }
        return [...prev, slug];
      }
    });
  };

  return (
    <div className="p-6 space-y-4">
      {loading ? (
        <div className="text-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-primary-600 mx-auto" />
        </div>
      ) : posts.length === 0 ? (
        <p className="text-xs text-surface-500">No published articles available. Publish articles in the News section first.</p>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const isChecked = selectedSlugs.includes(post.slug);
            return (
              <label key={post.id} className="flex items-start gap-3 p-3 hover:bg-surface-50 rounded-xl cursor-pointer transition-colors border border-surface-100">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 mt-0.5" 
                  checked={isChecked}
                  onChange={() => handleToggle(post.slug)}
                />
                <div>
                  <span className="text-xs font-bold text-surface-900 block">{post.titleEn}</span>
                  <span className="text-[10px] text-surface-400 font-mono block mt-0.5">{post.slug}</span>
                </div>
              </label>
            );
          })}
        </div>
      )}
      <div className="flex justify-end pt-4 border-t border-surface-100">
        <button 
          onClick={() => onSave(JSON.stringify(selectedSlugs))}
          disabled={isSaving}
          className="btn-primary"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Update Featured Articles
        </button>
      </div>
    </div>
  );
}
