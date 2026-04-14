// ──────────────────────────────────────────────
// Shared utility functions
// ──────────────────────────────────────────────

/**
 * Format SAR price for display
 * @example formatPrice(800000) → 'SAR 800,000'
 * @example formatPrice(800000, 'ar') → '٨٠٠٬٠٠٠ ر.س'
 */
export function formatPrice(price: number, locale: 'en' | 'ar' = 'en'): string {
  if (locale === 'ar') {
    return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(price);
  }
  return `SAR ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(price)}`;
}

/**
 * Format price for compact display
 * @example formatPriceCompact(800000) → 'SAR 800K'
 * @example formatPriceCompact(1500000) → 'SAR 1.5M'
 */
export function formatPriceCompact(price: number, locale: 'en' | 'ar' = 'en'): string {
  const isAr = locale === 'ar';
  const prefix = isAr ? '' : 'SAR ';
  const suffixStr = isAr ? ' ريال' : '';

  if (price >= 1_000_000) {
    const m = price / 1_000_000;
    const val = m % 1 === 0 ? m.toFixed(0) : m.toFixed(1);
    const unit = isAr ? ' مليون' : 'M';
    return isAr ? `${val}${unit}${suffixStr}` : `${prefix}${val}${unit}`;
  }
  if (price >= 1_000) {
    const k = price / 1_000;
    const val = k % 1 === 0 ? k.toFixed(0) : k.toFixed(1);
    const unit = isAr ? ' ألف' : 'K';
    return isAr ? `${val}${unit}${suffixStr}` : `${prefix}${val}${unit}`;
  }
  return isAr ? `${price}${suffixStr}` : `${prefix}${price}`;
}

/**
 * Format area in square metres
 */
export function formatArea(sqm: number, locale: 'en' | 'ar' = 'en'): string {
  return locale === 'ar'
    ? `${sqm.toLocaleString('ar-SA')} م²`
    : `${sqm.toLocaleString('en-US')} sqm`;
}

/**
 * Calculate buyer intent score
 */
export function calculateIntentScore(profile: {
  budgetMin?: number | null;
  budgetMax?: number | null;
  timelineMonths?: number | null;
  listingsViewed?: string[] | null;
  shortlisted?: string[] | null;
  contactProvided?: boolean;
}): number {
  let score = 0;

  // Budget specificity (25 if specific, 5 if vague)
  const hasBudget = (profile.budgetMin && profile.budgetMin > 0) || (profile.budgetMax && profile.budgetMax > 0);
  score += hasBudget ? 25 : 5;

  // Timeline urgency
  const timeline = profile.timelineMonths ?? 99;
  score += timeline <= 3 ? 25 : 10;

  // Browsing depth (max 20 points)
  const viewCount = profile.listingsViewed?.length ?? 0;
  score += Math.min(viewCount * 2, 20);

  // Shortlisting engagement (max 20 points)
  const shortlistCount = profile.shortlisted?.length ?? 0;
  score += Math.min(shortlistCount * 10, 20);

  // Contact provided
  score += profile.contactProvided ? 10 : 0;

  return Math.min(score, 100);
}

/**
 * Build a Cloudinary URL with transformations
 * @param publicId - Cloudinary public ID
 * @param cloudName - Your Cloudinary cloud name (pass from env on the calling side)
 * @param options - Transform options
 */
export function cloudinaryUrl(
  publicId: string,
  cloudName: string,
  options: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string;
    format?: string;
  } = {}
): string {
  const transforms: string[] = [];
  if (options.width) transforms.push(`w_${options.width}`);
  if (options.height) transforms.push(`h_${options.height}`);
  if (options.crop) transforms.push(`c_${options.crop}`);
  transforms.push(`q_${options.quality || 'auto'}`);
  transforms.push(`f_${options.format || 'auto'}`);

  const transformStr = transforms.length > 0 ? `/${transforms.join(',')}` : '';

  return `https://res.cloudinary.com/${cloudName}/image/upload${transformStr}/${publicId}`;
}

/**
 * Generate a human-readable budget display
 * @example budgetDisplay(500000, 800000) → 'SAR 500K – 800K'
 */
export function budgetDisplay(min?: number | null, max?: number | null): string {
  if (min && max) return `${formatPriceCompact(min)} – ${formatPriceCompact(max).replace('SAR ', '')}`;
  if (min) return `From ${formatPriceCompact(min)}`;
  if (max) return `Up to ${formatPriceCompact(max)}`;
  return 'Not specified';
}

/**
 * Generate a human-readable timeline display
 */
export function timelineDisplay(months?: number | null): string {
  if (!months) return 'Not specified';
  if (months <= 1) return 'Immediately';
  if (months <= 3) return 'Within 3 months';
  if (months <= 6) return 'Within 6 months';
  if (months <= 12) return 'Within a year';
  return 'Just browsing';
}
