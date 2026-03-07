-- Run in Supabase SQL Editor
-- Hardening for vendor_mess_cards

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'vendor_mess_cards_owner_date_unique'
  ) then
    alter table public.vendor_mess_cards
      add constraint vendor_mess_cards_owner_date_unique unique (owner_id, menu_date);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'vendor_mess_cards_menu_items_nonempty'
  ) then
    alter table public.vendor_mess_cards
      add constraint vendor_mess_cards_menu_items_nonempty
      check (coalesce(array_length(menu_items, 1), 0) > 0);
  end if;
end $$;

create index if not exists idx_vendor_mess_cards_owner_date
  on public.vendor_mess_cards (owner_id, menu_date);
