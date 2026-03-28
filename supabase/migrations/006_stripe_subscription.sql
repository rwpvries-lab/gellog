-- Ice Cream+ (Stripe subscription fields on profiles)

alter table public.profiles
  add column if not exists subscription_tier text not null default 'free'
    check (subscription_tier in ('free', 'premium'));

alter table public.profiles
  add column if not exists stripe_customer_id text;

alter table public.profiles
  add column if not exists subscription_expires_at timestamptz;

-- Prevent authenticated users from self-granting premium or editing billing fields.
-- Updates using the service role key (webhooks) still work.

create or replace function public.profiles_guard_subscription_fields()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'update' then
    if new.subscription_tier is distinct from old.subscription_tier
       or new.stripe_customer_id is distinct from old.stripe_customer_id
       or new.subscription_expires_at is distinct from old.subscription_expires_at
    then
      if current_role <> 'service_role'
         and coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
        raise exception 'Subscription fields cannot be changed directly'
          using errcode = '42501';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_subscription_fields on public.profiles;

create trigger profiles_guard_subscription_fields
  before update on public.profiles
  for each row
  execute function public.profiles_guard_subscription_fields();

drop policy if exists "profiles_insert_own" on public.profiles;

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (
    auth.uid() = id
    and subscription_tier = 'free'
    and stripe_customer_id is null
    and subscription_expires_at is null
  );
