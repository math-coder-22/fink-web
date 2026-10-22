'use client';

import { useMemo, useRef, useState } from 'react';
import type { SavingsGoal } from '@/types/savings';

/* ─── Wealth progress chart ────────────────────────────────────────────────
   Reconstructs the total savings balance over time from each goal's
   transaction history. A goal's balance before its first recorded
   transaction is its creation balance (current − Σ history), held flat
   from createdAt. The series therefore ends exactly at today's total
   and steps at every recorded deposit / withdrawal / reconcile. */

type RangeKey = '1M' | '3M' | '6M' | '1Y' | 'ALL';
const RANGES: { key: RangeKey; label: string; days: number | null }[] = [
  { key: '1M', label: '1M', days: 30 },
  { key: '3M', label: '3M', days: 90 },
  { key: '6M', label: '6M', days: 182 },
  { key: '1Y', label: '1Y', days: 365 },
  { key: 'ALL', label: 'All', days: null },
];

const PALETTE = ['#1a5c42', '#2563eb', '#b45309', '#7c3aed', '#db2777', '#0e7490', '#65a30d', '#9333ea'];
const UNCATEGORIZED = 'Uncategorized';
const DAY = 86400000;

const fmtRp = (v: number) => 'Rp ' + Math.round(v).toLocaleString('id-ID');
const fmtSigned = (v: number) =>
  v === 0 ? fmtRp(0) : (v > 0 ? '+' : '\u2212') + fmtRp(Math.abs(v)).replace('Rp ', 'Rp ');
const fmtAxis = (v: number) => {
  if (v >= 1_000_000) {
    const jt = v / 1_000_000;
    return 'Rp ' + (jt >= 100 ? Math.round(jt).toString() : (Math.round(jt * 10) / 10).toString().replace('.', ',')) + 'jt';
  }
  if (v >= 1000) return 'Rp ' + Math.round(v / 1000) + 'rb';
  return fmtRp(v);
};
const fmtDate = (t: number) =>
  new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtTick = (t: number, long: boolean) =>
  long
    ? new Date(t).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
    : new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

interface GoalSeries {
  createdT: number;
  baseline: number;
  txs: { t: number; delta: number }[];
}

function toSeries(g: SavingsGoal): GoalSeries {
  const txs = (g.history || [])
    .map((tx) => ({ t: new Date(tx.date).getTime(), delta: tx.type === 'topup' ? tx.amount : -tx.amount }))
    .filter((tx) => Number.isFinite(tx.t))
    .sort((a, b) => a.t - b.t);
  const sum = txs.reduce((a, tx) => a + tx.delta, 0);
  return { createdT: new Date(g.createdAt).getTime(), baseline: (g.current || 0) - sum, txs };
}

function balanceAt(s: GoalSeries, t: number): number {
  if (!Number.isFinite(s.createdT) || t < s.createdT) return 0;
  let v = s.baseline;
  for (const tx of s.txs) {
    if (tx.t <= t) v += tx.delta;
    else break;
  }
  return v;
}

