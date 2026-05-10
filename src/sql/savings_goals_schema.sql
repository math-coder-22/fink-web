-- savings_goals_schema.sql
-- Jalankan di Supabase SQL Editor.
-- Tujuan: Smart Saving sinkron antar browser/device dan tidak lagi bergantung localStorage.

create table if not exists public.savings_goals (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  goal jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id, user_id)
);

alter table public.savings_goals enable row level security;

drop policy if exists "Users can read own savings goals" on public.savings_goals;
create policy "Users can read own savings goals"
on public.savings_goals for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own savings goals" on public.savings_goals;
create policy "Users can insert own savings goals"
on public.savings_goals for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own savings goals" on public.savings_goals;
create policy "Users can update own savings goals"
on public.savings_goals for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own savings goals" on public.savings_goals;
create policy "Users can delete own savings goals"
on public.savings_goals for delete
using (auth.uid() = user_id);

create index if not exists idx_savings_goals_user_updated
on public.savings_goals(user_id, updated_at desc);
