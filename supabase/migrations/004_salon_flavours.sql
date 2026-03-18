-- ============================================
-- Gellog: Salon flavours + suggestions
-- ============================================

-- ------------------------------------------------------------
-- salon_flavours
-- ------------------------------------------------------------
create table if not exists public.salon_flavours (
  id         uuid    primary key default gen_random_uuid(),
  salon_id   uuid    not null references public.salon_profiles on delete cascade,
  name       text    not null,
  colour_hex text    not null default '#A8C5A0',
  is_available boolean not null default true,
  position   integer not null default 0,
  created_at timestamptz default now()
);

create index if not exists idx_salon_flavours_salon_id
  on public.salon_flavours (salon_id, position);

alter table public.salon_flavours enable row level security;

create policy "salon_flavours_select_all"
  on public.salon_flavours for select using (true);

create policy "salon_flavours_insert_owner"
  on public.salon_flavours for insert
  with check (
    exists (
      select 1 from public.salon_profiles
      where id = salon_id and owner_id = auth.uid()
    )
  );

create policy "salon_flavours_update_owner"
  on public.salon_flavours for update
  using (
    exists (
      select 1 from public.salon_profiles
      where id = salon_id and owner_id = auth.uid()
    )
  );

create policy "salon_flavours_delete_owner"
  on public.salon_flavours for delete
  using (
    exists (
      select 1 from public.salon_profiles
      where id = salon_id and owner_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- flavour_suggestions
-- ------------------------------------------------------------
create table if not exists public.flavour_suggestions (
  id           uuid primary key default gen_random_uuid(),
  salon_id     uuid not null references public.salon_profiles on delete cascade,
  suggested_by uuid references public.profiles on delete set null,
  name         text not null,
  status       text not null default 'pending'
               check (status in ('pending', 'approved', 'rejected')),
  created_at   timestamptz default now(),
  unique (salon_id, name)
);

create index if not exists idx_flavour_suggestions_salon_id
  on public.flavour_suggestions (salon_id, status);

-- Also update the unique conflict key reference used in upserts
-- unique (salon_id, name) — matches the actual DB schema

alter table public.flavour_suggestions enable row level security;

create policy "flavour_suggestions_select_all"
  on public.flavour_suggestions for select using (true);

-- Authenticated users can suggest flavours (upsert pattern)
create policy "flavour_suggestions_insert_auth"
  on public.flavour_suggestions for insert
  to authenticated with check (true);

-- Only the salon owner can approve/reject
create policy "flavour_suggestions_update_owner"
  on public.flavour_suggestions for update
  using (
    exists (
      select 1 from public.salon_profiles
      where id = salon_id and owner_id = auth.uid()
    )
  );
