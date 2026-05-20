# Financial Health 67/68 Empty Data Fix

Masalah:
- User yang belum mengisi nominal keuangan masih bisa mendapat skor 67/68.
- Penyebab utama ada pada `src/lib/finance/summary.ts`: goal dengan `name` saja dianggap sebagai data finansial.
- Setelah dianggap punya data, rumus skor default dengan income/expense/saving = 0 dapat menghasilkan skor tinggi karena cashflow 0, expense rate 0, dan debt ratio 0 terbaca seperti kondisi sehat.

Perbaikan:
- `hasGoalData()` tidak lagi memakai `Boolean(g.name)` sebagai penanda data.
- Goals baru dianggap data jika memiliki nominal: `current`, `target`, `monthly`, `expense`, `coverageTarget`, `eduCurrent`, atau `pensionExp` > 0.
- `scoreFromSummary()` diberi guard agar kondisi kosong/struktur default tidak menghasilkan skor 67/68.

Catatan:
- Debt tetap tidak wajib.
- Saving/goals tetap opsional.
- Income/expense/budget/goals yang memiliki nominal tetap dapat memulai perhitungan Financial Health.
