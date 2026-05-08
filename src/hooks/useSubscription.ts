'use client'

import { useCallback, useEffect, useState } from 'react'

type Plan = 'free' | 'premium'
type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled'
type Role = 'user' | 'admin' | 'super_admin'

type Profile = {
  id: string
  email: string
  full_name: string | null
  role: Role
  suspended: boolean
  deleted_at: string | null
}

type Subscription = {
  id: string
  user_id: string
  plan: Plan
  status: SubscriptionStatus
  current_period_end: string | null
  is_lifetime: boolean
}

function expired(subscription: Subscription | null) {
  if (!subscription || subscription.is_lifetime || !subscription.current_period_end) return false
  return new Date(subscription.current_period_end).getTime() < Date.now()
}

export function useSubscription() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [effectivePlan, setEffectivePlan] = useState<Plan>('free')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/subscription', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || json.error || 'Failed to load subscription')
      setProfile(json.profile || null)
      setSubscription(json.subscription || null)
      setEffectivePlan(json.effectivePlan || 'free')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const isExpired = expired(subscription)
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'
  const isSuperAdmin = profile?.role === 'super_admin'
  const isPremium = effectivePlan === 'premium'

  return {
    profile,
    subscription,
    loading,
    error,
    refresh: load,
    isAdmin,
    isSuperAdmin,
    isPremium,
    isExpired,
    plan: effectivePlan,
  }
}
