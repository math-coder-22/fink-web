import type { BudgetCategory, IncomeCategory, SavingRow, Transaction } from '@/types/database'

export type FinancialMetric = {
  label: string
  value: string
  status: 'good' | 'warning' | 'danger' | 'neutral'
  note: string
}

export type DoctorInsight = {
  type: 'good' | 'warning' | 'danger' | 'neutral'
  title: string
  detail: string
}

export type TreatmentItem = {
  priority: 'high' | 'medium' | 'low'
  title: string
  detail: string
}

export type HabitSignal = {
  title: string
  detail: string
  tone: 'good' | 'warning' | 'danger' | 'neutral'
}

export type FinancialDoctorResult = {
  score: number
  statusLabel: string
  statusTone: 'good' | 'warning' | 'danger' | 'neutral'
  metrics: FinancialMetric[]
  diagnosis: DoctorInsight[]
  treatments: TreatmentItem[]
  habits: HabitSignal[]
  observationReady: boolean
  observationDays: number
  summary: {
    totalIncome: number
    totalExpense: number
    totalSaving: number
    cashflow: number
    savingRate: number
    debtRatio: number
    expenseRatio: number
    dailyBurn: number
    recommendedDailyLimit: number
    elapsedDays: number
    daysInMonth: number
  }
}

const fmt = (n: number) => 'Rp ' + Math.abs(Math.round(n || 0)).toLocaleString('id-ID')
const safeArray = <T,>(v: T[] | unknown): T[] => Array.isArray(v) ? v : []
const pct = (n: number) => `${Math.round((n || 0) * 100)}%`

function txDay(t: Transaction) {
  return Math.max(1, Math.min(31, Number(t.date || 1)))
}

function sumByType(tx: Transaction[], type: Transaction['type']) {
  return tx
    .filter(t => t.type === type && !(t.debt && !t.settled))
    .reduce((s, t) => s + Number(t.amt || 0), 0)
}

function sumDebt(tx: Transaction[]) {
  return tx
    .filter(t => t.type === 'out' && !!t.debt)
    .reduce((s, t) => s + Number(t.amt || 0), 0)
}

function categoryTotals(tx: Transaction[], type: Transaction['type']) {
  const map = new Map<string, number>()
  for (const t of tx) {
    if (t.type !== type) continue
    if (t.debt && !t.settled) continue
    const key = t.cat || 'Uncategorized'
    map.set(key, (map.get(key) || 0) + Number(t.amt || 0))
  }
  return Array.from(map.entries())
    .map(([label, amount]) => ({ label, amount }))
    .sort((a, b) => b.amount - a.amount)
}

function countUniqueDays(tx: Transaction[]) {
  return new Set(tx.map(t => txDay(t))).size
}

function scoreCashflow(cashflow: number, income: number) {
  if (income <= 0) return 8
  const ratio = cashflow / income
  if (ratio >= 0.15) return 30
  if (ratio >= 0.03) return 23
  if (ratio >= 0) return 17
  if (ratio >= -0.1) return 9
  return 3
}

function scoreSaving(savingRate: number) {
  if (savingRate >= 0.2) return 25
  if (savingRate >= 0.1) return 18
  if (savingRate >= 0.05) return 11
  if (savingRate > 0) return 6
  return 2
}

function scoreDebt(debtRatio: number) {
  if (debtRatio <= 0.1) return 20
  if (debtRatio <= 0.25) return 16
  if (debtRatio <= 0.35) return 10
  if (debtRatio <= 0.45) return 5
  return 1
}

function scoreConsistency(tx: Transaction[], elapsedDays: number) {
  const unique = countUniqueDays(tx)
  if (elapsedDays <= 0) return 0
  const ratio = unique / elapsedDays
  if (ratio >= 0.8) return 10
  if (ratio >= 0.55) return 7
  if (ratio >= 0.3) return 4
  return 2
}

