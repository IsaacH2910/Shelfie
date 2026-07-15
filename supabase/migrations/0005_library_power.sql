-- Power features: ownership/wishlist, favorites, collections, series,
-- reviews, annotations, loans, shelf capacity, onboarding, reading goals.

-- ---------------------------------------------------------------------------
-- Books
-- ---------------------------------------------------------------------------

alter table public.books
  add column if not exists ownership text not null default 'owned'
    check (ownership in ('owned', 'wishlist', 'want_to_buy')),
  add column if not exists is_favorite boolean not null default false,
  add column if not exists collections text[] not null default '{}',
  add column if not exists series text,
  add column if not exists publisher text,
  add column if not exists published_year integer
    check (published_year is null or (published_year >= 1000 and published_year <= 3000)),
  add column if not exists review text,
  add column if not exists last_opened_at timestamptz;

create index if not exists books_ownership_idx on public.books (ownership);
create index if not exists books_is_favorite_idx on public.books (is_favorite)
  where is_favorite = true;
create index if not exists books_collections_gin_idx on public.books using gin (collections);

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists collection_labels text[] not null default '{}',
  add column if not exists shelf_capacities jsonb not null default '{}'::jsonb,
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists yearly_reading_goal integer
    check (yearly_reading_goal is null or yearly_reading_goal > 0);

-- ---------------------------------------------------------------------------
-- Annotations (quotes, highlights, bookmarks, thoughts)
-- ---------------------------------------------------------------------------

create table if not exists public.book_annotations (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  created_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('quote', 'highlight', 'bookmark', 'thought')),
  content text not null default '',
  page integer check (page is null or page >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists book_annotations_book_id_idx
  on public.book_annotations (book_id);

alter table public.book_annotations enable row level security;

create policy "annotations: read if can read book"
  on public.book_annotations for select to authenticated
  using (
    exists (
      select 1 from public.books b
      where b.id = book_id
        and (
          b.created_by = auth.uid()
          or (b.household_id is not null and public.is_household_member(b.household_id, auth.uid()))
        )
    )
  );

create policy "annotations: insert own on visible book"
  on public.book_annotations for insert to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.books b
      where b.id = book_id
        and (
          b.created_by = auth.uid()
          or (b.household_id is not null and public.is_household_member(b.household_id, auth.uid()))
        )
    )
  );

create policy "annotations: update own"
  on public.book_annotations for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "annotations: delete own"
  on public.book_annotations for delete to authenticated
  using (created_by = auth.uid());

-- ---------------------------------------------------------------------------
-- Loans
-- ---------------------------------------------------------------------------

create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  created_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  borrower_name text not null,
  loaned_at date not null default (current_date),
  due_at date,
  returned_at date,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists loans_book_id_idx on public.loans (book_id);
create index if not exists loans_open_idx on public.loans (book_id)
  where returned_at is null;

alter table public.loans enable row level security;

create policy "loans: read if can read book"
  on public.loans for select to authenticated
  using (
    exists (
      select 1 from public.books b
      where b.id = book_id
        and (
          b.created_by = auth.uid()
          or (b.household_id is not null and public.is_household_member(b.household_id, auth.uid()))
        )
    )
  );

create policy "loans: insert on own or household book"
  on public.loans for insert to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.books b
      where b.id = book_id
        and (
          b.created_by = auth.uid()
          or (b.household_id is not null and public.is_household_member(b.household_id, auth.uid()))
        )
    )
  );

create policy "loans: update own"
  on public.loans for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "loans: delete own"
  on public.loans for delete to authenticated
  using (created_by = auth.uid());
