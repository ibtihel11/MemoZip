import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { MobileNav, Navbar } from '@/components/Navbar';

export function AppLayout() {
  const { pathname } = useLocation();
  // Chat keeps its state while moving between /chat and /chat/:id.
  const pageKey = pathname.startsWith('/chat') ? '/chat' : pathname;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-surface px-4 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main" className="min-w-0 flex-1">
        <div key={pageKey} className="mx-auto max-w-5xl animate-page-in px-4 pb-28 pt-8 sm:px-8 sm:pt-12 lg:pb-20">
          <Outlet />
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
