'use client'

import { useMemo, useState } from 'react'
import { fmt, pNum } from '@/components/ui/helpers'
import { useSavings } from '@/hooks/useSavings'
import type { Transaction, BudgetCategory, IncomeCategory, SavingRow } from '@/types/database'

interface Props {
  tx:       Transaction[]
  budget:   BudgetCategory[]
  income:   IncomeCategory[]
  saving:   SavingRow[]
  onAdd:    (t: Omit<Transaction, 'id'|'month'|'year'>) => Promise<void>
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

export default function CatatanHarian({ tx, budget, income, saving, onAdd, onUpdate, onDelete }: Props) {
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

  // Category options grouped by category
  const catGroups = (() => {
    if (type === 'out')  return budget.map(c => ({ group: c.label, items: c.items.map(i => i.label) }))
    if (type === 'inn')  return income.map(c => ({ group: c.label, items: c.items.map(i => i.label) }))
    return [{ group: 'Savings', items: saving.map(r => r.label) }]
  })()

  async function commitAddTransaction(goalId?: string | null) {
    setLoading(true)
    const day = date.split('-')[2].padStart(2, '0')
    const amount = parseInputAmount(amt)
    await onAdd({ date:day, type, cat, note: note || cat || type, amt: amount, debt: isDebt, settled: false })
    if (type === 'save' && goalId) {
      const goal = activeGoals.find(g => g.id === goalId)
      topupGoal(goalId, amount, goalNote || note || `Setoran dari Monthly - ${goal?.name || cat || 'Smart Saving'}`)
    }
    setAmt(''); setNote(''); setCat(''); setIsDebt(false); setGoalNote('')
    setLoading(false)
    setSavingModalOpen(false)
    window.dispatchEvent(new Event('hutang-refresh'))
  }

  async function handleAdd() {
    if (!date || !amt) return
    if (type === 'save') {
      const fallbackGoal = activeGoals.find(g => g.name === cat) || activeGoals[0]
      setSelectedGoalId(fallbackGoal?.id || '')
      setSyncToGoal(!!fallbackGoal)
      setGoalNote(note || cat || 'Setoran tabungan')
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
      if (t.type === 'out')  return budget.map(c => ({ group: c.label, items: c.items.map(i => i.label) }))
      if (t.type === 'inn')  return income.map(c => ({ group: c.label, items: c.items.map(i => i.label) }))
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

  const debtCount = tx.filter(t => t.debt && !t.settled).length

  function safeCalculateExpression(expr: string) {
    const cleaned = expr
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/,/g, '.')
      .replace(/\s/g, '')

    if (!cleaned || !/^[0-9+\-*/().]+$/.test(cleaned)) return null

    try {
      // Kalkulator sederhana: hanya angka dan operator dasar.
      // eslint-disable-next-line no-new-func
      const value = Function(`"use strict"; return (${cleaned})`)()
      if (typeof value !== 'number' || !Number.isFinite(value)) return null
      return Math.max(0, Math.round(value))
    } catch {
      return null
    }
  }

  function handleCalcInput(value: string) {
    const next = value === 'C' ? '' : value === '⌫' ? calcExpr.slice(0, -1) : calcExpr + value
    setCalcExpr(next)
    setCalcResult(safeCalculateExpression(next))
  }

  function applyCalculatorResult() {
    const result = calcResult ?? safeCalculateExpression(calcExpr)
    if (result === null) return
    setAmt(fmtInput(String(result)))
    setCalcOpen(false)
  }

  async function confirmDeleteTx(t: Transaction) {
    const label = t.note || t.cat || 'transaksi ini'
    const ok = confirm(`Hapus catatan "${label}"?\n\nTindakan ini tidak bisa dibatalkan.`)
    if (!ok) return
    await onDelete(t.id)
    window.dispatchEvent(new Event('hutang-refresh'))
    setActionMenuId(null)
  }

  // Base styles — konsisten Inter font
  const baseFont: React.CSSProperties = { fontFamily: 'Inter, system-ui, sans-serif', fontSize: '13px' }
  const inp: React.CSSProperties = { ...baseFont, width: '100%', padding: '8px 10px', border: '1.5px solid #e3e7ee', borderRadius: '6px', background: '#f7f8fa', outline: 'none', color: '#111827', appearance: 'none', WebkitAppearance: 'none' }
  const sel: React.CSSProperties = { ...inp, cursor: 'pointer', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='none' stroke='%239ca3af' stroke-width='1.5' stroke-linecap='round' d='M2 4l4 4 4-4'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: '28px' }

  const TYPE_LABELS: Record<string, string> = { out: 'Expense', inn: 'Income', save: 'Savings' }

  return (
    <div>
      {/* ── FORM INPUT ── */}
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>

        {/* Row 1: Date + Type */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <input type="date" style={{ ...inp, colorScheme: 'light' }} value={date} onChange={e => setDate(e.target.value)} />
          <select style={sel} value={type} onChange={e => { setType(e.target.value as 'out'|'inn'|'save'); setCat('') }}>
            <option value="out">Expense</option>
            <option value="inn">Income</option>
            <option value="save">Savings</option>
          </select>
        </div>

        {/* Row 2: Category + Amount */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <select style={sel} value={cat} onChange={e => setCat(e.target.value)}>
            <option value="">— Select category —</option>
            {catGroups.map(g => (
              <optgroup key={g.group} label={g.group}>
                {g.items.map(item => <option key={item} value={item}>{item}</option>)}
              </optgroup>
            ))}
          </select>
          <div style={{ display:'flex', gap:'6px', alignItems:'stretch', position:'relative' }}>
            <input
              type="text"
              inputMode="numeric"
              style={{ ...inp, fontFamily: 'JetBrains Mono, monospace', fontWeight: 500, paddingRight:'10px' }}
              placeholder="Amount (Rp)"
              value={amt}
              onChange={e => setAmt(fmtInput(e.target.value))}
            />
            <button
              type="button"
              onClick={() => {
                setCalcExpr(amt ? String(parseInputAmount(amt)) : '')
                setCalcResult(amt ? safeCalculateExpression(String(parseInputAmount(amt))) : null)
                setCalcOpen(true)
              }}
              title="Buka kalkulator"
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
              🧮
            </button>
          </div>
        </div>

        {/* Row 3: Description + Debt checkbox */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', alignItems: 'center' }}>
          <input
            style={{ ...inp }}
            placeholder="Description..."
            value={note}
            onChange={e => setNote(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 500, color: '#4b5563', cursor: 'pointer', whiteSpace: 'nowrap', padding: '0 4px' }}>
            <input type="checkbox" checked={isDebt} onChange={e => setIsDebt(e.target.checked)} style={{ accentColor: '#92400e', width: '15px', height: '15px', flexShrink: 0 }} />
            Unpaid debt
          </label>
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
                <div style={{ fontSize:'16px', fontWeight:800, color:'#111827' }}>Hubungkan ke Smart Saving?</div>
                <div style={{ fontSize:'12.5px', color:'#6b7280', marginTop:'4px' }}>Transaksi saving sebesar <b>{fmt(parseInputAmount(amt))}</b> bisa langsung menambah saldo tujuan tabungan.</div>
              </div>
              <button onClick={()=>!loading && setSavingModalOpen(false)} style={{ border:'none', background:'#f7f8fa', borderRadius:'8px', width:'30px', height:'30px', cursor:'pointer', color:'#6b7280', fontSize:'18px' }}>×</button>
            </div>
            <div style={{ padding:'18px 20px', display:'flex', flexDirection:'column', gap:'12px' }}>
              <label style={{ display:'flex', alignItems:'flex-start', gap:'10px', padding:'12px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'12px', cursor:'pointer' }}>
                <input type="checkbox" checked={syncToGoal} disabled={activeGoals.length === 0} onChange={e=>setSyncToGoal(e.target.checked)} style={{ marginTop:'2px', width:'16px', height:'16px', accentColor:'#1a5c42' }} />
                <span>
                  <span style={{ display:'block', fontSize:'13.5px', fontWeight:700, color:'#14532d' }}>Ya, masukkan juga ke Smart Saving</span>
                  <span style={{ display:'block', fontSize:'12px', color:'#4b5563', marginTop:'2px' }}>Jika tidak dicentang, transaksi hanya tercatat di Monthly.</span>
                </span>
              </label>
              {syncToGoal && (
                <>
                  <div>
                    <div style={{ fontSize:'10px', fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.7px', marginBottom:'5px' }}>Tujuan Tabungan</div>
                    <select style={sel} value={selectedGoalId} onChange={e=>setSelectedGoalId(e.target.value)} disabled={activeGoals.length === 0}>
                      {activeGoals.length === 0 && <option value="">Belum ada tujuan tabungan aktif</option>}
                      {activeGoals.map(g => <option key={g.id} value={g.id}>{g.name} · {g.status}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize:'10px', fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.7px', marginBottom:'5px' }}>Catatan Riwayat Smart Saving</div>
                    <input style={inp} value={goalNote} onChange={e=>setGoalNote(e.target.value)} placeholder="Contoh: Setoran rutin bulanan" />
                  </div>
                </>
              )}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginTop:'4px' }}>
                <button onClick={()=>setSavingModalOpen(false)} disabled={loading} style={{ padding:'10px', borderRadius:'10px', border:'1px solid #e3e7ee', background:'#fff', color:'#4b5563', fontWeight:700, cursor:'pointer' }}>Batal</button>
                <button
                  onClick={()=>commitAddTransaction(syncToGoal ? selectedGoalId : null)}
                  disabled={loading || (syncToGoal && !selectedGoalId)}
                  style={{ padding:'10px', borderRadius:'10px', border:'none', background:(loading || (syncToGoal && !selectedGoalId))?'#9ca3af':'#1a5c42', color:'#fff', fontWeight:800, cursor:(loading || (syncToGoal && !selectedGoalId))?'not-allowed':'pointer' }}>
                  {loading ? 'Menyimpan...' : 'Simpan'}
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
                <div style={{ fontSize:'15px', fontWeight:800, color:'#111827' }}>🧮 Kalkulator Pengeluaran</div>
                <div style={{ fontSize:'11px', color:'#9ca3af', marginTop:'2px' }}>Hitung lalu masukkan ke Amount</div>
              </div>
              <button type="button" onClick={()=>setCalcOpen(false)} style={{ width:'30px', height:'30px', border:'none', background:'#f3f4f6', borderRadius:'8px', fontSize:'18px', color:'#4b5563', cursor:'pointer' }}>×</button>
            </div>

            <div style={{ padding:'14px 16px' }}>
              <input
                autoFocus
                value={calcExpr}
                onChange={e => {
                  setCalcExpr(e.target.value)
                  setCalcResult(safeCalculateExpression(e.target.value))
                }}
                placeholder="Contoh: 12000+35000"
                style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #e3e7ee', borderRadius:'10px', outline:'none', background:'#f7f8fa', fontFamily:'JetBrains Mono, monospace', fontSize:'15px', fontWeight:700, color:'#111827' }}
              />

              <div style={{ marginTop:'8px', padding:'10px 12px', borderRadius:'10px', background:'#f0fdf4', border:'1px solid #bbf7d0', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'10px' }}>
                <span style={{ fontSize:'11px', fontWeight:800, color:'#15803d', textTransform:'uppercase', letterSpacing:'.5px' }}>Hasil</span>
                <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:'16px', fontWeight:900, color:'#1a5c42' }}>
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
                <button type="button" onClick={()=>setCalcOpen(false)} style={{ padding:'10px', borderRadius:'10px', border:'1px solid #e3e7ee', background:'#fff', color:'#4b5563', fontWeight:800, cursor:'pointer' }}>Batal</button>
                <button
                  type="button"
                  onClick={applyCalculatorResult}
                  disabled={calcResult === null}
                  style={{ padding:'10px', borderRadius:'10px', border:'none', background:calcResult===null?'#9ca3af':'#1a5c42', color:'#fff', fontWeight:900, cursor:calcResult===null?'not-allowed':'pointer' }}
                >
                  Pakai Hasil
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
            ⚠ {debtCount} unpaid debt{debtCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* ── TX LIST ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '10px 16px' }}>
        {tx.length === 0 && (
          <div style={{ textAlign: 'center', padding: '28px', color: '#9ca3af', fontSize: '13px' }}>
            <div style={{ fontSize: '24px', marginBottom: '6px' }}>🗒️</div>
            No transactions yet
          </div>
        )}

        {tx.slice().sort((a, b) => Number(b.date) - Number(a.date)).map(t => {
          const isEdit = editId === t.id
          const bc = t.type === 'inn' ? '#d1eadd' : t.type === 'save' ? '#eff6ff' : '#fee2e2'
          const tc = t.type === 'inn' ? '#1a5c42' : t.type === 'save' ? '#1e40af' : '#991b1b'
          const sg = t.type === 'inn' ? '+' : t.type === 'save' ? '→' : '-'

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
                  <input type="text" inputMode="numeric" style={{ ...inp, fontSize: '12px', padding: '5px 8px', fontFamily: 'JetBrains Mono,monospace' }}
                    value={editData.amt ? Number(editData.amt).toLocaleString('id-ID') : ''} onChange={e => setEditData(p => ({ ...p, amt: parseInputAmount(e.target.value) }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#4b5563', cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!editData.debt} onChange={e => setEditData(p => ({ ...p, debt: e.target.checked, settled: e.target.checked ? p.settled : false }))} style={{ accentColor: '#92400e' }} />
                  Unpaid debt
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
              <div style={{ fontSize: '10.5px', color: '#9ca3af', fontWeight: 600, minWidth: '22px', marginTop: '2px', fontFamily: 'JetBrains Mono,monospace' }}>{t.date}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.note}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px', flexWrap: 'wrap' }}>
                  {t.cat && <span style={{ fontSize: '9.5px', fontWeight: 600, background: bc, color: tc, padding: '2px 7px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '.3px' }}>{t.cat}</span>}
                  {t.debt && !t.settled && <span style={{ fontSize: '9px', fontWeight: 700, background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '1px 6px', borderRadius: '10px' }}>⚠ Debt</span>}
                  {t.debt && t.settled  && <span style={{ fontSize: '9px', fontWeight: 700, background: '#d1eadd', color: '#1a5c42', padding: '1px 6px', borderRadius: '10px' }}>✓ Settled</span>}
                </div>
              </div>
              <div style={{ fontSize: '12.5px', fontWeight: 700, fontFamily: 'JetBrains Mono,monospace', color: tc, textAlign: 'right', minWidth: '78px' }}>{sg} {fmt(t.amt)}</div>
              <div style={{ position:'relative', flexShrink:0 }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setActionMenuId(actionMenuId === t.id ? null : t.id)
                  }}
                  aria-label="Menu transaksi"
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
                        ✏️ Edit
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          confirmDeleteTx(t)
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
                        🗑️ Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
