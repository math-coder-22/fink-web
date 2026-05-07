# FiNK - versi dirapikan

Versi ini mempertahankan tampilan asli, tetapi beberapa bagian kode dipindahkan agar struktur lebih mudah dipahami.

## Perubahan yang dilakukan

- Tampilan tidak diubah.
- Halaman `tabungan/page.tsx` dibuat lebih ringan dengan memindahkan modal dan summary card ke:
  - `src/components/savings/SavingsModals.tsx`
- Halaman `bulanan/page.tsx` dibuat lebih ringan dengan memindahkan modal ke:
  - `src/components/bulanan/BulananModals.tsx`
- Struktur Next.js, Supabase, dan komponen utama tetap dipertahankan agar masih siap dikembangkan menjadi SaaS.

## Cara menjalankan

```bash
npm install
npm run dev
```

Lalu buka:

```text
http://localhost:3000
```

## Catatan penting

Jangan upload atau bagikan file `.env.local` karena berisi data rahasia.
Folder `node_modules` dan `.next` tidak perlu disimpan dalam ZIP karena dapat dibuat ulang.
