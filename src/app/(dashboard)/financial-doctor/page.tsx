'use client'

import { useEffect, useState } from 'react'
import { useMonthContext, MONTH_NAMES } from '@/components/layout/DashboardShell'
import { AppIcon } from '@/components/ui/design'

type Tone = 'good' | 'warning' | 'danger' | 'neutral'
type Priority = 'high' | 'medium' | 'low'
type GoalPriority = 'critical' | 'high' | 'medium' | 'low' | 'maintain' | 'paused'

type GoalPlannerItem = {
  id: string
  name: string
  priority: GoalPriority
  priorityLabel: string
  healthLabel: string
  recommendation: string
  reason: string
  progress: number
  current: number
  target: number
  monthly?: number
  monthlyNeeded?: number
  gap?: number
  monthsLeft?: number
  typeLabel?: string
  focus: boolean
  mode: 'auto' | 'manual'
}

type AdvisorSummary = {
  score: number
  status: 'good' | 'warning' | 'danger'
  statusLabel: string
  mainInsight: string
  monthly: {
    income: number
    expense: number
    saving: number
    cashflow: number
    savingRate: number
    expenseRate: number
    transactionCount: number
  }
  previous?: {
    income: number
    expense: number
    saving: number
    cashflow: number
    savingRate: number
    expenseRate: number
  }
  averages: {
    income3m: number
    expense3m: number
    saving3m: number
    savingRate3m: number
  }
  deltas: {
    incomeVsPrev: number | null
    expenseVsPrev: number | null
    savingVsPrev: number | null
    savingRateVsPrev: number | null
  }
  ratios: {
    savingRate: number
    expenseRate: number
    debtRatio: number
  }
  risks: { tone: Tone; title: string; detail: string }[]
  priorities: { level: Priority; title: string; detail: string }[]
  goalInsights: GoalPlannerItem[]
  focusGoals: GoalPlannerItem[]
  milestone: {
    title: string
    current: number
    target: number
    progress: number
    monthly: number
    detail: string
  } | null
}

const toneMap: Record<Tone, { bg:string; border:string; color:string; soft:string }> = {
  good: { bg:'#f0fdf4', border:'#bbf7d0', color:'#166534', soft:'#dcfce7' },
  warning: { bg:'#fffbeb', border:'#fde68a', color:'#92400e', soft:'#fef3c7' },
  danger: { bg:'#fef2f2', border:'#fecaca', color:'#991b1b', soft:'#fee2e2' },
  neutral: { bg:'#f7f8fa', border:'#e3e7ee', color:'#4b5563', soft:'#f3f4f6' },
}

const priorityTone: Record<Priority, Tone> = {
  high: 'danger',
  medium: 'warning',
  low: 'neutral',
}

const fmt = (n: number) => 'Rp ' + Math.abs(Math.round(n || 0)).toLocaleString('id-ID')
const pct = (n: number) => `${Math.round(n || 0)}%`

function deltaText(value: number | null, goodWhenUp = true) {
  if (value === null || !Number.isFinite(value)) return { text:'No comparison yet', color:'#9ca3af' }
  const up = value >= 0
  const good = goodWhenUp ? up : !up
  return { text:`${up ? 'Up' : 'Down'} ${Math.abs(Math.round(value))}% vs last month`, color: good ? '#15803d' : '#b91c1c' }
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background:'#fff', border:'1px solid #e3e7ee', borderRadius:'18px', boxShadow:'0 2px 12px rgba(15,23,42,.05)', overflow:'hidden', ...style }}>
      {children}
    </div>
  )
}

function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  const t = toneMap[tone]
  return <span style={{ display:'inline-flex', border:`1px solid ${t.border}`, background:t.bg, color:t.color, borderRadius:999, padding:'4px 9px', fontSize:10.5, fontWeight:900, textTransform:'uppercase', letterSpacing:'.4px' }}>{children}</span>
}

