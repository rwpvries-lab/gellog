-- ============================================
-- Gellog: Initial schema (profiles, logs, flavours, friendships)
-- Run this in the Supabase SQL Editor
-- ============================================
--
-- What is RLS and why do you need it?
-- RLS (Row Level Security) is PostgreSQL’s way of restricting which rows
-- each user can read or change, using policies. You need it so that even
-- if someone has your anon key, they can only edit their own profile and
-- logs while still being able to read everyone’s data for the public feed.

-- ------------------------------------------------------------
-- 1. profiles (extends auth.users)
-- ------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text not null unique,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- 2. ice_cream_logs
-- ------------------------------------------------------------
create table public.ice_cream_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  salon_name text not null,
  overall_rating integer not null check (overall_rating between 1 and 5),
  notes text,
  photo_url text,
  visited_at timestamptz default now(),
  weather_temp numeric,
  weather_feels_like numeric,
  weather_condition text,
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- 3. log_flavours (flavours per log)
-- ------------------------------------------------------------
create table public.log_flavours (
  id uuid primary key default gen_random_uuid(),
  log_id uuid not null references public.ice_cream_logs on delete cascade,
  flavour_name text not null,
  rating integer check (rating is null or (rating between 1 and 5))
);

-- ------------------------------------------------------------
-- 4. friendships
-- ------------------------------------------------------------
create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.profiles on delete cascade,
  following_id uuid not null references public.profiles on delete cascade,
  created_at timestamptz default now(),
  unique (follower_id, following_id),
  check (follower_id != following_id)
);

-- Optional: index for feed queries
create index idx_ice_cream_logs_user_id on public.ice_cream_logs (user_id);
create index idx_ice_cream_logs_visited_at on public.ice_cream_logs (visited_at desc);
create index idx_log_flavours_log_id on public.log_flavours (log_id);
create index idx_friendships_follower on public.friendships (follower_id);
create index idx_friendships_following on public.friendships (following_id);

-- ------------------------------------------------------------
-- Row Level Security (RLS)
-- ------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.ice_cream_logs enable row level security;
alter table public.log_flavours enable row level security;
alter table public.friendships enable row level security;

-- --- profiles ---
-- Anyone can read all profiles (public feed)
create policy "profiles_select_all"
  on public.profiles for select
  using (true);

-- Users can insert/update/delete only their own profile
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

create policy "profiles_delete_own"
  on public.profiles for delete
  using (auth.uid() = id);

-- --- ice_cream_logs ---
-- Anyone can read all logs (public feed)
create policy "ice_cream_logs_select_all"
  on public.ice_cream_logs for select
  using (true);

-- Users can insert/update/delete only their own logs
create policy "ice_cream_logs_insert_own"
  on public.ice_cream_logs for insert
  with check (auth.uid() = user_id);

create policy "ice_cream_logs_update_own"
  on public.ice_cream_logs for update
  using (auth.uid() = user_id);

create policy "ice_cream_logs_delete_own"
  on public.ice_cream_logs for delete
  using (auth.uid() = user_id);

-- --- log_flavours ---
-- Anyone can read (via public logs)
create policy "log_flavours_select_all"
  on public.log_flavours for select
  using (true);

-- Only the log owner can insert/update/delete flavours for their log
create policy "log_flavours_insert_own"
  on public.log_flavours for insert
  with check (
    exists (
      select 1 from public.ice_cream_logs l
      where l.id = log_id and l.user_id = auth.uid()
    )
  );

create policy "log_flavours_update_own"
  on public.log_flavours for update
  using (
    exists (
      select 1 from public.ice_cream_logs l
      where l.id = log_id and l.user_id = auth.uid()
    )
  );

create policy "log_flavours_delete_own"
  on public.log_flavours for delete
  using (
    exists (
      select 1 from public.ice_cream_logs l
      where l.id = log_id and l.user_id = auth.uid()
    )
  );

-- --- friendships ---
-- Anyone can read (for feed / “following” lists)
create policy "friendships_select_all"
  on public.friendships for select
  using (true);

-- Users can only create/delete friendships where they are the follower
create policy "friendships_insert_own"
  on public.friendships for insert
  with check (auth.uid() = follower_id);

create policy "friendships_delete_own"
  on public.friendships for delete
  using (auth.uid() = follower_id);

-- No update policy: friendships are create/delete only (or add one if you want to “update” a row).

-- ------------------------------------------------------------
-- Trigger: create profile on signup
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
