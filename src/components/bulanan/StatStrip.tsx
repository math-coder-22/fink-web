'use client'

import type { BudgetCategory, IncomeCategory, SavingRow } from '@/types/database'

const fmt = (n: number) => 'Rp ' + Math.abs(Math.round(n || 0)).toLocaleString('id-ID')

function pct(actual: number, planned: number) {
  if (!planned) return null
  return Math.round((actual / planned) * 100)
}

interface Props {
  income:    IncomeCategory[]
  saving:    SavingRow[]
  budget:    BudgetCategory[]
  isMobile?: boolean
  rawSisa?:  number
}

export default function StatStrip({ income, saving, budget, isMobile, rawSisa }: Props) {
  const incP = income.reduce((s,c) => s+c.items.reduce((ss,i)=>ss+(i.plan  ||0),0), 0)
  const incA = income.reduce((s,c) => s+c.items.reduce((ss,i)=>ss+(i.actual||0),0), 0)
  const savP = saving.reduce((s,r) => s+(r.plan  ||0), 0)
  const savA = saving.reduce((s,r) => s+(r.actual||0), 0)
  const expP = budget.reduce((s,c) => s+c.items.reduce((ss,i)=>ss+(i.plan  ||0),0), 0)
  const expA = budget.reduce((s,c) => s+c.items.reduce((ss,i)=>ss+(i.actual||0),0), 0)
  const sisa = rawSisa !== undefined ? rawSisa : incA - expA - savA

  // Planned balance = planned income - planned expenses - planned savings
  const sisaP = incP - expP - savP

  const stats = [
    {
      label:   'Income',
      val:     incA,
      planned: incP,
      pct:     pct(incA, incP),
      note:    `planned ${fmt(incP)}`,
      color:   '#15803d',
      border:  '#16a34a',
      // overspent = actuals < plan for income is fine, no warning needed
      warn:    false,
    },
    {
      label:   'Expenses',
      val:     expA,
      planned: expP,
      pct:     pct(expA, expP),
      note:    `planned ${fmt(expP)}`,
      color:   '#b91c1c',
      border:  '#dc2626',
      warn:    expP > 0 && expA > expP,  // overspent
    },
    {
      label:   'Savings',
      val:     savA,
      planned: savP,
      pct:     pct(savA, savP),
      note:    `planned ${fmt(savP)}`,
      color:   '#1d4ed8',
      border:  '#2563eb',
      warn:    false,
    },
    {
      label:   'Balance',
      val:     sisa,
      planned: sisaP,
      pct:     null,   // Balance pakai format 'vs planned', bukan %
      note:    sisaP !== 0
        ? `vs planned ${sisaP < 0 ? '-' : ''}Rp ${Math.abs(Math.round(sisaP)).toLocaleString('id-ID')}`
        : 'income − expenses − savings',
      color:   sisa >= 0 ? '#a16207' : '#b91c1c',
      border:  sisa >= 0 ? '#ca8a04' : '#dc2626',
      warn:    sisa < 0,
    },
  ]

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)',
      gap: isMobile ? '8px' : '10px',
      marginBottom: isMobile ? '12px' : '18px',
    }}>
      {stats.map(s => {
        const p = s.pct
        const isBalance = s.label === 'Balance'

        // Balance card: bar = progress hari ini dalam bulan (misal hari 26 dari 30 = 87%)
        const today = new Date()
        const daysInMonth = new Date(today.getFullYear(), today.getMonth()+1, 0).getDate()
        const dayProgress = Math.round((today.getDate() / daysInMonth) * 100)

        const barW = isBalance
          ? dayProgress
          : (p === null ? 0 : Math.min(100, Math.max(0, p)))
        // Bar color: green if ok, amber if >85%, red if >100% or warn
        const barColor = isBalance
          ? s.border  // Balance: selalu pakai warna card (amber/merah)
          : s.warn
            ? '#dc2626'
            : p !== null && p >= 100
              ? '#dc2626'
              : p !== null && p >= 85
                ? '#d97706'
                : s.border

        return (
          <div key={s.label} style={{
            background: s.label==='Income' ? '#f4fbf4' : s.label==='Savings' ? '#f5f8ff' : s.label==='Balance' ? '#faf8f1' : '#fff',
            borderRadius: '8px',
            boxShadow: '0 1px 2px rgba(0,0,0,.04)',
            padding: isMobile ? '10px 12px 8px' : '12px 16px 8px',
            border: `1px solid ${s.border}22`,
          }}>
            {/* Label */}
            <div style={{
              fontSize: isMobile ? '9.5px' : '10.5px',
              fontWeight: 600, color: '#9ca3af',
              textTransform: 'uppercase', letterSpacing: '.5px',
              marginBottom: '3px',
            }}>
              {s.label}
            </div>

            {/* Actual value */}
            <div style={{
              fontSize: isMobile ? '14px' : '16px',
              fontWeight: 700,
              fontFamily: 'JetBrains Mono,monospace',
              letterSpacing: '-.5px',
              color: s.color,
              lineHeight: 1.2,
            }}>
              {fmt(s.val)}
            </div>

            {/* Progress bar — 2px, compact */}
            {s.planned !== 0 && (
              <div style={{
                height: '2px',
                background: '#e3e7ee',
                borderRadius: '1px',
                margin: '6px 0 4px',
              }}>
                <div style={{
                  height: '2px',
                  borderRadius: '1px',
                  background: barColor,
                  width: `${barW}%`,
                  transition: 'width .4s ease',
                }} />
              </div>
            )}

            {/* Planned note — same line, compact */}
            {!isMobile && (
              <div style={{
                fontSize: '10.5px',
                color: s.warn ? '#b91c1c' : '#9ca3af',
                fontFamily: 'JetBrains Mono,monospace',
                lineHeight: 1.4,
              }}>
                {!isBalance && p !== null && (
                  <span style={{ color: s.warn ? '#b91c1c' : p >= 85 ? '#d97706' : '#9ca3af' }}>
                    {p}%{' · '}
                  </span>
                )}
                <span style={{ color: s.warn ? '#b91c1c' : '#9ca3af' }}>
                  {s.note}
                </span>
                {s.warn && s.label === 'Expenses' ? ' ⚠' : ''}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
