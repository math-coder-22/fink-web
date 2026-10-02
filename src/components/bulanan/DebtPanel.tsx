'use client'

import { useRef, useState } from 'react'
import { useSubscription } from '@/hooks/useSubscription'
import { FREE_PLAN_LIMITS, upgradeMessage } from '@/lib/subscription/limits'
import type { DebtRow, Transaction } from '@/types/database'
import { AppIcon } from '@/components/ui/design'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

type TxType = Transaction['type']

type Props = {
  debt?: DebtRow[]
  onDebtChange: (rows: DebtRow[]) => void
  onRename?: (oldLabel: string, newLabel: string, type?: TxType) => void
  isMobile?: boolean
}

const ACCENT = '#1a5c42'
const inp: React.CSSProperties = { border:'none', background:'transparent', outline:'none', fontFamily:'inherit' }
const planInp: React.CSSProperties = { ...inp, borderBottom:'1px dotted #cbd5e1', borderRadius:'2px', transition:'border-color .14s, background .14s' }

const fmt = (n:number) => 'Rp ' + Math.round(Math.abs(n||0)).toLocaleString('id-ID')
const fmtNum = (n:number) => Math.round(n||0).toLocaleString('id-ID')
const pNum = (v:string) => Number(String(v).replace(/\D/g,'')) || 0

function DragHandle({ visible }: { visible: boolean }) {
  return (
    <span
      title="Drag to reorder"
      style={{
        width:'14px', flexShrink:0, cursor:'grab', display:'flex', alignItems:'center', justifyContent:'center',
        touchAction:'none', color:'#94a3b8', fontSize:'12px', lineHeight:1,
        opacity: visible ? .8 : 0, transition:'opacity .13s', userSelect:'none',
      }}
    >⠿</span>
  )
}

function DelBtn({ visible, title, onClick, isMobile }: {
  visible: boolean; title: string; onClick: () => void; isMobile?: boolean
}) {
  const show = visible || !!isMobile
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onMouseDown={e=>e.stopPropagation()}
      onClick={onClick}
      style={{
        width:'22px', height:'22px', borderRadius:'6px', border:'none', background:'none',
        color:'#9ca3af', display:'flex', alignItems:'center', justifyContent:'center',
        cursor:'pointer', flexShrink:0, opacity: show ? (visible ? 1 : .45) : 0, transition:'opacity .13s',
        pointerEvents: show ? 'auto' : 'none',
      }}
    ><AppIcon name="trash" size={12} /></button>
  )
}

function AddBtn({ label, onClick }: { label: string; onClick: () => void }) {
  const [hover,setHover]=useState(false)
  return (
    <button
      type="button"
      onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} onClick={onClick}
      style={{ width:'100%', padding:'7px 10px', border:'1.5px dashed', borderColor: hover?ACCENT:'#c9d2de', borderRadius:'9px', background: hover?'#e8f5ef':'transparent', color: hover?ACCENT:'#6b7280', fontSize:'12px', fontWeight:800, cursor:'pointer', marginTop:'6px', transition:'all .13s', textAlign:'center' }}
    >{label}</button>
  )
}

