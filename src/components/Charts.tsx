import { useState } from 'react';
import { DAY_SHORT, shortDate, weekday } from '../lib/dates';
import type { BranchStats, DayPoint } from '../lib/engine';
import { compactMoney, money, pct } from '../lib/format';

export const SERIES_COLORS = ['#111614', '#e2552f', '#1b8f5f', '#d98e1f', '#5b7cfa', '#8a5cc2', '#0f8ea0', '#9aa29c'];

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * p;
}

/** Daily bars: what came in vs what a usual day (adjusted for other branches) looked like. */
export function DailyChart({ days, currency }: { days: DayPoint[]; currency: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720;
  const H = 260;
  const pad = { l: 58, r: 12, t: 16, b: 34 };
  const max = niceMax(Math.max(...days.map((d) => Math.max(d.actual, d.expected, d.marketExpected))) * 1.08);
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const bw = iw / days.length;
  const y = (v: number) => pad.t + ih - (v / max) * ih;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const h = hover !== null ? days[hover] : null;

  return (
    <div style={{ position: 'relative' }}>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Daily revenue compared with a usual day">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#ece8de" />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end">
              {compactMoney(t, '').trim()}
            </text>
          </g>
        ))}
        {days.map((d, i) => {
          const x = pad.l + i * bw;
          const below = d.marketExpected > 0 && d.actual < d.marketExpected * 0.97;
          return (
            <g key={d.date} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} tabIndex={0}>
              <rect x={x} y={pad.t} width={bw} height={ih} fill={hover === i ? '#f6f3ec' : 'transparent'} />
              <rect x={x + bw * 0.2} y={y(d.actual)} width={bw * 0.6} height={Math.max(0, pad.t + ih - y(d.actual))} rx={5} fill={below ? '#e2552f' : '#111614'} />
              <line x1={x + bw * 0.12} x2={x + bw * 0.88} y1={y(d.expected)} y2={y(d.expected)} stroke="#8b938c" strokeWidth={2} strokeDasharray="4 3" />
              <circle cx={x + bw / 2} cy={y(d.marketExpected)} r={4.5} fill="#c6f25a" stroke="#2c3a06" strokeWidth={1.5} />
              <text x={x + bw / 2} y={H - 12} textAnchor="middle" style={{ fontWeight: 600, fill: '#2a312d' }}>
                {DAY_SHORT[weekday(d.date)]}
              </text>
            </g>
          );
        })}
      </svg>
      {h && (
        <div className="card-flat small" style={{ position: 'absolute', top: 4, right: 4, padding: '10px 12px', pointerEvents: 'none', boxShadow: 'var(--shadow)' }}>
          <strong>{shortDate(h.date)}</strong>
          <div>Actual: {money(h.actual, currency)}</div>
          <div className="muted">Usual: {money(h.expected, currency)}</div>
          <div className="muted">Expected after market: {money(h.marketExpected, currency)}</div>
          <div className={h.actual < h.marketExpected ? 'down' : 'up'}>{pct(h.marketExpected ? h.actual / h.marketExpected - 1 : 0)} vs expected</div>
        </div>
      )}
      <div className="legend" style={{ marginTop: 8 }}>
        <span><i style={{ background: '#111614' }} /> Revenue</span>
        <span><i style={{ background: '#e2552f' }} /> Below expected</span>
        <span><i style={{ background: 'transparent', borderTop: '2px dashed #8b938c', height: 0, borderRadius: 0 }} /> Usual for that weekday</span>
        <span><i style={{ background: '#c6f25a', borderRadius: '50%', border: '1.5px solid #2c3a06' }} /> Expected, given how other branches did</span>
      </div>
    </div>
  );
}

