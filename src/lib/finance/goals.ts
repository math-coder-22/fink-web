import type { SavingsGoal, GoalCalcResult, GoalPriorityLevel, GoalHealthStatus } from '@/types/savings'

export type GoalFeasibilityStatus = 'realistic' | 'aggressive' | 'unrealistic' | 'unknown' | 'complete'

export type GoalAdvisorItem = {
  id: string
  name: string
  type: SavingsGoal['type']
  typeLabel: string
  priority: GoalPriorityLevel
  priorityLabel: string
  health: GoalHealthStatus
  healthLabel: string
  recommendation: string
  reason: string
  progress: number
  current: number
  target: number
  monthly: number
  monthlyNeeded: number
  idealMonthly: number
  suggestedMonthly: number
  gap: number
  monthsLeft: number
  etaMonths: number | null
  etaLabel: string
  realisticEtaMonths: number | null
  realisticEtaLabel: string
  feasibility: GoalFeasibilityStatus
  feasibilityLabel: string
  feasibilityMessage: string
  allocationGap: number
  focus: boolean
  mode: 'auto' | 'manual'
}

export type GoalPlanSummary = {
  safeCapacity: number
  totalIdealMonthly: number
  allocatedMonthly: number
  capacityGap: number
  status: 'healthy' | 'stretched' | 'overloaded' | 'no_capacity'
  statusLabel: string
  message: string
}

const TYPE_RANK: Record<string, number> = {
  darurat: 1,
  rumah: 2,
  pendidikan: 3,
  kendaraan: 4,
  investasi: 5,
  pensiun: 6,
  darurat_lanjutan: 7,
  biasa: 8,
}

const PRIORITY_RANK: Record<GoalPriorityLevel, number> = {
  critical: 1,
  high: 2,
  medium: 3,
  low: 4,
  maintain: 5,
  paused: 6,
}

const PRIORITY_WEIGHT: Record<GoalPriorityLevel, number> = {
  critical: 5,
  high: 4,
  medium: 2.25,
  low: 1,
  maintain: 0.4,
  paused: 0,
}

export function goalTypeLabel(type: SavingsGoal['type']) {
  const map: Record<SavingsGoal['type'], string> = {
    darurat: 'Emergency Fund',
    darurat_lanjutan: 'Extended Emergency',
    rumah: 'House',
    kendaraan: 'Vehicle',
    pendidikan: 'Education',
    pensiun: 'Retirement',
    investasi: 'Investment',
    biasa: 'General Saving',
  }
  return map[type] || 'General Saving'
}

export function priorityLabel(priority: GoalPriorityLevel) {
  const map: Record<GoalPriorityLevel, string> = {
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    maintain: 'Maintain',
    paused: 'Paused',
  }
  return map[priority]
}

export function healthLabel(health: GoalHealthStatus) {
  const map: Record<GoalHealthStatus, string> = {
    ontrack: 'On Track',
    behind: 'Behind',
    atrisk: 'At Risk',
    complete: 'Complete',
  }
  return map[health]
}

export function feasibilityLabel(status: GoalFeasibilityStatus) {
  const map: Record<GoalFeasibilityStatus, string> = {
    realistic: 'Realistic',
    aggressive: 'Aggressive',
    unrealistic: 'Needs Income or More Time',
    unknown: 'Needs Allocation',
    complete: 'Complete',
  }
  return map[status]
}

function fmt(n: number) {
  return 'Rp ' + Math.abs(Math.round(n || 0)).toLocaleString('id-ID')
}

function monthLabel(months: number | null) {
  if (months === null || !Number.isFinite(months) || months <= 0) return 'Belum ada estimasi'
  const m = Math.ceil(months)
  if (m <= 1) return 'About 1 month'
  if (m < 12) return `About ${m} months`
  const y = Math.floor(m / 12)
  const r = m % 12
  return r ? `About ${y}y ${r}m` : `About ${y}y`
}

function manualToPriority(value?: SavingsGoal['manualPriority']): GoalPriorityLevel {
  if (value === 'critical' || value === 'high' || value === 'medium' || value === 'low' || value === 'maintain' || value === 'paused') return value
  return 'medium'
}

