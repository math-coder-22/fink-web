import { getEffectiveUser, monitoringWriteBlocked } from '@/lib/auth/effective-user'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/hutang — ambil semua pengeluaran unpaid / tertunda milik user (lintas bulan)
export async function GET() {
  const ctx = await getEffectiveUser()
  if (ctx.ok === false) return ctx.response
  const { supabase, effectiveUserId } = ctx

  const { data, error } = await supabase
    .from('transactions')
    .select('id,user_id,month,year,date,type,cat,note,amt,paid_amt,debt,settled,created_at')
    .eq('user_id', effectiveUserId)
    .eq('debt', true)
    .eq('settled', false)
    .order('year',  { ascending: false })
    .order('month', { ascending: false })
    .order('date',  { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data || [] }, { headers: { 'Cache-Control': 'no-store' } })
}

// POST /api/hutang — catat pembayaran (penuh atau sebagian) untuk satu/lebih utang.
// Body: { payments: [{ id: string, amount: number }] }
// - amount ditambahkan ke paid_amt (tidak mengubah amt asli agar riwayat budget tetap benar)
// - jika paid_amt >= amt, transaksi otomatis ditandai settled
export async function POST(request: NextRequest) {
  const ctx = await getEffectiveUser()
  if (ctx.ok === false) return ctx.response
  const blocked = monitoringWriteBlocked(ctx)
  if (blocked) return blocked
  const { supabase, effectiveUserId } = ctx

  const body = await request.json().catch(() => null)
  const payments = Array.isArray(body?.payments) ? body.payments : []
  if (payments.length === 0) {
    return NextResponse.json({ error: 'payments required' }, { status: 400 })
  }

  const results: Record<string, unknown>[] = []

  // Aggregate amounts per id so duplicates can't double-count.
  const wanted = new Map<string, number>()
  for (const p of payments) {
    const id = String(p?.id || '')
    const amount = Number.parseInt(String(p?.amount || '0'), 10)
    if (!id || !Number.isFinite(amount) || amount <= 0) {
      results.push({ id, ok: false, error: 'invalid payment' })
      continue
    }
    wanted.set(id, (wanted.get(id) || 0) + amount)
  }
  const ids = [...wanted.keys()]
  if (ids.length === 0) return NextResponse.json({ results })

  // ONE batched read instead of one SELECT per payment.
  const { data: currents, error: fetchError } = await supabase
    .from('transactions')
    .select('id,amt,paid_amt,debt,settled')
    .eq('user_id', effectiveUserId)
    .in('id', ids)
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })
  const byId = new Map(((currents || []) as any[]).map(c => [String(c.id), c]))

  // Validate everything up front, then run all updates IN PARALLEL.
  const jobs: { id: string; payAmount: number; newPaid: number; total: number }[] = []
  for (const id of ids) {
    const current = byId.get(id)
    if (!current) {
      results.push({ id, ok: false, error: 'not found' })
      continue
    }
    if (!current.debt || current.settled) {
      results.push({ id, ok: false, error: 'not an unpaid debt' })
      continue
    }
    const total = Number(current.amt || 0)
    const alreadyPaid = Number(current.paid_amt || 0)
    const remaining = Math.max(0, total - alreadyPaid)
    if (remaining <= 0) {
      results.push({ id, ok: false, error: 'already settled' })
      continue
    }
    const payAmount = Math.min(wanted.get(id) || 0, remaining)
    jobs.push({ id, payAmount, newPaid: alreadyPaid + payAmount, total })
  }

  const settled = await Promise.all(jobs.map(async (j) => {
    const updates: Record<string, unknown> = { paid_amt: j.newPaid }
    if (j.newPaid >= j.total) updates.settled = true
    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', j.id)
      .eq('user_id', effectiveUserId)
      .select('id,user_id,month,year,date,type,cat,note,amt,paid_amt,debt,settled,created_at')
      .single()
    if (error) return { id: j.id, ok: false, error: error.message }
    return { id: j.id, ok: true, paid: j.payAmount, remaining: j.total - j.newPaid, settled: j.newPaid >= j.total, data }
  }))

  return NextResponse.json({ results: [...results, ...settled] })
}
