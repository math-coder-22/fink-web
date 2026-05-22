"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import type {
  SavingsGoal,
  GoalCalcResult,
  GoalTransaction,
} from "@/types/savings";
import { AppIcon } from "@/components/ui/design";
import { buildGoalAdvisorItem, goalTypeLabel } from "@/lib/finance/goals";

const fmt = (n: number) =>
  "Rp " + Math.abs(Math.round(n || 0)).toLocaleString("id-ID");



function PriorityBadge({ label, priority, mode }: { label: string; priority: string; mode: string }) {
  const map: Record<string, { bg: string; color: string; border: string }> = {
    critical: { bg: "#fef2f2", color: "#991b1b", border: "#fecaca" },
    high: { bg: "#fff7ed", color: "#9a3412", border: "#fed7aa" },
    medium: { bg: "#fffbeb", color: "#92400e", border: "#fde68a" },
    low: { bg: "#f8fafc", color: "#475569", border: "#e2e8f0" },
    maintain: { bg: "#f0fdf4", color: "#166534", border: "#bbf7d0" },
    paused: { bg: "#f3f4f6", color: "#6b7280", border: "#e5e7eb" },
  };
  const t = map[priority] || map.medium;
  return (
    <span
      title={`${mode === "manual" ? "Manual" : "Auto"} priority`}
      style={{
        fontSize: "9.5px",
        fontWeight: 800,
        padding: "2px 7px",
        borderRadius: "99px",
        background: t.bg,
        color: t.color,
        border: `1px solid ${t.border}`,
        textTransform: "uppercase" as const,
        letterSpacing: ".3px",
        whiteSpace: "nowrap" as const,
      }}
    >
      {label}
    </span>
  );
}

function TrackBadge({ status }: { status: GoalCalcResult["trackStatus"] }) {
  const map = {
    complete: { bg: "#dbeafe", color: "#1e40af", label: "Complete" },
    ahead: { bg: "#d1fae5", color: "#065f46", label: "Ahead" },
    ontrack: { bg: "#d1fae5", color: "#065f46", label: "On Track" },
    behind: { bg: "#fee2e2", color: "#991b1b", label: "Behind" },
  };
  const s = map[status];
  return (
    <span
      style={{
        fontSize: "9.5px",
        fontWeight: 700,
        padding: "2px 7px",
        borderRadius: "99px",
        background: s.bg,
        color: s.color,
        textTransform: "uppercase" as const,
        letterSpacing: ".3px",
        whiteSpace: "nowrap" as const,
      }}
    >
      {s.label}
    </span>
  );
}

