-- Reading status, personal rating, and page progress for each book.

alter table public.books
  add column if not exists reading_status text not null default 'unread'
    check (
      reading_status in (
        'unread',
        'reading',
        'finished',
        'paused',
        'dropped',
        'rereading'
      )
    ),
  add column if not exists rating numeric(2, 1)
    check (rating is null or (rating >= 0.5 and rating <= 5)),
  add column if not exists page_count integer
    check (page_count is null or page_count > 0),
  add column if not exists current_page integer
    check (current_page is null or current_page >= 0),
  add column if not exists reading_started_at timestamptz,
  add column if not exists reading_finished_at timestamptz;

comment on column public.books.reading_status is
  'Personal reading state: unread, reading, finished, paused, dropped, rereading.';
comment on column public.books.rating is
  'Personal rating from 0.5 to 5 stars (half-star steps).';

create index if not exists books_reading_status_idx
  on public.books (reading_status);
