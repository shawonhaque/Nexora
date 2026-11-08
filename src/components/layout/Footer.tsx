import { Link } from 'react-router-dom';
import { Brand } from './Sidebar';

const FOOTER_GROUPS = [
  {
    title: 'Discover',
    links: [
      { to: '/explore', label: 'Explore' },
      { to: '/search', label: 'Intelligent search' },
      { to: '/world', label: 'World news' },
      { to: '/technology', label: 'Technology' },
      { to: '/ai', label: 'Artificial intelligence' },
    ],
  },
  {
    title: 'Knowledge',
    links: [
      { to: '/knowledge', label: 'Knowledge' },
      { to: '/learning', label: 'Learning' },
      { to: '/books', label: 'Books' },
      { to: '/writing', label: 'Writing' },
      { to: '/study', label: 'Study' },
    ],
  },
  {
    title: 'Your account',
    links: [
      { to: '/saved', label: 'Saved articles' },
      { to: '/history', label: 'Reading history' },
      { to: '/settings', label: 'Settings' },
      { to: '/profile', label: 'Profile' },
      { to: '/about', label: 'About NEXORA' },
    ],
  },
];

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="no-print mt-16 border-t border-line bg-surface/50">
      <div className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div>
            <Brand />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              A live global information platform with intelligent search and a personal knowledge library.
            </p>
          </div>

          {FOOTER_GROUPS.map((group) => (
            <nav key={group.title} aria-label={`Footer: ${group.title}`}>
              <h2 className="mb-4 font-mono text-[0.68rem] uppercase tracking-[0.2em] text-muted">
                {group.title}
              </h2>
              <ul className="grid gap-2.5">
                {group.links.map((item) => (
                  <li key={item.to}>
                    <Link to={item.to} className="text-sm text-muted transition hover:text-accent">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      <div className="border-t border-line">
        <div className="flex flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-muted sm:flex-row sm:px-6 lg:px-8">
          <p>© {year} NEXORA. All rights reserved.</p>
          <p className="text-center sm:text-right">
            Live data from public publisher feeds and APIs. NEXORA does not host or rewrite publisher content.
          </p>
        </div>
      </div>
    </footer>
  );
}

