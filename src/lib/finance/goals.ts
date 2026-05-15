import type { SavingsGoal, GoalCalcResult, GoalPriorityLevel, GoalHealthStatus } from '@/types/savings'

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
  gap: number
  monthsLeft: number
  focus: boolean
  mode: 'auto' | 'manual'
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

export function goalRecommendation(goal: SavingsGoal, calc: GoalCalcResult, priority: GoalPriorityLevel, health: GoalHealthStatus, allGoals: SavingsGoal[] = []) {
  const monthlyNeeded = Math.round(calc.monthlyNeeded || 0)
  const monthly = Math.round(goal.monthly || 0)
  const fmt = (n: number) => 'Rp ' + Math.abs(Math.round(n || 0)).toLocaleString('id-ID')

  if (health === 'complete') return 'Goal completed. Keep it as reference or move it to completed goals.'
  if (priority === 'paused') return 'Keep this goal paused until higher-priority foundations are stable.'
  if (goal.type === 'darurat') {
    const coverage = calc.coverage ?? emergencyCoverage(goal)
    if (coverage < 3) return 'Build this first until it covers at least 3 months of expenses.'
    if (coverage < 6) return 'Continue building this until it reaches the safer 6-month zone.'
    return 'Primary emergency fund is safe. Maintain it and avoid overfunding cash.'
  }
  if (goal.type === 'darurat_lanjutan') {
    const primary = getPrimaryEmergency(allGoals, goal.id)
    const primaryCoverage = primary ? emergencyCoverage(primary) : 6
    if (primaryCoverage < 6) return 'Keep this secondary buffer lower priority until the primary emergency fund reaches 6 months.'
    if ((calc.progress || 0) >= 0.5) return 'This extended buffer already has a useful base. Maintain slowly while funding higher-impact goals.'
    return 'Add gradually as a conservative buffer after the primary emergency fund is safe.'
  }
  if (priority === 'maintain') return 'This goal is already in a safe zone. Maintain the current allocation without over-prioritizing it.'
  if (monthlyNeeded > 0 && monthly < monthlyNeeded) return `Increase monthly allocation to around ${fmt(monthlyNeeded)} to stay on track.`
  if (monthly > 0 && monthly >= monthlyNeeded) return `Current allocation of ${fmt(monthly)} is enough for the current timeline.`
  if (goal.type === 'pensiun' || goal.type === 'investasi') return 'Keep a steady allocation; this is important but should not crowd out urgent short-term goals.'
  return 'Set a monthly allocation so FiNK can estimate the timeline more accurately.'
}

export function goalReason(goal: SavingsGoal, calc: GoalCalcResult, priority: GoalPriorityLevel, allGoals: SavingsGoal[] = []) {
  const mode = goal.priorityMode || 'auto'
  if (mode === 'manual') return 'Priority is set manually by the user.'
  if (goal.type === 'darurat') return 'Emergency fund is a foundation goal before optional goals.'
  if (goal.type === 'darurat_lanjutan') {
    const primary = getPrimaryEmergency(allGoals, goal.id)
    const primaryCoverage = primary ? emergencyCoverage(primary) : 6
    if (primaryCoverage < 6) return 'Primary emergency fund is not yet fully safe, so this extended buffer stays lower priority.'
    return 'Extended emergency is a secondary buffer; it is useful, but not always the main focus.'
  }
  if (priority === 'high') return 'This goal is time-sensitive or behind the current saving pace.'
  if (priority === 'low' || priority === 'maintain') return 'This goal can continue in the background while higher-priority goals are handled.'
  return 'Based on timeline, progress, goal type, and current monthly allocation.'
}

export function buildGoalAdvisorItem(goal: SavingsGoal, calc: GoalCalcResult, allGoals: SavingsGoal[] = []): GoalAdvisorItem {
  const priority = calculateGoalPriority(goal, calc, allGoals)
  const health = calculateGoalHealth(goal, calc)
  const mode = goal.priorityMode || 'auto'
  const progress = Math.round((calc.progress || 0) * 100)

  return {
    id: goal.id,
    name: goal.name,
    type: goal.type,
    typeLabel: goalTypeLabel(goal.type),
    priority,
    priorityLabel: priorityLabel(priority),
    health,
    healthLabel: healthLabel(health),
    recommendation: goalRecommendation(goal, calc, priority, health, allGoals),
    reason: goalReason(goal, calc, priority, allGoals),
    progress,
    current: Number(goal.current || 0),
    target: Number(calc.targetNow || goal.target || 0),
    monthly: Number(goal.monthly || 0),
    monthlyNeeded: Number(calc.monthlyNeeded || 0),
    gap: Number(calc.sisa || 0),
    monthsLeft: Number(calc.months || 0),
    focus: Boolean(goal.focus),
    mode,
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
