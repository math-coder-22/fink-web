'use client'

import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import HutangNotif from '@/components/layout/HutangNotif'
import type { User } from '@supabase/supabase-js'
import type { MonthKey } from '@/types/database'

export const MONTH_NAMES: Record<string, string> = {
  jan:'Januari', feb:'Februari', mar:'Maret',    apr:'April',
  may:'Mei',     jun:'Juni',     jul:'Juli',      aug:'Agustus',
  sep:'September',oct:'Oktober', nov:'November',  dec:'Desember',
}
export const MONTHS_ORDER: MonthKey[] = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']

export type MonthContextValue = {
  curMonth: MonthKey
  curYear:  number
  setCurMonth: (m: MonthKey) => void
  setCurYear:  (y: number)   => void
}

export const MonthContext = createContext<MonthContextValue>({
  curMonth:'jan', curYear:2026,
  setCurMonth:()=>{}, setCurYear:()=>{},
})
export const useMonthContext = () => useContext(MonthContext)

const BASE_NAV_ITEMS = [
  { href:'/dashboard', label:'Dashboard',    icon:'▦' },
  { href:'/bulanan',   label:'Monthly',      icon:'◷' },
  { href:'/tabungan',  label:'Smart Saving', icon:'◇' },
  { href:'/settings',  label:'Settings',     icon:'⚙' },
]

const ADMIN_NAV_ITEM = { href:'/admin', label:'Admin', icon:'◆' }

