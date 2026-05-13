'use client'

import type { BudgetCategory, IncomeCategory, SavingRow, DebtRow, Transaction } from '@/types/database'

type Props = {
  income: IncomeCategory[]
  saving: SavingRow[]
  debt?: DebtRow[]
  budget: BudgetCategory[]
  tx?: Transaction[]
  isMobile?: boolean
  rawSisa?: number
  curDay?: number
  daysInMonth?: number
}

const fmt = (n: number) => 'Rp ' + Math.round(Math.abs(n || 0)).toLocaleString('id-ID')

const fmtShort = (n: number) => {
  const abs = Math.abs(Math.round(n || 0))
  if (abs >= 1_000_000) {
    const v = abs / 1_000_000
    return `Rp ${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1).replace('.', ',')}jt`
  }
  if (abs >= 1_000) return `Rp ${Math.round(abs / 1_000).toLocaleString('id-ID')}rb`
  return `Rp ${abs.toLocaleString('id-ID')}`
}

const pct = (actual: number, planned: number) => planned > 0 ? Math.round((actual / planned) * 100) : 0

function getDailyBalanceStatus(leftToSpend: number, remainingDays: number, totalExpense: number, currentDay: number) {
  const safeDaily = remainingDays > 0 ? leftToSpend / remainingDays : leftToSpend
  const avgDailySpend = currentDay > 0 ? totalExpense / currentDay : 0
  const ratio = avgDailySpend > 0 ? safeDaily / avgDailySpend : safeDaily > 0 ? 1 : 0

  if (leftToSpend <= 0) {
    return { label: 'Bahaya', color: '#b91c1c', bg: '#fee2e2', daily: safeDaily }
  }
  if (ratio >= 1) {
    return { label: 'Aman', color: '#15803d', bg: '#dcfce7', daily: safeDaily }
  }
  if (ratio >= 0.6) {
    return { label: 'Hati-hati', color: '#b7791f', bg: '#fef3c7', daily: safeDaily }
  }
  return { label: 'Bahaya', color: '#b91c1c', bg: '#fee2e2', daily: safeDaily }
}

