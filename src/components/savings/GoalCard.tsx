'use client'

import { useState, useRef, useEffect } from 'react'
import type { SavingsGoal, GoalCalcResult, GoalTransaction } from '@/types/savings'

const fmt = (n: number) => 'Rp ' + Math.abs(Math.round(n || 0)).toLocaleString('id-ID')

const TYPE_LABEL: Record<string, string> = {
  darurat:'Dana Darurat', pendidikan:'Pendidikan Anak', pensiun:'Dana Pensiun', biasa:'Tabungan Biasa',
}

function TrackBadge({ status }: { status: GoalCalcResult['trackStatus'] }) {
  const map = {
    complete: { bg:'#dbeafe', color:'#1e40af', label:'Complete' },
    ahead:    { bg:'#d1fae5', color:'#065f46', label:'Ahead' },
    ontrack:  { bg:'#d1fae5', color:'#065f46', label:'On Track' },
    behind:   { bg:'#fee2e2', color:'#991b1b', label:'Behind' },
  }
  const s = map[status]
  return (
    <span style={{ fontSize:'9.5px', fontWeight:700, padding:'2px 7px', borderRadius:'99px', background:s.bg, color:s.color, textTransform:'uppercase' as const, letterSpacing:'.3px', whiteSpace:'nowrap' as const }}>
      {s.label}
    </span>
  )
}

