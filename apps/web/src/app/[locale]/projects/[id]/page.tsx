import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { unstable_setRequestLocale } from 'next-intl/server';
import ProjectDetailClient from './ProjectDetailClient';
import { getApiBaseUrl } from '@/lib/api';

interface Props {
  params: {
    locale: string;
    id: string;
  };
}

async function getProjectData(id: string): Promise<any> {
  try {
    const apiBase = getApiBaseUrl();
    const res = await fetch(`${apiBase}/system/projects/${id}`, { next: { revalidate: 60 } });
    if (res.ok) {
      const json = await res.json();
      return json?.data?.project || null;
    }
  } catch (err) {
    console.error('Error fetching project in server wrapper:', err);
  }
  return null;
}

export async function generateMetadata({ params: { locale, id } }: Props): Promise<Metadata> {
  const project = await getProjectData(id);
  if (!project) {
    return {
      title: 'Project Not Found',
    };
  }

  const isAr = locale === 'ar';
  const name = isAr ? project.nameAr : project.nameEn;
  const city = isAr ? project.cityAr || project.city : project.cityEn || project.city;
  const district = isAr ? project.districtAr || project.district : project.districtEn || project.district;

  let locationText = '';
  if (district && city) {
    locationText = isAr ? `في ${district}، ${city}` : `in ${district}, ${city}`;
  } else if (city) {
    locationText = isAr ? `في ${city}` : `in ${city}`;
  }

  // Determine completion status
  let statusText = '';
  const status = project.completionStatus;
  if (status) {
    if (status === 'READY') {
      statusText = isAr ? 'مكتمل وجاهز للتسليم' : 'Completed & Ready';
    } else if (status === 'OFF_PLAN') {
      statusText = isAr ? 'على الخارطة (قيد الإنشاء)' : 'Off-Plan Development';
    } else if (status === 'UNDER_CONSTRUCTION') {
      statusText = isAr ? 'تحت الإنشاء' : 'Under Construction';
    }
  }

  // Title: "Roshn Front — Ready to Move Compound in Riyadh | Tamleeq"
  let title = '';
  if (isAr) {
    title = `${name} — ${statusText ? `${statusText} ` : ''}${locationText}`;
  } else {
    title = `${name} — ${statusText ? `${statusText} ` : ''}${locationText}`;
  }

  const desc = isAr ? project.descriptionAr || project.description : project.descriptionEn || project.description;
  const descriptionSnippet = desc ? desc.slice(0, 155) + '...' : '';

  const imageUrl = project.photos && project.photos.length > 0
    ? project.photos[0]
    : 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=1200';
  const pageUrl = `${process.env.NEXT_PUBLIC_WEB_URL || 'https://tamleeq.sa'}/${locale}/projects/${id}`;

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

export default async function ProjectDetailPage({ params }: Props) {
  unstable_setRequestLocale(params.locale);

  const project = await getProjectData(params.id);
  if (!project) {
    notFound();
  }

  // Schema.org JSON-LD structured data for ApartmentComplex
  const isAr = params.locale === 'ar';
  const district = isAr ? project.districtAr || project.district : project.districtEn || project.district;
  const city = isAr ? project.cityAr || project.city : project.cityEn || project.city;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ApartmentComplex',
    'name': isAr ? project.nameAr : project.nameEn,
    'description': isAr ? project.descriptionAr || project.description : project.descriptionEn || project.description,
    'url': `${process.env.NEXT_PUBLIC_WEB_URL || 'https://tamleeq.sa'}/${params.locale}/projects/${params.id}`,
    'image': project.photos || [],
    'address': {
      '@type': 'PostalAddress',
      'addressLocality': district || '',
      'addressRegion': city || '',
      'addressCountry': 'SA'
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProjectDetailClient params={params} />
    </>
  );
}
