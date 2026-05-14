import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/transaksi?month=apr&year=2026
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month')
  const year  = searchParams.get('year')
  if (!month || !year) return NextResponse.json({ error: 'month & year required' }, { status: 400 })

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .eq('month', month)
    .eq('year', parseInt(year))
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data: data || [] })
}

// POST /api/transaksi — tambah transaksi baru
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { month, year, date, type, cat, note, amt, debt, settled } = body
  const parsedAmt = Number.parseInt(String(amt || '0'), 10)
  if (!month || !year || !date || !type || !cat) return NextResponse.json({ error: 'month, year, date, type, and cat are required' }, { status: 400 })
  if (!Number.isFinite(parsedAmt) || parsedAmt <= 0) return NextResponse.json({ error: 'amount must be greater than 0' }, { status: 400 })

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      month, year: parseInt(year),
      date, type, cat, note,
      amt: parsedAmt,
      debt: !!debt,
      settled: !!settled,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data })
}

// PATCH /api/transaksi — edit transaksi
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  if (updates.amt !== undefined) {
    const parsedAmt = Number.parseInt(String(updates.amt || '0'), 10)
    if (!Number.isFinite(parsedAmt) || parsedAmt <= 0) return NextResponse.json({ error: 'amount must be greater than 0' }, { status: 400 })
    updates.amt = parsedAmt
  }
  if (updates.year !== undefined) updates.year = parseInt(updates.year)

  const { data, error } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id) // pastikan hanya bisa edit milik sendiri
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data })
}

// DELETE /api/transaksi?id=xxx
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
