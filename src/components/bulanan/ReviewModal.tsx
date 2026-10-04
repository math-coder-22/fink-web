'use client'

import { useState, useMemo } from 'react'
import { fmt } from '@/components/ui/helpers'
import { AppIcon } from '@/components/ui/design'

const RED = '#b91c1c'
const AMBER = '#b45309'
const GREEN = '#15803d'
const GRAY = '#64748b'

function Bar({ value, color, height = 6 }: { value: number; color: string; height?: number }) {
  return (
    <div style={{ height, background: '#eef1f5', borderRadius: 999, overflow: 'hidden', flex: 1 }}>
      <div style={{ width: `${Math.min(100, Math.max(0, value))}%`, height: '100%', background: color, borderRadius: 999 }} />
    </div>
  )
}

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

  // Unpaid expenses count toward Actual immediately, so they are included here too.
  const review = useMemo(() => {
    const expenseTx = tx.filter((t: any) => t.type === 'out')

    const totalIncomeActual = income.reduce((s: number, c: any) => s + (c.items || []).reduce((ss: number, i: any) => ss + Number(i.actual || 0), 0), 0)
    const totalSavingActual = saving.reduce((s: number, i: any) => s + Number(i.actual || 0), 0)
    const totalDebtActual = debt.reduce((s: number, i: any) => s + Number(i.actual || 0), 0)

    const categories = budget.map((cat: any) => {
      const items = (cat.items || []).map((item: any) => {
        const relatedTx = expenseTx
          .filter((t: any) => t.cat === item.label)
          .slice()
          .sort((a: any, b: any) => Number(b.amt || 0) - Number(a.amt || 0))
        const spent = Number(item.actual || 0)
        const planned = Number(item.plan || 0)
        const pct = planned > 0 ? Math.round((spent / planned) * 100) : 0
        return {
          label: item.label, planned, spent, pct,
          over: planned > 0 && spent > planned,
          near: planned > 0 && spent >= planned * 0.8 && spent <= planned,
          transactions: relatedTx,
        }
      }).filter((item: any) => item.planned > 0 || item.spent > 0)
        .sort((a: any, b: any) => (Number(b.over) - Number(a.over)) || (Number(b.near) - Number(a.near)) || b.spent - a.spent)

      const planned = items.reduce((sum: number, item: any) => sum + item.planned, 0)
      const spent = items.reduce((sum: number, item: any) => sum + item.spent, 0)
      const pct = planned > 0 ? Math.round((spent / planned) * 100) : 0
      return {
        label: cat.label, planned, spent, pct,
        over: planned > 0 && spent > planned,
        near: planned > 0 && spent >= planned * 0.8 && spent <= planned,
        items,
      }
    }).filter((cat: any) => cat.planned > 0 || cat.spent > 0)
      .sort((a: any, b: any) => (Number(b.over) - Number(a.over)) || (Number(b.near) - Number(a.near)) || b.spent - a.spent)

    const regularExpensePlan = categories.reduce((sum: number, cat: any) => sum + cat.planned, 0)
    const regularExpenseActual = categories.reduce((sum: number, cat: any) => sum + cat.spent, 0)
    const budgetUsed = regularExpensePlan > 0 ? Math.round((regularExpenseActual / regularExpensePlan) * 100) : 0
    const savingRate = totalIncomeActual > 0 ? Math.round((totalSavingActual / totalIncomeActual) * 100) : 0
    const alerts = categories.filter((cat: any) => cat.over || cat.near)

    return {
      categories, totalIncomeActual, totalSavingActual, totalDebtActual,
      regularExpensePlan, regularExpenseActual, budgetUsed, savingRate, alerts,
    }
  }, [budget, income, saving, debt, tx])

  if (!open) return null

  const statusText = review.budgetUsed > 100 ? 'Over Budget' : review.budgetUsed >= 80 ? 'Warning' : 'Safe'
  const statusColor = review.budgetUsed > 100 ? RED : review.budgetUsed >= 80 ? AMBER : GREEN
  const sisaColor = rawSisa < 0 ? RED : rawSisa === 0 ? AMBER : GREEN

  const jumpToCategory = (label: string) => {
    setOpenCategory(label)
    setOpenItem(null)
    requestAnimationFrame(() => {
      document.getElementById(`review-cat-${label}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const badge = (over: boolean, near: boolean) => {
    if (!over && !near) return null
    const color = over ? RED : AMBER
    return (
      <span style={{ fontSize: '9.5px', fontWeight: 950, color, background: over ? '#fef2f2' : '#fffbeb', border: `1px solid ${over ? '#fecaca' : '#fde68a'}`, borderRadius: '999px', padding: '1px 6px', flexShrink: 0 }}>
        {over ? 'Over' : 'Near'}
      </span>
    )
  }

  return (
    <div
      onClick={e => { if (e.currentTarget === e.target) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 850, background: 'rgba(15,23,42,.42)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: 'max(14px, env(safe-area-inset-top)) 12px 16px' }}
    >
      <div style={{ width: '100%', maxWidth: '720px', background: '#fff', border: '1px solid #e3e7ee', borderRadius: '22px', boxShadow: '0 24px 80px rgba(15,23,42,.24)', overflow: 'hidden' }}>
        <div style={{ position: 'sticky', top: 0, zIndex: 2, background: 'rgba(255,255,255,.96)', backdropFilter: 'blur(12px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', padding: '13px 16px', borderBottom: '1px solid #e3e7ee' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '16px', fontWeight: 950, color: '#111827' }}>
              <AppIcon name="mirror" size={17} /> Monthly Review
            </div>
            <div style={{ fontSize: '11.5px', color: '#9ca3af', marginTop: '2px' }}>{monthLabel} · expense review</div>
          </div>
          <button aria-label="Close review" onClick={onClose} style={{ width: '32px', height: '32px', border: 'none', background: '#f7f8fa', borderRadius: '10px', cursor: 'pointer', color: '#4b5563', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AppIcon name="close" size={16} />
          </button>
        </div>

        <div style={{ padding: isMobile ? '12px 14px 16px' : '14px 16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* HERO: the month at a glance */}
          <div style={{ border: '1px solid #e3e7ee', borderRadius: '16px', padding: '13px 14px 12px', background: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', flex: 1 }}>
                <div>
                  <div style={{ fontSize: '10.5px', fontWeight: 850, color: GRAY, letterSpacing: '.04em' }}>SPENT</div>
                  <div style={{ fontSize: '19px', fontWeight: 950, color: statusColor, fontFamily: 'var(--font-mono), monospace', marginTop: '2px' }}>{fmt(review.regularExpenseActual)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10.5px', fontWeight: 850, color: GRAY, letterSpacing: '.04em' }}>LEFT TO SPEND</div>
                  <div style={{ fontSize: '19px', fontWeight: 950, color: sisaColor, fontFamily: 'var(--font-mono), monospace', marginTop: '2px' }}>{fmt(rawSisa)}</div>
                </div>
              </div>
              <div style={{ fontSize: '11px', fontWeight: 950, color: statusColor, background: review.budgetUsed > 100 ? '#fef2f2' : review.budgetUsed >= 80 ? '#fffbeb' : '#ecfdf5', border: `1px solid ${review.budgetUsed > 100 ? '#fecaca' : review.budgetUsed >= 80 ? '#fde68a' : '#bbf7d0'}`, borderRadius: '999px', padding: '5px 10px', whiteSpace: 'nowrap' }}>
                {statusText}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
              <Bar value={review.budgetUsed} color={statusColor} />
              <span style={{ fontSize: '11px', fontWeight: 950, color: statusColor, whiteSpace: 'nowrap' }}>{review.budgetUsed}%</span>
            </div>
            <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '8px' }}>
              Income {fmt(review.totalIncomeActual)} · Saved {fmt(review.totalSavingActual)} ({review.savingRate}%) · Debt paid {fmt(review.totalDebtActual)}
            </div>
          </div>

          {/* ATTENTION: tap to jump to the category */}
          {review.alerts.length > 0 && (
            <div style={{ border: '1px solid #e3e7ee', borderRadius: '16px', padding: '11px 12px', background: '#fff' }}>
              <div style={{ fontSize: '12px', fontWeight: 950, color: '#111827', marginBottom: '7px' }}>Needs attention</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {review.alerts.map((cat: any) => {
                  const color = cat.over ? RED : AMBER
                  return (
                    <button key={cat.label} onClick={() => jumpToCategory(cat.label)}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left', fontSize: '12px', color, background: cat.over ? '#fef2f2' : '#fffbeb', border: `1px solid ${cat.over ? '#fecaca' : '#fde68a'}`, borderRadius: '11px', padding: '8px 10px', cursor: 'pointer', lineHeight: 1.4 }}>
                      <span style={{ fontWeight: 850, flexShrink: 0 }}>{cat.label}</span>
                      <span style={{ color: '#4b5563' }}>
                        {cat.over ? `over by ${fmt(cat.spent - cat.planned)}` : `${cat.pct}% of budget used`}
                      </span>
                      <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#94a3b8', flexShrink: 0 }}>view →</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* BREAKDOWN */}
          <div style={{ border: '1px solid #e3e7ee', borderRadius: '16px', overflow: 'hidden', background: '#fff' }}>
            <div style={{ padding: '11px 12px', borderBottom: '1px solid #e3e7ee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: 950, color: '#111827' }}>Where the money went</div>
              <div style={{ fontSize: '11.5px', color: GRAY, fontFamily: 'var(--font-mono), monospace' }}>{fmt(review.regularExpenseActual)}</div>
            </div>
            {review.categories.length === 0 ? (
              <div style={{ padding: '18px 13px', color: '#94a3b8', fontSize: '12.5px', textAlign: 'center' }}>No budget or expense transactions this month.</div>
            ) : review.categories.map((cat: any) => {
              const isOpen = openCategory === cat.label
              const color = cat.over ? RED : cat.near ? AMBER : GREEN
              return (
                <div key={cat.label} id={`review-cat-${cat.label}`} style={{ borderBottom: '1px solid #f1f5f9', scrollMarginTop: '70px' }}>
                  <button onClick={() => { setOpenCategory(isOpen ? null : cat.label); setOpenItem(null) }}
                    style={{ width: '100%', border: 'none', background: isOpen ? '#f8fafc' : '#fff', padding: '10px 12px 9px', cursor: 'pointer', textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 850, color: '#111827' }}>{cat.label}</span>
                      {badge(cat.over, cat.near)}
                      <span style={{ marginLeft: 'auto', fontSize: '12.5px', fontWeight: 950, color, fontFamily: 'var(--font-mono), monospace' }}>{fmt(cat.spent)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                      <Bar value={cat.pct} color={color} height={5} />
                      <span style={{ fontSize: '10.5px', color: GRAY, whiteSpace: 'nowrap' }}>of {fmt(cat.planned)} · {cat.pct}%</span>
                    </div>
                  </button>

                  {isOpen && (
                    <div style={{ padding: '2px 12px 11px', background: '#fff' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {cat.items.map((item: any) => {
                          const key = `${cat.label}::${item.label}`
                          const itemOpen = openItem === key
                          const itemColor = item.over ? RED : item.near ? AMBER : GREEN
                          return (
                            <div key={key} style={{ border: '1px solid #eef1f5', borderRadius: '11px', overflow: 'hidden' }}>
                              <button onClick={() => setOpenItem(itemOpen ? null : key)}
                                style={{ width: '100%', border: 'none', background: '#fff', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', textAlign: 'left' }}>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                                {badge(item.over, item.near)}
                                <span style={{ marginLeft: 'auto', fontSize: '11.5px', fontWeight: 850, color: itemColor, fontFamily: 'var(--font-mono), monospace', whiteSpace: 'nowrap' }}>{fmt(item.spent)}</span>
                                <span style={{ fontSize: '10px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{item.transactions.length} tx</span>
                              </button>
                              {itemOpen && (
                                <div style={{ borderTop: '1px solid #f6f8fb', padding: '7px 9px', display: 'flex', flexDirection: 'column', gap: '5px', background: '#fcfcfd' }}>
                                  {item.transactions.length === 0 ? (
                                    <div style={{ fontSize: '11.5px', color: '#94a3b8', padding: '5px 0' }}>No transactions for this item yet.</div>
                                  ) : item.transactions.map((t: any) => (
                                    <div key={t.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '8px', alignItems: 'center', padding: '6px 8px', borderRadius: '8px', background: '#fff', border: '1px solid #f1f5f9' }}>
                                      <div style={{ fontSize: '10.5px', color: '#94a3b8', fontFamily: 'var(--font-mono), monospace', fontWeight: 750 }}>{t.date}</div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                                        <div style={{ fontSize: '11.5px', color: '#111827', fontWeight: 650, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.note || item.label}</div>
                                        {t.debt && !t.settled && <span style={{ fontSize: '9px', fontWeight: 700, background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '1px 6px', borderRadius: '10px', flexShrink: 0 }}>Unpaid</span>}
                                      </div>
                                      <div style={{ fontSize: '11.5px', color: RED, fontWeight: 950, fontFamily: 'var(--font-mono), monospace' }}>{fmt(Number(t.amt || 0))}</div>
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
  )
}
