'use client'

import {
  AppButton,
  PageHeader,
  PremiumBanner,
  SectionCard,
  StatusBadge,
} from '@/components/ui/design'
import { useSubscription } from '@/hooks/useSubscription'
import { useMemo, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

const fmtDate = (s?: string | null) => {
  if (!s) return '-'
  return new Date(s).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function ProfileInfoCard({
  label,
  value,
  note,
  badge,
  accent = '#1a5c42',
}: {
  label: string
  value: ReactNode
  note?: string
  badge?: ReactNode
  accent?: string
}) {
  return (
    <div
      style={{
        minWidth: 0,
        border: '1px solid #e3e7ee',
        borderRadius: 18,
        background: '#ffffff',
        padding: 14,
        boxShadow: '0 1px 2px rgba(15,23,42,.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 800,
            color: '#9ca3af',
            textTransform: 'uppercase',
            letterSpacing: '.8px',
            lineHeight: 1.2,
          }}
        >
          {label}
        </div>
        {badge}
      </div>

      <div
        style={{
          marginTop: 8,
          minWidth: 0,
          color: accent,
          fontSize: 15.5,
          fontWeight: 750,
          lineHeight: 1.25,
          letterSpacing: '-.2px',
        }}
      >
        {value}
      </div>

      {note && (
        <div style={{ marginTop: 6, color: '#6b7280', fontSize: 12, lineHeight: 1.45 }}>
          {note}
        </div>
      )}
    </div>
  )
}

const emailValueStyle: CSSProperties = {
  display: 'block',
  maxWidth: '100%',
  overflowWrap: 'anywhere',
  wordBreak: 'normal',
  color: '#111827',
  fontSize: 14,
  lineHeight: 1.35,
}

const securityInputStyle: CSSProperties = {
  width: '100%',
  border: '1px solid #dfe5ee',
  borderRadius: 12,
  padding: '10px 12px',
  fontSize: 13,
  color: '#111827',
  outline: 'none',
  background: '#ffffff',
}

const securityLabelStyle: CSSProperties = {
  display: 'block',
  marginBottom: 6,
  fontSize: 10.5,
  fontWeight: 800,
  color: '#8b95a7',
  textTransform: 'uppercase',
  letterSpacing: '.7px',
}

function SecurityNotice({ tone, children }: { tone: 'success' | 'error'; children: ReactNode }) {
  return (
    <div
      style={{
        borderRadius: 12,
        border: `1px solid ${tone === 'success' ? '#bbf7d0' : '#fecaca'}`,
        background: tone === 'success' ? '#f0fdf4' : '#fef2f2',
        color: tone === 'success' ? '#166534' : '#991b1b',
        padding: '10px 12px',
        fontSize: 12,
        lineHeight: 1.45,
      }}
    >
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const {
    profile,
    subscription,
    loading,
    error,
    plan,
    isPremium,
    isAdmin,
    isSuperAdmin,
    isExpired,
    refresh,
  } = useSubscription()

  const supabase = useMemo(() => createClient(), [])
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')

  async function handleChangePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPasswordError('')
    setPasswordMessage('')

    if (newPassword.length < 8) {
      setPasswordError('Password baru minimal 8 karakter.')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Konfirmasi password tidak sama.')
      return
    }

    setPasswordLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordLoading(false)

    if (error) {
      setPasswordError(error.message)
      return
    }

    setNewPassword('')
    setConfirmPassword('')
    setPasswordMessage('Password berhasil diperbarui.')
  }

  const periodText = subscription?.is_lifetime
    ? 'Seumur hidup'
    : subscription?.current_period_end
      ? fmtDate(subscription.current_period_end)
      : plan === 'free'
        ? 'Tidak ada masa aktif premium'
        : '-'

  const roleText = isSuperAdmin ? 'Super Admin' : isAdmin ? 'Admin' : 'User'
  const subscriptionStatus = subscription?.status || 'active'
  const subscriptionText = loading
    ? 'Memuat...'
    : plan.charAt(0).toUpperCase() + plan.slice(1).toLowerCase()

  return (
    <div>
      <PageHeader
        title="Profile"
        subtitle="Manage your account, subscription, and FiNK workspace"
      />

      <SectionCard
        title="Account Overview"
        subtitle="Ringkasan akun dan status paket FiNK."
        right={
          <StatusBadge tone={isPremium ? 'info' : 'premium'}>
            {isPremium ? 'Premium' : 'Free'}
          </StatusBadge>
        }
        style={{ marginBottom: 14 }}
        bodyStyle={{ padding: 14 }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: 10,
            alignItems: 'stretch',
          }}
        >
          <ProfileInfoCard
            label="Profile"
            value={<span style={emailValueStyle} title={profile?.email || ''}>{profile?.email || 'Memuat...'}</span>}
            note="Email akun FiNK"
            accent="#111827"
          />

          <ProfileInfoCard
            label="Subscription"
            value={
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                <span>{subscriptionText}</span>
                {!loading && (
                  <StatusBadge tone={isPremium ? 'info' : 'default'} size="xs">
                    {subscriptionStatus}
                  </StatusBadge>
                )}
              </span>
            }
            note={isPremium ? 'Paket aktif' : 'Paket dasar'}
            accent={isPremium ? '#1d4ed8' : '#1a5c42'}
          />

          <ProfileInfoCard
            label="Masa Aktif"
            value={<span style={{ color: isExpired ? '#991b1b' : '#92400e' }}>{periodText}</span>}
            note={isExpired ? 'Subscription expired' : 'Status periode saat ini'}
            accent={isExpired ? '#991b1b' : '#92400e'}
          />

          <ProfileInfoCard
            label="Role"
            value={roleText}
            note="Hak akses akun"
            accent={isAdmin || isSuperAdmin ? '#1d4ed8' : '#111827'}
          />
        </div>
      </SectionCard>

      {!isPremium && !loading && (
        <PremiumBanner
          title="Buka Financial Advisor penuh"
          subtitle="Upgrade untuk membuka unlimited budget, unlimited income, unlimited goals, forecasting, analytics, dan rekomendasi premium."
          actionLabel="Upgrade Premium"
          href="/upgrade"
          style={{ marginBottom: 14 }}
          right={
            <div
              style={{
                padding: '11px 14px',
                borderRadius: 14,
                background: 'rgba(255,255,255,.08)',
                border: '1px solid rgba(255,255,255,.08)',
                color: 'rgba(255,255,255,.76)',
                fontSize: 11.5,
                fontWeight: 800,
                whiteSpace: 'nowrap',
              }}
            >
              3 bulan Rp45.000 • 1 tahun Rp149.000
            </div>
          }
        />
      )}

      {profile?.suspended && (
        <SectionCard
          style={{
            marginBottom: 14,
            borderColor: '#fecaca',
            background: '#fef2f2',
          }}
          bodyStyle={{ padding: 14 }}
        >
          <div style={{ fontSize: 12.5, color: '#991b1b', lineHeight: 1.5 }}>
            Akun ini sedang suspended. Hubungi admin FiNK.
          </div>
        </SectionCard>
      )}

      {error && (
        <SectionCard
          style={{
            marginBottom: 14,
            borderColor: '#fecaca',
            background: '#fef2f2',
          }}
          bodyStyle={{ padding: 14 }}
        >
          <div style={{ fontSize: 12.5, color: '#991b1b', lineHeight: 1.5 }}>
            Gagal membaca status subscription. Silakan refresh atau coba lagi.
          </div>
        </SectionCard>
      )}

      <SectionCard
        title="Security"
        subtitle="Kelola keamanan akun FiNK Anda."
        style={{ marginBottom: 14 }}
        bodyStyle={{ padding: 16 }}
      >
        <form onSubmit={handleChangePassword} style={{ display: 'grid', gap: 12, maxWidth: 620 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 12,
            }}
          >
            <label style={{ minWidth: 0 }}>
              <span style={securityLabelStyle}>New Password</span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value)
                  setPasswordError('')
                  setPasswordMessage('')
                }}
                placeholder="Minimal 8 karakter"
                autoComplete="new-password"
                style={securityInputStyle}
              />
            </label>

            <label style={{ minWidth: 0 }}>
              <span style={securityLabelStyle}>Confirm Password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  setPasswordError('')
                  setPasswordMessage('')
                }}
                placeholder="Ulangi password baru"
                autoComplete="new-password"
                style={securityInputStyle}
              />
            </label>
          </div>

          {passwordError && <SecurityNotice tone="error">{passwordError}</SecurityNotice>}
          {passwordMessage && <SecurityNotice tone="success">{passwordMessage}</SecurityNotice>}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="submit"
              disabled={passwordLoading}
              style={{
                border: 0,
                borderRadius: 12,
                padding: '10px 14px',
                background: passwordLoading ? '#9ca3af' : '#1a5c42',
                color: '#ffffff',
                fontSize: 12.5,
                fontWeight: 800,
                cursor: passwordLoading ? 'not-allowed' : 'pointer',
                boxShadow: passwordLoading ? 'none' : '0 8px 18px rgba(26,92,66,.16)',
              }}
            >
              {passwordLoading ? 'Updating...' : 'Update Password'}
            </button>
            <span style={{ color: '#6b7280', fontSize: 12, lineHeight: 1.5 }}>
              Password tidak disimpan di database FiNK dan diproses melalui Supabase Auth.
            </span>
          </div>
        </form>
      </SectionCard>

      <SectionCard
        title="Subscription Status"
        subtitle="Gunakan tombol ini jika status paket belum berubah setelah pembayaran."
        style={{ marginBottom: 14 }}
        bodyStyle={{ padding: 16 }}
        right={
          <AppButton onClick={refresh} variant="secondary">
            Refresh Subscription
          </AppButton>
        }
      >
        <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>
          Status paket akan menentukan fitur yang terbuka di Dashboard, Advisor, Journal, dan Goals.
        </div>
      </SectionCard>
    </div>
  )
}
