'use client'

import { useState } from 'react'
import { useSavings, calcGoal } from '@/hooks/useSavings'
import GoalCard  from '@/components/savings/GoalCard'
import GoalModal from '@/components/savings/GoalModal'
import { SummaryCard, TopupModal, WithdrawModal } from '@/components/savings/SavingsModals'
import type { SavingsGoal } from '@/types/savings'

type TabKey = 'active' | 'pending' | 'complete' | 'archived'

const TABS: { key: TabKey; label: string }[] = [
  { key:'active',   label:'Active'   },
  { key:'pending',  label:'Pending'  },
  { key:'complete', label:'Complete' },
  { key:'archived', label:'Archived' },
]

/* ─── TOPUP MODAL ─── */


/* ─── WITHDRAW MODAL ─── */


/* ─── SUMMARY CARD ─── */


/* ─── MAIN PAGE ─── */
export default function TabunganPage() {
  const { goals, loaded, summary, addGoal, updateGoal, deleteGoal, topupGoal, withdrawGoal, changeStatus } = useSavings()
  const [tab,        setTab]        = useState<TabKey>('active')
  const [editGoal,   setEditGoal]   = useState<SavingsGoal | null>(null)
  const [showNew,    setShowNew]    = useState(false)
  const [topupId,    setTopupId]    = useState<string | null>(null)
  const [withdrawId, setWithdrawId] = useState<string | null>(null)

  const filtered     = goals.filter(g => g.status === tab)
  const topupGoalObj = topupId    ? goals.find(g => g.id === topupId)    ?? null : null
  const wdGoalObj    = withdrawId ? goals.find(g => g.id === withdrawId) ?? null : null

  if (!loaded) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', color:'#9ca3af', fontSize:'13px' }}>
      ⏳ Memuat...
    </div>
  )

  return (
    <div>
      {/* HEADER */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'18px', gap:'12px', flexWrap:'wrap' as const }}>
        <div>
          <h1 style={{ fontSize:'19px', fontWeight:700, letterSpacing:'-.3px', marginBottom:'2px' }}>Smart Saving</h1>
          <p style={{ fontSize:'12px', color:'#9ca3af' }}>Perencanaan tabungan goal-based · Rekomendasi otomatis</p>
        </div>
        <button onClick={() => setShowNew(true)}
          style={{ padding:'7px 14px', background:'#1a5c42', color:'#fff', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
          + Tambah Goal
        </button>
      </div>

      {/* SUMMARY */}
      <SummaryCard summary={summary} />

      {/* TABS */}
      <div style={{ display:'flex', gap:'3px', background:'#ece9e2', padding:'3px', borderRadius:'9px', marginBottom:'16px', width:'fit-content', flexWrap:'wrap' as const }}>
        {TABS.map(t => {
          const count = goals.filter(g => g.status === t.key).length
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ fontSize:'12px', fontWeight: tab===t.key?700:500, padding:'5px 13px', borderRadius:'7px', border:'none', cursor:'pointer', whiteSpace:'nowrap' as const,
                background: tab===t.key?'#fff':'none', color: tab===t.key?'#111827':'#78716c',
                boxShadow: tab===t.key?'0 1px 4px rgba(0,0,0,.1)':'none', transition:'all .15s' }}>
              {t.label}{count > 0 ? ` (${count})` : ''}
            </button>
          )
        })}
      </div>

      {/* GOAL LIST */}
      {filtered.length === 0 ? (
        <div style={{ textAlign:'center' as const, padding:'48px 16px', color:'#9ca3af' }}>
          <div style={{ fontSize:'13px', fontWeight:500, color:'#4b5563', marginBottom:'6px' }}>Belum ada goal di kategori ini</div>
          {tab === 'active' && (
            <button onClick={() => setShowNew(true)}
              style={{ marginTop:'8px', padding:'7px 16px', background:'#1a5c42', color:'#fff', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>
              + Tambah Goal Pertama
            </button>
          )}
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column' as const, gap:'8px' }}>
          {filtered.map(g => (
            <GoalCard
              key={g.id}
              goal={g}
              calc={calcGoal(g)}
              onEdit={setEditGoal}
              onTopup={setTopupId}
              onWithdraw={setWithdrawId}
              onStatus={changeStatus}
              onDelete={deleteGoal}
            />
          ))}
        </div>
      )}

      {/* MODALS */}
      {showNew && (
        <GoalModal goal={null}
          onSave={data => { addGoal(data); setShowNew(false) }}
          onClose={() => setShowNew(false)} />
      )}
      {editGoal && (
        <GoalModal goal={editGoal}
          onSave={data => { updateGoal(editGoal.id, data); setEditGoal(null) }}
          onClose={() => setEditGoal(null)} />
      )}
      {topupGoalObj && (
        <TopupModal goal={topupGoalObj}
          onConfirm={(amt, note) => { topupGoal(topupGoalObj.id, amt, note); setTopupId(null) }}
          onClose={() => setTopupId(null)} />
      )}
      {wdGoalObj && (
        <WithdrawModal goal={wdGoalObj}
          onConfirm={(amt, note) => { withdrawGoal(wdGoalObj.id, amt, note); setWithdrawId(null) }}
          onClose={() => setWithdrawId(null)} />
      )}
    </div>
  )
}
