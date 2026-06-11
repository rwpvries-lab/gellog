-- UGC moderation (Apple Guideline 1.2): user reports against ice cream logs.
create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_log_id uuid not null references public.ice_cream_logs(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists content_reports_reported_log_id_idx
  on public.content_reports (reported_log_id);
create index if not exists content_reports_reporter_id_idx
  on public.content_reports (reporter_id);

alter table public.content_reports enable row level security;

-- Authenticated users may file reports as themselves.
create policy "content_reports_insert_own"
  on public.content_reports
  for insert
  to authenticated
  with check (auth.uid() = reporter_id);

-- No SELECT/UPDATE/DELETE policy: only the service role (manual review) can read.
