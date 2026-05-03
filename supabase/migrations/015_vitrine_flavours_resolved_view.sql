-- Salon profile: master switch for public vitrine block.
alter table public.salon_profiles
  add column if not exists vitrine_enabled boolean not null default true;

-- Read model for salon pages (matches app expectations; extend with joins later if needed).
create or replace view public.vitrine_flavours_resolved as
select
  vf.id as vitrine_flavour_id,
  vf.salon_place_id,
  vf.is_visible,
  vf.name as input_name,
  null::text as canonical_name_nl,
  null::text as canonical_name_en,
  null::text as base_token,
  null::text as drizzle_token,
  null::text as crumble_token
from public.vitrine_flavours vf;

comment on view public.vitrine_flavours_resolved is
  'Visible vitrine rows with stable column names; token columns reserved for future resolver.';

grant select on public.vitrine_flavours_resolved to anon, authenticated;
