'use client'

import { useMemo, useState } from 'react'
import type { IncomeCategory, SavingRow, DebtRow, Transaction } from '@/types/database'

type Props = {
  tx: Transaction[]
  income?: IncomeCategory[]
  saving?: SavingRow[]
  debt?: DebtRow[]
  curDay?: number
  daysInMonth?: number
}

type DayData = {
  income: number
  expense: number
  saving: number
}

type Point = {
  day: number
  income: number
  cashOut: number
  expense: number
  saving: number
}

const GREEN = '#3f7f4a'
const RED = '#b9473f'
const BLUE = '#4b63ff'
const GRID = '#edf1f5'
const TEXT = '#6b7280'

const fmtShort = (n: number) => {
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

function sumDebtRows(debt?: DebtRow[]) {
  return (debt || []).reduce((s, r) => s + (r.actual || 0), 0)
}

function makeDayData(totalDays: number, tx: Transaction[], fallbackIncome: number, fallbackSaving: number, fallbackDebt: number, visibleUntilDay: number): DayData[] {
  const byDay = Array.from({ length: totalDays + 1 }, () => ({ income: 0, expense: 0, saving: 0 }))

  for (const t of tx) {
    // Unpaid adalah pengeluaran tertunda; belum dianggap cash-out riil sampai settled.
    if (t.debt && !t.settled) continue
    const day = Math.min(totalDays, Math.max(1, Number(t.date || 1)))
    const amount = Number(t.amt || 0)

    if (t.type === 'inn') byDay[day].income += amount
    if (t.type === 'out') byDay[day].expense += amount
    if (t.type === 'save') byDay[day].saving += amount
  }

  const settledTx = tx.filter(t => !(t.debt && !t.settled))
  const incomeFromTx = settledTx.filter(t => t.type === 'inn').reduce((s, t) => s + Number(t.amt || 0), 0)
  const savingFromTx = settledTx.filter(t => t.type === 'save').reduce((s, t) => s + Number(t.amt || 0), 0)
  const debtFromTx = 0

  if (incomeFromTx <= 0 && fallbackIncome > 0) byDay[1].income += fallbackIncome
  if (savingFromTx <= 0 && fallbackSaving > 0) byDay[Math.min(visibleUntilDay, totalDays)].saving += fallbackSaving
  if (debtFromTx <= 0 && fallbackDebt > 0) byDay[Math.min(visibleUntilDay, totalDays)].expense += fallbackDebt

  return byDay
}

function buildPoints(byDay: DayData[], visibleUntilDay: number): Point[] {
  const points: Point[] = []
  let income = 0
  let cashOut = 0
  let expense = 0
  let saving = 0
  for (let day = 1; day <= visibleUntilDay; day++) {
    income += byDay[day].income

    if (byDay[day].expense > 0) {
      expense += byDay[day].expense
      cashOut += byDay[day].expense
    }

    if (byDay[day].saving > 0) {
      saving += byDay[day].saving
      cashOut += byDay[day].saving
    }

    points.push({ day, income, cashOut, expense, saving })
  }

  if (points.length === 0) points.push({ day: 1, income: 0, cashOut: 0, expense: 0, saving: 0 })
  return points
}

function makePath(points: { x: number; y: number }[]) {
  if (points.length === 0) return ''
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ')
}

function makeScale(maxValue: number, width: number, height: number, pad: { l: number; r: number; t: number; b: number }) {
  const plotW = width - pad.l - pad.r
  const plotH = height - pad.t - pad.b
  const yMax = Math.max(maxValue * 1.12, 1)

  return {
    x: (day: number, totalDays: number) => pad.l + ((day - 1) / Math.max(1, totalDays - 1)) * plotW,
    y: (value: number) => pad.t + (1 - value / yMax) * plotH,
    yMax,
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export default function CashFlowTrendChart({ tx, income, saving, debt, curDay, daysInMonth }: Props) {
  const [hoverDay, setHoverDay] = useState<number | null>(null)

  const today = Math.max(1, curDay || new Date().getDate())
  const totalDays = daysInMonth || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
  const visibleUntilDay = Math.min(today, totalDays)
  const xDomainDays = Math.max(2, totalDays)

  const fallbackIncome = sumIncome(income)
  const fallbackSaving = sumSaving(saving)
  const fallbackDebt = sumDebtRows(debt)

  const dayData = useMemo(
    () => makeDayData(totalDays, tx, fallbackIncome, fallbackSaving, fallbackDebt, visibleUntilDay),
    [totalDays, tx, fallbackIncome, fallbackSaving, fallbackDebt, visibleUntilDay],
  )

  const points = useMemo(() => buildPoints(dayData, visibleUntilDay), [dayData, visibleUntilDay])

  const totalIncome = points[points.length - 1]?.income || 0
  const totalCashOut = points[points.length - 1]?.cashOut || 0

  const width = 980
  const height = 380
  const pad = { l: 70, r: 96, t: 8, b: 34 }
  const maxValue = Math.max(totalIncome, totalCashOut, ...points.map(p => Math.max(p.income, p.cashOut)))
  const scale = makeScale(maxValue, width, height, pad)

  const yTicks = [0, scale.yMax * 0.5, scale.yMax]
  const xTicks = Array.from(new Set([1, Math.max(1, Math.round(xDomainDays / 3)), Math.max(1, Math.round((xDomainDays * 2) / 3)), xDomainDays]))

  const incomePath = makePath(points.map(p => ({
    x: scale.x(p.day, xDomainDays),
    y: scale.y(p.income),
  })))

  const cashOutPath = makePath(points.map(p => ({
    x: scale.x(p.day, xDomainDays),
    y: scale.y(p.cashOut),
  })))

  const lastPoint = points[points.length - 1]
  const hoveredPoint = points.find(p => p.day === hoverDay) || null

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * width
    const ratio = (px - pad.l) / Math.max(1, width - pad.l - pad.r)
    const day = Math.round(ratio * (xDomainDays - 1) + 1)
    setHoverDay(clamp(day, 1, visibleUntilDay))
  }

  return (
    <section className="fink-cashflow-card" style={{
      background: '#fff',
      border: '1px solid #e3e7ee',
      borderRadius: 16,
      boxShadow: '0 2px 10px rgba(15,23,42,.05)',
      overflow: 'hidden',
      marginBottom: 0,
      height: '100%',
      minHeight: 320,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div className="fink-cashflow-head" style={{
        padding: '12px 16px 9px',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 10,
        flexWrap: 'wrap',
        borderBottom: '1px solid #eef2f7',
      }}>
        <div>
          <div style={{ fontSize: 14.5, fontWeight: 900, color: '#111827' }}>
            Tren Kapasitas Cash Flow
          </div>
          <div style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 3 }}>
            Income dibanding total outflow (expense + saving)
          </div>
        </div>

        <div className="fink-cashflow-legend" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 11.5, fontWeight: 800 }}>
          <span style={{ display:'inline-flex', alignItems:'center', gap:5, color: GREEN }}><i style={{ width:8, height:8, borderRadius:99, background:GREEN, display:'inline-block' }} />Income</span>
          <span style={{ display:'inline-flex', alignItems:'center', gap:5, color: RED }}><i style={{ width:8, height:8, borderRadius:99, background:RED, display:'inline-block' }} />Total Outflow</span>
        </div>
      </div>

      <div className="fink-cashflow-body" style={{ padding: '0 16px 0', flex: 1, display: 'flex', minHeight: 0 }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          role="img"
          aria-label="Tren cash flow harian"
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverDay(null)}
          className="fink-cashflow-svg"
          style={{ width:'100%', height:'100%', minHeight:0, display:'block', cursor:'crosshair', flex: 1 }}
        >
          {yTicks.map((tick, idx) => {
            const y = scale.y(tick)
            return (
              <g key={`y-${idx}`}>
                <line x1={pad.l} x2={width - pad.r} y1={y} y2={y} stroke={GRID} strokeWidth="1" />
                <text x={pad.l - 12} y={y + 4} textAnchor="end" fontSize="12" fill={TEXT}>{fmtShort(tick)}</text>
              </g>
            )
          })}

          {xTicks.map((day) => {
            const x = scale.x(day, xDomainDays)
            return (
              <g key={`x-${day}`}>
                <text x={x} y={height - 8} textAnchor="middle" fontSize="12" fill={TEXT}>{day}</text>
              </g>
            )
          })}

          <line
            x1={scale.x(visibleUntilDay, xDomainDays)}
            x2={scale.x(visibleUntilDay, xDomainDays)}
            y1={pad.t}
            y2={height - pad.b}
            stroke="#c7cdd6"
            strokeWidth="1.2"
            strokeDasharray="4 4"
          />

          {totalIncome > 0 && (
            <path
              d={incomePath}
              fill="none"
              stroke={GREEN}
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {totalCashOut > 0 && (
            <path
              d={cashOutPath}
              fill="none"
              stroke={RED}
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {lastPoint && (
            <>
              {totalIncome > 0 && (
                <>
                  <circle cx={scale.x(lastPoint.day, xDomainDays)} cy={scale.y(totalIncome)} r="4" fill={GREEN} stroke="#fff" strokeWidth="2" />
                  {(() => {
                    const x = clamp(scale.x(lastPoint.day, xDomainDays) + 10, pad.l + 8, width - 88)
                    const y = clamp(scale.y(totalIncome) - 14, pad.t + 4, height - pad.b - 22)
                    return (
                      <g>
                        <rect x={x} y={y} width="80" height="25" rx="7" fill={GREEN} opacity="0.96" />
                        <text x={x + 40} y={y + 17} textAnchor="middle" fontSize="11.5" fontWeight="800" fill="#fff">{fmtShort(totalIncome)}</text>
                      </g>
                    )
                  })()}
                </>
              )}
              {totalCashOut > 0 && (
                <>
                  <circle cx={scale.x(lastPoint.day, xDomainDays)} cy={scale.y(totalCashOut)} r="4" fill={RED} stroke="#fff" strokeWidth="2" />
                  {(() => {
                    const x = clamp(scale.x(lastPoint.day, xDomainDays) + 10, pad.l + 8, width - 88)
                    const y = clamp(scale.y(totalCashOut) - 14, pad.t + 4, height - pad.b - 22)
                    return (
                      <g>
                        <rect x={x} y={y} width="80" height="25" rx="7" fill={RED} opacity="0.96" />
                        <text x={x + 40} y={y + 17} textAnchor="middle" fontSize="11.5" fontWeight="800" fill="#fff">{fmtShort(totalCashOut)}</text>
                      </g>
                    )
                  })()}
                </>
              )}
            </>
          )}

          {hoveredPoint && (() => {
            const tooltipW = 176
            const tooltipH = 108
            const cursorX = scale.x(hoveredPoint.day, xDomainDays)
            const topValue = Math.max(hoveredPoint.income, hoveredPoint.cashOut)
            const rawX = cursorX + 12
            const rawY = scale.y(topValue) + 12
            const x = clamp(rawX, pad.l + 4, width - tooltipW - 8)
            const y = clamp(rawY, pad.t + 4, height - pad.b - tooltipH - 4)

            return (
              <>
                <line
                  x1={cursorX}
                  x2={cursorX}
                  y1={pad.t}
                  y2={height - pad.b}
                  stroke="#9ca3af"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />

                {hoveredPoint.income > 0 && (
                  <circle cx={cursorX} cy={scale.y(hoveredPoint.income)} r="3.8" fill={GREEN} stroke="#fff" strokeWidth="1.8" />
                )}
                {hoveredPoint.cashOut > 0 && (
                  <circle cx={cursorX} cy={scale.y(hoveredPoint.cashOut)} r="3.8" fill={RED} stroke="#fff" strokeWidth="1.8" />
                )}

                <g>
                  <rect x={x} y={y} width={tooltipW} height={tooltipH} rx="10" fill="#111827" opacity="0.94" />
                  <text x={x + 13} y={y + 21} fontSize="12" fontWeight="800" fill="#fff">Hari {hoveredPoint.day}</text>

                  <circle cx={x + 14} cy={y + 40} r="4" fill={GREEN} />
                  <text x={x + 27} y={y + 44} fontSize="11" fill="#e5e7eb">Income</text>
                  <text x={x + tooltipW - 13} y={y + 44} fontSize="11" fill="#fff" textAnchor="end">{fmtShort(hoveredPoint.income)}</text>

                  <circle cx={x + 14} cy={y + 59} r="4" fill={RED} />
                  <text x={x + 27} y={y + 63} fontSize="11" fill="#e5e7eb">Outflow</text>
                  <text x={x + tooltipW - 13} y={y + 63} fontSize="11" fill="#fff" textAnchor="end">{fmtShort(hoveredPoint.cashOut)}</text>

                  <text x={x + 27} y={y + 82} fontSize="10.5" fill="#d1d5db">Expense</text>
                  <text x={x + tooltipW - 13} y={y + 82} fontSize="10.5" fill="#d1d5db" textAnchor="end">{fmtShort(hoveredPoint.expense)}</text>

                  <text x={x + 27} y={y + 99} fontSize="10.5" fill="#d1d5db">Saving</text>
                  <text x={x + tooltipW - 13} y={y + 99} fontSize="10.5" fill="#d1d5db" textAnchor="end">{fmtShort(hoveredPoint.saving)}</text>
                </g>
              </>
            )
          })()}
        </svg>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .fink-cashflow-head {
            padding: 12px 14px 9px !important;
          }
          .fink-cashflow-body {
            padding: 0 8px 0 !important;
          }
          .fink-cashflow-svg {
            height: 250px !important;
            min-height: 250px !important;
          }
          .fink-cashflow-legend {
            font-size: 10.5px !important;
            gap: 8px !important;
          }
        }
      `}</style>
    </section>
  )
}
