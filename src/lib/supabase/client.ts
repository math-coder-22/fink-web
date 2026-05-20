import { createBrowserClient } from '@supabase/ssr'

/**
 * Digunakan di Client Components ('use client').
 * Browser client dibuat singleton agar tidak membuat instance Supabase baru
 * setiap komponen render. Ini tidak mengubah auth/session, hanya mengurangi
 * overhead listener dan object creation di browser.
 */
type BrowserSupabaseClient = ReturnType<typeof createBrowserClient>

let browserClient: BrowserSupabaseClient | null = null

export function createClient() {
  if (browserClient) return browserClient

  browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  return browserClient
}
