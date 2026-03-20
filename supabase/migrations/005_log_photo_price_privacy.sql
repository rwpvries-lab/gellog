-- Photo can stay public while the log is public, or be limited to followers only.
alter table public.ice_cream_logs
  add column photo_visibility text not null default 'public'
  check (photo_visibility in ('public', 'friends'));

-- When true, only the log owner sees price_paid in the UI (value still stored).
alter table public.ice_cream_logs
  add column price_hidden_from_others boolean not null default false;
