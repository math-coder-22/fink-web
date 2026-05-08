'use client'

import { useEffect, useMemo, useState } from 'react'
import { AppButton, AppCard, EmptyState, PageHeader } from '@/components/ui/design'

type Plan = 'free' | 'premium'
type Status = 'active' | 'trialing' | 'past_due' | 'canceled'

type AdminUser = {
  id: string
  email: string
  full_name: string | null
  role: 'user' | 'admin'
  created_at: string
  subscription: {
    id: string
    user_id: string
    plan: Plan
    status: Status
    current_period_end: string | null
    updated_at: string
  } | null
}

const fmtDate = (s?: string | null) => {
  if (!s) return '-'
  return new Date(s).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' })
}

function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'green'|'blue'|'red'|'neutral'|'gold' }) {
  const map = {
    green: ['#dcfce7', '#166534', '#bbf7d0'],
    blue: ['#dbeafe', '#1d4ed8', '#bfdbfe'],
    red: ['#fee2e2', '#991b1b', '#fecaca'],
    gold: ['#fef3c7', '#92400e', '#fde68a'],
    neutral: ['#f3f4f6', '#4b5563', '#e5e7eb'],
  } as const
  const [bg, color, border] = map[tone]
  return <span style={{ display:'inline-flex', alignItems:'center', border:`1px solid ${border}`, background:bg, color, borderRadius:'999px', padding:'3px 8px', fontSize:'10.5px', fontWeight:800, textTransform:'uppercase', letterSpacing:'.4px' }}>{children}</span>
}

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  async function loadUsers() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/users', { cache:'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || json.error || 'Failed to load admin data')
      setUsers(json.users || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadUsers() }, [])

  async function updateSubscription(userId: string, plan: Plan, status: Status = 'active') {
    setSavingId(userId)
    setError('')
    try {
      const res = await fetch('/api/admin/users', {
        method:'PATCH',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ user_id: userId, plan, status }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update subscription')
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, subscription: json.subscription } : u))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSavingId(null)
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter(u => `${u.email} ${u.full_name || ''} ${u.subscription?.plan || ''}`.toLowerCase().includes(q))
  }, [users, query])

  const stats = useMemo(() => {
    const total = users.length
    const premium = users.filter(u => u.subscription?.plan === 'premium').length
    const free = users.filter(u => !u.subscription || u.subscription.plan === 'free').length
    const admins = users.filter(u => u.role === 'admin').length
    return { total, premium, free, admins }
  }, [users])

  return (
    <div className="fink-admin-page">
      <PageHeader
        title="Admin"
        subtitle="Kelola user, role, dan subscription FiNK"
        action={<AppButton variant="secondary" onClick={loadUsers}>Refresh</AppButton>}
      />

      <div className="admin-stat-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:'12px', marginBottom:'14px' }}>
        {[
          ['Total User', stats.total, 'green'],
          ['Premium', stats.premium, 'blue'],
          ['Free', stats.free, 'neutral'],
          ['Admin', stats.admins, 'gold'],
        ].map(([label, value, tone]) => (
          <AppCard key={label as string} style={{ padding:'14px 15px' }}>
            <div style={{ fontSize:'10px', fontWeight:800, color:'#6b7280', textTransform:'uppercase', letterSpacing:'.7px' }}>{label}</div>
            <div style={{ fontSize:'22px', fontWeight:900, fontFamily:'JetBrains Mono,monospace', color:tone==='green'?'#15803d':tone==='blue'?'#1d4ed8':tone==='gold'?'#92400e':'#111827', marginTop:6 }}>{value as number}</div>
          </AppCard>
        ))}
      </div>

      {error && (
        <AppCard style={{ marginBottom:14, borderColor:'#fecaca', background:'#fef2f2' }}>
          <div style={{ padding:14, color:'#991b1b', fontSize:'12.5px', lineHeight:1.5 }}>
            <b>Admin belum siap:</b> {error}<br />
            Pastikan SQL subscription sudah dijalankan di Supabase, lalu set role akun Anda menjadi <b>admin</b>.
          </div>
        </AppCard>
      )}

      <AppCard>
        <div style={{ padding:'14px 16px', borderBottom:'1px solid #e3e7ee', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
          <div>
            <div style={{ fontSize:'14px', fontWeight:900, color:'#111827' }}>Subscription Users</div>
            <div style={{ fontSize:'11.5px', color:'#9ca3af', marginTop:2 }}>Ubah user Free/Premium secara manual.</div>
          </div>
          <input
            value={query}
            onChange={e=>setQuery(e.target.value)}
            placeholder="Cari email/user..."
            style={{ width:240, maxWidth:'100%', border:'1px solid #e3e7ee', borderRadius:8, padding:'9px 11px', fontSize:12, outline:'none' }}
          />
        </div>

        {loading ? (
          <div style={{ padding:18, color:'#9ca3af', fontSize:13 }}>Loading admin data...</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="👥" title="Tidak ada user ditemukan">Coba kata kunci lain atau refresh data.</EmptyState>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:720 }}>
              <thead>
                <tr style={{ background:'#f7f8fa', color:'#6b7280', fontSize:10.5, textTransform:'uppercase', letterSpacing:'.6px' }}>
                  <th style={{ textAlign:'left', padding:'10px 14px' }}>User</th>
                  <th style={{ textAlign:'left', padding:'10px 14px' }}>Role</th>
                  <th style={{ textAlign:'left', padding:'10px 14px' }}>Plan</th>
                  <th style={{ textAlign:'left', padding:'10px 14px' }}>Status</th>
                  <th style={{ textAlign:'left', padding:'10px 14px' }}>Period End</th>
                  <th style={{ textAlign:'right', padding:'10px 14px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => {
                  const plan = u.subscription?.plan || 'free'
                  const status = u.subscription?.status || 'active'
                  return (
                    <tr key={u.id} style={{ borderTop:'1px solid #f3f4f6' }}>
                      <td style={{ padding:'12px 14px' }}>
                        <div style={{ fontSize:13, fontWeight:800, color:'#111827' }}>{u.full_name || u.email}</div>
                        <div style={{ fontSize:11, color:'#9ca3af', marginTop:2 }}>{u.email}</div>
                      </td>
                      <td style={{ padding:'12px 14px' }}><Badge tone={u.role === 'admin' ? 'gold' : 'neutral'}>{u.role}</Badge></td>
                      <td style={{ padding:'12px 14px' }}><Badge tone={plan === 'premium' ? 'blue' : 'green'}>{plan}</Badge></td>
                      <td style={{ padding:'12px 14px' }}><Badge tone={status === 'active' ? 'green' : status === 'past_due' ? 'red' : 'neutral'}>{status}</Badge></td>
                      <td style={{ padding:'12px 14px', fontSize:12, color:'#6b7280' }}>{fmtDate(u.subscription?.current_period_end)}</td>
                      <td style={{ padding:'12px 14px', textAlign:'right' }}>
                        <div style={{ display:'inline-flex', gap:6 }}>
                          <button disabled={savingId===u.id || plan==='free'} onClick={()=>updateSubscription(u.id, 'free')} style={{ border:'1px solid #e3e7ee', background:'#fff', borderRadius:7, padding:'7px 10px', fontSize:11.5, fontWeight:800, color:'#4b5563', cursor:'pointer', opacity: savingId===u.id || plan==='free' ? .45 : 1 }}>Free</button>
                          <button disabled={savingId===u.id || plan==='premium'} onClick={()=>updateSubscription(u.id, 'premium')} style={{ border:'1px solid #1a5c42', background:'#1a5c42', borderRadius:7, padding:'7px 10px', fontSize:11.5, fontWeight:800, color:'#fff', cursor:'pointer', opacity: savingId===u.id || plan==='premium' ? .45 : 1 }}>Premium</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </AppCard>

      <style>{`
        @media (max-width: 640px) {
          .fink-admin-page { padding-bottom: calc(72px + env(safe-area-inset-bottom)); }
          .fink-admin-page .admin-stat-grid { grid-template-columns: 1fr 1fr !important; gap: 9px !important; }
        }
      `}</style>
    </div>
  )
}
