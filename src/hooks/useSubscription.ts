'use client'

import { useCallback, useEffect, useState } from 'react'

type Plan = 'free' | 'premium'
type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled'

type Profile = {
  id: string
  email: string
  full_name: string | null
  role: 'user' | 'admin'
}

type Subscription = {
  id: string
  user_id: string
  plan: Plan
  status: SubscriptionStatus
  current_period_end: string | null
}

export function useSubscription() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return {
    profile,
    subscription,
    loading,
    error,
    refresh: load,
    isAdmin: profile?.role === 'admin',
    isPremium: subscription?.plan === 'premium' && ['active', 'trialing'].includes(subscription.status),
    plan: subscription?.plan || 'free',
  }
}
