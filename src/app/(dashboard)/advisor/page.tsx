'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useMonthContext, MONTH_NAMES } from '@/components/layout/DashboardShell'
import { AppIcon, SectionCard, SectionHeader, MetricCard as DesignMetricCard, StatusBadge, PremiumLockCard } from '@/components/ui/design'
import { useSubscription } from '@/hooks/useSubscription'

type Tone = 'good' | 'warning' | 'danger' | 'neutral'
type Priority = 'high' | 'medium' | 'low'
type TargetPriority = 'critical' | 'high' | 'medium' | 'low' | 'maintain' | 'paused'

type TargetPlannerItem = {
  id: string
  name: string
  priority: TargetPriority
  priorityLabel: string
  healthLabel: string
  recommendation: string
  reason: string
  progress: number
  current: number
  target: number
  monthly?: number
  monthlyNeeded?: number
  idealMonthly?: number
  suggestedMonthly?: number
  gap?: number
  monthsLeft?: number
  etaLabel?: string
  realisticEtaLabel?: string
  feasibilityLabel?: string
  feasibilityMessage?: string
  allocationGap?: number
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
  goalInsights: TargetPlannerItem[]
  focusTargets: TargetPlannerItem[]
  goalPlan: {
    safeCapacity: number
    totalIdealMonthly: number
    allocatedMonthly: number
    capacityGap: number
    status: 'healthy' | 'stretched' | 'overloaded' | 'no_capacity'
    statusLabel: string
    message: string
  }
  tradeoffs: { tone: Tone; title: string; detail: string }[]
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
  if (value === null || !Number.isFinite(value)) return { text:'Belum ada data perbandingan', color:'#9ca3af' }
  const up = value >= 0
  const good = goodWhenUp ? up : !up
  return { text:`${up ? 'Up' : 'Down'} ${Math.abs(Math.round(value))}% vs last month`, color: good ? '#15803d' : '#b91c1c' }
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <SectionCard
      style={{
        marginBottom: 0,
        borderRadius: 18,
        overflow: 'hidden',
        ...style,
      }}
      bodyStyle={{ padding: 0 }}
    >
      {children}
    </SectionCard>
  )
}

function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  const mappedTone = tone === 'good' ? 'success' : tone === 'neutral' ? 'default' : tone
  return <StatusBadge tone={mappedTone}>{children}</StatusBadge>
}