function FeasibilityBadge({ status, label }: { status: string; label: string }) {
  const map: Record<string, { bg: string; color: string; border: string }> = {
    realistic: { bg: "#f0fdf4", color: "#166534", border: "#bbf7d0" },
    aggressive: { bg: "#fffbeb", color: "#92400e", border: "#fde68a" },
    unrealistic: { bg: "#fef2f2", color: "#991b1b", border: "#fecaca" },
    unknown: { bg: "#f8fafc", color: "#475569", border: "#e2e8f0" },
    complete: { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  };
  const t = map[status] || map.unknown;
  return (
    <span
      style={{
        fontSize: "9.5px",
        fontWeight: 800,
        padding: "2px 7px",
        borderRadius: "99px",
        background: t.bg,
        color: t.color,
        border: `1px solid ${t.border}`,
        textTransform: "uppercase" as const,
        letterSpacing: ".3px",
        whiteSpace: "nowrap" as const,
      }}
    >
      {label}
    </span>
  );
}

/* ─── KEBAB MENU (fixed-position dropdown, tidak terpotong) ─── */
function KebabMenu({
  goal,
  onTopup,
  onWithdraw,
  onReconcile,
  onEdit,
  onStatus,
  onDelete,
}: {
  goal: SavingsGoal;
  onTopup: () => void;
  onWithdraw: () => void;
  onReconcile: () => void;
  onEdit: () => void;
  onStatus: (s: SavingsGoal["status"]) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function toggleMenu(e: React.MouseEvent) {
    e.stopPropagation();
    if (open) {
      setOpen(false);
      return;
    }
    const rect = btnRef.current!.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const menuW = 210;
    const menuH = 300;
    const gap = 8;

    // Fixed + portal ke document.body supaya tidak tertutup card/container.
    // Posisi juga di-clamp agar item terakhir tidak masuk ke bawah browser.
    const openUp = rect.bottom + menuH + gap > vh;
    const top = Math.max(
      12,
      Math.min(
        openUp ? rect.top - menuH - gap : rect.bottom + gap,
        vh - menuH - 12,
      ),
    );
    const left = Math.max(12, Math.min(rect.right - menuW, vw - menuW - 12));

    setPos({ top, left });
    setOpen(true);
  }

  const item = (label: React.ReactNode, color: string, onClick: () => void) => (
    <button
      key={typeof label === "string" ? label : String(color)}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
        setOpen(false);
      }}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left" as const,
        padding: "8px 14px",
        border: "none",
        background: "none",
        fontSize: "13px",
        color,
        cursor: "pointer",
        fontFamily: "inherit",
        fontWeight: 500,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#f7f8fa")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
    >
      {label}
    </button>
  );

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggleMenu}
        style={{
          width: "28px",
          height: "28px",
          border: "1px solid #e4e1d9",
          borderRadius: "6px",
          background: open ? "#f3f4f6" : "#fff",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#6b7280",
          flexShrink: 0,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
          <circle cx="7" cy="2.5" r="1.2" />
          <circle cx="7" cy="7" r="1.2" />
          <circle cx="7" cy="11.5" r="1.2" />
        </svg>
      </button>

      {mounted &&
        open &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed" as const,
              top: pos.top,
              left: pos.left,
              background: "#fff",
              border: "1.5px solid #e4e1d9",
              borderRadius: "12px",
              boxShadow: "0 18px 50px rgba(0,0,0,.20)",
              zIndex: 2147483647,
              width: "210px",
              overflow: "hidden",
              padding: "5px 0",
            }}
          >
            {goal.status === "active" &&
              item(<span style={{ display:"inline-flex", alignItems:"center", gap:8 }}><AppIcon name="income" size={14} />Top Up</span>, "#1a5c42", onTopup)}
            {goal.status === "active" &&
              item(<span style={{ display:"inline-flex", alignItems:"center", gap:8 }}><AppIcon name="expense" size={14} />Withdraw</span>, "#b45309", onWithdraw)}
            {goal.status === "active" &&
              item(<span style={{ display:"inline-flex", alignItems:"center", gap:8 }}><AppIcon name="scale" size={14} />Reconcile Balance</span>, "#92400e", onReconcile)}
            {goal.status === "active" && (
              <div
                style={{
                  height: "1px",
                  background: "#f3f4f6",
                  margin: "3px 0",
                }}
              />
            )}
            {item(<span style={{ display:"inline-flex", alignItems:"center", gap:8 }}><AppIcon name="edit" size={14} />Edit</span>, "#374151", onEdit)}
            <div
              style={{ height: "1px", background: "#f3f4f6", margin: "3px 0" }}
            />
            {(
              [
                "active",
                "pending",
                "complete",
                "archived",
              ] as SavingsGoal["status"][]
            )
              .filter((s) => s !== goal.status)
              .map((s) =>
                item(
                  `${s.charAt(0).toUpperCase() + s.slice(1)}`,
                  "#6b7280",
                  () => onStatus(s),
                ),
              )}
            <div
              style={{ height: "1px", background: "#f3f4f6", margin: "3px 0" }}
            />
            {item(<span style={{ display:"inline-flex", alignItems:"center", gap:8 }}><AppIcon name="trash" size={14} />Delete</span>, "#b91c1c", onDelete)}
          </div>,
          document.body,
        )}
    </>
  );
}

