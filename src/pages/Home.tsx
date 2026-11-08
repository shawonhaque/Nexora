import { useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArticleCard, ArticleSkeleton, EmptyState, ErrorState, Icon } from '../components/news/ArticleCard';
import { FreshnessBar, PageBody, PageHeader, StatCard, SubHeading } from '../components/ui/PageHeader';
import { PageMeta } from '../components/layout/PageMeta';
import { useLiveData } from '../hooks/useLiveData';
import { usePersonalization } from '../hooks/usePersonalization';
import { useAuth } from '../context/AuthContext';
import {
  CATEGORY_META,
  NEWS_CATEGORIES,
  getCategoryCounts,
  getTrending,
  getOnThisDay,
  loadSnapshot,
  type OnThisDayEvent,
} from '../services/newsService';
import { relativeTime } from '../lib/format';
import type { NewsArticle, NewsCategory, TrendItem } from '../lib/newsTypes';

interface DashboardData {
  latest: NewsArticle[];
  counts: Record<NewsCategory, number>;
  trending: TrendItem[];
  onThisDay: OnThisDayEvent[];
  generatedAt: string;
  sourceCount: number;
}

const CATEGORY_ICON = {
  world: 'globe',
  technology: 'chip',
  ai: 'brain',
  science: 'flask',
  education: 'book',
  business: 'trend',
} as const;

