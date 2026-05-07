'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/bulanan')
      router.refresh()
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(145deg, #0f2a1e 0%, #1a5c42 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'white', borderRadius: '16px', padding: '40px',
        width: '100%', maxWidth: '380px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)'
      }}>
        {/* Logo */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{
            fontFamily: 'serif', fontSize: '28px', fontWeight: 700,
            color: '#111827', letterSpacing: '-0.5px'
          }}>
            Fi<span style={{ color: '#1a5c42' }}>NK</span>
          </div>
          <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
            Smart Family Finance
          </div>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e3e7ee', borderRadius: '7px', fontSize: '14px', outline: 'none' }}
              onFocus={e => e.target.style.borderColor = '#1a5c42'}
              onBlur={e => e.target.style.borderColor = '#e3e7ee'}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e3e7ee', borderRadius: '7px', fontSize: '14px', outline: 'none' }}
              onFocus={e => e.target.style.borderColor = '#1a5c42'}
              onBlur={e => e.target.style.borderColor = '#e3e7ee'}
            />
          </div>

          {error && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '7px', padding: '10px 12px', fontSize: '13px', color: '#991b1b' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '11px', borderRadius: '7px', border: 'none',
              background: loading ? '#9ca3af' : '#1a5c42', color: 'white',
              fontSize: '14px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '4px'
            }}
          >
            {loading ? 'Signing in...' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  )
}
