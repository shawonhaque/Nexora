-- ---------------------------------------------------------------------------
-- Personalisation tables
--
-- These back the signed-in experience: chosen interests, saved articles,
-- reading history and notifications. Every table is owned by a single user and
-- protected by Row Level Security so one account can never read or write
-- another account's rows.
-- ---------------------------------------------------------------------------

-- ------------------------------------------------------------ interests ----

create table if not exists public.user_interests (
  user_id    uuid not null references auth.users (id) on delete cascade,
  category   text not null check (category in ('world','technology','ai','science','education','business')),
  created_at timestamptz not null default now(),
  primary key (user_id, category)
);

alter table public.user_interests enable row level security;

drop policy if exists "user_interests: own rows" on public.user_interests;
create policy "user_interests: own rows"
  on public.user_interests for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- -------------------------------------------------------- saved articles ----

create table if not exists public.saved_articles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  article_id text not null,
  title      text not null,
  link       text not null,
  source     text not null default '',
  category   text not null default 'world',
  summary    text not null default '',
  saved_at   timestamptz not null default now(),
  unique (user_id, article_id)
);

create index if not exists saved_articles_user_idx on public.saved_articles (user_id, saved_at desc);

alter table public.saved_articles enable row level security;

drop policy if exists "saved_articles: own rows" on public.saved_articles;
create policy "saved_articles: own rows"
  on public.saved_articles for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- -------------------------------------------------------- reading history ---

create table if not exists public.reading_history (
  user_id    uuid not null references auth.users (id) on delete cascade,
  article_id text not null,
  title      text not null,
  link       text not null,
  source     text not null default '',
  category   text not null default 'world',
  viewed_at  timestamptz not null default now(),
  primary key (user_id, article_id)
);

create index if not exists reading_history_user_idx on public.reading_history (user_id, viewed_at desc);

alter table public.reading_history enable row level security;

drop policy if exists "reading_history: own rows" on public.reading_history;
create policy "reading_history: own rows"
  on public.reading_history for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- --------------------------------------------------------- notifications ----

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  title      text not null,
  body       text not null default '',
  link       text,
  kind       text not null default 'system' check (kind in ('new-article','system')),
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "notifications: own rows" on public.notifications;
create policy "notifications: own rows"
  on public.notifications for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- --------------------------------------------------------------- realtime ---
-- Publish changes on notifications so the client can subscribe and show new
-- alerts without polling. Reading history and saved articles are excluded
-- because they are only ever written by the same session that reads them.

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.notifications;
  end if;
exception
  when duplicate_object then null;
end
$$;
