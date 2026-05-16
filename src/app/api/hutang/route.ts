import { getEffectiveUser } from '@/lib/auth/effective-user'
import { NextResponse } from 'next/server'

// GET /api/hutang — ambil semua pengeluaran unpaid / tertunda milik user (lintas bulan)
export async function GET() {
  const ctx = await getEffectiveUser()
  if (ctx.ok === false) return ctx.response
  const { supabase, effectiveUserId } = ctx

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', effectiveUserId)
    .eq('debt', true)
    .eq('settled', false)
    .order('year',  { ascending: false })
    .order('month', { ascending: false })
    .order('date',  { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data || [] })
}
