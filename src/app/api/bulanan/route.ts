import { getEffectiveUser, monitoringWriteBlocked } from '@/lib/auth/effective-user'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/bulanan?month=apr&year=2026
export async function GET(request: NextRequest) {
  const ctx = await getEffectiveUser()
  if (ctx.ok === false) return ctx.response
  const { supabase, effectiveUserId } = ctx

  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month')
  const year  = searchParams.get('year')
  if (!month || !year) return NextResponse.json({ error: 'month & year required' }, { status: 400 })

  const { data, error } = await supabase
    .from('monthly_plans')
    .select('*')
    .eq('user_id', effectiveUserId)
    .eq('month', month)
    .eq('year', parseInt(year))
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: data || null })
}

// POST /api/bulanan — upsert monthly plan (income + saving + budget)
export async function POST(request: NextRequest) {
  const ctx = await getEffectiveUser()
  if (ctx.ok === false) return ctx.response
  const blocked = monitoringWriteBlocked(ctx)
  if (blocked) return blocked
  const { supabase, effectiveUserId } = ctx

  const body = await request.json()
  const { month, year, income, saving, debt, budget } = body

  if (!month || !year) return NextResponse.json({ error: 'month & year required' }, { status: 400 })

  const { data, error } = await supabase
    .from('monthly_plans')
    .upsert(
      { user_id: effectiveUserId, month, year: parseInt(year), income, saving, debt, budget },
      { onConflict: 'user_id,month,year' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data })
}
