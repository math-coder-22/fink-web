import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { MONITORING_COOKIE } from '@/lib/auth/effective-user'

export async function POST() {
  const cookieStore = await cookies()
  cookieStore.delete(MONITORING_COOKIE)
  return NextResponse.json({ monitoring: false })
}
