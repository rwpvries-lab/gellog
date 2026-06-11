-- UGC moderation (Apple Guideline 1.2): user-to-user blocking.
create table if not exists public.blocked_users (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id)
);

create index if not exists blocked_users_blocker_id_idx
  on public.blocked_users (blocker_id);

alter table public.blocked_users enable row level security;

-- Users may read and manage only their own block rows; they cannot see others' blocks.
create policy "blocked_users_select_own"
  on public.blocked_users
  for select
  to authenticated
  using (auth.uid() = blocker_id);

create policy "blocked_users_insert_own"
  on public.blocked_users
  for insert
  to authenticated
  with check (auth.uid() = blocker_id);

create policy "blocked_users_delete_own"
  on public.blocked_users
  for delete
  to authenticated
  using (auth.uid() = blocker_id);
