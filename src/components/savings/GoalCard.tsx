"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import type {
  SavingsGoal,
  GoalCalcResult,
  GoalTransaction,
} from "@/types/savings";
import { AppIcon } from "@/components/ui/design";

const fmt = (n: number) =>
  "Rp " + Math.abs(Math.round(n || 0)).toLocaleString("id-ID");

const TYPE_LABEL: Record<string, string> = {
  darurat: "Emergency Fund",
  darurat_lanjutan: "Extended Emergency",
  rumah: "House",
  kendaraan: "Vehicle",
  pendidikan: "Education",
  pensiun: "Retirement",
  investasi: "Investment",
  biasa: "General Saving",
};

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
              item(<span style={{ display:"inline-flex", alignItems:"center", gap:8 }}><AppIcon name="income" size={14} />Setor Dana</span>, "#1a5c42", onTopup)}
            {goal.status === "active" &&
              item(<span style={{ display:"inline-flex", alignItems:"center", gap:8 }}><AppIcon name="expense" size={14} />Tarik Dana</span>, "#b45309", onWithdraw)}
            {goal.status === "active" &&
              item(<span style={{ display:"inline-flex", alignItems:"center", gap:8 }}><AppIcon name="scale" size={14} />Reconcile Saldo</span>, "#92400e", onReconcile)}
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
            {item("Hapus", "#b91c1c", onDelete)}
          </div>,
          document.body,
        )}
    </>
  );
}

/* ─── HISTORY PANEL ─── */
function HistoryPanel({ history }: { history: GoalTransaction[] }) {
  return (
    <div style={{ borderTop: "1px solid #f0f0ee", background: "#fafaf9" }}>
      <div
        style={{
          padding: "9px 14px",
          fontSize: "10.5px",
          fontWeight: 700,
          color: "#4b5563",
          textTransform: "uppercase" as const,
          letterSpacing: ".5px",
          borderBottom: "1px solid #f0f0ee",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>Riwayat Transaksi</span>
        <span style={{ fontSize: "10px", color: "#9ca3af", fontWeight: 400 }}>
          {history.length} entri · klik card untuk tutup
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
          Belum ada riwayat. Gunakan menu ⋮ untuk setor atau tarik dana.
        </div>
      ) : (
        <div style={{ maxHeight: "200px", overflowY: "auto" as const }}>
          {[...history].reverse().map((h, i) => (
            <div
              key={h.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 14px",
                borderBottom:
                  i < history.length - 1 ? "1px solid #f0f0ee" : "none",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <span
                  style={{
                    fontSize: "16px",
                    color: h.type === "topup" ? "#065f46" : "#b45309",
                    fontWeight: 700,
                    minWidth: "16px",
                  }}
                >
                  {h.type === "topup" ? "" : ""}
                </span>
                <div>
                  <div
                    style={{
                      fontSize: "12.5px",
                      fontWeight: 500,
                      color: "#374151",
                    }}
                  >
                    {h.note}
                  </div>
                  <div style={{ fontSize: "10.5px", color: "#9ca3af" }}>
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
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono), monospace",
                  fontWeight: 700,
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
}: Props) {
  const [showHistory, setShowHistory] = useState(false);
  const pct = Math.round(calc.progress * 100);
  const progColor =
    calc.trackStatus === "behind"
      ? "#b91c1c"
      : calc.trackStatus === "complete"
        ? "#1d4ed8"
        : "#1a5c42";

  return (
    <div className="savings-goal-card">
      <div
        className="savings-goal-main"
        onClick={() => setShowHistory((v) => !v)}
      >
        <div className="savings-goal-left">
          <div className="savings-goal-title-row">
            <div className="savings-goal-title">{goal.name}</div>
            <TrackBadge status={calc.trackStatus} />
          </div>
          <div className="savings-goal-subtitle">
            {TYPE_LABEL[goal.type]}
            {goal.deadline &&
              ` · ${new Date(goal.deadline).toLocaleDateString("id-ID", { month: "short", year: "numeric" })}`}
          </div>
          <div className="savings-goal-progress-row">
            <div className="savings-goal-progress">
              <div
                style={{
                  background: progColor,
                  width: `${Math.min(100, pct)}%`,
                }}
              />
            </div>
            <span className="savings-goal-pct" style={{ color: progColor }}>
              {pct}%
            </span>
          </div>
          {goal.type === "darurat" && calc.coverage !== undefined && (
            <div
              className="savings-goal-status-note"
              style={{
                color:
                  calc.coverageStatus === "Risiko Tinggi"
                    ? "#991b1b"
                    : calc.coverageStatus === "Aman"
                      ? "#065f46"
                      : "#92400e",
              }}
            >
              {calc.coverageStatus} · {calc.coverage.toFixed(1)}× pengeluaran
              {(calc.excessDana ?? 0) > 0 && (
                <span style={{ color: "#065f46" }}>
                  {" "}
                  · Kelebihan {fmt(calc.excessDana!)}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="savings-goal-middle">
          <div className="savings-goal-stat primary">
            <div className="savings-label">Terkumpul</div>
            <div className="savings-value" style={{ color: progColor }}>
              {fmt(goal.current)}
            </div>
          </div>
          <div className="savings-goal-stat">
            <div className="savings-label">Target</div>
            <div className="savings-value small">{fmt(calc.targetNow)}</div>
          </div>
          <div className="savings-goal-stat">
            <div className="savings-label">Sisa</div>
            <div className="savings-value small" style={{ color: "#9ca3af" }}>
              {fmt(calc.sisa)}
            </div>
          </div>
        </div>

        <div className="savings-goal-right">
          <div className="savings-goal-rec">
            <div className="savings-label">Rekomendasi/Bln</div>
            <div className="savings-rec-value">{fmt(calc.monthlyNeeded)}</div>
            {goal.monthly > 0 && (
              <div
                className="savings-rec-meta"
                style={{
                  color:
                    goal.monthly >= calc.monthlyNeeded ? "#065f46" : "#9ca3af",
                  fontFamily: "var(--font-mono), monospace",
                }}
              >
                Aktual: {fmt(goal.monthly)}
              </div>
            )}
            {calc.months > 0 && goal.deadline && (
              <div className="savings-rec-meta">{calc.months} bln tersisa</div>
            )}
            {goal.useInvest && (
              <div className="savings-rec-meta" style={{ color: "#6b7280" }}>
                 {goal.returnRate}%/thn
              </div>
            )}
            <div className="savings-history-hint">
              {showHistory
                ? "▲ tutup riwayat"
                : `▼ ${goal.history?.length || 0} riwayat`}
            </div>
          </div>

          <div
            className="savings-kebab-wrap"
            onClick={(e) => e.stopPropagation()}
          >
            <KebabMenu
              goal={goal}
              onTopup={() => onTopup(goal.id)}
              onWithdraw={() => onWithdraw(goal.id)}
              onReconcile={() => onReconcile(goal.id)}
              onEdit={() => onEdit(goal)}
              onStatus={(s) => onStatus(goal.id, s)}
              onDelete={() => {
                if (confirm("Hapus goal ini?")) onDelete(goal.id);
              }}
            />
          </div>
        </div>
      </div>

      {showHistory && <HistoryPanel history={goal.history || []} />}
    </div>
  );
}
