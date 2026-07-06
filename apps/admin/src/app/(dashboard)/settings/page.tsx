'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useRef } from 'react';
import { AdminTopBar } from '@/components/AdminSidebar';
import { adminApi, SystemSetting, NewsPost } from '@/lib/api';
import {
  Settings, Save, Globe, Share2, CreditCard, 
  Info, Loader2, CheckCircle2, AlertCircle,
  Twitter, Instagram, Linkedin, MessageSquare,
  Youtube, Facebook, Newspaper, Mail, Phone, MapPin,
  Image as ImageIcon, Check, ChevronDown
} from 'lucide-react';
import { CldUploadWidget } from 'next-cloudinary';
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
      const SETTING_NAMES: Record<string, string> = {
        subscription_plans: 'Subscription Plans',
        social_links: 'Social Media Links',
        ai_qualification_webhook: 'Lead Qualification Webhook',
        ai_project_qualification_webhook: 'Project Qualification Webhook',
        ai_general_assistant_webhook: 'General Assistant Webhook',
        n8n_webhook_secret: 'Webhook Secret Key',
        n8n_api_key: 'N8N API Key',
        listing_cost_credits: 'Listing Cost Credits',
        free_postings_limit: 'Free Postings Limit',
        contact_phone: 'Contact Phone Number',
        contact_email: 'Contact Email Address',
        contact_location: 'Office Location Address',
        sidebar_ad_image: 'Ad Banner Image',
        sidebar_ad_link: 'Ad Target Link',
        sidebar_ad_aspect_ratio: 'Ad Aspect Ratio Mode',
        homepage_featured_articles: 'Homepage Featured Articles',
        google_client_id: 'Google Client ID',
        google_client_secret: 'Google Client Secret',
        google_android_client_id: 'Android OAuth Client ID',
        google_ios_client_id: 'iOS OAuth Client ID',
        resend_api_key: 'Resend API Key',
        logo_url: 'Platform Logo',
        favicon_url: 'Platform Favicon',
        google_maps_public_key: 'Google Maps API Key'
      };
      const friendlyName = SETTING_NAMES[key] || key;
      setSuccess(`Updated ${friendlyName} successfully`);
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
      
      <div className="flex-1 overflow-y-auto p-6 space-y-8 w-full max-w-5xl mx-auto min-w-0">
        
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

        {/* Section: Platform Branding */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <ImageIcon className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-surface-900">Platform Branding</h2>
              <p className="text-xs text-surface-500">Configure your dynamic platform logo and browser favicon</p>
            </div>
          </div>
          
          <div className="admin-card p-6 grid grid-cols-1 md:grid-cols-2 gap-6 min-w-0 w-full">
            {/* Logo URL */}
            <div className="min-w-0 w-full flex flex-col gap-1.5">
              <label className="admin-label flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-surface-400" />
                Platform Logo URL
              </label>
              
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-surface-50 border border-surface-200 overflow-hidden flex items-center justify-center shrink-0 shadow-sm p-1">
                  {getSettingValue('logo_url') ? (
                    <img 
                      src={getSettingValue('logo_url')} 
                      alt="Logo Preview" 
                      className="max-w-full max-h-full object-contain" 
                    />
                  ) : (
                    <span className="text-[9px] text-surface-400 font-bold uppercase">No Logo</span>
                  )}
                </div>

                <div className="flex-1 flex gap-2 min-w-0">
                  <input 
                    type="text" 
                    className="admin-input min-w-0 w-full" 
                    value={getSettingValue('logo_url')}
                    placeholder="Paste logo URL or upload"
                    onChange={(e) => {
                      const val = e.target.value;
                      setSettings(prev => prev.map(s => s.key === 'logo_url' ? { ...s, value: val } : s));
                    }}
                    onBlur={(e) => handleUpdateSetting('logo_url', e.target.value)}
                  />
                  <CldUploadWidget 
                    uploadPreset="saudi_re_listing" 
                    onSuccess={(result: any) => {
                      if (result.event === 'success' && result.info?.secure_url) {
                        handleUpdateSetting('logo_url', result.info.secure_url);
                      }
                    }}
                  >
                    {({ open }) => (
                      <button 
                        type="button"
                        onClick={() => open()}
                        className="btn-secondary whitespace-nowrap px-3 shrink-0 flex items-center gap-1"
                        title="Upload Logo"
                      >
                        <ImageIcon className="w-4 h-4 text-surface-500" />
                        <span>Upload</span>
                      </button>
                    )}
                  </CldUploadWidget>
                </div>
              </div>
              <p className="text-[10px] text-surface-400 mt-1">Fallback: A building icon with brand text "Tamleeq" is displayed.</p>
            </div>

            {/* Favicon URL */}
            <div className="min-w-0 w-full flex flex-col gap-1.5">
              <label className="admin-label flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-surface-400" />
                Platform Favicon URL
              </label>
              
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-surface-50 border border-surface-200 overflow-hidden flex items-center justify-center shrink-0 shadow-sm p-2">
                  {getSettingValue('favicon_url') ? (
                    <img 
                      src={getSettingValue('favicon_url')} 
                      alt="Favicon Preview" 
                      className="max-w-full max-h-full object-contain" 
                    />
                  ) : (
                    <span className="text-[9px] text-surface-400 font-bold uppercase">No Icon</span>
                  )}
                </div>

                <div className="flex-1 flex gap-2 min-w-0">
                  <input 
                    type="text" 
                    className="admin-input min-w-0 w-full" 
                    value={getSettingValue('favicon_url')}
                    placeholder="Paste favicon URL or upload"
                    onChange={(e) => {
                      const val = e.target.value;
                      setSettings(prev => prev.map(s => s.key === 'favicon_url' ? { ...s, value: val } : s));
                    }}
                    onBlur={(e) => handleUpdateSetting('favicon_url', e.target.value)}
                  />
                  <CldUploadWidget 
                    uploadPreset="saudi_re_listing" 
                    onSuccess={(result: any) => {
                      if (result.event === 'success' && result.info?.secure_url) {
                        handleUpdateSetting('favicon_url', result.info.secure_url);
                      }
                    }}
                  >
                    {({ open }) => (
                      <button 
                        type="button"
                        onClick={() => open()}
                        className="btn-secondary whitespace-nowrap px-3 shrink-0 flex items-center gap-1"
                        title="Upload Favicon"
                      >
                        <ImageIcon className="w-4 h-4 text-surface-500" />
                        <span>Upload</span>
                      </button>
                    )}
                  </CldUploadWidget>
                </div>
              </div>
              <p className="text-[10px] text-surface-400 mt-1">Fallback: The default /favicon.ico is loaded.</p>
            </div>
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
                <label className="admin-label">Project Qualification Webhook (n8n)</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    className="admin-input" 
                    placeholder="https://n8n.your-instance.com/webhook/..."
                    defaultValue={getSettingValue('ai_project_qualification_webhook')}
                    onBlur={(e) => handleUpdateSetting('ai_project_qualification_webhook', e.target.value)}
                  />
                  <button className="btn-secondary px-3">
                    {saving === 'ai_project_qualification_webhook' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-surface-400 mt-2">Used on project pages to vet leads for specific layouts within the compound</p>
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

        {/* Section: Email & Delivery Configuration */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Mail className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-surface-900">Email Service Integration</h2>
              <p className="text-xs text-surface-500">Configure transactional and security email delivery via Resend</p>
            </div>
          </div>
          
          <div className="admin-card p-6 space-y-6">
            <div>
              <label className="admin-label">Resend API Key</label>
              <div className="flex gap-2">
                <input 
                  type="password" 
                  className="admin-input" 
                  placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxx"
                  defaultValue={getSettingValue('resend_api_key')}
                  onBlur={(e) => handleUpdateSetting('resend_api_key', e.target.value)}
                />
                <button className="btn-secondary px-3">
                  {saving === 'resend_api_key' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-surface-400 mt-2">Allows the platform to send welcome, verification, and password reset OTP emails securely.</p>
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

            <div>
              <label className="admin-label">Free Postings Limit</label>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  className="admin-input" 
                  defaultValue={getSettingValue('free_postings_limit')}
                  onBlur={(e) => handleUpdateSetting('free_postings_limit', e.target.value)}
                />
                <button className="btn-secondary px-3">
                  {saving === 'free_postings_limit' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-surface-400 mt-2">Initial number of listings a broker can post for free</p>
            </div>
          </div>
        </section>

        {/* Section: Google OAuth Configuration */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <Globe className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-surface-900">Google OAuth Credentials</h2>
              <p className="text-xs text-surface-500">Edit the Client ID and Secret key used for Google authentication SSO</p>
            </div>
          </div>
          
          <div className="admin-card p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="admin-label">Google OAuth Client ID</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  className="admin-input" 
                  defaultValue={getSettingValue('google_client_id')}
                  onBlur={(e) => handleUpdateSetting('google_client_id', e.target.value)}
                  placeholder="xxxx-xxxx.apps.googleusercontent.com"
                />
                <button className="btn-secondary px-3">
                  {saving === 'google_client_id' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-surface-400 mt-2">The Google Developer API credential Client ID</p>
            </div>

            <div>
              <label className="admin-label">Google OAuth Client Secret</label>
              <div className="flex gap-2">
                <input 
                  type="password" 
                  className="admin-input" 
                  defaultValue={getSettingValue('google_client_secret')}
                  onBlur={(e) => handleUpdateSetting('google_client_secret', e.target.value)}
                  placeholder="GOCSPX-xxxxxxxxxxxxxxxx"
                />
                <button className="btn-secondary px-3">
                  {saving === 'google_client_secret' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-surface-400 mt-2">The private client secret associated with the ID</p>
            </div>

            <div>
              <label className="admin-label">Android OAuth Client ID</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  className="admin-input" 
                  defaultValue={getSettingValue('google_android_client_id')}
                  onBlur={(e) => handleUpdateSetting('google_android_client_id', e.target.value)}
                  placeholder="xxxx-xxxx.apps.googleusercontent.com"
                />
                <button className="btn-secondary px-3">
                  {saving === 'google_android_client_id' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-surface-400 mt-2">Android OAuth client ID for mobile Google Sign-In</p>
            </div>

            <div>
              <label className="admin-label">iOS OAuth Client ID</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  className="admin-input" 
                  defaultValue={getSettingValue('google_ios_client_id')}
                  onBlur={(e) => handleUpdateSetting('google_ios_client_id', e.target.value)}
                  placeholder="xxxx-xxxx.apps.googleusercontent.com"
                />
                <button className="btn-secondary px-3">
                  {saving === 'google_ios_client_id' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-surface-400 mt-2">iOS OAuth client ID for mobile Google Sign-In (Flutter)</p>
            </div>
          </div>
        </section>


        {/* Section: Google Maps API Configuration */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-surface-900">Google Maps API Credentials</h2>
              <p className="text-xs text-surface-500">Edit the API Key used for Google Maps JS, Google Places Autocomplete, and backend commutes</p>
            </div>
          </div>
          
          <div className="admin-card p-6">
            <div>
              <label className="admin-label">Google Maps Public API Key</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  className="admin-input" 
                  defaultValue={getSettingValue('google_maps_public_key')}
                  onBlur={(e) => handleUpdateSetting('google_maps_public_key', e.target.value)}
                  placeholder="AIzaSy..."
                />
                <button className="btn-secondary px-3">
                  {saving === 'google_maps_public_key' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-surface-400 mt-2">Unified key for client-side Map View rendering and backend commute calculations</p>
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
          
          <div className="admin-card p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-w-0 w-full">
            <div className="min-w-0 w-full">
              <label className="admin-label flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-surface-400" />
                Contact Phone
              </label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  className="admin-input min-w-0 w-full" 
                  defaultValue={getSettingValue('contact_phone')}
                  onBlur={(e) => handleUpdateSetting('contact_phone', e.target.value)}
                />
                <button className="btn-secondary px-3 shrink-0">
                  {saving === 'contact_phone' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-surface-400 mt-2">Primary contact phone number displayed across the site</p>
            </div>

            <div className="min-w-0 w-full">
              <label className="admin-label flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-surface-400" />
                Contact Email
              </label>
              <div className="flex gap-2">
                <input 
                  type="email" 
                  className="admin-input min-w-0 w-full" 
                  defaultValue={getSettingValue('contact_email')}
                  onBlur={(e) => handleUpdateSetting('contact_email', e.target.value)}
                />
                <button className="btn-secondary px-3 shrink-0">
                  {saving === 'contact_email' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-surface-400 mt-2">Primary contact email address for general inquires</p>
            </div>

            <div className="min-w-0 w-full">
              <label className="admin-label flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-surface-400" />
                Office Location
              </label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  className="admin-input min-w-0 w-full" 
                  defaultValue={getSettingValue('contact_location')}
                  onBlur={(e) => handleUpdateSetting('contact_location', e.target.value)}
                />
                <button className="btn-secondary px-3 shrink-0">
                  {saving === 'contact_location' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-surface-400 mt-2">Office location/address shown in the footers and pages</p>
            </div>
          </div>
        </section>

        {/* Section: Sidebar Banner Ad Settings */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <Globe className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-surface-900">Sidebar Banner Ad Settings</h2>
              <p className="text-xs text-surface-500">Configure the dynamic advertising banner image and target link shown in the listing sidebar</p>
            </div>
          </div>
          
          <div className="admin-card p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-w-0 w-full">
            <div className="min-w-0 w-full flex flex-col gap-1.5">
              <label className="admin-label flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-surface-400" />
                Ad Banner Image
              </label>
              
              <div className="flex items-center gap-3">
                {/* Image Preview Thumbnail */}
                <div className="w-11 h-11 rounded-xl bg-surface-50 border border-surface-200 overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
                  {getSettingValue('sidebar_ad_image') ? (
                    <img 
                      src={getSettingValue('sidebar_ad_image')} 
                      alt="Ad Preview" 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <span className="text-[9px] text-surface-400 font-bold uppercase">No Ad</span>
                  )}
                </div>

                <div className="flex-1 flex gap-2 min-w-0">
                  <input 
                    type="text" 
                    className="admin-input min-w-0 w-full" 
                    value={getSettingValue('sidebar_ad_image')}
                    placeholder="Paste URL or upload image"
                    onChange={(e) => {
                      const val = e.target.value;
                      setSettings(prev => prev.map(s => s.key === 'sidebar_ad_image' ? { ...s, value: val } : s));
                    }}
                    onBlur={(e) => handleUpdateSetting('sidebar_ad_image', e.target.value)}
                  />
                  <CldUploadWidget 
                    uploadPreset="saudi_re_listing" 
                    onSuccess={(result: any) => {
                      if (result.event === 'success' && result.info?.secure_url) {
                        handleUpdateSetting('sidebar_ad_image', result.info.secure_url);
                      }
                    }}
                  >
                    {({ open }) => (
                      <button 
                        type="button"
                        onClick={() => open()}
                        className="btn-secondary whitespace-nowrap px-3 shrink-0 flex items-center gap-1"
                        title="Upload graphic"
                      >
                        <ImageIcon className="w-4 h-4 text-surface-500" />
                        <span>Upload</span>
                      </button>
                    )}
                  </CldUploadWidget>
                </div>
              </div>
              <p className="text-[10px] text-surface-400 mt-1">Upload promo image to Cloudinary or paste any URL</p>
            </div>

            <div className="min-w-0 w-full flex flex-col gap-1.5">
              <label className="admin-label flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-surface-400" />
                Ad Target Link
              </label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  className="admin-input min-w-0 w-full" 
                  defaultValue={getSettingValue('sidebar_ad_link')}
                  placeholder="/contact or external URL"
                  onBlur={(e) => handleUpdateSetting('sidebar_ad_link', e.target.value)}
                />
                <button className="btn-secondary px-3 shrink-0">
                  {saving === 'sidebar_ad_link' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-surface-400 mt-1">Target redirect URL when the user clicks on the ad banner</p>
            </div>

            <div className="min-w-0 w-full flex flex-col gap-1.5">
              <label className="admin-label flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-surface-400" />
                Ad Aspect Ratio Mode
              </label>
              <AdminSelect
                value={getSettingValue('sidebar_ad_aspect_ratio') || 'auto'}
                onChange={(val) => handleUpdateSetting('sidebar_ad_aspect_ratio', val)}
                options={[
                  { value: 'auto', label: 'Automatic (Natural Image Shape)' },
                  { value: '1_1', label: '1:1 Square Compatibility' },
                  { value: '3_4', label: '3:4 Portrait Compatibility' },
                  { value: '16_9', label: '16:9 Landscape Compatibility' }
                ]}
              />
              <p className="text-[10px] text-surface-400 mt-1">Controls cropping/fitting to match your ad graphics</p>
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

function AdminSelect({
  value,
  onChange,
  options
}: {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedLabel = options.find((o) => o.value === value)?.label || value;

  return (
    <div className="relative w-full" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-white border border-surface-200 rounded-xl text-sm text-surface-800 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all hover:bg-surface-50 text-left font-medium"
      >
        <span>{selectedLabel}</span>
        <ChevronDown className={`w-4 h-4 text-surface-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-[100] bottom-full mb-2 w-full bg-white border border-surface-200 rounded-xl shadow-xl py-1 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-bottom-1 duration-200">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`w-full px-3.5 py-2.5 text-left text-sm hover:bg-surface-50 transition-colors flex items-center justify-between ${
                opt.value === value ? 'text-primary-600 font-semibold bg-primary-50/50' : 'text-surface-700'
              }`}
            >
              <span>{opt.label}</span>
              {opt.value === value && <Check className="w-4 h-4 text-primary-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

