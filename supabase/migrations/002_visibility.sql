-- Add visibility to ice_cream_logs
alter table public.ice_cream_logs
  add column visibility text not null default 'public'
  check (visibility in ('public', 'friends', 'private'));

-- Add default_visibility to profiles
alter table public.profiles
  add column default_visibility text not null default 'public'
  check (default_visibility in ('public', 'friends', 'private'));
