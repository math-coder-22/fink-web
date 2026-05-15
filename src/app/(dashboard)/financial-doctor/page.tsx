'use client'

import { useEffect, useState } from 'react'
import { useMonthContext, MONTH_NAMES } from '@/components/layout/DashboardShell'
import { AppIcon } from '@/components/ui/design'

type Tone = 'good' | 'warning' | 'danger' | 'neutral'
type Priority = 'high' | 'medium' | 'low'

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
  if (value === null || !Number.isFinite(value)) return { text:'Belum ada pembanding', color:'#9ca3af' }
  const up = value >= 0
  const good = goodWhenUp ? up : !up
  return { text:`${up ? 'Naik' : 'Turun'} ${Math.abs(Math.round(value))}% vs bulan lalu`, color: good ? '#15803d' : '#b91c1c' }
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
          setError('Gagal memuat ringkasan Advisor.')
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
        Memuat Advisor...
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
            Pendamping keuangan pribadi untuk membaca kondisi, menentukan prioritas, dan menjaga target {MONTH_NAMES[curMonth]} {curYear}.
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
                  Skor dihitung dari cashflow, saving rate, expense rate, rasio cicilan, dan progres target aktif.
                </div>
              </div>
            </Card>

            <Card style={{ background:'linear-gradient(135deg, #f0fdf4 0%, #ffffff 58%, #eff6ff 100%)' }}>
              <div style={{ padding:'18px 18px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                  <div style={{ width:34, height:34, borderRadius:12, background:'#dcfce7', color:'#166534', display:'flex', alignItems:'center', justifyContent:'center' }}><AppIcon name="insight" size={17} /></div>
                  <div>
                    <div style={{ fontSize:14, fontWeight:950, color:'#111827' }}>Today's Insight</div>
                    <div style={{ fontSize:11.5, color:'#9ca3af' }}>Ringkasan paling penting dari data bulan ini</div>
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
            <MetricCard label="Debt Ratio" value={pct(data.ratios.debtRatio)} tone={data.ratios.debtRatio <= 25 ? 'good' : data.ratios.debtRatio <= 35 ? 'warning' : 'danger'} note="Rasio cicilan terhadap income" />
          </div>

          <div className="advisor-main-grid" style={{ display:'grid', gridTemplateColumns:'minmax(0,1.08fr) minmax(320px,.92fr)', gap:14 }}>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <Card>
                <SectionHead title="Langkah Prioritas" subtitle="Urutan aksi yang paling masuk akal untuk bulan ini." right={<Badge tone="neutral">Planner</Badge>} />
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
                <SectionHead title="Money Risks" subtitle="Sinyal awal yang perlu diperhatikan sebelum menjadi masalah." />
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
                <SectionHead title="Next Milestone" subtitle="Target aktif yang paling perlu dipantau." />
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
                      Belum ada target aktif. Tambahkan target di Goals agar Advisor bisa memberi prioritas yang lebih personal.
                    </div>
                  )}
                </div>
              </Card>

              <Card>
                <SectionHead title="Monthly Pattern" subtitle="Pembacaan cepat dibanding bulan sebelumnya dan rata-rata 3 bulan." />
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
                    <span style={{ fontSize:12.3, color:'#4b5563', fontWeight:800 }}>Avg saving 3 bulan</span>
                    <span style={{ fontSize:12.3, color:'#111827', fontWeight:900, fontFamily:'var(--font-mono), monospace' }}>{fmt(data.averages.saving3m)}</span>
                  </div>
                </div>
              </Card>

              <Card>
                <SectionHead title="My Guide" subtitle="Alur sederhana agar FiNK terasa seperti pendamping." />
                <div style={{ padding:14, display:'flex', flexDirection:'column', gap:9 }}>
                  {[
                    ['Catat transaksi bulan ini', data.monthly.transactionCount > 0],
                    ['Jaga cashflow positif', data.monthly.cashflow >= 0],
                    ['Capai saving rate minimal 10%', data.ratios.savingRate >= 10],
                    ['Pantau target aktif di Goals', !!data.milestone],
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
