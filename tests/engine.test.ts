import { describe, expect, it } from 'vitest';
import { analyze, availableWeeks, findRecord, listBranches } from '../src/lib/engine';
import { parseCsv, parseDate, parseTime, parseNumber } from '../src/lib/csv';
import { buildSampleDataset } from '../src/lib/sample';
import { emptyDataset } from '../src/lib/types';

describe('csv parsing', () => {
  it('reads dates, times and numbers in common formats', () => {
    expect(parseDate('2026-11-05')).toBe('2026-11-05');
    expect(parseDate('05/11/2026')).toBe('2026-11-05');
    expect(parseDate('2026-02-30')).toBeNull();
    expect(parseTime('7:30 PM')).toBe(19 * 60 + 30);
    expect(parseTime('0630')).toBe(390);
    expect(parseNumber('SAR 1,250.50')).toBe(1250.5);
  });

  it('matches column aliases and reports bad rows without failing', () => {
    const res = parseCsv('sales', 'Date,Store,Transactions,Net Sales\n2026-11-01,Olaya,100,3000\nbad,Olaya,1,2\n');
    expect(res.fatal).toBeUndefined();
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].id).toBe('SAL-2');
    expect(res.issues[0].line).toBe(3);
  });

  it('explains missing columns', () => {
    const res = parseCsv('sales', 'date,branch,orders\n2026-11-01,A,3\n');
    expect(res.fatal).toMatch(/revenue/);
  });
});

describe('analysis on the sample data', () => {
  const { data } = buildSampleDataset();

  it('loads four branches and several weeks', () => {
    expect(listBranches(data)).toHaveLength(4);
    expect(availableWeeks(data).length).toBeGreaterThanOrEqual(3);
  });

  it('finds Al Malqa as the underperforming branch', () => {
    const res = analyze(data);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const r = res.report;
    expect(r.branch).toBe('Al Malqa');
    expect(r.stats.change).toBeLessThan(-0.08);
    const keys = r.drivers.map((d) => d.key);
    expect(keys).toContain('staffing');
    expect(keys).toContain('stock');
    expect(keys).toContain('hours');
    expect(r.actions.length).toBeGreaterThanOrEqual(3);
  });

  it('cites records that really exist', () => {
    const res = analyze(data);
    if (!res.ok) throw new Error(res.error);
    const ids = [...res.report.drivers.flatMap((d) => d.evidence), ...res.report.actions.flatMap((a) => a.evidence)];
    expect(ids.length).toBeGreaterThan(5);
    for (const id of ids) expect(findRecord(data, id)).not.toBeNull();
  });

  it('can analyse a healthy branch without inventing problems', () => {
    const res = analyze(data, { branch: 'Olaya' });
    if (!res.ok) throw new Error(res.error);
    const real = res.report.drivers.filter((d) => d.key !== 'unexplained' && d.impact > 500);
    expect(real.length).toBeLessThanOrEqual(1);
  });

  it('works with only a sales file', () => {
    const ds = { ...emptyDataset(), sales: data.sales };
    const res = analyze(ds);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.report.dataNotes.length).toBeGreaterThan(3);
  });

  it('asks for more history when there is too little', () => {
    const ds = { ...emptyDataset(), sales: data.sales.filter((s) => s.date >= '2026-11-12') };
    const res = analyze(ds);
    expect(res.ok).toBe(false);
  });
});
