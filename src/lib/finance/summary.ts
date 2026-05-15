import type { BudgetCategory, DebtRow, IncomeCategory, MonthKey, SavingRow, Transaction } from '@/types/database'
import type { SavingsGoal, GoalCalcResult } from '@/types/savings'
import { applyIncomeAwareGoalPlan, buildGoalAdvisorItem, sortGoalsByAdvisor, type GoalAdvisorItem, type GoalPlanSummary } from '@/lib/finance/goals'

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
  goalInsights: GoalAdvisorItem[]
  focusGoals: GoalAdvisorItem[]
  goalPlan: GoalPlanSummary
  tradeoffs: { title: string; detail: string; tone: 'good' | 'warning' | 'danger' | 'neutral' }[]
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


function monthsBetweenLocal(from: Date, to: Date): number {
  return Math.max(1, (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()))
}

function yearsUntilLocal(deadline: string): number {
  if (!deadline) return 0
  return Math.max(0, (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 365))
}

function futureValueLocal(currentVal: number, inflationRate: number, years: number): number {
  if (years <= 0) return currentVal
  return currentVal * Math.pow(1 + inflationRate / 100, years)
}

function effectiveGoalTarget(g: SavingsGoal): number {
  if (g.type === 'darurat' && g.expense && g.coverageTarget) return Math.max(0, g.expense * g.coverageTarget)
  if (g.type === 'pendidikan' && g.eduCurrent && g.deadline) return futureValueLocal(g.eduCurrent, g.eduInflasi || 8, yearsUntilLocal(g.deadline))
  if (g.type === 'pensiun' && g.pensionExp && g.deadline) {
    const futureAnnualExpense = futureValueLocal(g.pensionExp * 12, g.pensionInflasi || 5, yearsUntilLocal(g.deadline))
    return 25 * futureAnnualExpense
  }
  return Math.max(0, g.target || 0)
}

function calcGoalForAdvisor(g: SavingsGoal): GoalCalcResult {
  const deadline = g.deadline ? new Date(g.deadline) : null
  const months = deadline ? monthsBetweenLocal(new Date(), deadline) : 60
  const targetNow = effectiveGoalTarget(g)
  const sisa = Math.max(0, targetNow - Number(g.current || 0))
  const progress = targetNow > 0 ? Math.min(1, Number(g.current || 0) / targetNow) : 0
  const monthlyNeeded = months > 0 ? sisa / months : sisa
  let trackStatus: GoalCalcResult['trackStatus'] = 'ontrack'
  if (progress >= 1) trackStatus = 'complete'
  else if (g.monthly > 0 && monthlyNeeded > 0) {
    if (g.monthly >= monthlyNeeded * 1.1) trackStatus = 'ahead'
    else if (g.monthly < monthlyNeeded * 0.85) trackStatus = 'behind'
  }
  let coverage: number | undefined
  let coverageStatus: GoalCalcResult['coverageStatus']
  let excessDana: number | undefined
  if (g.type === 'darurat' && g.expense && g.expense > 0) {
    coverage = Number(g.current || 0) / g.expense
    excessDana = Math.max(0, Number(g.current || 0) - 6 * g.expense)
    if (coverage < 3) coverageStatus = 'Risiko Tinggi'
    else if (coverage <= 6) coverageStatus = 'Cukup Aman'
    else coverageStatus = 'Aman'
  }
  return { targetNow, sisa, progress, months, monthlyNeeded, trackStatus, coverage, coverageStatus, excessDana }
}

function buildGoalInsights(goals: SavingsGoal[]) {
  const active = (goals || []).filter(g => g.status === 'active')
  const sorted = sortGoalsByAdvisor(active, calcGoalForAdvisor)
  return sorted.map(g => buildGoalAdvisorItem(g, calcGoalForAdvisor(g), goals))
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
  const sorted = sortGoalsByAdvisor(active, calcGoalForAdvisor)
  const g = sorted[0]
  const calc = calcGoalForAdvisor(g)
  const progress = Math.min(100, (calc.progress || 0) * 100)
  const gap = Math.max(0, calc.sisa || 0)
  return {
    title: g.name || 'Primary goal',
    current: Number(g.current || 0),
    target: Number(calc.targetNow || g.target || 0),
    progress,
    monthly: Number(g.monthly || 0),
    detail: gap > 0 ? `Remaining gap around Rp ${Math.round(gap).toLocaleString('id-ID')}.` : 'This goal is already completed.',
  }
}

function safeGoalAllocationCapacity(current: MonthlyTrendItem, currentPlan?: RawPlan | null) {
  const debt = sumPlanDebt(currentPlan)
  const minimumBuffer = Math.max(0, current.income * 0.05)
  // Use actual saving when available, but protect cashflow and mandatory debt first.
  const capacityFromBudget = Math.max(0, current.income - current.expense - debt - minimumBuffer)
  const actualSaving = Math.max(0, current.saving || 0)
  if (actualSaving > 0) return Math.min(Math.max(actualSaving, capacityFromBudget * 0.65), capacityFromBudget || actualSaving)
  return capacityFromBudget
}

