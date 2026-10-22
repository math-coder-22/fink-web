"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSavings, calcGoal } from "@/hooks/useSavings";
import GoalCard from "@/components/savings/GoalCard";
import GoalModal from "@/components/savings/GoalModal";
import {
  TopupModal,
  WithdrawModal,
  ReconcileModal,
} from "@/components/savings/SavingsModals";
import { AppButton, EmptyState, PageHeader, AppIcon } from "@/components/ui/design";
import WealthChart from "@/components/savings/WealthChart";
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
  const [view, setView] = useState<"list" | "card">("list");
  useEffect(() => {
    try {
      const v = localStorage.getItem("fink-wallets-view");
      if (v === "card" || v === "list") setView(v);
    } catch {}
  }, []);
  const changeView = useCallback((v: "list" | "card") => {
    setView(v);
    try { localStorage.setItem("fink-wallets-view", v); } catch {}
  }, []);
  const [editGoal, setEditGoal] = useState<SavingsGoal | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [topupId, setTopupId] = useState<string | null>(null);
  const [topupPreset, setTopupPreset] = useState<number | null>(null);
  const [withdrawId, setWithdrawId] = useState<string | null>(null);
  const [reconcileId, setReconcileId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<{ text: string; tab?: TabKey } | null>(null);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 9000);
    return () => clearTimeout(t);
  }, [notice]);
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
      let gin = 0;
      let gout = 0;
      (g.history || []).forEach((tx) => {
        const d = new Date(tx.date);
        if (d.getFullYear() === y && d.getMonth() === m) {
          if (tx.type === "topup") { net += tx.amount; gin += tx.amount; }
          else { net -= tx.amount; gout += tx.amount; }
        }
      });
      // Card totals use the same goal set as TOTAL BALANCE (active only);
      // per-row figures keep each goal's own movement regardless of status.
      if (g.status === "active") { tin += gin; tout += gout; }
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

  const visibleGoals = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sortedGoals;
    return sortedGoals.filter(
      (g) => g.name.toLowerCase().includes(q) || (g.parent || "").toLowerCase().includes(q),
    );
  }, [sortedGoals, query]);

  // Group the visible savings by parent (account/category); Uncategorized last.
  const groups = useMemo(() => {
    const map = new Map<string, SavingsGoal[]>();
    visibleGoals.forEach((g) => {
      const key = (g.parent || "").trim();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(g);
    });
    return [...map.entries()].sort((a, b) =>
      a[0] === "" ? 1 : b[0] === "" ? -1 : a[0].localeCompare(b[0]),
    );
  }, [visibleGoals]);

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  useEffect(() => {
    try {
      const v = localStorage.getItem("fink-wallets-collapsed");
      if (v) setCollapsedGroups(new Set(JSON.parse(v) as string[]));
    } catch {}
  }, []);
  const toggleGroup = useCallback((name: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      try { localStorage.setItem("fink-wallets-collapsed", JSON.stringify([...next])); } catch {}
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
      variant={view}
      onEdit={setEditGoal}
      onTopup={(id) => { setTopupId(id); setTopupPreset(null); }}
      onQuickDeposit={(id, amount) => { setTopupId(id); setTopupPreset(amount); }}
      onWithdraw={setWithdrawId}
      onReconcile={setReconcileId}
      onStatus={changeStatus}
      onDelete={deleteGoal}
      allGoals={goals}
    />
  ), [calcById, monthNetById, changeStatus, deleteGoal, goals, view]);

  const [showCategories, setShowCategories] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteParentName, setDeleteParentName] = useState<string | null>(null);
  useEffect(() => {
    if (!showCategories) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deleteParentName) {
        if (renaming) setRenaming(null);
        else setShowCategories(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [showCategories, renaming]);

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
          <span className="wallet-group-total">{"Rp " + Math.round(total).toLocaleString("id-ID")}</span>
        </div>
        {!collapsed && (
          view === "card"
            ? <div className="savings-goal-grid">{items.map(renderGoal)}</div>
            : <div className="savings-goal-list">{items.map(renderGoal)}</div>
        )}
      </section>
    );
  }

  const [limitNotice, setLimitNotice] = useState(false);
  const countableGoals = goals.filter((g) => g.status !== "archived").length;
  function openNewGoal() {
    if (!isPremium && countableGoals >= FREE_PLAN_LIMITS.savingGoals) {
      setLimitNotice(true);
      return;
    }
    setShowNew(true);
  }

  if (!loaded)
    return (
      <div className="savings-page" aria-busy="true" aria-label="Loading wallets">
        <div className="fink-skeleton" style={{ height: 30, width: 180, marginBottom: 8 }} />
        <div className="fink-skeleton" style={{ height: 14, width: 320, maxWidth: "80%", marginBottom: 18 }} />
        <div className="fink-skeleton" style={{ height: 196, marginBottom: 14 }} />
        <div className="fink-skeleton" style={{ height: 64, marginBottom: 10 }} />
        <div className="fink-skeleton" style={{ height: 64, marginBottom: 10 }} />
        <div className="fink-skeleton" style={{ height: 64 }} />
      </div>
    );

  return (
    <div className="savings-page">
      <PageHeader
        title="Wallets"
        subtitle="Your savings, organized by account — balances first, targets optional"
      />

      {error && (
        <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'14px', padding:'12px 14px', marginBottom:'14px', color:'#991b1b', fontSize:'12px', fontWeight:600, lineHeight:1.5, display:'flex', alignItems:'center', gap:'10px', justifyContent:'space-between' }}>
          <span>Something went wrong while loading your wallets. Your data is safe — please try again.</span>
          <button
            onClick={() => window.location.reload()}
            style={{ border:'1.5px solid #fecaca', background:'#fff', color:'#991b1b', fontWeight:700, borderRadius:'8px', padding:'6px 12px', cursor:'pointer', fontFamily:'inherit', fontSize:'12px', flexShrink:0 }}
          >
            Retry
          </button>
        </div>
      )}

      {notice && (
        <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'14px', padding:'12px 14px', marginBottom:'14px', color:'#166534', fontSize:'12.5px', fontWeight:600, lineHeight:1.5, display:'flex', alignItems:'center', gap:'10px', justifyContent:'space-between' }}>
          <span>{notice.text}</span>
          <span style={{ display:'flex', gap:'6px', flexShrink:0 }}>
            {notice.tab && (
              <button
                onClick={() => { setTab(notice.tab!); setNotice(null); }}
                style={{ border:'none', background:'#1a5c42', color:'#fff', fontWeight:700, borderRadius:'8px', padding:'6px 12px', cursor:'pointer', fontFamily:'inherit', fontSize:'12px' }}
              >
                View
              </button>
            )}
            <button
              aria-label="Dismiss"
              onClick={() => setNotice(null)}
              style={{ border:'1.5px solid #bbf7d0', background:'#fff', color:'#166534', fontWeight:700, borderRadius:'8px', padding:'6px 10px', cursor:'pointer', fontFamily:'inherit', fontSize:'12px' }}
            >
              ✕
            </button>
          </span>
        </div>
      )}

      <WealthChart goals={goals} totalBalance={summary.totalCollected} count={summary.count} monthIn={monthIn} monthOut={monthOut} />


      {!isPremium && (
        <div style={{ background:'#fff7ed', border:'1px solid #fed7aa', borderRadius:'14px', padding:'12px 14px', marginBottom:'14px', color:'#9a3412', fontSize:'12px', fontWeight:600 }}>
          Free plan: up to {FREE_PLAN_LIMITS.savingGoals} savings. Currently: {countableGoals}/{FREE_PLAN_LIMITS.savingGoals}.
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
        <div className="savings-tabs-action" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search savings…"
            aria-label="Search savings"
            style={{ width: "150px", padding: "7px 11px", border: "1.5px solid #e3e7ee", borderRadius: "9px", fontSize: "12.5px", fontFamily: "inherit", outline: "none", background: "#fff", color: "#111827" }}
          />
          <AppButton variant="secondary" onClick={() => { setRenaming(null); setShowCategories(true); }}>
            Categories
          </AppButton>
          <div className="view-toggle" role="group" aria-label="View">
            <button className={view === "list" ? "active" : ""} onClick={() => changeView("list")}>List</button>
            <button className={view === "card" ? "active" : ""} onClick={() => changeView("card")}>Cards</button>
          </div>
          <AppButton variant="secondary" onClick={openNewGoal}>
            + New Saving
          </AppButton>
        </div>
      </div>

      
      {visibleGoals.length === 0 ? (
        query.trim() ? (
          <EmptyState
            icon={<AppIcon name="saving" size={24} />}
            title={`No results for “${query.trim()}”`}
            action={<AppButton variant="secondary" onClick={() => setQuery("")}>Clear search</AppButton>}
          >
            No savings match your search. Try a different name.
          </EmptyState>
        ) : (
          <EmptyState
            icon={<AppIcon name="saving" size={24} />}
            title={
              tab === "complete"
                ? "No completed savings yet"
                : tab === "archived"
                  ? "No archived savings yet"
                  : "No savings yet"
            }
            action={
              tab === "active" ? (
                <AppButton onClick={openNewGoal}>
                  + Add First Saving
                </AppButton>
              ) : undefined
            }
          >
            {tab === "complete"
              ? "Savings that reach their target will appear here."
              : tab === "archived"
                ? "Savings you archive will appear here."
                : "Add your first saving to start tracking your wallets."}
          </EmptyState>
        )
      ) : (
        groups.map(([name, items]) => (
          <ParentGroup key={name || "__none"} name={name} items={items} />
        ))
      )}

      {showCategories && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowCategories(false); }}
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(17,24,39,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
        >
          <div style={{ background: "#fff", borderRadius: "14px", padding: "20px", width: "100%", maxWidth: "430px", boxShadow: "0 20px 50px rgba(0,0,0,.25)", maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
              <div style={{ fontSize: "15px", fontWeight: 800, color: "#111827" }}>Categories</div>
              <button
                aria-label="Close"
                onClick={() => setShowCategories(false)}
                style={{ border: "none", background: "#f3f4f6", borderRadius: "6px", width: "26px", height: "26px", cursor: "pointer", color: "#4b5563", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
              >
                <AppIcon name="close" size={15} />
              </button>
            </div>
            <div style={{ fontSize: "12px", color: "#94a3b8", lineHeight: 1.5, marginBottom: "12px" }}>
              Renaming applies to every saving in the category. Deleting a category moves its savings to Uncategorized — the savings are not deleted. New categories are created from a saving&apos;s Edit form.
            </div>
            {parentNames.map((name) => {
              const items = goals.filter((g) => (g.parent || "").trim() === name);
              const total = items.reduce((a, g) => a + (g.current || 0), 0);
              const isRenaming = renaming === name;
              return (
                <div key={name} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 0", borderTop: "1px solid #f1f5f9" }}>
                  {isRenaming ? (
                    <>
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const v = renameValue.trim();
                            if (v && v !== name) retagParent(name, v);
                            setRenaming(null);
                          }
                        }}
                        style={{ flex: 1, minWidth: 0, padding: "8px 10px", border: "1.5px solid #e4e1d9", borderRadius: "8px", fontSize: "13.5px", fontFamily: "inherit", outline: "none", background: "#f9fafb", color: "#111827" }}
                      />
                      <button
                        onClick={() => {
                          const v = renameValue.trim();
                          if (v && v !== name) retagParent(name, v);
                          setRenaming(null);
                        }}
                        style={{ border: "none", background: "#1a5c42", color: "#fff", fontWeight: 700, borderRadius: "8px", padding: "8px 13px", cursor: "pointer", fontFamily: "inherit", fontSize: "12.5px" }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setRenaming(null)}
                        style={{ border: "1.5px solid #e3e7ee", background: "#fff", color: "#374151", fontWeight: 700, borderRadius: "8px", padding: "8px 13px", cursor: "pointer", fontFamily: "inherit", fontSize: "12.5px" }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "13.5px", fontWeight: 800, color: "#111827" }}>{name}</div>
                        <div style={{ fontSize: "11.5px", color: "#94a3b8" }}>{items.length} savings · {"Rp " + Math.round(total).toLocaleString("id-ID")}</div>
                      </div>
                      <button
                        onClick={() => { setRenaming(name); setRenameValue(name); }}
                        style={{ border: "1.5px solid #e3e7ee", background: "#fff", color: "#374151", fontWeight: 700, borderRadius: "8px", padding: "7px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: "12.5px" }}
                      >
                        Rename
                      </button>
                      <button
                        onClick={() => setDeleteParentName(name)}
                        style={{ border: "1.5px solid #fecaca", background: "#fff", color: "#b91c1c", fontWeight: 700, borderRadius: "8px", padding: "7px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: "12.5px" }}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              );
            })}
            {(() => {
              const uncat = goals.filter((g) => !(g.parent || "").trim());
              if (uncat.length === 0) return null;
              return (
                <div style={{ padding: "10px 0", borderTop: "1px solid #f1f5f9", fontSize: "12.5px", color: "#94a3b8" }}>
                  Uncategorized · {uncat.length} savings — assign a category from each saving&apos;s Edit form.
                </div>
              );
            })()}
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
            const t = calcById.get(topupGoalObj.id)?.targetNow ?? topupGoalObj.target;
            if (topupGoalObj.status === "active" && t > 0 && topupGoalObj.current + amt >= t) {
              setNotice({ text: `“${topupGoalObj.name}” reached its target and moved to Completed.`, tab: "complete" });
            }
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
            const t = calcById.get(wdGoalObj.id)?.targetNow ?? wdGoalObj.target;
            if (wdGoalObj.status === "complete" && t > 0 && wdGoalObj.current - amt < t) {
              setNotice({ text: `“${wdGoalObj.name}” dropped below its target and is Active again.`, tab: "active" });
            }
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
            const t = calcById.get(rcGoalObj.id)?.targetNow ?? rcGoalObj.target;
            if (t > 0 && rcGoalObj.status === "active" && actual >= t) {
              setNotice({ text: `“${rcGoalObj.name}” reached its target and moved to Completed.`, tab: "complete" });
            } else if (t > 0 && rcGoalObj.status === "complete" && actual < t) {
              setNotice({ text: `“${rcGoalObj.name}” dropped below its target and is Active again.`, tab: "active" });
            }
            reconcileGoal(rcGoalObj.id, actual, note);
            setReconcileId(null);
          }}
          onClose={() => setReconcileId(null)}
        />
      )}
    </div>
  );
}
