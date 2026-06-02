'use client'

import Link from 'next/link'
import { memo, useEffect, useMemo, useState } from 'react'
import { useMonthContext, MONTH_NAMES, MONTHS_ORDER } from '@/components/layout/DashboardShell'
import { useBulanan } from '@/hooks/useBulanan'
import { useSavings } from '@/hooks/useSavings'
import { AppIcon, SectionCard, SectionHeader, PremiumLockCard, MetricCard as DesignMetricCard } from '@/components/ui/design'
import { useSubscription } from '@/hooks/useSubscription'
import type { BudgetCategory, IncomeCategory, SavingRow, DebtRow, Transaction } from '@/types/database'
import type { SavingsGoal } from '@/types/savings'

const fmt = (n: number) => 'Rp ' + Math.abs(Math.round(n || 0)).toLocaleString('id-ID')
const pct = (n: number) => `${Math.round(n || 0)}%`

const fmtShort = (n: number) => {
  const abs = Math.abs(Math.round(n || 0))
  if (abs >= 1_000_000) {
    const v = abs / 1_000_000
    return `Rp ${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1).replace('.', ',')}jt`
  }
  if (abs >= 1_000) return `Rp ${Math.round(abs / 1_000).toLocaleString('id-ID')}rb`
  return `Rp ${abs.toLocaleString('id-ID')}`
}

type MonthlyTrendItem = {
  month: string
  year: number
  label: string
  income: number
  expense: number
  debt?: number
  saving: number
  cashflow: number
  savingRate: number
  expenseRate: number
  transactionCount: number
}

const OVERVIEW_TREND_CACHE_PREFIX = 'fink-overview-trend:v4'
const OVERVIEW_TREND_CACHE_TTL = 1000 * 60 * 30 // 30 menit: trend historis jarang berubah, tapi tetap cukup segar.

function safeParseTrendCache(raw: string | null): { data: MonthlyTrendItem[]; cachedAt?: number } | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.data)) return null
    return parsed
  } catch {
    return null
  }
}

function getCachedTrend(cacheKey: string) {
  if (typeof window === 'undefined') return null
  const local = safeParseTrendCache(window.localStorage.getItem(cacheKey))
  if (local?.cachedAt && Date.now() - local.cachedAt <= OVERVIEW_TREND_CACHE_TTL) return local.data
  const session = safeParseTrendCache(window.sessionStorage.getItem(cacheKey))
  if (session?.data) return session.data
  return null
}

function setCachedTrend(cacheKey: string, data: MonthlyTrendItem[]) {
  if (typeof window === 'undefined') return
  const value = JSON.stringify({ data, cachedAt: Date.now() })
  try { window.localStorage.setItem(cacheKey, value) } catch {}
  try { window.sessionStorage.setItem(cacheKey, value) } catch {}
}

const trendPct = (current?: number, previous?: number) => {
  if (!previous) return null
  return ((Number(current || 0) - previous) / previous) * 100
}

const trendLabel = (value: number | null, goodWhenUp = true) => {
  if (value === null || !Number.isFinite(value)) return { text: 'Belum ada pembanding', color: '#9ca3af' }
  const up = value >= 0
  const good = goodWhenUp ? up : !up
  return {
    text: `${up ? 'Naik' : 'Turun'} ${Math.abs(Math.round(value))}% vs bulan lalu`,
    color: good ? '#15803d' : '#b91c1c',
  }
}

