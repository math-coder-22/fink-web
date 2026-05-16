'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { IncomeCategory, SavingRow, DebtRow, BudgetCategory, Transaction, MonthKey } from '@/types/database'

export const MONTH_NAMES: Record<string, string> = {
  jan:'Januari', feb:'Februari', mar:'Maret',    apr:'April',
  may:'Mei',     jun:'Juni',     jul:'Juli',      aug:'Agustus',
  sep:'September',oct:'Oktober', nov:'November',  dec:'Desember',
}
export const MONTHS_ORDER: MonthKey[] = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']

export interface MonthPlan {
  income: IncomeCategory[]
  saving: SavingRow[]
  debt: DebtRow[]
  budget: BudgetCategory[]
}

function emptyMonth(): MonthPlan {
  return {
    income: [
      {
        label: 'Pemasukan Utama',
        items: [
          { label: 'Gaji / Penghasilan Utama', plan: 0, actual: 0 },
          { label: 'Rekonsiliasi',              plan: 0, actual: 0 },
        ],
      },
    ],
    saving: [{ label: 'Dana Darurat', plan: 0, actual: 0 }],
    debt: [{ label: 'Debt Payment', plan: 0, actual: 0 }],
    budget: [
      { label: 'Giving',  items: [{ label: 'Zakat / Infaq / Sedekah', plan: 0, actual: 0 }] },
      { label: 'Billing', items: [{ label: 'Tagihan Rutin',           plan: 0, actual: 0 }] },
      { label: 'Living',  items: [{ label: 'Makan & Minum',           plan: 0, actual: 0 }, { label: 'Transport', plan: 0, actual: 0 }] },
      { label: 'Playing', items: [{ label: 'Hiburan & Rekreasi',      plan: 0, actual: 0 }] },
      { label: 'Extra',   items: [{ label: 'Pengeluaran Tak Terduga', plan: 0, actual: 0 }, { label: 'Rekonsiliasi', plan: 0, actual: 0 }] },
    ],
  }
}

function normalizeMonthPlan(plan: Partial<MonthPlan> | null | undefined): MonthPlan {
  const base = emptyMonth()
  return {
    income: Array.isArray(plan?.income) ? plan!.income : base.income,
    saving: Array.isArray(plan?.saving) ? plan!.saving : base.saving,
    debt: Array.isArray((plan as any)?.debt) ? (plan as any).debt : base.debt,
    budget: Array.isArray(plan?.budget) ? plan!.budget : base.budget,
  }
}

// Migrate flat IncomeRow[] to IncomeCategory[] (backward compat)
function migrateIncome(raw: unknown): IncomeCategory[] {
  if (!Array.isArray(raw) || raw.length === 0) return emptyMonth().income
  // Already categorised?
  if (typeof raw[0] === 'object' && 'items' in raw[0]) return raw as IncomeCategory[]
  // Flat IncomeRow[] → wrap into one category
  return [{ label: 'Pemasukan Utama', items: raw as { label: string; plan: number; actual: number }[] }]
}

// Auto-inject "Rekonsiliasi" item if missing
function ensureRekonItems(plan: MonthPlan): MonthPlan {
  // Budget: pastikan ada item "Rekonsiliasi" di Extra (atau kategori terakhir)
  const hasExpRekon = plan.budget.some(c => c.items.some(i => i.label === 'Rekonsiliasi'))
  let budget = plan.budget
  if (!hasExpRekon) {
    const lastCat = budget[budget.length - 1]
    budget = budget.map((c, ci) => ci !== budget.length - 1 ? c : {
      ...c, items: [...c.items, { label: 'Rekonsiliasi', plan: 0, actual: 0 }]
    })
  }
  // Income: pastikan ada item "Rekonsiliasi" di kategori pertama
  const hasIncRekon = plan.income.some(c => c.items.some(i => i.label === 'Rekonsiliasi'))
  let income = plan.income
  if (!hasIncRekon) {
    income = income.map((c, ci) => ci !== 0 ? c : {
      ...c, items: [...c.items, { label: 'Rekonsiliasi', plan: 0, actual: 0 }]
    })
  }
  return { ...plan, income, budget }
}

