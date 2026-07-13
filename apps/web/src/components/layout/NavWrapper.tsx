'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';
import ComparisonTray from '../listings/ComparisonTray';

interface NavWrapperProps {
  children: React.ReactNode;
  locale: string;
}

export default function NavWrapper({ children, locale }: NavWrapperProps) {
  const pathname = usePathname();

  // Hide header/footer on auth and legal pages to maintain the "perfectly sorted" UI
  const isMinimalPage = pathname.includes('/login') ||
    pathname.includes('/register') ||
    pathname.includes('/forgot-password') ||
    pathname.includes('/verify') ||
    pathname.includes('/post-property') ||
    pathname.includes('/edit-property') ||
    pathname.includes('/compare');

  if (isMinimalPage) {
    return <main className="flex-1">{children}</main>;
  }

  const isDashboardPage = pathname.includes('/dashboard');
  const isMapOrDriveTime = pathname.includes('/map') || pathname.includes('/drive-time');
  const showCompareTray = (pathname.includes('/listings') || pathname.includes('/projects')) && !pathname.includes('/compare');

  if (isMapOrDriveTime) {
    return (
      <>
        <div className="hidden lg:block">
          <Header locale={locale} />
        </div>
        {/* position:fixed anchors the map exactly to the viewport boundary */}
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 20,
            background: 'white',
          }}
          className="pt-0 lg:pt-[110px]"
        >
          {children}
        </div>
        {showCompareTray && <ComparisonTray />}
      </>
    );
  }

  return (
    <>
      <Header locale={locale} />
      <main className={`flex-1 pt-[70px] md:pt-[110px]`}>
        {children}
      </main>
      {!isDashboardPage && <Footer />}
      {showCompareTray && <ComparisonTray />}
    </>
  );
}
