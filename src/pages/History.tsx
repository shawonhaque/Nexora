import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState, Icon } from '../components/news/ArticleCard';
import { PageBody, PageHeader, StatCard, SubHeading } from '../components/ui/PageHeader';
import { PageMeta } from '../components/layout/PageMeta';
import { usePersonalization } from '../hooks/usePersonalization';
import { CATEGORY_META } from '../services/newsService';
import { relativeTime } from '../lib/format';
import type { NewsCategory } from '../lib/newsTypes';

/** Reading History, grouped by day. */
export default function History() {
  const { history, clearHistory, mode } = usePersonalization();

  const grouped = useMemo(() => {
    const groups = new Map<string, typeof history>();
    for (const entry of history) {
      const day = new Date(entry.viewedAt).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const list = groups.get(day) ?? [];
      list.push(entry);
      groups.set(day, list);
    }
    return [...groups.entries()];
  }, [history]);

  const topCategories = useMemo(() => {
    const counts = new Map<NewsCategory, number>();
    for (const entry of history) {
      counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [history]);

  return (
    <>
      <PageMeta title="Reading History" description="Articles you have opened, newest first." noIndex />
      <PageHeader
        eyebrow="My library"
        title="Reading History"
        description="Articles you have opened, recorded when you follow a link."
        icon="clock"
        actions={
          <>
            <span className="chip">{mode === 'cloud' ? 'Synced to your account' : 'Stored in this browser'}</span>
            {history.length > 0 && (
              <button type="button" onClick={clearHistory} className="btn-ghost !py-2 text-xs">
                <Icon name="trash" className="h-4 w-4" /> Clear history
              </button>
            )}
          </>
        }
      />

      <PageBody className="space-y-6">
        {mode === 'local' && history.length > 0 && (
          <p className="rounded-xl border border-amber-500/35 bg-amber-500/5 px-4 py-3 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
            You are not signed in, so this history is kept in this browser only.
          </p>
        )}

        {!history.length ? (
          <EmptyState
            title="No reading history yet"
            message="Articles you open from NEXORA appear here so you can find them again."
            action={
              <Link to="/explore" className="btn-primary mt-2">
                <Icon name="compass" className="h-4 w-4" /> Start reading
              </Link>
            }
          />
        ) : (
          <>
            <section aria-label="Reading summary">
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard label="Articles read" value={history.length} icon="clock" hint="Most recent 200 kept" />
                <StatCard
                  label="Topics covered"
                  value={new Set(history.map((entry) => entry.category)).size}
                  icon="compass"
                  tone="accent2"
                  hint="Distinct sections you have read from"
                />
                <StatCard
                  label="Most read"
                  value={topCategories[0] ? CATEGORY_META[topCategories[0][0]].label : '—'}
                  icon="trend"
                  hint={topCategories[0] ? `${topCategories[0][1]} articles` : 'No data yet'}
                />
              </div>
            </section>

            {grouped.map(([day, entries]) => (
              <section key={day} aria-label={day}>
                <SubHeading title={day} hint={`${entries.length} article${entries.length === 1 ? '' : 's'}`} />
                <ul className="space-y-2">
                  {entries.map((entry) => (
                    <li
                      key={entry.articleId}
                      className="glass flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <a
                          href={entry.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium leading-snug text-heading transition hover:text-accent"
                        >
                          {entry.title}
                        </a>
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                          <span className="text-accent">{CATEGORY_META[entry.category].label}</span>
                          <span aria-hidden="true">·</span>
                          <span>{entry.source}</span>
                          <span aria-hidden="true">·</span>
                          <time dateTime={entry.viewedAt}>
                            {new Date(entry.viewedAt).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </time>
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-xs text-muted">{relativeTime(entry.viewedAt)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </>
        )}
      </PageBody>
    </>
  );
}
