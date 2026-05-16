'use client'

import {
  AppButton,
  MetricCard,
  PageHeader,
  PremiumBanner,
  SectionCard,
  StatusBadge,
} from '@/components/ui/design'
import { useSubscription } from '@/hooks/useSubscription'

const fmtDate = (s?: string | null) => {
  if (!s) return '-'
  return new Date(s).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
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
  const subscriptionText = loading
    ? 'Memuat subscription...'
    : `${plan.toUpperCase()} • ${subscription?.status || 'active'}`

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
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: 12,
          }}
        >
          <MetricCard
            label="Profile"
            value={profile?.email || 'Memuat...'}
            note="Email akun FiNK"
            tone="default"
            style={{ overflowWrap: 'anywhere' }}
          />

          <MetricCard
            label="Subscription"
            value={subscriptionText}
            note={isPremium ? 'Paket aktif' : 'Paket dasar'}
            tone={isPremium ? 'info' : 'premium'}
          />

          <MetricCard
            label="Masa Aktif"
            value={periodText}
            note={isExpired ? 'Subscription expired' : 'Status periode saat ini'}
            tone={isExpired ? 'danger' : 'warning'}
          />

          <MetricCard
            label="Role"
            value={roleText}
            note="Hak akses akun"
            tone={isAdmin || isSuperAdmin ? 'info' : 'default'}
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
