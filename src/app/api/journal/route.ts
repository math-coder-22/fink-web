import { getEffectiveUser, monitoringWriteBlocked } from '@/lib/auth/effective-user'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/journal?month=apr&year=2026
// Satu endpoint untuk Journal supaya halaman tidak perlu menunggu beberapa request terpisah.
export async function GET(request: NextRequest) {
  const ctx = await getEffectiveUser()
  if (ctx.ok === false) return ctx.response
  const { supabase, effectiveUserId, isMonitoring } = ctx

  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month')
  const year = searchParams.get('year')
  const parsedYear = Number.parseInt(String(year || ''), 10)

  if (!month || !year || !Number.isFinite(parsedYear)) {
    return NextResponse.json({ error: 'month & year required' }, { status: 400 })
  }

  const [planResult, txResult] = await Promise.all([
    supabase
      .from('monthly_plans')
      .select('id,user_id,month,year,income,saving,debt,budget,created_at,updated_at')
      .eq('user_id', effectiveUserId)
      .eq('month', month)
      .eq('year', parsedYear)
      .maybeSingle(),
    supabase
      .from('transactions')
      .select('id,user_id,month,year,date,type,cat,note,amt,debt,settled,created_at')
      .eq('user_id', effectiveUserId)
      .eq('month', month)
      .eq('year', parsedYear)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false }),
  ])

  if (planResult.error && planResult.error.code !== 'PGRST116') {
    return NextResponse.json({ error: planResult.error.message }, { status: 500 })
  }

  if (txResult.error) {
    return NextResponse.json({ error: txResult.error.message }, { status: 500 })
  }

  return NextResponse.json({
    plan: planResult.data || null,
    tx: txResult.data || [],
    readOnly: isMonitoring,
  })
}

// POST tetap diarahkan ke endpoint lama agar tidak menggandakan logic write.
// Journal saat ini hanya butuh GET gabungan; add/update/delete tetap memakai /api/transaksi dan /api/bulanan.
export async function POST(request: NextRequest) {
  const ctx = await getEffectiveUser()
  if (ctx.ok === false) return ctx.response
  const blocked = monitoringWriteBlocked(ctx)
  if (blocked) return blocked
  return NextResponse.json({ error: 'Use /api/bulanan or /api/transaksi for writes.' }, { status: 405 })
}
