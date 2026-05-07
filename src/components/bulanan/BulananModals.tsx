'use client'

import { useState } from 'react'

const fmt = (n: number) => 'Rp ' + Math.abs(Math.round(n)).toLocaleString('id-ID')

export function TxDetailModal({ label, tx, onClose }: {
  label: string
  tx: { id:string; date:string; note:string; amt:number; type:string; cat:string; debt:boolean; settled:boolean }[]
  onClose: () => void
}) {
  const filtered = tx.filter(t => t.cat === label && t.type === 'out')
  const total    = filtered.reduce((s,t) => s + t.amt, 0)
  return (
    <div onClick={e=>{ if(e.target===e.currentTarget) onClose() }}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:700, display:'flex', alignItems:'flex-start', justifyContent:'flex-end', padding:'60px 24px 24px' }}>
      <div style={{ background:'#fff', borderRadius:'12px', width:'320px', maxHeight:'70vh', display:'flex', flexDirection:'column', boxShadow:'0 16px 48px rgba(0,0,0,.18)', animation:'slideIn .2s ease' }}>
        {/* Header */}
        <div style={{ padding:'14px 16px', borderBottom:'1px solid #e3e7ee', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div>
            <div style={{ fontSize:'13px', fontWeight:700, color:'#111827' }}>{label}</div>
            <div style={{ fontSize:'11px', color:'#9ca3af', marginTop:'1px' }}>{filtered.length} transaksi · total {fmt(total)}</div>
          </div>
          <button onClick={onClose} style={{ width:'26px', height:'26px', border:'none', background:'#f3f4f6', borderRadius:'6px', fontSize:'15px', cursor:'pointer', color:'#4b5563' }}>×</button>
        </div>
        {/* List */}
        <div style={{ overflowY:'auto', flex:1 }}>
          {filtered.length === 0 ? (
            <div style={{ padding:'28px 16px', textAlign:'center', color:'#9ca3af', fontSize:'13px' }}>Belum ada transaksi</div>
          ) : (
            filtered.map(t => (
              <div key={t.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 16px', borderBottom:'1px solid #f3f4f6' }}>
                <div style={{ fontSize:'11px', color:'#9ca3af', fontFamily:'JetBrains Mono,monospace', minWidth:'20px', fontWeight:600 }}>{t.date}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:'12.5px', fontWeight:500, color:'#111827', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.note}</div>
                  {t.debt && !t.settled && <span style={{ fontSize:'9.5px', fontWeight:700, background:'#fef3c7', color:'#92400e', padding:'1px 6px', borderRadius:'10px' }}>Debt</span>}
                </div>
                <div style={{ fontSize:'12.5px', fontWeight:700, fontFamily:'JetBrains Mono,monospace', color:'#b91c1c', whiteSpace:'nowrap' }}>
                  -{fmt(t.amt)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <style>{`@keyframes slideIn { from{opacity:0;transform:translateX(12px)} to{opacity:1;transform:none} }`}</style>
    </div>
  )
}

export function RekonModal({ sisaApp, onClose, onSave }: {
  sisaApp: number
  onClose: () => void
  onSave:  (aktual: number, selisih: number, type: 'out'|'inn') => Promise<void>
}) {
  const [aktualStr, setAktualStr] = useState('')
  const [loading,   setLoading]   = useState(false)
  const [done,      setDone]      = useState<string|null>(null)

  const aktual  = parseFloat(aktualStr.replace(/\./g,'').replace(',','.')) || 0
  const selisih = aktual - sisaApp
  const type    = selisih >= 0 ? 'inn' : 'out'

  async function handleSave() {
    if (!aktualStr || Math.abs(selisih) === 0) return
    setLoading(true)
    await onSave(aktual, selisih, type)
    setDone(
      selisih > 0
        ? `Balance surplus ${fmt(selisih)} recorded as income ✓`
        : `Balance deficit ${fmt(Math.abs(selisih))} recorded as expense ✓`
    )
    setLoading(false)
  }

  return (
    <div onClick={e=>{ if(e.target===e.currentTarget) onClose() }}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:800, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
      <div style={{ background:'#fff', borderRadius:'12px', width:'100%', maxWidth:'400px', overflow:'hidden', boxShadow:'0 20px 60px rgba(0,0,0,.2)' }}>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid #e3e7ee' }}>
          <div style={{ fontSize:'15px', fontWeight:700 }}>⚖️ Balance Reconciliation</div>
          <button onClick={onClose} style={{ width:'28px', height:'28px', border:'none', background:'#f7f8fa', borderRadius:'6px', fontSize:'16px', cursor:'pointer', color:'#4b5563' }}>×</button>
        </div>

        <div style={{ padding:'20px', display:'flex', flexDirection:'column', gap:'14px' }}>
          <div style={{ background:'#f7f8fa', border:'1px solid #e3e7ee', borderRadius:'8px', padding:'12px 14px' }}>
            <div style={{ fontSize:'11px', fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:'4px' }}>Balance per app</div>
            <div style={{ fontSize:'18px', fontWeight:700, fontFamily:'JetBrains Mono,monospace', color: sisaApp>=0?'#15803d':'#b91c1c' }}>
              {sisaApp >= 0 ? '' : '-'}{fmt(sisaApp)}
            </div>
          </div>

          {!done && (
            <div>
              <label style={{ display:'block', fontSize:'11px', fontWeight:700, color:'#4b5563', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:'6px' }}>
                Actual cash on hand (Rp)
              </label>
              <input type="number" value={aktualStr} onChange={e=>setAktualStr(e.target.value)}
                placeholder="Enter actual balance..."
                autoFocus
                style={{ width:'100%', padding:'10px 12px', fontSize:'15px', fontWeight:600, fontFamily:'JetBrains Mono,monospace', border:'2px solid #e3e7ee', borderRadius:'8px', outline:'none', background:'#f7f8fa' }}
                onFocus={e=>{ e.target.style.borderColor='#1a5c42'; e.target.style.background='#fff' }}
                onBlur={e=>{ e.target.style.borderColor='#e3e7ee'; e.target.style.background='#f7f8fa' }} />
            </div>
          )}

          {aktualStr && !done && Math.abs(selisih) > 0 && (
            <div style={{ background: type==='out'?'#fef2f2':'#f0fdf4', border:`1px solid ${type==='out'?'#fecaca':'#bbf7d0'}`, borderRadius:'8px', padding:'12px 14px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px' }}>
                <span style={{ fontSize:'12px', fontWeight:600, color:'#4b5563' }}>Difference</span>
                <span style={{ fontSize:'15px', fontWeight:700, fontFamily:'JetBrains Mono,monospace', color: type==='out'?'#b91c1c':'#15803d' }}>
                  {selisih > 0 ? '+' : ''}{fmt(selisih)}
                </span>
              </div>
              <div style={{ fontSize:'12.5px', color: type==='out'?'#b91c1c':'#15803d' }}>
                {type==='out'
                  ? `💸 Cash is less than recorded — will be logged as an expense`
                  : `💰 Cash is more than recorded — will be logged as income`}
              </div>
            </div>
          )}

          {aktualStr && !done && selisih === 0 && (
            <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'8px', padding:'12px 14px', fontSize:'13px', color:'#15803d', fontWeight:500 }}>
              ✓ Balance matches — no adjustment needed!
            </div>
          )}

          {done && (
            <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'8px', padding:'14px', fontSize:'13px', color:'#15803d', fontWeight:500, textAlign:'center' }}>
              <div style={{ fontSize:'24px', marginBottom:'6px' }}>✅</div>
              {done}
            </div>
          )}
        </div>

        <div style={{ padding:'12px 20px', borderTop:'1px solid #e3e7ee', display:'flex', gap:'8px', justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'7px 16px', border:'1px solid #e3e7ee', borderRadius:'6px', background:'transparent', fontSize:'13px', fontWeight:600, cursor:'pointer', color:'#4b5563' }}>
            {done ? 'Close' : 'Cancel'}
          </button>
          {!done && aktualStr && Math.abs(selisih) > 0 && (
            <button onClick={handleSave} disabled={loading}
              style={{ padding:'7px 16px', border:'none', borderRadius:'6px', background: loading?'#9ca3af':'#1a5c42', color:'#fff', fontSize:'13px', fontWeight:600, cursor: loading?'not-allowed':'pointer' }}>
              {loading ? 'Saving...' : '⚖️ Apply Reconciliation'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

