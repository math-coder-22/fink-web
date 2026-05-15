'use client'

import { useEffect, useMemo, useState } from 'react'
import { AppButton, AppCard, AppIcon, EmptyState, PageHeader } from '@/components/ui/design'

type Role = 'user' | 'admin' | 'super_admin'
type Plan = 'free' | 'premium'
type Status = 'active' | 'trialing' | 'past_due' | 'canceled'

type AdminUser = {
  id: string
  email: string
  full_name: string | null
  role: Role
  suspended: boolean
  deleted_at: string | null
  created_at: string
  subscription: {
    id: string
    user_id: string
    plan: Plan
    status: Status
    current_period_end: string | null
    is_lifetime: boolean
    updated_at: string
  } | null
  effectivePlan: Plan
  expired: boolean
}

type MenuState = {
  user: AdminUser
  x: number
  y: number
} | null

const fmtDate = (s?: string | null) => {
  if (!s) return '-'
  return new Date(s).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' })
}

function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'green'|'blue'|'red'|'neutral'|'gold'|'purple' }) {
  const map = {
    green: ['#dcfce7', '#166534', '#bbf7d0'],
    blue: ['#dbeafe', '#1d4ed8', '#bfdbfe'],
    red: ['#fee2e2', '#991b1b', '#fecaca'],
    gold: ['#fef3c7', '#92400e', '#fde68a'],
    purple: ['#ede9fe', '#5b21b6', '#ddd6fe'],
    neutral: ['#f3f4f6', '#4b5563', '#e5e7eb'],
  } as const
  const [bg, color, border] = map[tone]
  return <span style={{ display:'inline-flex', alignItems:'center', border:`1px solid ${border}`, background:bg, color, borderRadius:'999px', padding:'3px 8px', fontSize:'10.5px', fontWeight:800, textTransform:'uppercase', letterSpacing:'.4px', whiteSpace:'nowrap' }}>{children}</span>
}

