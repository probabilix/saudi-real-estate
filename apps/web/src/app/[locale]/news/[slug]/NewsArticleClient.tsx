'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Calendar, User, ArrowLeft, Share2, Facebook, Twitter, Linkedin, Bookmark } from 'lucide-react';
import { api, NewsPost } from '@/lib/api';

function parseInlineMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-gray-900">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary-600 hover:underline font-bold">$1</a>');
}

function parseMarkdown(md: string): string {
  if (!md) return '';

  const lines = md.split('\n');
  let html = '';
  let inList = false;
  let inTable = false;
  let tableHeaderParsed = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trim();

    // Handle tables
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      if (!inTable) {
        inTable = true;
        tableHeaderParsed = false;
        html += '<div class="overflow-x-auto my-6"><table class="w-full text-sm border-collapse border border-gray-200">';
      }
      const cells = trimmed.split('|').slice(1, -1).map(c => c.trim());
      const isSeparator = cells.every(c => /^:?-+:?$/g.test(c));
      if (isSeparator) continue;

      if (!tableHeaderParsed) {
        html += '<thead><tr class="bg-gray-50 border-b border-gray-200">';
        cells.forEach(c => {
          html += `<th class="border border-gray-200 px-4 py-2.5 font-bold text-gray-700 text-left">${parseInlineMarkdown(c)}</th>`;
        });
        html += '</tr></thead><tbody>';
        tableHeaderParsed = true;
      } else {
        html += '<tr class="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">';
        cells.forEach(c => {
          html += `<td class="border border-gray-200 px-4 py-2 text-gray-600">${parseInlineMarkdown(c)}</td>`;
        });
        html += '</tr>';
      }
      continue;
    } else {
      if (inTable) {
        html += '</tbody></table></div>';
        inTable = false;
      }
    }

    // Handle lists
    const listMatch = line.match(/^(\s*)([\-\*])\s+(.*)$/);
    if (listMatch) {
      if (!inList) {
        html += '<ul class="list-disc pl-6 my-4 space-y-2">';
        inList = true;
      }
      html += `<li class="text-gray-600 leading-relaxed">${parseInlineMarkdown(listMatch[3])}</li>`;
      continue;
    } else {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
    }

    // Handle headings
    if (trimmed.startsWith('### ')) {
      html += `<h4 class="text-lg font-bold text-gray-900 mt-6 mb-3">${parseInlineMarkdown(trimmed.substring(4))}</h4>`;
      continue;
    }
    if (trimmed.startsWith('## ')) {
      html += `<h3 class="text-xl font-bold text-gray-900 mt-8 mb-4">${parseInlineMarkdown(trimmed.substring(3))}</h3>`;
      continue;
    }
    if (trimmed.startsWith('# ')) {
      html += `<h2 class="text-2xl font-black text-gray-900 mt-10 mb-5">${parseInlineMarkdown(trimmed.substring(2))}</h2>`;
      continue;
    }

    // Horizontal Rule
    if (trimmed === '---') {
      html += '<hr class="my-8 border-gray-100" />';
      continue;
    }

    // Empty lines
    if (!trimmed) {
      continue;
    }

    // Regular Paragraph
    html += `<p class="mb-6 text-gray-600 leading-relaxed text-lg">${parseInlineMarkdown(line)}</p>`;
  }

  // Close open tags
  if (inTable) html += '</tbody></table></div>';
  if (inList) html += '</ul>';

  return html;
}

interface NewsArticleClientProps {
  post: NewsPost;
  relatedPosts: NewsPost[];
  locale: string;
  initialIsSaved: boolean;
}

