import { useLocation } from 'react-router-dom';
import { PageMeta } from '../components/layout/PageMeta';
import { StateBlock } from '../components/ui/StateBlock';
import { ButtonLink } from '../components/ui/ButtonLink';

const LABELS: Record<string, string> = {
  '/admin/news': 'News',
  '/admin/books': 'Books',
  '/admin/study': 'Study',
  '/admin/knowledge': 'Knowledge',
  '/admin/writing': 'Writing',
  '/admin/ideas': 'Ideas',
  '/admin/bookmarks': 'Bookmarks',
  '/admin/diary': 'Private Diary',
  '/admin/categories': 'Categories',
  '/admin/settings': 'Settings',
};

/**
 * Placeholder admin sub-page.
 *
 * Each admin section is reachable and clearly marked as not yet implemented,
 * rather than showing a fake form that silently discards input. Editors for
 * these sections are the next build phase.
 */
export default function AdminSection() {
  const { pathname } = useLocation();
  const label = LABELS[pathname] ?? 'Section';

  return (
    <>
      <PageMeta title={`${label} — Dashboard`} noIndex />
      <div className="wrap py-10">
        <p className="eyebrow mb-2">Admin</p>
        <h1 className="mb-6 text-2xl sm:text-3xl">{label}</h1>
        <StateBlock
          tone="warning"
          title={`${label} editor is not built yet`}
          message="This section is wired into navigation and access control, but the editing interface has not been implemented. It is listed here so nothing looks finished when it is not. The database tables and RLS policies for this section exist in supabase/migrations."
          action={<ButtonLink to="/admin" variant="ghost">← Back to overview</ButtonLink>}
        />
      </div>
    </>
  );
}
