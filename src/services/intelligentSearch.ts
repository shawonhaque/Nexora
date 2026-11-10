/**
 * Intelligent search.
 *
 * What this does, and what it does not do, stated plainly because it matters:
 *
 *  - It retrieves real articles from the publisher feeds and ranks them with a
 *    BM25-style scoring function computed in the browser. The ranking is
 *    deterministic and reproducible.
 *  - The "summary" is extractive: it selects the most relevant sentences that
 *    already exist in the retrieved articles. It does not generate new claims,
 *    and every sentence carries a citation to the article it came from.
 *  - The relevance score shown next to each result is a normalised BM25 score,
 *    not a probability that the answer is correct.
 *
 * No language model is called here, because doing so would need an API key, and
 * an API key cannot be shipped in a static front-end. Rather than pretend, the
 * interface labels the summary as "extracted from sources" and links each
 * sentence to its origin. If a generation backend is added later, only
 * `buildExtractiveSummary` needs replacing.
 */

import type { NewsArticle } from '../lib/newsTypes';
import { getAllArticles } from './newsService';

export interface Citation {
  index: number;
  articleId: string;
  title: string;
  source: string;
  link: string;
  publishedAt: string;
}

/** One ranked result together with why it ranked where it did. */
export interface RankedResult {
  article: NewsArticle;
  /** Normalised BM25 score in [0, 1]. */
  score: number;
  /** Terms from the query that this article matched. */
  matched: string[];
}

export interface SearchAnswer {
  query: string;
  /** Sentences drawn verbatim from the retrieved articles. */
  summary: string;
  citations: Citation[];
  relatedQuestions: string[];
  /** Ranked results, best first. */
  results: NewsArticle[];
  /** Ranked results with their scores, for the results list. */
  ranked: RankedResult[];
  /** Terms the query was matched against, after stop-word removal. */
  matchedTerms: string[];
  /** Terms the query mentioned that do not appear in any retrieved article. */
  unmatchedTerms: string[];
  /** Terms offered as corrections for likely misspellings. */
  suggestions: string[];
}

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'for', 'with',
  'is', 'are', 'was', 'were', 'be', 'been', 'what', 'which', 'who', 'whom',
  'how', 'why', 'when', 'where', 'that', 'this', 'these', 'those', 'it', 'its',
  'as', 'at', 'by', 'from', 'about', 'into', 'over', 'after', 'before', 'than',
  'then', 'there', 'here', 'do', 'does', 'did', 'can', 'could', 'should',
  'would', 'will', 'shall', 'may', 'might', 'must', 'i', 'you', 'we', 'they',
  'he', 'she', 'them', 'us', 'me', 'my', 'your', 'our', 'their', 'tell',
  'give', 'show', 'find', 'latest', 'recent', 'news', 'explain',
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

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

/** Cheap Levenshtein distance, capped so long strings do not blow up. */
function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 99;
  const rows = a.length + 1;
  const cols = b.length + 1;
  const grid = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  for (let i = 0; i < rows; i += 1) grid[i][0] = i;
  for (let j = 0; j < cols; j += 1) grid[0][j] = j;
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      grid[i][j] = Math.min(grid[i - 1][j] + 1, grid[i][j - 1] + 1, grid[i - 1][j - 1] + cost);
    }
  }
  return grid[a.length][b.length];
}

/**
 * Ranks articles against a query using BM25, the standard bag-of-words
 * relevance function. Field weights boost title and source matches, which are
 * stronger signals than a match somewhere in the body text.
 */
