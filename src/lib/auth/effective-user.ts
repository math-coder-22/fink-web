import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const MONITORING_COOKIE = 'fink_monitor_user_id'

export type EffectiveUserContext =
  | {
      ok: true
      supabase: Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient>
      actualUserId: string
      effectiveUserId: string
      isMonitoring: boolean
      actualProfile: any
      effectiveProfile: any
    }
  | {
      ok: false
      response: NextResponse
    }

function isSuperAdmin(profile: any, email?: string | null) {
  const superAdminEmail = process.env.SUPERADMIN_EMAIL || process.env.NEXT_PUBLIC_SUPERADMIN_EMAIL
  return profile?.role === 'super_admin' || (!!superAdminEmail && email === superAdminEmail)
}

export async function getEffectiveUser(): Promise<EffectiveUserContext> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: actualProfile, error: profileError } = await supabase
    .from('profiles')
    .select('id,email,full_name,role,suspended,deleted_at,created_at,updated_at')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    return { ok: false, response: NextResponse.json({ error: profileError.message }, { status: 500 }) }
  }

  if (actualProfile?.deleted_at || actualProfile?.suspended) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  const cookieStore = await cookies()
  const monitoringUserId = cookieStore.get(MONITORING_COOKIE)?.value || null

  if (!monitoringUserId || monitoringUserId === user.id) {
    return {
      ok: true,
      supabase,
      actualUserId: user.id,
      effectiveUserId: user.id,
      isMonitoring: false,
      actualProfile,
      effectiveProfile: actualProfile,
    }
  }

  if (!isSuperAdmin(actualProfile, user.email)) {
    cookieStore.delete(MONITORING_COOKIE)
    return {
      ok: true,
      supabase,
      actualUserId: user.id,
      effectiveUserId: user.id,
      isMonitoring: false,
      actualProfile,
      effectiveProfile: actualProfile,
    }
  }

  let admin
  try {
    admin = createAdminClient()
  } catch (e) {
    return {
      ok: false,
      response: NextResponse.json({
        error: e instanceof Error ? e.message : 'Missing service role key',
        message: 'SUPABASE_SERVICE_ROLE_KEY diperlukan untuk Monitoring Mode.',
      }, { status: 500 }),
    }
  }

  const { data: targetProfile, error: targetError } = await admin
    .from('profiles')
    .select('id,email,full_name,role,suspended,deleted_at,created_at,updated_at')
    .eq('id', monitoringUserId)
    .maybeSingle()

  if (targetError) {
    return { ok: false, response: NextResponse.json({ error: targetError.message }, { status: 500 }) }
  }

  if (!targetProfile || targetProfile.deleted_at || targetProfile.suspended) {
    cookieStore.delete(MONITORING_COOKIE)
    return {
      ok: false,
      response: NextResponse.json({ error: 'Monitoring target tidak tersedia.' }, { status: 404 }),
    }
  }

  return {
    ok: true,
    supabase: admin,
    actualUserId: user.id,
    effectiveUserId: targetProfile.id,
    isMonitoring: true,
    actualProfile,
    effectiveProfile: targetProfile,
  }
}

export function monitoringWriteBlocked(ctx: Extract<EffectiveUserContext, { ok: true }>) {
  if (!ctx.isMonitoring) return null
  return NextResponse.json({
    error: 'Monitoring Mode bersifat read-only. Keluar dari monitoring untuk mengubah data.',
    code: 'monitoring_read_only',
  }, { status: 403 })
}
