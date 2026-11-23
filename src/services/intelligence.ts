/**
 * The NEXORA intelligence layer.
 *
 * Everything here either calls a real service or does real work on real text.
 * Nothing is labelled "AI" unless it actually is, and nothing pretends to be a
 * language model when it is a deterministic algorithm:
 *
 *  - Bangla translation and the AI briefing call real services (MyMemory, and
 *    extractive summarisation over the publisher's own sentences).
 *  - Voice news uses the browser's own speech synthesis.
 *  - Source comparison and clustering are deterministic text analysis, and the
 *    UI says so rather than implying a model wrote it.
 *
 * The site is static, so there is no server to hold an API key. Every endpoint
 * used here is keyless and CORS-enabled; anything that needs a secret would
 * have to run in a backend, and is deliberately not faked here.
 */

import { cachedJson } from '../lib/apiCache';
import type { NewsArticle } from '../lib/newsTypes';
import { clusterStories, type StoryCluster } from '../services/newsService';

// ------------------------------------------------------------- translation

interface MyMemoryResponse {
  responseStatus?: number | string;
  responseData?: { translatedText?: string; match?: number };
  matches?: { translation?: string; quality?: string | number; match?: number }[];
}

/** MyMemory caps a single request at roughly 500 characters. */
const TRANSLATE_CHUNK = 450;

function splitForTranslation(text: string): string[] {
  if (text.length <= TRANSLATE_CHUNK) return [text];
  const sentences = text.match(/[^.!?]+[.!?]?\s*/g) ?? [text];
  const chunks: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    if ((current + sentence).length > TRANSLATE_CHUNK && current) {
      chunks.push(current);
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current.trim()) chunks.push(current);
  return chunks;
}

/**
 * Translates English text to Bangla.
 *
 * MyMemory is a public translation-memory service: it returns the best matching
 * human translation it knows, which reads better than raw machine output for
 * short news text. It is rate limited per IP, so failures are surfaced honestly
 * rather than silently returning the English.
 */
