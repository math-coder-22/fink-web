'use client'

import { useRef, useState } from 'react'
import type { DebtRow } from '@/types/database'

type Props = {
  debt?: DebtRow[]
  onDebtChange: (rows: DebtRow[]) => void
  onRename?: (oldLabel: string, newLabel: string) => void
  isMobile?: boolean
}

const inp: React.CSSProperties = { border:'none', background:'transparent', outline:'none', fontFamily:'inherit' }
const delBtn: React.CSSProperties = { width:'20px', height:'20px', borderRadius:'4px', border:'none', background:'none', color:'#9ca3af', fontSize:'15px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0, opacity:0, transition:'opacity .13s' }

const fmt = (n:number) => 'Rp ' + Math.round(Math.abs(n||0)).toLocaleString('id-ID')
const fmtNum = (n:number) => Math.round(n||0).toLocaleString('id-ID')
const pNum = (v:string) => Number(String(v).replace(/\D/g,'')) || 0

function DragHandle() {
  return (
    <span style={{ width:'6px', flexShrink:0, cursor:'grab', display:'flex', alignItems:'center', justifyContent:'center', touchAction:'none' }} />
  )
}

function AddBtn({ label, onClick }: { label: string; onClick: () => void }) {
  const [hover,setHover]=useState(false)
  return (
    <button style={{ width:'100%', padding:'8px 10px', border:'1.5px dashed #cbd5e1', borderRadius:'6px', background:hover?'#f7f8fa':'none', color:hover?'#4b5563':'#9ca3af', fontSize:'12px', fontWeight:500, cursor:'pointer', marginTop:'6px', transition:'all .13s', textAlign:'left' }}
      onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      onClick={onClick}>{label}</button>
  )
}

export default function DebtPanel({ debt, onDebtChange, onRename, isMobile }: Props) {
  const rows = Array.isArray(debt) && debt.length ? debt : [{ label:'Debt', plan:0, actual:0 }]
  const [hovRow, setHovRow] = useState<string|null>(null)
  const [dragOver, setDragOver] = useState<string|null>(null)
  const debtDragSrc = useRef<number|null>(null)

  const totDebtP = rows.reduce((s,r)=>s+(r.plan||0),0)
  const totDebtA = rows.reduce((s,r)=>s+(r.actual||0),0)

  function onDebtDragStart(e: React.DragEvent, i: number) {
    debtDragSrc.current = i
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('type','debt')
    e.stopPropagation()
  }

  function onDebtDrop(e: React.DragEvent, i: number) {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(null)
    const from = debtDragSrc.current
    if (from === null || from === i) return
    const arr = [...rows]
    const [m] = arr.splice(from,1)
    arr.splice(i,0,m)
    onDebtChange(arr)
    debtDragSrc.current = null
  }

  function updateRow(i:number, patch:Partial<DebtRow>) {
    onDebtChange(rows.map((r,i2)=>i2!==i?r:{...r,...patch}))
  }

  function removeRow(i:number) {
    if (rows.length <= 1) {
      alert('Minimal harus ada satu Debt Payment.')
      return
    }
    const ok = confirm(`Hapus debt item "${rows[i].label}"?`)
    if (!ok) return
    onDebtChange(rows.filter((_,i2)=>i2!==i))
  }

  const amountCell: React.CSSProperties = { width:'116px', minWidth:'116px', maxWidth:'116px', boxSizing:'border-box', textAlign:'right', fontFamily:'var(--font-mono), monospace', whiteSpace:'nowrap' }
  const amountInput: React.CSSProperties = { ...inp, ...amountCell, fontSize:'12px', fontWeight:500, color:'#4b5563' }
  const amountDisplay: React.CSSProperties = { ...amountCell, fontSize:'12px', fontWeight:500 }
  const totalAmountCell: React.CSSProperties = { ...amountCell, fontSize:'11.5px' }
  const totalRow: React.CSSProperties = { display:'flex', alignItems:'center', gap:'5px', border:'1px solid #e3e7ee', borderRadius:'6px', padding:'8px 9px', marginTop:'10px', background:'#f7f8fa' }

  return (
    <div>
      <div style={{ height:'1px', background:'#e3e7ee', margin:'14px 0 10px' }} />
      <div style={{ fontSize:'10px', fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.7px', marginBottom:'8px' }}>Debt Payment</div>

      {rows.map((r,i)=>{
        const dk = `debt-${i}`
        return (
          <div key={i} draggable onDragStart={e=>onDebtDragStart(e,i)}
            onDragOver={e=>{ e.preventDefault(); setDragOver(dk) }}
            onDrop={e=>onDebtDrop(e,i)} onDragLeave={()=>setDragOver(null)}
            style={{ display:'flex', alignItems:'center', gap:'5px', borderRadius:'6px', padding:'7px 9px', marginBottom:'4px', border:'1px solid', borderColor: dragOver===dk?'#92400e':'#e3e7ee', background:'#f7f8fa', cursor:'grab', transition:'border-color .13s' }}
            onMouseEnter={()=>setHovRow(dk)} onMouseLeave={()=>setHovRow(null)}>
            <DragHandle />
            <input style={{ ...inp, flex:1, minWidth:0, fontSize:'13px', fontWeight:600, color:'#111827', cursor:'text' }}
              value={r.label} onMouseDown={e=>e.stopPropagation()} onFocus={e=>{ e.currentTarget.dataset.oldLabel = r.label }}
              onChange={e=>updateRow(i,{label:e.target.value})}
              onBlur={e=>{ const old=e.currentTarget.dataset.oldLabel || ''; if(old && old!==e.target.value && onRename) onRename(old,e.target.value) }} />
            {isMobile ? (
              <div style={{ flex:'2', minWidth:0, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'1px', overflow:'hidden' }}>
                <input style={{ ...inp, fontSize:'9.5px', fontFamily:'var(--font-mono), monospace', color:'#9ca3af', textAlign:'right', width:'100%' }}
                  value={r.plan?fmtNum(r.plan):''} placeholder="0"
                  onMouseDown={e=>e.stopPropagation()} onFocus={e=>e.currentTarget.select()}
                  onBlur={e=>{ const v=pNum(e.currentTarget.value); e.currentTarget.value=v?fmtNum(v):'' }}
                  onChange={e=>updateRow(i,{plan:pNum(e.currentTarget.value)})} />
                <div style={{ fontSize:'11.5px', fontWeight:600, color:'#8a5f2b', fontFamily:'var(--font-mono), monospace', width:'100%', textAlign:'right', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {r.actual ? fmtNum(r.actual) : '-'}
                </div>
              </div>
            ) : (
              <>
                <input style={amountInput}
                  value={r.plan?fmtNum(r.plan):''} placeholder="0"
                  onMouseDown={e=>e.stopPropagation()} onFocus={e=>e.currentTarget.select()}
                  onBlur={e=>{ const v=pNum(e.currentTarget.value); e.currentTarget.value=v?fmtNum(v):'' }}
                  onChange={e=>updateRow(i,{plan:pNum(e.currentTarget.value)})} />
                <div style={{ ...amountDisplay, color:(r.actual||0)>0?'#8a5f2b':'#9ca3af' }}>
                  {r.actual ? fmtNum(r.actual) : '-'}
                </div>
              </>
            )}
            <button style={{ ...delBtn, opacity: hovRow===dk?1:0 }} onMouseDown={e=>e.stopPropagation()}
              onClick={()=>removeRow(i)}>×</button>
          </div>
        )
      })}

      <AddBtn label="+ add debt item" onClick={()=>onDebtChange([...rows,{label:'New Debt',plan:0,actual:0}])} />

      <div style={totalRow}>
        <div style={{ width:'14px' }}/>
        <div style={{ flex:1, fontSize:'12px', fontWeight:600, color:'#4b5563' }}>Total Debt</div>
        {isMobile ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'1px' }}>
            <span style={{ fontSize:'10px', color:'#9ca3af', fontFamily:'var(--font-mono), monospace' }}>{fmt(totDebtP)}</span>
            <span style={{ fontSize:'12px', fontWeight:700, color:'#8a5f2b', fontFamily:'var(--font-mono), monospace' }}>{fmt(totDebtA)}</span>
          </div>
        ) : (
          <>
            <div style={{ ...totalAmountCell, color:'#9ca3af' }}>{fmt(totDebtP)}</div>
            <div style={{ ...totalAmountCell, fontWeight:700, color:'#8a5f2b' }}>{fmt(totDebtA)}</div>
          </>
        )}
        <div style={{ width:'18px' }}/>
      </div>
    </div>
  )
}
