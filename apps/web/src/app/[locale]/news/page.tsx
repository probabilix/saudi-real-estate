'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import { Newspaper, Loader2, Search } from 'lucide-react';
import { api, NewsPost } from '@/lib/api';
import NewsCard from '@/components/news/NewsCard';

function NewsPageContent({ params: { locale } }: { params: { locale: string } }) {
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [savedPosts, setSavedPosts] = useState<NewsPost[]>([]);
  const searchParams = useSearchParams();
  const router = useRouter();

  // URL is the source of truth for the active tab
  const activeTab = (searchParams.get('tab') as 'all' | 'saved') || 'all';

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const isRTL = locale === 'ar';

  // Initial data fetch and sync
  useEffect(() => {
    fetchNews();
    fetchSavedNews();

    // Re-fetch when the window gains focus or is shown (including back navigation)
    const onFocus = () => {
      fetchNews();
      fetchSavedNews();
    };

    window.addEventListener('focus', onFocus);
    window.addEventListener('pageshow', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('pageshow', onFocus);
    };
  }, []);

  // Re-sync when tab changes via URL
  useEffect(() => {
    setLoading(true);
    if (activeTab === 'all') fetchNews('all');
    else fetchSavedNews('saved');
  }, [activeTab]);

  const fetchNews = async (targetTab?: string) => {
    try {
      const res = await api.getNews();
      if (res.success) {
        setPosts(res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch news', err);
    } finally {
      const currentTab = targetTab || activeTab;
      if (currentTab === 'all') setLoading(false);
    }
  };

  const fetchSavedNews = async (targetTab?: string) => {
    try {
      const res = await api.getNewsFavorites();
      if (res.success) {
        setSavedPosts(res.data?.items || []);
      }
    } catch (err) {
      console.error('Failed to fetch saved news', err);
    } finally {
      const currentTab = targetTab || activeTab;
      if (currentTab === 'saved') setLoading(false);
    }
  };

  const displayPosts = activeTab === 'all' ? posts : savedPosts;

  const filteredPosts = displayPosts.filter(post => {
    const title = isRTL ? post.titleAr : post.titleEn;
    return title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* ── Hero Section ── */}
      <section className="relative pt-8 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-primary-50/50 -z-10" />
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 opacity-20 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-200 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-amber-200 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-primary-100 mb-8"
          >
            <Newspaper className="w-4 h-4 text-primary-600" />
            <span className={`text-[10px] font-black uppercase tracking-widest text-primary-700 ${isRTL ? 'font-arabic' : ''}`}>
              {isRTL ? 'آخر التحديثات' : 'Latest Updates'}
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`text-5xl md:text-7xl font-black text-gray-900 mb-8 tracking-tight ${isRTL ? 'font-arabic' : 'font-serif'}`}
          >
            {isRTL ? 'أخبار العقارات السعودية' : 'Saudi Real Estate News'}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-2xl mx-auto text-gray-500 text-lg font-medium leading-relaxed mb-12"
          >
            {isRTL
              ? 'ابق على اطلاع بأحدث الاتجاهات واللوائح والفرص الاستثمارية في سوق العقارات في المملكة.'
              : 'Stay informed with the latest trends, regulations, and investment opportunities in the Kingdom\'s property market.'}
          </motion.p>

          {/* Search & Tabs */}
          <div className="max-w-2xl mx-auto space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="relative group"
            >
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary-600 transition-colors" />
              <input
                type="text"
                placeholder={isRTL ? 'ابحث في الأخبار...' : 'Search news articles...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-16 pr-8 py-5 bg-white rounded-[24px] border border-gray-100 shadow-xl shadow-black/[0.02] focus:ring-4 focus:ring-primary-500/5 focus:border-primary-500 outline-none transition-all font-medium"
              />
            </motion.div>

            {/* Tab Navigation */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex justify-center gap-2"
            >
              {[
                { id: 'all', label: isRTL ? 'جميع المقالات' : 'Latest Feed' },
                { id: 'saved', label: isRTL ? 'المقالات المحفوظة' : 'Saved Articles' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    router.push(`?tab=${tab.id}`);
                  }}
                  className={`px-8 py-3 rounded-2xl text-sm font-bold transition-all ${activeTab === tab.id
                      ? 'bg-gray-900 text-white shadow-lg'
                      : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'
                    } ${isRTL ? 'font-arabic' : ''}`}
                >
                  {tab.label}
                  {tab.id === 'saved' && savedPosts.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-primary-600 text-white text-[10px] rounded-full">
                      {savedPosts.length}
                    </span>
                  )}
                </button>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── News Grid ── */}
      <section className="max-w-7xl mx-auto px-4 -mt-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 className="w-10 h-10 text-primary-600 animate-spin" />
            <p className={`text-[10px] font-black uppercase tracking-widest text-gray-400 animate-pulse ${isRTL ? 'font-arabic' : ''}`}>
              {isRTL ? 'جاري تحميل الأخبار...' : 'Loading Feed'}
            </p>
          </div>
        ) : filteredPosts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.map((post, idx) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <NewsCard post={post} locale={locale} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-[40px] py-32 text-center border-2 border-dashed border-gray-200">
            <Newspaper className="w-16 h-16 text-gray-300 mx-auto mb-6" />
            <h3 className={`text-2xl font-black text-gray-900 mb-2 ${isRTL ? 'font-arabic' : 'font-serif'}`}>
              {activeTab === 'saved'
                ? (isRTL ? 'لا توجد مقالات محفوظة' : 'No saved articles')
                : (isRTL ? 'لم يتم العثور على مقالات' : 'No articles found')}
            </h3>
            <p className="text-gray-500">
              {activeTab === 'saved'
                ? (isRTL ? 'احفظ بعض المقالات لقراءتها لاحقاً.' : 'Save some articles to read them later.')
                : (isRTL ? 'حاول تعديل بحثك أو عد لاحقاً.' : 'Try adjusting your search or check back later.')}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

export default function NewsPage(props: { params: { locale: string } }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-primary-600 animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 animate-pulse">
          {props.params.locale === 'ar' ? 'جاري تحميل الأخبار...' : 'Loading Feed'}
        </p>
      </div>
    }>
      <NewsPageContent {...props} />
    </Suspense>
  );
}
