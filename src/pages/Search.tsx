import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageMeta } from '../components/layout/PageMeta';
import { Section } from '../components/ui/Section';
import { ButtonLink } from '../components/ui/ButtonLink';
import { DemoNotice, StateBlock } from '../components/ui/StateBlock';
import { searchService, type SearchResults } from '../services';
import { isSupabaseConfigured } from '../lib/env';
import { DEMO_BOOKS, DEMO_IDEAS, DEMO_POSTS, DEMO_STUDY } from '../data/demo';

/** Builds the same result shape from demo data when no backend is connected. */
function demoResults(query: string): SearchResults {
  const q = query.toLowerCase();
  const match = (value: string | null | undefined) => Boolean(value && value.toLowerCase().includes(q));

  const posts = DEMO_POSTS.filter((p) => match(p.title) || match(p.excerpt));
  const books = DEMO_BOOKS.filter((b) => match(b.title) || match(b.author));
  const study = DEMO_STUDY.filter((s) => match(s.title) || match(s.description));
  const ideas = DEMO_IDEAS.filter((i) => match(i.title) || match(i.description));

  return {
    query,
    hits: [
      ...posts.map((p) => ({ id: p.id, title: p.title, href: `/${p.section}/${p.slug}`, group: 'posts' as const, section: p.section, excerpt: p.excerpt })),
      ...books.map((b) => ({ id: b.id, title: b.title, href: `/books/${b.slug ?? b.id}`, group: 'books' as const, section: 'books', excerpt: b.author ? `by ${b.author}` : b.description })),
      ...study.map((s) => ({ id: s.id, title: s.title, href: `/study/resources/${s.slug ?? s.id}`, group: 'study' as const, section: 'study', excerpt: s.subject })),
      ...ideas.map((i) => ({ id: i.id, title: i.title, href: '/ideas', group: 'ideas' as const, section: 'ideas', excerpt: i.description })),
    ],
    counts: { posts: posts.length, books: books.length, study: study.length, ideas: ideas.length },
  };
}

const GROUP_LABEL: Record<string, string> = {
  posts: 'Articles',
  books: 'Books',
  study: 'Study material',
  ideas: 'Ideas',
};

export default function Search() {
  const [params, setParams] = useSearchParams();
  const initial = params.get('q') ?? '';
  const [input, setInput] = useState(initial);
  const [query, setQuery] = useState(initial);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce so typing does not fire a request per keystroke.
  useEffect(() => {
    const handle = window.setTimeout(() => setQuery(input.trim()), 300);
    return () => window.clearTimeout(handle);
  }, [input]);

  useEffect(() => {
    setParams(query ? { q: query } : {}, { replace: true });
  }, [query, setParams]);

  useEffect(() => {
    if (query.length < 2) {
      setResults(null);
      setError(null);
      return;
    }

    if (!isSupabaseConfigured) {
      setResults(demoResults(query));
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    searchService
      .search(query)
      .then((result) => {
        if (!active) return;
        if (result.error) setError(result.error.message);
        else setResults(result.data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [query]);

  const grouped = useMemo(() => {
    if (!results) return [];
    const order: Array<'posts' | 'books' | 'study' | 'ideas'> = ['posts', 'books', 'study', 'ideas'];
    return order
      .map((group) => ({ group, items: results.hits.filter((hit) => hit.group === group) }))
      .filter((entry) => entry.items.length > 0);
  }, [results]);

  return (
    <>
      <PageMeta
        title="Search"
        description="Search across news, knowledge articles, books, study material and ideas."
      />

      <Section eyebrow="Search" title="Search NEXORA" titleAs="h1">
        <form
          role="search"
          className="flex max-w-2xl flex-col gap-2.5 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            setQuery(input.trim());
          }}
        >
          <label htmlFor="global-search" className="sr-only">Search NEXORA</label>
          <input
            id="global-search"
            type="search"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Search articles, books, study material, ideas…"
            className="field h-12 flex-1"
            autoComplete="off"
          />
          <button type="submit" className="btn-primary h-12 px-6">Search</button>
        </form>

        {!isSupabaseConfigured && (
          <DemoNotice className="mt-6 max-w-2xl" />
        )}

        {query.length > 0 && query.length < 2 && (
          <p className="mt-8 text-sm text-muted">Type at least two characters to search.</p>
        )}

        {loading && (
          <p className="mt-8 text-sm text-muted" aria-live="polite">Searching…</p>
        )}

        {error && !loading && (
          <div className="mt-8">
            <StateBlock tone="error" title="Search failed" message={error} />
          </div>
        )}

        {!loading && !error && results && query.length >= 2 && (
          <div className="mt-10" aria-live="polite">
            <p className="mb-7 text-sm text-muted">
              {results.hits.length === 0
                ? `No results for “${results.query}”.`
                : `${results.hits.length} result${results.hits.length === 1 ? '' : 's'} for “${results.query}”.`}
            </p>

            {results.hits.length === 0 && (
              <StateBlock
                title="Nothing matched that search"
                message="Try a different term, or browse a section from the navigation."
                action={<ButtonLink to="/" variant="ghost">Back to home</ButtonLink>}
              />
            )}

            <div className="grid gap-10">
              {grouped.map(({ group, items }) => (
                <section key={group} aria-labelledby={`group-${group}`}>
                  <h2 id={`group-${group}`} className="mb-4 font-mono text-xs uppercase tracking-[0.18em] text-muted">
                    {GROUP_LABEL[group]} ({items.length})
                  </h2>
                  <ul className="grid gap-3">
                    {items.map((hit) => (
                      <li key={`${hit.group}-${hit.id}`}>
                        <Link
                          to={hit.href}
                          className="card card-hover block px-5 py-4"
                        >
                          <span className="block text-sm font-semibold text-heading">{hit.title}</span>
                          {hit.excerpt && (
                            <span className="mt-1 block text-xs leading-relaxed text-muted">{hit.excerpt}</span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        )}
      </Section>
    </>
  );
}
