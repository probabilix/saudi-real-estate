import type { Metadata } from 'next';
import HeroSection from '@/components/home/HeroSection';
import FeaturedSection from '@/components/home/FeaturedSection';
import HowItWorksSection from '@/components/home/HowItWorksSection';
import CitySpotlightSection from '@/components/home/CitySpotlightSection';
import CTASection from '@/components/home/CTASection';
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

// SSG with hourly revalidation for SEO
export const revalidate = 3600;

export default async function HomePage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);

  // Fetch first 3 featured listings for the featured section
  let featuredListings: Listing[] = [];
  try {
    const res = await fetch(`${API_BASE_URL}/listings?limit=3&isFeatured=true`, {
      next: { revalidate: 3600 },
    });
    
    if (res.ok) {
      const json = await res.json();
      featuredListings = json?.data?.items || json?.items || [];
    } else {
      const errorText = await res.text();
      console.error(`[HomePage] Fetch failed: ${res.status} ${res.statusText}`, errorText);
    }
  } catch (err) {
    console.error('[HomePage] Fetch error:', err);
    featuredListings = [];
  }

  return (
    <>
      <HeroSection />
      <FeaturedSection listings={featuredListings} />
      <HowItWorksSection />
      <CitySpotlightSection />
      <CTASection />
      <ChatWidget floating={true} />
    </>
  );
}
