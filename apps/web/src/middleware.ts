import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always', // /en/... and /ar/...
});

export const config = {
  // Match all pathnames except API routes, static files, etc.
  matcher: ['/', '/(ar|en)/:path*'],
};