function emergencyCoverage(goal: SavingsGoal) {
  if (goal.expense && goal.expense > 0) return Number(goal.current || 0) / Number(goal.expense || 1)
  if (goal.target && goal.target > 0) return (Number(goal.current || 0) / Number(goal.target || 1)) * 6
  return 0
}

function getPrimaryEmergency(goals: SavingsGoal[], id?: string) {
  return goals.find(g => g.id !== id && g.status === 'active' && g.type === 'darurat')
}

export function calculateGoalPriority(goal: SavingsGoal, calc: GoalCalcResult, allGoals: SavingsGoal[] = []): GoalPriorityLevel {
  if (goal.status === 'complete') return 'maintain'
  if (goal.status === 'archived' || goal.status === 'pending') return 'paused'
  if ((goal.priorityMode || 'auto') === 'manual') return manualToPriority(goal.manualPriority)

  const progress = calc.progress || 0
  const months = calc.months || 0

  if (progress >= 1) return 'maintain'

  if (goal.type === 'darurat') {
    const coverage = calc.coverage ?? emergencyCoverage(goal)
    if (coverage < 3) return 'critical'
    if (coverage < 6) return 'high'
    return 'maintain'
  }

  if (goal.type === 'darurat_lanjutan') {
    const primaryEmergency = getPrimaryEmergency(allGoals, goal.id)
    const primaryCoverage = primaryEmergency ? emergencyCoverage(primaryEmergency) : 6
    if (primaryCoverage < 3) return 'paused'
    if (primaryCoverage < 6) return 'low'
    if (progress >= 0.5) return 'maintain'
    return 'low'
  }

  if (months <= 3 && progress < 0.9) return 'high'
  if (months <= 6 && progress < 0.75) return 'high'
  if (calc.trackStatus === 'behind' && months <= 12) return 'high'
  if (calc.trackStatus === 'behind') return 'medium'
  if (goal.focus) return 'high'
  if (goal.type === 'rumah' || goal.type === 'pendidikan') return 'medium'
  if (goal.type === 'pensiun' || goal.type === 'investasi') return 'low'
  return 'medium'
}

export function calculateGoalHealth(goal: SavingsGoal, calc: GoalCalcResult): GoalHealthStatus {
  if (goal.status === 'complete' || calc.progress >= 1) return 'complete'
  if (goal.status === 'pending' || goal.status === 'archived') return 'ontrack'
  if (calc.trackStatus === 'behind' && calc.months <= 6) return 'atrisk'
  if (calc.trackStatus === 'behind') return 'behind'
  return 'ontrack'
}

function etaFromMonthly(gap: number, monthly: number) {
  if (gap <= 0) return 0
  if (!monthly || monthly <= 0) return null
  return gap / monthly
}

function feasibilityFromAllocation(goal: SavingsGoal, monthlyNeeded: number, suggestedMonthly: number, gap: number): GoalFeasibilityStatus {
  if (gap <= 0 || goal.status === 'complete') return 'complete'
  if (!suggestedMonthly || suggestedMonthly <= 0) return 'unknown'
  if (!monthlyNeeded || monthlyNeeded <= 0) return 'realistic'
  const ratio = suggestedMonthly / monthlyNeeded
  if (ratio >= 0.9) return 'realistic'
  if (ratio >= 0.55) return 'aggressive'
  return 'unrealistic'
}

function feasibilityMessage(goal: SavingsGoal, status: GoalFeasibilityStatus, idealMonthly: number, suggestedMonthly: number, eta: string) {
  if (status === 'complete') return 'Target ini sudah selesai. Simpan sebagai referensi atau pindahkan ke daftar target selesai.'
  if (status === 'unknown') return 'FiNK membutuhkan alokasi bulanan agar estimasi target ini lebih akurat.'
  if (status === 'realistic') return `Target ini masih cukup realistis dengan pola alokasi saat ini. Estimated completion: ${eta}.`
  if (status === 'aggressive') return `Timeline ini masih memungkinkan, tetapi membutuhkan konsistensi alokasi. Alokasi ideal berada di sekitar ${fmt(idealMonthly)} per month.`
  return `Timeline ini kemungkinan cukup berat dengan kapasitas alokasi saat ini. Pertimbangkan untuk meningkatkan pemasukan, memperpanjang timeline, atau menyesuaikan nilai target.`
}

