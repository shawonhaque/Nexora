import { useState } from 'react';
import { PageMeta } from '../components/layout/PageMeta';
import { Section } from '../components/ui/Section';
import { ButtonLink } from '../components/ui/ButtonLink';
import { DemoNotice, SkeletonGrid, StateBlock } from '../components/ui/StateBlock';
import { BookCard } from '../components/content/Cards';
import { useAsyncData } from '../hooks/useAsyncData';
import { bookService } from '../services';
import { DEMO_BOOKS } from '../data/demo';

const PAGE_SIZE = 12;

const LANGUAGE_FILTERS = ['English', 'Bengali', 'Arabic', 'Hindi'] as const;

export default function Books() {
  const [page, setPage] = useState(1);
  const [language, setLanguage] = useState<string>('');
  const [query, setQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const { data, loading, error, isDemo } = useAsyncData(
    () => bookService.list({ page, pageSize: PAGE_SIZE, language: language || undefined, search: searchTerm || undefined }),
    {
      items: DEMO_BOOKS,
      total: DEMO_BOOKS.length,
      page: 1,
      pageSize: PAGE_SIZE,
      hasMore: false,
    },
    [page, language, searchTerm]
  );

  const featured = useAsyncData(() => bookService.list({ featured: true, pageSize: 4 }), {
    items: DEMO_BOOKS.filter((b) => b.is_featured),
    total: 0, page: 1, pageSize: 4, hasMore: false,
  }, []);

  return (
    <>
      <PageMeta
        title="Books"
        description="Discover books across fiction, science, technology, history and more in the NEXORA digital library."
      />

      <section className="border-b border-line bg-surface/40">
        <div className="wrap py-14 sm:py-20">
          <p className="eyebrow mb-4">NEXORA Books</p>
          <h1 className="max-w-2xl text-3xl leading-tight sm:text-4xl lg:text-5xl">
            Discover Your Next Great Read
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted">
            Explore a world of books, ideas and knowledge in one place.
          </p>

          <form
            className="mt-8 flex max-w-xl flex-col gap-2.5 sm:flex-row"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setSearchTerm(query.trim());
            }}
          >
            <label htmlFor="book-search" className="sr-only">Search books</label>
            <input
              id="book-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by title, author or ISBN…"
              className="field h-12 flex-1"
            />
            <button type="submit" className="btn-primary h-12 px-6">Search</button>
          </form>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <ButtonLink to="/books" variant="ghost">Explore Library</ButtonLink>
          </div>
        </div>
      </section>

      <Section eyebrow="Featured" title="Featured books">
        {featured.loading ? (
          <SkeletonGrid count={4} />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featured.data.items.map((book) => (
              <BookCard key={book.id} book={book} to={`/books/${book.slug ?? book.id}`} />
            ))}
          </div>
        )}
      </Section>

      <Section
        id="library"
        eyebrow="Library"
        title="All books"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={`chip transition ${language === '' ? 'border-accent text-accent' : ''}`}
              onClick={() => { setLanguage(''); setPage(1); }}
            >
              All languages
            </button>
            {LANGUAGE_FILTERS.map((item) => (
              <button
                key={item}
                type="button"
                className={`chip transition ${language === item ? 'border-accent text-accent' : ''}`}
                onClick={() => { setLanguage(item); setPage(1); }}
              >
                {item}
              </button>
            ))}
          </div>
        }
      >
        {isDemo && <DemoNotice className="mb-8" />}

        {error && !loading && (
          <StateBlock tone="error" title="Could not load the library" message={error.message} />
        )}

        {loading && <SkeletonGrid count={8} />}

        {!loading && !error && data.items.length === 0 && (
          <StateBlock
            title="No books found"
            message={
              searchTerm || language
                ? 'Try clearing the filters or searching for a different title.'
                : 'Published books will appear here once they are added from the dashboard.'
            }
            action={
              (searchTerm || language) ? (
                <ButtonLink
                  variant="ghost"
                  onClick={() => { setSearchTerm(''); setQuery(''); setLanguage(''); setPage(1); }}
                >
                  Clear filters
                </ButtonLink>
              ) : undefined
            }
          />
        )}

        {!loading && data.items.length > 0 && (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {data.items.map((book) => (
                <BookCard key={book.id} book={book} to={`/books/${book.slug ?? book.id}`} />
              ))}
            </div>

            {!isDemo && (
              <nav className="mt-10 flex items-center justify-between gap-4" aria-label="Pagination">
                <button type="button" className="btn-ghost" onClick={() => setPage((v) => Math.max(1, v - 1))} disabled={page === 1}>
                  ← Previous
                </button>
                <span className="font-mono text-xs text-muted">Page {page}</span>
                <button type="button" className="btn-ghost" onClick={() => setPage((v) => v + 1)} disabled={!data.hasMore}>
                  Next →
                </button>
              </nav>
            )}
          </>
        )}
      </Section>
    </>
  );
}
