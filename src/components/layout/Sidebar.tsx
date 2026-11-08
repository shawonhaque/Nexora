import { Link, NavLink } from 'react-router-dom';
import { Icon } from '../news/ArticleCard';
import { NAV_GROUPS } from './nav';
import { usePersonalization } from '../../hooks/usePersonalization';
import { useAuth } from '../../context/AuthContext';

/** Brand lockup used in the sidebar and the mobile bar. */
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="group flex items-center gap-2.5" aria-label="NEXORA home">
      <span
        aria-hidden="true"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-accent to-accent2 text-white shadow-card"
      >
        <Icon name="sparkle" className="h-[18px] w-[18px]" />
      </span>
      {!compact && (
        <span className="text-[0.95rem] font-bold tracking-[0.18em] text-heading">NEXORA</span>
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
          <p className="mb-2 px-3 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted/80">
            {group.title}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const badge = badgeFor(item.to);
              return (
                <li key={item.to}>
                  <NavLink to={item.to} end={item.end} className="side-link" onClick={onNavigate}>
                    <Icon name={item.icon} className="h-[17px] w-[17px] shrink-0" />
                    <span className="truncate">{item.label}</span>
                    {badge !== null && (
                      <span className="ml-auto rounded-full bg-accent/15 px-1.5 py-0.5 font-mono text-[0.62rem] text-accent">
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
          <p className="mb-2 px-3 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted/80">
            Administration
          </p>
          <NavLink to="/admin" className="side-link" onClick={onNavigate}>
            <Icon name="shield" className="h-[17px] w-[17px] shrink-0" />
            <span>Admin Dashboard</span>
          </NavLink>
        </div>
      )}

      <div className="px-3 pt-2">
        <Link
          to="/settings"
          className="flex items-center justify-between rounded-xl border border-line bg-elevated/50 px-3 py-2 text-xs text-muted transition hover:border-accent/40 hover:text-accent"
          onClick={onNavigate}
        >
          <span>Notifications</span>
          <span className="inline-flex items-center gap-1.5">
            <Icon name="bell" className="h-3.5 w-3.5" />
            {unread > 0 ? (
              <span className="rounded-full bg-accent px-1.5 font-mono text-[0.6rem] text-white">{unread}</span>
            ) : (
              <span>0</span>
            )}
          </span>
        </Link>
      </div>
    </nav>
  );
}
