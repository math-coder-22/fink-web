import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { MONITORING_COOKIE } from '@/lib/auth/effective-user'

function isSuperAdmin(profile: any, email?: string | null) {
  const superAdminEmail = process.env.SUPERADMIN_EMAIL || process.env.NEXT_PUBLIC_SUPERADMIN_EMAIL
  return profile?.role === 'super_admin' || (!!superAdminEmail && email === superAdminEmail)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id,email,role,suspended,deleted_at')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })
  if (!isSuperAdmin(profile, user.email)) {
    return NextResponse.json({ error: 'Hanya super admin yang dapat memakai Monitoring Mode.' }, { status: 403 })
  }

  const body = await request.json()
  const targetUserId = String(body.user_id || '')
  if (!targetUserId) return NextResponse.json({ error: 'user_id required' }, { status: 400 })
  if (targetUserId === user.id) return NextResponse.json({ error: 'Tidak perlu memonitor akun sendiri.' }, { status: 400 })

  let admin
  try {
    admin = createAdminClient()
  } catch (e) {
    return NextResponse.json({
      error: e instanceof Error ? e.message : 'Missing service role key',
      message: 'SUPABASE_SERVICE_ROLE_KEY diperlukan untuk Monitoring Mode.',
    }, { status: 500 })
  }

  const { data: target, error: targetError } = await admin
    .from('profiles')
    .select('id,email,full_name,role,suspended,deleted_at')
    .eq('id', targetUserId)
    .maybeSingle()

  if (targetError) return NextResponse.json({ error: targetError.message }, { status: 500 })
  if (!target || target.deleted_at || target.suspended) {
    return NextResponse.json({ error: 'User target tidak tersedia untuk dimonitor.' }, { status: 404 })
  }

  const cookieStore = await cookies()
  cookieStore.set(MONITORING_COOKIE, target.id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 4,
  })

  return NextResponse.json({
    monitoring: true,
    target,
    actualUser: { id: user.id, email: user.email },
  })
}
