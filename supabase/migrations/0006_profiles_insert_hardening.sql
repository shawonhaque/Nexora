-- ============================================================================
-- NEXORA — 0006 harden the profiles INSERT path
--
-- 0002 blocked self-promotion on UPDATE, but the INSERT policy allowed a
-- signed-in user to create their own row with any role:
--
--   with check (public.is_admin() or id = auth.uid())
--
-- In the normal lifecycle that is unreachable: handle_new_user() creates the
-- row at signup, and no DELETE policy exists, so the row is always present and
-- the insert conflicts on the primary key.
--
-- It becomes reachable whenever a profile row is missing — for example if an
-- operator deletes it from the SQL editor, or a trigger is disabled during a
-- restore. A user in that state can insert their own row with role = 'admin'
-- and gain the admin role. This was reproduced against a local Postgres with
-- the 0001/0002 schema: a claim-bearing authenticated session inserted its own
-- missing row as role='admin' and the resulting role was admin.
--
-- Two changes close it, so neither one alone is load-bearing:
--
--   1. The INSERT policy only accepts the default role from a non-admin.
--   2. The guard trigger now fires on INSERT as well as UPDATE, which is the
--      backstop if the policy is ever widened again.
--
-- The trigger's INSERT branch still returns early for a claim-less session
-- (jwt_role is null), so the 0004 bootstrap — which runs in the SQL editor with
-- no JWT — continues to work.
--
-- Safe to re-run.
-- ============================================================================

-- 1. Constrain what a non-admin may insert -----------------------------------

drop policy if exists "profiles: admin can insert" on public.profiles;
create policy "profiles: insert own row as user only"
  on public.profiles for insert
  to authenticated
  with check (public.is_admin() or (id = auth.uid() and role = 'user'));

comment on policy "profiles: insert own row as user only" on public.profiles is
  'A non-admin may only create their own profile row with the default role. Creating a row with any other role requires admin.';

-- 2. Guard both INSERT and UPDATE -------------------------------------------

create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  jwt_role  text := nullif(current_setting('request.jwt.claims', true), '');
  is_insert boolean := (tg_op = 'INSERT');
begin
  if is_insert then
    -- A new row may only carry the default role unless an admin created it.
    if new.role <> 'user' and not public.is_admin() then
      if jwt_role is null then
        return new;
      end if;
      raise exception 'Only an administrator can assign a role'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if new.role is distinct from old.role then
    -- A direct database session (the SQL editor, or a migration such as 0004)
    -- carries no JWT claims at all, so request.jwt.claims is unset. Every
    -- request through PostgREST sets it, including anonymous ones.
    if jwt_role is null then
      return new;
    end if;

    -- Otherwise allow only when the caller is already an admin AND is not
    -- editing their own row. Self-promotion is never permitted, even for an
    -- admin.
    if not public.is_admin() or new.id = auth.uid() then
      raise exception 'Changing a role requires another administrator'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$fn$;

comment on function public.prevent_role_self_escalation() is
  'Rejects role assignment on INSERT and role changes on UPDATE unless the caller is a different administrator. Claim-less direct sessions (migrations, SQL editor) are exempt so the 0004 bootstrap still works.';

drop trigger if exists profiles_guard_role on public.profiles;
create trigger profiles_guard_role
  before insert or update on public.profiles
  for each row execute function public.prevent_role_self_escalation();

-- ---------------------------------------------------------------------------
-- Verification. Run these after applying.
-- ---------------------------------------------------------------------------
--
-- 1. Confirm the trigger covers both operations:
--      select tgname, tgtype, pg_get_triggerdef(oid)
--      from pg_trigger
--      where tgrelid = 'public.profiles'::regclass and not tgisinternal;
--      -- tgtype should indicate INSERT OR UPDATE.
--
-- 2. Confirm the insert policy no longer accepts an arbitrary role:
--      select policyname, with_check
--      from pg_policies
--      where tablename = 'profiles' and cmd = 'INSERT';
--
-- 3. Confirm exactly the expected accounts are admins:
--      select p.id, u.email, p.role
--      from public.profiles p join auth.users u on u.id = p.id
--      where p.role = 'admin';
