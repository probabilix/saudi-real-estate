'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';

interface NavWrapperProps {
  children: React.ReactNode;
  locale: string;
}

export default function NavWrapper({ children, locale }: NavWrapperProps) {
  const pathname = usePathname();
  
  // Hide header/footer on auth and legal pages to maintain the "perfectly sorted" UI
  const isMinimalPage = pathname.includes('/login') || 
                       pathname.includes('/register') || 
                       pathname.includes('/verify') ||
                       pathname.includes('/post-property') ||
                       pathname.includes('/edit-property');

  if (isMinimalPage) {
    return <main className="flex-1">{children}</main>;
  }

  const isDashboardPage = pathname.includes('/dashboard');

  return (
    <>
      <Header locale={locale} />
      <main className="flex-1 pt-[110px]">
        {children}
      </main>
      {!isDashboardPage && <Footer />}
    </>
  );
}
