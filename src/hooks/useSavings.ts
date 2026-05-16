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
  // Backward-compatible helper:
  // monthly payment needed to accumulate a future value from zero.
  if (nper <= 0) return pv;
  if (!annualRate || annualRate === 0) return pv / nper;
  const r = annualRate / 100 / 12;
  return (pv * r) / (Math.pow(1 + r, nper) - 1);
}

export function futureValue(
  currentVal: number,
  inflationRate: number,
  years: number,
): number {
  if (years <= 0) return currentVal;
  return currentVal * Math.pow(1 + inflationRate / 100, years);
}

function yearsUntil(deadline: string): number {
  if (!deadline) return 0;
  return Math.max(
    0,
    (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 365),
  );
}

function effectiveTarget(g: SavingsGoal): number {
  if (g.type === "darurat" && g.expense && g.coverageTarget) {
    return Math.max(0, g.expense * g.coverageTarget);
  }

  if (g.type === "pendidikan" && g.eduCurrent && g.deadline) {
    return futureValue(g.eduCurrent, g.eduInflasi || 8, yearsUntil(g.deadline));
  }

  if (g.type === "pensiun" && g.pensionExp && g.deadline) {
    const futureAnnualExpense = futureValue(
      g.pensionExp * 12,
      g.pensionInflasi || 5,
      yearsUntil(g.deadline),
    );
    return 25 * futureAnnualExpense;
  }

  return Math.max(0, g.target || 0);
}

function monthlyForFutureTarget(
  annualRate: number,
  nper: number,
  targetFutureValue: number,
  currentBalance: number,
): number {
  if (nper <= 0) return Math.max(0, targetFutureValue - currentBalance);

  if (!annualRate || annualRate === 0) {
    return Math.max(0, targetFutureValue - currentBalance) / nper;
  }

  const r = annualRate / 100 / 12;
  const futureValueOfCurrent = currentBalance * Math.pow(1 + r, nper);
  const gap = Math.max(0, targetFutureValue - futureValueOfCurrent);

  if (gap <= 0) return 0;
  return (gap * r) / (Math.pow(1 + r, nper) - 1);
}

