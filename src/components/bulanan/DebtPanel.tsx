'use client'

import type { DebtRow } from '@/types/database'

type Props = {
  debt: DebtRow[]
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
    <div style={{ marginTop:12 }}>
      <div style={{
        border:'1px solid #e3e7ee',
        borderRadius:'12px',
        overflow:'hidden',
        background:'#fff',
      }}>
        <div style={{
          display:'flex',
          alignItems:'center',
          justifyContent:'space-between',
          gap:10,
          padding:'10px 12px',
          background:'#fffbeb',
          borderBottom:'1px solid #fde68a',
        }}>
          <div>
            <div style={{ fontSize:13, fontWeight:900, color:'#92400e' }}>🏦 Debt Payment</div>
            <div style={{ fontSize:10.5, color:'#b45309', marginTop:2 }}>Cicilan/hutang finansial, bukan transaksi unpaid</div>
          </div>
          <div style={{ textAlign:'right', fontFamily:'JetBrains Mono, monospace', fontWeight:800, fontSize:11.5, color:'#92400e' }}>
            <div>Plan Rp {fmtNum(totalPlan)}</div>
            <div>Actual Rp {fmtNum(totalActual)}</div>
          </div>
        </div>

        <div style={{ padding:'8px 10px', display:'flex', flexDirection:'column', gap:6 }}>
          {rows.map((row, i) => (
            <div key={`${row.label}-${i}`} style={{
              display:'grid',
              gridTemplateColumns: isMobile ? '1fr 88px 88px 24px' : '1fr 120px 120px 24px',
              alignItems:'center',
              gap:8,
              border:'1px solid #e3e7ee',
              borderRadius:9,
              padding:'8px 9px',
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
                style={{ ...inp, textAlign:'right', fontFamily:'JetBrains Mono, monospace', fontSize:12, fontWeight:700, color:'#4b5563', width:'100%' }}
                defaultValue={row.plan ? fmtNum(row.plan) : ''}
                placeholder="0"
                onFocus={e => { e.currentTarget.value = row.plan ? String(row.plan) : ''; e.currentTarget.select() }}
                onBlur={e => {
                  const v = pNum(e.currentTarget.value)
                  updateRow(i, { plan:v })
                  e.currentTarget.value = v ? fmtNum(v) : ''
                }}
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

        <div style={{ padding:'0 10px 10px' }}>
          <button
            type="button"
            onClick={addDebt}
            style={{
              width:'100%',
              border:'1px dashed #d6d3d1',
              background:'#fff',
              color:'#92400e',
              borderRadius:9,
              padding:'8px',
              fontSize:12,
              fontWeight:800,
              cursor:'pointer'
            }}
          >
            + add debt item
          </button>
        </div>
      </div>
    </div>
  )
}