export default function DebtPanel({ debt, onDebtChange, onRename, isMobile }: Props) {
  const { isPremium, isAdmin, isSuperAdmin } = useSubscription()
  const hasPremiumAccess = isPremium || isAdmin || isSuperAdmin
  const rows = Array.isArray(debt) && debt.length ? debt : [{ label:'Debt', plan:0, actual:0 }]
  const [hovRow, setHovRow] = useState<string|null>(null)
  const [dragOver, setDragOver] = useState<string|null>(null)
  const [pendingDelete, setPendingDelete] = useState<number | null>(null)
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

  function requestRemoveRow(i:number) {
    if (rows.length <= 1) {
      alert('At least one debt item is required.')
      return
    }
    setPendingDelete(i)
  }

  function confirmRemoveRow() {
    const i = pendingDelete
    setPendingDelete(null)
    if (i === null) return
    onDebtChange(rows.filter((_,i2)=>i2!==i))
  }

  function handleAddDebtItem() {
    const debtItemCount = rows.filter(item => item.label !== 'Rekonsiliasi').length
    if (!hasPremiumAccess && debtItemCount >= FREE_PLAN_LIMITS.debtItems) {
      alert(upgradeMessage(`Debt item Free maksimal ${FREE_PLAN_LIMITS.debtItems}`))
      return
    }
    onDebtChange([...rows,{label:'New Debt',plan:0,actual:0}])
  }

  const totalRow: React.CSSProperties = { display:'flex', alignItems:'center', gap:'6px', border:'1px solid #e3e7ee', borderRadius:'10px', padding:'7px 9px', marginTop:'8px', background:'#f7f8fa' }
  const sectionTitle: React.CSSProperties = { fontSize:'10px', fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.7px', marginBottom:'4px' }

  return (
    <div>
      <div style={{ height:'1px', background:'#e3e7ee', margin:'12px 0 8px' }} />
      <div style={sectionTitle}>Debt Payment</div>

      {rows.map((r,i)=>{
        const dk = `debt-${i}`
        const dhov = hovRow===dk
        return (
          <div key={i} draggable={!isMobile} onDragStart={e=>onDebtDragStart(e,i)}
            onDragOver={e=>{ e.preventDefault(); setDragOver(dk) }}
            onDrop={e=>onDebtDrop(e,i)} onDragLeave={()=>setDragOver(null)}
            onMouseEnter={()=>setHovRow(dk)} onMouseLeave={()=>setHovRow(null)}
            style={{ display:'flex', alignItems:'center', gap:'6px', padding:'6px 2px', borderBottom: i<rows.length-1?'1px solid #f1f4f8':'none', borderTop: dragOver===dk?`2px solid ${ACCENT}`:'2px solid transparent', cursor: isMobile?'default':'grab' }}>
            {!isMobile && <DragHandle visible={dhov || dragOver===dk} />}
            <input style={{ ...inp, flex:1, minWidth:0, fontSize:'13px', fontWeight:600, color:'#111827', cursor:'text' }}
              value={r.label} onMouseDown={e=>e.stopPropagation()} onFocus={e=>{ e.currentTarget.dataset.oldLabel = r.label }}
              onChange={e=>updateRow(i,{label:e.target.value})}
              onBlur={e=>{ const old=e.currentTarget.dataset.oldLabel || ''; if(old && old!==e.target.value && onRename) onRename(old,e.target.value,'out') }} />
            {isMobile ? (
              <div style={{ flex:'2', minWidth:0, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'0', overflow:'hidden' }}>
                <input style={{ ...planInp, fontSize:'9.5px', fontFamily:'var(--font-mono), monospace', color:'#9ca3af', textAlign:'right', width:'100%', padding:'2px 3px' }}
                  value={r.plan?fmtNum(r.plan):''} placeholder="0"
                  onMouseDown={e=>e.stopPropagation()} onFocus={e=>e.target.select()}
                  onBlur={e=>{ const v=pNum(e.currentTarget.value); e.currentTarget.value=v?fmtNum(v):'' }}
                  onChange={e=>updateRow(i,{plan:pNum(e.currentTarget.value)})} />
                <div style={{ fontSize:'11.5px', fontWeight:600, color:ACCENT, fontFamily:'var(--font-mono), monospace', width:'100%', textAlign:'right', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {r.actual ? fmtNum(r.actual) : '-'}
                </div>
              </div>
            ) : (
              <>
                <input style={{ ...planInp, width:'100px', flexShrink:0, fontSize:'12px', fontWeight:500, textAlign:'right', fontFamily:'var(--font-mono), monospace', color:'#4b5563', whiteSpace:'nowrap', padding:'2px 6px' }}
                  value={r.plan?fmtNum(r.plan):''} placeholder="0"
                  onMouseDown={e=>e.stopPropagation()} onFocus={e=>e.target.select()}
                  onBlur={e=>{ const v=pNum(e.currentTarget.value); e.currentTarget.value=v?fmtNum(v):'' }}
                  onChange={e=>updateRow(i,{plan:pNum(e.currentTarget.value)})} />
                <div style={{ width:'100px', flexShrink:0, fontSize:'12px', fontWeight:500, textAlign:'right', fontFamily:'var(--font-mono), monospace', color:(r.actual||0)>0?ACCENT:'#9ca3af', whiteSpace:'nowrap' }}>
                  {r.actual ? fmtNum(r.actual) : '-'}
                </div>
              </>
            )}
            <DelBtn visible={dhov} isMobile={isMobile} title="Delete debt item"
              onClick={()=>requestRemoveRow(i)} />
          </div>
        )
      })}

      <AddBtn label="+ add debt item" onClick={handleAddDebtItem} />

      <div style={totalRow}>
        <div style={{ flex:1, fontSize:'12px', fontWeight:700, color:'#111827' }}>Total Debt</div>
        {isMobile ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'0' }}>
            <span style={{ fontSize:'10px', color:'#9ca3af', fontFamily:'var(--font-mono), monospace' }}>{fmt(totDebtP)}</span>
            <span style={{ fontSize:'12px', fontWeight:700, color:ACCENT, fontFamily:'var(--font-mono), monospace' }}>{fmt(totDebtA)}</span>
          </div>
        ) : (
          <>
            <div style={{ width:'100px', flexShrink:0, textAlign:'right', fontSize:'11.5px', color:'#9ca3af', fontFamily:'var(--font-mono), monospace', whiteSpace:'nowrap' }}>{fmt(totDebtP)}</div>
            <div style={{ width:'100px', flexShrink:0, textAlign:'right', fontSize:'11.5px', fontWeight:700, color:ACCENT, fontFamily:'var(--font-mono), monospace', whiteSpace:'nowrap' }}>{fmt(totDebtA)}</div>
          </>
        )}
      </div>

      {pendingDelete !== null && (
        <ConfirmDialog
          title="Delete debt item?"
          message={<>Delete <strong style={{ color:'#111827' }}>“{rows[pendingDelete]?.label}”</strong>? This cannot be undone.</>}
          onConfirm={confirmRemoveRow}
          onCancel={()=>setPendingDelete(null)}
        />
      )}
    </div>
  )
}