/** Horizontal bars: each branch vs its own usual week. */
export function BranchBars({ stats, selected, onSelect }: { stats: BranchStats[]; selected?: string; onSelect?: (b: string) => void }) {
  const sorted = [...stats].sort((a, b) => a.change - b.change);
  const maxAbs = Math.max(0.05, ...sorted.map((s) => Math.abs(s.change)));
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {sorted.map((s) => {
        const w = (Math.abs(s.change) / maxAbs) * 50;
        const neg = s.change < 0;
        return (
          <button
            key={s.branch}
            type="button"
            onClick={() => onSelect?.(s.branch)}
            style={{ display: 'grid', gridTemplateColumns: 'minmax(90px, 140px) 1fr 70px', alignItems: 'center', gap: 12, background: selected === s.branch ? 'var(--lime-2)' : 'transparent', border: 0, borderRadius: 10, padding: '6px 8px', cursor: onSelect ? 'pointer' : 'default', textAlign: 'left' }}
          >
            <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.branch}</span>
            <span style={{ position: 'relative', height: 14, background: 'var(--paper-2)', borderRadius: 99 }}>
              <span style={{ position: 'absolute', left: '50%', top: -3, bottom: -3, width: 1.5, background: 'var(--line-2)' }} />
              <span style={{ position: 'absolute', top: 0, bottom: 0, borderRadius: 99, background: neg ? 'var(--coral)' : 'var(--good)', left: neg ? `${50 - w}%` : '50%', width: `${w}%` }} />
            </span>
            <span className={`num ${neg ? 'down' : 'up'}`} style={{ fontWeight: 700, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {pct(s.change)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Weekly revenue lines, one per branch. */
export function TrendChart({ weeks, series, currency, highlight }: { weeks: string[]; series: { branch: string; values: number[] }[]; currency: string; highlight?: string }) {
  const W = 720;
  const H = 240;
  const pad = { l: 58, r: 16, t: 14, b: 30 };
  if (weeks.length < 2) return <p className="muted small">Add at least two weeks of sales to see a trend.</p>;
  const vals = series.flatMap((s) => s.values);
  const max = niceMax(Math.max(...vals) * 1.05);
  const rawMin = Math.min(...vals) * 0.85;
  const step = max / 10;
  const min = Math.max(0, Math.floor(rawMin / step) * step);
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const x = (i: number) => pad.l + (i / (weeks.length - 1)) * iw;
  const y = (v: number) => pad.t + ih - ((v - min) / (max - min || 1)) * ih;
  return (
    <div>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Weekly revenue by branch">
        {[0, 0.5, 1].map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(min + t * (max - min))} y2={y(min + t * (max - min))} stroke="#ece8de" />
            <text x={pad.l - 8} y={y(min + t * (max - min)) + 4} textAnchor="end">
              {compactMoney(min + t * (max - min), '').trim()}
            </text>
          </g>
        ))}
        {weeks.map((w, i) => (
          <text key={w} x={x(i)} y={H - 10} textAnchor="middle">
            {shortDate(w).slice(4)}
          </text>
        ))}
        {series.map((s, si) => {
          const c = SERIES_COLORS[si % SERIES_COLORS.length];
          const dim = highlight && highlight !== s.branch;
          const d = s.values.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ');
          return (
            <g key={s.branch} opacity={dim ? 0.28 : 1}>
              <path d={d} fill="none" stroke={c} strokeWidth={highlight === s.branch ? 3.5 : 2.2} strokeLinejoin="round" strokeLinecap="round" />
              {s.values.map((v, i) => (
                <circle key={i} cx={x(i)} cy={y(v)} r={3.2} fill="#fff" stroke={c} strokeWidth={2}>
                  <title>{`${s.branch}, week ending ${shortDate(weeks[i])}: ${money(v, currency)}`}</title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>
      <div className="legend" style={{ marginTop: 6 }}>
        {series.map((s, si) => (
          <span key={s.branch}>
            <i style={{ background: SERIES_COLORS[si % SERIES_COLORS.length] }} /> {s.branch}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Sparkline({ values, color = '#111614' }: { values: number[]; color?: string }) {
  if (values.length < 2) return null;
  const W = 90;
  const H = 28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${(i / (values.length - 1)) * W},${H - 3 - ((v - min) / span) * (H - 6)}`).join(' ');
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
