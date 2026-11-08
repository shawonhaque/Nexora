import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { PageMeta } from '../components/layout/PageMeta';
import { useAuth } from '../context/AuthContext';
import { useAsyncData } from '../hooks/useAsyncData';
import { postService, bookService, studyService, categoryService } from '../services';
import { formatDateTime } from '../lib/format';
import type { BookRow, CategoryRow, PostRow, StudyResourceRow } from '../lib/database.types';

const ADMIN_SECTIONS = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/news', label: 'News' },
  { to: '/admin/books', label: 'Books' },
  { to: '/admin/study', label: 'Study' },
  { to: '/admin/knowledge', label: 'Knowledge' },
  { to: '/admin/writing', label: 'Writing' },
  { to: '/admin/ideas', label: 'Ideas' },
  { to: '/admin/bookmarks', label: 'Bookmarks' },
  { to: '/admin/diary', label: 'Private Diary' },
  { to: '/admin/categories', label: 'Categories' },
  { to: '/admin/settings', label: 'Settings' },
];

interface StatCardProps {
  label: string;
  value: number | null;
  hint?: string;
}

function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="card p-5">
      <p className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-heading">
        {value === null ? <span className="text-base text-muted">Unavailable</span> : value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

/** Content management table reused across admin sections. */
function ContentTable({ title, section }: { title: string; section?: string }) {
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');

  const { data, loading, error, reload } = useAsyncData(
    () => postService.listForAdmin({ section, status: filter === 'all' ? undefined : filter, pageSize: 50 }),
    {
      items: [] as PostRow[],
      total: 0, page: 1, pageSize: 50, hasMore: false,
    },
    [section, filter]
  );

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <h2 className="text-base">{title}</h2>
        <div className="flex items-center gap-2">
          {(['all', 'published', 'draft'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`chip transition ${filter === value ? 'border-accent text-accent' : ''}`}
            >
              {value}
            </button>
          ))}
          <button type="button" className="btn-quiet !py-1.5 text-xs" onClick={reload}>
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <p className="border-b border-line px-5 py-3 text-xs text-red-500">{error.message}</p>
      )}

      {loading ? (
        <p className="px-5 py-8 text-sm text-muted" aria-live="polite">Loading…</p>
      ) : data.items.length === 0 ? (
        <p className="px-5 py-8 text-sm text-muted">No records to show.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-elevated text-xs uppercase tracking-wider text-muted">
              <tr>
                <th scope="col" className="px-5 py-3 font-medium">Title</th>
                <th scope="col" className="px-5 py-3 font-medium">Section</th>
                <th scope="col" className="px-5 py-3 font-medium">Status</th>
                <th scope="col" className="px-5 py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((post) => (
                <tr key={post.id} className="border-t border-line">
                  <td className="px-5 py-3">
                    <Link to={`/${post.section}/${post.slug}`} className="font-medium text-heading transition hover:text-accent">
                      {post.title}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-muted">{post.section}</td>
                  <td className="px-5 py-3">
                    <span className="chip">{post.status}</span>
                  </td>
                  <td className="px-5 py-3 text-muted">{formatDateTime(post.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function Admin() {
  const { user } = useAuth();

  const posts = useAsyncData(() => postService.listForAdmin({ pageSize: 1 }), { items: [] as PostRow[], total: 0, page: 1, pageSize: 1, hasMore: false }, []);
  const published = useAsyncData(() => postService.listForAdmin({ status: 'published', pageSize: 1 }), { items: [], total: 0, page: 1, pageSize: 1, hasMore: false }, []);
  const drafts = useAsyncData(() => postService.listForAdmin({ status: 'draft', pageSize: 1 }), { items: [], total: 0, page: 1, pageSize: 1, hasMore: false }, []);
  const books = useAsyncData(() => bookService.listForAdmin({ pageSize: 1 }), { items: [] as BookRow[], total: 0, page: 1, pageSize: 1, hasMore: false }, []);
  const study = useAsyncData(() => studyService.list({ pageSize: 1 }), { items: [] as StudyResourceRow[], total: 0, page: 1, pageSize: 1, hasMore: false }, []);
  const categories = useAsyncData(() => categoryService.list(), [] as CategoryRow[], []);

  const stats = [
    { label: 'Total posts', value: posts.data.total || null },
    { label: 'Published', value: published.data.total || null },
    { label: 'Drafts', value: drafts.data.total || null },
    { label: 'Books', value: books.data.total || null },
    { label: 'Study resources', value: study.data.total || null },
    { label: 'Categories', value: categories.data.length || null },
  ];

  return (
    <>
      <PageMeta title="Dashboard" noIndex />
      <div className="wrap py-10">
        <div className="mb-8">
          <p className="eyebrow mb-2">Admin</p>
          <h1 className="text-2xl sm:text-3xl">Dashboard</h1>
          <p className="mt-2 text-sm text-muted">
            Signed in as {user?.email ?? 'admin'}. All figures come from live database counts.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
          <nav aria-label="Admin sections" className="card h-fit p-2">
            <ul className="grid gap-0.5">
              {ADMIN_SECTIONS.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `block rounded-lg px-3 py-2 text-sm font-medium transition ${
                        isActive ? 'bg-elevated text-accent' : 'text-muted hover:bg-elevated hover:text-heading'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="grid gap-6">
            <section aria-labelledby="admin-stats">
              <h2 id="admin-stats" className="sr-only">Statistics</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {stats.map((stat) => (
                  <StatCard key={stat.label} label={stat.label} value={stat.value} />
                ))}
              </div>
              <p className="mt-3 text-xs text-muted">
                Counts of zero mean no matching records exist yet — nothing is estimated.
              </p>
            </section>

            <ContentTable title="Recent content" />
          </div>
        </div>
      </div>
    </>
  );
}
