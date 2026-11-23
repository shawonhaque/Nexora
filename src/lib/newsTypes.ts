/** Shared shapes for the real-time information layer. */

import type { BangladeshDesk, ContinentId } from './regions';

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
  /** Continent the publisher's feed belongs to. Set at build time. */
  continent: ContinentId;
  /** Country of the publisher's desk, e.g. "Bangladesh". */
  country: string;
  /** Bangladesh editorial desk, only present on Bangladeshi feeds. */
  desk?: BangladeshDesk;
  /** Countries this publisher's desk reports on, when it spans more than one. */
  covers?: string[];
}

export type NewsCategory =
  | 'breaking'
  | 'world'
  | 'politics'
  | 'technology'
  | 'ai'
  | 'science'
  | 'education'
  | 'business'
  | 'sports'
  | 'health'
  | 'environment'
  | 'entertainment'
  | 'space';

export interface FeedSource {
  id: string;
  name: string;
  home: string;
  category: NewsCategory;
  count: number;
  /** Continent this publisher's desk belongs to. */
  continent: ContinentId;
  country: string;
  desk?: BangladeshDesk;
  /** Countries this desk actually reports on. Absent means only `country`. */
  covers?: string[];
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
