# FiNK Auth Email Flow Fix

Patch ini menambahkan:
- /auth/callback untuk memproses link Supabase email confirmation dan reset password.
- /register, /forgot-password, /reset-password sebagai route public.
- Redirect forgot password ke /auth/callback?type=recovery.

Pengaturan Supabase yang wajib:
1. Authentication -> Providers -> Email
   - Matikan Confirm email jika ingin user baru langsung aktif tanpa klik link.
2. Authentication -> URL Configuration
   Site URL:
   - https://fink-web.vercel.app
   Redirect URLs:
   - https://fink-web.vercel.app/auth/callback
   - https://fink-web.vercel.app/auth/callback?type=recovery
   - https://fink-web.vercel.app/login
   - https://fink-web.vercel.app/login?type=recovery

Untuk local dev:
- http://localhost:3000/auth/callback
- http://localhost:3000/auth/callback?type=recovery
