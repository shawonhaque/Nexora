import { Link } from 'react-router-dom';
import { EmptyState, Icon } from '../components/news/ArticleCard';
import { PageBody, PageHeader, SubHeading } from '../components/ui/PageHeader';
import { PageMeta } from '../components/layout/PageMeta';
import { usePersonalization } from '../hooks/usePersonalization';
import { CATEGORY_META } from '../services/newsService';
import { relativeTime } from '../lib/format';

/** Saved Articles. Persists to Supabase when signed in, localStorage otherwise. */
export default function Saved() {
  const { saved, unsaveArticle, mode } = usePersonalization();

  return (
    <>
      <PageMeta title="Saved Articles" description="Articles you have saved for later." noIndex />
      <PageHeader
        eyebrow="My library"
        title="Saved Articles"
        description="Everything you have bookmarked, with the original source linked."
        icon="bookmark"
        actions={
          <span className="chip">
            {mode === 'cloud' ? 'Synced to your account' : 'Stored in this browser'}
          </span>
        }
      />

      <PageBody className="space-y-6">
        {mode === 'local' && (
          <p className="rounded-xl border border-amber-500/35 bg-amber-500/5 px-4 py-3 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
            You are not signed in, so saves are kept in this browser only. Sign in to keep them across devices.
          </p>
        )}

        {!saved.length ? (
          <EmptyState
            title="No saved articles yet"
            message="Use the bookmark button on any article card to keep it here."
            action={
              <Link to="/explore" className="btn-primary mt-2">
                <Icon name="compass" className="h-4 w-4" /> Browse articles
              </Link>
            }
          />
        ) : (
          <section aria-label="Saved articles">
            <SubHeading title={`${saved.length} saved`} hint="Newest first." />
            <ul className="space-y-3">
              {saved.map((item) => (
                <li key={item.id} className="glass glass-hover flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <Link to={CATEGORY_META[item.category].path} className="chip-accent">
                        {CATEGORY_META[item.category].label}
                      </Link>
                      <span className="font-mono text-xs text-muted">{item.source}</span>
                      <span aria-hidden="true" className="text-muted">·</span>
                      <time className="text-xs text-muted" dateTime={item.savedAt}>
                        saved {relativeTime(item.savedAt)}
                      </time>
                    </div>
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold leading-snug text-heading transition hover:text-accent"
                    >
                      {item.title}
                    </a>
                    {item.summary && (
                      <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.summary}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => unsaveArticle(item.articleId)}
                    className="btn-quiet shrink-0 !py-2 text-xs"
                    aria-label={`Remove ${item.title} from saved articles`}
                  >
                    <Icon name="trash" className="h-4 w-4" /> Remove
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </PageBody>
    </>
  );
}
