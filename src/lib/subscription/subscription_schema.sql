-- FiNK Subscription & Admin Schema
-- Jalankan file ini di Supabase Dashboard -> SQL Editor.

-- 1) Tambahkan role ke profiles jika belum ada.
alter table public.profiles
  add column if not exists role text not null default 'user'
  check (role in ('user', 'admin'));

-- 2) Tabel subscription per user.
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'premium')),
  status text not null default 'active' check (status in ('active', 'trialing', 'past_due', 'canceled')),
  current_period_end timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

alter table public.subscriptions enable row level security;

-- 3) Helper function untuk cek admin.
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid and p.role = 'admin'
  );
$$;

-- 4) Policies profiles.
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

-- 5) Policies subscriptions.
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

-- 6) Trigger updated_at.
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

-- 7) Setelah menjalankan SQL ini, jadikan akun Anda admin.
-- Ganti email di bawah dengan email login FiNK Anda, lalu jalankan baris ini:
-- update public.profiles set role = 'admin' where email = 'email-anda@gmail.com';
