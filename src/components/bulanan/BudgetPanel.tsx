'use client'

import { useRef, useState } from 'react'
import { fmt, fmtNum, pNum } from '@/components/ui/helpers'
import type { BudgetCategory, SavingRow } from '@/types/database'

const inp: React.CSSProperties = { border:'none', background:'transparent', outline:'none', fontFamily:'inherit' }
const delBtn: React.CSSProperties = { width:'20px', height:'20px', borderRadius:'4px', border:'none', background:'none', color:'#9ca3af', fontSize:'15px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0, opacity:0, transition:'opacity .13s' }

function DragHandle() {
  return (
    <span style={{ width:'6px', flexShrink:0, cursor:'grab', display:'flex', alignItems:'center', justifyContent:'center', touchAction:'none' }} />
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
  budget:         BudgetCategory[]
  saving:         SavingRow[]
  onBudgetChange: (b: BudgetCategory[]) => void
  onSavingChange: (s: SavingRow[]) => void
  onRename:       (oldLabel: string, newLabel: string) => void
  onItemClick?:   (label: string) => void
  isMobile?:      boolean
}

export default function BudgetPanel({ budget, saving, onBudgetChange, onSavingChange, onRename, onItemClick, isMobile }: Props) {
  const [hovRow,   setHovRow]   = useState<string|null>(null)
  const [dragOver, setDragOver] = useState<string|null>(null)
  const catDragSrc  = useRef<number|null>(null)
  const itemDragSrc = useRef<{ci:number;ii:number}|null>(null)
  const savDragSrc  = useRef<number|null>(null)

  /* ── Drag helpers ── */
  function onCatDragStart(e: React.DragEvent, ci: number) { catDragSrc.current=ci; e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('type','cat'); e.stopPropagation() }
  function onCatDrop(e: React.DragEvent, ci: number) { e.preventDefault(); e.stopPropagation(); setDragOver(null); const from=catDragSrc.current; if(from===null||from===ci) return; const next=[...budget]; const [m]=next.splice(from,1); next.splice(ci,0,m); onBudgetChange(next); catDragSrc.current=null }
  function onItemDragStart(e: React.DragEvent, ci: number, ii: number) { itemDragSrc.current={ci,ii}; e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('type','item'); e.stopPropagation() }
  function onItemDrop(e: React.DragEvent, toCi: number, toIi: number) { e.preventDefault(); e.stopPropagation(); setDragOver(null); const src=itemDragSrc.current; if(!src) return; if(src.ci===toCi&&src.ii===toIi) return; const next=budget.map(c=>({...c,items:[...c.items]})); const [m]=next[src.ci].items.splice(src.ii,1); next[toCi].items.splice(toIi,0,m); onBudgetChange(next); itemDragSrc.current=null }
  function onSavDragStart(e: React.DragEvent, i: number) { savDragSrc.current=i; e.dataTransfer.effectAllowed='move' }
  function onSavDrop(e: React.DragEvent, i: number) { e.preventDefault(); const from=savDragSrc.current; if(from===null||from===i) return; const next=[...saving]; const [m]=next.splice(from,1); next.splice(i,0,m); onSavingChange(next); savDragSrc.current=null; setDragOver(null) }

  const totExpP = budget.reduce((s,c)=>s+c.items.reduce((ss,i)=>ss+(i.plan||0),0),0)
  const totExpA = budget.reduce((s,c)=>s+c.items.reduce((ss,i)=>ss+(i.actual||0),0),0)
  const totSavP = saving.reduce((s,r)=>s+(r.plan||0),0)
  const totSavA = saving.reduce((s,r)=>s+(r.actual||0),0)

  // ── Shared styles ──
  const rowBase: React.CSSProperties = { display:'flex', alignItems:'center', gap:'5px', borderRadius:'6px', padding:'7px 9px', marginBottom:'4px', border:'1px solid #e3e7ee', transition:'border-color .13s' }
  const mono: React.CSSProperties = { ...inp, minWidth: isMobile?'0':'86px', fontSize:'12px', fontWeight:500, textAlign:'right', fontFamily:'JetBrains Mono,monospace', color:'#4b5563', whiteSpace:'nowrap' }
  const totalRow: React.CSSProperties = { display:'flex', alignItems:'center', gap:'5px', background:'#f7f8fa', border:'1px solid #e3e7ee', borderRadius:'6px', padding:'8px 9px', marginTop:'8px' }

  return (
    <div>
      {budget.map((cat, ci) => {
        const catP = cat.items.reduce((s,i)=>s+(i.plan||0),0)
        const catA = cat.items.reduce((s,i)=>s+(i.actual||0),0)
        const pct  = catP>0 ? Math.min(120,(catA/catP)*100) : (catA>0?100:0)
        const clr  = pct>=100?'#b91c1c':pct>=85?'#d97706':'#1a5c42'
        const hk   = `cat-${ci}`

        return (
          <div key={ci} style={{ marginBottom:'6px' }}
            onDragOver={e=>{ e.preventDefault(); e.stopPropagation(); setDragOver(hk) }}
            onDrop={e=>{ if(e.dataTransfer.getData('type')==='cat') onCatDrop(e,ci); else e.stopPropagation() }}
            onDragLeave={()=>setDragOver(null)}>

            {/* Category header */}
            <div draggable onDragStart={e=>onCatDragStart(e,ci)}
              style={{ ...rowBase, background:'#fff', cursor:'grab', borderColor: dragOver===hk?'#1a5c42':'#e3e7ee', borderWidth: dragOver===hk?'2px':'1px' }}
              onMouseEnter={()=>setHovRow(hk)} onMouseLeave={()=>setHovRow(null)}>
              <DragHandle />
              <input style={{ ...inp, flex:1, minWidth:0, fontSize:'13px', fontWeight:600, color:'#111827', cursor:'text' }}
                value={cat.label} onMouseDown={e=>e.stopPropagation()}
                onChange={e=>onBudgetChange(budget.map((c,ci2)=>ci2!==ci?c:{...c,label:e.target.value}))} />
              {isMobile ? (
                /* Mobile: flex:2 agar proporsional dengan label (flex:1 di input) */
                <div style={{ flex:'2', minWidth:0, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'1px', overflow:'hidden' }}>
                  <span style={{ fontSize:'9.5px', color:'#9ca3af', fontFamily:'JetBrains Mono,monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', width:'100%', textAlign:'right' }}>{fmt(catP)}</span>
                  <span style={{ fontSize:'11.5px', fontWeight:700, color:clr, fontFamily:'JetBrains Mono,monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', width:'100%', textAlign:'right' }}>{fmt(catA)}</span>
                </div>
              ) : (
                <>
                  <span style={{ minWidth:'86px', fontSize:'11.5px', color:'#9ca3af', textAlign:'right', fontFamily:'JetBrains Mono,monospace', whiteSpace:'nowrap' }}>{fmt(catP)}</span>
                  <span style={{ minWidth:'86px', fontSize:'11.5px', fontWeight:600, textAlign:'right', fontFamily:'JetBrains Mono,monospace', color:clr, whiteSpace:'nowrap' }}>{fmt(catA)}</span>
                </>
              )}
              <button style={{ ...delBtn, opacity: hovRow===hk?1:0 }} onMouseDown={e=>e.stopPropagation()}
                onClick={()=>onBudgetChange(budget.filter((_,ci2)=>ci2!==ci))}>×</button>
            </div>

            {/* Progress bar */}
            <div style={{ height:'2px', background:'#e3e7ee', borderRadius:'1px', margin:'-2px 0 5px 22px' }}>
              <div style={{ height:'2px', borderRadius:'1px', background:clr, width:`${Math.min(100,pct)}%`, transition:'width .3s' }} />
            </div>

            {/* Items */}
            <div style={{ paddingLeft:'16px' }}>
              {cat.items.map((item, ii) => {
                const ik = `item-${ci}-${ii}`
                return (
                  <div key={ii} draggable onDragStart={e=>onItemDragStart(e,ci,ii)}
                    onDragOver={e=>{ e.preventDefault(); e.stopPropagation(); setDragOver(ik) }}
                    onDrop={e=>{ e.stopPropagation(); onItemDrop(e,ci,ii) }}
                    onDragLeave={()=>setDragOver(null)}
                    style={{ ...rowBase, background:'#f7f8fa', cursor:'grab', borderColor: dragOver===ik?'#1a5c42':'#e3e7ee', borderWidth: dragOver===ik?'2px':'1px' }}
                    onMouseEnter={()=>setHovRow(ik)} onMouseLeave={()=>setHovRow(null)}>
                    <DragHandle />
                    <span style={{ width:'10px', fontSize:'9px', color:'#9ca3af', textAlign:'center', flexShrink:0 }}>└</span>

                    {isMobile ? (
                      /* Mobile: flex ratio — label:angka = 3:2, keduanya minWidth:0 */
                      <>
                        <div style={{ flex:'3', minWidth:0, overflow:'hidden' }}>
                          <input style={{ ...inp, width:'100%', fontSize:'11.5px', color:'#4b5563', cursor:'text' }}
                            value={item.label} onMouseDown={e=>e.stopPropagation()}
                            onChange={e=>onBudgetChange(budget.map((c,ci2)=>ci2!==ci?c:{...c,items:c.items.map((it,ii2)=>ii2!==ii?it:{...it,label:e.target.value})}))}
                            onBlur={e=>{ const old=budget[ci].items[ii].label; if(old!==e.target.value) onRename(old,e.target.value) }} />
                        </div>
                        <div style={{ flex:'2', minWidth:0, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'1px', overflow:'hidden' }}>
                          <input style={{ ...inp, fontSize:'9.5px', fontFamily:'JetBrains Mono,monospace', color:'#9ca3af', textAlign:'right', width:'100%' }}
                            value={item.plan?fmtNum(item.plan):''} placeholder="0"
                            onMouseDown={e=>e.stopPropagation()} onFocus={e=>e.target.select()}
                            onBlur={e=>{ const v=pNum(e.target.value); e.target.value=v?fmtNum(v):'' }}
                            onChange={e=>onBudgetChange(budget.map((c,ci2)=>ci2!==ci?c:{...c,items:c.items.map((it,ii2)=>ii2!==ii?it:{...it,plan:pNum(e.target.value)})}))} />
                          <div style={{ fontSize:'11.5px', fontWeight:600, fontFamily:'JetBrains Mono,monospace', color:(item.actual||0)>0?'#b91c1c':'#9ca3af', width:'100%', textAlign:'right', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {(item.actual||0)>0 ? fmtNum(item.actual) : '-'}
                          </div>
                        </div>
                      </>
                    ) : (
                      /* Desktop: side by side */
                      <>
                        <input style={{ ...inp, flex:1, fontSize:'12.5px', color:'#4b5563', cursor:'text' }}
                          value={item.label} onMouseDown={e=>e.stopPropagation()}
                          onChange={e=>onBudgetChange(budget.map((c,ci2)=>ci2!==ci?c:{...c,items:c.items.map((it,ii2)=>ii2!==ii?it:{...it,label:e.target.value})}))}
                          onBlur={e=>{ const old=budget[ci].items[ii].label; if(old!==e.target.value) onRename(old,e.target.value) }} />
                        <input style={mono} defaultValue={item.plan?fmtNum(item.plan):''}
                          key={`plan-${ci}-${ii}-${item.plan}`}
                          placeholder="0" type="text"
                          onMouseDown={e=>e.stopPropagation()}
                          onFocus={e=>{ e.target.value=item.plan?String(item.plan):''; e.target.select() }}
                          onBlur={e=>{ const v=pNum(e.target.value); onBudgetChange(budget.map((c,ci2)=>ci2!==ci?c:{...c,items:c.items.map((it,ii2)=>ii2!==ii?it:{...it,plan:v})})); e.target.value=v?fmtNum(v):'' }}
                          onChange={()=>{}} />
                        <div
                          onClick={e=>{ e.stopPropagation(); if(onItemClick && (item.actual||0)>0) onItemClick(item.label) }}
                          style={{ minWidth:'86px', fontSize:'11.5px', fontWeight:600, textAlign:'right', fontFamily:'JetBrains Mono,monospace', color:(item.actual||0)>0?'#b91c1c':'#9ca3af', whiteSpace:'nowrap', cursor:(item.actual||0)>0?'pointer':'default', borderRadius:'4px', padding:'1px 3px' }}
                          title={(item.actual||0)>0?'Klik untuk lihat transaksi':undefined}
                          onMouseEnter={e=>{ if((item.actual||0)>0) e.currentTarget.style.background='#fee2e2' }}
                          onMouseLeave={e=>{ e.currentTarget.style.background='transparent' }}>
                          {(item.actual||0)>0 ? fmtNum(item.actual) : '-'}
                        </div>
                      </>
                    )}
                    <button style={{ ...delBtn, opacity: hovRow===ik?1:0 }} onMouseDown={e=>e.stopPropagation()}
                      onClick={()=>onBudgetChange(budget.map((c,ci2)=>ci2!==ci?c:{...c,items:c.items.filter((_,ii2)=>ii2!==ii)}))}>×</button>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Bottom buttons */}
      <div style={{ display:'flex', gap:'6px', marginTop:'2px' }}>
        <AddBtn label="+ add item to last category" onClick={()=>{ if(!budget.length) return; const last=budget.length-1; onBudgetChange(budget.map((c,ci)=>ci!==last?c:{...c,items:[...c.items,{label:'New Item',plan:0,actual:0}]})) }} />
        <AddBtn label="+ add category" onClick={()=>onBudgetChange([...budget,{label:'New Category',items:[{label:'New Item',plan:0,actual:0}]}])} />
      </div>

      {/* Total Expenses */}
      <div style={{ height:'1px', background:'#e3e7ee', margin:'12px 0' }} />
      <div style={totalRow}>
        <div style={{ width:'14px' }}/>
        <div style={{ flex:1, fontSize:'12px', fontWeight:600, color:'#4b5563' }}>Total Expenses</div>
        {isMobile ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'1px' }}>
            <span style={{ fontSize:'10px', color:'#9ca3af', fontFamily:'JetBrains Mono,monospace' }}>{fmt(totExpP)}</span>
            <span style={{ fontSize:'12px', fontWeight:700, color:'#1a5c42', fontFamily:'JetBrains Mono,monospace' }}>{fmt(totExpA)}</span>
          </div>
        ) : (
          <>
            <div style={{ minWidth:'100px', textAlign:'right', fontSize:'11.5px', color:'#9ca3af', fontFamily:'JetBrains Mono,monospace', whiteSpace:'nowrap' }}>{fmt(totExpP)}</div>
            <div style={{ minWidth:'100px', textAlign:'right', fontSize:'11.5px', fontWeight:700, color:'#1a5c42', fontFamily:'JetBrains Mono,monospace', whiteSpace:'nowrap' }}>{fmt(totExpA)}</div>
          </>
        )}
        <div style={{ width:'18px' }}/>
      </div>

      {/* Savings & Allocations */}
      <div style={{ height:'1px', background:'#e3e7ee', margin:'14px 0 10px' }} />
      <div style={{ fontSize:'10px', fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.7px', marginBottom:'8px' }}>Savings &amp; Allocations</div>
      {saving.map((r, i) => {
        const sk = `sav-${i}`
        return (
          <div key={i} draggable onDragStart={e=>onSavDragStart(e,i)}
            onDragOver={e=>{ e.preventDefault(); setDragOver(sk) }}
            onDrop={e=>onSavDrop(e,i)} onDragLeave={()=>setDragOver(null)}
            style={{ display:'flex', alignItems:'center', gap:'5px', borderRadius:'6px', padding:'7px 9px', marginBottom:'4px', border:'1px solid', borderColor: dragOver===sk?'#1a5c42':'#e3e7ee', background:'#f7f8fa', cursor:'grab', transition:'border-color .13s' }}
            onMouseEnter={()=>setHovRow(sk)} onMouseLeave={()=>setHovRow(null)}>
            <DragHandle />
            <input style={{ ...inp, flex:'3', minWidth:0, fontSize:'13px', fontWeight:500, color:'#111827', cursor:'text' }}
              value={r.label} onMouseDown={e=>e.stopPropagation()}
              onChange={e=>onSavingChange(saving.map((s,i2)=>i2!==i?s:{...s,label:e.target.value}))}
              onBlur={e=>{ const old=saving[i].label; if(old!==e.target.value) onRename(old,e.target.value) }} />
            {isMobile ? (
              /* Mobile: flex:2 untuk angka */
              <div style={{ flex:'2', minWidth:0, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'1px', overflow:'hidden' }}>
                <input style={{ ...inp, fontSize:'9.5px', fontFamily:'JetBrains Mono,monospace', color:'#9ca3af', textAlign:'right', width:'100%' }}
                  value={r.plan?fmtNum(r.plan):''} placeholder="0"
                  onMouseDown={e=>e.stopPropagation()} onFocus={e=>e.target.select()}
                  onBlur={e=>{ const v=pNum(e.target.value); e.target.value=v?fmtNum(v):'' }}
                  onChange={e=>onSavingChange(saving.map((s,i2)=>i2!==i?s:{...s,plan:pNum(e.target.value)}))} />
                <div style={{ fontSize:'11.5px', fontWeight:600, color:'#1d4ed8', fontFamily:'JetBrains Mono,monospace', width:'100%', textAlign:'right', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {r.actual ? fmtNum(r.actual) : '-'}
                </div>
              </div>
            ) : (
              <>
                <input style={{ ...inp, minWidth:'86px', fontSize:'12px', fontWeight:500, textAlign:'right', fontFamily:'JetBrains Mono,monospace', color:'#4b5563', whiteSpace:'nowrap' }}
                  value={r.plan?fmtNum(r.plan):''} placeholder="0"
                  onMouseDown={e=>e.stopPropagation()} onFocus={e=>e.target.select()}
                  onBlur={e=>{ const v=pNum(e.target.value); e.target.value=v?fmtNum(v):'' }}
                  onChange={e=>onSavingChange(saving.map((s,i2)=>i2!==i?s:{...s,plan:pNum(e.target.value)}))} />
                <input style={{ ...inp, minWidth:'86px', fontSize:'12px', fontWeight:500, textAlign:'right', fontFamily:'JetBrains Mono,monospace', color:'#1a5c42', whiteSpace:'nowrap' }}
                  value={r.actual?fmtNum(r.actual):''} placeholder="0"
                  onMouseDown={e=>e.stopPropagation()} onFocus={e=>e.target.select()}
                  onBlur={e=>{ const v=pNum(e.target.value); e.target.value=v?fmtNum(v):'' }}
                  onChange={e=>onSavingChange(saving.map((s,i2)=>i2!==i?s:{...s,actual:pNum(e.target.value)}))} />
              </>
            )}
            <button style={{ ...delBtn, opacity: hovRow===sk?1:0 }} onMouseDown={e=>e.stopPropagation()}
              onClick={()=>onSavingChange(saving.filter((_,i2)=>i2!==i))}>×</button>
          </div>
        )
      })}
      <AddBtn label="+ add allocation" onClick={()=>onSavingChange([...saving,{label:'New Allocation',plan:0,actual:0}])} />
      <div style={totalRow}>
        <div style={{ width:'14px' }}/>
        <div style={{ flex:1, fontSize:'12px', fontWeight:600, color:'#4b5563' }}>Total Savings</div>
        {isMobile ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'1px' }}>
            <span style={{ fontSize:'10px', color:'#9ca3af', fontFamily:'JetBrains Mono,monospace' }}>{fmt(totSavP)}</span>
            <span style={{ fontSize:'12px', fontWeight:700, color:'#1d4ed8', fontFamily:'JetBrains Mono,monospace' }}>{fmt(totSavA)}</span>
          </div>
        ) : (
          <>
            <div style={{ minWidth:'100px', textAlign:'right', fontSize:'11.5px', color:'#9ca3af', fontFamily:'JetBrains Mono,monospace', whiteSpace:'nowrap' }}>{fmt(totSavP)}</div>
            <div style={{ minWidth:'100px', textAlign:'right', fontSize:'11.5px', fontWeight:700, color:'#1a5c42', fontFamily:'JetBrains Mono,monospace', whiteSpace:'nowrap' }}>{fmt(totSavA)}</div>
          </>
        )}
        <div style={{ width:'18px' }}/>
      </div>
    </div>
  )
}
