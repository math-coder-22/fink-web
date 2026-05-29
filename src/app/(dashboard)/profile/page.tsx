'use client'

import {
  AppButton,
  PageHeader,
  PremiumBanner,
  SectionCard,
  StatusBadge,
} from '@/components/ui/design'
import { useSubscription } from '@/hooks/useSubscription'
import { memo, useEffect, useMemo, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

const fmtDate = (s?: string | null) => {
  if (!s) return '-'
  return new Date(s).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

type ProfileType = 'personal' | 'family'
type FinancialFocus = 'emergency_fund' | 'debt_free' | 'saving' | 'investing' | 'retirement'

type FinancialProfileState = {
  displayName: string
  profileType: ProfileType
  familyMembers: string
  dependents: string
  financialFocus: FinancialFocus
}

const DEFAULT_FINANCIAL_PROFILE: FinancialProfileState = {
  displayName: '',
  profileType: 'personal',
  familyMembers: '1',
  dependents: '0',
  financialFocus: 'emergency_fund',
}

function normalizeFinancialProfile(source: any, fallbackName = ''): FinancialProfileState {
  const profileType = source?.profileType || source?.profile_type
  const financialFocus = source?.financialFocus || source?.financial_focus

  return {
    displayName: source?.displayName ?? source?.display_name ?? fallbackName ?? '',
    profileType: profileType === 'family' ? 'family' : 'personal',
    familyMembers: String(Math.max(1, Number(source?.familyMembers ?? source?.family_members ?? 1) || 1)),
    dependents: String(Math.max(0, Number(source?.dependents ?? 0) || 0)),
    financialFocus: ['emergency_fund', 'debt_free', 'saving', 'investing', 'retirement'].includes(financialFocus)
      ? financialFocus
      : 'emergency_fund',
  }
}

function getFinancialProfileCacheKey(userId?: string | null) {
  return userId ? `fink-financial-profile-${userId}` : ''
}

const focusLabels: Record<FinancialFocus, string> = {
  emergency_fund: 'Dana Darurat',
  debt_free: 'Bebas Utang',
  saving: 'Menabung',
  investing: 'Investasi',
  retirement: 'Pensiun',
}

const fieldStyle: CSSProperties = {
  width: '100%',
  border: '1px solid #dfe5ee',
  borderRadius: 12,
  padding: '10px 12px',
  fontSize: 13,
  color: '#111827',
  outline: 'none',
  background: '#ffffff',
}

const labelStyle: CSSProperties = {
  display: 'block',
  marginBottom: 6,
  fontSize: 10.5,
  fontWeight: 800,
  color: '#8b95a7',
  textTransform: 'uppercase',
  letterSpacing: '.7px',
}

function getInitials(nameOrEmail?: string | null) {
  const source = (nameOrEmail || 'FiNK User').trim()
  const namePart = source.includes('@') ? source.split('@')[0] : source
  const parts = namePart.split(/[\s._-]+/).filter(Boolean)
  return (parts[0]?.[0] || 'F').toUpperCase() + (parts[1]?.[0] || '').toUpperCase()
}

const Notice = memo(function Notice({ tone, children }: { tone: 'success' | 'error' | 'info'; children: ReactNode }) {
  const palette = {
    success: { border: '#bbf7d0', bg: '#f0fdf4', text: '#166534' },
    error: { border: '#fecaca', bg: '#fef2f2', text: '#991b1b' },
    info: { border: '#dbeafe', bg: '#eff6ff', text: '#1d4ed8' },
  }[tone]

  return (
    <div
      style={{
        borderRadius: 12,
        border: `1px solid ${palette.border}`,
        background: palette.bg,
        color: palette.text,
        padding: '10px 12px',
        fontSize: 12,
        lineHeight: 1.45,
      }}
    >
      {children}
    </div>
  )
})

const CompactInfoCard = memo(function CompactInfoCard({
  label,
  value,
  note,
  icon,
  accent = '#1a5c42',
}: {
  label: string
  value: ReactNode
  note?: string
  icon?: ReactNode
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 12,
            display: 'grid',
            placeItems: 'center',
            background: '#f0f8f4',
            color: '#1a5c42',
            flex: '0 0 auto',
          }}
        >
          {icon || '•'}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
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
          <div
            style={{
              marginTop: 5,
              minWidth: 0,
              color: accent,
              fontSize: 15,
              fontWeight: 750,
              lineHeight: 1.25,
              letterSpacing: '-.2px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={typeof value === 'string' ? value : undefined}
          >
            {value}
          </div>
        </div>
      </div>
      {note && <div style={{ marginTop: 8, color: '#6b7280', fontSize: 12, lineHeight: 1.45 }}>{note}</div>}
    </div>
  )
})

const SettingRow = memo(function SettingRow({
  title,
  description,
  right,
}: {
  title: string
  description?: string
  right?: ReactNode
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 14,
        padding: '12px 0',
        borderBottom: '1px solid #edf0f5',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 750, color: '#111827', lineHeight: 1.25 }}>{title}</div>
        {description && <div style={{ marginTop: 4, fontSize: 12, color: '#6b7280', lineHeight: 1.45 }}>{description}</div>}
      </div>
      <div style={{ flex: '0 0 auto' }}>{right}</div>
    </div>
  )
})

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
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [financialMessage, setFinancialMessage] = useState('')
  const [financialError, setFinancialError] = useState('')
  const [financialMenabung, setFinancialMenabung] = useState(false)
  const [financialProfile, setFinancialProfile] = useState<FinancialProfileState>(DEFAULT_FINANCIAL_PROFILE)

  useEffect(() => {
    if (!profile?.id) return
    const fallbackName = profile.full_name || profile.email?.split('@')[0] || ''
    const key = getFinancialProfileCacheKey(profile.id)
    const saved = window.localStorage.getItem(key)

    if (saved) {
      try {
        setFinancialProfile(normalizeFinancialProfile(JSON.parse(saved), fallbackName))
      } catch {
        window.localStorage.removeItem(key)
      }
    }

    const serverProfile = normalizeFinancialProfile(profile, fallbackName)
    setFinancialProfile((prev) => ({ ...prev, ...serverProfile }))
    window.localStorage.setItem(key, JSON.stringify(serverProfile))
  }, [profile])

  async function saveFinancialProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!profile?.id || financialMenabung) return

    const normalized = normalizeFinancialProfile(financialProfile, profile.full_name || profile.email?.split('@')[0] || '')
    const key = getFinancialProfileCacheKey(profile.id)

    setFinancialError('')
    setFinancialMessage('Profile tersimpan di tampilan. Sinkronisasi ke server berjalan...')
    setFinancialProfile(normalized)
    window.localStorage.setItem(key, JSON.stringify(normalized))

    setFinancialMenabung(true)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        display_name: normalized.displayName.trim() || null,
        profile_type: normalized.profileType,
        family_members: Math.max(1, Number(normalized.familyMembers) || 1),
        dependents: Math.max(0, Number(normalized.dependents) || 0),
        financial_focus: normalized.financialFocus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id)

    setFinancialMenabung(false)

    if (updateError) {
      setFinancialError(updateError.message)
      setFinancialMessage('')
      return
    }

    setFinancialMessage('Financial profile berhasil disimpan.')
    refresh()
    window.setTimeout(() => setFinancialMessage(''), 3500)
  }

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
    window.setTimeout(() => {
      setShowPasswordModal(false)
      setPasswordMessage('')
    }, 900)
  }

  function closePasswordModal() {
    if (passwordLoading) return
    setShowPasswordModal(false)
    setNewPassword('')
    setConfirmPassword('')
    setPasswordError('')
    setPasswordMessage('')
  }

  const periodText = useMemo(() => (
    subscription?.is_lifetime
      ? 'Seumur hidup'
      : subscription?.current_period_end
        ? fmtDate(subscription.current_period_end)
        : plan === 'free'
          ? 'Tidak ada masa aktif premium'
          : '-'
  ), [plan, subscription?.current_period_end, subscription?.is_lifetime])

  const roleText = useMemo(() => (isSuperAdmin ? 'Super Admin' : isAdmin ? 'Admin' : 'User'), [isAdmin, isSuperAdmin])
  const subscriptionStatus = subscription?.status || 'active'
  const subscriptionText = useMemo(() => (
    loading ? 'Memuat...' : plan.charAt(0).toUpperCase() + plan.slice(1).toLowerCase()
  ), [loading, plan])
  const displayName = financialProfile.displayName || profile?.full_name || profile?.email?.split('@')[0] || 'FiNK User'
  const email = profile?.email || 'Memuat...'

  return (
    <div>
      <PageHeader title="Profile" subtitle="Account, security, and financial identity settings" />

      <SectionCard style={{ marginBottom: 14 }} bodyStyle={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 999,
              background: 'linear-gradient(135deg, #1a5c42, #2f8f67)',
              color: '#ffffff',
              display: 'grid',
              placeItems: 'center',
              fontSize: 17,
              fontWeight: 850,
              boxShadow: '0 12px 26px rgba(26,92,66,.18)',
              flex: '0 0 auto',
            }}
          >
            {getInitials(displayName || email)}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, color: '#111827', fontSize: 20, fontWeight: 800, lineHeight: 1.2 }}>
                {displayName}
              </h2>
              <StatusBadge tone={isPremium ? 'info' : 'premium'} size="xs">
                {isPremium ? 'Premium Active' : 'Free Plan'}
              </StatusBadge>
            </div>
            <div
              style={{
                marginTop: 5,
                color: '#6b7280',
                fontSize: 13,
                lineHeight: 1.4,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '100%',
              }}
              title={email}
            >
              {email}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Account"
        subtitle="Ringkasan akun dan akses FiNK."
        style={{ marginBottom: 14 }}
        bodyStyle={{ padding: 14 }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 10,
            alignItems: 'stretch',
          }}
        >
          <CompactInfoCard
            label="Subscription"
            value={subscriptionText}
            note={isPremium ? 'Paket premium aktif' : 'Paket dasar'}
            accent={isPremium ? '#1d4ed8' : '#1a5c42'}
            icon="★"
          />
          <CompactInfoCard
            label="Role"
            value={roleText}
            note="Hak akses akun"
            accent={isAdmin || isSuperAdmin ? '#1d4ed8' : '#111827'}
            icon="◦"
          />
          <CompactInfoCard
            label="Workspace"
            value={financialProfile.profileType === 'family' ? 'Family' : 'Personal'}
            note="Tipe profil finansial"
            icon="⌂"
          />
          <CompactInfoCard
            label="Security"
            value="Password"
            note="Dikelola Supabase Auth"
            icon="✓"
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
        <SectionCard style={{ marginBottom: 14, borderColor: '#fecaca', background: '#fef2f2' }} bodyStyle={{ padding: 14 }}>
          <div style={{ fontSize: 12.5, color: '#991b1b', lineHeight: 1.5 }}>Akun ini sedang suspended. Hubungi admin FiNK.</div>
        </SectionCard>
      )}

      {error && (
        <SectionCard style={{ marginBottom: 14, borderColor: '#fecaca', background: '#fef2f2' }} bodyStyle={{ padding: 14 }}>
          <div style={{ fontSize: 12.5, color: '#991b1b', lineHeight: 1.5 }}>Gagal membaca status subscription. Silakan refresh atau coba lagi.</div>
        </SectionCard>
      )}

      <SectionCard
        title="Financial Profile"
        subtitle="Personalisasi FiNK tanpa data sensitif."
        style={{ marginBottom: 14 }}
        bodyStyle={{ padding: 16 }}
      >
        <form onSubmit={saveFinancialProfile} style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <label style={{ minWidth: 0 }}>
              <span style={labelStyle}>Display Name</span>
              <input
                value={financialProfile.displayName}
                onChange={(e) => setFinancialProfile((prev) => ({ ...prev, displayName: e.target.value }))}
                placeholder="Nama yang tampil di dashboard"
                style={fieldStyle}
              />
            </label>
            <label style={{ minWidth: 0 }}>
              <span style={labelStyle}>Profile Type</span>
              <select
                value={financialProfile.profileType}
                onChange={(e) => setFinancialProfile((prev) => ({ ...prev, profileType: e.target.value as ProfileType }))}
                style={fieldStyle}
              >
                <option value="personal">Personal</option>
                <option value="family">Family</option>
              </select>
            </label>
            <label style={{ minWidth: 0 }}>
              <span style={labelStyle}>Financial Focus</span>
              <select
                value={financialProfile.financialFocus}
                onChange={(e) => setFinancialProfile((prev) => ({ ...prev, financialFocus: e.target.value as FinancialFocus }))}
                style={fieldStyle}
              >
                {Object.entries(focusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
          </div>

          {financialProfile.profileType === 'family' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <label style={{ minWidth: 0 }}>
                <span style={labelStyle}>Number of Family Members</span>
                <input
                  type="number"
                  min="1"
                  value={financialProfile.familyMembers}
                  onChange={(e) => setFinancialProfile((prev) => ({ ...prev, familyMembers: e.target.value }))}
                  style={fieldStyle}
                />
              </label>
              <label style={{ minWidth: 0 }}>
                <span style={labelStyle}>Number of Dependents</span>
                <input
                  type="number"
                  min="0"
                  value={financialProfile.dependents}
                  onChange={(e) => setFinancialProfile((prev) => ({ ...prev, dependents: e.target.value }))}
                  style={fieldStyle}
                />
              </label>
            </div>
          )}

          {financialMessage && <Notice tone="success">{financialMessage}</Notice>}
          {financialError && <Notice tone="error">{financialError}</Notice>}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ color: '#6b7280', fontSize: 12, lineHeight: 1.5 }}>
              Digunakan untuk sapaan dashboard, advisor, dan rekomendasi goals yang lebih personal.
            </div>
            <button
              type="submit"
              disabled={financialMenabung}
              style={{
                border: 0,
                borderRadius: 12,
                padding: '10px 14px',
                background: financialMenabung ? '#9ca3af' : '#1a5c42',
                color: '#ffffff',
                fontSize: 12.5,
                fontWeight: 800,
                cursor: financialMenabung ? 'not-allowed' : 'pointer',
                boxShadow: financialMenabung ? 'none' : '0 8px 18px rgba(26,92,66,.16)',
              }}
            >
              {financialMenabung ? 'Menabung...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Security" subtitle="Kelola keamanan akun FiNK Anda." style={{ marginBottom: 14 }} bodyStyle={{ padding: 16 }}>
        <SettingRow
          title="Password"
          description="Update password akun Anda melalui Supabase Auth."
          right={
            <button
              type="button"
              onClick={() => setShowPasswordModal(true)}
              style={{
                border: '1px solid #dfe5ee',
                borderRadius: 12,
                padding: '9px 12px',
                background: '#ffffff',
                color: '#1a5c42',
                fontSize: 12.5,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Change Password
            </button>
          }
        />
        <SettingRow title="Last updated" description="Belum tersedia" right={<span style={{ color: '#9ca3af', fontSize: 12 }}>—</span>} />
      </SectionCard>

      <SectionCard title="Preferences" subtitle="Preferensi dasar aplikasi." style={{ marginBottom: 14 }} bodyStyle={{ padding: 16 }}>
        <SettingRow title="Currency" description="Mata uang utama aplikasi" right={<span style={{ color: '#111827', fontSize: 12.5, fontWeight: 750 }}>IDR</span>} />
        <SettingRow title="Theme" description="Mengikuti tema FiNK saat ini" right={<span style={{ color: '#9ca3af', fontSize: 12 }}>Default</span>} />
        <SettingRow title="Notification Preference" description="Pengaturan notifikasi akan tersedia berikutnya" right={<span style={{ color: '#9ca3af', fontSize: 12 }}>Soon</span>} />
      </SectionCard>

      <SectionCard
        title="Subscription"
        subtitle="Status paket dan akses fitur FiNK."
        style={{ marginBottom: 14 }}
        bodyStyle={{ padding: 16 }}
        right={<AppButton onClick={refresh} variant="secondary">Refresh</AppButton>}
      >
        <div style={{ display: 'grid', gap: 10 }}>
          <SettingRow title="Current Plan" description="Paket yang sedang digunakan" right={<StatusBadge tone={isPremium ? 'info' : 'default'}>{subscriptionText}</StatusBadge>} />
          <SettingRow title="Status" description="Status subscription internal" right={<span style={{ color: '#111827', fontSize: 12.5, fontWeight: 750 }}>{subscriptionStatus}</span>} />
          <SettingRow title="Expired At" description={isExpired ? 'Subscription expired' : 'Masa aktif paket'} right={<span style={{ color: isExpired ? '#991b1b' : '#111827', fontSize: 12.5, fontWeight: 750 }}>{periodText}</span>} />
        </div>
      </SectionCard>

      {showPasswordModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 80,
            display: 'grid',
            placeItems: 'center',
            padding: 16,
            background: 'rgba(15,23,42,.42)',
            backdropFilter: 'blur(6px)',
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closePasswordModal()
          }}
        >
          <div
            style={{
              width: 'min(440px, 100%)',
              borderRadius: 22,
              background: '#ffffff',
              border: '1px solid #e3e7ee',
              boxShadow: '0 24px 70px rgba(15,23,42,.24)',
              padding: 18,
            }}
          >
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 18, fontWeight: 850, color: '#111827', lineHeight: 1.2 }}>Change Password</div>
              <div style={{ marginTop: 5, fontSize: 12.5, color: '#6b7280', lineHeight: 1.5 }}>
                Password baru minimal 8 karakter. Jangan gunakan password yang mudah ditebak.
              </div>
            </div>

            <form onSubmit={handleChangePassword} style={{ display: 'grid', gap: 12 }}>
              <label style={{ minWidth: 0 }}>
                <span style={labelStyle}>New Password</span>
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
                  style={fieldStyle}
                />
              </label>

              <label style={{ minWidth: 0 }}>
                <span style={labelStyle}>Confirm Password</span>
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
                  style={fieldStyle}
                />
              </label>

              {passwordError && <Notice tone="error">{passwordError}</Notice>}
              {passwordMessage && <Notice tone="success">{passwordMessage}</Notice>}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={closePasswordModal}
                  disabled={passwordLoading}
                  style={{
                    border: '1px solid #dfe5ee',
                    borderRadius: 12,
                    padding: '10px 14px',
                    background: '#ffffff',
                    color: '#374151',
                    fontSize: 12.5,
                    fontWeight: 800,
                    cursor: passwordLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  Cancel
                </button>
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
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
