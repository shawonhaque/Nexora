/**
 * The information layer.
 *
 * Two kinds of data are used, and they are never mixed up:
 *
 *  1. Publisher feeds — fetched at build time by scripts/feeds.mjs and served
 *     as a static JSON snapshot, because those servers send no CORS headers.
 *     The snapshot carries its own `generatedAt`, which the UI always shows.
 *
 *  2. Live APIs — called straight from the browser because they do send CORS
 *     headers: Hacker News, Hugging Face, GitHub, Wikipedia.
 *
 * Both paths return real published data. Nothing is invented, and a failure
 * surfaces as an error the UI can show.
 */

import { cachedJson } from '../lib/apiCache';
import { BASE_PATH } from '../lib/env';
import { CONTINENTS } from '../lib/regions';
import type { BangladeshDesk, ContinentId } from '../lib/regions';
import type {
  AiModel,
  FeedSnapshot,
  NewsArticle,
  NewsCategory,
  RepoTrend,
  TrendItem,
  WikiSummary,
} from '../lib/newsTypes';

export const CATEGORY_META: Record<
  NewsCategory,
  { label: string; path: string; blurb: string; accent: string }
> = {
  breaking: {
    label: 'Front Page',
    path: '/breaking',
    blurb: 'The front pages of major publishers, as they publish. Not every item here is a developing story.',
    accent: 'from-red-500/20 to-orange-500/10',
  },
  world: {
    label: 'World News',
    path: '/world',
    blurb: 'Reporting from international publishers, updated as they publish.',
    accent: 'from-sky-500/20 to-cyan-500/10',
  },
  politics: {
    label: 'Politics & Government',
    path: '/politics',
    blurb: 'Parliaments, elections, policy and the people who set them.',
    accent: 'from-indigo-500/20 to-blue-500/10',
  },
  technology: {
    label: 'Technology',
    path: '/technology',
    blurb: 'Product, platform and infrastructure coverage.',
    accent: 'from-violet-500/20 to-fuchsia-500/10',
  },
  ai: {
    label: 'Artificial Intelligence',
    path: '/ai',
    blurb: 'Model releases, research and industry reporting.',
    accent: 'from-fuchsia-500/20 to-purple-500/10',
  },
  science: {
    label: 'Science & Research',
    path: '/science',
    blurb: 'Research findings and discoveries from peer-reviewed sources.',
    accent: 'from-emerald-500/20 to-teal-500/10',
  },
  education: {
    label: 'Education & Jobs',
    path: '/education',
    blurb: 'Schools, universities, recruitment and learning policy.',
    accent: 'from-amber-500/20 to-orange-500/10',
  },
  business: {
    label: 'Business & Economy',
    path: '/business',
    blurb: 'Markets, enterprise and innovation.',
    accent: 'from-rose-500/20 to-pink-500/10',
  },
  sports: {
    label: 'Sports & Football',
    path: '/sports',
    blurb: 'Football, cricket and the rest of the sporting week.',
    accent: 'from-lime-500/20 to-green-500/10',
  },
  health: {
    label: 'Health & Lifestyle',
    path: '/health',
    blurb: 'Public health, medicine and living well.',
    accent: 'from-teal-500/20 to-cyan-500/10',
  },
  environment: {
    label: 'Environment & Climate',
    path: '/environment',
    blurb: 'Climate, conservation and the changing planet.',
    accent: 'from-green-500/20 to-emerald-500/10',
  },
  entertainment: {
    label: 'Entertainment & Movies',
    path: '/entertainment',
    blurb: 'Film, television, music and culture.',
    accent: 'from-purple-500/20 to-pink-500/10',
  },
  space: {
    label: 'Space & Astronomy',
    path: '/space',
    blurb: 'Missions, launches and what the sky is doing.',
    accent: 'from-slate-500/20 to-indigo-500/10',
  },
};

export const NEWS_CATEGORIES = Object.keys(CATEGORY_META) as NewsCategory[];

// ------------------------------------------------------- publisher snapshot

let snapshotPromise: Promise<FeedSnapshot> | null = null;

