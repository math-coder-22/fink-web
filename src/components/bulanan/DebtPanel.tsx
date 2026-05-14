'use client'

import type { DebtRow } from '@/types/database'

type Props = {
  debt?: DebtRow[]
  onDebtChange: (rows: DebtRow[]) => void
  onRename?: (oldLabel: string, newLabel: string) => void
  isMobile?: boolean
}

const fmtNum = (n: number) => Math.round(n || 0).toLocaleString('id-ID')
const pNum = (v: string) => Number(String(v).replace(/\D/g,'')) || 0

export default function DebtPanel({ debt, onDebtChange, onRename, isMobile }: Props) {
  const rows = Array.isArray(debt) && debt.length ? debt : [{ label:'Debt Payment', plan:0, actual:0 }]
  const totalPlan = rows.reduce((s, r) => s + (r.plan || 0), 0)
  const totalActual = rows.reduce((s, r) => s + (r.actual || 0), 0)

  const inp: React.CSSProperties = {
    border:'none',
    background:'transparent',
    outline:'none',
    color:'#111827',
    fontFamily:'Inter, system-ui, sans-serif',
  }

  function updateRow(i: number, patch: Partial<DebtRow>) {
    onDebtChange(rows.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  }

  function addDebt() {
    onDebtChange([...rows, { label:'New Debt', plan:0, actual:0 }])
  }

  function removeDebt(i: number) {
    if (rows.length <= 1) {
      alert('Minimal harus ada satu Debt Payment.')
      return
    }
    const ok = confirm(`Hapus debt item "${rows[i].label}"?`)
    if (!ok) return
    onDebtChange(rows.filter((_, idx) => idx !== i))
  }

  return (
    <div style={{ marginTop:14, paddingTop:12, borderTop:'1px solid #e3e7ee' }}>
      <div style={{
        fontSize:'10px',
        fontWeight:900,
        color:'#9ca3af',
        textTransform:'uppercase',
        letterSpacing:'.7px',
        margin:'0 0 8px'
      }}>
        Debt Payment
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
        {rows.map((row, i) => (
          <div key={`${row.label}-${i}`} style={{
            display:'grid',
            gridTemplateColumns: isMobile ? '1fr 92px 80px 22px' : '1fr 132px 112px 22px',
            alignItems:'center',
            gap:8,
            border:'1px solid #dfe5ec',
            borderRadius:9,
            padding:'8px 10px',
            background:'#f7f8fa',
          }}>
            <input
              style={{ ...inp, fontSize:12.5, fontWeight:700, minWidth:0 }}
              value={row.label}
              onChange={e => updateRow(i, { label:e.target.value })}
              onBlur={e => {
                const old = rows[i].label
                if (old !== e.target.value && onRename) onRename(old, e.target.value)
              }}
            />
            <input
              type="text"
              inputMode="numeric"
              style={{ ...inp, textAlign:'right', fontFamily:'JetBrains Mono, monospace', fontSize:12, fontWeight:800, color:'#4b5563', width:'100%' }}
              value={row.plan ? fmtNum(row.plan) : ''}
              placeholder="0"
              onChange={e => updateRow(i, { plan:pNum(e.target.value) })}
            />
            <div style={{ textAlign:'right', fontFamily:'JetBrains Mono, monospace', fontSize:12, fontWeight:900, color:(row.actual||0)>0?'#92400e':'#9ca3af' }}>
              {row.actual ? fmtNum(row.actual) : '-'}
            </div>
            <button
              type="button"
              onClick={() => removeDebt(i)}
              title="Hapus debt item"
              style={{ border:'none', background:'transparent', color:'#9ca3af', fontSize:18, cursor:'pointer', lineHeight:1 }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addDebt}
        style={{
          width:'100%',
          marginTop:8,
          border:'1px dashed #cbd5e1',
          background:'#fff',
          color:'#9ca3af',
          borderRadius:9,
          padding:'8px',
          fontSize:12,
          fontWeight:800,
          cursor:'pointer'
        }}
      >
        + add debt item
      </button>

      <div style={{
        display:'grid',
        gridTemplateColumns: isMobile ? '1fr 92px 80px 22px' : '1fr 132px 112px 22px',
        gap:8,
        alignItems:'center',
        marginTop:10,
        border:'1px solid #dfe5ec',
        borderRadius:9,
        padding:'9px 10px',
        background:'#f7f8fa',
      }}>
        <div style={{ fontSize:12.5, fontWeight:900, color:'#4b5563' }}>Total Debt</div>
        <div style={{ textAlign:'right', fontFamily:'JetBrains Mono, monospace', fontSize:12, fontWeight:800, color:'#9ca3af' }}>Rp {fmtNum(totalPlan)}</div>
        <div style={{ textAlign:'right', fontFamily:'JetBrains Mono, monospace', fontSize:12, fontWeight:900, color:'#92400e' }}>Rp {fmtNum(totalActual)}</div>
        <div />
      </div>
    </div>
  )
}
