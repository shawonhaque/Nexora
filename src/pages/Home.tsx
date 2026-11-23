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
import { recommendArticles } from '../lib/readingStats';
import type { NewsArticle, NewsCategory, TrendItem } from '../lib/newsTypes';

interface DashboardData {
  latest: NewsArticle[];
  /** Every article in the snapshot, used as the candidate set for recommendations. */
  corpus: NewsArticle[];
  counts: Record<NewsCategory, number>;
  trending: TrendItem[];
  onThisDay: OnThisDayEvent[];
  generatedAt: string;
  sourceCount: number;
}

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
      corpus: snapshot.items,
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

  /**
   * Recommendations drawn from the reader's own saved articles, history and
   * interests. With no signal at all the engine would just repeat the newest
   * articles, which are already in the feed above, so the section is hidden.
   */
  const recommended = useMemo(() => {
    if (!data) return [];
    if (!interests.length && !saved.length && !history.length) return [];
    const shown = new Set(feed.map((article) => article.id));
    return recommendArticles({
      corpus: data.corpus.filter((article) => !shown.has(article.id)),
      history,
      saved,
      interests,
      limit: 6,
    });
  }, [data, feed, history, saved, interests]);

  const totalArticles = data ? Object.values(data.counts).reduce((sum, value) => sum + value, 0) : 0;

  return (
    <>
      <PageMeta
        title="NEXORA"
        description="A live dashboard of world news, technology, AI, science, education and business, with intelligent search and a personal knowledge library."
      />

      <PageHeader
        eyebrow={data ? `${data.sourceCount} newsrooms · updated ${relativeTime(data.generatedAt)}` : 'The front page'}
        title="Today"
        description={
          user
            ? `Welcome back. You follow ${interests.length || 'every'} topic${interests.length === 1 ? '' : 's'} — the front of the book is shaped around them.`
            : 'Everything published across the world in the last fortnight, edited down to what is worth your morning.'
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/explore" className="btn-ghost">
              <Icon name="compass" className="h-4 w-4" /> Browse
            </Link>
            <Link to="/search" className="btn-primary">
              <Icon name="search" className="h-4 w-4" /> Search
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
          <div className="space-y-8">
            <div className="grid gap-4 border-y border-line py-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="skeleton h-10" />
              ))}
            </div>
            <div className="skeleton aspect-[16/7]" />
            <ArticleSkeleton count={6} />
          </div>
        )}

        {!loading && error && <ErrorState message={error} onRetry={refresh} />}

        {!loading && !error && data && (
          <>
            {/* Metrics. Every figure is a real count from the fetched data.
                Rendered as a quiet strip: the numbers support the page, they
                are not the page. */}
            <section aria-label="Overview">
              <div className="grid gap-x-6 gap-y-5 border-y border-line py-4 sm:grid-cols-2 lg:grid-cols-4">
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

            {/* The front of the book. One lead story carries the page, a
                secondary column and a bare wire list fill the rest. This is
                deliberately uneven: an even card grid reads like a dashboard,
                a weighted column reads like an edited paper. */}
            <section aria-labelledby="feed-heading">
              <SubHeading
                id="feed-heading"
                title="The front of the book"
                hint={
                  interests.length
                    ? `Leading with ${interests.map((item) => CATEGORY_META[item].label).join(', ')}. The rest of the wire follows.`
                    : 'The newest reporting from every newsroom we follow, most recent first.'
                }
                action={
                  <Link to="/settings" className="btn-ghost !py-2 text-xs">
                    <Icon name="settings" className="h-4 w-4" /> Edit interests
                  </Link>
                }
              />
              {feed.length ? (
                <div className="grid gap-8 lg:grid-cols-12">
                  {/* Lead */}
                  <div className="lg:col-span-7">
                    <ArticleCard article={feed[0]} variant="featured" />
                  </div>

                  {/* Secondary column */}
                  <div className="flex flex-col gap-6 lg:col-span-5">
                    {feed.slice(1, 3).map((article) => (
                      <ArticleCard key={article.id} article={article} />
                    ))}
                  </div>

                  {/* The wire: no images, just headlines and sources */}
                  {feed.length > 3 && (
                    <div className="lg:col-span-12">
                      <p className="kicker mb-3">Also on the wire</p>
                      <div className="grid gap-x-8 gap-y-0 sm:grid-cols-2 xl:grid-cols-3">
                        {feed.slice(3, 9).map((article) => (
                          <ArticleCard key={article.id} article={article} variant="text" />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <EmptyState
                  title="Nothing on the wire"
                  message="The snapshot came back empty. Try a refresh — the newsrooms may be between editions."
                />
              )}
            </section>

            {/* Recommendations from the reader's own activity */}
            {recommended.length > 0 && (
              <section aria-labelledby="recommended-heading">
                <SubHeading
                  id="recommended-heading"
                  title="Recommended for you"
                  hint="Suggested from your saved articles, reading history and chosen interests. Articles you have already opened are left out."
                  action={
                    <Link to="/library" className="btn-ghost !py-2 text-xs">
                      <Icon name="bookmark" className="h-4 w-4" /> Open library
                    </Link>
                  }
                />
                <div className="grid gap-x-8 gap-y-0 sm:grid-cols-2 xl:grid-cols-3">
                  {recommended.map((entry) => (
                    <div key={entry.article.id} className="flex flex-col gap-1.5 border-b border-line pb-3">
                      <ArticleCard article={entry.article} variant="text" />
                      <p className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-accent2">
                        {entry.reason}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

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
                <ol className="border-t border-line">
                  {data.trending.map((item, index) => (
                    <li key={item.id} className="flex items-start gap-4 border-b border-line py-3">
                      <span className="tabular w-6 shrink-0 font-mono text-xs text-accent">
                        {String(index + 1).padStart(2, '0')}
                      </span>
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
                <p className="border-t border-line py-6 text-sm text-muted">
                  Hacker News is not answering at the moment. It rate-limits, so this usually clears on its own.
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
              <div className="grid border-t border-line sm:grid-cols-2 lg:grid-cols-3">
                {NEWS_CATEGORIES.map((category) => {
                  const meta = CATEGORY_META[category];
                  const followed = interests.includes(category);
                  return (
                    <Link
                      key={category}
                      to={meta.path}
                      className="group flex items-baseline justify-between gap-4 border-b border-line px-1 py-4 transition-colors hover:text-accent sm:odd:border-r sm:odd:pr-5 sm:even:pl-5 lg:[&:nth-child(3n+1)]:pr-5 lg:[&:nth-child(3n+2)]:px-5 lg:[&:nth-child(3n)]:pl-5"
                    >
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 font-serif text-[1.05rem] text-heading transition-colors group-hover:text-accent">
                          {meta.label}
                          {followed && <Icon name="check" className="h-3 w-3 text-accent" />}
                        </span>
                        <span className="mt-1 block font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted">
                          {meta.blurb}
                        </span>
                      </span>
                      <span className="tabular shrink-0 font-mono text-xs text-muted">
                        {data.counts[category]}
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
                <ul className="border-t border-line">
                  {data.onThisDay.map((event) => (
                    <li key={`${event.year}-${event.text.slice(0, 20)}`} className="flex gap-4 border-b border-line py-3.5">
                      <span className="tabular shrink-0 font-mono text-xs text-accent">{event.year}</span>
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
