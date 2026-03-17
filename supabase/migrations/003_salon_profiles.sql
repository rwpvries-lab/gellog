-- ============================================
-- Gellog: Salon profiles
-- ============================================

-- Ensure salon location columns exist on ice_cream_logs
-- (may already exist if added directly in Supabase)
alter table public.ice_cream_logs
  add column if not exists salon_place_id text,
  add column if not exists salon_lat      numeric,
  add column if not exists salon_lng      numeric;

create index if not exists idx_ice_cream_logs_salon_place_id
  on public.ice_cream_logs (salon_place_id);

-- ------------------------------------------------------------
-- salon_profiles
-- ------------------------------------------------------------
create table if not exists public.salon_profiles (
  id              uuid    primary key default gen_random_uuid(),
  place_id        text    not null unique,
  is_claimed      boolean not null default false,
  claim_verified  boolean not null default false,
  owner_id        uuid    references public.profiles on delete set null,
  salon_name      text    not null,
  salon_address   text,
  salon_city      text,
  salon_lat       numeric,
  salon_lng       numeric,
  logo_url        text,
  bio             text,
  phone           text,
  website         text,
  claim_name      text,
  claim_role      text,
  claim_phone     text,
  claim_email     text,
  claim_message   text,
  created_at      timestamptz default now()
);

-- Add columns that may be missing if table already existed
alter table public.salon_profiles
  add column if not exists claim_verified boolean not null default false,
  add column if not exists owner_id       uuid references public.profiles on delete set null,
  add column if not exists claim_name     text,
  add column if not exists claim_role     text,
  add column if not exists claim_phone    text,
  add column if not exists claim_email    text,
  add column if not exists claim_message  text;

alter table public.salon_profiles enable row level security;

-- Policies (drop first so re-running is safe)
drop policy if exists "salon_profiles_select_all"   on public.salon_profiles;
drop policy if exists "salon_profiles_insert_any"   on public.salon_profiles;
drop policy if exists "salon_profiles_update_claim" on public.salon_profiles;

-- Anyone (incl. anon) can read
create policy "salon_profiles_select_all"
  on public.salon_profiles for select
  using (true);

-- Authenticated users can insert (auto-creation on page load)
create policy "salon_profiles_insert_any"
  on public.salon_profiles for insert
  to authenticated
  with check (true);

-- Authenticated users can claim an unclaimed salon, or owners can update their own
create policy "salon_profiles_update_claim"
  on public.salon_profiles for update
  using (
    auth.uid() is not null
    and (is_claimed = false or auth.uid() = owner_id)
  );
