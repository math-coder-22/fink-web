'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Transaction } from '@/types/database'

const MONTH_NAMES: Record<string, string> = {
  jan:'Jan', feb:'Feb', mar:'Mar', apr:'Apr',
  may:'Mei', jun:'Jun', jul:'Jul', aug:'Ags',
  sep:'Sep', oct:'Okt', nov:'Nov', dec:'Des',
}

const fmt = (n: number) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID')

export default function HutangNotif({ isMobile = false }: { isMobile?: boolean }) {
  const [unpaidTx, setUnpaidTx]    = useState<Transaction[]>([])
  const [open,     setOpen]     = useState(false)
  const [partial,  setPartial]  = useState<Record<string, string>>({})
  const [saving,   setSaving]   = useState<string | null>(null)

  const load = useCallback(async () => {
    const res  = await fetch('/api/hutang')
    const json = await res.json()
    setUnpaidTx(json.data || [])
  }, [])

  useEffect(() => { load() }, [load])

  // Refresh setiap 30 detik agar sync jika ada perubahan dari halaman lain
  useEffect(() => {
    const id = setInterval(load, 30000)
    return () => clearInterval(id)
  }, [load])

  // Refresh saat ada transaksi baru/edit dari halaman Bulanan
  useEffect(() => {
    window.addEventListener('hutang-refresh', load)
    return () => window.removeEventListener('hutang-refresh', load)
  }, [load])

  async function settleUnpaid(id: string, full: boolean) {
    setSaving(id)
    const unpaid = unpaidTx.find(d => d.id === id)
    if (!unpaid) return

    let updates: Partial<Transaction>

    if (full) {
      updates = { settled: true }
    } else {
      const partialAmt = parseFloat((partial[id] || '0').replace(/\./g, '')) || 0
      if (!partialAmt || partialAmt <= 0) {
        alert('Masukkan nominal pelunasan!')
        setSaving(null)
        return
      }
      if (partialAmt >= unpaid.amt) {
        updates = { settled: true }
      } else {
        updates = { amt: unpaid.amt - partialAmt }
      }
    }

    await fetch('/api/transaksi', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    })

    setPartial(p => { const n = { ...p }; delete n[id]; return n })
    await load()
    setSaving(null)
  }

  if (unpaidTx.length === 0) return null

  return (
    <>
      {/* PILL di topnav */}
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: 'rgba(255,255,255,.15)',
          border: '1px solid rgba(255,255,255,.25)',
          borderRadius: '20px', padding: '4px 12px',
          fontSize: '12px', fontWeight: 600, color: '#fff',
          cursor: 'pointer',
        }}
      >
        <span style={{
          width: '7px', height: '7px', borderRadius: '50%',
          background: '#fbbf24', flexShrink: 0,
          animation: 'pulse 1.6s infinite',
        }} />
        {isMobile ? unpaidTx.length : `${unpaidTx.length} unpaid expense${unpaidTx.length > 1 ? 's' : ''}`}
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
            maxWidth: '460px', overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,.2)',
          }}>
            {/* Head */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #e3e7ee' }}>
              <div style={{ fontSize: '15px', fontWeight: 700 }}>⚠️ Unpaid Expenses</div>
              <button onClick={() => setOpen(false)} style={{ width: '28px', height: '28px', border: 'none', background: '#f7f8fa', borderRadius: '6px', fontSize: '16px', cursor: 'pointer', color: '#4b5563' }}>×</button>
            </div>

            {/* Body */}
            <div style={{ padding: '16px 20px', maxHeight: '60vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {unpaidTx.length === 0 && (
                <div style={{ textAlign: 'center', padding: '32px', color: '#9ca3af' }}>
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>✅</div>
                  No unpaid expenses!
                </div>
              )}
              {unpaidTx.map(d => (
                <div key={d.id} style={{ background: '#f7f8fa', border: '1px solid #e3e7ee', borderRadius: '8px', padding: '12px 14px' }}>
                  {/* Info baris */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>{d.note}</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#92400e', fontFamily: 'var(--font-mono), monospace' }}>{fmt(d.amt)}</div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '10px' }}>
                    {d.date} {MONTH_NAMES[d.month]} {d.year} · {d.cat || '—'}
                  </div>

                  {/* Tombol lunas semua */}
                  <button
                    disabled={saving === d.id}
                    onClick={() => settleUnpaid(d.id, true)}
                    style={{ width: '100%', padding: '7px', borderRadius: '6px', border: 'none', background: saving === d.id ? '#9ca3af' : '#d1eadd', color: '#1a5c42', fontSize: '12.5px', fontWeight: 600, cursor: saving === d.id ? 'not-allowed' : 'pointer', marginBottom: '8px' }}
                  >
                    {saving === d.id ? 'Saving...' : '✓ Mark as Settled'}
                  </button>

                  {/* Bayar sebagian */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="number"
                      placeholder="Partial amount (Rp)"
                      value={partial[d.id] || ''}
                      onChange={e => setPartial(p => ({ ...p, [d.id]: e.target.value }))}
                      style={{ flex: 1, padding: '6px 9px', fontSize: '12.5px', border: '1.5px solid #e3e7ee', borderRadius: '6px', background: '#fff', outline: 'none', fontFamily: 'var(--font-mono), monospace' }}
                    />
                    <button
                      disabled={saving === d.id}
                      onClick={() => settleUnpaid(d.id, false)}
                      style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 600, background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', borderRadius: '6px', cursor: saving === d.id ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
                    >
                      Pay Partial
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid #e3e7ee', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setOpen(false)} style={{ padding: '7px 16px', border: '1px solid #e3e7ee', borderRadius: '6px', background: 'transparent', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: '#4b5563' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
    </>
  )
}
