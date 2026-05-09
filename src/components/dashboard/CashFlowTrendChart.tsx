'use client'

import type { IncomeCategory, SavingRow, Transaction } from '@/types/database'

type Props = {
  tx: Transaction[]
  income?: IncomeCategory[]
  saving?: SavingRow[]
  curDay?: number
  daysInMonth?: number
}

type Point = {
  day: number
  income: number
  cashOut: number
  segmentType: 'expense' | 'saving' | 'neutral'
}

const GREEN = '#3f7f4a'
const RED = '#c83a36'
const BLUE = '#4b63ff'
const GRID = '#e7ebf0'
const TEXT = '#6b7280'

function fmt(n: number) {
  return 'Rp ' + Math.round(Math.abs(n || 0)).toLocaleString('id-ID')
}

function fmtShort(n: number) {
  const abs = Math.abs(Math.round(n || 0))
  if (abs >= 1_000_000) {
    const v = abs / 1_000_000
    return `Rp ${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1).replace('.', ',')}jt`
  }
  if (abs >= 1_000) return `Rp ${Math.round(abs / 1_000).toLocaleString('id-ID')}rb`
  return `Rp ${abs.toLocaleString('id-ID')}`
}

function sumIncome(income?: IncomeCategory[]) {
  return (income || []).reduce((s, c) => s + c.items.reduce((ss, i) => ss + (i.actual || 0), 0), 0)
}

function sumSaving(saving?: SavingRow[]) {
  return (saving || []).reduce((s, r) => s + (r.actual || 0), 0)
}

function buildPoints(
  tx: Transaction[],
  axisDays: number,
  visibleUntilDay: number,
  fallbackIncome: number,
  fallbackSaving: number,
): Point[] {
  const byDay = Array.from({ length: axisDays + 1 }, () => ({
    income: 0,
    expense: 0,
    saving: 0,
  }))

  for (const t of tx) {
    const day = Math.min(axisDays, Math.max(1, Number(t.date || 1)))
    const amount = Number(t.amt || 0)
    if (t.type === 'inn') byDay[day].income += amount
    if (t.type === 'out') byDay[day].expense += amount
    if (t.type === 'save') byDay[day].saving += amount
  }

  const incomeFromTx = tx.filter(t => t.type === 'inn').reduce((s, t) => s + Number(t.amt || 0), 0)
  const savingFromTx = tx.filter(t => t.type === 'save').reduce((s, t) => s + Number(t.amt || 0), 0)

  // Jika income/saving berasal dari monthly actual, tetapi tidak ada transaksi,
  // tetap tampilkan di chart agar garis tidak hilang.
  if (incomeFromTx <= 0 && fallbackIncome > 0) {
    byDay[1].income += fallbackIncome
  }
  if (savingFromTx <= 0 && fallbackSaving > 0) {
    byDay[Math.min(visibleUntilDay, axisDays)].saving += fallbackSaving
  }

  const points: Point[] = []
  let income = 0
  let cashOut = 0

  for (let day = 1; day <= visibleUntilDay; day++) {
    income += byDay[day].income

    if (byDay[day].expense > 0) {
      cashOut += byDay[day].expense
      points.push({ day, income, cashOut, segmentType: 'expense' })
    }

    if (byDay[day].saving > 0) {
      cashOut += byDay[day].saving
      points.push({ day, income, cashOut, segmentType: 'saving' })
    }

    if (byDay[day].income > 0 && byDay[day].expense === 0 && byDay[day].saving === 0) {
      points.push({ day, income, cashOut, segmentType: 'neutral' })
    }

    if (byDay[day].income === 0 && byDay[day].expense === 0 && byDay[day].saving === 0) {
      points.push({ day, income, cashOut, segmentType: 'neutral' })
    }
  }

  if (points.length === 0) {
    points.push({ day: 1, income: 0, cashOut: 0, segmentType: 'neutral' })
  }

  return points
}

function pathFrom(points: { x: number; y: number }[]) {
  if (points.length === 0) return ''
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
}

