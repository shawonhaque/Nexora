import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArticleCard, ArticleSkeleton, EmptyState, ErrorState, Icon } from '../components/news/ArticleCard';
import { FreshnessBar, PageBody, PageHeader, StatCard, SubHeading } from '../components/ui/PageHeader';
import { Pagination } from '../components/ui/Pagination';
import { PageMeta } from '../components/layout/PageMeta';
import { useLiveData } from '../hooks/useLiveData';
import { BANGLADESH_DESKS, BANGLADESH_SECTION, type BangladeshDesk } from '../lib/regions';
import { getBangladeshArticles, loadSnapshot } from '../services/newsService';
import { relativeTime } from '../lib/format';
import type { NewsArticle } from '../lib/newsTypes';

const PAGE_SIZE = 12;

interface BangladeshData {
  articles: NewsArticle[];
  generatedAt: string;
}

/**
 * Bangladesh Special.
 *
 * The desks are the editorial sections a Bangladeshi reader actually looks for.
 * A desk only appears with content when a publisher in the snapshot files to it,
 * so nothing here shows an empty promise.
 */
export default function Bangladesh() {
  const [desk, setDesk] = useState<BangladeshDesk | 'all'>('all');
  const [page, setPage] = useState(1);

  const loader = useCallback(async (): Promise<BangladeshData> => {
    const [articles, snapshot] = await Promise.all([getBangladeshArticles(), loadSnapshot()]);
    return { articles, generatedAt: snapshot.generatedAt };
  }, []);

  const { data, loading, refreshing, error, fetchedAt, refresh } = useLiveData(loader);

  const articles = useMemo(() => data?.articles ?? [], [data]);

  const visible = useMemo(
    () => (desk === 'all' ? articles : articles.filter((article) => article.desk === desk)),
    [articles, desk]
  );

  // Switching desk changes the result set, so start from the first page.
  useEffect(() => {
    setPage(1);
  }, [desk]);

  const deskCounts = useMemo(() => {
    const counts = {} as Record<BangladeshDesk, number>;
    for (const entry of BANGLADESH_DESKS) {
      counts[entry.id] = articles.filter((article) => article.desk === entry.id).length;
    }
    return counts;
  }, [articles]);

  const publishers = useMemo(() => new Set(articles.map((article) => article.sourceId)).size, [articles]);
  const coveredDesks = BANGLADESH_DESKS.filter((entry) => deskCounts[entry.id] > 0);

  return (
    <>
      <PageMeta
        title="Bangladesh Special"
        description="Bangladeshi news from Bangladeshi newsrooms: national politics, Dhaka, education and jobs, cricket, the economy and the diaspora."
      />
      <PageHeader
        eyebrow="Bangladesh Special"
        title="Bangladesh"
        description={BANGLADESH_SECTION.blurb}
        icon="globe"
        actions={
          <Link to="/world" className="btn-ghost">
            <Icon name="compass" className="h-4 w-4" /> World news
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
                <StatCard label="Articles" value={articles.length} hint="From Bangladeshi publishers" icon="globe" />
                <StatCard label="Desks" value={coveredDesks.length} hint={coveredDesks.map((entry) => entry.label).join(', ') || '—'} icon="filter" tone="accent2" />
                <StatCard label="Publishers" value={publishers} hint="Original sources, always linked" icon="external" />
              </div>
            </section>

            <section aria-labelledby="desks-heading">
              <SubHeading
                id="desks-heading"
                title="Desks"
                hint="Every desk listed here has articles in the current snapshot. Empty desks are not shown."
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setDesk('all')}
                  aria-pressed={desk === 'all'}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                    desk === 'all'
                      ? 'border-accent bg-accent/15 text-accent'
                      : 'border-line bg-elevated/40 text-muted hover:border-accent/50 hover:text-accent'
                  }`}
                >
                  All desks
                  <span className="ml-1.5 font-mono text-[0.7rem] opacity-70">{articles.length}</span>
                </button>
                {coveredDesks.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setDesk(entry.id)}
                    aria-pressed={desk === entry.id}
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                      desk === entry.id
                        ? 'border-accent bg-accent/15 text-accent'
                        : 'border-line bg-elevated/40 text-muted hover:border-accent/50 hover:text-accent'
                    }`}
                  >
                    {entry.label}
                    <span className="ml-1.5 font-mono text-[0.7rem] opacity-70">{deskCounts[entry.id]}</span>
                  </button>
                ))}
              </div>
              {desk !== 'all' && (
                <p className="mt-3 text-xs leading-relaxed text-muted">
                  {BANGLADESH_DESKS.find((entry) => entry.id === desk)?.blurb}
                </p>
              )}
            </section>

            <section aria-labelledby="bd-articles-heading">
              <SubHeading
                id="bd-articles-heading"
                title={desk === 'all' ? 'Latest from Bangladesh' : BANGLADESH_DESKS.find((entry) => entry.id === desk)?.label ?? ''}
                hint={`${visible.length} article${visible.length === 1 ? '' : 's'} in the current snapshot.`}
              />
              {visible.length === 0 ? (
                <EmptyState
                  title="No articles on this desk"
                  message="This desk has nothing in the current snapshot. Try another desk, or refresh."
                  action={
                    <button type="button" className="btn-ghost mt-2" onClick={() => setDesk('all')}>
                      Show all desks
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
                  <Pagination page={page} pageSize={PAGE_SIZE} totalItems={visible.length} onPageChange={setPage} />
                </>
              )}
            </section>

            <section aria-labelledby="desk-notes-heading" className="glass p-5 sm:p-6">
              <SubHeading
                id="desk-notes-heading"
                title="What each desk covers"
                hint="The desks without a count above have no publisher filing to them yet. They are listed so the gap is visible rather than hidden."
              />
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {BANGLADESH_DESKS.map((entry) => (
                  <div key={entry.id} className="rounded-xl border border-line bg-elevated/30 p-4">
                    <dt className="flex items-center justify-between gap-2 text-sm font-semibold text-heading">
                      {entry.label}
                      <span className={`font-mono text-xs ${deskCounts[entry.id] ? 'text-accent' : 'text-muted'}`}>
                        {deskCounts[entry.id]}
                      </span>
                    </dt>
                    <dd className="mt-1 text-xs leading-relaxed text-muted">{entry.blurb}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </>
        )}
      </PageBody>
    </>
  );
}
