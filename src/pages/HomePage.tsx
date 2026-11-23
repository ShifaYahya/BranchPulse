import { useMemo } from 'react';
import { analyze, findRecord } from '../lib/engine';
import { longDate } from '../lib/dates';
import type { StaffRow } from '../lib/types';
import { money, pct } from '../lib/format';
import { go } from '../lib/router';
import { buildSampleDataset, SAMPLE_BUSINESS } from '../lib/sample';
import { useStore } from '../lib/store';
import { DRIVER_ICON, IArrow, IBox, IChart, IChat, ICheck, IClock, ICompare, IFile, ILayers, IMap, IShield, ISpark, ITarget, IUsers } from '../components/Icons';

export function HomePage() {
  const { ws, replaceAll, hasData } = useStore();
  const sample = useMemo(() => {
    const { data } = buildSampleDataset();
    const r = analyze(data);
    if (!r.ok) return null;
    const stf = r.report.drivers.find((d) => d.key === 'staffing');
    const detail = stf?.details[1] ?? stf?.details[0];
    const rec = detail ? findRecord(data, detail.evidence[0]) : null;
    return Object.assign(r.report, { proof: detail && rec ? { detail, row: rec.row as StaffRow } : null });
  }, []);
  const proof = sample?.proof;

  const trySample = () => {
    if (!hasData || confirm('Load the sample café chain? This replaces the data currently in this browser.')) {
      const { data, files } = buildSampleDataset();
      replaceAll({ ...ws, data, files, settings: { ...ws.settings, businessName: SAMPLE_BUSINESS } });
      go('/explain');
    }
  };

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="pill pill-dark" style={{ marginBottom: 22 }}>
              <span className="dot" style={{ color: 'var(--lime)' }} /> For businesses with 2 to 200 branches
            </span>
            <h1>
              Know <em>why</em> a branch fell behind.
            </h1>
            <p className="lead">
              BranchPulse reads your sales, staffing, stock, opening hours and customer reviews, then tells you in plain English why one branch made less money, with the exact records behind every claim and a short list of fixes.
            </p>
            <div className="row" style={{ marginTop: 30 }}>
              <button className="btn btn-primary btn-lg" onClick={trySample}>
                See it with sample data <IArrow />
              </button>
              <a className="btn btn-ghost btn-lg" href="#/data">
                Upload my files
              </a>
            </div>
            <div className="row small muted" style={{ marginTop: 22, gap: 18 }}>
              <span className="row" style={{ gap: 6 }}>
                <ICheck width={16} height={16} /> No sign-up
              </span>
              <span className="row" style={{ gap: 6 }}>
                <ICheck width={16} height={16} /> Files stay on your device
              </span>
              <span className="row" style={{ gap: 6 }}>
                <ICheck width={16} height={16} /> Works with any POS export
              </span>
            </div>
          </div>

          {sample && (
            <div className="mock" aria-label="Example explanation">
              <div className="mock-top">
                <i />
                <i />
                <i />
              </div>
              <div className="row between">
                <span className="eyebrow">Al Malqa · last week</span>
                <span className="pill pill-bad">{pct(sample.stats.change)} vs usual</span>
              </div>
              <p style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 20, lineHeight: 1.25, marginTop: 10 }}>
                Down {money(sample.stats.expected - sample.stats.actual)} while other branches held steady.
              </p>
              <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
                {sample.drivers
                  .filter((d) => d.impact > 0 && d.key !== 'unexplained')
                  .slice(0, 3)
                  .map((d) => {
                    const Icon = DRIVER_ICON[d.key];
                    return (
                      <div key={d.key} style={{ display: 'grid', gridTemplateColumns: '34px 1fr auto', gap: 12, alignItems: 'center', padding: '10px 12px', borderRadius: 12, background: 'var(--paper)' }}>
                        <span className="driver-icon" style={{ width: 34, height: 34, background: 'var(--coral-bg)', color: '#a83a19' }}>
                          <Icon />
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 14.5 }}>{d.title}</div>
                          <div className="chips" style={{ marginTop: 3 }}>
                            {d.evidence.slice(0, 3).map((id) => (
                              <span key={id} className="chip" style={{ cursor: 'default' }}>
                                {id}
                              </span>
                            ))}
                          </div>
                        </div>
                        <strong className="nowrap" style={{ fontSize: 14 }}>
                          ≈ {money(d.impact)}
                        </strong>
                      </div>
                    );
                  })}
              </div>
              <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 12, background: 'var(--ink)', color: '#fff' }}>
                <div className="tiny" style={{ color: 'var(--lime)', fontWeight: 600 }}>
                  First thing to do
                </div>
                <div className="small" style={{ marginTop: 2 }}>
                  {sample.actions[0]?.title}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="band band-dark">
        <div className="container">
          <div className="grid g2" style={{ alignItems: 'center', gap: 40 }}>
            <div>
              <div className="eyebrow" style={{ color: 'var(--lime)' }}>
                The problem
              </div>
              <h2 style={{ marginTop: 10 }}>Sales totals tell you what happened. Not why.</h2>
              <p className="muted" style={{ marginTop: 16, fontSize: 18 }}>
                One branch had a bad week. Was it the two people who called in sick? The oat milk that ran out on Thursday? The 90-minute late opening on Saturday? Rain? Road works? Finding out means digging through four different systems and asking around.
              </p>
            </div>
            <div className="grid g2">
              {[
                ['Staffing', 'Who was scheduled vs who turned up', IUsers],
                ['Stock', 'What ran out, and for how long', IBox],
                ['Opening hours', 'Late openings and early closes', IClock],
                ['Outside events', 'Weather, holidays, road works', IMap],
                ['Customers', 'What reviews and surveys say', IChat],
                ['Every branch', 'Was it everyone, or just this one?', ILayers],
              ].map(([t, d, Icon]) => {
                const I = Icon as typeof IUsers;
                return (
                  <div className="feature" key={t as string} style={{ padding: 18 }}>
                    <div className="icon" style={{ width: 36, height: 36, marginBottom: 10 }}>
                      <I />
                    </div>
                    <h3 style={{ fontSize: 16 }}>{t as string}</h3>
                    <p style={{ fontSize: 14 }}>{d as string}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="band">
        <div className="container">
          <div className="eyebrow">How it works</div>
          <h2 style={{ marginTop: 10, maxWidth: 760 }}>From spreadsheets to a clear answer in about five minutes.</h2>
          <div className="grid g3" style={{ marginTop: 34 }}>
            {[
              ['1', 'Export your files', 'Download CSVs from your POS, rota and stock tools. Only sales is required, and column names are matched automatically.'],
              ['2', 'Get the explanation', 'BranchPulse compares each branch with its own usual week and with the others, then checks every possible reason against your records.'],
              ['3', 'Act and follow up', 'Send the brief to your managers, add the fixes to the action tracker, and see next week whether the numbers moved.'],
            ].map(([n, t, d]) => (
              <div key={n} className="card">
                <div className="step-n">{n}</div>
                <h3 style={{ marginTop: 14 }}>{t}</h3>
                <p className="muted" style={{ marginTop: 6 }}>
                  {d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band band-forest">
        <div className="container grid g2" style={{ alignItems: 'center', gap: 48 }}>
          <div>
            <div className="eyebrow" style={{ color: 'var(--lime)' }}>
              Receipts, not guesses
            </div>
            <h2 style={{ marginTop: 10 }}>Every claim points to the row that proves it.</h2>
            <p className="muted" style={{ marginTop: 16, fontSize: 18 }}>
              Explanations come with record IDs like <span className="chip">{proof?.row.id ?? 'STF-123'}</span>. Click one and you see the exact line from your file. Managers can't argue with their own rota. And when something can't be explained by your data, BranchPulse says so instead of making it up.
            </p>
          </div>
          {proof && (
            <div className="card" style={{ color: 'var(--ink)' }}>
              <div className="row between">
                <span className="chip">{proof.row.id}</span>
                <span className="tiny muted">staffing.csv · line {proof.row.line}</span>
              </div>
              <dl style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '6px 12px', margin: '12px 0 0' }}>
                <dt className="muted">date</dt>
                <dd style={{ margin: 0, fontWeight: 600 }}>{longDate(proof.row.date)}</dd>
                <dt className="muted">branch</dt>
                <dd style={{ margin: 0, fontWeight: 600 }}>{proof.row.branch}</dd>
                <dt className="muted">scheduled_staff</dt>
                <dd style={{ margin: 0, fontWeight: 600 }}>{proof.row.scheduled}</dd>
                <dt className="muted">actual_staff</dt>
                <dd style={{ margin: 0, fontWeight: 600 }} className="down">
                  {proof.row.actual}
                </dd>
              </dl>
              <div className="notice info" style={{ marginTop: 16 }}>
                <IUsers />
                <span className="small">{proof.detail.text}</span>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="band">
        <div className="container">
          <div className="eyebrow">Everything you need</div>
          <h2 style={{ marginTop: 10, maxWidth: 720 }}>One place to understand every branch.</h2>
          <div className="grid g3" style={{ marginTop: 34 }}>
            {[
              [IChart, 'Network dashboard', 'Every branch on one screen: revenue, orders, staffing, stockouts, closures and ratings, with the branch that needs attention flagged.'],
              [ITarget, 'Branch explanations', 'Ranked reasons with estimated money impact, a confidence level and the records behind each one.'],
              [ILayers, 'Daily briefs', 'A short note for each day of the week, so you can see exactly when things went wrong.'],
              [ICompare, 'Side-by-side compare', 'Put your best branch next to your weakest and see where they really differ.'],
              [ICheck, 'Action tracker', 'Turn suggestions into tasks with owners and due dates, then export them for your weekly meeting.'],
              [ISpark, 'Optional AI write-up', 'Turn findings into a ready-to-send message using a free Google Gemini key. Every citation is checked.'],
              [IFile, 'Share anywhere', 'Copy a brief to WhatsApp or email, print to PDF, or export your data and actions as CSV.'],
              [IShield, 'Private by design', 'No servers, no accounts. Your files are read in your browser and stay on your device.'],
              [IMap, 'Market vs branch', 'Separates city-wide dips (rain, holidays) from problems that are specific to one branch.'],
            ].map(([Icon, t, d]) => {
              const I = Icon as typeof IUsers;
              return (
                <div className="feature" key={t as string}>
                  <div className="icon">
                    <I />
                  </div>
                  <h3>{t as string}</h3>
                  <p>{d as string}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="band" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="grid g4">
            {[
              ['Cafés & restaurants', 'Orders, baristas on shift, items that ran out, late openings.'],
              ['Clinics', 'Appointments, doctors on duty, supplies, waiting-time complaints.'],
              ['Gyms & studios', 'Check-ins or bookings, trainers present, class cancellations.'],
              ['Retail stores', 'Receipts, staff on the floor, out-of-stock sizes, mall events.'],
            ].map(([t, d]) => (
              <div key={t} className="quote-card">
                <h3 style={{ fontSize: 18 }}>{t}</h3>
                <p className="small muted" style={{ marginTop: 4 }}>
                  {d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band" style={{ background: 'var(--surface)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <div className="container narrow">
          <h2 style={{ marginBottom: 14 }}>Questions</h2>
          {[
            ['Do I need all six files?', 'No. Sales is the only required file. Each extra file lets BranchPulse check another possible reason, and the report tells you which checks were skipped.'],
            ['Where does my data go?', 'Nowhere. Files are read by your browser and saved only on this device. There is no BranchPulse server. If you turn on the optional AI write-up, only the summary of findings is sent to Google.'],
            ['How does it decide what “usual” means?', 'Each day is compared with the same weekday over the previous four weeks (you can change this), then adjusted for how your other branches did that day. That way a rainy Sunday that hit everyone isn’t blamed on one branch.'],
            ['Are the money amounts exact?', 'They are estimates. The goal is to rank the reasons and point you to the evidence so you can decide what to fix first.'],
            ['Does it use AI?', 'The analysis itself is transparent arithmetic, so it works offline and never makes things up. An optional AI write-up is available with a free Google Gemini key.'],
            ['My columns have different names. Will it work?', 'Probably. BranchPulse recognises common names like “store”, “location”, “transactions” and “net sales”. The File guide lists every accepted name, and you can download templates.'],
          ].map(([q, a]) => (
            <details className="faq" key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="band">
        <div className="container center">
          <h2 style={{ maxWidth: 760, margin: '0 auto' }}>Stop guessing why a branch had a bad week.</h2>
          <p className="muted" style={{ marginTop: 14, fontSize: 18 }}>
            Try it with the sample café chain, then upload your own files.
          </p>
          <div className="row" style={{ justifyContent: 'center', marginTop: 26 }}>
            <button className="btn btn-lime btn-lg" onClick={trySample}>
              Try the sample <IArrow />
            </button>
            <a className="btn btn-primary btn-lg" href="#/data">
              Upload my files
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