export default function DashboardShell({ user, children }: { user: User; children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const now      = new Date()

  const [curMonth,       setCurMonth]       = useState<MonthKey>(MONTHS_ORDER[now.getMonth()])
  const [curYear,        setCurYear]        = useState(now.getFullYear())
  const [ddOpen,         setDdOpen]         = useState(false)
  const [sidebarOpen,    setSidebarOpen]    = useState(true)
  const [isMobile,       setIsMobile]       = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  // Ref untuk detect klik di luar dropdown — tidak pakai overlay terpisah
  const ddRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ddRef.current && !ddRef.current.contains(e.target as Node)) {
        setDdOpen(false)
      }
    }
    if (ddOpen) document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [ddOpen])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    setIsMobile(mq.matches)
    if (mq.matches) setSidebarOpen(false)
    const h = (e: MediaQueryListEvent) => { setIsMobile(e.matches); if(e.matches) setSidebarOpen(false) }
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])


  useEffect(() => {
    let alive = true
    async function loadSubscription() {
      try {
        const res = await fetch('/api/subscription', { cache:'no-store' })
        if (!res.ok) return
        const json = await res.json()
        if (alive) setIsAdmin(json.profile?.role === 'admin')
      } catch {
        // Jika tabel subscription belum dibuat, sidebar tetap berjalan tanpa menu Admin.
      }
    }
    loadSubscription()
    return () => { alive = false }
  }, [])

  const navItems = isAdmin ? [...BASE_NAV_ITEMS, ADMIN_NAV_ITEM] : BASE_NAV_ITEMS

  const todayLabel = (() => {
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
    const last = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate()
    const rem  = last - now.getDate()
    return isMobile
      ? `${days[now.getDay()]} ${now.getDate()} · ${rem}d`
      : `${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][now.getDay()]}, ${now.getDate()} · ${rem} days left`
  })()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleSetMonth = useCallback((m: MonthKey) => {
    setCurMonth(m); setDdOpen(false)
  }, [])

  return (
    <MonthContext.Provider value={{ curMonth, curYear, setCurMonth:handleSetMonth, setCurYear }}>
      <div style={{ display:'flex', flexDirection:'column', minHeight:'100dvh', height:'100dvh' }}>

        {/* ── TOPNAV ── */}
        <nav style={{
          background:'#1a5c42', color:'#fff',
          height: isMobile ? '48px' : '52px',
          padding:`0 ${isMobile?'12px':'18px'}`,
          display:'flex', alignItems:'center',
          gap: isMobile ? '8px' : '12px',
          flexShrink:0,
          boxShadow:'0 1px 0 rgba(0,0,0,.12),0 2px 8px rgba(26,92,66,.28)',
          zIndex:200, position:'relative',
        }}>

          {/* Hamburger / sidebar toggle */}
          <button onClick={isMobile ? ()=>setMobileMenuOpen(v=>!v) : ()=>setSidebarOpen(v=>!v)} style={{
            display:'flex', alignItems:'center', justifyContent:'center',
            width:'32px', height:'32px',
            background:'rgba(255,255,255,.12)', border:'1px solid rgba(255,255,255,.18)',
            borderRadius:'6px', color:'#fff', cursor:'pointer', flexShrink:0,
          }}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M2 4h12M2 8h12M2 12h12"/>
            </svg>
          </button>

          {/* Logo */}
          <span style={{ fontFamily:'serif', fontSize: isMobile?'16px':'18px', fontWeight:700, letterSpacing:'-.4px', flexShrink:0 }}>
            Fi<em style={{ fontStyle:'normal', opacity:.65 }}>NK</em>
          </span>

          <div style={{ width:'1px', height:'18px', background:'rgba(255,255,255,.2)', flexShrink:0 }}/>

          {/* Month picker */}
          <div ref={ddRef} style={{ position:'relative', flexShrink:0 }}>
            <button onClick={()=>setDdOpen(v=>!v)} style={{
              display:'flex', alignItems:'center', gap:'5px',
              background:'rgba(255,255,255,.12)', border:'1px solid rgba(255,255,255,.18)',
              color:'rgba(255,255,255,.95)', padding: isMobile?'4px 9px':'5px 11px',
              borderRadius:'20px', fontSize: isMobile?'11.5px':'12.5px', fontWeight:500, cursor:'pointer', whiteSpace:'nowrap',
            }}>
              {isMobile ? `${MONTH_NAMES[curMonth].slice(0,3)} ${curYear}` : `${MONTH_NAMES[curMonth]} ${curYear}`}
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M2 4l4 4 4-4"/>
              </svg>
            </button>

            {ddOpen && (
              <div style={{
                position:'absolute', top:'calc(100% + 7px)', left:0,
                background:'#fff', border:'1px solid #e3e7ee', borderRadius:'12px',
                boxShadow:'0 4px 16px rgba(0,0,0,.12)', padding:'5px',
                minWidth:'175px', zIndex:600, display:'flex', flexDirection:'column', gap:'1px',
              }}>
                {/* Year nav */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'4px 6px 8px', borderBottom:'1px solid #e3e7ee', marginBottom:'4px' }}>
                  <button onClick={()=>setCurYear(y=>y-1)} style={{ width:'28px', height:'28px', border:'1px solid #e3e7ee', borderRadius:'6px', background:'none', cursor:'pointer', fontSize:'15px', fontWeight:600, color:'#4b5563', display:'flex', alignItems:'center', justifyContent:'center' }}>‹</button>
                  <span style={{ fontSize:'15px', fontWeight:700, color:'#111827', fontFamily:'JetBrains Mono,monospace' }}>{curYear}</span>
                  <button onClick={()=>setCurYear(y=>y+1)} style={{ width:'28px', height:'28px', border:'1px solid #e3e7ee', borderRadius:'6px', background:'none', cursor:'pointer', fontSize:'15px', fontWeight:600, color:'#4b5563', display:'flex', alignItems:'center', justifyContent:'center' }}>›</button>
                </div>
                {/* Month grid — 3 columns on mobile for compactness */}
                <div style={{ display:'grid', gridTemplateColumns: isMobile?'repeat(3,1fr)':'1fr', gap:'2px' }}>
                  {MONTHS_ORDER.map(m => (
                    <button key={m} onClick={()=>handleSetMonth(m)} style={{
                      fontSize:'12.5px', fontWeight:500,
                      color: m===curMonth?'#1a5c42':'#4b5563',
                      background: m===curMonth?'#e8f5ef':'none',
                      border:'none', padding: isMobile?'6px 4px':'7px 11px',
                      borderRadius:'6px', textAlign:'center', cursor:'pointer',
                    }}>
                      {isMobile ? MONTH_NAMES[m].slice(0,3) : MONTH_NAMES[m]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Today chip — hide on very small */}
          {!isMobile && (
            <div style={{ background:'rgba(255,255,255,.12)', border:'1px solid rgba(255,255,255,.18)', borderRadius:'20px', padding:'4px 11px', fontSize:'11.5px', fontWeight:500, color:'rgba(255,255,255,.9)', whiteSpace:'nowrap' }}>
              {todayLabel}
            </div>
          )}
          {isMobile && (
            <div style={{ fontSize:'11px', color:'rgba(255,255,255,.65)', fontWeight:500, whiteSpace:'nowrap' }}>
              {todayLabel}
            </div>
          )}

          {/* Hutang notif */}
          <HutangNotif isMobile={isMobile} />

          {/* Right */}
          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:'8px' }}>
            {!isMobile && <span style={{ fontSize:'11.5px', color:'rgba(255,255,255,.4)', fontWeight:500 }}>{user.email}</span>}
            <button onClick={handleLogout} style={{
              background:'rgba(255,255,255,.12)', border:'1px solid rgba(255,255,255,.18)',
              borderRadius:'20px', padding: isMobile?'3px 9px':'4px 11px',
              fontSize:'11.5px', fontWeight:500, color:'rgba(255,255,255,.85)', cursor:'pointer',
            }}>
              {isMobile ? '↩' : 'Sign Out'}
            </button>
          </div>
        </nav>

        {/* ── MOBILE MENU OVERLAY ── */}
        {isMobile && mobileMenuOpen && (
          <>
            <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:300 }} onClick={()=>setMobileMenuOpen(false)} />
            <div style={{
              position:'fixed', top: isMobile?'48px':'52px', left:0, bottom:0,
              width:'220px', background:'#fff', zIndex:400,
              padding:'12px 8px', display:'flex', flexDirection:'column', gap:'2px',
              boxShadow:'4px 0 20px rgba(0,0,0,.12)',
            }}>
              <div style={{ fontSize:'10px', fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'1.2px', padding:'8px 10px', marginBottom:'4px' }}>Navigation</div>
              {navItems.map(item => (
                <Link key={item.href} href={item.href} onClick={()=>setMobileMenuOpen(false)} style={{
                  display:'flex', alignItems:'center', gap:'10px',
                  padding:'10px 12px', borderRadius:'8px',
                  background: pathname===item.href?'#e8f5ef':'transparent',
                  color: pathname===item.href?'#1a5c42':'#4b5563',
                  fontWeight: pathname===item.href?600:500,
                  fontSize:'14px', textDecoration:'none',
                }}>
                  <span style={{ fontSize:'16px', width:'20px', textAlign:'center' }}>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
              <div style={{ marginTop:'auto', padding:'10px 12px', borderTop:'1px solid #e3e7ee' }}>
                <div style={{ fontSize:'12px', color:'#9ca3af' }}>{user.email}</div>
              </div>
            </div>
          </>
        )}

        {/* ── BODY ── */}
        <div style={{ display:'flex', flex:1, minHeight:0, overflow:'hidden' }}>

          {/* Desktop sidebar */}
          {!isMobile && (
            <aside style={{
              width: sidebarOpen?'200px':'0',
              background:'#fff', borderRight:'1px solid #e3e7ee',
              padding: sidebarOpen?'12px 8px':'0',
              flexShrink:0, overflowY:'auto', overflowX:'hidden',
              display:'flex', flexDirection:'column', gap:'1px',
              transition:'width .22s ease, padding .22s ease',
            }}>
              <div style={{ fontSize:'10px', fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'1.2px', padding:'10px 10px 5px', whiteSpace:'nowrap' }}>Navigation</div>
              {navItems.map(item => (
                <Link key={item.href} href={item.href} style={{
                  display:'flex', alignItems:'center', gap:'9px',
                  padding:'8px 10px', borderRadius:'6px',
                  background: pathname===item.href?'#e8f5ef':'transparent',
                  color: pathname===item.href?'#1a5c42':'#4b5563',
                  fontWeight: pathname===item.href?600:500,
                  fontSize:'13px', textDecoration:'none', whiteSpace:'nowrap',
                }}>
                  <span style={{ fontSize:'14px', width:'18px', textAlign:'center', flexShrink:0 }}>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </aside>
          )}

          {/* Main content */}
          <main style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch', padding: isMobile?'14px 12px calc(28px + env(safe-area-inset-bottom))':'22px', minHeight:0 }}>
            {children}
          </main>
        </div>
      </div>
    </MonthContext.Provider>
  )
}
