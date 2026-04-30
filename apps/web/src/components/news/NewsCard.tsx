'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Calendar, User, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { NewsPost } from '@/lib/api';

interface NewsCardProps {
  post: NewsPost;
  locale: string;
}

export default function NewsCard({ post, locale }: NewsCardProps) {
  const isRTL = locale === 'ar';
  const title = isRTL ? post.titleAr : post.titleEn;
  const excerpt = isRTL ? post.excerptAr : post.excerptEn;
  const date = post.publishedAt ? new Date(post.publishedAt).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : '';

  return (
    <motion.div 
      whileHover={{ y: -8 }}
      className="bg-white rounded-[32px] overflow-hidden border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-primary-600/5 transition-all duration-500 flex flex-col h-full group"
    >
      {/* Image Container */}
      <Link href={`/${locale}/news/${post.slug}`} className="relative h-64 overflow-hidden block">
        <Image 
          src={post.featuredImage || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=800'} 
          alt={title}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </Link>

      {/* Content */}
      <div className="p-6 md:p-8 flex flex-col flex-1">
        <div className="flex items-center gap-3 mb-4 text-[10px] font-black uppercase tracking-widest text-primary-600 overflow-hidden">
          <span className="flex items-center gap-1.5 whitespace-nowrap shrink-0">
            <Calendar className="w-3 h-3" />
            {date}
          </span>
          <span className="w-1 h-1 bg-gray-300 rounded-full shrink-0" />
          <span className="flex items-center gap-1.5 whitespace-nowrap shrink-0">
            <User className="w-3 h-3" />
            {isRTL ? 'المشرف' : 'Admin'}
          </span>
        </div>

        <Link href={`/${locale}/news/${post.slug}`}>
          <h3 className={`text-xl font-black text-gray-900 mb-4 group-hover:text-primary-600 transition-colors leading-tight min-h-[56px] line-clamp-2 ${isRTL ? 'font-arabic' : 'font-serif'}`}>
            {title}
          </h3>
        </Link>

        <p className="text-gray-500 text-sm leading-relaxed mb-8 line-clamp-3">
          {excerpt}
        </p>

        <div className="mt-auto pt-6 border-t border-gray-50">
          <Link 
            href={`/${locale}/news/${post.slug}`}
            className="inline-flex items-center gap-2 text-sm font-black text-gray-900 hover:text-primary-600 transition-colors group/link"
          >
            {isRTL ? 'اقرأ المزيد' : 'Read More'}
            <ArrowRight className={`w-4 h-4 transition-transform group-hover/link:translate-x-1 ${isRTL ? 'rotate-180 group-hover/link:-translate-x-1' : ''}`} />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
