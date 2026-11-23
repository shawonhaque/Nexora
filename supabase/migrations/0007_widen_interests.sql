-- ---------------------------------------------------------------------------
-- Widen the followable topics
--
-- NEXORA now publishes thirteen live feeds (breaking, politics, sports, health,
-- environment, entertainment and space were added). user_interests only allowed
-- the original six, so a reader could not follow the new ones. This replaces the
-- check constraint with the current list.
-- ---------------------------------------------------------------------------

alter table public.user_interests
  drop constraint if exists user_interests_category_check;

alter table public.user_interests
  add constraint user_interests_category_check
  check (category in (
    'breaking', 'world', 'politics', 'technology', 'ai', 'science',
    'education', 'business', 'sports', 'health', 'environment',
    'entertainment', 'space'
  ));
