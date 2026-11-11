# NEXORA

**Explore. Discover. Stay Ahead.**

A global knowledge platform: a live news dashboard, intelligent search, and a
personal library for what you save and read.

Live: <https://shawonhaque.github.io/Nexora/>

---

## What this is

NEXORA collects reporting from established publishers into a single, readable
dashboard, ranks those articles against a question, and keeps a personal
library. It is a multi-page React application, not a landing page.

Signed-in readers get a library that unifies what they saved with what they have
read, plus statistics computed from their own rows: totals, a reading streak, a
fourteen-day activity chart and the sources they return to most. The home page
suggests what to read next and states the reason for each suggestion.

It is **not** a news organisation. It does not write, rewrite or editorialise.
Every article links to the publisher's own page, and the source and publication
time shown come from that publisher's feed.

## Where the information comes from

Two delivery paths, both showing real published data:

| Path | Sources | How |
| --- | --- | --- |
| Publisher feeds | BBC, The Guardian, NPR, Al Jazeera, Ars Technica, TechCrunch, MIT Technology Review, MarkTechPost, Nature, ScienceDaily, Inside Higher Ed | Fetched at build time into a static snapshot, because most news servers do not allow browser reads of their feeds |
| Live APIs | Hacker News, Hugging Face, GitHub, Wikipedia | Fetched in the browser on page open; all are CORS-enabled |

The snapshot is produced by `scripts/feeds.mjs` and records the time it was
collected. The interface shows that time rather than implying the data is
second-by-second. Live API responses are cached briefly and calls are spaced out
to respect each provider's rate limits (`src/lib/apiCache.ts`).

## What is generated, and what is not

Stated plainly, because the difference matters:

- Article titles, summaries, sources and timestamps are the publisher's own
  data, reproduced as received.
- Search summaries are **extractive**: the sentences shown already exist in the
  retrieved articles, and each carries a numbered citation to its source
  (`src/services/intelligentSearch.ts`). Ranking is BM25 with field weighting,
  not substring position, and each result shows a normalised relevance score.
  Terms that match nothing are reported, and near-miss terms get a suggestion.
- Trending lists, model lists and historical events come from live APIs and link
  to the original.
- No article, statistic or quotation is invented. There are no synthetic live
  counters.
- Search does not call a language model. That would need an API key, and an API
  key cannot be kept secret in a static front-end, so the interface says the
  summary is extracted rather than pretending otherwise. Adding a generation
  backend later means replacing one function, `buildExtractiveSummary`.

## Tech stack

| Layer | Choice | Why |
| --- | --- | --- |
| Build | Vite 5 | Fast dev server, small production bundles |
| UI | React 18 + TypeScript | Strict typing end to end |
| Routing | React Router 6 | Real routes with per-page code splitting |
| Styling | Tailwind CSS 3 | Design tokens for light and dark, no unused CSS |
| Data | Supabase (Postgres + RLS) | Managed Postgres; access rules enforced in the database |
| Icons | Inline SVG | No icon dependency to ship or audit |

## Running locally

```bash
npm install
npm run dev
```

The site runs with **no backend configured**. The live feeds, search and the
local personal library all work. Only the Supabase-backed knowledge base
(News archive, Knowledge, Writing, Learning, Books, Study, Ideas) needs a
database, and those pages say the knowledge base is not connected rather than
showing placeholder records.

To run against a real database locally (Docker required):

```bash
npx supabase start        # boots Postgres, Auth, Storage and the REST API
npx supabase db reset     # applies migrations, then supabase/seed.sql
```

`supabase start` prints the API URL and anon key. Put them in `.env.local`:

```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<anon key from the output>
```

Then `npm run dev`. Create the first admin account as described in
[`supabase/README.md`](supabase/README.md). To connect a hosted project instead,
see the same file.

### Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run feeds` | Rebuild the feed snapshot only |
| `npm run build` | Fetch feeds, typecheck, build, write the Pages `404.html` fallback |
| `npm run build:app` | Build without re-fetching feeds |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | `tsc --noEmit`, no output on success |
| `npm run lint` | ESLint over `src/`, zero warnings tolerated |

