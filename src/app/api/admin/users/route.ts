import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

type AdminRole = 'admin' | 'super_admin'

function addDuration(amount: number, unit: 'days' | 'months' | 'years') {
  const d = new Date()
  if (unit === 'days') d.setDate(d.getDate() + amount)
  if (unit === 'months') d.setMonth(d.getMonth() + amount)
  if (unit === 'years') d.setFullYear(d.getFullYear() + amount)
  return d.toISOString()
}

async function requireAdmin(): Promise<
  | { ok: true; userId: string; role: AdminRole }
  | { ok: false; response: NextResponse }
> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id,email,role,suspended,deleted_at')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    return { ok: false, response: NextResponse.json({ error: error.message }, { status: 500 }) }
  }

  const superAdminEmail = process.env.SUPERADMIN_EMAIL || process.env.NEXT_PUBLIC_SUPERADMIN_EMAIL
  const isEnvSuperAdmin = !!superAdminEmail && user.email === superAdminEmail

  if (isEnvSuperAdmin) {
    return { ok: true, userId: user.id, role: 'super_admin' }
  }

  if (!profile || profile.deleted_at || profile.suspended) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  if (!['admin', 'super_admin'].includes(profile.role)) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden. Admin role required.' }, { status: 403 }) }
  }

  return { ok: true, userId: user.id, role: profile.role as AdminRole }
}

