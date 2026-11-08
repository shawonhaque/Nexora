import { Link } from 'react-router-dom';
import { Icon } from '../components/news/ArticleCard';
import { PageBody, PageHeader, StatCard, SubHeading } from '../components/ui/PageHeader';
import { PageMeta } from '../components/layout/PageMeta';
import { useAuth } from '../context/AuthContext';
import { usePersonalization } from '../hooks/usePersonalization';
import { CATEGORY_META } from '../services/newsService';
import { formatDateTime, initials } from '../lib/format';

/**
 * Profile. Everything shown is either from the authenticated account or from
 * the reader's own activity. No figures are invented.
 */
export default function Profile() {
  const { user, role, isAdmin } = useAuth();
  const { interests, saved, history, mode } = usePersonalization();

  const displayName = user?.email?.split('@')[0] ?? 'Guest';
  const joined = user?.created_at ? formatDateTime(user.created_at) : null;

  return (
    <>
      <PageMeta title="Profile" description="Your account and reading activity." noIndex />
      <PageHeader
        eyebrow="Account"
        title="Profile"
        description="Your account details and reading activity."
        icon="user"
      />

      <PageBody className="space-y-8">
        <section aria-label="Account" className="glass p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-accent to-accent2 text-xl font-bold text-white shadow-card">
              {user ? initials(displayName) : '?'}
            </span>
            <div className="min-w-0">
              {user ? (
                <>
                  <h2 className="text-xl font-semibold capitalize text-heading">{displayName}</h2>
                  <p className="mt-1 break-all text-sm text-muted">{user.email}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={`chip ${isAdmin ? '!border-accent/50 !text-accent' : ''}`}>
                      {isAdmin ? 'Administrator' : 'Member'}
                    </span>
                    <span className="chip">{mode === 'cloud' ? 'Cloud sync on' : 'Local only'}</span>
                  </div>
                  {joined && <p className="mt-2 text-xs text-muted">Account created {joined}</p>}
                </>
              ) : (
                <>
                  <h2 className="text-xl font-semibold text-heading">Not signed in</h2>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    You can use NEXORA without an account. Signing in keeps your saved articles, interests and
                    reading history across devices.
                  </p>
                  <Link to="/login" className="btn-primary mt-4">
                    <Icon name="user" className="h-4 w-4" /> Sign in
                  </Link>
                </>
              )}
            </div>
          </div>
          {role && (
            <p className="mt-4 border-t border-line pt-4 font-mono text-xs text-muted">
              Role <span className="text-accent">{role}</span> — enforced by database row level security, not by
              the interface.
            </p>
          )}
        </section>

        <section aria-label="Activity">
          <SubHeading title="Your activity" hint="Counts come from your own saved items and history." />
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Saved articles" value={saved.length} icon="bookmark" />
            <StatCard label="Articles read" value={history.length} icon="clock" tone="accent2" />
            <StatCard label="Topics followed" value={interests.length} icon="compass" />
          </div>
        </section>

        <section aria-label="Interests">
          <SubHeading
            title="Topics you follow"
            hint="These shape the feed on your dashboard."
            action={
              <Link to="/settings" className="btn-ghost !py-2 text-xs">
                <Icon name="settings" className="h-4 w-4" /> Manage
              </Link>
            }
          />
          {interests.length ? (
            <div className="flex flex-wrap gap-2">
              {interests.map((category) => (
                <Link key={category} to={CATEGORY_META[category].path} className="chip-accent">
                  {CATEGORY_META[category].label}
                </Link>
              ))}
            </div>
          ) : (
            <p className="glass px-4 py-6 text-sm text-muted">
              No topics followed yet. Choose some in Settings to personalise your dashboard.
            </p>
          )}
        </section>

        {saved.length > 0 && (
          <section aria-label="Recently saved">
            <SubHeading
              title="Recently saved"
              action={
                <Link to="/saved" className="btn-ghost !py-2 text-xs">
                  View all <Icon name="arrow-right" className="h-3.5 w-3.5" />
                </Link>
              }
            />
            <ul className="space-y-2">
              {saved.slice(0, 4).map((item) => (
                <li key={item.id} className="glass p-4">
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-heading transition hover:text-accent"
                  >
                    {item.title}
                  </a>
                  <p className="mt-1 font-mono text-xs text-muted">{item.source}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </PageBody>
    </>
  );
}
