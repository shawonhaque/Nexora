import { PageMeta } from '../components/layout/PageMeta';
import { Section } from '../components/ui/Section';
import { DemoNotice, SkeletonGrid, StateBlock } from '../components/ui/StateBlock';
import { IdeaCard } from '../components/content/Cards';
import { useAsyncData } from '../hooks/useAsyncData';
import { ideaService } from '../services';
import { DEMO_IDEAS } from '../data/demo';

export default function Ideas() {
  const { data, loading, error, isDemo } = useAsyncData(() => ideaService.list(), DEMO_IDEAS, []);

  return (
    <>
      <PageMeta
        title="Ideas"
        description="Short notes and working thoughts collected on the NEXORA platform."
      />
      <Section
        titleAs="h1"
        eyebrow="Ideas"
        title="Ideas & notes"
        description="Short, working thoughts. Published ideas only — drafts stay private."
      >
        {isDemo && <DemoNotice className="mb-8" />}
        {error && !loading && <StateBlock tone="error" title="Could not load ideas" message={error.message} />}
        {loading && <SkeletonGrid count={6} />}
        {!loading && !error && data.length === 0 && (
          <StateBlock
            title="No ideas published yet"
            message="Published ideas will appear here as soon as they are added from the dashboard."
          />
        )}
        {!loading && data.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((idea) => (
              <IdeaCard key={idea.id} idea={idea} />
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
