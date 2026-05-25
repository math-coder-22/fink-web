# Goals Native Feel Optimization

Perubahan ini mengikuti pola safe optimization seperti Journal dan Overview, tanpa rewrite besar.

## File yang diubah
- `src/hooks/useSavings.ts`
- `src/app/(dashboard)/goals/page.tsx`
- `src/components/savings/GoalCard.tsx`

## Optimasi utama
1. Goals memakai cache lokal per user melalui `sessionStorage` dan `localStorage`.
2. Data cache tampil lebih dulu, lalu data Supabase tetap di-refresh di background.
3. Add/update/delete/topup/withdraw/reconcile tetap optimistic, tetapi sekarang cache ikut disinkronkan dan rollback jika gagal.
4. Summary Goals dimemoisasi agar tidak dihitung ulang pada setiap render kecil.
5. Pengelompokan goals, tab counts, lookup goal by id, dan calc goal dibuat memoized.
6. GoalCard dibungkus `memo` dan advisor/progress color dimemoisasi.

## Catatan
- Tidak ada perubahan schema Supabase.
- Tidak ada perubahan alur bisnis Goals.
- Fungsi lama tetap dipertahankan: add, edit, delete, topup, withdraw, reconcile, pending, complete, archived.
- Build/npm install tidak dijalankan.
