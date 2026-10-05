'use client'

import { useState, useEffect, useMemo } from 'react'
import { MONTH_NAMES, MONTHS_ORDER } from '@/components/layout/DashboardShell'
import { fmt } from '@/components/ui/helpers'
import { AppIcon } from '@/components/ui/design'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import type { MonthKey } from '@/types/database'

type SetupBudgetSectionKey = 'income' | 'budget' | 'saving' | 'debt'

type SetupBudgetRow = {
  id: string
  section: SetupBudgetSectionKey
  category: string
  label: string
  previousBudget: number
  previousActual: number
  suggested: number
  value: number
  insight?: string
}

function setupRowId(section: SetupBudgetSectionKey, category: string, label: string) {
  return `${section}::${category || 'General'}::${label || 'New Item'}::${Math.random().toString(36).slice(2,8)}`
}

function roundBudgetValue(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0
  if (value < 100000) return Math.round(value / 5000) * 5000
  return Math.round(value / 10000) * 10000
}

function suggestBudgetValue(previousBudget: number, previousActual: number, section: SetupBudgetSectionKey) {
  const budget = Number(previousBudget || 0)
  const actual = Number(previousActual || 0)

  // Income, saving, dan debt adalah rencana yang harus stabil.
  // Jika sudah ada budget, pertahankan angka asli dan jangan dibulatkan.
  if (section === 'income' || section === 'saving' || section === 'debt') {
    if (budget > 0) return budget
    return actual > 0 ? roundBudgetValue(actual) : 0
  }

  if (budget <= 0) return roundBudgetValue(actual > 0 ? actual * 0.8 : 0)
  if (actual <= 0) return budget

  const ratio = actual / budget

  // Jika masih aman/stabil, jangan ubah dan jangan bulatkan.
  if (ratio >= 0.9 && ratio <= 1.1) return budget

  // Adjustment hanya dilakukan saat deviasi cukup jelas.
  if (ratio > 1.1 && ratio <= 1.25) return roundBudgetValue(budget + (actual - budget) * 0.3)
  if (ratio > 1.25) return roundBudgetValue(Math.min(budget * 1.25, budget + (actual - budget) * 0.25))
  if (ratio >= 0.8) return budget
  return roundBudgetValue(Math.max(actual * 1.15, budget * 0.9))
}

function setupBudgetInsight(previousBudget: number, previousActual: number, section: SetupBudgetSectionKey) {
  const budget = Number(previousBudget || 0)
  const actual = Number(previousActual || 0)
  if (section !== 'budget' || budget <= 0) return undefined
  const ratio = actual / budget
  if (ratio > 1.4) return 'Spending was far over last month\'s budget. Use this figure as a starting point, not a justification for overspending.'
  if (ratio > 1.1) return 'Spending exceeded last month\'s budget. This month\'s budget is raised conservatively.'
  return undefined
}

function computeActualMapFromTx(items: any[]) {
  const map = new Map<string, number>()
  for (const t of Array.isArray(items) ? items : []) {
    // Unpaid expenses count toward Actual immediately (same rule as the journal panel).
    const key = `${t?.type}:${t?.cat}`
    map.set(key, (map.get(key) || 0) + Number(t?.amt || 0))
  }
  return map
}

function previousBudgetMap(previousPlan: any) {
  const map = new Map<string, number>()
  ;(previousPlan?.income || []).forEach((cat:any) => {
    ;(cat.items || []).forEach((item:any) => map.set(`income:${cat.label || 'Income'}:${item.label}`, Number(item.plan || 0)))
  })
  ;(previousPlan?.budget || []).forEach((cat:any) => {
    ;(cat.items || []).forEach((item:any) => map.set(`budget:${cat.label || 'Expenses'}:${item.label}`, Number(item.plan || 0)))
  })
  ;(previousPlan?.saving || []).forEach((item:any) => map.set(`saving:Saving:${item.label}`, Number(item.plan || 0)))
  ;(previousPlan?.debt || []).forEach((item:any) => map.set(`debt:Debt:${item.label}`, Number(item.plan || 0)))
  return map
}

