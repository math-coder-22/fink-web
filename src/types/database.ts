// ─── Database Types (sesuai schema Supabase) ───────────────

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      monthly_plans: {
        Row: {
          id: string
          user_id: string
          month: string       // 'jan' | 'feb' | ... | 'dec'
          year: number
          income: Json        // IncomeRow[]
          saving: Json        // SavingRow[]
          budget: Json        // BudgetCategory[]
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['monthly_plans']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['monthly_plans']['Insert']>
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          month: string
          year: number
          date: string        // 'DD' format
          type: 'out' | 'inn' | 'save'
          cat: string | null
          note: string | null
          amt: number
          debt: boolean
          settled: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['transactions']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['transactions']['Insert']>
      }
    }
  }
}

// ─── App-level Types ───────────────────────────────────────

export type MonthKey = 'jan'|'feb'|'mar'|'apr'|'may'|'jun'|'jul'|'aug'|'sep'|'oct'|'nov'|'dec'

export interface IncomeRow {
  label: string
  plan: number
  actual: number
}

// Struktur kategori income (sama seperti BudgetCategory)
export interface IncomeItem {
  label: string
  plan: number
  actual: number
}

export interface IncomeCategory {
  label: string
  items: IncomeItem[]
}

export interface SavingRow {
  label: string
  plan: number
  actual: number
}

export interface BudgetItem {
  label: string
  plan: number
  actual: number
}

export interface BudgetCategory {
  label: string
  items: BudgetItem[]
}

export interface Transaction {
  id: string
  month: string
  year: number
  date: string
  type: 'out' | 'inn' | 'save'
  cat: string
  note: string
  amt: number
  debt: boolean
  settled: boolean
}

export interface MonthData {
  income: IncomeRow[]
  saving: SavingRow[]
  budget: BudgetCategory[]
  tx: Transaction[]
}
