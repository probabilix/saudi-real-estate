import type { Metadata } from 'next';
import HeroSection from '@/components/home/HeroSection';
import FeaturedSection from '@/components/home/FeaturedSection';
import HowItWorksSection from '@/components/home/HowItWorksSection';
import MapCTACardsSection from '@/components/home/MapCTACardsSection';
import CitySpotlightSection from '@/components/home/CitySpotlightSection';
import CTASection from '@/components/home/CTASection';
import TrustSection from '@/components/home/TrustSection';
import RecentArticlesSection from '@/components/home/RecentArticlesSection';
import FAQSection from '@/components/home/FAQSection';
import FooterCTAStrip from '@/components/home/FooterCTAStrip';
import EligibilityWizardCTA from '@/components/home/EligibilityWizardCTA';
import ChatWidget from '@/components/chat/ChatWidget';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import { API_BASE_URL } from '@/lib/api';
import { Listing } from '@saudi-re/shared';

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'metadata' });
  return {
    title: t('title'),
    description: t('description'),
  };
}

export const revalidate = 60; // Revalidate static homepage cache once a minute

export default async function HomePage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);

  let featuredLimit = 6;
  let featuredListings: Listing[] = [];
  let featuredProjects: any[] = [];
  const cityCounts: Record<string, number> = { Riyadh: 0, Jeddah: 0, Dammam: 0, AlUla: 0 };
  let recentArticles = [];
  let homeFaqs = [];
  let featuredSlugs: string[] = [];
  let homepageStats = { listings: '200+', transactions: 'SAR 50M+', cities: '4', ownership: '100%' };
  let contactPhone = '+966 53 849 8580';
  let contactWhatsApp = '';

  try {
    const settingsRes = await fetch(`${API_BASE_URL}/system/settings`, { next: { revalidate: 60 } }).catch(() => null);
    if (settingsRes?.ok) {
      const json = await settingsRes.json();
      const d = json?.data || {};

      const limitVal = d.HOMEPAGE_FEATURED_LIMIT;
      if (limitVal) featuredLimit = parseInt(String(limitVal), 10) || 6;

      const slugsVal = d.homepage_featured_articles;
      if (slugsVal) {
        if (Array.isArray(slugsVal)) {
          featuredSlugs = slugsVal;
        } else {
          try { featuredSlugs = JSON.parse(slugsVal); } catch { }
        }
      }

      // Stats for Trust Section
      const statsVal = d.homepage_stats;
      if (statsVal) {
        const parsed = typeof statsVal === 'object' ? statsVal : (() => { try { return JSON.parse(statsVal as string); } catch { return null; } })();
        if (parsed) homepageStats = parsed;
      }

      // Contact info
      if (d.contact_phone) contactPhone = d.contact_phone;
      if (d.social_links) {
        const sl = typeof d.social_links === 'object' ? d.social_links : (() => { try { return JSON.parse(d.social_links as string); } catch { return {}; } })();
        if (sl?.whatsapp) contactWhatsApp = sl.whatsapp;
      }
    }
  } catch (e) {
    console.error('[HomePage] Settings fetch error:', e);
  }

  try {
    const [listingsRes, projectsRes, newsRes, faqsRes, ...cityResponses] = await Promise.all([
      fetch(`${API_BASE_URL}/listings?limit=${featuredLimit}&isFeatured=true`, { next: { revalidate: 60 } }).catch(() => null),
      fetch(`${API_BASE_URL}/system/projects?limit=${featuredLimit}&isFeatured=true`, { next: { revalidate: 60 } }).catch(() => null),
      fetch(`${API_BASE_URL}/news`, { next: { revalidate: 60 } }).catch(() => null),
      fetch(`${API_BASE_URL}/system/faqs`, { next: { revalidate: 60 } }).catch(() => null),
      ...['Riyadh', 'Jeddah', 'Dammam', 'AlUla'].map(city =>
        fetch(`${API_BASE_URL}/listings?limit=1&city=${city}`, { next: { revalidate: 60 } }).catch(() => null)
      )
    ]);

    if (listingsRes?.ok) {
      const json = await listingsRes.json();
      featuredListings = json?.data?.items || json?.items || [];
    }

    if (projectsRes?.ok) {
      const json = await projectsRes.json();
      featuredProjects = json?.data?.items || json?.items || [];
    }

    if (newsRes?.ok) {
      const json = await newsRes.json();
      const allNews = json?.data || json || [];
      if (featuredSlugs.length > 0) {
        const filtered = allNews.filter((post: any) => featuredSlugs.includes(post.slug));
        recentArticles = filtered
          .sort((a: any, b: any) => featuredSlugs.indexOf(a.slug) - featuredSlugs.indexOf(b.slug))
          .slice(0, 4);
        if (recentArticles.length === 0) recentArticles = allNews.slice(0, 4);
      } else {
        recentArticles = allNews.slice(0, 4);
      }
    }

    if (faqsRes?.ok) {
      const json = await faqsRes.json();
      homeFaqs = json?.data || json || [];
    }

    const cities = ['Riyadh', 'Jeddah', 'Dammam', 'AlUla'];
    for (let idx = 0; idx < cities.length; idx++) {
      const cityRes = cityResponses[idx];
      if (cityRes?.ok) {
        const json = await cityRes.json();
        cityCounts[cities[idx]] = json?.data?.total || json?.total || 0;
      }
    }
  } catch (err) {
    console.error('[HomePage] Parallel data pipeline error:', err);
  }

  return (
    <>
      <HeroSection contactPhone={contactPhone} />
      <MapCTACardsSection />
      <FeaturedSection listings={featuredListings} projects={featuredProjects} />
      <HowItWorksSection />
      <EligibilityWizardCTA />
      <TrustSection stats={homepageStats} />
      <CitySpotlightSection counts={cityCounts} />
      <CTASection contactPhone={contactPhone} whatsappNumber={contactWhatsApp} />
      <RecentArticlesSection articles={recentArticles} />
      <FAQSection faqs={homeFaqs} />
      <FooterCTAStrip />
      <ChatWidget floating={true} />
    </>
  );
}