export async function translateToBangla(text: string): Promise<string> {
  const clean = text.trim();
  if (!clean) return '';
  const chunks = splitForTranslation(clean);

  const translated = await Promise.all(
    chunks.map(async (chunk) => {
      const { value } = await cachedJson<MyMemoryResponse>(
        `mm-bn-${chunk.length}-${chunk.slice(0, 40)}`,
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=en|bn`,
        { ttlMs: 24 * 60 * 60 * 1000 }
      );
      const direct = value.responseData?.translatedText;
      if (direct && !/MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(direct)) return direct;
      const best = value.matches?.find((match) => match.translation)?.translation;
      if (best) return best;
      throw new Error('The translation service is busy. Try again in a moment.');
    })
  );

  return translated.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Translates each line separately so every translated sentence keeps the
 * publisher it came from. Translating the briefing as one block would be a
 * single request, but the result could only be attributed to the first article,
 * which would put words next to a source that never wrote them.
 */
export async function translateLinesToBangla(lines: string[]): Promise<string[]> {
  const results: string[] = [];
  for (const line of lines) {
    results.push(await translateToBangla(line));
  }
  return results;
}

// ---------------------------------------------------------------- briefing

export interface BriefingLine {
  /** The publisher's own sentence, verbatim. */
  sentence: string;
  article: NewsArticle;
}

export interface DailyBriefing {
  lines: BriefingLine[];
  articleCount: number;
  sourceCount: number;
  generatedAt: string;
}

/**
 * Builds a daily briefing by selecting the opening sentence of the most
 * significant recent stories.
 *
 * This is extractive, not generative: every sentence is copied from the
 * publisher's summary. The value added is selection and ordering — the stories
 * covered by the most independent outlets come first — so the reader sees what
 * the world is actually reporting, in the publishers' own words.
 */
export function buildBriefing(articles: NewsArticle[], limit = 6): DailyBriefing {
  const clusters = clusterStories(articles, 2);
  const picked: BriefingLine[] = [];
  const seen = new Set<string>();

  const firstSentence = (text: string): string => {
    const match = text.match(/^[^.!?]{25,}?[.!?]/);
    return (match ? match[0] : text).trim();
  };

  // Stories covered by several outlets first: that is what "important" means here.
  for (const cluster of clusters) {
    const withSummary = cluster.articles.find((article) => article.summary.length > 60);
    if (!withSummary || seen.has(cluster.lead.id)) continue;
    seen.add(cluster.lead.id);
    picked.push({ sentence: firstSentence(withSummary.summary), article: cluster.lead });
    if (picked.length >= limit) break;
  }

  // Top up with the newest remaining stories so the briefing is never thin.
  if (picked.length < limit) {
    for (const article of articles) {
      if (picked.length >= limit) break;
      if (seen.has(article.id) || article.summary.length < 60) continue;
      seen.add(article.id);
      picked.push({ sentence: firstSentence(article.summary), article });
    }
  }

  return {
    lines: picked,
    articleCount: articles.length,
    sourceCount: new Set(articles.map((article) => article.source)).size,
    generatedAt: new Date().toISOString(),
  };
}

// -------------------------------------------------------- source comparison

export interface ComparisonGroup extends StoryCluster {
  /** How many distinct publishers covered the story. */
  sourceCount: number;
}

/**
 * Finds stories reported by more than one newsroom, so the reader can compare
 * how each outlet framed the same event. Each entry links to the originals.
 */
export function compareSources(articles: NewsArticle[], limit = 8): ComparisonGroup[] {
  return clusterStories(articles, 2)
    .slice(0, limit)
    .map((cluster) => ({ ...cluster, sourceCount: cluster.sources.length }));
}

// --------------------------------------------------------------- fact check

export interface FactCheckResult {
  claim: string;
  /** Articles whose headline or summary discusses the claim's keywords. */
  evidence: NewsArticle[];
  /** Distinct publishers providing evidence. */
  sources: string[];
  verdict: 'well-covered' | 'thin' | 'no-coverage';
  note: string;
}

/**
 * Looks for independent coverage that bears on a claim.
 *
 * This is an evidence finder, not a truth oracle: it reports how many separate
 * publishers have published material matching the claim's key terms, and links
 * to every one so the reader can judge. The note states exactly that, so the
 * result can never be mistaken for a verified verdict.
 */
export function checkClaim(claim: string, articles: NewsArticle[]): FactCheckResult {
  const tokens = claim
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3);

  if (!tokens.length) {
    return {
      claim,
      evidence: [],
      sources: [],
      verdict: 'no-coverage',
      note: 'Enter a claim with a few descriptive words to search the current coverage.',
    };
  }

  const scored = articles
    .map((article) => {
      const haystack = `${article.title} ${article.summary}`.toLowerCase();
      const hits = tokens.filter((token) => haystack.includes(token)).length;
      return { article, score: hits / tokens.length };
    })
    .filter((entry) => entry.score >= 0.5)
    .sort((a, b) => b.score - a.score || (b.article.publishedAt || '').localeCompare(a.article.publishedAt || ''))
    .slice(0, 12)
    .map((entry) => entry.article);

  const sources = [...new Set(scored.map((article) => article.source))];
  const verdict: FactCheckResult['verdict'] =
    sources.length >= 3 ? 'well-covered' : sources.length >= 1 ? 'thin' : 'no-coverage';

  const note =
    verdict === 'well-covered'
      ? `${sources.length} independent publishers have coverage matching these terms. Read them and judge the claim yourself — this tool finds evidence, it does not verify facts.`
      : verdict === 'thin'
        ? `Only ${sources.length} publisher${sources.length === 1 ? '' : 's'} matched. That is not enough to corroborate anything on its own.`
        : 'No article in the current snapshot matches these terms. Try different wording, or check the claim against a primary source.';

  return { claim, evidence: scored, sources, verdict, note };
}

// -------------------------------------------------------------------- voice

export interface SpeechOptions {
  lang?: string;
  rate?: number;
  onEnd?: () => void;
}

/**
 * Reads text aloud with the browser's speech synthesis.
 *
 * Returns a stop function, or null when the browser has no voices available —
 * the caller shows a plain message rather than a dead button.
 */
export function speak(text: string, options: SpeechOptions = {}): (() => void) | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const synth = window.speechSynthesis;
  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = options.lang ?? 'en-US';
  utterance.rate = options.rate ?? 1;

  const voices = synth.getVoices();
  const preferred = voices.find((voice) => voice.lang.startsWith(utterance.lang));
  if (preferred) utterance.voice = preferred;

  if (options.onEnd) utterance.onend = options.onEnd;
  synth.speak(utterance);

  return () => synth.cancel();
}

/** True when the browser can speak. Checked before rendering a voice control. */
export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}