function rankBm25(
  articles: NewsArticle[],
  terms: string[],
  limit: number
): { ranked: RankedResult[]; documentFrequency: Map<string, number> } {
  const k1 = 1.5;
  const b = 0.75;

  // One document per article: title and source are repeated so a match there
  // counts for more, which is the field-weighting part of the score.
  const docs = articles.map((article) => {
    const weighted = [
      article.title, article.title, article.title,
      article.source, article.source,
      article.summary, article.summary,
      article.category,
    ]
      .filter(Boolean)
      .join(' ');
    const tokens = tokenize(weighted);
    const counts = new Map<string, number>();
    for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1);
    return { article, tokens, counts };
  });

  const totalDocs = docs.length || 1;
  const avgLength = docs.reduce((sum, doc) => sum + doc.tokens.length, 0) / totalDocs || 1;

  const documentFrequency = new Map<string, number>();
  for (const term of terms) {
    let df = 0;
    for (const doc of docs) if (doc.counts.has(term)) df += 1;
    documentFrequency.set(term, df);
  }

  const scored = docs.map((doc) => {
    let score = 0;
    const matched: string[] = [];
    for (const term of terms) {
      const frequency = doc.counts.get(term) ?? 0;
      if (!frequency) continue;
      matched.push(term);
      const df = documentFrequency.get(term) ?? 0;
      const idf = Math.log(1 + (totalDocs - df + 0.5) / (df + 0.5));
      const denominator = frequency + k1 * (1 - b + (b * doc.tokens.length) / avgLength);
      score += idf * ((frequency * (k1 + 1)) / denominator);
    }
    return { article: doc.article, score, matched };
  });

  const best = scored.reduce((max, entry) => Math.max(max, entry.score), 0);
  const ranked = scored
    .filter((entry) => entry.score > 0)
    .map((entry) => ({
      article: entry.article,
      // Normalised to [0, 1] so the number shown in the UI is comparable across queries.
      score: best > 0 ? entry.score / best : 0,
      matched: entry.matched,
    }))
    .sort(
      (a, b2) =>
        b2.score - a.score ||
        (b2.article.publishedAt || '').localeCompare(a.article.publishedAt || '')
    )
    .slice(0, limit);

  return { ranked, documentFrequency };
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

  if (results.slice(0, 6).length >= 3) {
    questions.push(`What is the most recent development in ${topic}?`);
  }

  questions.push(`What background does ${topic} assume a reader already has?`);
  questions.push(`Which primary sources are cited in coverage of ${topic}?`);

  return questions.slice(0, 4);
}

/**
 * Finds the closest vocabulary term for a term that matched nothing, so a
 * misspelling can be offered back as "did you mean". Only suggests a
 * replacement when the edit distance is small relative to the term length.
 */
function suggestCorrections(
  terms: string[],
  vocabulary: Map<string, number>
): string[] {
  const suggestions: string[] = [];
  for (const term of terms) {
    if (vocabulary.has(term) || term.length < 4) continue;
    let best: { word: string; distance: number } | null = null;
    for (const word of vocabulary.keys()) {
      if (Math.abs(word.length - term.length) > 2) continue;
      const distance = editDistance(term, word);
      if (distance <= 1 || (term.length > 6 && distance <= 2)) {
        if (!best || distance < best.distance) best = { word, distance };
      }
    }
    if (best && !suggestions.includes(best.word)) suggestions.push(best.word);
  }
  return suggestions.slice(0, 3);
}

/**
 * Runs the full search: retrieval, BM25 ranking, an extractive summary and
 * related questions. The whole feed snapshot is the candidate set, so a
 * multi-word query is not narrowed by a substring filter before ranking.
 */
export async function runIntelligentSearch(query: string): Promise<SearchAnswer> {
  const terms = extractTerms(query);
  const trimmed = query.trim();

  const empty: SearchAnswer = {
    query: trimmed,
    summary: '',
    citations: [],
    relatedQuestions: [],
    results: [],
    ranked: [],
    matchedTerms: [],
    unmatchedTerms: [],
    suggestions: [],
  };

  if (!terms.length) return empty;

  const corpus = await getAllArticles();
  if (!corpus.length) return { ...empty, matchedTerms: terms };

  const { ranked, documentFrequency } = rankBm25(corpus, terms, 40);
  const results = ranked.map((entry) => entry.article);

  const matchedTerms = terms.filter((term) => (documentFrequency.get(term) ?? 0) > 0);
  const unmatchedTerms = terms.filter((term) => (documentFrequency.get(term) ?? 0) === 0);

  // Vocabulary is every term seen in the corpus, used only to offer corrections.
  const vocabulary = new Map<string, number>();
  for (const article of corpus) {
    for (const token of tokenize(`${article.title} ${article.summary}`)) {
      vocabulary.set(token, (vocabulary.get(token) ?? 0) + 1);
    }
  }
  const suggestions = suggestCorrections(unmatchedTerms, vocabulary);

  const { summary, citations } = buildExtractiveSummary(results, matchedTerms);

  return {
    query: trimmed,
    summary,
    citations,
    relatedQuestions: results.length ? buildRelatedQuestions(results, terms) : [],
    results,
    ranked,
    matchedTerms,
    unmatchedTerms,
    suggestions,
  };
}
