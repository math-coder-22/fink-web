'use client'

import { AppCard, EmptyState, PageHeader } from '@/components/ui/design'
import { useSubscription } from '@/hooks/useSubscription'

const fmtDate = (s?: string | null) => {
  if (!s) return '-'
  return new Date(s).toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' })
}

export default function SettingsPage() {
  const { profile, subscription, loading, error, plan, isPremium, isAdmin, isSuperAdmin, isExpired, refresh } = useSubscription()

  const periodText = subscription?.is_lifetime
    ? 'Seumur hidup'
    : subscription?.current_period_end
      ? fmtDate(subscription.current_period_end)
      : plan === 'free'
        ? 'Tidak ada masa aktif premium'
        : '-'

  return (
    <div>
      <PageHeader
        title="Profile"
        subtitle="Manage your account, subscription, and FiNK workspace"
      />

      <AppCard style={{ marginBottom: 14 }}>
        <div style={{ padding:'16px', display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(190px, 1fr))', gap:'12px' }}>
          <div style={{ padding:'14px', border:'1px solid #e3e7ee', borderRadius:'10px', background:'#f7f8fa' }}>
            <div style={{ fontSize:'13px', fontWeight:800, color:'#111827' }}>Profile</div>
            <div style={{ fontSize:'12px', color:'#6b7280', marginTop:4, lineHeight:1.45 }}>{profile?.email || 'Memuat profil...'}</div>
          </div>
          <div style={{ padding:'14px', border:'1px solid #e3e7ee', borderRadius:'10px', background:isPremium?'#eff6ff':'#f0fdf4' }}>
            <div style={{ fontSize:'13px', fontWeight:800, color:'#111827' }}>Subscription</div>
            <div style={{ fontSize:'12px', color:'#6b7280', marginTop:4, lineHeight:1.45 }}>
              {loading ? 'Memuat subscription...' : `${plan.toUpperCase()} · ${subscription?.status || 'active'}`}
            </div>
          </div>
          <div style={{ padding:'14px', border:'1px solid #e3e7ee', borderRadius:'10px', background:'#fffdf7' }}>
            <div style={{ fontSize:'13px', fontWeight:800, color:'#111827' }}>Masa Aktif</div>
            <div style={{ fontSize:'12px', color:'#6b7280', marginTop:4, lineHeight:1.45 }}>
              {periodText}{isExpired ? ' · Expired' : ''}
            </div>
          </div>
          <div style={{ padding:'14px', border:'1px solid #e3e7ee', borderRadius:'10px', background:'#f7f8fa' }}>
            <div style={{ fontSize:'13px', fontWeight:800, color:'#111827' }}>Role</div>
            <div style={{ fontSize:'12px', color:'#6b7280', marginTop:4, lineHeight:1.45 }}>
              {isSuperAdmin ? 'Super Admin' : isAdmin ? 'Admin' : 'User'}
            </div>
          </div>
        </div>
      </AppCard>

      {profile?.suspended && (
        <AppCard style={{ marginBottom:14, borderColor:'#fecaca', background:'#fef2f2' }}>
          <div style={{ padding:14, fontSize:12.5, color:'#991b1b', lineHeight:1.5 }}>
            Akun ini sedang suspended. Hubungi admin FiNK.
          </div>
        </AppCard>
      )}

      {error && (
        <AppCard style={{ marginBottom:14, borderColor:'#fecaca', background:'#fef2f2' }}>
          <div style={{ padding:14, fontSize:12.5, color:'#991b1b', lineHeight:1.5 }}>
            {error}<br />Jalankan file SQL user_management_subscription_schema.sql di Supabase jika belum.
          </div>
        </AppCard>
      )}

      <AppCard style={{ marginBottom:14 }}>
        <div style={{ padding:'16px' }}>
          <div style={{ fontSize:'14px', fontWeight:900, color:'#111827' }}>Plan FiNK</div>
          <div style={{ fontSize:'12.5px', color:'#6b7280', marginTop:4, lineHeight:1.55 }}>
            User Free memiliki batas 10 kategori budget, 1 kategori income, dan 2 akun Smart Saving. Premium dapat diberi masa aktif sampai tanggal tertentu atau lifetime melalui Admin.
          </div>
          <button onClick={refresh} style={{ marginTop:14, border:'1px solid #e3e7ee', background:'#fff', borderRadius:8, padding:'8px 12px', fontSize:12, fontWeight:800, color:'#4b5563', cursor:'pointer' }}>Refresh Subscription</button>
        </div>
      </AppCard>

      <EmptyState icon="⚙️" title="Subscription Ready">
        Sistem role, masa aktif, lifetime, suspend, dan pengelolaan user sudah disiapkan.
      </EmptyState>
    </div>
  )
}
