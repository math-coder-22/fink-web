import { NextRequest, NextResponse } from 'next/server'
import { getEffectiveUser } from '@/lib/auth/effective-user'
import { aggregateMonth, buildAdvisorSummary, recentMonths } from '@/lib/finance/summary'
import type { MonthKey, Transaction } from '@/types/database'
import type { SavingsGoal } from '@/types/savings'

const MONTH_SET = new Set(['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'])

export async function GET(request: NextRequest) {
  const ctx = await getEffectiveUser()
  if (ctx.ok === false) return ctx.response
  const { supabase, effectiveUserId } = ctx

  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month') as MonthKey | null
  const year = Number.parseInt(searchParams.get('year') || '', 10)
  const count = 6

  if (!month || !MONTH_SET.has(month) || !Number.isFinite(year)) {
    return NextResponse.json({ error: 'valid month & year required' }, { status: 400 })
  }

  const months = recentMonths(month, year, count)
  const years = Array.from(new Set(months.map(m => m.year)))
  const monthKeys = Array.from(new Set(months.map(m => m.month)))

  const [txRes, planRes, goalsRes] = await Promise.all([
    supabase
      .from('transactions')
      .select('*')
      .eq('user_id', effectiveUserId)
      .in('year', years)
      .in('month', monthKeys),
    supabase
      .from('monthly_plans')
      .select('*')
      .eq('user_id', effectiveUserId)
      .in('year', years)
      .in('month', monthKeys),
    supabase
      .from('savings_goals')
      .select('id, goal, updated_at')
      .eq('user_id', effectiveUserId)
      .order('updated_at', { ascending: false }),
  ])

  if (txRes.error) return NextResponse.json({ error: txRes.error.message }, { status: 500 })
  if (planRes.error) return NextResponse.json({ error: planRes.error.message }, { status: 500 })
  // savings_goals mungkin belum ada pada instalasi lama; Advisor tetap jalan tanpa goals.
  const goals: SavingsGoal[] = goalsRes.error ? [] : (goalsRes.data || []).map((row: any) => ({ ...(row.goal || {}), id: row.id, history: row.goal?.history || [] }))

  const tx = (txRes.data || []) as Transaction[]
  const plans = new Map((planRes.data || []).map((p: any) => [`${p.month}-${p.year}`, p]))
  const trend = months.map(({ month: m, year: y }) => aggregateMonth(m, y, tx, plans.get(`${m}-${y}`)))
  const summary = buildAdvisorSummary({ currentMonth: month, currentYear: year, trend, currentPlan: plans.get(`${month}-${year}`), goals })

  return NextResponse.json({ data: summary, trend })
}
