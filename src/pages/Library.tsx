import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState, Icon } from '../components/news/ArticleCard';
import { PageBody, PageHeader, StatCard, SubHeading } from '../components/ui/PageHeader';
import { PageMeta } from '../components/layout/PageMeta';
import { usePersonalization } from '../hooks/usePersonalization';
import { CATEGORY_META } from '../services/newsService';
import { relativeTime } from '../lib/format';
import { computeReadingStats } from '../lib/readingStats';

const SECTIONS: { id: string; label: string; icon: 'chart' | 'bookmark' | 'clock' }[] = [
  { id: 'overview', label: 'Overview', icon: 'chart' },
  { id: 'saved', label: 'Saved', icon: 'bookmark' },
  { id: 'history', label: 'History', icon: 'clock' },
];

/** Bar chart of the last two weeks of reading, drawn with plain elements. */
function ActivityChart({ byDay }: { byDay: { date: string; label: string; count: number }[] }) {
  const max = Math.max(1, ...byDay.map((day) => day.count));
  return (
    <div className="flex items-end gap-1.5" role="img" aria-label="Articles read per day over the last 14 days">
      {byDay.map((day) => (
        <div key={day.date} className="flex flex-1 flex-col items-center gap-1.5">
          <span className="font-mono text-[0.62rem] text-muted" aria-hidden="true">
            {day.count || ''}
          </span>
          <div
            className={`w-full rounded-t ${day.count ? 'bg-accent/70' : 'bg-elevated'}`}
            style={{ height: `${Math.max(3, (day.count / max) * 68)}px` }}
            title={`${day.date}: ${day.count} article${day.count === 1 ? '' : 's'}`}
          />
          <span className="font-mono text-[0.62rem] text-muted" aria-hidden="true">
            {day.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Unified personal library.
 *
 * Saved articles and reading history were separate pages; they are combined here
 * with the statistics computed from the same rows, so one page answers "what
 * have I kept and what have I read". Both stores are the reader's own data and
 * the mode chip says whether it is synced to an account or local to the browser.
 */
export default function Library() {
  const { saved, history, interests, mode, unsaveArticle, clearHistory } = usePersonalization();
  const stats = useMemo(() => computeReadingStats(history), [history]);

  const topCategory = stats.topCategories[0];

  return (
    <>
      <PageMeta
        title="Library"
        description="Your saved articles, reading history and reading statistics."
        noIndex
      />
      <PageHeader
        eyebrow="My library"
        title="Library"
        description="Everything you have saved and read, with statistics computed from your own activity."
        icon="bookmark"
        actions={
          <>
            <span className="chip">{mode === 'cloud' ? 'Synced to your account' : 'Stored in this browser'}</span>
            <Link to="/settings" className="btn-ghost !py-2 text-xs">
              <Icon name="settings" className="h-4 w-4" /> Interests
            </Link>
          </>
        }
      />

      <PageBody className="space-y-8">
        {mode === 'local' && (
          <p className="rounded-xl border border-amber-500/35 bg-amber-500/5 px-4 py-3 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
            You are not signed in, so this library is kept in this browser only. Sign in to keep it across devices.
          </p>
        )}

        <nav aria-label="Library views" className="flex flex-wrap gap-1.5">
          {SECTIONS.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-elevated/40 px-3.5 py-2 text-sm font-medium text-muted transition hover:border-accent/50 hover:text-accent"
            >
              <Icon name={item.icon} className="h-4 w-4" />
              {item.label}
            </a>
          ))}
          
        </nav>

        {/* Statistics computed from the reader's own rows. */}
        <section id="overview" aria-label="Reading statistics" className="scroll-mt-24 space-y-4">
          <SubHeading title="Reading statistics" hint="Computed from your recorded reading history." />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Articles read" value={stats.total} hint="All recorded opens" icon="clock" />
            <StatCard
              label="Read this week"
              value={stats.thisWeek}
              hint="In the last 7 days"
              icon="trend"
              tone="accent2"
            />
            <StatCard
              label="Current streak"
              value={stats.streakDays}
              hint={stats.streakDays === 1 ? 'day in a row' : 'days in a row'}
              icon="sparkle"
            />
            <StatCard
              label="Top topic"
              value={topCategory ? CATEGORY_META[topCategory.category].label : '—'}
              hint={topCategory ? `${topCategory.count} articles` : 'No reading yet'}
              icon="compass"
              tone="accent2"
            />
          </div>

          <div className="glass p-5">
            <h3 className="text-sm font-semibold text-heading">Last 14 days</h3>
            <p className="mt-1 text-xs text-muted">
              Articles opened per day. Days with no activity are shown at zero rather than omitted.
            </p>
            <div className="mt-5">
              <ActivityChart byDay={stats.byDay} />
            </div>
            <p className="mt-4 font-mono text-[0.68rem] uppercase tracking-wider text-muted">
              {stats.activeDays} active {stats.activeDays === 1 ? 'day' : 'days'} · {stats.today} read today
            </p>
          </div>

          {stats.topSources.length > 0 && (
            <div className="glass p-5">
              <h3 className="text-sm font-semibold text-heading">Sources you read most</h3>
              <ul className="mt-3 space-y-2">
                {stats.topSources.map((entry) => (
                  <li key={entry.source} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-fg">{entry.source}</span>
                    <span className="shrink-0 font-mono text-xs text-muted">
                      {entry.count} {entry.count === 1 ? 'article' : 'articles'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Saved articles */}
        <section id="saved" aria-label="Saved articles" className="scroll-mt-24">
          <SubHeading
            title="Saved articles"
            hint={saved.length ? `${saved.length} kept for later.` : 'Nothing saved yet.'}
            action={
              saved.length > 0 ? (
                <Link to="/explore" className="btn-ghost !py-2 text-xs">
                  <Icon name="plus" className="h-4 w-4" /> Add more
                </Link>
              ) : undefined
            }
          />
          {!saved.length ? (
            <EmptyState
              title="No saved articles yet"
              message="Use the bookmark button on any article card to keep it here."
              action={
                <Link to="/explore" className="btn-primary mt-2">
                  <Icon name="compass" className="h-4 w-4" /> Browse articles
                </Link>
              }
            />
          ) : (
            <ul className="space-y-3">
              {saved.map((item) => (
                <li key={item.id} className="glass glass-hover flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <Link to={CATEGORY_META[item.category].path} className="chip-accent">
                        {CATEGORY_META[item.category].label}
                      </Link>
                      <span className="font-mono text-xs text-muted">{item.source}</span>
                      <span aria-hidden="true" className="text-muted">·</span>
                      <time className="text-xs text-muted" dateTime={item.savedAt}>
                        saved {relativeTime(item.savedAt)}
                      </time>
                    </div>
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold leading-snug text-heading transition hover:text-accent"
                    >
                      {item.title}
                    </a>
                    {item.summary && <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.summary}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => unsaveArticle(item.articleId)}
                    className="btn-quiet shrink-0 !py-2 text-xs"
                    aria-label={`Remove ${item.title} from saved articles`}
                  >
                    <Icon name="trash" className="h-4 w-4" /> Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Reading history */}
        <section id="history" aria-label="Reading history" className="scroll-mt-24">
          <SubHeading
            title="Reading history"
            hint={history.length ? `${history.length} articles, newest first.` : 'Nothing read yet.'}
            action={
              history.length > 0 ? (
                <button type="button" onClick={clearHistory} className="btn-ghost !py-2 text-xs">
                  <Icon name="trash" className="h-4 w-4" /> Clear history
                </button>
              ) : undefined
            }
          />
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
            <ul className="space-y-2">
              {history.slice(0, 40).map((entry) => (
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
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-xs text-muted">{relativeTime(entry.viewedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {interests.length > 0 && (
          <p className="text-xs leading-relaxed text-muted">
            Your feed prioritises {interests.map((item) => CATEGORY_META[item].label).join(', ')}. Change this in{' '}
            <Link to="/settings" className="text-accent hover:underline">
              Settings
            </Link>
            .
          </p>
        )}
      </PageBody>
    </>
  );
}
