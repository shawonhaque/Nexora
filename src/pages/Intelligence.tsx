import { useCallback, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArticleSkeleton, ErrorState, Icon } from '../components/news/ArticleCard';
import { FreshnessBar, PageBody, PageHeader, StatCard, SubHeading } from '../components/ui/PageHeader';
import { PageMeta } from '../components/layout/PageMeta';
import { useLiveData } from '../hooks/useLiveData';
import { loadSnapshot } from '../services/newsService';
import {
  buildBriefing,
  canSpeak,
  checkClaim,
  compareSources,
  speak,
  translateLinesToBangla,
  type ComparisonGroup,
  type DailyBriefing,
  type FactCheckResult,
} from '../services/intelligence';
import { relativeTime } from '../lib/format';
import type { NewsArticle } from '../lib/newsTypes';

interface IntelData {
  briefing: DailyBriefing;
  comparisons: ComparisonGroup[];
  corpus: NewsArticle[];
  generatedAt: string;
}

/**
 * The intelligence page.
 *
 * Each tool states exactly what it does and where the result comes from. The
 * translation and speech features call real services; the briefing is
 * extractive and says so; the fact-check tool is an evidence finder and never
 * claims to have verified anything.
 */
export default function Intelligence() {
  const loader = useCallback(async (): Promise<IntelData> => {
    const snapshot = await loadSnapshot();
    return {
      briefing: buildBriefing(snapshot.items, 6),
      comparisons: compareSources(snapshot.items, 6),
      corpus: snapshot.items,
      generatedAt: snapshot.generatedAt,
    };
  }, []);

  const { data, loading, refreshing, error, fetchedAt, refresh } = useLiveData(loader);

  const [briefingBangla, setBriefingBangla] = useState<string[] | null>(null);
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);

  const [speaking, setSpeaking] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);

  const [claim, setClaim] = useState('');
  const [result, setResult] = useState<FactCheckResult | null>(null);

  const briefingText = useMemo(
    () => (data ? data.briefing.lines.map((line, index) => `${index + 1}. ${line.sentence}`).join(' ') : ''),
    [data]
  );

  async function translateBriefing() {
    if (!data?.briefing.lines.length) return;
    setTranslating(true);
    setTranslateError(null);
    try {
      setBriefingBangla(await translateLinesToBangla(data.briefing.lines.map((line) => line.sentence)));
    } catch (cause) {
      setTranslateError(cause instanceof Error ? cause.message : 'Translation failed.');
    } finally {
      setTranslating(false);
    }
  }

  function toggleSpeech(text: string, lang: string) {
    if (speaking) {
      stopRef.current?.();
      stopRef.current = null;
      setSpeaking(false);
      return;
    }
    const stop = speak(text, {
      lang,
      rate: lang === 'bn-BD' ? 0.95 : 1,
      onEnd: () => setSpeaking(false),
    });
    if (stop) {
      stopRef.current = stop;
      setSpeaking(true);
    }
  }

  function runCheck() {
    if (!data || !claim.trim()) return;
    setResult(checkClaim(claim, data.corpus));
  }

  const speechAvailable = canSpeak();

  return (
    <>
      <PageMeta
        title="Nexora AI"
        description="A daily briefing, Bangla translation, voice news, source comparison and an evidence finder — each one stating exactly how it works."
      />
      <PageHeader
        eyebrow="Nexora AI"
        title="Intelligence"
        description="Reading tools built on the live snapshot. Each panel says what it actually does, so you can trust the parts that are automated and check the parts that are not."
        icon="brain"
        actions={
          <Link to="/world" className="btn-ghost">
            <Icon name="globe" className="h-4 w-4" /> World news
          </Link>
        }
      />

      <PageBody className="space-y-10">
        <FreshnessBar
          fetchedAt={fetchedAt}
          refreshing={refreshing}
          onRefresh={refresh}
          note={data?.generatedAt ? `Snapshot ${relativeTime(data.generatedAt)}` : undefined}
        />

        {loading && <ArticleSkeleton count={3} />}
        {!loading && error && <ErrorState message={error} onRetry={refresh} />}

        {!loading && !error && data && (
          <>
            <section aria-label="Overview">
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard label="Briefing items" value={data.briefing.lines.length} hint="Selected from the most-covered stories" icon="sparkle" />
                <StatCard label="Cross-source stories" value={data.comparisons.length} hint="Reported by more than one newsroom" icon="globe" tone="accent2" />
                <StatCard label="Articles indexed" value={data.corpus.length} hint="Searchable by the evidence finder" icon="search" />
              </div>
            </section>

            {/* ------------------------------------------------ daily briefing */}
            <section aria-labelledby="briefing-heading" className="glass p-5 sm:p-7">
              <SubHeading
                id="briefing-heading"
                title="Daily briefing"
                hint="The opening sentence of the most widely covered stories, copied verbatim from the publishers. Selection and ordering are automatic; the words are not ours."
                action={
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={translateBriefing}
                      disabled={translating}
                      className="btn-ghost !py-2 text-xs"
                    >
                      <Icon name="sparkle" className="h-3.5 w-3.5" />
                      {translating ? 'Translating…' : briefingBangla ? 'Re-translate' : 'বাংলায় দেখুন'}
                    </button>
                    {speechAvailable && (
                      <button
                        type="button"
                        onClick={() => toggleSpeech(briefingBangla ? briefingBangla.join(' ') : briefingText, briefingBangla ? 'bn-BD' : 'en-US')}
                        className="btn-ghost !py-2 text-xs"
                      >
                        <Icon name={speaking ? 'close' : 'bell'} className="h-3.5 w-3.5" />
                        {speaking ? 'Stop' : 'Listen'}
                      </button>
                    )}
                  </div>
                }
              />

              {translateError && (
                <p className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                  {translateError}
                </p>
              )}

              <ol className="space-y-4">
                {data.briefing.lines.map((line, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="mt-0.5 font-mono text-sm font-bold text-accent">{index + 1}</span>
                    <div className="min-w-0">
                      <p className="text-sm leading-relaxed text-fg">
                        {briefingBangla?.[index] ?? line.sentence}
                      </p>
                      {line.article && (
                        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                          <span className="font-medium text-accent">{line.article.source}</span>
                          <span aria-hidden="true">·</span>
                          <a
                            href={line.article.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 hover:text-accent hover:underline"
                          >
                            Read the original <Icon name="external" className="h-3 w-3" />
                          </a>
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>

              {briefingBangla && (
                <p className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-muted">
                  অনুবাদ MyMemory অনুবাদ সেবা দিয়ে করা হয়েছে। মূল ইংরেজি পাঠই প্রামাণিক — সন্দেহ হলে মূল লিংকে দেখুন।
                </p>
              )}
            </section>

            {/* --------------------------------------------- source comparison */}
            <section aria-labelledby="compare-heading">
              <SubHeading
                id="compare-heading"
                title="Source comparison"
                hint="Stories that several newsrooms covered in the same words, grouped so you can read how each one framed it. Grouping is word matching, not editorial judgement."
              />
              {data.comparisons.length === 0 ? (
                <p className="glass px-4 py-6 text-sm text-muted">
                  No story in the current snapshot was covered by more than one publisher. Try again after the next feed refresh.
                </p>
              ) : (
                <div className="space-y-4">
                  {data.comparisons.map((group) => (
                    <article key={group.key} className="glass p-5">
                      <h3 className="text-[1.02rem] font-semibold leading-snug text-heading">{group.lead.title}</h3>
                      <p className="mt-1 text-xs text-muted">
                        {group.sourceCount} publishers · {group.articles.length} articles
                      </p>
                      <ul className="mt-4 space-y-3">
                        {group.articles.map((article) => (
                          <li key={article.id} className="rounded-lg border border-line bg-elevated/30 p-3">
                            <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
                              <span className="font-semibold text-accent">{article.source}</span>
                              {article.publishedAt && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <time dateTime={article.publishedAt}>{relativeTime(article.publishedAt)}</time>
                                </>
                              )}
                            </p>
                            <a
                              href={article.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 block text-sm font-medium leading-snug text-heading transition hover:text-accent"
                            >
                              {article.title}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {/* -------------------------------------------------- fact check */}
            <section aria-labelledby="check-heading" className="glass p-5 sm:p-7">
              <SubHeading
                id="check-heading"
                title="Evidence finder"
                hint="Type a claim to see which publishers have coverage matching it. This finds evidence — it does not verify facts, and it will not tell you what is true."
              />
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  value={claim}
                  onChange={(event) => setClaim(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') runCheck();
                  }}
                  placeholder="e.g. Bangladesh central bank raised interest rates"
                  className="field flex-1"
                  aria-label="Claim to search for"
                />
                <button type="button" onClick={runCheck} className="btn-primary" disabled={!claim.trim()}>
                  <Icon name="search" className="h-4 w-4" /> Find coverage
                </button>
              </div>

              {result && (
                <div className="mt-5 space-y-4">
                  <div
                    className={`rounded-lg border px-4 py-3 text-sm ${
                      result.verdict === 'well-covered'
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                        : result.verdict === 'thin'
                          ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                          : 'border-line bg-elevated/40 text-muted'
                    }`}
                  >
                    <p className="font-semibold">
                      {result.verdict === 'well-covered'
                        ? 'Multiple publishers have related coverage'
                        : result.verdict === 'thin'
                          ? 'Only limited coverage found'
                          : 'No related coverage found'}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed opacity-90">{result.note}</p>
                  </div>

                  {result.evidence.length > 0 && (
                    <ul className="space-y-2">
                      {result.evidence.map((article) => (
                        <li key={article.id} className="rounded-lg border border-line bg-elevated/30 p-3">
                          <a
                            href={article.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium leading-snug text-heading transition hover:text-accent"
                          >
                            {article.title}
                          </a>
                          <p className="mt-1 text-xs text-muted">
                            {article.source}
                            {article.publishedAt && ` · ${relativeTime(article.publishedAt)}`}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </section>

            <section className="glass p-5 sm:p-6">
              <SubHeading title="How these tools work" hint="No hidden model, no invented sources." />
              <ul className="grid gap-3 text-xs leading-relaxed text-muted sm:grid-cols-2">
                <li className="rounded-lg border border-line bg-elevated/30 p-3">
                  <span className="font-semibold text-heading">Briefing</span> — extractive. It picks the first sentence of the stories covered by the most outlets and copies it exactly.
                </li>
                <li className="rounded-lg border border-line bg-elevated/30 p-3">
                  <span className="font-semibold text-heading">Translation</span> — a real translation service (MyMemory), called from your browser. It is rate limited, so it may ask you to try again.
                </li>
                <li className="rounded-lg border border-line bg-elevated/30 p-3">
                  <span className="font-semibold text-heading">Voice</span> — your device's own speech synthesis. Nothing is sent anywhere, and Bangla audio depends on a Bangla voice being installed.
                </li>
                <li className="rounded-lg border border-line bg-elevated/30 p-3">
                  <span className="font-semibold text-heading">Comparison &amp; evidence</span> — word matching across the snapshot. It shows you the links and lets you decide; it never asserts a verdict.
                </li>
              </ul>
            </section>
          </>
        )}
      </PageBody>
    </>
  );
}
