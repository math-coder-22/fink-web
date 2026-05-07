"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  SavingsGoal,
  GoalCalcResult,
  GoalTransaction,
} from "@/types/savings";

export function monthsBetween(from: Date, to: Date): number {
  return Math.max(
    1,
    (to.getFullYear() - from.getFullYear()) * 12 +
      (to.getMonth() - from.getMonth()),
  );
}

export function pmt(annualRate: number, nper: number, pv: number): number {
  if (nper <= 0) return pv;
  if (!annualRate || annualRate === 0) return pv / nper;
  const r = annualRate / 100 / 12;
  return (pv * r * Math.pow(1 + r, nper)) / (Math.pow(1 + r, nper) - 1);
}

export function futureValue(
  currentVal: number,
  inflationRate: number,
  years: number,
): number {
  if (years <= 0) return currentVal;
  return currentVal * Math.pow(1 + inflationRate / 100, years);
}

export function calcGoal(g: SavingsGoal): GoalCalcResult {
  const now = new Date();
  const deadline = g.deadline ? new Date(g.deadline) : null;
  const months = deadline ? monthsBetween(now, deadline) : 60;
  const sisa = Math.max(0, g.target - g.current);
  const progress = g.target > 0 ? Math.min(1, g.current / g.target) : 0;

  let monthlyNeeded = 0;
  if (sisa > 0 && months > 0) {
    monthlyNeeded = pmt(g.useInvest ? g.returnRate || 8 : 0, months, sisa);
  }

  let trackStatus: GoalCalcResult["trackStatus"] = "ontrack";
  if (progress >= 1) trackStatus = "complete";
  else if (g.monthly > 0 && monthlyNeeded > 0) {
    if (g.monthly >= monthlyNeeded * 1.1) trackStatus = "ahead";
    else if (g.monthly < monthlyNeeded * 0.85) trackStatus = "behind";
  }

  let coverage: number | undefined;
  let coverageStatus: GoalCalcResult["coverageStatus"];
  let excessDana: number | undefined;
  if (g.type === "darurat" && g.expense && g.expense > 0) {
    coverage = g.current / g.expense;
    excessDana = Math.max(0, g.current - 6 * g.expense);
    if (coverage < 3) coverageStatus = "Risiko Tinggi";
    else if (coverage <= 6) coverageStatus = "Cukup Aman";
    else coverageStatus = "Aman";
  }

  return {
    sisa,
    progress,
    months,
    monthlyNeeded,
    trackStatus,
    coverage,
    coverageStatus,
    excessDana,
  };
}