export default function StatStrip({
  income,
  saving,
  budget,
  tx = [],
  isMobile = false,
  rawSisa = 0,
  curDay,
  daysInMonth,
}: Props) {
  const totalIncomePlan = income.reduce((s, c) => s + c.items.reduce((ss, i) => ss + (i.plan || 0), 0), 0)
  const totalIncomeActual = income.reduce((s, c) => s + c.items.reduce((ss, i) => ss + (i.actual || 0), 0), 0)

  const totalBudgetPlan = budget.reduce((s, c) => s + c.items.reduce((ss, i) => ss + (i.plan || 0), 0), 0)
  const totalBudgetActual = budget.reduce((s, c) => s + c.items.reduce((ss, i) => ss + (i.actual || 0), 0), 0)

  const totalSavingPlan = saving.reduce((s, i) => s + (i.plan || 0), 0)
  const totalSavingActual = saving.reduce((s, i) => s + (i.actual || 0), 0)

  const balancePlanned = totalIncomePlan - totalBudgetPlan - totalSavingPlan
  const balanceActual = rawSisa

  const today = curDay || new Date().getDate()
  const lastDay = daysInMonth || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
  const remainingDays = Math.max(1, lastDay - today + 1)
  const daily = getDailyBalanceStatus(balanceActual, remainingDays, totalBudgetActual, Math.max(1, today))

  const items = [
    {
      label: 'INCOME',
      value: totalIncomeActual,
      sub: `${pct(totalIncomeActual, totalIncomePlan)}% · planned ${fmt(totalIncomePlan)}`,
      color: '#3f7f4a',
      accent: '#51a45b',
      bg: '#f6fff8',
      progress: pct(totalIncomeActual, totalIncomePlan),
      type: 'normal' as const,
    },
    {
      label: 'EXPENSES',
      value: totalBudgetActual,
      sub: `${pct(totalBudgetActual, totalBudgetPlan)}% · planned ${fmt(totalBudgetPlan)}`,
      color: '#a5302d',
      accent: '#c83a36',
      bg: '#fffafa',
      progress: pct(totalBudgetActual, totalBudgetPlan),
      type: 'normal' as const,
    },
    {
      label: 'SAVINGS',
      value: totalSavingActual,
      sub: `planned ${fmt(totalSavingPlan)}`,
      color: '#2b55d9',
      accent: '#4b63ff',
      bg: '#f7fbff',
      progress: pct(totalSavingActual, totalSavingPlan),
      type: 'normal' as const,
    },
    {
      label: 'BALANCE',
      value: balanceActual,
      sub: `Sisa budget ${fmtShort(balancePlanned)}`,
      color: '#98631b',
      accent: '#ba7a20',
      bg: '#fffdf7',
      progress: 0,
      type: 'balance' as const,
    },
  ]

  return (
    <section style={{
      background: '#fff',
      border: '1px solid #e3e7ee',
      borderRadius: isMobile ? '14px' : '16px',
      boxShadow: '0 2px 10px rgba(15,23,42,.05)',
      marginBottom: isMobile ? '12px' : '14px',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
      }}>
        {items.map((item, idx) => (
          <div
            key={item.label}
            style={{
              padding: isMobile ? '8px 10px' : '11px 18px',
              background: item.bg,
              borderTop: `3px solid ${item.accent}`,
              borderRight: !isMobile && idx < items.length - 1 ? '1px solid #e7ebf0' : 'none',
              borderBottom: isMobile && idx < 2 ? '1px solid #e7ebf0' : 'none',
              minWidth: 0,
            }}
          >
            <div style={{
              fontSize: isMobile ? '9.5px' : '11px',
              fontWeight: 800,
              color: '#9ca3af',
              textTransform: 'uppercase',
              letterSpacing: '.7px',
              marginBottom: isMobile ? '3px' : '4px',
              whiteSpace: 'nowrap',
            }}>
              {item.label}
            </div>

            <div style={{
              fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: isMobile ? '16px' : '20px',
              fontWeight: 800,
              color: item.color,
              letterSpacing: '-.8px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: 1.12,
            }}>
              {item.value < 0 ? '-' : ''}{fmt(item.value)}
            </div>

            {item.type === 'balance' ? (
              <div style={{
                marginTop: isMobile ? '3px' : '4px',
                display: 'grid',
                gap: 0,
                minWidth: 0,
                lineHeight: 1.15,
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  minWidth: 0,
                  color: daily.color,
                  fontWeight: 800,
                  fontSize: isMobile ? '9.8px' : '10.8px',
                  lineHeight: 1.15,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  <span style={{
                    width: isMobile ? 7 : 8,
                    height: isMobile ? 7 : 8,
                    borderRadius: 999,
                    background: daily.color,
                    boxShadow: `0 0 0 2.5px ${daily.bg}`,
                    flexShrink: 0,
                  }} />
                  <span>≈ {fmtShort(daily.daily)}/hari</span>
                </div>

                <div style={{
                  marginTop: isMobile ? '1px' : '2px',
                  fontSize: isMobile ? '9.5px' : '10.5px',
                  color: '#9ca3af',
                  fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace',
                  lineHeight: 1.15,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {item.sub}
                </div>
              </div>
            ) : (
              <>
                <div style={{
                  height: isMobile ? '3px' : '3.5px',
                  background: '#e5e7eb',
                  borderRadius: '999px',
                  margin: isMobile ? '6px 0 3px' : '7px 0 4px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${Math.min(Math.max(item.progress, 0), 100)}%`,
                    height: '100%',
                    background: item.accent,
                    borderRadius: '999px',
                  }} />
                </div>

                <div style={{
                  fontSize: isMobile ? '9.5px' : '10.5px',
                  color: '#9ca3af',
                  fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace',
                  lineHeight: 1.15,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {item.sub}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
