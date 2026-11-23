import { useState } from 'react';
import { longDate } from '../lib/dates';
import { downloadText } from '../lib/download';
import { useStore } from '../lib/store';
import type { ActionStatus } from '../lib/types';
import { Page } from '../components/Layout';
import { Evidence, useUI } from '../components/Feedback';
import { IDownload, IPlus, ITrash } from '../components/Icons';
import { uid } from '../lib/format';

const STATUS: { v: ActionStatus; label: string; cls: string }[] = [
  { v: 'todo', label: 'To do', cls: '' },
  { v: 'doing', label: 'In progress', cls: 'pill-warn' },
  { v: 'done', label: 'Done', cls: 'pill-good' },
];

export function ActionsPage() {
  const { ws, updateAction, removeAction, addAction } = useStore();
  const { toast } = useUI();
  const [filter, setFilter] = useState<'open' | ActionStatus | 'all'>('open');
  const [branch, setBranch] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const branches = [...new Set(ws.actions.map((a) => a.branch))].sort();
  const today = new Date().toISOString().slice(0, 10);

  const list = ws.actions.filter((a) => (filter === 'all' ? true : filter === 'open' ? a.status !== 'done' : a.status === filter)).filter((a) => !branch || a.branch === branch);
  const counts = { todo: 0, doing: 0, done: 0 } as Record<ActionStatus, number>;
  ws.actions.forEach((a) => counts[a.status]++);

  const exportCsv = () => {
    const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const rows = ws.actions.map((a) => [a.branch, a.title, a.detail, a.owner, a.due, a.status, a.evidence.join(' '), new Date(a.createdAt).toISOString().slice(0, 10)].map(q).join(','));
    downloadText('branchpulse-actions.csv', ['branch,title,detail,owner,due,status,evidence,created', ...rows].join('\n') + '\n');
  };

  return (
    <Page
      title="Action tracker"
      intro="Turn explanations into follow-ups. Give each one an owner and a date, then check back next week to see whether the numbers moved."
      actions={
        ws.actions.length > 0 && (
          <button className="btn btn-ghost" onClick={exportCsv}>
            <IDownload /> Export CSV
          </button>
        )
      }
    >
      <div className="grid g3" style={{ marginBottom: 18 }}>
        {STATUS.map((s) => (
          <div className="kpi" key={s.v}>
            <div className="k-label">{s.label}</div>
            <div className="k-value">{counts[s.v]}</div>
          </div>
        ))}
      </div>

      <div className="toolbar" style={{ marginBottom: 16 }}>
        <div className="tabs" role="tablist">
          {(['open', 'todo', 'doing', 'done', 'all'] as const).map((f) => (
            <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)} role="tab" aria-selected={filter === f}>
              {f === 'open' ? 'Open' : f === 'all' ? 'All' : STATUS.find((s) => s.v === f)!.label}
            </button>
          ))}
        </div>
        {branches.length > 1 && (
          <select className="select select-inline" value={branch} onChange={(e) => setBranch(e.target.value)}>
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        )}
        <form
          className="row grow"
          style={{ justifyContent: 'flex-end', gap: 8 }}
          onSubmit={(e) => {
            e.preventDefault();
            if (!newTitle.trim()) return;
            addAction({ id: uid(), branch: branch || 'All branches', title: newTitle.trim(), detail: '', evidence: [], owner: '', due: '', status: 'todo', createdAt: Date.now() });
            setNewTitle('');
            toast('Action added');
          }}
        >
          <input className="input" style={{ maxWidth: 280 }} placeholder="Add your own action…" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} aria-label="New action" />
          <button className="btn btn-primary btn-sm" type="submit">
            <IPlus /> Add
          </button>
        </form>
      </div>

      {list.length === 0 ? (
        <div className="card empty">
          <h2>{ws.actions.length ? 'Nothing here' : 'No actions yet'}</h2>
          <p className="muted">{ws.actions.length ? 'Try another filter.' : 'Open a branch explanation and press “Track” on any suggestion.'}</p>
          {!ws.actions.length && (
            <a className="btn btn-primary" href="#/explain" style={{ marginTop: 16 }}>
              Explain a branch
            </a>
          )}
        </div>
      ) : (
        <div className="grid">
          {list.map((a) => {
            const overdue = a.due && a.due < today && a.status !== 'done';
            return (
              <div className="card-flat" key={a.id} style={{ opacity: a.status === 'done' ? 0.75 : 1 }}>
                <div className="row between" style={{ alignItems: 'flex-start' }}>
                  <div style={{ flex: '1 1 360px' }}>
                    <div className="row" style={{ gap: 8 }}>
                      <span className="pill">{a.branch}</span>
                      {overdue && <span className="pill pill-bad">Overdue</span>}
                    </div>
                    <h3 style={{ fontSize: 18, marginTop: 8, textDecoration: a.status === 'done' ? 'line-through' : 'none' }}>{a.title}</h3>
                    {a.detail && (
                      <p className="small muted" style={{ marginTop: 4 }}>
                        {a.detail}
                      </p>
                    )}
                    {a.evidence.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <Evidence ids={a.evidence} max={5} title={a.title} />
                      </div>
                    )}
                    <p className="tiny faint" style={{ marginTop: 8 }}>
                      Added {longDate(new Date(a.createdAt).toISOString().slice(0, 10))}
                    </p>
                  </div>
                  <div className="grid" style={{ gap: 8, minWidth: 220, flex: '0 1 260px' }}>
                    <label className="field">
                      <span className="tiny muted">Status</span>
                      <select className="select" value={a.status} onChange={(e) => updateAction(a.id, { status: e.target.value as ActionStatus })}>
                        {STATUS.map((s) => (
                          <option key={s.v} value={s.v}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span className="tiny muted">Owner</span>
                      <input className="input" value={a.owner} placeholder="Who's on it?" onChange={(e) => updateAction(a.id, { owner: e.target.value })} />
                    </label>
                    <label className="field">
                      <span className="tiny muted">Due</span>
                      <input className="input" type="date" value={a.due} onChange={(e) => updateAction(a.id, { due: e.target.value })} />
                    </label>
                    <button
                      className="btn btn-quiet btn-sm"
                      style={{ justifySelf: 'start', color: 'var(--coral)' }}
                      onClick={() => {
                        if (confirm('Delete this action?')) removeAction(a.id);
                      }}
                    >
                      <ITrash /> Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Page>
  );
}
