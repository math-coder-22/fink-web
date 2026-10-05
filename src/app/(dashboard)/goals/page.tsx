"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSavings, calcGoal } from "@/hooks/useSavings";
import GoalCard from "@/components/savings/GoalCard";
import GoalModal from "@/components/savings/GoalModal";
import {
  SummaryCard,
  TopupModal,
  WithdrawModal,
  ReconcileModal,
  type GoalPlanData,
} from "@/components/savings/SavingsModals";
import { AppButton, EmptyState, PageHeader, AppIcon } from "@/components/ui/design";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useSubscription } from "@/hooks/useSubscription";
import { FREE_PLAN_LIMITS } from "@/lib/subscription/limits";
import { MONTHS_ORDER } from "@/components/layout/DashboardShell";
import type { SavingsGoal } from "@/types/savings";
import { sortGoalsByAdvisor } from "@/lib/finance/goals";

type TabKey = "active" | "complete" | "archived";

const TABS: { key: TabKey; label: string }[] = [
  { key: "active", label: "Active" },
  { key: "complete", label: "Completed" },
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
  const [topupPreset, setTopupPreset] = useState<number | null>(null);
  const [withdrawId, setWithdrawId] = useState<string | null>(null);
  const [reconcileId, setReconcileId] = useState<string | null>(null);
  const { isPremium } = useSubscription();

  // Monthly allocation plan (income-aware): replaces the demotivating
  // "total ideal needed per month" figure with a realistic plan.
  const [planData, setPlanData] = useState<GoalPlanData | null>(null);
  useEffect(() => {
    const now = new Date();
    const mk = MONTHS_ORDER[now.getMonth()];
    fetch(`/api/advisor/summary?month=${mk}&year=${now.getFullYear()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j?.data?.goalPlan) setPlanData({ items: j.data.goalPlanItems || j.data.goalInsights || [], plan: j.data.goalPlan });
      })
      .catch(() => {});
  }, []);

  const suggestedById = useMemo(
    () => new Map((planData?.items || []).map((i) => [i.id, i.suggestedMonthly > 0 ? i.suggestedMonthly : null] as const)),
    [planData]
  );

  const tabCounts = useMemo(() => {
    const counts: Record<TabKey, number> = { active: 0, complete: 0, archived: 0 };
    goals.forEach((goal) => {
      if (goal.status === "complete") counts.complete += 1;
      else if (goal.status === "archived") counts.archived += 1;
      else counts.active += 1; // legacy "pending" goals still show under Active
    });
    return counts;
  }, [goals]);

  const { sortedGoals, focusGoals, restGoals } = useMemo(() => {
    const filtered = goals.filter((g) =>
      tab === "active" ? g.status === "active" || g.status === "pending" : g.status === tab,
    );
    const sorted = sortGoalsByAdvisor(filtered, calcGoal);
    const focus = sorted.filter((g) => g.focus);
    const rest = sorted.filter((g) => !g.focus);
    return { sortedGoals: sorted, focusGoals: focus, restGoals: rest };
  }, [goals, tab]);

  const calcById = useMemo(() => new Map(goals.map((g) => [g.id, calcGoal(g)])), [goals]);
  const goalsById = useMemo(() => new Map(goals.map((g) => [g.id, g])), [goals]);
  const topupGoalObj = topupId ? (goalsById.get(topupId) ?? null) : null;
  const wdGoalObj = withdrawId ? (goalsById.get(withdrawId) ?? null) : null;
  const rcGoalObj = reconcileId ? (goalsById.get(reconcileId) ?? null) : null;


  const renderGoal = useCallback((goal: SavingsGoal) => (
    <GoalCard
      key={goal.id}
      goal={goal}
      calc={calcById.get(goal.id) ?? calcGoal(goal)}
      suggestedMonthly={suggestedById.get(goal.id) ?? null}
      onEdit={setEditGoal}
      onTopup={(id) => { setTopupId(id); setTopupPreset(null); }}
      onQuickDeposit={(id, amount) => { setTopupId(id); setTopupPreset(amount); }}
      onWithdraw={setWithdrawId}
      onReconcile={setReconcileId}
      onStatus={changeStatus}
      onDelete={deleteGoal}
      allGoals={goals}
    />
  ), [calcById, suggestedById, changeStatus, deleteGoal, goals]);

  function GoalSection({
    title,
    subtitle,
    items,
    tone = "neutral",
  }: {
    title: string;
    subtitle?: string;
    items: SavingsGoal[];
    tone?: "focus" | "priority" | "neutral" | "muted";
  }) {
    if (items.length === 0) return null;
    const colors = {
      focus: { bg: "#f0fdf4", border: "#bbf7d0", color: "#166534" },
      priority: { bg: "#fff7ed", border: "#fed7aa", color: "#9a3412" },
      neutral: { bg: "#f8fafc", border: "#e2e8f0", color: "#475569" },
      muted: { bg: "#fafaf9", border: "#e7e5e4", color: "#78716c" },
    }[tone];

    return (
      <section style={{ marginBottom: "18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: "10px" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: colors.bg, border: `1px solid ${colors.border}`, color: colors.color, borderRadius: 999, padding: "5px 10px", fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".45px" }}>
              {title}
              <span style={{ opacity: .72 }}>({items.length})</span>
            </div>
            {subtitle && (
              <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 6, lineHeight: 1.45 }}>
                {subtitle}
              </div>
            )}
          </div>
        </div>
        <div className="savings-goal-list">{items.map(renderGoal)}</div>
      </section>
    );
  }

  const [limitNotice, setLimitNotice] = useState(false);
  function openNewGoal() {
    if (!isPremium && goals.length >= FREE_PLAN_LIMITS.savingGoals) {
      setLimitNotice(true);
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
        ⏳ Loading goals...
      </div>
    );

  return (
    <div className="savings-page">
      <PageHeader
        title="Goals"
        subtitle="Goal-based planning with auto priority, focus goals, and Advisor recommendations"
      />

      {error && (
        <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'14px', padding:'12px 14px', marginBottom:'14px', color:'#991b1b', fontSize:'12px', fontWeight:600, lineHeight:1.5 }}>
          Goals error: {error}<br />
          Make sure <b>savings_goals_schema.sql</b> has been run in Supabase.
        </div>
      )}

      <SummaryCard summary={summary} plan={planData} />


      {!isPremium && (
        <div style={{ background:'#fff7ed', border:'1px solid #fed7aa', borderRadius:'14px', padding:'12px 14px', marginBottom:'14px', color:'#9a3412', fontSize:'12px', fontWeight:600 }}>
          Paket Free: maksimal {FREE_PLAN_LIMITS.savingGoals} akun Goals. Saat ini: {goals.length}/{FREE_PLAN_LIMITS.savingGoals}.
        </div>
      )}

      <div className="savings-tabs-row">
        <div className="savings-tabs">
          {TABS.map((t) => {
            const count = tabCounts[t.key];
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
            + New Goal
          </AppButton>
        </div>
      </div>

      
      {sortedGoals.length === 0 ? (
        <EmptyState
          icon={<AppIcon name="saving" size={24} />}
          title="No goals in this category yet"
          action={
            tab === "active" ? (
              <AppButton onClick={openNewGoal}>
                + Add First Goal
              </AppButton>
            ) : undefined
          }
        >
          Your goals will appear here based on the selected status.
        </EmptyState>
      ) : tab === "active" ? (
        <>
          <GoalSection
            title="Focus"
            subtitle="Your main planning priorities this period."
            items={focusGoals}
            tone="focus"
          />
          <GoalSection
            title="All Goals"
            subtitle="Sorted automatically by priority — most urgent first."
            items={restGoals}
            tone="neutral"
          />
        </>
      ) : (
        <div className="savings-goal-list">{restGoals.map(renderGoal)}</div>
      )}

      {limitNotice && (
        <ConfirmDialog
          title="Goal limit reached"
          message={<>The Free plan allows up to {FREE_PLAN_LIMITS.savingGoals} goals. Upgrade to Premium for unlimited goals.</>}
          confirmLabel="OK"
          onConfirm={() => setLimitNotice(false)}
          onCancel={() => setLimitNotice(false)}
        />
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
          initialAmount={topupPreset ?? undefined}
          onConfirm={(amt, note) => {
            topupGoal(topupGoalObj.id, amt, note);
            setTopupId(null);
            setTopupPreset(null);
          }}
          onClose={() => { setTopupId(null); setTopupPreset(null); }}
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
