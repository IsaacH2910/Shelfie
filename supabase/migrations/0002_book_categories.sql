-- Custom categories for books (user-defined labels, many per book).

alter table public.books
  add column if not exists categories text[] not null default '{}';

comment on column public.books.categories is
  'User-defined category labels for organizing books (e.g. Fiction, Kids, To read).';

create index if not exists books_categories_gin_idx
  on public.books using gin (categories);
