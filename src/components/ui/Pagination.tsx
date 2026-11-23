import { useMemo, useRef } from 'react';
import { Icon } from '../news/ArticleCard';

/**
 * Builds the page numbers to show: always the first and last page, plus a
 * window around the current one, with gaps collapsed to an ellipsis.
 */
function pageItems(current: number, total: number): (number | 'gap')[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);

  const items: (number | 'gap')[] = [];
  let previous = 0;
  for (const page of sorted) {
    if (previous && page - previous > 1) items.push('gap');
    items.push(page);
    previous = page;
  }
  return items;
}

export interface PaginationProps {
  /** 1-based current page. */
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  /** Plural noun for the range summary, e.g. "articles". */
  noun?: string;
  className?: string;
}

/**
 * Numbered pagination. The range summary states exactly which slice of the
 * results is on screen, so the count can never disagree with the cards.
 */
export function Pagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
  noun = 'articles',
  className = '',
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const items = useMemo(() => pageItems(safePage, totalPages), [safePage, totalPages]);
  const navRef = useRef<HTMLElement>(null);

  // Changing page swaps the cards above this control, so bring that block back
  // into view instead of leaving the reader at the bottom of the old page.
  const goTo = (next: number) => {
    onPageChange(next);
    const section = navRef.current?.closest('section');
    if (!section) return;
    const top = section.getBoundingClientRect().top + window.scrollY - 88;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  if (totalItems === 0) return null;

  const first = (safePage - 1) * pageSize + 1;
  const last = Math.min(safePage * pageSize, totalItems);

  return (
    <nav
      ref={navRef}
      className={`mt-10 flex flex-col items-center gap-4 ${className}`}
      aria-label="Pagination"
    >
      <p className="font-mono text-xs text-muted">
        {`Showing ${first}–${last} of ${totalItems} ${noun}`}
      </p>

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <button
            type="button"
            className="btn-ghost !px-3 !py-2 text-xs"
            onClick={() => goTo(safePage - 1)}
            disabled={safePage === 1}
            aria-label="Previous page"
          >
            <Icon name="chevron-left" className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Previous</span>
          </button>

          {items.map((item, index) =>
            item === 'gap' ? (
              <span key={`gap-${index}`} className="px-1 font-mono text-xs text-muted" aria-hidden="true">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => goTo(item)}
                aria-current={item === safePage ? 'page' : undefined}
                aria-label={`Page ${item}`}
                className={
                  item === safePage
                    ? 'min-w-9 rounded-lg border border-accent/50 bg-accent/15 px-2.5 py-2 font-mono text-xs font-bold text-accent'
                    : 'min-w-9 rounded-lg border border-line px-2.5 py-2 font-mono text-xs text-muted transition hover:border-accent/40 hover:text-accent'
                }
              >
                {item}
              </button>
            )
          )}

          <button
            type="button"
            className="btn-ghost !px-3 !py-2 text-xs"
            onClick={() => goTo(safePage + 1)}
            disabled={safePage === totalPages}
            aria-label="Next page"
          >
            <span className="hidden sm:inline">Next</span>
            <Icon name="chevron-right" className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </nav>
  );
}