function SectionHead({ title, subtitle, right }: { title:string; subtitle?:string; right?:React.ReactNode }) {
  return (
    <SectionHeader
      title={title}
      subtitle={subtitle}
      right={right}
    />
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
  const mappedTone = tone === 'good' ? 'success' : tone === 'neutral' ? 'default' : tone
  return (
    <DesignMetricCard
      label={label}
      value={value}
      note={note}
      tone={mappedTone}
      style={{ borderRadius: 14 }}
    />
  )
}


function PremiumAdvisorLock() {
  return (
    <PremiumLockCard
      title="Fitur advisor lanjutan hanya untuk member Premium"
      subtitle="Akun Free tetap dapat menggunakan Financial Health dan Today's Insight. Upgrade untuk membuka analisis penuh, forecasting, prioritas keuangan, dan rekomendasi target."
      actionLabel="Upgrade Premium"
      href="/upgrade"
      items={[
        'Analisis arus kas',
        'Detail rasio tabungan dan pengeluaran',
        'Perencanaan target realistis',
        'Prioritas tindakan keuangan',
        'Analisis risiko keuangan',
        'Analisis trade-off keuangan',
        'Urutan prioritas target',
        'Analisis pola bulanan',
      ]}
      style={{ marginTop: 14 }}
    />
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
  const { isPremium, isAdmin, isSuperAdmin, loading: subscriptionLoading } = useSubscription()
  const hasPremiumAccess = isPremium || isAdmin || isSuperAdmin

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
          setError('Gagal memuat ringkasan Advisor.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [curMonth, curYear])

  if (loading || subscriptionLoading) {
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
                    <div style={{ fontSize:11.5, color:'#9ca3af' }}>Ringkasan paling penting dari kondisi keuangan bulan ini's data</div>
                  </div>
                </div>
                <div style={{ fontSize:15, lineHeight:1.65, color:'#1f2937', fontWeight:650 }}>
                  {data.mainInsight}
                </div>
              </div>
            </Card>
          </div>

          {!hasPremiumAccess ? <PremiumAdvisorLock /> : (
          <>
                    <div className="advisor-metric-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:10, marginBottom:14 }}>
            <MetricCard label="Cashflow" value={fmt(data.monthly.cashflow)} tone={data.monthly.cashflow >= 0 ? 'good' : 'danger'} note="Pemasukan - pengeluaran - tabungan" />
            <MetricCard label="Saving Rate" value={pct(data.ratios.savingRate)} tone={data.ratios.savingRate >= 20 ? 'good' : data.ratios.savingRate >= 10 ? 'warning' : 'danger'} note={deltaText(data.deltas.savingRateVsPrev, true).text} />
            <MetricCard label="Expense Rate" value={pct(data.ratios.expenseRate)} tone={data.ratios.expenseRate <= 70 ? 'good' : data.ratios.expenseRate <= 85 ? 'warning' : 'danger'} note={deltaText(data.deltas.expenseVsPrev, false).text} />
            <MetricCard label="Debt Ratio" value={pct(data.ratios.debtRatio)} tone={data.ratios.debtRatio <= 25 ? 'good' : data.ratios.debtRatio <= 35 ? 'warning' : 'danger'} note="Rasio cicilan terhadap pemasukan" />
          </div>

          <Card style={{ marginBottom:14 }}>
            <SectionHead
              title="Realistic Target Plan"
              subtitle="Alokasi disesuaikan dengan pemasukan agar rekomendasi tetap realistis dan tidak memaksa."
              right={<Badge tone={data.goalPlan.status === 'healthy' ? 'good' : data.goalPlan.status === 'stretched' ? 'warning' : 'danger'}>{data.goalPlan.statusLabel}</Badge>}
            />
            <div style={{ padding:14, display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:10 }} className="advisor-plan-grid">
              <MetricCard label="Safe Capacity" value={fmt(data.goalPlan.safeCapacity)} tone={data.goalPlan.safeCapacity > 0 ? 'good' : 'danger'} note="Perkiraan ruang alokasi bulanan" />
              <MetricCard label="Ideal Need" value={fmt(data.goalPlan.totalIdealMonthly)} tone={data.goalPlan.totalIdealMonthly <= data.goalPlan.safeCapacity ? 'good' : 'warning'} note="To keep selected timelines" />
              <MetricCard label="Gap" value={fmt(data.goalPlan.capacityGap)} tone={data.goalPlan.capacityGap <= 0 ? 'good' : 'danger'} note="Butuh tambahan pemasukan, waktu, atau penyesuaian target" />
            </div>
            <div style={{ padding:'0 14px 14px', color:'#4b5563', fontSize:12.4, lineHeight:1.55 }}>
              {data.goalPlan.message}
            </div>
          </Card>

          <div className="advisor-main-grid" style={{ display:'grid', gridTemplateColumns:'minmax(0,1.08fr) minmax(320px,.92fr)', gap:14 }}>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <Card>
                <SectionHead title="Priority Actions" subtitle="Urutan tindakan paling masuk akal untuk bulan ini." right={<Badge tone="neutral">Planner</Badge>} />
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

              <Card>
                <SectionHead title="Trade-off Analysis" subtitle="Catatan realistis tentang pemasukan, timeline, dan pilihan fokus." />
                <div style={{ padding:14, display:'flex', flexDirection:'column', gap:10 }}>
                  {data.tradeoffs.map((item, idx) => {
                    const t = toneMap[item.tone]
                    return (
                      <div key={idx} style={{ border:`1px solid ${t.border}`, background:t.bg, borderRadius:13, padding:'12px 13px' }}>
                        <div style={{ fontSize:12.5, fontWeight:950, color:t.color }}>{item.title}</div>
                        <div style={{ marginTop:6, fontSize:12, color:'#4b5563', lineHeight:1.55 }}>{item.detail}</div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <Card>
                <SectionHead title="Current Focus Targets" subtitle="Target yang sebaiknya dipantau terlebih dahulu menurut FiNK." right={<Badge tone="neutral">Otomatis + Manual</Badge>} />
                <div style={{ padding:14, display:'flex', flexDirection:'column', gap:10 }}>
                  {data.focusTargets && data.focusTargets.length > 0 ? data.focusTargets.map((goal) => {
                    const tone: Tone = goal.priority === 'critical' || goal.priority === 'high' ? 'danger' : goal.priority === 'medium' ? 'warning' : goal.priority === 'maintain' ? 'good' : 'neutral'
                    const t = toneMap[tone]
                    return (
                      <div key={goal.id} style={{ border:`1px solid ${t.border}`, background:t.bg, borderRadius:13, padding:'12px 13px' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}>
                          <div>
                            <div style={{ fontSize:12.8, fontWeight:950, color:'#111827' }}>{goal.name}</div>
                            <div style={{ fontSize:11.3, color:'#6b7280', marginTop:3 }}>{goal.healthLabel} · {goal.mode === 'manual' ? 'Manual' : 'Otomatis'} priority</div>
                          </div>
                          <Badge tone={tone}>{goal.priorityLabel}</Badge>
                        </div>
                        <div style={{ marginTop:9 }}><ProgressBar value={goal.progress} color={t.color} /></div>
                        <div style={{ marginTop:8, fontSize:11.8, color:'#4b5563', lineHeight:1.5 }}>{goal.recommendation}</div>
                        <div style={{ marginTop:8, display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                          <div style={{ background:'#fff', border:'1px solid rgba(148,163,184,.22)', borderRadius:10, padding:'8px 9px' }}>
                            <div style={{ fontSize:10, color:'#94a3b8', fontWeight:900, textTransform:'uppercase', letterSpacing:'.5px' }}>Rekomendasi</div>
                            <div style={{ marginTop:3, fontSize:12, color:'#111827', fontWeight:950, fontFamily:'var(--font-mono), monospace' }}>{fmt(goal.suggestedMonthly || 0)}</div>
                          </div>
                          <div style={{ background:'#fff', border:'1px solid rgba(148,163,184,.22)', borderRadius:10, padding:'8px 9px' }}>
                            <div style={{ fontSize:10, color:'#94a3b8', fontWeight:900, textTransform:'uppercase', letterSpacing:'.5px' }}>Estimasi realistis</div>
                            <div style={{ marginTop:3, fontSize:12, color:'#111827', fontWeight:950 }}>{goal.realisticEtaLabel || 'Belum ada estimasi'}</div>
                          </div>
                        </div>
                        <div style={{ marginTop:8, fontSize:11.3, color:t.color, fontWeight:850 }}>{goal.feasibilityLabel || 'Cek realistis'}</div>
                      </div>
                    )
                  }) : (
                    <div style={{ fontSize:12.5, color:'#6b7280', lineHeight:1.55 }}>Belum ada target fokus. Tandai 1–3 target sebagai fokus di halaman Targets, atau biarkan FiNK memprioritaskan target yang paling mendesak secara otomatis.</div>
                  )}
                </div>
              </Card>

              <Card>
                <SectionHead title="Target Perencanaan Queue" subtitle="Semua target aktif diurutkan berdasarkan prioritas Advisor, bukan tanggal pembuatan." right={<Badge tone="neutral">Mesin Target</Badge>} />
                <div style={{ padding:14, display:'flex', flexDirection:'column', gap:8 }}>
                  {data.goalInsights && data.goalInsights.length > 0 ? data.goalInsights.map((goal, idx) => {
                    const tone: Tone = goal.priority === 'critical' || goal.priority === 'high' ? 'danger' : goal.priority === 'medium' ? 'warning' : goal.priority === 'maintain' ? 'good' : 'neutral'
                    const t = toneMap[tone]
                    return (
                      <div key={goal.id} style={{ display:'grid', gridTemplateColumns:'22px minmax(0,1fr) auto', gap:10, alignItems:'center', border:'1px solid #eef2f7', borderRadius:12, padding:'10px 11px', background:'#fff' }}>
                        <div style={{ width:22, height:22, borderRadius:999, background:t.soft, color:t.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:950 }}>{idx + 1}</div>
                        <div style={{ minWidth:0 }}>
                          <div style={{ fontSize:12.5, color:'#111827', fontWeight:950, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{goal.name}</div>
                          <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>{goal.typeLabel || 'Target'} · {goal.healthLabel} · {goal.feasibilityLabel || 'Perencanaan'}</div>
                        </div>
                        <Badge tone={tone}>{goal.priorityLabel}</Badge>
                      </div>
                    )
                  }) : (
                    <div style={{ fontSize:12.5, color:'#6b7280', lineHeight:1.55 }}>Belum ada target aktif.</div>
                  )}
                </div>
              </Card>

              <Card>
                <SectionHead title="Next Milestone" subtitle="Target aktif yang paling membutuhkan perhatian." />
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
                      Belum ada target aktif. Add goals so Advisor can recommend more personal priorities.
                    </div>
                  )}
                </div>
              </Card>

              <Card>
                <SectionHead title="Monthly Pattern" subtitle="Ringkasan singkat dibanding bulan lalu dan rata-rata 3 bulan." />
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
                    <span style={{ fontSize:12.3, color:'#4b5563', fontWeight:800 }}>Rata-rata tabungan 3 bulan</span>
                    <span style={{ fontSize:12.3, color:'#111827', fontWeight:900, fontFamily:'var(--font-mono), monospace' }}>{fmt(data.averages.saving3m)}</span>
                  </div>
                </div>
              </Card>

              <Card>
                <SectionHead title="My Guide" subtitle="Alur sederhana agar FiNK tetap membantu seperti planner pribadi." />
                <div style={{ padding:14, display:'flex', flexDirection:'column', gap:9 }}>
                  {[
                    ["Catat transaksi bulan ini", data.monthly.transactionCount > 0],
                    ['Jaga arus kas tetap positif', data.monthly.cashflow >= 0],
                    ['Capai rasio tabungan minimal 10%', data.ratios.savingRate >= 10],
                    ['Tinjau target prioritas di Advisor', !!(data.focusTargets && data.focusTargets.length)],
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
        </>
      )}

      <style>{`
        @media (max-width: 920px) {
          .advisor-page .advisor-hero-grid,
          .advisor-page .advisor-main-grid {
            grid-template-columns: 1fr !important;
          }
          .advisor-page .advisor-metric-grid,
          .advisor-page .advisor-plan-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        @media (max-width: 560px) {
          .advisor-page .advisor-metric-grid,
          .advisor-page .advisor-plan-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
