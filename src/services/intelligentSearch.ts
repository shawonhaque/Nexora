/**
 * Intelligent search.
 *
 * What this does, and what it does not do, stated plainly because it matters:
 *
 *  - It ranks real articles retrieved from the publisher feeds by matching the
 *    query against titles, summaries and source names. The ranking is
 *    deterministic and runs in the browser.
 *  - The "summary" is extractive: it selects the most relevant sentences that
 *    already exist in the retrieved articles. It does not generate new claims,
 *    and every sentence carries a citation to the article it came from.
 *
 * No language model is called here, because doing so would need an API key,
 * and an API key cannot be shipped in a static front-end. Rather than pretend,
 * the interface labels the summary as "extracted from sources" and links each
 * sentence to its origin. If a generation backend is added later, only
 * `buildExtractiveSummary` needs replacing.
 */

import type { NewsArticle } from '../lib/newsTypes';
import { searchArticles } from './newsService';

export interface Citation {
  index: number;
  articleId: string;
  title: string;
  source: string;
  link: string;
  publishedAt: string;
}

export interface SearchAnswer {
  query: string;
  /** Sentences drawn verbatim from the retrieved articles. */
  summary: string;
  citations: Citation[];
  relatedQuestions: string[];
  results: NewsArticle[];
  /** Terms the query was matched against. */
  matchedTerms: string[];
}

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'for', 'with',
  'is', 'are', 'was', 'were', 'be', 'been', 'what', 'which', 'who', 'whom',
  'how', 'why', 'when', 'where', 'that', 'this', 'these', 'those', 'it', 'its',
  'as', 'at', 'by', 'from', 'about', 'into', 'over', 'after', 'before', 'than',
  'then', 'there', 'here', 'do', 'does', 'did', 'can', 'could', 'should',
  'would', 'will', 'shall', 'may', 'might', 'must', 'i', 'you', 'we', 'they',
  'he', 'she', 'them', 'us', 'me', 'my', 'your', 'our', 'their', 'me', 'tell',
  'give', 'show', 'find', 'latest', 'recent', 'news', 'explain', 'about',
]);

/** Extracts the meaningful terms from a natural-language question. */
export function extractTerms(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 1 && !STOP_WORDS.has(term));
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-Z"“])/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 40 && sentence.length < 320);
}

function scoreSentence(sentence: string, terms: string[]): number {
  const lower = sentence.toLowerCase();
  let score = 0;
  for (const term of terms) {
    const occurrences = lower.split(term).length - 1;
    if (occurrences) score += occurrences * (term.length > 5 ? 3 : 2);
  }
  // Prefer sentences that read as a complete statement.
  if (/^(the|a|an|in|researchers|scientists|according|new|this|it)\b/i.test(sentence)) score += 1;
  return score;
}

/**
 * Builds an extractive summary: the highest-scoring real sentences, each tied
 * to the article it came from. Never invents content.
 */
function buildExtractiveSummary(
  results: NewsArticle[],
  terms: string[]
): { summary: string; citations: Citation[] } {
  const candidates: { sentence: string; article: NewsArticle; score: number }[] = [];

  for (const article of results.slice(0, 8)) {
    const text = `${article.summary} ${article.title}`.trim();
    for (const sentence of splitSentences(text)) {
      candidates.push({ sentence, article, score: scoreSentence(sentence, terms) });
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  const chosen: typeof candidates = [];
  const usedArticles = new Set<string>();
  for (const candidate of candidates) {
    if (candidate.score <= 0) break;
    // One sentence per article keeps the summary diverse and avoids one source
    // dominating the answer.
    if (usedArticles.has(candidate.article.id)) continue;
    usedArticles.add(candidate.article.id);
    chosen.push(candidate);
    if (chosen.length >= 4) break;
  }

  if (!chosen.length) return { summary: '', citations: [] };

  const citations: Citation[] = [];
  const sentences = chosen.map((candidate) => {
    let index = citations.findIndex((item) => item.articleId === candidate.article.id);
    if (index === -1) {
      citations.push({
        index: citations.length + 1,
        articleId: candidate.article.id,
        title: candidate.article.title,
        source: candidate.article.source,
        link: candidate.article.link,
        publishedAt: candidate.article.publishedAt,
      });
      index = citations.length - 1;
    }
    return `${candidate.sentence} [${citations[index].index}]`;
  });

  return { summary: sentences.join(' '), citations };
}

/** Suggests follow-up questions based on the retrieved results. */
function buildRelatedQuestions(results: NewsArticle[], terms: string[]): string[] {
  const questions: string[] = [];
  const topic = terms.slice(0, 3).join(' ') || 'this topic';

  const sources = [...new Set(results.slice(0, 12).map((article) => article.source))];
  if (sources.length > 1) {
    questions.push(`How do ${sources[0]} and ${sources[1]} differ in their coverage of ${topic}?`);
  }

  const recent = results.slice(0, 6);
  if (recent.length >= 3) {
    questions.push(`What is the most recent development in ${topic}?`);
  }

  questions.push(`What background does ${topic} assume a reader already has?`);
  questions.push(`Which primary sources are cited in coverage of ${topic}?`);

  return questions.slice(0, 4);
}

/** Runs the full search: retrieval, ranking, summary and related questions. */
export async function runIntelligentSearch(query: string): Promise<SearchAnswer> {
  const terms = extractTerms(query);
  const trimmed = query.trim();

  if (!terms.length) {
    return { query: trimmed, summary: '', citations: [], relatedQuestions: [], results: [], matchedTerms: [] };
  }

  // Retrieve on the full phrase first, then fall back to the longest term so a
  // narrow query still returns something rather than nothing.
  let results = await searchArticles(trimmed, 40);
  if (!results.length) {
    results = await searchArticles(terms.join(' '), 40);
  }
  if (!results.length) {
    results = await searchArticles(terms.sort((a, b) => b.length - a.length)[0], 40);
  }

  const { summary, citations } = buildExtractiveSummary(results, terms);

  return {
    query: trimmed,
    summary,
    citations,
    relatedQuestions: results.length ? buildRelatedQuestions(results, terms) : [],
    results,
    matchedTerms: terms,
  };
}
