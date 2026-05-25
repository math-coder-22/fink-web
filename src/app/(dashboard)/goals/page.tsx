"use client";

import { useCallback, useMemo, useState } from "react";
import { useSavings, calcGoal } from "@/hooks/useSavings";
import GoalCard from "@/components/savings/GoalCard";
import GoalModal from "@/components/savings/GoalModal";
import {
  SummaryCard,
  TopupModal,
  WithdrawModal,
  ReconcileModal,
} from "@/components/savings/SavingsModals";
import { AppButton, EmptyState, PageHeader, AppIcon } from "@/components/ui/design";
import { useSubscription } from "@/hooks/useSubscription";
import { FREE_PLAN_LIMITS, upgradeMessage } from "@/lib/subscription/limits";
import type { SavingsGoal } from "@/types/savings";
import { buildGoalAdvisorItem, sortGoalsByAdvisor } from "@/lib/finance/goals";

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

  const tabCounts = useMemo(() => {
    return goals.reduce<Record<TabKey, number>>((acc, goal) => {
      acc[goal.status] = (acc[goal.status] || 0) + 1;
      return acc;
    }, { active: 0, pending: 0, complete: 0, archived: 0 });
  }, [goals]);

  const { sortedGoals, focusGoals, priorityGoals, longTermGoals, otherGoals } = useMemo(() => {
    const filtered = goals.filter((g) => g.status === tab);
    const sorted = sortGoalsByAdvisor(filtered, calcGoal);
    const advisorCache = new Map<string, ReturnType<typeof buildGoalAdvisorItem>>();
    const goalAdvisor = (g: SavingsGoal) => {
      const cached = advisorCache.get(g.id);
      if (cached) return cached;
      const advisor = buildGoalAdvisorItem(g, calcGoal(g), goals);
      advisorCache.set(g.id, advisor);
      return advisor;
    };

    const focus = sorted.filter((g) => g.focus && g.status === tab);
    const regular = sorted.filter((g) => !g.focus);
    const priority = tab === "active"
      ? regular.filter((g) => {
          const a = goalAdvisor(g);
          return a.priority === "critical" || a.priority === "high";
        })
      : [];
    const priorityIds = new Set(priority.map((g) => g.id));
    const longTerm = tab === "active"
      ? regular.filter((g) => {
          const a = goalAdvisor(g);
          return !priorityIds.has(g.id) && (
            g.type === "pensiun" ||
            g.type === "investasi" ||
            g.type === "darurat_lanjutan" ||
            a.priority === "low" ||
            a.priority === "maintain"
          );
        })
      : [];
    const longTermIds = new Set(longTerm.map((g) => g.id));
    const other = tab === "active"
      ? regular.filter((g) => !priorityIds.has(g.id) && !longTermIds.has(g.id))
      : regular;

    return { sortedGoals: sorted, focusGoals: focus, priorityGoals: priority, longTermGoals: longTerm, otherGoals: other };
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
      onEdit={setEditGoal}
      onTopup={setTopupId}
      onWithdraw={setWithdrawId}
      onReconcile={setReconcileId}
      onStatus={changeStatus}
      onDelete={deleteGoal}
      allGoals={goals}
    />
  ), [calcById, changeStatus, deleteGoal, goals]);

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
        subtitle="Goal-based planning with auto priority, focus goals, and Advisor recommendations"
        action={
          <AppButton onClick={openNewGoal}>
            + Add Goal
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
            title="Focus Goals"
            subtitle="Your 1–3 main planning priorities. These goals are surfaced in Advisor first."
            items={focusGoals}
            tone="focus"
          />
          <GoalSection
            title="Priority Goals"
            subtitle="Auto-prioritized by FiNK because they are urgent, foundational, or behind schedule."
            items={priorityGoals}
            tone="priority"
          />
          <GoalSection
            title="Active Goals"
            subtitle="Goals that are still active but not currently marked as focus or high priority."
            items={otherGoals}
            tone="neutral"
          />
          <GoalSection
            title="Long-Term / Maintain"
            subtitle="Background goals that should continue steadily without taking over your monthly focus."
            items={longTermGoals}
            tone="muted"
          />
        </>
      ) : (
        <div className="savings-goal-list">{otherGoals.map(renderGoal)}</div>
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
