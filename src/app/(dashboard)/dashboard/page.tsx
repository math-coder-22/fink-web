'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useMonthContext, MONTH_NAMES } from '@/components/layout/DashboardShell'
import { useBulanan } from '@/hooks/useBulanan'
import { useSavings } from '@/hooks/useSavings'
import CashFlowTrendChart from '@/components/dashboard/CashFlowTrendChart'
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
  saving: number
  cashflow: number
  savingRate: number
  expenseRate: number
  transactionCount: number
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

function MonthlyComparisonChart({ data }: { data: MonthlyTrendItem[] }) {
  const chartData = data
    .filter(d => d.income > 0 || d.expense > 0 || d.saving > 0)
    .slice(-3)
    .map(d => ({
      ...d,
      net: Number(d.income || 0) - Number(d.expense || 0) - Number(d.saving || 0),
    }))
  const maxVal = Math.max(1, ...chartData.flatMap(d => [d.income, d.expense, d.saving]))
  const chartHeight = 178

  return (
    <Card style={{ marginBottom:0, height:'100%', minHeight:322, width:'100%', display:'flex', flexDirection:'column', borderRadius:18 }}>
      <CardHead
        title="Monthly Comparison" icon={<AppIcon name="chart" size={16} />}
        subtitle="Income, expenses, dan saving 3 bulan terakhir"
        right={<span style={{ fontSize:11, color:'#9ca3af', fontWeight:800 }}>3 months</span>}
      />
      <div className="monthly-comparison-card" style={{ padding:'12px 14px 8px', flex:1, display:'flex', flexDirection:'column', minHeight:0 }}>
        {chartData.length === 0 ? (
          <div style={{ fontSize:12, color:'#9ca3af' }}>Belum ada data historis untuk ditampilkan.</div>
        ) : (
          <>
            <div className="monthly-comparison-plot" style={{
              flex:1,
              minHeight:0,
              display:'grid',
              gridTemplateColumns:`repeat(${chartData.length}, minmax(86px, 1fr))`,
              gap:14,
              alignItems:'end',
              overflowX:'auto',
              padding:'6px 0 0',
            }}>
              {chartData.map(item => {
                const bars = [
                  { key:'income', label:'Income', value:item.income, color:'#16a34a' },
                  { key:'expense', label:'Expenses', value:item.expense, color:'#ef4444' },
                  { key:'saving', label:'Saving', value:item.saving, color:'#2563eb' },
                ]
                return (
                  <div key={`${item.month}-${item.year}`} style={{ minWidth:86, display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
                    <div style={{ height:chartHeight, display:'flex', alignItems:'flex-end', justifyContent:'center', gap:7, borderBottom:'1px solid #e5e7eb', padding:'0 2px' }}>
                      {bars.map(bar => (
                        <div key={bar.key} title={`${bar.label} ${fmt(bar.value)}`} style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-end', minWidth:20 }}>
                          <div className="monthly-bar-label" style={{
                            fontSize:9.5,
                            lineHeight:1,
                            color:bar.color,
                            fontWeight:900,
                            marginBottom:5,
                            whiteSpace:'nowrap',
                            transform:'translateY(0)',
                          }}>{fmtShort(bar.value).replace('Rp ', '')}</div>
                          <div style={{
                            width:22,
                            height:`${Math.max(bar.value > 0 ? 8 : 0, (bar.value / maxVal) * (chartHeight - 26))}px`,
                            background:bar.color,
                            borderRadius:'8px 8px 0 0',
                            boxShadow:'0 8px 18px rgba(15,23,42,.08)',
                          }} />
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop:8, textAlign:'center', fontSize:11, color:'#64748b', fontWeight:900 }}>{item.label}</div>
                    <div style={{ marginTop:3, textAlign:'center', fontSize:10.5, color:item.net >= 0 ? '#15803d' : '#b91c1c', fontFamily:'var(--font-mono), monospace', fontWeight:800 }}>
                      {item.net >= 0 ? 'Surplus +' : 'Defisit -'}{fmtShort(item.net)}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="monthly-comparison-legend" style={{ display:'flex', gap:10, flexWrap:'wrap', marginTop:8, fontSize:10.5, color:'#64748b', alignItems:'center' }}>
              <span><b style={{ color:'#16a34a' }}>■</b> Income</span>
              <span><b style={{ color:'#ef4444' }}>■</b> Expenses</span>
              <span><b style={{ color:'#2563eb' }}>■</b> Saving</span>
            </div>
          </>
        )}
      </div>
      <style>{`
        @media (max-width: 640px) {
          .monthly-comparison-card { padding: 10px 10px 8px !important; }
          .monthly-comparison-plot { gap: 10px !important; }
          .monthly-bar-label { font-size: 9px !important; }
          .monthly-comparison-legend { font-size: 10px !important; }
        }
      `}</style>
    </Card>
  )
}

function dailyBalanceStatus(leftToSpend: number, remainingDays: number, totalExpense: number, currentDay: number) {
  const safeDaily = remainingDays > 0 ? leftToSpend / remainingDays : leftToSpend
  const avgDailySpend = currentDay > 0 ? totalExpense / currentDay : 0
  const ratio = avgDailySpend > 0 ? safeDaily / avgDailySpend : safeDaily > 0 ? 1 : 0

  if (leftToSpend <= 0) return { color:'#b91c1c', bg:'#fee2e2', daily:safeDaily }
  if (ratio >= 1) return { color:'#15803d', bg:'#dcfce7', daily:safeDaily }
  if (ratio >= 0.6) return { color:'#b7791f', bg:'#fef3c7', daily:safeDaily }
  return { color:'#b91c1c', bg:'#fee2e2', daily:safeDaily }
}

function sumIncome(income: IncomeCategory[]) {
  return income.reduce((s, c) => s + c.items.reduce((ss, i) => ss + (i.actual || 0), 0), 0)
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
  monthlySurplus: number
  emergencyMonths: number | null
  emergencyNote: string
  savingRate: number
  expenseRate: number
  activeGoalCount: number
}

function FinancialPositionHero({
  totalAssets,
  trackedSavings,
  currentCash,
  netWorth,
  totalDebtPayment,
  monthlySurplus,
  emergencyMonths,
  emergencyNote,
  savingRate,
  expenseRate,
  activeGoalCount,
}: FinancialPositionProps) {
  const healthScore = Math.max(0, Math.min(100,
    Math.round(
      35 +
      (monthlySurplus >= 0 ? 20 : -18) +
      Math.min(25, savingRate) +
      (expenseRate <= 70 ? 12 : expenseRate <= 85 ? 4 : -8) +
      (emergencyMonths === null ? 0 : emergencyMonths >= 6 ? 8 : emergencyMonths >= 3 ? 4 : -6)
    )
  ))
  const status = healthScore >= 75 ? 'Healthy' : healthScore >= 55 ? 'Watchful' : 'Needs Attention'
  const statusColor = healthScore >= 75 ? '#15803d' : healthScore >= 55 ? '#b7791f' : '#b91c1c'

  const smallCard = (label: string, value: string, note: string, color: string, bg: string) => (
    <div style={{ background:bg, border:'1px solid rgba(148,163,184,.22)', borderRadius:16, padding:'13px 14px', minWidth:0 }}>
      <div style={{ fontSize:10.5, fontWeight:900, color:'#64748b', textTransform:'uppercase', letterSpacing:'.65px' }}>{label}</div>
      <div style={{ marginTop:7, fontSize:18, fontWeight:900, color, fontFamily:'var(--font-mono), monospace', letterSpacing:'-.5px', overflowWrap:'anywhere' }}>{value}</div>
      <div style={{ marginTop:6, fontSize:11, color:'#64748b', lineHeight:1.35 }}>{note}</div>
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
      <div className="financial-position-grid" style={{ position:'relative', display:'grid', gridTemplateColumns:'minmax(260px, 1.15fr) minmax(0, 1.85fr)', gap:16, alignItems:'stretch' }}>
        <div style={{ background:'#fff', border:'1px solid rgba(226,232,240,.9)', borderRadius:20, padding:18, boxShadow:'0 10px 28px rgba(15,23,42,.045)' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, marginBottom:12 }}>
            <div>
              <div style={{ fontSize:11, color:'#64748b', fontWeight:900, textTransform:'uppercase', letterSpacing:'.75px' }}>Financial Position</div>
              <div style={{ fontSize:12, color:'#94a3b8', marginTop:3 }}>Total uang yang tercatat di FiNK</div>
            </div>
            <div style={{ border:`1px solid ${statusColor}33`, background:`${statusColor}12`, color:statusColor, borderRadius:999, padding:'6px 10px', fontSize:11, fontWeight:900 }}>{status}</div>
          </div>
          <div style={{ fontSize:34, lineHeight:1.08, fontWeight:950, color:'#0f172a', letterSpacing:'-1.4px', fontFamily:'var(--font-mono), monospace', overflowWrap:'anywhere' }}>{fmt(totalAssets)}</div>
          <div style={{ marginTop:10, fontSize:12, color:'#64748b', lineHeight:1.55 }}>
            Terdiri dari dana di Goals/Smart Saving dan sisa cash bulan berjalan yang masih tercatat positif.
          </div>
          <div style={{ marginTop:15, display:'grid', gridTemplateColumns:'1fr 1fr', gap:9 }}>
            <div style={{ border:'1px solid #e2e8f0', borderRadius:14, padding:'10px 11px' }}>
              <div style={{ fontSize:10, fontWeight:900, color:'#94a3b8', textTransform:'uppercase' }}>Net Worth Est.</div>
              <div style={{ marginTop:5, fontSize:15, fontWeight:900, color:netWorth >= 0 ? '#15803d' : '#b91c1c', fontFamily:'var(--font-mono), monospace' }}>{fmt(netWorth)}</div>
            </div>
            <div style={{ border:'1px solid #e2e8f0', borderRadius:14, padding:'10px 11px' }}>
              <div style={{ fontSize:10, fontWeight:900, color:'#94a3b8', textTransform:'uppercase' }}>Health Score</div>
              <div style={{ marginTop:5, fontSize:15, fontWeight:900, color:statusColor, fontFamily:'var(--font-mono), monospace' }}>{healthScore}/100</div>
            </div>
          </div>
        </div>

        <div className="financial-position-cards" style={{ display:'grid', gridTemplateColumns:'repeat(3, minmax(0, 1fr))', gap:12 }}>
          {smallCard('Smart Saving', fmt(trackedSavings), `${activeGoalCount} goal aktif/non-arsip`, '#1d4ed8', '#eff6ff')}
          {smallCard('Left To Spend', fmt(currentCash), currentCash > 0 ? 'Sisa aman bulan ini' : 'Belum ada sisa positif', currentCash >= 0 ? '#15803d' : '#b91c1c', currentCash >= 0 ? '#f0fdf4' : '#fef2f2')}
          {smallCard('Monthly Surplus', `${monthlySurplus >= 0 ? '+' : '-'}${fmt(monthlySurplus)}`, 'Income - expenses - saving', monthlySurplus >= 0 ? '#15803d' : '#b91c1c', monthlySurplus >= 0 ? '#f0fdf4' : '#fef2f2')}
          {smallCard('Debt Payment', fmt(totalDebtPayment), 'Cicilan/kewajiban bulan ini', '#b7791f', '#fffbeb')}
          {smallCard('Emergency Cover', emergencyMonths === null ? 'Not Set' : `${emergencyMonths.toFixed(1).replace('.', ',')} bln`, emergencyNote, emergencyMonths !== null && emergencyMonths >= 6 ? '#15803d' : emergencyMonths !== null ? '#b7791f' : '#64748b', '#f8fafc')}
          {smallCard('Saving Rate', pct(savingRate), 'Persentase tabungan bulan ini', savingRate >= 20 ? '#15803d' : '#1d4ed8', '#f8fafc')}
        </div>
      </div>
      <style>{`
        @media (max-width: 980px) {
          .financial-position-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 720px) {
          .financial-position-hero { padding: 13px !important; border-radius: 18px !important; }
          .financial-position-cards { grid-template-columns: 1fr 1fr !important; gap: 9px !important; }
        }
        @media (max-width: 420px) {
          .financial-position-cards { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

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


function QuickActionsSection() {
  const actions = [
    { href:'/bulanan', icon:'transactions' as const, title:'Add Transaction', note:'Catat pemasukan atau pengeluaran' },
    { href:'/tabungan', icon:'goals' as const, title:'Update Goal', note:'Perbarui progres target keluarga' },
    { href:'/financial-doctor', icon:'advisor' as const, title:'Financial Checkup', note:'Lihat diagnosis dan saran FiNK' },
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
}

function InsightPanel({ insight, savingRate, expenseRate, emergencyMonths, monthlySurplus }: { insight: string; savingRate: number; expenseRate: number; emergencyMonths: number | null; monthlySurplus: number }) {
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
}


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

function PriorityGoalsList({ goals }: { goals: SavingsGoal[] }) {
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
}


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
    fetch(`/api/overview/trend?month=${curMonth}&year=${curYear}&count=6`, { cache: 'no-store' })
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(json => { if (!cancelled) setMonthlyTrend(Array.isArray(json.data) ? json.data : []) })
      .catch(() => { if (!cancelled) setMonthlyTrend([]) })
    return () => { cancelled = true }
  }, [curMonth, curYear])

  const { tx, loading, computedBudget, computedIncome, computedSaving, computedDebt, rawSisa } = useBulanan({ curMonth, curYear })
  const { goals, loaded: goalsLoaded, summary } = useSavings()
  const { isPremium, isAdmin, isSuperAdmin } = useSubscription()
  const hasPremiumAccess = isPremium || isAdmin || isSuperAdmin

  const budget = computedBudget()
  const income = computedIncome()
  const saving = computedSaving()
  const debt = typeof computedDebt === 'function' ? computedDebt() : []

  const totalIncome = sumIncome(income)
  const plannedIncome = sumIncomePlan(income)
  const totalExpense = sumBudget(budget)
  const plannedExpense = sumBudgetPlan(budget)
  const totalSaving = sumSaving(saving)
  const totalDebtPayment = sumDebt(debt)
  const savingRate = totalIncome > 0 ? (totalSaving / totalIncome) * 100 : 0
  const expenseRate = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0
  const budgetUseRate = plannedExpense > 0 ? (totalExpense / plannedExpense) * 100 : 0
  const trackedSavings = goals.filter(g => g.status !== 'archived').reduce((s, g) => s + (g.current || 0), 0)
  const currentCash = Math.max(0, rawSisa || 0)
  const totalAssets = trackedSavings + currentCash
  const netWorthEstimate = totalAssets - totalDebtPayment
  const emergencyGoal = goals.find(g => g.type === 'darurat' && g.status !== 'archived' && (g.current || 0) > 0)
  const emergencyMonthlyExpense =
    emergencyGoal?.expense && emergencyGoal.expense > 0
      ? emergencyGoal.expense
      : totalExpense + totalDebtPayment
  const emergencyMonths =
    emergencyGoal && emergencyMonthlyExpense > 0
      ? (emergencyGoal.current || 0) / emergencyMonthlyExpense
      : null
  const emergencyNote = emergencyGoal
    ? (emergencyGoal.expense && emergencyGoal.expense > 0
        ? 'Berdasarkan target dana darurat'
        : 'Estimasi dari expenses + debt bulan ini')
    : 'Buat goal dana darurat dulu'
  const activeTrackedGoals = goals.filter(g => g.status !== 'archived').length

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

  const activeGoals = useMemo(() => goals.filter(g => g.status === 'active').sort((a, b) => Number(Boolean(b.focus)) - Number(Boolean(a.focus)) || ((b.target > 0 ? b.current / b.target : 0) - (a.target > 0 ? a.current / a.target : 0))).slice(0,4), [goals])
  const insight = getInsight(totalIncome, totalExpense, totalSaving, rawSisa)

  const now = new Date()
  const monthIndex = Number(curMonth)
  const yearNumber = Number(curYear)
  const daysInActiveMonth = new Date(yearNumber, monthIndex + 1, 0).getDate()
  const chartVisibleDay =
    now.getFullYear() === yearNumber && now.getMonth() === monthIndex
      ? Math.min(now.getDate(), daysInActiveMonth)
      : daysInActiveMonth

  return (
    <div className="fink-dashboard-page">
      {/* Header */}
      <div className="dash-header" style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'12px', marginBottom:'14px', flexWrap:'wrap' }}>
        <div>
          <h1 style={{ fontSize:'20px', fontWeight:800, letterSpacing:'-.4px', color:'#111827' }}>Overview</h1>
          <p style={{ fontSize:'12px', color:'#9ca3af', marginTop:'3px' }}>
            Financial position, money flow, goals, dan insight {MONTH_NAMES[curMonth]} {curYear}
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
        monthlySurplus={rawSisa}
        emergencyMonths={emergencyMonths}
        emergencyNote={emergencyNote}
        savingRate={savingRate}
        expenseRate={expenseRate}
        activeGoalCount={activeTrackedGoals}
      />

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', gap:12, margin:'2px 0 10px' }}><div><div style={{ fontSize:14, fontWeight:900, color:'#0f172a' }}>Money Flow</div><div style={{ fontSize:11.5, color:'#94a3b8', marginTop:2 }}>Arus masuk, keluar, dan saving bulan berjalan</div></div></div>
      <div className="overview-chart-layout" style={{ display:'grid', gridTemplateColumns:'minmax(0, 1.65fr) minmax(300px, .95fr)', gap:'14px', alignItems:'stretch', marginBottom:'14px', width:'100%' }}>
        <div style={{ minWidth:0, display:'flex', width:'100%' }}>
          <CashFlowTrendChart tx={tx} income={income} saving={saving} debt={debt} curDay={chartVisibleDay} daysInMonth={daysInActiveMonth} />
        </div>
        <div style={{ minWidth:0, display:'flex', width:'100%' }}>
          <MonthlyComparisonChart data={monthlyTrend} />
        </div>
      </div>

      {/* Insight and actions */}
      <InsightPanel insight={insight} savingRate={savingRate} expenseRate={expenseRate} emergencyMonths={emergencyMonths} monthlySurplus={rawSisa} />

      {!hasPremiumAccess ? (
        <DashboardPremiumLock />
      ) : (
        <>
          <QuickActionsSection />

          <div className="dash-main-grid" style={{ display:'grid', gridTemplateColumns:'minmax(0, 1.15fr) minmax(320px, .85fr)', gap:'14px', alignItems:'start' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
          {/* Cashflow overview */}
          <Card>
            <CardHead title="Cash Flow Overview" icon={<AppIcon name="chart" size={16} />} subtitle="Perbandingan pemasukan, pengeluaran, dan tabungan bulan ini" />
            <div style={{ padding:'16px', display:'flex', flexDirection:'column', gap:'13px' }}>
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', marginBottom:'6px' }}>
                  <span style={{ fontWeight:700, color:'#111827' }}>Budget usage</span>
                  <span style={{ color:'#6b7280', fontFamily:'var(--font-mono), monospace' }}>{pct(budgetUseRate)}</span>
                </div>
                <ProgressBar value={budgetUseRate} color={budgetUseRate > 100 ? '#b91c1c' : '#1a5c42'} />
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'11px', color:'#9ca3af', marginTop:'6px' }}>
                  <span>Actual {fmt(totalExpense)}</span>
                  <span>Plan {fmt(plannedExpense)}</span>
                </div>
              </div>

              <div className="dash-mini-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:'10px' }}>
                <DesignMetricCard
                  label="Expense Rate"
                  value={pct(expenseRate)}
                  note="Expense / income"
                  tone={expenseRate > 80 ? 'danger' : 'default'}
                  style={{ borderRadius: 12 }}
                />
                <DesignMetricCard
                  label="Saving Rate"
                  value={pct(savingRate)}
                  note="Saving / income"
                  tone={savingRate >= 20 ? 'success' : 'info'}
                  style={{ borderRadius: 12 }}
                />
                <DesignMetricCard
                  label="Transactions"
                  value={tx.length}
                  note="Record bulan ini"
                  tone="default"
                  style={{ borderRadius: 12 }}
                />
              </div>
            </div>
          </Card>

          {/* Top categories */}
          <Card>
            <CardHead title="Top Spending Categories" icon={<AppIcon name="expense" size={16} />} subtitle="Kategori dengan pengeluaran terbesar" right={<Link href="/bulanan" style={{ fontSize:'11px', color:'#1a5c42', fontWeight:700, textDecoration:'none' }}>Detail</Link>} />
            <div style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:'11px' }}>
              {topCategories.length === 0 ? (
                <div style={{ fontSize:'12px', color:'#9ca3af', padding:'8px 0' }}>Belum ada pengeluaran atau budget yang tercatat.</div>
              ) : topCategories.map(cat => {
                const share = totalExpense > 0 ? (cat.actual / totalExpense) * 100 : 0
                return (
                  <div key={cat.label}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:'10px', marginBottom:'6px' }}>
                      <span style={{ fontSize:'12.5px', fontWeight:700, color:'#111827' }}>{cat.label}</span>
                      <span style={{ fontSize:'12px', fontFamily:'var(--font-mono), monospace', color:'#4b5563' }}>{fmt(cat.actual)}</span>
                    </div>
                    <ProgressBar value={share} color="#f59e0b" />
                    <div style={{ fontSize:'10.5px', color:'#9ca3af', marginTop:'4px' }}>{pct(share)} dari total pengeluaran</div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
          {/* Smart saving */}
          <Card>
            <CardHead title="Priority Goals" subtitle="Target utama yang paling perlu dipantau" right={<Link href="/tabungan" style={{ fontSize:'11px', color:'#1a5c42', fontWeight:700, textDecoration:'none' }}>Kelola</Link>} />
            <div style={{ padding:'14px 16px' }}>
              {!goalsLoaded ? (
                <div style={{ fontSize:'12px', color:'#9ca3af' }}>Loading target tabungan...</div>
              ) : (
                <>
                  <div className="dash-saving-summary-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'9px', marginBottom:'12px' }}>
                    <DesignMetricCard
                      label="Collected"
                      value={fmt(summary.totalCollected)}
                      note="Total terkumpul"
                      tone="info"
                      style={{ borderRadius: 12 }}
                    />
                    <DesignMetricCard
                      label="Progress"
                      value={pct(summary.pct)}
                      note="Progress keseluruhan"
                      tone="success"
                      style={{ borderRadius: 12 }}
                    />
                  </div>
                  <PriorityGoalsList goals={activeGoals} />
                </>
              )}
            </div>
          </Card>

          {/* Recent transactions */}
          <Card>
            <CardHead title="Recent Transactions" icon={<AppIcon name="transactions" size={16} />} subtitle="Transaksi terbaru bulan ini" right={<Link href="/bulanan" style={{ fontSize:'11px', color:'#1a5c42', fontWeight:700, textDecoration:'none' }}>Tambah</Link>} />
            <div style={{ padding:'8px 0' }}>
              {recentTx.length === 0 ? (
                <div style={{ fontSize:'12px', color:'#9ca3af', padding:'14px 16px' }}>Belum ada transaksi bulan ini.</div>
              ) : recentTx.map(t => {
                const isIn = t.type === 'inn'
                const isSave = t.type === 'save'
                return (
                  <div key={t.id} className="dash-tx-row" style={{ display:'flex', alignItems:'center', gap:'10px', padding:'9px 16px', borderBottom:'1px solid #f3f4f6' }}>
                    <div style={{ width:'28px', height:'28px', borderRadius:'8px', background:isIn?'#f0fdf4':isSave?'#eff6ff':'#fef2f2', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, }}>
                      {isIn ? <AppIcon name="income" size={14} /> : isSave ? <AppIcon name="saving" size={14} /> : <AppIcon name="expense" size={14} />}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'12px', fontWeight:700, color:'#111827', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.note || t.cat}</div>
                      <div style={{ fontSize:'10.5px', color:'#9ca3af', marginTop:'2px' }}>{String(t.date).padStart(2,'0')} · {t.cat}</div>
                    </div>
                    <div className="dash-tx-amount" style={{ fontSize:'12px', fontWeight:800, fontFamily:'var(--font-mono), monospace', color:isIn?'#15803d':isSave?'#1d4ed8':'#b91c1c', whiteSpace:'nowrap' }}>
                      {isIn ? '+' : '-'}{fmt(t.amt)}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
          </div>
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
