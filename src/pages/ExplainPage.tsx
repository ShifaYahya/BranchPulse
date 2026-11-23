import { useMemo, useState } from 'react';
import { generateBrief, reportToText, type AiResult } from '../lib/ai';
import { rangeLabel, shortDate } from '../lib/dates';
import type { Driver, Report, SuggestedAction } from '../lib/engine';
import { copyText, downloadText } from '../lib/download';
import { money, num, pct } from '../lib/format';
import { go, href, useRoute } from '../lib/router';
import { useStore } from '../lib/store';
import { useReport } from '../lib/useReport';
import { DailyChart } from '../components/Charts';
import { Evidence, useUI } from '../components/Feedback';
import { BranchPicker, WeekPicker } from '../components/Pickers';
import { DRIVER_ICON, IAlert, ICheck, ICopy, IDownload, IPlus, IPrint, ISpark } from '../components/Icons';
import { NeedData } from './NeedData';

export function ExplainPage() {
  const { ws, hasData } = useStore();
  const { params } = useRoute();
  const branchParam = params.get('branch') ?? undefined;
  const { result, weeks, branches, end } = useReport(branchParam, params.get('end') ?? undefined);

  if (!hasData) return <NeedData />;

  const nav = (p: { branch?: string; end?: string }) => go('/explain', { branch: p.branch ?? branchParam, end: p.end ?? end });

  return (
    <div className="page">
      <div className="container">
        <div className="page-head no-print">
          <div>
            <div className="eyebrow">Branch explanation</div>
            <h1 style={{ marginTop: 4 }}>{result.ok ? result.report.branch : 'Explain a branch'}</h1>
            {result.ok && <p>{rangeLabel(result.report.period.start, result.report.period.end)}</p>}
          </div>
          <div className="row">
            <BranchPicker branches={branches} value={branchParam} onChange={(b) => go('/explain', { branch: b || undefined, end })} auto />
            <WeekPicker weeks={weeks} value={end} onChange={(e) => nav({ end: e })} />
          </div>
        </div>
        {result.ok ? (
          <ReportView report={result.report} businessName={ws.settings.businessName} />
        ) : (
          <div className="notice">
            <IAlert /> <span>{result.error}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ReportView({ report: r, businessName }: { report: Report; businessName: string }) {
  const { toast } = useUI();
  const cur = r.currency;
  const s = r.stats;
  const multi = r.allStats.length > 1;
  const named = r.drivers.filter((d) => d.key !== 'unexplained');
  const maxImpact = Math.max(1, ...r.drivers.map((d) => d.impact));

  return (
    <>
      <div className="print-only" style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 20 }}>BranchPulse · {businessName || 'Branch report'}</div>
        <div>
          {r.branch} · {rangeLabel(r.period.start, r.period.end)}
        </div>
      </div>

      <section className="dark-card">
        <div className="row between" style={{ alignItems: 'flex-start' }}>
          <p className="headline" style={{ color: '#fff', maxWidth: 820 }}>
            {r.headline}
          </p>
          <div className="row no-print">
            <button
              className="btn btn-lime btn-sm"
              onClick={async () => toast((await copyText(reportToText(r, businessName))) ? 'Brief copied. Paste it into WhatsApp, email or Slack.' : 'Could not copy. Try Download instead.')}
            >
              <ICopy /> Copy brief
            </button>
            <button className="btn btn-sm" style={{ background: '#1d5342', color: '#fff' }} onClick={() => window.print()}>
              <IPrint /> Print / PDF
            </button>
            <button
              className="btn btn-sm"
              style={{ background: '#1d5342', color: '#fff' }}
              onClick={() => downloadText(`branchpulse-${r.branch.replace(/\s+/g, '-').toLowerCase()}-${r.period.end}.txt`, reportToText(r, businessName), 'text/plain')}
            >
              <IDownload /> .txt
            </button>
          </div>
        </div>
        <div className="grid g4" style={{ marginTop: 22 }}>
          <DarkStat label="Revenue" value={money(s.actual, cur)} sub={`usual ${money(s.expected, cur)}`} />
          <DarkStat label="vs its usual week" value={pct(s.change)} tone={s.change < 0 ? 'bad' : 'good'} />
          <DarkStat label="vs other branches" value={multi ? pct(s.relative) : '—'} tone={s.relative < 0 ? 'bad' : 'good'} sub={multi ? `others ${pct(s.peerChange)}` : 'single branch'} />
          <DarkStat label="Orders · avg order" value={num(s.orders)} sub={`${money(s.ticket, cur, 2)} (usual ${money(s.baseTicket, cur, 2)})`} />
        </div>
      </section>

      <section className="card" style={{ marginTop: 18 }}>
        <div className="card-title">
          <h3>Day by day</h3>
          <span className="tiny muted">Hover a day for numbers</span>
        </div>
        <DailyChart days={s.days} currency={cur} />
      </section>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', marginTop: 18, alignItems: 'start' }} data-stack>
        <section className="card">
          <div className="card-title">
            <h3>Why it happened</h3>
            <span className="tiny muted">Biggest effect first</span>
          </div>
          {r.drivers.length === 0 ? (
            <p className="muted">Nothing unusual found. This branch performed in line with its usual week{multi ? ' and the other branches' : ''}.</p>
          ) : (
            <div>
              {r.drivers.map((d) => (
                <DriverRow key={d.key} d={d} cur={cur} maxImpact={maxImpact} />
              ))}
            </div>
          )}
        </section>

        <aside className="stack">
          <div className="card-flat">
            <h3 style={{ fontSize: 17, marginBottom: 8 }}>Fewer customers or smaller orders?</h3>
            <p className="small">{r.changeBreakdown.text}</p>
            <div className="grid g2" style={{ marginTop: 12, gap: 10 }}>
              <MiniStat label="From order count" v={r.changeBreakdown.ordersEffect} cur={cur} />
              <MiniStat label="From order size" v={r.changeBreakdown.ticketEffect} cur={cur} />
            </div>
          </div>
          <div className="card-flat">
            <h3 style={{ fontSize: 17, marginBottom: 8 }}>Was it the whole market?</h3>
            <p className="small">{r.market.text}</p>
            {r.market.evidence.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <Evidence ids={r.market.evidence} title="Events affecting every branch" />
              </div>
            )}
          </div>
          {r.ruledOut.length > 0 && (
            <div className="card-flat">
              <h3 style={{ fontSize: 17, marginBottom: 8 }}>Checked and ruled out</h3>
              <ul className="details" style={{ marginTop: 0 }}>
                {r.ruledOut.map((x, i) => (
                  <li key={i}>
                    {x.text} <Evidence ids={x.evidence} max={2} />
                  </li>
                ))}
              </ul>
            </div>
          )}
          {r.dataNotes.length > 0 && (
            <div className="notice info">
              <IAlert />
              <div className="small">
                <strong>Missing pieces</strong>
                <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
                  {r.dataNotes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
                <a href="#/data" className="no-print" style={{ fontWeight: 600 }}>
                  Add files
                </a>
              </div>
            </div>
          )}
        </aside>
      </div>

      {r.actions.length > 0 && <ActionsCard r={r} />}

      {named.length > 0 && <AiCard r={r} businessName={businessName} />}

      <section style={{ marginTop: 26 }}>
        <h2 className="section-title">Daily briefs</h2>
        <div className="timeline">
          {r.days.map((d) => (
            <div key={d.date} className={`day ${d.status}`}>
              <div>
                <strong>{shortDate(d.date)}</strong>
                <div className="tiny muted">{d.status === 'down' ? 'Below expected' : d.status === 'up' ? 'Above expected' : 'As expected'}</div>
              </div>
              <ul className="details" style={{ margin: 0 }}>
                {d.lines.map((l, i) => (
                  <li key={i}>
                    {l.text} <Evidence ids={l.evidence} max={3} />
                  </li>
                ))}
              </ul>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700 }}>{money(d.actual, cur)}</div>
                <div className={`tiny ${d.actual < d.marketExpected * 0.97 ? 'down' : 'muted'}`}>
                  {pct(d.marketExpected ? d.actual / d.marketExpected - 1 : 0)} vs expected
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <p className="tiny muted" style={{ marginTop: 20 }}>
        How this is worked out: each day is compared with the average of the same weekday over {rangeLabel(r.period.baselineStart, r.period.baselineEnd)}, then adjusted for how the other branches did that day. The remaining gap is matched against
        your staffing, stock, opening-hours, event and feedback records. Amounts are estimates. <a href="#/how">Read more</a>
      </p>
    </>
  );
}

function DarkStat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'good' | 'bad' }) {
  return (
    <div style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, padding: '14px 16px' }}>
      <div className="tiny" style={{ color: '#a9bdb2' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 26, color: tone === 'bad' ? '#ff9b7d' : tone === 'good' ? 'var(--lime)' : '#fff' }}>{value}</div>
      {sub && (
        <div className="tiny" style={{ color: '#a9bdb2' }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, v, cur }: { label: string; v: number; cur: string }) {
  return (
    <div style={{ background: 'var(--paper)', borderRadius: 10, padding: '10px 12px' }}>
      <div className="tiny muted">{label}</div>
      <div className={v < 0 ? 'down' : 'up'} style={{ fontWeight: 700 }}>
        {money(v, cur)}
      </div>
    </div>
  );
}

const CONF_CLASS = { High: 'pill-bad', Medium: 'pill-warn', Low: '' } as const;

function DriverRow({ d, cur, maxImpact }: { d: Driver; cur: string; maxImpact: number }) {
  const [open, setOpen] = useState(d.key !== 'unexplained');
  const Icon = DRIVER_ICON[d.key];
  const supporting = d.impact <= 0.5;
  return (
    <div className="driver">
      <div className="driver-icon" style={{ background: d.key === 'unexplained' ? 'var(--paper-2)' : supporting ? '#eef3ef' : 'var(--coral-bg)', color: supporting ? 'var(--ink-2)' : '#a83a19' }}>
        <Icon />
      </div>
      <div>
        <div className="row" style={{ gap: 8 }}>
          <h4 style={{ fontSize: 17 }}>{d.title}</h4>
          {d.key !== 'unexplained' && (
            <span className={`pill ${supporting ? 'pill-good' : CONF_CLASS[d.confidence]}`} title="How strongly the timing lines up with the drop">
              {supporting ? 'Supporting signal' : `${d.confidence} confidence`}
            </span>
          )}
        </div>
        <p className="small" style={{ marginTop: 4 }}>
          {d.summary}
        </p>
        {supporting && d.key === 'feedback' && <p className="tiny muted" style={{ marginTop: 4 }}>Complaints line up with the problems above, which makes them more believable.</p>}
        {d.details.length > 0 && (
          <>
            <button className="btn btn-quiet btn-sm no-print" style={{ marginTop: 6, paddingLeft: 0 }} onClick={() => setOpen((o) => !o)}>
              {open ? 'Hide records' : `Show ${d.details.length} day${d.details.length > 1 ? 's' : ''} of records`}
            </button>
            {open && (
              <ul className="details">
                {d.details.map((x, i) => (
                  <li key={i}>
                    {x.text} <Evidence ids={x.evidence} max={4} title={d.title} />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
      <div className="driver-impact">
        {supporting ? (
          <span className="tiny muted">—</span>
        ) : (
          <>
            <div className="v">≈ {money(d.impact, cur)}</div>
            <div className="tiny muted">{Math.round(d.share * 100)}% of the gap</div>
            <div className="bar">
              <span style={{ width: `${(d.impact / maxImpact) * 100}%`, background: d.key === 'unexplained' ? 'var(--line-2)' : undefined }} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ActionsCard({ r }: { r: Report }) {
  const { ws, addAction } = useStore();
  const { toast } = useUI();
  const added = new Set(ws.actions.map((a) => a.id));
  const add = (a: SuggestedAction) => {
    addAction({ id: a.id, branch: r.branch, title: a.title, detail: a.detail, evidence: a.evidence, owner: '', due: '', status: 'todo', createdAt: Date.now() });
    toast('Added to your action tracker');
  };
  const notAdded = r.actions.filter((a) => !added.has(a.id));
  return (
    <section className="card" style={{ marginTop: 18 }}>
      <div className="card-title">
        <h3>What to do next</h3>
        <div className="row no-print">
          {notAdded.length > 1 && (
            <button className="btn btn-ghost btn-sm" onClick={() => notAdded.forEach(add)}>
              <IPlus /> Add all to tracker
            </button>
          )}
          <a className="btn btn-quiet btn-sm" href="#/actions">
            Open tracker
          </a>
        </div>
      </div>
      <div>
        {r.actions.map((a, i) => (
          <div key={a.id} className="action-item">
            <div className="num-badge">{i + 1}</div>
            <div>
              <strong>{a.title}</strong>
              <p className="small muted" style={{ marginTop: 4 }}>
                {a.detail}
              </p>
              <div style={{ marginTop: 6 }}>
                <Evidence ids={a.evidence} max={5} title={a.title} />
              </div>
            </div>
            <div className="no-print">
              {added.has(a.id) ? (
                <span className="pill pill-good">
                  <ICheck width={14} height={14} /> In tracker
                </span>
              ) : (
                <button className="btn btn-ghost btn-sm" onClick={() => add(a)}>
                  <IPlus /> Track
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AiCard({ r, businessName }: { r: Report; businessName: string }) {
  const { ws } = useStore();
  const [state, setState] = useState<{ loading: boolean; error?: string; result?: AiResult; for?: string }>({ loading: false });
  const reportKey = `${r.branch}|${r.period.end}`;
  const known = useMemo(() => {
    const set = new Set<string>();
    for (const d of r.drivers) d.evidence.forEach((i) => set.add(i));
    for (const a of r.actions) a.evidence.forEach((i) => set.add(i));
    r.market.evidence.forEach((i) => set.add(i));
    return set;
  }, [r]);
  const hasKey = !!ws.settings.aiKey.trim();
  const res = state.for === reportKey ? state.result : undefined;

  const run = async () => {
    setState({ loading: true, for: reportKey });
    try {
      const result = await generateBrief(r, ws.settings.aiKey, ws.settings.aiModel, businessName, known);
      setState({ loading: false, result, for: reportKey });
    } catch (e) {
      setState({ loading: false, error: e instanceof Error ? e.message : 'Something went wrong.', for: reportKey });
    }
  };

  return (
    <section className="card no-print" style={{ marginTop: 18, borderColor: '#dbe9b8', background: 'linear-gradient(180deg, #fbfef3, #fff)' }}>
      <div className="card-title">
        <div className="row" style={{ gap: 10 }}>
          <div className="driver-icon" style={{ background: 'var(--lime)', width: 36, height: 36 }}>
            <ISpark />
          </div>
          <div>
            <h3>AI write-up</h3>
            <p className="tiny muted">Optional. Turns the findings above into a short note for your team, using Google Gemini's free tier.</p>
          </div>
        </div>
        {hasKey ? (
          <button className="btn btn-primary btn-sm" onClick={run} disabled={state.loading}>
            {state.loading ? 'Writing…' : res ? 'Write again' : 'Write it for me'}
          </button>
        ) : (
          <a className="btn btn-ghost btn-sm" href="#/settings">
            Add a free key
          </a>
        )}
      </div>
      {!hasKey && <p className="small muted">Everything on this page works without AI. If you'd like a ready-to-send paragraph, add a free Gemini key in Settings (takes about a minute).</p>}
      {state.for === reportKey && state.error && (
        <div className="notice bad">
          <IAlert /> <span>{state.error}</span>
        </div>
      )}
      {res && (
        <div>
          <div style={{ whiteSpace: 'pre-wrap', fontSize: 15.5, lineHeight: 1.65 }}>
            <AiText text={res.text} />
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            <span className={`pill ${res.unknown.length ? 'pill-bad' : 'pill-good'}`}>
              {res.unknown.length ? `${res.unknown.length} citation${res.unknown.length > 1 ? 's' : ''} could not be verified: ${res.unknown.join(', ')}` : `All ${res.cited.length} citations checked against your records`}
            </span>
            <CopyBtn text={res.text} />
          </div>
        </div>
      )}
    </section>
  );
}

function AiText({ text }: { text: string }) {
  const parts = text.split(/(\b(?:SAL|STF|STK|HRS|FBK|EVT)-\d+\b|\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (/^(SAL|STF|STK|HRS|FBK|EVT)-\d+$/.test(p)) return <Evidence key={i} ids={[p]} />;
        if (/^\*\*[^*]+\*\*$/.test(p)) return <strong key={i}>{p.slice(2, -2)}</strong>;
        return <span key={i}>{p.replace(/^\* /gm, '• ')}</span>;
      })}
    </>
  );
}

function CopyBtn({ text }: { text: string }) {
  const { toast } = useUI();
  return (
    <button className="btn btn-quiet btn-sm" onClick={async () => toast((await copyText(text.replace(/\*\*/g, ''))) ? 'Copied' : 'Could not copy')}>
      <ICopy /> Copy
    </button>
  );
}

export const explainHref = (branch: string, end?: string) => href('/explain', { branch, end });
