import { Link, useNavigate } from 'react-router-dom';
import { PageMeta } from '../components/layout/PageMeta';
import { Section } from '../components/ui/Section';
import { ButtonLink } from '../components/ui/ButtonLink';
import { DemoNotice, SkeletonGrid } from '../components/ui/StateBlock';
import { BookCard, CategoryCard, IdeaCard, PostCard, ResourceCard } from '../components/content/Cards';
import { useAsyncData } from '../hooks/useAsyncData';
import { bookService, categoryService, ideaService, postService, studyService } from '../services';
import { DEMO_BOOKS, DEMO_CATEGORIES, DEMO_IDEAS, DEMO_POSTS, DEMO_STUDY } from '../data/demo';

export default function Home() {
  const navigate = useNavigate();
  const featured = useAsyncData(() => postService.list({ featured: true, pageSize: 3 }), {
    items: DEMO_POSTS.filter((p) => p.is_featured),
    total: 0, page: 1, pageSize: 3, hasMore: false,
  }, []);

  const latestNews = useAsyncData(() => postService.list({ section: 'news', pageSize: 3 }), {
    items: DEMO_POSTS.filter((p) => p.section === 'news').slice(0, 3),
    total: 0, page: 1, pageSize: 3, hasMore: false,
  }, []);

  const books = useAsyncData(() => bookService.list({ pageSize: 4 }), {
    items: DEMO_BOOKS.slice(0, 4),
    total: 0, page: 1, pageSize: 4, hasMore: false,
  }, []);

  const resources = useAsyncData(() => studyService.list({ pageSize: 3 }), {
    items: DEMO_STUDY,
    total: 0, page: 1, pageSize: 3, hasMore: false,
  }, []);

  const categories = useAsyncData(() => categoryService.list(), DEMO_CATEGORIES, []);
  const ideas = useAsyncData(() => ideaService.list(), DEMO_IDEAS, []);

  const knowledge = useAsyncData(() => postService.list({ section: 'knowledge', pageSize: 3 }), {
    items: DEMO_POSTS.filter((p) => p.section === 'knowledge'),
    total: 0, page: 1, pageSize: 3, hasMore: false,
  }, []);

  const writing = useAsyncData(() => postService.list({ section: 'writing', pageSize: 2 }), {
    items: DEMO_POSTS.filter((p) => p.section === 'writing'),
    total: 0, page: 1, pageSize: 2, hasMore: false,
  }, []);

  const anyDemo =
    featured.isDemo || latestNews.isDemo || books.isDemo || resources.isDemo || categories.isDemo;

  return (
    <>
      <PageMeta
        title="NEXORA"
        description="NEXORA is a personal digital knowledge platform for news, books, study resources, knowledge articles, writing and ideas."
      />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="absolute inset-0 bg-grid opacity-[0.5]" aria-hidden="true" />
        <div className="absolute inset-0 bg-brand-glow" aria-hidden="true" />
        <div className="wrap relative py-20 sm:py-28">
          <div className="max-w-3xl">
            <p className="eyebrow mb-5">Your World of Knowledge</p>
            <h1 className="text-4xl leading-[1.08] sm:text-5xl lg:text-6xl">
              Explore. <span className="text-gradient">Learn.</span> Discover.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
              Your personal universe of knowledge, ideas, books and learning — collected, organised
              and made easy to return to.
            </p>

            <form
              className="mt-9 flex max-w-xl flex-col gap-2.5 sm:flex-row"
              role="search"
              onSubmit={(event) => {
                event.preventDefault();
                const value = new FormData(event.currentTarget).get('q');
                const query = typeof value === 'string' ? value.trim() : '';
                navigate(query ? `/search?q=${encodeURIComponent(query)}` : '/search');
              }}
            >
              <label htmlFor="hero-search" className="sr-only">
                Search NEXORA
              </label>
              <input
                id="hero-search"
                name="q"
                type="search"
                placeholder="Search articles, books, study material…"
                className="field h-12 flex-1"
              />
              <button type="submit" className="btn-primary h-12 shrink-0 px-6">
                Search
              </button>
            </form>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <ButtonLink to="/knowledge" variant="primary">
                Explore Knowledge
              </ButtonLink>
              <ButtonLink to="/books" variant="ghost">
                Browse Library
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      <div className="wrap pt-10">
        {anyDemo && <DemoNotice />}
      </div>

      {/* Featured */}
      <Section
        id="featured"
        eyebrow="Featured"
        title="Featured content"
        description="Hand-picked pieces from across the platform."
        action={<ButtonLink to="/knowledge" variant="quiet">View all →</ButtonLink>}
      >
        {featured.loading ? (
          <SkeletonGrid count={3} />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.data.items.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                to={`/${post.section}/${post.slug}`}
                showSection
              />
            ))}
          </div>
        )}
      </Section>

      {/* Latest news */}
      <Section
        id="news"
        eyebrow="News"
        title="Latest news"
        action={<ButtonLink to="/news" variant="quiet">All news →</ButtonLink>}
      >
        {latestNews.loading ? (
          <SkeletonGrid count={3} />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {latestNews.data.items.map((post) => (
              <PostCard key={post.id} post={post} to={`/news/${post.slug}`} />
            ))}
          </div>
        )}
      </Section>

      {/* Books */}
      <Section
        id="books"
        eyebrow="Library"
        title="Recently added books"
        action={<ButtonLink to="/books" variant="quiet">Browse library →</ButtonLink>}
      >
        {books.loading ? (
          <SkeletonGrid count={4} />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {books.data.items.map((book) => (
              <BookCard key={book.id} book={book} to={`/books/${book.slug ?? book.id}`} />
            ))}
          </div>
        )}
      </Section>

      {/* Study */}
      <Section
        id="study"
        eyebrow="Study"
        title="Study resources"
        action={<ButtonLink to="/study" variant="quiet">Study center →</ButtonLink>}
      >
        {resources.loading ? (
          <SkeletonGrid count={3} />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {resources.data.items.map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                to={`/study/resources/${resource.slug ?? resource.id}`}
              />
            ))}
          </div>
        )}
      </Section>

      {/* Categories */}
      <Section
        id="categories"
        eyebrow="Browse"
        title="Knowledge categories"
        description="Every section of NEXORA, one click away."
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {categories.data.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      </Section>

      {/* Knowledge + writing */}
      <Section id="knowledge" eyebrow="Knowledge" title="Popular learning articles">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="grid gap-6 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-2">
            {knowledge.data.items.map((post) => (
              <PostCard key={post.id} post={post} to={`/knowledge/${post.slug}`} />
            ))}
          </div>
          <aside className="card flex flex-col gap-5 p-6">
            <h3 className="text-base">Latest writing</h3>
            <ul className="grid gap-4">
              {writing.data.items.map((post) => (
                <li key={post.id} className="border-b border-line pb-4 last:border-0 last:pb-0">
                  <Link to={`/writing/${post.slug}`} className="text-sm font-medium text-heading transition hover:text-accent">
                    {post.title}
                  </Link>
                </li>
              ))}
            </ul>
            <ButtonLink to="/writing" variant="ghost" className="mt-auto">
              Read the writing
            </ButtonLink>
          </aside>
        </div>
      </Section>

      {/* Ideas */}
      <Section id="ideas" eyebrow="Ideas" title="Latest ideas">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {ideas.data.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} />
          ))}
        </div>
      </Section>
    </>
  );
}
