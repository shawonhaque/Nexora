import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { MobileDrawer, TopBar } from './TopBar';
import { Brand, SidebarNav } from './Sidebar';
import { Footer } from './Footer';

/** Resets scroll position on navigation, matching a normal page load. */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);
  return null;
}

/**
 * Application shell: a fixed navigation rail on large screens, a slide-over
 * drawer below that, and a persistent top bar. The main column holds the
 * routed page.
 */
export function RootLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-bg">
      <a
        href="#main"
        className="no-print sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>
      <ScrollToTop />

      {/* Desktop navigation rail */}
      <aside className="no-print sticky top-0 hidden h-screen w-[264px] shrink-0 overflow-y-auto border-r border-line bg-surface/40 px-4 py-5 scrollbar-thin lg:block">
        <div className="mb-7 px-1">
          <Brand />
        </div>
        <SidebarNav />
      </aside>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onOpenMenu={() => setDrawerOpen(true)} />
        <main id="main" className="flex-1">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}