function isExpired(sub: any) {
  if (!sub || sub.is_lifetime || !sub.current_period_end) return false
  return new Date(sub.current_period_end).getTime() < Date.now()
}

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  let admin
  try {
    admin = createAdminClient()
  } catch (e) {
    return NextResponse.json({
      error: e instanceof Error ? e.message : 'Missing service role key',
      message: 'Tambahkan SUPABASE_SERVICE_ROLE_KEY di Vercel Environment Variables.',
    }, { status: 500 })
  }

  const { data: profiles, error: profilesError } = await admin
    .from('profiles')
    .select('id,email,full_name,role,suspended,deleted_at,created_at,updated_at')
    .order('created_at', { ascending: false })

  if (profilesError) return NextResponse.json({ error: profilesError.message }, { status: 500 })

  const ids = (profiles || []).map((p: any) => p.id)
  const { data: subscriptions, error: subsError } = await admin
    .from('subscriptions')
    .select('*')
    .in('user_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])

  if (subsError) return NextResponse.json({ error: subsError.message }, { status: 500 })

  const subByUser = new Map((subscriptions || []).map((s: any) => [s.user_id, s]))

  const users = (profiles || []).map((p: any) => {
    const sub = subByUser.get(p.id) || null
    const expired = isExpired(sub)
    return {
      ...p,
      subscription: sub,
      effectivePlan:
        sub?.plan === 'premium' &&
        ['active', 'trialing'].includes(sub.status) &&
        !expired
          ? 'premium'
          : 'free',
      expired,
    }
  })

  return NextResponse.json({
    users,
    currentAdmin: { id: auth.userId, role: auth.role },
  })
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  let admin
  try {
    admin = createAdminClient()
  } catch (e) {
    return NextResponse.json({
      error: e instanceof Error ? e.message : 'Missing service role key',
      message: 'Tambahkan SUPABASE_SERVICE_ROLE_KEY di Vercel Environment Variables.',
    }, { status: 500 })
  }

  const body = await request.json()
  const {
    action,
    user_id,
    plan,
    status,
    current_period_end,
    is_lifetime,
    role,
    duration_amount,
    duration_unit,
  } = body

  if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  if (user_id === auth.userId && ['suspend', 'soft_delete'].includes(action)) {
    return NextResponse.json({ error: 'Anda tidak bisa menonaktifkan akun admin sendiri.' }, { status: 400 })
  }

  const { data: targetProfile } = await admin
    .from('profiles')
    .select('id,role')
    .eq('id', user_id)
    .maybeSingle()

  if (targetProfile?.role === 'super_admin' && auth.role !== 'super_admin') {
    return NextResponse.json({ error: 'Hanya super admin yang dapat mengubah super admin.' }, { status: 403 })
  }

  if (action === 'suspend' || action === 'activate') {
    const { data, error } = await admin
      .from('profiles')
      .update({ suspended: action === 'suspend', updated_at: new Date().toISOString() })
      .eq('id', user_id)
      .select('id,email,full_name,role,suspended,deleted_at,created_at,updated_at')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ profile: data })
  }

  if (action === 'soft_delete' || action === 'restore') {
    if (auth.role !== 'super_admin') {
      return NextResponse.json({ error: 'Soft delete/restore hanya untuk super admin.' }, { status: 403 })
    }
    const { data, error } = await admin
      .from('profiles')
      .update({
        deleted_at: action === 'soft_delete' ? new Date().toISOString() : null,
        suspended: action === 'soft_delete' ? true : false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user_id)
      .select('id,email,full_name,role,suspended,deleted_at,created_at,updated_at')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ profile: data })
  }

  if (action === 'set_role') {
    if (auth.role !== 'super_admin') {
      return NextResponse.json({ error: 'Set role hanya untuk super admin.' }, { status: 403 })
    }
    if (!['user', 'admin', 'super_admin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }
    const { data, error } = await admin
      .from('profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', user_id)
      .select('id,email,full_name,role,suspended,deleted_at,created_at,updated_at')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ profile: data })
  }

  if (action === 'set_subscription' || action === 'grant_duration' || action === 'lifetime' || action === 'downgrade') {
    let nextPlan = plan || 'free'
    let nextStatus = status || 'active'
    let nextPeriodEnd = current_period_end || null
    let nextLifetime = !!is_lifetime

    if (action === 'lifetime') {
      nextPlan = 'premium'
      nextStatus = 'active'
      nextLifetime = true
      nextPeriodEnd = null
    }

    if (action === 'downgrade') {
      nextPlan = 'free'
      nextStatus = 'active'
      nextLifetime = false
      nextPeriodEnd = null
    }

    if (action === 'grant_duration') {
      const amount = Number(duration_amount || 0)
      const unit = duration_unit as 'days' | 'months' | 'years'
      if (!amount || !['days', 'months', 'years'].includes(unit)) {
        return NextResponse.json({ error: 'duration_amount and duration_unit required' }, { status: 400 })
      }
      nextPlan = 'premium'
      nextStatus = 'active'
      nextLifetime = false
      nextPeriodEnd = addDuration(amount, unit)
    }

    if (!['free', 'premium'].includes(nextPlan)) {
      return NextResponse.json({ error: 'plan must be free or premium' }, { status: 400 })
    }

    if (!['active', 'trialing', 'past_due', 'canceled'].includes(nextStatus)) {
      return NextResponse.json({ error: 'invalid status' }, { status: 400 })
    }

    const { data, error } = await admin
      .from('subscriptions')
      .upsert({
        user_id,
        plan: nextPlan,
        status: nextStatus,
        current_period_end: nextPeriodEnd,
        is_lifetime: nextLifetime,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ subscription: data })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  if (auth.role !== 'super_admin') {
    return NextResponse.json({ error: 'Hard delete hanya untuk super admin.' }, { status: 403 })
  }

  let admin
  try {
    admin = createAdminClient()
  } catch (e) {
    return NextResponse.json({
      error: e instanceof Error ? e.message : 'Missing service role key',
      message: 'Tambahkan SUPABASE_SERVICE_ROLE_KEY di Vercel Environment Variables.',
    }, { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('user_id')

  if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 400 })
  if (userId === auth.userId) return NextResponse.json({ error: 'Tidak bisa hard delete akun sendiri.' }, { status: 400 })

  const { data: target } = await admin
    .from('profiles')
    .select('id,role')
    .eq('id', userId)
    .maybeSingle()

  if (target?.role === 'super_admin') {
    return NextResponse.json({ error: 'Tidak bisa hard delete super admin.' }, { status: 403 })
  }

  await admin.from('transactions').delete().eq('user_id', userId)
  await admin.from('monthly_plans').delete().eq('user_id', userId)
  await admin.from('subscriptions').delete().eq('user_id', userId)
  await admin.from('profiles').delete().eq('id', userId)

  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
