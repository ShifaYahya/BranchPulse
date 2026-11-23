import { minutesToTime, parseCsv, toCsv } from './csv';
import type { Dataset, DatasetKey, FileMeta } from './types';

/**
 * A realistic, made-up café chain ("Nakhla Coffee", 4 branches in Riyadh, 5 weeks).
 * The last week contains a few planted problems at Al Malqa so the analysis has
 * something real to find. Everything is generated from a fixed seed, so the demo
 * is identical for every visitor.
 */

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const SAMPLE_END = '2026-11-21';
export const SAMPLE_DAYS = 35;
export const SAMPLE_BUSINESS = 'Nakhla Coffee (sample)';

const BRANCHES = [
  { name: 'Olaya', base: 14200, ticket: 36 },
  { name: 'Al Malqa', base: 11800, ticket: 34 },
  { name: 'Al Nakheel', base: 10300, ticket: 33 },
  { name: 'Hittin', base: 9100, ticket: 35 },
];

// Sun..Sat. Thursday and Friday evenings are the busiest in Riyadh cafés.
const WEEKDAY = [0.92, 0.9, 0.93, 0.97, 1.18, 1.22, 1.05];

const GOOD = [
  'Great flat white, friendly team',
  'Quick service this morning',
  'Love the new pistachio latte',
  'Clean and calm, good for work',
  'Barista remembered my order',
  'Fresh croissants, good coffee',
  'Fast pickup on the app order',
];
const OK = ['Coffee was fine, a bit busy', 'Music was loud', 'Seats were all taken', 'Decent, nothing special'];
const SLOW = [
  'Waited almost 20 minutes for two drinks',
  'Long queue and only one barista on the bar',
  'Very slow service, staff looked overwhelmed',
  'Gave up and left, the line was not moving',
  'Mobile order took 25 minutes',
];
const OUT = [
  'No oat milk again',
  'They ran out of croissants by 10am',
  'Wanted an oat latte, not available',
  'Half the pastry shelf was empty',
];
const LATE = ['Came at 7 and the doors were still closed', 'Branch opened very late today, had to go elsewhere'];

function addDays(iso: string, n: number) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function buildSampleCsv(): Record<DatasetKey, string> {
  const r = rng(20261121);
  const start = addDays(SAMPLE_END, -(SAMPLE_DAYS - 1));
  const focusStart = addDays(SAMPLE_END, -6);

  const sales: string[] = ['date,branch,orders,revenue'];
  const staffing: string[] = ['date,branch,scheduled_staff,actual_staff'];
  const stock: string[] = ['date,branch,item,hours_out'];
  const hours: string[] = ['date,branch,scheduled_open,actual_open,scheduled_close,actual_close'];
  const feedback: string[] = ['date,branch,rating,comment'];
  const events: string[] = ['date,branch,type,description'];

  const pick = <T,>(arr: T[]) => arr[Math.floor(r() * arr.length)];
  const q = (s: string) => (/[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

  // Baseline-period events so the data feels lived-in.
  events.push(`${addDays(start, 9)},All,Weather,Dust storm warning in the afternoon`);
  events.push(`${addDays(start, 17)},Olaya,Local event,Exhibition at the nearby hotel`);
  // Focus-week events.
  events.push(`${focusStart},All,Weather,Heavy rain across Riyadh from 2pm`);
  events.push(`${addDays(focusStart, 4)},Al Malqa,Road works,Service road in front of the branch closed 9am to 5pm`);

  for (let day = 0; day < SAMPLE_DAYS; day++) {
    const date = addDays(start, day);
    const wd = new Date(date + 'T00:00:00Z').getUTCDay();
    const inFocus = date >= focusStart;
    const fDay = day - (SAMPLE_DAYS - 7); // 0..6 in focus week

    for (const b of BRANCHES) {
      const trend = 1 + day * 0.0012;
      let demand = b.base * WEEKDAY[wd] * trend * (0.96 + r() * 0.08);
      let ticket = b.ticket * (0.97 + r() * 0.06);

      let scheduled = wd === 4 || wd === 5 ? 6 : 5;
      let actual = r() < 0.08 ? scheduled - 1 : scheduled;
      let openLate = r() < 0.1 ? Math.round(r() * 10) : 0;
      const outs: { item: string; h: number }[] = [];
      if (r() < 0.05) outs.push({ item: pick(['Almond croissant', 'Cold brew', 'Oat milk', 'Cookies']), h: 1 + Math.round(r() * 2) });

      const fb: { rating: number; text: string }[] = [];
      const fbCount = 3 + Math.floor(r() * 4);
      for (let k = 0; k < fbCount; k++) {
        const x = r();
        if (x < 0.62) fb.push({ rating: 5, text: pick(GOOD) });
        else if (x < 0.86) fb.push({ rating: 4, text: pick(GOOD) });
        else if (x < 0.96) fb.push({ rating: 3, text: pick(OK) });
        else fb.push({ rating: 2, text: pick(OK) });
      }

      if (inFocus && fDay === 0) demand *= 0.86; // city-wide rain

      if (inFocus && b.name === 'Al Malqa') {
        if (fDay === 1 || fDay === 2) {
          // Two baristas called in sick, no cover found.
          actual = scheduled - 2;
          demand *= 0.79;
          for (let k = 0; k < 3; k++) fb.push({ rating: 1 + Math.floor(r() * 2), text: pick(SLOW) });
        }
        if (fDay >= 3 && fDay <= 5) {
          outs.push({ item: 'Oat milk', h: 6 + Math.round(r() * 4) });
          outs.push({ item: 'Croissant', h: 4 + Math.round(r() * 3) });
          demand *= 0.92;
          ticket *= 0.91;
          for (let k = 0; k < 2; k++) fb.push({ rating: 2, text: pick(OUT) });
        }
        if (fDay === 4) demand *= 0.9; // road works
        if (fDay === 6) {
          openLate = 95; // key-holder late
          demand *= 0.86;
          fb.push({ rating: 1, text: pick(LATE) });
          fb.push({ rating: 2, text: pick(LATE) });
        }
      }

      const revenue = Math.round(demand * 100) / 100;
      const orders = Math.max(1, Math.round(demand / ticket));
      sales.push(`${date},${b.name},${orders},${revenue.toFixed(2)}`);
      staffing.push(`${date},${b.name},${scheduled},${actual}`);
      for (const o of outs) stock.push(`${date},${b.name},${o.item},${o.h}`);
      hours.push(`${date},${b.name},06:30,${minutesToTime(390 + openLate)},23:30,23:30`);
      for (const f of fb) feedback.push(`${date},${b.name},${f.rating},${q(f.text)}`);
    }
  }

  return {
    sales: sales.join('\n') + '\n',
    staffing: staffing.join('\n') + '\n',
    stock: stock.join('\n') + '\n',
    hours: hours.join('\n') + '\n',
    feedback: feedback.join('\n') + '\n',
    events: events.join('\n') + '\n',
  };
}

export function buildSampleDataset(): { data: Dataset; files: Record<DatasetKey, FileMeta> } {
  const csv = buildSampleCsv();
  const now = Date.now();
  const data = {} as Dataset;
  const files = {} as Record<DatasetKey, FileMeta>;
  (Object.keys(csv) as DatasetKey[]).forEach((k) => {
    const res = parseCsv(k, csv[k]);
    (data as unknown as Record<string, unknown>)[k] = res.rows;
    files[k] = { fileName: `sample-${k}.csv`, importedAt: now, rows: res.rows.length, skipped: res.issues.length };
  });
  return { data, files };
}

// Re-exported so the sample can be downloaded back out as files.
export { toCsv };
