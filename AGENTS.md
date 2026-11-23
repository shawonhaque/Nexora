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

## Visual language

The UI is set as an editorial paper, not a dashboard. Keep it that way.

- **Palette.** Warm cream stock and warm charcoal, with terracotta
  (`--c-accent`) as the only opinionated colour and muted brass
  (`--c-accent2`) as a secondary mark. Both themes are defined as RGB triplets
  in `src/styles.css`. Do not reintroduce violet, cyan, or gradient fills.
- **No gradients.** `bg-brand-glow` and `text-gradient` are kept as names for
  older call sites but now render flat. Anything that needs emphasis uses the
  accent colour, not a blend.
- **Depth is hairlines, not shadows.** `.card` is just
  `border border-line bg-surface`. There is no `.glass` class any more — do not
  reintroduce translucency or `backdrop-blur` panels. Corners are square
  (`borderRadius.DEFAULT` is `0px`). Radius is reserved for circular marks
  (badges, avatars) and nothing else.
- **Type.** Fraunces (serif) for every heading, Instrument Sans for body,
  IBM Plex Mono for metadata. Weight carries the hierarchy: mastheads and
  feature headlines are bold and tight, running text is light and open. Use
  `.display` for page-level titles and `.kicker` / `.eyebrow` for small caps
  labels.
- **Texture.** `body` carries an inline SVG turbulence tile for paper grain.
  It is fixed-attachment and very low opacity; keep it subtle.
- **Layout is asymmetric on purpose.** `Home` runs a lead story at 7/12, a
  secondary column at 5/12, then a text-only wire list. `ArticleCard` has three
  variants — `featured`, `standard`, `text` — and `text` deliberately has no
  image so lists can breathe without a grid of identical thumbnails. Do not
  collapse these back into one uniform card grid.
- **The rail is page-coloured.** `RootLayout` sets `.rail` on the sidebar and
  drawer; it paints `bg-bg` and separates with a hairline on its inner edge, so
  the sidebar reads as part of the sheet rather than a dark appliance. Style
  anything inside it with the ordinary page tokens.
- **`--c-on-accent` exists for a reason.** Terracotta is dark in light mode but
  lifted in dark mode, so white-on-accent only passes AA in light mode. Buttons
  use `text-onaccent`, which flips per theme.
- **Copy has a voice.** Empty and error states are dry and human — "Nothing
  kept yet", "The wires are quiet". No exclamation marks, no "Oops", no
  congratulating the reader for clicking things.