function rowActualFromMap(section: SetupBudgetSectionKey, label: string, actualMap: Map<string, number>) {
  if (section === 'income') return actualMap.get(`inn:${label}`) || 0
  if (section === 'budget') return actualMap.get(`out:${label}`) || 0
  if (section === 'saving') return actualMap.get(`save:${label}`) || 0
  if (section === 'debt') return actualMap.get(`out:${label}`) || 0
  return 0
}

function createSetupRow(section: SetupBudgetSectionKey, category: string, label: string, value: number, previousBudget: number, previousActual: number): SetupBudgetRow {
  const suggested = suggestBudgetValue(previousBudget, previousActual, section)
  return {
    id: setupRowId(section, category, label),
    section,
    category: category || (section === 'income' ? 'Income' : section === 'budget' ? 'Expenses' : section === 'saving' ? 'Saving' : 'Debt'),
    label: label || 'New Item',
    previousBudget: Number(previousBudget || 0),
    previousActual: Number(previousActual || 0),
    suggested,
    value: Number(value || 0),
    insight: setupBudgetInsight(previousBudget, previousActual, section),
  }
}

function buildSetupRows(previousPlan: any, previousTx: any[]): SetupBudgetRow[] {
  const actualMap = computeActualMapFromTx(previousTx)
  const rows: SetupBudgetRow[] = []

  const addRow = (section: SetupBudgetSectionKey, category: string, label: string, previousBudget: number, previousActual: number) => {
    const suggested = suggestBudgetValue(previousBudget, previousActual, section)
    rows.push({
      id: setupRowId(section, category, label),
      section,
      category,
      label,
      previousBudget: Number(previousBudget || 0),
      previousActual: Number(previousActual || 0),
      suggested,
      value: suggested,
      insight: setupBudgetInsight(previousBudget, previousActual, section),
    })
  }

  ;(previousPlan?.income || []).forEach((cat:any) => {
    ;(cat.items || []).forEach((item:any) => addRow('income', cat.label || 'Income', item.label, Number(item.plan || 0), actualMap.get(`inn:${item.label}`) || 0))
  })

  ;(previousPlan?.budget || []).forEach((cat:any) => {
    ;(cat.items || []).forEach((item:any) => addRow('budget', cat.label || 'Expenses', item.label, Number(item.plan || 0), actualMap.get(`out:${item.label}`) || 0))
  })

  ;(previousPlan?.saving || []).forEach((item:any) => addRow('saving', 'Saving', item.label, Number(item.plan || 0), actualMap.get(`save:${item.label}`) || 0))
  ;(previousPlan?.debt || []).forEach((item:any) => addRow('debt', 'Debt', item.label, Number(item.plan || 0), actualMap.get(`out:${item.label}`) || 0))

  return rows.filter(row => row.label && (row.previousBudget > 0 || row.previousActual > 0 || row.suggested > 0))
}

function buildSetupRowsFromCurrent(currentPlan: any, previousPlan: any, previousTx: any[]): SetupBudgetRow[] {
  const prevBudget = previousBudgetMap(previousPlan)
  const actualMap = computeActualMapFromTx(previousTx)
  const rows: SetupBudgetRow[] = []

  ;(currentPlan?.income || []).forEach((cat:any) => {
    ;(cat.items || []).forEach((item:any) => {
      const pb = prevBudget.get(`income:${cat.label || 'Income'}:${item.label}`) || 0
      const pa = rowActualFromMap('income', item.label, actualMap)
      rows.push(createSetupRow('income', cat.label || 'Income', item.label, Number(item.plan || 0), pb, pa))
    })
  })

  ;(currentPlan?.budget || []).forEach((cat:any) => {
    ;(cat.items || []).forEach((item:any) => {
      const pb = prevBudget.get(`budget:${cat.label || 'Expenses'}:${item.label}`) || 0
      const pa = rowActualFromMap('budget', item.label, actualMap)
      rows.push(createSetupRow('budget', cat.label || 'Expenses', item.label, Number(item.plan || 0), pb, pa))
    })
  })

  ;(currentPlan?.saving || []).forEach((item:any) => {
    const pb = prevBudget.get(`saving:Saving:${item.label}`) || 0
    const pa = rowActualFromMap('saving', item.label, actualMap)
    rows.push(createSetupRow('saving', 'Saving', item.label, Number(item.plan || 0), pb, pa))
  })

  ;(currentPlan?.debt || []).forEach((item:any) => {
    const pb = prevBudget.get(`debt:Debt:${item.label}`) || 0
    const pa = rowActualFromMap('debt', item.label, actualMap)
    rows.push(createSetupRow('debt', 'Debt', item.label, Number(item.plan || 0), pb, pa))
  })

  return rows.filter(row => row.label && (row.value > 0 || row.previousBudget > 0 || row.previousActual > 0 || row.suggested > 0))
}

