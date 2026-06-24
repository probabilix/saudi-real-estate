import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Admin Panel — Tamleeq',
  description: 'Internal admin panel for managing the Tamleeq platform.',
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