/* ─── COMPACT ACTION MENU FOR DETAIL MODAL ─── */
function DetailActionMenu({
  goal,
  onTopup,
  onWithdraw,
  onReconcile,
  onEdit,
  onStatus,
  onDelete,
}: {
  goal: SavingsGoal;
  onTopup: () => void;
  onWithdraw: () => void;
  onReconcile: () => void;
  onEdit: () => void;
  onStatus: (s: SavingsGoal["status"]) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const item = (label: React.ReactNode, color: string, onClick: () => void) => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
        setOpen(false);
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        textAlign: "left" as const,
        padding: "9px 12px",
        border: "none",
        background: "none",
        fontSize: 13,
        color,
        cursor: "pointer",
        fontFamily: "inherit",
        fontWeight: 650,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#f7f8fa")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
    >
      {label}
    </button>
  );

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label="Goal actions"
        style={{
          width: 34,
          height: 34,
          border: "1px solid #e4e1d9",
          borderRadius: 10,
          background: open ? "#f3f4f6" : "#fff",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#6b7280",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="3" r="1.35" />
          <circle cx="8" cy="8" r="1.35" />
          <circle cx="8" cy="13" r="1.35" />
        </svg>
      </button>
      {open && (
        <div
          style={{
            position: "absolute" as const,
            top: 40,
            right: 0,
            width: 205,
            background: "#fff",
            border: "1.5px solid #e4e1d9",
            borderRadius: 12,
            boxShadow: "0 18px 45px rgba(15,23,42,.18)",
            zIndex: 20,
            overflow: "hidden",
            padding: "5px 0",
          }}
        >
          {goal.status === "active" && item(<><AppIcon name="income" size={14} /> Deposit</>, "#1a5c42", onTopup)}
          {goal.status === "active" && item(<><AppIcon name="expense" size={14} /> Withdraw</>, "#b45309", onWithdraw)}
          {goal.status === "active" && item(<><AppIcon name="scale" size={14} /> Reconcile</>, "#92400e", onReconcile)}
          {goal.status === "active" && <div style={{ height: 1, background: "#f3f4f6", margin: "3px 0" }} />}
          {item(<><AppIcon name="edit" size={14} /> Edit</>, "#374151", onEdit)}
          <div style={{ height: 1, background: "#f3f4f6", margin: "3px 0" }} />
          {(["active", "pending", "complete", "archived"] as SavingsGoal["status"][])
            .filter((s) => s !== goal.status)
            .map((s) =>
              item(
                s === "pending" ? "Move to Pending" : s === "complete" ? "Mark as Complete" : s === "archived" ? "Archive" : "Reactivate",
                "#6b7280",
                () => onStatus(s),
              ),
            )}
          <div style={{ height: 1, background: "#f3f4f6", margin: "3px 0" }} />
          {item(<><AppIcon name="trash" size={14} /> Delete</>, "#b91c1c", onDelete)}
        </div>
      )}
    </div>
  );
}

/* ─── HISTORY PANEL ─── */
function HistoryPanel({ history }: { history: GoalTransaction[] }) {
  return (
    <div style={{ border: "1px solid #f0f0ee", borderRadius: 14, background: "#fafaf9", overflow: "hidden" }}>
      <div
        style={{
          padding: "11px 14px",
          fontSize: "10.5px",
          fontWeight: 800,
          color: "#4b5563",
          textTransform: "uppercase" as const,
          letterSpacing: ".5px",
          borderBottom: "1px solid #f0f0ee",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>Saving History</span>
        <span style={{ fontSize: "10px", color: "#9ca3af", fontWeight: 600 }}>
          {history.length} entries
        </span>
      </div>
      {history.length === 0 ? (
        <div
          style={{
            padding: "18px 14px",
            fontSize: "12.5px",
            color: "#9ca3af",
            textAlign: "center" as const,
          }}
        >
          No saving history yet.
        </div>
      ) : (
        <div style={{ maxHeight: "260px", overflowY: "auto" as const }}>
          {[...history].reverse().map((h, i) => (
            <div
              key={h.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "10px 14px",
                borderBottom:
                  i < history.length - 1 ? "1px solid #f0f0ee" : "none",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "12.5px",
                    fontWeight: 700,
                    color: "#374151",
                    overflowWrap: "anywhere" as const,
                  }}
                >
                  {h.note || (h.type === "topup" ? "Saving added" : "Saving withdrawn")}
                </div>
                <div style={{ fontSize: "10.5px", color: "#9ca3af", marginTop: 2 }}>
                  {new Date(h.date).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                  {" · "}
                  {new Date(h.date).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono), monospace",
                  fontWeight: 800,
                  fontSize: "13px",
                  color: h.type === "topup" ? "#065f46" : "#b45309",
                  whiteSpace: "nowrap" as const,
                }}
              >
                {h.type === "topup" ? "+" : "−"}
                {fmt(h.amount)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GoalDetailModal({
  goal,
  calc,
  advisor,
  pct,
  progColor,
  onClose,
  onTopup,
  onWithdraw,
  onEdit,
  onReconcile,
  onStatus,
  onDelete,
}: {
  goal: SavingsGoal;
  calc: GoalCalcResult;
  advisor: ReturnType<typeof buildGoalAdvisorItem>;
  pct: number;
  progColor: string;
  onClose: () => void;
  onTopup: () => void;
  onWithdraw: () => void;
  onEdit: () => void;
  onReconcile: () => void;
  onStatus: (s: SavingsGoal["status"]) => void;
  onDelete: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <div
      onMouseDown={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483600,
        background: "rgba(15,23,42,.35)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "18px",
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: "min(760px, 100%)",
          maxHeight: "min(82vh, 760px)",
          overflow: "auto",
          background: "#fff",
          borderRadius: 22,
          boxShadow: "0 28px 90px rgba(15,23,42,.28)",
          border: "1px solid #e4e1d9",
        }}
      >
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 2,
            background: "rgba(255,255,255,.92)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid #f0f0ee",
            padding: "16px 18px",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: 20, lineHeight: 1.2, color: "#111827" }}>{goal.name}</h2>
              <TrackBadge status={calc.trackStatus} />
              <PriorityBadge label={advisor.priorityLabel} priority={advisor.priority} mode={advisor.mode} />
            </div>
            <div style={{ marginTop: 6, fontSize: 12.5, color: "#9ca3af", fontWeight: 600 }}>
              {advisor.typeLabel || goalTypeLabel(goal.type)}
              {goal.deadline &&
                ` · ${new Date(goal.deadline).toLocaleDateString("id-ID", { month: "short", year: "numeric" })}`}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <DetailActionMenu
              goal={goal}
              onTopup={onTopup}
              onWithdraw={onWithdraw}
              onReconcile={onReconcile}
              onEdit={onEdit}
              onStatus={onStatus}
              onDelete={onDelete}
            />
            <button
              onClick={onClose}
              aria-label="Close goal detail"
              style={{
                width: 34,
                height: 34,
                border: "1px solid #e4e1d9",
                borderRadius: 10,
                background: "#fff",
                cursor: "pointer",
                color: "#6b7280",
                fontSize: 18,
                lineHeight: 1,
                fontWeight: 700,
              }}
            >
              ×
            </button>
          </div>
        </div>

        <div style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div className="savings-goal-progress" style={{ height: 7 }}>
              <div style={{ background: progColor, width: `${Math.min(100, pct)}%` }} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 900, color: progColor, minWidth: 46, textAlign: "right" }}>{pct}%</div>
          </div>

          <div className="goal-detail-stat-grid">
            <div className="goal-detail-stat"><div className="savings-label">Saved</div><div className="savings-value" style={{ color: progColor }}>{fmt(goal.current)}</div></div>
            <div className="goal-detail-stat"><div className="savings-label">Target</div><div className="savings-value small">{fmt(calc.targetNow)}</div></div>
            <div className="goal-detail-stat"><div className="savings-label">Gap</div><div className="savings-value small">{fmt(calc.sisa)}</div></div>
            <div className="goal-detail-stat"><div className="savings-label">Recommended/Month</div><div className="savings-value" style={{ color: "#1a5c42" }}>{fmt(calc.monthlyNeeded)}</div></div>
          </div>

          <div style={{ marginTop: 16, padding: "13px 14px", borderRadius: 14, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 12.5, color: "#475569", fontWeight: 800, lineHeight: 1.5 }}>
              {advisor.healthLabel} · {advisor.feasibilityMessage}
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: "#64748b", fontWeight: 650, lineHeight: 1.55 }}>
              {advisor.mode === "manual" ? "Manual priority" : "Auto priority"} · {advisor.reason}
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: "#64748b", fontWeight: 750, lineHeight: 1.55 }}>
              ETA by current allocation: {advisor.etaLabel} · Ideal/month: {fmt(advisor.idealMonthly)}
            </div>
          </div>

          {goal.type === "darurat" && calc.coverage !== undefined && (
            <div style={{ marginTop: 12, fontSize: 12.5, fontWeight: 750, color: calc.coverageStatus === "Risiko Tinggi" ? "#991b1b" : calc.coverageStatus === "Aman" ? "#065f46" : "#92400e" }}>
              {calc.coverageStatus} · {calc.coverage.toFixed(1)}× pengeluaran
              {(calc.excessDana ?? 0) > 0 && <span style={{ color: "#065f46" }}> · Kelebihan {fmt(calc.excessDana!)}</span>}
            </div>
          )}

          {goal.status === "active" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
              <button
                onClick={onTopup}
                style={{
                  border: "none",
                  borderRadius: 12,
                  background: "#1a5c42",
                  color: "#fff",
                  padding: "11px 14px",
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Deposit
              </button>
              <button
                onClick={onWithdraw}
                style={{
                  border: "1px solid #fed7aa",
                  borderRadius: 12,
                  background: "#fff7ed",
                  color: "#b45309",
                  padding: "11px 14px",
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Withdraw
              </button>
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <HistoryPanel history={goal.history || []} />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ─── MAIN CARD ─── */
interface Props {
  goal: SavingsGoal;
  calc: GoalCalcResult;
  onEdit: (g: SavingsGoal) => void;
  onTopup: (id: string) => void;
  onWithdraw: (id: string) => void;
  onReconcile: (id: string) => void;
  onStatus: (id: string, s: SavingsGoal["status"]) => void;
  onDelete: (id: string) => void;
  allGoals?: SavingsGoal[];
}

export default function GoalCard({
  goal,
  calc,
  onEdit,
  onTopup,
  onWithdraw,
  onReconcile,
  onStatus,
  onDelete,
  allGoals = [],
}: Props) {
  const [showDetail, setShowDetail] = useState(false);
  const pct = Math.round(calc.progress * 100);
  const advisor = buildGoalAdvisorItem(goal, calc, allGoals.length ? allGoals : [goal]);
  const progColor =
    calc.trackStatus === "behind"
      ? "#b91c1c"
      : calc.trackStatus === "complete"
        ? "#1d4ed8"
        : "#1a5c42";

  const deleteGoalSafe = () => {
    if (confirm("Delete this goal?")) {
      setShowDetail(false);
      onDelete(goal.id);
    }
  };

  return (
    <>
      <div className="savings-goal-card compact" onClick={() => setShowDetail(true)}>
        <div className="savings-goal-compact-main">
          <div style={{ minWidth: 0 }}>
            <div className="savings-goal-title-row compact">
              <div className="savings-goal-title">{goal.name}</div>
              <TrackBadge status={calc.trackStatus} />
              <PriorityBadge label={advisor.priorityLabel} priority={advisor.priority} mode={advisor.mode} />
            </div>
            <div className="savings-goal-subtitle">
              {goal.focus && <span style={{ color:'#1a5c42', fontWeight:800 }}>Focus · </span>}
              {advisor.typeLabel || goalTypeLabel(goal.type)}
              {goal.deadline &&
                ` · ${new Date(goal.deadline).toLocaleDateString("id-ID", { month: "short", year: "numeric" })}`}
            </div>
            <div className="savings-goal-progress-row compact">
              <div className="savings-goal-progress">
                <div style={{ background: progColor, width: `${Math.min(100, pct)}%` }} />
              </div>
              <span className="savings-goal-pct" style={{ color: progColor }}>{pct}%</span>
            </div>
            <div className="savings-goal-compact-meta">
              {fmt(goal.current)} / {fmt(calc.targetNow)} · ETA {advisor.etaLabel}
            </div>
          </div>

          <div className="savings-goal-compact-side">
            <div className="savings-label">Recommended/Month</div>
            <div className="savings-rec-value">{fmt(calc.monthlyNeeded)}</div>
            <div className="savings-rec-meta">{goal.history?.length || 0} history</div>
          </div>

          <div className="savings-kebab-wrap" onClick={(e) => e.stopPropagation()}>
            <DetailActionMenu
              goal={goal}
              onTopup={() => onTopup(goal.id)}
              onWithdraw={() => onWithdraw(goal.id)}
              onReconcile={() => onReconcile(goal.id)}
              onEdit={() => onEdit(goal)}
              onStatus={(s) => onStatus(goal.id, s)}
              onDelete={deleteGoalSafe}
            />
          </div>
        </div>
      </div>

      {showDetail && (
        <GoalDetailModal
          goal={goal}
          calc={calc}
          advisor={advisor}
          pct={pct}
          progColor={progColor}
          onClose={() => setShowDetail(false)}
          onTopup={() => {
            setShowDetail(false);
            onTopup(goal.id);
          }}
          onWithdraw={() => {
            setShowDetail(false);
            onWithdraw(goal.id);
          }}
          onReconcile={() => {
            setShowDetail(false);
            onReconcile(goal.id);
          }}
          onStatus={(s) => {
            setShowDetail(false);
            onStatus(goal.id, s);
          }}
          onEdit={() => {
            setShowDetail(false);
            onEdit(goal);
          }}
          onDelete={deleteGoalSafe}
        />
      )}
    </>
  );
}
