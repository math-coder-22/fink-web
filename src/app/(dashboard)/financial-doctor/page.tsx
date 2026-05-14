'use client'

import { useMemo } from 'react'
import { useMonthContext, MONTH_NAMES } from '@/components/layout/DashboardShell'
import { useBulanan } from '@/hooks/useBulanan'
import type { Transaction, SavingRow, DebtRow } from '@/types/database'

type Tone = 'good' | 'warning' | 'danger' | 'neutral'

const toneMap: Record<Tone, { bg:string; border:string; color:string }> = {
  good: { bg:'#f0fdf4', border:'#bbf7d0', color:'#166534' },
  warning: { bg:'#fffbeb', border:'#fde68a', color:'#92400e' },
  danger: { bg:'#fef2f2', border:'#fecaca', color:'#991b1b' },
  neutral: { bg:'#f7f8fa', border:'#e3e7ee', color:'#4b5563' },
}

const MONTH_INDEX: Record<string, number> = {
  jan:0, feb:1, mar:2, apr:3, may:4, jun:5,
  jul:6, aug:7, sep:8, oct:9, nov:10, dec:11,
}

const fmt = (n: number) => 'Rp ' + Math.abs(Math.round(n || 0)).toLocaleString('id-ID')
const pct = (n: number) => `${Math.round((n || 0) * 100)}%`

function safeTx(v: unknown): Transaction[] {
  return Array.isArray(v) ? v as Transaction[] : []
}

function txDay(t: Transaction) {
  return Math.max(1, Math.min(31, Number(t.date || 1)))
}

function sumTx(tx: Transaction[], type: Transaction['type']) {
  return tx
    .filter(t => t.type === type && !(t.debt && !t.settled))
    .reduce((s, t) => s + Number(t.amt || 0), 0)
}

function sumDebtRows(rows: DebtRow[]) {
  // Debt di FiNK adalah cicilan/kewajiban bulanan.
  // Untuk debt ratio, gunakan actual jika sudah ada pembayaran,
  // fallback ke plan agar rasio hutang tetap terlihat sejak awal bulan.
  return rows.reduce((s, r) => s + Number((r.actual || 0) > 0 ? r.actual : r.plan || 0), 0)
}

function uniqueDays(tx: Transaction[]) {
  return new Set(tx.map(t => txDay(t))).size
}

function categoryTotals(tx: Transaction[]) {
  const m = new Map<string, number>()
  for (const t of tx) {
    if (t.type !== 'out') continue
    if (t.debt && !t.settled) continue
    const key = t.cat || 'Uncategorized'
    m.set(key, (m.get(key) || 0) + Number(t.amt || 0))
  }
  return Array.from(m.entries())
    .map(([label, amount]) => ({ label, amount }))
    .sort((a,b)=>b.amount-a.amount)
}

function scoreCashflow(cashflow: number, income: number) {
  if (income <= 0) return 8
  const r = cashflow / income
  if (r >= .15) return 30
  if (r >= .03) return 23
  if (r >= 0) return 17
  if (r >= -.1) return 9
  return 3
}

function scoreSaving(rate: number) {
  if (rate >= .2) return 25
  if (rate >= .1) return 18
  if (rate >= .05) return 11
  if (rate > 0) return 6
  return 2
}

function scoreDebt(rate: number) {
  if (rate <= .1) return 20
  if (rate <= .25) return 16
  if (rate <= .35) return 10
  if (rate <= .45) return 5
  return 1
}

function scoreConsistency(tx: Transaction[], elapsed: number) {
  const ratio = elapsed > 0 ? uniqueDays(tx) / elapsed : 0
  if (ratio >= .8) return 10
  if (ratio >= .55) return 7
  if (ratio >= .3) return 4
  return 2
}

function emergencyScore(saving: SavingRow[], expense: number) {
  const emergency = Array.isArray(saving)
    ? saving.filter(s => /darurat|emergency/i.test(s.label)).reduce((a,s)=>a+Number(s.actual||0),0)
    : 0
  if (expense <= 0) return 8
  const cov = emergency / expense
  if (cov >= 6) return 15
  if (cov >= 3) return 10
  if (cov > 0) return 5
  return 2
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background:'#fff', border:'1px solid #e3e7ee', borderRadius:'16px', boxShadow:'0 2px 10px rgba(15,23,42,.05)', overflow:'hidden', ...style }}>
      {children}
    </div>
  )
}

