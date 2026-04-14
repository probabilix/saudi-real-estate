import { unstable_setRequestLocale } from 'next-intl/server';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

export default function DashboardRootLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  unstable_setRequestLocale(locale);
  
  return (
    <DashboardLayout locale={locale}>
      {children}
    </DashboardLayout>
  );
}
