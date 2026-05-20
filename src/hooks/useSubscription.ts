'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

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


type SubscriptionPayload = {
  profile: Profile | null
  subscription: Subscription | null
  effectivePlan: Plan
}

const SUBSCRIPTION_CACHE_TTL_MS = 30_000
let subscriptionCache: { value: SubscriptionPayload; expiresAt: number } | null = null
let subscriptionInFlight: Promise<SubscriptionPayload> | null = null

async function fetchSubscriptionPayload(force = false): Promise<SubscriptionPayload> {
  const now = Date.now()
  if (!force && subscriptionCache && subscriptionCache.expiresAt > now) return subscriptionCache.value
  if (!force && subscriptionInFlight) return subscriptionInFlight

  subscriptionInFlight = fetch('/api/subscription', { cache: 'no-store' })
    .then(async res => {
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || json.error || 'Failed to load subscription')
      const value: SubscriptionPayload = {
        profile: json.profile || null,
        subscription: json.subscription || null,
        effectivePlan: json.effectivePlan || 'free',
      }
      subscriptionCache = { value, expiresAt: Date.now() + SUBSCRIPTION_CACHE_TTL_MS }
      return value
    })
    .finally(() => { subscriptionInFlight = null })

  return subscriptionInFlight
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

  const mountedRef = useRef(true)

  const load = useCallback(async (force = false) => {
    setLoading(true)
    setError('')
    try {
      const json = await fetchSubscriptionPayload(force)
      if (!mountedRef.current) return
      setProfile(json.profile || null)
      setSubscription(json.subscription || null)
      setEffectivePlan(json.effectivePlan || 'free')
    } catch (e) {
      if (mountedRef.current) setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    load()
    return () => { mountedRef.current = false }
  }, [load])

  const isExpired = expired(subscription)
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'
  const isSuperAdmin = profile?.role === 'super_admin'
  const isPremium = effectivePlan === 'premium'

  return {
    profile,
    subscription,
    loading,
    error,
    refresh: () => load(true),
    isAdmin,
    isSuperAdmin,
    isPremium,
    isExpired,
    plan: effectivePlan,
  }
}
