import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Admin Panel — Saudi Real Estate',
  description: 'Internal admin panel for managing the Saudi Real Estate platform.',
  robots: 'noindex, nofollow', // Never index the admin panel
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className="bg-canvas text-surface-800 antialiased">
        {children}
      </body>
    </html>
  );
}
