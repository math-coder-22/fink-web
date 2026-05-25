# Advisor Native Feel Optimization Notes

Optimasi ini dibuat sebagai safe optimization seperti Journal, Overview, dan Goals. Tidak ada perubahan struktur database, tidak ada migrasi library besar, dan logika rekomendasi Advisor tetap menggunakan endpoint lama `/api/advisor/summary`.

## Perubahan utama

1. **User-scoped local cache untuk Advisor**
   - Data Advisor disimpan di `sessionStorage` dan `localStorage` dengan key yang memuat user id, bulan, dan tahun.
   - Cache user-scoped mencegah data Advisor akun lain tertampil saat browser yang sama dipakai bergantian.

2. **Background refresh**
   - Saat cache tersedia, Advisor langsung menampilkan data lama terlebih dahulu.
   - Fetch terbaru tetap berjalan di background untuk memperbarui data dari Supabase.

3. **Abort controller**
   - Request Advisor dibatalkan saat user pindah bulan/halaman sebelum request selesai.
   - Ini mencegah response lama menimpa state bulan baru.

4. **Memoization ringan**
   - Komponen kecil seperti Card, Badge, SectionHead, ProgressBar, dan MetricCard dibuat `memo`.
   - Delta notes dan guide items dibuat `useMemo` agar tidak dihitung ulang berkali-kali saat render.

5. **Loading lebih responsif**
   - Loading full-screen hanya muncul jika belum ada data sama sekali.
   - Jika cache tersedia, UI tetap tampil sambil refresh data terbaru.

## File yang berubah

- `src/app/(dashboard)/advisor/page.tsx`

## Catatan validasi

Tidak menjalankan `npm install` atau build. Pemeriksaan TypeScript penuh tidak bisa dilakukan di folder hasil ekstrak karena `node_modules` tidak tersedia. Pemeriksaan `tsc --noEmit` berhenti pada dependency yang tidak ada seperti `react`, `next`, dan `@supabase/ssr`, bukan karena build aplikasi dijalankan.