function buildTradeoffs(goalInsights: GoalAdvisorItem[], goalPlan: GoalPlanSummary): AdvisorSummary['tradeoffs'] {
  const tradeoffs: AdvisorSummary['tradeoffs'] = []
  const unrealistic = goalInsights.filter(g => g.feasibility === 'unrealistic').slice(0, 2)
  if (goalPlan.status === 'overloaded') {
    tradeoffs.push({
      tone: 'warning',
      title: 'Goals may need more income or more time',
      detail: `Ideal monthly allocation is around Rp ${Math.round(goalPlan.totalIdealMonthly).toLocaleString('id-ID')}, while realistic capacity is around Rp ${Math.round(goalPlan.safeCapacity).toLocaleString('id-ID')}.`,
    })
  }
  unrealistic.forEach(goal => {
    tradeoffs.push({
      tone: 'warning',
      title: `${goal.name} needs a softer timeline`,
      detail: 'This does not mean the goal is impossible. It means the current timeline may need additional income, a longer deadline, or a lower target.',
    })
  })
  const highCount = goalInsights.filter(g => g.priority === 'critical' || g.priority === 'high').length
  if (highCount > 3) {
    tradeoffs.push({ tone: 'warning', title: 'Too many high-priority goals', detail: 'Focus on 1–3 important goals first so monthly allocation does not become too thin.' })
  }
  if (tradeoffs.length === 0) {
    tradeoffs.push({ tone: 'good', title: 'Goal structure is manageable', detail: 'Current goals look reasonable. Keep reviewing them when income, expenses, or deadlines change.' })
  }
  return tradeoffs.slice(0, 3)
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
  const debt = sumPlanDebt(params.currentPlan)
  const debtRatio = current.income > 0 ? (debt / current.income) * 100 : 0
  const baseGoalInsights = buildGoalInsights(params.goals || [])
  const capacity = safeGoalAllocationCapacity(current, params.currentPlan)
  const plannedGoals = applyIncomeAwareGoalPlan(baseGoalInsights, capacity)
  const goalInsights = plannedGoals.items.slice(0, 8)
  const goalPlan = plannedGoals.plan
  const focusGoals = goalInsights.filter(g => g.focus || g.priority === 'critical' || g.priority === 'high').slice(0, 3)
  const milestone = pickMilestone(params.goals || [])
  const tradeoffs = buildTradeoffs(goalInsights, goalPlan)
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
  if (goalPlan.status === 'overloaded') risks.push({ tone:'warning', title:'Goal timeline terlalu agresif', detail:'Beberapa tujuan mungkin membutuhkan tambahan pemasukan, deadline lebih panjang, atau prioritas yang lebih sedikit.' })
  if (risks.length === 0) risks.push({ tone:'good', title:'Tidak ada sinyal besar', detail:'Belum ada risiko besar dari data bulan ini.' })

  const priorities: AdvisorPriority[] = []
  if (current.cashflow < 0) priorities.push({ level:'high', title:'Pulihkan cashflow dulu', detail:'Tahan belanja non-prioritas sampai cashflow kembali positif.' })
  if (current.savingRate < 10 && current.income > 0) priorities.push({ level:'medium', title:'Naikkan saving rate bertahap', detail:`Mulai dari 10% income, sekitar Rp ${Math.round(current.income * 0.1).toLocaleString('id-ID')}.` })
  if (debtRatio > 25) priorities.push({ level: debtRatio > 35 ? 'high' : 'medium', title:'Jaga beban cicilan', detail:'Hindari cicilan baru dan prioritaskan pelunasan utang berbunga tinggi.' })
  if (goalPlan.status === 'overloaded') priorities.push({ level:'high', title:'Review income or timeline', detail:'Your goals need more allocation than current safe capacity. Consider increasing income, extending deadlines, or reducing active focus goals.' })
  focusGoals.slice(0, 2).forEach((g) => {
    priorities.push({ level: g.priority === 'critical' || g.priority === 'high' ? 'high' : g.priority === 'medium' ? 'medium' : 'low', title:`Focus on ${g.name}`, detail: `${g.recommendation} ${g.realisticEtaLabel !== 'No ETA yet' ? `Realistic ETA: ${g.realisticEtaLabel}.` : ''}` })
  })
  if (milestone) priorities.push({ level:'low', title:`Percepat ${milestone.title}`, detail: milestone.monthly > 0 ? `Pertahankan alokasi Rp ${Math.round(milestone.monthly).toLocaleString('id-ID')} per bulan.` : milestone.detail })
  if (priorities.length === 0) priorities.push({ level:'low', title:'Pertahankan pola bulan ini', detail:'Cashflow, saving, dan risiko utama masih terkendali.' })

  let mainInsight = 'FiNK does not have enough data yet to read your monthly pattern.'
  const topGoal = focusGoals[0]
  if (goalPlan.status === 'overloaded') {
    mainInsight = `Your goals are meaningful, but the current timeline may need more income or more time. FiNK will prioritize the most important goals first.`
  } else if (topGoal && (topGoal.priority === 'critical' || topGoal.priority === 'high')) {
    mainInsight = `${topGoal.name} should be the main focus now. ${topGoal.recommendation}`
  } else if (current.income > 0) {
    if (current.cashflow < 0) mainInsight = `This month needs attention: cashflow is negative by Rp ${Math.abs(Math.round(current.cashflow)).toLocaleString('id-ID')}. Prioritize stabilizing spending before adding new goals.`
    else if (current.savingRate >= 20) mainInsight = `This month is strong. Saving rate is ${Math.round(current.savingRate)}% and cashflow stays positive, so priority goals can be accelerated.`
    else if (current.expenseRate > 80) mainInsight = `Income is recorded, but expense rate is ${Math.round(current.expenseRate)}%. Review the largest categories before adding new commitments.`
    else mainInsight = `This month is fairly stable. Keep saving rate healthy and continue funding your priority goals.`
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
    goalInsights,
    focusGoals,
    goalPlan,
    tradeoffs,
    milestone,
  }
}
