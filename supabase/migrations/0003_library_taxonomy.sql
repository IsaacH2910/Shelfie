-- User-managed category and shelf vocabularies (chosen from dropdowns when
-- adding books). Labels still live on books as free text for flexibility;
-- these lists are the source of truth for the pickers.

alter table public.profiles
  add column if not exists category_labels text[] not null default '{}',
  add column if not exists shelf_locations text[] not null default '{}';
