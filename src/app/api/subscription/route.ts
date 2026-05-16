import { NextResponse } from 'next/server'
import { getEffectiveUser } from '@/lib/auth/effective-user'

const DEFAULT_PLAN = 'free'

function isExpired(subscription: any) {
  if (!subscription) return false
  if (subscription.is_lifetime) return false
  if (!subscription.current_period_end) return false
  return new Date(subscription.current_period_end).getTime() < Date.now()
}

export async function GET() {
  const ctx = await getEffectiveUser()
  if (ctx.ok === false) return ctx.response

  const { supabase, effectiveUserId, isMonitoring } = ctx

  let profile = ctx.effectiveProfile

  if (!profile && !isMonitoring) {
    const { data: insertedProfile, error: insertProfileError } = await supabase
      .from('profiles')
      .insert({
        id: effectiveUserId,
        email: ctx.actualProfile?.email || '',
        full_name: null,
        role: 'user',
        suspended: false,
        deleted_at: null,
      })
      .select('id,email,full_name,role,suspended,deleted_at,created_at,updated_at')
      .single()

    if (insertProfileError) {
      return NextResponse.json({ error: insertProfileError.message }, { status: 500 })
    }

    profile = insertedProfile
  }

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  if (profile.deleted_at) {
    return NextResponse.json({ error: 'Account deleted', code: 'deleted' }, { status: 403 })
  }

  if (profile.suspended) {
    return NextResponse.json({ error: 'Account suspended', code: 'suspended' }, { status: 403 })
  }

  const { data: existingSub, error: subReadError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', effectiveUserId)
    .maybeSingle()

  if (subReadError) {
    return NextResponse.json({
      error: subReadError.message,
      setup_required: true,
      message: 'Tabel subscriptions belum tersedia. Jalankan SQL user_management_subscription_schema.sql.',
    }, { status: 500 })
  }

  let subscription = existingSub

  if (!subscription && !isMonitoring) {
    const { data: insertedSub, error: insertSubError } = await supabase
      .from('subscriptions')
      .insert({ user_id: effectiveUserId, plan: DEFAULT_PLAN, status: 'active', is_lifetime: false })
      .select('*')
      .single()

    if (insertSubError) {
      return NextResponse.json({ error: insertSubError.message }, { status: 500 })
    }
    subscription = insertedSub
  }

  if (isExpired(subscription) && subscription.plan !== 'free' && !isMonitoring) {
    const { data: downgraded } = await supabase
      .from('subscriptions')
      .update({
        plan: 'free',
        status: 'canceled',
        is_lifetime: false,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', effectiveUserId)
      .select('*')
      .single()

    if (downgraded) subscription = downgraded
  }

  const effectivePlan =
    subscription?.plan === 'premium' &&
    ['active', 'trialing'].includes(subscription.status) &&
    !isExpired(subscription)
      ? 'premium'
      : 'free'

  const actualRole = ctx.actualProfile?.role
  const isActualAdmin = actualRole === 'admin' || actualRole === 'super_admin'
  const isActualSuperAdmin = actualRole === 'super_admin'

  return NextResponse.json({
    profile,
    subscription,
    effectivePlan,
    isPremium: effectivePlan === 'premium',
    isAdmin: isActualAdmin || profile.role === 'admin' || profile.role === 'super_admin',
    isSuperAdmin: isActualSuperAdmin,
    monitoring: ctx.isMonitoring,
    actualProfile: ctx.actualProfile,
    effectiveProfile: ctx.effectiveProfile,
  })
}