function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  const t = toneMap[tone]
  return <span style={{ display:'inline-flex', border:`1px solid ${t.border}`, background:t.bg, color:t.color, borderRadius:999, padding:'4px 9px', fontSize:10.5, fontWeight:900, textTransform:'uppercase', letterSpacing:'.4px' }}>{children}</span>
}

function SectionHead({ title, subtitle }: { title:string; subtitle?:string }) {
  return (
    <div style={{ padding:'15px 16px', borderBottom:'1px solid #eef2f7' }}>
      <div style={{ fontSize:14, fontWeight:900, color:'#111827' }}>{title}</div>
      {subtitle && <div style={{ fontSize:11.5, color:'#9ca3af', marginTop:3, lineHeight:1.45 }}>{subtitle}</div>}
    </div>
  )
}

function MetricCard({ label, value, tone, note }: { label:string; value:string; tone:Tone; note:string }) {
  const t = toneMap[tone]
  return (
    <div style={{ background:t.bg, border:`1px solid ${t.border}`, borderRadius:13, padding:'13px 14px' }}>
      <div style={{ fontSize:10, color:'#6b7280', textTransform:'uppercase', letterSpacing:'.7px', fontWeight:900 }}>{label}</div>
      <div style={{ marginTop:7, color:t.color, fontSize:20, fontWeight:900, fontFamily:'var(--font-mono), monospace', letterSpacing:'-.6px' }}>{value}</div>
      <div style={{ marginTop:7, color:'#6b7280', fontSize:11.5, lineHeight:1.45 }}>{note}</div>
    </div>
  )
}

