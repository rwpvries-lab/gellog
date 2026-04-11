-- Count verified ("approved") claims per owner for multi-salon cap (max 3 on Basic/Pro).
-- Gellog uses public.salon_profiles — not claimed_salons. "Approved" = claim_verified = true.

create or replace function public.get_owner_salon_count(owner_uuid uuid)
returns integer
language sql
stable
security invoker
set search_path = public
as $$
  select count(*)::integer
  from public.salon_profiles
  where owner_id = owner_uuid
    and is_claimed = true
    and claim_verified = true;
$$;

comment on function public.get_owner_salon_count(uuid) is
  'Number of salons this user has claimed and had verified (soft cap = 3 for Basic/Pro).';

grant execute on function public.get_owner_salon_count(uuid) to authenticated;
grant execute on function public.get_owner_salon_count(uuid) to service_role;

create or replace view public.owner_salon_status as
select
  owner_id,
  count(*)::integer as salon_count,
  count(*) >= 3 as soft_cap_reached
from public.salon_profiles
where is_claimed = true
  and claim_verified = true
  and owner_id is not null
group by owner_id;

comment on view public.owner_salon_status is
  'Per-owner count of verified claims; soft_cap_reached when count >= 3.';
