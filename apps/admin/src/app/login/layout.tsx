import type { Metadata } from 'next';
import { AdminAuthProvider } from '@/hooks/use-admin-auth';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Admin Login — Tamleeq',
  robots: 'noindex, nofollow',
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      {children}
    </AdminAuthProvider>
  );
}
