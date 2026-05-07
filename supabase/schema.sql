-- ================================================================
-- FiNK Database Schema
-- Jalankan seluruh file ini di Supabase Dashboard → SQL Editor
-- ================================================================

-- ─── Enable UUID extension ────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── PROFILES ────────────────────────────────────────────────
-- Otomatis dibuat saat user register
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ─── MONTHLY PLANS ───────────────────────────────────────────
-- Menyimpan income, saving, dan budget per bulan
CREATE TABLE IF NOT EXISTS public.monthly_plans (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  month       TEXT NOT NULL CHECK (month IN ('jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec')),
  year        INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  income      JSONB NOT NULL DEFAULT '[]',
  saving      JSONB NOT NULL DEFAULT '[]',
  budget      JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (user_id, month, year)
);

-- ─── TRANSACTIONS ─────────────────────────────────────────────
-- Catatan harian per transaksi
CREATE TABLE IF NOT EXISTS public.transactions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  month       TEXT NOT NULL CHECK (month IN ('jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec')),
  year        INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  date        TEXT NOT NULL,          -- format: '01' sampai '31'
  type        TEXT NOT NULL CHECK (type IN ('out','inn','save')),
  cat         TEXT,
  note        TEXT,
  amt         BIGINT NOT NULL DEFAULT 0,
  debt        BOOLEAN NOT NULL DEFAULT FALSE,
  settled     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ─── INDEXES ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_monthly_plans_user_month ON public.monthly_plans(user_id, year, month);
CREATE INDEX IF NOT EXISTS idx_transactions_user_month  ON public.transactions(user_id, year, month);
CREATE INDEX IF NOT EXISTS idx_transactions_debt        ON public.transactions(user_id, debt, settled) WHERE debt = TRUE;

-- ─── AUTO-UPDATE updated_at ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_monthly_plans
  BEFORE UPDATE ON public.monthly_plans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_transactions
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ─── AUTO-CREATE PROFILE ON SIGNUP ────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── ROW LEVEL SECURITY (RLS) ─────────────────────────────────
-- PENTING: Setiap user hanya bisa akses data miliknya sendiri

ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions  ENABLE ROW LEVEL SECURITY;

-- Profiles: user hanya bisa baca/ubah profil sendiri
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Monthly plans: user hanya bisa akses data miliknya
CREATE POLICY "Users can view own monthly plans"
  ON public.monthly_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own monthly plans"
  ON public.monthly_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own monthly plans"
  ON public.monthly_plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own monthly plans"
  ON public.monthly_plans FOR DELETE
  USING (auth.uid() = user_id);

-- Transactions: user hanya bisa akses transaksi miliknya
CREATE POLICY "Users can view own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
  ON public.transactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
  ON public.transactions FOR DELETE
  USING (auth.uid() = user_id);

-- ================================================================
-- Selesai! Cek tabel di Table Editor untuk memastikan semua
-- tabel dan policy sudah terbuat dengan benar.
-- ================================================================
