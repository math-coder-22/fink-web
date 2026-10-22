'use client';

import { useMemo, useRef, useState } from 'react';
import type { SavingsGoal } from '@/types/savings';

/* ─── Wealth progress ──────────────────────────────────────────────────────
   Two-column card: balance chart (left, wide) + Total Balance / This Month
   (right). The series is the total savings balance sampled daily from each
   goal's transaction history; a goal's balance before its first recorded
   transaction is its creation balance (current − Σ history), held flat
   from createdAt, so the line ends exactly at today's total. */

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
const fmtSigned = (v: number) => (v === 0 ? fmtRp(0) : (v > 0 ? '+' : '\u2212') + fmtRp(Math.abs(v)));
const fmtAxis = (v: number) => {
  if (v >= 1_000_000) {
    const jt = v / 1_000_000;
    return 'Rp ' + (jt >= 100 ? Math.round(jt).toString() : (Math.round(jt * 10) / 10).toString().replace('.', ',')) + 'jt';
  }
  if (v >= 1000) return 'Rp ' + Math.round(v / 1000) + 'rb';
  return fmtRp(v);
};
const fmtDate = (t: number) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
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

/* Catmull-Rom → cubic bezier, with control-point Y clamped to the segment's
   own Y range so the curve never overshoots above/below its endpoints. */
