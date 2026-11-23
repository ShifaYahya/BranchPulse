import { useRef, useState } from 'react';
import { DATASET_ORDER, SCHEMAS, parseCsv, templateCsv, toCsv, type ParseIssue } from '../lib/csv';
import { dateBounds, listBranches } from '../lib/engine';
import { longDate } from '../lib/dates';
import { downloadText } from '../lib/download';
import { num } from '../lib/format';
import { buildSampleCsv, buildSampleDataset, SAMPLE_BUSINESS } from '../lib/sample';
import { useStore } from '../lib/store';
import type { Dataset, DatasetKey } from '../lib/types';
import { Page } from '../components/Layout';
import { useUI } from '../components/Feedback';
import { IAlert, ICheck, IDownload, IFile, ITrash, IUpload, IArrow } from '../components/Icons';

const MAX_BYTES = 15 * 1024 * 1024;

export function DataPage() {
  const { ws, setDataset, removeDataset, replaceAll, resetData, hasData } = useStore();
  const { toast } = useUI();
  const [issues, setIssues] = useState<Partial<Record<DatasetKey, { fatal?: string; list: ParseIssue[] }>>>({});

  const loadSample = () => {
    const { data, files } = buildSampleDataset();
    replaceAll({ ...ws, data, files, settings: { ...ws.settings, businessName: ws.settings.businessName || SAMPLE_BUSINESS } });
    setIssues({});
    toast('Sample data loaded: 4 branches, 5 weeks');
  };

  const downloadSample = () => {
    const csv = buildSampleCsv();
    DATASET_ORDER.forEach((k, i) => setTimeout(() => downloadText(`sample-${SCHEMAS[k].fileName}`, csv[k]), i * 250));
  };

  const handleFile = async (key: DatasetKey, file: File) => {
    if (file.size > MAX_BYTES) {
      setIssues((s) => ({ ...s, [key]: { fatal: 'This file is larger than 15 MB. Split it into smaller date ranges.', list: [] } }));
      return;
    }
    const text = await file.text();
    const res = parseCsv(key, text);
    if (res.fatal) {
      setIssues((s) => ({ ...s, [key]: { fatal: res.fatal, list: [] } }));
      return;
    }
    if (!res.rows.length) {
      setIssues((s) => ({ ...s, [key]: { fatal: 'No usable rows were found in this file.', list: res.issues } }));
      return;
    }
    setDataset(key, res.rows as Dataset[DatasetKey], { fileName: file.name, importedAt: Date.now(), rows: res.rows.length, skipped: res.issues.length });
    setIssues((s) => ({ ...s, [key]: { list: res.issues } }));
    toast(`${SCHEMAS[key].title}: ${num(res.rows.length)} rows imported`);
  };

  const bounds = dateBounds(ws.data);
  const branches = listBranches(ws.data);

  return (
    <Page
      title="Your data"
      intro="Add a CSV export for each area you track. Only sales is required; every extra file lets BranchPulse check one more possible reason. Files are read in your browser and never uploaded."
      actions={
        <>
          <button className="btn btn-ghost" onClick={downloadSample}>
            <IDownload /> Sample files
          </button>
          <button className="btn btn-lime" onClick={loadSample}>
            Load sample data
          </button>
        </>
      }
    >
      {hasData && bounds && (
        <div className="card row between" style={{ marginBottom: 22 }}>
          <div className="row" style={{ gap: 28 }}>
            <Stat label="Date range" value={`${longDate(bounds.min)} – ${longDate(bounds.max)}`} />
            <Stat label="Branches" value={String(branches.length)} />
            <Stat label="Records" value={num(DATASET_ORDER.reduce((a, k) => a + ws.data[k].length, 0))} />
          </div>
          <a className="btn btn-primary" href="#/overview">
            Go to dashboard <IArrow />
          </a>
        </div>
      )}

      <div className="grid g2">
        {DATASET_ORDER.map((k) => (
          <UploadCard
            key={k}
            k={k}
            meta={ws.files[k]}
            rows={ws.data[k].length}
            issues={issues[k]}
            onFile={(f) => handleFile(k, f)}
            onRemove={() => {
              removeDataset(k);
              setIssues((s) => ({ ...s, [k]: undefined }));
            }}
            onDownload={() => downloadText(`${k}-current.csv`, toCsv(k, ws.data[k]))}
          />
        ))}
      </div>

      {hasData && <Coverage />}

      {hasData && (
        <div className="row" style={{ marginTop: 26 }}>
          <button
            className="btn btn-danger btn-sm"
            onClick={() => {
              if (confirm('Remove all imported files from this browser? Your action tracker and settings stay.')) {
                resetData();
                setIssues({});
                toast('All data removed');
              }
            }}
          >
            <ITrash /> Remove all data
          </button>
        </div>
      )}
    </Page>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="tiny muted">{label}</div>
      <div style={{ fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function UploadCard({
  k,
  meta,
  rows,
  issues,
  onFile,
  onRemove,
  onDownload,
}: {
  k: DatasetKey;
  meta?: { fileName: string; rows: number; skipped: number; importedAt: number };
  rows: number;
  issues?: { fatal?: string; list: ParseIssue[] };
  onFile: (f: File) => void;
  onRemove: () => void;
  onDownload: () => void;
}) {
  const s = SCHEMAS[k];
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const loaded = rows > 0;

  return (
    <div
      className={`drop ${over ? 'over' : ''} ${loaded ? 'ok' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
    >
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
          <div className="driver-icon" style={{ background: loaded ? 'var(--lime)' : 'var(--paper-2)', width: 40, height: 40 }}>
            {loaded ? <ICheck /> : <IFile />}
          </div>
          <div>
            <div className="row" style={{ gap: 8 }}>
              <h3 style={{ fontSize: 18 }}>{s.title}</h3>
              <span className={`pill ${s.required ? 'pill-dark' : ''}`}>{s.required ? 'Required' : 'Optional'}</span>
            </div>
            <p className="small muted" style={{ marginTop: 4, maxWidth: 44 + 'ch' }}>
              {s.description}
            </p>
          </div>
        </div>
      </div>

      <div className="tiny mono" style={{ marginTop: 12, color: 'var(--ink-2)', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, padding: '6px 10px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
        {s.columns.map((c) => c.label + (c.required ? '' : '?')).join(', ')}
      </div>

      {loaded && meta && (
        <p className="small" style={{ marginTop: 10 }}>
          <strong>{num(rows)} rows</strong> from <span className="mono">{meta.fileName}</span>
          {meta.skipped > 0 && <span className="down"> · {meta.skipped} skipped</span>}
        </p>
      )}

      {issues?.fatal && (
        <div className="notice bad" style={{ marginTop: 10 }}>
          <IAlert />
          <span>{issues.fatal}</span>
        </div>
      )}
      {issues && !issues.fatal && issues.list.length > 0 && (
        <details style={{ marginTop: 10 }} className="small">
          <summary style={{ cursor: 'pointer', color: '#8a5608', fontWeight: 600 }}>
            {issues.list.length} row{issues.list.length > 1 ? 's' : ''} skipped. See why
          </summary>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18, maxHeight: 160, overflowY: 'auto' }}>
            {issues.list.slice(0, 50).map((i) => (
              <li key={i.line}>
                Line {i.line}: {i.message}
              </li>
            ))}
            {issues.list.length > 50 && <li>…and {issues.list.length - 50} more</li>}
          </ul>
        </details>
      )}

      <div className="row" style={{ marginTop: 14, gap: 8 }}>
        <input
          ref={input}
          type="file"
          accept=".csv,text/csv"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = '';
          }}
        />
        <button className={`btn btn-sm ${loaded ? 'btn-ghost' : 'btn-primary'}`} onClick={() => input.current?.click()}>
          <IUpload /> {loaded ? 'Replace file' : 'Choose CSV'}
        </button>
        <button className="btn btn-quiet btn-sm" onClick={() => downloadText(`template-${s.fileName}`, templateCsv(k))}>
          Template
        </button>
        {loaded && (
          <>
            <button className="btn btn-quiet btn-sm" onClick={onDownload}>
              Export
            </button>
            <button className="btn btn-quiet btn-sm" onClick={onRemove} aria-label={`Remove ${s.title}`}>
              <ITrash />
            </button>
          </>
        )}
        <span className="tiny faint hide-sm" style={{ marginLeft: 'auto' }}>
          or drop a file here
        </span>
      </div>
    </div>
  );
}

function Coverage() {
  const { ws } = useStore();
  const branches = listBranches(ws.data);
  const days = (k: DatasetKey, b: string) => new Set((ws.data[k] as { branch: string; date: string }[]).filter((r) => r.branch.toLowerCase() === b.toLowerCase()).map((r) => r.date)).size;
  const salesDays = Object.fromEntries(branches.map((b) => [b, days('sales', b)]));
  const unknown = DATASET_ORDER.filter((k) => k !== 'sales' && k !== 'events').flatMap((k) =>
    [...new Set((ws.data[k] as { branch: string }[]).map((r) => r.branch))].filter((b) => !branches.some((x) => x.toLowerCase() === b.toLowerCase())).map((b) => ({ k, b })),
  );

  return (
    <div style={{ marginTop: 30 }}>
      <h2 className="section-title">Data health</h2>
      <p className="small muted" style={{ marginBottom: 12 }}>
        Days of data per branch. Gaps don't break anything; they just mean fewer checks for those days.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Branch</th>
              {DATASET_ORDER.map((k) => (
                <th key={k} className="num">
                  {SCHEMAS[k].title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {branches.map((b) => (
              <tr key={b}>
                <td style={{ fontWeight: 600 }}>{b}</td>
                {DATASET_ORDER.map((k) => {
                  const d = k === 'events' ? new Set(ws.data.events.filter((e) => e.branch.toLowerCase() === b.toLowerCase() || e.branch.toLowerCase() === 'all').map((e) => e.date)).size : days(k, b);
                  const low = k !== 'events' && k !== 'stock' && ws.data[k].length > 0 && d < salesDays[b] * 0.6;
                  return (
                    <td key={k} className="num">
                      {ws.data[k].length === 0 ? <span className="faint">—</span> : <span className={low ? 'down' : ''}>{d} day{d === 1 ? '' : 's'}</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {unknown.length > 0 && (
        <div className="notice" style={{ marginTop: 12 }}>
          <IAlert />
          <span>
            Some branch names don't match your sales file: {unknown.slice(0, 6).map((u) => `"${u.b}" in ${SCHEMAS[u.k].title.toLowerCase()}`).join(', ')}. Use exactly the same spelling so those records get matched.
          </span>
        </div>
      )}
    </div>
  );
}
