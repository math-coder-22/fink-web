# FiNK User Management Patch

## Yang ditambahkan

- Role: `user`, `admin`, `super_admin`
- Premium sampai tanggal tertentu
- Lifetime premium
- Suspend / activate user
- Soft delete / restore
- Hard delete user dari Supabase Auth + data aplikasi
- Dashboard admin user management
- Proteksi API admin memakai `SUPABASE_SERVICE_ROLE_KEY`
- Auto-downgrade jika premium expired
- Settings menampilkan status subscription dan masa aktif

## Langkah setelah replace file

1. Jalankan SQL:
   - `supabase/user_management_subscription_schema.sql`
   atau
   - `src/lib/subscription/subscription_schema.sql`

2. Jadikan akun Anda super admin:
```sql
update public.profiles
set role = 'super_admin'
where email = 'email-anda@gmail.com';
```

3. Tambahkan Environment Variable di Vercel:
```env
SUPABASE_SERVICE_ROLE_KEY=isi-service-role-key
SUPERADMIN_EMAIL=email-anda@gmail.com
```

4. Redeploy Vercel.

## Penting

`SUPABASE_SERVICE_ROLE_KEY` hanya boleh ada di Vercel Environment Variables.
Jangan masukkan ke frontend, GitHub, atau file `.env.local` yang dipush.
