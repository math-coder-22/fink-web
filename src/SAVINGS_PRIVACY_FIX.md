# Smart Saving per User Fix

Penyebab masalah:
- Smart Saving sebelumnya memakai localStorage key global: fink_savings_goals.
- Jika login akun berbeda pada browser yang sama, data saving bisa terbaca oleh akun lain.

Perbaikan:
- Smart Saving sekarang memakai key per user: fink_savings_goals:<user_id>.
- Key lama akan dimigrasi satu kali ke user yang sedang login, lalu key lama dihapus.

Catatan:
- Ini memperbaiki isolasi data di browser yang sama.
- Untuk SaaS production penuh, tahap berikutnya sebaiknya memindahkan Smart Saving ke tabel Supabase dengan user_id + RLS.
