-- ============================================================================
-- NEXORA — 0002 Row Level Security
--
-- Every table gets RLS enabled and explicit policies. The rules follow one
-- pattern:
--
--   anonymous  -> read published public content only
--   user       -> read published public content, manage only their own rows
--   admin      -> full management of public content and private diary
--
-- Admin identity is resolved by public.is_admin(), which reads the profiles
-- table. It is SECURITY DEFINER so it can read profiles without re-entering
-- the profiles policy (that would recurse), and its search_path is pinned so
-- it cannot be hijacked.
-- ============================================================================

-- ----------------------------------------------------------- is_admin() ----

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$fn$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

comment on function public.is_admin() is
  'True when the current auth.uid() has the admin role. SECURITY DEFINER with a pinned search_path so it can read profiles without recursing through the profiles policy.';

-- Enable RLS everywhere. This is deliberately a loop so a new table added to
-- the list below can never be silently left unprotected.
do $do$
declare
  t text;
begin
  foreach t in array array[
    'profiles','categories','posts','books','subjects','study_resources',
    'courses','course_modules','lessons','bookmarks','ideas','diary_entries','saved_items'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end
$do$;

-- ============================================================= profiles ====

drop policy if exists "profiles: own row readable" on public.profiles;
create policy "profiles: own row readable"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles: own row updatable" on public.profiles;
create policy "profiles: own row updatable"
  on public.profiles for update
  to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- Only an existing admin may change a role. The trigger below additionally
-- blocks self-promotion, so even an admin cannot silently escalate a user
-- through this path without a deliberate second action.
drop policy if exists "profiles: admin can insert" on public.profiles;
create policy "profiles: admin can insert"
  on public.profiles for insert
  to authenticated
  with check (public.is_admin() or id = auth.uid());

create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  if new.role is distinct from old.role then
    -- Allow only when the caller is already an admin AND is not editing their
    -- own row. Self-promotion is never permitted, even for an admin.
    if not public.is_admin() or new.id = auth.uid() then
      raise exception 'Changing a role requires another administrator';
    end if;
  end if;
  return new;
end;
$fn$;

drop trigger if exists profiles_guard_role on public.profiles;
create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.prevent_role_self_escalation();

-- =========================================================== categories ====

drop policy if exists "categories: public read" on public.categories;
create policy "categories: public read"
  on public.categories for select
  to anon, authenticated
  using (true);

drop policy if exists "categories: admin write" on public.categories;
create policy "categories: admin write"
  on public.categories for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ================================================================ posts ====

drop policy if exists "posts: published readable" on public.posts;
create policy "posts: published readable"
  on public.posts for select
  to anon, authenticated
  using (status = 'published' or public.is_admin());

drop policy if exists "posts: admin insert" on public.posts;
create policy "posts: admin insert"
  on public.posts for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "posts: admin update" on public.posts;
create policy "posts: admin update"
  on public.posts for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "posts: admin delete" on public.posts;
create policy "posts: admin delete"
  on public.posts for delete
  to authenticated
  using (public.is_admin());

-- ================================================================ books ====

drop policy if exists "books: published readable" on public.books;
create policy "books: published readable"
  on public.books for select
  to anon, authenticated
  using (status = 'published' or public.is_admin());

drop policy if exists "books: admin write" on public.books;
create policy "books: admin write"
  on public.books for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================= subjects ====

drop policy if exists "subjects: published readable" on public.subjects;
create policy "subjects: published readable"
  on public.subjects for select
  to anon, authenticated
  using (status = 'published' or public.is_admin());

drop policy if exists "subjects: admin write" on public.subjects;
create policy "subjects: admin write"
  on public.subjects for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ====================================================== study_resources ====

drop policy if exists "study: published readable" on public.study_resources;
create policy "study: published readable"
  on public.study_resources for select
  to anon, authenticated
  using (status = 'published' or public.is_admin());

drop policy if exists "study: admin write" on public.study_resources;
create policy "study: admin write"
  on public.study_resources for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ==================================================== courses / lessons ====

drop policy if exists "courses: published readable" on public.courses;
create policy "courses: published readable"
  on public.courses for select
  to anon, authenticated
  using (status = 'published' or public.is_admin());

drop policy if exists "courses: admin write" on public.courses;
create policy "courses: admin write"
  on public.courses for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Modules and lessons inherit visibility from their published course.
drop policy if exists "modules: readable when course published" on public.course_modules;
create policy "modules: readable when course published"
  on public.course_modules for select
  to anon, authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.courses c
      where c.id = course_modules.course_id and c.status = 'published'
    )
  );

drop policy if exists "modules: admin write" on public.course_modules;
create policy "modules: admin write"
  on public.course_modules for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "lessons: readable when published" on public.lessons;
create policy "lessons: readable when published"
  on public.lessons for select
  to anon, authenticated
  using (
    public.is_admin()
    or (
      status = 'published'
      and exists (
        select 1
        from public.course_modules m
        join public.courses c on c.id = m.course_id
        where m.id = lessons.module_id and c.status = 'published'
      )
    )
  );

drop policy if exists "lessons: admin write" on public.lessons;
create policy "lessons: admin write"
  on public.lessons for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================ bookmarks ====

-- The bookmark collection is admin-curated and publicly readable.
drop policy if exists "bookmarks: public read" on public.bookmarks;
create policy "bookmarks: public read"
  on public.bookmarks for select
  to anon, authenticated
  using (true);

drop policy if exists "bookmarks: admin write" on public.bookmarks;
create policy "bookmarks: admin write"
  on public.bookmarks for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ================================================================ ideas ====

drop policy if exists "ideas: published readable" on public.ideas;
create policy "ideas: published readable"
  on public.ideas for select
  to anon, authenticated
  using (status = 'published' or public.is_admin());

drop policy if exists "ideas: admin write" on public.ideas;
create policy "ideas: admin write"
  on public.ideas for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ======================================================== diary_entries ====

-- Admin-only, with no public or ordinary-user policy of any kind. This is what
-- keeps diary content out of public pages and global search.
drop policy if exists "diary: admin only" on public.diary_entries;
create policy "diary: admin only"
  on public.diary_entries for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ========================================================== saved_items ====

drop policy if exists "saved_items: own rows" on public.saved_items;
create policy "saved_items: own rows"
  on public.saved_items for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ==================================================== helper: promote ====
-- Deliberately not a client-callable function. Promoting a user is done by
-- running the SQL in 0004 as the project owner, or from the SQL editor.
-- No policy anywhere permits writing the admin role from the browser.