export default function Home() {
  const { interests, saved, history } = usePersonalization();
  const { user } = useAuth();

  const loader = useCallback(async (): Promise<DashboardData> => {
    const snapshot = await loadSnapshot();
    // Trending and On-this-day are independent live sources; a failure in one
    // must not blank the dashboard, so they are settled separately.
    const [counts, trending, onThisDay] = await Promise.all([
      getCategoryCounts(),
      getTrending(6).catch(() => [] as TrendItem[]),
      getOnThisDay().catch(() => [] as OnThisDayEvent[]),
    ]);
    return {
      latest: snapshot.items.slice(0, 9),
      counts,
      trending,
      onThisDay: onThisDay.slice(0, 4),
      generatedAt: snapshot.generatedAt,
      sourceCount: snapshot.sourceCount,
    };
  }, []);

  const { data, loading, refreshing, error, fetchedAt, refresh } = useLiveData(loader);

  /**
   * The personalised feed. When the reader has chosen interests, articles from
   * those categories are promoted; otherwise the newest items are shown.
   * Either way the items are real published articles.
   */
  const feed = useMemo(() => {
    if (!data) return [];
    if (!interests.length) return data.latest;
    const preferred = data.latest.filter((article) => interests.includes(article.category));
    const rest = data.latest.filter((article) => !interests.includes(article.category));
    return [...preferred, ...rest];
  }, [data, interests]);

  const totalArticles = data ? Object.values(data.counts).reduce((sum, value) => sum + value, 0) : 0;

  return (
    <>
      <PageMeta
        title="NEXORA"
        description="A live dashboard of world news, technology, AI, science, education and business, with intelligent search and a personal knowledge library."
      />

      <PageHeader
        eyebrow="Explore. Discover. Stay Ahead."
        title="Home Dashboard"
        description={
          user
            ? `Welcome back. Your feed reflects the ${interests.length || 'full'} topic${interests.length === 1 ? '' : 's'} you follow.`
            : 'Live global information, intelligent search and a personal library — all in one place.'
        }
        icon="chart"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/explore" className="btn-primary">
              <Icon name="compass" className="h-4 w-4" /> Explore
            </Link>
            <Link to="/search" className="btn-ghost">
              <Icon name="search" className="h-4 w-4" /> Intelligent search
            </Link>
          </div>
        }
      />

      <PageBody className="space-y-10">
        <FreshnessBar
          fetchedAt={fetchedAt}
          refreshing={refreshing}
          onRefresh={refresh}
          note={data ? `${data.sourceCount} publishers · snapshot ${relativeTime(data.generatedAt)}` : undefined}
        />

        {loading && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="skeleton h-28" />
              ))}
            </div>
            <ArticleSkeleton count={6} />
          </div>
        )}

        {!loading && error && <ErrorState message={error} onRetry={refresh} />}

        {!loading && !error && data && (
          <>
            {/* Metrics. Every figure is a real count from the fetched data. */}
            <section aria-label="Overview">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Live articles"
                  value={totalArticles}
                  hint={`Across ${data.sourceCount} publisher feeds`}
                  icon="globe"
                />
                <StatCard
                  label="Topics tracked"
                  value={NEWS_CATEGORIES.length}
                  hint="World, tech, AI, science, education, business"
                  icon="compass"
                  tone="accent2"
                />
                <StatCard
                  label="Saved articles"
                  value={saved.length}
                  hint={saved.length ? 'In your library' : 'Save articles as you read'}
                  icon="bookmark"
                />
                <StatCard
                  label="Reading history"
                  value={history.length}
                  hint={history.length ? 'Articles you opened' : 'Opens are recorded here'}
                  icon="clock"
                  tone="accent2"
                />
              </div>
            </section>

            {/* Personalised feed */}
            <section aria-labelledby="feed-heading">
              <SubHeading
                id="feed-heading"
                title="Your feed"
                hint={
                  interests.length
                    ? `Prioritising ${interests.map((item) => CATEGORY_META[item].label).join(', ')}`
                    : 'The newest articles from every feed. Choose interests in Settings to personalise this.'
                }
                action={
                  <Link to="/settings" className="btn-ghost !py-2 text-xs">
                    <Icon name="settings" className="h-4 w-4" /> Edit interests
                  </Link>
                }
              />
              {feed.length ? (
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {feed.slice(0, 6).map((article) => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </div>
              ) : (
                <EmptyState title="No articles yet" message="The feed snapshot is empty. Try refreshing." />
              )}
            </section>

            {/* Trending, live from Hacker News */}
            <section aria-labelledby="trending-heading">
              <SubHeading
                id="trending-heading"
                title="Trending in technology"
                hint="Live discussions from Hacker News, ranked by activity right now."
                action={
                  <a
                    href="https://news.ycombinator.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ghost !py-2 text-xs"
                  >
                    Source <Icon name="external" className="h-3.5 w-3.5" />
                  </a>
                }
              />
              {data.trending.length ? (
                <ol className="glass divide-y divide-line/70">
                  {data.trending.map((item, index) => (
                    <li key={item.id} className="flex items-start gap-4 p-4">
                      <span className="font-mono text-sm font-bold text-accent">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium leading-snug text-heading transition hover:text-accent"
                        >
                          {item.title}
                        </a>
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                          <span>{item.points} points</span>
                          <span aria-hidden="true">·</span>
                          <a
                            href={item.discussionUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-accent hover:underline"
                          >
                            {item.comments} comments
                          </a>
                          <span aria-hidden="true">·</span>
                          <span>{relativeTime(item.createdAt)}</span>
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="glass px-4 py-6 text-sm text-muted">
                  Trending data is unavailable right now. The source may be rate limiting; try refresh.
                </p>
              )}
            </section>

            {/* Topic grid */}
            <section aria-labelledby="topics-heading">
              <SubHeading
                id="topics-heading"
                title="Browse by topic"
                hint="Each topic opens its own live feed."
              />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {NEWS_CATEGORIES.map((category) => {
                  const meta = CATEGORY_META[category];
                  const followed = interests.includes(category);
                  return (
                    <Link
                      key={category}
                      to={meta.path}
                      className={`glass glass-hover flex items-center gap-4 bg-gradient-to-br p-5 ${meta.accent}`}
                    >
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-bg/70 text-accent">
                        <Icon name={CATEGORY_ICON[category]} className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 font-semibold text-heading">
                          {meta.label}
                          {followed && <Icon name="check" className="h-3.5 w-3.5 text-accent" />}
                        </span>
                        <span className="mt-0.5 block font-mono text-xs text-muted">
                          {data.counts[category]} articles
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>

            {/* On this day, live from Wikipedia */}
            {data.onThisDay.length > 0 && (
              <section aria-labelledby="otd-heading">
                <SubHeading
                  id="otd-heading"
                  title="On this day"
                  hint="Historical events for today's date, from Wikipedia."
                />
                <ul className="glass divide-y divide-line/70">
                  {data.onThisDay.map((event) => (
                    <li key={`${event.year}-${event.text.slice(0, 20)}`} className="flex gap-4 p-4">
                      <span className="font-mono text-sm font-bold text-accent2">{event.year}</span>
                      <div className="min-w-0">
                        <p className="text-sm leading-relaxed text-fg">{event.text}</p>
                        {event.pages.length > 0 && (
                          <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                            {event.pages.map((page) => (
                              <a
                                key={page.url}
                                href={page.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-accent hover:underline"
                              >
                                {page.title}
                              </a>
                            ))}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </PageBody>
    </>
  );
}