function rowsToMonthPlan(rows: SetupBudgetRow[], fallbackPlan: any) {
  const sectionRows = (section: SetupBudgetSectionKey) => rows.filter(row => row.section === section)

  const incomeGroups = new Map<string, any[]>()
  for (const row of sectionRows('income')) {
    if (!incomeGroups.has(row.category)) incomeGroups.set(row.category, [])
    incomeGroups.get(row.category)!.push({ label: row.label, plan: Number(row.value || 0), actual: 0 })
  }

  const budgetGroups = new Map<string, any[]>()
  for (const row of sectionRows('budget')) {
    if (!budgetGroups.has(row.category)) budgetGroups.set(row.category, [])
    budgetGroups.get(row.category)!.push({ label: row.label, plan: Number(row.value || 0), actual: 0 })
  }

  return {
    income: incomeGroups.size ? Array.from(incomeGroups, ([label, items]) => ({ label, items })) : fallbackPlan.income,
    budget: budgetGroups.size ? Array.from(budgetGroups, ([label, items]) => ({ label, items })) : fallbackPlan.budget,
    saving: sectionRows('saving').length ? sectionRows('saving').map(row => ({ label: row.label, plan: Number(row.value || 0), actual: 0 })) : fallbackPlan.saving,
    debt: sectionRows('debt').length ? sectionRows('debt').map(row => ({ label: row.label, plan: Number(row.value || 0), actual: 0 })) : fallbackPlan.debt,
  }
}

