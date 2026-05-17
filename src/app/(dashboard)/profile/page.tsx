'use client'

import {
  AppButton,
  PageHeader,
  PremiumBanner,
  SectionCard,
  StatusBadge,
} from '@/components/ui/design'
import { useSubscription } from '@/hooks/useSubscription'
import type { CSSProperties, ReactNode } from 'react'

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
        padding: 16,
        boxShadow: '0 1px 2px rgba(15,23,42,.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 900,
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
          marginTop: 10,
          minWidth: 0,
          color: accent,
          fontSize: 18,
          fontWeight: 850,
          lineHeight: 1.25,
          letterSpacing: '-.2px',
        }}
      >
        {value}
      </div>

      {note && (
        <div style={{ marginTop: 7, color: '#6b7280', fontSize: 12.5, lineHeight: 1.45 }}>
          {note}
        </div>
      )}
    </div>
  )
}

const ellipsisStyle: CSSProperties = {
  display: 'block',
  maxWidth: '100%',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  color: '#111827',
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
        bodyStyle={{ padding: 16 }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
            alignItems: 'stretch',
          }}
        >
          <ProfileInfoCard
            label="Profile"
            value={<span style={ellipsisStyle} title={profile?.email || ''}>{profile?.email || 'Memuat...'}</span>}
            note="Email akun FiNK"
            accent="#111827"
          />

          <ProfileInfoCard
            label="Subscription"
            value={
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
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
        <div style={{ fontSize: 12.5, color: '#6b7280', lineHeight: 1.65 }}>
          Status paket akan menentukan fitur yang terbuka di Dashboard, Advisor, Journal, dan Goals.
        </div>
      </SectionCard>
    </div>
  )
}
