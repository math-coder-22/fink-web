// ─── Savings / Goal Types ───────────────────────────────

export type GoalType   = 'darurat' | 'pendidikan' | 'pensiun' | 'biasa'
export type GoalStatus = 'active' | 'pending' | 'complete' | 'archived'
export type TxType     = 'topup' | 'withdraw'

export interface GoalTransaction {
  id:        string
  type:      TxType
  amount:    number
  note:      string
  date:      string   // ISO string
}

export interface SavingsGoal {
  id:          string
  name:        string
  type:        GoalType
  status:      GoalStatus
  target:      number
  current:     number
  monthly:     number
  deadline:    string
  useInvest:   boolean
  returnRate:  number
  expense?:       number
  coverageTarget?: number
  eduCurrent?:    number
  eduInflasi?:    number
  pensionExp?:    number
  pensionInflasi?: number
  history:     GoalTransaction[]
  createdAt:   string
  updatedAt:   string
}

export interface GoalCalcResult {
  sisa:           number
  progress:       number
  months:         number
  monthlyNeeded:  number
  trackStatus:    'ahead' | 'ontrack' | 'behind' | 'complete'
  coverage?:       number
  coverageStatus?: 'Risiko Tinggi' | 'Cukup Aman' | 'Aman'
  excessDana?:     number
}
