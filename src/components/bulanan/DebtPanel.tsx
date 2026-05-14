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
  const rows = Array.isArray(debt) && debt.length ? debt : [{ label:'Debt', plan:0, actual:0 }]
  const totalPlan = rows.reduce((s, r) => s + (r.plan || 0), 0)
  const totalActual = rows.reduce((s, r) => s + (r.actual || 0), 0)

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

  const rowGrid = isMobile ? '1fr 104px 92px 22px' : '1fr 132px 112px 22px'

  const labelStyle: React.CSSProperties = {
    border:'none',
    background:'transparent',
    outline:'none',
    color:'#111827',
    fontFamily:'Inter, system-ui, sans-serif',
    fontSize:'13px',
    fontWeight:500,
    minWidth:0,
  }

  const moneyInputStyle: React.CSSProperties = {
    border:'none',
    background:'transparent',
    outline:'none',
    textAlign:'right',
    fontFamily:'JetBrains Mono, monospace',
    fontSize:'12.5px',
    fontWeight:700,
    color:'#4b5563',
    width:'100%',
  }

  const moneyActualStyle = (active: boolean): React.CSSProperties => ({
    textAlign:'right',
    fontFamily:'JetBrains Mono, monospace',
    fontSize:'12.5px',
    fontWeight:700,
    color: active ? '#8a5f2b' : '#9ca3af',
  })

  return (
    <div style={{ marginTop:18, paddingTop:14, borderTop:'1px solid #e3e7ee' }}>
      <div style={{
        fontSize:'10px',
        fontWeight:700,
        color:'#9ca3af',
        textTransform:'uppercase',
        letterSpacing:'.7px',
        margin:'0 0 8px',
        fontFamily:'Inter, system-ui, sans-serif',
      }}>
        Debt Payment
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
        {rows.map((row, i) => (
          <div key={`${row.label}-${i}`} style={{
            display:'grid',
            gridTemplateColumns: rowGrid,
            alignItems:'center',
            gap:8,
            border:'1px solid #dfe5ec',
            borderRadius:9,
            padding:'8px 16px',
            background:'#f7f8fa',
            minHeight:'44px',
          }}>
            <input
              style={labelStyle}
              value={row.label}
              onFocus={e => { e.currentTarget.dataset.oldLabel = row.label }}
              onChange={e => updateRow(i, { label:e.target.value })}
              onBlur={e => {
                const old = e.currentTarget.dataset.oldLabel || row.label
                const next = e.target.value
                if (old && old !== next && onRename) onRename(old, next)
              }}
            />
            <input
              type="text"
              inputMode="numeric"
              style={moneyInputStyle}
              value={row.plan ? fmtNum(row.plan) : ''}
              placeholder="0"
              onChange={e => updateRow(i, { plan:pNum(e.target.value) })}
            />
            <div style={moneyActualStyle((row.actual || 0) > 0)}>
              {row.actual ? fmtNum(row.actual) : '-'}
            </div>
            <button
              type="button"
              onClick={() => removeDebt(i)}
              title="Hapus debt item"
              style={{
                border:'none',
                background:'transparent',
                color:'#9ca3af',
                fontSize:18,
                cursor:'pointer',
                lineHeight:1,
                fontFamily:'Inter, system-ui, sans-serif',
              }}
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
          padding:'9px 16px',
          fontSize:'12px',
          fontWeight:600,
          cursor:'pointer',
          textAlign:'left',
          fontFamily:'Inter, system-ui, sans-serif',
        }}
      >
        + add debt item
      </button>

      <div style={{
        display:'grid',
        gridTemplateColumns: rowGrid,
        gap:8,
        alignItems:'center',
        marginTop:12,
        border:'1px solid #dfe5ec',
        borderRadius:9,
        padding:'9px 16px',
        background:'#f7f8fa',
        minHeight:'44px',
      }}>
        <div style={{
          fontSize:'13px',
          fontWeight:700,
          color:'#4b5563',
          paddingLeft: isMobile ? 0 : 26,
          fontFamily:'Inter, system-ui, sans-serif',
        }}>
          Total Debt
        </div>
        <div style={{
          textAlign:'right',
          fontFamily:'JetBrains Mono, monospace',
          fontSize:'12.5px',
          fontWeight:700,
          color:'#9ca3af',
        }}>
          Rp {fmtNum(totalPlan)}
        </div>
        <div style={{
          textAlign:'right',
          fontFamily:'JetBrains Mono, monospace',
          fontSize:'12.5px',
          fontWeight:700,
          color:'#8a5f2b',
        }}>
          Rp {fmtNum(totalActual)}
        </div>
        <div />
      </div>
    </div>
  )
}
