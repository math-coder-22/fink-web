'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useMonthContext, MONTH_NAMES } from '@/components/layout/DashboardShell'
import { useBulanan } from '@/hooks/useBulanan'
import { useSavings } from '@/hooks/useSavings'
import type { BudgetCategory, IncomeCategory, SavingRow, Transaction } from '@/types/database'

const fmt = (n: number) => 'Rp ' + Math.abs(Math.round(n || 0)).toLocaleString('id-ID')
const pct = (n: number) => `${Math.round(n || 0)}%`

function sumIncome(income: IncomeCategory[]) {
  return income.reduce((s, c) => s + c.items.reduce((ss, i) => ss + (i.actual || 0), 0), 0)
}

function sumBudget(budget: BudgetCategory[]) {
  return budget.reduce((s, c) => s + c.items.reduce((ss, i) => ss + (i.actual || 0), 0), 0)
}

function sumSaving(saving: SavingRow[]) {
  return saving.reduce((s, r) => s + (r.actual || 0), 0)
}

function sumBudgetPlan(budget: BudgetCategory[]) {
  return budget.reduce((s, c) => s + c.items.reduce((ss, i) => ss + (i.plan || 0), 0), 0)
}

function sumIncomePlan(income: IncomeCategory[]) {
  return income.reduce((s, c) => s + c.items.reduce((ss, i) => ss + (i.plan || 0), 0), 0)
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background:'#fff', border:'1px solid #e3e7ee', borderRadius:'10px', boxShadow:'0 1px 3px rgba(0,0,0,.06)', overflow:'hidden', ...style }}>
      {children}
      <style>{`
        @media (max-width: 760px) {
          .dash-summary-grid {
            grid-template-columns: 1fr 1fr !important;
          }
          .dash-summary-grid > div {
            padding: 12px !important;
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

function CardHead({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="dash-card-head" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'10px', padding:'14px 16px', borderBottom:'1px solid #e3e7ee' }}>
      <div>
        <div style={{ fontSize:'13px', fontWeight:700, color:'#111827' }}>{title}</div>
        {subtitle && <div style={{ fontSize:'11px', color:'#9ca3af', marginTop:'2px' }}>{subtitle}</div>}
      </div>
      {right}
      <style>{`
        @media (max-width: 760px) {
          .dash-summary-grid {
            grid-template-columns: 1fr 1fr !important;
          }
          .dash-summary-grid > div {
            padding: 12px !important;
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

function MetricCard({ label, value, note, tone = 'neutral' }: { label: string; value: string; note: string; tone?: 'green'|'red'|'blue'|'neutral' }) {
  const color = tone === 'green' ? '#15803d' : tone === 'red' ? '#b91c1c' : tone === 'blue' ? '#1d4ed8' : '#111827'
  const bg = tone === 'green' ? '#f0fdf4' : tone === 'red' ? '#fef2f2' : tone === 'blue' ? '#eff6ff' : '#fff'
  const border = tone === 'green' ? '#bbf7d0' : tone === 'red' ? '#fecaca' : tone === 'blue' ? '#bfdbfe' : '#e3e7ee'
  return (
    <div style={{ background:bg, border:`1px solid ${border}`, borderRadius:'10px', padding:'14px 15px' }}>
      <div style={{ fontSize:'10px', fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'.7px', marginBottom:'7px' }}>{label}</div>
      <div style={{ fontSize:'20px', fontWeight:800, fontFamily:'JetBrains Mono, monospace', color, letterSpacing:'-.5px' }}>{value}</div>
      <div style={{ fontSize:'11px', color:'#6b7280', marginTop:'7px', lineHeight:1.4 }}>{note}</div>
      <style>{`
        @media (max-width: 760px) {
          .dash-summary-grid {
            grid-template-columns: 1fr 1fr !important;
          }
          .dash-summary-grid > div {
            padding: 12px !important;
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
            padding: 12px !important;
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


function SummaryPanel({
  totalIncome,
  plannedIncome,
  totalExpense,
  plannedExpense,
  totalSaving,
  plannedSaving,
  rawSisa,
  plannedBalance,
}: {
  totalIncome: number
  plannedIncome: number
  totalExpense: number
  plannedExpense: number
  totalSaving: number
  plannedSaving: number
  rawSisa: number
  plannedBalance: number
}) {
  const items = [
    {
      label: 'INCOME',
      value: totalIncome,
      sub: `${plannedIncome > 0 ? Math.round((totalIncome / plannedIncome) * 100) : 0}% · planned ${fmt(plannedIncome)}`,
      color: '#3f7f4a',
      accent: '#51a45b',
      bg: '#f6fff8',
      progress: plannedIncome > 0 ? (totalIncome / plannedIncome) * 100 : 0,
    },
    {
      label: 'EXPENSES',
      value: totalExpense,
      sub: `${plannedExpense > 0 ? Math.round((totalExpense / plannedExpense) * 100) : 0}% · planned ${fmt(plannedExpense)}`,
      color: '#a5302d',
      accent: '#c83a36',
      bg: '#fffafa',
      progress: plannedExpense > 0 ? (totalExpense / plannedExpense) * 100 : 0,
    },
    {
      label: 'SAVINGS',
      value: totalSaving,
      sub: `planned ${fmt(plannedSaving)}`,
      color: '#2b55d9',
      accent: '#4b63ff',
      bg: '#f7fbff',
      progress: plannedSaving > 0 ? (totalSaving / plannedSaving) * 100 : 0,
    },
    {
      label: 'BALANCE',
      value: rawSisa,
      sub: `vs planned ${fmt(plannedBalance)}`,
      color: '#98631b',
      accent: '#ba7a20',
      bg: '#fffdf7',
      progress: plannedBalance > 0 ? (rawSisa / plannedBalance) * 100 : 0,
    },
  ]

  return (
    <section className="dash-summary-panel" style={{
      background: '#fff',
      border: '1px solid #e3e7ee',
      borderRadius: '16px',
      boxShadow: '0 2px 10px rgba(15,23,42,.05)',
      marginBottom: '14px',
      overflow: 'hidden',
    }}>
      <div className="dash-summary-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
      }}>
        {items.map((item, idx) => (
          <div key={item.label} style={{
            padding: '14px 20px',
            background: item.bg,
            borderTop: `3px solid ${item.accent}`,
            borderRight: idx < items.length - 1 ? '1px solid #e7ebf0' : 'none',
            minWidth: 0,
          }}>
            <div style={{ fontSize:'11.5px', fontWeight:800, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.7px', marginBottom:'6px', whiteSpace:'nowrap' }}>
              {item.label}
            </div>
            <div style={{
              fontFamily:'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize:'21px',
              fontWeight:800,
              color:item.color,
              letterSpacing:'-.8px',
              whiteSpace:'nowrap',
              overflow:'hidden',
              textOverflow:'ellipsis',
              lineHeight:1.18,
            }}>
              {rawSisa < 0 && item.label === 'BALANCE' ? '-' : ''}{fmt(item.value)}
            </div>
            <div style={{ height:'3.5px', background:'#e5e7eb', borderRadius:'999px', margin:'9px 0 6px', overflow:'hidden' }}>
              <div style={{
                width:`${Math.min(Math.max(item.progress, 0), 100)}%`,
                height:'100%',
                background:item.accent,
                borderRadius:'999px',
              }} />
            </div>
            <div style={{
              fontSize:'11.5px',
              color:'#9ca3af',
              fontFamily:'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace',
              whiteSpace:'nowrap',
              overflow:'hidden',
              textOverflow:'ellipsis',
            }}>
              {item.sub}
            </div>
          </div>
        ))}
      </div>
    </section>
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
  const { curMonth, curYear } = useMonthContext()
  const { tx, loading, computedBudget, computedIncome, computedSaving, rawSisa } = useBulanan({ curMonth, curYear })
  const { goals, loaded: goalsLoaded, summary } = useSavings()

  const budget = computedBudget()
  const income = computedIncome()
  const saving = computedSaving()

  const totalIncome = sumIncome(income)
  const plannedIncome = sumIncomePlan(income)
  const totalExpense = sumBudget(budget)
  const plannedExpense = sumBudgetPlan(budget)
  const totalSaving = sumSaving(saving)
  const plannedSaving = saving.reduce((s, r) => s + (r.plan || 0), 0)
  const plannedBalance = plannedIncome - plannedExpense - plannedSaving
  const savingRate = totalIncome > 0 ? (totalSaving / totalIncome) * 100 : 0
  const expenseRate = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0
  const budgetUseRate = plannedExpense > 0 ? (totalExpense / plannedExpense) * 100 : 0

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

  const activeGoals = useMemo(() => goals.filter(g => g.status === 'active').slice(0,4), [goals])
  const insight = getInsight(totalIncome, totalExpense, totalSaving, rawSisa)

  return (
    <div className="fink-dashboard-page">
      {/* Header */}
      <div className="dash-header" style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'12px', marginBottom:'14px', flexWrap:'wrap' }}>
        <div>
          <h1 style={{ fontSize:'20px', fontWeight:800, letterSpacing:'-.4px', color:'#111827' }}>Dashboard</h1>
          <p style={{ fontSize:'12px', color:'#9ca3af', marginTop:'3px' }}>
            Ringkasan keuangan {MONTH_NAMES[curMonth]} {curYear} · Smart Family Finance
          </p>
        </div>
        <div className="dash-actions" style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
          {loading && <span style={{ fontSize:'11px', color:'#9ca3af' }}>Loading data...</span>}
          <Link href="/bulanan" className="dash-action-link" style={{ textDecoration:'none', display:'inline-flex', alignItems:'center', justifyContent:'center', gap:'6px', padding:'7px 12px', borderRadius:'7px', border:'1.5px solid #e3e7ee', color:'#4b5563', fontSize:'12px', fontWeight:700 }}>
            📝 Buka Monthly
          </Link>
          <Link href="/tabungan" className="dash-action-link" style={{ textDecoration:'none', display:'inline-flex', alignItems:'center', justifyContent:'center', gap:'6px', padding:'7px 12px', borderRadius:'7px', background:'#1a5c42', color:'#fff', fontSize:'12px', fontWeight:700 }}>
            🏦 Smart Saving
          </Link>
        </div>
      </div>

      {/* Main metrics */}
      <SummaryPanel
        totalIncome={totalIncome}
        plannedIncome={plannedIncome}
        totalExpense={totalExpense}
        plannedExpense={plannedExpense}
        totalSaving={totalSaving}
        plannedSaving={plannedSaving}
        rawSisa={rawSisa}
        plannedBalance={plannedBalance}
      />

      {/* Insight */}
      <Card style={{ marginBottom:'14px' }}>
        <div style={{ padding:'15px 16px', display:'flex', alignItems:'flex-start', gap:'12px' }}>
          <div style={{ width:'34px', height:'34px', borderRadius:'10px', background:'#e8f5ef', color:'#1a5c42', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'17px', flexShrink:0 }}>💡</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'13px', fontWeight:800, color:'#111827', marginBottom:'3px' }}>Financial Insight</div>
            <div style={{ fontSize:'12.5px', color:'#4b5563', lineHeight:1.55 }}>{insight}</div>
          </div>
        </div>
      </Card>

      <div className="dash-main-grid" style={{ display:'grid', gridTemplateColumns:'minmax(0, 1.15fr) minmax(320px, .85fr)', gap:'14px', alignItems:'start' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
          {/* Cashflow overview */}
          <Card>
            <CardHead title="📊 Cash Flow Overview" subtitle="Perbandingan pemasukan, pengeluaran, dan tabungan bulan ini" />
            <div style={{ padding:'16px', display:'flex', flexDirection:'column', gap:'13px' }}>
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', marginBottom:'6px' }}>
                  <span style={{ fontWeight:700, color:'#111827' }}>Budget usage</span>
                  <span style={{ color:'#6b7280', fontFamily:'JetBrains Mono,monospace' }}>{pct(budgetUseRate)}</span>
                </div>
                <ProgressBar value={budgetUseRate} color={budgetUseRate > 100 ? '#b91c1c' : '#1a5c42'} />
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'11px', color:'#9ca3af', marginTop:'6px' }}>
                  <span>Actual {fmt(totalExpense)}</span>
                  <span>Plan {fmt(plannedExpense)}</span>
                </div>
              </div>

              <div className="dash-mini-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:'10px' }}>
                <div style={{ border:'1px solid #e3e7ee', borderRadius:'9px', padding:'11px 12px' }}>
                  <div style={{ fontSize:'10px', color:'#9ca3af', fontWeight:700, textTransform:'uppercase', letterSpacing:'.6px' }}>Expense Rate</div>
                  <div style={{ marginTop:'5px', fontSize:'18px', fontWeight:800, color:expenseRate > 80 ? '#b91c1c' : '#111827', fontFamily:'JetBrains Mono,monospace' }}>{pct(expenseRate)}</div>
                </div>
                <div style={{ border:'1px solid #e3e7ee', borderRadius:'9px', padding:'11px 12px' }}>
                  <div style={{ fontSize:'10px', color:'#9ca3af', fontWeight:700, textTransform:'uppercase', letterSpacing:'.6px' }}>Saving Rate</div>
                  <div style={{ marginTop:'5px', fontSize:'18px', fontWeight:800, color:savingRate >= 20 ? '#15803d' : '#1d4ed8', fontFamily:'JetBrains Mono,monospace' }}>{pct(savingRate)}</div>
                </div>
                <div style={{ border:'1px solid #e3e7ee', borderRadius:'9px', padding:'11px 12px' }}>
                  <div style={{ fontSize:'10px', color:'#9ca3af', fontWeight:700, textTransform:'uppercase', letterSpacing:'.6px' }}>Transactions</div>
                  <div style={{ marginTop:'5px', fontSize:'18px', fontWeight:800, color:'#111827', fontFamily:'JetBrains Mono,monospace' }}>{tx.length}</div>
                </div>
              </div>
            </div>
          </Card>

          {/* Top categories */}
          <Card>
            <CardHead title="💸 Top Spending Categories" subtitle="Kategori dengan pengeluaran terbesar" right={<Link href="/bulanan" style={{ fontSize:'11px', color:'#1a5c42', fontWeight:700, textDecoration:'none' }}>Detail →</Link>} />
            <div style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:'11px' }}>
              {topCategories.length === 0 ? (
                <div style={{ fontSize:'12px', color:'#9ca3af', padding:'8px 0' }}>Belum ada pengeluaran atau budget yang tercatat.</div>
              ) : topCategories.map(cat => {
                const share = totalExpense > 0 ? (cat.actual / totalExpense) * 100 : 0
                return (
                  <div key={cat.label}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:'10px', marginBottom:'6px' }}>
                      <span style={{ fontSize:'12.5px', fontWeight:700, color:'#111827' }}>{cat.label}</span>
                      <span style={{ fontSize:'12px', fontFamily:'JetBrains Mono,monospace', color:'#4b5563' }}>{fmt(cat.actual)}</span>
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
            <CardHead title="🏦 Smart Saving" subtitle="Ringkasan target tabungan aktif" right={<Link href="/tabungan" style={{ fontSize:'11px', color:'#1a5c42', fontWeight:700, textDecoration:'none' }}>Kelola →</Link>} />
            <div style={{ padding:'14px 16px' }}>
              {!goalsLoaded ? (
                <div style={{ fontSize:'12px', color:'#9ca3af' }}>Loading target tabungan...</div>
              ) : (
                <>
                  <div className="dash-saving-summary-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'9px', marginBottom:'12px' }}>
                    <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:'9px', padding:'10px' }}>
                      <div style={{ fontSize:'10px', color:'#1d4ed8', fontWeight:800, textTransform:'uppercase' }}>Collected</div>
                      <div style={{ fontSize:'15px', fontFamily:'JetBrains Mono,monospace', fontWeight:800, color:'#1d4ed8', marginTop:'4px' }}>{fmt(summary.totalCollected)}</div>
                    </div>
                    <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'9px', padding:'10px' }}>
                      <div style={{ fontSize:'10px', color:'#15803d', fontWeight:800, textTransform:'uppercase' }}>Progress</div>
                      <div style={{ fontSize:'15px', fontFamily:'JetBrains Mono,monospace', fontWeight:800, color:'#15803d', marginTop:'4px' }}>{pct(summary.pct)}</div>
                    </div>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'9px' }}>
                    {activeGoals.length === 0 ? (
                      <div style={{ fontSize:'12px', color:'#9ca3af' }}>Belum ada target tabungan aktif.</div>
                    ) : activeGoals.map(g => {
                      const p = g.target > 0 ? (g.current / g.target) * 100 : 0
                      return (
                        <div key={g.id}>
                          <div style={{ display:'flex', justifyContent:'space-between', gap:'10px', marginBottom:'5px' }}>
                            <span style={{ fontSize:'12px', fontWeight:700, color:'#111827' }}>{g.name}</span>
                            <span style={{ fontSize:'11px', color:'#6b7280', fontFamily:'JetBrains Mono,monospace' }}>{pct(p)}</span>
                          </div>
                          <ProgressBar value={p} color="#1d4ed8" />
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* Recent transactions */}
          <Card>
            <CardHead title="📝 Recent Transactions" subtitle="Transaksi terbaru bulan ini" right={<Link href="/bulanan" style={{ fontSize:'11px', color:'#1a5c42', fontWeight:700, textDecoration:'none' }}>Tambah →</Link>} />
            <div style={{ padding:'8px 0' }}>
              {recentTx.length === 0 ? (
                <div style={{ fontSize:'12px', color:'#9ca3af', padding:'14px 16px' }}>Belum ada transaksi bulan ini.</div>
              ) : recentTx.map(t => {
                const isIn = t.type === 'inn'
                const isSave = t.type === 'save'
                return (
                  <div key={t.id} className="dash-tx-row" style={{ display:'flex', alignItems:'center', gap:'10px', padding:'9px 16px', borderBottom:'1px solid #f3f4f6' }}>
                    <div style={{ width:'28px', height:'28px', borderRadius:'8px', background:isIn?'#f0fdf4':isSave?'#eff6ff':'#fef2f2', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:'13px' }}>
                      {isIn ? '↗' : isSave ? '🏦' : '↘'}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'12px', fontWeight:700, color:'#111827', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.note || t.cat}</div>
                      <div style={{ fontSize:'10.5px', color:'#9ca3af', marginTop:'2px' }}>{String(t.date).padStart(2,'0')} · {t.cat}</div>
                    </div>
                    <div className="dash-tx-amount" style={{ fontSize:'12px', fontWeight:800, fontFamily:'JetBrains Mono,monospace', color:isIn?'#15803d':isSave?'#1d4ed8':'#b91c1c', whiteSpace:'nowrap' }}>
                      {isIn ? '+' : '-'}{fmt(t.amt)}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      </div>

      <style>{`
        .fink-dashboard-page {
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
          padding-bottom: max(18px, env(safe-area-inset-bottom));
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
          .fink-dashboard-page .dash-saving-summary-grid {
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
            padding: 12px !important;
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
