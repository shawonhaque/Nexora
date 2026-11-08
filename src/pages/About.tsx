import { Link } from 'react-router-dom';
import { Icon } from '../components/news/ArticleCard';
import { PageBody, PageHeader, SubHeading } from '../components/ui/PageHeader';
import { PageMeta } from '../components/layout/PageMeta';
import { CATEGORY_META, NEWS_CATEGORIES } from '../services/newsService';

const SOURCES = [
  { name: 'BBC News', what: 'World, technology, science, education and business feeds' },
  { name: 'The Guardian', what: 'World, technology, science, education and business feeds' },
  { name: 'NPR', what: 'News, technology, science, education and business feeds' },
  { name: 'Al Jazeera', what: 'International news' },
  { name: 'Ars Technica', what: 'Technology' },
  { name: 'TechCrunch', what: 'Technology and startups' },
  { name: 'MIT Technology Review', what: 'Technology and AI' },
  { name: 'MarkTechPost', what: 'AI research and models' },
  { name: 'Nature', what: 'Peer-reviewed science' },
  { name: 'ScienceDaily', what: 'Science research summaries' },
  { name: 'Inside Higher Ed', what: 'Higher education' },
  { name: 'Hacker News', what: 'Technology discussions (live API)' },
  { name: 'Hugging Face', what: 'Trending AI models (live API)' },
  { name: 'GitHub', what: 'Trending repositories (live API)' },
  { name: 'Wikipedia', what: 'Topic summaries and historical events (live API)' },
];

export default function About() {
  return (
    <>
      <PageMeta
        title="About Nexora"
        description="How NEXORA sources its information, what is generated versus retrieved, and what the platform does and does not do."
      />
      <PageHeader
        eyebrow="About"
        title="About Nexora"
        description="A live information dashboard with intelligent search and a personal knowledge library."
        icon="shield"
      />

      <PageBody className="space-y-10">
        <section aria-labelledby="purpose" className="glass p-6">
          <h2 id="purpose" className="text-xl font-semibold">
            What NEXORA is
          </h2>
          <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted">
            <p>
              NEXORA collects reporting from established publishers into a single, readable dashboard, adds a
              search layer that ranks those articles against a question, and keeps a personal library of what you
              save and read.
            </p>
            <p>
              It is not a news organisation. It does not write, rewrite or editorialise. Every article links to
              the publisher's own page, and the source and publication time shown on each card come from that
              publisher's feed.
            </p>
          </div>
        </section>

        <section aria-labelledby="sourcing">
          <SubHeading
            id="sourcing"
            title="Where the information comes from"
            hint="Two delivery paths, both showing real published data."
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="glass p-5">
              <h3 className="flex items-center gap-2 font-semibold text-heading">
                <Icon name="globe" className="h-4 w-4 text-accent" /> Publisher feeds
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Most news servers do not allow browsers to read their feeds directly. NEXORA fetches them during
                the build, on a schedule, and serves the result as a static snapshot. Each snapshot records the
                time it was collected, and the interface shows that time rather than implying the data is
                second-by-second.
              </p>
            </div>
            <div className="glass p-5">
              <h3 className="flex items-center gap-2 font-semibold text-heading">
                <Icon name="refresh" className="h-4 w-4 text-accent2" /> Live APIs
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Hacker News, Hugging Face, GitHub and Wikipedia do allow direct browser requests, so those are
                fetched live when you open a page. Responses are cached briefly and calls are spaced out to stay
                within each provider's rate limits.
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="sources">
          <SubHeading id="sources" title="Sources" hint="Every publisher and API currently used." />
          <div className="glass divide-y divide-line/70">
            {SOURCES.map((source) => (
              <div key={source.name} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 p-3.5 text-sm">
                <span className="font-medium text-heading">{source.name}</span>
                <span className="text-xs text-muted">{source.what}</span>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="honesty">
          <SubHeading
            id="honesty"
            title="What is generated, and what is not"
            hint="Stated plainly, because the difference matters."
          />
          <ul className="space-y-3">
            {[
              {
                ok: true,
                text: 'Article titles, summaries, sources and timestamps are the publisher\u2019s own data, reproduced as received.',
              },
              {
                ok: true,
                text: 'Search summaries are extractive: the sentences shown already exist in the retrieved articles, and each one cites its source.',
              },
              {
                ok: true,
                text: 'Trending lists, model lists and historical events come from live APIs and carry a link to the original.',
              },
              {
                ok: false,
                text: 'No article, statistic or quotation on this site is invented. There are no synthetic live counters.',
              },
              {
                ok: false,
                text: 'Search does not call a language model, because that would require an API key, and an API key cannot be kept secret in a static front-end. The interface says so rather than implying otherwise.',
              },
            ].map((item) => (
              <li key={item.text} className="glass flex gap-3 p-4 text-sm leading-relaxed">
                <Icon
                  name={item.ok ? 'check' : 'close'}
                  className={`mt-0.5 h-4 w-4 shrink-0 ${item.ok ? 'text-emerald-400' : 'text-amber-400'}`}
                />
                <span className="text-muted">{item.text}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="topics-covered">
          <SubHeading id="topics-covered" title="Topics covered" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {NEWS_CATEGORIES.map((category) => (
              <Link
                key={category}
                to={CATEGORY_META[category].path}
                className={`glass glass-hover bg-gradient-to-br p-4 ${CATEGORY_META[category].accent}`}
              >
                <p className="font-semibold text-heading">{CATEGORY_META[category].label}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">{CATEGORY_META[category].blurb}</p>
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="technical" className="glass p-6">
          <h2 id="technical" className="text-xl font-semibold">
            How it is built
          </h2>
          <div className="mt-4 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
            {[
              ['Interface', 'React 18 with TypeScript, routed with React Router'],
              ['Styling', 'Tailwind CSS with theme tokens for light and dark modes'],
              ['Build', 'Vite, with route-level code splitting'],
              ['Hosting', 'GitHub Pages as a static site'],
              ['Data', 'Supabase (Postgres) with row level security for anything user-owned'],
              ['Live data', 'Public CORS-enabled APIs plus a scheduled feed snapshot'],
            ].map(([label, value]) => (
              <p key={label} className="flex flex-col">
                <span className="font-mono text-xs uppercase tracking-wider text-accent">{label}</span>
                <span className="mt-0.5 leading-relaxed text-muted">{value}</span>
              </p>
            ))}
          </div>
        </section>
      </PageBody>
    </>
  );
}
