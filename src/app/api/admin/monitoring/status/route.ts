import { NextResponse } from 'next/server'
import { getEffectiveUser } from '@/lib/auth/effective-user'

export async function GET() {
  const ctx = await getEffectiveUser()
  if (ctx.ok === false) return ctx.response

  return NextResponse.json({
    monitoring: ctx.isMonitoring,
    actualUser: ctx.actualProfile ? {
      id: ctx.actualProfile.id,
      email: ctx.actualProfile.email,
      role: ctx.actualProfile.role,
    } : { id: ctx.actualUserId },
    targetUser: ctx.effectiveProfile ? {
      id: ctx.effectiveProfile.id,
      email: ctx.effectiveProfile.email,
      full_name: ctx.effectiveProfile.full_name,
      role: ctx.effectiveProfile.role,
    } : null,
  })
}
