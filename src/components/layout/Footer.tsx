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
    <footer className="no-print mt-20 border-t border-line">
      <div className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.6fr_repeat(3,1fr)]">
          <div>
            <Brand />
            <p className="mt-4 max-w-xs font-serif text-[0.98rem] leading-relaxed text-fg">
              A reading room for the world. Live reporting, intelligent search, and a shelf of
              things worth keeping.
            </p>
            <p className="mt-4 max-w-xs text-xs leading-relaxed text-muted">
              Set in Fraunces and Instrument Sans. Printed on nothing.
            </p>
          </div>

          {FOOTER_GROUPS.map((group) => (
            <nav key={group.title} aria-label={`Footer: ${group.title}`}>
              <h2 className="kicker mb-4">{group.title}</h2>
              <ul className="grid gap-2">
                {group.links.map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className="text-sm text-muted transition-colors hover:text-accent"
                    >
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
        <div className="flex flex-col items-start justify-between gap-3 px-4 py-6 text-xs text-muted sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <p className="font-mono uppercase tracking-[0.12em]">© {year} NEXORA</p>
          <p className="max-w-md leading-relaxed">
            Headlines and summaries belong to their publishers. NEXORA links out; it does not
            host or rewrite anyone else's reporting.
          </p>
        </div>
      </div>
    </footer>
  );
}
