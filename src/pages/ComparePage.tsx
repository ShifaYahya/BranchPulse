import { DAY_SHORT, rangeLabel, weekday } from '../lib/dates';
import type { BranchStats } from '../lib/engine';
import { money, num, pct } from '../lib/format';
import { go, href, useRoute } from '../lib/router';
import { useStore } from '../lib/store';
import { useReport } from '../lib/useReport';
import { Page } from '../components/Layout';
import { BranchPicker, WeekPicker } from '../components/Pickers';
import { IAlert } from '../components/Icons';
import { NeedData } from './NeedData';

type Metric = { label: string; get: (s: BranchStats) => number | null; fmt: (v: number) => string; better: 'high' | 'low' };

export function ComparePage() {
  const { ws, hasData } = useStore();
  const { params } = useRoute();
  const { result, weeks, branches, end } = useReport(undefined, params.get('end') ?? undefined);
  if (!hasData) return <NeedData />;
  if (!result.ok)
    return (
      <Page title="Compare branches">
        <div className="notice">
          <IAlert /> <span>{result.error}</span>
        </div>
      </Page>
    );
  const cur = ws.settings.currency;
  const all = result.report.allStats;
  const sorted = [...all].sort((x, y) => y.actual - x.actual);
  const a = all.find((s) => s.branch === params.get('a')) ?? sorted[0];
  const b = all.find((s) => s.branch === params.get('b')) ?? [...all].sort((x, y) => x.relative - y.relative).find((s) => s.branch !== a.branch) ?? sorted[1] ?? a;
  const set = (p: { a?: string; b?: string; end?: string }) => go('/compare', { a: p.a ?? a.branch, b: p.b ?? b.branch, end: p.end ?? end });

  const metrics: Metric[] = [
    { label: 'Revenue', get: (s) => s.actual, fmt: (v) => money(v, cur), better: 'high' },
    { label: 'vs usual week', get: (s) => s.change, fmt: (v) => pct(v), better: 'high' },
    { label: 'Orders', get: (s) => s.orders, fmt: (v) => num(v), better: 'high' },
    { label: 'Average order', get: (s) => s.ticket, fmt: (v) => money(v, cur, 2), better: 'high' },
    { label: 'Staff turned up', get: (s) => s.staffFill, fmt: (v) => `${Math.round(v * 100)}%`, better: 'high' },
    { label: 'Stockout hours', get: (s) => (ws.data.stock.length ? s.stockoutHours : null), fmt: (v) => num(v), better: 'low' },
    { label: 'Time closed (late/early)', get: (s) => (ws.data.hours.length ? s.lostOpenMinutes : null), fmt: (v) => `${num(v)} min`, better: 'low' },
    { label: 'Average rating', get: (s) => s.rating, fmt: (v) => `${v.toFixed(2)}★`, better: 'high' },
    { label: 'Reviews', get: (s) => (ws.data.feedback.length ? s.reviews : null), fmt: (v) => num(v), better: 'high' },
  ];

  const maxDay = Math.max(1, ...a.days.map((d) => d.actual), ...b.days.map((d) => d.actual));

  return (
    <Page
      title="Compare branches"
      intro={`Put two branches side by side for ${rangeLabel(result.report.period.start, result.report.period.end)}.`}
      actions={<WeekPicker weeks={weeks} value={end} onChange={(v) => set({ end: v })} />}
    >
      {all.length < 2 ? (
        <div className="notice info">
          <IAlert /> <span>You need at least two branches with sales data to compare.</span>
        </div>
      ) : (
        <>
          <div className="toolbar" style={{ marginBottom: 18 }}>
            <BranchPicker branches={branches} value={a.branch} onChange={(v) => set({ a: v })} label="Branch A" />
            <span className="faint">vs</span>
            <BranchPicker branches={branches} value={b.branch} onChange={(v) => set({ b: v })} label="Branch B" />
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>This week</th>
                  <th className="num">{a.branch}</th>
                  <th className="num">{b.branch}</th>
                  <th className="num">Difference</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((m) => {
                  const va = m.get(a);
                  const vb = m.get(b);
                  const both = va !== null && vb !== null;
                  const aBetter = both && (m.better === 'high' ? va! > vb! : va! < vb!);
                  const bBetter = both && (m.better === 'high' ? vb! > va! : vb! < va!);
                  const diff = both ? (m.label === 'vs usual week' ? pct(vb! - va!) : va ? pct(vb! / va! - 1) : '—') : '—';
                  return (
                    <tr key={m.label}>
                      <td style={{ fontWeight: 600 }}>{m.label}</td>
                      <td className={`num ${aBetter ? 'up' : ''}`} style={{ fontWeight: aBetter ? 700 : 400 }}>
                        {va === null ? '—' : m.fmt(va)}
                      </td>
                      <td className={`num ${bBetter ? 'up' : ''}`} style={{ fontWeight: bBetter ? 700 : 400 }}>
                        {vb === null ? '—' : m.fmt(vb)}
                      </td>
                      <td className="num muted">{diff}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="tiny muted" style={{ marginTop: 8 }}>
            Difference shows Branch B relative to Branch A. Green marks the better value.
          </p>

          <div className="card" style={{ marginTop: 18 }}>
            <div className="card-title">
              <h3>Daily revenue</h3>
              <div className="legend">
                <span><i style={{ background: '#111614' }} /> {a.branch}</span>
                <span><i style={{ background: '#e2552f' }} /> {b.branch}</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10, alignItems: 'end', height: 200 }}>
              {a.days.map((d, i) => {
                const db = b.days[i];
                return (
                  <div key={d.date} style={{ display: 'grid', gridTemplateRows: '1fr auto', height: '100%', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, justifyContent: 'center' }}>
                      <div title={`${a.branch}: ${money(d.actual, cur)}`} style={{ width: '38%', height: `${(d.actual / maxDay) * 100}%`, background: '#111614', borderRadius: '5px 5px 0 0', minHeight: 2 }} />
                      <div title={`${b.branch}: ${money(db?.actual ?? 0, cur)}`} style={{ width: '38%', height: `${((db?.actual ?? 0) / maxDay) * 100}%`, background: '#e2552f', borderRadius: '5px 5px 0 0', minHeight: 2 }} />
                    </div>
                    <div className="tiny center" style={{ fontWeight: 600 }}>
                      {DAY_SHORT[weekday(d.date)]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="row" style={{ marginTop: 18 }}>
            <a className="btn btn-ghost" href={href('/explain', { branch: a.branch, end })}>
              Explain {a.branch}
            </a>
            <a className="btn btn-primary" href={href('/explain', { branch: b.branch, end })}>
              Explain {b.branch}
            </a>
          </div>
        </>
      )}
    </Page>
  );
}
