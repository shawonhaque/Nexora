import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { NewsArticle } from '../../lib/newsTypes';
import { CATEGORY_META } from '../../services/newsService';
import { relativeTime, safeUrl, truncate } from '../../lib/format';
import { usePersonalization } from '../../hooks/usePersonalization';

export type IconName =
  | 'globe' | 'chip' | 'brain' | 'flask' | 'book' | 'chart'
  | 'search' | 'bookmark' | 'clock' | 'bell' | 'user' | 'settings'
  | 'refresh' | 'external' | 'check' | 'sparkle' | 'trend' | 'plus'
  | 'sun' | 'moon' | 'menu' | 'close' | 'arrow-right' | 'filter' | 'trash'
  | 'compass' | 'shield' | 'chevron-left' | 'chevron-right';

const ICON_PATHS: Record<IconName, JSX.Element> = {
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z" /></>,
  chip: <><rect x="7" y="7" width="10" height="10" rx="2" /><path d="M4 10h3M4 14h3M17 10h3M17 14h3M10 4v3M14 4v3M10 17v3M14 17v3" /></>,
  brain: <><path d="M12 5a3 3 0 0 0-6 0v1a3 3 0 0 0-1 5.8V14a3 3 0 0 0 3 3h1a2 2 0 0 0 3-1.7V5Z" /><path d="M12 5a3 3 0 0 1 6 0v1a3 3 0 0 1 1 5.8V14a3 3 0 0 1-3 3h-1a2 2 0 0 1-3-1.7V5Z" /></>,
  flask: <><path d="M9 3h6M10 3v6L5 19a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 19L14 9V3" /><path d="M7.5 14h9" /></>,
  book: <><path d="M4 5a2 2 0 0 1 2-2h11v18H6a2 2 0 0 0-2 2V5Z" /><path d="M17 3v18" /></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  bookmark: <path d="M6 4h12v17l-6-4-6 4V4Z" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  bell: <><path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6Z" /><path d="M10.5 20a2 2 0 0 0 3 0" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></>,
  refresh: <><path d="M20 11a8 8 0 1 0-2.3 5.7" /><path d="M20 5v6h-6" /></>,
  external: <><path d="M14 4h6v6" /><path d="M20 4 10 14" /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></>,
  check: <path d="m5 13 4 4L19 7" />,
  sparkle: <><path d="M12 3v5M12 16v5M3 12h5M16 12h5" /><path d="m6.5 6.5 3 3M14.5 14.5l3 3M17.5 6.5l-3 3M9.5 14.5l-3 3" /></>,
  trend: <><path d="m3 17 6-6 4 4 8-8" /><path d="M17 7h4v4" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  sun: <><circle cx="12" cy="12" r="4.2" /><path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" /></>,
  moon: <path d="M20 14.4A8.5 8.5 0 1 1 9.6 4a6.8 6.8 0 0 0 10.4 10.4Z" />,
  menu: <path d="M3.5 7h17M3.5 12h17M3.5 17h17" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  'arrow-right': <path d="M5 12h14M13 6l6 6-6 6" />,
  filter: <path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z" />,
  trash: <><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></>,
  compass: <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" /></>,
  shield: <path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3Z" />,
  'chevron-left': <path d="M15 18 9 12l6-6" />,
  'chevron-right': <path d="m9 18 6-6-6-6" />,
};

/** Inline SVG icon set, so no icon library is shipped. */
export function Icon({ name, className = 'h-4 w-4' }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICON_PATHS[name]}
    </svg>
  );
}

/** Category label. A rule and a word, not a pill. */
export function CategoryTag({ category }: { category: NewsArticle['category'] }) {
  const meta = CATEGORY_META[category];
  return (
    <Link
      to={meta.path}
      className="inline-flex items-center gap-1.5 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-accent transition-colors hover:text-heading"
    >
      <span aria-hidden="true" className="h-px w-3 bg-accent" />
      {meta.label}
    </Link>
  );
}

/**
 * One article card.
 *
 * Three shapes, chosen by the caller so a page can build a magazine rhythm
 * instead of an even grid:
 *  - `featured` — large image on top, oversized serif headline.
 *  - `standard` — image, headline, summary.
 *  - `text` — no image at all; a rule, a headline and a byline. Used where
 *    the publisher supplied no image, and for secondary items in a column.
 *
 * Source, timestamp and summary all come from the publisher. The save
 * control writes to the personalisation store.
 */
