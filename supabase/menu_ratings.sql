-- Run in Supabase SQL Editor
-- Shared student ratings per menu card

create table if not exists public.menu_ratings (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references public.vendor_mess_cards(id) on delete cascade,
  user_id uuid not null,
  rating numeric(2,1) not null check (rating >= 1 and rating <= 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (menu_id, user_id)
);

create index if not exists idx_menu_ratings_menu_id on public.menu_ratings (menu_id);
create index if not exists idx_menu_ratings_user_id on public.menu_ratings (user_id);

create or replace function public.set_updated_at_menu_ratings()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_menu_ratings_updated_at on public.menu_ratings;
create trigger trg_menu_ratings_updated_at
before update on public.menu_ratings
for each row
execute function public.set_updated_at_menu_ratings();

alter table public.menu_ratings enable row level security;

drop policy if exists "ratings_read_all" on public.menu_ratings;
drop policy if exists "ratings_insert_own" on public.menu_ratings;
drop policy if exists "ratings_update_own" on public.menu_ratings;

create policy "ratings_read_all"
on public.menu_ratings
for select
to authenticated
using (true);

create policy "ratings_insert_own"
on public.menu_ratings
for insert
to authenticated
with check (user_id = auth.uid());

create policy "ratings_update_own"
on public.menu_ratings
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