## Project structure

```
scripts/
  feeds.mjs        Fetches publisher RSS at build time into public/data/feeds.json
  postbuild.mjs    Copies index.html to 404.html for GitHub Pages deep links
src/
  components/
    layout/        RootLayout, TopBar, Sidebar, Footer, PageMeta, ProtectedRoute
    news/          ArticleCard, Icon, empty and error states
    ui/            PageHeader/PageBody/StatCard, Section, ButtonLink, StateBlock
    content/       PostCard, BookCard, ResourceCard and friends
  context/         ThemeContext (light/dark), AuthContext (session + admin role)
  hooks/           useLiveData (remote data + freshness), usePersonalization, useAsyncData
  lib/             env, supabase client, typed schema, API cache, errors, formatting
  pages/           One file per route
  services/        Typed data access; every call returns a Result, never throws
  router.tsx       Route table with lazy-loaded pages
supabase/
  migrations/      0001 schema · 0002 RLS · 0003 storage · 0004 first admin
                   0005 personalisation · 0006 harden profiles INSERT
```

## Design decisions worth knowing

**Every service call returns a `Result`.** Nothing throws across a module
boundary. A failure comes back as `{ data: null, error: {...} }`, so a page can
render an error state without a try/catch around every call.

**No placeholder records exist.** The app previously fell back to hardcoded demo
data when no backend was configured. That has been removed: an unconfigured or
unreachable backend now produces a clear explanation, never invented content.
Backend calls also race a 12-second timeout, so an unreachable project cannot
leave a page on a loading skeleton forever.

**Admin gating is defence in depth.** `ProtectedRoute` hides the dashboard from
non-admins for a better experience; Postgres policies are what actually stop
unauthorised reads and writes. The client guard is a convenience, not the
control.

**Roles cannot be self-granted.** The guard reads `request.jwt.claims`, and a
trigger rejects any role change unless the caller is already an admin *and* is
editing someone else's row.

**Personal data is private by construction.** Interests, saved articles, reading
history and notifications live in tables with RLS policies scoped to
`auth.uid()`. Signed out, the same features work against `localStorage`, and the
interface states which mode is active.

**Untrusted text is never rendered as markup.** Publisher summaries are stripped
of markup and decoded at build time, and links are passed through `safeUrl`,
which allows only `http(s)` URLs.

## Deployment

GitHub Pages serves a project site from a subpath, which is why the base path
defaults to `/Nexora/`. To publish:

```bash
npm run build
```

Then publish `dist/` to the `gh-pages` branch (or point Pages at it). The build
copies `index.html` to `404.html` so deep links such as `/Nexora/books/slug`
resolve through the client router instead of returning a GitHub 404. A scheduled
workflow re-runs the feed fetch so the snapshot stays current.

If the repository is renamed, build with the matching base:

```bash
VITE_BASE=/new-repo-name/ npm run build
```

## Accessibility

- Semantic landmarks: `header`, `nav`, `main`, `footer`, each labelled.
- Exactly one `h1` per page; section headings are real `h2`/`h3` elements.
- A "Skip to content" link is the first focusable element.
- All interactive controls are real `button` or `a` elements, keyboard
  reachable, with visible focus rings. The mobile drawer closes on `Escape` and
  locks background scroll.
- Icon-only controls carry `aria-label`; save toggles expose `aria-pressed`.
- `prefers-reduced-motion` is respected in the stylesheet.

## Not implemented yet

Stated plainly so nothing reads as finished when it is not:

- Automatic scheduled publishing. The `scheduled_at` column exists and the
  dashboard has a **Publish due** action, but it is deliberate and manual: the
  site is served as static files with no server-side scheduler, so nothing runs
  on its own.
- A generation backend for search answers (see above). Summaries are extracted,
  not generated.
- Analytics — none is implemented, so no traffic figures are shown anywhere.

## Licence

MIT. See [LICENSE](LICENSE).
