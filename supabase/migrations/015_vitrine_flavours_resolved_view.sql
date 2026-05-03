-- pg_trgm: fuzzy name matching inside resolve_flavour
create extension if not exists pg_trgm;

-- Map free-text vitrine label → flavours.id (slug, exact names, then similarity).
create or replace function public.resolve_flavour(input text)
returns uuid
language plpgsql
stable
as $$
declare
  cleaned text;
  result_id uuid;
  best_similarity real;
begin
  if input is null or trim(input) = '' then
    return null;
  end if;

  cleaned := lower(trim(regexp_replace(input, '^[^a-zA-Z]+', '')));

  if cleaned = '' then
    return null;
  end if;

  select id into result_id
  from public.flavours
  where is_active = true
    and base_token is not null
    and slug = cleaned
  limit 1;

  if result_id is not null then
    return result_id;
  end if;

  select id into result_id
  from public.flavours
  where is_active = true
    and base_token is not null
    and (
      lower(name_en) = cleaned
      or lower(name_nl) = cleaned
      or lower(name_it) = cleaned
    )
  limit 1;

  if result_id is not null then
    return result_id;
  end if;

  select id, sim into result_id, best_similarity
  from (
    select id, greatest(
      similarity(lower(coalesce(name_en, '')), cleaned),
      similarity(lower(coalesce(name_nl, '')), cleaned),
      similarity(lower(coalesce(name_it, '')), cleaned)
    ) as sim
    from public.flavours
    where is_active = true
      and base_token is not null
  ) candidates
  where sim > 0.5
  order by sim desc
  limit 1;

  return result_id;
end;
$$;

comment on function public.resolve_flavour(text) is
  'Resolves vitrine board text to flavours.id (slug, multilingual exact match, pg_trgm fuzzy).';

-- Salon profile: master switch for public vitrine block
alter table public.salon_profiles
  add column if not exists vitrine_enabled boolean not null default true;

-- Read model: vitrine row + resolved canonical flavour metadata and gelato tokens
drop view if exists public.vitrine_flavours_resolved;

create view public.vitrine_flavours_resolved as
select
  vf.id as vitrine_flavour_id,
  vf.salon_place_id,
  vf.name as input_name,
  vf.colour as legacy_colour,
  vf.is_visible,
  vf.display_started_at,
  vf.total_display_seconds,
  f.id as flavour_id,
  f.slug as flavour_slug,
  f.name_en as canonical_name_en,
  f.name_nl as canonical_name_nl,
  f.name_it as canonical_name_it,
  f.base_token,
  f.drizzle_token,
  f.crumble_token,
  f.category
from public.vitrine_flavours vf
left join public.flavours f on f.id = public.resolve_flavour(vf.name);

comment on view public.vitrine_flavours_resolved is
  'Vitrine rows joined to flavours via resolve_flavour; stable column names for salon UI.';

grant select on public.vitrine_flavours_resolved to anon, authenticated;
