'use client'

import { memo, useRef, useState } from 'react'
import { fmt, fmtNum, pNum } from '@/components/ui/helpers'
import { useSubscription } from '@/hooks/useSubscription'
import { FREE_PLAN_LIMITS, upgradeMessage } from '@/lib/subscription/limits'
import type { IncomeCategory, Transaction } from '@/types/database'
import { AppIcon } from '@/components/ui/design'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

type TxType = Transaction['type']

const ACCENT = '#1a5c42'
const inp: React.CSSProperties = { border:'none', background:'transparent', outline:'none', fontFamily:'inherit' }
const planInp: React.CSSProperties = { ...inp, borderBottom:'1px dotted #cbd5e1', borderRadius:'2px', transition:'border-color .14s, background .14s' }

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
  const [hover, setHover] = useState(false)
  return (
    <button
      type="button"
      onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} onClick={onClick}
      style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', width:'100%', padding:'7px 10px', borderRadius:'9px', border:'1.5px dashed', borderColor: hover?ACCENT:'#c9d2de', background: hover?'#e8f5ef':'transparent', color: hover?ACCENT:'#6b7280', fontSize:'12px', fontWeight:800, cursor:'pointer', marginTop:'6px', transition:'all .13s' }}
    >{label}</button>
  )
}

function MiniAddItem({ onClick }: { onClick: () => void }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      type="button"
      title="Add item to this category"
      onMouseDown={e=>e.stopPropagation()}
      onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      onClick={onClick}
      style={{ border:'none', background:'none', color: hover?ACCENT:'#9ca3af', fontSize:'11px', fontWeight:800, cursor:'pointer', padding:'4px 6px', borderRadius:'6px', whiteSpace:'nowrap', transition:'color .13s' }}
    >+ Item</button>
  )
}

interface Props {
  income:         IncomeCategory[]
  onIncomeChange: (cats: IncomeCategory[]) => void
  onRename:       (oldLabel: string, newLabel: string, type?: TxType) => void
  isMobile?:      boolean
}

type PendingDelete =
  | { kind: 'cat', ci: number, label: string }
  | { kind: 'item', ci: number, ii: number, label: string }