function makeScale(maxValue: number, width: number, height: number, pad: { l: number; r: number; t: number; b: number }) {
  const plotW = width - pad.l - pad.r
  const plotH = height - pad.t - pad.b
  const yMax = Math.max(maxValue * 1.18, 1)
  return {
    x: (day: number, daysInMonth: number) => pad.l + ((day - 1) / Math.max(1, daysInMonth - 1)) * plotW,
    y: (value: number) => pad.t + (1 - value / yMax) * plotH,
    yMax,
  }
}

function gridValues(maxValue: number) {
  const top = Math.max(maxValue, 1)
  return [0, top * 0.5, top]
}

export default function CashFlowTrendChart({ tx, income, saving, curDay, daysInMonth }: Props) {
  const today = Math.max(1, curDay || new Date().getDate())
  const totalDays = daysInMonth || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
  const visibleUntilDay = Math.min(today, totalDays)

  const fallbackIncome = sumIncome(income)
  const fallbackSaving = sumSaving(saving)
  const points = buildPoints(tx, totalDays, visibleUntilDay, fallbackIncome, fallbackSaving)

  const totalIncome = points[points.length - 1]?.income || 0
  const totalCashOut = points[points.length - 1]?.cashOut || 0
  const totalSaving = points.length > 0
    ? (tx.filter(t => t.type === 'save').reduce((s, t) => s + Number(t.amt || 0), 0) || fallbackSaving)
    : 0
  const totalExpense = tx.filter(t => t.type === 'out').reduce((s, t) => s + Number(t.amt || 0), 0)
  const savingShare = totalCashOut > 0 ? Math.round((totalSaving / totalCashOut) * 100) : 0

  const width = 760
  const height = 250
  const pad = { l: 64, r: 28, t: 20, b: 32 }
  const maxValue = Math.max(totalIncome, totalCashOut, ...points.map(p => Math.max(p.income, p.cashOut)))
  const scale = makeScale(maxValue, width, height, pad)

  const incomePath = pathFrom(points.map(p => ({
    x: scale.x(p.day, totalDays),
    y: scale.y(p.income),
  })))

  const segments: { d: string; color: string; key: string }[] = []
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const color = curr.segmentType === 'saving' ? BLUE : curr.segmentType === 'expense' ? RED : '#c7ccd4'
    const d = `M ${scale.x(prev.day, totalDays)} ${scale.y(prev.cashOut)} L ${scale.x(curr.day, totalDays)} ${scale.y(curr.cashOut)}`
    segments.push({ d, color, key: `${i}-${curr.day}-${curr.segmentType}` })
  }

  const yTicks = gridValues(scale.yMax)
  const xTicks = [1, Math.max(1, Math.round(totalDays / 3)), Math.max(1, Math.round((totalDays * 2) / 3)), totalDays]

  const lastPoint = points[points.length - 1]

  return (
    <section style={{
      background: '#fff',
      border: '1px solid #e3e7ee',
      borderRadius: 16,
      boxShadow: '0 2px 10px rgba(15,23,42,.05)',
      overflow: 'hidden',
      marginBottom: 14,
    }}>
      <div style={{
        padding: '14px 16px 10px',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
        borderBottom: '1px solid #eef2f7',
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 900, color: '#111827' }}>
            Tren Cash Flow Harian
          </div>
          <div style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 3 }}>
            Cash in vs cash out kumulatif sampai hari ini
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 11, fontWeight: 800 }}>
          <span style={{ display:'inline-flex', alignItems:'center', gap:5, color: GREEN }}><i style={{ width:8, height:8, borderRadius:99, background:GREEN, display:'inline-block' }} />Income</span>
          <span style={{ display:'inline-flex', alignItems:'center', gap:5, color: RED }}><i style={{ width:8, height:8, borderRadius:99, background:RED, display:'inline-block' }} />Expense</span>
          <span style={{ display:'inline-flex', alignItems:'center', gap:5, color: BLUE }}><i style={{ width:8, height:8, borderRadius:99, background:BLUE, display:'inline-block' }} />Saving</span>
        </div>
      </div>

      <div style={{ padding: '12px 14px 14px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 8,
          marginBottom: 8,
        }}>
          <MiniStat label="Cash In" value={fmtShort(totalIncome)} color={GREEN} />
          <MiniStat label="Cash Out" value={fmtShort(totalCashOut)} color={RED} />
          <MiniStat label="Saving Share" value={`${savingShare}%`} color={BLUE} />
        </div>

        <div style={{ width: '100%', overflow: 'hidden' }}>
          <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Tren cash flow harian" style={{ width:'100%', height:'auto', display:'block' }}>
            <defs>
              <filter id="fink-soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="2.2" floodOpacity="0.16" />
              </filter>
            </defs>

            {yTicks.map((tick, idx) => {
              const y = scale.y(tick)
              return (
                <g key={`y-${idx}`}>
                  <line x1={pad.l} x2={width - pad.r} y1={y} y2={y} stroke={GRID} strokeWidth="1" />
                  <text x={pad.l - 10} y={y + 4} textAnchor="end" fontSize="10" fill={TEXT}>{fmtShort(tick)}</text>
                </g>
              )
            })}

            {xTicks.map((day) => {
              const x = scale.x(day, totalDays)
              return (
                <g key={`x-${day}`}>
                  <text x={x} y={height - 8} textAnchor="middle" fontSize="10" fill={TEXT}>{day}</text>
                </g>
              )
            })}

            <line
              x1={scale.x(visibleUntilDay, totalDays)}
              x2={scale.x(visibleUntilDay, totalDays)}
              y1={pad.t}
              y2={height - pad.b}
              stroke="#d1d5db"
              strokeWidth="1.4"
              strokeDasharray="4 4"
            />

            {totalIncome > 0 && (
              <path
                d={incomePath}
                fill="none"
                stroke={GREEN}
                strokeWidth="4.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#fink-soft-shadow)"
              />
            )}

            {segments.map((s) => (
              <path
                key={s.key}
                d={s.d}
                fill="none"
                stroke={s.color}
                strokeWidth="4.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#fink-soft-shadow)"
              />
            ))}

            {lastPoint && (
              <>
                {totalIncome > 0 && (
                  <circle
                    cx={scale.x(lastPoint.day, totalDays)}
                    cy={scale.y(totalIncome)}
                    r="4.4"
                    fill={GREEN}
                    stroke="#fff"
                    strokeWidth="2"
                  />
                )}
                {totalCashOut > 0 && (
                  <circle
                    cx={scale.x(lastPoint.day, totalDays)}
                    cy={scale.y(totalCashOut)}
                    r="4.4"
                    fill={lastPoint.segmentType === 'saving' ? BLUE : RED}
                    stroke="#fff"
                    strokeWidth="2"
                  />
                )}
              </>
            )}
          </svg>
        </div>

        <div style={{
          marginTop: 4,
          fontSize: 11.5,
          color: '#6b7280',
          lineHeight: 1.45,
        }}>
          Dari total cash out {fmtShort(totalCashOut)}, {fmtShort(totalExpense)} digunakan untuk expense dan {fmtShort(totalSaving)} dialokasikan ke saving.
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .fink-chart-mini-stat-value {
            font-size: 13px !important;
          }
          .fink-chart-mini-stat-label {
            font-size: 9.5px !important;
          }
        }
      `}</style>
    </section>
  )
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      border: '1px solid #eef2f7',
      background: '#fbfcfd',
      borderRadius: 10,
      padding: '8px 10px',
      minWidth: 0,
    }}>
      <div className="fink-chart-mini-stat-label" style={{
        fontSize: 10,
        color: '#9ca3af',
        textTransform: 'uppercase',
        letterSpacing: '.55px',
        fontWeight: 800,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {label}
      </div>
      <div className="fink-chart-mini-stat-value" style={{
        marginTop: 3,
        color,
        fontSize: 15,
        fontWeight: 900,
        fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {value}
      </div>
    </div>
  )
}
