import { useMemo, useState } from 'react';
import { PageMeta } from '../components/layout/PageMeta';
import { Section } from '../components/ui/Section';
import { BackendNotice, SkeletonGrid, StateBlock } from '../components/ui/StateBlock';
import { BookmarkCard } from '../components/content/Cards';
import { useAsyncData } from '../hooks/useAsyncData';
import { bookmarkService } from '../services';

export default function Bookmarks() {
  const [category, setCategory] = useState('');
  const { data, loading, error, notConfigured } = useAsyncData(() => bookmarkService.list(), [], []);

  const categories = useMemo(
    () => Array.from(new Set(data.map((item) => item.category).filter(Boolean))) as string[],
    [data]
  );
  const visible = category ? data.filter((item) => item.category === category) : data;

  return (
    <>
      <PageMeta
        title="Bookmarks"
        description="A curated collection of saved links and resources."
      />
      <Section
        titleAs="h1"
        eyebrow="Saved"
        title="Bookmarks"
        description="A curated collection of resources worth returning to."
        action={
          categories.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={`chip transition ${category === '' ? 'border-accent text-accent' : ''}`}
                onClick={() => setCategory('')}
              >
                All
              </button>
              {categories.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`chip transition ${category === item ? 'border-accent text-accent' : ''}`}
                  onClick={() => setCategory(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          ) : undefined
        }
      >
        {notConfigured && <BackendNotice className="mb-8" />}
        {error && !loading && <StateBlock tone="error" title="Could not load bookmarks" message={error.message} />}
        {loading && <SkeletonGrid count={6} />}
        {!loading && !error && visible.length === 0 && (
          <StateBlock
            title="No bookmarks yet"
            message="Saved resources will appear here once they are added from the dashboard."
          />
        )}
        {!loading && visible.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((bookmark) => (
              <BookmarkCard key={bookmark.id} bookmark={bookmark} />
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
