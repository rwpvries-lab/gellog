alter table public.flavours
add column if not exists cone_url text;

alter table public.flavours
add column if not exists cup_url text;
