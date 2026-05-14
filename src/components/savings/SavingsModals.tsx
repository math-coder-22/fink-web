"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import type { SavingsGoal } from "@/types/savings";

const fmt = (n: number) =>
  "Rp " + Math.abs(Math.round(n || 0)).toLocaleString("id-ID");

export function TopupModal({
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
        if (e.target === e.currentTarget) onClose();
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
          <div style={{ fontSize: "15px", fontWeight: 700, color: "#1a5c42" }}>
            ↑ Setor Dana
          </div>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "#f3f4f6",
              borderRadius: "6px",
              width: "26px",
              height: "26px",
              cursor: "pointer",
              fontSize: "15px",
            }}
          >
            ×
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
            Terkumpul: {fmt(goal.current)} / {fmt(goal.target)}
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
              Jumlah Setor (Rp)
            </label>
            <input
              autoFocus
              type="number"
              min="0"
              placeholder="500.000"
              value={amt}
              onChange={(e) => setAmt(e.target.value)}
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
              Keterangan (opsional)
            </label>
            <input
              type="text"
              placeholder="Gaji bulan ini..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={inp}
            />
          </div>
          <button
            onClick={() =>
              parseFloat(amt) > 0 && onConfirm(parseFloat(amt), note)
            }
            style={{
              background: "#1a5c42",
              color: "#fff",
              border: "none",
              padding: "10px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Setor {amt ? fmt(parseFloat(amt) || 0) : "Dana"}
          </button>
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
        if (e.target === e.currentTarget) onClose();
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
          <div style={{ fontSize: "15px", fontWeight: 700, color: "#b45309" }}>
            ↓ Tarik Dana
          </div>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "#f3f4f6",
              borderRadius: "6px",
              width: "26px",
              height: "26px",
              cursor: "pointer",
              fontSize: "15px",
            }}
          >
            ×
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
            Dana tersedia:{" "}
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
            Tarik semua ({fmt(goal.current)})
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
                Jumlah Tarik (Rp)
              </label>
              <input
                autoFocus
                type="number"
                min="0"
                max={goal.current}
                placeholder="500.000"
                value={amt}
                onChange={(e) => setAmt(e.target.value)}
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
                  Melebihi dana tersedia
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
              Keterangan (opsional)
            </label>
            <input
              type="text"
              placeholder="Dipakai untuk..."
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
            Tarik {actualAmt > 0 ? fmt(actualAmt) : "Dana"}
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
  const [note, setNote] = useState("Reconcile saldo tabungan");
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
        if (e.target === e.currentTarget) onClose();
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
              ⚖ Reconcile Saldo
            </div>
            <div
              style={{ fontSize: "11.5px", color: "#9ca3af", marginTop: "2px" }}
            >
              Sesuaikan saldo aktual Smart Saving
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "#f3f4f6",
              borderRadius: "6px",
              width: "26px",
              height: "26px",
              cursor: "pointer",
              fontSize: "15px",
            }}
          >
            ×
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
                Saldo App
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
                Selisih
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
              Saldo Aktual Saat Ini (Rp)
            </label>
            <input
              autoFocus
              type="number"
              min="0"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
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
              Keterangan
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
            Simpan Reconcile
          </button>
          <div
            style={{ fontSize: "11.5px", color: "#9ca3af", lineHeight: 1.5 }}
          >
            Jika saldo aktual lebih besar, riwayat akan menjadi setor dana. Jika
            lebih kecil, riwayat akan menjadi tarik dana.
          </div>
        </div>
      </div>
    </div>
  );
}

export function SummaryCard({
  summary,
}: {
  summary: {
    totalTarget: number;
    totalCollected: number;
    totalMonthly: number;
    pct: number;
    count: number;
  };
}) {
  const { totalTarget, totalCollected, totalMonthly, pct, count } = summary;
  return (
    <div className="savings-summary-card">
      <div className="savings-summary-top">
        <div className="savings-summary-block">
          <div className="savings-summary-label">Total Dana Terkumpul</div>
          <div className="savings-summary-value">{fmt(totalCollected)}</div>
          <div className="savings-summary-note">dari {fmt(totalTarget)}</div>
        </div>

        <div className="savings-summary-block">
          <div className="savings-summary-label">Kebutuhan/Bulan</div>
          <div className="savings-summary-value">{fmt(totalMonthly)}</div>
          <div className="savings-summary-note">{count} goal aktif</div>
        </div>

        <div className="savings-summary-progress-wrap">
          <div className="savings-summary-label">Progress Keseluruhan</div>
          <div className="savings-progress-line">
            <div
              className="savings-progress-fill"
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "10.5px",
              opacity: 0.74,
            }}
          >
            <span>Akumulasi semua target</span>
            <span
              style={{
                fontFamily: "var(--font-mono), monospace",
                fontWeight: 800,
              }}
            >
              {Math.round(pct)}%
            </span>
          </div>
        </div>
      </div>

      <div className="savings-summary-tip">
        {count === 0
          ? "💡 Belum ada goal aktif. Tambah goal untuk mulai merencanakan tabungan."
          : `💡 Butuh ${fmt(totalMonthly)}/bulan untuk mencapai semua ${count} target aktif.`}
      </div>
    </div>
  );
}
