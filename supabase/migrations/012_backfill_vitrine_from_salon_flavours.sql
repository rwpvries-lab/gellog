-- One-time backfill: copy legacy salon_flavours into vitrine_flavours so the unified
-- flavour board does not lose existing owner data. Skip rows that would duplicate
-- the same salon (place) + flavour name (case-insensitive).

insert into public.vitrine_flavours (
  salon_place_id,
  name,
  colour,
  is_visible,
  display_started_at,
  total_display_seconds
)
select
  sp.place_id,
  sf.name,
  sf.colour_hex,
  sf.is_available,
  case
    when sf.is_available then coalesce(sf.created_at, now())
    else null
  end,
  0
from public.salon_flavours sf
join public.salon_profiles sp on sp.id = sf.salon_id
where not exists (
  select 1
  from public.vitrine_flavours vf
  where vf.salon_place_id = sp.place_id
    and lower(trim(vf.name)) = lower(trim(sf.name))
);
