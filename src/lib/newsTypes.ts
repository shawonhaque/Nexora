/** Shared shapes for the real-time information layer. */

/** A news article from a publisher feed. Every field comes from the source. */
export interface NewsArticle {
  id: string;
  title: string;
  link: string;
  summary: string;
  image: string;
  /** ISO timestamp from the feed, or '' when the publisher omitted one. */
  publishedAt: string;
  category: NewsCategory;
  source: string;
  sourceId: string;
  sourceHome: string;
}

export type NewsCategory =
  | 'world'
  | 'technology'
  | 'ai'
  | 'science'
  | 'education'
  | 'business';

export interface FeedSource {
  id: string;
  name: string;
  home: string;
  category: NewsCategory;
  count: number;
}

export interface FeedSnapshot {
  generatedAt: string;
  itemCount: number;
  sourceCount: number;
  sources: FeedSource[];
  failures: { id: string; reason: string }[];
  items: NewsArticle[];
}

/** A trend item from Hacker News (live, CORS-enabled). */
export interface TrendItem {
  id: string;
  title: string;
  url: string;
  points: number;
  comments: number;
  author: string;
  createdAt: string;
  discussionUrl: string;
}

/** A recent AI model from the Hugging Face hub (live, CORS-enabled). */
export interface AiModel {
  id: string;
  author: string;
  downloads: number;
  likes: number;
  pipelineTag: string;
  tags: string[];
  createdAt: string;
  url: string;
}

/** A trending repository from the GitHub search API (live, CORS-enabled). */
export interface RepoTrend {
  id: number;
  name: string;
  fullName: string;
  description: string;
  stars: number;
  language: string;
  url: string;
  topics: string[];
  pushedAt: string;
}

/** A Wikipedia article summary (live, CORS-enabled). */
export interface WikiSummary {
  title: string;
  extract: string;
  url: string;
  thumbnail: string;
}

export type DataState = 'idle' | 'loading' | 'ready' | 'error';

/** Wraps any remote value together with how fresh it is. */
export interface LiveResult<T> {
  data: T | null;
  error: string | null;
  /** ISO timestamp of the successful fetch. */
  fetchedAt: string | null;
  /** True while a background refresh is running over existing data. */
  refreshing: boolean;
}
