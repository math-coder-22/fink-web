import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const DEFAULT_PLAN = 'free'

function isExpired(subscription: any) {
  if (!subscription) return false
  if (subscription.is_lifetime) return false
  if (!subscription.current_period_end) return false
  return new Date(subscription.current_period_end).getTime() < Date.now()
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const email = user.email || ''

  const { data: existingProfile, error: profileReadError } = await supabase
    .from('profiles')
    .select('id,email,full_name,role,suspended,deleted_at,created_at,updated_at')
    .eq('id', user.id)
    .maybeSingle()

  if (profileReadError) {
    return NextResponse.json({
      error: profileReadError.message,
      setup_required: true,
      message: 'Jalankan SQL user_management_subscription_schema.sql di Supabase SQL Editor.',
    }, { status: 500 })
  }

  let profile = existingProfile
  if (!profile) {
    const { data: insertedProfile, error: insertProfileError } = await supabase
      .from('profiles')
      .insert({ id: user.id, email, full_name: null, role: 'user', suspended: false, deleted_at: null })
      .select('id,email,full_name,role,suspended,deleted_at,created_at,updated_at')
      .single()

    if (insertProfileError) {
      return NextResponse.json({ error: insertProfileError.message }, { status: 500 })
    }
    profile = insertedProfile
  }

  if (profile.deleted_at) {
    await supabase.auth.signOut()
    return NextResponse.json({ error: 'Account deleted', code: 'deleted' }, { status: 403 })
  }

  if (profile.suspended) {
    await supabase.auth.signOut()
    return NextResponse.json({ error: 'Account suspended', code: 'suspended' }, { status: 403 })
  }

  const { data: existingSub, error: subReadError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (subReadError) {
    return NextResponse.json({
      error: subReadError.message,
      setup_required: true,
      message: 'Tabel subscriptions belum tersedia. Jalankan SQL user_management_subscription_schema.sql.',
    }, { status: 500 })
  }

  let subscription = existingSub
  if (!subscription) {
    const { data: insertedSub, error: insertSubError } = await supabase
      .from('subscriptions')
      .insert({ user_id: user.id, plan: DEFAULT_PLAN, status: 'active', is_lifetime: false })
      .select('*')
      .single()

    if (insertSubError) {
      return NextResponse.json({ error: insertSubError.message }, { status: 500 })
    }
    subscription = insertedSub
  }

  if (isExpired(subscription) && subscription.plan !== 'free') {
    const { data: downgraded } = await supabase
      .from('subscriptions')
      .update({
        plan: 'free',
        status: 'canceled',
        is_lifetime: false,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
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

  return NextResponse.json({
    profile,
    subscription,
    effectivePlan,
    isPremium: effectivePlan === 'premium',
    isAdmin: profile.role === 'admin' || profile.role === 'super_admin',
    isSuperAdmin: profile.role === 'super_admin',
  })
}
