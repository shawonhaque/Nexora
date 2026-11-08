# NEXORA — Supabase setup

This document covers everything that has to happen **outside** the codebase for
the site to run against a live database. Nothing here can be done from the
frontend, and none of it is automated by the build.

## What works without Supabase

The site builds and runs with no backend configured. Every public page renders
placeholder content from `src/data/demo.ts` and shows a "Demo content" notice.
Search, filtering, pagination and routing all work. What does **not** work
without Supabase, by design, is sign-in and the admin dashboard — those show a
clear "not connected" message rather than pretending to work.

## 1. Create the project

1. Create a project at <https://supabase.com/dashboard>.
2. Open **Project Settings → API** and copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`

> The `service_role` key must never appear in frontend code or in `.env` files
> that are bundled. It is only for server-side work and is not used anywhere in
> this project yet.

## 2. Configure the environment

```bash
cp .env.example .env.local
```

Fill in the two values, then restart the dev server.

## 3. Run the migrations

Run these in order, in the Supabase **SQL editor**, or with the Supabase CLI:

| File | Purpose |
| --- | --- |
| `migrations/0001_core_schema.sql` | Tables, keys, constraints, indexes, default categories and subjects |
| `migrations/0002_rls_policies.sql` | Row Level Security on every table plus the `is_admin()` helper |
| `migrations/0003_storage.sql` | The three storage buckets and their policies |
| `migrations/0004_first_admin.sql` | Grants the admin role to one existing account |

With the CLI:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

Every file is written to be re-runnable. `0001` uses `create table if not
exists`, `0002` drops each policy before recreating it, and `0003` upserts the
buckets.

## 4. Create the first admin

There is no public sign-up, and no default password anywhere in the project.

1. **Authentication → Users → Add user.** Enter your email, set a password,
   and enable **Auto Confirm User**.
2. Open `migrations/0004_first_admin.sql`, change `admin_email` to that address,
   and run it.

The trigger from `0001` creates a `profiles` row with role `user` for every new
account, so step 2 is what actually grants admin. Re-running it is harmless.

To confirm it worked:

```sql
select u.email, p.role
from public.profiles p
join auth.users u on u.id = p.id
where p.role = 'admin';
```

## 5. Auth settings

In **Authentication → URL Configuration**:

- **Site URL**: your deployed origin, e.g. `https://shawonhaque.github.io/Nexora/`
- **Redirect URLs**: add the same origin plus `/login` so password reset links
  land back on the sign-in page.

Password reset is wired to `auth.resetPasswordForEmail` with a redirect back to
`/login`. It will not send mail until you configure an SMTP provider under
**Project Settings → Auth → SMTP Settings**.

## 6. Storage

The buckets are created by `0003`. Confirm the intended access model:

| Bucket | Public | Who can read | Who can write |
| --- | --- | --- | --- |
| `nexora-images` | yes | everyone | admins only |
| `nexora-pdfs` | no | admins (signed URLs) | admins only |
| `nexora-private` | no | admins (signed URLs) | admins only |

Uploads are validated in the client for MIME type and size, and the bucket
settings enforce the same limits server-side. Private and restricted files are
only ever handed out as short-lived signed URLs.

## 7. Deploying to GitHub Pages

```bash
npm run build
```

The build writes to `dist/`. GitHub Pages serves a project site from
`/<repo>/`, which is why `vite.config.ts` defaults the base path to `/Nexora/`.
Override it when the repository name differs:

```bash
VITE_BASE=/your-repo/ npm run build
```

For deep links such as `/Nexora/books/some-slug`, GitHub Pages needs the
`404.html` fallback that the build copies into `dist/`; without it, a direct
visit to a nested route returns a 404 page instead of the app.

## Security model in one paragraph

Anonymous visitors can read published rows only. Signed-in users can additionally
manage their own `saved_items` rows. Admins can manage all public content and are
the only role that can read or write `diary_entries`. Every one of those rules is
enforced by Postgres policies, not by the React router — the `ProtectedRoute`
component is a convenience for the user, and bypassing it gains nothing because
the database rejects the request anyway. Roles can only be changed by an
administrator other than the account being changed, which is what makes
self-promotion impossible.

## What is not implemented yet

Being explicit so nothing is mistaken for finished:

- Content editors for the admin sections (news, books, study, diary, categories,
  settings). The routes exist, are access-controlled, and say so on the page.
- Scheduled publishing. The `scheduled_at` column exists; the scheduled job that
  acts on it does not.
- Newsletter subscriptions, book reviews, reading lists, quizzes and assignments.
  Their tables are not in `0001`; they are the next phase.
- Analytics. No visitor tracking is implemented, so no traffic numbers are shown
  anywhere.
