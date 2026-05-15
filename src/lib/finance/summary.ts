import type { BudgetCategory, DebtRow, IncomeCategory, MonthKey, SavingRow, Transaction } from '@/types/database'
import type { SavingsGoal } from '@/types/savings'

export const MONTHS_ORDER: MonthKey[] = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']
export const MONTH_LABELS: Record<MonthKey, string> = {
  jan:'Jan', feb:'Feb', mar:'Mar', apr:'Apr', may:'Mei', jun:'Jun',
  jul:'Jul', aug:'Agu', sep:'Sep', oct:'Okt', nov:'Nov', dec:'Des',
}

type RawPlan = {
  income?: IncomeCategory[]
  saving?: SavingRow[]
  debt?: DebtRow[]
  budget?: BudgetCategory[]
}

export type MonthlyTrendItem = {
  month: MonthKey
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

export type AdvisorPriority = {
  level: 'high' | 'medium' | 'low'
  title: string
  detail: string
}

export type AdvisorSummary = {
  score: number
  status: 'good' | 'warning' | 'danger'
  statusLabel: string
  mainInsight: string
  monthly: MonthlyTrendItem
  previous?: MonthlyTrendItem
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
  risks: { tone: 'good' | 'warning' | 'danger' | 'neutral'; title: string; detail: string }[]
  priorities: AdvisorPriority[]
  milestone: {
    title: string
    current: number
    target: number
    progress: number
    monthly: number
    detail: string
  } | null
}

export function monthIndex(month: string) {
  const idx = MONTHS_ORDER.indexOf(month as MonthKey)
  return idx >= 0 ? idx : 0
}

export function monthShift(month: MonthKey, year: number, offset: number) {
  const base = year * 12 + monthIndex(month) + offset
  const y = Math.floor(base / 12)
  const m = MONTHS_ORDER[((base % 12) + 12) % 12]
  return { month: m, year: y }
}

export function recentMonths(month: MonthKey, year: number, count = 6) {
  return Array.from({ length: count }, (_, i) => monthShift(month, year, i - count + 1))
}

export function pctChange(current: number, previous: number): number | null {
  if (!previous) return null
  return ((current - previous) / previous) * 100
}

export function sumPlanIncome(plan?: RawPlan | null) {
  return (plan?.income || []).reduce((s, c: any) => {
    if (Array.isArray(c?.items)) return s + c.items.reduce((ss: number, i: any) => ss + Number(i?.plan || 0), 0)
    return s + Number(c?.plan || 0)
  }, 0)
}

export function sumPlanBudget(plan?: RawPlan | null) {
  return (plan?.budget || []).reduce((s, c: any) => s + (Array.isArray(c?.items) ? c.items.reduce((ss: number, i: any) => ss + Number(i?.plan || 0), 0) : 0), 0)
}

export function sumPlanDebt(plan?: RawPlan | null) {
  return (plan?.debt || []).reduce((s, d: any) => s + Number(d?.plan || d?.actual || 0), 0)
}

export function aggregateMonth(month: MonthKey, year: number, tx: Transaction[], plan?: RawPlan | null): MonthlyTrendItem {
  const scoped = tx.filter(t => t.month === month && Number(t.year) === Number(year))
  const incomeActual = scoped.filter(t => t.type === 'inn').reduce((s, t) => s + Number(t.amt || 0), 0)
  const expense = scoped.filter(t => t.type === 'out' && !(t.debt && !t.settled)).reduce((s, t) => s + Number(t.amt || 0), 0)
  const saving = scoped.filter(t => t.type === 'save').reduce((s, t) => s + Number(t.amt || 0), 0)
  const income = incomeActual || sumPlanIncome(plan)
  const cashflow = income - expense - saving
  return {
    month,
    year,
    label: `${MONTH_LABELS[month]} ${String(year).slice(-2)}`,
    income,
    expense,
    saving,
    cashflow,
    savingRate: income > 0 ? (saving / income) * 100 : 0,
    expenseRate: income > 0 ? (expense / income) * 100 : 0,
    transactionCount: scoped.length,
  }
}

function scoreFromSummary(current: MonthlyTrendItem, debtRatio: number, milestoneProgress: number) {
  let score = 0
  if (current.cashflow >= current.income * 0.15) score += 30
  else if (current.cashflow >= current.income * 0.03) score += 24
  else if (current.cashflow >= 0) score += 18
  else score += 6

  if (current.savingRate >= 20) score += 25
  else if (current.savingRate >= 10) score += 18
  else if (current.savingRate >= 5) score += 10
  else score += 3

  if (current.expenseRate <= 60) score += 18
  else if (current.expenseRate <= 75) score += 13
  else if (current.expenseRate <= 90) score += 7
  else score += 2

  if (debtRatio <= 20) score += 15
  else if (debtRatio <= 35) score += 9
  else score += 3

  if (milestoneProgress >= 75) score += 12
  else if (milestoneProgress >= 40) score += 8
  else if (milestoneProgress > 0) score += 5
  else score += 2

  return Math.max(0, Math.min(100, Math.round(score)))
}

function pickMilestone(goals: SavingsGoal[]) {
  const active = (goals || []).filter(g => g.status === 'active')
  if (active.length === 0) return null
  const sorted = [...active].sort((a, b) => {
    const ap = a.target > 0 ? a.current / a.target : 0
    const bp = b.target > 0 ? b.current / b.target : 0
    if (ap === bp) return (b.monthly || 0) - (a.monthly || 0)
    return ap - bp
  })
  const g = sorted[0]
  const progress = g.target > 0 ? Math.min(100, (g.current / g.target) * 100) : 0
  const gap = Math.max(0, (g.target || 0) - (g.current || 0))
  return {
    title: g.name || 'Target utama',
    current: Number(g.current || 0),
    target: Number(g.target || 0),
    progress,
    monthly: Number(g.monthly || 0),
    detail: gap > 0 ? `Sisa target sekitar Rp ${Math.round(gap).toLocaleString('id-ID')}.` : 'Target ini sudah tercapai.',
  }
}

export function buildAdvisorSummary(params: {
  currentMonth: MonthKey
  currentYear: number
  trend: MonthlyTrendItem[]
  currentPlan?: RawPlan | null
  goals?: SavingsGoal[]
}): AdvisorSummary {
  const current = params.trend[params.trend.length - 1] || aggregateMonth(params.currentMonth, params.currentYear, [], params.currentPlan)
  const previous = params.trend.length >= 2 ? params.trend[params.trend.length - 2] : undefined
  const recent3 = params.trend.slice(-3)
  const avg = (key: keyof MonthlyTrendItem) => recent3.length ? recent3.reduce((s, m) => s + Number(m[key] || 0), 0) / recent3.length : 0
  const debtRatio = current.income > 0 ? (sumPlanDebt(params.currentPlan) / current.income) * 100 : 0
  const milestone = pickMilestone(params.goals || [])
  const milestoneProgress = milestone?.progress || 0
  const score = scoreFromSummary(current, debtRatio, milestoneProgress)
  const status = score >= 75 ? 'good' : score >= 50 ? 'warning' : 'danger'
  const statusLabel = score >= 75 ? 'Sehat' : score >= 50 ? 'Perlu dijaga' : 'Perlu perhatian'

  const risks: AdvisorSummary['risks'] = []
  if (current.cashflow < 0) risks.push({ tone:'danger', title:'Cashflow negatif', detail:'Pengeluaran dan saving bulan ini sudah melebihi pemasukan.' })
  if (current.expenseRate > 80) risks.push({ tone:'warning', title:'Expense rate tinggi', detail:`Expense rate bulan ini ${Math.round(current.expenseRate)}% dari income.` })
  if (current.savingRate < 10 && current.income > 0) risks.push({ tone:'warning', title:'Saving rate rendah', detail:`Saving rate baru ${Math.round(current.savingRate)}%. Target awal yang sehat minimal 10%.` })
  if (debtRatio > 35) risks.push({ tone:'danger', title:'Rasio cicilan tinggi', detail:`Rasio cicilan sekitar ${Math.round(debtRatio)}% dari income.` })
  if (previous && current.expense > previous.expense * 1.15) risks.push({ tone:'warning', title:'Expense naik dari bulan lalu', detail:`Pengeluaran naik sekitar ${Math.round(pctChange(current.expense, previous.expense) || 0)}%.` })
  if (risks.length === 0) risks.push({ tone:'good', title:'Tidak ada sinyal besar', detail:'Belum ada risiko besar dari data bulan ini.' })

  const priorities: AdvisorPriority[] = []
  if (current.cashflow < 0) priorities.push({ level:'high', title:'Pulihkan cashflow dulu', detail:'Tahan belanja non-prioritas sampai cashflow kembali positif.' })
  if (current.savingRate < 10 && current.income > 0) priorities.push({ level:'medium', title:'Naikkan saving rate bertahap', detail:`Mulai dari 10% income, sekitar Rp ${Math.round(current.income * 0.1).toLocaleString('id-ID')}.` })
  if (debtRatio > 25) priorities.push({ level: debtRatio > 35 ? 'high' : 'medium', title:'Jaga beban cicilan', detail:'Hindari cicilan baru dan prioritaskan pelunasan utang berbunga tinggi.' })
  if (milestone) priorities.push({ level:'low', title:`Percepat ${milestone.title}`, detail: milestone.monthly > 0 ? `Pertahankan alokasi Rp ${Math.round(milestone.monthly).toLocaleString('id-ID')} per bulan.` : milestone.detail })
  if (priorities.length === 0) priorities.push({ level:'low', title:'Pertahankan pola bulan ini', detail:'Cashflow, saving, dan risiko utama masih terkendali.' })

  let mainInsight = 'FiNK belum memiliki data yang cukup untuk membaca pola bulanan.'
  if (current.income > 0) {
    if (current.cashflow < 0) mainInsight = `Bulan ini perlu dijaga: cashflow minus Rp ${Math.abs(Math.round(current.cashflow)).toLocaleString('id-ID')}. Prioritasnya bukan menambah target, tetapi menekan pengeluaran fleksibel.`
    else if (current.savingRate >= 20) mainInsight = `Kondisi bulan ini kuat. Saving rate ${Math.round(current.savingRate)}% dan cashflow masih positif, sehingga target keuangan bisa dipercepat.`
    else if (current.expenseRate > 80) mainInsight = `Income sudah tercatat, tetapi expense rate ${Math.round(current.expenseRate)}%. FiNK menyarankan audit kategori terbesar sebelum menambah komitmen baru.`
    else mainInsight = `Kondisi bulan ini cukup stabil. Fokus berikutnya adalah menjaga saving rate dan melanjutkan target prioritas.`
  }

  return {
    score,
    status,
    statusLabel,
    mainInsight,
    monthly: current,
    previous,
    averages: {
      income3m: avg('income'),
      expense3m: avg('expense'),
      saving3m: avg('saving'),
      savingRate3m: avg('savingRate'),
    },
    deltas: {
      incomeVsPrev: previous ? pctChange(current.income, previous.income) : null,
      expenseVsPrev: previous ? pctChange(current.expense, previous.expense) : null,
      savingVsPrev: previous ? pctChange(current.saving, previous.saving) : null,
      savingRateVsPrev: previous ? current.savingRate - previous.savingRate : null,
    },
    ratios: {
      savingRate: current.savingRate,
      expenseRate: current.expenseRate,
      debtRatio,
    },
    risks,
    priorities,
    milestone,
  }
}
