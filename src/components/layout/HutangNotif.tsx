'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { Transaction } from '@/types/database'
import { AppIcon } from '@/components/ui/design'

const MONTH_NAMES: Record<string, string> = {
  jan:'Jan', feb:'Feb', mar:'Mar', apr:'Apr',
  may:'Mei', jun:'Jun', jul:'Jul', aug:'Ags',
  sep:'Sep', oct:'Okt', nov:'Nov', dec:'Des',
}

const ACCENT = '#1a5c42'
const MONTH_ORDER = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'] as const

const fmt = (n: number) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID')
const fmtNum = (n: number) => Math.round(n || 0).toLocaleString('id-ID')
const digitsOnly = (s: string) => s.replace(/[^0-9]/g, '')
const remainingOf = (t: Transaction) => Math.max(0, Number(t.amt || 0) - Number((t as any).paid_amt || 0))
const paidOf = (t: Transaction) => Math.max(0, Number((t as any).paid_amt || 0))

type SortMode = 'oldest' | 'largest'

export default function HutangNotif({ isMobile = false }: { isMobile?: boolean }) {
  const [unpaidTx, setUnpaidTx] = useState<Transaction[]>([])
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sortMode, setSortMode] = useState<SortMode>('oldest')
  const [payId, setPayId] = useState<string | null>(null)
  const [payInput, setPayInput] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/hutang')
      const json = await res.json()
      setUnpaidTx(json.data || [])
    } catch { /* keep old list on transient failure */ }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const id = setInterval(load, 30000)
    return () => clearInterval(id)
  }, [load])

  useEffect(() => {
    window.addEventListener('hutang-refresh', load)
    return () => window.removeEventListener('hutang-refresh', load)
  }, [load])

  const sorted = useMemo(() => {
    const arr = [...unpaidTx]
    if (sortMode === 'largest') {
      arr.sort((a, b) => remainingOf(b) - remainingOf(a))
    } else {
      const key = (t: Transaction) =>
        t.year * 1000000 + MONTH_ORDER.indexOf(t.month as any) * 10000 + Number(String(t.date).slice(0, 2) || 0)
      arr.sort((a, b) => key(a) - key(b))
    }
    return arr
  }, [unpaidTx, sortMode])

  const totalRemaining = useMemo(() => unpaidTx.reduce((s, t) => s + remainingOf(t), 0), [unpaidTx])

  const selectedList = useMemo(() => sorted.filter(t => selected.has(t.id)), [sorted, selected])
  const selectedTotal = useMemo(() => selectedList.reduce((s, t) => s + remainingOf(t), 0), [selectedList])
  const allSelected = sorted.length > 0 && sorted.every(t => selected.has(t.id))

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelected(allSelected ? new Set() : new Set(sorted.map(t => t.id)))
  }

  async function postPayments(payments: { id: string; amount: number }[]) {
    setBusy(true)
    try {
      await fetch('/api/hutang', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payments }),
      })
    } finally {
      setBusy(false)
    }
    setSelected(new Set())
    setPayId(null)
    setPayInput('')
    await load()
    window.dispatchEvent(new Event('hutang-refresh'))
  }

  const handleBatchSettle = () => {
    if (selectedList.length === 0 || busy) return
    postPayments(selectedList.map(t => ({ id: t.id, amount: remainingOf(t) })))
  }

  const openPay = (id: string) => {
    setPayId(id)
    setPayInput('')
  }

  const payTx = sorted.find(t => t.id === payId) || null
  const payRemaining = payTx ? remainingOf(payTx) : 0
  const payAmount = Number(digitsOnly(payInput) || 0)
  const payAfter = Math.max(0, payRemaining - Math.min(payAmount, payRemaining))

  const handlePayConfirm = () => {
    if (!payTx || busy) return
    if (!payAmount || payAmount <= 0) return
    postPayments([{ id: payTx.id, amount: Math.min(payAmount, payRemaining) }])
  }

  const quickChip = (ratio: number) => {
    if (!payTx) return
    setPayInput(String(Math.round(payRemaining * ratio)))
  }

  if (unpaidTx.length === 0) return null

  const pillLabel = isMobile ? `${unpaidTx.length}` : `${unpaidTx.length} unpaid • ${fmt(totalRemaining)}`

  const checkboxStyle = (checked: boolean): React.CSSProperties => ({
    width: '18px', height: '18px', borderRadius: '5px', flexShrink: 0, cursor: 'pointer',
    border: checked ? `2px solid ${ACCENT}` : '2px solid #cbd5e1',
    background: checked ? ACCENT : '#fff', color: '#fff',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    appearance: 'none' as any, margin: 0, padding: 0,
  })

  return (
    <>
      {/* PILL di topnav */}
      <button
        onClick={() => setOpen(true)}
        title={`${unpaidTx.length} unpaid expenses • ${fmt(totalRemaining)} remaining`}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: 'rgba(255,255,255,.13)',
          border: '1px solid rgba(255,255,255,.22)',
          borderRadius: '999px', padding: isMobile ? '4px 8px' : '4px 10px',
          fontSize: '11.5px', fontWeight: 750, color: '#fff',
          cursor: 'pointer',
          maxWidth: isMobile ? '68px' : '240px',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}
      >
        <span style={{
          width: '7px', height: '7px', borderRadius: '50%',
          background: '#fbbf24', flexShrink: 0,
          animation: 'pulse 1.6s infinite',
        }} />
        {pillLabel}
      </button>

      {/* MODAL */}
      {open && (
        <div
          onClick={e => e.target === e.currentTarget && setOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
            zIndex: 800, display: 'flex', alignItems: 'center',
            justifyContent: 'center', padding: '20px',
          }}
        >
          <div style={{
            background: '#fff', borderRadius: '12px', width: '100%',
            maxWidth: '520px', overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,.2)',
            display: 'flex', flexDirection: 'column', maxHeight: '86vh',
          }}>
            {/* Head */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid #e3e7ee', flexShrink: 0 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '15px', fontWeight: 800, color: '#111827' }}>
                  <AppIcon name="warning" size={16} />Unpaid Expenses
                </div>
                <div style={{ marginTop: '2px', fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>
                  {unpaidTx.length} records · <span style={{ color: '#92400e', fontWeight: 800 }}>{fmt(totalRemaining)}</span> remaining
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Sort */}
                <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '2px' }}>
                  {(['oldest', 'largest'] as SortMode[]).map(m => (
                    <button key={m} onClick={() => setSortMode(m)}
                      style={{
                        border: 'none', borderRadius: '6px', padding: '4px 9px', fontSize: '11px',
                        fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize',
                        background: sortMode === m ? '#fff' : 'transparent',
                        color: sortMode === m ? '#111827' : '#64748b',
                        boxShadow: sortMode === m ? '0 1px 2px rgba(0,0,0,.08)' : 'none',
                      }}>
                      {m}
                    </button>
                  ))}
                </div>
                <button aria-label="Close" onClick={() => setOpen(false)}
                  style={{ width: '28px', height: '28px', border: 'none', background: '#f7f8fa', borderRadius: '6px', cursor: 'pointer', color: '#4b5563', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AppIcon name="close" size={16} />
                </button>
              </div>
            </div>

            {/* Select-all bar */}
            <button onClick={toggleSelectAll}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 18px', border: 'none', borderBottom: '1px solid #f1f5f9', background: '#fff', cursor: 'pointer', flexShrink: 0 }}>
              <input type="checkbox" checked={allSelected} readOnly style={checkboxStyle(allSelected)} />
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                {allSelected ? 'Deselect all' : 'Select all'}
              </span>
            </button>

            {/* Body */}
            <div style={{ padding: '4px 18px', overflowY: 'auto', flex: 1 }}>
              {sorted.map(t => {
                const total = Number(t.amt || 0)
                const paid = paidOf(t)
                const remaining = remainingOf(t)
                const pct = total > 0 ? Math.min(100, (paid / total) * 100) : 0
                const checked = selected.has(t.id)
                const paying = payId === t.id
                return (
                  <div key={t.id} style={{ padding: '10px 0', borderBottom: '1px solid #f1f4f8' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <input type="checkbox" checked={checked} onChange={() => toggleSelect(t.id)}
                        aria-label={`Select ${t.note}`} style={{ ...checkboxStyle(checked), marginTop: '2px' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {t.note}
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: '#92400e', fontFamily: 'var(--font-mono), monospace', whiteSpace: 'nowrap' }}>
                            {fmt(remaining)}
                          </div>
                        </div>
                        <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '1px' }}>
                          {t.date} {MONTH_NAMES[t.month]} {t.year} · {t.cat || '—'} · total {fmt(total)}
                        </div>
                        {/* Progress */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                          <div style={{ flex: 1, height: '5px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ height: '5px', background: ACCENT, borderRadius: '3px', width: `${pct}%`, transition: 'width .25s' }} />
                          </div>
                          <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {paid > 0 ? `paid ${fmt(paid)}` : 'unpaid'}
                          </div>
                        </div>
                        {/* Pay panel */}
                        {paying ? (
                          <div style={{ marginTop: '8px', background: '#f8fafc', border: '1px solid #e3e7ee', borderRadius: '8px', padding: '10px' }}>
                            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                              <input
                                value={payInput ? fmtNum(Number(digitsOnly(payInput))) : ''}
                                onChange={e => setPayInput(digitsOnly(e.target.value))}
                                placeholder="Amount Rp"
                                inputMode="numeric"
                                autoFocus
                                style={{
                                  flex: 1, minWidth: 0, padding: '7px 10px', fontSize: '13px',
                                  border: '1.5px solid #cbd5e1', borderRadius: '8px', outline: 'none',
                                  fontFamily: 'var(--font-mono), monospace', fontWeight: 700, color: '#111827',
                                }}
                              />
                            </div>
                            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                              {[0.25, 0.5, 0.75].map(r => (
                                <button key={r} onClick={() => quickChip(r)}
                                  style={{ border: '1px solid #e3e7ee', background: '#fff', borderRadius: '999px', padding: '4px 10px', fontSize: '11px', fontWeight: 700, color: '#475569', cursor: 'pointer' }}>
                                  {Math.round(r * 100)}%
                                </button>
                              ))}
                              <button onClick={() => quickChip(1)}
                                style={{ border: '1px solid #cfe7d8', background: '#eef7f1', borderRadius: '999px', padding: '4px 10px', fontSize: '11px', fontWeight: 700, color: ACCENT, cursor: 'pointer' }}>
                                Full
                              </button>
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>
                              Remaining after payment: <strong style={{ color: '#111827', fontFamily: 'var(--font-mono), monospace' }}>{fmt(payAfter)}</strong>
                            </div>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <button onClick={() => { setPayId(null); setPayInput('') }}
                                style={{ padding: '7px 14px', border: '1px solid #e3e7ee', borderRadius: '8px', background: '#fff', fontSize: '12px', fontWeight: 700, color: '#475569', cursor: 'pointer' }}>
                                Cancel
                              </button>
                              <button onClick={handlePayConfirm} disabled={busy || !payAmount}
                                style={{
                                  padding: '7px 16px', border: 'none', borderRadius: '8px',
                                  background: busy || !payAmount ? '#cbd5e1' : ACCENT,
                                  fontSize: '12px', fontWeight: 800, color: '#fff',
                                  cursor: busy || !payAmount ? 'not-allowed' : 'pointer',
                                }}>
                                {busy ? 'Saving…' : 'Confirm payment'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ marginTop: '6px' }}>
                            <button onClick={() => openPay(t.id)}
                              style={{ border: '1px solid #fde68a', background: '#fffbeb', borderRadius: '8px', padding: '5px 12px', fontSize: '11.5px', fontWeight: 700, color: '#92400e', cursor: 'pointer' }}>
                              Pay
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Footer */}
            <div style={{
              padding: '12px 18px', borderTop: '1px solid #e3e7ee', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
              background: selectedList.length > 0 ? '#eef7f1' : '#fff',
            }}>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: selectedList.length > 0 ? ACCENT : '#94a3b8' }}>
                {selectedList.length > 0
                  ? `${selectedList.length} selected · ${fmt(selectedTotal)}`
                  : 'Select items to settle in batch'}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setOpen(false)}
                  style={{ padding: '8px 16px', border: '1px solid #e3e7ee', borderRadius: '8px', background: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', color: '#4b5563' }}>
                  Close
                </button>
                <button onClick={handleBatchSettle} disabled={selectedList.length === 0 || busy}
                  style={{
                    padding: '8px 18px', border: 'none', borderRadius: '8px',
                    background: selectedList.length === 0 || busy ? '#cbd5e1' : ACCENT,
                    fontSize: '13px', fontWeight: 800, color: '#fff',
                    cursor: selectedList.length === 0 || busy ? 'not-allowed' : 'pointer',
                  }}>
                  {busy ? 'Saving…' : 'Mark as paid'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
    </>
  )
}
