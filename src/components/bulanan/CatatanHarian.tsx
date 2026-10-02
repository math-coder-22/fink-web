'use client'

import { memo, useMemo, useState } from 'react'
import { fmt, pNum } from '@/components/ui/helpers'
import { AppIcon } from '@/components/ui/design'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { MONTHS_ORDER } from '@/components/layout/DashboardShell'
import { useSavings } from '@/hooks/useSavings'
import type { Transaction, BudgetCategory, IncomeCategory, SavingRow, DebtRow } from '@/types/database'

interface Props {
  tx:       Transaction[]
  budget:   BudgetCategory[]
  income:   IncomeCategory[]
  saving:   SavingRow[]
  debt?:    DebtRow[]
  curMonth?: string
  curYear?: number
  onAdd:    (t: Omit<Transaction, 'id'|'month'|'year'>) => Promise<Transaction | void>
  onUpdate: (id: string, updates: Partial<Transaction>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

const fmtAmt = (n: number) => n ? Math.round(n).toLocaleString('id-ID') : ''
const onlyDigits = (v: string) => v.replace(/\D/g, '')
const fmtInput = (v: string) => {
  const digits = onlyDigits(v)
  return digits ? Number(digits).toLocaleString('id-ID') : ''
}
const parseInputAmount = (v: string) => Number(onlyDigits(v)) || 0

const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const WEEKDAYS_MIN = ['Su','Mo','Tu','We','Th','Fr','Sa']

function fmtDateLabel(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return `${d} ${SHORT_MONTHS[m - 1]} ${y}`
}

function isoOf(y: number, m0: number, d: number) {
  return `${y}-${String(m0 + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
}

/* Minimalist calendar popover — always renders dates as "2 Oct 2026"
   regardless of device locale (native date inputs follow the OS locale). */
function MiniCalendar({ iso, onPick }: { iso: string; onPick: (iso: string) => void }) {
  const init = iso.split('-').map(Number)
  const [vy, setVy] = useState(init[0] || new Date().getFullYear())
  const [vm, setVm] = useState((init[1] || new Date().getMonth() + 1) - 1)

  const firstDow = new Date(vy, vm, 1).getDay()
  const daysInMonth = new Date(vy, vm + 1, 0).getDate()
  const today = new Date()
  const todayIso = isoOf(today.getFullYear(), today.getMonth(), today.getDate())
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  const go = (delta: number) => {
    const d = new Date(vy, vm + delta, 1)
    setVy(d.getFullYear())
    setVm(d.getMonth())
  }

  return (
    <div style={{ width:'248px', background:'#fff', border:'1px solid #e3e7ee', borderRadius:'14px', boxShadow:'0 18px 50px rgba(15,23,42,.20)', padding:'10px 10px 12px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'6px' }}>
        <button type="button" onClick={() => go(-1)} aria-label="Previous month" style={{ width:'28px', height:'28px', border:'none', background:'#f7f8fa', borderRadius:'8px', cursor:'pointer', color:'#4b5563', fontSize:'14px', fontWeight:800 }}>‹</button>
        <div style={{ fontSize:'12.5px', fontWeight:800, color:'#111827' }}>{SHORT_MONTHS[vm]} {vy}</div>
        <button type="button" onClick={() => go(1)} aria-label="Next month" style={{ width:'28px', height:'28px', border:'none', background:'#f7f8fa', borderRadius:'8px', cursor:'pointer', color:'#4b5563', fontSize:'14px', fontWeight:800 }}>›</button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:'2px', marginBottom:'4px' }}>
        {WEEKDAYS_MIN.map(w => (
          <div key={w} style={{ textAlign:'center', fontSize:'9.5px', fontWeight:700, color:'#9ca3af', padding:'4px 0' }}>{w}</div>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:'2px' }}>
        {cells.map((day, i) => {
          if (day === null) return <div key={`e${i}`} />
          const cellIso = isoOf(vy, vm, day)
          const selected = cellIso === iso
          const isToday = cellIso === todayIso
          return (
            <button
              key={day}
              type="button"
              onClick={() => onPick(cellIso)}
              style={{
                height:'30px', border:'none', borderRadius:'9px', cursor:'pointer',
                background: selected ? '#1a5c42' : 'transparent',
                color: selected ? '#fff' : '#111827',
                fontSize:'12px', fontWeight: selected ? 800 : 500,
                boxShadow: !selected && isToday ? 'inset 0 0 0 1.5px #1a5c42' : 'none',
              }}
              onMouseEnter={e => { if (!selected) e.currentTarget.style.background = '#f1f5f9' }}
              onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent' }}
            >
              {day}
            </button>
          )
        })}
      </div>
      <button
        type="button"
        onClick={() => onPick(todayIso)}
        style={{ width:'100%', marginTop:'8px', padding:'7px', border:'1px solid #e3e7ee', borderRadius:'9px', background:'#fff', color:'#1a5c42', fontSize:'11.5px', fontWeight:800, cursor:'pointer' }}
      >
        Today
      </button>
    </div>
  )
}

function CatatanHarian({ tx, budget, income, saving, debt = [], curMonth, curYear, onAdd, onUpdate, onDelete }: Props) {
  const today = (() => {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth()+1).padStart(2,'0')
    const dd = String(d.getDate()).padStart(2,'0')
    return `${y}-${m}-${dd}`
  })()
  const [date,    setDate]    = useState(today)
  const [type,    setType]    = useState<'out'|'inn'|'save'>('out')
  const [cat,     setCat]     = useState('')
  const [note,    setNote]    = useState('')
  const [amt,     setAmt]     = useState('')
  const [isDebt,  setIsDebt]  = useState(false)
  const [loading, setLoading] = useState(false)
  const [editId,  setEditId]  = useState<string|null>(null)
  const [editData,setEditData]= useState<Partial<Transaction>>({})
  const [editCatOpts, setEditCatOpts] = useState<{group:string;items:string[]}[]>([])
  const { goals, topupGoal } = useSavings()
  const activeGoals = useMemo(() => goals.filter(g => g.status === 'active' || g.status === 'pending'), [goals])
  const [savingModalOpen, setSavingModalOpen] = useState(false)
  const [syncToGoal, setSyncToGoal] = useState(true)
  const [selectedGoalId, setSelectedGoalId] = useState('')
  const [goalNote, setGoalNote] = useState('')
  const [actionMenuId, setActionMenuId] = useState<string|null>(null)
  const [calcOpen, setCalcOpen] = useState(false)
  const [calcExpr, setCalcExpr] = useState('')
  const [calcResult, setCalcResult] = useState<number|null>(null)
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [errors, setErrors] = useState<{ amt?: string; note?: string }>({})
  const [confirmTx, setConfirmTx] = useState<Transaction | null>(null)

  // Category options grouped by category. Memoized agar input form tidak menghitung ulang opsi setiap render.
  const catGroups = useMemo(() => {
    if (type === 'out') {
      const budgetGroups = budget.map(c => ({ group: c.label, items: c.items.map(i => i.label) }))
      const debtItems = Array.isArray(debt) ? debt.map(r => r.label).filter(Boolean) : []
      return debtItems.length
        ? [...budgetGroups, { group: 'Debt Payment', items: debtItems }]
        : budgetGroups
    }
    if (type === 'inn')  return income.map(c => ({ group: c.label, items: c.items.map(i => i.label) }))
    return [{ group: 'Savings', items: saving.map(r => r.label) }]
  }, [type, budget, income, saving, debt])

  async function commitAddTransaction(goalId?: string | null) {
    setLoading(true)
    const day = date.split('-')[2].padStart(2, '0')
    const amount = parseInputAmount(amt)
    // Empty category is treated as "Uncategorized" — visible in history instead of a blank entry.
    await onAdd({ date:day, type, cat, note: note || cat || 'Uncategorized', amt: amount, debt: isDebt, settled: false })
    if (type === 'save' && goalId) {
      const goal = activeGoals.find(g => g.id === goalId)
      await topupGoal(goalId, amount, goalNote || note || `Setoran dari Monthly - ${goal?.name || cat || 'Smart Saving'}`)
    }
    setAmt(''); setNote(''); setCat(''); setIsDebt(false); setGoalNote('')
    setLoading(false)
    setSavingModalOpen(false)
    window.dispatchEvent(new Event('hutang-refresh'))
  }

  async function handleAdd() {
    const errs: { amt?: string; note?: string } = {}
    if (!parseInputAmount(amt)) errs.amt = 'Enter an amount'
    if (!cat && !note.trim()) errs.note = 'Add a description for uncategorized transactions'
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    if (type === 'save') {
      const fallbackGoal = activeGoals.find(g => g.name === cat) || activeGoals[0]
      setSelectedGoalId(fallbackGoal?.id || '')
      setSyncToGoal(!!fallbackGoal)
      setGoalNote(note || cat || 'Savings deposit')
      setSavingModalOpen(true)
      return
    }
    await commitAddTransaction(null)
  }

  function openEdit(t: Transaction) {
    setActionMenuId(null)
    setEditId(t.id)
    setEditData({ ...t })
        const opts = (() => {
      if (t.type === 'out') {
        const budgetGroups = budget.map(c => ({ group: c.label, items: c.items.map(i => i.label) }))
        const debtItems = Array.isArray(debt) ? debt.map(r => r.label).filter(Boolean) : []
        return debtItems.length
          ? [...budgetGroups, { group: 'Debt Payment', items: debtItems }]
          : budgetGroups
      }
      if (t.type === 'inn')
        return income.map(c => ({ group: c.label, items: c.items.map(i => i.label) }))
      return [{ group: 'Savings', items: saving.map(r => r.label) }]
    })()
    setEditCatOpts(opts)
  }

  async function saveEdit() {
    if (!editId) return
    await onUpdate(editId, editData.date ? { ...editData, date: String(editData.date).padStart(2, '0') } : editData)
    setEditId(null)
    window.dispatchEvent(new Event('hutang-refresh'))
  }

  const debtCount = useMemo(() => tx.filter(t => t.debt && !t.settled).length, [tx])
  const sortedTx = useMemo(() => tx.slice().sort((a, b) => Number(b.date) - Number(a.date)), [tx])

  // Group transactions by day (descending) for the history list.
  const txGroups = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    for (const t of sortedTx) {
      const k = String(t.date).padStart(2, '0')
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(t)
    }
    return [...map.entries()]
  }, [sortedTx])

  // Day header label in fixed format, e.g. "2 Oct 2026".
  const monthIdx = curMonth ? MONTHS_ORDER.indexOf(curMonth as any) : -1
  const dayLabel = (day: string) => {
    const m = monthIdx >= 0 ? SHORT_MONTHS[monthIdx] : ''
    const y = curYear || ''
    return `${Number(day)}${m ? ` ${m}` : ''}${y ? ` ${y}` : ''}`.trim()
  }
  const dayNet = (items: Transaction[]) =>
    items.reduce((s, t) => s + (t.type === 'inn' ? Number(t.amt || 0) : -Number(t.amt || 0)), 0)

  function formatCalcExpression(expr: string) {
    const raw = expr.replace(/\./g, '')
    const tokens = raw.match(/\d+|[+\-*/×÷().]/g) || []
    return tokens.map(token => {
      if (/^\d+$/.test(token)) return Number(token).toLocaleString('id-ID')
      return token
    }).join('')
  }

  function normalizeCalcExpression(expr: string) {
    return expr.replace(/\./g, '')
  }

  function safeCalculateExpression(expr: string) {
    const cleaned = expr
      .replace(/\./g, '')
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/,/g, '.')
      .replace(/\s/g, '')

    if (!cleaned || !/^[0-9+\-*/().]+$/.test(cleaned)) return null

    try {
      // Simple calculator: numbers and basic operators only.
      // eslint-disable-next-line no-new-func
      const value = Function(`"use strict"; return (${cleaned})`)()
      if (typeof value !== 'number' || !Number.isFinite(value)) return null
      return Math.max(0, Math.round(value))
    } catch {
      return null
    }
  }

  function handleCalcInput(value: string) {
    const rawExpr = normalizeCalcExpression(calcExpr)
    const nextRaw = value === 'C' ? '' : value === '⌫' ? rawExpr.slice(0, -1) : rawExpr + value
    const formatted = formatCalcExpression(nextRaw)
    setCalcExpr(formatted)
    setCalcResult(safeCalculateExpression(formatted))
  }

  function applyCalculatorResult() {
    const result = calcResult ?? safeCalculateExpression(calcExpr)
    if (result === null) return
    setAmt(fmtInput(String(result)))
    setCalcOpen(false)
  }

  function openDeleteConfirm(t: Transaction) {
    setActionMenuId(null)
    setConfirmTx(t)
  }

  async function confirmDeleteTx() {
    if (!confirmTx) return
    const t = confirmTx
    setConfirmTx(null)
    await onDelete(t.id)
    window.dispatchEvent(new Event('hutang-refresh'))
  }

  // Base styles — konsisten Inter font
  const baseFont: React.CSSProperties = { fontFamily: 'Inter, system-ui, sans-serif', fontSize: '13px' }
  const inp: React.CSSProperties = { ...baseFont, width: '100%', padding: '8px 10px', border: '1.5px solid #e3e7ee', borderRadius: '6px', background: '#f7f8fa', outline: 'none', color: '#111827', appearance: 'none', WebkitAppearance: 'none' }
  const sel: React.CSSProperties = { ...inp, cursor: 'pointer', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='none' stroke='%239ca3af' stroke-width='1.5' stroke-linecap='round' d='M2 4l4 4 4-4'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: '28px' }
  // Minimalist micro-labels above form fields
  const lbl: React.CSSProperties = { display:'block', fontSize:'10px', fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.6px', marginBottom:'4px' }
  const err: React.CSSProperties = { fontSize:'11px', color:'#b91c1c', marginTop:'4px' }

  const TYPE_LABELS: Record<string, string> = { out: 'Expense', inn: 'Income', save: 'Savings' }

  return (
    <div>
      {/* ── FORM INPUT ── */}
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

        {/* Row 1: Date + Type */}
        <div className="fink-tx-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div style={{ position:'relative', minWidth:0 }}>
            <span style={lbl}>Date</span>
            <button
              type="button"
              onClick={() => setDatePickerOpen(v => !v)}
              aria-label="Pick date"
              style={{ ...inp, cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'6px', fontFamily:'var(--font-mono), monospace', fontWeight:500 }}
            >
              <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{fmtDateLabel(date)}</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" style={{ flexShrink:0 }}>
                <rect x="3" y="4.5" width="18" height="16" rx="3" />
                <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
              </svg>
            </button>
            {datePickerOpen && (
              <>
                <div onClick={() => setDatePickerOpen(false)} style={{ position:'fixed', inset:0, zIndex:70 }} />
                <div style={{ position:'absolute', left:0, top:'calc(100% + 6px)', zIndex:71 }}>
                  <MiniCalendar iso={date} onPick={(iso) => { setDate(iso); setDatePickerOpen(false) }} />
                </div>
              </>
            )}
          </div>
          <div style={{ minWidth:0 }}>
            <span style={lbl}>Type</span>
            <select style={sel} value={type} onChange={e => { setType(e.target.value as 'out'|'inn'|'save'); setCat(''); setErrors({}) }}>
              <option value="out">Expense</option>
              <option value="inn">Income</option>
              <option value="save">Savings</option>
            </select>
          </div>
        </div>

        {/* Row 2: Category + Amount */}
        <div className="fink-tx-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div style={{ minWidth:0 }}>
            <span style={lbl}>Category</span>
            <select style={sel} value={cat} onChange={e => { setCat(e.target.value); setErrors(p => ({ ...p, note: undefined })) }}>
              <option value="">— Select category —</option>
              {catGroups.map(g => (
                <optgroup key={g.group} label={g.group}>
                  {g.items.map(item => <option key={item} value={item}>{item}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <div style={{ minWidth:0 }}>
            <span style={lbl}>Amount (Rp)</span>
            <div style={{ display:'flex', gap:'6px', alignItems:'stretch', position:'relative' }}>
              <input
                type="text"
                inputMode="numeric"
                style={{ ...inp, fontFamily: 'var(--font-mono), monospace', fontWeight: 500, paddingRight:'10px', borderColor: errors.amt ? '#fca5a5' : undefined, background: errors.amt ? '#fef2f2' : undefined }}
                placeholder="0"
                value={amt}
                onChange={e => { setAmt(fmtInput(e.target.value)); setErrors(p => ({ ...p, amt: undefined })) }}
              />
              <button
                type="button"
                onClick={() => {
                  setCalcExpr(amt ? fmtInput(String(parseInputAmount(amt))) : '')
                  setCalcResult(amt ? safeCalculateExpression(String(parseInputAmount(amt))) : null)
                  setCalcOpen(true)
                }}
                title="Open calculator"
                aria-label="Open calculator"
                style={{
                  width:'40px',
                  border:'1.5px solid #e3e7ee',
                  borderRadius:'6px',
                  background:'#fff',
                  color:'#1a5c42',
                  fontSize:'16px',
                  fontWeight:800,
                  cursor:'pointer',
                  flexShrink:0
                }}
              >
                <AppIcon name="calculator" size={16} />
              </button>
            </div>
            {errors.amt && <div style={err}>{errors.amt}</div>}
          </div>
        </div>

        {/* Row 3: Description + Unpaid */}
        <div>
          <div className="fink-tx-row" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', alignItems: 'end' }}>
            <div style={{ minWidth:0 }}>
              <span style={lbl}>Description</span>
              <input
                style={{ ...inp, borderColor: errors.note ? '#fca5a5' : undefined, background: errors.note ? '#fef2f2' : undefined }}
                placeholder="What was this for?"
                value={note}
                onChange={e => { setNote(e.target.value); setErrors(p => ({ ...p, note: undefined })) }}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 500, color: '#4b5563', cursor: 'pointer', whiteSpace: 'nowrap', padding: '0 4px 9px' }} title="Mark as unpaid — tracked in Unpaid Expenses until settled.">
              <input type="checkbox" checked={isDebt} onChange={e => setIsDebt(e.target.checked)} style={{ accentColor: '#92400e', width: '15px', height: '15px', flexShrink: 0 }} />
              Unpaid
            </label>
          </div>
          {errors.note
            ? <div style={err}>{errors.note}</div>
            : <div style={{ fontSize:'10.5px', color:'#9ca3af', marginTop:'4px' }}>Mark as unpaid — tracked in Unpaid Expenses until settled.</div>}
        </div>

        {/* Submit */}
        <button
          style={{ width: '100%', padding: '9px', borderRadius: '6px', border: 'none', background: loading ? '#9ca3af' : '#1a5c42', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Inter, system-ui, sans-serif' }}
          onClick={handleAdd} disabled={loading}>
          {loading ? 'Saving...' : '+ Record Transaction'}
        </button>
      </div>

      {savingModalOpen && (
        <div
          onClick={e => { if (e.currentTarget === e.target && !loading) setSavingModalOpen(false) }}
          style={{ position:'fixed', inset:0, background:'rgba(17,24,39,.45)', zIndex:900, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
          <div style={{ width:'100%', maxWidth:'420px', background:'#fff', borderRadius:'16px', border:'1px solid #e3e7ee', boxShadow:'0 24px 80px rgba(0,0,0,.22)', overflow:'hidden' }}>
            <div style={{ padding:'18px 20px', borderBottom:'1px solid #e3e7ee', display:'flex', justifyContent:'space-between', gap:'12px', alignItems:'flex-start' }}>
              <div>
                <div style={{ fontSize:'16px', fontWeight:800, color:'#111827' }}>Link to Smart Saving?</div>
                <div style={{ fontSize:'12.5px', color:'#6b7280', marginTop:'4px' }}>A saving transaction of <b>{fmt(parseInputAmount(amt))}</b> can also top up a savings goal balance.</div>
              </div>
              <button aria-label="Close" onClick={()=>!loading && setSavingModalOpen(false)} style={{ border:'none', background:'#f7f8fa', borderRadius:'8px', width:'30px', height:'30px', cursor:'pointer', color:'#6b7280', display:'inline-flex', alignItems:'center', justifyContent:'center' }}><AppIcon name="close" size={16} /></button>
            </div>
            <div style={{ padding:'18px 20px', display:'flex', flexDirection:'column', gap:'12px' }}>
              <label style={{ display:'flex', alignItems:'flex-start', gap:'10px', padding:'12px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'12px', cursor:'pointer' }}>
                <input type="checkbox" checked={syncToGoal} disabled={activeGoals.length === 0} onChange={e=>setSyncToGoal(e.target.checked)} style={{ marginTop:'2px', width:'16px', height:'16px', accentColor:'#1a5c42' }} />
                <span>
                  <span style={{ display:'block', fontSize:'13.5px', fontWeight:700, color:'#14532d' }}>Yes, also add to Smart Saving</span>
                  <span style={{ display:'block', fontSize:'12px', color:'#4b5563', marginTop:'2px' }}>If unchecked, the transaction is only recorded in Monthly.</span>
                </span>
              </label>
              {syncToGoal && (
                <>
                  <div>
                    <div style={{ fontSize:'10px', fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.7px', marginBottom:'5px' }}>Savings Goal</div>
                    <select style={sel} value={selectedGoalId} onChange={e=>setSelectedGoalId(e.target.value)} disabled={activeGoals.length === 0}>
                      {activeGoals.length === 0 && <option value="">No active savings goals yet</option>}
                      {activeGoals.map(g => <option key={g.id} value={g.id}>{g.name} · {g.status}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize:'10px', fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.7px', marginBottom:'5px' }}>Smart Saving history note</div>
                    <input style={inp} value={goalNote} onChange={e=>setGoalNote(e.target.value)} placeholder="E.g. Monthly routine deposit" />
                  </div>
                </>
              )}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginTop:'4px' }}>
                <button onClick={()=>setSavingModalOpen(false)} disabled={loading} style={{ padding:'10px', borderRadius:'10px', border:'1px solid #e3e7ee', background:'#fff', color:'#4b5563', fontWeight:700, cursor:'pointer' }}>Cancel</button>
                <button
                  onClick={()=>commitAddTransaction(syncToGoal ? selectedGoalId : null)}
                  disabled={loading || (syncToGoal && !selectedGoalId)}
                  style={{ padding:'10px', borderRadius:'10px', border:'none', background:(loading || (syncToGoal && !selectedGoalId))?'#9ca3af':'#1a5c42', color:'#fff', fontWeight:800, cursor:(loading || (syncToGoal && !selectedGoalId))?'not-allowed':'pointer' }}>
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {calcOpen && (
        <div
          onClick={e => { if (e.currentTarget === e.target) setCalcOpen(false) }}
          style={{ position:'fixed', inset:0, background:'rgba(17,24,39,.42)', zIndex:950, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}
        >
          <div style={{ width:'100%', maxWidth:'340px', background:'#fff', borderRadius:'16px', border:'1px solid #e3e7ee', boxShadow:'0 24px 80px rgba(0,0,0,.22)', overflow:'hidden' }}>
            <div style={{ padding:'14px 16px', borderBottom:'1px solid #e3e7ee', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'10px' }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:7, fontSize:'15px', fontWeight:800, color:'#111827' }}><AppIcon name="calculator" size={16} />Expense Calculator</div>
                <div style={{ fontSize:'11px', color:'#9ca3af', marginTop:'2px' }}>Calculate, then insert into Amount</div>
              </div>
              <button type="button" aria-label="Close" onClick={()=>setCalcOpen(false)} style={{ width:'30px', height:'30px', border:'none', background:'#f3f4f6', borderRadius:'8px', color:'#4b5563', cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center' }}><AppIcon name="close" size={16} /></button>
            </div>

            <div style={{ padding:'14px 16px' }}>
              <input
                readOnly
                inputMode="none"
                value={calcExpr}
                onChange={e => {
                  const formatted = formatCalcExpression(e.target.value)
                  setCalcExpr(formatted)
                  setCalcResult(safeCalculateExpression(formatted))
                }}
                placeholder="E.g. 12.000+35.000"
                style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #e3e7ee', borderRadius:'10px', outline:'none', background:'#f7f8fa', fontFamily:'var(--font-mono), monospace', fontSize:'15px', fontWeight:700, color:'#111827', cursor:'default', caretColor:'transparent' }}
              />

              <div style={{ marginTop:'8px', padding:'10px 12px', borderRadius:'10px', background:'#f0fdf4', border:'1px solid #bbf7d0', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'10px' }}>
                <span style={{ fontSize:'11px', fontWeight:800, color:'#15803d', textTransform:'uppercase', letterSpacing:'.5px' }}>Result</span>
                <span style={{ fontFamily:'var(--font-mono), monospace', fontSize:'16px', fontWeight:900, color:'#1a5c42' }}>
                  {calcResult === null ? '-' : fmt(calcResult)}
                </span>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'8px', marginTop:'12px' }}>
                {['7','8','9','÷','4','5','6','×','1','2','3','-','0','000','.','+'].map(k => (
                  <button
                    key={k}
                    type="button"
                    onClick={()=>handleCalcInput(k)}
                    style={{ padding:'11px 0', border:'1px solid #e3e7ee', borderRadius:'10px', background:['+','-','×','÷'].includes(k)?'#f0fdf4':'#fff', color:['+','-','×','÷'].includes(k)?'#1a5c42':'#111827', fontSize:'14px', fontWeight:800, cursor:'pointer' }}
                  >
                    {k}
                  </button>
                ))}
                <button type="button" onClick={()=>handleCalcInput('C')} style={{ padding:'11px 0', border:'1px solid #fecaca', borderRadius:'10px', background:'#fef2f2', color:'#991b1b', fontSize:'14px', fontWeight:800, cursor:'pointer' }}>C</button>
                <button type="button" onClick={()=>handleCalcInput('⌫')} style={{ padding:'11px 0', border:'1px solid #e3e7ee', borderRadius:'10px', background:'#fff', color:'#4b5563', fontSize:'14px', fontWeight:800, cursor:'pointer' }}>⌫</button>
                <button type="button" onClick={()=>handleCalcInput('(')} style={{ padding:'11px 0', border:'1px solid #e3e7ee', borderRadius:'10px', background:'#fff', color:'#4b5563', fontSize:'14px', fontWeight:800, cursor:'pointer' }}>(</button>
                <button type="button" onClick={()=>handleCalcInput(')')} style={{ padding:'11px 0', border:'1px solid #e3e7ee', borderRadius:'10px', background:'#fff', color:'#4b5563', fontSize:'14px', fontWeight:800, cursor:'pointer' }}>)</button>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginTop:'14px' }}>
                <button type="button" onClick={()=>setCalcOpen(false)} style={{ padding:'10px', borderRadius:'10px', border:'1px solid #e3e7ee', background:'#fff', color:'#4b5563', fontWeight:800, cursor:'pointer' }}>Cancel</button>
                <button
                  type="button"
                  onClick={applyCalculatorResult}
                  disabled={calcResult === null}
                  style={{ padding:'10px', borderRadius:'10px', border:'none', background:calcResult===null?'#9ca3af':'#1a5c42', color:'#fff', fontWeight:900, cursor:calcResult===null?'not-allowed':'pointer' }}
                >
                  Use Result
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── HISTORY HEADER ── */}
      <div style={{ padding: '8px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #e3e7ee' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.7px' }}>Transaction History</div>
        {debtCount > 0 && (
          <span style={{ fontSize: '10px', fontWeight: 700, background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '2px 8px', borderRadius: '20px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><AppIcon name="warning" size={12} />{debtCount} unpaid{debtCount > 1 ? 's' : ''}</span>
          </span>
        )}
      </div>

      {/* ── TX LIST (grouped by day, with daily subtotal) ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '10px 16px' }}>
        {tx.length === 0 && (
          <div style={{ textAlign: 'center', padding: '28px', color: '#9ca3af', fontSize: '13px' }}>
            <div style={{ display:'flex', justifyContent:'center', marginBottom:'6px' }}><AppIcon name="transactions" size={24} /></div>
            No transactions yet
          </div>
        )}

        {txGroups.map(([day, items]) => {
          const net = dayNet(items)
          return (
            <div key={day} style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
              <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', padding:'8px 2px 0' }}>
                <span style={{ fontSize:'11px', fontWeight:800, color:'#4b5563' }}>{dayLabel(day)}</span>
                <span style={{ fontSize:'10px', color:'#9ca3af' }}>{items.length} transaction{items.length !== 1 ? 's' : ''}</span>
              </div>

              {items.map(t => {
          const isEdit = editId === t.id
          const bc = t.type === 'inn' ? '#d1eadd' : t.type === 'save' ? '#eff6ff' : '#fee2e2'
          const tc = t.type === 'inn' ? '#1a5c42' : t.type === 'save' ? '#1e40af' : '#991b1b'
          const sg = t.type === 'inn' ? '+' : t.type === 'save' ? '' : '-'
          const catLabel = t.cat || 'Uncategorized'
          const catUn = !t.cat

          if (isEdit) return (
            <div key={t.id} style={{ background: '#fff', border: '1.5px solid #1a5c42', borderRadius: '6px', padding: '10px 12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: '#9ca3af', marginBottom: '3px', textTransform: 'uppercase' }}>Date</div>
                  <input type="number" min="1" max="31" style={{ ...inp, fontSize: '12px', padding: '5px 8px' }}
                    value={editData.date || ''} onChange={e => setEditData(p => ({ ...p, date: e.target.value }))} />
                </div>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: '#9ca3af', marginBottom: '3px', textTransform: 'uppercase' }}>Type</div>
                  <select style={{ ...sel, fontSize: '12px', padding: '5px 28px 5px 8px' }}
                    value={editData.type || 'out'}
                    onChange={e => {
                      const v = e.target.value as 'out'|'inn'|'save'
                      setEditData(p => ({ ...p, type: v, cat: '' }))
                      const opts = v === 'out' ? budget.map(c => ({ group: c.label, items: c.items.map(i => i.label) }))
                        : v === 'inn' ? income.map(c => ({ group: c.label, items: c.items.map(i => i.label) }))
                        : [{ group: 'Savings', items: saving.map(r => r.label) }]
                      setEditCatOpts(opts)
                    }}>
                    <option value="out">Expense</option>
                    <option value="inn">Income</option>
                    <option value="save">Savings</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '6px' }}>
                <div style={{ fontSize: '10px', fontWeight: 600, color: '#9ca3af', marginBottom: '3px', textTransform: 'uppercase' }}>Category</div>
                <select style={{ ...sel, fontSize: '12px', padding: '5px 28px 5px 8px' }}
                  value={editData.cat || ''}
                  onChange={e => setEditData(p => ({ ...p, cat: e.target.value }))}>
                  <option value="">— Select —</option>
                  {editCatOpts.map(g => (
                    <optgroup key={g.group} label={g.group}>
                      {g.items.map(item => <option key={item} value={item}>{item}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: '#9ca3af', marginBottom: '3px', textTransform: 'uppercase' }}>Description</div>
                  <input style={{ ...inp, fontSize: '12px', padding: '5px 8px' }}
                    value={editData.note || ''} onChange={e => setEditData(p => ({ ...p, note: e.target.value }))} />
                </div>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: '#9ca3af', marginBottom: '3px', textTransform: 'uppercase' }}>Amount (Rp)</div>
                  <input type="text" inputMode="numeric" style={{ ...inp, fontSize: '12px', padding: '5px 8px', fontFamily: 'var(--font-mono), monospace' }}
                    value={editData.amt ? Number(editData.amt).toLocaleString('id-ID') : ''} onChange={e => setEditData(p => ({ ...p, amt: parseInputAmount(e.target.value) }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#4b5563', cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!editData.debt} onChange={e => setEditData(p => ({ ...p, debt: e.target.checked, settled: e.target.checked ? p.settled : false }))} style={{ accentColor: '#92400e' }} />
                  Unpaid
                </label>
                {editData.debt && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#4b5563', cursor: 'pointer' }}>
                    <input type="checkbox" checked={!!editData.settled} onChange={e => setEditData(p => ({ ...p, settled: e.target.checked }))} style={{ accentColor: '#1a5c42' }} />
                    Settled
                  </label>
                )}
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => setEditId(null)} style={{ flex: 1, padding: '6px', borderRadius: '6px', border: '1px solid #e3e7ee', background: 'transparent', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', color: '#4b5563', fontFamily: 'Inter, system-ui, sans-serif' }}>Cancel</button>
                <button onClick={saveEdit} style={{ flex: 1, padding: '6px', borderRadius: '6px', border: 'none', background: '#1a5c42', color: '#fff', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif' }}>Save</button>
              </div>
            </div>
          )

          return (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: '7px',
              background: t.debt && !t.settled ? '#fffbeb' : '#f7f8fa',
              border: `1px solid ${t.debt && !t.settled ? '#fde68a' : '#e3e7ee'}`,
              borderRadius: '6px', padding: '8px 10px',
            }}>
              <div style={{ fontSize: '10.5px', color: '#9ca3af', fontWeight: 600, minWidth: '22px', marginTop: '2px', fontFamily: 'var(--font-mono), monospace' }}>{t.date}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.note}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize:'9.5px', fontWeight:600, background: catUn ? '#f1f5f9' : bc, color: catUn ? '#64748b' : tc, padding:'2px 7px', borderRadius:'20px', letterSpacing:'.3px', border: catUn ? '1px dashed #cbd5e1' : 'none' }}>{catLabel}</span>
                  {t.debt && !t.settled && <span style={{ fontSize: '9px', fontWeight: 700, background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '1px 6px', borderRadius: '10px' }}><span style={{ display:'inline-flex', alignItems:'center', gap:4 }}><AppIcon name="warning" size={10} />Unpaid</span></span>}
                  {t.debt && t.settled  && <span style={{ fontSize: '9px', fontWeight: 700, background: '#d1eadd', color: '#1a5c42', padding: '1px 6px', borderRadius: '10px' }}><span style={{ display:'inline-flex', alignItems:'center', gap:4 }}><AppIcon name="check" size={10} />Settled</span></span>}
                </div>
              </div>
              <div style={{ fontSize: '12.5px', fontWeight: 700, fontFamily: 'var(--font-mono), monospace', color: tc, textAlign: 'right', minWidth: '78px' }}>{sg} {fmt(t.amt)}</div>
              <div style={{ position:'relative', flexShrink:0 }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setActionMenuId(actionMenuId === t.id ? null : t.id)
                  }}
                  aria-label="Transaction menu"
                  style={{
                    width:'28px',
                    height:'28px',
                    border:'1px solid #e3e7ee',
                    background:'#fff',
                    color:'#6b7280',
                    fontSize:'17px',
                    cursor:'pointer',
                    borderRadius:'8px',
                    display:'flex',
                    alignItems:'center',
                    justifyContent:'center',
                    lineHeight:1,
                    boxShadow:'0 1px 2px rgba(15,23,42,.04)'
                  }}
                >
                  ⋮
                </button>

                {actionMenuId === t.id && (
                  <>
                    <div
                      onClick={() => setActionMenuId(null)}
                      style={{ position:'fixed', inset:0, zIndex:60 }}
                    />
                    <div
                      style={{
                        position:'absolute',
                        right:0,
                        top:'34px',
                        width:'138px',
                        background:'#fff',
                        border:'1px solid #e3e7ee',
                        borderRadius:'10px',
                        boxShadow:'0 14px 35px rgba(15,23,42,.18)',
                        padding:'6px',
                        zIndex:61
                      }}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setActionMenuId(null)
                          openEdit(t)
                        }}
                        style={{
                          width:'100%',
                          border:'none',
                          background:'transparent',
                          padding:'8px 10px',
                          borderRadius:'7px',
                          textAlign:'left',
                          fontSize:'12px',
                          fontWeight:700,
                          color:'#374151',
                          cursor:'pointer'
                        }}
                      >
                        <span style={{ display:'inline-flex', alignItems:'center', gap:7 }}><AppIcon name="edit" size={13} />Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          openDeleteConfirm(t)
                        }}
                        style={{
                          width:'100%',
                          border:'none',
                          background:'transparent',
                          padding:'8px 10px',
                          borderRadius:'7px',
                          textAlign:'left',
                          fontSize:'12px',
                          fontWeight:700,
                          color:'#991b1b',
                          cursor:'pointer'
                        }}
                      >
                        <span style={{ display:'inline-flex', alignItems:'center', gap:7 }}><AppIcon name="trash" size={13} />Delete</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )
              })}
              <div style={{ display:'flex', alignItems:'baseline', justifyContent:'flex-end', gap:'6px', padding:'0 2px 8px' }}>
                <span style={{ fontSize:'10.5px', color:'#9ca3af' }}>Day total</span>
                <span style={{ fontSize:'12px', fontWeight:800, fontFamily:'var(--font-mono), monospace', color: net < 0 ? '#b91c1c' : '#1a5c42' }}>
                  {net < 0 ? '-' : '+'} {fmt(Math.abs(net))}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── DELETE CONFIRMATION DIALOG ── */}
      {confirmTx && (
        <ConfirmDialog
          title="Delete transaction?"
          message={<>
            Delete this {TYPE_LABELS[confirmTx.type] || 'transaction'} of <strong style={{ color:'#111827' }}>{fmt(confirmTx.amt)}</strong>
            {confirmTx.note ? <> — “{confirmTx.note}”</> : confirmTx.cat ? <> ({confirmTx.cat})</> : <> (Uncategorized)</>}? This cannot be undone.
          </>}
          onConfirm={confirmDeleteTx}
          onCancel={() => setConfirmTx(null)}
        />
      )}

      <style>{`
        @media (max-width: 430px) {
          .fink-tx-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

export default memo(CatatanHarian)
