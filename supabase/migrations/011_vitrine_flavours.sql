-- Vitrine flavours (customer-facing display) + visibility audit log
-- Replaces ad-hoc policies: public may read visible rows; owners manage all rows for their place.

create table if not exists public.vitrine_flavours (
  id                     uuid primary key default gen_random_uuid(),
  salon_place_id         text not null,
  name                   text not null,
  colour                 text not null default '#F9A8D4',
  is_visible             boolean not null default true,
  display_started_at     timestamptz,
  total_display_seconds  bigint not null default 0,
  created_at             timestamptz not null default now()
);

create index if not exists idx_vitrine_flavours_place
  on public.vitrine_flavours (salon_place_id);

alter table public.vitrine_flavours enable row level security;

drop policy if exists "owner_manage_vitrine_flavours" on public.vitrine_flavours;
drop policy if exists "vitrine_flavours_select_visible" on public.vitrine_flavours;
drop policy if exists "vitrine_flavours_select_owner" on public.vitrine_flavours;
drop policy if exists "vitrine_flavours_insert_owner" on public.vitrine_flavours;
drop policy if exists "vitrine_flavours_update_owner" on public.vitrine_flavours;
drop policy if exists "vitrine_flavours_delete_owner" on public.vitrine_flavours;

-- Anyone can see flavours marked visible (e.g. public salon page).
create policy "vitrine_flavours_select_visible"
  on public.vitrine_flavours for select
  using (is_visible = true);

-- Claimed salon owners see all vitrine rows for their places (including hidden).
create policy "vitrine_flavours_select_owner"
  on public.vitrine_flavours for select
  using (
    salon_place_id in (
      select place_id from public.salon_profiles
      where is_claimed = true and owner_id = (select auth.uid())
    )
  );

create policy "vitrine_flavours_insert_owner"
  on public.vitrine_flavours for insert
  with check (
    salon_place_id in (
      select place_id from public.salon_profiles
      where is_claimed = true and owner_id = (select auth.uid())
    )
  );

create policy "vitrine_flavours_update_owner"
  on public.vitrine_flavours for update
  using (
    salon_place_id in (
      select place_id from public.salon_profiles
      where is_claimed = true and owner_id = (select auth.uid())
    )
  );

create policy "vitrine_flavours_delete_owner"
  on public.vitrine_flavours for delete
  using (
    salon_place_id in (
      select place_id from public.salon_profiles
      where is_claimed = true and owner_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Visibility change log (owner-only)
-- ---------------------------------------------------------------------------
create table if not exists public.vitrine_visibility_log (
  id              uuid primary key default gen_random_uuid(),
  salon_place_id  text not null,
  flavour_id      uuid not null references public.vitrine_flavours (id) on delete cascade,
  set_visible     boolean not null,
  changed_at      timestamptz not null default now()
);

create index if not exists idx_vitrine_visibility_log_place
  on public.vitrine_visibility_log (salon_place_id, changed_at desc);

alter table public.vitrine_visibility_log enable row level security;

drop policy if exists "owner_manage_visibility_log" on public.vitrine_visibility_log;
drop policy if exists "vitrine_visibility_log_select_owner" on public.vitrine_visibility_log;
drop policy if exists "vitrine_visibility_log_insert_owner" on public.vitrine_visibility_log;

create policy "vitrine_visibility_log_select_owner"
  on public.vitrine_visibility_log for select
  using (
    salon_place_id in (
      select place_id from public.salon_profiles
      where is_claimed = true and owner_id = (select auth.uid())
    )
  );

create policy "vitrine_visibility_log_insert_owner"
  on public.vitrine_visibility_log for insert
  with check (
    salon_place_id in (
      select place_id from public.salon_profiles
      where is_claimed = true and owner_id = (select auth.uid())
    )
    and exists (
      select 1 from public.vitrine_flavours vf
      where vf.id = flavour_id
        and vf.salon_place_id = vitrine_visibility_log.salon_place_id
    )
  );