export function goalRecommendation(goal: SavingsGoal, calc: GoalCalcResult, priority: GoalPriorityLevel, health: GoalHealthStatus, allGoals: SavingsGoal[] = [], suggestedMonthly?: number) {
  const monthlyNeeded = Math.round(calc.monthlyNeeded || 0)
  const monthly = Math.round(suggestedMonthly ?? goal.monthly ?? 0)

  if (health === 'complete') return 'Target sudah selesai. Simpan sebagai referensi atau pindahkan ke daftar target selesai.'
  if (priority === 'paused') return 'Biarkan target ini dalam status jeda sampai fondasi keuangan yang lebih penting sudah stabil.'
  if (goal.type === 'darurat') {
    const coverage = calc.coverage ?? emergencyCoverage(goal)
    if (coverage < 3) return 'Prioritaskan target ini hingga mampu menutupi minimal 3 bulan pengeluaran.'
    if (coverage < 6) return 'Continue building this until it reaches the safer 6-month zone.'
    return 'Primary emergency fund is safe. Maintain it and avoid overfunding cash.'
  }
  if (goal.type === 'darurat_lanjutan') {
    const primary = getPrimaryEmergency(allGoals, goal.id)
    const primaryCoverage = primary ? emergencyCoverage(primary) : 6
    if (primaryCoverage < 6) return 'Keep this secondary buffer lower priority until the primary emergency fund reaches 6 months.'
    if ((calc.progress || 0) >= 0.5) return 'Cadangan lanjutan ini sudah memiliki dasar yang cukup baik. Pertahankan secara bertahap sambil memprioritaskan target yang lebih penting.'
    return 'Add gradually as a conservative buffer after the primary emergency fund is safe.'
  }
  if (priority === 'maintain') return 'Target ini sudah berada di zona cukup aman. Pertahankan alokasi saat ini tanpa menjadikannya prioritas berlebihan.'
  if (monthlyNeeded > 0 && monthly < monthlyNeeded * 0.9) return `Alokasi ideal berada di sekitar ${fmt(monthlyNeeded)} per bulan, tetapi FiNK dapat menyusun ritme yang lebih realistis berdasarkan pemasukan.`
  if (monthly > 0 && monthly >= monthlyNeeded) return `Alokasi saat ini sebesar ${fmt(monthly)} sudah cukup untuk timeline yang dipilih.`
  if (goal.type === 'pensiun' || goal.type === 'investasi') return 'Pertahankan alokasi yang stabil. Target ini penting, tetapi jangan sampai menggeser target jangka pendek yang lebih mendesak.'
  return 'Tetapkan alokasi bulanan agar FiNK dapat memperkirakan timeline target dengan lebih akurat.'
}

export function goalReason(goal: SavingsGoal, calc: GoalCalcResult, priority: GoalPriorityLevel, allGoals: SavingsGoal[] = []) {
  const mode = goal.priorityMode || 'auto'
  if (mode === 'manual') return 'Prioritas target ini diatur secara manual oleh pengguna.'
  if (goal.type === 'darurat') return 'Dana darurat adalah fondasi utama sebelum mengejar target tambahan.'
  if (goal.type === 'darurat_lanjutan') {
    const primary = getPrimaryEmergency(allGoals, goal.id)
    const primaryCoverage = primary ? emergencyCoverage(primary) : 6
    if (primaryCoverage < 6) return 'Primary emergency fund is not yet fully safe, so this extended buffer stays lower priority.'
    return 'Extended emergency is a secondary buffer; it is useful, but not always the main focus.'
  }
  if (priority === 'high') return 'Target ini cukup sensitif terhadap waktu atau tertinggal dari kecepatan menabung saat ini.'
  if (priority === 'low' || priority === 'maintain') return 'Target ini dapat berjalan pelan-pelan sambil mendahulukan target dengan prioritas lebih tinggi.'
  return 'Berdasarkan timeline, progres, jenis target, dan alokasi bulanan saat ini.'
}

