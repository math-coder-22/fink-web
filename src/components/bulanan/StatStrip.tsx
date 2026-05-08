'use client'

import type { BudgetCat, IncomeCat, SavingItem } from '@/types/database'

type Props = {
  income: IncomeCat[]
  saving: SavingItem[]
  budget: BudgetCat[]
  isMobile?: boolean
  rawSisa?: number
}

const fmt = (n: number) => 'Rp ' + Math.round(Math.abs(n)).toLocaleString('id-ID')
const pct = (actual: number, planned: number) => planned > 0 ? Math.round((actual / planned) * 100) : 0

export default function StatStrip({ income, saving, budget, isMobile = false, rawSisa = 0 }: Props) {
  const totalIncomePlan = income.reduce((s, c) => s + c.items.reduce((ss, i) => ss + (i.plan || 0), 0), 0)
  const totalIncomeActual = income.reduce((s, c) => s + c.items.reduce((ss, i) => ss + (i.actual || 0), 0), 0)

  const totalBudgetPlan = budget.reduce((s, c) => s + c.items.reduce((ss, i) => ss + (i.plan || 0), 0), 0)
  const totalBudgetActual = budget.reduce((s, c) => s + c.items.reduce((ss, i) => ss + (i.actual || 0), 0), 0)

  const totalSavingPlan = saving.reduce((s, i) => s + (i.plan || 0), 0)
  const totalSavingActual = saving.reduce((s, i) => s + (i.actual || 0), 0)

  const balancePlanned = totalIncomePlan - totalBudgetPlan - totalSavingPlan
  const balanceActual = rawSisa

  const items = [
    {
      label: 'INCOME',
      value: totalIncomeActual,
      sub: `${pct(totalIncomeActual, totalIncomePlan)}% · planned ${fmt(totalIncomePlan)}`,
      color: '#3f7f4a',
      accent: '#51a45b',
      bg: '#f6fff8',
      progress: pct(totalIncomeActual, totalIncomePlan),
    },
    {
      label: 'EXPENSES',
      value: totalBudgetActual,
      sub: `${pct(totalBudgetActual, totalBudgetPlan)}% · planned ${fmt(totalBudgetPlan)}`,
      color: '#a5302d',
      accent: '#c83a36',
      bg: '#fffafa',
      progress: pct(totalBudgetActual, totalBudgetPlan),
    },
    {
      label: 'SAVINGS',
      value: totalSavingActual,
      sub: `planned ${fmt(totalSavingPlan)}`,
      color: '#2b55d9',
      accent: '#4b63ff',
      bg: '#f7fbff',
      progress: pct(totalSavingActual, totalSavingPlan),
    },
    {
      label: 'BALANCE',
      value: balanceActual,
      sub: `vs planned ${fmt(balancePlanned)}`,
      color: '#98631b',
      accent: '#ba7a20',
      bg: '#fffdf7',
      progress: pct(balanceActual, Math.max(balancePlanned, 1)),
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
              padding: isMobile ? '12px 12px' : '14px 20px',
              background: item.bg,
              borderTop: `3px solid ${item.accent}`,
              borderRight: !isMobile && idx < items.length - 1 ? '1px solid #e7ebf0' : 'none',
              borderBottom: isMobile && idx < 2 ? '1px solid #e7ebf0' : 'none',
              minWidth: 0,
            }}
          >
            <div style={{
              fontSize: isMobile ? '10.5px' : '11.5px',
              fontWeight: 800,
              color: '#9ca3af',
              textTransform: 'uppercase',
              letterSpacing: '.7px',
              marginBottom: '6px',
              whiteSpace: 'nowrap',
            }}>
              {item.label}
            </div>

            <div style={{
              fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: isMobile ? '18px' : '21px',
              fontWeight: 800,
              color: item.color,
              letterSpacing: '-.8px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: 1.18,
            }}>
              {fmt(item.value)}
            </div>

            <div style={{
              height: isMobile ? '3px' : '3.5px',
              background: '#e5e7eb',
              borderRadius: '999px',
              margin: isMobile ? '8px 0 5px' : '9px 0 6px',
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
              fontSize: isMobile ? '10.5px' : '11.5px',
              color: '#9ca3af',
              fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {item.sub}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
