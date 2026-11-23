import { useCallback, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArticleCard, ArticleSkeleton, EmptyState, ErrorState, Icon } from '../components/news/ArticleCard';
import { FreshnessBar, PageBody, PageHeader, StatCard, SubHeading } from '../components/ui/PageHeader';
import { Pagination } from '../components/ui/Pagination';
import { PageMeta } from '../components/layout/PageMeta';
import { useLiveData } from '../hooks/useLiveData';
import { CONTINENT_IDS, CONTINENT_META, CONTINENTS, type ContinentId } from '../lib/regions';
import { getContinentArticles, loadSnapshot } from '../services/newsService';
import { relativeTime } from '../lib/format';
import type { NewsArticle } from '../lib/newsTypes';

interface ContinentData {
  articles: NewsArticle[];
  generatedAt: string;
}

const PAGE_SIZE = 12;

/**
 * One continent's live feed.
 *
 * The country filter matches the publisher's declared coverage, so choosing
 * "Saudi Arabia" shows the Gulf desks that report on it — it never guesses from
 * headline keywords.
 */
export default function ContinentPage() {
  const { id } = useParams<{ id: string }>();
  const continent = CONTINENT_IDS.includes(id as ContinentId) ? CONTINENT_META[id as ContinentId] : null;

  const [country, setCountry] = useState<string>('all');
  const [page, setPage] = useState(1);

  const loader = useCallback(async (): Promise<ContinentData> => {
    if (!continent) return { articles: [], generatedAt: '' };
    const [articles, snapshot] = await Promise.all([
      getContinentArticles(continent.id),
      loadSnapshot(),
    ]);
    return { articles, generatedAt: snapshot.generatedAt };
  }, [continent]);

  const { data, loading, refreshing, error, fetchedAt, refresh } = useLiveData(loader, [continent?.id]);

  const articles = useMemo(() => data?.articles ?? [], [data]);

  const countries = useMemo(() => {
    // Covered countries count too, so a Gulf desk puts Saudi Arabia on the list
    // even though no Saudi publisher is in the snapshot.
    const present = new Set<string>();
    for (const article of articles) {
      present.add(article.country);
      article.covers?.forEach((name) => present.add(name));
    }
    present.delete('World');
    const ordered = continent?.countries.filter((name) => present.has(name)) ?? [];
    const extra = [...present].filter((name) => !ordered.includes(name)).sort();
    return [...ordered, ...extra];
  }, [articles, continent]);

  const visible = useMemo(() => {
    if (country === 'all') return articles;
    return articles.filter(
      (article) => article.country === country || article.covers?.includes(country)
    );
  }, [articles, country]);

  const publishers = useMemo(() => new Set(visible.map((article) => article.sourceId)).size, [visible]);

  if (!continent) return <Navigate to="/world" replace />;

  return (
    <>
      <PageMeta
        title={`${continent.name} News`}
        description={`${continent.blurb} Live headlines from ${continent.name}, updated from the publishers' own feeds.`}
      />
      <PageHeader
        eyebrow="Continent feed"
        title={`${continent.name} News`}
        description={continent.blurb}
        icon="globe"
        actions={
          <Link to="/world" className="btn-ghost">
            <Icon name="compass" className="h-4 w-4" /> All continents
          </Link>
        }
      />

      <PageBody className="space-y-8">
        <FreshnessBar
          fetchedAt={fetchedAt}
          refreshing={refreshing}
          onRefresh={refresh}
          note={data?.generatedAt ? `Publisher feeds collected ${relativeTime(data.generatedAt)}` : undefined}
        />

        {loading && <ArticleSkeleton count={6} />}
        {!loading && error && <ErrorState message={error} onRetry={refresh} />}

        {!loading && !error && data && (
          <>
            <section aria-label="Coverage">
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard label="Articles" value={articles.length} hint={`From ${continent.name} publishers`} icon="globe" />
                <StatCard
                  label="Countries"
                  value={countries.length}
                  hint={
                    countries.length > 4
                      ? `${countries.slice(0, 4).join(', ')} +${countries.length - 4} more`
                      : countries.join(', ') || '—'
                  }
                  icon="shield"
                  tone="accent2"
                />
                <StatCard label="Publishers" value={publishers} hint="Original sources, always linked" icon="external" />
              </div>
            </section>

            <section aria-labelledby="filter-heading">
              <SubHeading id="filter-heading" title="Filter by country" hint="Only countries with a publisher in this feed are listed." />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCountry('all')}
                  aria-pressed={country === 'all'}
                  className={`border px-3 py-1.5 font-mono text-[0.66rem] uppercase tracking-[0.12em] transition ${
                    country === 'all'
                      ? 'border-heading bg-heading text-bg'
                      : 'border-line bg-elevated/40 text-muted hover:border-accent/50 hover:text-accent'
                  }`}
                >
                  All countries
                  <span className="ml-1.5 font-mono text-[0.7rem] opacity-70">{articles.length}</span>
                </button>
                {countries.map((name) => {
                  const count = articles.filter(
                    (article) => article.country === name || article.covers?.includes(name)
                  ).length;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        setCountry(name);
                        setPage(1);
                      }}
                      aria-pressed={country === name}
                      className={`border px-3 py-1.5 font-mono text-[0.66rem] uppercase tracking-[0.12em] transition ${
                        country === name
                          ? 'border-heading bg-heading text-bg'
                          : 'border-line bg-elevated/40 text-muted hover:border-accent/50 hover:text-accent'
                      }`}
                    >
                      {name}
                      <span className="ml-1.5 font-mono text-[0.7rem] opacity-70">{count}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section aria-labelledby="articles-heading">
              <SubHeading
                id="articles-heading"
                title={country === 'all' ? 'Latest from this continent' : `Latest about ${country}`}
                hint={`${visible.length} article${visible.length === 1 ? '' : 's'} in the current snapshot.`}
              />

              {visible.length === 0 ? (
                <EmptyState
                  title="Nothing matches this filter"
                  message={`No articles about ${country} in the current snapshot. Choose another country, or refresh.`}
                  action={
                    <button type="button" className="btn-ghost mt-2" onClick={() => setCountry('all')}>
                      Clear filter
                    </button>
                  }
                />
              ) : (
                <>
                  <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((article) => (
                      <ArticleCard key={article.id} article={article} />
                    ))}
                  </div>
                  <Pagination
                    page={page}
                    pageSize={PAGE_SIZE}
                    totalItems={visible.length}
                    onPageChange={setPage}
                  />
                </>
              )}
            </section>

            <section aria-labelledby="other-heading">
              <SubHeading id="other-heading" title="Other continents" />
              <ul className="flex flex-wrap gap-2">
                {CONTINENTS.filter((entry) => entry.id !== continent.id).map((entry) => (
                  <li key={entry.id}>
                    <Link
                      to={`/continent/${entry.id}`}
                      className="inline-flex items-center gap-1.5 border border-line px-3 py-1.5 font-mono text-[0.66rem] uppercase tracking-[0.12em] text-muted transition-colors hover:border-accent hover:text-accent"
                    >
                      <span aria-hidden="true">{entry.glyph}</span>
                      {entry.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </PageBody>
    </>
  );
}
