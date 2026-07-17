-- Rule-based smart collections stored on the profile (evaluated client-side).

alter table public.profiles
  add column if not exists smart_collections jsonb not null default '[]'::jsonb;
