import { useMemo } from 'react';
import { analyze, weeklySeries } from '../lib/engine';
import { addDays, rangeLabel } from '../lib/dates';
import { money, num, pct } from '../lib/format';
import { go, href, useRoute } from '../lib/router';
import { useStore } from '../lib/store';
import { useReport } from '../lib/useReport';
import { BranchBars, Sparkline, TrendChart } from '../components/Charts';
import { Page } from '../components/Layout';
import { WeekPicker } from '../components/Pickers';
import { IAlert, IArrow } from '../components/Icons';
import { NeedData } from './NeedData';

export function OverviewPage() {
  const { ws, hasData } = useStore();
  const { params } = useRoute();
  const { result, weeks, end } = useReport(undefined, params.get('end') ?? undefined);
  const cur = ws.settings.currency;
  const trend = useMemo(() => weeklySeries(ws.data, end, 6), [ws.data, end]);

  const flagged = useMemo(() => {
    if (!result.ok) return [];
    return result.report.allStats
      .filter((s) => s.relative <= -0.05)
      .sort((a, b) => a.relative - b.relative)
      .map((s) => {
        const r = analyze(ws.data, { end, branch: s.branch, baselineWeeks: ws.settings.baselineWeeks, currency: cur });
        return r.ok ? r.report : null;
      })
      .filter((x): x is NonNullable<typeof x> => !!x);
  }, [result, ws.data, end, ws.settings.baselineWeeks, cur]);

  if (!hasData) return <NeedData />;
  if (!result.ok)
    return (
      <Page title="Overview">
        <div className="notice">
          <IAlert /> <span>{result.error}</span>
        </div>
      </Page>
    );

  const r = result.report;
  const all = r.allStats;
  const totalA = all.reduce((a, s) => a + s.actual, 0);
  const totalE = all.reduce((a, s) => a + s.expected, 0);
  const totalO = all.reduce((a, s) => a + s.orders, 0);
  const best = [...all].sort((a, b) => b.change - a.change)[0];
  const worst = [...all].sort((a, b) => a.relative - b.relative)[0];
  const sparkFor = (b: string) => trend.series.find((s) => s.branch === b)?.values ?? [];

  return (
    <Page
      title={ws.settings.businessName ? `${ws.settings.businessName}` : 'Overview'}
      intro={`How every branch did in the week of ${rangeLabel(r.period.start, r.period.end)}, compared with its usual week.`}
      actions={<WeekPicker weeks={weeks} value={end} onChange={(v) => go('/overview', { end: v })} />}
    >
      <div className="grid g4">
        <div className="kpi">
          <div className="k-label">Revenue, all branches</div>
          <div className="k-value">{money(totalA, cur)}</div>
          <div className={`k-sub ${totalA < totalE ? 'down' : 'up'}`}>{pct(totalE ? totalA / totalE - 1 : 0)} vs usual</div>
        </div>
        <div className="kpi">
          <div className="k-label">Orders</div>
          <div className="k-value">{num(totalO)}</div>
          <div className="k-sub muted">{money(totalO ? totalA / totalO : 0, cur, 2)} average order</div>
        </div>
        <div className="kpi">
          <div className="k-label">Strongest branch</div>
          <div className="k-value" style={{ fontSize: 24 }}>{best.branch}</div>
          <div className={`k-sub ${best.change < 0 ? 'down' : 'up'}`}>{pct(best.change)} vs usual</div>
        </div>
        <div className="kpi" style={{ borderColor: worst.relative <= -0.05 ? '#f2c2b3' : undefined }}>
          <div className="k-label">Needs attention</div>
          <div className="k-value" style={{ fontSize: 24 }}>{worst.relative <= -0.05 ? worst.branch : 'None'}</div>
          <div className="k-sub muted">{worst.relative <= -0.05 ? `${pct(worst.relative)} behind the other branches` : 'All branches within 5% of each other'}</div>
        </div>
      </div>

      {flagged.length > 0 && (
        <div className="grid" style={{ marginTop: 18 }}>
          {flagged.map((f) => (
            <a key={f.branch} href={href('/explain', { branch: f.branch, end })} className="dark-card" style={{ textDecoration: 'none', display: 'block' }}>
              <div className="row between" style={{ alignItems: 'flex-start' }}>
                <div style={{ maxWidth: 760 }}>
                  <span className="pill pill-lime">Explanation ready</span>
                  <p className="headline" style={{ marginTop: 12, fontSize: 22, color: '#fff' }}>
                    {f.headline}
                  </p>
                  <p className="muted small" style={{ marginTop: 10 }}>
                    {f.drivers.length} possible reasons checked against your records · {f.actions.length} suggested actions
                  </p>
                </div>
                <span className="btn btn-lime">
                  See why <IArrow />
                </span>
              </div>
            </a>
          ))}
        </div>
      )}

      <div className="grid g2" style={{ marginTop: 18, alignItems: 'start' }}>
        <div className="card">
          <div className="card-title">
            <h3>Each branch vs its usual week</h3>
          </div>
          <BranchBars stats={all} onSelect={(b) => go('/explain', { branch: b, end })} />
          <p className="tiny muted" style={{ marginTop: 12 }}>
            “Usual” is the average of the same weekdays over the previous {ws.settings.baselineWeeks} weeks. Click a branch to see why.
          </p>
        </div>
        <div className="card">
          <div className="card-title">
            <h3>Weekly revenue</h3>
            <span className="tiny muted">Last {trend.weeks.length} weeks</span>
          </div>
          <TrendChart weeks={trend.weeks} series={trend.series} currency={cur} highlight={worst.relative <= -0.05 ? worst.branch : undefined} />
        </div>
      </div>

      <h2 className="section-title" style={{ marginTop: 30 }}>
        Branch scorecard
      </h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Branch</th>
              <th className="num">Revenue</th>
              <th className="num">vs usual</th>
              <th className="num">vs other branches</th>
              <th className="num">Orders</th>
              <th className="num">Avg order</th>
              <th className="num">Staff turned up</th>
              <th className="num">Stockout hours</th>
              <th className="num">Time closed</th>
              <th className="num">Rating</th>
              <th>Trend</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {[...all]
              .sort((a, b) => a.relative - b.relative)
              .map((s) => (
                <tr key={s.branch} className={s.relative <= -0.05 ? 'flag' : ''}>
                  <td style={{ fontWeight: 600 }} className="nowrap">
                    <span className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
                      <span className="dot" style={{ color: s.relative <= -0.05 ? 'var(--coral)' : s.relative >= 0.03 ? 'var(--good)' : 'var(--line-2)' }} />
                      {s.branch}
                    </span>
                  </td>
                  <td className="num">{money(s.actual, cur)}</td>
                  <td className={`num ${s.change < 0 ? 'down' : 'up'}`}>{pct(s.change)}</td>
                  <td className={`num ${s.relative < -0.02 ? 'down' : s.relative > 0.02 ? 'up' : ''}`}>{all.length > 1 ? pct(s.relative) : '—'}</td>
                  <td className="num">{num(s.orders)}</td>
                  <td className="num">{money(s.ticket, cur, 2)}</td>
                  <td className={`num ${s.staffFill !== null && s.staffFill < 0.92 ? 'down' : ''}`}>{s.staffFill === null ? '—' : `${Math.round(s.staffFill * 100)}%`}</td>
                  <td className={`num ${s.stockoutHours >= 8 ? 'down' : ''}`}>{ws.data.stock.length ? num(s.stockoutHours) : '—'}</td>
                  <td className={`num ${s.lostOpenMinutes >= 30 ? 'down' : ''}`}>{ws.data.hours.length ? `${num(s.lostOpenMinutes)} min` : '—'}</td>
                  <td className="num">
                    {s.rating === null ? '—' : `${s.rating.toFixed(1)}★`}
                    {s.rating !== null && s.baseRating !== null && s.rating < s.baseRating - 0.2 && <span className="down tiny"> ↓</span>}
                  </td>
                  <td>
                    <Sparkline values={sparkFor(s.branch)} color={s.relative <= -0.05 ? '#e2552f' : '#111614'} />
                  </td>
                  <td>
                    <a className="btn btn-quiet btn-sm" href={href('/explain', { branch: s.branch, end })}>
                      Explain
                    </a>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <p className="tiny muted" style={{ marginTop: 10 }}>
        Week shown: {rangeLabel(addDays(end!, -6), end!)}. Compared with {rangeLabel(r.period.baselineStart, r.period.baselineEnd)}.
      </p>
    </Page>
  );
}