/**
 * Loads the build-time snapshot of publisher feeds.
 * Cached in module scope: the file is static and never changes at runtime.
 */
export function loadSnapshot(): Promise<FeedSnapshot> {
  if (!snapshotPromise) {
    snapshotPromise = fetch(`${BASE_PATH}data/feeds.json`, { cache: 'no-cache' })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Feed snapshot unavailable (${response.status}).`);
        const data = (await response.json()) as FeedSnapshot;
        if (!Array.isArray(data.items)) throw new Error('Feed snapshot is malformed.');
        return data;
      })
      .catch((error: unknown) => {
        snapshotPromise = null;
        throw error;
      });
  }
  return snapshotPromise;
}

/** Articles for one category, newest first. */
export async function getCategoryArticles(category: NewsCategory): Promise<NewsArticle[]> {
  const snapshot = await loadSnapshot();
  return snapshot.items.filter((item) => item.category === category);
}

/** The newest articles across every category. */
export async function getLatestArticles(limit = 12): Promise<NewsArticle[]> {
  const snapshot = await loadSnapshot();
  return snapshot.items.slice(0, limit);
}

/** Counts per category, for the dashboard cards. */
export async function getCategoryCounts(): Promise<Record<NewsCategory, number>> {
  const snapshot = await loadSnapshot();
  const counts = Object.fromEntries(NEWS_CATEGORIES.map((category) => [category, 0])) as Record<
    NewsCategory,
    number
  >;
  for (const item of snapshot.items) counts[item.category] += 1;
  return counts;
}

/** All articles, newest first. */
export async function getAllArticles(): Promise<NewsArticle[]> {
  const snapshot = await loadSnapshot();
  return snapshot.items;
}

// -------------------------------------------------------- geographic queries

/** Every article from one continent, newest first. */
export async function getContinentArticles(continent: ContinentId): Promise<NewsArticle[]> {
  const snapshot = await loadSnapshot();
  return snapshot.items.filter((item) => item.continent === continent);
}

/**
 * Articles about one country.
 *
 * Matching is on the publisher's declared coverage, not on words in the
 * headline: a Gulf desk that covers Saudi Arabia serves that filter, while an
 * unrelated story that merely mentions the word does not.
 */
export async function getCountryArticles(country: string): Promise<NewsArticle[]> {
  const snapshot = await loadSnapshot();
  return snapshot.items.filter(
    (item) => item.country === country || item.covers?.includes(country)
  );
}

/** Bangladesh-only articles, optionally narrowed to one editorial desk. */
export async function getBangladeshArticles(desk?: BangladeshDesk): Promise<NewsArticle[]> {
  const snapshot = await loadSnapshot();
  return snapshot.items.filter(
    (item) => item.country === 'Bangladesh' && (!desk || item.desk === desk)
  );
}

export interface ContinentStat {
  id: ContinentId;
  articles: number;
  countries: string[];
  publishers: number;
}

/** Real per-continent counts, computed from the snapshot. */
export async function getContinentStats(): Promise<ContinentStat[]> {
  const snapshot = await loadSnapshot();
  return CONTINENTS.map((continent) => {
    const items = snapshot.items.filter((item) => item.continent === continent.id);
    return {
      id: continent.id,
      articles: items.length,
      countries: [...new Set(items.map((item) => item.country))].sort(),
      publishers: new Set(items.map((item) => item.sourceId)).size,
    };
  });
}

// ------------------------------------------------------------- story clusters

export interface StoryCluster {
  /** Normalised key, stable for the same event. */
  key: string;
  /** The most recent article, used as the headline. */
  lead: NewsArticle;
  /** Every article about the same story, newest first. */
  articles: NewsArticle[];
  /** Distinct publishers reporting it. */
  sources: string[];
}

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'for', 'with', 'at', 'by',
  'from', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'it', 'its', 'this', 'that',
  'after', 'before', 'over', 'into', 'about', 'says', 'said', 'will', 'has', 'have', 'had',
  'new', 'more', 'than', 'up', 'out', 'who', 'what', 'when', 'why', 'how', 'not', 'no',
  // Newsroom vocabulary: these appear in hundreds of unrelated headlines, so they
  // can never be evidence that two articles describe the same event.
  'talks', 'talk', 'deal', 'deals', 'without', 'amid', 'says', 'claim', 'claims',
  'claiming', 'could', 'would', 'should', 'may', 'might', 'first', 'last', 'two',
  'three', 'four', 'five', 'one', 'next', 'back', 'now', 'today', 'week', 'year',
  'years', 'day', 'days', 'live', 'update', 'updates', 'latest', 'breaking', 'news',
  'report', 'reports', 'reportedly', 'according', 'world', 'global', 'ahead',
  'set', 'sets', 'get', 'gets', 'make', 'makes', 'made', 'take', 'takes', 'took',
  'among', 'against', 'during', 'under', 'between', 'through', 'while',
]);

/**
 * Words too common across a news day to prove anything. Computed from the
 * corpus rather than hard-coded, because what is distinctive changes daily.
 */
function buildCommonWords(articles: NewsArticle[]): Set<string> {
  const frequency = new Map<string, number>();
  for (const article of articles) {
    for (const token of new Set(storyTokens(article.title))) {
      frequency.set(token, (frequency.get(token) ?? 0) + 1);
    }
  }
  const threshold = Math.max(8, articles.length * 0.01);
  return new Set(
    [...frequency.entries()].filter(([, count]) => count >= threshold).map(([token]) => token)
  );
}

function storyTokens(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

/**
 * Groups articles that describe the same event, so the same story from several
 * newsrooms can be read side by side.
 *
 * Two articles join a cluster only when they share at least three significant
 * words, and every shared word is rare enough to be distinctive. Matching
 * against the cluster's lead article (never its accumulated vocabulary) stops a
 * chain of loosely related stories collapsing into one group, which is what a
 * naive "share any three words" rule does once words like "talks" or "deal" are
 * in play.
 */
export function clusterStories(articles: NewsArticle[], minSources = 2): StoryCluster[] {
  const common = buildCommonWords(articles);
  const clusters: { tokens: Set<string>; articles: NewsArticle[] }[] = [];

  for (const article of articles) {
    const tokens = storyTokens(article.title).filter((token) => !common.has(token));
    if (tokens.length < 3) continue;
    const tokenSet = new Set(tokens);

    const match = clusters.find((cluster) => {
      const shared = [...tokenSet].filter((token) => cluster.tokens.has(token));
      return shared.length >= 3;
    });

    if (match) {
      match.articles.push(article);
    } else {
      clusters.push({ tokens: tokenSet, articles: [article] });
    }
  }

  return clusters
    .map((cluster) => {
      const sorted = [...cluster.articles].sort((a, b) =>
        (b.publishedAt || '').localeCompare(a.publishedAt || '')
      );
      const sources = [...new Set(sorted.map((article) => article.source))];
      return {
        key: sorted[0].id,
        lead: sorted[0],
        articles: sorted,
        sources,
      };
    })
    .filter((cluster) => cluster.sources.length >= minSources)
    .sort((a, b) => b.sources.length - a.sources.length || b.articles.length - a.articles.length);
}

// ------------------------------------------------------------- live sources

interface AlgoliaHit {
  objectID: string;
  title: string;
  url: string | null;
  points: number | null;
  num_comments: number | null;
  author: string;
  created_at: string;
}

interface AlgoliaResponse {
  hits: AlgoliaHit[];
}

/** Trending technology discussions from Hacker News, live. */
export async function getTrending(limit = 20): Promise<TrendItem[]> {
  const { value } = await cachedJson<AlgoliaResponse>(
    `hn-front-${limit}`,
    `https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=${limit}`,
    { ttlMs: 3 * 60 * 1000 }
  );
  return (value.hits ?? [])
    .filter((hit) => hit.title)
    .map((hit) => ({
      id: hit.objectID,
      title: hit.title,
      url: hit.url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`,
      points: hit.points ?? 0,
      comments: hit.num_comments ?? 0,
      author: hit.author,
      createdAt: hit.created_at,
      discussionUrl: `https://news.ycombinator.com/item?id=${hit.objectID}`,
    }));
}

