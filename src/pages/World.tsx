import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArticleCard, ArticleSkeleton, EmptyState, ErrorState, Icon } from '../components/news/ArticleCard';
import { ContinentGrid, WorldMap } from '../components/news/WorldMap';
import { FreshnessBar, PageBody, PageHeader, StatCard, SubHeading } from '../components/ui/PageHeader';
import { PageMeta } from '../components/layout/PageMeta';
import { useLiveData } from '../hooks/useLiveData';
import { CONTINENTS, CONTINENT_META, type ContinentId } from '../lib/regions';
import { getContinentStats, loadSnapshot, type ContinentStat } from '../services/newsService';
import { relativeTime } from '../lib/format';
import type { NewsArticle } from '../lib/newsTypes';

interface WorldData {
  latest: NewsArticle[];
  stats: ContinentStat[];
  generatedAt: string;
  sourceCount: number;
}

/**
 * The global front page.
 *
 * Every continent is represented by real publisher feeds, and the map's counts
 * are computed from the current snapshot rather than written by hand. Antarctica
 * is covered through the research programmes that work there, which is what
 * actually publishes Antarctic news.
 */
export default function World() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<ContinentId | null>(null);

  const loader = useCallback(async (): Promise<WorldData> => {
    const [snapshot, stats] = await Promise.all([loadSnapshot(), getContinentStats()]);
    return {
      latest: snapshot.items.slice(0, 9),
      stats,
      generatedAt: snapshot.generatedAt,
      sourceCount: snapshot.sourceCount,
    };
  }, []);

  const { data, loading, refreshing, error, fetchedAt, refresh } = useLiveData(loader);

  const totalArticles = useMemo(
    () => (data ? data.stats.reduce((sum, stat) => sum + stat.articles, 0) : 0),
    [data]
  );
  const countryCount = useMemo(() => {
    if (!data) return 0;
    return new Set(data.stats.flatMap((stat) => stat.countries)).size;
  }, [data]);

  function selectContinent(id: ContinentId) {
    setSelected(id);
    navigate(`/continent/${id}`);
  }

  return (
    <>
      <PageMeta
        title="World News"
        description="Live news from every continent: Asia, Europe, Africa, North America, South America, Oceania and Antarctica, plus a dedicated Bangladesh section."
      />
      <PageHeader
        eyebrow="Global News System"
        title="World News"
        description="Every continent, reported by its own newsrooms. Choose a region on the map to read that continent's live feed."
        icon="globe"
        actions={
          <Link to="/bangladesh" className="btn-primary">
            <Icon name="globe" className="h-4 w-4" /> Bangladesh Special
          </Link>
        }
      />

      <PageBody className="space-y-10">
        <FreshnessBar
          fetchedAt={fetchedAt}
          refreshing={refreshing}
          onRefresh={refresh}
          note={data ? `${data.sourceCount} publishers · snapshot ${relativeTime(data.generatedAt)}` : undefined}
        />

        {loading && <ArticleSkeleton count={6} />}
        {!loading && error && <ErrorState message={error} onRetry={refresh} />}

        {!loading && !error && data && (
          <>
            <section aria-label="Coverage">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Live articles" value={totalArticles} hint="Across every continent feed" icon="globe" />
                <StatCard label="Continents" value={CONTINENTS.length} hint="All seven, Antarctica included" icon="compass" tone="accent2" />
                <StatCard label="Countries" value={countryCount} hint="Each with a publisher in the snapshot" icon="shield" />
                <StatCard label="Publishers" value={data.sourceCount} hint="Original sources, always linked" icon="external" tone="accent2" />
              </div>
            </section>

            <section aria-labelledby="map-heading" className="border border-line bg-surface p-5 sm:p-7">
              <SubHeading
                id="map-heading"
                title="Choose a continent"
                hint="Click a region to open its live news. Hover to see how many articles it holds."
              />
              <WorldMap stats={data.stats} active={selected} onSelect={selectContinent} />
            </section>

            <section aria-labelledby="continents-heading">
              <SubHeading id="continents-heading" title="Continents" hint="Each region has its own publishers and its own feed." />
              <ContinentGrid stats={data.stats} />
            </section>

            <section aria-labelledby="latest-heading">
              <SubHeading
                id="latest-heading"
                title="Latest worldwide"
                hint="The newest articles from every continent, in publication order."
                action={
                  <Link to="/explore" className="btn-ghost !py-2 text-xs">
                    <Icon name="compass" className="h-4 w-4" /> Explore everything
                  </Link>
                }
              />
              {data.latest.length ? (
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {data.latest.map((article) => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </div>
              ) : (
                <EmptyState title="The wires are quiet" message="This snapshot came back empty. Refresh, or give the newsrooms a minute and come back." />
              )}
            </section>

            <section aria-labelledby="sources-heading">
              <SubHeading id="sources-heading" title="Where this comes from" hint="Every article links to its publisher. NEXORA does not host or rewrite this content." />
              <ul className="flex flex-wrap gap-2">
                {CONTINENTS.map((continent) => (
                  <li key={continent.id}>
                    <Link
                      to={`/continent/${continent.id}`}
                      className="inline-flex items-center gap-1.5 border border-line px-3 py-1.5 font-mono text-[0.66rem] uppercase tracking-[0.12em] text-muted transition-colors hover:border-accent hover:text-accent"
                    >
                      <span aria-hidden="true">{continent.glyph}</span>
                      {CONTINENT_META[continent.id].name}
                      <span className="font-mono text-[0.7rem] text-accent">
                        {data.stats.find((stat) => stat.id === continent.id)?.articles ?? 0}
                      </span>
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
