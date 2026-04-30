'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Calendar, User, ArrowLeft, Share2, Facebook, Twitter, Linkedin, Loader2, Bookmark } from 'lucide-react';
import { api, NewsPost } from '@/lib/api';

export default function NewsArticlePage({ params: { locale, slug } }: { params: { locale: string, slug: string } }) {
  const [post, setPost] = useState<NewsPost | null>(null);
  const [loading, setLoading] = useState(true);
  const isRTL = locale === 'ar';

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const res = await api.getNewsBySlug(slug);
        if (res.success) {
          setPost(res.data || null);
        }
      } catch (err) {
        console.error('Failed to fetch post', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-primary-600 animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 animate-pulse">Opening Article</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-4xl font-black text-gray-900 mb-4">Article Not Found</h1>
        <Link href={`/${locale}/news`} className="text-primary-600 font-bold hover:underline">Return to News</Link>
      </div>
    );
  }

  const title = isRTL ? post.titleAr : post.titleEn;
  const content = isRTL ? post.contentAr : post.contentEn;
  const date = post.publishedAt ? new Date(post.publishedAt).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : '';

  return (
    <div className="bg-white min-h-screen">
      {/* ── Article Header ── */}
      <header className="relative h-[60vh] md:h-[70vh] min-h-[500px] flex items-end pb-20">
        <div className="absolute inset-0">
          <Image 
            src={post.featuredImage || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1200'} 
            alt={title}
            fill
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-900/40 to-transparent" />
        </div>

        <div className="max-w-4xl mx-auto px-4 relative z-10 w-full">
          <Link 
            href={`/${locale}/news`}
            className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-8 transition-colors text-sm font-bold group"
          >
            <ArrowLeft className={`w-4 h-4 transition-transform group-hover:-translate-x-1 ${isRTL ? 'rotate-180 group-hover:translate-x-1' : ''}`} />
            {isRTL ? 'العودة إلى الأخبار' : 'Back to News'}
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-6"
          >
            <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-primary-400">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {date}
              </span>
              <span className="w-1 h-1 bg-white/20 rounded-full" />
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                Admin
              </span>
            </div>

            <h1 className={`text-4xl md:text-6xl font-black text-white tracking-tight leading-tight ${isRTL ? 'font-arabic' : 'font-serif'}`}>
              {title}
            </h1>
          </motion.div>
        </div>
      </header>

      {/* ── Article Content ── */}
      <article className="max-w-4xl mx-auto px-4 py-20">
        <div className="flex flex-col md:flex-row gap-12">
          {/* Main Body */}
          <div className="flex-1">
             <div className={`prose prose-lg prose-gray max-w-none ${isRTL ? 'font-arabic text-right' : 'font-sans'}`}>
                {/* For a real blog we'd use a markdown/rich text renderer here */}
                {content.split('\n').map((para: string, i: number) => (
                  <p key={i} className="mb-6 text-gray-600 leading-relaxed text-lg">
                    {para}
                  </p>
                ))}
             </div>

             {/* Footer Actions */}
             <div className="mt-16 pt-10 border-t border-gray-100 flex flex-wrap items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                   <span className="text-xs font-black uppercase tracking-widest text-gray-400">
                      {isRTL ? 'مشاركة:' : 'Share:'}
                   </span>
                   <div className="flex gap-2">
                      {[Facebook, Twitter, Linkedin, Share2].map((Icon, i) => (
                        <button key={i} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-primary-600 hover:text-white transition-all">
                          <Icon className="w-4 h-4" />
                        </button>
                      ))}
                   </div>
                </div>
                <button className={`flex items-center gap-2 px-6 py-3 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 hover:bg-gray-50 transition-all ${isRTL ? 'font-arabic' : ''}`}>
                   <Bookmark className="w-4 h-4" />
                   {isRTL ? 'احفظ المقال' : 'Save Article'}
                </button>
             </div>
          </div>

          {/* Sidebar */}
          <aside className="w-full md:w-64 space-y-12">
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
                         {isRTL ? 'فريق سعودي عقار' : 'Saudi RE Team'}
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
      </article>

      {/* ── Newsletter Section ── */}
      <section className="max-w-7xl mx-auto px-4 mb-24">
         <div className="bg-gray-900 rounded-[48px] p-12 md:p-20 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[40%] h-full bg-primary-600/10 blur-[100px] pointer-events-none" />
            <div className="relative z-10">
               <h2 className={`text-3xl md:text-5xl font-black text-white mb-6 tracking-tight ${isRTL ? 'font-arabic' : 'font-serif'}`}>
                  {isRTL ? 'ابقَ على اطلاع دائم بالسوق.' : 'Stay ahead of the market.'}
               </h2>
               <p className={`text-gray-400 text-lg mb-12 max-w-xl mx-auto font-medium ${isRTL ? 'font-arabic' : ''}`}>
                  {isRTL ? 'اشترك في نشرتنا الإخبارية الأسبوعية للحصول على رؤى وبيانات عقارية حصرية.' : 'Subscribe to our weekly newsletter for exclusive real estate insights and data.'}
               </p>
               <div className={`max-w-md mx-auto flex flex-col sm:flex-row gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <input 
                    type="email" 
                    placeholder={isRTL ? 'أدخل بريدك الإلكتروني' : 'Enter your email'}
                    className={`flex-1 px-8 py-4 bg-white/5 border border-white/10 rounded-[20px] text-white focus:outline-none focus:border-primary-500 transition-all ${isRTL ? 'text-right' : ''}`}
                  />
                  <button className={`px-10 py-4 bg-primary-600 text-white rounded-[20px] font-black hover:bg-primary-500 transition-all whitespace-nowrap shadow-xl shadow-primary-600/20 ${isRTL ? 'font-arabic' : ''}`}>
                     {isRTL ? 'انضم الآن' : 'Join Now'}
                  </button>
               </div>
            </div>
         </div>
      </section>
    </div>
  );
}
