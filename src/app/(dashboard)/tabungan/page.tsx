'use client'

import { useState } from 'react'
import { useSavings, calcGoal } from '@/hooks/useSavings'
import GoalCard  from '@/components/savings/GoalCard'
import GoalModal from '@/components/savings/GoalModal'
import { SummaryCard, TopupModal, WithdrawModal } from '@/components/savings/SavingsModals'
import { AppButton, EmptyState, PageHeader } from '@/components/ui/design'
import type { SavingsGoal } from '@/types/savings'

type TabKey = 'active' | 'pending' | 'complete' | 'archived'

const TABS: { key: TabKey; label: string }[] = [
  { key:'active',   label:'Active'   },
  { key:'pending',  label:'Pending'  },
  { key:'complete', label:'Complete' },
  { key:'archived', label:'Archived' },
]

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
      ⏳ Memuat Smart Saving...
    </div>
  )

  return (
    <div className="savings-page">
      <PageHeader
        title="Smart Saving"
        subtitle="Perencanaan tabungan goal-based · Rekomendasi otomatis"
        action={<AppButton onClick={() => setShowNew(true)}>+ Tambah Tabungan</AppButton>}
      />

      <SummaryCard summary={summary} />

      <div className="savings-tabs-row">
        <div className="savings-tabs">
          {TABS.map(t => {
            const count = goals.filter(g => g.status === t.key).length
            return (
              <button key={t.key} onClick={() => setTab(t.key)} className={`savings-tab-btn ${tab===t.key ? 'active' : ''}`}>
                {t.label}<span className="savings-tab-count">{count > 0 ? ` (${count})` : ''}</span>
              </button>
            )
          })}
        </div>
        <div className="savings-tabs-action">
          <AppButton variant="secondary" onClick={() => setShowNew(true)}>+ Goal Baru</AppButton>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="🏦"
          title="Belum ada goal di kategori ini"
          action={tab === 'active' ? <AppButton onClick={() => setShowNew(true)}>+ Tambah Goal Pertama</AppButton> : undefined}
        >
          Goal tabungan akan muncul di sini sesuai status yang dipilih.
        </EmptyState>
      ) : (
        <div className="savings-goal-list">
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
