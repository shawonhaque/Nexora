/**
 * Reading analytics and recommendations.
 *
 * Both are computed from the reader's own recorded activity — the same rows
 * shown in the library. Nothing is inferred from other users, and no figure is
 * estimated: a count is the number of matching rows that exist.
 */

import type { NewsArticle, NewsCategory } from './newsTypes';
import type { HistoryEntry, SavedArticle, InterestCategory } from '../hooks/usePersonalization';

export interface DayBucket {
  /** ISO date, `YYYY-MM-DD`. */
  date: string;
  /** Short weekday label for the chart axis. */
  label: string;
  count: number;
}

export interface ReadingStats {
  total: number;
  today: number;
  thisWeek: number;
  /** Consecutive days up to today with at least one recorded article. */
  streakDays: number;
  /** Distinct days with activity, across the whole history. */
  activeDays: number;
  topCategories: { category: NewsCategory; count: number }[];
  topSources: { source: string; count: number }[];
  /** Last 14 days, oldest first, including days with no activity. */
  byDay: DayBucket[];
}

function dayKey(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Computes reading statistics from the recorded history. */
export function computeReadingStats(history: HistoryEntry[], windowDays = 14): ReadingStats {
  const today = new Date();
  const todayKey = dayKey(today);

  const perDay = new Map<string, number>();
  const perCategory = new Map<NewsCategory, number>();
  const perSource = new Map<string, number>();

  for (const entry of history) {
    const date = new Date(entry.viewedAt);
    if (Number.isNaN(date.getTime())) continue;
    const key = dayKey(date);
    perDay.set(key, (perDay.get(key) ?? 0) + 1);
    perCategory.set(entry.category, (perCategory.get(entry.category) ?? 0) + 1);
    if (entry.source) perSource.set(entry.source, (perSource.get(entry.source) ?? 0) + 1);
  }

  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 6);
  const weekAgoKey = dayKey(weekAgo);

  let thisWeek = 0;
  for (const [key, count] of perDay) if (key >= weekAgoKey && key <= todayKey) thisWeek += count;

  // A streak counts back from today, or from yesterday when nothing has been
  // read yet today — otherwise a streak would appear broken every morning.
  let streakDays = 0;
  const cursor = new Date(today);
  if (!perDay.has(todayKey)) cursor.setDate(cursor.getDate() - 1);
  for (;;) {
    if (!perDay.has(dayKey(cursor))) break;
    streakDays += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const byDay: DayBucket[] = [];
  for (let offset = windowDays - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(date.getDate() - offset);
    const key = dayKey(date);
    byDay.push({
      date: key,
      label: date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2),
      count: perDay.get(key) ?? 0,
    });
  }

  return {
    total: history.length,
    today: perDay.get(todayKey) ?? 0,
    thisWeek,
    streakDays,
    activeDays: perDay.size,
    topCategories: [...perCategory.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count),
    topSources: [...perSource.entries()]
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    byDay,
  };
}

export interface Recommendation {
  article: NewsArticle;
  /** Why this article was suggested. Always a statement about the data. */
  reason: string;
  /** Relative strength of the signal, in [0, 1]. */
  score: number;
}

/**
 * Suggests articles the reader has not opened yet.
 *
 * The signal is the reader's own category activity: chosen interests carry the
 * most weight, then saved articles, then reading history. Articles already in
 * the history or saved list are excluded, so a suggestion is always something
 * new. When there is no activity at all, the newest articles are returned and
 * the reason says so.
 */
export function recommendArticles({
  corpus,
  history,
  saved,
  interests,
  limit = 6,
}: {
  corpus: NewsArticle[];
  history: HistoryEntry[];
  saved: SavedArticle[];
  interests: InterestCategory[];
  limit?: number;
}): Recommendation[] {
  const seen = new Set<string>([
    ...history.map((entry) => entry.articleId),
    ...saved.map((entry) => entry.articleId),
  ]);

  const affinity = new Map<NewsCategory, number>();
  const bump = (category: NewsCategory, amount: number) =>
    affinity.set(category, (affinity.get(category) ?? 0) + amount);

  for (const category of interests) bump(category, 3);
  for (const entry of saved) bump(entry.category, 2);
  for (const entry of history) bump(entry.category, 1);

  const candidates = corpus.filter((article) => !seen.has(article.id));

  if (!affinity.size) {
    return candidates.slice(0, limit).map((article) => ({
      article,
      reason: 'Newest in the feeds — choose interests to personalise this',
      score: 0,
    }));
  }

  const maxAffinity = Math.max(...affinity.values());

  const fromAffinity = candidates
    .filter((article) => (affinity.get(article.category) ?? 0) > 0)
    .map((article) => {
      const category = article.category;
      const recency = article.publishedAt ? new Date(article.publishedAt).getTime() : 0;
      const reason = interests.includes(category)
        ? `Because you follow ${category}`
        : saved.some((item) => item.category === category)
          ? `Because you saved ${category} articles`
          : `Related to your ${category} reading`;
      return {
        article,
        reason,
        score: (affinity.get(category) ?? 0) / maxAffinity,
        recency,
      };
    })
    .sort((a, b) => b.score - a.score || b.recency - a.recency)
    .slice(0, limit);

  // Top up with the newest articles from categories the reader has not touched,
  // so the section is never short when the affinity signal is thin.
  const topUp = candidates
    .filter((article) => (affinity.get(article.category) ?? 0) === 0)
    .slice(0, Math.max(0, limit - fromAffinity.length))
    .map((article) => ({
      article,
      reason: `Newest elsewhere — you have not read much ${article.category} yet`,
      score: 0,
      recency: 0,
    }));

  return [...fromAffinity, ...topUp].map(({ article, reason, score }) => ({ article, reason, score }));
}
