import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Digunakan di Server Components, API Routes, dan Middleware
 * Berjalan di server — API key tidak pernah sampai ke browser
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Diabaikan di Server Components — middleware yang handle refresh
          }
        },
      },
    }
  )
}
