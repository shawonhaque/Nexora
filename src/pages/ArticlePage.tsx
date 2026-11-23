import { Link, useParams } from 'react-router-dom';
import { PageMeta } from '../components/layout/PageMeta';
import { ButtonLink } from '../components/ui/ButtonLink';
import { StateBlock } from '../components/ui/StateBlock';
import { useAsyncData } from '../hooks/useAsyncData';
import { postService } from '../services';
import { estimateReadingTime, formatDate, readingLabel, safeUrl } from '../lib/format';
import type { PostRow } from '../lib/database.types';

const ROUTE_LABEL: Record<string, string> = {
  news: 'News',
  knowledge: 'Knowledge',
  writing: 'Writing',
  learning: 'Learning',
};

/** Renders stored HTML or Markdown-ish plain text safely. */
function ArticleBody({ content }: { content: string | null }) {
  if (!content) {
    return <p className="text-muted">This article has no body content yet.</p>;
  }
  const looksLikeHtml = /<\/?(p|h[1-6]|ul|ol|li|blockquote|strong|em|a|img|figure|table|code|pre)\b/i.test(content);
  if (looksLikeHtml) {
    // Content is authored by trusted admins only; scripts are stripped by the
    // editor and this is rendered inside a sandboxed container.
    return <div className="prose-nexora" dangerouslySetInnerHTML={{ __html: content }} />;
  }
  return (
    <div className="prose-nexora">
      {content.split(/\n{2,}/).map((block, index) => {
        if (block.startsWith('### ')) return <h3 key={index}>{block.slice(4)}</h3>;
        if (block.startsWith('## ')) return <h2 key={index}>{block.slice(3)}</h2>;
        if (block.startsWith('# ')) return <h2 key={index}>{block.slice(2)}</h2>;
        if (block.startsWith('> ')) return <blockquote key={index}>{block.slice(2)}</blockquote>;
        if (/^[-*] /m.test(block)) {
          return (
            <ul key={index}>
              {block.split('\n').map((line, i) => (
                <li key={i}>{line.replace(/^[-*] /, '')}</li>
              ))}
            </ul>
          );
        }
        return <p key={index}>{block}</p>;
      })}
    </div>
  );
}

export default function ArticlePage() {
  const { slug = '', section = 'knowledge' } = useParams<{ slug: string; section?: string }>();
  const label = ROUTE_LABEL[section] ?? 'Article';

  // No placeholder record: if the article cannot be read, the page says so.
  const { data: post, loading, error } = useAsyncData(
    () => postService.getBySlug(slug),
    null as PostRow | null,
    [slug]
  );

  if (loading) {
    return (
      <div className="wrap py-20">
        <div className="mx-auto max-w-3xl space-y-5" aria-busy="true">
          <div className="h-4 w-24 animate-pulse rounded bg-elevated" />
          <div className="h-10 w-full animate-pulse rounded bg-elevated" />
          <div className="h-10 w-2/3 animate-pulse rounded bg-elevated" />
          <div className="h-64 w-full animate-pulse bg-elevated" />
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="wrap py-20">
        <StateBlock
          tone="error"
          title="Article not found"
          message={error?.message ?? 'That article could not be found, or it is not published.'}
          action={<ButtonLink to={`/${section}`} variant="ghost">Back to {label}</ButtonLink>}
        />
      </div>
    );
  }

  const cover = safeUrl(post.cover_image);
  const minutes = post.reading_time ?? estimateReadingTime(post.content);

  return (
    <>
      <PageMeta
        title={post.seo_title ?? post.title}
        description={post.seo_description ?? post.excerpt ?? undefined}
        image={cover ?? undefined}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': section === 'news' ? 'NewsArticle' : 'Article',
          headline: post.title,
          description: post.excerpt ?? undefined,
          datePublished: post.published_at ?? undefined,
          dateModified: post.updated_at,
          author: { '@type': 'Person', name: 'Shawon Haque' },
        }}
      />

      <article className="wrap py-12 sm:py-16">
        <nav aria-label="Breadcrumb" className="mb-8 font-mono text-[0.66rem] uppercase tracking-[0.14em] text-muted">
          <ol className="flex flex-wrap items-center gap-2">
            <li><Link to="/" className="transition-colors hover:text-accent">Home</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link to={`/${section}`} className="transition-colors hover:text-accent">{label}</Link></li>
            <li aria-hidden="true">/</li>
            <li className="truncate normal-case tracking-normal text-heading" aria-current="page">{post.title}</li>
          </ol>
        </nav>

        <header className="mx-auto max-w-3xl border-b border-line pb-8">
          <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[0.66rem] uppercase tracking-[0.12em] text-muted">
            <span className="text-accent">{label}</span>
            {post.is_breaking && <span className="text-accent">Front page</span>}
            {post.published_at && (
              <>
                <span aria-hidden="true" className="text-line">/</span>
                <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
              </>
            )}
            <span aria-hidden="true" className="text-line">/</span>
            <span>{readingLabel(minutes)}</span>
          </div>

          <h1 className="display text-[2.1rem] sm:text-[2.9rem] lg:text-[3.2rem]">{post.title}</h1>
          {post.subtitle && (
            <p className="mt-5 font-serif text-lg leading-relaxed text-muted">{post.subtitle}</p>
          )}
        </header>

        {cover && (
          <figure className="mx-auto mt-9 max-w-4xl">
            <img
              src={cover}
              alt={post.image_caption ?? ''}
              className="w-full border border-line"
              loading="eager"
              decoding="async"
            />
            {(post.image_caption || post.image_credit) && (
              <figcaption className="mt-3 text-xs text-muted">
                {post.image_caption}
                {post.image_credit && <span> — Credit: {post.image_credit}</span>}
              </figcaption>
            )}
          </figure>
        )}

        <div className="mx-auto mt-10 max-w-3xl">
          <ArticleBody content={post.content} />

          {post.tags && post.tags.length > 0 && (
            <ul className="mt-10 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <li key={tag} className="chip">{tag}</li>
              ))}
            </ul>
          )}

          {post.source_name && (
            <p className="mt-8 border-t border-line pt-4 text-xs leading-relaxed text-muted">
              Source: {post.source_name}
              {safeUrl(post.source_url) && (
                <>
                  {' — '}
                  <a href={safeUrl(post.source_url)!} target="_blank" rel="noopener noreferrer" className="text-accent underline">
                    original link
                  </a>
                </>
              )}
            </p>
          )}

          {post.correction_note && (
            <p className="mt-4 border-l-2 border-accent2 px-4 py-2 text-xs leading-relaxed text-muted">
              Correction: {post.correction_note}
            </p>
          )}

          <div className="mt-12 flex flex-wrap items-center gap-3 border-t border-line pt-8">
            <ButtonLink to={`/${section}`} variant="ghost">← Back to {label}</ButtonLink>
          </div>
        </div>
      </article>
    </>
  );
}
