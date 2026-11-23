import { useRef, useState } from 'react';
import { downloadText } from '../lib/download';
import { normalize, useStore } from '../lib/store';
import { Page } from '../components/Layout';
import { useUI } from '../components/Feedback';
import { IDownload, IShield, ITrash, IUpload } from '../components/Icons';

const CURRENCIES = ['SAR', 'AED', 'KWD', 'QAR', 'BHD', 'OMR', 'EGP', 'USD', 'EUR', 'GBP'];

export function SettingsPage() {
  const { ws, updateSettings, replaceAll, resetAll } = useStore();
  const { toast } = useUI();
  const s = ws.settings;
  const file = useRef<HTMLInputElement>(null);
  const [showKey, setShowKey] = useState(false);

  const backup = () => {
    const safe = { ...ws, settings: { ...ws.settings, aiKey: '' } };
    downloadText(`branchpulse-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(safe), 'application/json');
    toast('Backup downloaded (your AI key is not included)');
  };

  const restore = async (f: File) => {
    try {
      const parsed = JSON.parse(await f.text());
      if (!parsed || typeof parsed !== 'object' || !('data' in parsed)) throw new Error();
      const next = normalize(parsed);
      next.settings.aiKey = ws.settings.aiKey;
      replaceAll(next);
      toast('Backup restored');
    } catch {
      toast('That file is not a BranchPulse backup');
    }
  };

  return (
    <Page title="Settings" intro="These settings are saved in this browser only.">
      <div className="grid g2" style={{ alignItems: 'start' }}>
        <section className="card stack">
          <h3>Business</h3>
          <div className="field">
            <label htmlFor="bn">Business name</label>
            <input id="bn" className="input" value={s.businessName} placeholder="e.g. Nakhla Coffee" onChange={(e) => updateSettings({ businessName: e.target.value })} />
            <span className="hint">Shown on reports and briefs.</span>
          </div>
          <div className="field">
            <label htmlFor="cur">Currency</label>
            <select id="cur" className="select" value={s.currency} onChange={(e) => updateSettings({ currency: e.target.value })}>
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="bw">Compare with the previous</label>
            <select id="bw" className="select" value={s.baselineWeeks} onChange={(e) => updateSettings({ baselineWeeks: Number(e.target.value) })}>
              {[1, 2, 3, 4, 6, 8, 12].map((w) => (
                <option key={w} value={w}>
                  {w} week{w > 1 ? 's' : ''}
                </option>
              ))}
            </select>
            <span className="hint">“Usual” means the average of the same weekday over this many weeks. Four works well for most businesses.</span>
          </div>
        </section>

        <section className="card stack">
          <h3>AI write-up (optional, free)</h3>
          <p className="small muted">
            BranchPulse works fully without AI. If you'd like it to also write a ready-to-send note, add a free Google Gemini API key. Only the findings (not your raw files) are sent to Google when you press “Write it for me”.
          </p>
          <ol className="small" style={{ margin: 0, paddingLeft: 18 }}>
            <li>
              Open{' '}
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">
                Google AI Studio
              </a>{' '}
              and sign in with any Google account.
            </li>
            <li>Click “Create API key”, then copy it.</li>
            <li>Paste it below. No card needed for the free tier.</li>
          </ol>
          <div className="field">
            <label htmlFor="key">Gemini API key</label>
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <input id="key" className="input" type={showKey ? 'text' : 'password'} value={s.aiKey} placeholder="AIza…" autoComplete="off" onChange={(e) => updateSettings({ aiKey: e.target.value })} />
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => setShowKey((v) => !v)}>
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          <div className="field">
            <label htmlFor="model">Model</label>
            <input id="model" className="input mono" value={s.aiModel} onChange={(e) => updateSettings({ aiModel: e.target.value })} />
            <span className="hint">
              Leave as <span className="mono">gemini-flash-latest</span> unless you know you want another free model.
            </span>
          </div>
          {s.aiKey && (
            <button className="btn btn-quiet btn-sm" style={{ justifySelf: 'start' }} onClick={() => updateSettings({ aiKey: '' })}>
              Remove key
            </button>
          )}
        </section>

        <section className="card stack">
          <h3>Backup & move</h3>
          <p className="small muted">Download everything (files, actions, settings) as one file. Use it to move to another computer or keep a copy.</p>
          <div className="row">
            <button className="btn btn-primary btn-sm" onClick={backup}>
              <IDownload /> Download backup
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => file.current?.click()}>
              <IUpload /> Restore backup
            </button>
            <input
              ref={file}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f && confirm('Restoring replaces the data and actions in this browser. Continue?')) restore(f);
                e.target.value = '';
              }}
            />
          </div>
        </section>

        <section className="card stack">
          <h3>Privacy</h3>
          <div className="notice info">
            <IShield />
            <span className="small">Your files are read and stored only in this browser. There is no BranchPulse server and no account. Clearing your browser data removes them, so keep a backup.</span>
          </div>
          <button
            className="btn btn-danger btn-sm"
            style={{ justifySelf: 'start' }}
            onClick={() => {
              if (confirm('Delete all data, actions and settings from this browser? This cannot be undone.')) {
                resetAll();
                toast('Everything was deleted');
              }
            }}
          >
            <ITrash /> Delete everything
          </button>
        </section>
      </div>
    </Page>
  );
}
