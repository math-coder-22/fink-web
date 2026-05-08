"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
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

const LEGACY_STORAGE_KEY = "fink_savings_goals";

function storageKey(userId: string) {
  return `fink_savings_goals:${userId}`;
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function parseGoals(raw: string | null): SavingsGoal[] {
  if (!raw) return [];
  try {
    const goals = JSON.parse(raw);
    if (!Array.isArray(goals)) return [];
    return goals.map((goal) => ({ ...goal, history: goal.history || [] }));
  } catch {
    return [];
  }
}

function loadGoalsForUser(userId: string): SavingsGoal[] {
  if (typeof window === "undefined") return [];

  const key = storageKey(userId);
  const existing = parseGoals(localStorage.getItem(key));

  if (existing.length > 0) return existing;

  // Migrasi satu kali dari key lama yang sebelumnya global.
  // Ini mencegah data akun lama tetap terbaca oleh akun lain di browser yang sama.
  const legacy = parseGoals(localStorage.getItem(LEGACY_STORAGE_KEY));
  if (legacy.length > 0) {
    localStorage.setItem(key, JSON.stringify(legacy));
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return legacy;
  }

  return [];
}

function saveGoalsForUser(userId: string, goals: SavingsGoal[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(userId), JSON.stringify(goals));
}

export function useSavings() {
  const [userId, setUserId] = useState<string | null>(null);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    async function init() {
      setLoaded(false);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (!user) {
        setUserId(null);
        setGoals([]);
        setLoaded(true);
        return;
      }

      const uidUser = user.id;
      setUserId(uidUser);
      setGoals(loadGoalsForUser(uidUser));
      setLoaded(true);
    }

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUserId = session?.user?.id ?? null;
      setUserId(nextUserId);
      setGoals(nextUserId ? loadGoalsForUser(nextUserId) : []);
      setLoaded(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const persist = useCallback(
    (next: SavingsGoal[]) => {
      if (!userId) return;
      setGoals(next);
      saveGoalsForUser(userId, next);
    },
    [userId],
  );

  const addGoal = useCallback(
    (data: Omit<SavingsGoal, "id" | "createdAt" | "updatedAt" | "history">) => {
      if (!userId) return;
      const now = new Date().toISOString();
      persist([
        ...goals,
        { ...data, id: uid(), history: [], createdAt: now, updatedAt: now },
      ]);
    },
    [goals, persist, userId],
  );

  const updateGoal = useCallback(
    (id: string, data: Partial<SavingsGoal>) => {
      if (!userId) return;
      persist(
        goals.map((g) =>
          g.id === id
            ? { ...g, ...data, updatedAt: new Date().toISOString() }
            : g,
        ),
      );
    },
    [goals, persist, userId],
  );

  const deleteGoal = useCallback(
    (id: string) => {
      if (!userId) return;
      persist(goals.filter((g) => g.id !== id));
    },
    [goals, persist, userId],
  );

  const topupGoal = useCallback(
    (id: string, amount: number, note = "Tambah dana") => {
      if (!userId) return;
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
            history: [tx, ...(g.history || [])],
            updatedAt: new Date().toISOString(),
          };
        }),
      );
    },
    [goals, persist, userId],
  );

  const withdrawGoal = useCallback(
    (id: string, amount: number, note = "Penarikan dana") => {
      if (!userId) return;
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
            history: [tx, ...(g.history || [])],
            updatedAt: new Date().toISOString(),
          };
        }),
      );
    },
    [goals, persist, userId],
  );

  const reconcileGoal = useCallback(
    (id: string, actual: number, note = "Reconcile saldo tabungan") => {
      if (!userId) return;
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
            history: [tx, ...(g.history || [])],
            updatedAt: new Date().toISOString(),
          };
        }),
      );
    },
    [goals, persist, userId],
  );

  const changeStatus = useCallback(
    (id: string, status: SavingsGoal["status"]) => {
      if (!userId) return;
      persist(
        goals.map((g) =>
          g.id === id
            ? { ...g, status, updatedAt: new Date().toISOString() }
            : g,
        ),
      );
    },
    [goals, persist, userId],
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
