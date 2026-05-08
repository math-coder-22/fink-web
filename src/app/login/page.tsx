'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

type AuthMode = 'login' | 'register' | 'forgot' | 'reset'

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1.5px solid #e3e7ee',
  borderRadius: '7px',
  fontSize: '14px',
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 600,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: '6px',
}

export default function LoginPage() {
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [mode, setMode]               = useState<AuthMode>('login')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [message, setMessage]         = useState('')

  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const type = searchParams.get('type')
    const requestedMode = searchParams.get('mode')
    if (type === 'recovery') setMode('reset')
    else if (requestedMode === 'register') setMode('register')
    else if (requestedMode === 'forgot') setMode('forgot')

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('reset')
        setError('')
        setMessage('Silakan buat password baru untuk akun Anda.')
      }
    })

    return () => subscription.unsubscribe()
  }, [searchParams, supabase])

  function clearFeedback() {
    setError('')
    setMessage('')
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode)
    setPassword('')
    setConfirmPassword('')
    setNewPassword('')
    clearFeedback()

    if (typeof window !== 'undefined') {
      const url =
        nextMode === 'register' ? '/login?mode=register' :
        nextMode === 'forgot' ? '/login?mode=forgot' :
        nextMode === 'reset' ? '/login?type=recovery' :
        '/login'
      window.history.replaceState(null, '', url)
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    clearFeedback()

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/bulanan')
    router.refresh()
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    clearFeedback()

    if (password.length < 6) {
      setError('Password minimal 6 karakter.')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak sama.')
      setLoading(false)
      return
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/login`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setLoading(false)

    if (data.session) {
      router.push('/bulanan')
      router.refresh()
      return
    }

    setMessage('Registrasi berhasil. Silakan cek email untuk verifikasi akun, lalu login kembali.')
    setMode('login')
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    clearFeedback()

    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/login?type=recovery`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setLoading(false)
    setMessage('Link reset password sudah dikirim. Silakan cek inbox atau folder spam email Anda.')
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    clearFeedback()

    if (newPassword.length < 6) {
      setError('Password baru minimal 6 karakter.')
      setLoading(false)
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password baru tidak sama.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setLoading(false)
    setMessage('Password berhasil diperbarui. Silakan login menggunakan password baru.')
    await supabase.auth.signOut()
    switchMode('login')
  }

  const title = mode === 'login'
    ? 'Masuk'
    : mode === 'register'
      ? 'Daftar Akun Baru'
      : mode === 'forgot'
        ? 'Reset Password'
        : 'Buat Password Baru'

  const subtitle = mode === 'login'
    ? 'Kelola keuangan keluarga dengan FiNK.'
    : mode === 'register'
      ? 'Buat akun FiNK untuk mulai mencatat keuangan.'
      : mode === 'forgot'
        ? 'Masukkan email akun Anda untuk menerima link reset.'
        : 'Masukkan password baru untuk akun FiNK Anda.'

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'linear-gradient(145deg, #0f2a1e 0%, #1a5c42 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'white', borderRadius: '16px', padding: '40px',
        width: '100%', maxWidth: '400px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)'
      }}>
        <div style={{ marginBottom: '26px' }}>
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

        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#111827' }}>{title}</h1>
          <p style={{ margin: '6px 0 0', fontSize: '13px', lineHeight: 1.5, color: '#6b7280' }}>{subtitle}</p>
        </div>

        {mode === 'login' && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="your@email.com" style={inputStyle} onFocus={e => e.target.style.borderColor = '#1a5c42'} onBlur={e => e.target.style.borderColor = '#e3e7ee'} />
            </div>

            <div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'10px', marginBottom:'6px' }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Password</label>
                <button type="button" onClick={() => switchMode('forgot')} style={{ border:'none', background:'transparent', color:'#1a5c42', fontSize:'12px', fontWeight:600, cursor:'pointer', padding:0 }}>
                  Lupa password?
                </button>
              </div>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" style={inputStyle} onFocus={e => e.target.style.borderColor = '#1a5c42'} onBlur={e => e.target.style.borderColor = '#e3e7ee'} />
            </div>

            {error && <Feedback type="error" text={error} />}
            {message && <Feedback type="success" text={message} />}

            <button type="submit" disabled={loading} style={primaryButtonStyle(loading)}>
              {loading ? 'Signing in...' : 'Masuk'}
            </button>

            <div style={{
              marginTop: '8px',
              paddingTop: '16px',
              borderTop: '1px solid #eef2f7',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              textAlign: 'center',
            }}>
              <button type="button" onClick={() => switchMode('register')} style={{
                ...linkButtonStyle,
                fontSize: '14px',
              }}>
                Belum punya akun? Daftar Akun Baru
              </button>
              <button type="button" onClick={() => switchMode('forgot')} style={{
                ...linkButtonStyle,
                color: '#6b7280',
                fontSize: '13px',
              }}>
                Lupa Password?
              </button>
            </div>
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="your@email.com" style={inputStyle} onFocus={e => e.target.style.borderColor = '#1a5c42'} onBlur={e => e.target.style.borderColor = '#e3e7ee'} />
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Minimal 6 karakter" style={inputStyle} onFocus={e => e.target.style.borderColor = '#1a5c42'} onBlur={e => e.target.style.borderColor = '#e3e7ee'} />
            </div>
            <div>
              <label style={labelStyle}>Konfirmasi Password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="Ulangi password" style={inputStyle} onFocus={e => e.target.style.borderColor = '#1a5c42'} onBlur={e => e.target.style.borderColor = '#e3e7ee'} />
            </div>

            {error && <Feedback type="error" text={error} />}
            {message && <Feedback type="success" text={message} />}

            <button type="submit" disabled={loading} style={primaryButtonStyle(loading)}>
              {loading ? 'Mendaftarkan...' : 'Daftar'}
            </button>

            <div style={{ textAlign:'center', fontSize:'13px', color:'#6b7280', marginTop:'4px' }}>
              Sudah punya akun?{' '}
              <button type="button" onClick={() => switchMode('login')} style={linkButtonStyle}>Login</button>
            </div>
          </form>
        )}

        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="your@email.com" style={inputStyle} onFocus={e => e.target.style.borderColor = '#1a5c42'} onBlur={e => e.target.style.borderColor = '#e3e7ee'} />
            </div>

            {error && <Feedback type="error" text={error} />}
            {message && <Feedback type="success" text={message} />}

            <button type="submit" disabled={loading} style={primaryButtonStyle(loading)}>
              {loading ? 'Mengirim...' : 'Kirim Link Reset'}
            </button>

            <div style={{ textAlign:'center', fontSize:'13px', color:'#6b7280', marginTop:'4px' }}>
              Ingat password?{' '}
              <button type="button" onClick={() => switchMode('login')} style={linkButtonStyle}>Kembali ke login</button>
            </div>
          </form>
        )}

        {mode === 'reset' && (
          <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Password Baru</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required placeholder="Minimal 6 karakter" style={inputStyle} onFocus={e => e.target.style.borderColor = '#1a5c42'} onBlur={e => e.target.style.borderColor = '#e3e7ee'} />
            </div>
            <div>
              <label style={labelStyle}>Konfirmasi Password Baru</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="Ulangi password baru" style={inputStyle} onFocus={e => e.target.style.borderColor = '#1a5c42'} onBlur={e => e.target.style.borderColor = '#e3e7ee'} />
            </div>

            {error && <Feedback type="error" text={error} />}
            {message && <Feedback type="success" text={message} />}

            <button type="submit" disabled={loading} style={primaryButtonStyle(loading)}>
              {loading ? 'Menyimpan...' : 'Simpan Password Baru'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

function primaryButtonStyle(loading: boolean): React.CSSProperties {
  return {
    width: '100%', padding: '11px', borderRadius: '7px', border: 'none',
    background: loading ? '#9ca3af' : '#1a5c42', color: 'white',
    fontSize: '14px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
    marginTop: '4px'
  }
}

const linkButtonStyle: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: '#1a5c42',
  fontSize: '13px',
  fontWeight: 700,
  cursor: 'pointer',
  padding: 0,
}

function Feedback({ type, text }: { type: 'error' | 'success'; text: string }) {
  const isError = type === 'error'
  return (
    <div style={{
      background: isError ? '#fee2e2' : '#ecfdf5',
      border: `1px solid ${isError ? '#fca5a5' : '#bbf7d0'}`,
      borderRadius: '7px',
      padding: '10px 12px',
      fontSize: '13px',
      color: isError ? '#991b1b' : '#166534',
      lineHeight: 1.45,
    }}>
      {text}
    </div>
  )
}
