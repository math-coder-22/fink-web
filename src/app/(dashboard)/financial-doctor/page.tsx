'use client'

import { useMemo } from 'react'
import { useMonthContext, MONTH_NAMES } from '@/components/layout/DashboardShell'
import { useBulanan } from '@/hooks/useBulanan'
import { analyzeFinancialDoctor } from '@/lib/financial-doctor/engine'

const toneMap = {
  good: { bg:'#f0fdf4', border:'#bbf7d0', color:'#166534' },
  warning: { bg:'#fffbeb', border:'#fde68a', color:'#92400e' },
  danger: { bg:'#fef2f2', border:'#fecaca', color:'#991b1b' },
  neutral: { bg:'#f7f8fa', border:'#e3e7ee', color:'#4b5563' },
} as const

const fmt = (n: number) => 'Rp ' + Math.abs(Math.round(n || 0)).toLocaleString('id-ID')
const MONTH_INDEX: Record<string, number> = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 }

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background:'#fff', border:'1px solid #e3e7ee', borderRadius:'16px', boxShadow:'0 2px 10px rgba(15,23,42,.05)', overflow:'hidden', ...style }}>
      {children}
    </div>
  )
}

function SectionHead({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ padding:'15px 16px', borderBottom:'1px solid #eef2f7' }}>
      <div style={{ fontSize:'14px', fontWeight:900, color:'#111827' }}>{title}</div>
      {subtitle && <div style={{ fontSize:'11.5px', color:'#9ca3af', marginTop:3, lineHeight:1.45 }}>{subtitle}</div>}
    </div>
  )
}

function Badge({ tone, children }: { tone: keyof typeof toneMap; children: React.ReactNode }) {
  const t = toneMap[tone]
  return (
    <span style={{ display:'inline-flex', alignItems:'center', border:`1px solid ${t.border}`, background:t.bg, color:t.color, borderRadius:'999px', padding:'4px 9px', fontSize:'10.5px', fontWeight:900, textTransform:'uppercase', letterSpacing:'.45px' }}>
      {children}
    </span>
  )
}

function MetricCard({ label, value, status, note }: { label: string; value: string; status: keyof typeof toneMap; note: string }) {
  const t = toneMap[status]
  return (
    <div style={{ background:t.bg, border:`1px solid ${t.border}`, borderRadius:'13px', padding:'13px 14px' }}>
      <div style={{ fontSize:'10px', color:'#6b7280', textTransform:'uppercase', letterSpacing:'.7px', fontWeight:900 }}>{label}</div>
      <div style={{ marginTop:7, color:t.color, fontSize:'20px', fontWeight:900, fontFamily:'JetBrains Mono, monospace', letterSpacing:'-.6px' }}>{value}</div>
      <div style={{ marginTop:7, color:'#6b7280', fontSize:'11.5px', lineHeight:1.45 }}>{note}</div>
    </div>
  )
}

