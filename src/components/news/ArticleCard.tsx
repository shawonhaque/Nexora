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
  | 'compass' | 'shield';

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

/** Category pill linking to that section. */
export function CategoryTag({ category }: { category: NewsArticle['category'] }) {
  const meta = CATEGORY_META[category];
  return (
    <Link
      to={meta.path}
      className="inline-flex items-center rounded-full border border-accent/35 bg-accent/10 px-2.5 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide text-accent transition hover:bg-accent/20"
    >
      {meta.label}
    </Link>
  );
}

/**
 * One article card. Source, timestamp and summary all come from the publisher.
 * The save control writes to the personalisation store.
 */
export function ArticleCard({ article, compact = false }: { article: NewsArticle; compact?: boolean }) {
  const { isSaved, saveArticle, unsaveArticle, recordView } = usePersonalization();
  const saved = isSaved(article.id);
  const image = safeUrl(article.image);

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

  return (
    <article className="glass glass-hover group flex flex-col overflow-hidden">
      {image && !compact && (
        <div className="aspect-[16/9] w-full overflow-hidden bg-elevated">
          <img
            src={image}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
            onError={(event) => {
              // Publisher images occasionally 404; drop the frame rather than
              // leaving a broken-image icon in the layout.
              const frame = event.currentTarget.parentElement;
              if (frame) frame.style.display = 'none';
            }}
          />
        </div>
      )}

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-3">
          <CategoryTag category={article.category} />
          <button
            type="button"
            onClick={toggleSave}
            aria-pressed={saved}
            aria-label={saved ? 'Remove from saved articles' : 'Save this article'}
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border transition ${
              saved
                ? 'border-accent bg-accent/15 text-accent'
                : 'border-line text-muted hover:border-accent/50 hover:text-accent'
            }`}
          >
            <Icon name="bookmark" className="h-4 w-4" />
          </button>
        </div>

        <h3 className="text-[1.02rem] font-semibold leading-snug text-heading">
          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="transition hover:text-accent"
            onClick={onOpen}
          >
            {article.title}
          </a>
        </h3>

        {article.summary && !compact && (
          <p className="text-sm leading-relaxed text-muted">{truncate(article.summary, 170)}</p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-xs text-muted">
          <span className="font-medium text-fg">{article.source}</span>
          {article.publishedAt && (
            <>
              <span aria-hidden="true">·</span>
              <time dateTime={article.publishedAt}>{relativeTime(article.publishedAt)}</time>
            </>
          )}
          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1 font-medium text-accent hover:underline"
            onClick={onOpen}
          >
            Read <Icon name="external" className="h-3.5 w-3.5" />
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
        <div key={index} className="glass overflow-hidden">
          <div className="skeleton aspect-[16/9] rounded-none" />
          <div className="space-y-3 p-5">
            <div className="skeleton h-5 w-24" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-4/5" />
            <div className="skeleton h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Error state that always offers a retry, used across every data page. */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="glass flex flex-col items-center gap-3 border-red-500/40 bg-red-500/5 px-6 py-12 text-center">
      <div className="text-2xl text-red-400" aria-hidden="true">⚠</div>
      <h3 className="text-base font-semibold">This content could not be loaded</h3>
      <p className="max-w-md text-sm leading-relaxed text-muted">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-ghost mt-2">
          <Icon name="refresh" className="h-4 w-4" /> Try again
        </button>
      )}
    </div>
  );
}

/** Empty state for a filter or search that matched nothing. */
export function EmptyState({ title, message, action }: { title: string; message: string; action?: React.ReactNode }) {
  return (
    <div className="glass flex flex-col items-center gap-3 px-6 py-14 text-center">
      <div className="text-2xl text-muted" aria-hidden="true">
        <Icon name="compass" className="h-7 w-7" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="max-w-md text-sm leading-relaxed text-muted">{message}</p>
      {action}
    </div>
  );
}
