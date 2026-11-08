import { useState } from 'react';
import { PageMeta } from '../components/layout/PageMeta';
import { Section } from '../components/ui/Section';
import { ButtonLink } from '../components/ui/ButtonLink';
import { BackendNotice, SkeletonGrid, StateBlock } from '../components/ui/StateBlock';
import { PostCard } from '../components/content/Cards';
import { useAsyncData } from '../hooks/useAsyncData';
import { postService } from '../services';
import type { PostRow } from '../lib/database.types';

interface SectionPageProps {
  /** Value stored in posts.section, e.g. "knowledge". */
  section: string;
  eyebrow: string;
  title: string;
  description: string;
  /** Where each card links to, e.g. "/knowledge". */
  basePath: string;
  /** Optional intro paragraph shown under the heading. */
  intro?: string;
}

const PAGE_SIZE = 9;

/**
 * Shared list page used by News, Knowledge, Writing and Learning.
 * Filtering and pagination are applied in the database, not in the browser.
 */
export function SectionListPage({ section, eyebrow, title, description, basePath, intro }: SectionPageProps) {
  const [page, setPage] = useState(1);

  const { data, loading, error, notConfigured } = useAsyncData(
    () => postService.list({ section, page, pageSize: PAGE_SIZE }),
    { items: [] as PostRow[], total: 0, page: 1, pageSize: PAGE_SIZE, hasMore: false },
    [section, page]
  );

  const showEmpty = !loading && data.items.length === 0;

  return (
    <>
      <PageMeta title={title} description={description} />
      <Section eyebrow={eyebrow} title={title} description={intro ?? description} titleAs="h1">
        {notConfigured && <BackendNotice className="mb-8" />}

        {error && !loading && (
          <StateBlock
            tone="error"
            title="Could not load this section"
            message={error.message}
            action={<ButtonLink to="/" variant="ghost">Back to home</ButtonLink>}
          />
        )}

        {loading && <SkeletonGrid count={PAGE_SIZE} />}

        {showEmpty && !error && (
          <StateBlock
            title="Nothing published here yet"
            message="Published entries in this section will appear here as soon as they are added from the dashboard."
            action={<ButtonLink to="/" variant="ghost">Explore other sections</ButtonLink>}
          />
        )}

        {!loading && data.items.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((post) => (
              <PostCard key={post.id} post={post} to={`${basePath}/${post.slug}`} />
            ))}
          </div>
        )}

        {!notConfigured && (page > 1 || data.hasMore) && (
          <nav className="mt-10 flex items-center justify-between gap-4" aria-label="Pagination">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={page === 1}
            >
              ← Previous
            </button>
            <span className="font-mono text-xs text-muted">Page {page}</span>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setPage((value) => value + 1)}
              disabled={!data.hasMore}
            >
              Next →
            </button>
          </nav>
        )}
      </Section>
    </>
  );
}
