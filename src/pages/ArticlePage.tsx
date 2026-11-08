import { Link, useParams } from 'react-router-dom';
import { PageMeta } from '../components/layout/PageMeta';
import { ButtonLink } from '../components/ui/ButtonLink';
import { StateBlock } from '../components/ui/StateBlock';
import { useAsyncData } from '../hooks/useAsyncData';
import { postService } from '../services';
import { DEMO_POSTS } from '../data/demo';
import { estimateReadingTime, formatDate, readingLabel, safeUrl } from '../lib/format';

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

  const fallback = DEMO_POSTS.find((post) => post.slug === slug) ?? DEMO_POSTS[0];

  const { data: post, loading, error, isDemo } = useAsyncData(
    () => postService.getBySlug(slug),
    fallback,
    [slug]
  );

  if (loading) {
    return (
      <div className="wrap py-20">
        <div className="mx-auto max-w-3xl space-y-5" aria-busy="true">
          <div className="h-4 w-24 animate-pulse rounded bg-elevated" />
          <div className="h-10 w-full animate-pulse rounded bg-elevated" />
          <div className="h-10 w-2/3 animate-pulse rounded bg-elevated" />
          <div className="h-64 w-full animate-pulse rounded-2xl bg-elevated" />
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
        <nav aria-label="Breadcrumb" className="mb-7 text-sm text-muted">
          <ol className="flex flex-wrap items-center gap-2">
            <li><Link to="/" className="transition hover:text-accent">Home</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link to={`/${section}`} className="transition hover:text-accent">{label}</Link></li>
            <li aria-hidden="true">/</li>
            <li className="truncate text-heading" aria-current="page">{post.title}</li>
          </ol>
        </nav>

        <header className="mx-auto max-w-3xl">
          <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-muted">
            <span className="chip">{section}</span>
            {post.is_breaking && <span className="chip border-red-500/50 text-red-500">Breaking</span>}
            {post.published_at && (
              <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
            )}
            <span aria-hidden="true">·</span>
            <span>{readingLabel(minutes)}</span>
          </div>

          <h1 className="text-3xl leading-tight sm:text-4xl lg:text-[2.7rem]">{post.title}</h1>
          {post.subtitle && <p className="mt-4 text-lg leading-relaxed text-muted">{post.subtitle}</p>}
          {isDemo && (
            <p className="mt-5 rounded-xl border border-amber-500/35 bg-amber-500/5 px-4 py-3 text-xs text-amber-600 dark:text-amber-300">
              <strong className="font-semibold">Demo article.</strong> Placeholder text for layout preview only.
            </p>
          )}
        </header>

        {cover && (
          <figure className="mx-auto mt-9 max-w-4xl">
            <img
              src={cover}
              alt={post.image_caption ?? ''}
              className="w-full rounded-2xl border border-line"
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
            <p className="mt-8 rounded-xl border border-line bg-surface px-4 py-3 text-xs text-muted">
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
            <p className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-xs text-amber-600 dark:text-amber-300">
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