function smoothPath(coords: [number, number][]): string {
  if (coords.length < 2) return coords.length ? `M${coords[0][0]},${coords[0][1]}` : '';
  let d = `M${coords[0][0].toFixed(1)},${coords[0][1].toFixed(1)}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[Math.max(0, i - 1)];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[Math.min(coords.length - 1, i + 2)];
    const lo = Math.min(p1[1], p2[1]);
    const hi = Math.max(p1[1], p2[1]);
    const clampY = (v: number) => Math.min(hi, Math.max(lo, v));
    const c1: [number, number] = [p1[0] + (p2[0] - p0[0]) / 6, clampY(p1[1] + (p2[1] - p0[1]) / 6)];
    const c2: [number, number] = [p2[0] - (p3[0] - p1[0]) / 6, clampY(p2[1] - (p3[1] - p1[1]) / 6)];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

export default function WealthChart({
  goals,
  totalBalance,
  count,
  monthIn,
  monthOut,
}: {
  goals: SavingsGoal[];
  totalBalance: number;
  count: number;
  monthIn: number;
  monthOut: number;
}) {
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

    // Daily samples (stride keeps the point count ≤ ~240 on long ranges).
    const totalDays = Math.max(1, Math.ceil((end - start) / DAY));
    const stride = Math.max(1, Math.ceil(totalDays / 240));
    const pts: number[] = [];
    for (let t = start; t < end; t += stride * DAY) pts.push(t);
    if (pts.length === 0 || pts[pts.length - 1] !== end) pts.push(end);

    const cats = [...byCat.entries()]
      .map(([name, series]) => ({ name, series, now: series.reduce((a, s) => a + balanceAt(s, end), 0) }))
      .sort((a, b) => {
        if (a.name === UNCATEGORIZED) return 1;
        if (b.name === UNCATEGORIZED) return -1;
        return b.now - a.now;
      });
    const colorOf = (name: string, idx: number) => (name === UNCATEGORIZED ? '#94a3b8' : PALETTE[idx % PALETTE.length]);

    const values = pts.map((t) => cats.map((c) => c.series.reduce((a, s) => a + balanceAt(s, t), 0)));
    const totals = values.map((row) => row.reduce((a, v) => a + v, 0));
    return { start, end, pts, cats, colorOf, values, totals };
  }, [active, range]);

  const { start, end, pts, cats, values, totals } = model;
  const visibleIdx = cats.map((c, i) => (hidden.has(c.name) ? -1 : i)).filter((i) => i >= 0);
  const stackTotals = pts.map((_, pi) =>
    mode === 'categories' ? visibleIdx.reduce((a, ci) => a + values[pi][ci], 0) : totals[pi],
  );
  const firstTotal = stackTotals[0] ?? 0;
  const lastTotal = stackTotals[stackTotals.length - 1] ?? 0;
  const change = lastTotal - firstTotal;
  const changePct = firstTotal > 0 ? (change / firstTotal) * 100 : null;

  // Geometry.
  const W = 720;
  const H = 232;
  const padL = 62;
  const padR = 10;
  const padT = 10;
  const padB = 22;
  const iw = W - padL - padR;
  const ih = H - padT - padB;
  const rawMin = Math.min(...stackTotals);
  const rawMax = Math.max(...stackTotals, 0);
  const span = Math.max(rawMax - rawMin, rawMax * 0.05, 1);
  const yMin = mode === 'categories' ? 0 : Math.max(0, rawMin - span * 0.08);
  const yMax = rawMax + span * 0.1;
  const x = (t: number) => padL + (end > start ? ((t - start) / (end - start)) * iw : iw / 2);
  const y = (v: number) => padT + (1 - (v - yMin) / (yMax - yMin || 1)) * ih;
  const coordsOf = (series: number[]): [number, number][] => pts.map((t, i) => [x(t), y(series[i])]);

  const totalLinePath = smoothPath(coordsOf(stackTotals));
  const totalAreaPath = totalLinePath + ` L${x(end).toFixed(1)},${y(yMin).toFixed(1)} L${x(start).toFixed(1)},${y(yMin).toFixed(1)} Z`;

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
    const topPath = smoothPath(coordsOf(top));
    const bottomPath = smoothPath(coordsOf(bottom).reverse()).replace(/^M/, 'L');
    return { name: cats[ci].name, color: model.colorOf(cats[ci].name, ci), path: topPath + ' ' + bottomPath + ' Z' };
  });

  const yTicks = [0, 1, 2, 3].map((i) => yMin + ((yMax - yMin) * i) / 3);
  const longRange = end - start > 300 * DAY;
  const xTicks = [0, 1, 2, 3, 4].map((i) => start + ((end - start) * i) / 4);
  const hoverIdx = hover === null ? null : Math.max(0, Math.min(pts.length - 1, hover));

  const onMove = (e: React.PointerEvent) => {
    const el = wrapRef.current;
    if (!el || pts.length === 0) return;
    const rect = el.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
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

  const net = monthIn - monthOut;
  const label: React.CSSProperties = { fontSize: '10.5px', fontWeight: 850, color: '#64748b', letterSpacing: '.04em' };
  const big: React.CSSProperties = { fontSize: '19px', fontWeight: 950, color: '#111827', fontFamily: 'var(--font-mono), monospace', marginTop: '2px' };

  if (active.length === 0) return null;

  return (
    <div style={{ border: '1px solid #e3e7ee', borderRadius: '16px', background: '#fff', padding: '16px', marginBottom: '14px' }}>
      <div className="wealth-layout">
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
              <span style={label}>WEALTH PROGRESS</span>
              <span
                style={{
                  fontSize: '12.5px',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono), monospace',
                  color: change > 0 ? '#1a5c42' : change < 0 ? '#b91c1c' : '#64748b',
                }}
              >
                {fmtSigned(change)}
                {changePct !== null && (
                  <span style={{ fontWeight: 700 }}>
                    {' '}
                    ({change >= 0 ? '+' : '\u2212'}
                    {Math.abs(changePct).toFixed(1).replace('.', ',')}%)
                  </span>
                )}
              </span>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                {fmtDate(start)} {'\u2192'} {fmtDate(end)}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
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

          <div ref={wrapRef} style={{ position: 'relative', marginTop: '6px', touchAction: 'pan-y' }} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Wealth progress chart">
              <defs>
                <linearGradient id="wealthFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1a5c42" stopOpacity="0.16" />
                  <stop offset="100%" stopColor="#1a5c42" stopOpacity="0.01" />
                </linearGradient>
              </defs>
              {yTicks.map((v, i) => (
                <g key={i}>
                  <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke="#f1f5f9" strokeWidth="1" />
                  <text x={padL - 8} y={y(v) + 3} textAnchor="end" fontSize="9.5" fill="#a3aebc">
                    {fmtAxis(v)}
                  </text>
                </g>
              ))}
              {mode === 'total' ? (
                <>
                  <path d={totalAreaPath} fill="url(#wealthFill)" />
                  <path d={totalLinePath} fill="none" stroke="#1a5c42" strokeWidth="1.8" strokeLinecap="round" />
                </>
              ) : (
                catAreas.map((a) => <path key={a.name} d={a.path} fill={a.color} opacity="0.85" />)
              )}
              {hoverIdx !== null && pts[hoverIdx] !== undefined && (
                <g>
                  <line x1={x(pts[hoverIdx])} x2={x(pts[hoverIdx])} y1={padT} y2={padT + ih} stroke="#e2e8f0" strokeWidth="1" />
                  <circle cx={x(pts[hoverIdx])} cy={y(stackTotals[hoverIdx])} r="3.5" fill="#1a5c42" stroke="#fff" strokeWidth="1.8" />
                </g>
              )}
              {xTicks.map((t, i) => (
                <text key={i} x={x(t)} y={H - 5} textAnchor={i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'} fontSize="9.5" fill="#a3aebc">
                  {fmtTick(t, longRange)}
                </text>
              ))}
            </svg>

            {hoverIdx !== null && pts[hoverIdx] !== undefined && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: `${Math.min(88, Math.max(1, (x(pts[hoverIdx]) / W) * 100))}%`,
                  transform: `translateX(${x(pts[hoverIdx]) / W > 0.68 ? '-105%' : '10%'})`,
                  background: '#fff',
                  border: '1px solid #e3e7ee',
                  color: '#111827',
                  borderRadius: '10px',
                  padding: '8px 10px',
                  fontSize: '11px',
                  lineHeight: 1.6,
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 8px 20px rgba(15,23,42,.10)',
                  zIndex: 5,
                }}
              >
                <div style={{ fontWeight: 800, color: '#64748b', fontSize: '10.5px' }}>{fmtDate(pts[hoverIdx])}</div>
                {mode === 'categories' &&
                  [...visibleIdx].reverse().map((ci) => (
                    <div key={cats[ci].name} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '7px', height: '7px', borderRadius: '2px', background: model.colorOf(cats[ci].name, ci), display: 'inline-block' }} />
                      <span style={{ flex: 1, color: '#475569' }}>{cats[ci].name}</span>
                      <span style={{ fontFamily: 'var(--font-mono), monospace' }}>{fmtRp(values[hoverIdx][ci])}</span>
                    </div>
                  ))}
                <div
                  style={{
                    display: 'flex',
                    gap: '14px',
                    borderTop: mode === 'categories' ? '1px solid #f1f5f9' : undefined,
                    marginTop: mode === 'categories' ? '3px' : 0,
                    paddingTop: mode === 'categories' ? '3px' : 0,
                  }}
                >
                  <span style={{ flex: 1, fontWeight: 700, color: '#475569' }}>Total</span>
                  <span style={{ fontFamily: 'var(--font-mono), monospace', fontWeight: 800 }}>{fmtRp(stackTotals[hoverIdx])}</span>
                </div>
              </div>
            )}
          </div>

          {mode === 'categories' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
              {cats.map((c, ci) => {
                const isHidden = hidden.has(c.name);
                const d = values[values.length - 1][ci] - values[0][ci];
                return (
                  <button
                    key={c.name}
                    onClick={() => toggleCat(c.name)}
                    title={isHidden ? 'Show ' + c.name : 'Hide ' + c.name}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      border: '1.5px solid #e3e7ee',
                      background: isHidden ? '#f8fafc' : '#fff',
                      opacity: isHidden ? 0.5 : 1,
                      borderRadius: '999px',
                      padding: '4px 10px',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      fontSize: '11.5px',
                    }}
                  >
                    <span style={{ width: '8px', height: '8px', borderRadius: '2.5px', background: model.colorOf(c.name, ci) }} />
                    <span style={{ fontWeight: 800, color: '#111827' }}>{c.name}</span>
                    <span style={{ color: '#64748b', fontFamily: 'var(--font-mono), monospace' }}>{fmtRp(values[values.length - 1][ci])}</span>
                    <span style={{ fontWeight: 700, color: d > 0 ? '#1a5c42' : d < 0 ? '#b91c1c' : '#94a3b8' }}>{fmtSigned(d)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="wealth-side">
          <div>
            <div style={label}>TOTAL BALANCE</div>
            <div style={big}>{fmtRp(totalBalance)}</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>across {count} savings</div>
          </div>
          <div>
            <div style={label}>THIS MONTH</div>
            <div style={{ ...big, color: net > 0 ? '#1a5c42' : net < 0 ? '#b91c1c' : '#111827' }}>
              {net === 0 ? fmtRp(0) : (net > 0 ? '+' : '\u2212') + fmtRp(Math.abs(net))}
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
              In {fmtRp(monthIn)} · Out {fmtRp(monthOut)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
