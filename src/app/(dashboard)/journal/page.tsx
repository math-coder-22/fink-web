'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useMonthContext, MONTH_NAMES, MONTHS_ORDER } from '@/components/layout/DashboardShell'
import { useBulanan } from '@/hooks/useBulanan'
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
const pct = (actual: number, plan: number) => plan > 0 ? Math.round((actual / plan) * 100) : 0
const outcomeText = (n: number) => `${n >= 0 ? '+' : '-'} ${fmt(n)}`

/* ─── TX DETAIL MODAL (transaksi per item budget) ─────── */


/* ─── RECONCILIATION MODAL ─────────────────────────────────── */



/* ─── FINANCIAL REVIEW MODAL ─────────────────────────────── */
function ReviewModal({
  open,
  onClose,
  budget,
  income,
  saving,
  debt,
  tx,
  rawSisa,
  monthLabel,
  isMobile,
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
  isMobile: boolean
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
          <button aria-label="Close review" onClick={onClose} style={{ width:'32px', height:'32px', border:'none', background:'#f7f8fa', borderRadius:'10px', cursor:'pointer', color:'#4b5563', display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
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
                      <div style={{ padding:'0 12px 11px 12px', background:'#ffffff' }}>
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
                                  <div style={{ borderTop:'1px solid #f6f8fb', padding:'8px 10px', display:'flex', flexDirection:'column', gap:'6px', background:'#fcfcfd' }}>
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


type SetupBudgetSectionKey = 'income' | 'budget' | 'saving' | 'debt'

type SetupBudgetRow = {
  id: string
  section: SetupBudgetSectionKey
  category: string
  label: string
  previousBudget: number
  previousActual: number
  suggested: number
  value: number
  insight?: string
}

function setupRowId(section: SetupBudgetSectionKey, category: string, label: string) {
  return `${section}::${category || 'General'}::${label || 'New Item'}::${Math.random().toString(36).slice(2,8)}`
}

function roundBudgetValue(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0
  if (value < 100000) return Math.round(value / 5000) * 5000
  return Math.round(value / 10000) * 10000
}

function suggestBudgetValue(previousBudget: number, previousActual: number, section: SetupBudgetSectionKey) {
  const budget = Number(previousBudget || 0)
  const actual = Number(previousActual || 0)

  // Income, saving, dan debt adalah rencana yang harus stabil.
  // Jika sudah ada budget, pertahankan angka asli dan jangan dibulatkan.
  if (section === 'income' || section === 'saving' || section === 'debt') {
    if (budget > 0) return budget
    return actual > 0 ? roundBudgetValue(actual) : 0
  }

  if (budget <= 0) return roundBudgetValue(actual > 0 ? actual * 0.8 : 0)
  if (actual <= 0) return budget

  const ratio = actual / budget

  // Jika masih aman/stabil, jangan ubah dan jangan bulatkan.
  if (ratio >= 0.9 && ratio <= 1.1) return budget

  // Adjustment hanya dilakukan saat deviasi cukup jelas.
  if (ratio > 1.1 && ratio <= 1.25) return roundBudgetValue(budget + (actual - budget) * 0.3)
  if (ratio > 1.25) return roundBudgetValue(Math.min(budget * 1.25, budget + (actual - budget) * 0.25))
  if (ratio >= 0.8) return budget
  return roundBudgetValue(Math.max(actual * 1.15, budget * 0.9))
}

function setupBudgetInsight(previousBudget: number, previousActual: number, section: SetupBudgetSectionKey) {
  const budget = Number(previousBudget || 0)
  const actual = Number(previousActual || 0)
  if (section !== 'budget' || budget <= 0) return undefined
  const ratio = actual / budget
  if (ratio > 1.4) return 'Spending jauh melewati budget bulan lalu. Gunakan angka ini sebagai titik awal, bukan pembenaran overspending.'
  if (ratio > 1.1) return 'Spending melewati budget bulan lalu. Budget bulan berjalan dinaikkan secara konservatif.'
  if (ratio < 0.65 && actual > 0) return 'Budget bulan lalu banyak tersisa. Pertimbangkan apakah alokasi ini masih terlalu longgar.'
  if (ratio >= 0.9 && ratio <= 1.1) return 'Spending relatif stabil terhadap budget bulan lalu.'
  return undefined
}

function computeActualMapFromTx(items: any[]) {
  const map = new Map<string, number>()
  for (const t of Array.isArray(items) ? items : []) {
    if (t?.type === 'out' && t?.debt && !t?.settled) continue
    const key = `${t?.type}:${t?.cat}`
    map.set(key, (map.get(key) || 0) + Number(t?.amt || 0))
  }
  return map
}

function previousBudgetMap(previousPlan: any) {
  const map = new Map<string, number>()
  ;(previousPlan?.income || []).forEach((cat:any) => {
    ;(cat.items || []).forEach((item:any) => map.set(`income:${cat.label || 'Income'}:${item.label}`, Number(item.plan || 0)))
  })
  ;(previousPlan?.budget || []).forEach((cat:any) => {
    ;(cat.items || []).forEach((item:any) => map.set(`budget:${cat.label || 'Expenses'}:${item.label}`, Number(item.plan || 0)))
  })
  ;(previousPlan?.saving || []).forEach((item:any) => map.set(`saving:Saving:${item.label}`, Number(item.plan || 0)))
  ;(previousPlan?.debt || []).forEach((item:any) => map.set(`debt:Debt:${item.label}`, Number(item.plan || 0)))
  return map
}

function rowActualFromMap(section: SetupBudgetSectionKey, label: string, actualMap: Map<string, number>) {
  if (section === 'income') return actualMap.get(`inn:${label}`) || 0
  if (section === 'budget') return actualMap.get(`out:${label}`) || 0
  if (section === 'saving') return actualMap.get(`save:${label}`) || 0
  if (section === 'debt') return actualMap.get(`out:${label}`) || 0
  return 0
}

function createSetupRow(section: SetupBudgetSectionKey, category: string, label: string, value: number, previousBudget: number, previousActual: number): SetupBudgetRow {
  const suggested = suggestBudgetValue(previousBudget, previousActual, section)
  return {
    id: setupRowId(section, category, label),
    section,
    category: category || (section === 'income' ? 'Income' : section === 'budget' ? 'Expenses' : section === 'saving' ? 'Saving' : 'Debt'),
    label: label || 'New Item',
    previousBudget: Number(previousBudget || 0),
    previousActual: Number(previousActual || 0),
    suggested,
    value: Number(value || 0),
    insight: setupBudgetInsight(previousBudget, previousActual, section),
  }
}

function buildSetupRows(previousPlan: any, previousTx: any[]): SetupBudgetRow[] {
  const actualMap = computeActualMapFromTx(previousTx)
  const rows: SetupBudgetRow[] = []

  const addRow = (section: SetupBudgetSectionKey, category: string, label: string, previousBudget: number, previousActual: number) => {
    const suggested = suggestBudgetValue(previousBudget, previousActual, section)
    rows.push({
      id: setupRowId(section, category, label),
      section,
      category,
      label,
      previousBudget: Number(previousBudget || 0),
      previousActual: Number(previousActual || 0),
      suggested,
      value: suggested,
      insight: setupBudgetInsight(previousBudget, previousActual, section),
    })
  }

  ;(previousPlan?.income || []).forEach((cat:any) => {
    ;(cat.items || []).forEach((item:any) => addRow('income', cat.label || 'Income', item.label, Number(item.plan || 0), actualMap.get(`inn:${item.label}`) || 0))
  })

  ;(previousPlan?.budget || []).forEach((cat:any) => {
    ;(cat.items || []).forEach((item:any) => addRow('budget', cat.label || 'Expenses', item.label, Number(item.plan || 0), actualMap.get(`out:${item.label}`) || 0))
  })

  ;(previousPlan?.saving || []).forEach((item:any) => addRow('saving', 'Saving', item.label, Number(item.plan || 0), actualMap.get(`save:${item.label}`) || 0))
  ;(previousPlan?.debt || []).forEach((item:any) => addRow('debt', 'Debt', item.label, Number(item.plan || 0), actualMap.get(`out:${item.label}`) || 0))

  return rows.filter(row => row.label && (row.previousBudget > 0 || row.previousActual > 0 || row.suggested > 0))
}

function buildSetupRowsFromCurrent(currentPlan: any, previousPlan: any, previousTx: any[]): SetupBudgetRow[] {
  const prevBudget = previousBudgetMap(previousPlan)
  const actualMap = computeActualMapFromTx(previousTx)
  const rows: SetupBudgetRow[] = []

  ;(currentPlan?.income || []).forEach((cat:any) => {
    ;(cat.items || []).forEach((item:any) => {
      const pb = prevBudget.get(`income:${cat.label || 'Income'}:${item.label}`) || 0
      const pa = rowActualFromMap('income', item.label, actualMap)
      rows.push(createSetupRow('income', cat.label || 'Income', item.label, Number(item.plan || 0), pb, pa))
    })
  })

  ;(currentPlan?.budget || []).forEach((cat:any) => {
    ;(cat.items || []).forEach((item:any) => {
      const pb = prevBudget.get(`budget:${cat.label || 'Expenses'}:${item.label}`) || 0
      const pa = rowActualFromMap('budget', item.label, actualMap)
      rows.push(createSetupRow('budget', cat.label || 'Expenses', item.label, Number(item.plan || 0), pb, pa))
    })
  })

  ;(currentPlan?.saving || []).forEach((item:any) => {
    const pb = prevBudget.get(`saving:Saving:${item.label}`) || 0
    const pa = rowActualFromMap('saving', item.label, actualMap)
    rows.push(createSetupRow('saving', 'Saving', item.label, Number(item.plan || 0), pb, pa))
  })

  ;(currentPlan?.debt || []).forEach((item:any) => {
    const pb = prevBudget.get(`debt:Debt:${item.label}`) || 0
    const pa = rowActualFromMap('debt', item.label, actualMap)
    rows.push(createSetupRow('debt', 'Debt', item.label, Number(item.plan || 0), pb, pa))
  })

  return rows.filter(row => row.label && (row.value > 0 || row.previousBudget > 0 || row.previousActual > 0 || row.suggested > 0))
}

function rowsToMonthPlan(rows: SetupBudgetRow[], fallbackPlan: any) {
  const sectionRows = (section: SetupBudgetSectionKey) => rows.filter(row => row.section === section)

  const incomeGroups = new Map<string, any[]>()
  for (const row of sectionRows('income')) {
    if (!incomeGroups.has(row.category)) incomeGroups.set(row.category, [])
    incomeGroups.get(row.category)!.push({ label: row.label, plan: Number(row.value || 0), actual: 0 })
  }

  const budgetGroups = new Map<string, any[]>()
  for (const row of sectionRows('budget')) {
    if (!budgetGroups.has(row.category)) budgetGroups.set(row.category, [])
    budgetGroups.get(row.category)!.push({ label: row.label, plan: Number(row.value || 0), actual: 0 })
  }

  return {
    income: incomeGroups.size ? Array.from(incomeGroups, ([label, items]) => ({ label, items })) : fallbackPlan.income,
    budget: budgetGroups.size ? Array.from(budgetGroups, ([label, items]) => ({ label, items })) : fallbackPlan.budget,
    saving: sectionRows('saving').length ? sectionRows('saving').map(row => ({ label: row.label, plan: Number(row.value || 0), actual: 0 })) : fallbackPlan.saving,
    debt: sectionRows('debt').length ? sectionRows('debt').map(row => ({ label: row.label, plan: Number(row.value || 0), actual: 0 })) : fallbackPlan.debt,
  }
}

/* ─── SETUP BUDGET MODAL ─────────────────────────────── */
function SetupBudgetModal({
  open,
  onClose,
  curMonth,
  curYear,
  currentPlan,
  isMobile,
  onApply,
}: {
  open: boolean
  onClose: () => void
  curMonth: MonthKey
  curYear: number
  currentPlan: any
  isMobile: boolean
  onApply: (nextPlan: any) => void
}) {
  const [rows, setRows] = useState<SetupBudgetRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hovRow, setHovRow] = useState<string|null>(null)
  const [dragOver, setDragOver] = useState<string|null>(null)

  const catDragSrc = useRef<{ section: SetupBudgetSectionKey; category: string } | null>(null)
  const itemDragSrc = useRef<{ id: string } | null>(null)

  const previousInfo = useMemo(() => {
    const idx = MONTHS_ORDER.indexOf(curMonth)
    const previousMonth = MONTHS_ORDER[(idx + 11) % 12]
    const previousYear = idx === 0 ? curYear - 1 : curYear
    return { month: previousMonth, year: previousYear, label: `${MONTH_NAMES[previousMonth]} ${previousYear}` }
  }, [curMonth, curYear])

  const loadPreviousData = async () => {
    const res = await fetch(`/api/journal?month=${previousInfo.month}&year=${previousInfo.year}`, { cache:'no-store' })
    if (!res.ok) throw new Error('Failed to load previous month data')
    return res.json()
  }

  useEffect(() => {
    if (!open) return
    let active = true
    async function loadBudgetWorkspace() {
      setLoading(true)
      setError('')
      try {
        const json = await loadPreviousData()
        if (!active) return
        const currentRows = buildSetupRowsFromCurrent(currentPlan, json?.plan, Array.isArray(json?.tx) ? json.tx : [])
        const rebuiltRows = buildSetupRows(json?.plan, Array.isArray(json?.tx) ? json.tx : [])
        setRows(currentRows.length ? currentRows : rebuiltRows)
      } catch (err) {
        if (!active) return
        const currentRows = buildSetupRowsFromCurrent(currentPlan, null, [])
        setRows(currentRows)
        setError('Previous month comparison could not be loaded. You can still edit the current budget.')
      } finally {
        if (active) setLoading(false)
      }
    }
    loadBudgetWorkspace()
    return () => { active = false }
  }, [open, previousInfo.month, previousInfo.year, currentPlan])

  const sectionLabels: Record<SetupBudgetSectionKey, string> = {
    income: 'Income',
    budget: 'Expenses',
    saving: 'Saving',
    debt: 'Debt',
  }

  const sectionColors: Record<SetupBudgetSectionKey, string> = {
    income: '#15803d',
    budget: '#1a5c42',
    saving: '#2563eb',
    debt: '#92400e',
  }

  const grouped = useMemo(() => {
    const result: Record<SetupBudgetSectionKey, Map<string, SetupBudgetRow[]>> = {
      income: new Map(),
      budget: new Map(),
      saving: new Map(),
      debt: new Map(),
    }
    for (const row of rows) {
      if (!result[row.section].has(row.category)) result[row.section].set(row.category, [])
      result[row.section].get(row.category)!.push(row)
    }
    return result
  }, [rows])

  const totals = useMemo(() => {
    const incomeCapacity = rows.filter(row => row.section === 'income').reduce((s, row) => s + Number(row.value || 0), 0)
    const plannedAllocation = rows.filter(row => row.section !== 'income').reduce((s, row) => s + Number(row.value || 0), 0)
    const savingAllocation = rows.filter(row => row.section === 'saving').reduce((s, row) => s + Number(row.value || 0), 0)
    const expenseAllocation = rows.filter(row => row.section === 'budget').reduce((s, row) => s + Number(row.value || 0), 0)
    const debtAllocation = rows.filter(row => row.section === 'debt').reduce((s, row) => s + Number(row.value || 0), 0)
    return { incomeCapacity, plannedAllocation, remaining: incomeCapacity - plannedAllocation, savingAllocation, expenseAllocation, debtAllocation }
  }, [rows])

  const capacityGuidance = useMemo(() => {
    if (totals.remaining >= 0) return ''
    const shortage = Math.abs(totals.remaining)
    if (totals.savingAllocation > 0) {
      const reduceSaving = Math.min(shortage, totals.savingAllocation)
      return `Possible adjustment: reduce saving allocation by around ${fmt(reduceSaving)} or review flexible expenses.`
    }
    if (totals.expenseAllocation > 0) {
      return 'Possible adjustment: review flexible expense categories first before changing debt or essential bills.'
    }
    return 'Possible adjustment: review planned allocation before applying this budget.'
  }, [totals])

  if (!open) return null

  const setRowValue = (id: string, value: number) => {
    setRows(prev => prev.map(row => row.id === id ? { ...row, value: Number.isFinite(value) ? value : 0 } : row))
  }

  const renameCategory = (section: SetupBudgetSectionKey, oldCategory: string, nextCategory: string) => {
    setRows(prev => prev.map(row => row.section === section && row.category === oldCategory ? { ...row, category: nextCategory } : row))
  }

  const renameItem = (id: string, label: string) => {
    setRows(prev => prev.map(row => row.id === id ? { ...row, label } : row))
  }

  const removeCategory = (section: SetupBudgetSectionKey, category: string) => {
    const ok = confirm(`Hapus kategori "${category}" beserta semua item di dalamnya?`)
    if (!ok) return
    setRows(prev => prev.filter(row => !(row.section === section && row.category === category)))
  }

  const removeItem = (id: string, label: string) => {
    const ok = confirm(`Hapus item "${label}"?`)
    if (!ok) return
    setRows(prev => prev.filter(row => row.id !== id))
  }

  const addCategory = (section: SetupBudgetSectionKey) => {
    const category = section === 'income' ? 'New Category' : section === 'budget' ? 'New Category' : section === 'saving' ? 'Saving' : 'Debt'
    const label = section === 'debt' ? 'New Debt' : section === 'saving' ? 'New Allocation' : 'New Item'
    setRows(prev => [...prev, createSetupRow(section, category, label, 0, 0, 0)])
  }

  const addItemToCategory = (section: SetupBudgetSectionKey, category: string) => {
    const label = section === 'debt' ? 'New Debt' : section === 'saving' ? 'New Allocation' : 'New Item'
    setRows(prev => [...prev, createSetupRow(section, category, label, 0, 0, 0)])
  }

  const reorderCategories = (section: SetupBudgetSectionKey, sourceCategory: string, targetCategory: string) => {
    if (sourceCategory === targetCategory) return
    setRows(prev => {
      const before = prev.filter(row => row.section !== section)
      const sectionRows = prev.filter(row => row.section === section)
      const categories = Array.from(new Set(sectionRows.map(row => row.category)))
      const from = categories.indexOf(sourceCategory)
      const to = categories.indexOf(targetCategory)
      if (from < 0 || to < 0) return prev
      const nextCategories = [...categories]
      const [moved] = nextCategories.splice(from, 1)
      nextCategories.splice(to, 0, moved)
      return [
        ...before,
        ...nextCategories.flatMap(cat => sectionRows.filter(row => row.category === cat))
      ]
    })
  }

  const reorderItem = (sourceId: string, targetId: string, targetSection: SetupBudgetSectionKey, targetCategory: string) => {
    if (sourceId === targetId) return
    setRows(prev => {
      const source = prev.find(row => row.id === sourceId)
      const targetIndex = prev.findIndex(row => row.id === targetId)
      if (!source || targetIndex < 0) return prev
      const without = prev.filter(row => row.id !== sourceId)
      const adjustedTargetIndex = without.findIndex(row => row.id === targetId)
      if (adjustedTargetIndex < 0) return prev
      const moved = { ...source, section: targetSection, category: targetCategory }
      const next = [...without]
      next.splice(adjustedTargetIndex, 0, moved)
      return next
    })
  }

  const rebuildFromPrevious = async () => {
    const confirmed = window.confirm(`Rebuild current budget using ${previousInfo.label} activity? Current unsaved changes will be replaced.`)
    if (!confirmed) return
    try {
      setLoading(true)
      const json = await loadPreviousData()
      setRows(buildSetupRows(json?.plan, Array.isArray(json?.tx) ? json.tx : []))
      setError('')
    } catch (err) {
      setError('Could not rebuild from previous month. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const apply = () => {
    if (!rows.length) return
    onApply(rowsToMonthPlan(rows, currentPlan))
    onClose()
  }

  const renderMoney = (value:number) => fmt(value)
  const renderSignedMoney = (value:number) => {
    const amount = fmt(value)
    return value < 0 ? `- ${amount}` : amount
  }
  const inp: React.CSSProperties = { border:'none', background:'transparent', outline:'none', fontFamily:'inherit' }
  const rowBase: React.CSSProperties = { display:'flex', alignItems:'center', gap:'5px', borderRadius:'10px', padding:'8px 10px', marginBottom:'6px', border:'1px solid #e3e7ee', transition:'border-color .13s' }
  const delBtn: React.CSSProperties = { width:'20px', height:'20px', borderRadius:'4px', border:'none', background:'none', color:'#9ca3af', fontSize:'15px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0, opacity:0, transition:'opacity .13s' }

  const renderAddButton = (label: string, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      style={{ width:'100%', padding:'9px 10px', border:'1.5px dashed #cbd5e1', borderRadius:'10px', background:'#fff', color:'#6b7280', fontSize:'12px', fontWeight:800, cursor:'pointer', marginTop:'8px', transition:'all .13s', textAlign:'center' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#1a5c42'; e.currentTarget.style.background = '#e8f5ef'; e.currentTarget.style.color = '#1a5c42' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#6b7280' }}
    >
      {label}
    </button>
  )

  return (
    <div onClick={e => { if (e.currentTarget === e.target) onClose() }} style={{ position:'fixed', inset:0, zIndex:860, background:'rgba(15,23,42,.42)', backdropFilter:'blur(4px)', display:'flex', alignItems:'flex-start', justifyContent:'center', overflowY:'auto', padding:'max(14px, env(safe-area-inset-top)) 12px 16px' }}>
      <div style={{ width:'100%', maxWidth:'980px', background:'#fff', border:'1px solid #e3e7ee', borderRadius:'22px', boxShadow:'0 24px 80px rgba(15,23,42,.24)', overflow:'hidden' }}>
        <div style={{ position:'sticky', top:0, zIndex:2, background:'rgba(255,255,255,.96)', backdropFilter:'blur(12px)', display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'14px', padding:'14px 16px', borderBottom:'1px solid #e3e7ee' }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:'17px', fontWeight:900, color:'#111827' }}>
              <AppIcon name="copy" size={18} /> Setup Budget — {MONTH_NAMES[curMonth]} {curYear}
            </div>
            <div style={{ fontSize:'11.5px', color:'#64748b', marginTop:'2px' }}>Manage and adjust your monthly budget</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <button
              type="button"
              onClick={rebuildFromPrevious}
              style={{ border:'1px solid #dbe3ef', background:'#fff', color:'#334155', borderRadius:'10px', padding:'8px 10px', fontSize:'11px', fontWeight:800, cursor:'pointer' }}
            >
              Rebuild from Previous Month
            </button>
            <button aria-label="Close setup budget" onClick={onClose} style={{ width:'32px', height:'32px', border:'none', background:'#f7f8fa', borderRadius:'10px', cursor:'pointer', color:'#4b5563', display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <AppIcon name="close" size={16} />
            </button>
          </div>
        </div>

        <div style={{ padding:'14px 16px 18px', display:'flex', flexDirection:'column', gap:'12px' }}>
          <div style={{ border:'1px solid #e3e7ee', borderRadius:'16px', padding:'12px 14px', background:'#fff' }}>
            <div style={{ fontSize:'12px', color:'#64748b', lineHeight:1.5, marginBottom:'10px' }}>Current budget is loaded from the selected month. Previous month data is shown only for comparison and awareness.</div>
            <div style={{ display:'grid', gridTemplateColumns:isMobile ? '1fr' : 'repeat(3, 1fr)', gap:'8px' }}>
              {[
                ['Income Capacity', totals.incomeCapacity, '#15803d'],
                ['Planned Allocation', totals.plannedAllocation, '#111827'],
                ['Remaining Capacity', totals.remaining, totals.remaining < 0 ? '#b91c1c' : '#15803d'],
              ].map(([label, value, color]) => (
                <div key={String(label)} style={{ border:'1px solid #eef2f7', borderRadius:'13px', padding:'10px 11px', background:'#fcfcfd' }}>
                  <div style={{ fontSize:'11px', color:'#64748b', fontWeight:750 }}>{label}</div>
                  <div style={{ marginTop:'3px', fontSize:'14px', fontWeight:900, color:String(color), fontFamily:'var(--font-mono), monospace' }}>{String(label) === 'Remaining Capacity' ? renderSignedMoney(Number(value)) : renderMoney(Number(value))}</div>
                </div>
              ))}
            </div>
            {totals.remaining < 0 && (
              <div style={{ marginTop:'10px', padding:'9px 10px', border:'1px solid #fecaca', borderRadius:'12px', background:'#fef2f2', color:'#b91c1c', fontSize:'12px', fontWeight:700, lineHeight:1.45 }}>
                Planned allocation exceeds income capacity by {renderMoney(Math.abs(totals.remaining))}. Consider reducing saving allocation or flexible expenses first before increasing total spending.
                {capacityGuidance && (
                  <div style={{ marginTop:'5px', color:'#7f1d1d', fontWeight:600 }}>
                    {capacityGuidance}
                  </div>
                )}
              </div>
            )}
          </div>

          {loading && (
            <div style={{ border:'1px solid #e3e7ee', borderRadius:'16px', padding:'14px', color:'#64748b', fontSize:'13px', textAlign:'center' }}>Loading budget workspace...</div>
          )}
          {error && (
            <div style={{ border:'1px solid #fecaca', borderRadius:'16px', padding:'14px', color:'#b91c1c', background:'#fef2f2', fontSize:'13px' }}>{error}</div>
          )}

          <div style={{ border:'1px solid #e3e7ee', borderRadius:'16px', overflow:'hidden', background:'#fff' }}>
            <div style={{
              display:'grid',
              gridTemplateColumns:isMobile ? '1fr 74px 74px 92px' : '1fr 112px 112px 124px',
              gap:'8px',
              alignItems:'center',
              padding:'9px 22px 9px 34px',
              background:'#fbfcfd',
              borderBottom:'1px solid #e8edf4',
              fontSize:'10px',
              fontWeight:850,
              color:'#64748b',
              textTransform:'uppercase',
              letterSpacing:'.5px'
            }}>
              <div />
              <div style={{ textAlign:'right' }}>Prev.</div>
              <div style={{ textAlign:'right' }}>Actual</div>
              <div style={{ textAlign:'right' }}>Budget</div>
            </div>

            {(['income','budget','saving','debt'] as SetupBudgetSectionKey[]).map(section => {
              const categories = Array.from(grouped[section].entries())
              return (
                <div key={section} style={{ borderBottom:'1px solid #e3e7ee', paddingBottom:'8px' }}>
                  <div style={{ padding:'14px 12px 8px', fontSize:'10px', fontWeight:750, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.7px' }}>{sectionLabels[section]}</div>

                  {categories.map(([category, sectionRows]) => {
                    const catPrev = sectionRows.reduce((s,row)=>s + Number(row.previousBudget || 0), 0)
                    const catActualctual = sectionRows.reduce((s,row)=>s + Number(row.previousActual || 0), 0)
                    const catBudget = sectionRows.reduce((s,row)=>s + Number(row.value || 0), 0)
                    const pct = catBudget > 0 ? Math.min(120, (catActualctual / catBudget) * 100) : (catActualctual > 0 ? 100 : 0)
                    const clr = section === 'income'
                      ? '#15803d'
                      : section === 'debt'
                        ? '#92400e'
                        : pct >= 100
                          ? '#b91c1c'
                          : pct >= 85
                            ? '#d97706'
                            : sectionColors[section]
                    const hk = `${section}-${category}`

                    return (
                      <div key={hk}
                        style={{ margin:'0 12px 6px' }}
                        onDragOver={e=>{ e.preventDefault(); e.stopPropagation(); setDragOver(hk) }}
                        onDrop={e=>{
                          e.preventDefault()
                          e.stopPropagation()
                          if(e.dataTransfer.getData('type') === 'setup-cat') {
                            const src = catDragSrc.current
                            if(src) reorderCategories(src.section, src.category, category)
                            catDragSrc.current = null
                          }
                          setDragOver(null)
                        }}
                        onDragLeave={()=>setDragOver(null)}
                      >
                        <div
                          draggable
                          onDragStart={e=>{ catDragSrc.current = { section, category }; e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('type','setup-cat'); e.stopPropagation() }}
                          style={{ ...rowBase, background:'#fff', cursor:'grab', borderColor:dragOver===hk ? clr : '#e3e7ee', borderWidth:dragOver===hk ? '2px' : '1px' }}
                          onMouseEnter={()=>setHovRow(hk)}
                          onMouseLeave={()=>setHovRow(null)}
                        >
                          <span style={{ width:'6px', flexShrink:0, cursor:'grab', display:'flex', alignItems:'center', justifyContent:'center' }} />
                          <input
                            style={{ ...inp, flex:1, minWidth:0, fontSize:'13px', fontWeight:600, color:'#111827', cursor:'text' }}
                            value={category}
                            onMouseDown={e=>e.stopPropagation()}
                            onChange={e=>renameCategory(section, category, e.target.value)}
                          />
                          {isMobile ? (
                            <div style={{ flex:'2', minWidth:0, display:'grid', gridTemplateColumns:'1fr 1fr 1.15fr', gap:'4px', alignItems:'center' }}>
                              <span style={{ fontSize:'9.5px', color:'#9ca3af', fontFamily:'var(--font-mono), monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', width:'100%', textAlign:'right' }}>{catPrev ? Math.round(catPrev).toLocaleString('id-ID') : '-'}</span>
                              <span style={{ fontSize:'10px', color:clr, fontWeight:700, fontFamily:'var(--font-mono), monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', width:'100%', textAlign:'right' }}>{catActualctual ? Math.round(catActualctual).toLocaleString('id-ID') : '-'}</span>
                              <span style={{ fontSize:'11px', color:'#111827', fontWeight:850, fontFamily:'var(--font-mono), monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', width:'100%', textAlign:'right' }}>{catBudget ? Math.round(catBudget).toLocaleString('id-ID') : '-'}</span>
                            </div>
                          ) : (
                            <>
                              <span style={{ width:'112px', flexShrink:0, fontSize:'11.5px', color:'#9ca3af', textAlign:'right', fontFamily:'var(--font-mono), monospace', whiteSpace:'nowrap' }}>{catPrev ? Math.round(catPrev).toLocaleString('id-ID') : '-'}</span>
                              <span style={{ width:'112px', flexShrink:0, fontSize:'11.5px', fontWeight:600, textAlign:'right', fontFamily:'var(--font-mono), monospace', color:clr, whiteSpace:'nowrap' }}>{catActualctual ? Math.round(catActualctual).toLocaleString('id-ID') : '-'}</span>
                              <span style={{ width:'124px', flexShrink:0, fontSize:'12px', fontWeight:850, textAlign:'right', fontFamily:'var(--font-mono), monospace', color:'#111827', whiteSpace:'nowrap' }}>{catBudget ? Math.round(catBudget).toLocaleString('id-ID') : '-'}</span>
                            </>
                          )}
                          <button style={{ ...delBtn, opacity:hovRow===hk ? 1 : 0 }} title="Hapus kategori" onMouseDown={e=>e.stopPropagation()} onClick={()=>removeCategory(section, category)} aria-label="Remove">
                            <AppIcon name="trash" size={13} />
                          </button>
                        </div>

                        <div style={{ height:'2px', background:'#e3e7ee', borderRadius:'1px', margin:'-2px 0 5px 22px' }}>
                          <div style={{ height:'2px', borderRadius:'1px', background:clr, width:`${Math.min(100,pct)}%`, transition:'width .3s' }} />
                        </div>

                        {(pct > 110 || pct < 65) && (
                          <div style={{
                            margin:'0 0 8px 22px',
                            padding:'0 2px',
                            fontSize:'11px',
                            lineHeight:1.45,
                            color:pct > 110 ? '#b45309' : '#64748b',
                            fontWeight:550,
                            display:'flex',
                            alignItems:'flex-start',
                            gap:'6px'
                          }}>
                            <span style={{ marginTop:'1px', flexShrink:0 }}>
                              {pct > 110 ? '⚠' : '•'}
                            </span>
                            <span>
                              {pct > 110
                                ? `${category} exceeded last month’s budget by ${Math.round(pct - 100)}%.`
                                : `${category} spending remained below planned budget last month.`}
                            </span>
                          </div>
                        )}

                        <div style={{ paddingLeft:'22px' }}>
                          {sectionRows.map(row => {
                            const rk = `setup-row-${row.id}`
                            const changed = Number(row.value || 0) !== Number(row.suggested || 0)
                            return (
                              <div
                                key={row.id}
                                draggable
                                onDragStart={e=>{ itemDragSrc.current = { id:row.id }; e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('type','setup-item'); e.stopPropagation() }}
                                onDragOver={e=>{ e.preventDefault(); e.stopPropagation(); setDragOver(rk) }}
                                onDrop={e=>{
                                  e.preventDefault()
                                  e.stopPropagation()
                                  if(e.dataTransfer.getData('type') === 'setup-item') {
                                    const src = itemDragSrc.current
                                    if(src) reorderItem(src.id, row.id, section, category)
                                    itemDragSrc.current = null
                                  }
                                  setDragOver(null)
                                }}
                                onDragLeave={()=>setDragOver(null)}
                                style={{ ...rowBase, background:'#f7f8fa', cursor:'grab', borderColor:dragOver===rk ? clr : '#e3e7ee', borderWidth:dragOver===rk ? '2px' : '1px' }}
                                onMouseEnter={()=>setHovRow(rk)}
                                onMouseLeave={()=>setHovRow(null)}
                              >
                                <span style={{ width:'14px', flexShrink:0, cursor:'grab', display:'flex', alignItems:'center', justifyContent:'center', touchAction:'none' }} />
                                <div style={{ flex:1, minWidth:0 }}>
                                  <input
                                    style={{ ...inp, width:'100%', minWidth:0, fontSize:'13px', fontWeight:600, color:'#111827', cursor:'text' }}
                                    value={row.label}
                                    onMouseDown={e=>e.stopPropagation()}
                                    onChange={e=>renameItem(row.id, e.target.value)}
                                  />
                                  {row.insight && (
                                    <div style={{ marginTop:'2px', fontSize:'10.5px', lineHeight:1.35, color:'#64748b', fontWeight:500 }}>
                                      {row.insight}
                                    </div>
                                  )}
                                </div>

                                {isMobile ? (
                                  <div style={{ flex:'2', minWidth:0, display:'grid', gridTemplateColumns:'1fr 1fr 1.15fr', gap:'4px', alignItems:'center' }}>
                                    <div style={{ fontSize:'9.5px', color:'#9ca3af', textAlign:'right', fontFamily:'var(--font-mono), monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{row.previousBudget ? Math.round(row.previousBudget).toLocaleString('id-ID') : '-'}</div>
                                    <div style={{ fontSize:'10px', color:row.previousActual > row.previousBudget && row.previousBudget > 0 ? '#b91c1c' : '#6b7280', fontWeight:600, textAlign:'right', fontFamily:'var(--font-mono), monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{row.previousActual ? Math.round(row.previousActual).toLocaleString('id-ID') : '-'}</div>
                                    <input
                                      style={{ ...inp, fontSize:'11px', fontFamily:'var(--font-mono), monospace', color:'#111827', fontWeight:800, textAlign:'right', width:'100%' }}
                                      value={row.value ? Math.round(row.value).toLocaleString('id-ID') : ''}
                                      placeholder="0"
                                      onMouseDown={e=>e.stopPropagation()}
                                      onFocus={e=>e.currentTarget.select()}
                                      onChange={e=>setRowValue(row.id, Number(String(e.currentTarget.value).replace(/\D/g,'')) || 0)}
                                    />
                                  </div>
                                ) : (
                                  <>
                                    <div style={{ width:'112px', flexShrink:0, fontSize:'12px', fontWeight:500, textAlign:'right', fontFamily:'var(--font-mono), monospace', color:'#9ca3af', whiteSpace:'nowrap' }}>
                                      {row.previousBudget ? Math.round(row.previousBudget).toLocaleString('id-ID') : '-'}
                                    </div>
                                    <div style={{ width:'112px', flexShrink:0, fontSize:'12px', fontWeight:600, textAlign:'right', fontFamily:'var(--font-mono), monospace', color:row.previousActual > row.previousBudget && row.previousBudget > 0 ? '#b91c1c' : '#4b5563', whiteSpace:'nowrap' }}>
                                      {row.previousActual ? Math.round(row.previousActual).toLocaleString('id-ID') : '-'}
                                    </div>
                                    <div style={{ width:'124px', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'flex-end', gap:'4px' }}>
                                      <input
                                        style={{ ...inp, width: changed ? '84px' : '104px', flexShrink:0, fontSize:'12px', fontWeight:800, textAlign:'right', fontFamily:'var(--font-mono), monospace', color:'#111827', whiteSpace:'nowrap' }}
                                        value={row.value ? Math.round(row.value).toLocaleString('id-ID') : ''}
                                        placeholder="0"
                                        onMouseDown={e=>e.stopPropagation()}
                                        onFocus={e=>e.currentTarget.select()}
                                        onChange={e=>setRowValue(row.id, Number(String(e.currentTarget.value).replace(/\D/g,'')) || 0)}
                                      />
                                      {changed && (
                                        <button title="Reset to suggested value" onMouseDown={e=>e.stopPropagation()} onClick={()=>setRowValue(row.id,row.suggested)} style={{ width:'22px', height:'22px', border:'1px solid #fde68a', borderRadius:'7px', background:'#fffbeb', color:'#b45309', cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>↻</button>
                                      )}
                                    </div>
                                  </>
                                )}

                                <button style={{ ...delBtn, opacity:hovRow===rk ? 1 : 0 }} onMouseDown={e=>e.stopPropagation()} onClick={()=>removeItem(row.id, row.label)} aria-label="Remove">
                                  <AppIcon name="trash" size={13} />
                                </button>
                              </div>
                            )
                          })}

                          {renderAddButton('+ add item', () => addItemToCategory(section, category))}
                        </div>
                      </div>
                    )
                  })}

                  {renderAddButton('+ add category', () => addCategory(section))}
                </div>
              )
            })}
          </div>

          <div style={{ display:'flex', justifyContent:'flex-end', gap:'8px', borderTop:'1px solid #e3e7ee', paddingTop:'12px' }}>
            <button onClick={onClose} style={{ padding:'9px 13px', border:'1px solid #e3e7ee', borderRadius:'11px', background:'#fff', color:'#4b5563', fontSize:'12px', fontWeight:800, cursor:'pointer' }}>Cancel</button>
            <button onClick={apply} disabled={!rows.length || loading} style={{ padding:'9px 14px', border:'none', borderRadius:'11px', background:(!rows.length || loading) ? '#9ca3af' : '#1a5c42', color:'#fff', fontSize:'12px', fontWeight:900, cursor:(!rows.length || loading) ? 'not-allowed' : 'pointer' }}>Apply Changes</button>
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
  const [setupBudgetOpen, setSetupBudgetOpen] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
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
      return `Day ${now.getDate()} of ${last} · ${Math.max(1, last - now.getDate() + 1)} days remaining · FiNK System`
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

  const journalSummary = useMemo(() => {
    const incomeActual = incomeComputed.reduce((s:any, c:any) => s + (c.items || []).reduce((ss:any, i:any) => ss + Number(i.actual || 0), 0), 0)
    const incomePlan = incomeComputed.reduce((s:any, c:any) => s + (c.items || []).reduce((ss:any, i:any) => ss + Number(i.plan || 0), 0), 0)
    const expenseOnlyActual = budget.reduce((s:any, c:any) => s + (c.items || []).reduce((ss:any, i:any) => ss + Number(i.actual || 0), 0), 0)
    const expenseOnlyPlan = budget.reduce((s:any, c:any) => s + (c.items || []).reduce((ss:any, i:any) => ss + Number(i.plan || 0), 0), 0)
    const debtActual = debtComputed.reduce((s:any, i:any) => s + Number(i.actual || 0), 0)
    const debtPlan = debtComputed.reduce((s:any, i:any) => s + Number(i.plan || 0), 0)
    const expenseActual = expenseOnlyActual + debtActual
    const expensePlan = expenseOnlyPlan + debtPlan
    const savingActual = savingComputed.reduce((s:any, i:any) => s + Number(i.actual || 0), 0)
    const savingPlan = savingComputed.reduce((s:any, i:any) => s + Number(i.plan || 0), 0)
    const outcome = incomeActual - expenseActual - savingActual
    return { incomeActual, incomePlan, expenseActual, expensePlan, savingActual, savingPlan, outcome }
  }, [incomeComputed, budget, debtComputed, savingComputed])

  const outcomeTone = journalSummary.outcome >= 0 ? '#4f2fe6' : '#b91c1c'
  const remainingDays = (() => {
    const now = new Date()
    const nowMonth = MONTHS_ORDER[now.getMonth()]
    const nowYear = now.getFullYear()
    if (curYear === nowYear && curMonth === nowMonth) {
      const last = new Date(nowYear, now.getMonth()+1, 0).getDate()
      return Math.max(1, last - now.getDate() + 1)
    }
    const selectedMonthIndex = MONTHS_ORDER.indexOf(curMonth)
    return new Date(curYear, selectedMonthIndex + 1, 0).getDate()
  })()
  const dailyRecommendation = Math.floor(Math.max(0, journalSummary.outcome) / remainingDays)
  const outcomeMessage =
    journalSummary.outcome > 0
      ? `≈ ${fmt(dailyRecommendation)} / hari`
      : journalSummary.outcome < 0
        ? `Defisit ${fmt(Math.abs(journalSummary.outcome))}`
        : 'Budget bulan ini telah habis'
  const outcomeSubMessage = ''

  const SummaryMetric = ({ label, value, actual, plan, color }: { label:string; value:number; actual:number; plan:number; color:string }) => {
    const percentage = pct(actual, plan)
    if (isMobile) {
      return (
        <div style={{ minWidth:0, display:'grid', gridTemplateColumns:'minmax(0, 1fr) auto', alignItems:'center', gap:10, padding:'6px 0', borderBottom:'none' }}>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:9.5, fontWeight:950, color, textTransform:'uppercase', letterSpacing:'.55px' }}>{label}</div>
            <div style={{ marginTop:3, fontSize:9.5, color:'#64748b', fontFamily:'var(--font-mono), monospace', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{percentage}% · plan {fmt(plan)}</div>
          </div>
          <div style={{ fontSize:13.5, fontWeight:950, color, fontFamily:'var(--font-mono), monospace', letterSpacing:'-.45px', whiteSpace:'nowrap' }}>{fmt(value)}</div>
        </div>
      )
    }
    return (
      <div style={{ minWidth:0, borderLeft:'none', padding:'0' }}>
        <div style={{ fontSize:9.5, fontWeight:950, color, textTransform:'uppercase', letterSpacing:'.55px' }}>{label}</div>
        <div style={{ marginTop:6, fontSize:15, fontWeight:950, color, fontFamily:'var(--font-mono), monospace', letterSpacing:'-.5px', overflowWrap:'anywhere' }}>{fmt(value)}</div>
        <div style={{ marginTop:7, height:5, borderRadius:999, background:'#e5e7eb', overflow:'hidden' }}>
          <div style={{ width:`${Math.min(100, Math.max(0, percentage))}%`, height:'100%', borderRadius:999, background:color }} />
        </div>
        <div style={{ marginTop:7, fontSize:9.5, color:'#64748b', fontFamily:'var(--font-mono), monospace', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{percentage}% · plan {fmt(plan)}</div>
      </div>
    )
  }

  const MoreActionsMenu = (
    <div style={{ position:'relative' }}>
      <button onClick={()=>setToolsOpen(v=>!v)} aria-label="More actions" style={{
        width:isMobile ? 31 : 36,
        height:isMobile ? 31 : 36,
        border:'none',
        borderRadius:10,
        background:'transparent',
        color:'#334155',
        fontSize:22,
        lineHeight:1,
        fontWeight:900,
        cursor:'pointer',
        boxShadow:'none',
      }}>⋮</button>

      {toolsOpen && (
        <div style={{ position:'absolute', right:0, top:'calc(100% + 6px)', zIndex:60, minWidth:'172px', background:'#fff', border:'1px solid #e3e7ee', borderRadius:'12px', boxShadow:'0 14px 36px rgba(15,23,42,.16)', padding:'6px' }}>
          <button onClick={()=>{ setSetupBudgetOpen(true); setToolsOpen(false) }} style={{ width:'100%', border:'none', background:'#fff', borderRadius:'9px', padding:'9px 10px', textAlign:'left', fontSize:'12px', fontWeight:500, color:'#374151', cursor:'pointer', display:'flex', alignItems:'center', gap:'8px' }}>
            Setup Budget
          </button>
          <button onClick={()=>{ setRekonOpen(true); setToolsOpen(false) }} style={{ width:'100%', border:'none', background:'#fff', borderRadius:'9px', padding:'9px 10px', textAlign:'left', fontSize:'12px', fontWeight:500, color:'#374151', cursor:'pointer', display:'flex', alignItems:'center', gap:'8px' }}>
            Reconcile
          </button>
        </div>
      )}
    </div>
  )

  const ReviewButton = (
    <button onClick={()=>setRefleksiOpen(true)} style={{
      display:'inline-flex',
      alignItems:'center',
      justifyContent:'center',
      padding:isMobile ? '6px 10px' : '7px 12px',
      border:'1px solid #8ab39f',
      borderRadius:9,
      background:'#fff',
      color:'#1a5c42',
      fontSize:isMobile ? 11 : 12,
      fontWeight:600,
      cursor:'pointer',
      boxShadow:'none',
    }}>
      Review
    </button>
  )

  const JournalOutcomeHero = (
    <div style={{
      position:'relative',
      border:'1px solid #e3e7ee',
      borderRadius:18,
      background:'linear-gradient(135deg,#ffffff 0%,#fbfaff 48%,#ffffff 100%)',
      boxShadow:'0 10px 28px rgba(15,23,42,.07)',
      padding:isMobile ? '14px 16px 12px' : '16px 18px',
      marginBottom:14,
      overflow:'hidden',
    }}>
      <div style={{ position:'absolute', right:-70, top:-70, width:170, height:170, borderRadius:999, background:'rgba(79,47,230,.06)' }} />

      <div style={{
        position:'relative',
        display:'grid',
        gridTemplateColumns:isMobile ? '1fr' : 'minmax(340px, .78fr) minmax(0, 2.05fr)',
        gap:isMobile ? 10 : 20,
        alignItems:'center',
      }}>
        <div style={{
          minWidth:0,
          display:'grid',
          gridTemplateColumns:isMobile ? 'auto minmax(0, 1fr) auto' : 'auto minmax(0, 1fr)',
          gap:isMobile ? 12 : 16,
          alignItems:'center',
          paddingRight:isMobile ? 0 : 20,
          borderRight:isMobile ? 'none' : '1px solid #e5e7eb',
        }}>
          <div style={{
            width:isMobile ? 38 : 52,
            height:isMobile ? 38 : 52,
            borderRadius:isMobile ? 14 : 16,
            background:'linear-gradient(135deg, rgba(79,47,230,.13), rgba(79,47,230,.06))',
            display:'flex',
            alignItems:'center',
            justifyContent:'center',
            color:'#4f2fe6',
            flexShrink:0,
          }}>
            <AppIcon name="clipboard" size={isMobile ? 17 : 24} />
          </div>

          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:isMobile ? 10 : 12, fontWeight:950, color:'#4f2fe6', textTransform:'uppercase', letterSpacing:'.65px' }}>
              Outcome
            </div>
            <div style={{ marginTop:7, fontSize:isMobile ? 20 : 22, fontWeight:950, color:outcomeTone, letterSpacing:'-.9px', fontFamily:'var(--font-mono), monospace', lineHeight:1.05, whiteSpace:isMobile ? 'normal' : 'nowrap' }}>
              {outcomeText(journalSummary.outcome)}
            </div>
            <div style={{ marginTop:8, fontSize:isMobile ? 11.5 : 12.5, color:'#374151', lineHeight:1.45, fontWeight:700, color: journalSummary.outcome < 0 ? '#dc2626' : '#374151' }}>
              {outcomeMessage}
            </div>
          </div>

          {isMobile && (
            <div style={{ display:'flex', alignItems:'center', gap:6, alignSelf:'start', paddingTop:2 }}>
              {ReviewButton}
              {MoreActionsMenu}
            </div>
          )}
        </div>

        <div style={{
          display:'grid',
          gridTemplateColumns:isMobile ? '1fr' : 'minmax(0, 1fr) auto minmax(0, 1fr) auto minmax(0, 1fr)',
          gap:isMobile ? 4 : 14,
          alignItems:'center',
          paddingTop:isMobile ? 10 : 0,
          borderTop:isMobile ? '1px solid #e5e7eb' : 'none',
        }}>
          <SummaryMetric label="Income" value={journalSummary.incomeActual} actual={journalSummary.incomeActual} plan={journalSummary.incomePlan} color="#15803d" />
          {!isMobile && <div style={{ color:'#111827', opacity:.75, fontSize:20, fontWeight:900, textAlign:'center' }}>-</div>}
          <SummaryMetric label="Expenses/Debt" value={journalSummary.expenseActual} actual={journalSummary.expenseActual} plan={journalSummary.expensePlan} color="#dc2626" />
          {!isMobile && <div style={{ color:'#111827', opacity:.75, fontSize:20, fontWeight:900, textAlign:'center' }}>-</div>}
          <SummaryMetric label="Savings" value={journalSummary.savingActual} actual={journalSummary.savingActual} plan={journalSummary.savingPlan} color="#2563eb" />
        </div>
      </div>
    </div>
  )

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
      <div style={{ display:isMobile ? 'none' : 'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'12px', marginBottom:'14px', flexWrap:'wrap' }}>
        <div>
          {!isMobile && (
            <>
              <h1 style={{ fontSize: isMobile?'17px':'19px', fontWeight:700, letterSpacing:'-.3px' }}>
                {MONTH_NAMES[curMonth]} {curYear}
              </h1>
              <p style={{ fontSize:'12px', color:'#9ca3af', marginTop:'3px' }}>{phSub}</p>
            </>
          )}
        </div>
        <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap', justifyContent:'flex-end' }}>
          {loading && <span style={{ fontSize:'11px', color:'#9ca3af' }}>Loading...</span>}
          {!loading && refreshing && <span style={{ fontSize:'11px', color:'#9ca3af' }}>Syncing...</span>}
          {saving && <span style={{ fontSize:'11px', color:'#9ca3af' }}>Saving...</span>}
          {!isMobile && (
            <>
              {ReviewButton}
              {MoreActionsMenu}
            </>
          )}
        </div>
      </div>

      {isMobile && (loading || refreshing || saving) && (
        <div style={{
          position:'fixed',
          top:10,
          right:12,
          zIndex:80,
          display:'flex',
          alignItems:'center',
          gap:6,
          padding:'6px 9px',
          borderRadius:999,
          background:'rgba(255,255,255,.92)',
          border:'1px solid rgba(226,232,240,.9)',
          boxShadow:'0 8px 20px rgba(15,23,42,.12)',
          backdropFilter:'blur(10px)',
          WebkitBackdropFilter:'blur(10px)',
          fontSize:10.5,
          fontWeight:700,
          color:'#64748b',
        }}>
          <span style={{
            width:7,
            height:7,
            borderRadius:999,
            background:saving ? '#2563eb' : refreshing ? '#f59e0b' : '#94a3b8',
            display:'inline-block',
          }} />
          {saving ? 'Saving' : refreshing ? 'Syncing' : 'Loading'}
        </div>
      )}

      {JournalOutcomeHero}


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

      <ReviewModal
        open={refleksiOpen}
        onClose={() => setRefleksiOpen(false)}
        budget={budget}
        income={incomeComputed}
        saving={savingComputed}
        debt={debtComputed}
        tx={tx}
        rawSisa={sisaApp}
        monthLabel={`${MONTH_NAMES[curMonth]} ${curYear}`}
        isMobile={isMobile}
      />

      <SetupBudgetModal
        open={setupBudgetOpen}
        onClose={() => setSetupBudgetOpen(false)}
        curMonth={curMonth}
        curYear={curYear}
        currentPlan={plan}
        isMobile={isMobile}
        onApply={(nextPlan) => updatePlan(() => nextPlan)}
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