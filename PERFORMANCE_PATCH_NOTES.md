# Performance Patch Notes

Optimasi ini dibuat dengan prinsip: tidak mematikan fitur, tidak mengubah struktur database, dan tidak mengubah alur kerja pengguna.

## Area yang dioptimasi

1. **Supabase browser client singleton**
   - File: `src/lib/supabase/client.ts`
   - Menghindari pembuatan instance Supabase browser berulang pada render komponen.
   - Fitur auth/session tetap sama.

2. **Query API lebih selektif**
   - File:
     - `src/app/api/transaksi/route.ts`
     - `src/app/api/bulanan/route.ts`
     - `src/app/api/hutang/route.ts`
     - `src/app/api/overview/trend/route.ts`
     - `src/app/api/advisor/summary/route.ts`
     - `src/app/api/subscription/route.ts`
     - `src/app/api/admin/users/route.ts`
   - Mengurangi `select('*')` menjadi kolom yang benar-benar dipakai.
   - Tidak mengubah data yang dikirim untuk fitur utama.

3. **Agregasi tren bulanan lebih efisien**
   - File: `src/lib/finance/summary.ts`
   - Sebelumnya setiap bulan melakukan filter ulang atas seluruh transaksi.
   - Sekarang transaksi dibucket satu kali lalu dipakai untuk menghitung tren Overview dan Advisor.
   - Output data tetap sama.

4. **Kalkulasi actual di Journal lebih ringan**
   - File: `src/hooks/useBulanan.ts`
   - Sebelumnya setiap item budget/income/saving/debt mem-filter seluruh transaksi.
   - Sekarang transaksi dihitung ke dalam map satu kali, lalu setiap item membaca hasilnya.
   - Form, transaksi, kategori, saving, debt, dan fitur rename tetap aktif.

5. **Cache pendek subscription di client**
   - File: `src/hooks/useSubscription.ts`
   - Menghindari request subscription berulang dari beberapa komponen dalam waktu dekat.
   - TTL 30 detik dan `refresh()` tetap force reload.

6. **DashboardShell memakai Supabase client yang stabil**
   - File: `src/components/layout/DashboardShell.tsx`
   - Client dimemoisasi agar tidak membuat object baru pada setiap render.

## Catatan keamanan fitur

- Tidak ada menu yang dihapus.
- Tidak ada route yang dihapus.
- Tidak ada tabel/kolom database yang diubah.
- Tidak ada limit baru yang ditambahkan.
- Tidak ada fitur premium/free yang dimatikan.
- Tidak menjalankan `npm install` atau `npm build`.

## Saran setelah deploy

Tes manual minimal:
1. Login/logout.
2. Overview: grafik, ringkasan, recent transactions.
3. Journal: tambah/edit/hapus transaksi, budget, income, saving, debt.
4. Advisor: ringkasan dan insight muncul.
5. Goals: tambah/edit/hapus target.
6. Profile: data tersimpan.
7. Admin/monitoring jika akun admin digunakan.
