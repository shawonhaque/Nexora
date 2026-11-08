import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArticleCard, ArticleSkeleton, EmptyState, ErrorState, Icon } from '../components/news/ArticleCard';
import { FreshnessBar, PageBody, PageHeader, SubHeading } from '../components/ui/PageHeader';
import { PageMeta } from '../components/layout/PageMeta';
import { useLiveData } from '../hooks/useLiveData';
import { usePersonalization } from '../hooks/usePersonalization';
import {
  CATEGORY_META,
  NEWS_CATEGORIES,
  getTrendingModels,
  getTrendingRepos,
  getTopicSummary,
  loadSnapshot,
} from '../services/newsService';
import { relativeTime } from '../lib/format';
import type { AiModel, NewsArticle, NewsCategory, RepoTrend, WikiSummary } from '../lib/newsTypes';

type Tab = 'articles' | 'ai' | 'repos' | 'topics';

const TABS: { id: Tab; label: string; icon: 'globe' | 'brain' | 'trend' | 'compass' }[] = [
  { id: 'articles', label: 'All articles', icon: 'globe' },
  { id: 'ai', label: 'Trending AI models', icon: 'brain' },
  { id: 'repos', label: 'Trending repos', icon: 'trend' },
  { id: 'topics', label: 'Topic explorer', icon: 'compass' },
];

