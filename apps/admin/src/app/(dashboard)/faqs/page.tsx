'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { AdminTopBar } from '@/components/AdminSidebar';
import { adminApi, AdminFaq } from '@/lib/api';
import {
  HelpCircle, Plus, Search, HelpCircle as HelpIcon,
  Edit, Trash2, Loader2, Save, X, ArrowUpDown
} from 'lucide-react';

export default function FaqsPage() {
  const [faqs, setFaqs] = useState<AdminFaq[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentFaq, setCurrentFaq] = useState<Partial<AdminFaq> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadFaqs();
  }, []);

  async function loadFaqs() {
    setLoading(true);
    const result = await adminApi.request<AdminFaq[]>('/system/faqs');
    if (result.success && result.data) {
      // Sort by order ASC
      const sorted = result.data.sort((a, b) => (a.order || 0) - (b.order || 0));
      setFaqs(sorted);
    }
    setLoading(false);
  }

  const handleEdit = (faq: AdminFaq) => {
    setCurrentFaq(faq);
    setIsEditing(true);
  };

  const handleCreate = () => {
    setCurrentFaq({
      questionEn: '',
      questionAr: '',
      answerEn: '',
      answerAr: '',
      order: faqs.length + 1
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!currentFaq) return;
    setSaving(true);
    let result;
    if (currentFaq.id) {
      result = await adminApi.updateFaq(currentFaq.id, currentFaq);
    } else {
      result = await adminApi.createFaq(currentFaq);
    }

    if (result.success) {
      loadFaqs();
      setIsEditing(false);
      setCurrentFaq(null);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this FAQ?')) return;
    const result = await adminApi.deleteFaq(id);
    if (result.success) {
      setFaqs(prev => prev.filter(f => f.id !== id));
    }
  };

  return (
    <div className="flex flex-col h-full">
      <AdminTopBar title="FAQ Management" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-surface-900">Frequently Asked Questions</h1>
              <p className="text-xs text-surface-500">Manage bilingual FAQs displayed on the marketplace homepage</p>
            </div>
          </div>
          <button onClick={handleCreate} className="btn-primary">
            <Plus className="w-4 h-4" />
            Create New FAQ
          </button>
        </div>

        {/* List View */}
        {!isEditing ? (
          <div className="space-y-4 max-w-5xl">
            {loading ? (
              <div className="py-20 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto" />
              </div>
            ) : faqs.length === 0 ? (
              <div className="py-20 text-center admin-card bg-surface-50 border-dashed">
                <p className="text-sm text-surface-500">No FAQs created yet. Start by creating one!</p>
              </div>
            ) : (
              faqs.map((faq) => (
                <div key={faq.id} className="admin-card p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-card-hover transition-all">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-primary-50 text-primary-700 rounded-md">Order #{faq.order || 0}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-50 text-gray-500 rounded-md">Bilingual</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-xs text-surface-400 font-bold uppercase">English</h4>
                        <p className="text-sm font-bold text-surface-900">{faq.questionEn}</p>
                        <p className="text-xs text-surface-500 line-clamp-2 mt-1">{faq.answerEn}</p>
                      </div>
                      <div dir="rtl">
                        <h4 className="text-xs text-surface-400 font-bold uppercase text-right">العربية</h4>
                        <p className="text-sm font-bold text-surface-900 font-arabic">{faq.questionAr}</p>
                        <p className="text-xs text-surface-500 line-clamp-2 mt-1 font-arabic">{faq.answerAr}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button onClick={() => handleEdit(faq)} className="btn-secondary p-2" title="Edit FAQ">
                      <Edit className="w-4 h-4 text-surface-600" />
                    </button>
                    <button onClick={() => handleDelete(faq.id)} className="btn-secondary p-2 text-red-600 hover:bg-red-50" title="Delete FAQ">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Editor View */
          <div className="admin-card p-8 space-y-8 animate-fade-in max-w-4xl mx-auto">
            <div className="flex items-center justify-between border-b border-surface-100 pb-4">
              <h2 className="text-base font-bold text-surface-900">
                {currentFaq?.id ? 'Edit FAQ Item' : 'Create New FAQ Item'}
              </h2>
              <div className="flex items-center gap-3">
                <button onClick={() => setIsEditing(false)} className="btn-secondary">
                  <X className="w-4 h-4" /> Cancel
                </button>
                <button onClick={handleSave} disabled={saving} className="btn-primary">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {currentFaq?.id ? 'Update FAQ' : 'Save FAQ'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* English Side */}
              <div className="space-y-4">
                <div className="badge badge-gray">English FAQ</div>
                <div>
                  <label className="admin-label">Question</label>
                  <input 
                    className="admin-input"
                    value={currentFaq?.questionEn || ''}
                    onChange={(e) => setCurrentFaq({...currentFaq!, questionEn: e.target.value})}
                    placeholder="e.g. Who owns the properties listed?"
                  />
                </div>
                <div>
                  <label className="admin-label">Answer Text</label>
                  <textarea 
                    className="admin-input h-48"
                    value={currentFaq?.answerEn || ''}
                    onChange={(e) => setCurrentFaq({...currentFaq!, answerEn: e.target.value})}
                    placeholder="Write detailed answer here..."
                  />
                </div>
              </div>

              {/* Arabic Side */}
              <div className="space-y-4">
                <div className="badge badge-gray self-end">Arabic FAQ (العربية)</div>
                <div dir="rtl">
                  <label className="admin-label text-right">السؤال</label>
                  <input 
                    className="admin-input text-right font-arabic"
                    value={currentFaq?.questionAr || ''}
                    onChange={(e) => setCurrentFaq({...currentFaq!, questionAr: e.target.value})}
                    placeholder="السؤال باللغة العربية..."
                  />
                </div>
                <div dir="rtl">
                  <label className="admin-label text-right">الإجابة</label>
                  <textarea 
                    className="admin-input h-48 text-right font-arabic"
                    value={currentFaq?.answerAr || ''}
                    onChange={(e) => setCurrentFaq({...currentFaq!, answerAr: e.target.value})}
                    placeholder="اكتب الإجابة المفصلة هنا..."
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-surface-100 max-w-xs">
              <label className="admin-label">Display Sort Order</label>
              <input 
                type="number"
                className="admin-input"
                value={currentFaq?.order || 0}
                onChange={(e) => setCurrentFaq({...currentFaq!, order: parseInt(e.target.value) || 0})}
              />
              <p className="text-[10px] text-surface-400 mt-1">Controls horizontal display ranking on homepage (lowest order displays first)</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