const MonthlyComparisonChart = memo(function MonthlyComparisonChart({ data }: { data: MonthlyTrendItem[] }) {
  const [hovered, setHovered] = useState<{
    month: string
    label: string
    value: number
    income: number
    expense: number
    saving: number
    x: number
    y: number
  } | null>(null)

  const chartData = data
    .slice(-6)
    .map(d => ({
      label:d.label,
      income:Number(d.income || 0),
      expense:Number(d.expense || 0),
      saving:Number(d.saving || 0),
    }))

  const maxVal = Math.max(1, ...chartData.flatMap(d => [d.income, d.expense, d.saving]))
  const ticks = [maxVal, maxVal * .5, 0]
  const barHeight = (value:number) => `${Math.max(value > 0 ? 4 : 0, (value / maxVal) * 100)}%`

  const showTooltip = (
    e: React.MouseEvent<HTMLElement>,
    item: { label:string; income:number; expense:number; saving:number },
    label: string,
    value: number
  ) => {
    const rect = e.currentTarget.closest('.monthly-css-chart')?.getBoundingClientRect()
    if (!rect) return
    setHovered({
      month: item.label,
      label,
      value,
      income: item.income,
      expense: item.expense,
      saving: item.saving,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  const moveTooltip = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.closest('.monthly-css-chart')?.getBoundingClientRect()
    if (!rect || !hovered) return
    setHovered(prev => prev ? ({ ...prev, x: e.clientX - rect.left, y: e.clientY - rect.top }) : prev)
  }

  return (
    <Card style={{ borderRadius:20, overflow:'hidden' }}>
      <div style={{ padding:'14px 16px 4px', display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, flexWrap:'wrap' }}>
        <div>
          <div style={{ fontSize:16, fontWeight:950, color:'#111827' }}>Monthly Comparison</div>
          <div style={{ fontSize:11.5, color:'#64748b', marginTop:3 }}>Income, expenses, dan saving dalam 6 bulan terakhir</div>
        </div>
        <span style={{ fontSize:11, color:'#64748b', fontWeight:850, padding:'6px 9px', border:'1px solid #e2e8f0', borderRadius:999, background:'#f8fafc' }}>6 months</span>
      </div>

      <div className="monthly-css-chart" style={{ padding:'16px 18px 18px', position:'relative' }}>
        {chartData.length === 0 ? (
          <div style={{ height:260, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, color:'#94a3b8' }}>
            Belum ada data historis untuk ditampilkan.
          </div>
        ) : (
          <>
            <div className="monthly-css-plot" style={{
              display:'grid',
              gridTemplateColumns:'54px minmax(0, 1fr)',
              gap:10,
              height:260,
              minHeight:260,
            }}>
              <div style={{ display:'flex', flexDirection:'column', justifyContent:'space-between', padding:'2px 0 0' }}>
                {ticks.map((tick, idx) => (
                  <div key={idx} style={{ fontSize:10.5, color:'#64748b', textAlign:'right', lineHeight:1 }}>
                    {idx === 2 ? '0' : fmtShort(tick).replace('Rp ', '')}
                  </div>
                ))}
              </div>

              <div style={{ position:'relative', minWidth:0 }}>
                <div style={{ position:'absolute', inset:'0', display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{ borderTop:'1px solid #edf1f5', height:0 }} />
                  ))}
                </div>

                <div className="monthly-css-bars" style={{
                  position:'relative',
                  height:'100%',
                  display:'grid',
                  gridTemplateColumns:`repeat(${chartData.length}, minmax(58px, 1fr))`,
                  gap:14,
                  alignItems:'end',
                  overflowX:'auto',
                  padding:'0 2px',
                }}>
                  {chartData.map(item => {
                    const bars = [
                      { key:'income', label:'Income', value:item.income, color:'#3f8f5b' },
                      { key:'expense', label:'Expenses', value:item.expense, color:'#dc6b70' },
                      { key:'saving', label:'Saving', value:item.saving, color:'#4b63ff' },
                    ]

                    return (
                      <div
                        key={item.label}
                        onMouseLeave={() => setHovered(null)}
                        style={{ minWidth:58, height:'100%', display:'flex', flexDirection:'column', justifyContent:'flex-end', alignItems:'center' }}
                      >
                        <div style={{ flex:1, width:'100%', display:'flex', justifyContent:'center', alignItems:'flex-end', gap:6 }}>
                          {bars.map(bar => (
                            <div
                              key={bar.key}
                              onMouseEnter={e => showTooltip(e, item, bar.label, bar.value)}
                              onMouseMove={moveTooltip}
                              style={{
                                height:barHeight(bar.value),
                                minHeight:bar.value > 0 ? 4 : 0,
                                width:18,
                                borderRadius:'7px 7px 4px 4px',
                                background:bar.color,
                                opacity:bar.value > 0 ? .92 : .55,
                                transition:'opacity .15s ease, transform .15s ease',
                                cursor:'default',
                              }}
                              onMouseOver={e => {
                                e.currentTarget.style.opacity = '1'
                                e.currentTarget.style.transform = 'translateY(-2px)'
                              }}
                              onMouseOut={e => {
                                e.currentTarget.style.opacity = bar.value > 0 ? '.92' : '.55'
                                e.currentTarget.style.transform = 'translateY(0)'
                              }}
                            />
                          ))}
                        </div>

                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'54px minmax(0, 1fr)', gap:10, marginTop:8 }}>
              <div />
              <div style={{
                borderTop:'1px solid #edf1f5',
                paddingTop:10,
                display:'grid',
                gridTemplateColumns:`repeat(${chartData.length}, minmax(58px, 1fr))`,
                gap:14,
                overflowX:'auto',
              }}>
                {chartData.map(item => (
                  <div
                    key={item.label}
                    onMouseEnter={e => showTooltip(e, item, 'Monthly Summary', item.income - item.expense - item.saving)}
                    onMouseMove={moveTooltip}
                    onMouseLeave={() => setHovered(null)}
                    style={{ minWidth:58, textAlign:'center', fontSize:10.5, fontWeight:850, color:'#64748b', whiteSpace:'nowrap', cursor:'default' }}
                  >
                    {item.label}
                  </div>
                ))}
              </div>
            </div>

            <div style={{
              display:'flex',
              justifyContent:'center',
              alignItems:'center',
              gap:28,
              marginTop:16,
              fontSize:11.5,
              fontWeight:750,
              color:'#475569',
              flexWrap:'wrap',
            }}>
              <span style={{ display:'inline-flex', alignItems:'center', gap:7 }}>
                <i style={{ width:10, height:10, borderRadius:2, background:'#3f8f5b', display:'inline-block' }} />
                Income
              </span>
              <span style={{ display:'inline-flex', alignItems:'center', gap:7 }}>
                <i style={{ width:10, height:10, borderRadius:2, background:'#dc6b70', display:'inline-block' }} />
                Expenses
              </span>
              <span style={{ display:'inline-flex', alignItems:'center', gap:7 }}>
                <i style={{ width:10, height:10, borderRadius:2, background:'#4b63ff', display:'inline-block' }} />
                Saving
              </span>
            </div>

            {hovered && (
              <div
                style={{
                  position:'absolute',
                  left: Math.min(Math.max(hovered.x + 14, 12), 9999),
                  top: Math.max(hovered.y - 92, 10),
                  transform: hovered.x > 700 ? 'translateX(-100%)' : 'none',
                  background:'#111827',
                  color:'#fff',
                  borderRadius:12,
                  padding:'10px 12px',
                  boxShadow:'0 18px 42px rgba(15,23,42,.24)',
                  fontSize:11.5,
                  lineHeight:1.35,
                  pointerEvents:'none',
                  zIndex:20,
                  minWidth:170,
                }}
              >
                <div style={{ fontWeight:900, marginBottom:6 }}>{hovered.month}</div>
                <div style={{ display:'flex', justifyContent:'space-between', gap:12 }}><span style={{ color:'#cbd5e1' }}>Income</span><span style={{ fontWeight:800, fontFamily:'var(--font-mono), monospace' }}>{fmt(hovered.income)}</span></div>
                <div style={{ display:'flex', justifyContent:'space-between', gap:12, marginTop:3 }}><span style={{ color:'#cbd5e1' }}>Expenses</span><span style={{ fontWeight:800, fontFamily:'var(--font-mono), monospace' }}>{fmt(hovered.expense)}</span></div>
                <div style={{ display:'flex', justifyContent:'space-between', gap:12, marginTop:3 }}><span style={{ color:'#cbd5e1' }}>Saving</span><span style={{ fontWeight:800, fontFamily:'var(--font-mono), monospace' }}>{fmt(hovered.saving)}</span></div>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  )
})


function dailyBalanceStatus(leftToSpend: number, remainingDays: number, totalExpense: number, currentDay: number) {
  const safeDaily = remainingDays > 0 ? leftToSpend / remainingDays : leftToSpend
  const avgDailySpend = currentDay > 0 ? totalExpense / currentDay : 0
  const ratio = avgDailySpend > 0 ? safeDaily / avgDailySpend : safeDaily > 0 ? 1 : 0

  if (leftToSpend <= 0) return { color:'#b91c1c', bg:'#fee2e2', daily:safeDaily }
  if (ratio >= 1) return { color:'#15803d', bg:'#dcfce7', daily:safeDaily }
  if (ratio >= 0.6) return { color:'#b7791f', bg:'#fef3c7', daily:safeDaily }
  return { color:'#b91c1c', bg:'#fee2e2', daily:safeDaily }
}

function targetedIncomeLabels(income: IncomeCategory[]) {
  const labels = new Set<string>()
  for (const category of income || []) {
    const targetedItems = (category.items || []).filter((item: any) => Number(item?.plan || 0) > 0)
    if (targetedItems.length > 0) labels.add(String(category.label || '').trim().toLowerCase())
    for (const item of targetedItems) {
      labels.add(String(item.label || '').trim().toLowerCase())
    }
  }
  return labels
}

function incomeHasTarget(income: IncomeCategory[]) {
  return targetedIncomeLabels(income).size > 0
}

function isTargetedIncomeTransaction(t: Transaction, targetLabels: Set<string>) {
  if (t.type !== 'inn') return false
  const cat = String((t as any).cat || '').trim().toLowerCase()
  const note = String((t as any).note || '').trim().toLowerCase()
  return (cat && targetLabels.has(cat)) || (note && targetLabels.has(note))
}

function sumIncome(income: IncomeCategory[]) {
  // Income uses ACTUAL values, but only for income items whose TARGET/PLAN > 0.
  // Untargeted income actual is excluded because it may be emergency withdrawal,
  // transfers, loans, or other non-regular money.
  return income.reduce((s, c) => s + (c.items || []).reduce((ss, i: any) => {
    return ss + (Number(i?.plan || 0) > 0 ? Number(i?.actual || 0) : 0)
  }, 0), 0)
}

function sumBudget(budget: BudgetCategory[]) {
  return budget.reduce((s, c) => s + c.items.reduce((ss, i) => ss + (i.actual || 0), 0), 0)
}

function sumSaving(saving: SavingRow[]) {
  return saving.reduce((s, r) => s + (r.actual || 0), 0)
}

function sumDebt(debt: DebtRow[]) {
  return debt.reduce((s, r) => s + (r.actual || 0), 0)
}

function sumBudgetPlan(budget: BudgetCategory[]) {
  return budget.reduce((s, c) => s + c.items.reduce((ss, i) => ss + (i.plan || 0), 0), 0)
}

function sumIncomePlan(income: IncomeCategory[]) {
  return income.reduce((s, c) => s + c.items.reduce((ss, i) => ss + (i.plan || 0), 0), 0)
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <SectionCard
      style={{
        marginBottom: 0,
        borderRadius: 16,
        overflow: 'hidden',
        ...style,
      }}
      bodyStyle={{ padding: 0 }}
    >
      {children}
    </SectionCard>
  )
}

function CardHead({ title, icon, subtitle, right }: { title: string; icon?: React.ReactNode; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="dash-card-head">
      <SectionHeader
        title={title}
        subtitle={subtitle}
        icon={icon}
        right={right}
      />
    </div>
  )
}

function MetricCard({ label, value, note, tone = 'neutral' }: { label: string; value: string; note: string; tone?: 'green'|'red'|'blue'|'neutral' }) {
  const color = tone === 'green' ? '#15803d' : tone === 'red' ? '#b91c1c' : tone === 'blue' ? '#1d4ed8' : '#111827'
  const bg = tone === 'green' ? '#f0fdf4' : tone === 'red' ? '#fef2f2' : tone === 'blue' ? '#eff6ff' : '#fff'
  const border = tone === 'green' ? '#bbf7d0' : tone === 'red' ? '#fecaca' : tone === 'blue' ? '#bfdbfe' : '#e3e7ee'
  return (
    <div style={{ background:bg, border:`1px solid ${border}`, borderRadius:'10px', padding:'14px 15px' }}>
      <div style={{ fontSize:'10px', fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'.7px', marginBottom:'7px' }}>{label}</div>
      <div style={{ fontSize:'20px', fontWeight:800, fontFamily:'var(--font-mono), monospace', color, letterSpacing:'-.5px' }}>{value}</div>
      <div style={{ fontSize:'11px', color:'#6b7280', marginTop:'7px', lineHeight:1.4 }}>{note}</div>
      <style>{`
        @media (max-width: 760px) {
          .dash-summary-grid {
            grid-template-columns: 1fr 1fr !important;
          }
          .dash-summary-grid > div {
            padding: 9px 11px !important;
          }
          .dash-summary-grid > div:nth-child(2n) {
            border-right: none !important;
          }
          .dash-summary-grid > div:nth-child(-n+2) {
            border-bottom: 1px solid #e7ebf0 !important;
          }
        }
      `}</style>
    </div>
  )
}


type FinancialPositionProps = {
  totalAssets: number
  trackedSavings: number
  currentCash: number
  netWorth: number
  totalDebtPayment: number
  unpaidObligation: number
  monthlySurplus: number
  emergencyMonths: number | null
  emergencyProgressPercent: number | null
  emergencyNote: string
  savingRate: number
  expenseRate: number
  activeGoalCount: number
  hasFinancialData: boolean
}

const FinancialPositionHero = memo(function FinancialPositionHero({
  totalAssets,
  trackedSavings,
  currentCash,
  netWorth,
  totalDebtPayment,
  unpaidObligation,
  monthlySurplus,
  emergencyMonths,
  emergencyProgressPercent,
  emergencyNote,
  savingRate,
  expenseRate,
  activeGoalCount,
  hasFinancialData,
}: FinancialPositionProps) {
  const healthScore = hasFinancialData ? Math.max(0, Math.min(100,
    Math.round(
      35 +
      (monthlySurplus >= 0 ? 20 : -18) +
      Math.min(25, savingRate) +
      (expenseRate <= 70 ? 12 : expenseRate <= 85 ? 4 : -8) +
      (emergencyMonths === null ? 0 : emergencyMonths >= 6 ? 8 : emergencyMonths >= 3 ? 4 : -6)
    )
  )) : 0

  const statusColor = !hasFinancialData ? '#64748b' : healthScore >= 75 ? '#15803d' : healthScore >= 55 ? '#b7791f' : '#b91c1c'
  const outcomeTone = monthlySurplus >= 0 ? '#15803d' : '#b91c1c'
  const outcomeBg = monthlySurplus >= 0 ? '#f0fdf4' : '#fef2f2'
  const healthLabel = !hasFinancialData ? 'No Data' : healthScore >= 75 ? 'Healthy' : healthScore >= 55 ? 'Watchful' : 'Critical'
  const emergencyTargetNote = emergencyProgressPercent === null ? 'Target belum diatur' : `${Math.round(emergencyProgressPercent)}% target`

  const metricCard = (
    label: string,
    value: string,
    note: string,
    color: string,
    bg: string,
    emphasis: 'primary' | 'secondary' = 'secondary'
  ) => (
    <div style={{
      background:bg,
      border:'1px solid rgba(148,163,184,.22)',
      borderRadius:16,
      padding: emphasis === 'primary' ? '14px 15px' : '12px 13px',
      minWidth:0
    }}>
      <div style={{ fontSize:10.5, fontWeight:900, color:'#64748b', textTransform:'uppercase', letterSpacing:'.65px' }}>{label}</div>
      <div style={{
        marginTop:7,
        fontSize: emphasis === 'primary' ? 18 : 15,
        fontWeight:950,
        color,
        fontFamily:'var(--font-mono), monospace',
        letterSpacing:'-.5px',
        overflowWrap:'anywhere'
      }}>{value}</div>
      {note && <div style={{ marginTop:6, fontSize:11, color:'#64748b', lineHeight:1.35 }}>{note}</div>}
    </div>
  )

  return (
    <div className="financial-position-hero" style={{
      marginBottom:14,
      borderRadius:24,
      padding:18,
      border:'1px solid #dfe7ef',
      background:'linear-gradient(135deg, #ffffff 0%, #f8fafc 52%, #eefbf4 100%)',
      boxShadow:'0 14px 36px rgba(15,23,42,.06)',
      overflow:'hidden',
      position:'relative',
    }}>
      <div style={{ position:'absolute', right:-70, top:-80, width:220, height:220, borderRadius:999, background:'rgba(34,197,94,.10)' }} />
      <div style={{ position:'absolute', right:80, bottom:-110, width:240, height:240, borderRadius:999, background:'rgba(37,99,235,.07)' }} />

      <div className="financial-position-grid" style={{ position:'relative', display:'grid', gridTemplateColumns:'minmax(260px, 1fr) minmax(0, 2fr)', gap:16, alignItems:'stretch' }}>
        <div style={{ background:'#fff', border:'1px solid rgba(226,232,240,.9)', borderRadius:20, padding:18, boxShadow:'0 10px 28px rgba(15,23,42,.045)' }}>
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:11, color:'#64748b', fontWeight:900, textTransform:'uppercase', letterSpacing:'.75px' }}>Financial Position</div>
          </div>

          <div style={{ fontSize:34, lineHeight:1.08, fontWeight:950, color:'#0f172a', letterSpacing:'-1.4px', fontFamily:'var(--font-mono), monospace', overflowWrap:'anywhere' }}>{fmt(totalAssets)}</div>

          <div style={{ marginTop:15, display:'grid', gridTemplateColumns:'1fr 1fr', gap:9 }}>
            <div style={{ border:'1px solid #e2e8f0', borderRadius:14, padding:'10px 11px' }}>
              <div style={{ fontSize:10, fontWeight:900, color:'#94a3b8', textTransform:'uppercase' }}>Cash</div>
              <div style={{ marginTop:5, fontSize:15, fontWeight:900, color:currentCash >= 0 ? '#15803d' : '#b91c1c', fontFamily:'var(--font-mono), monospace' }}>{fmt(currentCash)}</div>
            </div>
            <div style={{ border:'1px solid #e2e8f0', borderRadius:14, padding:'10px 11px' }}>
              <div style={{ fontSize:10, fontWeight:900, color:'#94a3b8', textTransform:'uppercase' }}>Smart Saving</div>
              <div style={{ marginTop:5, fontSize:15, fontWeight:900, color:'#1d4ed8', fontFamily:'var(--font-mono), monospace' }}>{fmt(trackedSavings)}</div>
            </div>
          </div>

        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div className="financial-position-primary-cards" style={{ display:'grid', gridTemplateColumns:'repeat(3, minmax(0, 1fr))', gap:12 }}>
            {metricCard('Health Score', hasFinancialData ? `${healthScore}/100` : '—', healthLabel, statusColor, '#f8fafc', 'primary')}
            {metricCard('Emergency Cover', emergencyMonths === null ? 'Not Set' : `${emergencyMonths.toFixed(1).replace('.', ',')} bln`, emergencyTargetNote, emergencyMonths !== null && emergencyMonths >= 6 ? '#15803d' : emergencyMonths !== null ? '#b7791f' : '#64748b', '#f8fafc', 'primary')}
            {metricCard('Monthly Outcome', `${monthlySurplus >= 0 ? '+' : '-'}${fmt(monthlySurplus)}`, '', outcomeTone, outcomeBg, 'primary')}
          </div>

          <div className="financial-position-secondary-cards" style={{ display:'grid', gridTemplateColumns:'repeat(3, minmax(0, 1fr))', gap:12 }}>
            {metricCard('Smart Saving', `${activeGoalCount} goals`, 'Sedang aktif', '#1d4ed8', '#eff6ff')}
            {metricCard('Saving Rate', pct(savingRate), '', savingRate >= 20 ? '#15803d' : '#1d4ed8', '#f8fafc')}
            {metricCard('Debt Payment', fmt(totalDebtPayment), '', '#b7791f', '#fffbeb')}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1100px) {
          .financial-position-primary-cards { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 980px) {
          .financial-position-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 720px) {
          .financial-position-hero { padding: 13px !important; border-radius: 18px !important; }
          .financial-position-primary-cards,
          .financial-position-secondary-cards { grid-template-columns: 1fr 1fr !important; gap: 9px !important; }
        }
        @media (max-width: 420px) {
          .financial-position-primary-cards,
          .financial-position-secondary-cards { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
})

function ProgressBar({ value, color = '#1a5c42' }: { value: number; color?: string }) {
  return (
    <div style={{ height:'5px', background:'#f3f4f6', borderRadius:'999px', overflow:'hidden' }}>
      <div style={{ height:'100%', width:`${Math.min(100, Math.max(0, value))}%`, background:color, borderRadius:'999px', transition:'width .3s' }} />
      <style>{`
        @media (max-width: 760px) {
          .dash-summary-grid {
            grid-template-columns: 1fr 1fr !important;
          }
          .dash-summary-grid > div {
            padding: 9px 11px !important;
          }
          .dash-summary-grid > div:nth-child(2n) {
            border-right: none !important;
          }
          .dash-summary-grid > div:nth-child(-n+2) {
            border-bottom: 1px solid #e7ebf0 !important;
          }
        }
      `}</style>
    </div>
  )
}


const QuickActionsSection = memo(function QuickActionsSection() {
  const actions = [
    { href:'/journal', icon:'transactions' as const, title:'Add Transaction', note:'Catat pemasukan atau pengeluaran' },
    { href:'/goals', icon:'goals' as const, title:'Update Goal', note:'Perbarui progres target keluarga' },
    { href:'/advisor', icon:'advisor' as const, title:'Financial Checkup', note:'Lihat diagnosis dan saran FiNK' },
  ]
  return (
    <div className="overview-quick-actions" style={{ display:'grid', gridTemplateColumns:'repeat(3, minmax(0, 1fr))', gap:12, marginBottom:14 }}>
      {actions.map(a => (
        <Link key={a.href} href={a.href} style={{ textDecoration:'none', color:'inherit' }}>
          <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:18, padding:'14px 15px', display:'flex', gap:12, alignItems:'center', minHeight:78, boxShadow:'0 8px 22px rgba(15,23,42,.045)' }}>
            <div style={{ width:38, height:38, borderRadius:14, background:'#f0fdf4', color:'#1a5c42', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><AppIcon name={a.icon} size={18} /></div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:900, color:'#0f172a' }}>{a.title}</div>
              <div style={{ fontSize:11.5, color:'#64748b', marginTop:3, lineHeight:1.35 }}>{a.note}</div>
            </div>
          </div>
        </Link>
      ))}
      <style>{`
        @media (max-width: 760px) {
          .overview-quick-actions { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
})

const InsightPanel = memo(function InsightPanel({ insight, savingRate, expenseRate, emergencyMonths, monthlySurplus }: { insight: string; savingRate: number; expenseRate: number; emergencyMonths: number | null; monthlySurplus: number }) {
  const alerts: { text: string; tone: 'good' | 'warn' | 'danger' }[] = []
  if (monthlySurplus < 0) alerts.push({ text:'Cash flow bulan ini negatif. Cek kategori terbesar sebelum menambah alokasi baru.', tone:'danger' })
  if (expenseRate > 80) alerts.push({ text:'Expense rate melewati 80% pemasukan. Ruang napas keuangan mulai sempit.', tone:'warn' })
  if (savingRate >= 20) alerts.push({ text:'Saving rate sudah sehat. Pertahankan pola alokasi ini.', tone:'good' })
  else if (savingRate > 0) alerts.push({ text:'Saving rate masih bisa dinaikkan bertahap menuju 20%.', tone:'warn' })
  if (emergencyMonths !== null) {
    if (emergencyMonths >= 6) alerts.push({ text:'Dana darurat sudah kuat untuk kebutuhan dasar beberapa bulan.', tone:'good' })
    else if (emergencyMonths < 3) alerts.push({ text:'Dana darurat masih perlu diprioritaskan hingga minimal 3 bulan.', tone:'warn' })
  }
  const visibleAlerts = alerts.slice(0, 3)

  return (
    <Card style={{ marginBottom:'14px', borderRadius:18 }}>
      <div style={{ padding:'16px', display:'grid', gridTemplateColumns:'minmax(0, 1.15fr) minmax(260px, .85fr)', gap:14, alignItems:'stretch' }} className="overview-insight-grid">
        <div style={{ display:'flex', alignItems:'flex-start', gap:'12px' }}>
          <div style={{ width:'38px', height:'38px', borderRadius:'13px', background:'#e8f5ef', color:'#1a5c42', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><AppIcon name="insight" size={18} /></div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'13px', fontWeight:900, color:'#111827', marginBottom:'4px' }}>This Month Insight</div>
            <div style={{ fontSize:'12.5px', color:'#4b5563', lineHeight:1.6 }}>{insight}</div>
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {visibleAlerts.length === 0 ? (
            <div style={{ fontSize:12, color:'#94a3b8' }}>FiNK akan menampilkan catatan penting setelah data bulan ini lebih lengkap.</div>
          ) : visibleAlerts.map((a, idx) => {
            const color = a.tone === 'good' ? '#15803d' : a.tone === 'danger' ? '#b91c1c' : '#b7791f'
            const bg = a.tone === 'good' ? '#f0fdf4' : a.tone === 'danger' ? '#fef2f2' : '#fffbeb'
            return <div key={idx} style={{ border:`1px solid ${color}22`, background:bg, borderRadius:12, padding:'9px 11px', fontSize:11.5, color, lineHeight:1.4, fontWeight:700 }}>{a.text}</div>
          })}
        </div>
      </div>
      <style>{`
        @media (max-width: 820px) { .overview-insight-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </Card>
  )
})


function DashboardPremiumLock() {
  return (
    <PremiumLockCard
      title="Dashboard analytics hanya untuk Premium"
      subtitle="Upgrade untuk membuka analytics, monthly comparison, financial position lanjutan, trend analysis, dan insight lanjutan FiNK."
      actionLabel="Upgrade Premium"
      href="/upgrade"
      items={[
        'Monthly comparison',
        'Financial analytics',
        'Trend analysis',
        'Goal priority dashboard',
      ]}
      style={{ marginTop: 14 }}
    />
  )
}

const PriorityGoalsList = memo(function PriorityGoalsList({ goals }: { goals: SavingsGoal[] }) {
  if (goals.length === 0) return <div style={{ fontSize:'12px', color:'#9ca3af' }}>Belum ada target tabungan aktif.</div>
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {goals.map(g => {
        const p = g.target > 0 ? Math.min(100, (g.current / g.target) * 100) : 0
        const remaining = Math.max(0, (g.target || 0) - (g.current || 0))
        const isFocus = Boolean(g.focus)
        return (
          <div key={g.id} style={{ border:'1px solid #e2e8f0', borderRadius:14, padding:'11px 12px', background:isFocus ? '#f0fdf4' : '#fff' }}>
            <div style={{ display:'flex', justifyContent:'space-between', gap:'10px', alignItems:'flex-start', marginBottom:7 }}>
              <div style={{ minWidth:0 }}>
                <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
                  <span style={{ fontSize:'12.5px', fontWeight:900, color:'#111827' }}>{g.name}</span>
                  {isFocus && <span style={{ fontSize:9.5, color:'#15803d', background:'#dcfce7', border:'1px solid #bbf7d0', borderRadius:999, padding:'2px 6px', fontWeight:900 }}>Focus</span>}
                </div>
                <div style={{ fontSize:10.5, color:'#94a3b8', marginTop:3 }}>Sisa {fmt(remaining)} · target {fmt(g.target || 0)}</div>
              </div>
              <div style={{ fontSize:'12px', color:'#1d4ed8', fontFamily:'var(--font-mono), monospace', fontWeight:900 }}>{pct(p)}</div>
            </div>
            <ProgressBar value={p} color={isFocus ? '#15803d' : '#1d4ed8'} />
            <div style={{ display:'flex', justifyContent:'space-between', gap:10, marginTop:7, fontSize:10.5, color:'#64748b' }}>
              <span>Terkumpul {fmt(g.current || 0)}</span>
              <span>Bulanan {fmt(g.monthly || 0)}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
})


function getInsight(totalIncome: number, totalExpense: number, totalSaving: number, rawSisa: number) {
  if (totalIncome <= 0) return 'Mulai isi pemasukan bulan ini agar FiNK dapat membaca kondisi keuangan Anda dengan lebih akurat.'
  const expenseRate = totalExpense / totalIncome
  const savingRate = totalSaving / totalIncome
  if (rawSisa < 0) return 'Pengeluaran dan alokasi tabungan sudah melebihi pemasukan. Prioritaskan evaluasi kategori terbesar bulan ini.'
  if (savingRate >= 0.2 && expenseRate <= 0.7) return 'Kondisi bulan ini sehat. Tabungan sudah kuat dan pengeluaran masih terkendali.'
  if (expenseRate > 0.8) return 'Pengeluaran sudah tinggi dibanding pemasukan. Cek kategori terbesar sebelum menambah transaksi baru.'
  if (savingRate < 0.1) return 'Masih ada ruang untuk memperkuat tabungan. Pertimbangkan menaikkan alokasi saving secara bertahap.'
  return 'Arus kas bulan ini cukup stabil. Lanjutkan pencatatan harian agar insight semakin akurat.'
}


type DailyPoint = {
  day: number
  income: number
  expense: number
  saving: number
  balance: number
}

function getTransactionDay(t: Transaction, days: number) {
  const raw = (t as any).date ?? (t as any).tanggal ?? (t as any).day
  if (raw === null || raw === undefined || raw === '') return null

  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.max(1, Math.min(days, Math.trunc(raw)))
  }

  const str = String(raw).trim()

  // Numeric day saved as string, e.g. "1" or "01"
  if (/^\d{1,2}$/.test(str)) {
    const day = Number(str)
    return Number.isFinite(day) ? Math.max(1, Math.min(days, day)) : null
  }

  // Date string without timezone conversion, e.g. "2026-06-01" or "2026-06-01T..."
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) {
    const day = Number(isoMatch[3])
    return Number.isFinite(day) ? Math.max(1, Math.min(days, day)) : null
  }

  // Indonesian/simple date, e.g. "01/06/2026" or "1-6-2026"
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/)
  if (dmyMatch) {
    const day = Number(dmyMatch[1])
    return Number.isFinite(day) ? Math.max(1, Math.min(days, day)) : null
  }

  return null
}

function buildDailyProgressData({
  tx,
  income,
  saving,
  debt,
  curDay,
  daysInMonth,
  currentBalance,
}: {
  tx: Transaction[]
  income: IncomeCategory[]
  saving: SavingRow[]
  debt: DebtRow[]
  curDay: number
  daysInMonth: number
  currentBalance: number
}): DailyPoint[] {
  const days = Math.max(1, daysInMonth || 30)
  const visibleDay = Math.max(1, Math.min(curDay || days, days))
  const byDay = Array.from({ length: days + 1 }, () => ({ income:0, expense:0, saving:0 }))
  const incomeTargetLabels = targetedIncomeLabels(income)

  for (const t of tx || []) {
    if ((t as any).debt && !(t as any).settled) continue

    const day = getTransactionDay(t, days)
    if (!day) continue

    const amount = Number(t.amt || 0)
    if (isTargetedIncomeTransaction(t, incomeTargetLabels)) byDay[day].income += amount
    if (t.type === 'out') byDay[day].expense += amount
    if (t.type === 'save') byDay[day].saving += amount
  }

  const totalMovement = Array.from({ length: visibleDay }, (_, i) => i + 1)
    .reduce((s, day) => s + byDay[day].income - byDay[day].expense - byDay[day].saving, 0)
  let balance = Math.max(0, Number(currentBalance || 0) - totalMovement)

  const points: DailyPoint[] = []
  for (let day = 1; day <= days; day++) {
    if (day <= visibleDay) {
      balance += byDay[day].income - byDay[day].expense - byDay[day].saving
      points.push({ day, income:byDay[day].income, expense:byDay[day].expense, saving:byDay[day].saving, balance:Math.max(0, balance) })
    } else {
      // light projection for future days: keep trend visible but faded.
      const avgOut = visibleDay > 0
        ? Array.from({ length: visibleDay }, (_, i) => i + 1).reduce((s,d)=>s+byDay[d].expense+byDay[d].saving,0) / visibleDay
        : 0
      balance = Math.max(0, balance - avgOut * .45)
      points.push({ day, income:0, expense:0, saving:0, balance })
    }
  }
  return points
}

function linePath(points: { x:number; y:number }[]) {
  if (!points.length) return ''
  return points.map((p,i)=>`${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ')
}

const DailyProgressCard = memo(function DailyProgressCard({
  tx,
  income,
  saving,
  debt,
  curDay,
  daysInMonth,
  currentBalance,
  monthLabel,
}: {
  tx: Transaction[]
  income: IncomeCategory[]
  saving: SavingRow[]
  debt: DebtRow[]
  curDay: number
  daysInMonth: number
  currentBalance: number
  monthLabel: string
}) {
  const [mode, setMode] = useState<'balance'|'cashflow'>('balance')
  const [hoveredDaily, setHoveredDaily] = useState<{
    day:number
    income:number
    expense:number
    saving:number
    balance:number
    previousBalance:number
    dailyNet:number
    x:number
    y:number
  } | null>(null)
  const data = useMemo(() => buildDailyProgressData({ tx, income, saving, debt, curDay, daysInMonth, currentBalance }), [tx, income, saving, debt, curDay, daysInMonth, currentBalance])
  const visibleDay = Math.max(1, Math.min(curDay || daysInMonth, daysInMonth))
  const width = 980
  const height = 310
  const pad = { l:54, r:24, t:24, b:32 }
  const plotW = width - pad.l - pad.r
  const plotH = height - pad.t - pad.b

  const totalIncome = data.slice(0, visibleDay).reduce((s,d)=>s+d.income,0)
  const totalExpense = data.slice(0, visibleDay).reduce((s,d)=>s+d.expense,0)
  const totalSaving = data.slice(0, visibleDay).reduce((s,d)=>s+d.saving,0)
  const netMovement = totalIncome - totalExpense - totalSaving

  const maxBalance = Math.max(1, ...data.map(d => d.balance))
  const maxFlowRaw = Math.max(1, ...data.map(d => Math.max(d.income, d.expense, d.saving)))
  // Compress very large one-day spikes visually without changing the data shown in labels.
  const flowScale = (v:number) => Math.sqrt(Math.max(0, v))
  const maxFlowScaled = Math.max(1, flowScale(maxFlowRaw))
  const maxValue = mode === 'balance' ? maxBalance : maxFlowRaw
  const x = (day:number) => pad.l + ((day - 1) / Math.max(1, daysInMonth - 1)) * plotW
  const yBalance = (value:number) => pad.t + (1 - value / Math.max(1, maxBalance * 1.15)) * plotH
  const yAxisValue = (value:number) => pad.t + (1 - value / Math.max(1, maxValue * 1.15)) * plotH

  const centerY = pad.t + plotH * .50
  const topAvailable = centerY - pad.t - 10
  const bottomAvailable = height - pad.b - centerY - 12
  const flowUp = (value:number) => (flowScale(value) / maxFlowScaled) * topAvailable
  const flowDown = (value:number) => (flowScale(value) / maxFlowScaled) * bottomAvailable

  const past = data.filter(d => d.day <= visibleDay)
  const future = data.filter(d => d.day >= visibleDay)
  const balancePath = linePath(past.map(d => ({ x:x(d.day), y:yBalance(d.balance) })))
  const futurePath = linePath(future.map(d => ({ x:x(d.day), y:yBalance(d.balance) })))
  const areaPath = past.length
    ? `${balancePath} L ${x(past[past.length - 1].day).toFixed(2)} ${(height-pad.b).toFixed(2)} L ${x(past[0].day).toFixed(2)} ${(height-pad.b).toFixed(2)} Z`
    : ''

  const ticks = [1, Math.max(1, Math.round(daysInMonth/3)), Math.max(1, Math.round(daysInMonth*2/3)), daysInMonth]
  const balanceStatus = netMovement >= 0
    ? 'Your money flow is still positive this month.'
    : 'Outflow is higher than income so far this month.'

  const showDailyTooltip = (e:any, item:DailyPoint) => {
    const rect = e.currentTarget.ownerSVGElement?.parentElement?.getBoundingClientRect()
    if (!rect) return
    const previousBalance = data.find(d => d.day === item.day - 1)?.balance ?? item.balance - item.income + item.expense + item.saving
    const dailyNet = item.income - item.expense - item.saving
    setHoveredDaily({
      day:item.day,
      income:item.income,
      expense:item.expense,
      saving:item.saving,
      balance:item.balance,
      previousBalance,
      dailyNet,
      x:e.clientX - rect.left,
      y:e.clientY - rect.top,
    })
  }

  return (
    <Card style={{ borderRadius:20, overflow:'hidden', minHeight:520, height:520, display:'flex', flexDirection:'column' }}>
      <div style={{ padding:'15px 16px 10px', display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, borderBottom:'1px solid #eef2f7', flexWrap:'wrap' }}>
        <div>
          <div style={{ fontSize:16, fontWeight:950, color:'#111827', letterSpacing:'-.25px' }}>Daily Progress</div>
          <div style={{ fontSize:11.5, color:'#64748b', marginTop:3 }}>
            {mode === 'balance' ? 'Pantau kondisi saldo berjalan bulan ini' : 'Pantau aktivitas income, expenses, saving, dan dampaknya ke balance'}
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', justifyContent:'flex-end' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'7px 10px', border:'1px solid #dbe3ef', borderRadius:12, background:'#fff', color:'#334155', fontSize:12, fontWeight:850 }}>
            <AppIcon name="calendar" size={14} /> {monthLabel}
          </div>

          <div style={{ display:'flex', padding:3, border:'1px solid #dbe3ef', borderRadius:13, background:'#f8fafc' }}>
            {[
              ['balance','Balance'],
              ['cashflow','Cashflow'],
            ].map(([key,label]) => (
              <button
                key={key}
                onClick={() => setMode(key as 'balance'|'cashflow')}
                style={{
                  border:'none',
                  borderRadius:10,
                  padding:'7px 12px',
                  background:mode === key ? '#1a5c42' : 'transparent',
                  color:mode === key ? '#fff' : '#334155',
                  fontSize:12,
                  fontWeight:850,
                  cursor:'pointer',
                  boxShadow:mode === key ? '0 8px 18px rgba(26,92,66,.18)' : 'none',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        className="daily-progress-summary"
        style={{
          height:86,
          minHeight:86,
          maxHeight:86,
          overflow:'hidden',
          padding:'13px 16px 2px',
          display:'grid',
          gridTemplateColumns:'repeat(4, minmax(0, 1fr))',
          gap:12,
          alignItems:'end'
        }}
      >
        {mode === 'balance' ? (
          <>
            <div style={{ gridColumn:'span 3', minWidth:0 }}>
              <div style={{ fontSize:11, color:'#64748b', fontWeight:750 }}>Current Balance</div>
              <div style={{ marginTop:3, fontSize:22, fontWeight:950, color:currentBalance >= 0 ? '#15803d' : '#b91c1c', fontFamily:'var(--font-mono), monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {currentBalance >= 0 ? fmt(currentBalance) : `- ${fmt(currentBalance)}`}
              </div>
              <div style={{ marginTop:4, fontSize:11, color:'#64748b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {balanceStatus}
              </div>
            </div>
            <div style={{ textAlign:'right', minWidth:0 }}>
              <div style={{ fontSize:11, color:'#64748b', fontWeight:750 }}>Net Movement</div>
              <div style={{ marginTop:3, fontSize:15, fontWeight:900, color:netMovement >= 0 ? '#15803d' : '#b91c1c', fontFamily:'var(--font-mono), monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {netMovement >= 0 ? '+' : '-'}{fmt(netMovement)}
              </div>
            </div>
          </>
        ) : (
          <>
            <div style={{ minWidth:0 }}><div style={{ fontSize:11, color:'#64748b', fontWeight:750 }}>Income</div><div style={{ marginTop:3, fontSize:16, fontWeight:900, color:'#15803d', fontFamily:'var(--font-mono), monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{fmt(totalIncome)}</div></div>
            <div style={{ minWidth:0 }}><div style={{ fontSize:11, color:'#64748b', fontWeight:750 }}>Expenses</div><div style={{ marginTop:3, fontSize:16, fontWeight:900, color:'#b91c1c', fontFamily:'var(--font-mono), monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{fmt(totalExpense)}</div></div>
            <div style={{ minWidth:0 }}><div style={{ fontSize:11, color:'#64748b', fontWeight:750 }}>Saving</div><div style={{ marginTop:3, fontSize:16, fontWeight:900, color:'#1d4ed8', fontFamily:'var(--font-mono), monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{fmt(totalSaving)}</div></div>
            <div style={{ minWidth:0 }}><div style={{ fontSize:11, color:'#64748b', fontWeight:750 }}>Remaining</div><div style={{ marginTop:3, fontSize:16, fontWeight:900, color:netMovement >= 0 ? '#15803d' : '#b91c1c', fontFamily:'var(--font-mono), monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{netMovement >= 0 ? '+' : '-'}{fmt(netMovement)}</div></div>
          </>
        )}
      </div>

      <div style={{ padding:'0 8px 4px', height:310, minHeight:310, maxHeight:310, overflow:'hidden', position:'relative' }}>
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" style={{ width:'100%', height:300, display:'block', minHeight:300, maxHeight:300 }}>
          <defs>
            <linearGradient id="balanceAreaFiNK" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#15803d" stopOpacity=".20" />
              <stop offset="100%" stopColor="#15803d" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="cashflowBackdropFiNK" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#f0fdf4" stopOpacity=".65" />
              <stop offset="52%" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="100%" stopColor="#fef2f2" stopOpacity=".55" />
            </linearGradient>
          </defs>

          <rect x={pad.l} y={pad.t} width={plotW} height={plotH} rx="18" fill={mode === 'cashflow' ? 'url(#cashflowBackdropFiNK)' : 'transparent'} opacity={mode === 'cashflow' ? 1 : 0} />

          {(mode === 'balance' ? [0, .5, 1] : [-1, 0, 1]).map((tick, i) => {
            const yy = mode === 'balance'
              ? yAxisValue(maxValue * (tick as number))
              : tick === 0 ? centerY : tick > 0 ? pad.t + 12 : height - pad.b - 12
            return (
              <g key={i}>
                <line x1={pad.l} x2={width-pad.r} y1={yy} y2={yy} stroke={tick === 0 && mode === 'cashflow' ? '#dbe3ef' : '#edf1f5'} strokeWidth={tick === 0 && mode === 'cashflow' ? '1.4' : '1'} />
                {mode === 'balance' && <text x={pad.l-12} y={yy+4} textAnchor="end" fontSize="10" fill="#64748b">{fmtShort(maxValue * (tick as number))}</text>}
                {mode === 'cashflow' && tick === 1 && <text x={pad.l-12} y={yy+4} textAnchor="end" fontSize="10" fill="#15803d">Income</text>}
                {mode === 'cashflow' && tick === -1 && <text x={pad.l-12} y={yy+4} textAnchor="end" fontSize="10" fill="#b91c1c">Expense</text>}
              </g>
            )
          })}

          {ticks.map(day => (
            <text key={day} x={x(day)} y={height-9} textAnchor="middle" fontSize="10" fill="#64748b">{day}</text>
          ))}

          <line x1={x(visibleDay)} x2={x(visibleDay)} y1={pad.t} y2={height-pad.b} stroke="#94a3b8" strokeDasharray="4 4" strokeWidth="1" />
          {hoveredDaily && (
            <line
              x1={x(hoveredDaily.day)}
              x2={x(hoveredDaily.day)}
              y1={pad.t}
              y2={height-pad.b}
              stroke="#1a5c42"
              strokeDasharray="4 5"
              strokeWidth="1.4"
              opacity=".75"
              pointerEvents="none"
            />
          )}
          <g>
            <rect x={x(visibleDay)-22} y={pad.t+4} width="44" height="20" rx="10" fill="#1a5c42" />
            <text x={x(visibleDay)} y={pad.t+18} textAnchor="middle" fontSize="10" fontWeight="800" fill="#fff">Today</text>
          </g>

          <g>
            {data.map(d => {
              const bandW = Math.max(10, plotW / Math.max(1, daysInMonth))
              const cx = x(d.day)
              return (
                <rect
                  key={`daily-hover-band-${d.day}`}
                  x={cx - bandW / 2}
                  y={pad.t}
                  width={bandW}
                  height={plotH}
                  fill="transparent"
                  onMouseEnter={e => showDailyTooltip(e, d)}
                  onMouseMove={e => showDailyTooltip(e, d)}
                  onMouseLeave={() => setHoveredDaily(null)}
                  style={{ cursor:'default' }}
                />
              )
            })}
          </g>

          {mode === 'balance' ? (
            <>
              {areaPath && (
                <path d={areaPath} fill="url(#balanceAreaFiNK)">
                  <title>Balance trend</title>
                </path>
              )}
              <path d={balancePath} fill="none" stroke="#15803d" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke">
                <title>Balance trend</title>
              </path>
              <path d={futurePath} fill="none" stroke="#15803d" strokeWidth="2.3" strokeLinecap="round" strokeDasharray="6 7" opacity=".5" vectorEffect="non-scaling-stroke">
                <title>Projected balance</title>
              </path>
              {past.map(point => (
                <circle
                  key={`balance-hover-${point.day}`}
                  cx={x(point.day)}
                  cy={yBalance(point.balance)}
                  r="10"
                  fill="transparent"
                  onMouseEnter={e => showDailyTooltip(e, point)}
                  onMouseMove={e => showDailyTooltip(e, point)}
                  onMouseLeave={() => setHoveredDaily(null)}
                  style={{ cursor:'default' }}
                />
              ))}
              {past.length > 0 && (
                <circle
                  cx={x(past[past.length-1].day)}
                  cy={yBalance(past[past.length-1].balance)}
                  r="4"
                  fill="#15803d"
                  stroke="#fff"
                  strokeWidth="2"
                  onMouseEnter={e => showDailyTooltip(e, past[past.length-1])}
                  onMouseMove={e => showDailyTooltip(e, past[past.length-1])}
                  onMouseLeave={() => setHoveredDaily(null)}
                  style={{ cursor:'default' }}
                />
              )}
            </>
          ) : (
            <>
              {data.map(d => {
                const faded = d.day > visibleDay
                const barW = Math.max(5, Math.min(15, plotW / daysInMonth * .44))
                const xx = x(d.day)
                const incH = Math.max(d.income > 0 ? 6 : 0, flowUp(d.income))
                const expH = Math.max(d.expense > 0 ? 5 : 0, flowDown(d.expense))
                const savH = Math.max(d.saving > 0 ? 4 : 0, Math.min(32, flowUp(d.saving) * .45))
                return (
                  <g
                    key={d.day}
                    opacity={faded ? .20 : 1}
                    onMouseEnter={e => showDailyTooltip(e, d)}
                    onMouseMove={e => showDailyTooltip(e, d)}
                    onMouseLeave={() => setHoveredDaily(null)}
                    style={{ cursor:'default' }}
                  >
                    {d.income > 0 && (
                      <rect x={xx-barW/2} y={centerY-incH-3} width={barW} height={incH} rx="6" fill="#3fa56a">
                        <title>{`Day ${d.day}\nIncome: ${fmt(d.income)}`}</title>
                      </rect>
                    )}
                    {d.expense > 0 && (
                      <rect x={xx-barW/2} y={centerY+5} width={barW} height={expH} rx="6" fill="#df6b6f">
                        <title>{`Day ${d.day}\nExpenses: ${fmt(d.expense)}`}</title>
                      </rect>
                    )}
                    {d.saving > 0 && (
                      <>
                        <circle cx={xx} cy={centerY - incH - savH - 13} r="5.5" fill="#dbeafe">
                          <title>{`Day ${d.day}\nSaving: ${fmt(d.saving)}`}</title>
                        </circle>
                        <circle cx={xx} cy={centerY - incH - savH - 13} r="3.6" fill="#2563eb">
                          <title>{`Day ${d.day}\nSaving: ${fmt(d.saving)}`}</title>
                        </circle>
                      </>
                    )}
                  </g>
                )
              })}
              <path d={balancePath} fill="none" stroke="#1a5c42" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" opacity=".48" vectorEffect="non-scaling-stroke">
                <title>Balance overlay</title>
              </path>
              <path d={futurePath} fill="none" stroke="#1a5c42" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="5 7" opacity=".28" vectorEffect="non-scaling-stroke">
                <title>Projected balance overlay</title>
              </path>
            </>
          )}

          <g>
            {data.map(d => {
              const bandW = Math.max(10, plotW / Math.max(1, daysInMonth))
              const cx = x(d.day)
              return (
                <rect
                  key={`daily-hover-band-${d.day}`}
                  x={cx - bandW / 2}
                  y={pad.t}
                  width={bandW}
                  height={plotH}
                  fill="transparent"
                  onMouseEnter={e => showDailyTooltip(e, d)}
                  onMouseMove={e => showDailyTooltip(e, d)}
                  onMouseLeave={() => setHoveredDaily(null)}
                  style={{ cursor:'default' }}
                />
              )
            })}
          </g>
        </svg>
        {hoveredDaily && (
          <div
            style={{
              position:'absolute',
              left: Math.min(Math.max(hoveredDaily.x + 14, 12), 820),
              top: Math.max(hoveredDaily.y - 118, 10),
              transform: hoveredDaily.x > 700 ? 'translateX(-100%)' : 'none',
              background:'#111827',
              color:'#fff',
              borderRadius:12,
              padding:'10px 12px',
              boxShadow:'0 18px 42px rgba(15,23,42,.24)',
              fontSize:11.5,
              lineHeight:1.35,
              pointerEvents:'none',
              zIndex:20,
              minWidth:178,
            }}
          >
            <div style={{ fontWeight:900, marginBottom:6 }}>Day {hoveredDaily.day}</div>
            <div style={{ display:'flex', justifyContent:'space-between', gap:12 }}><span style={{ color:'#cbd5e1' }}>Income</span><span style={{ fontWeight:850, fontFamily:'var(--font-mono), monospace' }}>{fmt(hoveredDaily.income)}</span></div>
            <div style={{ display:'flex', justifyContent:'space-between', gap:12, marginTop:3 }}><span style={{ color:'#cbd5e1' }}>Expenses</span><span style={{ fontWeight:850, fontFamily:'var(--font-mono), monospace' }}>{fmt(hoveredDaily.expense)}</span></div>
            <div style={{ display:'flex', justifyContent:'space-between', gap:12, marginTop:3 }}><span style={{ color:'#cbd5e1' }}>Saving</span><span style={{ fontWeight:850, fontFamily:'var(--font-mono), monospace' }}>{fmt(hoveredDaily.saving)}</span></div>
            <div style={{ height:1, background:'rgba(255,255,255,.14)', margin:'8px 0' }} />
            <div style={{ display:'flex', justifyContent:'space-between', gap:12 }}><span style={{ color:'#cbd5e1' }}>Daily Change</span><span style={{ fontWeight:850, fontFamily:'var(--font-mono), monospace', color:hoveredDaily.dailyNet >= 0 ? '#bbf7d0' : '#fecaca' }}>{hoveredDaily.dailyNet >= 0 ? '+' : '-'}{fmt(hoveredDaily.dailyNet)}</span></div>
            <div style={{ display:'flex', justifyContent:'space-between', gap:12, marginTop:3 }}><span style={{ color:'#cbd5e1' }}>Balance</span><span style={{ fontWeight:850, fontFamily:'var(--font-mono), monospace' }}>{fmt(hoveredDaily.balance)}</span></div>
          </div>
        )}
      </div>

      <div style={{ borderTop:'1px solid #eef2f7', padding:'11px 16px', minHeight:48, height:48, maxHeight:48, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, flexWrap:'nowrap', fontSize:11.5, color:'#64748b' }}>
        <span>{mode === 'balance' ? 'Balance menunjukkan dampak aktivitas harian terhadap kondisi uang.' : 'Cashflow memakai skala visual yang dikompresi agar spike besar tetap terbaca tanpa menutupi transaksi kecil.'}</span>
        <Link href="/journal" style={{ color:'#1a5c42', fontWeight:850, textDecoration:'none' }}>Review Journal →</Link>
      </div>

      <style>{`
        @media (max-width: 720px) {
          .daily-progress-summary {
            grid-template-columns: 1fr 1fr !important;
            height: 116px !important;
            min-height: 116px !important;
            max-height: 116px !important;
          }
          .daily-progress-summary > div:first-child {
            grid-column: span 2 !important;
          }
        }
        @media (max-width: 440px) {
          .daily-progress-summary {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </Card>
  )
})


const TotalAssetsTrendChart = memo(function TotalAssetsTrendChart({ data, currentTotalAssets }: { data: MonthlyTrendItem[]; currentTotalAssets: number }) {
  const [hoveredAsset, setHoveredAsset] = useState<{ label:string; assets:number; x:number; y:number } | null>(null)
  const trend = useMemo(() => {
    const baseData = data.slice(-6)
    if (!baseData.length) {
      return [{ label:'This month', assets:currentTotalAssets }]
    }
    const totalCashflow = baseData.reduce((s,d)=>s+Number(d.cashflow || 0),0)
    let running = Math.max(0, currentTotalAssets - totalCashflow)
    return baseData.map((d, idx) => {
      running = Math.max(0, running + Number(d.cashflow || 0))
      const isLast = idx === baseData.length - 1
      return { label:d.label, assets:isLast ? currentTotalAssets : running }
    })
  }, [data, currentTotalAssets])

  const width = 980
  const height = 190
  const pad = { l:18, r:18, t:10, b:34 }
  const rawMax = Math.max(1, ...trend.map(d=>d.assets))
  const rawMin = Math.min(...trend.map(d=>d.assets))
  const spread = Math.max(1, rawMax - rawMin)
  // Zoom lebih agresif agar growth asset tidak terlihat terlalu rendah/flat.
  const maxVal = rawMax + Math.max(spread * .06, rawMax * .006, 1)
  const minVal = Math.max(0, rawMin - Math.max(spread * .08, rawMin * .004, 1))
  const plotW = width - pad.l - pad.r
  const plotH = height - pad.t - pad.b
  const x = (i:number) => pad.l + (i / Math.max(1, trend.length - 1)) * plotW
  const y = (v:number) => pad.t + (1 - (v - minVal) / Math.max(1, maxVal - minVal)) * plotH
  const path = linePath(trend.map((d,i)=>({ x:x(i), y:y(d.assets) })))
  const area = trend.length ? `${path} L ${x(trend.length-1).toFixed(2)} ${height-pad.b} L ${x(0).toFixed(2)} ${height-pad.b} Z` : ''
  const first = trend[0]?.assets || 0
  const growth = first > 0 ? ((currentTotalAssets - first) / first) * 100 : null

  const showAssetTooltip = (e:any, item:{ label:string; assets:number }, index:number) => {
    const rect = e.currentTarget.ownerSVGElement?.parentElement?.getBoundingClientRect()
    if (!rect) return
    const previous = index > 0 ? trend[index - 1]?.assets : null
    const change = previous !== null && previous !== undefined ? item.assets - previous : null
    const changePct = previous && previous > 0 && change !== null ? (change / previous) * 100 : null
    setHoveredAsset({
      label:item.label,
      assets:item.assets,
      change,
      changePct,
      x:e.clientX - rect.left,
      y:e.clientY - rect.top,
    })
  }

  return (
    <Card style={{ borderRadius:20, overflow:'hidden' }}>
      <div style={{ padding:'14px 16px 0', display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
        <div>
          <div style={{ fontSize:16, fontWeight:950, color:'#111827' }}>Total Assets Trend</div>
          <div style={{ fontSize:11.5, color:'#64748b', marginTop:3 }}>Estimasi total cash + saving dalam 6 bulan terakhir</div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:11, color:'#64748b', fontWeight:750 }}>Total Assets</div>
          <div style={{ marginTop:3, fontSize:18, fontWeight:950, color:'#15803d', fontFamily:'var(--font-mono), monospace' }}>{fmt(currentTotalAssets)}</div>
          {growth !== null && <div style={{ marginTop:4, fontSize:10.5, color:growth >= 0 ? '#15803d' : '#b91c1c', fontWeight:850 }}>{growth >= 0 ? '↑' : '↓'} {Math.abs(Math.round(growth))}% vs awal periode</div>}
        </div>
      </div>
      <div style={{ padding:'0 10px 6px', position:'relative' }}>
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" style={{ width:'100%', height:175, display:'block' }}>
          <defs>
            <linearGradient id="assetAreaFiNK" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#15803d" stopOpacity=".20" />
              <stop offset="100%" stopColor="#15803d" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0,.5,1].map((r,i)=>{
            const val = minVal + (maxVal-minVal)*r
            const yy = y(val)
            return <line key={i} x1={pad.l} x2={width-pad.r} y1={yy} y2={yy} stroke="#edf1f5" strokeWidth="1" />
          })}
          {area && (
            <path d={area} fill="url(#assetAreaFiNK)">
              <title>Total Assets Trend</title>
            </path>
          )}
          <path d={path} fill="none" stroke="#15803d" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke">
            <title>Total Assets Trend</title>
          </path>
          {trend.map((d,i)=>(
            <g
              key={d.label}
              onMouseEnter={e => showAssetTooltip(e, d, i)}
              onMouseMove={e => showAssetTooltip(e, d, i)}
              onMouseLeave={() => setHoveredAsset(null)}
              style={{ cursor:'default' }}
            >
              <circle cx={x(i)} cy={y(d.assets)} r="8" fill="transparent" />
              <circle cx={x(i)} cy={y(d.assets)} r="4" fill="#15803d" stroke="#fff" strokeWidth="2" />
              <text x={x(i)} y={height-18} textAnchor="middle" fontSize="10" fill="#64748b" fontWeight="700">{d.label}</text>
              <text x={x(i)} y={height-5} textAnchor="middle" fontSize="9.5" fill="#94a3b8">{fmtShort(d.assets).replace('Rp ','')}</text>
            </g>
          ))}

          {hoveredAsset && (
            <line
              x1={x(trend.findIndex(d => d.label === hoveredAsset.label))}
              x2={x(trend.findIndex(d => d.label === hoveredAsset.label))}
              y1={pad.t}
              y2={height-pad.b}
              stroke="#1a5c42"
              strokeDasharray="4 5"
              strokeWidth="1.4"
              opacity=".75"
              pointerEvents="none"
            />
          )}

          <g>
            {trend.map((d, i) => {
              const bandW = Math.max(24, plotW / Math.max(1, trend.length))
              const cx = x(i)
              return (
                <rect
                  key={`asset-hover-band-${d.label}`}
                  x={cx - bandW / 2}
                  y={pad.t}
                  width={bandW}
                  height={plotH}
                  fill="transparent"
                  onMouseEnter={e => showAssetTooltip(e, d, i)}
                  onMouseMove={e => showAssetTooltip(e, d, i)}
                  onMouseLeave={() => setHoveredAsset(null)}
                  style={{ cursor:'default' }}
                />
              )
            })}
          </g>
        </svg>
        {hoveredAsset && (
          <div
            style={{
              position:'absolute',
              left: Math.min(Math.max(hoveredAsset.x + 14, 12), 820),
              top: Math.max(hoveredAsset.y - 70, 10),
              transform: hoveredAsset.x > 700 ? 'translateX(-100%)' : 'none',
              background:'#111827',
              color:'#fff',
              borderRadius:12,
              padding:'10px 12px',
              boxShadow:'0 18px 42px rgba(15,23,42,.24)',
              fontSize:11.5,
              lineHeight:1.35,
              pointerEvents:'none',
              zIndex:20,
              minWidth:170,
            }}
          >
            <div style={{ fontWeight:900, marginBottom:6 }}>{hoveredAsset.label}</div>
            <div style={{ display:'flex', justifyContent:'space-between', gap:12 }}>
              <span style={{ color:'#cbd5e1' }}>Total Assets</span>
              <span style={{ fontWeight:850, fontFamily:'var(--font-mono), monospace' }}>{fmt(hoveredAsset.assets)}</span>
            </div>
            <div style={{ height:1, background:'rgba(255,255,255,.14)', margin:'8px 0' }} />
            <div style={{ display:'flex', justifyContent:'space-between', gap:12 }}>
              <span style={{ color:'#cbd5e1' }}>MoM Change</span>
              <span style={{
                fontWeight:850,
                fontFamily:'var(--font-mono), monospace',
                color:hoveredAsset.change === null ? '#cbd5e1' : hoveredAsset.change >= 0 ? '#bbf7d0' : '#fecaca'
              }}>
                {hoveredAsset.change === null ? '-' : `${hoveredAsset.change >= 0 ? '+' : '-'}${fmt(hoveredAsset.change)}`}
              </span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', gap:12, marginTop:3 }}>
              <span style={{ color:'#cbd5e1' }}>Change %</span>
              <span style={{
                fontWeight:850,
                fontFamily:'var(--font-mono), monospace',
                color:hoveredAsset.changePct === null ? '#cbd5e1' : hoveredAsset.changePct >= 0 ? '#bbf7d0' : '#fecaca'
              }}>
                {hoveredAsset.changePct === null ? '-' : `${hoveredAsset.changePct >= 0 ? '+' : '-'}${Math.abs(hoveredAsset.changePct).toFixed(1)}%`}
              </span>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
})

type OverviewGoalItem = {
  id: string
  name: string
  current: number
  target: number
  monthly: number
  progress: number
  focus?: boolean
  type?: string
}

function goalTypeLabel(type?: string) {
  if (type === 'darurat' || type === 'darurat_lanjutan') return 'Dana Darurat'
  if (type === 'pendidikan') return 'Pendidikan'
  if (type === 'pensiun') return 'Pensiun'
  if (type === 'investasi') return 'Investasi'
  return ''
}

function goalTargetAmount(goal: SavingsGoal) {
  const targetFromCoverage = goal.expense && goal.coverageTarget
    ? Number(goal.expense || 0) * Number(goal.coverageTarget || 0)
    : 0
  return Math.max(Number(goal.target || 0), targetFromCoverage)
}

function goalProgressColor(progress: number) {
  if (progress >= 75) return '#15803d'
  if (progress >= 30) return '#d99a24'
  return '#dc6b70'
}

function goalEtaLabel(goal: OverviewGoalItem) {
  const remaining = Math.max(0, goal.target - goal.current)
  if (goal.target <= 0) return 'Target belum diatur'
  if (remaining <= 0) return 'Selesai'
  if (goal.monthly <= 0) return 'Atur alokasi bulanan'
  const months = Math.ceil(remaining / goal.monthly)
  if (months <= 1) return '±1 bulan lagi'
  if (months < 12) return `±${months} bulan lagi`
  const years = months / 12
  return `±${years.toFixed(years >= 2 ? 0 : 1).replace('.', ',')} tahun lagi`
}

function buildOverviewGoalItems(goals: SavingsGoal[]): OverviewGoalItem[] {
  const active = (goals || []).filter(g => g.status === 'active')
  const groupedTypes = new Set(['darurat', 'darurat_lanjutan', 'pendidikan', 'pensiun', 'investasi'])
  const groups = new Map<string, OverviewGoalItem>()
  const individual: OverviewGoalItem[] = []

  for (const goal of active) {
    const type = String(goal.type || '')
    const current = Number(goal.current || 0)
    const target = goalTargetAmount(goal)
    const monthly = Number(goal.monthly || 0)

    if (groupedTypes.has(type)) {
      const key = type === 'darurat' || type === 'darurat_lanjutan' ? 'emergency' : type
      const existing = groups.get(key)
      if (existing) {
        existing.current += current
        existing.target += target
        existing.monthly += monthly
        existing.focus = Boolean(existing.focus || goal.focus)
        existing.progress = existing.target > 0 ? (existing.current / existing.target) * 100 : 0
      } else {
        groups.set(key, {
          id: `group-${key}`,
          name: goalTypeLabel(type) || goal.name || 'Goal',
          current,
          target,
          monthly,
          progress: target > 0 ? (current / target) * 100 : 0,
          focus: Boolean(goal.focus),
          type:key,
        })
      }
      continue
    }

    individual.push({
      id: goal.id,
      name: goal.name || goalTypeLabel(type) || 'Goal',
      current,
      target,
      monthly,
      progress: target > 0 ? (current / target) * 100 : 0,
      focus: Boolean(goal.focus),
      type,
    })
  }

  return [...groups.values(), ...individual]
    .filter(g => g.target > 0 || g.current > 0 || g.monthly > 0)
    .sort((a, b) => Number(Boolean(b.focus)) - Number(Boolean(a.focus)) || (b.progress - a.progress))
}

const GoalsProgressOverview = memo(function GoalsProgressOverview({ goals }: { goals: SavingsGoal[] }) {
  const list = buildOverviewGoalItems(goals).slice(0, 4)

  return (
    <Card style={{ borderRadius:20 }}>
      <CardHead title="Progress Goals" right={<Link href="/goals" style={{ fontSize:11, color:'#1a5c42', fontWeight:850, textDecoration:'none' }}>Lihat semua goal →</Link>} />
      <div style={{ padding:'4px 16px 16px', display:'flex', flexDirection:'column', gap:12 }}>
        {list.length === 0 ? (
          <div style={{ fontSize:12, color:'#94a3b8', padding:'10px 0' }}>Belum ada goal aktif.</div>
        ) : list.map(goal => {
          const progress = Math.max(0, Math.min(100, goal.progress || 0))
          const color = goalProgressColor(progress)

          return (
            <div key={goal.id} style={{ border:'1px solid #eef2f7', borderRadius:14, padding:'12px 13px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', gap:12, marginBottom:9, alignItems:'flex-start' }}>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:12.5, fontWeight:900, color:'#111827' }}>{goal.name}</div>
                </div>
                <div style={{ fontSize:12, fontWeight:950, color, fontFamily:'var(--font-mono), monospace', whiteSpace:'nowrap' }}>{pct(progress)}</div>
              </div>

              <ProgressBar value={progress} color={color} />

              <div style={{ marginTop:7, display:'flex', justifyContent:'space-between', gap:10, flexWrap:'wrap', fontSize:10.5, color:'#64748b', fontFamily:'var(--font-mono), monospace' }}>
                <span>{fmt(goal.current)} / {fmt(goal.target)}</span>
                {goal.monthly > 0 && <span>alokasi {fmt(goal.monthly)}/bln</span>}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
})

const MonthlyReflectionSection = memo(function MonthlyReflectionSection({
  monthlySurplus,
  savingRate,
  expenseRate,
  topCategory,
}: {
  monthlySurplus: number
  savingRate: number
  expenseRate: number
  topCategory?: { label:string; actual:number; plan:number }
}) {
  const items = [
    {
      title: monthlySurplus >= 0 ? 'This month remained stable.' : 'This month needs attention.',
      note: monthlySurplus >= 0 ? 'Balance is still in a healthy position.' : 'Outflow is higher than available room.',
      icon:'↗',
      color: monthlySurplus >= 0 ? '#15803d' : '#b91c1c',
      bg: monthlySurplus >= 0 ? '#f0fdf4' : '#fef2f2',
    },
    {
      title: topCategory ? `Most spending came from ${topCategory.label}.` : 'No major spending yet.',
      note: topCategory ? 'Review this category if budget feels tight.' : 'Start recording transactions to build awareness.',
      icon:'☕',
      color:'#b7791f',
      bg:'#fffbeb',
    },
    {
      title: savingRate >= 15 ? 'Saving stayed consistent.' : 'Saving can be improved.',
      note: savingRate >= 15 ? 'Great job keeping the habit.' : 'Try setting a realistic saving allocation.',
      icon:'♙',
      color: savingRate >= 15 ? '#1d4ed8' : '#64748b',
      bg:'#eff6ff',
    },
  ]

  return (
    <Card style={{ borderRadius:20 }}>
      <CardHead title="Monthly Reflection" icon={<AppIcon name="advisor" size={16} />} />
      <div style={{ padding:'4px 16px 16px', display:'grid', gridTemplateColumns:'repeat(3, minmax(0,1fr))', gap:12 }} className="monthly-reflection-grid">
        {items.map((item, idx)=>(
          <div key={idx} style={{ border:'1px solid #eef2f7', borderRadius:16, padding:'13px 14px', background:'#fff', display:'flex', gap:12 }}>
            <div style={{ width:36, height:36, borderRadius:999, background:item.bg, color:item.color, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:950, flexShrink:0 }}>{item.icon}</div>
            <div>
              <div style={{ fontSize:12.5, fontWeight:850, color:'#111827', lineHeight:1.35 }}>{item.title}</div>
              <div style={{ marginTop:4, fontSize:11, color:'#64748b', lineHeight:1.45 }}>{item.note}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
})

export default function DashboardPage() {
  
  const [isMobile, setIsMobile] = useState(false)
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrendItem[]>([])

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 760)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

const { curMonth, curYear } = useMonthContext()

  useEffect(() => {
    let cancelled = false
    const cacheKey = `${OVERVIEW_TREND_CACHE_PREFIX}:${curYear}:${curMonth}:6`
    const cached = getCachedTrend(cacheKey)
    if (cached) setMonthlyTrend(cached)

    fetch(`/api/overview/trend?month=${curMonth}&year=${curYear}&count=6`, { cache: 'no-store' })
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(json => {
        if (cancelled) return
        const data = Array.isArray(json.data) ? json.data : []
        setMonthlyTrend(data)
        setCachedTrend(cacheKey, data)
      })
      .catch(() => {
        if (!cancelled && !cached) setMonthlyTrend([])
      })
    return () => { cancelled = true }
  }, [curMonth, curYear])

  const { tx, loading, computedBudget, computedIncome, computedSaving, computedDebt, rawSisa } = useBulanan({ curMonth, curYear })
  const { goals, loaded: goalsLoaded, summary } = useSavings()

  const avgExpenseDebt3m = useMemo(() => {
    const candidates = (monthlyTrend || [])
      .map(item => Number(item.expense || 0) + Number(item.debt || 0))
      .filter(value => value > 0)
      .slice(-3)
    if (candidates.length === 0) return 0
    return candidates.reduce((sum, value) => sum + value, 0) / candidates.length
  }, [monthlyTrend])
  const { isPremium, isAdmin, isSuperAdmin } = useSubscription()
  const hasPremiumAccess = isPremium || isAdmin || isSuperAdmin

  const budget = useMemo(() => computedBudget(), [computedBudget])
  const income = useMemo(() => computedIncome(), [computedIncome])
  const saving = useMemo(() => computedSaving(), [computedSaving])
  const debt = useMemo(() => (typeof computedDebt === 'function' ? computedDebt() : []), [computedDebt])

  const overviewSummary = useMemo(() => {
    const totalIncome = sumIncome(income)
    const plannedIncome = sumIncomePlan(income)
    const totalExpense = sumBudget(budget)
    const plannedExpense = sumBudgetPlan(budget)
    const totalSaving = sumSaving(saving)
    const totalDebtPayment = sumDebt(debt)
    const unpaidObligation = tx
      .filter((t: Transaction) => Boolean((t as any).debt) && !Boolean((t as any).settled))
      .reduce((s: number, t: Transaction) => s + Number((t as any).amt || 0), 0)
    const monthlySurplusAfterUnpaid = totalIncome - totalExpense - totalSaving - totalDebtPayment - unpaidObligation
    const trackedSavings = goals.filter(g => g.status !== 'archived').reduce((s, g) => s + (g.current || 0), 0)
    const currentCash = Math.max(0, rawSisa || 0)
    const totalAssets = trackedSavings + currentCash
    const netWorthEstimate = totalAssets - totalDebtPayment
    const emergencyGoals = goals.filter(g =>
      g.status !== 'archived' &&
      (g.type === 'darurat' || g.type === 'darurat_lanjutan')
    )
    const emergencyGoal = emergencyGoals.find(g => (g.current || 0) > 0) || emergencyGoals[0]
    const emergencyCurrent = emergencyGoals.reduce((s, g) => s + Number(g.current || 0), 0)
    const emergencyTargetTotal = emergencyGoals.reduce((s, g) => {
      const targetFromCoverage = g.expense && g.coverageTarget ? Number(g.expense || 0) * Number(g.coverageTarget || 0) : 0
      return s + Math.max(Number(g.target || 0), targetFromCoverage)
    }, 0)
    const emergencyProgressPercent = emergencyTargetTotal > 0
      ? Math.min(100, (emergencyCurrent / emergencyTargetTotal) * 100)
      : null
    const emergencyMonthlyExpense =
      emergencyGoal?.expense && emergencyGoal.expense > 0
        ? emergencyGoal.expense
        : avgExpenseDebt3m > 0
          ? avgExpenseDebt3m
          : totalExpense + totalDebtPayment
    const emergencyMonths =
      emergencyCurrent > 0 && emergencyMonthlyExpense > 0
        ? emergencyCurrent / emergencyMonthlyExpense
        : null
    const emergencyNote = emergencyGoals.length > 0
      ? 'Menuju target dana darurat'
      : 'Buat goal dana darurat dulu'
    const savingRate = totalIncome > 0 ? (totalSaving / totalIncome) * 100 : 0
    const expenseRate = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0
    const budgetUseRate = plannedExpense > 0 ? (totalExpense / plannedExpense) * 100 : 0
    const hasFinancialData = tx.length > 0 || plannedIncome > 0 || plannedExpense > 0 || totalSaving > 0 || totalDebtPayment > 0 || goals.some(g => g.status !== 'archived' && ((g.current || 0) > 0 || (g.target || 0) > 0 || Boolean(g.name)))
    const activeTrackedGoals = goals.filter(g => g.status !== 'archived').length

    return {
      totalIncome,
      plannedIncome,
      totalExpense,
      plannedExpense,
      totalSaving,
      totalDebtPayment,
      unpaidObligation,
      monthlySurplusAfterUnpaid,
      trackedSavings,
      currentCash,
      totalAssets,
      netWorthEstimate,
      emergencyMonths,
      emergencyProgressPercent,
      emergencyNote,
      savingRate,
      expenseRate,
      budgetUseRate,
      hasFinancialData,
      activeTrackedGoals,
    }
  }, [budget, income, saving, debt, goals, rawSisa, tx])

  const {
    totalIncome,
    totalExpense,
    plannedExpense,
    totalSaving,
    totalDebtPayment,
    unpaidObligation,
    monthlySurplusAfterUnpaid,
    trackedSavings,
    currentCash,
    totalAssets,
    netWorthEstimate,
    emergencyMonths,
    emergencyProgressPercent,
    emergencyNote,
    savingRate,
    expenseRate,
    budgetUseRate,
    hasFinancialData,
    activeTrackedGoals,
  } = overviewSummary

  const topCategories = useMemo(() => {
    return budget
      .map(c => ({ label:c.label, actual:c.items.reduce((s, i)=>s+(i.actual||0),0), plan:c.items.reduce((s, i)=>s+(i.plan||0),0) }))
      .filter(c => c.actual > 0 || c.plan > 0)
      .sort((a,b)=>b.actual-a.actual)
      .slice(0,5)
  }, [budget])

  const recentTx = useMemo(() => {
    return [...tx].sort((a: Transaction, b: Transaction) => Number(b.date || 0) - Number(a.date || 0)).slice(0,6)
  }, [tx])

  const activeGoals = useMemo(() => goals.filter(g => g.status === 'active'), [goals])
  const insight = useMemo(() => getInsight(totalIncome, totalExpense, totalSaving, monthlySurplusAfterUnpaid), [totalIncome, totalExpense, totalSaving, monthlySurplusAfterUnpaid])

  const { chartVisibleDay, daysInActiveMonth } = useMemo(() => {
    const now = new Date()
    const monthIndex = Math.max(0, MONTHS_ORDER.indexOf(curMonth))
    const yearNumber = Number(curYear)
    const daysInActiveMonth = new Date(yearNumber, monthIndex + 1, 0).getDate()
    const chartVisibleDay =
      now.getFullYear() === yearNumber && now.getMonth() === monthIndex
        ? Math.min(now.getDate(), daysInActiveMonth)
        : daysInActiveMonth
    return { chartVisibleDay, daysInActiveMonth }
  }, [curMonth, curYear])

  return (
    <div className="fink-dashboard-page">
      {/* Header */}
      <div className="dash-header" style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'12px', marginBottom:'14px', flexWrap:'wrap' }}>
        <div>
          <h1 style={{ fontSize:'20px', fontWeight:800, letterSpacing:'-.4px', color:'#111827' }}>Overview</h1>
          <p style={{ fontSize:'12px', color:'#9ca3af', marginTop:'3px' }}>
            Ringkasan posisi keuangan, arus uang, dan insight {MONTH_NAMES[curMonth]} {curYear}
          </p>
        </div>
        <div className="dash-actions" style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
          {loading && <span style={{ fontSize:'11px', color:'#9ca3af' }}>Loading data...</span>}
        </div>
      </div>

      {/* Financial position */}
      <FinancialPositionHero
        totalAssets={totalAssets}
        trackedSavings={trackedSavings}
        currentCash={currentCash}
        netWorth={netWorthEstimate}
        totalDebtPayment={totalDebtPayment}
        unpaidObligation={unpaidObligation}
        monthlySurplus={monthlySurplusAfterUnpaid}
        emergencyMonths={emergencyMonths}
        emergencyProgressPercent={emergencyProgressPercent}
        emergencyNote={emergencyNote}
        savingRate={savingRate}
        expenseRate={expenseRate}
        activeGoalCount={activeTrackedGoals}
        hasFinancialData={hasFinancialData}
      />

      {/* Financial insights */}
      <InsightPanel insight={insight} savingRate={savingRate} expenseRate={expenseRate} emergencyMonths={emergencyMonths} monthlySurplus={monthlySurplusAfterUnpaid} />

      {/* Hero daily progress */}
      <div className="overview-hero-chart" style={{ marginBottom:14 }}>
        <DailyProgressCard
          tx={tx}
          income={income}
          saving={saving}
          debt={debt}
          curDay={chartVisibleDay}
          daysInMonth={daysInActiveMonth}
          currentBalance={rawSisa}
          monthLabel={`${MONTH_NAMES[curMonth]} ${curYear}`}
        />
      </div>

      {/* Monthly comparison */}
      <div style={{ marginBottom:14 }}>
        <MonthlyComparisonChart data={monthlyTrend} />
      </div>

      {/* Total assets trend */}
      <div style={{ marginBottom:14 }}>
        <TotalAssetsTrendChart data={monthlyTrend} currentTotalAssets={totalAssets} />
      </div>

      {!hasPremiumAccess ? (
        <DashboardPremiumLock />
      ) : (
        <>
          <div style={{ marginBottom:14 }}>
            <GoalsProgressOverview goals={activeGoals} />
          </div>

          <QuickActionsSection />
        </>
      )}

      <style>{`
        .fink-dashboard-page {
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
          padding-bottom: max(18px, env(safe-area-inset-bottom));
        }

        @media (max-width: 1100px) {
          .fink-dashboard-page .overview-chart-layout {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 920px) {
          .fink-dashboard-page .dash-main-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 640px) {
          .fink-dashboard-page {
            padding-bottom: calc(72px + env(safe-area-inset-bottom));
          }

          .fink-dashboard-page .dash-header {
            gap: 10px !important;
            margin-bottom: 12px !important;
          }

          .fink-dashboard-page .dash-header > div:first-child {
            width: 100%;
          }

          .fink-dashboard-page .dash-header h1 {
            font-size: 18px !important;
          }

          .fink-dashboard-page .dash-header p {
            font-size: 11.5px !important;
            line-height: 1.45 !important;
          }

          .fink-dashboard-page .dash-actions {
            width: 100%;
            display: grid !important;
            grid-template-columns: 1fr 1fr;
            gap: 8px !important;
          }

          .fink-dashboard-page .dash-actions > span {
            grid-column: 1 / -1;
          }

          .fink-dashboard-page .dash-action-link {
            min-height: 36px;
            padding: 8px 10px !important;
            font-size: 11.5px !important;
          }

          .fink-dashboard-page .dash-metrics-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 9px !important;
            margin-bottom: 12px !important;
          }

          .fink-dashboard-page .dash-metrics-grid > div {
            padding: 11px 10px !important;
            min-width: 0;
          }

          .fink-dashboard-page .dash-metrics-grid > div > div:nth-child(2) {
            font-size: 15px !important;
            letter-spacing: -0.3px !important;
            overflow-wrap: anywhere;
          }

          .fink-dashboard-page .dash-metrics-grid > div > div:nth-child(3) {
            font-size: 10.5px !important;
            line-height: 1.35 !important;
          }

          .fink-dashboard-page .dash-card-head {
            padding: 12px 13px !important;
            align-items: flex-start !important;
          }

          .fink-dashboard-page .dash-card-head > div:first-child {
            min-width: 0;
          }

          .fink-dashboard-page .dash-mini-grid,
          .fink-dashboard-page .dash-saving-summary-grid,
          .fink-dashboard-page .monthly-trend-grid {
            grid-template-columns: 1fr !important;
          }

          .fink-dashboard-page .dash-tx-row {
            padding: 10px 13px !important;
            align-items: flex-start !important;
          }

          .fink-dashboard-page .dash-tx-amount {
            font-size: 11px !important;
            max-width: 118px;
            overflow: hidden;
            text-overflow: ellipsis;
          }
        }

        @media (max-width: 380px) {
          .fink-dashboard-page .dash-metrics-grid {
            grid-template-columns: 1fr !important;
          }

          .fink-dashboard-page .dash-actions {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
      <style>{`
        @media (max-width: 760px) {
          .dash-summary-grid {
            grid-template-columns: 1fr 1fr !important;
          }
          .dash-summary-grid > div {
            padding: 9px 11px !important;
          }
          .dash-summary-grid > div:nth-child(2n) {
            border-right: none !important;
          }
          .dash-summary-grid > div:nth-child(-n+2) {
            border-bottom: 1px solid #e7ebf0 !important;
          }
        }
      `}</style>
    </div>
  )
}
