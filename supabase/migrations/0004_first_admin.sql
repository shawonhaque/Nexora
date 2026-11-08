-- ============================================================================
-- NEXORA — 0004 first admin bootstrap
--
-- Run this ONLY after the first admin account has been created through the
-- Supabase dashboard (Authentication -> Users -> Add user, with "Auto Confirm"
-- enabled). Creating the account first means the password is set by Supabase
-- Auth and never passes through this file or through application code.
--
-- There is no default password anywhere in this project, and no public
-- sign-up route that could create an admin.
--
-- Set admin_email below to your own address, then run this file once in the
-- Supabase SQL editor. It is safe to re-run: it only ever sets the role of the
-- named account.
--
-- If the account does not exist yet, this migration does nothing and says so.
-- It never creates an account and never grants admin to an unknown address,
-- so it is safe to run at any point in a fresh setup (including `supabase db
-- reset`, where no users exist yet).
-- ============================================================================

do $do$
declare
  admin_email text := 'you@example.com';  -- <-- change this
  target_id   uuid;
begin
  select id into target_id
  from auth.users
  where email = admin_email;

  if target_id is null then
    raise notice
      'No auth user found for %. Skipping admin grant. Create the account in Authentication -> Users first, then re-run this file with admin_email set to that address.',
      admin_email;
    return;
  end if;

  insert into public.profiles (id, role)
  values (target_id, 'admin')
  on conflict (id) do update set role = 'admin';

  raise notice 'Granted admin role to % (%).', admin_email, target_id;
end
$do$;

-- ---------------------------------------------------------------------------
-- Verification queries. Run these afterwards to confirm the policies behave.
-- ---------------------------------------------------------------------------
--
-- 1. Confirm exactly the accounts you expect are admins:
--      select p.id, u.email, p.role
--      from public.profiles p
--      join auth.users u on u.id = p.id
--      where p.role = 'admin';
--
-- 2. Confirm RLS is enabled on every table:
--      select tablename, rowsecurity
--      from pg_tables
--      where schemaname = 'public'
--      order by tablename;
--
-- 3. Confirm the diary has no policy that grants access to anon:
--      select policyname, roles, cmd
--      from pg_policies
--      where tablename = 'diary_entries';
--
-- 4. As an anonymous session, this must return zero rows:
--      select * from public.diary_entries;
--
-- 5. As an anonymous session, this must return zero rows:
--      select * from public.posts where status <> 'published';
