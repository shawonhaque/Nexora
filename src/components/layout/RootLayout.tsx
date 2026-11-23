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
 *
 * The rail is deliberately the darkest surface on the page in both themes, so
 * the reading column keeps the light. It uses the dedicated `rail` tokens
 * instead of the page tokens; `.rail` in styles.css re-scopes everything
 * inside it.
 */
export function RootLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-bg">
      <a
        href="#main"
        className="no-print sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:border focus:border-accent focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-heading"
      >
        Skip to content
      </a>
      <ScrollToTop />

      {/* Desktop navigation rail */}
      <aside className="rail no-print sticky top-0 hidden h-screen w-[248px] shrink-0 overflow-y-auto px-3 py-5 scrollbar-thin lg:block">
        <div className="rule mb-7 px-2 pb-5">
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