export function buildGoalAdvisorItem(goal: SavingsGoal, calc: GoalCalcResult, allGoals: SavingsGoal[] = [], suggestedMonthly?: number): GoalAdvisorItem {
  const priority = calculateGoalPriority(goal, calc, allGoals)
  const health = calculateGoalHealth(goal, calc)
  const mode = goal.priorityMode || 'auto'
  const progress = Math.round((calc.progress || 0) * 100)
  const gap = Number(calc.sisa || 0)
  const idealMonthly = Number(calc.monthlyNeeded || 0)
  const baseRekomendasi = Number(suggestedMonthly ?? goal.monthly ?? 0)
  const etaMonths = etaFromMonthly(gap, Number(goal.monthly || 0))
  const realisticEtaMonths = etaFromMonthly(gap, baseRekomendasi)
  const realisticEtaLabel = monthLabel(realisticEtaMonths)
  const feasibility = feasibilityFromAllocation(goal, idealMonthly, baseRekomendasi, gap)

  return {
    id: goal.id,
    name: goal.name,
    type: goal.type,
    typeLabel: goalTypeLabel(goal.type),
    priority,
    priorityLabel: priorityLabel(priority),
    health,
    healthLabel: healthLabel(health),
    recommendation: goalRecommendation(goal, calc, priority, health, allGoals, baseRekomendasi),
    reason: goalReason(goal, calc, priority, allGoals),
    progress,
    current: Number(goal.current || 0),
    target: Number(calc.targetNow || goal.target || 0),
    monthly: Number(goal.monthly || 0),
    monthlyNeeded: idealMonthly,
    idealMonthly,
    suggestedMonthly: baseRekomendasi,
    gap,
    monthsLeft: Number(calc.months || 0),
    etaMonths,
    etaLabel: monthLabel(etaMonths),
    realisticEtaMonths,
    realisticEtaLabel,
    feasibility,
    feasibilityLabel: feasibilityLabel(feasibility),
    feasibilityMessage: feasibilityMessage(goal, feasibility, idealMonthly, baseRekomendasi, realisticEtaLabel),
    allocationGap: Math.max(0, idealMonthly - baseRekomendasi),
    focus: Boolean(goal.focus),
    mode,
  }
}

