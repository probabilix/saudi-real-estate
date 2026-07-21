'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { AdminTopBar } from '@/components/AdminSidebar';
import { adminApi, NewsPost } from '@/lib/api';
import {
  Newspaper, Plus, Search, Filter,
  Calendar, User, Globe, Image as ImageIcon,
  Edit, Trash2, Eye, Loader2,
  CheckCircle2, AlertCircle, Save, X, ArrowUpRight
} from 'lucide-react';
import { CldUploadWidget } from 'next-cloudinary';
import clsx from 'clsx';

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000';

export default function NewsPage() {
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPost, setCurrentPost] = useState<Partial<NewsPost> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadNews();
  }, []);

  async function loadNews() {
    setLoading(true);
    const result = await adminApi.request<NewsPost[]>('/admin/news');
    if (result.success && result.data) {
      setPosts(result.data);
    }
    setLoading(false);
  }

  const handleEdit = (post: NewsPost) => {
    setError(null);
    setCurrentPost({
      ...post,
      faqs: post.faqs && post.faqs.length > 0 ? post.faqs : [
        { questionEn: '', questionAr: '', answerEn: '', answerAr: '' },
        { questionEn: '', questionAr: '', answerEn: '', answerAr: '' },
        { questionEn: '', questionAr: '', answerEn: '', answerAr: '' },
        { questionEn: '', questionAr: '', answerEn: '', answerAr: '' }
      ]
    });
    setIsEditing(true);
  };

  const handleCreate = () => {
    setError(null);
    setCurrentPost({
      titleEn: '',
      titleAr: '',
      slug: '',
      contentEn: '',
      contentAr: '',
      excerptEn: '',
      excerptAr: '',
      isPublished: false,
      publishedAt: null,
      faqs: [
        { questionEn: '', questionAr: '', answerEn: '', answerAr: '' },
        { questionEn: '', questionAr: '', answerEn: '', answerAr: '' },
        { questionEn: '', questionAr: '', answerEn: '', answerAr: '' },
        { questionEn: '', questionAr: '', answerEn: '', answerAr: '' }
      ],
      createdAt: new Date().toISOString()
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!currentPost) return;
    setError(null);
    setSaving(true);

    const faqs = currentPost.faqs || [];
    if (faqs.length < 4 || faqs.length > 8) {
      setError(`FAQ count must be between 4 and 8. (Currently: ${faqs.length})`);
      setSaving(false);
      return;
    }

    let result;
    if (currentPost.id) {
      result = await adminApi.updateNews(currentPost.id, currentPost);
    } else {
      result = await adminApi.createNews(currentPost);
    }

    if (result.success) {
      loadNews();
      setIsEditing(false);
      setCurrentPost(null);
      setError(null);
    } else {
      setError(result.error || result.message || 'Failed to save article. Please check all required fields.');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    const result = await adminApi.deleteNews(id);
    if (result.success) {
      setPosts(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleAddFaq = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(15);
    }
    
    const currentFaqs = currentPost?.faqs || [];
    if (currentFaqs.length >= 8) return;
    
    setCurrentPost({
      ...currentPost!,
      faqs: [...currentFaqs, { questionEn: '', questionAr: '', answerEn: '', answerAr: '' }]
    });

    setTimeout(() => {
      const faqElements = document.querySelectorAll('[data-faq-item]');
      if (faqElements.length > 0) {
        const lastFaq = faqElements[faqElements.length - 1];
        lastFaq.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const firstInput = lastFaq.querySelector('input');
        if (firstInput) firstInput.focus();
      }
    }, 100);
  };

  const handleRemoveFaq = (idx: number) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([15, 30, 15]);
    }
    
    const currentFaqs = [...(currentPost?.faqs || [])];
    currentFaqs.splice(idx, 1);
    setCurrentPost({ ...currentPost!, faqs: currentFaqs });
  };

  return (
    <div className="flex flex-col h-full">
      <AdminTopBar title="News & Editorial" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
              <Newspaper className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-surface-900">Articles & Blog Posts</h1>
              <p className="text-xs text-surface-500">Manage bilingual content for the platform blog</p>
            </div>
          </div>
          <button onClick={handleCreate} className="btn-primary">
            <Plus className="w-4 h-4" />
            Create New Article
          </button>
        </div>

        {/* List View */}
        {!isEditing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full py-20 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto" />
              </div>
            ) : posts.length === 0 ? (
              <div className="col-span-full py-20 text-center admin-card bg-surface-50 border-dashed">
                <p className="text-sm text-surface-500">No articles yet. Start by creating one!</p>
              </div>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="admin-card group hover:shadow-card-hover transition-all">
                  <div className="aspect-video bg-surface-100 relative overflow-hidden flex items-center justify-center">
                    {post.featuredImage ? (
                      <img src={post.featuredImage} alt={post.titleEn} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-surface-300" />
                    )}
                    <div className={clsx(
                      "absolute top-3 right-3 badge",
                      post.isPublished ? "badge-green" : "badge-yellow"
                    )}>
                      {post.isPublished ? "Published" : "Draft"}
                    </div>
                  </div>
                  <div className="p-4 space-y-2">
                    <h3 className="text-sm font-bold text-surface-900 line-clamp-2">{post.titleEn}</h3>
                    <div className="flex items-center gap-3 text-[10px] text-surface-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(post.publishedAt || post.createdAt).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        Bilingual
                      </div>
                    </div>
                    <div className="pt-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(post)} className="btn-secondary py-1.5 flex-1 flex items-center justify-center gap-1.5">
                        <Edit className="w-3.5 h-3.5" /> Edit
                      </button>
                      <a
                        href={`${WEB_URL}/en/news/${post.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary py-1.5 px-3 flex items-center justify-center text-surface-600 hover:text-primary-600"
                        title="View Public Page"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                      <button onClick={() => handleDelete(post.id)} className="btn-secondary py-1.5 px-3 text-red-600 hover:bg-red-50" title="Delete Article">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Editor View */
          <div className="admin-card p-8 space-y-8 animate-fade-in max-w-5xl mx-auto">
            <div className="flex items-center justify-between border-b border-surface-100 pb-4">
              <h2 className="text-base font-bold text-surface-900">
                {currentPost?.id ? 'Edit Article' : 'Create New Article'}
              </h2>
              <div className="flex items-center gap-3">
                <button onClick={() => setIsEditing(false)} className="btn-secondary">
                  <X className="w-4 h-4" /> Cancel
                </button>
                <button onClick={handleSave} disabled={saving} className="btn-primary">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {currentPost?.id ? 'Update Article' : 'Publish Article'}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-sm text-red-700">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
                <div className="flex-1 font-medium">{error}</div>
              </div>
            )}

            <div className="space-y-4">
              <label className="admin-label">Featured Image</label>
              <div className="flex items-center gap-6">
                <div className="w-40 aspect-video rounded-2xl bg-surface-50 border-2 border-dashed border-surface-200 flex items-center justify-center overflow-hidden relative group">
                  {currentPost?.featuredImage ? (
                    <>
                      <img src={currentPost.featuredImage} alt="Preview" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => setCurrentPost({...currentPost!, featuredImage: ''})}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </>
                  ) : (
                    <ImageIcon className="w-8 h-8 text-surface-200" />
                  )}
                </div>
                
                <CldUploadWidget 
                  uploadPreset="saudi_re_listing" 
                  onSuccess={(result: any) => {
                    if (result.event === 'success' && result.info?.secure_url) {
                      setCurrentPost({...currentPost!, featuredImage: result.info.secure_url});
                    }
                  }}
                >
                  {({ open }) => (
                    <button 
                      onClick={() => open()}
                      className="btn-secondary"
                    >
                      <Plus className="w-4 h-4" />
                      Upload Image
                    </button>
                  )}
                </CldUploadWidget>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* English Side */}
              <div className="space-y-4">
                <div className="badge badge-gray">English Content</div>
                <div>
                  <label className="admin-label">Title</label>
                  <input 
                    className="admin-input"
                    value={currentPost?.titleEn || ''}
                    onChange={(e) => setCurrentPost({...currentPost!, titleEn: e.target.value})}
                  />
                </div>
                <div>
                  <label className="admin-label">Excerpt (Summary)</label>
                  <textarea 
                    className="admin-input h-20"
                    value={currentPost?.excerptEn || ''}
                    onChange={(e) => setCurrentPost({...currentPost!, excerptEn: e.target.value})}
                  />
                </div>
                <div>
                  <label className="admin-label">Body Content</label>
                  <textarea 
                    className="admin-input h-80"
                    value={currentPost?.contentEn || ''}
                    onChange={(e) => setCurrentPost({...currentPost!, contentEn: e.target.value})}
                  />
                </div>
              </div>

              {/* Arabic Side */}
              <div className="space-y-4">
                <div className="badge badge-gray self-end">Arabic Content</div>
                <div dir="rtl">
                  <label className="admin-label">العنوان</label>
                  <input 
                    className="admin-input text-right font-arabic"
                    value={currentPost?.titleAr || ''}
                    onChange={(e) => setCurrentPost({...currentPost!, titleAr: e.target.value})}
                  />
                </div>
                <div dir="rtl">
                  <label className="admin-label">ملخص</label>
                  <textarea 
                    className="admin-input h-20 text-right font-arabic"
                    value={currentPost?.excerptAr || ''}
                    onChange={(e) => setCurrentPost({...currentPost!, excerptAr: e.target.value})}
                  />
                </div>
                <div dir="rtl">
                  <label className="admin-label">المحتوى</label>
                  <textarea 
                    className="admin-input h-80 text-right font-arabic"
                    value={currentPost?.contentAr || ''}
                    onChange={(e) => setCurrentPost({...currentPost!, contentAr: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* FAQs Section */}
            <div className="pt-6 border-t border-surface-100 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-surface-900">Article FAQs (Bilingual)</h3>
                  <p className="text-xs text-surface-500">Provide between 4 and 8 frequently asked questions for this article.</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddFaq}
                  disabled={(currentPost?.faqs || []).length >= 8}
                  className="btn-secondary py-1.5 text-xs flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add FAQ Item
                </button>
              </div>

              {((currentPost?.faqs || []).length < 4 || (currentPost?.faqs || []).length > 8) && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-2.5 text-xs text-yellow-700">
                  <AlertCircle className="w-4 h-4 shrink-0 text-yellow-600 mt-0.5" />
                  <div>
                    <span className="font-semibold">FAQ Requirement:</span> You must have between 4 and 8 FAQs. (Current: {(currentPost?.faqs || []).length})
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {(currentPost?.faqs || []).map((faq, idx) => (
                  <div key={idx} data-faq-item className="p-4 rounded-xl border border-surface-100 bg-surface-50/50 space-y-3 relative">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">FAQ #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFaq(idx)}
                        className="text-surface-400 hover:text-red-600 transition-colors p-1"
                        title="Delete FAQ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* English FAQ */}
                      <div className="space-y-2">
                        <div>
                          <label className="text-[10px] font-semibold text-surface-500">English Question</label>
                          <input
                            className="admin-input py-1 text-xs"
                            value={faq.questionEn || ''}
                            onChange={(e) => {
                              const currentFaqs = [...(currentPost?.faqs || [])];
                              currentFaqs[idx] = { ...faq, questionEn: e.target.value };
                              setCurrentPost({ ...currentPost!, faqs: currentFaqs });
                            }}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-surface-500">English Answer</label>
                          <textarea
                            className="admin-input py-1 text-xs h-16"
                            value={faq.answerEn || ''}
                            onChange={(e) => {
                              const currentFaqs = [...(currentPost?.faqs || [])];
                              currentFaqs[idx] = { ...faq, answerEn: e.target.value };
                              setCurrentPost({ ...currentPost!, faqs: currentFaqs });
                            }}
                          />
                        </div>
                      </div>

                      {/* Arabic FAQ */}
                      <div className="space-y-2">
                        <div dir="rtl">
                          <label className="text-[10px] font-semibold text-surface-500 block text-right font-arabic">السؤال (العربية)</label>
                          <input
                            className="admin-input py-1 text-xs text-right font-arabic"
                            value={faq.questionAr || ''}
                            onChange={(e) => {
                              const currentFaqs = [...(currentPost?.faqs || [])];
                              currentFaqs[idx] = { ...faq, questionAr: e.target.value };
                              setCurrentPost({ ...currentPost!, faqs: currentFaqs });
                            }}
                          />
                        </div>
                        <div dir="rtl">
                          <label className="text-[10px] font-semibold text-surface-500 block text-right font-arabic">الإجابة (العربية)</label>
                          <textarea
                            className="admin-input py-1 text-xs h-16 text-right font-arabic"
                            value={faq.answerAr || ''}
                            onChange={(e) => {
                              const currentFaqs = [...(currentPost?.faqs || [])];
                              currentFaqs[idx] = { ...faq, answerAr: e.target.value };
                              setCurrentPost({ ...currentPost!, faqs: currentFaqs });
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Add FAQ Button for Ergonomics */}
              {(currentPost?.faqs || []).length > 0 && (currentPost?.faqs || []).length < 8 && (
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddFaq}
                    className="btn-secondary py-2 px-4 text-xs flex items-center gap-1.5 hover:bg-surface-100 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add FAQ Item
                  </button>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-surface-100 space-y-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                  <label className="admin-label">URL Slug</label>
                  <input 
                    className="admin-input font-mono text-xs"
                    placeholder="e-g-real-estate-trends-2024"
                    value={currentPost?.slug || ''}
                    onChange={(e) => setCurrentPost({...currentPost!, slug: e.target.value})}
                  />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500" 
                      checked={currentPost?.isPublished || false}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setCurrentPost({
                          ...currentPost!,
                          isPublished: checked,
                          publishedAt: checked ? (currentPost?.publishedAt || new Date().toISOString()) : null
                        });
                      }}
                    />
                    <span className="text-sm font-medium text-surface-700">Published (Visible on site)</span>
                  </label>
                </div>
              </div>

              {/* Editable Dates Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-surface-50 p-4 rounded-2xl border border-surface-100">
                <div>
                  <label className="admin-label">Publication Date (displayed to users)</label>
                  <input 
                    type="datetime-local"
                    className="admin-input bg-white"
                    value={currentPost?.publishedAt ? new Date(new Date(currentPost.publishedAt).getTime() - new Date(currentPost.publishedAt).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCurrentPost({
                        ...currentPost!,
                        publishedAt: val ? new Date(val).toISOString() : null,
                        isPublished: !!val
                      });
                    }}
                  />
                </div>
                <div>
                  <label className="admin-label">Creation Date (createdAt)</label>
                  <input 
                    type="datetime-local"
                    className="admin-input bg-white"
                    value={currentPost?.createdAt ? new Date(new Date(currentPost.createdAt).getTime() - new Date(currentPost.createdAt).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCurrentPost({
                        ...currentPost!,
                        createdAt: val ? new Date(val).toISOString() : new Date().toISOString()
                      });
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
