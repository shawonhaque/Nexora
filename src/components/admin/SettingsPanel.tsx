import { useCallback, useEffect, useState } from 'react';
import { Icon } from '../news/ArticleCard';
import { useAuth } from '../../context/AuthContext';
import { postService } from '../../services';
import { formatDateTime, relativeTime } from '../../lib/format';
import type { PostRow } from '../../lib/database.types';

/**
 * Admin settings panel.
 *
 * The only server-side action here is "publish due": GitHub Pages is static, so
 * there is no cron process to run on a schedule. Instead the action publishes
 * every draft whose scheduled time has passed, and the panel lists exactly what
 * is waiting so the state is never hidden. Triggering it is deliberate.
 */
export function SettingsPanel() {
  const { user, role } = useAuth();
  const [due, setDue] = useState<PostRow[]>([]);
  const [upcoming, setUpcoming] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await postService.listAllForAdmin();
    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }
    const now = Date.now();
    const scheduled = (result.data ?? []).filter(
      (post) => post.status === 'draft' && post.scheduled_at
    );
    setDue(scheduled.filter((post) => new Date(post.scheduled_at as string).getTime() <= now));
    setUpcoming(
      scheduled
        .filter((post) => new Date(post.scheduled_at as string).getTime() > now)
        .sort(
          (a, b) =>
            new Date(a.scheduled_at as string).getTime() - new Date(b.scheduled_at as string).getTime()
        )
    );
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function publishDue() {
    setRunning(true);
    setMessage(null);
    setError(null);
    const result = await postService.publishDue();
    setRunning(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    const count = result.data ?? 0;
    setMessage(
      count === 0
        ? 'Nothing was due. No scheduled draft has passed its time.'
        : `Published ${count} scheduled ${count === 1 ? 'entry' : 'entries'}.`
    );
    await load();
  }

  return (
    <div className="space-y-6">
      <section className="card p-5">
        <h2 className="text-lg font-semibold text-heading">Account</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-muted">Signed in as</dt>
            <dd className="mt-1 text-sm text-fg">{user?.email ?? '—'}</dd>
          </div>
          <div>
            <dt className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-muted">Role</dt>
            <dd className="mt-1 text-sm text-fg">
              <span className="chip">{role ?? 'unknown'}</span>
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-xs leading-relaxed text-muted">
          The role is read from the database-backed profiles table and enforced by Row Level Security on every
          write. Changing it in the browser would grant nothing.
        </p>
      </section>

      <section className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-heading">Scheduled publishing</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
              Drafts with a scheduled time are published when you run this action. It is manual because the site
              is served as static files with no server-side scheduler, and nothing here runs on its own.
            </p>
          </div>
          <button
            type="button"
            className="btn-primary shrink-0"
            onClick={() => void publishDue()}
            disabled={running || due.length === 0}
          >
            <Icon name="check" className="h-4 w-4" />
            {running ? 'Publishing…' : `Publish due (${due.length})`}
          </button>
        </div>

        {message && (
          <p role="status" className="mt-4 rounded-xl border border-emerald-500/35 bg-emerald-500/5 px-4 py-2.5 text-sm text-emerald-700 dark:text-emerald-300">
            {message}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-4 rounded-xl border border-red-500/35 bg-red-500/5 px-4 py-2.5 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        {loading ? (
          <p className="mt-4 text-sm text-muted" aria-live="polite">Checking scheduled drafts…</p>
        ) : (
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-heading">Due now ({due.length})</h3>
              {due.length === 0 ? (
                <p className="mt-2 text-xs text-muted">Nothing has passed its scheduled time.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {due.map((post) => (
                    <li key={post.id} className="rounded-xl border border-amber-500/35 bg-amber-500/5 px-3.5 py-2.5">
                      <p className="text-sm font-medium text-heading">{post.title}</p>
                      <p className="mt-0.5 font-mono text-xs text-muted">
                        {post.section} · due {formatDateTime(post.scheduled_at)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-heading">Scheduled later ({upcoming.length})</h3>
              {upcoming.length === 0 ? (
                <p className="mt-2 text-xs text-muted">No future scheduled drafts.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {upcoming.map((post) => (
                    <li key={post.id} className="rounded-xl border border-line bg-elevated/40 px-3.5 py-2.5">
                      <p className="text-sm font-medium text-heading">{post.title}</p>
                      <p className="mt-0.5 font-mono text-xs text-muted">
                        {post.section} · in {relativeTime(post.scheduled_at)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
