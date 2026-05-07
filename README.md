# FiNK — Smart Family Finance

Aplikasi keuangan keluarga berbasis sistem Kakeibo, dibangun dengan Next.js + Supabase + Cloudflare Pages.

## Stack

- **Frontend**: Next.js 15 (App Router) + TypeScript
- **Database & Auth**: Supabase
- **Hosting**: Cloudflare Pages
- **Keamanan**: API key hanya ada di server, tidak pernah ke browser

---

## Setup Lengkap (Ikuti Urutan Ini)

### LANGKAH 1 — Install Git

Download dan install dari [git-scm.com](https://git-scm.com/downloads)

Verifikasi:
```bash
git --version
```

---

### LANGKAH 2 — Buat Akun & Project Supabase

1. Daftar di [supabase.com](https://supabase.com) → **New Project**
2. Catat:
   - **Project URL** → `https://xxxx.supabase.co`
   - **Anon Key** → Settings → API → `anon public`
3. Buka **SQL Editor** → New Query → paste isi file `supabase/schema.sql` → **Run**
4. Buka **Authentication** → **Providers** → pastikan Email enabled
5. Buat user pertama: **Authentication** → **Users** → **Invite user** → masukkan email kamu

---

### LANGKAH 3 — Setup Project Lokal

```bash
# Clone repository (setelah push ke GitHub)
git clone https://github.com/username/fink.git
cd fink

# Install dependencies
npm install

# Buat file environment
cp .env.example .env.local
```

Edit `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

```bash
# Jalankan development server
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

---

### LANGKAH 4 — Push ke GitHub

```bash
# Inisialisasi Git (di folder project)
git init
git add .
git commit -m "Initial commit: FiNK setup"

# Buat repository baru di github.com
# Klik + → New repository → nama: fink → Private → Create

# Hubungkan dan push
git remote add origin https://github.com/USERNAME/fink.git
git branch -M main
git push -u origin main
```

---

### LANGKAH 5 — Deploy ke Cloudflare Pages

1. Daftar di [cloudflare.com](https://cloudflare.com)
2. **Pages** → **Create a project** → **Connect to Git**
3. Pilih repository `fink`
4. Build settings:
   - **Framework preset**: Next.js
   - **Build command**: `npm run build`
   - **Build output**: `.next`
5. **Environment variables** → tambahkan:
   ```
   NEXT_PUBLIC_SUPABASE_URL     = https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = your-anon-key
   ```
6. **Save and Deploy**

Setiap kali kamu `git push`, Cloudflare otomatis deploy ulang.

---

## Struktur Project

```
src/
├── app/
│   ├── login/                  → Halaman login
│   ├── (dashboard)/
│   │   ├── layout.tsx          → Topnav + sidebar (shared)
│   │   ├── bulanan/page.tsx    → Halaman Bulanan
│   │   ├── tabungan/page.tsx   → Halaman Tabungan
│   │   ├── portofolio/page.tsx → Halaman Portofolio
│   │   └── settings/page.tsx  → Pengaturan
│   └── api/                   → API Routes (server-only)
├── components/
│   └── layout/DashboardShell  → Shell dengan topnav & sidebar
├── lib/
│   └── supabase/
│       ├── client.ts           → Browser Supabase client
│       ├── server.ts           → Server Supabase client (aman)
│       └── middleware.ts       → Session refresh
├── types/database.ts           → TypeScript types
└── middleware.ts               → Auth protection
```

## Keamanan

- **RLS (Row Level Security)** aktif di semua tabel — user hanya bisa akses data sendiri
- **API key** tidak pernah dikirim ke browser via server components
- **Auth middleware** melindungi semua route dashboard
- **`.env.local`** tidak pernah masuk ke Git (ada di `.gitignore`)
