import { useState } from 'react';
import { PageMeta } from '../components/layout/PageMeta';
import { Section } from '../components/ui/Section';
import { ButtonLink } from '../components/ui/ButtonLink';
import { DemoNotice, SkeletonGrid, StateBlock } from '../components/ui/StateBlock';
import { ResourceCard } from '../components/content/Cards';
import { useAsyncData } from '../hooks/useAsyncData';
import { studyService } from '../services';
import { DEMO_STUDY, DEMO_SUBJECTS } from '../data/demo';
import { Link } from 'react-router-dom';

const PAGE_SIZE = 9;
const RESOURCE_TYPES = ['Notes', 'PDF', 'Guide', 'Worksheet', 'Video', 'Tutorial'] as const;

export default function Study() {
  const [page, setPage] = useState(1);
  const [resourceType, setResourceType] = useState('');

  const { data, loading, error, isDemo } = useAsyncData(
    () => studyService.list({ page, pageSize: PAGE_SIZE, resourceType: resourceType || undefined }),
    { items: DEMO_STUDY, total: DEMO_STUDY.length, page: 1, pageSize: PAGE_SIZE, hasMore: false },
    [page, resourceType]
  );

  return (
    <>
      <PageMeta
        title="Study Center"
        description="Study notes, guides, worksheets and exam preparation material organised by subject."
      />

      <section className="border-b border-line bg-surface/40">
        <div className="wrap py-14 sm:py-20">
          <p className="eyebrow mb-4">NEXORA Study</p>
          <h1 className="max-w-3xl text-3xl leading-tight sm:text-4xl lg:text-5xl">
            Your Journey to Knowledge Starts Here
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted">
            Explore study materials, organise your learning and achieve your goals.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <ButtonLink to="/study/resources" variant="primary">Browse resources</ButtonLink>
            <ButtonLink to="/search" variant="ghost">Search study material</ButtonLink>
          </div>
        </div>
      </section>

      <Section eyebrow="Subjects" title="Popular subjects" description="Jump straight into a subject area.">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {DEMO_SUBJECTS.map((subject) => (
            <Link key={subject.id} to="/study/resources" className="card card-hover flex items-start gap-4 p-6">
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-elevated font-mono text-lg text-accent"
                aria-hidden="true"
              >
                {subject.icon}
              </span>
              <span className="flex flex-col gap-1">
                <span className="text-base font-semibold text-heading">{subject.name}</span>
                <span className="text-sm leading-relaxed text-muted">{subject.description}</span>
              </span>
            </Link>
          ))}
        </div>
        <p className="mt-5 text-xs text-muted">
          Subject records shown here are placeholders until the subjects table is populated from the dashboard.
        </p>
      </Section>

      <Section
        id="resources"
        eyebrow="Materials"
        title="Study resources"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={`chip transition ${resourceType === '' ? 'border-accent text-accent' : ''}`}
              onClick={() => { setResourceType(''); setPage(1); }}
            >
              All types
            </button>
            {RESOURCE_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                className={`chip transition ${resourceType === type ? 'border-accent text-accent' : ''}`}
                onClick={() => { setResourceType(type); setPage(1); }}
              >
                {type}
              </button>
            ))}
          </div>
        }
      >
        {isDemo && <DemoNotice className="mb-8" />}

        {error && !loading && <StateBlock tone="error" title="Could not load study resources" message={error.message} />}

        {loading && <SkeletonGrid count={6} />}

        {!loading && !error && data.items.length === 0 && (
          <StateBlock
            title="No study material yet"
            message="Published notes, guides and worksheets will appear here once they are added from the dashboard."
            action={<ButtonLink to="/study" variant="ghost">Clear filters</ButtonLink>}
          />
        )}

        {!loading && data.items.length > 0 && (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data.items.map((resource) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  to={`/study/resources/${resource.slug ?? resource.id}`}
                />
              ))}
            </div>
            {!isDemo && (
              <nav className="mt-10 flex items-center justify-between gap-4" aria-label="Pagination">
                <button type="button" className="btn-ghost" onClick={() => setPage((v) => Math.max(1, v - 1))} disabled={page === 1}>
                  ← Previous
                </button>
                <span className="font-mono text-xs text-muted">Page {page}</span>
                <button type="button" className="btn-ghost" onClick={() => setPage((v) => v + 1)} disabled={!data.hasMore}>
                  Next →
                </button>
              </nav>
            )}
          </>
        )}
      </Section>
    </>
  );
}
