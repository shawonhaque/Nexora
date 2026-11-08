import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../news/ArticleCard';
import { Brand, SidebarNav } from './Sidebar';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { usePersonalization } from '../../hooks/usePersonalization';
import { clearApiCache } from '../../lib/apiCache';

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="btn-quiet h-9 w-9 !px-0"
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
    >
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} className="h-[17px] w-[17px]" />
    </button>
  );
}

/**
 * Top bar: search, refresh, theme, notifications and the account menu.
 * The full navigation lives in the sidebar; this bar stays identical on every
 * route so the layout does not shift.
 */
export function TopBar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const [query, setQuery] = useState('');
  const [refreshFlash, setRefreshFlash] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, isAdmin, signOut } = useAuth();
  const { notifications, markAllRead } = usePersonalization();
  const unread = notifications.filter((item) => !item.read).length;

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    const term = query.trim();
    navigate(term ? `/search?q=${encodeURIComponent(term)}` : '/search');
  }

  function refreshAll() {
    clearApiCache();
    setRefreshFlash(true);
    window.setTimeout(() => {
      // Reload so every page re-fetches against the cleared cache.
      window.location.reload();
    }, 300);
  }

  return (
    <header className="no-print sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={onOpenMenu}
          className="btn-quiet h-9 w-9 !px-0 lg:hidden"
          aria-label="Open navigation menu"
        >
          <Icon name="menu" className="h-5 w-5" />
        </button>

        <div className="lg:hidden">
          <Brand compact />
        </div>

        <form onSubmit={submitSearch} role="search" className="ml-auto hidden max-w-md flex-1 sm:block lg:ml-0">
          <label htmlFor="global-search" className="sr-only">
            Search news and topics
          </label>
          <div className="relative">
            <Icon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            />
            <input
              id="global-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search news, topics and ideas…"
              className="field !pl-9"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1.5">
          <Link to="/search" className="btn-quiet h-9 w-9 !px-0 sm:hidden" aria-label="Search">
            <Icon name="search" className="h-[17px] w-[17px]" />
          </Link>

          <button
            type="button"
            onClick={refreshAll}
            className="btn-quiet h-9 w-9 !px-0"
            aria-label="Refresh all live data"
            title="Refresh all live data"
          >
            <Icon name="refresh" className={`h-[17px] w-[17px] ${refreshFlash ? 'animate-spin' : ''}`} />
          </button>

          <ThemeToggle />

          <Link
            to="/settings"
            className="btn-quiet relative h-9 w-9 !px-0"
            aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
          >
            <Icon name="bell" className="h-[17px] w-[17px]" />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 font-mono text-[0.58rem] text-white">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </Link>

          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen((value) => !value);
                  if (!menuOpen && unread) markAllRead();
                }}
                className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-accent to-accent2 text-xs font-bold text-white"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                aria-label="Account menu"
              >
                {(user.email ?? 'U').slice(0, 1).toUpperCase()}
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  className="glass absolute right-0 mt-2 w-56 p-2 text-sm"
                >
                  <p className="truncate px-3 py-2 text-xs text-muted">{user.email}</p>
                  <Link to="/profile" role="menuitem" className="side-link !py-2">
                    <Icon name="user" className="h-4 w-4" /> Profile
                  </Link>
                  <Link to="/saved" role="menuitem" className="side-link !py-2">
                    <Icon name="bookmark" className="h-4 w-4" /> Saved articles
                  </Link>
                  {isAdmin && (
                    <Link to="/admin" role="menuitem" className="side-link !py-2">
                      <Icon name="shield" className="h-4 w-4" /> Admin dashboard
                    </Link>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => void signOut()}
                    className="side-link w-full !py-2 text-left"
                  >
                    <Icon name="close" className="h-4 w-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="btn-primary !px-3.5 !py-2 text-xs sm:text-sm">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

/** Slide-over drawer holding the same navigation as the desktop rail. */
export function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    if (open) document.addEventListener('keydown', onKey);
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="no-print fixed inset-0 z-50 lg:hidden">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className="absolute left-0 top-0 h-full w-[290px] overflow-y-auto border-r border-line bg-surface p-4 scrollbar-thin"
      >
        <div className="mb-6 flex items-center justify-between">
          <Brand />
          <button type="button" onClick={onClose} className="btn-quiet h-9 w-9 !px-0" aria-label="Close navigation">
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>
        <SidebarNav onNavigate={onClose} />
      </div>
    </div>
  );
}
