import { useParams } from 'react-router-dom';
import { PageMeta } from '../components/layout/PageMeta';
import { ButtonLink } from '../components/ui/ButtonLink';
import { StateBlock } from '../components/ui/StateBlock';
import { useAsyncData } from '../hooks/useAsyncData';
import { bookService } from '../services';
import { formatDate, safeUrl } from '../lib/format';
import type { BookRow } from '../lib/database.types';

const BOOK_TYPE = 'https://schema.org/Book';

export default function BookDetail() {
  const { slug = '' } = useParams<{ slug: string }>();
  const { data: book, loading, error } = useAsyncData(
    () => bookService.getBySlug(slug),
    null as BookRow | null,
    [slug]
  );

  if (loading) {
    return (
      <div className="wrap py-20" aria-busy="true">
        <div className="grid gap-10 lg:grid-cols-[280px_1fr]">
          <div className="aspect-[3/4] animate-pulse rounded-2xl bg-elevated" />
          <div className="space-y-4">
            <div className="h-9 w-3/4 animate-pulse rounded bg-elevated" />
            <div className="h-4 w-40 animate-pulse rounded bg-elevated" />
            <div className="h-32 w-full animate-pulse rounded bg-elevated" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="wrap py-20">
        <StateBlock
          tone="error"
          title="Book not found"
          message={error?.message ?? 'That book could not be found, or it is not published.'}
          action={<ButtonLink to="/books" variant="ghost">Back to library</ButtonLink>}
        />
      </div>
    );
  }

  const cover = safeUrl(book.cover_image);
  const external = safeUrl(book.external_url);
  const pdf = safeUrl(book.pdf_url);
  const canReadInline = book.file_visibility === 'public' && Boolean(pdf);

  return (
    <>
      <PageMeta
        title={book.title}
        description={book.description ?? `Details for ${book.title} in the NEXORA library.`}
        image={cover ?? undefined}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': BOOK_TYPE,
          name: book.title,
          author: book.author ? { '@type': 'Person', name: book.author } : undefined,
          isbn: book.isbn ?? undefined,
          numberOfPages: book.page_count ?? undefined,
          inLanguage: book.language ?? undefined,
          datePublished: book.publication_year ? String(book.publication_year) : undefined,
        }}
      />

      <article className="wrap py-12 sm:py-16">
        <nav aria-label="Breadcrumb" className="mb-8 text-sm text-muted">
          <ol className="flex flex-wrap items-center gap-2">
            <li><ButtonLink to="/" variant="quiet" className="!px-0">Home</ButtonLink></li>
            <li aria-hidden="true">/</li>
            <li><ButtonLink to="/books" variant="quiet" className="!px-0">Books</ButtonLink></li>
            <li aria-hidden="true">/</li>
            <li className="truncate text-heading" aria-current="page">{book.title}</li>
          </ol>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[300px_1fr]">
          <div>
            {cover ? (
              <img
                src={cover}
                alt={`Cover of ${book.title}`}
                className="w-full rounded-2xl border border-line shadow-lift"
                loading="eager"
                decoding="async"
              />
            ) : (
              <div
                className="grid aspect-[3/4] place-items-center rounded-2xl border border-line bg-elevated p-6 text-center"
                aria-hidden="true"
              >
                <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
                  {book.title}
                </span>
              </div>
            )}

          </div>

          <div>
            <h1 className="text-3xl leading-tight sm:text-4xl">{book.title}</h1>
            {book.subtitle && <p className="mt-3 text-lg text-muted">{book.subtitle}</p>}
            {book.author && <p className="mt-3 text-base text-muted">by {book.author}</p>}

            <dl className="mt-8 grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {[
                ['Category', book.category_id ? 'See category' : null],
                ['Publisher', book.publisher],
                ['Publication year', book.publication_year ? String(book.publication_year) : null],
                ['Language', book.language],
                ['ISBN', book.isbn],
                ['Pages', book.page_count ? String(book.page_count) : null],
                ['Edition', book.edition],
                ['Format', book.format],
                ['Rating', typeof book.rating === 'number' ? `${book.rating.toFixed(1)} / 5` : null],
              ]
                .filter(([, value]) => Boolean(value))
                .map(([label, value]) => (
                  <div key={label as string} className="border-b border-line pb-3">
                    <dt className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-muted">{label}</dt>
                    <dd className="mt-1 text-sm text-heading">{value}</dd>
                  </div>
                ))}
            </dl>

            {book.description && (
              <div className="prose-nexora mt-9">
                <h2>About this book</h2>
                <p>{book.description}</p>
              </div>
            )}

            {book.review && (
              <div className="prose-nexora mt-8">
                <h2>Review</h2>
                <p>{book.review}</p>
              </div>
            )}

            <div className="mt-10 flex flex-wrap items-center gap-3">
              {canReadInline && pdf && (
                <>
                  <ButtonLink to={`/books/${book.slug ?? book.id}/read`} variant="primary">
                    Read Book
                  </ButtonLink>
                  <ButtonLink href={pdf} variant="ghost">Download PDF</ButtonLink>
                </>
              )}
              {!canReadInline && pdf && book.file_visibility === 'restricted' && (
                <p className="rounded-xl border border-line bg-surface px-4 py-3 text-xs text-muted">
                  This file is restricted. Sign in with an authorised account to request access.
                </p>
              )}
              {external && (
                <ButtonLink href={external} variant={canReadInline ? 'ghost' : 'primary'}>
                  View external listing
                </ButtonLink>
              )}
              {!canReadInline && !external && (
                <p className="rounded-xl border border-line bg-surface px-4 py-3 text-xs text-muted">
                  No readable file or external link has been added for this book yet.
                </p>
              )}
              <ButtonLink to="/books" variant="quiet">← Back to library</ButtonLink>
            </div>

            {book.published_at && (
              <p className="mt-6 text-xs text-muted">Added {formatDate(book.published_at)}</p>
            )}
          </div>
        </div>
      </article>
    </>
  );
}
