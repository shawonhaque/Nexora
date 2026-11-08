import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { NAV_ITEMS } from './nav';



function Brand() {
  return (
    <Link to="/" className="group flex items-center gap-2.5" aria-label="NEXORA home">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-accent to-accent2 font-semibold text-white shadow-card">
        N
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-[0.95rem] font-bold tracking-[0.18em] text-heading">NEXORA</span>
        <span className="mt-0.5 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted">
          Your World of Knowledge
        </span>
      </span>
    </Link>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="btn-quiet h-10 w-10 !px-0"
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
    >
      {theme === 'dark' ? (
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 14.4A8.5 8.5 0 1 1 9.6 4a6.8 6.8 0 0 0 10.4 10.4Z" />
        </svg>
      )}
    </button>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();
  const { user, isAdmin, signOut, backendConfigured } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the mobile menu whenever the route changes.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close on Escape, and return focus to the toggle for keyboard users.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header
      className={`no-print sticky top-0 z-50 border-b transition-colors ${
        scrolled ? 'border-line bg-bg/90 backdrop-blur-lg' : 'border-transparent bg-bg/70 backdrop-blur'
      }`}
    >
      <div className="wrap flex h-16 items-center gap-4">
        <Brand />

        <nav aria-label="Main" className="ml-4 hidden items-center gap-0.5 xl:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-lg px-2.5 py-2 text-sm font-medium transition ${
                  isActive ? 'text-accent' : 'text-muted hover:bg-elevated hover:text-heading'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <Link to="/search" className="btn-quiet h-10 w-10 !px-0" aria-label="Search NEXORA">
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </Link>

          <ThemeToggle />

          {user ? (
            <div className="hidden items-center gap-1.5 sm:flex">
              {isAdmin && (
                <Link to="/admin" className="btn-ghost !py-2">
                  Dashboard
                </Link>
              )}
              <button type="button" onClick={() => void signOut()} className="btn-quiet !py-2">
                Sign out
              </button>
            </div>
          ) : (
            <Link to="/login" className="btn-ghost hidden !py-2 sm:inline-flex">
              {backendConfigured ? 'Login' : 'Admin login'}
            </Link>
          )}

          <button
            type="button"
            className="btn-quiet h-10 w-10 !px-0 xl:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <path d="M3.5 7h17M3.5 12h17M3.5 17h17" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        id="mobile-nav"
        ref={menuRef}
        hidden={!open}
        className="border-t border-line bg-surface xl:hidden"
      >
        <nav aria-label="Mobile" className="wrap grid gap-1 py-4">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive ? 'bg-elevated text-accent' : 'text-muted hover:bg-elevated hover:text-heading'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
          <div className="mt-2 grid gap-1 border-t border-line pt-3">
            <NavLink to="/search" className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted hover:bg-elevated hover:text-heading">
              Search
            </NavLink>
            {user ? (
              <>
                {isAdmin && (
                  <NavLink to="/admin" className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted hover:bg-elevated hover:text-heading">
                    Dashboard
                  </NavLink>
                )}
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-muted hover:bg-elevated hover:text-heading"
                >
                  Sign out
                </button>
              </>
            ) : (
              <NavLink to="/login" className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted hover:bg-elevated hover:text-heading">
                Login
              </NavLink>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
