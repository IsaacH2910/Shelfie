-- Shelfie — initial schema
-- Tables: profiles, households, household_members, household_invites, books
-- Model: each book is private to its creator (household_id IS NULL) or shared
--        with a household (household_id set and creator is a member).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table if not exists public.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  code text not null unique,
  email text,
  invited_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  accepted_by uuid references public.profiles (id)
);

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  household_id uuid references public.households (id) on delete set null,
  title text not null,
  author text,
  isbn text,
  language text,
  shelf_location text,
  cover_url text,
  notes text,
  source text not null default 'manual' check (source in ('manual', 'barcode', 'ocr')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists books_created_by_idx on public.books (created_by);
create index if not exists books_household_id_idx on public.books (household_id);
create index if not exists books_isbn_idx on public.books (isbn);
create index if not exists household_members_user_idx on public.household_members (user_id);

-- ---------------------------------------------------------------------------
-- Helper functions (security definer to avoid RLS recursion)
-- ---------------------------------------------------------------------------

create or replace function public.is_household_member(hid uuid, uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.household_members m
    where m.household_id = hid and m.user_id = uid
  );
$$;

create or replace function public.is_household_owner(hid uuid, uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.household_members m
    where m.household_id = hid and m.user_id = uid and m.role = 'owner'
  );
$$;

create or replace function public.shares_household(other_user uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.household_members me
    join public.household_members them
      on them.household_id = me.household_id
    where me.user_id = auth.uid() and them.user_id = other_user
  );
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Create a profile row automatically for every new auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, 'reader'), '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Make the household creator its first owner.
create or replace function public.handle_new_household()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.household_members (household_id, user_id, role)
  values (new.id, new.created_by, 'owner')
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_household_created on public.households;
create trigger on_household_created
  after insert on public.households
  for each row execute function public.handle_new_household();

-- Keep books.updated_at fresh.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists books_set_updated_at on public.books;
create trigger books_set_updated_at
  before update on public.books
  for each row execute function public.set_updated_at();

-- Accept an invite by code: joins the caller to the household. Runs as definer
-- so invitees do not need direct read access to the invites table.
create or replace function public.accept_invite(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.household_invites;
begin
  select * into inv
  from public.household_invites
  where code = invite_code
  for update;

  if inv.id is null then
    raise exception 'Invite not found';
  end if;

  if inv.expires_at < now() then
    raise exception 'This invite has expired';
  end if;

  insert into public.household_members (household_id, user_id, role)
  values (inv.household_id, auth.uid(), 'member')
  on conflict (household_id, user_id) do nothing;

  update public.household_invites
  set accepted_at = coalesce(accepted_at, now()),
      accepted_by = coalesce(accepted_by, auth.uid())
  where id = inv.id;

  return inv.household_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;
alter table public.books enable row level security;

-- profiles ------------------------------------------------------------------
create policy "profiles: read self or household peers"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_household(id));

create policy "profiles: insert self"
  on public.profiles for insert to authenticated
  with check (id = auth.uid());

create policy "profiles: update self"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- households ----------------------------------------------------------------
create policy "households: read member"
  on public.households for select to authenticated
  using (created_by = auth.uid() or public.is_household_member(id, auth.uid()));

create policy "households: create own"
  on public.households for insert to authenticated
  with check (created_by = auth.uid());

create policy "households: owner update"
  on public.households for update to authenticated
  using (public.is_household_owner(id, auth.uid()));

create policy "households: owner delete"
  on public.households for delete to authenticated
  using (public.is_household_owner(id, auth.uid()));

-- household_members ---------------------------------------------------------
create policy "members: read co-members"
  on public.household_members for select to authenticated
  using (user_id = auth.uid() or public.is_household_member(household_id, auth.uid()));

create policy "members: owner adds"
  on public.household_members for insert to authenticated
  with check (public.is_household_owner(household_id, auth.uid()));

create policy "members: leave or owner removes"
  on public.household_members for delete to authenticated
  using (user_id = auth.uid() or public.is_household_owner(household_id, auth.uid()));

create policy "members: owner updates roles"
  on public.household_members for update to authenticated
  using (public.is_household_owner(household_id, auth.uid()));

-- household_invites ---------------------------------------------------------
create policy "invites: members read"
  on public.household_invites for select to authenticated
  using (public.is_household_member(household_id, auth.uid()));

create policy "invites: members create"
  on public.household_invites for insert to authenticated
  with check (
    invited_by = auth.uid()
    and public.is_household_member(household_id, auth.uid())
  );

create policy "invites: members revoke"
  on public.household_invites for delete to authenticated
  using (public.is_household_member(household_id, auth.uid()));

-- books ---------------------------------------------------------------------
create policy "books: read own or household"
  on public.books for select to authenticated
  using (
    created_by = auth.uid()
    or (household_id is not null and public.is_household_member(household_id, auth.uid()))
  );

create policy "books: insert own"
  on public.books for insert to authenticated
  with check (
    created_by = auth.uid()
    and (household_id is null or public.is_household_member(household_id, auth.uid()))
  );

create policy "books: update own or household"
  on public.books for update to authenticated
  using (
    created_by = auth.uid()
    or (household_id is not null and public.is_household_member(household_id, auth.uid()))
  )
  with check (
    created_by = auth.uid()
    or (household_id is not null and public.is_household_member(household_id, auth.uid()))
  );

create policy "books: delete own or household owner"
  on public.books for delete to authenticated
  using (
    created_by = auth.uid()
    or (household_id is not null and public.is_household_owner(household_id, auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- Storage: public "covers" bucket for uploaded cover photos
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('covers', 'covers', true)
on conflict (id) do nothing;

create policy "covers: public read"
  on storage.objects for select
  using (bucket_id = 'covers');

create policy "covers: authenticated upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'covers');

create policy "covers: owner update"
  on storage.objects for update to authenticated
  using (bucket_id = 'covers' and owner = auth.uid());

create policy "covers: owner delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'covers' and owner = auth.uid());

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
grant execute on function public.accept_invite(text) to authenticated;
grant execute on function public.is_household_member(uuid, uuid) to authenticated;
grant execute on function public.is_household_owner(uuid, uuid) to authenticated;
grant execute on function public.shares_household(uuid) to authenticated;
