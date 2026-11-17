import { Suspense, useEffect, useRef } from 'react';
import { Outlet, ScrollRestoration, useLocation } from 'react-router';
import { LoadingBlock } from '@/components/feedback/states';
import { Footer } from '@/components/navigation/Footer';
import { Header } from '@/components/navigation/Header';
import { useI18n } from '@/i18n';

function PageFallback() {
  return (
    <div className="container-page py-16">
      <LoadingBlock lines={6} className="max-w-2xl" />
    </div>
  );
}

export function RootLayout() {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const first = useRef(true);

  // After client-side navigation, move focus to the main region so keyboard and
  // screen-reader users start at the new page rather than at the old link.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    mainRef.current?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-navy focus:shadow-menu"
      >
        {t('nav.skip')}
      </a>
      <Header />
      <main id="main" ref={mainRef} tabIndex={-1} className="flex-1 outline-none">
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <ScrollRestoration />
    </div>
  );
}