export default function NewsArticleClient({ post, relatedPosts, locale, initialIsSaved }: NewsArticleClientProps) {
  const [isSaved, setIsSaved] = useState(initialIsSaved);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const isRTL = locale === 'ar';

  useEffect(() => {
    async function checkSavedStatus() {
      try {
        const res = await api.getNewsBySlug(post.slug);
        if (res.success && res.data) {
          setIsSaved(!!(res.data as any).isFavorited);
        }
      } catch (err) {
        console.error('Failed to sync saved status on client:', err);
      }
    }
    checkSavedStatus();
  }, [post.slug]);

  const title = isRTL ? post.titleAr : post.titleEn;
  const content = isRTL ? post.contentAr : post.contentEn;
  const date = post.publishedAt ? new Date(post.publishedAt).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : '';

  return (
    <div className="bg-white min-h-screen">
      {/* ── Main Layout Container ── */}
      <div className="max-w-7xl mx-auto px-4 pt-8 pb-16">
        
        {/* Breadcrumb link */}
        <div className="mb-6">
          <Link
            href={`/${locale}/news`}
            className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-primary-600 transition-colors group"
          >
            <ArrowLeft className={`w-3.5 h-3.5 transition-transform group-hover:-translate-x-1 ${isRTL ? 'rotate-180 group-hover:translate-x-1' : ''}`} />
            {isRTL ? 'العودة إلى الأخبار' : 'Back to News'}
          </Link>
        </div>

        {/* Top Section: Main Featured Image & Related News Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
          {/* Main Featured Image (Aspect Ratio Preserved) */}
          <div className="lg:col-span-2 space-y-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative w-full aspect-[16/10] sm:aspect-[16/9] rounded-[24px] overflow-hidden shadow-sm bg-gray-50 border border-gray-100"
            >
              <Image
                src={post.featuredImage || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1200'}
                alt={title}
                fill
                priority
                className="object-cover"
              />
            </motion.div>

            {/* Breadcrumb link */}
            <div className="pt-1">
              <Link
                href={`/${locale}/news`}
                className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-primary-600 transition-colors group"
              >
                <ArrowLeft className={`w-3.5 h-3.5 transition-transform group-hover:-translate-x-1 ${isRTL ? 'rotate-180 group-hover:translate-x-1' : ''}`} />
                {isRTL ? 'العودة إلى الأخبار' : 'Back to News'}
              </Link>
            </div>
          </div>

          {/* Related Articles Widget */}
          <div className="flex flex-col space-y-4">
            <h4 className={`text-xs font-black uppercase tracking-widest text-gray-900 pb-2 border-b-2 border-primary-600 w-fit ${isRTL ? 'font-arabic' : ''}`}>
              {isRTL ? 'مقالات ذات صلة' : 'Related News'}
            </h4>
            <div className="space-y-4 flex-1">
              {relatedPosts.length === 0 ? (
                <p className="text-xs text-gray-400 italic">
                  {isRTL ? 'لا توجد مقالات ذات صلة' : 'No related articles found'}
                </p>
              ) : (
                relatedPosts.map((related) => {
                  const relTitle = isRTL ? related.titleAr : related.titleEn;
                  const relDate = related.publishedAt ? new Date(related.publishedAt).toLocaleDateString(locale, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  }) : '';
                  return (
                    <Link
                      key={related.id}
                      href={`/${locale}/news/${related.slug}`}
                      className="flex gap-4 group cursor-pointer hover:bg-gray-50/50 p-2 rounded-xl transition-all"
                    >
                      <div className="relative w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-gray-100 border border-gray-100">
                        <Image
                          src={related.featuredImage || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1200'}
                          alt={relTitle}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="flex flex-col justify-center min-w-0">
                        <h5 className={`text-xs font-bold text-gray-900 line-clamp-2 group-hover:text-primary-600 transition-colors leading-snug ${isRTL ? 'font-arabic text-right' : 'text-left'}`}>
                          {relTitle}
                        </h5>
                        <span className="text-[10px] text-gray-400 mt-1">
                          {relDate}
                        </span>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Bottom Section: Article Content & Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 pt-4">
          {/* Article Title & Content */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-primary-600">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {date}
              </span>
              <span className="w-1 h-1 bg-gray-200 rounded-full" />
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                Admin
              </span>
            </div>

            <h1 className={`text-3xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight ${isRTL ? 'font-arabic text-right' : 'font-serif text-left'}`}>
              {title}
            </h1>

            <div 
              className={`prose prose-lg prose-gray max-w-none pt-4 ${isRTL ? 'font-arabic text-right' : 'font-sans'}`}
              dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
            />

            {/* Footer Actions */}
            <div className="mt-16 pt-10 border-t border-gray-100 flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <span className="text-xs font-black uppercase tracking-widest text-gray-400">
                  {isRTL ? 'مشاركة:' : 'Share:'}
                </span>
                <div className="flex gap-2">
                  {[
                    { Icon: Facebook, url: `https://www.facebook.com/sharer/sharer.php?u=${typeof window !== 'undefined' ? window.location.href : ''}` },
                    { Icon: Twitter, url: `https://twitter.com/intent/tweet?url=${typeof window !== 'undefined' ? window.location.href : ''}&text=${encodeURIComponent(title)}` },
                    { Icon: Linkedin, url: `https://www.linkedin.com/sharing/share-offsite/?url=${typeof window !== 'undefined' ? window.location.href : ''}` },
                  ].map((item, i) => (
                    <button
                      key={i}
                      onClick={() => window.open(item.url, '_blank', 'width=600,height=400')}
                      className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-primary-600 hover:text-white transition-all"
                    >
                      <item.Icon className="w-4 h-4" />
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({ title, url: window.location.href });
                      } else {
                        navigator.clipboard.writeText(window.location.href);
                        alert(isRTL ? 'تم نسخ الرابط!' : 'Link copied to clipboard!');
                      }
                    }}
                    className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-primary-600 hover:text-white transition-all"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <button
                onClick={async () => {
                  if (!post) return;
                  const res = await api.toggleNewsFavorite(post.id);
                  if (res.success) {
                    setIsSaved(!!res.data?.isFavorited);
                  } else if (res.error?.includes('Unauthorised')) {
                    alert(isRTL ? 'يرجى تسجيل الدخول لحفظ المقالات' : 'Please login to save articles');
                  }
                }}
                className={`flex items-center gap-2 px-6 py-3 border rounded-2xl text-sm font-bold transition-all ${isSaved ? 'bg-primary-600 border-primary-600 text-white' : 'border-gray-100 text-gray-900 hover:bg-gray-50'} ${isRTL ? 'font-arabic' : ''}`}
              >
                <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                {isSaved
                  ? (isRTL ? 'تم الحفظ' : 'Saved')
                  : (isRTL ? 'احفظ المقال' : 'Save Article')
                }
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="w-full lg:w-80 shrink-0 space-y-12 pt-8">
            <div>
              <h4 className={`text-xs font-black uppercase tracking-widest text-gray-900 mb-6 pb-2 border-b-2 border-primary-600 w-fit ${isRTL ? 'font-arabic' : ''}`}>
                {isRTL ? 'الكاتب' : 'Author'}
              </h4>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600 font-black">
                  {isRTL ? 'س' : 'A'}
                </div>
                <div>
                  <p className={`font-bold text-gray-900 ${isRTL ? 'font-arabic' : ''}`}>
                    {isRTL ? 'فريق تمليك' : 'Tamleeq Team'}
                  </p>
                  <p className={`text-xs text-gray-400 ${isRTL ? 'font-arabic' : ''}`}>
                    {isRTL ? 'قسم التحرير' : 'Editorial Department'}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h4 className={`text-xs font-black uppercase tracking-widest text-gray-900 mb-6 pb-2 border-b-2 border-primary-600 w-fit ${isRTL ? 'font-arabic' : ''}`}>
                {isRTL ? 'الوسوم' : 'Tags'}
              </h4>
              <div className="flex flex-wrap gap-2">
                {(isRTL ? ['اتجاهات السوق', 'الاستثمار', 'اللوائح', 'سعودية 2030'] : ['Market Trends', 'Investment', 'Regulations', 'Saudi 2030']).map(tag => (
                  <span key={tag} className={`px-3 py-1.5 bg-gray-50 rounded-lg text-xs font-bold text-gray-500 hover:bg-primary-50 hover:text-primary-600 cursor-pointer transition-all ${isRTL ? 'font-arabic' : ''}`}>
                    #{tag.replace(' ', '')}
                  </span>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* ── FAQs Section ── */}
      {post.faqs && post.faqs.length >= 4 && (
        <section className="max-w-4xl mx-auto px-4 pb-24">
          <div className="border-t border-gray-100 pt-16">
            <h2 className={`text-2xl md:text-3xl font-black text-gray-900 mb-8 tracking-tight ${isRTL ? 'font-arabic text-right' : 'font-serif text-left'}`}>
              {isRTL ? 'الأسئلة الشائعة' : 'Frequently Asked Questions'}
            </h2>
            
            <div className="space-y-4">
              {post.faqs.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                const question = isRTL ? faq.questionAr : faq.questionEn;
                const answer = isRTL ? faq.answerAr : faq.answerEn;
                
                if (!question || !answer) return null;

                return (
                  <div 
                    key={index}
                    className="border border-gray-100 rounded-[20px] overflow-hidden bg-gray-50/50 hover:bg-gray-50/80 transition-all duration-300"
                  >
                    <button
                      onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                      className={`w-full px-6 py-5 flex items-center justify-between gap-4 text-left font-bold text-gray-900 text-base md:text-lg transition-colors ${isRTL ? 'text-right flex-row-reverse font-arabic' : ''}`}
                    >
                      <span>{question}</span>
                      <span className={`transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''} text-primary-600 shrink-0`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                        </svg>
                      </span>
                    </button>
                    
                    <motion.div
                      initial={false}
                      animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className={`px-6 pb-6 pt-1 text-gray-600 leading-relaxed text-sm md:text-base border-t border-gray-100/50 ${isRTL ? 'font-arabic text-right' : 'font-sans'}`}>
                        {answer}
                      </div>
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
