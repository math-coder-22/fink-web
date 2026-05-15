import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { aggregateMonth, recentMonths } from '@/lib/finance/summary'
import type { MonthKey, Transaction } from '@/types/database'

const MONTH_SET = new Set(['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'])

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month') as MonthKey | null
  const year = Number.parseInt(searchParams.get('year') || '', 10)
  const count = Math.min(12, Math.max(3, Number.parseInt(searchParams.get('count') || '6', 10) || 6))

  if (!month || !MONTH_SET.has(month) || !Number.isFinite(year)) {
    return NextResponse.json({ error: 'valid month & year required' }, { status: 400 })
  }

  const months = recentMonths(month, year, count)
  const years = Array.from(new Set(months.map(m => m.year)))
  const monthKeys = Array.from(new Set(months.map(m => m.month)))

  const [txRes, planRes] = await Promise.all([
    supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .in('year', years)
      .in('month', monthKeys),
    supabase
      .from('monthly_plans')
      .select('*')
      .eq('user_id', user.id)
      .in('year', years)
      .in('month', monthKeys),
  ])

  if (txRes.error) return NextResponse.json({ error: txRes.error.message }, { status: 500 })
  if (planRes.error) return NextResponse.json({ error: planRes.error.message }, { status: 500 })

  const tx = (txRes.data || []) as Transaction[]
  const plans = new Map((planRes.data || []).map((p: any) => [`${p.month}-${p.year}`, p]))
  const trend = months.map(({ month: m, year: y }) => aggregateMonth(m, y, tx, plans.get(`${m}-${y}`)))

  return NextResponse.json({ data: trend })
}