/* ─── KEBAB MENU (fixed-position dropdown, tidak terpotong) ─── */
function KebabMenu({ goal, onTopup, onWithdraw, onEdit, onStatus, onDelete }: {
  goal: SavingsGoal
  onTopup: () => void
  onWithdraw: () => void
  onEdit: () => void
  onStatus: (s: SavingsGoal['status']) => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const [pos,  setPos]  = useState({ top: 0, right: 0, openUp: false })
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          btnRef.current  && !btnRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function toggleMenu(e: React.MouseEvent) {
    e.stopPropagation()
    if (open) { setOpen(false); return }
    const rect   = btnRef.current!.getBoundingClientRect()
    const vh     = window.innerHeight
    // estimasi tinggi menu (~220px)
    const menuH  = 220
    const openUp = rect.bottom + menuH > vh - 16
    setPos({
      top:    openUp ? rect.top - menuH : rect.bottom + 4,
      right:  window.innerWidth - rect.right,
      openUp,
    })
    setOpen(true)
  }

  const item = (label: string, color: string, onClick: () => void) => (
    <button key={label}
      onClick={e => { e.stopPropagation(); onClick(); setOpen(false) }}
      style={{ display:'block', width:'100%', textAlign:'left' as const, padding:'8px 14px', border:'none', background:'none', fontSize:'13px', color, cursor:'pointer', fontFamily:'inherit', fontWeight:500 }}
      onMouseEnter={e => (e.currentTarget.style.background = '#f7f8fa')}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
      {label}
    </button>
  )

  return (
    <>
      <button ref={btnRef} onClick={toggleMenu}
        style={{ width:'28px', height:'28px', border:'1px solid #e4e1d9', borderRadius:'6px', background: open?'#f3f4f6':'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#6b7280', flexShrink:0 }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
          <circle cx="7" cy="2.5" r="1.2"/>
          <circle cx="7" cy="7"   r="1.2"/>
          <circle cx="7" cy="11.5" r="1.2"/>
        </svg>
      </button>

      {open && (
        <div ref={menuRef}
          style={{ position:'fixed' as const, top: pos.top, right: pos.right, background:'#fff', border:'1.5px solid #e4e1d9', borderRadius:'10px', boxShadow:'0 8px 32px rgba(0,0,0,.15)', zIndex:9999, minWidth:'170px', overflow:'hidden', padding:'4px 0' }}>
          {goal.status === 'active' && item('↑ Setor Dana', '#1a5c42', onTopup)}
          {goal.status === 'active' && item('↓ Tarik Dana', '#b45309', onWithdraw)}
          {goal.status === 'active' && <div style={{ height:'1px', background:'#f3f4f6', margin:'3px 0' }} />}
          {item('✏ Edit', '#374151', onEdit)}
          <div style={{ height:'1px', background:'#f3f4f6', margin:'3px 0' }} />
          {(['active','pending','complete','archived'] as SavingsGoal['status'][])
            .filter(s => s !== goal.status)
            .map(s => item(`→ ${s.charAt(0).toUpperCase()+s.slice(1)}`, '#6b7280', () => onStatus(s)))}
          <div style={{ height:'1px', background:'#f3f4f6', margin:'3px 0' }} />
          {item('Hapus', '#b91c1c', onDelete)}
        </div>
      )}
    </>
  )
}

/* ─── HISTORY PANEL ─── */
function HistoryPanel({ history }: { history: GoalTransaction[] }) {
  return (
    <div style={{ borderTop:'1px solid #f0f0ee', background:'#fafaf9' }}>
      <div style={{ padding:'9px 14px', fontSize:'10.5px', fontWeight:700, color:'#4b5563', textTransform:'uppercase' as const, letterSpacing:'.5px', borderBottom:'1px solid #f0f0ee', display:'flex', justifyContent:'space-between' }}>
        <span>Riwayat Transaksi</span>
        <span style={{ fontSize:'10px', color:'#9ca3af', fontWeight:400 }}>{history.length} entri · klik card untuk tutup</span>
      </div>
      {history.length === 0 ? (
        <div style={{ padding:'18px 14px', fontSize:'12.5px', color:'#9ca3af', textAlign:'center' as const }}>
          Belum ada riwayat. Gunakan menu ⋮ untuk setor atau tarik dana.
        </div>
      ) : (
        <div style={{ maxHeight:'200px', overflowY:'auto' as const }}>
          {[...history].reverse().map((h, i) => (
            <div key={h.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 14px', borderBottom: i < history.length-1 ? '1px solid #f0f0ee' : 'none' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                <span style={{ fontSize:'16px', color: h.type==='topup' ? '#065f46' : '#b45309', fontWeight:700, minWidth:'16px' }}>
                  {h.type==='topup' ? '↑' : '↓'}
                </span>
                <div>
                  <div style={{ fontSize:'12.5px', fontWeight:500, color:'#374151' }}>{h.note}</div>
                  <div style={{ fontSize:'10.5px', color:'#9ca3af' }}>
                    {new Date(h.date).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' })}
                    {' · '}
                    {new Date(h.date).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' })}
                  </div>
                </div>
              </div>
              <div style={{ fontFamily:'JetBrains Mono,monospace', fontWeight:700, fontSize:'13px', color: h.type==='topup' ? '#065f46' : '#b45309', whiteSpace:'nowrap' as const }}>
                {h.type==='topup' ? '+' : '−'}{fmt(h.amount)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── MAIN CARD ─── */
interface Props {
  goal:       SavingsGoal
  calc:       GoalCalcResult
  onEdit:     (g: SavingsGoal) => void
  onTopup:    (id: string) => void
  onWithdraw: (id: string) => void
  onStatus:   (id: string, s: SavingsGoal['status']) => void
  onDelete:   (id: string) => void
}

export default function GoalCard({ goal, calc, onEdit, onTopup, onWithdraw, onStatus, onDelete }: Props) {
  const [showHistory, setShowHistory] = useState(false)
  const pct       = Math.round(calc.progress * 100)
  const progColor = calc.trackStatus === 'behind' ? '#b91c1c' : calc.trackStatus === 'complete' ? '#1d4ed8' : '#1a5c42'

  return (
    <div style={{ background:'#fff', border:'1.5px solid #e4e1d9', borderRadius:'10px', overflow:'hidden', transition:'box-shadow .15s' }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,.07)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>

      {/* MAIN ROW — klik seluruh card untuk toggle riwayat */}
      <div
        style={{ display:'flex', alignItems:'stretch', cursor:'pointer' }}
        onClick={() => setShowHistory(v => !v)}>

        {/* LEFT */}
        <div style={{ flex:'2', minWidth:'150px', padding:'12px 14px', borderRight:'1px solid #f3f4f6' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'3px', flexWrap:'wrap' as const }}>
            <div style={{ fontSize:'13.5px', fontWeight:700, color:'#111827' }}>{goal.name}</div>
            <TrackBadge status={calc.trackStatus} />
          </div>
          <div style={{ fontSize:'11px', color:'#9ca3af', marginBottom:'7px' }}>
            {TYPE_LABEL[goal.type]}
            {goal.deadline && ` · ${new Date(goal.deadline).toLocaleDateString('id-ID', { month:'short', year:'numeric' })}`}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'7px' }}>
            <div style={{ flex:1, background:'#e4e1d9', borderRadius:'99px', height:'4px', overflow:'hidden' }}>
              <div style={{ height:'4px', borderRadius:'99px', background:progColor, width:`${Math.min(100,pct)}%`, transition:'width .4s ease' }} />
            </div>
            <span style={{ fontSize:'10px', fontWeight:700, color:progColor, minWidth:'28px', textAlign:'right' as const }}>{pct}%</span>
          </div>
          {goal.type === 'darurat' && calc.coverage !== undefined && (
            <div style={{ marginTop:'5px', fontSize:'10.5px', fontWeight:500, color: calc.coverageStatus==='Risiko Tinggi'?'#991b1b':calc.coverageStatus==='Aman'?'#065f46':'#92400e' }}>
              {calc.coverageStatus} · {calc.coverage.toFixed(1)}× pengeluaran
              {(calc.excessDana ?? 0) > 0 && <span style={{ color:'#065f46' }}> · Kelebihan {fmt(calc.excessDana!)}</span>}
            </div>
          )}
        </div>

        {/* MIDDLE */}
        <div style={{ flex:'1.5', minWidth:'110px', padding:'12px 14px', borderRight:'1px solid #f3f4f6', display:'flex', flexDirection:'column' as const, justifyContent:'center', gap:'8px' }}>
          <div>
            <div style={{ fontSize:'9px', fontWeight:700, color:'#9ca3af', textTransform:'uppercase' as const, letterSpacing:'.5px' }}>Terkumpul</div>
            <div style={{ fontSize:'13px', fontWeight:700, fontFamily:'JetBrains Mono,monospace', color:progColor }}>{fmt(goal.current)}</div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px' }}>
            <div>
              <div style={{ fontSize:'9px', fontWeight:700, color:'#9ca3af', textTransform:'uppercase' as const, letterSpacing:'.5px' }}>Target</div>
              <div style={{ fontSize:'11px', fontWeight:500, fontFamily:'JetBrains Mono,monospace', color:'#6b7280' }}>{fmt(goal.target)}</div>
            </div>
            <div>
              <div style={{ fontSize:'9px', fontWeight:700, color:'#9ca3af', textTransform:'uppercase' as const, letterSpacing:'.5px' }}>Sisa</div>
              <div style={{ fontSize:'11px', fontWeight:500, fontFamily:'JetBrains Mono,monospace', color:'#9ca3af' }}>{fmt(calc.sisa)}</div>
            </div>
          </div>
        </div>

        {/* RIGHT: rekomendasi + kebab */}
        <div style={{ flex:'1.5', minWidth:'110px', padding:'12px 14px', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <div style={{ fontSize:'9px', fontWeight:700, color:'#9ca3af', textTransform:'uppercase' as const, letterSpacing:'.5px', marginBottom:'2px' }}>Rekomendasi/Bln</div>
            <div style={{ fontSize:'14px', fontWeight:700, fontFamily:'JetBrains Mono,monospace', color:'#1a5c42' }}>{fmt(calc.monthlyNeeded)}</div>
            {goal.monthly > 0 && (
              <div style={{ fontSize:'10px', color: goal.monthly >= calc.monthlyNeeded ? '#065f46' : '#9ca3af', fontFamily:'JetBrains Mono,monospace', marginTop:'1px' }}>
                Aktual: {fmt(goal.monthly)}
              </div>
            )}
            {calc.months > 0 && goal.deadline && (
              <div style={{ fontSize:'10px', color:'#9ca3af', marginTop:'1px' }}>{calc.months} bln tersisa</div>
            )}
            {goal.useInvest && (
              <div style={{ fontSize:'10px', color:'#6b7280', marginTop:'1px' }}>⚡ {goal.returnRate}%/thn</div>
            )}
            {/* History hint */}
            <div style={{ fontSize:'9.5px', color:'#d0cdc6', marginTop:'8px' }}>
              {showHistory ? '▲ tutup riwayat' : `▼ ${goal.history?.length || 0} riwayat`}
            </div>
          </div>

          {/* KEBAB — stop propagation */}
          <div onClick={e => e.stopPropagation()}>
            <KebabMenu
              goal={goal}
              onTopup={() => onTopup(goal.id)}
              onWithdraw={() => onWithdraw(goal.id)}
              onEdit={() => onEdit(goal)}
              onStatus={s => onStatus(goal.id, s)}
              onDelete={() => { if (confirm('Hapus goal ini?')) onDelete(goal.id) }}
            />
          </div>
        </div>
      </div>

      {/* HISTORY — muncul langsung di bawah card, tidak geser tombol */}
      {showHistory && <HistoryPanel history={goal.history || []} />}
    </div>
  )
}