export default function FinancialDoctorPage() {
  const { curMonth, curYear } = useMonthContext()
  const { tx, loading, computedSaving, computedDebt } = useBulanan({ curMonth, curYear })

  const data = useMemo(() => {
    const allTx = safeTx(tx)
    const now = new Date()
    const selectedMonthIndex = MONTH_INDEX[curMonth] ?? now.getMonth()
    const daysInMonth = new Date(curYear, selectedMonthIndex + 1, 0).getDate()
    const elapsedDays = Math.max(1, Math.min(daysInMonth, now.getDate()))

    let savingRows: SavingRow[] = []
    let debtRows: DebtRow[] = []
    try {
      savingRows = typeof computedSaving === 'function' ? computedSaving() : []
    } catch {
      savingRows = []
    }
    try {
      debtRows = typeof computedDebt === 'function' ? computedDebt() : []
    } catch {
      debtRows = []
    }

    const income = sumTx(allTx, 'inn')
    const expense = sumTx(allTx, 'out')
    const saving = sumTx(allTx, 'save')
    const debt = sumDebtRows(debtRows)
    const cashflow = income - expense - saving
    const savingRate = income > 0 ? saving / income : 0
    const debtRatio = income > 0 ? debt / income : 0
    const dailyBurn = expense / elapsedDays
    const remainingDays = Math.max(1, daysInMonth - elapsedDays + 1)
    const dailyLimit = Math.max(0, cashflow / remainingDays)

    const score = Math.max(0, Math.min(100, Math.round(
      scoreCashflow(cashflow, income) +
      scoreSaving(savingRate) +
      scoreDebt(debtRatio) +
      emergencyScore(savingRows, expense) +
      scoreConsistency(allTx, elapsedDays)
    )))

    const statusTone: Tone = score >= 80 ? 'good' : score >= 45 ? 'warning' : 'danger'
    const statusLabel = score >= 80 ? 'Sehat' : score >= 60 ? 'Cukup Sehat' : score >= 45 ? 'Perlu Dijaga' : 'Perlu Perhatian'
    const observationDays = uniqueDays(allTx)
    const observationReady = observationDays >= 20 || elapsedDays >= 28
    const topCats = categoryTotals(allTx).slice(0,3)

    const diagnosis: { tone:Tone; title:string; detail:string }[] = []

    if (!observationReady) {
      diagnosis.push({
        tone:'neutral',
        title:'Data awal sedang dibaca',
        detail:`FiNK sudah membaca ${observationDays} hari transaksi. Arahan akan makin personal setelah 20–30 hari pencatatan.`,
      })
    }

    if (income <= 0) {
      diagnosis.push({ tone:'warning', title:'Income belum tercatat', detail:'Tambahkan pemasukan agar FiNK bisa menyusun arahan bulanan yang lebih realistis.' })
    }

    if (cashflow < 0) {
      diagnosis.push({ tone:'danger', title:'Cashflow perlu dijaga', detail:`Bulan ini minus ${fmt(cashflow)}. Fokuskan pengeluaran pada kebutuhan utama dulu.` })
    } else if (income > 0) {
      diagnosis.push({ tone:'good', title:'Cashflow masih aman', detail:`Masih ada ruang ${fmt(cashflow)} yang bisa diarahkan untuk kebutuhan, saving, atau buffer.` })
    }

    if (savingRate < .05 && income > 0) {
      diagnosis.push({ tone:'warning', title:'Saving perlu dinaikkan bertahap', detail:`Saving rate baru ${pct(savingRate)}. Target awal yang realistis adalah 5–10% dari income.` })
    } else if (savingRate >= .15) {
      diagnosis.push({ tone:'good', title:'Saving sudah berjalan baik', detail:`Saving rate ${pct(savingRate)} sudah cukup baik untuk dipertahankan.` })
    }

    if (debtRatio > .35) {
      diagnosis.push({ tone:'danger', title:'Ruang cicilan mulai ketat', detail:`Rasio utang/cicilan ${pct(debtRatio)}. Tahan cicilan baru agar arus kas tetap lega.` })
    }

    if (topCats[0] && expense > 0 && topCats[0].amount / expense >= .3) {
      diagnosis.push({ tone:'warning', title:`${topCats[0].label} dominan`, detail:`Kategori ini mengambil ${pct(topCats[0].amount / expense)} dari total expense. Ini bisa menjadi area evaluasi pertama.` })
    }

    if (diagnosis.length === 0) {
      diagnosis.push({ tone:'good', title:'Kondisi umum stabil', detail:'Belum ada risiko besar dari data bulan ini. Fokusnya adalah menjaga ritme yang sudah baik.' })
    }

    const treatments: { priority:'high'|'medium'|'low'; title:string; detail:string }[] = []

    if (cashflow < 0) treatments.push({ priority:'high', title:'Aktifkan mode hemat sementara', detail:'Tunda belanja non-prioritas sampai cashflow kembali positif.' })
    if (dailyLimit > 0) treatments.push({ priority:'medium', title:'Pakai batas harian aman', detail:`Gunakan batas sekitar ${fmt(dailyLimit)}/hari sampai akhir bulan agar tetap terkendali.` })
    if (savingRate < .1 && income > 0) treatments.push({ priority:'medium', title:'Naikkan saving bertahap', detail:`Mulai dari ${fmt(income*.05)}–${fmt(income*.1)} per bulan sebagai target ringan.` })
    if (debtRatio > .25) treatments.push({ priority: debtRatio>.35?'high':'medium', title:'Jaga rasio cicilan', detail:'Utamakan cicilan berjalan dan hindari komitmen baru bulan ini.' })
    if (topCats[0]) treatments.push({ priority:'low', title:`Rapikan kategori ${topCats[0].label}`, detail:`Coba turunkan 10–15%. Estimasi ruang yang bisa dibuka: ${fmt(topCats[0].amount*.1)}–${fmt(topCats[0].amount*.15)}.` })
    if (treatments.length === 0) treatments.push({ priority:'low', title:'Pertahankan ritme bulan ini', detail:'Fokus menjaga konsistensi pencatatan dan saving rutin.' })

    const habits: { tone:Tone; title:string; detail:string }[] = []
    const smallTx = allTx.filter(t => t.type === 'out' && Number(t.amt||0) > 0 && Number(t.amt||0) <= 50000)
    if (smallTx.length >= 20) habits.push({ tone:'warning', title:'Transaksi kecil cukup sering', detail:`Ada ${smallTx.length} transaksi kecil. Nilai kecil yang sering bisa menjadi area perapihan cashflow.` })
    if (saving > 0) habits.push({ tone:'good', title:'Saving sudah mulai terbentuk', detail:`Bulan ini sudah ada saving ${fmt(saving)}.` })
    if (habits.length === 0) habits.push({ tone:'neutral', title:'Belum ada pola kuat', detail:'Lanjutkan pencatatan agar FiNK bisa membaca kebiasaan dan memberi arahan yang lebih tepat.' })

    return {
      score, statusTone, statusLabel, observationDays, observationReady,
      income, expense, saving, cashflow, savingRate, debtRatio, dailyBurn, dailyLimit,
      diagnosis, treatments, habits,
      firstAction: treatments[0] ?? { priority:'low', title:'Lanjutkan pencatatan bulan ini', detail:'FiNK akan menyusun arahan yang lebih personal setelah data transaksi bertambah.' },
    }
  }, [tx, computedSaving, computedDebt, curMonth, curYear])

  if (loading) {
    return (
      <div style={{ minHeight:'45vh', display:'flex', alignItems:'center', justifyContent:'center', color:'#9ca3af', fontSize:13 }}>
        Memuat Advisor...
      </div>
    )
  }

  return (
    <div>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:14, flexWrap:'wrap', marginBottom:14 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:950, color:'#111827', letterSpacing:'-.6px', margin:0 }}>
            Advisor
          </h1>
          <p style={{ margin:'5px 0 0', color:'#6b7280', fontSize:12.5, lineHeight:1.55 }}>
            Panduan personal untuk membaca kondisi bulan ini dan menentukan langkah keuangan berikutnya.
          </p>
        </div>
        <Badge tone={data.observationReady ? 'good' : 'warning'}>
          {data.observationReady ? 'Data cukup' : `${data.observationDays} hari data`}
        </Badge>
      </div>

      {!data.observationReady && (
        <Card style={{ marginBottom:14, borderColor:'#fde68a', background:'#fffbeb' }}>
          <div style={{ padding:14, color:'#92400e', fontSize:12.5, lineHeight:1.55 }}>
            <b>Mode Observasi:</b> FiNK sudah memberi arahan awal. Hasilnya akan makin personal setelah pencatatan 20–30 hari.
          </div>
        </Card>
      )}

      <div className="doctor-top-grid" style={{ display:'grid', gridTemplateColumns:'minmax(230px,.8fr) minmax(0,1.2fr)', gap:14, marginBottom:14 }}>
        <Card>
          <div style={{ padding:'18px', display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ fontSize:12, fontWeight:900, color:'#6b7280', textTransform:'uppercase', letterSpacing:'.8px' }}>Financial Readiness</div>
            <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
              <div style={{ fontSize:52, lineHeight:1, fontWeight:950, color:toneMap[data.statusTone].color, fontFamily:'var(--font-mono), monospace', letterSpacing:'-2px' }}>
                {data.score}
              </div>
              <div style={{ fontSize:16, color:'#9ca3af', fontWeight:800 }}>/100</div>
            </div>
            <Badge tone={data.statusTone}>{data.statusLabel}</Badge>
            <div style={{ height:8, borderRadius:999, background:'#eef2f7', overflow:'hidden' }}>
              <div style={{ width:`${data.score}%`, height:'100%', borderRadius:999, background:toneMap[data.statusTone].color }} />
            </div>
            <div style={{ fontSize:12.5, color:'#6b7280', lineHeight:1.55 }}>
              Gambaran kesiapan bulan ini berdasarkan cashflow, saving, cicilan, dana darurat, dan konsistensi pencatatan.
            </div>
          </div>
        </Card>

        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <Card style={{ borderColor:'#d8efe5', background:'linear-gradient(135deg,#f7fffb 0%,#ffffff 70%)' }}>
            <div style={{ padding:15 }}>
              <div style={{ fontSize:10.5, color:'#1a5c42', textTransform:'uppercase', letterSpacing:'.7px', fontWeight:950 }}>Saran utama FiNK</div>
              <div style={{ marginTop:7, fontSize:15, fontWeight:950, color:'#111827', lineHeight:1.35 }}>{data.firstAction.title}</div>
              <div style={{ marginTop:7, fontSize:12.5, color:'#4b5563', lineHeight:1.55 }}>{data.firstAction.detail}</div>
            </div>
          </Card>
          <div className="doctor-metric-grid" style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:10 }}>
            <MetricCard label="Cashflow" value={fmt(data.cashflow)} tone={data.cashflow >= 0 ? 'good' : 'danger'} note={data.cashflow >= 0 ? 'Ruang bulan ini masih positif.' : 'Perlu dikendalikan bulan ini.'} />
            <MetricCard label="Saving Rate" value={pct(data.savingRate)} tone={data.savingRate >= .15 ? 'good' : data.savingRate >= .05 ? 'warning' : 'danger'} note="Porsi dana yang diarahkan ke tujuan." />
            <MetricCard label="Debt Ratio" value={pct(data.debtRatio)} tone={data.debtRatio <= .25 ? 'good' : data.debtRatio <= .35 ? 'warning' : 'danger'} note="Porsi komitmen bulanan terhadap income." />
            <MetricCard label="Daily Burn" value={fmt(data.dailyBurn) + '/hari'} tone="neutral" note="Ritme pengeluaran harian saat ini." />
          </div>
        </div>
      </div>

      <div className="doctor-main-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        <Card>
          <SectionHead title="Situasi Bulan Ini" subtitle="Ringkasan peluang dan risiko yang perlu diperhatikan." />
          <div style={{ padding:14, display:'flex', flexDirection:'column', gap:10 }}>
            {data.diagnosis.map((item, idx) => {
              const t = toneMap[item.tone]
              return (
                <div key={idx} style={{ border:`1px solid ${t.border}`, background:t.bg, borderRadius:12, padding:'11px 12px' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
                    <div style={{ fontSize:12.5, fontWeight:900, color:t.color }}>{item.title}</div>
                    <Badge tone={item.tone}>{item.tone === 'good' ? 'baik' : item.tone === 'warning' ? 'perlu dijaga' : item.tone === 'danger' ? 'prioritas' : 'info'}</Badge>
                  </div>
                  <div style={{ marginTop:6, fontSize:12, color:'#4b5563', lineHeight:1.5 }}>{item.detail}</div>
                </div>
              )
            })}
          </div>
        </Card>

        <Card>
          <SectionHead title="Langkah Prioritas" subtitle="Urutan tindakan kecil yang bisa dilakukan bulan ini." />
          <div style={{ padding:14, display:'flex', flexDirection:'column', gap:10 }}>
            {data.treatments.map((item, idx) => {
              const tone: Tone = item.priority === 'high' ? 'danger' : item.priority === 'medium' ? 'warning' : 'neutral'
              const t = toneMap[tone]
              return (
                <div key={idx} style={{ border:'1px solid #e3e7ee', borderRadius:12, padding:'11px 12px', background:'#fff' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
                    <div style={{ fontSize:12.5, fontWeight:900, color:'#111827' }}>{idx + 1}. {item.title}</div>
                    <span style={{ color:t.color, background:t.bg, border:`1px solid ${t.border}`, borderRadius:999, padding:'3px 8px', fontSize:10, fontWeight:900, textTransform:'uppercase' }}>
                      {item.priority === 'high' ? 'utama' : item.priority === 'medium' ? 'penting' : 'ringan'}
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
        <SectionHead title="Pola Kebiasaan" subtitle="Pembacaan sederhana dari ritme transaksi dan saving." />
        <div style={{ padding:14, display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:10 }}>
          {data.habits.map((h, idx) => {
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
        <SectionHead title="Rencana Alokasi Berikutnya" subtitle="Angka awal untuk membantu menyusun budget bulan berikutnya." />
        <div style={{ padding:14, display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:10 }}>
          <MetricCard label="Batas Harian Aman" value={fmt(data.dailyLimit) + '/hari'} tone={data.dailyLimit > 0 ? 'good' : 'danger'} note="Batas ringan berdasarkan sisa cashflow." />
          <MetricCard label="Target Saving Awal" value={fmt(data.income * .1)} tone="neutral" note="Target konservatif 10% dari income." />
          <MetricCard label="Ruang Audit Expense" value={fmt(data.expense * .1)} tone="warning" note="Simulasi ruang hemat 10% dari total expense." />
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
