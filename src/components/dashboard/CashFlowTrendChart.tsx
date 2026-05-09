'use client'

import { useState } from 'react'
import type { IncomeCategory, SavingRow, Transaction } from '@/types/database'

type Props = {
  tx: Transaction[]
  income?: IncomeCategory[]
  saving?: SavingRow[]
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
  segmentType: 'expense' | 'saving'
}

const GREEN = '#3f7f4a'
const RED = '#c83a36'
const BLUE = '#4b63ff'
const GRID = '#edf1f5'
const TEXT = '#7b8494'

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

function makeDayData(totalDays: number, tx: Transaction[], fallbackIncome: number, fallbackSaving: number, visibleUntilDay: number): DayData[] {
  const byDay = Array.from({ length: totalDays + 1 }, () => ({ income: 0, expense: 0, saving: 0 }))

  for (const t of tx) {
    const day = Math.min(totalDays, Math.max(1, Number(t.date || 1)))
    const amount = Number(t.amt || 0)

    if (t.type === 'inn') byDay[day].income += amount
    if (t.type === 'out') byDay[day].expense += amount
    if (t.type === 'save') byDay[day].saving += amount
  }

  const incomeFromTx = tx.filter(t => t.type === 'inn').reduce((s, t) => s + Number(t.amt || 0), 0)
  const savingFromTx = tx.filter(t => t.type === 'save').reduce((s, t) => s + Number(t.amt || 0), 0)

  if (incomeFromTx <= 0 && fallbackIncome > 0) byDay[1].income += fallbackIncome
  if (savingFromTx <= 0 && fallbackSaving > 0) byDay[Math.min(visibleUntilDay, totalDays)].saving += fallbackSaving

  return byDay
}

function buildPoints(byDay: DayData[], visibleUntilDay: number): Point[] {
  const points: Point[] = []
  let income = 0
  let cashOut = 0
  let expense = 0
  let saving = 0
  let lastType: Point['segmentType'] = 'expense'

  for (let day = 1; day <= visibleUntilDay; day++) {
    income += byDay[day].income

    if (byDay[day].expense > 0) {
      expense += byDay[day].expense
      cashOut += byDay[day].expense
      lastType = 'expense'
    }

    if (byDay[day].saving > 0) {
      saving += byDay[day].saving
      cashOut += byDay[day].saving
      lastType = 'saving'
    }

    points.push({ day, income, cashOut, expense, saving, segmentType: lastType })
  }

  if (points.length === 0) points.push({ day: 1, income: 0, cashOut: 0, expense: 0, saving: 0, segmentType: 'expense' })

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
    plotW,
    plotH,
  }
}

function gridValues(maxValue: number) {
  const top = Math.max(maxValue, 1)
  return [0, top * 0.5, top]
}