export default function Explore() {
  const [tab, setTab] = useState<Tab>('articles');
  const [category, setCategory] = useState<NewsCategory | 'all'>('all');
  const [query, setQuery] = useState('');
  const { interests, toggleInterest } = usePersonalization();

  const loader = useCallback(async () => {
    const [snapshot, models, repos] = await Promise.all([
      loadSnapshot(),
      getTrendingModels(12).catch(() => [] as AiModel[]),
      getTrendingRepos(12).catch(() => [] as RepoTrend[]),
    ]);
    return { snapshot, models, repos };
  }, []);

  const { data, loading, refreshing, error, fetchedAt, refresh } = useLiveData(loader);

  const articles = useMemo(() => {
    if (!data) return [];
    let list = data.snapshot.items;
    if (category !== 'all') list = list.filter((item) => item.category === category);
    const term = query.trim().toLowerCase();
    if (term) {
      list = list.filter(
        (item) => item.title.toLowerCase().includes(term) || item.summary.toLowerCase().includes(term)
      );
    }
    return list;
  }, [data, category, query]);

  return (
    <>
      <PageMeta
        title="Explore"
        description="Browse every live feed, recent AI models, trending repositories and topic summaries in one place."
      />
      <PageHeader
        eyebrow="Discovery"
        title="Explore"
        description="Every live source in one place: publisher articles, recent AI models, trending repositories and topic summaries."
        icon="compass"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/search" className="btn-primary">
              <Icon name="search" className="h-4 w-4" /> Intelligent search
            </Link>
          </div>
        }
      />

      <PageBody className="space-y-6">
        <FreshnessBar
          fetchedAt={fetchedAt}
          refreshing={refreshing}
          onRefresh={refresh}
          note={data ? `${data.snapshot.sourceCount} publishers` : undefined}
        />

        {/* Tabs */}
        <div role="tablist" aria-label="Explore sections" className="flex flex-wrap gap-2">
          {TABS.map((item) => (
            <button
              key={item.id}
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition ${
                tab === item.id
                  ? 'bg-accent/12 text-accent'
                  : 'text-muted hover:bg-elevated hover:text-heading'
              }`}
            >
              <Icon name={item.icon} className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </div>

        {loading && <ArticleSkeleton count={6} />}
        {!loading && error && <ErrorState message={error} onRetry={refresh} />}

        {/* ---------------------------------------------------- articles tab */}
        {!loading && !error && data && tab === 'articles' && (
          <section className="space-y-5" aria-label="All articles">
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter these articles…"
                aria-label="Filter articles"
                className="field max-w-xs"
              />
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setCategory('all')}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                    category === 'all' ? 'bg-accent/12 text-accent' : 'text-muted hover:bg-elevated'
                  }`}
                >
                  All
                </button>
                {NEWS_CATEGORIES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCategory(item)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                      category === item ? 'bg-accent/12 text-accent' : 'text-muted hover:bg-elevated'
                    }`}
                  >
                    {CATEGORY_META[item].label}
                  </button>
                ))}
              </div>
              <span className="ml-auto font-mono text-xs text-muted">{articles.length} shown</span>
            </div>

            {articles.length ? (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {articles.slice(0, 60).map((article: NewsArticle) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="Nothing matches"
                message="No articles match this filter. Try a different term or category."
                action={
                  <button
                    type="button"
                    className="btn-ghost mt-2"
                    onClick={() => {
                      setQuery('');
                      setCategory('all');
                    }}
                  >
                    Clear filters
                  </button>
                }
              />
            )}
          </section>
        )}

        {/* ---------------------------------------------------------- AI tab */}
        {!loading && !error && data && tab === 'ai' && (
          <section aria-label="Recent AI models">
            <SubHeading
              title="Trending AI models"
              hint="The models gaining the most attention on Hugging Face right now, live from their API."
              action={
                <a
                  href="https://huggingface.co/models"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost !py-2 text-xs"
                >
                  Hugging Face <Icon name="external" className="h-3.5 w-3.5" />
                </a>
              }
            />
            {data.models.length ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {data.models.map((model) => (
                  <a
                    key={model.id}
                    href={model.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="glass glass-hover flex flex-col gap-2 p-4"
                  >
                    <span className="font-mono text-xs text-muted">{model.author}</span>
                    <span className="font-semibold leading-snug text-heading">{model.id.split('/').pop()}</span>
                    {model.pipelineTag && <span className="chip w-fit">{model.pipelineTag}</span>}
                    <span className="mt-auto flex gap-4 pt-1 font-mono text-xs text-muted">
                      <span>♥ {model.likes.toLocaleString()}</span>
                      <span>↓ {model.downloads.toLocaleString()}</span>
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="glass px-4 py-6 text-sm text-muted">
                The model feed is unavailable right now. Try refresh.
              </p>
            )}
          </section>
        )}

        {/* ------------------------------------------------------- repos tab */}
        {!loading && !error && data && tab === 'repos' && (
          <section aria-label="Trending repositories">
            <SubHeading
              title="Gaining attention this fortnight"
              hint="Repositories created in the last 14 days with the most stars, live from GitHub."
              action={
                <a
                  href="https://github.com/trending"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost !py-2 text-xs"
                >
                  GitHub <Icon name="external" className="h-3.5 w-3.5" />
                </a>
              }
            />
            {data.repos.length ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {data.repos.map((repo) => (
                  <a
                    key={repo.id}
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="glass glass-hover flex flex-col gap-2 p-4"
                  >
                    <span className="font-mono text-sm font-semibold text-accent">{repo.fullName}</span>
                    {repo.description && (
                      <span className="text-sm leading-relaxed text-muted">{repo.description}</span>
                    )}
                    <span className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 font-mono text-xs text-muted">
                      <span>★ {repo.stars.toLocaleString()}</span>
                      {repo.language && <span>{repo.language}</span>}
                      <span>updated {relativeTime(repo.pushedAt)}</span>
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="glass px-4 py-6 text-sm text-muted">
                The GitHub search API is unavailable or rate limited. Try refresh.
              </p>
            )}
          </section>
        )}

        {/* ------------------------------------------------------ topics tab */}
        {!loading && !error && tab === 'topics' && (
          <TopicExplorer interests={interests} onToggle={toggleInterest} />
        )}
      </PageBody>
    </>
  );
}

/**
 * Smart Topic Explorer. A summary is fetched from Wikipedia on demand and the
 * full attribution is shown with it.
 */
function TopicExplorer({
  interests,
  onToggle,
}: {
  interests: NewsCategory[];
  onToggle: (category: NewsCategory) => void;
}) {
  const [topic, setTopic] = useState('');
  const [summary, setSummary] = useState<WikiSummary | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState('');

  const suggestions = [
    'Artificial intelligence',
    'Quantum computing',
    'Climate change',
    'Machine learning',
    'Renewable energy',
    'Neuroscience',
    'Cryptography',
    'Space exploration',
  ];

  async function lookUp(value: string) {
    const term = value.trim();
    if (!term) return;
    setTopic(term);
    setState('loading');
    setError('');
    setSummary(null);
    try {
      const result = await getTopicSummary(term);
      setSummary(result);
      setState('idle');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load that topic.');
      setState('error');
    }
  }

  return (
    <section aria-label="Topic explorer" className="space-y-5">
      <SubHeading
        title="Smart Topic Explorer"
        hint="Look up any topic for a summary from Wikipedia, with a link to the full article."
      />

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void lookUp(topic);
        }}
        className="flex flex-wrap gap-2"
      >
        <input
          type="text"
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          placeholder="e.g. Transformer (machine learning model)"
          aria-label="Topic to look up"
          className="field max-w-md flex-1"
        />
        <button type="submit" className="btn-primary" disabled={state === 'loading'}>
          {state === 'loading' ? 'Looking up…' : 'Look up'}
        </button>
      </form>

      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => void lookUp(item)}
            className="chip transition hover:border-accent/50 hover:text-accent"
          >
            {item}
          </button>
        ))}
      </div>

      {state === 'loading' && (
        <div className="glass space-y-3 p-5">
          <div className="skeleton h-6 w-1/3" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-5/6" />
        </div>
      )}

      {state === 'error' && <ErrorState message={error} onRetry={() => void lookUp(topic)} />}

      {summary && state === 'idle' && (
        <article className="glass overflow-hidden">
          <div className="flex flex-col gap-5 p-5 sm:flex-row">
            {summary.thumbnail && (
              <img
                src={summary.thumbnail}
                alt=""
                loading="lazy"
                className="h-32 w-full rounded-xl object-cover sm:w-48"
              />
            )}
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-heading">{summary.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{summary.extract}</p>
              <a
                href={summary.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
              >
                Read the full article on Wikipedia <Icon name="external" className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </article>
      )}

      {/* Interest toggles double as a topic quick-pick. */}
      <div>
        <p className="mb-2 text-sm text-muted">Follow a topic to influence your dashboard feed:</p>
        <div className="flex flex-wrap gap-2">
          {NEWS_CATEGORIES.map((item) => {
            const followed = interests.includes(item);
            return (
              <button
                key={item}
                type="button"
                onClick={() => onToggle(item)}
                aria-pressed={followed}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                  followed
                    ? 'border-accent bg-accent/12 text-accent'
                    : 'border-line text-muted hover:border-accent/50 hover:text-accent'
                }`}
              >
                <Icon name={followed ? 'check' : 'plus'} className="h-3.5 w-3.5" />
                {CATEGORY_META[item].label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
