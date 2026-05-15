'use client'

import { useRef, useState } from 'react'
import { fmt, fmtNum, pNum } from '@/components/ui/helpers'
import { useSubscription } from '@/hooks/useSubscription'
import { FREE_PLAN_LIMITS, upgradeMessage } from '@/lib/subscription/limits'
import type { IncomeCategory } from '@/types/database'
import { AppIcon } from '@/components/ui/design'

const inp: React.CSSProperties = { border:'none', background:'transparent', outline:'none', fontFamily:'inherit' }
const delBtn: React.CSSProperties = { width:'20px', height:'20px', borderRadius:'4px', border:'none', background:'none', color:'#9ca3af', fontSize:'15px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0, opacity:0, transition:'opacity .13s' }

function DragHandle() {
  return (
    <span style={{ width:'6px', flexShrink:0, cursor:'grab', display:'flex', alignItems:'center', justifyContent:'center' }} />
  )
}

function AddBtn({ label, onClick }: { label: string; onClick: () => void }) {
  const [hover, setHover] = useState(false)
  return (
    <button style={{ display:'flex', alignItems:'center', gap:'5px', width:'100%', padding:'7px 9px', borderRadius:'6px', border:'1.5px dashed', borderColor: hover?'#1a5c42':'#c9d2de', background: hover?'#e8f5ef':'none', color: hover?'#1a5c42':'#9ca3af', fontSize:'12px', fontWeight:500, cursor:'pointer', marginTop:'6px', transition:'all .13s' }}
      onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      onClick={onClick}>{label}</button>
  )
}

interface Props {
  income:         IncomeCategory[]
  onIncomeChange: (cats: IncomeCategory[]) => void
  onRename:       (oldLabel: string, newLabel: string) => void
  isMobile?:      boolean
}

export default function IncomePanel({ income, onIncomeChange, onRename, isMobile }: Props) {
  const { isPremium } = useSubscription()
  const [hovRow,   setHovRow]   = useState<string|null>(null)
  const [dragOver, setDragOver] = useState<string|null>(null)
  const catDragSrc  = useRef<number|null>(null)
  const itemDragSrc = useRef<{ci:number;ii:number}|null>(null)

  function onCatDragStart(e: React.DragEvent, ci: number) { catDragSrc.current=ci; e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('type','cat'); e.stopPropagation() }
  function onCatDrop(e: React.DragEvent, ci: number) { e.preventDefault(); e.stopPropagation(); setDragOver(null); const from=catDragSrc.current; if(from===null||from===ci) return; const next=[...income]; const [m]=next.splice(from,1); next.splice(ci,0,m); onIncomeChange(next); catDragSrc.current=null }
  function onItemDragStart(e: React.DragEvent, ci: number, ii: number) { itemDragSrc.current={ci,ii}; e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('type','item'); e.stopPropagation() }
  function onItemDrop(e: React.DragEvent, toCi: number, toIi: number) { e.preventDefault(); e.stopPropagation(); setDragOver(null); const src=itemDragSrc.current; if(!src) return; if(src.ci===toCi&&src.ii===toIi) return; const next=income.map(c=>({...c,items:[...c.items]})); const [m]=next[src.ci].items.splice(src.ii,1); next[toCi].items.splice(toIi,0,m); onIncomeChange(next); itemDragSrc.current=null }


  function handleAddIncomeCategory() {
    if (!isPremium && income.length >= FREE_PLAN_LIMITS.incomeCategories) {
      alert(upgradeMessage(`Kategori income Free maksimal ${FREE_PLAN_LIMITS.incomeCategories}`))
      return
    }
    onIncomeChange([...income,{label:'New Category',items:[{label:'New Item',plan:0,actual:0}]}])
  }

  const totP = income.reduce((s,c)=>s+c.items.reduce((ss,i)=>ss+(i.plan||0),0),0)
  const totA = income.reduce((s,c)=>s+c.items.reduce((ss,i)=>ss+(i.actual||0),0),0)

  const rowBase: React.CSSProperties = { display:'flex', alignItems:'center', gap:'5px', borderRadius:'6px', padding:'7px 9px', marginBottom:'4px', border:'1px solid #e3e7ee', transition:'border-color .13s' }

  return (
    <div>
      {income.map((cat, ci) => {
        const catP = cat.items.reduce((s,i)=>s+(i.plan||0),0)
        const catA = cat.items.reduce((s,i)=>s+(i.actual||0),0)
        const pct  = catP>0 ? Math.min(120,(catA/catP)*100) : (catA>0?100:0)
        const clr  = pct>=100?'#15803d':pct>=85?'#a16207':'#15803d'
        const hk   = `cat-${ci}`

        return (
          <div key={ci} style={{ marginBottom:'6px' }}
            onDragOver={e=>{ e.preventDefault(); e.stopPropagation(); setDragOver(hk) }}
            onDrop={e=>{ if(e.dataTransfer.getData('type')==='cat') onCatDrop(e,ci); else e.stopPropagation() }}
            onDragLeave={()=>setDragOver(null)}>

            {/* Category header */}
            <div draggable onDragStart={e=>onCatDragStart(e,ci)}
              style={{ ...rowBase, background:'#fff', cursor:'grab', borderColor: dragOver===hk?'#15803d':'#e3e7ee', borderWidth: dragOver===hk?'2px':'1px' }}
              onMouseEnter={()=>setHovRow(hk)} onMouseLeave={()=>setHovRow(null)}>
              <DragHandle />
              <input style={{ ...inp, flex:1, minWidth:0, fontSize:'13px', fontWeight:600, color:'#111827', cursor:'text' }}
                value={cat.label} onMouseDown={e=>e.stopPropagation()}
                onChange={e=>onIncomeChange(income.map((c,ci2)=>ci2!==ci?c:{...c,label:e.target.value}))} />
              {isMobile ? (
                <div style={{ flex:'2', minWidth:0, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'1px', overflow:'hidden' }}>
                  <span style={{ fontSize:'9.5px', color:'#9ca3af', fontFamily:'var(--font-mono), monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', width:'100%', textAlign:'right' }}>{fmt(catP)}</span>
                  <span style={{ fontSize:'11.5px', fontWeight:700, color:clr, fontFamily:'var(--font-mono), monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', width:'100%', textAlign:'right' }}>{fmt(catA)}</span>
                </div>
              ) : (
                <>
                  <span style={{ minWidth:'100px', fontSize:'11.5px', color:'#9ca3af', textAlign:'right', fontFamily:'var(--font-mono), monospace', whiteSpace:'nowrap' }}>{fmt(catP)}</span>
                  <span style={{ minWidth:'100px', fontSize:'11.5px', fontWeight:600, textAlign:'right', fontFamily:'var(--font-mono), monospace', color:clr, whiteSpace:'nowrap' }}>{fmt(catA)}</span>
                </>
              )}
              <button
                style={{ ...delBtn, opacity: hovRow===hk?1:0 }}
                title="Hapus kategori income"
                onMouseDown={e=>e.stopPropagation()}
                onClick={()=>{
                  const ok = confirm(`Hapus kategori income "${cat.label}" beserta semua item di dalamnya?`)
                  if (!ok) return
                  onIncomeChange(income.filter((_,ci2)=>ci2!==ci))
                }}
               aria-label="Remove"><AppIcon name="trash" size={13} /></button>
            </div>

            {/* Progress bar */}
            <div style={{ height:'2px', background:'#e3e7ee', borderRadius:'1px', margin:'-2px 0 5px 22px' }}>
              <div style={{ height:'2px', borderRadius:'1px', background:clr, width:`${Math.min(100,pct)}%`, transition:'width .3s' }} />
            </div>

            {/* Items */}
            <div style={{ paddingLeft:'16px' }}>
              {cat.items.map((item, ii) => {
                const ik = `item-${ci}-${ii}`
                const isRekon = item.label === 'Reconciliation' || item.label === 'Rekonsiliasi'
                return (
                  <div key={ii} draggable onDragStart={e=>onItemDragStart(e,ci,ii)}
                    onDragOver={e=>{ e.preventDefault(); e.stopPropagation(); setDragOver(ik) }}
                    onDrop={e=>{ e.stopPropagation(); onItemDrop(e,ci,ii) }}
                    onDragLeave={()=>setDragOver(null)}
                    style={{ ...rowBase, background:'#f7f8fa', cursor:'grab', borderColor: dragOver===ik?'#15803d':'#e3e7ee', borderWidth: dragOver===ik?'2px':'1px' }}
                    onMouseEnter={()=>setHovRow(ik)} onMouseLeave={()=>setHovRow(null)}>
                    <DragHandle />
                    <span style={{ width:'10px', fontSize:'9px', color:'#9ca3af', textAlign:'center', flexShrink:0 }}>└</span>

                    {isMobile ? (
                      /* Mobile: flex ratio — label:angka = 3:2 */
                      <>
                        <div style={{ flex:'3', minWidth:0, overflow:'hidden' }}>
                          <input style={{ ...inp, width:'100%', fontSize:'11.5px', color:'#4b5563', cursor:'text' }}
                            value={item.label} onMouseDown={e=>e.stopPropagation()} onFocus={e=>{ e.currentTarget.dataset.oldLabel = item.label }}
                            onChange={e=>onIncomeChange(income.map((c,ci2)=>ci2!==ci?c:{...c,items:c.items.map((it,ii2)=>ii2!==ii?it:{...it,label:e.target.value})}))}
                            onBlur={e=>{ const old=e.currentTarget.dataset.oldLabel || ''; if(old && old!==e.target.value) onRename(old,e.target.value) }} />
                        </div>
                        <div style={{ flex:'2', minWidth:0, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'1px', overflow:'hidden' }}>
                          <input style={{ ...inp, fontSize:'9.5px', fontFamily:'var(--font-mono), monospace', color:'#9ca3af', textAlign:'right', width:'100%' }}
                            defaultValue={item.plan?fmtNum(item.plan):''} placeholder="0"
                            key={`incplan-${ci}-${ii}-${item.plan}`}
                            onMouseDown={e=>e.stopPropagation()}
                            onFocus={e=>{ e.target.value=item.plan?String(item.plan):''; e.target.select() }}
                            onBlur={e=>{ const v=pNum(e.target.value); onIncomeChange(income.map((c,ci2)=>ci2!==ci?c:{...c,items:c.items.map((it,ii2)=>ii2!==ii?it:{...it,plan:v})})); e.target.value=v?fmtNum(v):'' }}
                            onChange={()=>{}} />
                          <div style={{ fontSize:'11.5px', fontWeight:600, fontFamily:'var(--font-mono), monospace', color: (item.actual||0)>0?(isRekon?'#a16207':'#15803d'):'#9ca3af', width:'100%', textAlign:'right', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                            {(item.actual||0)>0 ? fmtNum(item.actual) : '-'}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <input style={{ ...inp, flex:1, fontSize:'12.5px', color:'#4b5563', cursor:'text' }}
                          value={item.label} onMouseDown={e=>e.stopPropagation()}
                          onChange={e=>onIncomeChange(income.map((c,ci2)=>ci2!==ci?c:{...c,items:c.items.map((it,ii2)=>ii2!==ii?it:{...it,label:e.target.value})}))}
                          onBlur={e=>{ const old=e.currentTarget.dataset.oldLabel || ''; if(old && old!==e.target.value) onRename(old,e.target.value) }} />
                        <input style={{ ...inp, minWidth:'100px', fontSize:'12px', fontWeight:500, textAlign:'right', fontFamily:'var(--font-mono), monospace', color:'#4b5563', whiteSpace:'nowrap' }}
                          value={item.plan?fmtNum(item.plan):''} placeholder="0"
                          onMouseDown={e=>e.stopPropagation()} onFocus={e=>e.target.select()}
                          onBlur={e=>{ const v=pNum(e.target.value); e.target.value=v?fmtNum(v):'' }}
                          onChange={e=>onIncomeChange(income.map((c,ci2)=>ci2!==ci?c:{...c,items:c.items.map((it,ii2)=>ii2!==ii?it:{...it,plan:pNum(e.target.value)})}))} />
                        <div style={{ minWidth:'100px', fontSize:'12px', fontWeight:600, textAlign:'right', fontFamily:'var(--font-mono), monospace', whiteSpace:'nowrap', color: (item.actual||0)>0?(isRekon?'#a16207':'#15803d'):'#9ca3af' }}>
                          {(item.actual||0)>0 ? fmtNum(item.actual) : '-'}
                        </div>
                      </>
                    )}
                    <button
                      style={{ ...delBtn, opacity: hovRow===ik?1:0 }}
                      title="Hapus item income"
                      onMouseDown={e=>e.stopPropagation()}
                      onClick={()=>{
                        const ok = confirm(`Hapus item income "${item.label}"?`)
                        if (!ok) return
                        onIncomeChange(income.map((c,ci2)=>ci2!==ci?c:{...c,items:c.items.filter((_,ii2)=>ii2!==ii)}))
                      }}
                     aria-label="Remove"><AppIcon name="trash" size={13} /></button>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Bottom buttons */}
      <div style={{ display:'flex', gap:'6px', marginTop:'2px' }}>
        <AddBtn label="+ add item to last category" onClick={()=>{ if(!income.length) return; const last=income.length-1; onIncomeChange(income.map((c,ci)=>ci!==last?c:{...c,items:[...c.items,{label:'New Item',plan:0,actual:0}]})) }} />
        <AddBtn label="+ add category" onClick={handleAddIncomeCategory} />
      </div>

      {/* Total */}
      <div style={{ display:'flex', alignItems:'center', gap:'5px', background:'#f7f8fa', border:'1px solid #e3e7ee', borderRadius:'6px', padding:'8px 9px', marginTop:'8px' }}>
        <div style={{ width:'14px' }}/>
        <div style={{ flex:1, fontSize:'12px', fontWeight:600, color:'#4b5563' }}>Total Income</div>
        {isMobile ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'1px' }}>
            <span style={{ fontSize:'10px', color:'#9ca3af', fontFamily:'var(--font-mono), monospace' }}>{fmt(totP)}</span>
            <span style={{ fontSize:'12px', fontWeight:700, color:'#15803d', fontFamily:'var(--font-mono), monospace' }}>{fmt(totA)}</span>
          </div>
        ) : (
          <>
            <div style={{ minWidth:'100px', textAlign:'right', fontSize:'11.5px', color:'#9ca3af', fontFamily:'var(--font-mono), monospace', whiteSpace:'nowrap' }}>{fmt(totP)}</div>
            <div style={{ minWidth:'100px', textAlign:'right', fontSize:'11.5px', fontWeight:700, color:'#15803d', fontFamily:'var(--font-mono), monospace', whiteSpace:'nowrap' }}>{fmt(totA)}</div>
          </>
        )}
        <div style={{ width:'18px' }}/>
      </div>
    </div>
  )
}
