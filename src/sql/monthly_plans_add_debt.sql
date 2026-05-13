-- monthly_plans_add_debt.sql
-- Jalankan sekali di Supabase SQL Editor jika kolom debt belum ada.
alter table public.monthly_plans
add column if not exists debt jsonb not null default '[]'::jsonb;
