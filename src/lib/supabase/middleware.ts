import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Dipakai di middleware.ts — refresh session otomatis
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const publicPaths = [
    '/',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/auth',
  ]

  const isPublicPath = publicPaths.some((path) =>
    request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(`${path}/`)
  )

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }


  if (user && !isPublicPath) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('suspended,deleted_at')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.deleted_at) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('error', 'deleted')
      return NextResponse.redirect(url)
    }

    if (profile?.suspended) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('error', 'suspended')
      return NextResponse.redirect(url)
    }
  }

  const authMode = request.nextUrl.searchParams.get('mode')
  const authType = request.nextUrl.searchParams.get('type')
  const authError = request.nextUrl.searchParams.get('error')

  if (
    user &&
    request.nextUrl.pathname === '/login' &&
    !authMode &&
    !authError &&
    authType !== 'recovery'
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/bulanan'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
