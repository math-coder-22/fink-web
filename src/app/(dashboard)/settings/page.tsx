'use client'

import { AppCard, EmptyState, PageHeader } from '@/components/ui/design'
import { useSubscription } from '@/hooks/useSubscription'

export default function SettingsPage() {
  const { profile, subscription, loading, error, plan, isPremium, isAdmin, refresh } = useSubscription()

  return (
    <div>
      <PageHeader
        title="Settings"
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
          <div style={{ padding:'14px', border:'1px solid #e3e7ee', borderRadius:'10px', background:'#f7f8fa' }}>
            <div style={{ fontSize:'13px', fontWeight:800, color:'#111827' }}>Role</div>
            <div style={{ fontSize:'12px', color:'#6b7280', marginTop:4, lineHeight:1.45 }}>{isAdmin ? 'Admin' : 'User'}</div>
          </div>
        </div>
      </AppCard>

      {error && (
        <AppCard style={{ marginBottom:14, borderColor:'#fecaca', background:'#fef2f2' }}>
          <div style={{ padding:14, fontSize:12.5, color:'#991b1b', lineHeight:1.5 }}>
            {error}<br />Jalankan file SQL subscription schema di Supabase jika belum.
          </div>
        </AppCard>
      )}

      <AppCard style={{ marginBottom:14 }}>
        <div style={{ padding:'16px' }}>
          <div style={{ fontSize:'14px', fontWeight:900, color:'#111827' }}>Plan FiNK</div>
          <div style={{ fontSize:'12.5px', color:'#6b7280', marginTop:4, lineHeight:1.55 }}>
            Sistem subscription sudah siap untuk mode manual. User baru otomatis mendapat plan Free. Admin dapat menaikkan akun menjadi Premium melalui halaman Admin.
          </div>
          <div style={{ marginTop:14, display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:12 }}>
            <div style={{ border:'1px solid #bbf7d0', background:'#f0fdf4', borderRadius:12, padding:14 }}>
              <div style={{ fontSize:13, fontWeight:900, color:'#166534' }}>Free</div>
              <div style={{ fontSize:22, fontWeight:900, color:'#15803d', marginTop:6 }}>Rp 0</div>
              <div style={{ fontSize:12, color:'#4b5563', lineHeight:1.6, marginTop:8 }}>Cocok untuk penggunaan pribadi awal dan pencatatan dasar.</div>
            </div>
            <div style={{ border:'1px solid #bfdbfe', background:'#eff6ff', borderRadius:12, padding:14 }}>
              <div style={{ fontSize:13, fontWeight:900, color:'#1d4ed8' }}>Premium</div>
              <div style={{ fontSize:22, fontWeight:900, color:'#1d4ed8', marginTop:6 }}>Manual</div>
              <div style={{ fontSize:12, color:'#4b5563', lineHeight:1.6, marginTop:8 }}>Untuk fitur lanjutan, insight, dan batas penggunaan yang lebih luas.</div>
            </div>
          </div>
          <button onClick={refresh} style={{ marginTop:14, border:'1px solid #e3e7ee', background:'#fff', borderRadius:8, padding:'8px 12px', fontSize:12, fontWeight:800, color:'#4b5563', cursor:'pointer' }}>Refresh Subscription</button>
        </div>
      </AppCard>

      <EmptyState icon="⚙️" title="Settings Bertahap">
        Fondasi profile, role, dan subscription sudah ditambahkan. Integrasi payment gateway dapat dibuat pada tahap berikutnya.
      </EmptyState>
    </div>
  )
}
