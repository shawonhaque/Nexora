import { Link, NavLink } from 'react-router-dom';
import { Icon } from '../news/ArticleCard';
import { NAV_GROUPS } from './nav';
import { usePersonalization } from '../../hooks/usePersonalization';
import { useAuth } from '../../context/AuthContext';

/** Brand mark: a letterpress "N" in a hairline frame, drawn inline so it
 *  inherits the current ink colour and needs no asset request. */
export function BrandMark({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`brand-mark grid shrink-0 place-items-center border border-accent/60 bg-heading text-bg ${className}`}
    >
      <svg viewBox="0 0 64 64" className="h-[62%] w-[62%]" fill="none" aria-hidden="true">
        <path d="M20 45V20h3.6l14.2 18.1V20H45v25h-3.6L27.2 26.9V45H20Z" fill="currentColor" />
        <rect x="20" y="49" width="24" height="2.5" fill="rgb(var(--c-accent))" />
      </svg>
    </span>
  );
}

/** Brand lockup used in the sidebar and the mobile bar. */
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="group flex items-center gap-2.5" aria-label="NEXORA home">
      <BrandMark />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-serif text-[1.06rem] font-semibold tracking-[0.14em] text-heading">
            NEXORA
          </span>
          <span className="mt-1 font-mono text-[0.5rem] uppercase tracking-[0.24em] text-muted">
            World of knowledge
          </span>
        </span>
      )}
    </Link>
  );
}

/**
 * The primary navigation. Rendered in the fixed desktop rail and reused inside
 * the mobile drawer, so both stay in step with NAV_GROUPS.
 */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { saved, history, notifications } = usePersonalization();
  const { isAdmin } = useAuth();
  const unread = notifications.filter((item) => !item.read).length;

  function badgeFor(path: string): number | null {
    if (path === '/saved' && saved.length) return saved.length;
    if (path === '/history' && history.length) return history.length;
    return null;
  }

  return (
    <nav aria-label="Main" className="flex flex-col gap-6">
      {NAV_GROUPS.map((group) => (
        <div key={group.title}>
          <p className="kicker mb-2 px-3">{group.title}</p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const badge = badgeFor(item.to);
              return (
                <li key={item.to}>
                  <NavLink to={item.to} end={item.end} className="side-link" onClick={onNavigate}>
                    <Icon name={item.icon} className="h-[17px] w-[17px] shrink-0" />
                    <span className="truncate">{item.label}</span>
                    {badge !== null && (
                      <span className="ml-auto px-1.5 py-0.5 font-mono text-[0.62rem] text-accent">
                        {badge}
                      </span>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      {isAdmin && (
        <div>
          <p className="kicker mb-2 px-3">Administration</p>
          <NavLink to="/admin" className="side-link" onClick={onNavigate}>
            <Icon name="shield" className="h-[17px] w-[17px] shrink-0" />
            <span>Admin Dashboard</span>
          </NavLink>
        </div>
      )}

      <div className="px-3 pt-2">
        <Link
          to="/settings"
          className="flex items-center justify-between border border-railfg/20 px-3 py-2 text-xs text-railfg/60 transition-colors hover:border-accent/70 hover:text-accent"
          onClick={onNavigate}
        >
          <span>Notifications</span>
          <span className="inline-flex items-center gap-1.5">
            <Icon name="bell" className="h-3.5 w-3.5" />
            {unread > 0 ? (
              <span className="bg-accent px-1.5 font-mono text-[0.6rem] text-white">{unread}</span>
            ) : (
              <span>0</span>
            )}
          </span>
        </Link>
      </div>
    </nav>
  );
}