interface UseBulananProps {
  curMonth: MonthKey
  curYear:  number
}

function debtLabelsFromPlan(plan: MonthPlan) {
  return new Set((Array.isArray(plan.debt) ? plan.debt : []).map(d => d.label).filter(Boolean))
}

export function useBulanan({ curMonth, curYear }: UseBulananProps) {
  const [plan,    setPlan]    = useState<MonthPlan>(emptyMonth())
  const [tx,      setTx]      = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)  // true = tampilkan loading saat pertama
  const [saving,  setSaving]  = useState(false)
  const [readOnly, setReadOnly] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const blockReadOnly = useCallback(() => {
    alert('Mode Monitoring bersifat read-only. Keluar dari monitoring untuk mengubah data.')
  }, [])

  useEffect(() => {
    let alive = true
    async function loadMonitoringStatus() {
      try {
        const res = await fetch('/api/admin/monitoring/status', { cache:'no-store' })
        if (!res.ok) return
        const json = await res.json()
        if (alive) setReadOnly(Boolean(json.monitoring))
      } catch {
        // optional
      }
    }
    loadMonitoringStatus()
    return () => { alive = false }
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [planRes, txRes] = await Promise.all([
        fetch(`/api/bulanan?month=${curMonth}&year=${curYear}`, { cache: 'no-store' }),
        fetch(`/api/transaksi?month=${curMonth}&year=${curYear}`, { cache: 'no-store' }),
      ])
      const [pj, tj] = await Promise.all([planRes.json(), txRes.json()])
      if (pj.data) {
        const loaded = normalizeMonthPlan({
          income: migrateIncome(pj.data.income),
          saving: pj.data.saving,
          debt: pj.data.debt,
          budget: pj.data.budget,
        })
        setPlan(ensureRekonItems(normalizeMonthPlan(loaded)))
      } else {
        setPlan(emptyMonth())
      }
      setTx(tj.data || [])
    } finally {
      setLoading(false)
    }
  }, [curMonth, curYear, readOnly, blockReadOnly])

  useEffect(() => { loadData() }, [loadData])

  const savePlan = useCallback((newPlan: MonthPlan) => {
    if (readOnly) { blockReadOnly(); return }
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaving(true)
    saveTimer.current = setTimeout(async () => {
      try {
        await fetch('/api/bulanan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ month: curMonth, year: curYear, ...newPlan }),
        })
      } finally { setSaving(false) }
    }, 1500)
  }, [curMonth, curYear, readOnly, blockReadOnly])

  const updatePlan = useCallback((updater: (prev: MonthPlan) => MonthPlan) => {
    if (readOnly) { blockReadOnly(); return }
    setPlan(prev => {
      const next = normalizeMonthPlan(updater(normalizeMonthPlan(prev)))
      savePlan(next)
      return next
    })
  }, [savePlan, readOnly, blockReadOnly])

  // Budget actual dari tx.out
  const computedBudget = useCallback((): BudgetCategory[] => {
    return plan.budget.map(cat => ({
      ...cat,
      items: cat.items.map(item => ({
        ...item,
        actual: tx
          .filter(t => t.type === 'out' && t.cat === item.label && !(t.debt && !t.settled))
          .reduce((s, t) => s + t.amt, 0),
      })),
    }))
  }, [plan.budget, tx])

  // Income actual dari tx.inn per item label
  const computedIncome = useCallback((): IncomeCategory[] => {
    return plan.income.map(cat => ({
      ...cat,
      items: cat.items.map(item => ({
        ...item,
        actual: tx
          .filter(t => t.type === 'inn' && t.cat === item.label)
          .reduce((s, t) => s + t.amt, 0),
      })),
    }))
  }, [plan.income, tx])

  // Saving actual dari tx.save per label
  const computedSaving = useCallback((): SavingRow[] => {
    return plan.saving.map(row => ({
      ...row,
      actual: tx
        .filter(t => t.type === 'save' && t.cat === row.label)
        .reduce((s, t) => s + t.amt, 0),
    }))
  }, [plan.saving, tx])

  // Debt Payment actual dari tx.out per label debt
  const computedDebt = useCallback((): DebtRow[] => {
    const debtRows = Array.isArray(plan.debt) ? plan.debt : emptyMonth().debt
    return debtRows.map(row => ({
      ...row,
      actual: tx
        .filter(t => t.type === 'out' && t.cat === row.label && !(t.debt && !t.settled))
        .reduce((s, t) => s + t.amt, 0),
    }))
  }, [plan.debt, tx])

  // Rename cat di semua tx jika label budget/income/saving berubah
  const renameTxCat = useCallback(async (oldLabel: string, newLabel: string) => {
    if (readOnly) { blockReadOnly(); return }
    if (!oldLabel || oldLabel === newLabel) return
    const affected = tx.filter(t => t.cat === oldLabel)
    await Promise.all(affected.map(t =>
      fetch('/api/transaksi', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: t.id, cat: newLabel }),
      })
    ))
    setTx(prev => prev.map(t => t.cat === oldLabel ? { ...t, cat: newLabel } : t))
  }, [tx, readOnly, blockReadOnly])

  const addTx = useCallback(async (newTx: Omit<Transaction, 'id'|'month'|'year'>) => {
    if (readOnly) { blockReadOnly(); return }
    const res  = await fetch('/api/transaksi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newTx, month: curMonth, year: curYear }),
    })
    const json = await res.json()
    if (json.data) setTx(prev => [json.data, ...prev])
    return json.data
  }, [curMonth, curYear, readOnly, blockReadOnly])

  const updateTx = useCallback(async (id: string, updates: Partial<Transaction>) => {
    if (readOnly) { blockReadOnly(); return }
    const res  = await fetch('/api/transaksi', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    })
    const json = await res.json()
    if (json.data) {
      setTx(prev => prev.map(t => t.id === id ? json.data : t))
      window.dispatchEvent(new Event('hutang-refresh'))
    }
  }, [readOnly, blockReadOnly])

  const deleteTx = useCallback(async (id: string) => {
    if (readOnly) { blockReadOnly(); return }
    await fetch(`/api/transaksi?id=${id}`, { method: 'DELETE' })
    setTx(prev => prev.filter(t => t.id !== id))
    window.dispatchEvent(new Event('hutang-refresh'))
  }, [readOnly, blockReadOnly])

  const copyBudgetToNext = useCallback(async () => {
    if (readOnly) { blockReadOnly(); return '' }
    const idx   = MONTHS_ORDER.indexOf(curMonth)
    const nextM = MONTHS_ORDER[(idx + 1) % 12]
    const nextY = idx === 11 ? curYear + 1 : curYear
    await fetch('/api/bulanan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        month: nextM, year: nextY,
        income: plan.income.map(c => ({ ...c, items: c.items.map(i => ({ ...i, actual: 0 })) })),
        saving: plan.saving,
        debt: plan.debt.map(d => ({ ...d, actual: 0 })),
        budget: plan.budget.map(c => ({ ...c, items: c.items.map(i => ({ ...i, actual: 0 })) })),
      }),
    })
    return `${MONTH_NAMES[nextM]} ${nextY}`
  }, [curMonth, curYear, plan, readOnly, blockReadOnly])

  return {
    plan, updatePlan, loading, saving,
    tx, setTx, addTx, updateTx, deleteTx,
    computedBudget, computedIncome, computedSaving, computedDebt,
    renameTxCat,
    copyBudgetToNext,
    readOnly,
    rawSisa: tx.reduce((s, t) => {
      if (t.debt && !t.settled) return s
      if (t.type === 'inn')  return s + t.amt
      if (t.type === 'out')  return s - t.amt
      if (t.type === 'save') return s - t.amt
      return s
    }, 0),
  }
}