const STORAGE_KEY = "fink_savings_goals";
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function loadGoals(): SavingsGoal[] {
  if (typeof window === "undefined") return [];
  try {
    const r = localStorage.getItem(STORAGE_KEY);
    return r ? JSON.parse(r) : [];
  } catch {
    return [];
  }
}
function saveGoals(goals: SavingsGoal[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
}

function makeDemoGoals(): SavingsGoal[] {
  const now = new Date();
  const iso = (y: number, m: number) =>
    new Date(y, m, 1).toISOString().split("T")[0];
  return [
    {
      id: uid(),
      name: "Dana Darurat Keluarga",
      type: "darurat",
      status: "active",
      target: 30000000,
      current: 18500000,
      monthly: 1500000,
      deadline: iso(now.getFullYear(), now.getMonth() + 8),
      useInvest: false,
      returnRate: 0,
      expense: 5000000,
      coverageTarget: 6,
      history: [
        {
          id: uid(),
          type: "topup",
          amount: 10000000,
          note: "Setoran awal",
          date: new Date(
            now.getFullYear(),
            now.getMonth() - 3,
            1,
          ).toISOString(),
        },
        {
          id: uid(),
          type: "topup",
          amount: 5000000,
          note: "Bonus tahunan",
          date: new Date(
            now.getFullYear(),
            now.getMonth() - 2,
            5,
          ).toISOString(),
        },
        {
          id: uid(),
          type: "topup",
          amount: 3500000,
          note: "Tabungan rutin",
          date: new Date(
            now.getFullYear(),
            now.getMonth() - 1,
            1,
          ).toISOString(),
        },
      ],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: uid(),
      name: "Pendidikan S1 Anak",
      type: "pendidikan",
      status: "active",
      target: 180000000,
      current: 45000000,
      monthly: 2500000,
      deadline: iso(now.getFullYear() + 10, 0),
      useInvest: true,
      returnRate: 10,
      eduCurrent: 100000000,
      eduInflasi: 8,
      history: [
        {
          id: uid(),
          type: "topup",
          amount: 20000000,
          note: "Setoran awal",
          date: new Date(now.getFullYear() - 1, 0, 1).toISOString(),
        },
        {
          id: uid(),
          type: "topup",
          amount: 25000000,
          note: "THR",
          date: new Date(now.getFullYear(), 3, 1).toISOString(),
        },
      ],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: uid(),
      name: "Dana Pensiun",
      type: "pensiun",
      status: "active",
      target: 3000000000,
      current: 120000000,
      monthly: 5000000,
      deadline: iso(now.getFullYear() + 20, 0),
      useInvest: true,
      returnRate: 12,
      pensionExp: 15000000,
      pensionInflasi: 5,
      history: [
        {
          id: uid(),
          type: "topup",
          amount: 120000000,
          note: "Setoran awal",
          date: new Date(now.getFullYear() - 1, 0, 1).toISOString(),
        },
      ],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: uid(),
      name: "Renovasi Rumah",
      type: "biasa",
      status: "pending",
      target: 80000000,
      current: 5000000,
      monthly: 3000000,
      deadline: iso(now.getFullYear() + 2, 0),
      useInvest: false,
      returnRate: 0,
      history: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: uid(),
      name: "Tabungan Umroh",
      type: "biasa",
      status: "complete",
      target: 25000000,
      current: 25000000,
      monthly: 0,
      deadline: "",
      useInvest: false,
      returnRate: 0,
      history: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
  ];
}

export function useSavings() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let g = loadGoals();
    // migrate old goals without history
    g = g.map((goal) => ({ ...goal, history: goal.history || [] }));
    if (g.length === 0) {
      g = makeDemoGoals();
      saveGoals(g);
    }
    setGoals(g);
    setLoaded(true);
  }, []);

  const persist = useCallback((next: SavingsGoal[]) => {
    setGoals(next);
    saveGoals(next);
  }, []);

  const addGoal = useCallback(
    (data: Omit<SavingsGoal, "id" | "createdAt" | "updatedAt" | "history">) => {
      const now = new Date().toISOString();
      persist([
        ...goals,
        { ...data, id: uid(), history: [], createdAt: now, updatedAt: now },
      ]);
    },
    [goals, persist],
  );

  const updateGoal = useCallback(
    (id: string, data: Partial<SavingsGoal>) => {
      persist(
        goals.map((g) =>
          g.id === id
            ? { ...g, ...data, updatedAt: new Date().toISOString() }
            : g,
        ),
      );
    },
    [goals, persist],
  );

  const deleteGoal = useCallback(
    (id: string) => {
      persist(goals.filter((g) => g.id !== id));
    },
    [goals, persist],
  );

  const topupGoal = useCallback(
    (id: string, amount: number, note = "Tambah dana") => {
      persist(
        goals.map((g) => {
          if (g.id !== id) return g;
          const newCurrent = g.current + amount;
          const tx: GoalTransaction = {
            id: uid(),
            type: "topup",
            amount,
            note,
            date: new Date().toISOString(),
          };
          const status = newCurrent >= g.target ? "complete" : g.status;
          return {
            ...g,
            current: newCurrent,
            status,
            history: [tx, ...g.history],
            updatedAt: new Date().toISOString(),
          };
        }),
      );
    },
    [goals, persist],
  );

  const withdrawGoal = useCallback(
    (id: string, amount: number, note = "Penarikan dana") => {
      persist(
        goals.map((g) => {
          if (g.id !== id) return g;
          const newCurrent = Math.max(0, g.current - amount);
          const tx: GoalTransaction = {
            id: uid(),
            type: "withdraw",
            amount,
            note,
            date: new Date().toISOString(),
          };
          const status =
            newCurrent < g.target && g.status === "complete"
              ? "active"
              : g.status;
          return {
            ...g,
            current: newCurrent,
            status,
            history: [tx, ...g.history],
            updatedAt: new Date().toISOString(),
          };
        }),
      );
    },
    [goals, persist],
  );

  const reconcileGoal = useCallback(
    (id: string, actual: number, note = "Reconcile saldo tabungan") => {
      persist(
        goals.map((g) => {
          if (g.id !== id) return g;
          const safeActual = Math.max(0, actual);
          const diff = safeActual - g.current;
          if (diff === 0) return g;
          const tx: GoalTransaction = {
            id: uid(),
            type: diff > 0 ? "topup" : "withdraw",
            amount: Math.abs(diff),
            note:
              note ||
              `Reconcile saldo ke ${safeActual.toLocaleString("id-ID")}`,
            date: new Date().toISOString(),
          };
          const status =
            safeActual >= g.target
              ? "complete"
              : g.status === "complete"
                ? "active"
                : g.status;
          return {
            ...g,
            current: safeActual,
            status,
            history: [tx, ...g.history],
            updatedAt: new Date().toISOString(),
          };
        }),
      );
    },
    [goals, persist],
  );

  const changeStatus = useCallback(
    (id: string, status: SavingsGoal["status"]) => {
      persist(
        goals.map((g) =>
          g.id === id
            ? { ...g, status, updatedAt: new Date().toISOString() }
            : g,
        ),
      );
    },
    [goals, persist],
  );

  const summary = (() => {
    const active = goals.filter((g) => g.status === "active");
    const totalTarget = active.reduce((s, g) => s + g.target, 0);
    const totalCollected = active.reduce((s, g) => s + g.current, 0);
    const totalMonthly = active.reduce(
      (s, g) => s + calcGoal(g).monthlyNeeded,
      0,
    );
    const pct = totalTarget > 0 ? (totalCollected / totalTarget) * 100 : 0;
    return {
      totalTarget,
      totalCollected,
      totalMonthly,
      pct,
      count: active.length,
    };
  })();

  return {
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
    calcGoal,
  };
}
