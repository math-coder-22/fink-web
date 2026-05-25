# Overview Safe Performance Optimization

Optimasi ini mengikuti pola aman seperti Journal, tanpa rewrite besar dan tanpa mengubah struktur database.

## Yang diubah

- `src/app/(dashboard)/overview/page.tsx`
  - Menambahkan cache lokal untuk `/api/overview/trend` menggunakan `localStorage` dan `sessionStorage`.
  - Data monthly trend langsung muncul dari cache, lalu di-refresh di background.
  - Menggunakan `useMemo` untuk hasil `computedBudget`, `computedIncome`, `computedSaving`, dan `computedDebt`.
  - Menggabungkan kalkulasi Overview ke `overviewSummary` agar tidak dihitung ulang terlalu sering.
  - Mememoisasi komponen berat seperti `FinancialPositionHero`, `MonthlyComparisonChart`, `InsightPanel`, `QuickActionsSection`, dan `PriorityGoalsList`.
  - Memperbaiki perhitungan index bulan untuk chart dari `Number(curMonth)` menjadi `MONTHS_ORDER.indexOf(curMonth)`.

- `src/components/dashboard/CashFlowTrendChart.tsx`
  - Membungkus chart dengan `memo`.
  - Mememoisasi fallback totals, scale, ticks, dan path SVG.
  - Mengurangi update state hover yang berulang saat pointer masih berada di hari yang sama.

## Dampak

- Overview lebih cepat terasa saat dibuka ulang.
- Chart dan summary lebih ringan saat render.
- Perpindahan bulan lebih smooth karena data trend lama/cache tidak langsung dikosongkan.
- Fungsi lama tetap dipertahankan.

## Catatan

Saya tidak menjalankan `npm install` atau build. Pengecekan TypeScript penuh tidak bisa dilakukan di folder ekstraksi karena dependency `node_modules` tidak tersedia.
