'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { IncomeCategory, SavingRow, DebtRow, BudgetCategory, Transaction, MonthKey } from '@/types/database'

type TxType = Transaction['type']

type JournalCachePayload = {
  plan: MonthPlan | null
  tx: Transaction[]
  readOnly?: boolean
  cachedAt?: number
}

const JOURNAL_CACHE_PREFIX = 'fink-journal:v2'
const JOURNAL_CACHE_TTL = 1000 * 60 * 60 * 12 // 12 jam: cukup segar, tetap terasa instan saat aplikasi sering dibuka.

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

function safeParseCache(raw: string | null): JournalCachePayload | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

function getCachedJournal(cacheKey: string): JournalCachePayload | null {
  if (typeof window === 'undefined') return null

  // localStorage membuat Journal tetap terasa cepat walaupun tab/browser sempat ditutup.
  const local = safeParseCache(window.localStorage.getItem(cacheKey))
  if (local?.cachedAt && Date.now() - local.cachedAt <= JOURNAL_CACHE_TTL) return local

  // sessionStorage tetap dipakai sebagai fallback kalau localStorage dibatasi browser.
  const session = safeParseCache(window.sessionStorage.getItem(cacheKey))
  if (session) return session

  return null
}

function setCachedJournal(cacheKey: string, payload: JournalCachePayload) {
  if (typeof window === 'undefined') return
  const value = JSON.stringify({ ...payload, cachedAt: Date.now() })
  try { window.localStorage.setItem(cacheKey, value) } catch {}
  try { window.sessionStorage.setItem(cacheKey, value) } catch {}
}

function removeCachedJournal(cacheKey: string) {
  if (typeof window === 'undefined') return
  try { window.localStorage.removeItem(cacheKey) } catch {}
  try { window.sessionStorage.removeItem(cacheKey) } catch {}
}

function sortTransactions(items: Transaction[]) {
  return [...items].sort((a, b) => {
    const dateDiff = String(b.date || '').localeCompare(String(a.date || ''))
    if (dateDiff !== 0) return dateDiff
    return String((b as any).created_at || '').localeCompare(String((a as any).created_at || ''))
  })
}

function makeTempTx(newTx: Omit<Transaction, 'id'|'month'|'year'>, month: MonthKey, year: number): Transaction {
  return {
    ...newTx,
    id: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    month,
    year,
    user_id: 'local-pending',
    created_at: new Date().toISOString(),
  } as Transaction
}