export default function WealthChart({ goals }: { goals: SavingsGoal[] }) {
  const [range, setRange] = useState<RangeKey>('6M');
  const [mode, setMode] = useState<'total' | 'categories'>('total');
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [hover, setHover] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const active = useMemo(() => goals.filter((g) => g.status === 'active'), [goals]);

  const model = useMemo(() => {
    const now = Date.now();
    const byCat = new Map<string, GoalSeries[]>();
    let earliest = Infinity;
    active.forEach((g) => {
      const s = toSeries(g);
      if (Number.isFinite(s.createdT)) earliest = Math.min(earliest, s.createdT);
      s.txs.forEach((tx) => (earliest = Math.min(earliest, tx.t)));
      const cat = (g.parent || '').trim() || UNCATEGORIZED;
      if (!byCat.has(cat)) byCat.set(cat, []);
      byCat.get(cat)!.push(s);
    });
    if (!Number.isFinite(earliest)) earliest = now;

    const def = RANGES.find((r) => r.key === range)!;
    const start = Math.max(def.days ? now - def.days * DAY : earliest, earliest);
    const end = now;

    // Event times inside the window + boundaries.
    const times = new Set<number>([start, end]);
    byCat.forEach((series) =>
      series.forEach((s) => {
        if (s.createdT > start && s.createdT < end) times.add(s.createdT);
        s.txs.forEach((tx) => {
          if (tx.t > start && tx.t < end) times.add(tx.t);
        });
      }),
    );
    const pts = [...times].sort((a, b) => a - b);

    // Category order: largest current balance at the bottom of the stack.
    const cats = [...byCat.entries()]
      .map(([name, series]) => ({ name, series, now: series.reduce((a, s) => a + balanceAt(s, end), 0) }))
      .sort((a, b) => {
        if (a.name === UNCATEGORIZED) return 1;
        if (b.name === UNCATEGORIZED) return -1;
        return b.now - a.now;
      });
    const colorOf = (name: string, idx: number) =>
      name === UNCATEGORIZED ? '#94a3b8' : PALETTE[idx % PALETTE.length];

    // values[pointIdx][catIdx], plus totals.
    const values = pts.map((t) => cats.map((c) => c.series.reduce((a, s) => a + balanceAt(s, t), 0)));
    const totals = values.map((row) => row.reduce((a, v) => a + v, 0));
    return { start, end, pts, cats, colorOf, values, totals };
  }, [active, range]);

  const { start, end, pts, cats, values, totals } = model;
  const visibleCats = cats.filter((c) => !hidden.has(c.name));
  const visibleIdx = cats.map((c, i) => (hidden.has(c.name) ? -1 : i)).filter((i) => i >= 0);

  // In categories mode with hidden categories, the stack (and its total)
  // covers visible categories only. Total mode always shows everything.
  const stackTotals = pts.map((_, pi) =>
    mode === 'categories' ? visibleIdx.reduce((a, ci) => a + values[pi][ci], 0) : totals[pi],
  );

  const firstTotal = stackTotals[0] ?? 0;
  const lastTotal = stackTotals[stackTotals.length - 1] ?? 0;
  const change = lastTotal - firstTotal;
  const changePct = firstTotal > 0 ? (change / firstTotal) * 100 : null;

  // Chart geometry.
  const W = 720;
  const H = 248;
  const padL = 66;
  const padR = 12;
  const padT = 12;
  const padB = 24;
  const iw = W - padL - padR;
  const ih = H - padT - padB;
  const rawMin = Math.min(...stackTotals, ...(mode === 'categories' ? [0] : []));
  const rawMax = Math.max(...stackTotals, 0);
  const span = Math.max(rawMax - rawMin, rawMax * 0.05, 1);
  const yMin = Math.max(0, rawMin - span * 0.08);
  const yMax = rawMax + span * 0.1;
  const x = (t: number) => padL + (end > start ? ((t - start) / (end - start)) * iw : iw / 2);
  const y = (v: number) => padT + (1 - (v - yMin) / (yMax - yMin || 1)) * ih;

  // Step-expanded coordinates for a per-point value series.
  const stepCoords = (series: number[]): [number, number][] => {
    const out: [number, number][] = [];
    pts.forEach((t, i) => {
      if (i === 0) out.push([x(t), y(series[i])]);
      else {
        out.push([x(t), y(series[i - 1])]);
        out.push([x(t), y(series[i])]);
      }
    });
    return out;
  };
  const toPath = (coords: [number, number][]) =>
    coords.map((c, i) => (i === 0 ? 'M' : 'L') + c[0].toFixed(1) + ',' + c[1].toFixed(1)).join(' ');

  const totalLine = toPath(stepCoords(stackTotals));
  const totalArea = totalLine + ` L${x(end).toFixed(1)},${y(yMin).toFixed(1)} L${x(start).toFixed(1)},${y(yMin).toFixed(1)} Z`;

  const catAreas = visibleIdx.map((ci) => {
    const bottom: number[] = [];
    const top: number[] = [];
    pts.forEach((_, pi) => {
      let b = 0;
      visibleIdx.forEach((vj) => {
        if (vj < ci) b += values[pi][vj];
      });
      bottom[pi] = b;
      top[pi] = b + values[pi][ci];
    });
    const topCoords = stepCoords(top);
    const bottomCoords = stepCoords(bottom).reverse();
    return {
      name: cats[ci].name,
      color: model.colorOf(cats[ci].name, ci),
      path: toPath(topCoords) + ' ' + bottomCoords.map((c, i) => (i === 0 ? 'L' : 'L') + c[0].toFixed(1) + ',' + c[1].toFixed(1)).join(' ') + ' Z',
    };
  });

  const yTicks = [0, 1, 2, 3].map((i) => yMin + ((yMax - yMin) * i) / 3);
  const longRange = end - start > 300 * DAY;
  const xTicks = [0, 1, 2, 3, 4].map((i) => start + ((end - start) * i) / 4);

  const hoverIdx = hover === null ? null : Math.max(0, Math.min(pts.length - 1, hover));
  const onMove = (e: React.PointerEvent) => {
    const el = wrapRef.current;
    if (!el || pts.length === 0) return;
    const rect = el.getBoundingClientRect();
    const frac = (e.clientX - rect.left) / rect.width;
    const px = frac * W;
    let best = 0;
    let bestD = Infinity;
    pts.forEach((t, i) => {
      const d = Math.abs(x(t) - px);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    setHover(best);
  };

  const toggleCat = (name: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  if (active.length === 0) return null;

  return (
    <div style={{ border: '1px solid #e3e7ee', borderRadius: '16px', background: '#fff', padding: '14px 16px', marginBottom: '14px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: '10px', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '10.5px', fontWeight: 850, color: '#64748b', letterSpacing: '.04em' }}>WEALTH PROGRESS</div>
          <div
            style={{
              fontSize: '15px',
              fontWeight: 800,
              color: change > 0 ? '#1a5c42' : change < 0 ? '#b91c1c' : '#111827',
              marginTop: '3px',
              fontFamily: 'var(--font-mono), monospace',
            }}
          >
            {fmtSigned(change)}
            {changePct !== null && (
              <span style={{ fontSize: '12px', fontWeight: 700 }}>
                {'  '}({change >= 0 ? '+' : '\u2212'}
                {Math.abs(changePct).toFixed(1).replace('.', ',')}%)
              </span>
            )}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
            {fmtDate(start)} {'\u2192'} {fmtDate(end)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <div className="view-toggle" role="group" aria-label="Chart mode">
            <button className={mode === 'total' ? 'active' : ''} onClick={() => setMode('total')}>
              Total
            </button>
            <button className={mode === 'categories' ? 'active' : ''} onClick={() => setMode('categories')}>
              Categories
            </button>
          </div>
          <div className="view-toggle" role="group" aria-label="Time range">
            {RANGES.map((r) => (
              <button key={r.key} className={range === r.key ? 'active' : ''} onClick={() => setRange(r.key)}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div ref={wrapRef} style={{ position: 'relative', marginTop: '8px', touchAction: 'pan-y' }} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Wealth progress chart">
          {yTicks.map((v, i) => (
            <g key={i}>
              <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke="#eef2f7" strokeWidth="1" />
              <text x={padL - 8} y={y(v) + 3.5} textAnchor="end" fontSize="10" fill="#94a3b8">
                {fmtAxis(v)}
              </text>
            </g>
          ))}
          {mode === 'total' ? (
            <>
              <path d={totalArea} fill="#1a5c42" opacity="0.1" />
              <path d={totalLine} fill="none" stroke="#1a5c42" strokeWidth="2.2" strokeLinejoin="round" />
            </>
          ) : (
            catAreas.map((a) => <path key={a.name} d={a.path} fill={a.color} opacity="0.82" stroke="#fff" strokeWidth="0.75" />)
          )}
          {hoverIdx !== null && pts[hoverIdx] !== undefined && (
            <g>
              <line x1={x(pts[hoverIdx])} x2={x(pts[hoverIdx])} y1={padT} y2={padT + ih} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />
              <circle cx={x(pts[hoverIdx])} cy={y(stackTotals[hoverIdx])} r="4" fill="#111827" stroke="#fff" strokeWidth="2" />
            </g>
          )}
          {xTicks.map((t, i) => (
            <text key={i} x={x(t)} y={H - 6} textAnchor={i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'} fontSize="10" fill="#94a3b8">
              {fmtTick(t, longRange)}
            </text>
          ))}
        </svg>

        {hoverIdx !== null && pts[hoverIdx] !== undefined && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: `${Math.min(86, Math.max(2, (x(pts[hoverIdx]) / W) * 100))}%`,
              transform: `translateX(${x(pts[hoverIdx]) / W > 0.7 ? '-104%' : '8%'})`,
              background: '#111827',
              color: '#f8fafc',
              borderRadius: '10px',
              padding: '9px 11px',
              fontSize: '11.5px',
              lineHeight: 1.55,
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              boxShadow: '0 10px 24px rgba(15,23,42,.25)',
              zIndex: 5,
            }}
          >
            <div style={{ fontWeight: 800, color: '#cbd5e1' }}>{fmtDate(pts[hoverIdx])}</div>
            {mode === 'categories' &&
              [...visibleIdx].reverse().map((ci) => (
                <div key={cats[ci].name} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: model.colorOf(cats[ci].name, ci), display: 'inline-block' }} />
                  <span style={{ flex: 1 }}>{cats[ci].name}</span>
                  <span style={{ fontFamily: 'var(--font-mono), monospace' }}>{fmtRp(values[hoverIdx][ci])}</span>
                </div>
              ))}
            <div style={{ display: 'flex', gap: '14px', borderTop: mode === 'categories' ? '1px solid #334155' : undefined, marginTop: mode === 'categories' ? '4px' : 0, paddingTop: mode === 'categories' ? '4px' : 0 }}>
              <span style={{ flex: 1, fontWeight: 700 }}>Total</span>
              <span style={{ fontFamily: 'var(--font-mono), monospace', fontWeight: 800 }}>{fmtRp(stackTotals[hoverIdx])}</span>
            </div>
          </div>
        )}
      </div>

      {mode === 'categories' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginTop: '10px' }}>
          {cats.map((c, ci) => {
            const isHidden = hidden.has(c.name);
            const startV = values[0][ci];
            const endV = values[values.length - 1][ci];
            const d = endV - startV;
            return (
              <button
                key={c.name}
                onClick={() => toggleCat(c.name)}
                title={isHidden ? 'Show ' + c.name : 'Hide ' + c.name}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  border: '1.5px solid #e3e7ee',
                  background: isHidden ? '#f8fafc' : '#fff',
                  opacity: isHidden ? 0.5 : 1,
                  borderRadius: '999px',
                  padding: '5px 11px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '12px',
                }}
              >
                <span style={{ width: '9px', height: '9px', borderRadius: '3px', background: model.colorOf(c.name, ci) }} />
                <span style={{ fontWeight: 800, color: '#111827' }}>{c.name}</span>
                <span style={{ color: '#64748b', fontFamily: 'var(--font-mono), monospace' }}>{fmtRp(endV)}</span>
                <span style={{ fontWeight: 700, color: d > 0 ? '#1a5c42' : d < 0 ? '#b91c1c' : '#94a3b8' }}>{fmtSigned(d)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
