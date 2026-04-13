alter table public.profiles
  add column if not exists billing_provider text null,
  add column if not exists billing_product_id text null,
  add column if not exists billing_entitlement_id text null,
  add column if not exists billing_store text null,
  add column if not exists billing_last_synced_at timestamptz null,
  add column if not exists revenuecat_app_user_id text null;

create unique index if not exists idx_profiles_revenuecat_app_user_id
  on public.profiles (revenuecat_app_user_id)
  where revenuecat_app_user_id is not null;
