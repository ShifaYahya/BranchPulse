import { DATASET_ORDER, SCHEMAS, templateCsv } from '../lib/csv';
import { downloadText } from '../lib/download';
import { IDownload, IShield } from '../components/Icons';
import { Page } from '../components/Layout';

export function HowPage() {
  const steps: [string, string][] = [
    ['Work out what “usual” looks like', 'For every branch and every day, BranchPulse averages the same weekday over the previous weeks (four by default). A Thursday is compared with Thursdays, not with a quiet Sunday.'],
    ['Remove what hit everyone', 'It then checks how the other branches did on that same day. If every branch was 12% down on a rainy Sunday, a 12% drop at one branch is normal. Only the gap beyond that counts against the branch.'],
    ['Split customers from basket size', 'Revenue is orders × average order. BranchPulse shows whether the branch lost customers, or customers spent less, because the fixes are different.'],
    ['Look for reasons, day by day', 'On each weak day it looks for staffing shortfalls, stockouts, late openings or early closes, local events and spikes in complaints, and records the exact rows it found.'],
    ['Estimate the effect', 'Closed time is converted to lost sales directly. The rest of each day’s gap is shared between the reasons found that day, weighted by how severe they were. Days with no reason are reported as “not explained by your data”.'],
    ['Rate confidence', 'A reason gets high confidence when the days it appeared were clearly worse than the clean days around them. Low confidence means the timing doesn’t line up well.'],
    ['Suggest what to do', 'Each reason comes with a practical next step that names the items, days and amounts involved. You can push any suggestion into the action tracker.'],
  ];
  return (
    <Page title="How BranchPulse works" intro="No black box. Here is exactly how an explanation is built, so you can trust it and explain it to your team.">
      <div className="narrow" style={{ display: 'grid', gap: 14 }}>
        {steps.map(([t, d], i) => (
          <div key={t} className="card-flat" style={{ display: 'grid', gridTemplateColumns: '44px 1fr', gap: 16 }}>
            <div className="num-badge" style={{ width: 40, height: 40, fontSize: 16 }}>
              {i + 1}
            </div>
            <div>
              <h3 style={{ fontSize: 18 }}>{t}</h3>
              <p className="muted" style={{ marginTop: 4 }}>
                {d}
              </p>
            </div>
          </div>
        ))}
        <div className="notice info" style={{ marginTop: 8 }}>
          <IShield />
          <span className="small">
            Amounts are estimates meant to rank reasons, not accounting figures. The more files you add, the fewer days end up “not explained”. The optional AI write-up only rewords these findings; it never adds new ones, and every record it cites is checked.
          </span>
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <a className="btn btn-primary" href="#/data">
            Add your data
          </a>
          <a className="btn btn-ghost" href="#/guide">
            File guide
          </a>
        </div>
      </div>
    </Page>
  );
}

export function GuidePage() {
  return (
    <Page title="File guide" intro="What each CSV should look like. Column names are matched automatically, and you can download a ready-made template for each one.">
      <div className="stack" style={{ ['--gap' as string]: '18px' }}>
        <div className="card-flat">
          <h3 style={{ fontSize: 18 }}>General tips</h3>
          <ul className="details">
            <li>Use one row per branch per day (stock, feedback and events can have several rows per day).</li>
            <li>Dates as 2026-11-17 or 17/11/2026. Times as 07:30 or 7:30 PM.</li>
            <li>Spell branch names the same way in every file. Capital letters don't matter.</li>
            <li>Numbers can include commas or a currency label (“SAR 1,250”). Bad rows are skipped and listed, never silently changed.</li>
            <li>Most POS systems (Foodics, Square, Lightspeed, Odoo and others) can export daily sales by branch to CSV or Excel. In Excel, use “Save as → CSV UTF-8”.</li>
            <li>At least two weeks of sales are needed; five or more weeks gives better comparisons.</li>
          </ul>
        </div>
        {DATASET_ORDER.map((k) => {
          const s = SCHEMAS[k];
          return (
            <div className="card-flat" key={k}>
              <div className="row between">
                <div className="row" style={{ gap: 8 }}>
                  <h3 style={{ fontSize: 18 }}>{s.title}</h3>
                  <span className={`pill ${s.required ? 'pill-dark' : ''}`}>{s.required ? 'Required' : 'Optional'}</span>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => downloadText(`template-${s.fileName}`, templateCsv(k))}>
                  <IDownload /> Template
                </button>
              </div>
              <p className="small muted" style={{ marginTop: 6 }}>
                {s.description}
              </p>
              <div className="table-wrap" style={{ marginTop: 12 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Column</th>
                      <th>Needed?</th>
                      <th>Example</th>
                      <th>Also accepted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.columns.map((c) => (
                      <tr key={c.key}>
                        <td className="mono">{c.label}</td>
                        <td>{c.required ? 'Yes' : 'Optional'}</td>
                        <td className="mono">{c.example}</td>
                        <td className="small muted">{c.aliases.filter((a) => a !== c.label).join(', ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </Page>
  );
}

export function PrivacyPage() {
  return (
    <Page title="Privacy" intro="Short version: your data never leaves your device unless you choose to use the AI write-up.">
      <div className="narrow stack" style={{ ['--gap' as string]: '14px' }}>
        {[
          ['No servers, no accounts', 'BranchPulse is a website that runs entirely in your browser. There is no BranchPulse database, login or tracking of your business data.'],
          ['Where files are kept', 'When you add a CSV, your browser reads it and stores the rows in its own local storage on this device. Other people, and other devices, can’t see it.'],
          ['The optional AI write-up', 'Only if you add your own Google Gemini key and press “Write it for me”, a summary of the findings (branch name, amounts, reasons and record IDs) is sent directly from your browser to Google. Raw files are never sent. Google’s own terms apply to that request.'],
          ['Your API key', 'Your key is stored only in this browser and is not included in backups.'],
          ['Deleting your data', 'Use Settings → Delete everything, or clear your browser’s site data. Download a backup first if you want to keep a copy.'],
          ['Fonts', 'Fonts are loaded from Google Fonts. No business data is included in those requests.'],
        ].map(([t, d]) => (
          <div className="card-flat" key={t}>
            <h3 style={{ fontSize: 18 }}>{t}</h3>
            <p className="muted" style={{ marginTop: 4 }}>
              {d}
            </p>
          </div>
        ))}
      </div>
    </Page>
  );
}
