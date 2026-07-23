import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { unstable_setRequestLocale } from 'next-intl/server';
import ListingDetailClient from './ListingDetailClient';
import { getApiBaseUrl } from '@/lib/api';

interface Props {
  params: {
    locale: string;
    id: string;
  };
}

async function getListingData(id: string): Promise<any> {
  try {
    const apiBase = getApiBaseUrl();
    const res = await fetch(`${apiBase}/listings/${id}`, { next: { revalidate: 60 } });
    if (res.ok) {
      const json = await res.json();
      return json?.data || null;
    }
  } catch (err) {
    console.error('Error fetching listing in server wrapper:', err);
  }
  return null;
}

export async function generateMetadata({ params: { locale, id } }: Props): Promise<Metadata> {
  const listing = await getListingData(id);
  if (!listing) {
    return {
      title: 'Property Not Found',
    };
  }

  const isAr = locale === 'ar';
  
  // Format price
  const priceFormatted = listing.price ? Number(listing.price).toLocaleString() : '';
  const priceString = priceFormatted ? `${priceFormatted} SAR` : '';
  
  // Build dynamic title matching Bayut style
  const beds = listing.bedrooms || '';
  const bedsText = beds ? (isAr ? `${beds} غرف نوم` : `${beds} Bed`) : '';
  
  let typeText = '';
  const uType = (listing.type || '').toUpperCase();
  if (uType === 'VILLA') {
    typeText = isAr ? 'فيلا' : 'Villa';
  } else if (uType === 'APARTMENT') {
    typeText = isAr ? 'شقة' : 'Apartment';
  } else if (uType === 'LAND') {
    typeText = isAr ? 'أرض' : 'Land';
  } else if (uType === 'COMMERCIAL') {
    typeText = isAr ? 'عقار تجاري' : 'Commercial';
  } else {
    typeText = isAr ? 'عقار' : 'Property';
  }

  let purposeText = '';
  const uPurpose = (listing.purpose || '').toUpperCase();
  if (uPurpose === 'SALE') {
    purposeText = isAr ? 'للبيع' : 'for Sale';
  } else if (uPurpose === 'RENT') {
    purposeText = isAr ? 'للإيجار' : 'for Rent';
  } else {
    purposeText = isAr ? 'للبيع والإيجار' : 'for Sale & Rent';
  }

  let locationText = '';
  const district = isAr ? listing.districtAr || listing.district : listing.districtEn || listing.district;
  const city = isAr ? listing.cityAr || listing.city : listing.cityEn || listing.city;
  
  if (district && city) {
    locationText = isAr ? `في ${district}، ${city}` : `in ${district}, ${city}`;
  } else if (city) {
    locationText = isAr ? `في ${city}` : `in ${city}`;
  }

  let title = '';
  if (isAr) {
    title = `${typeText} ${bedsText ? `${bedsText} ` : ''}${purposeText} ${locationText}`;
    if (priceString) {
      title += ` - ${priceString.replace('SAR', 'ريال سعودي')}`;
    }
  } else {
    title = `${bedsText ? `${bedsText} ` : ''}${typeText} ${purposeText} ${locationText}`;
    if (priceString) {
      title += ` - ${priceString}`;
    }
  }

  if (!isAr) {
    title = title.trim().replace(/^\w/, (c) => c.toUpperCase());
  }

  const desc = isAr ? listing.descriptionAr || listing.description : listing.descriptionEn || listing.description;
  const descriptionSnippet = desc ? desc.slice(0, 155) + '...' : '';

  const imageUrl = listing.photos && listing.photos.length > 0
    ? listing.photos[0]
    : 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1200';
  const pageUrl = `${process.env.NEXT_PUBLIC_WEB_URL || 'https://tamleeq.sa'}/${locale}/listings/${id}`;

  return {
    title,
    description: descriptionSnippet || title,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title,
      description: descriptionSnippet || title,
      url: pageUrl,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: locale === 'ar' ? 'ar_SA' : 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: descriptionSnippet || title,
      images: [imageUrl],
    },
  };
}

export default async function ListingDetailPage({ params }: Props) {
  unstable_setRequestLocale(params.locale);

  const listing = await getListingData(params.id);
  if (!listing) {
    notFound();
  }

  // Schema.org JSON-LD Structured Data
  const isAr = params.locale === 'ar';
  const district = isAr ? listing.districtAr || listing.district : listing.districtEn || listing.district;
  const city = isAr ? listing.cityAr || listing.city : listing.cityEn || listing.city;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    'name': isAr 
      ? `${listing.bedrooms || ''} غرف نوم ${listing.type === 'VILLA' ? 'فيلا' : 'شقة'} ${listing.purpose === 'SALE' ? 'للبيع' : 'للإيجار'} في ${district || ''} ${city || ''}`
      : `${listing.bedrooms || ''} Bedroom ${listing.type} ${listing.purpose === 'SALE' ? 'for Sale' : 'for Rent'} in ${district || ''} ${city || ''}`,
    'description': isAr ? listing.descriptionAr || listing.description : listing.descriptionEn || listing.description,
    'url': `${process.env.NEXT_PUBLIC_WEB_URL || 'https://tamleeq.sa'}/${params.locale}/listings/${params.id}`,
    'image': listing.photos || [],
    'offers': {
      '@type': 'Offer',
      'price': listing.price || '0',
      'priceCurrency': 'SAR',
      'priceSpecification': {
        '@type': 'UnitPriceSpecification',
        'price': listing.price || '0',
        'priceCurrency': 'SAR',
        'referenceQuantity': {
          '@type': 'QuantitativeValue',
          'value': '1',
          'unitCode': 'C62'
        }
      }
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ListingDetailClient params={params} />
    </>
  );
}
