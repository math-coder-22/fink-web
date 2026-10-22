"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { SavingsGoal } from "@/types/savings";
import { AppIcon } from "@/components/ui/design";

const fmt = (n: number) =>
  "Rp " + Math.abs(Math.round(n || 0)).toLocaleString("id-ID");

// Amount inputs keep a digits-only state value but DISPLAY grouped with
// thousand separators (e.g. 500000 -> "500.000") while typing.
const digitsOnly = (v: string) => v.replace(/\D/g, "");
const fmtDigits = (v: string) => (v ? Number(v).toLocaleString("id-ID") : "");

// Escape closes a modal exactly like a backdrop click: only when it has no
// unsaved input (the same dirty guard the backdrop uses).
function useEscapeClose(isDirty: boolean, onClose: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isDirty) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isDirty, onClose]);
}

export function TopupModal({
  goal,
  initialAmount,
  onConfirm,
  onClose,
}: {
  goal: SavingsGoal;
  initialAmount?: number;
  onConfirm: (amt: number, note: string) => void;
  onClose: () => void;
}) {
  const [amt, setAmt] = useState(initialAmount && initialAmount > 0 ? String(Math.round(initialAmount)) : "");
  const [note, setNote] = useState("");
  const isDirty = amt !== "" || note !== "";
  useEscapeClose(isDirty, onClose);
  const inp: CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    border: "1.5px solid #e4e1d9",
    borderRadius: "8px",
    fontSize: "14px",
    fontFamily: "inherit",
    outline: "none",
  };
  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDirty) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.45)",
        zIndex: 500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "14px",
          width: "100%",
          maxWidth: "360px",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,.18)",
        }}
      >
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid #e4e1d9",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display:"flex", alignItems:"center", gap:7, fontSize: "15px", fontWeight: 700, color: "#1a5c42" }}>
            <AppIcon name="income" size={15} />Deposit
          </div>
          <button
            aria-label="Close"
            onClick={onClose}
            style={{
              border: "none",
              background: "#f3f4f6",
              borderRadius: "6px",
              width: "26px",
              height: "26px",
              cursor: "pointer",
              color: "#4b5563",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AppIcon name="close" size={15} />
          </button>
        </div>
        <div
          style={{
            padding: "16px 18px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div style={{ fontSize: "13px", fontWeight: 600 }}>{goal.name}</div>
          <div style={{ fontSize: "12px", color: "#9ca3af" }}>
            Saved: {fmt(goal.current)} / {fmt(goal.target)}
          </div>
          <div>
            <label
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "#6b7280",
                display: "block",
                marginBottom: "5px",
                textTransform: "uppercase" as const,
                letterSpacing: ".5px",
              }}
            >
              Deposit Amount (Rp)
            </label>
            <input
              autoFocus
              type="text"
              inputMode="numeric"
              placeholder="500.000"
              value={fmtDigits(amt)}
              onChange={(e) => setAmt(digitsOnly(e.target.value))}
              style={{
                ...inp,
                fontFamily: "var(--font-mono), monospace",
                fontSize: "16px",
              }}
            />
          </div>
          <div>
            <label
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "#6b7280",
                display: "block",
                marginBottom: "5px",
                textTransform: "uppercase" as const,
                letterSpacing: ".5px",
              }}
            >
              Note (optional)
            </label>
            <input
              type="text"
              placeholder="This month's salary..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={inp}
            />
          </div>
          <button
            disabled={!(parseFloat(amt) > 0)}
            onClick={() =>
              parseFloat(amt) > 0 && onConfirm(parseFloat(amt), note)
            }
            style={{
              background: parseFloat(amt) > 0 ? "#1a5c42" : "#9ca3af",
              color: "#fff",
              border: "none",
              padding: "10px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: parseFloat(amt) > 0 ? "pointer" : "not-allowed",
            }}
          >
            Deposit {amt ? fmt(parseFloat(amt) || 0) : "Fund"}
          </button>
          {amt !== "" && !(parseFloat(amt) > 0) && (
            <div style={{ fontSize: "11.5px", color: "#b91c1c", marginTop: "-4px" }}>
              Enter an amount above Rp 0.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function WithdrawModal({
  goal,
  onConfirm,
  onClose,
}: {
  goal: SavingsGoal;
  onConfirm: (amt: number, note: string) => void;
  onClose: () => void;
}) {
  const [amt, setAmt] = useState("");
  const [note, setNote] = useState("");
  const [all, setAll] = useState(false);
  const isDirty = amt !== "" || note !== "" || all;
  useEscapeClose(isDirty, onClose);
  const actualAmt = all ? goal.current : parseFloat(amt) || 0;
  const inp: CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    border: "1.5px solid #e4e1d9",
    borderRadius: "8px",
    fontSize: "14px",
    fontFamily: "inherit",
    outline: "none",
  };
  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDirty) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.45)",
        zIndex: 500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "14px",
          width: "100%",
          maxWidth: "360px",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,.18)",
        }}
      >
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid #e4e1d9",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display:"flex", alignItems:"center", gap:7, fontSize: "15px", fontWeight: 700, color: "#b45309" }}>
            <AppIcon name="expense" size={15} />Withdraw
          </div>
          <button
            aria-label="Close"
            onClick={onClose}
            style={{
              border: "none",
              background: "#f3f4f6",
              borderRadius: "6px",
              width: "26px",
              height: "26px",
              cursor: "pointer",
              color: "#4b5563",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AppIcon name="close" size={15} />
          </button>
        </div>
        <div
          style={{
            padding: "16px 18px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div style={{ fontSize: "13px", fontWeight: 600 }}>{goal.name}</div>
          <div style={{ fontSize: "12px", color: "#9ca3af" }}>
            Available balance:{" "}
            <strong style={{ color: "#111827" }}>{fmt(goal.current)}</strong>
          </div>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 500,
              padding: "9px 11px",
              border: "1.5px solid #fde68a",
              borderRadius: "8px",
              background: "#fffbeb",
            }}
          >
            <input
              type="checkbox"
              checked={all}
              onChange={(e) => setAll(e.target.checked)}
              style={{ accentColor: "#b45309", width: "14px", height: "14px" }}
            />
            Withdraw all ({fmt(goal.current)})
          </label>
          {!all && (
            <div>
              <label
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#6b7280",
                  display: "block",
                  marginBottom: "5px",
                  textTransform: "uppercase" as const,
                  letterSpacing: ".5px",
                }}
              >
                Withdraw Amount (Rp)
              </label>
              <input
                autoFocus
                type="text"
                inputMode="numeric"
                placeholder="500.000"
                value={fmtDigits(amt)}
                onChange={(e) => setAmt(digitsOnly(e.target.value))}
                style={{
                  ...inp,
                  fontFamily: "var(--font-mono), monospace",
                  fontSize: "16px",
                }}
              />
              {parseFloat(amt) > goal.current && (
                <div
                  style={{
                    fontSize: "11.5px",
                    color: "#b91c1c",
                    marginTop: "4px",
                  }}
                >
                  Exceeds available balance
                </div>
              )}
            </div>
          )}
          <div>
            <label
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "#6b7280",
                display: "block",
                marginBottom: "5px",
                textTransform: "uppercase" as const,
                letterSpacing: ".5px",
              }}
            >
              Note (optional)
            </label>
            <input
              type="text"
              placeholder="Used for..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={inp}
            />
          </div>
          <button
            disabled={actualAmt <= 0 || actualAmt > goal.current}
            onClick={() =>
              actualAmt > 0 &&
              actualAmt <= goal.current &&
              onConfirm(actualAmt, note)
            }
            style={{
              background:
                actualAmt > 0 && actualAmt <= goal.current
                  ? "#b45309"
                  : "#9ca3af",
              color: "#fff",
              border: "none",
              padding: "10px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: actualAmt > 0 ? "pointer" : "not-allowed",
            }}
          >
            Withdraw {actualAmt > 0 ? fmt(actualAmt) : "Fund"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ReconcileModal({
  goal,
  onConfirm,
  onClose,
}: {
  goal: SavingsGoal;
  onConfirm: (actual: number, note: string) => void;
  onClose: () => void;
}) {
  const [actual, setActual] = useState(String(Math.round(goal.current || 0)));
  const [note, setNote] = useState("Savings balance reconcile");
  const isDirty =
    actual !== String(Math.round(goal.current || 0)) ||
    note !== "Savings balance reconcile";
  useEscapeClose(isDirty, onClose);
  const actualNumber = parseFloat(actual) || 0;
  const diff = actualNumber - goal.current;
  const inp: CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    border: "1.5px solid #e4e1d9",
    borderRadius: "8px",
    fontSize: "14px",
    fontFamily: "inherit",
    outline: "none",
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDirty) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.45)",
        zIndex: 500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "14px",
          width: "100%",
          maxWidth: "380px",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,.18)",
        }}
      >
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid #e4e1d9",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{ fontSize: "15px", fontWeight: 700, color: "#92400e" }}
            >
              <span style={{ display:"inline-flex", alignItems:"center", gap:7 }}><AppIcon name="scale" size={15} />Reconcile Balance</span>
            </div>
            <div
              style={{ fontSize: "11.5px", color: "#9ca3af", marginTop: "2px" }}
            >
              Adjust the actual savings balance
            </div>
          </div>
          <button
            aria-label="Close"
            onClick={onClose}
            style={{
              border: "none",
              background: "#f3f4f6",
              borderRadius: "6px",
              width: "26px",
              height: "26px",
              cursor: "pointer",
              color: "#4b5563",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AppIcon name="close" size={15} />
          </button>
        </div>
        <div
          style={{
            padding: "16px 18px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div style={{ fontSize: "13px", fontWeight: 700, color: "#111827" }}>
            {goal.name}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
            }}
          >
            <div
              style={{
                background: "#f7f8fa",
                border: "1px solid #e4e1d9",
                borderRadius: "10px",
                padding: "10px",
              }}
            >
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "#9ca3af",
                  textTransform: "uppercase",
                  letterSpacing: ".5px",
                }}
              >
                App Balance
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono), monospace",
                  fontWeight: 800,
                  color: "#1a5c42",
                  marginTop: "4px",
                }}
              >
                {fmt(goal.current)}
              </div>
            </div>
            <div
              style={{
                background: diff >= 0 ? "#f0fdf4" : "#fffbeb",
                border: `1px solid ${diff >= 0 ? "#bbf7d0" : "#fde68a"}`,
                borderRadius: "10px",
                padding: "10px",
              }}
            >
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "#9ca3af",
                  textTransform: "uppercase",
                  letterSpacing: ".5px",
                }}
              >
                Difference
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono), monospace",
                  fontWeight: 800,
                  color: diff >= 0 ? "#065f46" : "#b45309",
                  marginTop: "4px",
                }}
              >
                {diff === 0
                  ? "Rp 0"
                  : `${diff > 0 ? "+" : "−"}${fmt(Math.abs(diff))}`}
              </div>
            </div>
          </div>
          <div>
            <label
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "#6b7280",
                display: "block",
                marginBottom: "5px",
                textTransform: "uppercase" as const,
                letterSpacing: ".5px",
              }}
            >
              Actual Current Balance (Rp)
            </label>
            <input
              autoFocus
              type="text"
              inputMode="numeric"
              value={fmtDigits(actual)}
              onChange={(e) => setActual(digitsOnly(e.target.value))}
              style={{
                ...inp,
                fontFamily: "var(--font-mono), monospace",
                fontSize: "16px",
              }}
            />
          </div>
          <div>
            <label
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "#6b7280",
                display: "block",
                marginBottom: "5px",
                textTransform: "uppercase" as const,
                letterSpacing: ".5px",
              }}
            >
              Note
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={inp}
            />
          </div>
          <button
            disabled={actualNumber < 0 || diff === 0}
            onClick={() =>
              actualNumber >= 0 && diff !== 0 && onConfirm(actualNumber, note)
            }
            style={{
              background:
                actualNumber >= 0 && diff !== 0 ? "#92400e" : "#9ca3af",
              color: "#fff",
              border: "none",
              padding: "10px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 600,
              cursor:
                actualNumber >= 0 && diff !== 0 ? "pointer" : "not-allowed",
            }}
          >
            Save Reconcile
          </button>
          <div
            style={{ fontSize: "11.5px", color: "#9ca3af", lineHeight: 1.5 }}
          >
            If the actual balance is higher, the history entry becomes a deposit. If
            lower, it becomes a withdrawal.
          </div>
        </div>
      </div>
    </div>
  );
}