function SectionHead({ title, subtitle, right }: { title:string; subtitle?:string; right?:React.ReactNode }) {
  return (
    <div style={{ padding:'15px 16px', borderBottom:'1px solid #eef2f7', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
      <div>
        <div style={{ fontSize:14, fontWeight:950, color:'#111827' }}>{title}</div>
        {subtitle && <div style={{ fontSize:11.5, color:'#9ca3af', marginTop:3, lineHeight:1.45 }}>{subtitle}</div>}
      </div>
      {right}
    </div>
  )
}

function ProgressBar({ value, color = '#1a5c42' }: { value:number; color?:string }) {
  return (
    <div style={{ height:7, background:'#f3f4f6', borderRadius:999, overflow:'hidden' }}>
      <div style={{ height:'100%', width:`${Math.max(0, Math.min(100, value))}%`, background:color, borderRadius:999 }} />
    </div>
  )
}

function MetricCard({ label, value, note, tone = 'neutral' }: { label:string; value:string; note:string; tone?:Tone }) {
  const t = toneMap[tone]
  return (
    <div style={{ background:t.bg, border:`1px solid ${t.border}`, borderRadius:14, padding:'13px 14px' }}>
      <div style={{ fontSize:10, color:'#6b7280', textTransform:'uppercase', letterSpacing:'.7px', fontWeight:900 }}>{label}</div>
      <div style={{ marginTop:7, color:t.color, fontSize:20, fontWeight:950, fontFamily:'var(--font-mono), monospace', letterSpacing:'-.6px' }}>{value}</div>
      <div style={{ marginTop:7, color:'#6b7280', fontSize:11.5, lineHeight:1.45 }}>{note}</div>
    </div>
  )
}

function EmptyAdvisor() {
  return (
    <Card>
      <div style={{ padding:18, fontSize:13, color:'#6b7280', lineHeight:1.55 }}>
        FiNK belum bisa membaca data Advisor. Coba buka kembali setelah data bulan ini tersimpan.
      </div>
    </Card>
  )
}

export default function FinancialDoctorPage() {
  const { curMonth, curYear } = useMonthContext()
  const [summary, setSummary] = useState<AdvisorSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/advisor/summary?month=${curMonth}&year=${curYear}`, { cache:'no-store' })
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(json => {
        if (!cancelled) setSummary(json.data || null)
      })
      .catch(() => {
        if (!cancelled) {
          setSummary(null)
          setError('Failed to load Advisor summary.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [curMonth, curYear])

  if (loading) {
    return (
      <div style={{ minHeight:'45vh', display:'flex', alignItems:'center', justifyContent:'center', color:'#9ca3af', fontSize:13 }}>
        Loading Advisor...
      </div>
    )
  }

  const data = summary

  return (
    <div className="advisor-page">
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:14, flexWrap:'wrap', marginBottom:14 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:950, color:'#111827', letterSpacing:'-.6px', margin:0 }}>
            Advisor
          </h1>
          <p style={{ margin:'5px 0 0', color:'#6b7280', fontSize:12.5, lineHeight:1.55 }}>
            Personal financial planner to read your condition, set priorities, and protect your goals for {MONTH_NAMES[curMonth]} {curYear}.
          </p>
        </div>
        {data && <Badge tone={data.status}>{data.statusLabel}</Badge>}
      </div>

      {error && <Card style={{ marginBottom:14, borderColor:'#fecaca', background:'#fef2f2' }}><div style={{ padding:14, color:'#991b1b', fontSize:12.5 }}>{error}</div></Card>}
      {!data ? <EmptyAdvisor /> : (
        <>
          <div className="advisor-hero-grid" style={{ display:'grid', gridTemplateColumns:'minmax(240px,.72fr) minmax(0,1.28fr)', gap:14, marginBottom:14 }}>
            <Card>
              <div style={{ padding:'19px 18px', display:'flex', flexDirection:'column', gap:13 }}>
                <div style={{ fontSize:12, fontWeight:900, color:'#6b7280', textTransform:'uppercase', letterSpacing:'.8px' }}>Financial Health</div>
                <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
                  <div style={{ fontSize:56, lineHeight:1, fontWeight:950, color:toneMap[data.status].color, fontFamily:'var(--font-mono), monospace', letterSpacing:'-2px' }}>
                    {data.score}
                  </div>
                  <div style={{ fontSize:16, color:'#9ca3af', fontWeight:800 }}>/100</div>
                </div>
                <ProgressBar value={data.score} color={toneMap[data.status].color} />
                <div style={{ fontSize:12.3, color:'#6b7280', lineHeight:1.55 }}>
                  Score is based on cashflow, saving rate, expense rate, debt burden, and active goal progress.
                </div>
              </div>
            </Card>

            <Card style={{ background:'linear-gradient(135deg, #f0fdf4 0%, #ffffff 58%, #eff6ff 100%)' }}>
              <div style={{ padding:'18px 18px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                  <div style={{ width:34, height:34, borderRadius:12, background:'#dcfce7', color:'#166534', display:'flex', alignItems:'center', justifyContent:'center' }}><AppIcon name="insight" size={17} /></div>
                  <div>
                    <div style={{ fontSize:14, fontWeight:950, color:'#111827' }}>Today's Insight</div>
                    <div style={{ fontSize:11.5, color:'#9ca3af' }}>The most important reading from this month's data</div>
                  </div>
                </div>
                <div style={{ fontSize:15, lineHeight:1.65, color:'#1f2937', fontWeight:650 }}>
                  {data.mainInsight}
                </div>
              </div>
            </Card>
          </div>

          <div className="advisor-metric-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:10, marginBottom:14 }}>
            <MetricCard label="Cashflow" value={fmt(data.monthly.cashflow)} tone={data.monthly.cashflow >= 0 ? 'good' : 'danger'} note="Income - expense - saving" />
            <MetricCard label="Saving Rate" value={pct(data.ratios.savingRate)} tone={data.ratios.savingRate >= 20 ? 'good' : data.ratios.savingRate >= 10 ? 'warning' : 'danger'} note={deltaText(data.deltas.savingRateVsPrev, true).text} />
            <MetricCard label="Expense Rate" value={pct(data.ratios.expenseRate)} tone={data.ratios.expenseRate <= 70 ? 'good' : data.ratios.expenseRate <= 85 ? 'warning' : 'danger'} note={deltaText(data.deltas.expenseVsPrev, false).text} />
            <MetricCard label="Debt Ratio" value={pct(data.ratios.debtRatio)} tone={data.ratios.debtRatio <= 25 ? 'good' : data.ratios.debtRatio <= 35 ? 'warning' : 'danger'} note="Debt payment ratio against income" />
          </div>

          <div className="advisor-main-grid" style={{ display:'grid', gridTemplateColumns:'minmax(0,1.08fr) minmax(320px,.92fr)', gap:14 }}>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <Card>
                <SectionHead title="Priority Actions" subtitle="The most logical action order for this month." right={<Badge tone="neutral">Planner</Badge>} />
                <div style={{ padding:14, display:'flex', flexDirection:'column', gap:10 }}>
                  {data.priorities.map((item, idx) => {
                    const tone = priorityTone[item.level]
                    const t = toneMap[tone]
                    return (
                      <div key={idx} style={{ border:`1px solid ${t.border}`, borderRadius:14, padding:'12px 13px', background:t.bg }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
                          <div style={{ fontSize:12.8, fontWeight:950, color:'#111827' }}>{idx + 1}. {item.title}</div>
                          <Badge tone={tone}>{item.level}</Badge>
                        </div>
                        <div style={{ marginTop:7, fontSize:12.2, color:'#4b5563', lineHeight:1.55 }}>{item.detail}</div>
                      </div>
                    )
                  })}
                </div>
              </Card>

              <Card>
                <SectionHead title="Money Risks" subtitle="Early signals to watch before they become problems." />
                <div style={{ padding:14, display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:10 }}>
                  {data.risks.map((risk, idx) => {
                    const t = toneMap[risk.tone]
                    return (
                      <div key={idx} style={{ border:`1px solid ${t.border}`, background:t.bg, borderRadius:13, padding:'12px 13px' }}>
                        <div style={{ fontSize:12.5, fontWeight:950, color:t.color }}>{risk.title}</div>
                        <div style={{ marginTop:6, fontSize:12, color:'#4b5563', lineHeight:1.5 }}>{risk.detail}</div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <Card>
                <SectionHead title="Current Focus Goals" subtitle="Goals FiNK recommends watching first." right={<Badge tone="neutral">Auto + Manual</Badge>} />
                <div style={{ padding:14, display:'flex', flexDirection:'column', gap:10 }}>
                  {data.focusGoals && data.focusGoals.length > 0 ? data.focusGoals.map((goal) => {
                    const tone: Tone = goal.priority === 'critical' || goal.priority === 'high' ? 'danger' : goal.priority === 'medium' ? 'warning' : goal.priority === 'maintain' ? 'good' : 'neutral'
                    const t = toneMap[tone]
                    return (
                      <div key={goal.id} style={{ border:`1px solid ${t.border}`, background:t.bg, borderRadius:13, padding:'12px 13px' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}>
                          <div>
                            <div style={{ fontSize:12.8, fontWeight:950, color:'#111827' }}>{goal.name}</div>
                            <div style={{ fontSize:11.3, color:'#6b7280', marginTop:3 }}>{goal.healthLabel} · {goal.mode === 'manual' ? 'Manual' : 'Auto'} priority</div>
                          </div>
                          <Badge tone={tone}>{goal.priorityLabel}</Badge>
                        </div>
                        <div style={{ marginTop:9 }}><ProgressBar value={goal.progress} color={t.color} /></div>
                        <div style={{ marginTop:8, fontSize:11.8, color:'#4b5563', lineHeight:1.5 }}>{goal.recommendation}</div>
                      </div>
                    )
                  }) : (
                    <div style={{ fontSize:12.5, color:'#6b7280', lineHeight:1.55 }}>No focus goals yet. Mark 1–3 goals as focus in Goals, or let FiNK auto-prioritize urgent goals.</div>
                  )}
                </div>
              </Card>

              <Card>
                <SectionHead title="Goal Planning Queue" subtitle="All active goals ordered by Advisor priority, not by creation date." right={<Badge tone="neutral">Goal Engine</Badge>} />
                <div style={{ padding:14, display:'flex', flexDirection:'column', gap:8 }}>
                  {data.goalInsights && data.goalInsights.length > 0 ? data.goalInsights.map((goal, idx) => {
                    const tone: Tone = goal.priority === 'critical' || goal.priority === 'high' ? 'danger' : goal.priority === 'medium' ? 'warning' : goal.priority === 'maintain' ? 'good' : 'neutral'
                    const t = toneMap[tone]
                    return (
                      <div key={goal.id} style={{ display:'grid', gridTemplateColumns:'22px minmax(0,1fr) auto', gap:10, alignItems:'center', border:'1px solid #eef2f7', borderRadius:12, padding:'10px 11px', background:'#fff' }}>
                        <div style={{ width:22, height:22, borderRadius:999, background:t.soft, color:t.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:950 }}>{idx + 1}</div>
                        <div style={{ minWidth:0 }}>
                          <div style={{ fontSize:12.5, color:'#111827', fontWeight:950, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{goal.name}</div>
                          <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>{goal.typeLabel || 'Goal'} · {goal.healthLabel} · {goal.mode === 'manual' ? 'Manual' : 'Auto'}</div>
                        </div>
                        <Badge tone={tone}>{goal.priorityLabel}</Badge>
                      </div>
                    )
                  }) : (
                    <div style={{ fontSize:12.5, color:'#6b7280', lineHeight:1.55 }}>No active goals yet.</div>
                  )}
                </div>
              </Card>

              <Card>
                <SectionHead title="Next Milestone" subtitle="The active goal that needs the most attention." />
                <div style={{ padding:15 }}>
                  {data.milestone ? (
                    <>
                      <div style={{ display:'flex', justifyContent:'space-between', gap:12, marginBottom:10 }}>
                        <div>
                          <div style={{ fontSize:14, fontWeight:950, color:'#111827' }}>{data.milestone.title}</div>
                          <div style={{ fontSize:11.5, color:'#9ca3af', marginTop:3 }}>{data.milestone.detail}</div>
                        </div>
                        <div style={{ fontSize:14, fontWeight:950, color:'#1d4ed8', fontFamily:'var(--font-mono), monospace' }}>{pct(data.milestone.progress)}</div>
                      </div>
                      <ProgressBar value={data.milestone.progress} color="#1d4ed8" />
                      <div style={{ display:'flex', justifyContent:'space-between', marginTop:8, fontSize:11, color:'#6b7280', fontFamily:'var(--font-mono), monospace' }}>
                        <span>{fmt(data.milestone.current)}</span>
                        <span>{fmt(data.milestone.target)}</span>
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize:12.5, color:'#6b7280', lineHeight:1.55 }}>
                      No active goal yet. Add goals so Advisor can recommend more personal priorities.
                    </div>
                  )}
                </div>
              </Card>

              <Card>
                <SectionHead title="Monthly Pattern" subtitle="Quick reading versus last month and 3-month averages." />
                <div style={{ padding:14, display:'flex', flexDirection:'column', gap:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', gap:10, borderBottom:'1px solid #f3f4f6', paddingBottom:9 }}>
                    <span style={{ fontSize:12.3, color:'#4b5563', fontWeight:800 }}>Income</span>
                    <span style={{ fontSize:12.3, color:deltaText(data.deltas.incomeVsPrev, true).color, fontWeight:900 }}>{deltaText(data.deltas.incomeVsPrev, true).text}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', gap:10, borderBottom:'1px solid #f3f4f6', paddingBottom:9 }}>
                    <span style={{ fontSize:12.3, color:'#4b5563', fontWeight:800 }}>Expense</span>
                    <span style={{ fontSize:12.3, color:deltaText(data.deltas.expenseVsPrev, false).color, fontWeight:900 }}>{deltaText(data.deltas.expenseVsPrev, false).text}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', gap:10 }}>
                    <span style={{ fontSize:12.3, color:'#4b5563', fontWeight:800 }}>Avg saving 3 months</span>
                    <span style={{ fontSize:12.3, color:'#111827', fontWeight:900, fontFamily:'var(--font-mono), monospace' }}>{fmt(data.averages.saving3m)}</span>
                  </div>
                </div>
              </Card>

              <Card>
                <SectionHead title="My Guide" subtitle="A simple flow to keep FiNK acting like a planner." />
                <div style={{ padding:14, display:'flex', flexDirection:'column', gap:9 }}>
                  {[
                    ['Record this month's transactions', data.monthly.transactionCount > 0],
                    ['Keep cashflow positive', data.monthly.cashflow >= 0],
                    ['Reach at least 10% saving rate', data.ratios.savingRate >= 10],
                    ['Review focus goals in Advisor', !!(data.focusGoals && data.focusGoals.length)],
                  ].map(([label, done], idx) => (
                    <div key={idx} style={{ display:'flex', alignItems:'center', gap:9, fontSize:12.3, color:'#374151' }}>
                      <span style={{ width:22, height:22, borderRadius:999, background:done ? '#dcfce7' : '#f3f4f6', color:done ? '#166534' : '#9ca3af', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:950 }}>{done ? <AppIcon name="check" size={12} /> : idx + 1}</span>
                      <span style={{ fontWeight:800 }}>{label}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </>
      )}

      <style>{`
        @media (max-width: 920px) {
          .advisor-page .advisor-hero-grid,
          .advisor-page .advisor-main-grid {
            grid-template-columns: 1fr !important;
          }
          .advisor-page .advisor-metric-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        @media (max-width: 560px) {
          .advisor-page .advisor-metric-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
