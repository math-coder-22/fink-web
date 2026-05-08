import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const DEFAULT_PLAN = 'free'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const email = user.email || ''

  // Pastikan profil dasar ada. Jika migration subscription belum dijalankan,
  // API akan tetap memberi pesan yang mudah dipahami.
  const { data: existingProfile, error: profileReadError } = await supabase
    .from('profiles')
    .select('id,email,full_name,role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileReadError) {
    return NextResponse.json({
      error: profileReadError.message,
      setup_required: true,
      message: 'Jalankan SQL subscription_schema.sql di Supabase SQL Editor terlebih dahulu.',
    }, { status: 500 })
  }

  let profile = existingProfile
  if (!profile) {
    const { data: insertedProfile, error: insertProfileError } = await supabase
      .from('profiles')
      .insert({ id: user.id, email, full_name: null, role: 'user' })
      .select('id,email,full_name,role')
      .single()

    if (insertProfileError) {
      return NextResponse.json({ error: insertProfileError.message }, { status: 500 })
    }
    profile = insertedProfile
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
      message: 'Tabel subscriptions belum tersedia. Jalankan SQL subscription_schema.sql di Supabase SQL Editor.',
    }, { status: 500 })
  }

  let subscription = existingSub
  if (!subscription) {
    const { data: insertedSub, error: insertSubError } = await supabase
      .from('subscriptions')
      .insert({ user_id: user.id, plan: DEFAULT_PLAN, status: 'active' })
      .select('*')
      .single()

    if (insertSubError) {
      return NextResponse.json({ error: insertSubError.message }, { status: 500 })
    }
    subscription = insertedSub
  }

  return NextResponse.json({ profile, subscription })
}
