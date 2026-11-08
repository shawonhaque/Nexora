/**
 * Build-time feed fetcher.
 *
 * Browsers cannot read most news RSS feeds directly: the servers do not send
 * CORS headers. The build, however, runs in Node on GitHub Actions with open
 * network access, so the real feeds are fetched here and written to a JSON
 * snapshot that the site loads statically.
 *
 * Every item in the output is real: the title, link, source, and publication
 * date all come from the publisher's own feed. Nothing is generated.
 *
 * If a feed fails, it is reported and skipped — the previous snapshot for that
 * source is not invented, and the build continues with the sources that worked.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

const OUT = join(process.cwd(), 'public', 'data', 'feeds.json');
const TIMEOUT_MS = 20000;
const MAX_ITEMS_PER_FEED = 20;
const USER_AGENT = 'NexoraBot/1.0 (+https://github.com/shawonhaque/Nexora)';

/**
 * The feed registry. `category` maps to the site sections; `home` is the
 * publisher's homepage, shown as attribution.
 */
const FEEDS = [
  // ---- World news -------------------------------------------------------
  { id: 'bbc-world', name: 'BBC News', home: 'https://www.bbc.com/news', category: 'world', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { id: 'npr-news', name: 'NPR', home: 'https://www.npr.org', category: 'world', url: 'https://feeds.npr.org/1001/rss.xml' },
  { id: 'aljazeera', name: 'Al Jazeera', home: 'https://www.aljazeera.com', category: 'world', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
  { id: 'guardian-world', name: 'The Guardian', home: 'https://www.theguardian.com/world', category: 'world', url: 'https://www.theguardian.com/world/rss' },

  // ---- Technology -------------------------------------------------------
  { id: 'bbc-tech', name: 'BBC News', home: 'https://www.bbc.com/news/technology', category: 'technology', url: 'https://feeds.bbci.co.uk/news/technology/rss.xml' },
  { id: 'ars-technica', name: 'Ars Technica', home: 'https://arstechnica.com', category: 'technology', url: 'https://feeds.arstechnica.com/arstechnica/index' },
  { id: 'techcrunch', name: 'TechCrunch', home: 'https://techcrunch.com', category: 'technology', url: 'https://techcrunch.com/feed/' },
  { id: 'guardian-tech', name: 'The Guardian', home: 'https://www.theguardian.com/uk/technology', category: 'technology', url: 'https://www.theguardian.com/uk/technology/rss' },
  { id: 'npr-tech', name: 'NPR', home: 'https://www.npr.org/sections/technology/', category: 'technology', url: 'https://feeds.npr.org/1019/rss.xml' },

  // ---- Artificial intelligence -----------------------------------------
  { id: 'mit-tech-review', name: 'MIT Technology Review', home: 'https://www.technologyreview.com', category: 'ai', url: 'https://www.technologyreview.com/feed/' },
  { id: 'marktechpost', name: 'MarkTechPost', home: 'https://www.marktechpost.com', category: 'ai', url: 'https://www.marktechpost.com/feed/' },
  { id: 'venturebeat-ai', name: 'VentureBeat', home: 'https://venturebeat.com/category/ai/', category: 'ai', url: 'https://venturebeat.com/category/ai/feed/' },

  // ---- Science ----------------------------------------------------------
  { id: 'bbc-science', name: 'BBC News', home: 'https://www.bbc.com/news/science_and_environment', category: 'science', url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml' },
  { id: 'nature', name: 'Nature', home: 'https://www.nature.com', category: 'science', url: 'https://www.nature.com/nature.rss' },
  { id: 'sciencedaily', name: 'ScienceDaily', home: 'https://www.sciencedaily.com', category: 'science', url: 'https://www.sciencedaily.com/rss/top/science.xml' },
  { id: 'guardian-science', name: 'The Guardian', home: 'https://www.theguardian.com/science', category: 'science', url: 'https://www.theguardian.com/science/rss' },
  { id: 'npr-science', name: 'NPR', home: 'https://www.npr.org/sections/science/', category: 'science', url: 'https://feeds.npr.org/1007/rss.xml' },

  // ---- Education --------------------------------------------------------
  { id: 'bbc-education', name: 'BBC News', home: 'https://www.bbc.com/news/education', category: 'education', url: 'https://feeds.bbci.co.uk/news/education/rss.xml' },
  { id: 'guardian-education', name: 'The Guardian', home: 'https://www.theguardian.com/education', category: 'education', url: 'https://www.theguardian.com/education/rss' },
  { id: 'npr-education', name: 'NPR', home: 'https://www.npr.org/sections/education/', category: 'education', url: 'https://feeds.npr.org/1013/rss.xml' },
  { id: 'inside-higher-ed', name: 'Inside Higher Ed', home: 'https://www.insidehighered.com', category: 'education', url: 'https://www.insidehighered.com/rss.xml' },

  // ---- Business & innovation -------------------------------------------
  { id: 'bbc-business', name: 'BBC News', home: 'https://www.bbc.com/news/business', category: 'business', url: 'https://feeds.bbci.co.uk/news/business/rss.xml' },
  { id: 'guardian-business', name: 'The Guardian', home: 'https://www.theguardian.com/uk/business', category: 'business', url: 'https://www.theguardian.com/uk/business/rss' },
  { id: 'npr-business', name: 'NPR', home: 'https://www.npr.org/sections/business/', category: 'business', url: 'https://feeds.npr.org/1006/rss.xml' },
];

// ---------------------------------------------------------------- utilities

function decodeEntities(input) {
  const named = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    mdash: '—', ndash: '–', hellip: '…', rsquo: '\u2019', lsquo: '\u2018',
    ldquo: '\u201C', rdquo: '\u201D', middot: '·', bull: '•', times: '×',
    copy: '©', reg: '®', deg: '°', eacute: 'é', pound: '£', euro: '€',
  };
  return input
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => safeCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => safeCodePoint(parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (match, name) => named[name.toLowerCase()] ?? match);
}

function safeCodePoint(code) {
  try {
    return String.fromCodePoint(code);
  } catch {
    return '';
  }
}

/**
 * Removes markup and collapses whitespace, leaving plain readable text.
 *
 * Publishers encode markup inconsistently: some send real tags, others send
 * entity-escaped tags (`&lt;p&gt;`). Decoding after stripping would leave those
 * escaped tags visible as literal text, so the sequence is strip, decode,
 * strip again, decode again.
 */
function toPlainText(html) {
  const strip = (value) =>
    value
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<\/p>/gi, ' ')
      .replace(/<[^>]+>/g, '');

  const text = decodeEntities(strip(decodeEntities(strip(String(html ?? '')))));
  return text.replace(/\s+/g, ' ').trim();
}

/** Reads the text of the first matching tag, CDATA included. */
function tagText(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i'));
  if (!match) return '';
  const raw = match[1].trim();
  const cdata = raw.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  return cdata ? cdata[1].trim() : raw;
}

function attrValue(xml, tag, attr) {
  const match = xml.match(new RegExp(`<${tag}[^>]*\\s${attr}=["']([^"']+)["'][^>]*>`, 'i'));
  return match ? match[1] : '';
}

function splitEntries(xml) {
  const items = [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map((m) => m[1]);
  if (items.length) return items;
  return [...xml.matchAll(/<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/gi)].map((m) => m[1]);
}

function extractImage(entry, description) {
  const media = attrValue(entry, 'media:content', 'url') || attrValue(entry, 'media:thumbnail', 'url');
  if (media) return media;
  const enclosure = entry.match(/<enclosure[^>]*\stype=["']image\/[^"']+["'][^>]*>/i);
  if (enclosure) {
    const url = enclosure[0].match(/\surl=["']([^"']+)["']/i);
    if (url) return url[1];
  }
  const img = String(description ?? '').match(/<img[^>]*\ssrc=["']([^"']+)["']/i);
  return img ? img[1] : '';
}

function parseDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

/** Stable id so the same article keeps its identity across rebuilds. */
function makeId(sourceId, link, title) {
  const basis = link || title;
  let hash = 0;
  for (let i = 0; i < basis.length; i += 1) {
    hash = (hash * 31 + basis.charCodeAt(i)) | 0;
  }
  return `${sourceId}-${(hash >>> 0).toString(36)}`;
}

function parseFeed(xml, source) {
  const entries = splitEntries(xml);
  const out = [];
  for (const entry of entries.slice(0, MAX_ITEMS_PER_FEED)) {
    const title = toPlainText(tagText(entry, 'title'));
    if (!title) continue;

    const link =
      tagText(entry, 'link') ||
      attrValue(entry, 'link', 'href') ||
      tagText(entry, 'guid');

    const rawDescription =
      tagText(entry, 'description') ||
      tagText(entry, 'summary') ||
      tagText(entry, 'content') ||
      tagText(entry, 'content:encoded');

    const summary = toPlainText(rawDescription).slice(0, 420);

    const published =
      tagText(entry, 'pubDate') ||
      tagText(entry, 'published') ||
      tagText(entry, 'updated') ||
      tagText(entry, 'dc:date');

    out.push({
      id: makeId(source.id, link, title),
      title,
      link: link.trim(),
      summary,
      image: extractImage(entry, rawDescription),
      publishedAt: parseDate(published),
      category: source.category,
      source: source.name,
      sourceId: source.id,
      sourceHome: source.home,
    });
  }
  return out;
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'user-agent': USER_AGENT, accept: 'application/rss+xml, application/xml, text/xml, */*' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

// -------------------------------------------------------------------- main

async function loadPrevious() {
  if (!existsSync(OUT)) return null;
  try {
    return JSON.parse(await readFile(OUT, 'utf8'));
  } catch {
    return null;
  }
}

async function main() {
  const previous = await loadPrevious();
  const items = [];
  const sources = [];
  const failures = [];

  const results = await Promise.allSettled(
    FEEDS.map(async (source) => {
      const xml = await fetchWithTimeout(source.url);
      const parsed = parseFeed(xml, source);
      if (!parsed.length) throw new Error('no entries found');
      return { source, parsed };
    })
  );

  results.forEach((result, index) => {
    const source = FEEDS[index];
    if (result.status === 'fulfilled') {
      sources.push({
        id: source.id,
        name: source.name,
        home: source.home,
        category: source.category,
        count: result.value.parsed.length,
      });
      items.push(...result.value.parsed);
    } else {
      failures.push({ id: source.id, reason: String(result.reason?.message ?? result.reason) });
    }
  });

  // De-duplicate by id, keeping the first occurrence.
  const seen = new Set();
  const unique = items.filter((item) => {
    if (!item.link || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });

  unique.sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));

  const snapshot = {
    generatedAt: new Date().toISOString(),
    itemCount: unique.length,
    sourceCount: sources.length,
    sources,
    failures,
    items: unique,
  };

  if (!unique.length) {
    if (previous?.items?.length) {
      console.warn('feeds: every source failed; keeping the previous snapshot untouched.');
      return;
    }
    console.error('feeds: no items fetched and no previous snapshot exists.');
    process.exitCode = 1;
    return;
  }

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(snapshot));

  console.log(`feeds: wrote ${unique.length} items from ${sources.length}/${FEEDS.length} sources.`);
  if (failures.length) {
    console.warn(`feeds: ${failures.length} source(s) unavailable: ${failures.map((f) => f.id).join(', ')}`);
  }
}

main().catch((error) => {
  console.error('feeds: unexpected failure —', error);
  process.exitCode = 1;
});
