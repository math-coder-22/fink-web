# Financial Health Empty State Fix

Perbaikan ini mengubah logika Financial Health agar user baru yang benar-benar belum memiliki data tidak otomatis mendapat skor default seperti 68.

## Prinsip baru

- Jika seluruh data finansial kosong, Financial Health menampilkan kondisi **Belum ada data** dengan skor 0/empty state.
- Debt tidak wajib diisi. User tanpa debt tetap bisa mendapatkan skor normal jika sudah punya income, transaksi, budget, saving, atau goals.
- Saving dan goals juga bukan syarat wajib, tetapi tetap menjadi faktor tambahan dalam penilaian.

## File yang diubah

- `src/lib/finance/summary.ts`
  - Menambahkan deteksi `hasFinancialData`.
  - Mencegah skor default 68 saat income/expense/saving/debt/goals kosong.
  - Menambahkan pesan awal yang lebih natural.

- `src/lib/financial-doctor/engine.ts`
  - Menambahkan empty state untuk Financial Doctor engine.
  - Debt diperlakukan sebagai data opsional, bukan syarat wajib.

- `src/app/(dashboard)/overview/page.tsx`
  - Health Score pada Overview menampilkan `—` dan status `No Data` jika user benar-benar belum punya data.

## Catatan

Tidak ada perubahan database, route, fitur premium/free, atau alur pengguna.