interface HfModel {
  id: string;
  author?: string;
  downloads?: number;
  likes?: number;
  pipeline_tag?: string;
  tags?: string[];
  createdAt?: string;
}

/**
 * Models trending on Hugging Face right now, live.
 *
 * Sorted by the hub's own trending score rather than by creation date: sorting
 * by date surfaces throwaway test uploads, which is not useful to a reader.
 */
export async function getTrendingModels(limit = 12): Promise<AiModel[]> {
  const { value } = await cachedJson<HfModel[]>(
    `hf-models-trending-${limit}`,
    `https://huggingface.co/api/models?sort=trendingScore&direction=-1&limit=${limit}`,
    { ttlMs: 10 * 60 * 1000 }
  );
  return (value ?? []).map((model) => ({
    id: model.id,
    author: model.author ?? model.id.split('/')[0] ?? '',
    downloads: model.downloads ?? 0,
    likes: model.likes ?? 0,
    pipelineTag: model.pipeline_tag ?? '',
    tags: (model.tags ?? []).slice(0, 6),
    createdAt: model.createdAt ?? '',
    url: `https://huggingface.co/${model.id}`,
  }));
}

interface GithubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
  html_url: string;
  topics?: string[];
  pushed_at: string;
}

interface GithubSearch {
  items: GithubRepo[];
}

