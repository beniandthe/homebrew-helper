
-- Extensions (safe no-op if already enabled)
create extension if not exists pgcrypto;

-- =========================================================
-- PROFILES
-- =========================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),

  -- Billing / Stripe fields expected by app + webhook
  is_pro boolean not null default false,
  cancel_at_period_end boolean not null default false,
  current_period_end timestamptz null,
  canceled_at timestamptz null,
  stripe_customer_id text null,
  stripe_subscription_id text null,
  subscription_status text null,
  billing_provider text null,
  billing_product_id text null,
  billing_entitlement_id text null,
  billing_store text null,
  billing_last_synced_at timestamptz null,
  revenuecat_app_user_id text null
);

-- If table already existed before these columns, ensure they exist:
alter table public.profiles
  add column if not exists is_pro boolean not null default false,
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists current_period_end timestamptz null,
  add column if not exists canceled_at timestamptz null,
  add column if not exists stripe_customer_id text null,
  add column if not exists stripe_subscription_id text null,
  add column if not exists subscription_status text null,
  add column if not exists billing_provider text null,
  add column if not exists billing_product_id text null,
  add column if not exists billing_entitlement_id text null,
  add column if not exists billing_store text null,
  add column if not exists billing_last_synced_at timestamptz null,
  add column if not exists revenuecat_app_user_id text null;

create unique index if not exists idx_profiles_stripe_customer_id
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;

create unique index if not exists idx_profiles_stripe_subscription_id
  on public.profiles (stripe_subscription_id)
  where stripe_subscription_id is not null;

create unique index if not exists idx_profiles_revenuecat_app_user_id
  on public.profiles (revenuecat_app_user_id)
  where revenuecat_app_user_id is not null;

create index if not exists idx_projects_user_id
  on public.projects (user_id);

-- =========================================================
-- LEGACY PROJECTS (kept for compatibility with prior schema)
-- =========================================================
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  tool_type text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- SAVED PROJECTS (the table app currently uses)
-- =========================================================
create table if not exists public.saved_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  tool_type text not null,
  data jsonb not null default '{}'::jsonb,
  campaign_id uuid null references public.saved_projects(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.saved_projects
  drop constraint if exists saved_projects_name_not_blank;

alter table public.saved_projects
  add constraint saved_projects_name_not_blank
  check (length(trim(name)) > 0);

drop index if exists idx_saved_projects_user_id;
drop index if exists idx_saved_projects_campaign_id;
create index if not exists idx_saved_projects_user_updated on public.saved_projects(user_id, updated_at desc);
create index if not exists idx_saved_projects_campaign_hubs
  on public.saved_projects(user_id, updated_at desc)
  where tool_type = 'campaign_hub';
create index if not exists idx_saved_projects_user_campaign_updated
  on public.saved_projects(user_id, campaign_id, updated_at desc)
  where campaign_id is not null;
create index if not exists idx_saved_projects_campaign_id
  on public.saved_projects (campaign_id)
  where campaign_id is not null;

-- =========================================================
-- UPDATED_AT trigger
-- =========================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_projects_set_updated_at on public.projects;
create trigger trg_projects_set_updated_at
before update on public.projects
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_saved_projects_set_updated_at on public.saved_projects;
create trigger trg_saved_projects_set_updated_at
before update on public.saved_projects
for each row execute procedure public.set_updated_at();

-- =========================================================
-- RLS
-- =========================================================
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.saved_projects enable row level security;

do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select schemaname, tablename, policyname
      from pg_policies
     where schemaname = 'public'
       and tablename in ('profiles', 'projects', 'saved_projects')
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      existing_policy.policyname,
      existing_policy.schemaname,
      existing_policy.tablename
    );
  end loop;
end $$;

create policy "Users can view their own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id);

create policy "Users can insert their own profile"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);

create policy "Users can manage their own projects"
  on public.projects for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can manage their own saved projects"
  on public.saved_projects for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- =========================================================
-- Ensure profile row exists when auth user is created
-- =========================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- =========================================================
-- Downgrade RPC used by app
-- =========================================================
drop function if exists public.downgrade_to_free_and_trim_projects();

create or replace function public.downgrade_to_free_and_trim_projects(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
begin
  -- Allow authenticated users to operate on self.
  -- Service role (auth.uid() is null) can operate for webhooks/admin.
  if caller is not null and caller <> target_user_id then
    raise exception 'Not authorized';
  end if;

  update public.profiles
     set is_pro = false,
         cancel_at_period_end = false,
         current_period_end = null,
         canceled_at = now(),
         subscription_status = 'canceled'
   where id = target_user_id;

  -- Delete campaign hub items + linked campaign items
  delete from public.saved_projects
   where user_id = target_user_id
     and (tool_type = 'campaign_hub' or campaign_id is not null);

  -- Keep only 3 most-recent standalone projects for free users
  with ranked as (
    select id,
           row_number() over (order by updated_at desc, created_at desc, id desc) as rn
      from public.saved_projects
     where user_id = target_user_id
       and campaign_id is null
  )
  delete from public.saved_projects sp
   using ranked r
   where sp.id = r.id
     and r.rn > 3;
end;
$$;

revoke all on function public.downgrade_to_free_and_trim_projects(uuid) from public;
grant execute on function public.downgrade_to_free_and_trim_projects(uuid) to authenticated, service_role;

-- =========================================================
-- Realtime publication needed by postgres_changes listeners
-- =========================================================
do $$
begin
  begin
    alter publication supabase_realtime add table public.profiles;
  exception when duplicate_object then
    null;
  end;

  begin
    alter publication supabase_realtime add table public.saved_projects;
  exception when duplicate_object then
    null;
  end;
end $$;
