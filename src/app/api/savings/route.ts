import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SavingsGoal } from '@/types/savings'

function err(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status })
}

async function getUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { supabase, user: null }
  return { supabase, user }
}

export async function GET() {
  const { supabase, user } = await getUser()
  if (!user) return err('Unauthorized', 401)

  const { data, error } = await supabase
    .from('savings_goals')
    .select('id, goal, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) return err(error.message, 500)

  const goals = (data || []).map((row: any) => ({
    ...(row.goal || {}),
    id: row.id,
    history: row.goal?.history || [],
  }))

  return NextResponse.json({ goals })
}

export async function POST(request: NextRequest) {
  const { supabase, user } = await getUser()
  if (!user) return err('Unauthorized', 401)

  const body = await request.json()
  const goal = body.goal as SavingsGoal | undefined
  if (!goal?.id) return err('goal with id is required', 400)

  const cleanGoal = {
    ...goal,
    history: goal.history || [],
    updatedAt: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('savings_goals')
    .upsert(
      {
        id: cleanGoal.id,
        user_id: user.id,
        goal: cleanGoal,
        updated_at: cleanGoal.updatedAt,
      },
      { onConflict: 'id,user_id' }
    )
    .select('id, goal')
    .single()

  if (error) return err(error.message, 500)
  return NextResponse.json({ goal: { ...(data.goal || {}), id: data.id } })
}

export async function PUT(request: NextRequest) {
  const { supabase, user } = await getUser()
  if (!user) return err('Unauthorized', 401)

  const body = await request.json()
  const goals = (body.goals || []) as SavingsGoal[]
  if (!Array.isArray(goals)) return err('goals must be array', 400)

  const now = new Date().toISOString()

  const rows = goals
    .filter(g => g.id)
    .map(g => ({
      id: g.id,
      user_id: user.id,
      goal: {
        ...g,
        history: g.history || [],
        updatedAt: g.updatedAt || now,
      },
      updated_at: g.updatedAt || now,
    }))

  if (rows.length === 0) return NextResponse.json({ goals: [] })

  const { error } = await supabase
    .from('savings_goals')
    .upsert(rows, { onConflict: 'id,user_id' })

  if (error) return err(error.message, 500)

  return NextResponse.json({ goals })
}

export async function DELETE(request: NextRequest) {
  const { supabase, user } = await getUser()
  if (!user) return err('Unauthorized', 401)

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return err('id is required', 400)

  const { error } = await supabase
    .from('savings_goals')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return err(error.message, 500)
  return NextResponse.json({ ok: true })
}
