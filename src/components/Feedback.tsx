import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { SCHEMAS, minutesToTime } from '../lib/csv';
import { findRecord } from '../lib/engine';
import { longDate } from '../lib/dates';
import { href } from '../lib/router';
import { useStore } from '../lib/store';
import type { DatasetKey } from '../lib/types';
import { IX } from './Icons';

interface UI {
  showEvidence: (ids: string[], title?: string) => void;
  toast: (msg: string) => void;
}

const Ctx = createContext<UI | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [ev, setEv] = useState<{ ids: string[]; title?: string } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const toast = useCallback((m: string) => {
    setMsg(m);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(null), 2600);
  }, []);
  const showEvidence = useCallback((ids: string[], title?: string) => setEv({ ids, title }), []);
  const value = useMemo(() => ({ showEvidence, toast }), [showEvidence, toast]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {ev && <EvidenceDrawer ids={ev.ids} title={ev.title} onClose={() => setEv(null)} />}
      {msg && (
        <div className="toast" role="status">
          {msg}
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useUI(): UI {
  const v = useContext(Ctx);
  if (!v) throw new Error('useUI outside provider');
  return v;
}

export function Evidence({ ids, max = 4, title }: { ids: string[]; max?: number; title?: string }) {
  const { showEvidence } = useUI();
  if (!ids.length) return null;
  const shown = ids.slice(0, max);
  const rest = ids.length - shown.length;
  return (
    <span className="chips">
      {shown.map((id) => (
        <button key={id} type="button" className="chip" onClick={() => showEvidence([id], title)} title="See the record behind this">
          {id}
        </button>
      ))}
      {rest > 0 && (
        <button type="button" className="chip" onClick={() => showEvidence(ids, title)} title="See all records">
          +{rest} more
        </button>
      )}
    </span>
  );
}

const fieldValue = (k: DatasetKey, col: string, v: unknown) => {
  const spec = SCHEMAS[k].columns.find((c) => c.key === col);
  if (spec?.kind === 'time' && typeof v === 'number') return minutesToTime(v);
  if (spec?.kind === 'date' && typeof v === 'string') return longDate(v);
  if (typeof v === 'number') return v.toLocaleString('en-US', { maximumFractionDigits: 2 });
  return String(v ?? '') || '—';
};

function EvidenceDrawer({ ids, title, onClose }: { ids: string[]; title?: string; onClose: () => void }) {
  const { ws } = useStore();
  const found = ids.map((id) => ({ id, rec: findRecord(ws.data, id) }));
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Evidence">
        <div className="drawer-head">
          <div>
            <div className="eyebrow">Evidence</div>
            <h3 style={{ fontSize: 20, marginTop: 2 }}>{title ?? (ids.length === 1 ? `Record ${ids[0]}` : `${ids.length} records`)}</h3>
          </div>
          <button className="btn btn-quiet" onClick={onClose} aria-label="Close">
            <IX />
          </button>
        </div>
        <div className="drawer-body">
          <p className="small muted" style={{ marginBottom: 14 }}>
            These are the exact rows from your files. The row number matches the line in the original CSV, so you can check it in Excel.
          </p>
          {found.map(({ id, rec }) =>
            rec ? (
              <div className="record" key={id}>
                <div className="row between">
                  <span className="chip" style={{ cursor: 'default' }}>
                    {id}
                  </span>
                  <span className="tiny muted">
                    {SCHEMAS[rec.dataset].fileName} · line {rec.row.line}
                  </span>
                </div>
                <dl>
                  {SCHEMAS[rec.dataset].columns.map((c) => (
                    <div key={c.key} style={{ display: 'contents' }}>
                      <dt>{c.label}</dt>
                      <dd>{fieldValue(rec.dataset, c.key, (rec.row as unknown as Record<string, unknown>)[c.key])}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : (
              <div className="record" key={id}>
                <span className="chip">{id}</span> <span className="small muted">This record is no longer in your data (the file may have been replaced).</span>
              </div>
            ),
          )}
          {ids.length > 1 && (
            <a className="btn btn-ghost btn-sm" style={{ marginTop: 16 }} href={href('/records', { ids: ids.join(',') })} onClick={onClose}>
              Open in record explorer
            </a>
          )}
        </div>
      </aside>
    </>
  );
}