export default function FinancialDoctorPage() {
  const { curMonth, curYear } = useMonthContext()
  const {
    tx,
    loading,
    computedBudget,
    computedIncome,
    computedSaving,
  } = useBulanan({ curMonth, curYear })

  const result = useMemo(() => {
    const now = new Date()
    const daysInMonth = new Date(curYear, (MONTH_INDEX[curMonth] ?? now.getMonth()) + 1, 0).getDate()

    const budget = computedBudget()
    const income = computedIncome()
    const saving = computedSaving()

    return analyzeFinancialDoctor({
      tx,
      budget,
      income,
      saving,
      currentDay: now.getDate(),
      daysInMonth,
    })
  }, [tx, computedBudget, computedIncome, computedSaving, curYear])

  const scoreTone = result.statusTone
  const scoreColor = toneMap[scoreTone]

  if (loading) {
    return (
      <div style={{ minHeight:'45vh', display:'flex', alignItems:'center', justifyContent:'center', color:'#9ca3af', fontSize:13 }}>
        Memuat Financial Doctor...
      </div>
    )
  }

  return (
    <div>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:14, flexWrap:'wrap', marginBottom:14 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:950, color:'#111827', letterSpacing:'-.6px', margin:0 }}>
            🩺 Financial Doctor
          </h1>
          <p style={{ margin:'5px 0 0', color:'#6b7280', fontSize:12.5, lineHeight:1.55 }}>
            Check-up, diagnosis, dan treatment plan keuangan untuk {MONTH_NAMES[curMonth]} {curYear}.
          </p>
        </div>
        <Badge tone={result.observationReady ? 'good' : 'warning'}>
          {result.observationReady ? 'Data cukup' : `${result.observationDays} hari data`}
        </Badge>
      </div>

      {!result.observationReady && (
        <Card style={{ marginBottom:14, borderColor:'#fde68a', background:'#fffbeb' }}>
          <div style={{ padding:14, color:'#92400e', fontSize:12.5, lineHeight:1.55 }}>
            <b>Mode Observasi:</b> FiNK sudah bisa memberi masukan awal, tetapi rekomendasi akan lebih akurat setelah pencatatan minimal 20–30 hari.
          </div>
        </Card>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'minmax(230px, .8fr) minmax(0, 1.2fr)', gap:14, marginBottom:14 }} className="doctor-top-grid">
        <Card>
          <div style={{ padding:'18px 18px 16px', display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ fontSize:12, fontWeight:900, color:'#6b7280', textTransform:'uppercase', letterSpacing:'.8px' }}>FiNK Score</div>
            <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
              <div style={{ fontSize:52, lineHeight:1, fontWeight:950, color:scoreColor.color, fontFamily:'JetBrains Mono, monospace', letterSpacing:'-2px' }}>
                {result.score}
              </div>
              <div style={{ fontSize:16, color:'#9ca3af', fontWeight:800 }}>/100</div>
            </div>
            <Badge tone={scoreTone}>{result.statusLabel}</Badge>
            <div style={{ fontSize:12.5, color:'#6b7280', lineHeight:1.55 }}>
              Skor dihitung dari cashflow, saving rate, debt ratio, emergency fund, dan konsistensi pencatatan.
            </div>
          </div>
        </Card>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:10 }} className="doctor-metric-grid">
          {result.metrics.map(m => (
            <MetricCard key={m.label} label={m.label} value={m.value} status={m.status} note={m.note} />
          ))}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'minmax(0, 1fr) minmax(0, 1fr)', gap:14 }} className="doctor-main-grid">
        <Card>
          <SectionHead title="Financial Check-Up" subtitle="Diagnosis kondisi keuangan berdasarkan data bulan ini." />
          <div style={{ padding:14, display:'flex', flexDirection:'column', gap:10 }}>
            {result.diagnosis.map((item, idx) => {
              const t = toneMap[item.type]
              return (
                <div key={idx} style={{ border:`1px solid ${t.border}`, background:t.bg, borderRadius:12, padding:'11px 12px' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
                    <div style={{ fontSize:12.5, fontWeight:900, color:t.color }}>{item.title}</div>
                    <Badge tone={item.type}>{item.type}</Badge>
                  </div>
                  <div style={{ marginTop:6, fontSize:12, color:'#4b5563', lineHeight:1.5 }}>{item.detail}</div>
                </div>
              )
            })}
          </div>
        </Card>

        <Card>
          <SectionHead title="Treatment Plan" subtitle="Langkah praktis yang disarankan FiNK untuk bulan ini." />
          <div style={{ padding:14, display:'flex', flexDirection:'column', gap:10 }}>
            {result.treatments.map((item, idx) => {
              const tone = item.priority === 'high' ? 'danger' : item.priority === 'medium' ? 'warning' : 'neutral'
              const t = toneMap[tone]
              return (
                <div key={idx} style={{ border:'1px solid #e3e7ee', borderRadius:12, padding:'11px 12px', background:'#fff' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
                    <div style={{ fontSize:12.5, fontWeight:900, color:'#111827' }}>{idx + 1}. {item.title}</div>
                    <span style={{ color:t.color, background:t.bg, border:`1px solid ${t.border}`, borderRadius:999, padding:'3px 8px', fontSize:10, fontWeight:900, textTransform:'uppercase' }}>
                      {item.priority}
                    </span>
                  </div>
                  <div style={{ marginTop:6, fontSize:12, color:'#4b5563', lineHeight:1.5 }}>{item.detail}</div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      <Card style={{ marginTop:14 }}>
        <SectionHead title="Habit Monitoring" subtitle="Pattern detection sederhana tanpa AI berdasarkan transaksi bulan ini." />
        <div style={{ padding:14, display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:10 }}>
          {result.habits.map((h, idx) => {
            const t = toneMap[h.tone]
            return (
              <div key={idx} style={{ border:`1px solid ${t.border}`, background:t.bg, borderRadius:12, padding:'12px 13px' }}>
                <div style={{ fontSize:12.5, fontWeight:900, color:t.color }}>{h.title}</div>
                <div style={{ marginTop:6, fontSize:12, color:'#4b5563', lineHeight:1.5 }}>{h.detail}</div>
              </div>
            )
          })}
        </div>
      </Card>

      <Card style={{ marginTop:14 }}>
        <SectionHead title="Rekomendasi Alokasi Awal" subtitle="Angka awal untuk membantu menyusun budget bulan berikutnya." />
        <div style={{ padding:14, display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:10 }}>
          <MetricCard label="Batas Harian Aman" value={fmt(result.summary.recommendedDailyLimit) + '/hari'} status={result.summary.recommendedDailyLimit > 0 ? 'good' : 'danger'} note="Batas perkiraan berdasarkan sisa cashflow bulan ini." />
          <MetricCard label="Target Saving Awal" value={fmt(result.summary.totalIncome * 0.1)} status="neutral" note="Target konservatif 10% dari income jika cashflow memungkinkan." />
          <MetricCard label="Ruang Audit Expense" value={fmt(result.summary.totalExpense * 0.1)} status="warning" note="Simulasi penghematan 10% dari total expense." />
        </div>
      </Card>

      <style>{`
        @media (max-width: 860px) {
          .doctor-top-grid,
          .doctor-main-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 560px) {
          .doctor-metric-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