export function applyIncomeAwareGoalPlan(items: GoalAdvisorItem[], safeCapacity: number): { items: GoalAdvisorItem[]; plan: GoalPlanSummary } {
  const active = items.filter(item => item.gap > 0 && item.priority !== 'paused' && item.priority !== 'maintain')
  const totalIdealMonthly = active.reduce((sum, item) => sum + Math.max(0, item.idealMonthly || 0), 0)
  const safe = Math.max(0, Number(safeCapacity || 0))

  const allocations = new Map<string, number>()
  active.forEach(item => allocations.set(item.id, 0))

  if (active.length > 0 && safe > 0) {
    let remaining = Math.min(safe, totalIdealMonthly || safe)
    let open = [...active]
    for (let round = 0; round < 4 && remaining > 1 && open.length > 0; round++) {
      const weightSum = open.reduce((sum, item) => sum + PRIORITY_WEIGHT[item.priority], 0) || 1
      const nextOpen: GoalAdvisorItem[] = []
      let used = 0
      open.forEach(item => {
        const current = allocations.get(item.id) || 0
        const maxNeed = Math.max(0, item.idealMonthly || 0)
        const share = remaining * (PRIORITY_WEIGHT[item.priority] / weightSum)
        const add = Math.min(share, Math.max(0, maxNeed - current))
        allocations.set(item.id, current + add)
        used += add
        if (current + add < maxNeed - 1) nextOpen.push(item)
      })
      remaining -= used
      open = nextOpen
      if (used <= 1) break
    }
  }

  const planned = items.map(item => {
    if (!allocations.has(item.id)) return item
    const suggestedMonthly = Math.round(allocations.get(item.id) || 0)
    const realisticEtaMonths = etaFromMonthly(item.gap, suggestedMonthly)
    const realisticEtaLabel = monthLabel(realisticEtaMonths)
    const feasibility = feasibilityFromAllocation({ status: item.health === 'complete' ? 'complete' : 'active' } as SavingsGoal, item.idealMonthly, suggestedMonthly, item.gap)
    return {
      ...item,
      suggestedMonthly,
      realisticEtaMonths,
      realisticEtaLabel,
      feasibility,
      feasibilityLabel: feasibilityLabel(feasibility),
      feasibilityMessage: feasibilityMessage({ status: item.health === 'complete' ? 'complete' : 'active' } as SavingsGoal, feasibility, item.idealMonthly, suggestedMonthly, realisticEtaLabel),
      allocationGap: Math.max(0, item.idealMonthly - suggestedMonthly),
      recommendation: feasibility === 'unrealistic'
        ? 'Timeline ini mungkin membutuhkan tambahan pemasukan, waktu yang lebih panjang, atau nilai target yang lebih realistis agar tetap sehat.'
        : feasibility === 'aggressive'
          ? `Alokasi yang realistis bulan ini sekitar ${fmt(suggestedMonthly)}. Tetap beri ruang fleksibilitas pada timeline target.`
          : suggestedMonthly > 0
            ? `Alokasikan sekitar ${fmt(suggestedMonthly)} bulan ini agar target tetap bergerak maju.`
            : item.recommendation,
    }
  })

  const allocatedMonthly = active.reduce((sum, item) => sum + (allocations.get(item.id) || 0), 0)
  const capacityGap = Math.max(0, totalIdealMonthly - safe)
  let status: GoalPlanSummary['status'] = 'healthy'
  if (safe <= 0 && totalIdealMonthly > 0) status = 'no_capacity'
  else if (totalIdealMonthly > safe * 1.75) status = 'overloaded'
  else if (totalIdealMonthly > safe) status = 'stretched'

  const message = status === 'healthy'
    ? 'Struktur pemasukan saat ini masih mampu mendukung timeline target dengan disiplin alokasi yang wajar.'
    : status === 'stretched'
      ? 'Some timelines are ambitious. FiNK will prioritize the most important goals first and keep the plan realistic.'
      : status === 'overloaded'
        ? 'Target aktif Anda membutuhkan alokasi lebih besar daripada kapasitas aman pemasukan saat ini. Tambahan pemasukan, timeline yang lebih panjang, atau jumlah target fokus yang lebih sedikit dapat membantu.'
        : 'Kapasitas alokasi aman bulan ini belum cukup. Stabilkan arus kas terlebih dahulu sebelum mempercepat target.'

  return {
    items: planned,
    plan: {
      safeCapacity: safe,
      totalIdealMonthly,
      allocatedMonthly,
      capacityGap,
      status,
      statusLabel: status === 'healthy' ? 'Realistic' : status === 'stretched' ? 'Aggressive' : status === 'overloaded' ? 'Needs Income or More Time' : 'Stabilize Cashflow First',
      message,
    },
  }
}

export function sortGoalsByAdvisor<T extends SavingsGoal>(goals: T[], calcGoal: (goal: T) => GoalCalcResult): T[] {
  return [...goals].sort((a, b) => {
    const ai = buildGoalAdvisorItem(a, calcGoal(a), goals)
    const bi = buildGoalAdvisorItem(b, calcGoal(b), goals)
    if (a.focus && !b.focus) return -1
    if (!a.focus && b.focus) return 1
    const pr = PRIORITY_RANK[ai.priority] - PRIORITY_RANK[bi.priority]
    if (pr !== 0) return pr
    const healthRank: Record<GoalHealthStatus, number> = { atrisk: 1, behind: 2, ontrack: 3, complete: 4 }
    const hr = healthRank[ai.health] - healthRank[bi.health]
    if (hr !== 0) return hr
    const tr = (TYPE_RANK[a.type] ?? 99) - (TYPE_RANK[b.type] ?? 99)
    if (tr !== 0) return tr
    return new Date(a.deadline || '2999-12-31').getTime() - new Date(b.deadline || '2999-12-31').getTime()
  })
}
