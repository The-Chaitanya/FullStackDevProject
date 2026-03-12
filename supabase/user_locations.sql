-- Run in Supabase SQL Editor
-- Persist student/vendor coordinates in database

create table if not exists public.user_locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role text not null check (role in ('student', 'vendor')),
  latitude double precision not null check (latitude >= -90 and latitude <= 90),
  longitude double precision not null check (longitude >= -180 and longitude <= 180),
  updated_at timestamptz not null default now(),
  unique (user_id, role)
);

create index if not exists idx_user_locations_user_role on public.user_locations (user_id, role);

create or replace function public.set_updated_at_user_locations()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_locations_updated_at on public.user_locations;
create trigger trg_user_locations_updated_at
before update on public.user_locations
for each row
execute function public.set_updated_at_user_locations();

alter table public.user_locations enable row level security;

drop policy if exists "user_locations_read_own" on public.user_locations;
drop policy if exists "user_locations_insert_own" on public.user_locations;
drop policy if exists "user_locations_update_own" on public.user_locations;

create policy "user_locations_read_own"
on public.user_locations
for select
to authenticated
using (user_id = auth.uid());

create policy "user_locations_insert_own"
on public.user_locations
for insert
to authenticated
with check (user_id = auth.uid());

create policy "user_locations_update_own"
on public.user_locations
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
