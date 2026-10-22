'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { AdvisorSummary } from '@/lib/finance/summary';

/* ─── Financial Checkup (simplified) ───────────────────────────────────────
   One card on the Overview page: score + one-line verdict, three key
   ratios, up to three things that need attention, up to three priorities.
   Data comes from the same /api/advisor/summary the old Advisor page used;
   everything else from that page (trade-offs, per-goal lists, 3-month
   tables) is intentionally left out to keep this readable at a glance. */

const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const TONE: Record<string, { dot: string; bg: string; color: string }> = {
  good: { dot: '#1a5c42', bg: '#f0fdf4', color: '#166534' },
  warning: { dot: '#b45309', bg: '#fffbeb', color: '#92400e' },
  danger: { dot: '#b91c1c', bg: '#fef2f2', color: '#991b1b' },
  neutral: { dot: '#94a3b8', bg: '#f8fafc', color: '#475569' },
};

const pct = (v: number) => (Math.round(v * 10) / 10).toString().replace('.', ',') + '%';

function deltaLine(value: number | null, goodWhenUp: boolean) {
  if (value === null || !Number.isFinite(value)) return null;
  const up = value >= 0;
  const good = goodWhenUp ? up : !up;
  return (
    <div style={{ fontSize: '10.5px', fontWeight: 700, color: good ? '#15803d' : '#b91c1c', marginTop: '2px' }}>
      {up ? '\u2191' : '\u2193'} {Math.abs(Math.round(value))}% vs last month
    </div>
  );
}

const label: React.CSSProperties = { fontSize: '10.5px', fontWeight: 850, color: '#64748b', letterSpacing: '.04em' };