function IncomePanel({ income, onIncomeChange, onRename, isMobile }: Props) {
  const { isPremium, isAdmin, isSuperAdmin } = useSubscription()
  const hasPremiumAccess = isPremium || isAdmin || isSuperAdmin
  const incomeItemCount = income.reduce((sum, cat) => sum + cat.items.filter(item => item.label !== 'Rekonsiliasi').length, 0)
  const [hovRow, setHovRow] = useState<string|null>(null)
  const [dragOver, setDragOver] = useState<string|null>(null)
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)
  const catDragSrc  = useRef<number|null>(null)
  const itemDragSrc = useRef<{ci:number;ii:number}|null>(null)

  function onCatDragStart(e: React.DragEvent, ci: number) { catDragSrc.current=ci; e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('type','cat'); e.stopPropagation() }
  function onCatDrop(e: React.DragEvent, ci: number) { e.preventDefault(); e.stopPropagation(); setDragOver(null); const from=catDragSrc.current; if(from===null||from===ci) return; const next=[...income]; const [m]=next.splice(from,1); next.splice(ci,0,m); onIncomeChange(next); catDragSrc.current=null }
  function onItemDragStart(e: React.DragEvent, ci: number, ii: number) { itemDragSrc.current={ci,ii}; e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('type','item'); e.stopPropagation() }
  function onItemDrop(e: React.DragEvent, toCi: number, toIi: number) { e.preventDefault(); e.stopPropagation(); setDragOver(null); const src=itemDragSrc.current; if(!src) return; if(src.ci===toCi&&src.ii===toIi) return; const next=income.map(c=>({...c,items:[...c.items]})); const [m]=next[src.ci].items.splice(src.ii,1); next[toCi].items.splice(toIi,0,m); onIncomeChange(next); itemDragSrc.current=null }

  function checkItemLimit() {
    if (!hasPremiumAccess && incomeItemCount >= FREE_PLAN_LIMITS.incomeItems) {
      alert(upgradeMessage(`Income item Free maksimal ${FREE_PLAN_LIMITS.incomeItems}`))
      return false
    }
    return true
  }

  function handleAddIncomeCategory() {
    if (!checkItemLimit()) return
    onIncomeChange([...income,{label:'New Category',items:[{label:'New Item',plan:0,actual:0}]}])
  }

  function handleAddIncomeItem(ci: number) {
    if (!checkItemLimit()) return
    onIncomeChange(income.map((c,i)=>i!==ci?c:{...c,items:[...c.items,{label:'New Item',plan:0,actual:0}]}))
  }

  function confirmDelete() {
    const p = pendingDelete
    setPendingDelete(null)
    if (!p) return
    if (p.kind === 'cat') onIncomeChange(income.filter((_,i)=>i!==p.ci))
    else onIncomeChange(income.map((c,ci)=>ci!==p.ci?c:{...c,items:c.items.filter((_,ii)=>ii!==p.ii)}))
  }

  const totP = income.reduce((s,c)=>s+c.items.reduce((ss,i)=>ss+(i.plan||0),0),0)
  const totA = income.reduce((s,c)=>s+c.items.reduce((ss,i)=>ss+(i.actual||0),0),0)

  const totalRow: React.CSSProperties = { display:'flex', alignItems:'center', gap:'6px', background:'#f7f8fa', border:'1px solid #e3e7ee', borderRadius:'10px', padding:'7px 9px', marginTop:'8px' }

  const renderPlanActual = (planNode: React.ReactNode, actualNode: React.ReactNode) => isMobile ? (
    <div style={{ flex:'2', minWidth:0, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'0', overflow:'hidden' }}>
      {planNode}{actualNode}
    </div>
  ) : (<>{planNode}{actualNode}</>)

  return (
    <div>
      {income.map((cat, ci) => {
        const catP = cat.items.reduce((s,i)=>s+(i.plan||0),0)
        const catA = cat.items.reduce((s,i)=>s+(i.actual||0),0)
        const pct  = catP>0 ? Math.min(120,(catA/catP)*100) : (catA>0?100:0)
        const clr  = pct>=85 && pct<100 ? '#a16207' : ACCENT
        const hk   = `cat-${ci}`
        const hov  = hovRow===hk

        return (
          <div key={ci} style={{ marginBottom:'10px' }}
            onDragOver={e=>{ e.preventDefault(); e.stopPropagation(); setDragOver(hk) }}
            onDrop={e=>{ if(e.dataTransfer.getData('type')==='cat') onCatDrop(e,ci); else e.stopPropagation() }}
            onDragLeave={()=>setDragOver(null)}>

            {/* Category header — slim, no card */}
            <div draggable={!isMobile} onDragStart={e=>onCatDragStart(e,ci)}
              onMouseEnter={()=>setHovRow(hk)} onMouseLeave={()=>setHovRow(null)}
              style={{ display:'flex', alignItems:'center', gap:'6px', padding:'5px 2px', borderBottom: dragOver===hk?`2px solid ${ACCENT}`:'2px solid transparent', cursor: isMobile?'default':'grab' }}>
              {!isMobile && <DragHandle visible={hov || dragOver===hk} />}
              <input style={{ ...inp, flex:1, minWidth:0, fontSize:'13px', fontWeight:700, color:'#111827', cursor:'text' }}
                value={cat.label} onMouseDown={e=>e.stopPropagation()}
                onChange={e=>onIncomeChange(income.map((c,ci2)=>ci2!==ci?c:{...c,label:e.target.value}))} />
              {renderPlanActual(
                <span style={{ width: isMobile?'100%':'100px', flexShrink:0, fontSize: isMobile?'9.5px':'11.5px', color:'#9ca3af', textAlign:'right', fontFamily:'var(--font-mono), monospace', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{fmt(catP)}</span>,
                <span style={{ width: isMobile?'100%':'100px', flexShrink:0, fontSize:'11.5px', fontWeight:700, textAlign:'right', fontFamily:'var(--font-mono), monospace', color:clr, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{fmt(catA)}</span>
              )}
              <MiniAddItem onClick={()=>handleAddIncomeItem(ci)} />
              <DelBtn visible={hov} isMobile={isMobile} title="Delete income category"
                onClick={()=>setPendingDelete({ kind:'cat', ci, label:cat.label })} />
            </div>

            {/* Progress bar */}
            <div style={{ height:'3px', background:'#eef1f5', borderRadius:'2px', margin:'0 0 2px' }}>
              <div style={{ height:'3px', borderRadius:'2px', background:clr, width:`${Math.min(100,pct)}%`, transition:'width .3s' }} />
            </div>

            {/* Items — clean divider rows */}
            <div style={{ paddingLeft:'14px' }}>
              {cat.items.map((item, ii) => {
                const ik = `item-${ci}-${ii}`
                const ihov = hovRow===ik
                const isRekon = item.label === 'Reconciliation' || item.label === 'Rekonsiliasi'
                const actColor = (item.actual||0)>0 ? (isRekon?'#a16207':ACCENT) : '#9ca3af'
                return (
                  <div key={ii} draggable={!isMobile} onDragStart={e=>onItemDragStart(e,ci,ii)}
                    onDragOver={e=>{ e.preventDefault(); e.stopPropagation(); setDragOver(ik) }}
                    onDrop={e=>{ e.stopPropagation(); onItemDrop(e,ci,ii) }}
                    onDragLeave={()=>setDragOver(null)}
                    onMouseEnter={()=>setHovRow(ik)} onMouseLeave={()=>setHovRow(null)}
                    style={{ display:'flex', alignItems:'center', gap:'6px', padding:'6px 2px', borderBottom: ii<cat.items.length-1?'1px solid #f1f4f8':'none', borderTop: dragOver===ik?`2px solid ${ACCENT}`:'2px solid transparent', cursor: isMobile?'default':'grab' }}>
                    {!isMobile && <DragHandle visible={ihov || dragOver===ik} />}
                    <input style={{ ...inp, flex:1, minWidth:0, fontSize:'12.5px', color:'#4b5563', cursor:'text' }}
                      value={item.label} onMouseDown={e=>e.stopPropagation()} onFocus={e=>{ e.currentTarget.dataset.oldLabel = item.label }}
                      onChange={e=>onIncomeChange(income.map((c,ci2)=>ci2!==ci?c:{...c,items:c.items.map((it,ii2)=>ii2!==ii?it:{...it,label:e.target.value})}))}
                      onBlur={e=>{ const old=e.currentTarget.dataset.oldLabel || ''; if(old && old!==e.target.value) onRename(old,e.target.value,'inn') }} />
                    {isMobile ? (
                      <div style={{ flex:'2', minWidth:0, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'0', overflow:'hidden' }}>
                        <input style={{ ...planInp, fontSize:'9.5px', fontFamily:'var(--font-mono), monospace', color:'#9ca3af', textAlign:'right', width:'100%', padding:'2px 3px' }}
                          defaultValue={item.plan?fmtNum(item.plan):''} placeholder="0"
                          key={`incplan-${ci}-${ii}-${item.plan}`}
                          onMouseDown={e=>e.stopPropagation()}
                          onFocus={e=>{ e.target.value=item.plan?String(item.plan):''; e.target.select() }}
                          onBlur={e=>{ const v=pNum(e.target.value); onIncomeChange(income.map((c,ci2)=>ci2!==ci?c:{...c,items:c.items.map((it,ii2)=>ii2!==ii?it:{...it,plan:v})})); e.target.value=v?fmtNum(v):'' }}
                          onChange={()=>{}} />
                        <div style={{ fontSize:'11.5px', fontWeight:600, fontFamily:'var(--font-mono), monospace', color:actColor, width:'100%', textAlign:'right', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                          {(item.actual||0)>0 ? fmtNum(item.actual) : '-'}
                        </div>
                      </div>
                    ) : (
                      <>
                        <input style={{ ...planInp, minWidth:'100px', fontSize:'12px', fontWeight:500, textAlign:'right', fontFamily:'var(--font-mono), monospace', color:'#4b5563', whiteSpace:'nowrap', padding:'2px 6px' }}
                          defaultValue={item.plan?fmtNum(item.plan):''} placeholder="0"
                          key={`iplan-${ci}-${ii}-${item.plan}`}
                          onMouseDown={e=>e.stopPropagation()}
                          onFocus={e=>{ e.target.value=item.plan?String(item.plan):''; e.target.select() }}
                          onBlur={e=>{ const v=pNum(e.target.value); onIncomeChange(income.map((c,ci2)=>ci2!==ci?c:{...c,items:c.items.map((it,ii2)=>ii2!==ii?it:{...it,plan:v})})); e.target.value=v?fmtNum(v):'' }}
                          onChange={()=>{}} />
                        <div style={{ minWidth:'100px', fontSize:'12px', fontWeight:600, textAlign:'right', fontFamily:'var(--font-mono), monospace', whiteSpace:'nowrap', color:actColor }}>
                          {(item.actual||0)>0 ? fmtNum(item.actual) : '-'}
                        </div>
                      </>
                    )}
                    <DelBtn visible={ihov} isMobile={isMobile} title="Delete income item"
                      onClick={()=>setPendingDelete({ kind:'item', ci, ii, label:item.label })} />
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      <AddBtn label="+ add category" onClick={handleAddIncomeCategory} />

      {/* Total */}
      <div style={totalRow}>
        <div style={{ flex:1, fontSize:'12px', fontWeight:700, color:'#111827' }}>Total Income</div>
        {renderPlanActual(
          <div style={{ width: isMobile?'auto':'100px', flexShrink:0, textAlign:'right', fontSize: isMobile?'10px':'11.5px', color:'#9ca3af', fontFamily:'var(--font-mono), monospace', whiteSpace:'nowrap' }}>{fmt(totP)}</div>,
          <div style={{ width: isMobile?'auto':'100px', flexShrink:0, textAlign:'right', fontSize: isMobile?'12px':'11.5px', fontWeight:700, color:ACCENT, fontFamily:'var(--font-mono), monospace', whiteSpace:'nowrap' }}>{fmt(totA)}</div>
        )}
      </div>

      {pendingDelete && (
        <ConfirmDialog
          title={pendingDelete.kind==='cat' ? 'Delete income category?' : 'Delete income item?'}
          message={<>Delete <strong style={{ color:'#111827' }}>“{pendingDelete.label}”</strong>{pendingDelete.kind==='cat' ? ' and all its items' : ''}? This cannot be undone.</>}
          onConfirm={confirmDelete}
          onCancel={()=>setPendingDelete(null)}
        />
      )}
    </div>
  )
}

// Memoized: skips re-render when parent re-renders with unchanged props.
export default memo(IncomePanel)
