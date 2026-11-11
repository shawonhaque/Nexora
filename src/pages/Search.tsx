import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArticleCard, ArticleSkeleton, EmptyState, ErrorState, Icon } from '../components/news/ArticleCard';
import { PageBody, PageHeader } from '../components/ui/PageHeader';
import { PageMeta } from '../components/layout/PageMeta';
import { runIntelligentSearch, type SearchAnswer } from '../services/intelligentSearch';
import { CATEGORY_META, NEWS_CATEGORIES } from '../services/newsService';
import type { NewsCategory } from '../lib/newsTypes';

const HISTORY_KEY = 'nexora:search-history';

function readHistory(): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeHistory(entries: string[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, 12)));
  } catch {
    /* storage unavailable; history simply will not persist */
  }
}

export default function Search() {
  const [params, setParams] = useSearchParams();
  const [input, setInput] = useState(params.get('q') ?? '');
  const [answer, setAnswer] = useState<SearchAnswer | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  const [category, setCategory] = useState<NewsCategory | 'all'>('all');
  const [history, setHistory] = useState<string[]>(readHistory);

  const execute = useCallback(async (rawQuery: string) => {
    const query = rawQuery.trim();
    if (!query) {
      setState('idle');
      setAnswer(null);
      return;
    }
    setState('loading');
    setError('');
    try {
      const result = await runIntelligentSearch(query);
      setAnswer(result);
      setState('done');
      setHistory((current) => {
        const next = [query, ...current.filter((item) => item !== query)];
        writeHistory(next);
        return next;
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Search failed.');
      setState('error');
    }
  }, []);

  // Run the query present in the URL, so a shared link reproduces the search.
  useEffect(() => {
    const initial = params.get('q');
    if (initial) {
      setInput(initial);
      void execute(initial);
    }
  }, [params, execute]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const query = input.trim();
    setParams(query ? { q: query } : {});
    void execute(query);
  }

  const results = useMemo(() => {
    if (!answer) return [];
    if (category === 'all') return answer.results;
    return answer.results.filter((item) => item.category === category);
  }, [answer, category]);

  return (
    <>
      <PageMeta
        title="Intelligent Search"
        description="Search every live feed, get an extractive summary with citations, and follow related questions."
        noIndex
      />
      <PageHeader
        eyebrow="Search"
        title="Intelligent Search"
        description="Ask a question in plain language. Results are ranked from real published articles, and the summary quotes them directly."
        icon="search"
      />

      <PageBody className="space-y-7">
        <form onSubmit={submit} role="search" className="flex flex-wrap gap-2">
          <label htmlFor="search-input" className="sr-only">
            Search query
          </label>
          <input
            id="search-input"
            type="search"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="e.g. What is happening with AI regulation?"
            className="field max-w-2xl flex-1"
            autoComplete="off"
          />
          <button type="submit" className="btn-primary" disabled={state === 'loading'}>
            <Icon name="sparkle" className="h-4 w-4" />
            {state === 'loading' ? 'Searching…' : 'Search'}
          </button>
        </form>

        {history.length > 0 && state === 'idle' && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted">Recent:</span>
            {history.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setInput(item);
                  setParams({ q: item });
                  void execute(item);
                }}
                className="chip transition hover:border-accent/50 hover:text-accent"
              >
                {item}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setHistory([]);
                writeHistory([]);
              }}
              className="text-xs text-muted underline transition hover:text-accent"
            >
              Clear
            </button>
          </div>
        )}

        {state === 'loading' && (
          <div className="space-y-5">
            <div className="glass space-y-3 p-5">
              <div className="skeleton h-5 w-40" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-11/12" />
            </div>
            <ArticleSkeleton count={6} />
          </div>
        )}

        {state === 'error' && <ErrorState message={error} onRetry={() => void execute(input)} />}

        {state === 'done' && answer && (
          <>
            {answer.suggestions.length > 0 && (
              <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
                <span>Did you mean</span>
                {answer.suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      const corrected = answer.matchedTerms.concat(suggestion).join(' ');
                      setInput(corrected);
                      setParams({ q: corrected });
                      void execute(corrected);
                    }}
                    className="chip transition hover:border-accent/50 hover:text-accent"
                  >
                    {suggestion}
                  </button>
                ))}
                <span>?</span>
              </p>
            )}

            {answer.summary ? (
              <section className="glass overflow-hidden" aria-labelledby="answer-heading">
                <div className="flex items-center gap-2 border-b border-line/70 bg-accent/5 px-5 py-3">
                  <Icon name="sparkle" className="h-4 w-4 text-accent" />
                  <h2 id="answer-heading" className="text-sm font-semibold text-heading">
                    Summary extracted from sources
                  </h2>
                  <span className="ml-auto font-mono text-[0.68rem] uppercase tracking-wider text-muted">
                    {answer.citations.length} citation{answer.citations.length === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="p-5">
                  <p className="text-[1.02rem] leading-8 text-fg">{answer.summary}</p>

                  <p className="mt-4 rounded-xl border border-line bg-elevated/40 px-4 py-3 text-xs leading-relaxed text-muted">
                    <strong className="font-semibold text-fg">How this was produced.</strong> These sentences are
                    quoted from the articles listed below — nothing here is generated text. Each number links to
                    its source. This is not a language-model answer.
                  </p>

                  <ol className="mt-5 space-y-3">
                    {answer.citations.map((citation) => (
                      <li key={citation.index} className="flex gap-3 text-sm">
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-accent/12 font-mono text-xs font-bold text-accent">
                          {citation.index}
                        </span>
                        <div className="min-w-0">
                          <a
                            href={citation.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-heading transition hover:text-accent"
                          >
                            {citation.title}
                          </a>
                          <p className="mt-0.5 font-mono text-xs text-muted">{citation.source}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </section>
            ) : (
              <EmptyState
                title="No summary available"
                message={`No article in the current feeds matched "${answer.query}". Try a broader term, or browse a topic feed.`}
              />
            )}

            {answer.relatedQuestions.length > 0 && (
              <section aria-labelledby="related-heading">
                <h2 id="related-heading" className="mb-3 text-lg font-semibold">
                  Related questions
                </h2>
                <ul className="flex flex-wrap gap-2">
                  {answer.relatedQuestions.map((question) => (
                    <li key={question}>
                      <button
                        type="button"
                        onClick={() => {
                          setInput(question);
                          setParams({ q: question });
                          void execute(question);
                        }}
                        className="rounded-xl border border-line bg-elevated/40 px-3.5 py-2 text-left text-sm text-muted transition hover:border-accent/50 hover:text-accent"
                      >
                        {question}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {answer.results.length > 0 && (
              <section aria-labelledby="results-heading">
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <h2 id="results-heading" className="text-lg font-semibold">
                    Sources ({results.length})
                  </h2>
                  <span className="font-mono text-[0.68rem] uppercase tracking-wider text-muted">
                    ranked by BM25 relevance
                  </span>
                  <div className="ml-auto flex flex-wrap gap-1.5">
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
                </div>

                {answer.unmatchedTerms.length > 0 && (
                  <p className="mb-4 text-xs leading-relaxed text-muted">
                    No article matched{' '}
                    {answer.unmatchedTerms.map((term) => (
                      <code key={term} className="mx-0.5 rounded bg-elevated px-1.5 py-0.5 font-mono text-accent2">
                        {term}
                      </code>
                    ))}
                    . Results below are ranked on the terms that did match.
                  </p>
                )}

                {results.length ? (
                  <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {results.map((article) => {
                      const entry = answer.ranked.find((item) => item.article.id === article.id);
                      return (
                        <div key={article.id} className="relative">
                          {entry && (
                            <span
                              className="absolute right-3 top-3 z-10 rounded-lg bg-black/70 px-2 py-1 font-mono text-[0.68rem] font-semibold text-white backdrop-blur"
                              title={`BM25 relevance ${(entry.score * 100).toFixed(0)}% — matched: ${entry.matched.join(', ')}`}
                            >
                              {(entry.score * 100).toFixed(0)}%
                            </span>
                          )}
                          <ArticleCard article={article} />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    title="No results in this topic"
                    message="This search matched nothing in the selected topic. Choose another topic or clear the filter."
                  />
                )}
              </section>
            )}
          </>
        )}

        {state === 'idle' && (
          <section aria-label="Search help" className="glass p-5">
            <h2 className="text-base font-semibold">What you can search</h2>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
              <li className="flex gap-2">
                <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span>Plain-language questions — terms are matched against every headline and summary.</span>
              </li>
              <li className="flex gap-2">
                <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span>Source names, for example “Nature” or “Al Jazeera”.</span>
              </li>
              <li className="flex gap-2">
                <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span>Topic words such as “regulation”, “model”, “climate” or “funding”.</span>
              </li>
            </ul>
            <p className="mt-4 text-xs leading-relaxed text-muted">
              Search covers the articles currently in the feed snapshot. It does not search the open web, and it
              does not generate claims — summaries quote the retrieved articles directly.
            </p>
            <Link to="/explore" className="btn-ghost mt-4 !py-2 text-xs">
              <Icon name="compass" className="h-4 w-4" /> Or browse everything instead
            </Link>
          </section>
        )}
      </PageBody>
    </>
  );
}
