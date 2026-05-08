-- ================================================================
-- FiNK SaaS User Management + Subscription Schema
-- Jalankan di Supabase SQL Editor.
-- Aman dijalankan berulang karena memakai IF NOT EXISTS / upsert policy.
-- ================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ------------------------------------------------
-- 1. Profiles: role, suspend, soft delete
-- ------------------------------------------------
alter table public.profiles
  add column if not exists role text not null default 'user',
  add column if not exists suspended boolean not null default false,
  add column if not exists deleted_at timestamptz null;

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('user', 'admin', 'super_admin'));

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_deleted_at on public.profiles(deleted_at);
create index if not exists idx_profiles_suspended on public.profiles(suspended);

-- ------------------------------------------------
-- 2. Subscriptions
-- ------------------------------------------------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null default 'free',
  status text not null default 'active',
  current_period_end timestamptz null,
  is_lifetime boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

alter table public.subscriptions
  add column if not exists is_lifetime boolean not null default false;

alter table public.subscriptions
  drop constraint if exists subscriptions_plan_check;

alter table public.subscriptions
  add constraint subscriptions_plan_check
  check (plan in ('free', 'premium'));

alter table public.subscriptions
  drop constraint if exists subscriptions_status_check;

alter table public.subscriptions
  add constraint subscriptions_status_check
  check (status in ('active', 'trialing', 'past_due', 'canceled'));

create index if not exists idx_subscriptions_user_id on public.subscriptions(user_id);
create index if not exists idx_subscriptions_plan on public.subscriptions(plan);
create index if not exists idx_subscriptions_status on public.subscriptions(status);
create index if not exists idx_subscriptions_period_end on public.subscriptions(current_period_end);

-- ------------------------------------------------
-- 3. Helpers
-- ------------------------------------------------
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = uid
      and p.role in ('admin', 'super_admin')
      and coalesce(p.suspended, false) = false
      and p.deleted_at is null
  );
$$;

create or replace function public.is_super_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = uid
      and p.role = 'super_admin'
      and coalesce(p.suspended, false) = false
      and p.deleted_at is null
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_subscriptions_updated_at on public.subscriptions;
create trigger set_subscriptions_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

-- ------------------------------------------------
-- 4. Auto-create profile + default free subscription
-- ------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role, suspended, deleted_at)
  values (new.id, new.email, 'user', false, null)
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();

  insert into public.subscriptions (user_id, plan, status, is_lifetime)
  values (new.id, 'free', 'active', false)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ------------------------------------------------
-- 5. RLS
-- ------------------------------------------------
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles for select
using (auth.uid() = id or public.is_admin(auth.uid()));

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
with check (auth.uid() = id);

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
on public.profiles for update
using (auth.uid() = id or public.is_admin(auth.uid()))
with check (auth.uid() = id or public.is_admin(auth.uid()));

drop policy if exists "subscriptions_select_own_or_admin" on public.subscriptions;
create policy "subscriptions_select_own_or_admin"
on public.subscriptions for select
using (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "subscriptions_insert_own_or_admin" on public.subscriptions;
create policy "subscriptions_insert_own_or_admin"
on public.subscriptions for insert
with check (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "subscriptions_update_admin" on public.subscriptions;
create policy "subscriptions_update_admin"
on public.subscriptions for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "subscriptions_delete_super_admin" on public.subscriptions;
create policy "subscriptions_delete_super_admin"
on public.subscriptions for delete
using (public.is_super_admin(auth.uid()));

-- ------------------------------------------------
-- 6. Promote first super admin
-- Ganti email di bawah setelah menjalankan schema:
-- update public.profiles set role = 'super_admin' where email = 'email-anda@gmail.com';
-- ------------------------------------------------
