import { Link } from 'react-router-dom';
import type { BookRow, CategoryRow, IdeaRow, PostRow, StudyResourceRow, BookmarkRow } from '../../lib/database.types';
import { formatDate, readingLabel, safeUrl, truncate } from '../../lib/format';

/** Deterministic gradient placeholder so cards look intentional without images. */
function Cover({ url, label, ratio = 'aspect-[16/10]' }: { url: string | null; label: string; ratio?: string }) {
  const src = safeUrl(url);
  const seed = label.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hue = seed % 360;
  if (src) {
    return (
      <div className={`${ratio} overflow-hidden bg-elevated`}>
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
        />
      </div>
    );
  }
  return (
    <div
      className={`${ratio} flex items-center justify-center bg-elevated`}
      style={{ backgroundImage: `linear-gradient(135deg, hsl(${hue} 62% 26% / 0.55), hsl(${(hue + 48) % 360} 58% 20% / 0.55))` }}
      aria-hidden="true"
    >
      <span className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-white/70">
        {label.split(/\s+/).slice(0, 2).join(' ')}
      </span>
    </div>
  );
}

export function PostCard({ post, to, showSection = false }: { post: PostRow; to: string; showSection?: boolean }) {
  return (
    <article className="card card-hover group flex h-full flex-col overflow-hidden">
      <Link to={to} className="block">
        <Cover url={post.cover_image} label={post.section} />
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted">
          {showSection && <span className="chip">{post.section}</span>}
          {post.is_breaking && <span className="chip border-red-500/50 text-red-500">Breaking</span>}
          {post.published_at && <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>}
          {post.reading_time ? <span aria-hidden="true">·</span> : null}
          {post.reading_time ? <span>{readingLabel(post.reading_time)}</span> : null}
        </div>
        <h3 className="mb-2 text-lg leading-snug">
          <Link to={to} className="transition hover:text-accent">
            {post.title}
          </Link>
        </h3>
        {post.excerpt && <p className="mb-4 text-sm leading-relaxed text-muted">{truncate(post.excerpt, 140)}</p>}
        <span className="mt-auto text-sm font-semibold text-accent">
          Read more <span aria-hidden="true">→</span>
        </span>
      </div>
    </article>
  );
}

export function BookCard({ book, to }: { book: BookRow; to: string }) {
  return (
    <article className="card card-hover group flex h-full flex-col overflow-hidden">
      <Link to={to} className="block">
        <Cover url={book.cover_image} label={book.title} ratio="aspect-[3/4]" />
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="mb-1 text-base leading-snug">
          <Link to={to} className="transition hover:text-accent">
            {book.title}
          </Link>
        </h3>
        {book.author && <p className="mb-2 text-sm text-muted">by {book.author}</p>}
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted">
          {book.language && <span className="chip">{book.language}</span>}
          {book.publication_year && <span>{book.publication_year}</span>}
          {typeof book.rating === 'number' && (
            <span className="ml-auto font-mono text-amber-500" aria-label={`Rating ${book.rating} out of 5`}>
              ★ {book.rating.toFixed(1)}
            </span>
          )}
        </div>
        <span className="mt-auto text-sm font-semibold text-accent">
          View book <span aria-hidden="true">→</span>
        </span>
      </div>
    </article>
  );
}

export function ResourceCard({ resource, to }: { resource: StudyResourceRow; to: string }) {
  return (
    <article className="card card-hover group flex h-full flex-col overflow-hidden">
      <Link to={to} className="block">
        <Cover url={resource.cover_image} label={resource.resource_type ?? 'Study'} />
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted">
          {resource.resource_type && <span className="chip">{resource.resource_type}</span>}
          {resource.subject && <span>{resource.subject}</span>}
        </div>
        <h3 className="mb-2 text-base leading-snug">
          <Link to={to} className="transition hover:text-accent">
            {resource.title}
          </Link>
        </h3>
        {resource.description && (
          <p className="mb-4 text-sm leading-relaxed text-muted">{truncate(resource.description, 120)}</p>
        )}
        <span className="mt-auto text-sm font-semibold text-accent">
          Open resource <span aria-hidden="true">→</span>
        </span>
      </div>
    </article>
  );
}

export function CategoryCard({ category, count }: { category: CategoryRow; count?: number }) {
  const seed = category.name.charCodeAt(0);
  return (
    <Link
      to={`/${category.section}`}
      className="card card-hover group flex flex-col gap-3 p-6"
    >
      <span
        className="grid h-11 w-11 place-items-center rounded-xl font-mono text-lg text-white"
        style={{ backgroundImage: `linear-gradient(135deg, hsl(${seed * 7 % 360} 65% 42%), hsl(${(seed * 7 + 55) % 360} 62% 34%))` }}
        aria-hidden="true"
      >
        {category.name.slice(0, 1)}
      </span>
      <h3 className="text-base">{category.name}</h3>
      {category.description && <p className="text-sm leading-relaxed text-muted">{truncate(category.description, 90)}</p>}
      <span className="mt-auto text-sm font-semibold text-accent">
        {typeof count === 'number' ? `${count} item${count === 1 ? '' : 's'}` : 'Explore'} <span aria-hidden="true">→</span>
      </span>
    </Link>
  );
}

export function IdeaCard({ idea }: { idea: IdeaRow }) {
  return (
    <article className="card flex h-full flex-col gap-3 p-6">
      <div className="flex items-center gap-2 text-xs text-muted">
        <span className="chip">Idea</span>
        <time dateTime={idea.created_at}>{formatDate(idea.created_at)}</time>
      </div>
      <h3 className="text-base leading-snug">{idea.title}</h3>
      {idea.description && <p className="text-sm leading-relaxed text-muted">{idea.description}</p>}
      {idea.tags && idea.tags.length > 0 && (
        <ul className="mt-auto flex flex-wrap gap-2">
          {idea.tags.map((tag) => (
            <li key={tag} className="chip">
              {tag}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

export function BookmarkCard({ bookmark }: { bookmark: BookmarkRow }) {
  const href = safeUrl(bookmark.url);
  return (
    <article className="card flex h-full flex-col gap-3 p-6">
      <div className="flex items-center gap-2 text-xs text-muted">
        {bookmark.category && <span className="chip">{bookmark.category}</span>}
      </div>
      <h3 className="text-base leading-snug">{bookmark.title}</h3>
      {bookmark.description && <p className="text-sm leading-relaxed text-muted">{bookmark.description}</p>}
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto break-all text-sm font-semibold text-accent"
        >
          Visit <span aria-hidden="true">→</span>
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      )}
    </article>
  );
}