function getUserStatus(user: AdminUser) {
  if (user.deleted_at) return { label: 'deleted', tone: 'red' as const }
  if (user.suspended) return { label: 'suspended', tone: 'red' as const }
  if (user.expired) return { label: 'expired', tone: 'gold' as const }
  if (user.subscription?.status && user.subscription.status !== 'active') {
    return { label: user.subscription.status, tone: 'neutral' as const }
  }
  return { label: 'active', tone: 'green' as const }
}

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [currentAdminRole, setCurrentAdminRole] = useState<Role>('user')
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [dateMap, setDateMap] = useState<Record<string, string>>({})
  const [openMenu, setOpenMenu] = useState<MenuState>(null)

  const isSuperAdmin = currentAdminRole === 'super_admin'

  async function loadUsers() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/users', { cache:'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || json.error || 'Failed to load admin data')
      setUsers(json.users || [])
      setCurrentAdminRole(json.currentAdmin?.role || 'user')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadUsers() }, [])

  useEffect(() => {
    function close() { setOpenMenu(null) }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  async function adminPatch(userId: string, body: Record<string, unknown>) {
    setSavingId(userId)
    setError('')
    setOpenMenu(null)
    try {
      const res = await fetch('/api/admin/users', {
        method:'PATCH',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ user_id: userId, ...body }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || json.error || 'Failed to update user')
      await loadUsers()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSavingId(null)
    }
  }

  async function hardDelete(user: AdminUser) {
    setOpenMenu(null)
    const ok = confirm(`Hapus permanen user ${user.email}?\n\nData transaksi, monthly plan, subscription, profile, dan Auth user akan dihapus. Aksi ini tidak bisa dibatalkan.`)
    if (!ok) return

    setSavingId(user.id)
    setError('')
    try {
      const res = await fetch(`/api/admin/users?user_id=${encodeURIComponent(user.id)}`, { method:'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to hard delete user')
      await loadUsers()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSavingId(null)
    }
  }

  function setCustomExpiry(user: AdminUser) {
    const date = dateMap[user.id]
    if (!date) {
      alert('Pilih tanggal masa aktif terlebih dahulu.')
      return
    }
    adminPatch(user.id, {
      action: 'set_subscription',
      plan: 'premium',
      status: 'active',
      current_period_end: new Date(`${date}T23:59:59`).toISOString(),
      is_lifetime: false,
    })
  }

  function openActionMenu(user: AdminUser, e: React.MouseEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const menuWidth = 230
    const menuHeight = 305
    const margin = 12
    const x = Math.min(Math.max(margin, rect.right - menuWidth), window.innerWidth - menuWidth - margin)
    const canOpenBelow = rect.bottom + menuHeight + margin < window.innerHeight
    const y = canOpenBelow
      ? Math.min(rect.bottom + 8, window.innerHeight - menuHeight - margin)
      : Math.max(margin, rect.top - menuHeight - 8)
    setOpenMenu({ user, x, y })
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter(u => `${u.email} ${u.full_name || ''} ${u.role} ${u.subscription?.plan || ''}`.toLowerCase().includes(q))
  }, [users, query])

  const stats = useMemo(() => {
    const total = users.filter(u => !u.deleted_at).length
    const premium = users.filter(u => !u.deleted_at && u.effectivePlan === 'premium').length
    const lifetime = users.filter(u => !u.deleted_at && u.subscription?.is_lifetime).length
    const suspended = users.filter(u => u.suspended).length
    const deleted = users.filter(u => u.deleted_at).length
    return { total, premium, lifetime, suspended, deleted }
  }, [users])

  return (
    <div className="fink-admin-page">
      <PageHeader
        title="Admin User Management"
        subtitle="Kelola user, role, masa aktif Premium, lifetime, suspend, dan delete."
        action={<AppButton variant="secondary" onClick={loadUsers}>Refresh</AppButton>}
      />

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(145px, 1fr))', gap:'12px', marginBottom:'14px' }}>
        {[
          ['Active User', stats.total, 'green'],
          ['Premium', stats.premium, 'blue'],
          ['Lifetime', stats.lifetime, 'purple'],
          ['Suspended', stats.suspended, 'red'],
          ['Deleted', stats.deleted, 'neutral'],
        ].map(([label, value, tone]) => (
          <AppCard key={label as string} style={{ padding:'14px 15px' }}>
            <div style={{ fontSize:'10px', fontWeight:800, color:'#6b7280', textTransform:'uppercase', letterSpacing:'.7px' }}>{label}</div>
            <div style={{ fontSize:'22px', fontWeight:900, fontFamily:'var(--font-mono), monospace', color:tone==='green'?'#15803d':tone==='blue'?'#1d4ed8':tone==='purple'?'#5b21b6':tone==='red'?'#991b1b':'#111827', marginTop:6 }}>{value as number}</div>
          </AppCard>
        ))}
      </div>

      {error && (
        <AppCard style={{ marginBottom:14, borderColor:'#fecaca', background:'#fef2f2' }}>
          <div style={{ padding:14, color:'#991b1b', fontSize:'12.5px', lineHeight:1.5 }}>
            <b>Admin error:</b> {error}<br />
            Pastikan SQL user_management_subscription_schema.sql sudah dijalankan dan SUPABASE_SERVICE_ROLE_KEY sudah ada di Vercel.
          </div>
        </AppCard>
      )}

      <AppCard>
        <div style={{ padding:'14px 16px', borderBottom:'1px solid #e3e7ee', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
          <div>
            <div style={{ fontSize:'14px', fontWeight:900, color:'#111827' }}>Users</div>
            <div style={{ fontSize:'11.5px', color:'#9ca3af', marginTop:2 }}>
              Role Anda: <b>{currentAdminRole}</b>. Hard delete dan role super admin hanya tersedia untuk super admin.
            </div>
          </div>
          <input
            value={query}
            onChange={e=>setQuery(e.target.value)}
            placeholder="Cari email/user/role..."
            style={{ width:260, maxWidth:'100%', border:'1px solid #e3e7ee', borderRadius:8, padding:'9px 11px', fontSize:12, outline:'none' }}
          />
        </div>

        {loading ? (
          <div style={{ padding:18, color:'#9ca3af', fontSize:13 }}>Loading admin data...</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<AppIcon name="users" size={24} />} title="Tidak ada user ditemukan">Coba kata kunci lain atau refresh data.</EmptyState>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:1040 }}>
              <thead>
                <tr style={{ background:'#f7f8fa', color:'#6b7280', fontSize:10.5, textTransform:'uppercase', letterSpacing:'.6px' }}>
                  <th style={{ textAlign:'left', padding:'10px 14px' }}>User</th>
                  <th style={{ textAlign:'left', padding:'10px 14px' }}>Role</th>
                  <th style={{ textAlign:'left', padding:'10px 14px' }}>Plan</th>
                  <th style={{ textAlign:'left', padding:'10px 14px' }}>Masa Aktif</th>
                  <th style={{ textAlign:'left', padding:'10px 14px' }}>Status</th>
                  <th style={{ textAlign:'left', padding:'10px 14px' }}>Custom Expiry</th>
                  <th style={{ textAlign:'right', padding:'10px 14px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => {
                  const plan = u.effectivePlan || 'free'
                  const sub = u.subscription
                  const disabled = savingId === u.id
                  return (
                    <tr key={u.id} style={{ borderTop:'1px solid #f3f4f6', opacity:u.deleted_at ? .55 : 1 }}>
                      <td style={{ padding:'12px 14px', verticalAlign:'top' }}>
                        <div style={{ fontSize:13, fontWeight:800, color:'#111827' }}>{u.full_name || u.email}</div>
                        <div style={{ fontSize:11, color:'#9ca3af', marginTop:2 }}>{u.email}</div>
                        <div style={{ fontSize:10.5, color:'#c0c4cc', marginTop:2 }}>Joined {fmtDate(u.created_at)}</div>
                      </td>
                      <td style={{ padding:'12px 14px', verticalAlign:'top' }}>
                        <Badge tone={u.role === 'super_admin' ? 'purple' : u.role === 'admin' ? 'gold' : 'neutral'}>{u.role}</Badge>
                        {isSuperAdmin && (
                          <select
                            value={u.role}
                            disabled={disabled}
                            onChange={e=>adminPatch(u.id, { action:'set_role', role:e.target.value })}
                            style={{ display:'block', marginTop:8, border:'1px solid #e3e7ee', borderRadius:7, padding:'6px 7px', fontSize:11 }}
                          >
                            <option value="user">user</option>
                            <option value="admin">admin</option>
                            <option value="super_admin">super_admin</option>
                          </select>
                        )}
                      </td>
                      <td style={{ padding:'12px 14px', verticalAlign:'top' }}>
                        <Badge tone={plan === 'premium' ? 'blue' : 'green'}>{plan}</Badge>
                        {sub?.is_lifetime && <div style={{ marginTop:6 }}><Badge tone="purple">lifetime</Badge></div>}
                        {u.expired && <div style={{ marginTop:6 }}><Badge tone="red">expired</Badge></div>}
                      </td>
                      <td style={{ padding:'12px 14px', fontSize:12, color:'#6b7280', verticalAlign:'top' }}>
                        {sub?.is_lifetime ? 'Seumur hidup' : fmtDate(sub?.current_period_end)}
                      </td>
                      <td style={{ padding:'12px 14px', verticalAlign:'top' }}>
                        {(() => {
                          const status = getUserStatus(u)
                          return <Badge tone={status.tone}>{status.label}</Badge>
                        })()}
                      </td>
                      <td style={{ padding:'12px 14px', verticalAlign:'top' }}>
                        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                          <input
                            type="date"
                            value={dateMap[u.id] || ''}
                            onChange={e=>setDateMap(prev=>({ ...prev, [u.id]: e.target.value }))}
                            style={{ border:'1px solid #e3e7ee', borderRadius:7, padding:'6px 7px', fontSize:11 }}
                          />
                          <button disabled={disabled || !!u.deleted_at} onClick={()=>setCustomExpiry(u)} style={{ border:'1px solid #1a5c42', background:'#fff', color:'#1a5c42', borderRadius:7, padding:'7px 9px', fontSize:11, fontWeight:800, cursor:'pointer' }}>
                            Apply
                          </button>
                        </div>
                      </td>
                      <td style={{ padding:'12px 14px', textAlign:'right', verticalAlign:'top' }}>
                        <button
                          disabled={disabled}
                          onClick={(e)=>openActionMenu(u, e)}
                          aria-label={`Open actions for ${u.email}`}
                          style={{
                            width:34,
                            height:34,
                            border:'1px solid #e3e7ee',
                            background:'#fff',
                            borderRadius:10,
                            cursor:disabled ? 'wait' : 'pointer',
                            fontSize:18,
                            lineHeight:1,
                            color:'#4b5563',
                            boxShadow:'0 2px 8px rgba(15,23,42,.04)',
                          }}
                        >
                          ⋮
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </AppCard>

      {openMenu && (
        <>
          <div onClick={() => setOpenMenu(null)} style={{ position:'fixed', inset:0, zIndex:900 }} />
          <ActionFloatingMenu
            menu={openMenu}
            isSuperAdmin={isSuperAdmin}
            savingId={savingId}
            onPatch={adminPatch}
            onHardDelete={hardDelete}
          />
        </>
      )}

      <style>{`
        @media (max-width: 640px) {
          .fink-admin-page { padding-bottom: calc(72px + env(safe-area-inset-bottom)); }
        }
      `}</style>
    </div>
  )
}


function ActionFloatingMenu({
  menu,
  isSuperAdmin,
  savingId,
  onPatch,
  onHardDelete,
}: {
  menu: Exclude<MenuState, null>
  isSuperAdmin: boolean
  savingId: string | null
  onPatch: (userId: string, body: Record<string, unknown>) => void
  onHardDelete: (user: AdminUser) => void
}) {
  const user = menu.user
  const disabled = savingId === user.id

  const item = (
    label: string,
    onClick: () => void,
    tone: 'normal'|'green'|'blue'|'purple'|'red' = 'normal',
    isDisabled = false
  ) => {
    const color =
      tone === 'green' ? '#15803d' :
      tone === 'blue' ? '#1d4ed8' :
      tone === 'purple' ? '#5b21b6' :
      tone === 'red' ? '#991b1b' :
      '#374151'

    return (
      <button
        disabled={disabled || isDisabled}
        onClick={onClick}
        style={{
          width:'100%',
          display:'flex',
          alignItems:'center',
          justifyContent:'space-between',
          gap:10,
          padding:'10px 12px',
          border:'none',
          background:'transparent',
          color,
          cursor: disabled || isDisabled ? 'not-allowed' : 'pointer',
          fontSize:12.5,
          fontWeight:800,
          textAlign:'left',
          borderRadius:8,
          opacity: disabled || isDisabled ? .45 : 1,
        }}
        onMouseEnter={(e)=>{ if (!disabled && !isDisabled) e.currentTarget.style.background = '#f7f8fa' }}
        onMouseLeave={(e)=>{ e.currentTarget.style.background = 'transparent' }}
      >
        <span>{label}</span>
        <span style={{ color:'#c0c4cc' }}>›</span>
      </button>
    )
  }

  return (
    <div
      style={{
        position:'fixed',
        left: menu.x,
        top: menu.y,
        width:230,
        maxHeight:'min(360px, calc(100dvh - 24px))',
        overflowY:'auto',
        background:'#fff',
        border:'1px solid #e3e7ee',
        borderRadius:14,
        boxShadow:'0 20px 55px rgba(15,23,42,.20)',
        zIndex:901,
        padding:8,
      }}
    >
      <div style={{ padding:'8px 10px 10px', borderBottom:'1px solid #eef2f7', marginBottom:6 }}>
        <div style={{ fontSize:12.5, fontWeight:900, color:'#111827', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user.email}</div>
        <div style={{ fontSize:10.5, color:'#9ca3af', marginTop:2 }}>Action menu</div>
      </div>

      {item('Premium 3 Tahun', () => onPatch(user.id, { action:'grant_duration', duration_amount:3, duration_unit:'years' }), 'blue', !!user.deleted_at)}
      {item('Lifetime Premium', () => onPatch(user.id, { action:'lifetime' }), 'purple', !!user.deleted_at)}
      {item('Ubah ke Free', () => onPatch(user.id, { action:'downgrade' }), 'normal', !!user.deleted_at)}

      <div style={{ height:1, background:'#eef2f7', margin:'6px 0' }} />

      {user.suspended
        ? item('Activate User', () => onPatch(user.id, { action:'activate' }), 'green', !!user.deleted_at)
        : item('Suspend User', () => onPatch(user.id, { action:'suspend' }), 'red', !!user.deleted_at)
      }

      {isSuperAdmin && (
        <>
          {user.deleted_at
            ? item('Restore Soft Delete', () => onPatch(user.id, { action:'restore' }), 'green')
            : item('Soft Delete', () => onPatch(user.id, { action:'soft_delete' }), 'red')
          }
          {item('Hard Delete Permanen', () => onHardDelete(user), 'red', user.role === 'super_admin')}
        </>
      )}
    </div>
  )
}
