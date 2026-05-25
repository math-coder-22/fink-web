'use client'

import { useState, useEffect, useMemo } from 'react'
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



/* ─── FINANCIAL REVIEW MODAL ─────────────────────────────── */
function ReflectionModal({
  open,
  onClose,
  budget,
  income,
  saving,
  debt,
  tx,
  rawSisa,
  monthLabel,
}: {
  open: boolean
  onClose: () => void
  budget: any[]
  income: any[]
  saving: any[]
  debt: any[]
  tx: any[]
  rawSisa: number
  monthLabel: string
}) {
  const [openCategory, setOpenCategory] = useState<string | null>(null)
  const [openItem, setOpenItem] = useState<string | null>(null)

  const review = useMemo(() => {
    const expenseTx = tx.filter((t:any) => t.type === 'out' && !t.debt)

    const totalIncomePlan = income.reduce((s:number, c:any) => s + (c.items || []).reduce((ss:number, i:any) => ss + Number(i.plan || 0), 0), 0)
    const totalIncomeActual = income.reduce((s:number, c:any) => s + (c.items || []).reduce((ss:number, i:any) => ss + Number(i.actual || 0), 0), 0)
    const totalSavingPlan = saving.reduce((s:number, i:any) => s + Number(i.plan || 0), 0)
    const totalSavingActual = saving.reduce((s:number, i:any) => s + Number(i.actual || 0), 0)
    const totalDebtPlan = debt.reduce((s:number, i:any) => s + Number(i.plan || 0), 0)
    const totalDebtActual = debt.reduce((s:number, i:any) => s + Number(i.actual || 0), 0)

    const categories = budget.map((cat:any) => {
      const items = (cat.items || []).map((item:any) => {
        const relatedTx = expenseTx
          .filter((t:any) => t.cat === item.label)
          .slice()
          .sort((a:any, b:any) => Number(b.amt || 0) - Number(a.amt || 0))

        const spent = Number(item.actual || 0)
        const planned = Number(item.plan || 0)
        const pct = planned > 0 ? Math.round((spent / planned) * 100) : 0

        return {
          label: item.label,
          planned,
          spent,
          pct,
          over: planned > 0 && spent > planned,
          near: planned > 0 && spent >= planned * 0.8 && spent <= planned,
          transactions: relatedTx,
        }
      }).filter((item:any) => item.planned > 0 || item.spent > 0)
        .sort((a:any, b:any) => (Number(b.over) - Number(a.over)) || (Number(b.near) - Number(a.near)) || b.spent - a.spent)

      const planned = items.reduce((sum:number, item:any) => sum + item.planned, 0)
      const spent = items.reduce((sum:number, item:any) => sum + item.spent, 0)
      const pct = planned > 0 ? Math.round((spent / planned) * 100) : 0

      return {
        label: cat.label,
        planned,
        spent,
        pct,
        over: planned > 0 && spent > planned,
        near: planned > 0 && spent >= planned * 0.8 && spent <= planned,
        items,
      }
    }).filter((cat:any) => cat.planned > 0 || cat.spent > 0)
      .sort((a:any, b:any) => (Number(b.over) - Number(a.over)) || (Number(b.near) - Number(a.near)) || b.spent - a.spent)

    const regularExpensePlan = categories.reduce((sum:number, cat:any) => sum + cat.planned, 0)
    const regularExpenseActual = categories.reduce((sum:number, cat:any) => sum + cat.spent, 0)
    const totalBudgetPlan = regularExpensePlan + totalDebtPlan
    const totalBudgetActual = regularExpenseActual + totalDebtActual
    const budgetUsed = totalBudgetPlan > 0 ? Math.round((totalBudgetActual / totalBudgetPlan) * 100) : 0
    const expenseUsed = regularExpensePlan > 0 ? Math.round((regularExpenseActual / regularExpensePlan) * 100) : 0
    const savingRate = totalIncomeActual > 0 ? Math.round((totalSavingActual / totalIncomeActual) * 100) : 0
    const alerts = categories.filter((cat:any) => cat.over || cat.near)

    return {
      categories,
      totalIncomePlan,
      totalIncomeActual,
      totalSavingPlan,
      totalSavingActual,
      totalDebtPlan,
      totalDebtActual,
      regularExpensePlan,
      regularExpenseActual,
      totalBudgetPlan,
      totalBudgetActual,
      budgetUsed,
      expenseUsed,
      savingRate,
      alerts,
    }
  }, [budget, income, saving, debt, tx])

  if (!open) return null

  const money = (n:number) => fmt(n)
  const statusText = review.budgetUsed > 100 ? 'Over Budget' : review.budgetUsed >= 80 ? 'Warning' : 'Safe'
  const statusColor = review.budgetUsed > 100 ? '#b91c1c' : review.budgetUsed >= 80 ? '#b45309' : '#15803d'
  const leftToSpendColor = rawSisa < 0 ? '#b91c1c' : rawSisa === 0 ? '#b45309' : '#15803d'

  return (
    <div
      onClick={e => { if (e.currentTarget === e.target) onClose() }}
      style={{ position:'fixed', inset:0, zIndex:850, background:'rgba(15,23,42,.42)', backdropFilter:'blur(4px)', display:'flex', alignItems:'flex-start', justifyContent:'center', overflowY:'auto', padding:'max(14px, env(safe-area-inset-top)) 12px 16px' }}
    >
      <div style={{ width:'100%', maxWidth:'820px', background:'#fff', border:'1px solid #e3e7ee', borderRadius:'22px', boxShadow:'0 24px 80px rgba(15,23,42,.24)', overflow:'hidden' }}>
        <div style={{ position:'sticky', top:0, zIndex:2, background:'rgba(255,255,255,.96)', backdropFilter:'blur(12px)', display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'14px', padding:'14px 16px', borderBottom:'1px solid #e3e7ee' }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:'17px', fontWeight:950, color:'#111827' }}>
              <AppIcon name="mirror" size={18} /> Financial Review
            </div>
            <div style={{ fontSize:'11.5px', color:'#9ca3af', marginTop:'2px' }}>{monthLabel} · ringkasan kondisi + investigasi pengeluaran</div>
          </div>
          <button aria-label="Close reflection" onClick={onClose} style={{ width:'32px', height:'32px', border:'none', background:'#f7f8fa', borderRadius:'10px', cursor:'pointer', color:'#4b5563', display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <AppIcon name="close" size={16} />
          </button>
        </div>

        <div style={{ padding:'14px 16px 18px', display:'flex', flexDirection:'column', gap:'12px' }}>
          <div style={{ border:'1px solid #e3e7ee', borderRadius:'16px', padding:'12px 14px', background:'#fff' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'10px', marginBottom:'10px' }}>
              <div>
                <div style={{ fontSize:'13px', fontWeight:950, color:'#111827' }}>Financial Snapshot</div>
                <div style={{ fontSize:'11px', color:'#94a3b8', marginTop:'2px' }}>Ringkasan umum sebelum mengecek detail pengeluaran.</div>
              </div>
              <div style={{ fontSize:'11px', fontWeight:950, color:statusColor, background:review.budgetUsed > 100 ? '#fef2f2' : review.budgetUsed >= 80 ? '#fffbeb' : '#ecfdf5', border:`1px solid ${review.budgetUsed > 100 ? '#fecaca' : review.budgetUsed >= 80 ? '#fde68a' : '#bbf7d0'}`, borderRadius:'999px', padding:'5px 9px', whiteSpace:'nowrap' }}>
                {statusText}
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:isMobile ? '1fr' : '1fr 1fr', gap:isMobile ? '4px' : '8px 18px' }}>
              {[
                ['Income', money(review.totalIncomeActual), `plan ${money(review.totalIncomePlan)}`, '#15803d'],
                ['Expenses', money(review.regularExpenseActual), `${review.expenseUsed}% of budget`, '#b91c1c'],
                ['Debt', money(review.totalDebtActual), `plan ${money(review.totalDebtPlan)}`, '#7c3aed'],
                ['Saving', money(review.totalSavingActual), `${review.savingRate}% saving rate`, '#2563eb'],
                ['Left to Spend', money(rawSisa), 'available now', leftToSpendColor],
                ['Budget Used', `${review.budgetUsed}%`, `${review.alerts.length} category warning`, statusColor],
              ].map(([label, value, sub, color]) => (
                <div key={label} style={{ display:'grid', gridTemplateColumns:'112px 1fr', gap:'10px', alignItems:'baseline', padding:'7px 0', borderBottom:'1px solid #f1f5f9' }}>
                  <div style={{ fontSize:'11.5px', color:'#64748b', fontWeight:850 }}>{label}</div>
                  <div style={{ minWidth:0, textAlign:'right' }}>
                    <div style={{ fontSize:'13px', color:color as string, fontWeight:950, fontFamily:String(value).startsWith('Rp') ? 'var(--font-mono), monospace' : undefined, whiteSpace:'nowrap' }}>{value}</div>
                    <div style={{ fontSize:'10.5px', color:'#94a3b8', marginTop:'1px', whiteSpace:'nowrap' }}>{sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ border:'1px solid #e3e7ee', borderRadius:'16px', padding:'11px 12px', background:'#fff' }}>
            <div style={{ fontSize:'12.5px', fontWeight:950, color:'#111827', marginBottom:'7px' }}>Review Insight</div>
            {review.alerts.length === 0 ? (
              <div style={{ fontSize:'12px', color:'#64748b', lineHeight:1.5 }}>
                Kondisi budget masih relatif aman. Belum ada kategori expense yang mendekati atau melewati batas budget bulan ini.
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                {review.alerts.slice(0, 3).map((cat:any) => (
                  <div key={cat.label} style={{ fontSize:'12px', color:cat.over ? '#b91c1c' : '#b45309', background:cat.over ? '#fef2f2' : '#fffbeb', border:`1px solid ${cat.over ? '#fecaca' : '#fde68a'}`, borderRadius:'11px', padding:'8px 9px', lineHeight:1.45 }}>
                    {cat.over
                      ? `${cat.label} sudah melewati budget sebesar ${money(cat.spent - cat.planned)}. Cek item di bawah untuk melihat penyebab utamanya.`
                      : `${cat.label} sudah memakai ${cat.pct}% dari budget. Kategori ini perlu dipantau agar tidak melewati batas.`}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ border:'1px solid #e3e7ee', borderRadius:'16px', overflow:'hidden', background:'#fff' }}>
            <div style={{ padding:'11px 12px', borderBottom:'1px solid #e3e7ee', display:'flex', justifyContent:'space-between', alignItems:'center', gap:'10px' }}>
              <div>
                <div style={{ fontSize:'13px', fontWeight:950, color:'#111827' }}>Expense Breakdown</div>
                <div style={{ fontSize:'11px', color:'#94a3b8', marginTop:'1px' }}>Klik kategori → item → transaksi terbesar.</div>
              </div>
              <div style={{ fontSize:'11px', color:'#64748b', fontFamily:'var(--font-mono), monospace', whiteSpace:'nowrap' }}>{money(review.regularExpenseActual)}</div>
            </div>

            <div style={{ display:'flex', flexDirection:'column' }}>
              {review.categories.length === 0 ? (
                <div style={{ padding:'18px 13px', color:'#94a3b8', fontSize:'12.5px', textAlign:'center' }}>Belum ada budget atau transaksi expense bulan ini.</div>
              ) : review.categories.map((cat:any) => {
                const isOpen = openCategory === cat.label
                const color = cat.over ? '#b91c1c' : cat.near ? '#b45309' : '#15803d'
                return (
                  <div key={cat.label} style={{ borderBottom:'1px solid #f1f5f9' }}>
                    <button onClick={() => { setOpenCategory(isOpen ? null : cat.label); setOpenItem(null) }} style={{ width:'100%', border:'none', background:isOpen ? '#f8fafc' : '#fff', padding:'10px 12px', display:'grid', gridTemplateColumns:'1fr auto', gap:'10px', alignItems:'center', cursor:'pointer', textAlign:'left' }}>
                      <div style={{ minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'7px' }}>
                          <span style={{ fontSize:'12.5px', fontWeight:850, color:'#111827' }}>{cat.label}</span>
                          {(cat.over || cat.near) && <span style={{ fontSize:'9.5px', fontWeight:950, color, background:cat.over ? '#fef2f2' : '#fffbeb', border:`1px solid ${cat.over ? '#fecaca' : '#fde68a'}`, borderRadius:'999px', padding:'1px 6px' }}>{cat.over ? 'Over' : 'Near'}</span>}
                        </div>
                        <div style={{ marginTop:'3px', fontSize:'11px', color:'#64748b', fontFamily:'var(--font-mono), monospace' }}>{money(cat.spent)} / {money(cat.planned)}</div>
                      </div>
                      <div style={{ textAlign:'right', color, fontWeight:950, fontSize:'12.5px' }}>{cat.pct}%</div>
                    </button>

                    {isOpen && (
                      <div style={{ padding:'0 12px 11px 12px', background:'#f8fafc' }}>
                        <div style={{ display:'flex', flexDirection:'column', gap:'7px' }}>
                          {cat.items.map((item:any) => {
                            const key = `${cat.label}::${item.label}`
                            const itemOpen = openItem === key
                            const itemColor = item.over ? '#b91c1c' : item.near ? '#b45309' : '#15803d'
                            return (
                              <div key={key} style={{ border:'1px solid #e3e7ee', borderRadius:'11px', background:'#fff', overflow:'hidden' }}>
                                <button onClick={() => setOpenItem(itemOpen ? null : key)} style={{ width:'100%', border:'none', background:'#fff', padding:'9px 10px', display:'grid', gridTemplateColumns:'1fr auto', gap:'10px', alignItems:'center', cursor:'pointer', textAlign:'left' }}>
                                  <div style={{ minWidth:0 }}>
                                    <div style={{ fontSize:'12px', fontWeight:850, color:'#111827', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.label}</div>
                                    <div style={{ marginTop:'2px', fontSize:'10.5px', color:'#64748b', fontFamily:'var(--font-mono), monospace' }}>{money(item.spent)} / {money(item.planned)}</div>
                                  </div>
                                  <div style={{ textAlign:'right' }}>
                                    <div style={{ color:itemColor, fontWeight:950, fontSize:'11.5px' }}>{item.pct}%</div>
                                    <div style={{ color:'#94a3b8', fontSize:'9.5px' }}>{item.transactions.length} tx</div>
                                  </div>
                                </button>

                                {itemOpen && (
                                  <div style={{ borderTop:'1px solid #f1f5f9', padding:'8px 10px', display:'flex', flexDirection:'column', gap:'6px', background:'#fcfcfd' }}>
                                    {item.transactions.length === 0 ? (
                                      <div style={{ fontSize:'11.5px', color:'#94a3b8', padding:'6px 0' }}>Belum ada transaksi untuk item ini.</div>
                                    ) : item.transactions.map((t:any) => (
                                      <div key={t.id} style={{ display:'grid', gridTemplateColumns:'auto 1fr auto', gap:'8px', alignItems:'center', padding:'7px 8px', borderRadius:'9px', background:'#fff', border:'1px solid #f1f5f9' }}>
                                        <div style={{ fontSize:'10.5px', color:'#94a3b8', fontFamily:'var(--font-mono), monospace', fontWeight:750 }}>{t.date}</div>
                                        <div style={{ fontSize:'11.5px', color:'#111827', fontWeight:650, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.note || item.label}</div>
                                        <div style={{ fontSize:'11.5px', color:'#b91c1c', fontWeight:950, fontFamily:'var(--font-mono), monospace' }}>{money(Number(t.amt || 0))}</div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── MAIN CONTENT ─────────────────────────────────────────── */
function BulananContent({ curMonth, curYear }: { curMonth: MonthKey; curYear: number }) {
  const {
    plan, updatePlan, tx, loading, refreshing, saving,
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

  const budget         = useMemo(() => computedBudget(), [computedBudget])
  const incomeComputed = useMemo(() => computedIncome(), [computedIncome])
  const savingComputed = useMemo(() => computedSaving(), [computedSaving])
  const debtComputed   = useMemo(() => typeof computedDebt === 'function' ? computedDebt() : [], [computedDebt])
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
      return `Day ${now.getDate()} of ${last} · ${last - now.getDate()} days remaining · FiNK System`
    }
    const selDate = new Date(curYear, MONTHS_ORDER.indexOf(curMonth), 1)
    const nowDate = new Date(nowYear, now.getMonth(), 1)
    return selDate < nowDate
      ? 'This month has passed · FiNK System'
      : 'This month has not started yet · FiNK System'
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



  const card: React.CSSProperties      = { background:'#fff', border:'1px solid #e3e7ee', borderRadius:'16px', boxShadow:'0 2px 12px rgba(15,23,42,.05)', marginBottom:'14px', overflow:'hidden' }
  const cardHead: React.CSSProperties  = { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', borderBottom:'1px solid #e3e7ee', gap:'12px', background:'#fff' }
  const cardTitle: React.CSSProperties = { fontSize:'14px', fontWeight:900, color:'#111827', letterSpacing:'-.2px' }
  const cardSub: React.CSSProperties   = { fontSize:'11.5px', color:'#9ca3af', marginTop:'3px', lineHeight:1.45 }
  const colLabels: React.CSSProperties = { display:'flex', alignItems:'center', padding:'8px 16px', gap:'6px', background:'#f7f8fa', borderBottom:'1px solid #e3e7ee', fontSize:'10px', fontWeight:800, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.65px' }
  const actionBtn: React.CSSProperties = { display:'flex', alignItems:'center', gap:'6px', padding:'8px 12px', border:'1.5px solid #e3e7ee', borderRadius:'10px', background:'#fff', fontSize:'12px', fontWeight:800, color:'#4b5563', cursor:'pointer', boxShadow:'0 1px 2px rgba(15,23,42,.04)' }

  const MOBILE_TABS: { key: MobileTab; label: string }[] = [
    { key:'transactions', label:'Transactions' },
    { key:'budget',       label:'Expense' },
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
          <div style={cardTitle}>{activePanel==='budget' ? 'Expense' : 'Income'}</div>
          <div style={cardSub}>{activePanel==='budget' ? 'Actuals are calculated automatically from daily transactions' : 'Monthly income sources'}</div>
        </div>
        {!isMobile && (
          <div style={{ display:'flex', gap:'3px', background:'#f7f8fa', border:'1px solid #e3e7ee', borderRadius:'10px', padding:'3px' }}>
            {(['budget','income'] as DesktopPanel[]).map(p => (
              <button key={p} onClick={()=>setDesktopPanel(p)} style={{ fontSize:'11.5px', fontWeight:600, background:desktopPanel===p?'#fff':'none', color:desktopPanel===p?'#111827':'#9ca3af', border:'none', padding:'6px 14px', borderRadius:'8px', cursor:'pointer', boxShadow:desktopPanel===p?'0 1px 3px rgba(0,0,0,.07)':'none' }}>
                {p==='budget' ? 'Expense' : 'Income'}
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
            <div style={{ width:'100px', flexShrink:0, textAlign:'right', whiteSpace:'nowrap' }}>{activePanel==='budget' ? 'Budget' : 'Target'}</div>
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
    <div className="fink-journal-page">
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
          {!loading && refreshing && <span style={{ fontSize:'11px', color:'#9ca3af' }}>Syncing...</span>}
          {saving && <span style={{ fontSize:'11px', color:'#9ca3af' }}>Saving...</span>}
          {/* Reflection, Reconcile, Copy */}
          <button onClick={()=>setRefleksiOpen(true)}
            style={actionBtn}>
            <AppIcon name="mirror" size={14} /> Reflection
          </button>
          <button onClick={()=>setRekonOpen(true)}
            style={actionBtn}>
            <AppIcon name="scale" size={14} /> Reconcile
          </button>
          <button onClick={handleCopyBudget}
            style={actionBtn}>
            <AppIcon name="copy" size={14} /> Copy
          </button>
        </div>
      </div>

      {/* STAT STRIP */}
      <StatStrip income={incomeComputed} saving={savingComputed} debt={debtComputed} budget={budget} isMobile={isMobile} rawSisa={sisaApp} />

      {/* MOBILE: 3-tab */}
      {isMobile ? (
        <>
          <div
            style={{
              position:'sticky',
              top:'0px',
              zIndex:30,
              display:'flex',
              background:'rgba(255,255,255,0.92)',
              backdropFilter:'blur(12px)',
              WebkitBackdropFilter:'blur(12px)',
              border:'1px solid rgba(227,231,238,0.9)',
              borderRadius:'16px',
              padding:'6px 12px',
              marginBottom:'16px',
              boxShadow:'0 8px 24px rgba(15,23,42,.10)',
            }}
          >
            {MOBILE_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={()=>setMobileTab(tab.key)}
                style={{
                  flex:1,
                  padding:'10px 6px',
                  border:'none',
                  borderRadius:'12px',
                  background:mobileTab===tab.key?'#1a5c42':'transparent',
                  color:mobileTab===tab.key?'#fff':'#6b7280',
                  fontSize:'12px',
                  fontWeight:700,
                  cursor:'pointer',
                  transition:'all .18s ease',
                  boxShadow:mobileTab===tab.key?'0 2px 8px rgba(26,92,66,.22)':'none',
                }}
              >
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

      <ReflectionModal
        open={refleksiOpen}
        onClose={() => setRefleksiOpen(false)}
        budget={budget}
        income={incomeComputed}
        saving={savingComputed}
        debt={debtComputed}
        tx={tx}
        rawSisa={sisaApp}
        monthLabel={`${MONTH_NAMES[curMonth]} ${curYear}`}
      />

      {/* TX DETAIL MODAL */}
      {txDetailLabel && (
        <TxDetailModal label={txDetailLabel} tx={tx} onClose={()=>setTxDetailLabel(null)} />
      )}

      {/* RECONCILIATION MODAL */}
      {rekonOpen && (
        <RekonModal sisaApp={sisaApp} onClose={()=>setRekonOpen(false)} onSave={handleRekon} />
      )}

      <style>{`
        .fink-journal-page {
          width: 100%;
          max-width: 100%;
          overflow-x: clip;
          padding-bottom: max(18px, env(safe-area-inset-bottom));
        }

        @media (max-width: 768px) {
          .fink-journal-page {
            padding-bottom: calc(72px + env(safe-area-inset-bottom));
          }
          .fink-journal-page input,
          .fink-journal-page select,
          .fink-journal-page button {
            max-width: 100%;
          }
        }

        @media (max-width: 560px) {
          .fink-journal-page > div:first-child {
            gap: 10px !important;
          }
          .fink-journal-page > div:first-child > div:first-child {
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}

export default function BulananPage() {
  const { curMonth, curYear } = useMonthContext()
  return <BulananContent key={`${curMonth}-${curYear}`} curMonth={curMonth} curYear={curYear} />
}