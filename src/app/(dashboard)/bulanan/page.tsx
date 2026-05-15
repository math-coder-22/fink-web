'use client'

import { useState, useEffect } from 'react'
import { useMonthContext, MONTH_NAMES, MONTHS_ORDER } from '@/components/layout/DashboardShell'
import { useBulanan } from '@/hooks/useBulanan'
import StatStrip     from '@/components/bulanan/StatStrip'
import BudgetPanel   from '@/components/bulanan/BudgetPanel'
import IncomePanel   from '@/components/bulanan/IncomePanel'
import CatatanHarian from '@/components/bulanan/CatatanHarian'
import { RekonModal, TxDetailModal } from '@/components/bulanan/BulananModals'
import type { MonthKey } from '@/types/database'
import DebtPanel from '@/components/bulanan/DebtPanel'
import { AppIcon } from '@/components/ui/design'

type MobileTab    = 'transactions' | 'budget' | 'income'
type DesktopPanel = 'budget' | 'income'

const fmt = (n: number) => 'Rp ' + Math.abs(Math.round(n)).toLocaleString('id-ID')

/* ─── TX DETAIL MODAL (transaksi per item budget) ─────── */


/* ─── RECONCILIATION MODAL ─────────────────────────────────── */


/* ─── MAIN CONTENT ─────────────────────────────────────────── */
function BulananContent({ curMonth, curYear }: { curMonth: MonthKey; curYear: number }) {
  const {
    plan, updatePlan, tx, loading, saving,
    addTx, updateTx, deleteTx,
    computedBudget, computedIncome, computedSaving, computedDebt,
    renameTxCat,
    copyBudgetToNext,
    rawSisa,
  } = useBulanan({ curMonth, curYear })

  const [desktopPanel, setDesktopPanel] = useState<DesktopPanel>('budget')
  const [mobileTab,    setMobileTab]    = useState<MobileTab>('transactions')
  const [isMobile,     setIsMobile]     = useState(false)
  const [rekonOpen,    setRekonOpen]    = useState(false)
  const [refleksiOpen, setRefleksiOpen] = useState(false)
  const [txDetailLabel, setTxDetailLabel] = useState<string|null>(null)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    setIsMobile(mq.matches)
    const h = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])

  const budget         = computedBudget()
  const incomeComputed = computedIncome()
  const savingComputed = computedSaving()
  const debtComputed   = typeof computedDebt === 'function' ? computedDebt() : []
  const sisaApp        = rawSisa

  async function handleRekon(aktual: number, selisih: number, type: 'out'|'inn') {
    const now = new Date()
    const day = String(now.getDate()).padStart(2,'0')
    await addTx({
      date: day, type,
      cat:  'Rekonsiliasi',
      note: `Balance reconciliation — actual: ${fmt(aktual)}, difference: ${selisih>0?'+':''}${fmt(selisih)}`,
      amt:  Math.abs(selisih),
      debt: false, settled: false,
    })
  }

  const phSub = (() => {
    const now      = new Date()
    const nowMonth = MONTHS_ORDER[now.getMonth()]
    const nowYear  = now.getFullYear()
    if (curYear === nowYear && curMonth === nowMonth) {
      const last = new Date(nowYear, now.getMonth()+1, 0).getDate()
      return `Day ${now.getDate()} of ${last} · ${last - now.getDate()} days remaining · Kakeibo System`
    }
    const selDate = new Date(curYear, MONTHS_ORDER.indexOf(curMonth), 1)
    const nowDate = new Date(nowYear, now.getMonth(), 1)
    return selDate < nowDate
      ? 'This month has passed · Kakeibo System'
      : 'This month has not started yet · Kakeibo System'
  })()

  async function handleCopyBudget() {
    // Hitung bulan berikutnya untuk tampil di konfirmasi
    const idx   = MONTHS_ORDER.indexOf(curMonth)
    const nextM = MONTHS_ORDER[(idx + 1) % 12]
    const nextY = idx === 11 ? curYear + 1 : curYear
    const nextLabel = `${MONTH_NAMES[nextM]} ${nextY}`
    const confirmed = confirm(
      `Copy budget ke ${nextLabel}?\n\nPerhatian: Budget yang sudah ada di ${nextLabel} akan ditimpa dan diganti dengan budget bulan ini.`
    )
    if (!confirmed) return
    await copyBudgetToNext()
    alert(`Budget berhasil disalin ke ${nextLabel}!`)
  }



  const card: React.CSSProperties      = { background:'#fff', border:'1px solid #e3e7ee', borderRadius:'12px', boxShadow:'0 1px 2px rgba(0,0,0,.06), 0 1px 3px rgba(0,0,0,.07)', marginBottom:'14px', overflow:'hidden' }
  const cardHead: React.CSSProperties  = { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 16px', borderBottom:'1px solid #e3e7ee', gap:'10px' }
  const cardTitle: React.CSSProperties = { fontSize:'12.5px', fontWeight:600, color:'#111827' }
  const cardSub: React.CSSProperties   = { fontSize:'11px', color:'#9ca3af', marginTop:'2px' }
  const colLabels: React.CSSProperties = { display:'flex', alignItems:'center', padding:'7px 16px', gap:'6px', background:'#f7f8fa', borderBottom:'1px solid #e3e7ee', fontSize:'10px', fontWeight:600, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.6px' }

  const MOBILE_TABS: { key: MobileTab; label: string }[] = [
    { key:'transactions', label:'Transactions' },
    { key:'budget',       label:'Budget' },
    { key:'income',       label:'Income' },
  ]

  const activePanel = isMobile ? mobileTab : desktopPanel

  const CatatanCard = (
    <div style={card}>
      <div style={cardHead}>
        <div>
          <div style={cardTitle}>Daily Transactions</div>
          <div style={cardSub}>Expenses are automatically reflected in budget actuals</div>
        </div>
        <span style={{ fontSize:'9.5px', fontWeight:600, background:'#f7f8fa', color:'#4b5563', border:'1px solid #e3e7ee', padding:'2px 8px', borderRadius:'20px' }}>
          {tx.length} record{tx.length !== 1 ? 's' : ''}
        </span>
      </div>
      <CatatanHarian tx={tx} budget={budget} income={plan.income} saving={savingComputed} debt={debtComputed}
        onAdd={addTx} onUpdate={updateTx} onDelete={deleteTx} />
    </div>
  )

  const RightCard = (
    <div style={card}>
      <div style={cardHead}>
        <div>
          <div style={cardTitle}>{activePanel==='budget' ? 'Budget' : 'Income'}</div>
          <div style={cardSub}>{activePanel==='budget' ? 'Actuals are calculated automatically from daily transactions' : 'Monthly income sources'}</div>
        </div>
        {!isMobile && (
          <div style={{ display:'flex', gap:'2px', background:'#f7f8fa', border:'1px solid #e3e7ee', borderRadius:'7px', padding:'2px' }}>
            {(['budget','income'] as DesktopPanel[]).map(p => (
              <button key={p} onClick={()=>setDesktopPanel(p)} style={{ fontSize:'11.5px', fontWeight:600, background:desktopPanel===p?'#fff':'none', color:desktopPanel===p?'#111827':'#9ca3af', border:'none', padding:'4px 13px', borderRadius:'5px', cursor:'pointer', boxShadow:desktopPanel===p?'0 1px 3px rgba(0,0,0,.07)':'none' }}>
                {p==='budget' ? 'Budget' : 'Income'}
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={colLabels}>
        <div style={{ width:'14px' }}/>
        <div style={{ flex:1 }}>{activePanel==='budget' ? 'Category / Item' : 'Income Source'}</div>
        {isMobile ? (
          <div style={{ textAlign:'right', whiteSpace:'nowrap' }}>PLAN / ACTUAL</div>
        ) : (
          <>
            <div style={{ width:'100px', flexShrink:0, textAlign:'right', whiteSpace:'nowrap' }}>Planned</div>
            <div style={{ width:'100px', flexShrink:0, textAlign:'right', whiteSpace:'nowrap' }}>Actual</div>
          </>
        )}
        <div style={{ width:'18px' }}/>
      </div>
      <div style={{ padding:'14px 16px' }}>
        {activePanel==='budget' ? (
          <>
            <BudgetPanel
              budget={budget} saving={savingComputed} debt={debtComputed}
              onBudgetChange={b=>updatePlan(prev=>({...prev,budget:b}))}
              onSavingChange={s=>updatePlan(prev=>({...prev,saving:s}))}
              onRename={renameTxCat}
              onItemClick={setTxDetailLabel}
              isMobile={isMobile}
            />
            <DebtPanel
              debt={debtComputed}
              onDebtChange={d=>updatePlan(prev=>({...prev,debt:d}))}
              onRename={renameTxCat}
              isMobile={isMobile}
            />
          </>
        ) : (
          <IncomePanel
            income={incomeComputed}
            onIncomeChange={inc=>updatePlan(prev=>({...prev,income:inc}))}
            onRename={renameTxCat}
            isMobile={isMobile}
          />
        )}
      </div>
    </div>
  )

  return (
    <div>
      {/* HEADER */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'12px', marginBottom:'14px', flexWrap:'wrap' }}>
        <div>
          <h1 style={{ fontSize: isMobile?'17px':'19px', fontWeight:700, letterSpacing:'-.3px' }}>
            {MONTH_NAMES[curMonth]} {curYear}
          </h1>
          <p style={{ fontSize:'12px', color:'#9ca3af', marginTop:'3px' }}>{phSub}</p>
        </div>
        <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
          {loading && <span style={{ fontSize:'11px', color:'#9ca3af' }}>Loading...</span>}
          {saving && <span style={{ fontSize:'11px', color:'#9ca3af' }}>Saving...</span>}
          {/* Reflection, Reconcile, Copy */}
          <button onClick={()=>setRefleksiOpen(true)}
            style={{ display:'flex', alignItems:'center', gap:'5px', padding:'6px 11px', border:'1.5px solid #e3e7ee', borderRadius:'6px', background:'transparent', fontSize:'12px', fontWeight:600, color:'#4b5563', cursor:'pointer' }}>
            <AppIcon name="mirror" size={14} /> Reflection
          </button>
          <button onClick={()=>setRekonOpen(true)}
            style={{ display:'flex', alignItems:'center', gap:'5px', padding:'6px 11px', border:'1.5px solid #e3e7ee', borderRadius:'6px', background:'transparent', fontSize:'12px', fontWeight:600, color:'#4b5563', cursor:'pointer' }}>
            <AppIcon name="scale" size={14} /> Reconcile
          </button>
          <button onClick={handleCopyBudget}
            style={{ display:'flex', alignItems:'center', gap:'5px', padding:'6px 11px', border:'1.5px solid #e3e7ee', borderRadius:'6px', background:'transparent', fontSize:'12px', fontWeight:600, color:'#4b5563', cursor:'pointer' }}>
            <AppIcon name="copy" size={14} /> Copy
          </button>
        </div>
      </div>

      {/* ── REFLECTION MODAL ── */}
      {refleksiOpen && (() => {
        const incomeItems = incomeComputed.flatMap(c => c.items).filter(i => (i.actual || 0) > 0)
        const totalIncome = incomeItems.reduce((s, i) => s + (i.actual || 0), 0)
        const totalSavings = savingComputed.reduce((s, r) => s + (r.actual || 0), 0)
        const totalExp = budget.reduce((s, c) => s + c.items.reduce((ss, i) => ss + (i.actual || 0), 0), 0)
        const totalDebt = debtComputed.reduce((s, r) => s + (r.actual || 0), 0)
        const totalOutflow = totalExp + totalDebt
        const finalCashflow = totalIncome - totalOutflow - totalSavings
        const planIncome = incomeComputed.flatMap(c => c.items).reduce((s, i) => s + (i.plan || 0), 0)
        const planSavings = savingComputed.reduce((s, r) => s + (r.plan || 0), 0)
        const planExp = budget.reduce((s, c) => s + c.items.reduce((ss, i) => ss + (i.plan || 0), 0), 0)
        const planDebt = debtComputed.reduce((s, r) => s + (r.plan || 0), 0)
        const expensePct = planExp > 0 ? Math.round((totalExp / planExp) * 100) : 0
        const debtPct = planDebt > 0 ? Math.round((totalDebt / planDebt) * 100) : 0
        const savingPct = planSavings > 0 ? Math.round((totalSavings / planSavings) * 100) : 0
        const cashflowColor = finalCashflow >= 0 ? '#15803d' : '#b91c1c'
        const money = (n: number) => `${n < 0 ? '-' : ''}${fmt(n)}`

        const metricRow = (label: string, value: number, color = '#111827') => (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px', padding:'8px 0', borderBottom:'1px solid #f1f5f9' }}>
            <span style={{ fontSize:'12.5px', color:'#64748b' }}>{label}</span>
            <span style={{ fontSize:'12.5px', fontWeight:700, color, fontFamily:'var(--font-mono), monospace', whiteSpace:'nowrap' }}>{money(value)}</span>
          </div>
        )

        const progressRow = (label: string, pct: number, color: string, caption: string) => (
          <div style={{ padding:'8px 0', borderBottom:'1px solid #f1f5f9' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:'10px', marginBottom:'6px' }}>
              <span style={{ fontSize:'12.5px', color:'#4b5563', fontWeight:600 }}>{label}</span>
              <span style={{ fontSize:'11.5px', color:'#64748b', fontFamily:'var(--font-mono), monospace' }}>{pct || 0}%</span>
            </div>
            <div style={{ height:'5px', background:'#eef2f7', borderRadius:'999px', overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${Math.min(100, Math.max(0, pct || 0))}%`, background:color, borderRadius:'999px' }} />
            </div>
            <div style={{ fontSize:'10.5px', color:'#94a3b8', marginTop:'4px' }}>{caption}</div>
          </div>
        )

        return (
          <div onClick={e=>{ if(e.target===e.currentTarget) setRefleksiOpen(false) }}
            style={{ position:'fixed', inset:0, background:'rgba(15,23,42,.42)', zIndex:800, display:'flex', alignItems:'flex-start', justifyContent:'flex-end', padding:'60px 20px 20px' }}>
            <div style={{
              background:'#fff', borderRadius:'14px', width:'100%', maxWidth:'430px',
              maxHeight:'calc(100dvh - 80px)', overflowY:'auto',
              boxShadow:'0 24px 70px rgba(15,23,42,.22)',
              animation:'slideIn .2s ease', border:'1px solid #e3e7ee'
            }}>
              <div style={{ position:'sticky', top:0, background:'#fff', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 18px', borderBottom:'1px solid #e3e7ee', zIndex:1 }}>
                <div>
                  <div style={{ fontSize:'15px', fontWeight:800, color:'#111827', display:'flex', alignItems:'center', gap:7 }}><AppIcon name="mirror" size={16} /> Monthly Reflection</div>
                  <div style={{ fontSize:'11px', color:'#9ca3af', marginTop:'2px' }}>{MONTH_NAMES[curMonth]} {curYear} · monthly cashflow review</div>
                </div>
                <button aria-label="Close reflection" onClick={()=>setRefleksiOpen(false)} style={{ width:'30px', height:'30px', border:'none', background:'#f7f8fa', borderRadius:'8px', cursor:'pointer', color:'#4b5563', display:'inline-flex', alignItems:'center', justifyContent:'center' }}><AppIcon name="close" size={16} /></button>
              </div>

              <div style={{ padding:'18px', display:'flex', flexDirection:'column', gap:'12px' }}>
                <div style={{ background: finalCashflow >= 0 ? '#f0fdf4' : '#fef2f2', border:`1px solid ${finalCashflow >= 0 ? '#bbf7d0' : '#fecaca'}`, borderRadius:'12px', padding:'14px 15px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'12px' }}>
                    <div>
                      <div style={{ fontSize:'10px', fontWeight:800, color:cashflowColor, textTransform:'uppercase', letterSpacing:'.7px' }}>
                        <span style={{ display:'inline-flex', verticalAlign:'middle', marginRight:6 }}><AppIcon name={finalCashflow >= 0 ? 'check' : 'warning'} size={13} /></span>Final Cashflow
                      </div>
                      <div style={{ fontSize:'11.5px', color:'#64748b', marginTop:'6px', lineHeight:1.45 }}>
                        Income minus expenses, debt payments, and saving allocations.
                      </div>
                    </div>
                    <div style={{ fontSize:'20px', fontWeight:800, color:cashflowColor, fontFamily:'var(--font-mono), monospace', whiteSpace:'nowrap' }}>{money(finalCashflow)}</div>
                  </div>
                </div>

                <div style={{ background:'#fff', border:'1px solid #e3e7ee', borderRadius:'12px', padding:'14px 15px' }}>
                  <div style={{ fontSize:'10px', fontWeight:800, color:'#64748b', textTransform:'uppercase', letterSpacing:'.7px', marginBottom:'7px' }}>Monthly Summary</div>
                  {metricRow('Total Income', totalIncome, '#15803d')}
                  {metricRow('Expenses', totalExp, '#b91c1c')}
                  {metricRow('Debt Payment', totalDebt, '#8a5f2b')}
                  {metricRow('Saving Allocation', totalSavings, '#1d4ed8')}
                  {metricRow('Total Outflow', totalOutflow + totalSavings, '#7c2d12')}
                </div>

                <div style={{ background:'#fff', border:'1px solid #e3e7ee', borderRadius:'12px', padding:'14px 15px' }}>
                  <div style={{ fontSize:'10px', fontWeight:800, color:'#64748b', textTransform:'uppercase', letterSpacing:'.7px', marginBottom:'7px' }}>Budget Discipline</div>
                  {progressRow('Expenses', expensePct, expensePct > 100 ? '#ef4444' : '#22c55e', planExp > 0 ? `Actual ${fmt(totalExp)} of planned ${fmt(planExp)}` : 'No expense plan yet')}
                  {progressRow('Debt Payment', debtPct, debtPct >= 100 ? '#22c55e' : '#f59e0b', planDebt > 0 ? `Actual ${fmt(totalDebt)} of planned ${fmt(planDebt)}` : 'No debt payment plan yet')}
                  {progressRow('Saving Allocation', savingPct, savingPct >= 100 ? '#22c55e' : '#60a5fa', planSavings > 0 ? `Actual ${fmt(totalSavings)} of planned ${fmt(planSavings)}` : 'No saving allocation plan yet')}
                </div>

                <div style={{ background:'#fff', border:'1px solid #e3e7ee', borderRadius:'12px', padding:'14px 15px' }}>
                  <div style={{ fontSize:'10px', fontWeight:800, color:'#64748b', textTransform:'uppercase', letterSpacing:'.7px', marginBottom:'8px' }}>
                    <span style={{ display:'inline-flex', verticalAlign:'middle', marginRight:6 }}><AppIcon name="expense" size={14} /></span>Expenses Breakdown
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                    {budget.map(cat => {
                      const catTotal = cat.items.reduce((s,i)=>s+(i.actual||0),0)
                      if (catTotal === 0) return null
                      const catPct = totalExp > 0 ? Math.round((catTotal/totalExp)*100) : 0
                      return (
                        <div key={cat.label}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'4px', gap:'10px' }}>
                            <span style={{ fontSize:'12.5px', fontWeight:700, color:'#111827' }}>{cat.label}</span>
                            <span style={{ fontSize:'12px', fontWeight:700, fontFamily:'var(--font-mono), monospace', color:'#b91c1c' }}>{fmt(catTotal)}</span>
                          </div>
                          <div style={{ height:'4px', background:'#f3f4f6', borderRadius:'999px', marginBottom:'5px', overflow:'hidden' }}>
                            <div style={{ height:'100%', borderRadius:'999px', background:'#fca5a5', width:`${catPct}%` }} />
                          </div>
                          <div style={{ fontSize:'10.5px', color:'#94a3b8' }}>{catPct}% of non-debt expenses</div>
                        </div>
                      )
                    })}
                    {totalExp === 0 && <div style={{ fontSize:'12px', color:'#94a3b8' }}>No expenses recorded this month.</div>}
                  </div>
                </div>
              </div>
            </div>
            <style>{`@keyframes slideIn { from { opacity:0; transform:translateX(18px) } to { opacity:1; transform:translateX(0) } }`}</style>
          </div>
        )
      })()}

      {/* STAT STRIP */}
      <StatStrip income={incomeComputed} saving={savingComputed} debt={debtComputed} budget={budget} isMobile={isMobile} rawSisa={sisaApp} />

      {/* MOBILE: 3-tab */}
      {isMobile ? (
        <>
          <div style={{ position:'sticky', top:0, zIndex:50, display:'flex', background:'#fff', border:'1px solid #e3e7ee', borderRadius:'10px', padding:'3px', marginBottom:'14px', boxShadow:'0 1px 4px rgba(0,0,0,.07)' }}>
            {MOBILE_TABS.map(tab => (
              <button key={tab.key} onClick={()=>setMobileTab(tab.key)} style={{ flex:1, padding:'8px 4px', border:'none', borderRadius:'8px', background:mobileTab===tab.key?'#1a5c42':'none', color:mobileTab===tab.key?'#fff':'#9ca3af', fontSize:'12px', fontWeight:600, cursor:'pointer', transition:'all .15s' }}>
                {tab.label}
              </button>
            ))}
          </div>
          {mobileTab==='transactions' && CatatanCard}
          {(mobileTab==='budget' || mobileTab==='income') && RightCard}
        </>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1.1fr', gap:'14px', alignItems:'start' }}>
          {CatatanCard}
          {RightCard}
        </div>
      )}

      {/* TX DETAIL MODAL */}
      {txDetailLabel && (
        <TxDetailModal label={txDetailLabel} tx={tx} onClose={()=>setTxDetailLabel(null)} />
      )}

      {/* RECONCILIATION MODAL */}
      {rekonOpen && (
        <RekonModal sisaApp={sisaApp} onClose={()=>setRekonOpen(false)} onSave={handleRekon} />
      )}
    </div>
  )
}

export default function BulananPage() {
  const { curMonth, curYear } = useMonthContext()
  return <BulananContent key={`${curMonth}-${curYear}`} curMonth={curMonth} curYear={curYear} />
}