function scoreEmergency(savingRows: SavingRow[], monthlyExpense: number) {
  const emergency = savingRows
    .filter(s => /darurat|emergency/i.test(s.label))
    .reduce((sum, s) => sum + Number(s.actual || 0), 0)

  if (monthlyExpense <= 0) return 8
  const coverage = emergency / monthlyExpense
  if (coverage >= 6) return 15
  if (coverage >= 3) return 10
  if (coverage > 0) return 5
  return 2
}

function metricStatusGoodWarnDanger(value: number, good: number, warning: number, higherIsBetter = true) {
  if (higherIsBetter) {
    if (value >= good) return 'good' as const
    if (value >= warning) return 'warning' as const
    return 'danger' as const
  }
  if (value <= good) return 'good' as const
  if (value <= warning) return 'warning' as const
  return 'danger' as const
}

export function analyzeFinancialDoctor(input: {
  tx: Transaction[]
  budget: BudgetCategory[]
  income: IncomeCategory[]
  saving: SavingRow[]
  currentDay?: number
  daysInMonth?: number
}): FinancialDoctorResult {
  const safeTx = safeArray<Transaction>(input.tx)
  const safeSaving = safeArray<SavingRow>(input.saving)
  const now = new Date()
  const elapsedDays = Math.max(1, input.currentDay || now.getDate())
  const daysInMonth = Math.max(28, input.daysInMonth || new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate())

  const totalIncome = sumByType(safeTx, 'inn')
  const totalExpense = sumByType(safeTx, 'out')
  const totalSaving = sumByType(safeTx, 'save')
  const debtPayment = sumDebt(safeTx)
  const cashflow = totalIncome - totalExpense - totalSaving
  const savingRate = totalIncome > 0 ? totalSaving / totalIncome : 0
  const debtRatio = totalIncome > 0 ? debtPayment / totalIncome : 0
  const expenseRatio = totalIncome > 0 ? totalExpense / totalIncome : 0
  const dailyBurn = totalExpense / elapsedDays
  const remainingDays = Math.max(1, daysInMonth - elapsedDays + 1)
  const recommendedDailyLimit = Math.max(0, cashflow / remainingDays)

  const score =
    scoreCashflow(cashflow, totalIncome) +
    scoreSaving(savingRate) +
    scoreDebt(debtRatio) +
    scoreEmergency(safeSaving, totalExpense) +
    scoreConsistency(safeTx, elapsedDays)

  const statusTone =
    score >= 80 ? 'good' :
    score >= 60 ? 'warning' :
    score >= 40 ? 'warning' :
    'danger'

  const statusLabel =
    score >= 80 ? 'Sehat' :
    score >= 60 ? 'Cukup Sehat' :
    score >= 40 ? 'Perlu Dijaga' :
    'Perlu Perhatian'

  const observationDays = countUniqueDays(tx)
  const observationReady = observationDays >= 20 || elapsedDays >= 28

  const metrics: FinancialMetric[] = [
    {
      label: 'Cashflow',
      value: fmt(cashflow),
      status: cashflow >= 0 ? 'good' : 'danger',
      note: cashflow >= 0 ? 'Saldo bulan ini masih positif.' : 'Pengeluaran dan saving melebihi income.',
    },
    {
      label: 'Saving Rate',
      value: pct(savingRate),
      status: metricStatusGoodWarnDanger(savingRate, 0.15, 0.05, true),
      note: savingRate >= 0.15 ? 'Alokasi saving cukup kuat.' : 'Ruang saving masih bisa ditingkatkan.',
    },
    {
      label: 'Debt Ratio',
      value: pct(debtRatio),
      status: metricStatusGoodWarnDanger(debtRatio, 0.25, 0.35, false),
      note: debtRatio > 0.35 ? 'Rasio cicilan/utang cukup berat.' : 'Rasio utang masih terkendali.',
    },
    {
      label: 'Daily Burn',
      value: fmt(dailyBurn) + '/hari',
      status: 'neutral',
      note: `Rata-rata pengeluaran harian sampai hari ke-${elapsedDays}.`,
    },
  ]

  const diagnosis: DoctorInsight[] = []

  if (!observationReady) {
    diagnosis.push({
      type: 'neutral',
      title: 'Data observasi belum penuh',
      detail: `FiNK sudah membaca ${observationDays} hari transaksi. Rekomendasi akan lebih akurat setelah minimal 20–30 hari pencatatan.`,
    })
  }

  if (totalIncome <= 0) {
    diagnosis.push({
      type: 'warning',
      title: 'Income belum tercatat',
      detail: 'Catat pemasukan terlebih dahulu agar FiNK dapat menghitung rasio keuangan dengan benar.',
    })
  }

  if (cashflow < 0) {
    diagnosis.push({
      type: 'danger',
      title: 'Cashflow negatif',
      detail: `Bulan ini minus ${fmt(cashflow)}. Prioritas utama adalah menurunkan pengeluaran fleksibel dan menunda target non-prioritas.`,
    })
  } else if (cashflow > 0 && totalIncome > 0) {
    diagnosis.push({
      type: 'good',
      title: 'Cashflow masih positif',
      detail: `Masih ada ruang ${fmt(cashflow)} untuk menjaga saldo, dana darurat, atau target keuangan.`,
    })
  }

  if (savingRate < 0.05 && totalIncome > 0) {
    diagnosis.push({
      type: 'warning',
      title: 'Saving rate rendah',
      detail: `Saving rate baru ${pct(savingRate)}. Target awal yang realistis adalah 5–10% dari income.`,
    })
  } else if (savingRate >= 0.15) {
    diagnosis.push({
      type: 'good',
      title: 'Saving rate sehat',
      detail: `Saving rate ${pct(savingRate)} sudah cukup baik. Pertahankan konsistensinya.`,
    })
  }

  if (debtRatio > 0.35) {
    diagnosis.push({
      type: 'danger',
      title: 'Debt ratio tinggi',
      detail: `Rasio cicilan/utang ${pct(debtRatio)}. Sebaiknya jangan tambah cicilan baru dan prioritaskan pelunasan.`,
    })
  }

  const topCategories = categoryTotals(safeTx, 'out').slice(0, 3)
  if (topCategories.length > 0 && totalExpense > 0) {
    const top = topCategories[0]
    const share = top.amount / totalExpense
    if (share >= 0.3) {
      diagnosis.push({
        type: 'warning',
        title: `${top.label} mendominasi pengeluaran`,
        detail: `${top.label} mengambil ${pct(share)} dari total expense. Ini kategori pertama yang perlu dicek.`,
      })
    }
  }

  const treatments: TreatmentItem[] = []

  if (cashflow < 0) {
    treatments.push({
      priority: 'high',
      title: 'Aktifkan survival budget bulan ini',
      detail: 'Tunda belanja non-prioritas dan batasi transaksi harian sampai cashflow kembali positif.',
    })
  }

  if (recommendedDailyLimit > 0) {
    treatments.push({
      priority: 'medium',
      title: 'Gunakan batas harian aman',
      detail: `Sisa saldo dapat dijaga dengan batas sekitar ${fmt(recommendedDailyLimit)}/hari sampai akhir bulan.`,
    })
  }

  if (savingRate < 0.1 && totalIncome > 0) {
    treatments.push({
      priority: 'medium',
      title: 'Naikkan saving bertahap',
      detail: `Mulai dari ${fmt(totalIncome * 0.05)}–${fmt(totalIncome * 0.1)} per bulan sebelum mengejar target yang lebih agresif.`,
    })
  }

  if (debtRatio > 0.25) {
    treatments.push({
      priority: debtRatio > 0.35 ? 'high' : 'medium',
      title: 'Jaga rasio cicilan',
      detail: 'Utamakan pembayaran utang dan hindari cicilan baru sampai rasio cicilan turun.',
    })
  }

  if (topCategories.length > 0) {
    const top = topCategories[0]
    treatments.push({
      priority: 'low',
      title: `Audit kategori ${top.label}`,
      detail: `Coba turunkan ${top.label} sebesar 10–15% bulan depan. Estimasi ruang yang terbuka: ${fmt(top.amount * 0.1)}–${fmt(top.amount * 0.15)}.`,
    })
  }

  const habits: HabitSignal[] = []

  const firstHalf = safeTx
    .filter(t => txDay(t) <= Math.ceil(daysInMonth / 2) && t.type === 'out')
    .reduce((s, t) => s + Number(t.amt || 0), 0)
  const secondHalf = safeTx
    .filter(t => txDay(t) > Math.ceil(daysInMonth / 2) && t.type === 'out')
    .reduce((s, t) => s + Number(t.amt || 0), 0)

  if (firstHalf > secondHalf * 1.8 && firstHalf > 0) {
    habits.push({
      tone: 'warning',
      title: 'Pengeluaran awal bulan tinggi',
      detail: 'Expense lebih berat di awal bulan. FiNK menyarankan pembatasan harian sejak minggu pertama.',
    })
  }

  const smallTx = safeTx.filter(t => t.type === 'out' && Number(t.amt || 0) > 0 && Number(t.amt || 0) <= 50000)
  if (smallTx.length >= 20) {
    habits.push({
      tone: 'warning',
      title: 'Transaksi kecil cukup sering',
      detail: `${smallTx.length} transaksi kecil tercatat. Nilai kecil yang sering bisa menjadi kebocoran cashflow.`,
    })
  }

  const weekendExpense = safeTx
    .filter(t => t.type === 'out')
    .filter(t => {
      // Approximation: use transaction day in current month.
      const d = new Date(now.getFullYear(), now.getMonth(), txDay(t))
      return d.getDay() === 0 || d.getDay() === 6
    })
    .reduce((s, t) => s + Number(t.amt || 0), 0)

  if (weekendExpense > totalExpense * 0.35 && totalExpense > 0) {
    habits.push({
      tone: 'warning',
      title: 'Weekend spending dominan',
      detail: `${pct(weekendExpense / totalExpense)} expense terjadi pada akhir pekan. Buat batas khusus weekend.`,
    })
  }

  if (totalSaving > 0) {
    habits.push({
      tone: 'good',
      title: 'Ada alokasi saving',
      detail: `Bulan ini sudah ada saving ${fmt(totalSaving)}. Langkah berikutnya adalah menjaga konsistensinya.`,
    })
  }

  if (habits.length === 0) {
    habits.push({
      tone: 'neutral',
      title: 'Belum ada pola kuat',
      detail: 'Lanjutkan pencatatan harian agar FiNK bisa membaca pola kebiasaan dengan lebih baik.',
    })
  }

  if (diagnosis.length === 0) {
    diagnosis.push({
      type: 'good',
      title: 'Kondisi umum cukup stabil',
      detail: 'Belum ada sinyal risiko besar dari data bulan ini.',
    })
  }

  if (treatments.length === 0) {
    treatments.push({
      priority: 'low',
      title: 'Pertahankan pola bulan ini',
      detail: 'Kondisi cukup stabil. Fokus pada konsistensi pencatatan dan saving rutin.',
    })
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    statusLabel,
    statusTone,
    metrics,
    diagnosis,
    treatments,
    habits,
    observationReady,
    observationDays,
    summary: {
      totalIncome,
      totalExpense,
      totalSaving,
      cashflow,
      savingRate,
      debtRatio,
      expenseRatio,
      dailyBurn,
      recommendedDailyLimit,
      elapsedDays,
      daysInMonth,
    },
  }
}
