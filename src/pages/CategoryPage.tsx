import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArticleCard, ArticleSkeleton, EmptyState, ErrorState, Icon } from '../components/news/ArticleCard';
import { FreshnessBar, PageBody, PageHeader } from '../components/ui/PageHeader';
import { PageMeta } from '../components/layout/PageMeta';
import { useLiveData } from '../hooks/useLiveData';
import { getCategoryArticles, CATEGORY_META } from '../services/newsService';
import type { NewsArticle, NewsCategory } from '../lib/newsTypes';
import { loadSnapshot } from '../services/newsService';
import { relativeTime } from '../lib/format';

type SortMode = 'newest' | 'oldest' | 'source';

/**
 * One page per live feed category. Articles come from the build-time snapshot
 * of that category's publisher feeds, so the source and timestamp shown are
 * the publisher's own.
 */
export default function CategoryPage({ category }: { category: NewsCategory }) {
  const meta = CATEGORY_META[category];
  const [sort, setSort] = useState<SortMode>('newest');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  const loader = useCallback(async () => {
    const [articles, snapshot] = await Promise.all([getCategoryArticles(category), loadSnapshot()]);
    return { articles, generatedAt: snapshot.generatedAt };
  }, [category]);

  const { data, loading, refreshing, error, fetchedAt, refresh } = useLiveData(loader, [category]);

  const articles = useMemo(() => data?.articles ?? [], [data]);
  const sources = useMemo(
    () => [...new Set(articles.map((article) => article.source))].sort(),
    [articles]
  );

  const visible = useMemo(() => {
    const filtered = sourceFilter === 'all' ? articles : articles.filter((a) => a.source === sourceFilter);
    const sorted = [...filtered];
    if (sort === 'newest') {
      sorted.sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));
    } else if (sort === 'oldest') {
      sorted.sort((a, b) => (a.publishedAt || '').localeCompare(b.publishedAt || ''));
    } else {
      sorted.sort((a, b) => a.source.localeCompare(b.source) || (b.publishedAt || '').localeCompare(a.publishedAt || ''));
    }
    return sorted;
  }, [articles, sort, sourceFilter]);

  return (
    <>
      <PageMeta
        title={meta.label}
        description={`${meta.blurb} ${articles.length} articles from ${sources.length} publishers.`}
      />
      <PageHeader
        eyebrow="Live feed"
        title={meta.label}
        description={meta.blurb}
        icon={category === 'world' ? 'globe' : category === 'technology' ? 'chip' : category === 'ai' ? 'brain' : category === 'science' ? 'flask' : category === 'education' ? 'book' : 'trend'}
        actions={
          <div className="text-right">
            <p className="font-mono text-2xl font-bold text-heading">{articles.length}</p>
            <p className="text-xs text-muted">articles · {sources.length} sources</p>
          </div>
        }
      />

      <PageBody className="space-y-6">
        <FreshnessBar
          fetchedAt={fetchedAt}
          refreshing={refreshing}
          onRefresh={refresh}
          note={
            data?.generatedAt
              ? `Publisher feeds collected ${relativeTime(data.generatedAt)}`
              : undefined
          }
        />

        {/* Filters. Every control maps to a real change in the list below. */}
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted">Sort</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortMode)}
              className="field !w-auto !py-2"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="source">By source</option>
            </select>
          </label>

          {sources.length > 1 && (
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted">Source</span>
              <select
                value={sourceFilter}
                onChange={(event) => setSourceFilter(event.target.value)}
                className="field !w-auto !py-2"
              >
                <option value="all">All sources</option>
                {sources.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </label>
          )}

          <Link to="/explore" className="btn-ghost ml-auto !py-2 text-xs">
            <Icon name="compass" className="h-4 w-4" /> Explore everything
          </Link>
        </div>

        {loading && <ArticleSkeleton count={6} />}

        {!loading && error && <ErrorState message={error} onRetry={refresh} />}

        {!loading && !error && !visible.length && (
          <EmptyState
            title="No articles match this filter"
            message={
              sourceFilter === 'all'
                ? 'This feed returned no articles. Try refreshing, or check the source directly.'
                : `No articles from ${sourceFilter} in the current snapshot. Choose another source.`
            }
            action={
              sourceFilter !== 'all' ? (
                <button type="button" className="btn-ghost mt-2" onClick={() => setSourceFilter('all')}>
                  Clear filter
                </button>
              ) : undefined
            }
          />
        )}

        {!loading && !error && visible.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((article: NewsArticle) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}

        {!loading && !error && articles.length > 0 && (
          <p className="pt-2 text-center text-xs text-muted">
            All articles link to their original publisher. NEXORA does not host or rewrite this content.
          </p>
        )}
      </PageBody>
    </>
  );
}
