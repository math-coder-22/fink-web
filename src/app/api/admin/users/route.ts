import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id,email,role')
    .eq('id', user.id)
    .maybeSingle()

  if (error) return { supabase, user, error: NextResponse.json({ error: error.message }, { status: 500 }) }
  if (profile?.role !== 'admin') return { supabase, user, error: NextResponse.json({ error: 'Forbidden. Admin role required.' }, { status: 403 }) }
  return { supabase, user, error: null }
}

export async function GET() {
  const { supabase, error } = await requireAdmin()
  if (error) return error

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id,email,full_name,role,created_at')
    .order('created_at', { ascending: false })

  if (profilesError) return NextResponse.json({ error: profilesError.message }, { status: 500 })

  const ids = (profiles || []).map(p => p.id)
  const { data: subscriptions, error: subsError } = await supabase
    .from('subscriptions')
    .select('*')
    .in('user_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])

  if (subsError) return NextResponse.json({ error: subsError.message }, { status: 500 })

  const subByUser = new Map((subscriptions || []).map(s => [s.user_id, s]))
  const users = (profiles || []).map(p => ({ ...p, subscription: subByUser.get(p.id) || null }))

  return NextResponse.json({ users })
}

export async function PATCH(request: NextRequest) {
  const { supabase, error } = await requireAdmin()
  if (error) return error

  const body = await request.json()
  const { user_id, plan, status, current_period_end } = body

  if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })
  if (!['free', 'premium'].includes(plan)) return NextResponse.json({ error: 'plan must be free or premium' }, { status: 400 })
  if (!['active', 'trialing', 'past_due', 'canceled'].includes(status || 'active')) {
    return NextResponse.json({ error: 'invalid status' }, { status: 400 })
  }

  const { data, error: upsertError } = await supabase
    .from('subscriptions')
    .upsert({
      user_id,
      plan,
      status: status || 'active',
      current_period_end: current_period_end || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select('*')
    .single()

  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 })

  return NextResponse.json({ subscription: data })
}
