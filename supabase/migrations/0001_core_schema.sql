-- ============================================================================
-- NEXORA — 0001 core schema
--
-- Creates content tables, relationships, constraints and indexes.
-- Row Level Security is enabled separately in 0002 so policies can be reviewed
-- on their own. Statements are idempotent so this file can be re-run safely.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- enums ----

do $do$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type app_role as enum ('admin', 'user');
  end if;
  if not exists (select 1 from pg_type where typname = 'content_status') then
    create type content_status as enum ('draft', 'published', 'archived');
  end if;
end
$do$;

-- ------------------------------------------------------------- profiles ----

create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url   text,
  role         app_role not null default 'user',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on column public.profiles.role is
  'Authoritative role. Never settable from the client: RLS blocks role changes unless the caller is already an admin, and 0004 is the only supported way to grant the first admin.';

-- Create a profile row for every new auth user, always with role 'user'.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$fn$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------- categories ----

create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  description text,
  image_url   text,
  section     text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists categories_section_idx on public.categories (section);

-- ---------------------------------------------------------------- posts ----

create table if not exists public.posts (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  slug            text not null unique,
  subtitle        text,
  excerpt         text,
  content         text,
  cover_image     text,
  image_caption   text,
  image_credit    text,
  category_id     uuid references public.categories (id) on delete set null,
  author_id       uuid references auth.users (id) on delete set null,
  section         text not null,
  tags            text[] default '{}',
  status          content_status not null default 'draft',
  is_featured     boolean not null default false,
  is_breaking     boolean not null default false,
  is_editors_pick boolean not null default false,
  source_name     text,
  source_url      text,
  seo_title       text,
  seo_description text,
  canonical_url   text,
  correction_note text,
  reading_time    integer check (reading_time is null or reading_time > 0),
  scheduled_at    timestamptz,
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists posts_section_status_idx on public.posts (section, status);
create index if not exists posts_published_at_idx   on public.posts (published_at desc nulls last);
create index if not exists posts_category_idx       on public.posts (category_id);
create index if not exists posts_breaking_idx       on public.posts (is_breaking) where is_breaking;
create index if not exists posts_featured_idx       on public.posts (is_featured) where is_featured;
create index if not exists posts_tags_idx           on public.posts using gin (tags);
create index if not exists posts_search_idx on public.posts
  using gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(excerpt, '') || ' ' || coalesce(content, '')));

-- ---------------------------------------------------------------- books ----

create table if not exists public.books (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  slug             text unique,
  subtitle         text,
  author           text,
  publisher        text,
  description      text,
  cover_image      text,
  pdf_url          text,
  external_url     text,
  file_visibility  text check (file_visibility in ('public', 'restricted', 'external')),
  category_id      uuid references public.categories (id) on delete set null,
  publication_year integer check (publication_year is null or publication_year between 1000 and 2100),
  language         text,
  isbn             text,
  page_count       integer check (page_count is null or page_count > 0),
  edition          text,
  format           text,
  tags             text[] default '{}',
  review           text,
  rating           numeric(2,1) check (rating is null or (rating >= 0 and rating <= 5)),
  is_featured      boolean not null default false,
  is_editors_pick  boolean not null default false,
  status           content_status not null default 'draft',
  published_at     timestamptz,
  created_by       uuid references auth.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists books_status_idx       on public.books (status);
create index if not exists books_category_idx     on public.books (category_id);
create index if not exists books_language_idx     on public.books (language);
create index if not exists books_published_at_idx on public.books (published_at desc nulls last);
create index if not exists books_tags_idx         on public.books using gin (tags);
create index if not exists books_search_idx on public.books
  using gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(author, '') || ' ' || coalesce(description, '')));

-- -------------------------------------------------------------- subjects ----

