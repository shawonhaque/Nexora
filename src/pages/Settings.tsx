import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/news/ArticleCard';
import { PageBody, PageHeader, SubHeading } from '../components/ui/PageHeader';
import { PageMeta } from '../components/layout/PageMeta';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { usePersonalization } from '../hooks/usePersonalization';
import { CATEGORY_META, NEWS_CATEGORIES } from '../services/newsService';
import { clearApiCache } from '../lib/apiCache';
import { relativeTime } from '../lib/format';

/** Settings: interests, notifications, appearance and stored data. */
export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { user, backendConfigured } = useAuth();
  const {
    interests,
    toggleInterest,
    notifications,
    markAllRead,
    clearNotifications,
    history,
    clearHistory,
    saved,
    mode,
  } = usePersonalization();
  const [cleared, setCleared] = useState(false);

  const unread = notifications.filter((item) => !item.read).length;

  function clearCaches() {
    clearApiCache();
    setCleared(true);
    window.setTimeout(() => setCleared(false), 2500);
  }

  return (
    <>
      <PageMeta title="Settings" description="Manage your interests, notifications and appearance." noIndex />
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Control what you follow, how NEXORA looks, and what is stored about your reading."
        icon="settings"
      />

      <PageBody className="space-y-8">
        {/* ------------------------------------------------------- interests */}
        <section aria-labelledby="interests-heading">
          <SubHeading
            id="interests-heading"
            title="Topics you follow"
            hint="Followed topics are prioritised on your dashboard feed and marked on the topic grid."
          />
          <div className="flex flex-wrap gap-2">
            {NEWS_CATEGORIES.map((category) => {
              const followed = interests.includes(category);
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => toggleInterest(category)}
                  aria-pressed={followed}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition ${
                    followed
                      ? 'border-accent bg-accent/12 text-accent'
                      : 'border-line text-muted hover:border-accent/50 hover:text-accent'
                  }`}
                >
                  <Icon name={followed ? 'check' : 'plus'} className="h-4 w-4" />
                  {CATEGORY_META[category].label}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            {mode === 'cloud'
              ? 'Saved to your account, so these follow you across devices.'
              : 'Stored in this browser. Sign in to sync them to your account.'}
          </p>
        </section>

        {/* --------------------------------------------------------- appearance */}
        <section aria-labelledby="appearance-heading">
          <SubHeading id="appearance-heading" title="Appearance" hint="Applies immediately and is remembered." />
          <div className="flex flex-wrap gap-2">
            {(['dark', 'light'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setTheme(option)}
                aria-pressed={theme === option}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium capitalize transition ${
                  theme === option
                    ? 'border-accent bg-accent/12 text-accent'
                    : 'border-line text-muted hover:border-accent/50 hover:text-accent'
                }`}
              >
                <Icon name={option === 'dark' ? 'moon' : 'sun'} className="h-4 w-4" />
                {option} mode
              </button>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------ notifications */}
        <section aria-labelledby="notifications-heading">
          <SubHeading
            id="notifications-heading"
            title="Notifications"
            hint={
              notifications.length
                ? `${notifications.length} total · ${unread} unread`
                : 'Alerts about new content appear here.'
            }
            action={
              notifications.length > 0 ? (
                <div className="flex gap-2">
                  <button type="button" onClick={markAllRead} className="btn-ghost !py-2 text-xs">
                    <Icon name="check" className="h-4 w-4" /> Mark all read
                  </button>
                  <button type="button" onClick={clearNotifications} className="btn-quiet !py-2 text-xs">
                    <Icon name="trash" className="h-4 w-4" /> Clear
                  </button>
                </div>
              ) : undefined
            }
          />
          {notifications.length ? (
            <ul className="space-y-2">
              {notifications.map((item) => (
                <li
                  key={item.id}
                  className={`glass flex items-start gap-3 p-4 ${item.read ? '' : 'border-accent/40'}`}
                >
                  <span
                    className={`mt-1 h-2 w-2 shrink-0 rounded-full ${item.read ? 'bg-line' : 'bg-accent'}`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-heading">{item.title}</p>
                    {item.body && <p className="mt-0.5 text-sm leading-relaxed text-muted">{item.body}</p>}
                    <p className="mt-1 flex items-center gap-2 text-xs text-muted">
                      <time dateTime={item.createdAt}>{relativeTime(item.createdAt)}</time>
                      {item.link && (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:underline"
                        >
                          Open source
                        </a>
                      )}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="glass px-4 py-6 text-sm text-muted">
              No notifications yet. New content alerts will appear here.
            </p>
          )}
        </section>

        {/* -------------------------------------------------------- stored data */}
        <section aria-labelledby="data-heading">
          <SubHeading
            id="data-heading"
            title="Stored data"
            hint="What NEXORA keeps about your reading, and how to remove it."
          />
          <div className="glass divide-y divide-line/70">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm font-medium text-heading">Saved articles</p>
                <p className="text-xs text-muted">{saved.length} stored</p>
              </div>
              <Link to="/saved" className="btn-ghost !py-2 text-xs">
                Manage <Icon name="arrow-right" className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm font-medium text-heading">Reading history</p>
                <p className="text-xs text-muted">{history.length} articles recorded</p>
              </div>
              <button
                type="button"
                onClick={clearHistory}
                disabled={!history.length}
                className="btn-quiet !py-2 text-xs"
              >
                <Icon name="trash" className="h-4 w-4" /> Clear
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm font-medium text-heading">Cached API responses</p>
                <p className="text-xs text-muted">
                  Live data is cached briefly to respect each provider's rate limits.
                </p>
              </div>
              <button type="button" onClick={clearCaches} className="btn-quiet !py-2 text-xs">
                <Icon name="refresh" className="h-4 w-4" /> {cleared ? 'Cleared' : 'Clear cache'}
              </button>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------- account */}
        <section aria-labelledby="account-heading">
          <SubHeading id="account-heading" title="Account" hint="Backend and session status." />
          <div className="glass space-y-3 p-4 text-sm">
            <p className="flex flex-wrap items-center gap-2">
              <span className="text-muted">Backend:</span>
              <span className={backendConfigured ? 'text-accent' : 'text-amber-500'}>
                {backendConfigured ? 'Supabase connected' : 'Not configured'}
              </span>
            </p>
            <p className="flex flex-wrap items-center gap-2">
              <span className="text-muted">Session:</span>
              <span>{user ? user.email : 'Signed out'}</span>
            </p>
            <p className="flex flex-wrap items-center gap-2">
              <span className="text-muted">Persistence:</span>
              <span>
                {mode === 'cloud'
                  ? 'Your account (protected by row level security)'
                  : 'This browser only (localStorage)'}
              </span>
            </p>
            <p className="border-t border-line pt-3 text-xs leading-relaxed text-muted">
              Live news comes from public publisher feeds and APIs. NEXORA stores no passwords and no third-party
              API keys in the browser; the only credential held is the Supabase anon key, which is public by
              design and protected by row level security.
            </p>
            {user ? (
              <Link to="/profile" className="btn-ghost !py-2 text-xs">
                <Icon name="user" className="h-4 w-4" /> View profile
              </Link>
            ) : (
              <Link to="/login" className="btn-primary !py-2 text-xs">
                <Icon name="user" className="h-4 w-4" /> Sign in to sync
              </Link>
            )}
          </div>
        </section>
      </PageBody>
    </>
  );
}