export function useBulanan({ curMonth, curYear }: UseBulananProps) {
  const [plan,    setPlan]    = useState<MonthPlan>(emptyMonth())
  const [tx,      setTx]      = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)  // true hanya saat belum ada data/cache yang bisa ditampilkan
  const [refreshing, setRefreshing] = useState(false) // background refresh tanpa mengosongkan UI
  const [saving,  setSaving]  = useState(false)
  const [readOnly, setReadOnly] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestLoadKey = useRef('')
  const hasLoadedOnce = useRef(false)
  const loadedDataKey = useRef('')

  const cacheKey = useMemo(() => `${JOURNAL_CACHE_PREFIX}:${curYear}:${curMonth}`, [curMonth, curYear])

  const blockReadOnly = useCallback(() => {
    alert('Mode Monitoring bersifat read-only. Keluar dari monitoring untuk mengubah data.')
  }, [])

  const applyLoadedData = useCallback((payload: JournalCachePayload | any) => {
    if (payload?.plan) {
      const loaded = normalizeMonthPlan({
        income: migrateIncome(payload.plan.income),
        saving: payload.plan.saving,
        debt: payload.plan.debt,
        budget: payload.plan.budget,
      })
      setPlan(ensureRekonItems(normalizeMonthPlan(loaded)))
    } else {
      setPlan(emptyMonth())
    }

    setTx(sortTransactions(Array.isArray(payload?.tx) ? payload.tx : []))
    if (typeof payload?.readOnly === 'boolean') setReadOnly(payload.readOnly)
    hasLoadedOnce.current = true
    loadedDataKey.current = cacheKey
  }, [cacheKey])

  const prefetchAdjacentMonths = useCallback((month: MonthKey, year: number) => {
    if (typeof window === 'undefined') return
    const run = async () => {
      const idx = MONTHS_ORDER.indexOf(month)
      const targets = [
        { month: MONTHS_ORDER[(idx + 11) % 12], year: idx === 0 ? year - 1 : year },
        { month: MONTHS_ORDER[(idx + 1) % 12], year: idx === 11 ? year + 1 : year },
      ]

      await Promise.all(targets.map(async target => {
        const targetKey = `${JOURNAL_CACHE_PREFIX}:${target.year}:${target.month}`
        const cached = getCachedJournal(targetKey)
        if (cached?.cachedAt && Date.now() - cached.cachedAt <= JOURNAL_CACHE_TTL) return

        try {
          const res = await fetch(`/api/journal?month=${target.month}&year=${target.year}`, { cache: 'no-store' })
          if (!res.ok) return
          const json = await res.json()
          setCachedJournal(targetKey, json)
        } catch {
          // Prefetch hanya akselerator; jangan ganggu halaman utama jika gagal.
        }
      }))
    }

    const idle = (window as any).requestIdleCallback
    if (typeof idle === 'function') {
      const id = idle(run, { timeout: 2500 })
      return () => (window as any).cancelIdleCallback?.(id)
    }
    const id = window.setTimeout(run, 700)
    return () => window.clearTimeout(id)
  }, [])

  const loadData = useCallback(async () => {
    const loadKey = `${curYear}:${curMonth}:${Date.now()}`
    latestLoadKey.current = loadKey

    const cached = getCachedJournal(cacheKey)
    if (cached) {
      applyLoadedData(cached)
      setLoading(false)
      setRefreshing(true)
    } else {
      setLoading(true)
      setRefreshing(false)
    }

    try {
      const res = await fetch(`/api/journal?month=${curMonth}&year=${curYear}`, { cache: 'no-store' })
      if (!res.ok) return
      const json = await res.json()
      if (latestLoadKey.current !== loadKey) return

      applyLoadedData(json)
      setCachedJournal(cacheKey, json)
      prefetchAdjacentMonths(curMonth, curYear)
    } finally {
      if (latestLoadKey.current === loadKey) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [applyLoadedData, cacheKey, curMonth, curYear, prefetchAdjacentMonths])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    if (!hasLoadedOnce.current || loadedDataKey.current !== cacheKey) return
    setCachedJournal(cacheKey, { plan, tx, readOnly })
  }, [cacheKey, plan, tx, readOnly])

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
    }, 1200)
  }, [curMonth, curYear, readOnly, blockReadOnly])

  const updatePlan = useCallback((updater: (prev: MonthPlan) => MonthPlan) => {
    if (readOnly) { blockReadOnly(); return }
    setPlan(prev => {
      const next = normalizeMonthPlan(updater(normalizeMonthPlan(prev)))
      savePlan(next)
      return next
    })
  }, [savePlan, readOnly, blockReadOnly])

  const actualByTypeAndCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of tx) {
      if (t.type === 'out' && t.debt && !t.settled) continue
      const key = `${t.type}:${t.cat}`
      map.set(key, (map.get(key) || 0) + Number(t.amt || 0))
    }
    return map
  }, [tx])

  // Budget actual dari tx.out
  const computedBudget = useCallback((): BudgetCategory[] => {
    return plan.budget.map(cat => ({
      ...cat,
      items: cat.items.map(item => ({
        ...item,
        actual: actualByTypeAndCategory.get(`out:${item.label}`) || 0,
      })),
    }))
  }, [actualByTypeAndCategory, plan.budget])

  // Income actual dari tx.inn per item label
  const computedIncome = useCallback((): IncomeCategory[] => {
    return plan.income.map(cat => ({
      ...cat,
      items: cat.items.map(item => ({
        ...item,
        actual: actualByTypeAndCategory.get(`inn:${item.label}`) || 0,
      })),
    }))
  }, [actualByTypeAndCategory, plan.income])

  // Saving actual dari tx.save per label
  const computedSaving = useCallback((): SavingRow[] => {
    return plan.saving.map(row => ({
      ...row,
      actual: actualByTypeAndCategory.get(`save:${row.label}`) || 0,
    }))
  }, [actualByTypeAndCategory, plan.saving])

  // Debt Payment actual dari tx.out per label debt
  const computedDebt = useCallback((): DebtRow[] => {
    const debtRows = Array.isArray(plan.debt) ? plan.debt : emptyMonth().debt
    return debtRows.map(row => ({
      ...row,
      actual: actualByTypeAndCategory.get(`out:${row.label}`) || 0,
    }))
  }, [actualByTypeAndCategory, plan.debt])

  // Rename cat di transaksi bulan ini saat label item budget/income/saving/debt berubah.
  // type wajib dikirim agar label yang sama di jenis transaksi lain tidak ikut berubah
  // (contoh: "Rekonsiliasi" ada di income dan expense).
  const renameTxCat = useCallback(async (oldLabel: string, newLabel: string, type?: TxType) => {
    if (readOnly) { blockReadOnly(); return }
    const oldCat = oldLabel
    const newCat = newLabel
    if (!oldCat.trim() || !newCat.trim() || oldCat === newCat) return

    const affected = tx.filter(t => t.cat === oldCat && (!type || t.type === type))
    if (!affected.length) return

    const previous = tx
    setTx(prev => prev.map(t => (t.cat === oldCat && (!type || t.type === type)) ? { ...t, cat: newCat } : t))

    const updated = await Promise.all(affected.map(t =>
      fetch('/api/transaksi', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: t.id, cat: newCat }),
      })
    ))

    if (updated.some(res => !res.ok)) setTx(previous)
  }, [tx, readOnly, blockReadOnly])

  const addTx = useCallback(async (newTx: Omit<Transaction, 'id'|'month'|'year'>) => {
    if (readOnly) { blockReadOnly(); return }
    const tempTx = makeTempTx(newTx, curMonth, curYear)
    setTx(prev => sortTransactions([tempTx, ...prev]))

    const res  = await fetch('/api/transaksi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newTx, month: curMonth, year: curYear }),
    })
    const json = await res.json()

    if (!res.ok || !json.data) {
      setTx(prev => prev.filter(t => t.id !== tempTx.id))
      return undefined
    }

    setTx(prev => sortTransactions(prev.map(t => t.id === tempTx.id ? json.data : t)))
    return json.data
  }, [curMonth, curYear, readOnly, blockReadOnly])

  const updateTx = useCallback(async (id: string, updates: Partial<Transaction>) => {
    if (readOnly) { blockReadOnly(); return }
    const previous = tx
    setTx(prev => sortTransactions(prev.map(t => t.id === id ? { ...t, ...updates } : t)))

    const res  = await fetch('/api/transaksi', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    })
    const json = await res.json()
    if (!res.ok || !json.data) {
      setTx(previous)
      return
    }

    setTx(prev => sortTransactions(prev.map(t => t.id === id ? json.data : t)))
    window.dispatchEvent(new Event('hutang-refresh'))
  }, [tx, readOnly, blockReadOnly])

  const deleteTx = useCallback(async (id: string) => {
    if (readOnly) { blockReadOnly(); return }
    const previous = tx
    setTx(prev => prev.filter(t => t.id !== id))

    const res = await fetch(`/api/transaksi?id=${id}`, { method: 'DELETE' })
    if (!res.ok) {
      setTx(previous)
      return
    }
    window.dispatchEvent(new Event('hutang-refresh'))
  }, [tx, readOnly, blockReadOnly])

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
    removeCachedJournal(`${JOURNAL_CACHE_PREFIX}:${nextY}:${nextM}`)
    return `${MONTH_NAMES[nextM]} ${nextY}`
  }, [curMonth, curYear, plan, readOnly, blockReadOnly])

  const rawSisa = useMemo(() => tx.reduce((s, t) => {
    if (t.debt && !t.settled) return s
    if (t.type === 'inn')  return s + t.amt
    if (t.type === 'out')  return s - t.amt
    if (t.type === 'save') return s - t.amt
    return s
  }, 0), [tx])

  return {
    plan, updatePlan, loading, refreshing, saving,
    tx, setTx, addTx, updateTx, deleteTx,
    computedBudget, computedIncome, computedSaving, computedDebt,
    renameTxCat,
    copyBudgetToNext,
    readOnly,
    rawSisa,
  }
}
