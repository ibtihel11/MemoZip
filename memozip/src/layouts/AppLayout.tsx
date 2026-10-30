import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { MobileNav, Navbar } from '@/components/Navbar';
import { cn } from '@/utils/cn';

export function AppLayout() {
  const { pathname } = useLocation();
  // Chat keeps its state while moving between /chat and /chat/:id.
  const isChat = pathname.startsWith('/chat');
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
        <div
          key={pageKey}
          className={cn(
            'w-full animate-page-in px-5 sm:px-8 lg:px-12 xl:px-16 2xl:px-24',
            isChat ? 'pb-20 pt-4 lg:pb-6 lg:pt-6' : 'pb-28 pt-9 sm:pt-14 lg:pb-24',
          )}
        >
          <Outlet />
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
