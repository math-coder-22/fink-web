"use client";

import { useState } from "react";
import { useSavings, calcGoal } from "@/hooks/useSavings";
import GoalCard from "@/components/savings/GoalCard";
import GoalModal from "@/components/savings/GoalModal";
import {
  SummaryCard,
  TopupModal,
  WithdrawModal,
  ReconcileModal,
} from "@/components/savings/SavingsModals";
import { AppButton, EmptyState, PageHeader } from "@/components/ui/design";
import { useSubscription } from "@/hooks/useSubscription";
import { FREE_PLAN_LIMITS, upgradeMessage } from "@/lib/subscription/limits";
import type { SavingsGoal } from "@/types/savings";

type TabKey = "active" | "pending" | "complete" | "archived";

const TABS: { key: TabKey; label: string }[] = [
  { key: "active", label: "Active" },
  { key: "pending", label: "Pending" },
  { key: "complete", label: "Complete" },
  { key: "archived", label: "Archived" },
];

export default function TabunganPage() {
  const {
    goals,
    loaded,
    summary,
    addGoal,
    updateGoal,
    deleteGoal,
    topupGoal,
    withdrawGoal,
    reconcileGoal,
    changeStatus,
    error,
  } = useSavings();
  const [tab, setTab] = useState<TabKey>("active");
  const [editGoal, setEditGoal] = useState<SavingsGoal | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [topupId, setTopupId] = useState<string | null>(null);
  const [withdrawId, setWithdrawId] = useState<string | null>(null);
  const [reconcileId, setReconcileId] = useState<string | null>(null);
  const { isPremium } = useSubscription();

  const filtered = goals.filter((g) => g.status === tab);
  const topupGoalObj = topupId
    ? (goals.find((g) => g.id === topupId) ?? null)
    : null;
  const wdGoalObj = withdrawId
    ? (goals.find((g) => g.id === withdrawId) ?? null)
    : null;
  const rcGoalObj = reconcileId
    ? (goals.find((g) => g.id === reconcileId) ?? null)
    : null;

  function openNewGoal() {
    if (!isPremium && goals.length >= FREE_PLAN_LIMITS.savingGoals) {
      alert(upgradeMessage(`Akun Goals Free maksimal ${FREE_PLAN_LIMITS.savingGoals}`));
      return;
    }
    setShowNew(true);
  }

  if (!loaded)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "60vh",
          color: "#9ca3af",
          fontSize: "13px",
        }}
      >
        ⏳ Memuat Goals...
      </div>
    );

  return (
    <div className="savings-page">
      <PageHeader
        title="Goals"
        subtitle="Perencanaan tabungan goal-based · Rekomendasi otomatis"
        action={
          <AppButton onClick={openNewGoal}>
            + Tambah Tabungan
          </AppButton>
        }
      />

      {error && (
        <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'14px', padding:'12px 14px', marginBottom:'14px', color:'#991b1b', fontSize:'12px', fontWeight:600, lineHeight:1.5 }}>
          Goals error: {error}<br />
          Pastikan SQL <b>savings_goals_schema.sql</b> sudah dijalankan di Supabase.
        </div>
      )}

      <SummaryCard summary={summary} />


      {!isPremium && (
        <div style={{ background:'#fff7ed', border:'1px solid #fed7aa', borderRadius:'14px', padding:'12px 14px', marginBottom:'14px', color:'#9a3412', fontSize:'12px', fontWeight:600 }}>
          Paket Free: maksimal {FREE_PLAN_LIMITS.savingGoals} akun Goals. Saat ini: {goals.length}/{FREE_PLAN_LIMITS.savingGoals}.
        </div>
      )}

      <div className="savings-tabs-row">
        <div className="savings-tabs">
          {TABS.map((t) => {
            const count = goals.filter((g) => g.status === t.key).length;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`savings-tab-btn ${tab === t.key ? "active" : ""}`}
              >
                {t.label}
                <span className="savings-tab-count">
                  {count > 0 ? ` (${count})` : ""}
                </span>
              </button>
            );
          })}
        </div>
        <div className="savings-tabs-action">
          <AppButton variant="secondary" onClick={openNewGoal}>
            + Goal Baru
          </AppButton>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="🏦"
          title="Belum ada goal di kategori ini"
          action={
            tab === "active" ? (
              <AppButton onClick={openNewGoal}>
                + Tambah Goal Pertama
              </AppButton>
            ) : undefined
          }
        >
          Goal tabungan akan muncul di sini sesuai status yang dipilih.
        </EmptyState>
      ) : (
        <div className="savings-goal-list">
          {filtered.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              calc={calcGoal(g)}
              onEdit={setEditGoal}
              onTopup={setTopupId}
              onWithdraw={setWithdrawId}
              onReconcile={setReconcileId}
              onStatus={changeStatus}
              onDelete={deleteGoal}
            />
          ))}
        </div>
      )}

      {showNew && (
        <GoalModal
          goal={null}
          onSave={(data) => {
            addGoal(data);
            setShowNew(false);
          }}
          onClose={() => setShowNew(false)}
        />
      )}
      {editGoal && (
        <GoalModal
          goal={editGoal}
          onSave={(data) => {
            updateGoal(editGoal.id, data);
            setEditGoal(null);
          }}
          onClose={() => setEditGoal(null)}
        />
      )}
      {topupGoalObj && (
        <TopupModal
          goal={topupGoalObj}
          onConfirm={(amt, note) => {
            topupGoal(topupGoalObj.id, amt, note);
            setTopupId(null);
          }}
          onClose={() => setTopupId(null)}
        />
      )}
      {wdGoalObj && (
        <WithdrawModal
          goal={wdGoalObj}
          onConfirm={(amt, note) => {
            withdrawGoal(wdGoalObj.id, amt, note);
            setWithdrawId(null);
          }}
          onClose={() => setWithdrawId(null)}
        />
      )}
      {rcGoalObj && (
        <ReconcileModal
          goal={rcGoalObj}
          onConfirm={(actual, note) => {
            reconcileGoal(rcGoalObj.id, actual, note);
            setReconcileId(null);
          }}
          onClose={() => setReconcileId(null)}
        />
      )}
    </div>
  );
}
