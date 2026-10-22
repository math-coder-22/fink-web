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
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useSubscription } from "@/hooks/useSubscription";
import { FREE_PLAN_LIMITS } from "@/lib/subscription/limits";
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
    retagParent,
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

  // Wallet view: actual money movement this month, computed from goal
  // histories (topups in, withdrawals out) — no allocation plan.
  const { monthIn, monthOut, monthNetById } = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    let tin = 0;
    let tout = 0;
    const byId = new Map<string, number>();
    goals.forEach((g) => {
      let net = 0;
      (g.history || []).forEach((tx) => {
        const d = new Date(tx.date);
        if (d.getFullYear() === y && d.getMonth() === m) {
          if (tx.type === "topup") { net += tx.amount; tin += tx.amount; }
          else { net -= tx.amount; tout += tx.amount; }
        }
      });
      byId.set(g.id, net);
    });
    return { monthIn: tin, monthOut: tout, monthNetById: byId };
  }, [goals]);

  const parentNames = useMemo(
    () => [...new Set(goals.map((g) => (g.parent || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [goals],
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

  const sortedGoals = useMemo(() => {
    const filtered = goals.filter((g) =>
      tab === "active" ? g.status === "active" || g.status === "pending" : g.status === tab,
    );
    return sortGoalsByAdvisor(filtered, calcGoal);
  }, [goals, tab]);

  // Group the visible savings by parent (account/category); Uncategorized last.
  const groups = useMemo(() => {
    const map = new Map<string, SavingsGoal[]>();
    sortedGoals.forEach((g) => {
      const key = (g.parent || "").trim();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(g);
    });
    return [...map.entries()].sort((a, b) =>
      a[0] === "" ? 1 : b[0] === "" ? -1 : a[0].localeCompare(b[0]),
    );
  }, [sortedGoals]);

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const toggleGroup = useCallback((name: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

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
      monthNet={monthNetById.get(goal.id) ?? null}
      onEdit={setEditGoal}
      onTopup={(id) => { setTopupId(id); setTopupPreset(null); }}
      onQuickDeposit={(id, amount) => { setTopupId(id); setTopupPreset(amount); }}
      onWithdraw={setWithdrawId}
      onReconcile={setReconcileId}
      onStatus={changeStatus}
      onDelete={deleteGoal}
      allGoals={goals}
    />
  ), [calcById, monthNetById, changeStatus, deleteGoal, goals]);

  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteParentName, setDeleteParentName] = useState<string | null>(null);
  const [groupMenu, setGroupMenu] = useState<string | null>(null);

  function ParentGroup({ name, items }: { name: string; items: SavingsGoal[] }) {
    const total = items.reduce((a, g) => a + (g.current || 0), 0);
    const collapsed = collapsedGroups.has(name);
    const display = name || "Uncategorized";
    return (
      <section style={{ marginBottom: "18px" }}>
        <div className="wallet-group-head">
          <button className="wallet-group-title" onClick={() => toggleGroup(name)}>
            <span className="wallet-group-chevron">{collapsed ? "\u25B8" : "\u25BE"}</span>
            {display}
            <span className="wallet-group-count">({items.length})</span>
          </button>
          <div className="wallet-group-right">
            <span className="wallet-group-total">{"Rp " + Math.round(total).toLocaleString("id-ID")}</span>
            {name && (
              <div className="wallet-group-menu-wrap">
                <button
                  className="wallet-group-kebab"
                  aria-label={`Actions for ${display}`}
                  onClick={() => setGroupMenu(groupMenu === name ? null : name)}
                >
                  \u22EE
                </button>
                {groupMenu === name && (
                  <>
                    <div className="wallet-group-menu-backdrop" onClick={() => setGroupMenu(null)} />
                    <div className="wallet-group-menu">
                      <button onClick={() => { setGroupMenu(null); setRenameTarget(name); setRenameValue(name); }}>
                        Rename category
                      </button>
                      <button className="danger" onClick={() => { setGroupMenu(null); setDeleteParentName(name); }}>
                        Delete category
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        {!collapsed && <div className="savings-goal-list">{items.map(renderGoal)}</div>}
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
        title="Wallets"
        subtitle="Your savings, organized by account — balances first, targets optional"
      />

      {error && (
        <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'14px', padding:'12px 14px', marginBottom:'14px', color:'#991b1b', fontSize:'12px', fontWeight:600, lineHeight:1.5 }}>
          Wallets error: {error}<br />
          Make sure <b>savings_goals_schema.sql</b> has been run in Supabase.
        </div>
      )}

      <SummaryCard summary={summary} monthIn={monthIn} monthOut={monthOut} />


      {!isPremium && (
        <div style={{ background:'#fff7ed', border:'1px solid #fed7aa', borderRadius:'14px', padding:'12px 14px', marginBottom:'14px', color:'#9a3412', fontSize:'12px', fontWeight:600 }}>
          Free plan: up to {FREE_PLAN_LIMITS.savingGoals} savings. Currently: {goals.length}/{FREE_PLAN_LIMITS.savingGoals}.
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
            + New Saving
          </AppButton>
        </div>
      </div>

      
      {sortedGoals.length === 0 ? (
        <EmptyState
          icon={<AppIcon name="saving" size={24} />}
          title="No savings in this category yet"
          action={
            tab === "active" ? (
              <AppButton onClick={openNewGoal}>
                + Add First Saving
              </AppButton>
            ) : undefined
          }
        >
          Your savings will appear here based on the selected status.
        </EmptyState>
      ) : (
        groups.map(([name, items]) => (
          <ParentGroup key={name || "__none"} name={name} items={items} />
        ))
      )}

      {renameTarget && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setRenameTarget(null); }}
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(17,24,39,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
        >
          <div style={{ background: "#fff", borderRadius: "14px", padding: "20px", width: "100%", maxWidth: "340px", boxShadow: "0 20px 50px rgba(0,0,0,.25)" }}>
            <div style={{ fontSize: "15px", fontWeight: 800, color: "#111827", marginBottom: "10px" }}>Rename category</div>
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #e4e1d9", borderRadius: "8px", fontSize: "14px", fontFamily: "inherit", outline: "none", background: "#f9fafb", color: "#111827", marginBottom: "16px" }}
            />
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setRenameTarget(null)}
                style={{ border: "1.5px solid #e3e7ee", background: "#fff", color: "#374151", fontWeight: 700, borderRadius: "9px", padding: "8px 16px", cursor: "pointer", fontFamily: "inherit", fontSize: "13px" }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const v = renameValue.trim();
                  if (v && v !== renameTarget) retagParent(renameTarget, v);
                  setRenameTarget(null);
                }}
                style={{ border: "none", background: "#1a5c42", color: "#fff", fontWeight: 700, borderRadius: "9px", padding: "8px 16px", cursor: "pointer", fontFamily: "inherit", fontSize: "13px" }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteParentName && (
        <ConfirmDialog
          title="Delete category?"
          message={<>Delete the &ldquo;{deleteParentName}&rdquo; category? Its savings move to Uncategorized — the savings themselves are not deleted.</>}
          confirmLabel="Delete"
          onConfirm={() => { retagParent(deleteParentName, null); setDeleteParentName(null); }}
          onCancel={() => setDeleteParentName(null)}
        />
      )}

      {limitNotice && (
        <ConfirmDialog
          title="Saving limit reached"
          message={<>The Free plan allows up to {FREE_PLAN_LIMITS.savingGoals} savings. Upgrade to Premium for unlimited savings.</>}
          confirmLabel="OK"
          onConfirm={() => setLimitNotice(false)}
          onCancel={() => setLimitNotice(false)}
        />
      )}

      {showNew && (
        <GoalModal
          goal={null}
          parents={parentNames}
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
          parents={parentNames}
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
