# NEXORA

**Your World of Knowledge.**

A personal knowledge platform: news, books, study resources, knowledge articles,
writing and ideas, collected in one place.

Live: <https://shawonhaque.github.io/Nexora/>

---

## What this is

NEXORA is a multi-page React application, not a single landing page. Public
visitors browse published content; the site owner signs in to an admin dashboard
to manage it. All content access rules are enforced in Postgres, so the
security model holds even if the frontend is bypassed.

## Tech stack

| Layer | Choice | Why |
| --- | --- | --- |
| Build | Vite 5 | Fast dev server, small production bundles |
| UI | React 18 + TypeScript | Strict typing end to end |
| Routing | React Router 6 | Real multi-page routes with code splitting |
| Styling | Tailwind CSS 3 | Design tokens, no unused CSS in the bundle |
| Data | Supabase (Postgres, Auth, Storage) | Managed Postgres with Row Level Security |
| Icons | Inline SVG | No icon dependency to ship or audit |

## Running locally

```bash
npm install
npm run dev
```

The site runs with no backend configured. Public pages show clearly-labelled
placeholder content from `src/data/demo.ts`, and the admin area says the backend
is not connected rather than pretending to work.

To connect a real database, see [`supabase/README.md`](supabase/README.md).

### Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Typecheck, build, and write the Pages `404.html` fallback |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | `tsc --noEmit`, no output on success |
| `npm run lint` | ESLint over `src/` |

## Project structure

```
src/
  components/
    layout/    Header, Footer, RootLayout, PageMeta, ProtectedRoute
    ui/        Section, ButtonLink, StateBlock, SkeletonGrid, DemoNotice
    content/   PostCard, BookCard, ResourceCard, CategoryCard, IdeaCard, BookmarkCard
  context/     ThemeContext (light/dark), AuthContext (session + admin role)
  data/        demo.ts — the only place placeholder content lives
  hooks/       useAsyncData — service call + loading/error/demo state
  lib/         env, supabase client, typed schema, errors, formatting
  pages/       One file per route
  services/    Typed data access; every call returns a Result, never throws
  router.tsx   Route table with lazy-loaded pages
supabase/
  migrations/  0001 schema · 0002 RLS · 0003 storage · 0004 first admin
```

## Design decisions worth knowing

**Every service call returns a `Result`.** Nothing throws across a module
boundary. A failure comes back as `{ data: null, error: {...} }`, so a page can
render an error state without a try/catch around every call.

**Placeholder content is quarantined.** All demo records live in
`src/data/demo.ts`, and every surface that renders them also renders a "Demo
content" notice. There is no path where placeholder text appears as if it were
published.

**Admin gating is defence in depth.** `ProtectedRoute` hides the dashboard from
non-admins for a better experience; Postgres policies are what actually stop
unauthorised reads and writes. The client guard is a convenience, not the
control.

**Roles cannot be self-granted.** A trigger rejects any role change unless the
caller is already an admin *and* is editing someone else's row, so no request
from the browser can promote an account.

**Private data is private by absence.** `diary_entries` has no public or
ordinary-user policy at all — no query, page or search can reach it.

## Deployment

GitHub Pages serves a project site from a subpath, which is why the base path
defaults to `/Nexora/`. To publish:

```bash
npm run build
```

Then publish `dist/` to the `gh-pages` branch (or point Pages at it). The build
copies `index.html` to `404.html` so deep links such as `/Nexora/books/slug`
resolve through the client router instead of returning a GitHub 404.

If the repository is renamed, build with the matching base:

```bash
VITE_BASE=/new-repo-name/ npm run build
```

## Accessibility

- Semantic landmarks: `header`, `nav`, `main`, `footer`, each labelled.
- Exactly one `h1` per page.
- A "Skip to content" link is the first focusable element.
- All interactive controls are real `button` or `a` elements and are keyboard
  reachable; the mobile menu closes on `Escape` and locks background scroll.
- The theme toggle reports its action through `aria-label`, and state is stored
  under `nexora-theme`.
- `prefers-reduced-motion` is respected in the stylesheet.
- Colour pairs were chosen to keep body text readable on both themes.

## Not implemented yet

Stated plainly so nothing reads as finished when it is not:

- Content editors for the admin sections. The routes exist, are access
  controlled, and say so on the page.
- Scheduled publishing. The `scheduled_at` column exists; no job acts on it.
- Newsletter, reviews, reading lists, quizzes and assignments.
- Analytics — none is implemented, so no traffic figures are shown anywhere.

## Licence

MIT. See [LICENSE](LICENSE).
