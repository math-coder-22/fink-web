import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/hutang — ambil semua hutang belum lunas milik user (lintas bulan)
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .eq('debt', true)
    .eq('settled', false)
    .order('year',  { ascending: false })
    .order('month', { ascending: false })
    .order('date',  { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data || [] })
}
