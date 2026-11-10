import { useParams } from 'react-router-dom';
import { PageMeta } from '../components/layout/PageMeta';
import { ResourceManager } from '../components/admin/ResourceManager';
import { SettingsPanel } from '../components/admin/SettingsPanel';
import {
  bookmarksConfig,
  booksConfig,
  categoriesConfig,
  diaryConfig,
  ideasConfig,
  knowledgeConfig,
  learningConfig,
  newsConfig,
  studyConfig,
  writingConfig,
} from '../components/admin/resourceConfigs';
import type { ResourceConfig } from '../components/admin/types';

/** Maps an admin sub-path to the editor that backs it. */
const CONFIGS: Record<string, ResourceConfig<{ id: string }>> = {
  '/admin/news': newsConfig as unknown as ResourceConfig<{ id: string }>,
  '/admin/knowledge': knowledgeConfig as unknown as ResourceConfig<{ id: string }>,
  '/admin/writing': writingConfig as unknown as ResourceConfig<{ id: string }>,
  '/admin/learning': learningConfig as unknown as ResourceConfig<{ id: string }>,
  '/admin/books': booksConfig as unknown as ResourceConfig<{ id: string }>,
  '/admin/study': studyConfig as unknown as ResourceConfig<{ id: string }>,
  '/admin/ideas': ideasConfig as unknown as ResourceConfig<{ id: string }>,
  '/admin/bookmarks': bookmarksConfig as unknown as ResourceConfig<{ id: string }>,
  '/admin/diary': diaryConfig as unknown as ResourceConfig<{ id: string }>,
  '/admin/categories': categoriesConfig as unknown as ResourceConfig<{ id: string }>,
};

const LABELS: Record<string, string> = {
  '/admin/news': 'News',
  '/admin/knowledge': 'Knowledge',
  '/admin/writing': 'Writing',
  '/admin/learning': 'Learning',
  '/admin/books': 'Books',
  '/admin/study': 'Study',
  '/admin/ideas': 'Ideas',
  '/admin/bookmarks': 'Bookmarks',
  '/admin/diary': 'Private Diary',
  '/admin/categories': 'Categories',
  '/admin/settings': 'Settings',
};

/**
 * Admin sub-page. Most sections render a ResourceManager built from a config;
 * settings is its own panel. Nothing here is a placeholder: every editor writes
 * through the section's service, and RLS enforces the same admin rule
 * server-side even if this page were reached by a non-admin.
 */
export default function AdminSection() {
  const { section } = useParams<{ section?: string }>();
  const path = section ? `/admin/${section}` : '/admin/settings';
  const label = LABELS[path] ?? 'Section';

  return (
    <>
      <PageMeta title={`${label} — Dashboard`} noIndex />
      <div className="wrap py-8">
        <div className="mb-6">
          <p className="eyebrow mb-2">Admin</p>
          <h1 className="text-2xl sm:text-3xl">{label}</h1>
        </div>
        {path === '/admin/settings' ? (
          <SettingsPanel />
        ) : CONFIGS[path] ? (
          <ResourceManager config={CONFIGS[path]} />
        ) : (
          <p className="text-sm text-muted">Unknown section.</p>
        )}
      </div>
    </>
  );
}
