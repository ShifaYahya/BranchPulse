import { rangeLabel, addDays } from '../lib/dates';

export function WeekPicker({ weeks, value, onChange }: { weeks: string[]; value?: string; onChange: (v: string) => void }) {
  return (
    <label className="row" style={{ gap: 8 }}>
      <span className="small muted">Week</span>
      <select className="select select-inline" value={value} onChange={(e) => onChange(e.target.value)}>
        {weeks.map((w, i) => (
          <option key={w} value={w}>
            {i === 0 ? 'Latest · ' : ''}
            {rangeLabel(addDays(w, -6), w)}
          </option>
        ))}
      </select>
    </label>
  );
}

export function BranchPicker({ branches, value, onChange, label = 'Branch', auto }: { branches: string[]; value?: string; onChange: (v: string) => void; label?: string; auto?: boolean }) {
  return (
    <label className="row" style={{ gap: 8 }}>
      <span className="small muted">{label}</span>
      <select className="select select-inline" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        {auto && <option value="">Needs most attention</option>}
        {branches.map((b) => (
          <option key={b} value={b}>
            {b}
          </option>
        ))}
      </select>
    </label>
  );
}