export function calcGoal(g: SavingsGoal): GoalCalcResult {
  const now = new Date();
  const deadline = g.deadline ? new Date(g.deadline) : null;
  const months = deadline ? monthsBetween(now, deadline) : 60;
  const targetNow = effectiveTarget(g);
  const sisa = Math.max(0, targetNow - g.current);
  const progress = targetNow > 0 ? Math.min(1, g.current / targetNow) : 0;

  let monthlyNeeded = 0;
  if (sisa > 0 && months > 0) {
    monthlyNeeded = g.useInvest
      ? monthlyForFutureTarget(g.returnRate || 8, months, targetNow, g.current)
      : sisa / months;
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
    targetNow,
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

function migratedKey(userId: string) {
  return `fink_savings_migrated:${userId}`;
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function normalizeGoal(goal: SavingsGoal): SavingsGoal {
  return {
    ...goal,
    history: goal.history || [],
    focus: Boolean(goal.focus),
    priorityMode: goal.priorityMode || 'auto',
    manualPriority: goal.manualPriority || 'medium',
    createdAt: goal.createdAt || new Date().toISOString(),
    updatedAt: goal.updatedAt || new Date().toISOString(),
  };
}

function parseGoals(raw: string | null): SavingsGoal[] {
  if (!raw) return [];
  try {
    const goals = JSON.parse(raw);
    if (!Array.isArray(goals)) return [];
    return goals.map((goal) => normalizeGoal({ ...goal, history: goal.history || [] }));
  } catch {
    return [];
  }
}

function loadLegacyGoalsForUser(userId: string): SavingsGoal[] {
  if (typeof window === "undefined") return [];

  const perUser = parseGoals(localStorage.getItem(storageKey(userId)));
  if (perUser.length > 0) return perUser;

  const legacy = parseGoals(localStorage.getItem(LEGACY_STORAGE_KEY));
  return legacy;
}

function markMigrated(userId: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(migratedKey(userId), "1");
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}

function hasMigrated(userId: string) {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(migratedKey(userId)) === "1";
}

async function fetchGoalsFromServer(): Promise<SavingsGoal[]> {
  const res = await fetch("/api/savings", { cache: "no-store" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Gagal memuat Smart Saving");
  return (json.goals || []).map(normalizeGoal);
}

async function saveGoalToServer(goal: SavingsGoal) {
  const res = await fetch("/api/savings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ goal }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Gagal menyimpan Smart Saving");
  return normalizeGoal(json.goal || goal);
}

async function saveGoalsToServer(goals: SavingsGoal[]) {
  const res = await fetch("/api/savings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ goals }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Gagal menyimpan Smart Saving");
  return (json.goals || goals).map(normalizeGoal);
}

async function deleteGoalFromServer(id: string) {
  const res = await fetch(`/api/savings?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Gagal menghapus Smart Saving");
}

export function useSavings() {
  const [userId, setUserId] = useState<string | null>(null);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readOnly, setReadOnly] = useState(false);

  const blockReadOnly = useCallback(() => {
    alert('Mode Monitoring bersifat read-only. Keluar dari monitoring untuk mengubah data.');
  }, []);

  useEffect(() => {
    let alive = true;
    async function loadMonitoringStatus() {
      try {
        const res = await fetch('/api/admin/monitoring/status', { cache: 'no-store' });
        if (!res.ok) return;
        const json = await res.json();
        if (alive) setReadOnly(Boolean(json.monitoring));
      } catch {
        // optional
      }
    }
    loadMonitoringStatus();
    return () => {
      alive = false;
    };
  }, []);

  const loadForCurrentUser = useCallback(async (uidUser: string) => {
    setLoaded(false);
    setError(null);

    try {
      let remoteGoals = await fetchGoalsFromServer();

      // Migrasi satu kali dari localStorage lama ke Supabase.
      // Setelah itu Supabase menjadi single source of truth.
      if (!readOnly && remoteGoals.length === 0 && !hasMigrated(uidUser)) {
        const legacyGoals = loadLegacyGoalsForUser(uidUser);
        if (legacyGoals.length > 0) {
          await saveGoalsToServer(legacyGoals);
          remoteGoals = await fetchGoalsFromServer();
        }
        markMigrated(uidUser);
      }

      setGoals(remoteGoals);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat Smart Saving");
      setGoals([]);
    } finally {
      setLoaded(true);
    }
  }, []);

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

      setUserId(user.id);
      await loadForCurrentUser(user.id);
    }

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUserId = session?.user?.id ?? null;
      setUserId(nextUserId);

      if (!nextUserId) {
        setGoals([]);
        setLoaded(true);
        return;
      }

      loadForCurrentUser(nextUserId);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadForCurrentUser]);

  const persistAll = useCallback(
    async (next: SavingsGoal[]) => {
      if (!userId) return;
      if (readOnly) { blockReadOnly(); return; }
      const normalized = next.map(normalizeGoal);
      setGoals(normalized);
      try {
        await saveGoalsToServer(normalized);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal menyimpan Smart Saving");
      }
    },
    [userId, readOnly, blockReadOnly],
  );

  const addGoal = useCallback(
    async (data: Omit<SavingsGoal, "id" | "createdAt" | "updatedAt" | "history">) => {
      if (!userId) return;
      if (readOnly) { blockReadOnly(); return; }
      const now = new Date().toISOString();
      const goal: SavingsGoal = normalizeGoal({
        ...data,
        id: uid(),
        history: [],
        createdAt: now,
        updatedAt: now,
      });

      setGoals((prev) => [goal, ...prev]);

      try {
        await saveGoalToServer(goal);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal menambah Smart Saving");
      }
    },
    [userId, readOnly, blockReadOnly],
  );

  const updateGoal = useCallback(
    async (id: string, data: Partial<SavingsGoal>) => {
      if (!userId) return;
      const updatedAt = new Date().toISOString();
      const next = goals.map((g) =>
        g.id === id ? normalizeGoal({ ...g, ...data, updatedAt }) : g,
      );
      await persistAll(next);
    },
    [goals, persistAll, userId],
  );

  const deleteGoal = useCallback(
    async (id: string) => {
      if (!userId) return;
      if (readOnly) { blockReadOnly(); return; }
      const previous = goals;
      setGoals(goals.filter((g) => g.id !== id));
      try {
        await deleteGoalFromServer(id);
      } catch (e) {
        setGoals(previous);
        setError(e instanceof Error ? e.message : "Gagal menghapus Smart Saving");
      }
    },
    [goals, userId, readOnly, blockReadOnly],
  );

  const topupGoal = useCallback(
    async (id: string, amount: number, note = "Tambah dana") => {
      if (!userId) return;
      const next = goals.map((g) => {
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
        return normalizeGoal({
          ...g,
          current: newCurrent,
          status,
          history: [tx, ...(g.history || [])],
          updatedAt: new Date().toISOString(),
        });
      });
      await persistAll(next);
    },
    [goals, persistAll, userId],
  );

  const withdrawGoal = useCallback(
    async (id: string, amount: number, note = "Penarikan dana") => {
      if (!userId) return;
      const next = goals.map((g) => {
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
          newCurrent < g.target && g.status === "complete" ? "active" : g.status;
        return normalizeGoal({
          ...g,
          current: newCurrent,
          status,
          history: [tx, ...(g.history || [])],
          updatedAt: new Date().toISOString(),
        });
      });
      await persistAll(next);
    },
    [goals, persistAll, userId],
  );

  const reconcileGoal = useCallback(
    async (id: string, actual: number, note = "Reconcile saldo tabungan") => {
      if (!userId) return;
      const next = goals.map((g) => {
        if (g.id !== id) return g;
        const safeActual = Math.max(0, actual);
        const diff = safeActual - g.current;
        if (diff === 0) return g;
        const tx: GoalTransaction = {
          id: uid(),
          type: diff > 0 ? "topup" : "withdraw",
          amount: Math.abs(diff),
          note: note || `Reconcile saldo ke ${safeActual.toLocaleString("id-ID")}`,
          date: new Date().toISOString(),
        };
        const status =
          safeActual >= g.target
            ? "complete"
            : g.status === "complete"
              ? "active"
              : g.status;
        return normalizeGoal({
          ...g,
          current: safeActual,
          status,
          history: [tx, ...(g.history || [])],
          updatedAt: new Date().toISOString(),
        });
      });
      await persistAll(next);
    },
    [goals, persistAll, userId],
  );

  const changeStatus = useCallback(
    async (id: string, status: SavingsGoal["status"]) => {
      if (!userId) return;
      const next = goals.map((g) =>
        g.id === id ? normalizeGoal({ ...g, status, updatedAt: new Date().toISOString() }) : g,
      );
      await persistAll(next);
    },
    [goals, persistAll, userId],
  );

  const summary = (() => {
    const active = goals.filter((g) => g.status === "active");
    const totalTarget = active.reduce((s, g) => s + calcGoal(g).targetNow, 0);
    const totalCollected = active.reduce((s, g) => s + g.current, 0);
    const totalMonthly = active.reduce((s, g) => s + calcGoal(g).monthlyNeeded, 0);
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
    error,
    readOnly,
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