create table if not exists public.subjects (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,
  description   text,
  cover_image   text,
  icon          text,
  level         text,
  status        text not null default 'published' check (status in ('draft', 'published', 'archived')),
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- --------------------------------------------------------- study_resources --

create table if not exists public.study_resources (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  slug          text unique,
  description   text,
  subject       text,
  subject_id    uuid references public.subjects (id) on delete set null,
  course_id     uuid,
  resource_type text,
  level         text,
  language      text,
  file_url      text,
  cover_image   text,
  content       text,
  tags          text[] default '{}',
  is_featured   boolean not null default false,
  status        content_status not null default 'draft',
  published_at  timestamptz,
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists study_status_idx    on public.study_resources (status);
create index if not exists study_subject_idx   on public.study_resources (subject_id);
create index if not exists study_type_idx      on public.study_resources (resource_type);
create index if not exists study_published_idx on public.study_resources (published_at desc nulls last);

-- --------------------------------------------------------------- courses ----

create table if not exists public.courses (
  id                 uuid primary key default gen_random_uuid(),
  title              text not null,
  slug               text not null unique,
  subtitle           text,
  description        text,
  cover_image        text,
  subject_id         uuid references public.subjects (id) on delete set null,
  instructor_name    text,
  difficulty_level   text,
  language           text,
  estimated_duration integer check (estimated_duration is null or estimated_duration > 0),
  status             content_status not null default 'draft',
  is_featured        boolean not null default false,
  created_by         uuid references auth.users (id) on delete set null,
  published_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table if not exists public.course_modules (
  id            uuid primary key default gen_random_uuid(),
  course_id     uuid not null references public.courses (id) on delete cascade,
  title         text not null,
  description   text,
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.lessons (
  id               uuid primary key default gen_random_uuid(),
  module_id        uuid not null references public.course_modules (id) on delete cascade,
  title            text not null,
  slug             text,
  description      text,
  lesson_type      text check (lesson_type in ('text', 'video', 'pdf', 'external', 'download')),
  content          text,
  video_url        text,
  file_url         text,
  duration_minutes integer check (duration_minutes is null or duration_minutes >= 0),
  display_order    integer not null default 0,
  status           content_status not null default 'draft',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists modules_course_idx on public.course_modules (course_id);
create index if not exists lessons_module_idx on public.lessons (module_id);

do $do$
begin
  if not exists (select 1 from pg_constraint where conname = 'study_resources_course_id_fkey') then
    alter table public.study_resources
      add constraint study_resources_course_id_fkey
      foreign key (course_id) references public.courses (id) on delete set null;
  end if;
end
$do$;

-- ------------------------------------------------------------- bookmarks ----

create table if not exists public.bookmarks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  url         text not null,
  description text,
  category    text,
  favicon_url text,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- ideas ----

create table if not exists public.ideas (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  content     text,
  tags        text[] default '{}',
  status      content_status not null default 'draft',
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists ideas_status_idx on public.ideas (status);

-- -------------------------------------------------------- diary_entries ----

-- Private by design: 0002 creates no public read policy for this table.
create table if not exists public.diary_entries (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  content    text,
  mood       text,
  entry_date date not null default current_date,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists diary_entry_date_idx on public.diary_entries (entry_date desc);

-- ---------------------------------------------------------- saved_items ----

create table if not exists public.saved_items (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  content_type text not null,
  content_id   uuid not null,
  created_at   timestamptz not null default now(),
  unique (user_id, content_type, content_id)
);

create index if not exists saved_items_user_idx on public.saved_items (user_id);

-- ------------------------------------------------- keep updated_at fresh ----

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $fn$
begin
  new.updated_at = now();
  return new;
end;
$fn$;

do $do$
declare
  t text;
begin
  foreach t in array array[
    'profiles','categories','posts','books','subjects','study_resources',
    'courses','course_modules','lessons','ideas','diary_entries'
  ]
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.touch_updated_at()', t
    );
  end loop;
end
$do$;

-- ------------------------------------------------- default categories ----

insert into public.categories (name, slug, description, section) values
  ('News',       'news',      'Timely reporting across the topics NEXORA follows.', 'news'),
  ('Books',      'books',     'Reading lists, reviews and library notes.',           'books'),
  ('Study',      'study',     'Notes, guides and exam preparation material.',        'study'),
  ('Knowledge',  'knowledge', 'Explanations that connect ideas across fields.',      'knowledge'),
  ('My Writing', 'writing',   'Essays, reflections and longer-form work.',           'writing'),
  ('Ideas',      'ideas',     'Short notes and half-formed thoughts.',               'ideas'),
  ('Learning',   'learning',  'Guides on learning how to learn.',                    'learning')
on conflict (slug) do nothing;

insert into public.categories (name, slug, description, section) values
  ('Bangladesh',             'bangladesh',             'National news.',                       'news'),
  ('International',          'international',          'World affairs.',                       'news'),
  ('Politics',               'politics',               'Political coverage.',                  'news'),
  ('Business',               'business',               'Markets, banking and enterprise.',     'news'),
  ('Technology',             'technology',             'Software, gadgets and the internet.',  'news'),
  ('Science',                'science',                'Research and discovery.',              'news'),
  ('Education',              'education',              'Schools, universities and policy.',    'news'),
  ('Sports',                 'sports',                 'Sport coverage.',                      'news'),
  ('Environment',            'environment',            'Climate and the natural world.',       'news'),
  ('Health',                 'health',                 'Medicine and public health.',          'news'),
  ('Entertainment',          'entertainment',          'Film, music and culture.',             'news'),
  ('Culture',                'culture',                'Arts and society.',                    'news'),
  ('History',                'history',                'The past and its records.',            'news'),
  ('Research',               'research',               'Academic and applied research.',       'news'),
  ('Artificial Intelligence','artificial-intelligence','AI research and applications.',        'news'),
  ('Space & Astronomy',      'space-astronomy',        'Spaceflight and astronomy.',           'news')
on conflict (slug) do nothing;

insert into public.subjects (name, slug, description, icon, display_order) values
  ('Mathematics',       'mathematics',       'Numbers, structure and reasoning.',         'M',  1),
  ('Physics',           'physics',           'Matter, motion and energy.',                'P',  2),
  ('Chemistry',         'chemistry',         'Substances and their reactions.',           'C',  3),
  ('Biology',           'biology',           'Living systems at every scale.',            'B',  4),
  ('English',           'english',           'Language, literature and composition.',     'E',  5),
  ('Bengali',           'bengali',           'Bengali language and literature.',          'অ',  6),
  ('ICT',               'ict',               'Information and communication technology.', 'ICT',7),
  ('Computer Science',  'computer-science',  'Computation and software systems.',         'CS', 8),
  ('History',           'history',           'People, places and change over time.',      'H',  9),
  ('Geography',         'geography',         'Places, environments and people.',          'G',  10),
  ('Economics',         'economics',         'Production, distribution and trade.',       'Ec', 11),
  ('General Knowledge', 'general-knowledge', 'Wide-ranging background knowledge.',        'GK', 12)
on conflict (slug) do nothing;
