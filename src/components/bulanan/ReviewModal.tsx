'use client'

import { useState, useMemo } from 'react'
import { fmt } from '@/components/ui/helpers'
import { AppIcon } from '@/components/ui/design'

const pct = (actual: number, plan: number) => plan > 0 ? Math.round((actual / plan) * 100) : 0

export default function ReviewModal({
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
    // Unpaid expenses count toward Actual immediately, so they are included here too.
    const expenseTx = tx.filter((t:any) => t.type === 'out')

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
            <div style={{ fontSize:'11.5px', color:'#9ca3af', marginTop:'2px' }}>{monthLabel} · spending health + deep dive</div>
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
                <div style={{ fontSize:'11px', color:'#94a3b8', marginTop:'2px' }}>High-level summary before digging into the details.</div>
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
                Budget looks relatively safe. No expense category is near or over its limit this month.
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                {review.alerts.slice(0, 3).map((cat:any) => (
                  <div key={cat.label} style={{ fontSize:'12px', color:cat.over ? '#b91c1c' : '#b45309', background:cat.over ? '#fef2f2' : '#fffbeb', border:`1px solid ${cat.over ? '#fecaca' : '#fde68a'}`, borderRadius:'11px', padding:'8px 9px', lineHeight:1.45 }}>
                    {cat.over
                      ? `${cat.label} is over budget by ${money(cat.spent - cat.planned)}. Check the items below to see the main cause.`
                      : `${cat.label} has used ${cat.pct}% of its budget. Keep an eye on this category so it stays within limit.`}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ border:'1px solid #e3e7ee', borderRadius:'16px', overflow:'hidden', background:'#fff' }}>
            <div style={{ padding:'11px 12px', borderBottom:'1px solid #e3e7ee', display:'flex', justifyContent:'space-between', alignItems:'center', gap:'10px' }}>
              <div>
                <div style={{ fontSize:'13px', fontWeight:950, color:'#111827' }}>Expense Breakdown</div>
                <div style={{ fontSize:'11px', color:'#94a3b8', marginTop:'1px' }}>Click a category → item → biggest transactions.</div>
              </div>
              <div style={{ fontSize:'11px', color:'#64748b', fontFamily:'var(--font-mono), monospace', whiteSpace:'nowrap' }}>{money(review.regularExpenseActual)}</div>
            </div>

            <div style={{ display:'flex', flexDirection:'column' }}>
              {review.categories.length === 0 ? (
                <div style={{ padding:'18px 13px', color:'#94a3b8', fontSize:'12.5px', textAlign:'center' }}>No budget or expense transactions this month.</div>
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
                                      <div style={{ fontSize:'11.5px', color:'#94a3b8', padding:'6px 0' }}>No transactions for this item yet.</div>
                                    ) : item.transactions.map((t:any) => (
                                      <div key={t.id} style={{ display:'grid', gridTemplateColumns:'auto 1fr auto', gap:'8px', alignItems:'center', padding:'7px 8px', borderRadius:'9px', background:'#fff', border:'1px solid #f1f5f9' }}>
                                        <div style={{ fontSize:'10.5px', color:'#94a3b8', fontFamily:'var(--font-mono), monospace', fontWeight:750 }}>{t.date}</div>
                                        <div style={{ display:'flex', alignItems:'center', gap:'6px', minWidth:0 }}>
                                          <div style={{ fontSize:'11.5px', color:'#111827', fontWeight:650, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.note || item.label}</div>
                                          {t.debt && !t.settled && <span style={{ fontSize:'9px', fontWeight:700, background:'#fef3c7', color:'#92400e', border:'1px solid #fde68a', padding:'1px 6px', borderRadius:'10px', flexShrink:0 }}>Unpaid</span>}
                                        </div>
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
