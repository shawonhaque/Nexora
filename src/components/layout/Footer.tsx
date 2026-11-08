import { Link } from 'react-router-dom';
import { NAV_ITEMS } from './nav';

const RESOURCE_LINKS = [
  { to: '/search', label: 'Search' },
  { to: '/bookmarks', label: 'Bookmarks' },
  { to: '/login', label: 'Admin login' },
];

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="no-print mt-20 border-t border-line bg-surface/60">
      <div className="wrap grid gap-10 py-14 md:grid-cols-[1.6fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-accent to-accent2 font-semibold text-white">
              N
            </span>
            <span className="text-[0.95rem] font-bold tracking-[0.18em] text-heading">NEXORA</span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
            Your World of Knowledge. A personal platform for news, books, study resources, writing
            and ideas — collected and organised in one place.
          </p>
        </div>

        <nav aria-label="Footer navigation">
          <h2 className="mb-4 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-muted">Explore</h2>
          <ul className="grid gap-2.5">
            {NAV_ITEMS.filter((item) => item.to !== '/').map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="text-sm text-muted transition hover:text-accent">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Footer resources">
          <h2 className="mb-4 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-muted">Account</h2>
          <ul className="grid gap-2.5">
            {RESOURCE_LINKS.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="text-sm text-muted transition hover:text-accent">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-line">
        <div className="wrap flex flex-col items-center justify-between gap-3 py-6 text-xs text-muted sm:flex-row">
          <p>© {year} NEXORA. All rights reserved.</p>
          <p className="font-mono">Your World of Knowledge</p>
        </div>
      </div>
    </footer>
  );
}