export default function CheckupCard() {
  const [summary, setSummary] = useState<AdvisorSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async (signal: AbortSignal) => {
    const now = new Date();
    const month = MONTH_KEYS[now.getMonth()];
    const year = now.getFullYear();
    const res = await fetch(`/api/advisor/summary?month=${month}&year=${year}`, { cache: 'no-store', signal });
    if (!res.ok) throw new Error('checkup failed');
    const json = await res.json();
    return (json.data || null) as AdvisorSummary | null;
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setFailed(false);
    load(controller.signal)
      .then((data) => setSummary(data))
      .catch((err) => {
        if (err?.name !== 'AbortError') setFailed(true);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [load, reloadKey]);

  if (loading) {
    return (
      <div aria-busy="true" aria-label="Loading financial checkup" style={{ marginBottom: '14px' }}>
        <div className="fink-skeleton" style={{ height: 172 }} />
      </div>
    );
  }

  if (failed || !summary) {
    return (
      <div
        id="financial-checkup"
        style={{ border: '1px solid #e3e7ee', borderRadius: '16px', background: '#fff', padding: '14px 16px', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}
      >
        <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600 }}>Financial Checkup couldn&apos;t be loaded right now.</span>
        <button
          onClick={() => setReloadKey((k) => k + 1)}
          style={{ border: '1.5px solid #e3e7ee', background: '#fff', color: '#374151', fontWeight: 700, borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', flexShrink: 0 }}
        >
          Retry
        </button>
      </div>
    );
  }

  const noData = summary.statusLabel === 'Belum ada data';
  const tone = TONE[summary.status] || TONE.neutral;
  const attention = summary.risks.filter((r) => r.tone === 'warning' || r.tone === 'danger').slice(0, 3);
  const priorities = summary.priorities.slice(0, 3);

  const stats: { name: string; value: number; delta: number | null; goodWhenUp: boolean }[] = [
    { name: 'Saving rate', value: summary.ratios.savingRate, delta: summary.deltas.savingRateVsPrev, goodWhenUp: true },
    { name: 'Expense rate', value: summary.ratios.expenseRate, delta: summary.deltas.expenseVsPrev, goodWhenUp: false },
    { name: 'Debt ratio', value: summary.ratios.debtRatio, delta: null, goodWhenUp: false },
  ];

  return (
    <section
      id="financial-checkup"
      style={{ border: '1px solid #e3e7ee', borderRadius: '16px', background: '#fff', padding: '16px', marginBottom: '14px', scrollMarginTop: '16px' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
        <div style={{ textAlign: 'center', flexShrink: 0, minWidth: '64px' }}>
          <div style={{ fontSize: '30px', fontWeight: 950, lineHeight: 1, color: '#111827', fontFamily: 'var(--font-mono), monospace' }}>
            {noData ? '—' : Math.round(summary.score)}
          </div>
          <div style={{ fontSize: '9.5px', fontWeight: 800, color: '#94a3b8', letterSpacing: '.05em', marginTop: '3px' }}>SCORE / 100</div>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={label}>FINANCIAL CHECKUP</span>
            <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '99px', background: tone.bg, color: tone.color }}>
              {summary.statusLabel}
            </span>
          </div>
          <p style={{ margin: '5px 0 0', fontSize: '13px', lineHeight: 1.55, color: '#334155' }}>
            {noData ? 'Belum ada data bulan ini. Catat transaksi di Journal untuk melihat checkup keuanganmu.' : summary.mainInsight}
          </p>
        </div>
      </div>

      {!noData && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px', marginTop: '14px', paddingTop: '13px', borderTop: '1px solid #f1f5f9' }}>
            {stats.map((st) => (
              <div key={st.name}>
                <div style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', letterSpacing: '.04em', textTransform: 'uppercase' }}>{st.name}</div>
                <div style={{ fontSize: '16px', fontWeight: 900, color: '#111827', fontFamily: 'var(--font-mono), monospace', marginTop: '2px' }}>{pct(st.value)}</div>
                {deltaLine(st.delta, st.goodWhenUp)}
              </div>
            ))}
          </div>

          <div style={{ marginTop: '14px', paddingTop: '13px', borderTop: '1px solid #f1f5f9' }}>
            <div style={label}>NEEDS ATTENTION</div>
            {attention.length === 0 ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginTop: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '99px', background: TONE.good.dot, marginTop: '5px', flexShrink: 0 }} />
                <span style={{ fontSize: '12.5px', color: '#334155', lineHeight: 1.5 }}>All indicators look fine this month.</span>
              </div>
            ) : (
              attention.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginTop: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '99px', background: (TONE[r.tone] || TONE.neutral).dot, marginTop: '5px', flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 750, color: '#111827' }}>{r.title}</span>
                    <span style={{ fontSize: '12.5px', color: '#64748b', lineHeight: 1.5 }}> — {r.detail}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {priorities.length > 0 && (
            <div style={{ marginTop: '14px', paddingTop: '13px', borderTop: '1px solid #f1f5f9' }}>
              <div style={label}>THIS MONTH&apos;S PRIORITIES</div>
              {priorities.map((pr, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginTop: '8px' }}>
                  <span
                    style={{
                      fontSize: '9.5px',
                      fontWeight: 800,
                      padding: '2px 7px',
                      borderRadius: '99px',
                      marginTop: '1px',
                      flexShrink: 0,
                      background: pr.level === 'high' ? '#fef2f2' : pr.level === 'medium' ? '#fffbeb' : '#f8fafc',
                      color: pr.level === 'high' ? '#991b1b' : pr.level === 'medium' ? '#92400e' : '#475569',
                      textTransform: 'uppercase',
                      letterSpacing: '.3px',
                    }}
                  >
                    {pr.level}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 750, color: '#111827' }}>{pr.title}</span>
                    <span style={{ fontSize: '12.5px', color: '#64748b', lineHeight: 1.5 }}> — {pr.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: '14px', paddingTop: '11px', borderTop: '1px solid #f1f5f9' }}>
            <Link href="/goals" style={{ fontSize: '12px', fontWeight: 800, color: '#1a5c42', textDecoration: 'none' }}>
              Open Wallets {'\u2192'}
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