export function ArticleCard({
  article,
  variant = 'standard',
}: {
  article: NewsArticle;
  variant?: 'featured' | 'standard' | 'text';
}) {
  const { isSaved, saveArticle, unsaveArticle, recordView } = usePersonalization();
  const saved = isSaved(article.id);
  const image = safeUrl(article.image);
  const isFeatured = variant === 'featured';
  // A wordmark or banner is much wider than a photograph. Cropping one into a
  // 16:9 frame eats the middle of the name, so wide art is dropped entirely and
  // the card falls back to its text shape.
  const [wideArt, setWideArt] = useState(false);
  const showImage = Boolean(image) && variant !== 'text' && !wideArt;

  function toggleSave(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (saved) {
      unsaveArticle(article.id);
    } else {
      saveArticle({
        articleId: article.id,
        title: article.title,
        link: article.link,
        source: article.source,
        category: article.category,
        summary: article.summary,
      });
    }
  }

  /** Opening an article records it in reading history. */
  function onOpen() {
    recordView({
      articleId: article.id,
      title: article.title,
      link: article.link,
      source: article.source,
      category: article.category,
    });
  }

  const headline = isFeatured
    ? 'display text-[1.9rem] sm:text-[2.5rem] lg:text-[2.85rem]'
    : variant === 'text'
      ? 'font-serif text-[1.04rem] font-medium leading-snug text-heading'
      : 'font-serif text-[1.2rem] font-semibold leading-snug text-heading';

  return (
    <article
      className={`group flex flex-col ${
        variant === 'text' ? 'border-t border-line pt-4' : 'border border-line bg-surface'
      } ${isFeatured ? 'border-0 bg-transparent' : ''}`}
    >
      {showImage && (
        <div className={`overflow-hidden bg-elevated ${isFeatured ? 'aspect-[16/9]' : 'aspect-[16/10]'}`}>
          <img
            src={image ?? undefined}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
            onLoad={(event) => {
              const { naturalWidth, naturalHeight } = event.currentTarget;
              if (naturalHeight > 0 && naturalWidth / naturalHeight > 2.2) setWideArt(true);
            }}
            onError={(event) => {
              // Publisher images occasionally 404; drop the frame rather than
              // leaving a broken-image icon in the layout.
              const frame = event.currentTarget.parentElement;
              if (frame) frame.style.display = 'none';
            }}
          />
        </div>
      )}

      <div className={variant === 'text' ? 'flex flex-1 flex-col gap-2' : 'flex flex-1 flex-col gap-3 p-4 sm:p-5'}>
        <div className="flex items-center justify-between gap-3">
          <CategoryTag category={article.category} />
          <button
            type="button"
            onClick={toggleSave}
            aria-pressed={saved}
            aria-label={saved ? 'Remove from saved articles' : 'Save this article'}
            title={saved ? 'Saved' : 'Save for later'}
            className={`grid h-7 w-7 shrink-0 place-items-center border transition-colors ${
              saved
                ? 'border-accent text-accent'
                : 'border-transparent text-muted/70 hover:border-line hover:text-accent'
            }`}
          >
            <Icon name="bookmark" className="h-3.5 w-3.5" />
          </button>
        </div>

        <h3 className={headline}>
          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-accent"
            onClick={onOpen}
          >
            {article.title}
          </a>
        </h3>

        {article.summary && variant !== 'text' && (
          <p className={`leading-relaxed text-muted ${isFeatured ? 'max-w-2xl text-[0.98rem]' : 'text-sm'}`}>
            {truncate(article.summary, isFeatured ? 240 : 150)}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-x-2.5 gap-y-1 pt-1.5 font-mono text-[0.66rem] uppercase tracking-[0.1em] text-muted">
          <span className="font-sans font-semibold normal-case tracking-normal text-fg">{article.source}</span>
          {article.publishedAt && (
            <>
              <span aria-hidden="true" className="text-line">/</span>
              <time dateTime={article.publishedAt}>{relativeTime(article.publishedAt)}</time>
            </>
          )}
          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1 text-accent hover:text-heading"
            onClick={onOpen}
          >
            Read <Icon name="external" className="h-3 w-3" />
          </a>
        </div>
      </div>
    </article>
  );
}

/** Skeleton placeholder matching the article card layout. */
export function ArticleSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="border border-line bg-surface">
          <div className="skeleton aspect-[16/10]" />
          <div className="space-y-3 p-5">
            <div className="skeleton h-3 w-24" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-4/5" />
            <div className="skeleton h-2.5 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Small hand-drawn marks for empty and error states. Deliberately rough:
 * slightly uneven strokes, no symmetry. An illustration that looks drawn
 * beats an icon that looks generated.
 */
function EmptyMark({ kind }: { kind: 'empty' | 'error' }) {
  return (
    <svg
      viewBox="0 0 96 72"
      className="h-16 w-auto text-line"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {kind === 'error' ? (
        <>
          <path d="M14 58c4-1 8-1 12 0M70 58c4-1 8-1 12 0" />
          <path d="M30 18 48 50l18-32" stroke="rgb(var(--c-accent))" />
          <path d="M24 12c14 3 30 3 46-1" opacity="0.55" />
          <path d="M41 33c4-2 9-2 13 1" stroke="rgb(var(--c-accent))" />
        </>
      ) : (
        <>
          {/* an open, mostly empty page */}
          <path d="M20 14c10-2 20-2 28 2v44c-8-4-18-4-28-2V14Z" />
          <path d="M76 14c-10-2-20-2-28 2v44c8-4 18-4 28-2V14Z" />
          <path d="M30 28h10M30 37h13M56 30h10" opacity="0.5" />
          <path d="M56 40c3-3 7-3 10 0" stroke="rgb(var(--c-accent))" />
        </>
      )}
    </svg>
  );
}

/** Error state that always offers a retry, used across every data page. */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-start gap-4 border-l-2 border-accent bg-surface px-6 py-10">
      <EmptyMark kind="error" />
      <div>
        <h3 className="font-serif text-lg text-heading">That did not come through</h3>
        <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted">{message}</p>
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-ghost">
          <Icon name="refresh" className="h-4 w-4" /> Try that again
        </button>
      )}
    </div>
  );
}

/** Empty state for a filter or search that matched nothing. */
export function EmptyState({ title, message, action }: { title: string; message: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-4 border-t border-line px-2 py-14">
      <EmptyMark kind="empty" />
      <div>
        <h3 className="font-serif text-lg text-heading">{title}</h3>
        <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted">{message}</p>
      </div>
      {action}
    </div>
  );
}
