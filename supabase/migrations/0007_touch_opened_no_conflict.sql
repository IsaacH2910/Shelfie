-- Viewing a book updates last_opened_at only; that should not count as a
-- content edit for optimistic concurrency (updated_at / ConflictError).

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE'
    and tg_table_name = 'books'
    and (to_jsonb(NEW) - 'last_opened_at' - 'updated_at')
      = (to_jsonb(OLD) - 'last_opened_at' - 'updated_at')
  then
    NEW.updated_at := OLD.updated_at;
  else
    NEW.updated_at := now();
  end if;
  return NEW;
end;
$$;
