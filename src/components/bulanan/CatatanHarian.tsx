'use client'

import { useState } from 'react'
import { fmt, pNum } from '@/components/ui/helpers'
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

  // Category options grouped by category
  const catGroups = (() => {
    if (type === 'out')  return budget.map(c => ({ group: c.label, items: c.items.map(i => i.label) }))
    if (type === 'inn')  return income.map(c => ({ group: c.label, items: c.items.map(i => i.label) }))
    return [{ group: 'Savings', items: saving.map(r => r.label) }]
  })()

  async function handleAdd() {
    if (!date || !amt) return
    setLoading(true)
    const day = date.split('-')[2]
    await onAdd({ date:day, type, cat, note: note || cat || type, amt: pNum(amt), debt: isDebt, settled: false })
    setAmt(''); setNote(''); setCat(''); setIsDebt(false)
    setLoading(false)
    window.dispatchEvent(new Event('hutang-refresh'))
  }

  function openEdit(t: Transaction) {
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
    await onUpdate(editId, editData)
    setEditId(null)
    window.dispatchEvent(new Event('hutang-refresh'))
  }

  const debtCount = tx.filter(t => t.debt && !t.settled).length

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
          <input
            type="number"
            style={{ ...inp, fontFamily: 'JetBrains Mono, monospace', fontWeight: 500 }}
            placeholder="Amount (Rp)"
            value={amt}
            onChange={e => setAmt(e.target.value)}
          />
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

        {tx.map(t => {
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
                  <input type="number" style={{ ...inp, fontSize: '12px', padding: '5px 8px', fontFamily: 'JetBrains Mono,monospace' }}
                    value={editData.amt || ''} onChange={e => setEditData(p => ({ ...p, amt: pNum(e.target.value) }))} />
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
              <button onClick={() => openEdit(t)} style={{ width: '18px', height: '18px', border: 'none', background: 'none', color: '#9ca3af', fontSize: '12px', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✏️</button>
              <button onClick={async () => { await onDelete(t.id); window.dispatchEvent(new Event('hutang-refresh')) }} style={{ width: '16px', height: '16px', border: 'none', background: 'none', color: '#9ca3af', fontSize: '13px', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>×</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
