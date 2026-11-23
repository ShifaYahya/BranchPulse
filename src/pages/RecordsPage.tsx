import { useMemo, useState } from 'react';
import { DATASET_ORDER, SCHEMAS, minutesToTime } from '../lib/csv';
import { listBranches } from '../lib/engine';
import { num } from '../lib/format';
import { useRoute } from '../lib/router';
import { useStore } from '../lib/store';
import type { DatasetKey } from '../lib/types';
import { Page } from '../components/Layout';
import { ISearch } from '../components/Icons';
import { NeedData } from './NeedData';

const PREFIX: Record<string, DatasetKey> = { SAL: 'sales', STF: 'staffing', STK: 'stock', HRS: 'hours', FBK: 'feedback', EVT: 'events' };
const PAGE = 100;

export function RecordsPage() {
  const { ws, hasData } = useStore();
  const { params } = useRoute();
  const idsParam = params.get('ids');
  const pinned = useMemo(() => (idsParam ? idsParam.split(',').filter(Boolean) : []), [idsParam]);
  const initial = pinned.length ? PREFIX[pinned[0].split('-')[0]] ?? 'sales' : 'sales';
  const [tab, setTab] = useState<DatasetKey>(initial);
  const [q, setQ] = useState('');
  const [branch, setBranch] = useState('');
  const [onlyPinned, setOnlyPinned] = useState(pinned.length > 0);
  const [limit, setLimit] = useState(PAGE);

  const rows = useMemo(() => {
    const all = ws.data[tab] as unknown as (Record<string, unknown> & { id: string; branch: string; date: string })[];
    const term = q.trim().toLowerCase();
    return all
      .filter((r) => (!onlyPinned || pinned.includes(r.id)) && (!branch || r.branch.toLowerCase() === branch.toLowerCase()))
      .filter((r) => !term || Object.values(r).some((v) => String(v).toLowerCase().includes(term)))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [ws.data, tab, q, branch, onlyPinned, pinned]);

  if (!hasData) return <NeedData />;
  const schema = SCHEMAS[tab];
  const branches = listBranches(ws.data);

  return (
    <Page title="Records" intro="Every row BranchPulse has read, with the same IDs used in explanations. The line number matches your original file.">
      <div className="toolbar" style={{ marginBottom: 16 }}>
        <div className="tabs">
          {DATASET_ORDER.map((k) => (
            <button
              key={k}
              className={tab === k ? 'active' : ''}
              onClick={() => {
                setTab(k);
                setLimit(PAGE);
              }}
            >
              {SCHEMAS[k].title} <span className="faint">{num(ws.data[k].length)}</span>
            </button>
          ))}
        </div>
        <select className="select select-inline" value={branch} onChange={(e) => setBranch(e.target.value)} aria-label="Branch">
          <option value="">All branches</option>
          {branches.map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>
        <label className="row grow" style={{ gap: 8, minWidth: 200 }}>
          <ISearch />
          <input className="input" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search records" />
        </label>
        {pinned.length > 0 && (
          <label className="row small" style={{ gap: 6 }}>
            <input type="checkbox" checked={onlyPinned} onChange={(e) => setOnlyPinned(e.target.checked)} /> Only cited records ({pinned.length})
          </label>
        )}
      </div>

      {ws.data[tab].length === 0 ? (
        <div className="card empty">
          <h2>No {schema.title.toLowerCase()} file yet</h2>
          <p className="muted">{schema.description}</p>
          <a className="btn btn-primary" href="#/data" style={{ marginTop: 16 }}>
            Add file
          </a>
        </div>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  {schema.columns.map((c) => (
                    <th key={c.key} className={c.kind === 'number' ? 'num' : ''}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, limit).map((r) => (
                  <tr key={r.id} className={pinned.includes(r.id) ? 'hl' : ''}>
                    <td>
                      <span className="chip" style={{ cursor: 'default' }}>
                        {r.id}
                      </span>
                    </td>
                    {schema.columns.map((c) => {
                      const v = r[c.key];
                      const text = c.kind === 'time' && typeof v === 'number' ? minutesToTime(v) : typeof v === 'number' ? v.toLocaleString('en-US', { maximumFractionDigits: 2 }) : String(v ?? '');
                      return (
                        <td key={c.key} className={c.kind === 'number' ? 'num' : ''} style={c.key === 'comment' || c.key === 'description' ? { minWidth: 260 } : undefined}>
                          {text || <span className="faint">—</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={schema.columns.length + 1} className="center muted" style={{ padding: 30 }}>
                      No records match.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="row between" style={{ marginTop: 12 }}>
            <span className="small muted">
              Showing {num(Math.min(limit, rows.length))} of {num(rows.length)}
            </span>
            {rows.length > limit && (
              <button className="btn btn-ghost btn-sm" onClick={() => setLimit((l) => l + PAGE * 3)}>
                Show more
              </button>
            )}
          </div>
        </>
      )}
    </Page>
  );
}
