'use client';
import { useState, useEffect } from 'react';
import { AdminTopBar } from '@/components/AdminSidebar';
import { adminApi, LegalPage } from '@/lib/api';
import {
  FileText, Save, Globe, Info, 
  Loader2, CheckCircle2, AlertCircle,
  ChevronRight, Languages
} from 'lucide-react';
import clsx from 'clsx';

export default function LegalPages() {
  const [pages, setPages] = useState<LegalPage[]>([]);
  const [selectedPage, setSelectedPage] = useState<LegalPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadPages();
  }, []);

  async function loadPages() {
    setLoading(true);
    const result = await adminApi.request<LegalPage[]>('/admin/legal');
    if (result.success && result.data) {
      setPages(result.data);
      if (result.data.length > 0) setSelectedPage(result.data[0]);
    }
    setLoading(false);
  }

  const handleSave = async () => {
    if (!selectedPage) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    const result = await adminApi.updateLegalPage(selectedPage.slug, selectedPage);
    
    if (result.success) {
      setSuccess(`Updated ${selectedPage.slug} successfully`);
      setPages(prev => prev.map(p => p.slug === selectedPage.slug ? selectedPage : p));
    } else {
      setError(result.error || 'Failed to update page');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <AdminTopBar title="Legal Pages" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <AdminTopBar title="Legal & Policy Pages" />

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        
        {/* Sidebar: Page List */}
        <div className="w-full md:w-64 border-r border-surface-200 bg-white overflow-y-auto">
          <div className="p-4 border-b border-surface-100">
            <h2 className="text-xs font-bold text-surface-400 uppercase tracking-wider">Document Library</h2>
          </div>
          <div className="divide-y divide-surface-50">
            {pages.map((page) => (
              <button
                key={page.slug}
                onClick={() => setSelectedPage(page)}
                className={clsx(
                  "w-full px-4 py-4 text-left transition-all flex items-center justify-between group",
                  selectedPage?.slug === page.slug ? "bg-primary-50 border-r-2 border-primary-600" : "hover:bg-surface-50"
                )}
              >
                <div className="min-w-0">
                  <div className={clsx(
                    "text-sm font-bold truncate",
                    selectedPage?.slug === page.slug ? "text-primary-700" : "text-surface-700"
                  )}>
                    {page.titleEn}
                  </div>
                  <div className="text-[10px] text-surface-400 font-mono mt-0.5">/{page.slug}</div>
                </div>
                <ChevronRight className={clsx(
                  "w-4 h-4 transition-transform",
                  selectedPage?.slug === page.slug ? "text-primary-600 translate-x-0.5" : "text-surface-300 opacity-0 group-hover:opacity-100"
                )} />
              </button>
            ))}
          </div>
        </div>

        {/* Content: Editor */}
        <div className="flex-1 overflow-y-auto bg-canvas p-6">
          {selectedPage ? (
            <div className="max-w-4xl space-y-6">
              
              {/* Status */}
              {(error || success) && (
                <div className={clsx(
                  "flex items-center gap-3 p-4 rounded-xl text-sm border",
                  error ? "bg-red-50 border-red-200 text-red-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"
                )}>
                  {error ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                  {error || success}
                </div>
              )}

              {/* Header Info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-surface-200 flex items-center justify-center shadow-sm">
                    <FileText className="w-5 h-5 text-surface-600" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-surface-900">{selectedPage.titleEn}</h1>
                    <p className="text-xs text-surface-500">Last updated: {new Date(selectedPage.updatedAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </button>
              </div>

              {/* Date & Metadata Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-surface-100">
                <div>
                  <label className="admin-label">Last Updated Date</label>
                  <input 
                    type="datetime-local"
                    className="admin-input"
                    value={selectedPage.updatedAt ? new Date(new Date(selectedPage.updatedAt).getTime() - new Date(selectedPage.updatedAt).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setSelectedPage({...selectedPage, updatedAt: e.target.value ? new Date(e.target.value).toISOString() : new Date().toISOString()})}
                  />
                </div>
                <div>
                  <label className="admin-label">URL Slug (Read-only)</label>
                  <input 
                    type="text"
                    className="admin-input bg-surface-50 cursor-not-allowed text-surface-400 font-mono text-xs"
                    disabled
                    value={`/legal/${selectedPage.slug}`}
                  />
                </div>
              </div>

              {/* Title Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="admin-label flex items-center gap-2">
                    <span className="w-4 h-3 bg-blue-100 text-[8px] flex items-center justify-center rounded">EN</span>
                    Title (English)
                  </label>
                  <input 
                    type="text"
                    className="admin-input"
                    value={selectedPage.titleEn}
                    onChange={(e) => setSelectedPage({...selectedPage, titleEn: e.target.value})}
                  />
                </div>
                <div>
                  <label className="admin-label flex items-center gap-2">
                    <span className="w-4 h-3 bg-emerald-100 text-[8px] flex items-center justify-center rounded">AR</span>
                    Title (Arabic)
                  </label>
                  <input 
                    type="text"
                    className="admin-input text-right"
                    dir="rtl"
                    value={selectedPage.titleAr}
                    onChange={(e) => setSelectedPage({...selectedPage, titleAr: e.target.value})}
                  />
                </div>
              </div>

              {/* Content Editors */}
              <div className="space-y-4">
                <div>
                  <label className="admin-label">Content (English)</label>
                  <textarea 
                    className="admin-input min-h-[300px] font-serif leading-relaxed"
                    value={selectedPage.contentEn}
                    onChange={(e) => setSelectedPage({...selectedPage, contentEn: e.target.value})}
                  />
                </div>
                <div>
                  <label className="admin-label text-right">Content (Arabic)</label>
                  <textarea 
                    className="admin-input min-h-[300px] text-right font-arabic leading-relaxed"
                    dir="rtl"
                    value={selectedPage.contentAr}
                    onChange={(e) => setSelectedPage({...selectedPage, contentAr: e.target.value})}
                  />
                </div>
              </div>

            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-surface-400">
              Select a page to start editing
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
