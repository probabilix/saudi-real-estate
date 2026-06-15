import type { Metadata } from 'next';
import './globals.css';
import { CrmAuthProvider } from '@/hooks/use-crm-auth';

export const metadata: Metadata = {
  title: 'Saudi RE — CRM Workspace',
  description: 'Real Estate CRM for managing leads and sales pipelines.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CrmAuthProvider>
          {children}
        </CrmAuthProvider>
      </body>
    </html>
  );
}