/* ─── SETUP BUDGET MODAL ─────────────────────────────── */
export default function SetupBudgetModal({
  open,
  onClose,
  curMonth,
  curYear,
  currentPlan,
  isMobile,
  onApply,
}: {
  open: boolean
  onClose: () => void
  curMonth: MonthKey
  curYear: number
  currentPlan: any
  isMobile: boolean
  onApply: (nextPlan: any) => void
}) {
  const [rows, setRows] = useState<SetupBudgetRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmRebuild, setConfirmRebuild] = useState(false)

  const previousInfo = useMemo(() => {
    const idx = MONTHS_ORDER.indexOf(curMonth)
    const previousMonth = MONTHS_ORDER[(idx + 11) % 12]
    const previousYear = idx === 0 ? curYear - 1 : curYear
    return { month: previousMonth, year: previousYear, label: `${MONTH_NAMES[previousMonth]} ${previousYear}` }
  }, [curMonth, curYear])

  const loadPreviousData = async () => {
    const res = await fetch(`/api/journal?month=${previousInfo.month}&year=${previousInfo.year}`, { cache:'no-store' })
    if (!res.ok) throw new Error('Failed to load previous month data')
    return res.json()
  }

  useEffect(() => {
    if (!open) return
    let active = true
    async function loadBudgetWorkspace() {
      setLoading(true)
      setError('')
      try {
        const json = await loadPreviousData()
        if (!active) return
        const currentRows = buildSetupRowsFromCurrent(currentPlan, json?.plan, Array.isArray(json?.tx) ? json.tx : [])
        const rebuiltRows = buildSetupRows(json?.plan, Array.isArray(json?.tx) ? json.tx : [])
        setRows(currentRows.length ? currentRows : rebuiltRows)
      } catch (err) {
        if (!active) return
        const currentRows = buildSetupRowsFromCurrent(currentPlan, null, [])
        setRows(currentRows)
        setError('Previous month comparison could not be loaded. You can still edit the current budget.')
      } finally {
        if (active) setLoading(false)
      }
    }
    loadBudgetWorkspace()
    return () => { active = false }
  }, [open, previousInfo.month, previousInfo.year, currentPlan])

  const sectionLabels: Record<SetupBudgetSectionKey, string> = {
    income: 'Income',
    budget: 'Expenses',
    saving: 'Saving',
    debt: 'Debt',
  }

  const sectionColors: Record<SetupBudgetSectionKey, string> = {
    income: '#15803d',
    budget: '#1a5c42',
    saving: '#2563eb',
    debt: '#92400e',
  }

  const grouped = useMemo(() => {
    const result: Record<SetupBudgetSectionKey, Map<string, SetupBudgetRow[]>> = {
      income: new Map(),
      budget: new Map(),
      saving: new Map(),
      debt: new Map(),
    }
    for (const row of rows) {
      if (!result[row.section].has(row.category)) result[row.section].set(row.category, [])
      result[row.section].get(row.category)!.push(row)
    }
    return result
  }, [rows])

  const totals = useMemo(() => {
    const incomeCapacity = rows.filter(row => row.section === 'income').reduce((s, row) => s + Number(row.value || 0), 0)
    const plannedAllocation = rows.filter(row => row.section !== 'income').reduce((s, row) => s + Number(row.value || 0), 0)
    const savingAllocation = rows.filter(row => row.section === 'saving').reduce((s, row) => s + Number(row.value || 0), 0)
    const expenseAllocation = rows.filter(row => row.section === 'budget').reduce((s, row) => s + Number(row.value || 0), 0)
    const debtAllocation = rows.filter(row => row.section === 'debt').reduce((s, row) => s + Number(row.value || 0), 0)
    return { incomeCapacity, plannedAllocation, remaining: incomeCapacity - plannedAllocation, savingAllocation, expenseAllocation, debtAllocation }
  }, [rows])

  const capacityGuidance = useMemo(() => {
    if (totals.remaining >= 0) return ''
    const shortage = Math.abs(totals.remaining)
    if (totals.savingAllocation > 0) {
      const reduceSaving = Math.min(shortage, totals.savingAllocation)
      return `Possible adjustment: reduce saving allocation by around ${fmt(reduceSaving)} or review flexible expenses.`
    }
    if (totals.expenseAllocation > 0) {
      return 'Possible adjustment: review flexible expense categories first before changing debt or essential bills.'
    }
    return 'Possible adjustment: review planned allocation before applying this budget.'
  }, [totals])

  const allocationPct = totals.incomeCapacity > 0
    ? Math.min(120, Math.round((totals.plannedAllocation / totals.incomeCapacity) * 100))
    : 0
  const summaryTone = totals.remaining < 0 ? '#b91c1c' : '#15803d'
  const summaryBg = totals.remaining < 0 ? '#fef2f2' : '#f0fdf4'
  const summaryBorder = totals.remaining < 0 ? '#fecaca' : '#bbf7d0'

  if (!open) return null

  const setRowValue = (id: string, value: number) => {
    setRows(prev => prev.map(row => row.id === id ? { ...row, value: Number.isFinite(value) ? value : 0 } : row))
  }

  const rebuildFromPrevious = async () => {
    setConfirmRebuild(false)
    try {
      setLoading(true)
      const json = await loadPreviousData()
      setRows(buildSetupRows(json?.plan, Array.isArray(json?.tx) ? json.tx : []))
      setError('')
    } catch (err) {
      setError('Could not rebuild from previous month. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const apply = () => {
    if (!rows.length) return
    onApply(rowsToMonthPlan(rows, currentPlan))
    onClose()
  }

  const renderMoney = (value:number) => fmt(value)
  const renderSignedMoney = (value:number) => {
    const amount = fmt(value)
    return value < 0 ? `- ${amount}` : amount
  }
  const inp: React.CSSProperties = { border:'none', background:'transparent', outline:'none', fontFamily:'inherit' }
  /* Budget value inputs: dotted underline so editability is obvious */
  const budgetInp: React.CSSProperties = { ...inp, borderBottom:'1px dotted #cbd5e1', borderRadius:'2px' }

  return (
    <div onClick={e => { if (e.currentTarget === e.target) onClose() }} style={{ position:'fixed', inset:0, zIndex:860, background:'rgba(15,23,42,.42)', backdropFilter:'blur(4px)', display:'flex', alignItems:'flex-start', justifyContent:'center', overflowY:'auto', padding:'max(14px, env(safe-area-inset-top)) 12px 16px' }}>
      <div style={{ width:'100%', maxWidth:'980px', background:'#fff', border:'1px solid #e3e7ee', borderRadius:'22px', boxShadow:'0 24px 80px rgba(15,23,42,.24)', overflow:'hidden' }}>
        <div style={{ position:'sticky', top:0, zIndex:2, background:'rgba(255,255,255,.96)', backdropFilter:'blur(12px)', display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'14px', padding:'14px 16px', borderBottom:'1px solid #e3e7ee' }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:'17px', fontWeight:900, color:'#111827' }}>
              <AppIcon name="copy" size={18} /> Setup Budget — {MONTH_NAMES[curMonth]} {curYear}
            </div>
            <div style={{ fontSize:'11.5px', color:'#64748b', marginTop:'2px' }}>Manage and adjust your monthly budget</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <button
              type="button"
              onClick={()=>setConfirmRebuild(true)}
              style={{ border:'1px solid #dbe3ef', background:'#fff', color:'#334155', borderRadius:'10px', padding:'8px 10px', fontSize:'11px', fontWeight:800, cursor:'pointer' }}
            >
              Rebuild from Previous Month
            </button>
            <button aria-label="Close setup budget" onClick={onClose} style={{ width:'32px', height:'32px', border:'none', background:'#f7f8fa', borderRadius:'10px', cursor:'pointer', color:'#4b5563', display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <AppIcon name="close" size={16} />
            </button>
          </div>
        </div>

        <div style={{ padding:'14px 16px 18px', display:'flex', flexDirection:'column', gap:'12px' }}>
          {/* Slim summary: available + allocation bar */}
          <div style={{ border:'1px solid #e3e7ee', borderRadius:'14px', padding:'10px 14px', background:'#fff' }}>
            <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:'10px', flexWrap:'wrap' }}>
              <span style={{ fontSize:'11px', fontWeight:800, color:'#64748b', textTransform:'uppercase', letterSpacing:'.5px' }}>
                {totals.remaining < 0 ? 'Deficit' : 'Available'}
              </span>
              <span style={{ fontSize:'16px', fontWeight:900, color:summaryTone, fontFamily:'var(--font-mono), monospace' }}>
                {renderSignedMoney(totals.remaining)}
              </span>
            </div>
            <div style={{ marginTop:'8px', display:'flex', justifyContent:'space-between', gap:'10px', fontSize:'10.5px', color:'#64748b', fontWeight:600, marginBottom:'5px' }}>
              <span>Allocated {allocationPct}%</span>
              <span style={{ fontFamily:'var(--font-mono), monospace' }}>{renderMoney(totals.plannedAllocation)} / {renderMoney(totals.incomeCapacity)}</span>
            </div>
            <div style={{ height:'6px', borderRadius:999, background:'#e5e7eb', overflow:'hidden' }}>
              <div style={{
                width:`${Math.min(100, Math.max(0, allocationPct))}%`,
                height:'100%',
                borderRadius:999,
                background: totals.remaining < 0 ? '#b91c1c' : '#1a5c42',
              }} />
            </div>
            {totals.remaining < 0 && (
              <div style={{ marginTop:'8px', fontSize:'11.5px', fontWeight:700, color:'#b91c1c', lineHeight:1.45 }}>
                Planned allocation exceeds income by {renderMoney(Math.abs(totals.remaining))}.{capacityGuidance ? ` ${capacityGuidance}` : ''}
              </div>
            )}
          </div>

          {loading && (
            <div style={{ border:'1px solid #e3e7ee', borderRadius:'16px', padding:'14px', color:'#64748b', fontSize:'13px', textAlign:'center' }}>Loading budget workspace...</div>
          )}
          {error && (
            <div style={{ border:'1px solid #fecaca', borderRadius:'16px', padding:'14px', color:'#b91c1c', background:'#fef2f2', fontSize:'13px' }}>{error}</div>
          )}

          <div style={{ border:'1px solid #e3e7ee', borderRadius:'16px', overflow:'hidden', background:'#fff' }}>
            <div style={{
              display:'grid',
              gridTemplateColumns:isMobile ? '1fr 74px 74px 92px' : '1fr 112px 112px 124px',
              gap:'8px',
              alignItems:'center',
              padding:'9px 22px 9px 34px',
              background:'#fbfcfd',
              borderBottom:'1px solid #e8edf4',
              fontSize:'10px',
              fontWeight:850,
              color:'#64748b',
              textTransform:'uppercase',
              letterSpacing:'.5px'
            }}>
              <div />
              <div style={{ textAlign:'right' }}>Prev.</div>
              <div style={{ textAlign:'right' }}>Actual</div>
              <div style={{ textAlign:'right' }}>Budget</div>
            </div>

            {(['income','budget','saving','debt'] as SetupBudgetSectionKey[]).map(section => {
              const categories = Array.from(grouped[section].entries())
              return (
                <div key={section} style={{ borderBottom:'1px solid #e3e7ee', paddingBottom:'8px' }}>
                  <div style={{ padding:'14px 12px 8px', fontSize:'10px', fontWeight:750, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.7px' }}>{sectionLabels[section]}</div>

                  {categories.map(([category, sectionRows]) => {
                    const catPrev = sectionRows.reduce((s,row)=>s + Number(row.previousBudget || 0), 0)
                    const catActualctual = sectionRows.reduce((s,row)=>s + Number(row.previousActual || 0), 0)
                    const catBudget = sectionRows.reduce((s,row)=>s + Number(row.value || 0), 0)
                    const pct = catBudget > 0 ? Math.min(120, (catActualctual / catBudget) * 100) : (catActualctual > 0 ? 100 : 0)
                    const clr = section === 'income'
                      ? '#15803d'
                      : section === 'debt'
                        ? '#92400e'
                        : pct >= 100
                          ? '#b91c1c'
                          : pct >= 85
                            ? '#d97706'
                            : sectionColors[section]
                    const hk = `${section}-${category}`

                    return (
                      <div key={hk} style={{ margin:'0 12px 8px' }}>
                        {/* Category header — static label, values only */}
                        <div style={{ display:'flex', alignItems:'center', gap:'6px', padding:'5px 2px' }}>
                          <span style={{ flex:1, minWidth:0, fontSize:'13px', fontWeight:700, color:'#111827', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {category}
                          </span>
                          {isMobile ? (
                            <div style={{ flex:'2', minWidth:0, display:'grid', gridTemplateColumns:'1fr 1fr 1.15fr', gap:'4px', alignItems:'center' }}>
                              <span style={{ fontSize:'9.5px', color:'#9ca3af', fontFamily:'var(--font-mono), monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', width:'100%', textAlign:'right' }}>{catPrev ? Math.round(catPrev).toLocaleString('id-ID') : '-'}</span>
                              <span style={{ fontSize:'10px', color:clr, fontWeight:700, fontFamily:'var(--font-mono), monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', width:'100%', textAlign:'right' }}>{catActualctual ? Math.round(catActualctual).toLocaleString('id-ID') : '-'}</span>
                              <span style={{ fontSize:'11px', color:'#111827', fontWeight:850, fontFamily:'var(--font-mono), monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', width:'100%', textAlign:'right' }}>{catBudget ? Math.round(catBudget).toLocaleString('id-ID') : '-'}</span>
                            </div>
                          ) : (
                            <>
                              <span style={{ width:'112px', flexShrink:0, fontSize:'11.5px', color:'#9ca3af', textAlign:'right', fontFamily:'var(--font-mono), monospace', whiteSpace:'nowrap' }}>{catPrev ? Math.round(catPrev).toLocaleString('id-ID') : '-'}</span>
                              <span style={{ width:'112px', flexShrink:0, fontSize:'11.5px', fontWeight:600, textAlign:'right', fontFamily:'var(--font-mono), monospace', color:clr, whiteSpace:'nowrap' }}>{catActualctual ? Math.round(catActualctual).toLocaleString('id-ID') : '-'}</span>
                              <span style={{ width:'124px', flexShrink:0, fontSize:'12px', fontWeight:850, textAlign:'right', fontFamily:'var(--font-mono), monospace', color:'#111827', whiteSpace:'nowrap' }}>{catBudget ? Math.round(catBudget).toLocaleString('id-ID') : '-'}</span>
                            </>
                          )}
                        </div>

                        <div style={{ height:'3px', background:'#eef1f5', borderRadius:'2px', margin:'0 0 2px' }}>
                          <div style={{ height:'3px', borderRadius:'2px', background:clr, width:`${Math.min(100,pct)}%`, transition:'width .3s' }} />
                        </div>

                        {pct > 110 && (
                          <div style={{ margin:'0 0 6px', padding:'0 2px', fontSize:'11px', lineHeight:1.45, color:'#b45309', fontWeight:600, display:'flex', alignItems:'flex-start', gap:'6px' }}>
                            <span style={{ marginTop:'1px', flexShrink:0 }}>⚠</span>
                            <span>{category} exceeded last month’s budget by {Math.round(pct - 100)}%.</span>
                          </div>
                        )}

                        <div style={{ paddingLeft:'14px' }}>
                          {sectionRows.map((row, ri) => {
                            const changed = Number(row.value || 0) !== Number(row.suggested || 0)
                            return (
                              <div
                                key={row.id}
                                style={{ display:'flex', alignItems:'center', gap:'6px', padding:'6px 2px', borderBottom: ri<sectionRows.length-1?'1px solid #f1f4f8':'none' }}
                              >
                                <div style={{ flex:1, minWidth:0 }}>
                                  <div style={{ fontSize:'12.5px', fontWeight:600, color:'#111827', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                    {row.label}
                                  </div>
                                  {row.insight && (
                                    <div style={{ marginTop:'1px', fontSize:'10.5px', lineHeight:1.35, color:'#b45309', fontWeight:600 }}>
                                      ⚠ {row.insight}
                                    </div>
                                  )}
                                </div>

                                {isMobile ? (
                                  <div style={{ flex:'2', minWidth:0, display:'grid', gridTemplateColumns:'1fr 1fr 1.15fr', gap:'4px', alignItems:'center' }}>
                                    <div style={{ fontSize:'9.5px', color:'#9ca3af', textAlign:'right', fontFamily:'var(--font-mono), monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{row.previousBudget ? Math.round(row.previousBudget).toLocaleString('id-ID') : '-'}</div>
                                    <div style={{ fontSize:'10px', color:row.previousActual > row.previousBudget && row.previousBudget > 0 ? '#b91c1c' : '#6b7280', fontWeight:600, textAlign:'right', fontFamily:'var(--font-mono), monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{row.previousActual ? Math.round(row.previousActual).toLocaleString('id-ID') : '-'}</div>
                                    <input
                                      style={{
                                        ...budgetInp,
                                        fontSize:'11px',
                                        fontFamily:'var(--font-mono), monospace',
                                        color:'#111827',
                                        fontWeight:800,
                                        textAlign:'right',
                                        width:'100%',
                                        padding:'2px 3px',
                                      }}
                                      value={row.value ? Math.round(row.value).toLocaleString('id-ID') : ''}
                                      placeholder="0"
                                      onMouseDown={e=>e.stopPropagation()}
                                      onFocus={e=>e.currentTarget.select()}
                                      onChange={e=>setRowValue(row.id, Number(String(e.currentTarget.value).replace(/\D/g,'')) || 0)}
                                    />
                                  </div>
                                ) : (
                                  <>
                                    <div style={{ width:'112px', flexShrink:0, fontSize:'12px', fontWeight:500, textAlign:'right', fontFamily:'var(--font-mono), monospace', color:'#9ca3af', whiteSpace:'nowrap' }}>
                                      {row.previousBudget ? Math.round(row.previousBudget).toLocaleString('id-ID') : '-'}
                                    </div>
                                    <div style={{ width:'112px', flexShrink:0, fontSize:'12px', fontWeight:600, textAlign:'right', fontFamily:'var(--font-mono), monospace', color:row.previousActual > row.previousBudget && row.previousBudget > 0 ? '#b91c1c' : '#4b5563', whiteSpace:'nowrap' }}>
                                      {row.previousActual ? Math.round(row.previousActual).toLocaleString('id-ID') : '-'}
                                    </div>
                                    <div style={{ width:'124px', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'flex-end', gap:'4px' }}>
                                      <input
                                        style={{
                                          ...budgetInp,
                                          width: changed ? '84px' : '104px',
                                          flexShrink:0,
                                          fontSize:'12px',
                                          fontWeight:800,
                                          textAlign:'right',
                                          fontFamily:'var(--font-mono), monospace',
                                          color:'#111827',
                                          whiteSpace:'nowrap',
                                          padding:'2px 6px',
                                        }}
                                        value={row.value ? Math.round(row.value).toLocaleString('id-ID') : ''}
                                        placeholder="0"
                                        onMouseDown={e=>e.stopPropagation()}
                                        onFocus={e=>e.currentTarget.select()}
                                        onChange={e=>setRowValue(row.id, Number(String(e.currentTarget.value).replace(/\D/g,'')) || 0)}
                                      />
                                      {changed && (
                                        <button title="Reset to suggested value" onMouseDown={e=>e.stopPropagation()} onClick={()=>setRowValue(row.id,row.suggested)} style={{ width:'22px', height:'22px', border:'1px solid #fde68a', borderRadius:'7px', background:'#fffbeb', color:'#b45309', cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>↻</button>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            )
                          })}

                        </div>
                      </div>
                    )
                  })}

                </div>
              )
            })}
          </div>

          <div style={{ display:'flex', justifyContent:'flex-end', gap:'8px', borderTop:'1px solid #e3e7ee', paddingTop:'12px' }}>
            <button onClick={onClose} style={{ padding:'9px 13px', border:'1px solid #e3e7ee', borderRadius:'11px', background:'#fff', color:'#4b5563', fontSize:'12px', fontWeight:800, cursor:'pointer' }}>Cancel</button>
            <button onClick={apply} disabled={!rows.length || loading} style={{ padding:'9px 14px', border:'none', borderRadius:'11px', background:(!rows.length || loading) ? '#9ca3af' : '#1a5c42', color:'#fff', fontSize:'12px', fontWeight:900, cursor:(!rows.length || loading) ? 'not-allowed' : 'pointer' }}>Apply Changes</button>
          </div>
        </div>
      </div>

      {confirmRebuild && (
        <ConfirmDialog
          title="Rebuild from previous month?"
          message={<>Rebuild the budget using <strong style={{ color:'#111827' }}>{previousInfo.label}</strong> activity? Current unsaved changes will be replaced.</>}
          confirmLabel="Rebuild"
          onConfirm={rebuildFromPrevious}
          onCancel={()=>setConfirmRebuild(false)}
        />
      )}
    </div>
  )
}