export default function CashFlowTrendChart({ tx, income, saving, curDay, daysInMonth }: Props) {
  const [hoverDay, setHoverDay] = useState<number | null>(null)

  const today = Math.max(1, curDay || new Date().getDate())
  const totalDays = daysInMonth || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
  const visibleUntilDay = Math.min(today, totalDays)

  const fallbackIncome = sumIncome(income)
  const fallbackSaving = sumSaving(saving)

  const dayData = makeDayData(totalDays, tx, fallbackIncome, fallbackSaving, visibleUntilDay)
  const points = buildPoints(dayData, visibleUntilDay)

  const totalIncome = points[points.length - 1]?.income || 0
  const totalCashOut = points[points.length - 1]?.cashOut || 0

  const width = 760
  const height = 205
  const pad = { l: 62, r: 24, t: 16, b: 30 }
  const maxValue = Math.max(totalIncome, totalCashOut, ...points.map(p => Math.max(p.income, p.cashOut)))
  const scale = makeScale(maxValue, width, height, pad)

  const incomePath = makePath(points.map(p => ({
    x: scale.x(p.day, totalDays),
    y: scale.y(p.income),
  })))

  const cashOutSegments: { d: string; color: string; key: string }[] = []
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const color = curr.segmentType === 'saving' ? BLUE : RED

    cashOutSegments.push({
      key: `${i}-${curr.day}-${curr.segmentType}`,
      color,
      d: makePath([
        { x: scale.x(prev.day, totalDays), y: scale.y(prev.cashOut) },
        { x: scale.x(curr.day, totalDays), y: scale.y(curr.cashOut) },
      ]),
    })
  }

  const yTicks = gridValues(scale.yMax)
  const xTicks = [1, Math.max(1, Math.round(totalDays / 3)), Math.max(1, Math.round((totalDays * 2) / 3)), totalDays]
  const lastPoint = points[points.length - 1]
  const hoveredPoint = points.find(p => p.day === hoverDay) || null

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * width
    const ratio = (px - pad.l) / Math.max(1, width - pad.l - pad.r)
    const day = Math.round(ratio * (totalDays - 1) + 1)
    setHoverDay(Math.min(visibleUntilDay, Math.max(1, day)))
  }

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
        padding: '12px 16px 9px',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 10,
        flexWrap: 'wrap',
        borderBottom: '1px solid #eef2f7',
      }}>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 900, color: '#111827' }}>
            Tren Cash Flow Harian
          </div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
            Cash in vs cash out kumulatif sampai hari ini
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap', fontSize: 10.5, fontWeight: 800 }}>
          <span style={{ display:'inline-flex', alignItems:'center', gap:5, color: GREEN }}><i style={{ width:7, height:7, borderRadius:99, background:GREEN, display:'inline-block' }} />Income</span>
          <span style={{ display:'inline-flex', alignItems:'center', gap:5, color: RED }}><i style={{ width:7, height:7, borderRadius:99, background:RED, display:'inline-block' }} />Expense</span>
          <span style={{ display:'inline-flex', alignItems:'center', gap:5, color: BLUE }}><i style={{ width:7, height:7, borderRadius:99, background:BLUE, display:'inline-block' }} />Saving</span>
        </div>
      </div>

      <div style={{ padding: '10px 14px 10px' }}>
        <div style={{ width: '100%', overflow: 'hidden' }}>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label="Tren cash flow harian"
            onMouseMove={handleMove}
            onMouseLeave={() => setHoverDay(null)}
            style={{ width:'100%', height:'auto', display:'block', cursor:'crosshair' }}
          >
            {yTicks.map((tick, idx) => {
              const y = scale.y(tick)
              return (
                <g key={`y-${idx}`}>
                  <line x1={pad.l} x2={width - pad.r} y1={y} y2={y} stroke={GRID} strokeWidth="1" />
                  <text x={pad.l - 10} y={y + 3.5} textAnchor="end" fontSize="9.5" fill={TEXT}>{fmtShort(tick)}</text>
                </g>
              )
            })}

            {xTicks.map((day) => {
              const x = scale.x(day, totalDays)
              return (
                <g key={`x-${day}`}>
                  <text x={x} y={height - 8} textAnchor="middle" fontSize="9.5" fill={TEXT}>{day}</text>
                </g>
              )
            })}

            <line
              x1={scale.x(visibleUntilDay, totalDays)}
              x2={scale.x(visibleUntilDay, totalDays)}
              y1={pad.t}
              y2={height - pad.b}
              stroke="#d1d5db"
              strokeWidth="1.1"
              strokeDasharray="4 4"
            />

            {totalIncome > 0 && (
              <path
                d={incomePath}
                fill="none"
                stroke={GREEN}
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            )}

            {cashOutSegments.map((segment) => (
              <path
                key={segment.key}
                d={segment.d}
                fill="none"
                stroke={segment.color}
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            ))}

            {lastPoint && (
              <>
                {totalIncome > 0 && (
                  <circle cx={scale.x(lastPoint.day, totalDays)} cy={scale.y(totalIncome)} r="3.4" fill={GREEN} stroke="#fff" strokeWidth="1.7" />
                )}
                {totalCashOut > 0 && (
                  <circle cx={scale.x(lastPoint.day, totalDays)} cy={scale.y(totalCashOut)} r="3.4" fill={lastPoint.segmentType === 'saving' ? BLUE : RED} stroke="#fff" strokeWidth="1.7" />
                )}
              </>
            )}

            {hoveredPoint && (
              <>
                <line
                  x1={scale.x(hoveredPoint.day, totalDays)}
                  x2={scale.x(hoveredPoint.day, totalDays)}
                  y1={pad.t}
                  y2={height - pad.b}
                  stroke="#9ca3af"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                {hoveredPoint.income > 0 && (
                  <circle cx={scale.x(hoveredPoint.day, totalDays)} cy={scale.y(hoveredPoint.income)} r="3.2" fill={GREEN} stroke="#fff" strokeWidth="1.6" />
                )}
                {hoveredPoint.cashOut > 0 && (
                  <circle cx={scale.x(hoveredPoint.day, totalDays)} cy={scale.y(hoveredPoint.cashOut)} r="3.2" fill={hoveredPoint.segmentType === 'saving' ? BLUE : RED} stroke="#fff" strokeWidth="1.6" />
                )}

                {(() => {
                  const tooltipW = 154
                  const tooltipH = 78
                  const rawX = scale.x(hoveredPoint.day, totalDays) + 10
                  const rawY = Math.min(scale.y(Math.max(hoveredPoint.income, hoveredPoint.cashOut)) + 10, height - pad.b - tooltipH)
                  const x = Math.min(rawX, width - tooltipW - 8)
                  const y = Math.max(8, rawY)
                  return (
                    <g>
                      <rect x={x} y={y} width={tooltipW} height={tooltipH} rx="10" fill="#111827" opacity="0.94" />
                      <text x={x + 12} y={y + 20} fontSize="11" fontWeight="800" fill="#fff">Hari {hoveredPoint.day}</text>

                      <circle cx={x + 13} cy={y + 38} r="4" fill={GREEN} />
                      <text x={x + 24} y={y + 42} fontSize="10.5" fill="#e5e7eb">Income</text>
                      <text x={x + tooltipW - 12} y={y + 42} fontSize="10.5" fill="#fff" textAnchor="end">{fmt(hoveredPoint.income)}</text>

                      <circle cx={x + 13} cy={y + 55} r="4" fill={RED} />
                      <text x={x + 24} y={y + 59} fontSize="10.5" fill="#e5e7eb">Expense</text>
                      <text x={x + tooltipW - 12} y={y + 59} fontSize="10.5" fill="#fff" textAnchor="end">{fmt(hoveredPoint.expense)}</text>

                      <circle cx={x + 13} cy={y + 72} r="4" fill={BLUE} />
                      <text x={x + 24} y={y + 76} fontSize="10.5" fill="#e5e7eb">Saving</text>
                      <text x={x + tooltipW - 12} y={y + 76} fontSize="10.5" fill="#fff" textAnchor="end">{fmt(hoveredPoint.saving)}</text>
                    </g>
                  )
                })()}
              </>
            )}
          </svg>
        </div>
      </div>
    </section>
  )
}
