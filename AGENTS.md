# AGENTS.md

Repository notes for **NEXORA**, a live global news platform (React + Vite +
Tailwind) published to GitHub Pages at `https://shawonhaque.github.io/Nexora/`.

## Layout

- `scripts/feeds.mjs` — build-time collector. Fetches every publisher feed, then
  writes `public/data/feeds.json` (the snapshot the whole app reads).
- `src/lib/regions.ts` — continent definitions and the Bangladesh desk union.
- `src/services/newsService.ts` — snapshot loading, category metadata
  (`CATEGORY_META`), story clustering (`clusterStories`), per-feed selectors.
- `src/services/intelligence.ts` — briefing, Bangla translation, source
  comparison, claim/evidence finder, speech.
- `src/pages/` — `Home`, `World`, `ContinentPage`, `Bangladesh`, `Intelligence`,
  plus the per-category feed pages.
- `scripts/postbuild.mjs` — writes per-route HTML shells, `404.html`, sitemap.

## Commands

```bash
npm run feeds      # refetch publisher feeds into public/data/feeds.json
npm run typecheck  # tsc --noEmit
npm run lint       # eslint, --max-warnings 0
npm run build      # feeds + tsc -b + vite build + postbuild
```

Base path is `/Nexora/` by default, overridable with `VITE_BASE`.

## Rules the collector must keep

- **Freshness.** `MAX_AGE_DAYS = 14`. Older items are dropped; the publisher's
  archive pages otherwise flood the feed with years-old articles.
- **Dedupe by link, not id.** Syndicated feeds repeat the same URL under
  different ids.
- **No future timestamps.** Clamp or drop them; a bad publisher clock otherwise
  makes articles read "in 43 minutes".
- **Continent must match the publisher.** A feed belongs to a continent because
  its newsroom is there, not because its topic is loosely related. General
  science outlets (Nature, NSF) were removed from Antarctica for this reason —
  only genuinely polar desks (AAD, BAS, ALE) belong there.

## Gotchas

- Continent routes are a closed set, so `postbuild.mjs` must emit a real shell
  and a sitemap entry for each. Left to `404.html` they answer with a 404 status,
  which tells crawlers the page does not exist.
- `breaking` is the generic front-page category for top-story feeds. Its display
  label is "Front Page" — calling it "Breaking News" mislabels features and
  analysis that sit on a homepage. The DB value stays `breaking`.
- Bangla translation must run **per briefing line**, not on the joined block.
  Translating everything at once forces a single publisher attribution onto text
  from several different publishers.
- `recommendArticles` falls back to "newest N" when the reader has no saved
  articles, history or interests. That duplicates the feed above, so `Home`
  hides the section unless at least one signal exists.
- The snapshot is fetched at runtime from `${BASE_PATH}data/feeds.json`, so any
  route shell works as long as the base path is right.
- Article lists paginate, they never "show more". Use
  `src/components/ui/Pagination.tsx` with `PAGE_SIZE = 12`: it renders the
  numbered pages, states the exact `Showing a–b of n` range, and scrolls the
  list back into view on change. Reset the page to 1 whenever a filter, sort,
  desk or query changes, otherwise the reader can be stranded on a page the new
  result set no longer has.