/**
 * Repositories gaining attention right now, live.
 * The window is the last 14 days, ranked by stars.
 */
export async function getTrendingRepos(limit = 12): Promise<RepoTrend[]> {
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const query = encodeURIComponent(`created:>${since} stars:>50`);
  const { value } = await cachedJson<GithubSearch>(
    `gh-trending-${limit}`,
    `https://api.github.com/search/repositories?q=${query}&sort=stars&order=desc&per_page=${limit}`,
    { ttlMs: 15 * 60 * 1000 }
  );
  return (value.items ?? []).map((repo) => ({
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    description: repo.description ?? '',
    stars: repo.stargazers_count,
    language: repo.language ?? '',
    url: repo.html_url,
    topics: (repo.topics ?? []).slice(0, 5),
    pushedAt: repo.pushed_at,
  }));
}

interface WikiResponse {
  title?: string;
  extract?: string;
  content_urls?: { desktop?: { page?: string } };
  thumbnail?: { source?: string };
}

/** A Wikipedia summary for a topic, live. Used by Smart Topic Explorer. */
export async function getTopicSummary(topic: string): Promise<WikiSummary> {
  const slug = encodeURIComponent(topic.trim().replace(/\s+/g, '_'));
  const { value } = await cachedJson<WikiResponse>(
    `wiki-${slug}`,
    `https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`,
    { ttlMs: 60 * 60 * 1000 }
  );
  if (!value.extract) throw new Error(`Wikipedia has no summary for "${topic}".`);
  return {
    title: value.title ?? topic,
    extract: value.extract,
    url: value.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${slug}`,
    thumbnail: value.thumbnail?.source ?? '',
  };
}

/** Wikipedia's "on this day" events, live. Real historical records. */
export interface OnThisDayEvent {
  year: number;
  text: string;
  pages: { title: string; url: string }[];
}

export async function getOnThisDay(): Promise<OnThisDayEvent[]> {
  const now = new Date();
  const month = now.getUTCMonth() + 1;
  const day = now.getUTCDate();
  const { value } = await cachedJson<{ events?: { year: number; text: string; pages?: { title: string; content_urls?: { desktop?: { page?: string } } }[] }[] }>(
    `wiki-otd-${month}-${day}`,
    `https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/${month}/${day}`,
    { ttlMs: 24 * 60 * 60 * 1000 }
  );
  return (value.events ?? [])
    .filter((event) => event.text)
    .map((event) => ({
      year: event.year,
      text: event.text,
      pages: (event.pages ?? []).slice(0, 2).map((page) => ({
        // The API returns titles with underscores; display them as prose.
        title: page.title.replace(/_/g, ' '),
        url: page.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title)}`,
      })),
    }))
    .sort((a, b) => a.year - b.year);
}
