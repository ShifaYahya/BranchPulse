import { addDays, DAY_NAMES, joinList, listDays, shortDate, weekday } from './dates';
import { minutes, money, pct, plural } from './format';
import type { Dataset, EventRow, FeedbackRow, HoursRow, SalesRow, StaffRow, StockRow } from './types';

/* ------------------------------------------------------------------ */
/* Public types                                                        */
/* ------------------------------------------------------------------ */

export type DriverKey = 'staffing' | 'stock' | 'hours' | 'events' | 'feedback' | 'unexplained';
export type Confidence = 'High' | 'Medium' | 'Low';

export interface Cited {
  text: string;
  evidence: string[];
}

export interface DayPoint {
  date: string;
  actual: number;
  expected: number;
  /** What we'd expect after adjusting for how the other branches did that day. */
  marketExpected: number;
  orders: number;
  expectedOrders: number;
  peerRatio: number;
  salesId?: string;
}

export interface BranchStats {
  branch: string;
  actual: number;
  expected: number;
  change: number;
  peerChange: number;
  relative: number;
  orders: number;
  expectedOrders: number;
  ticket: number;
  baseTicket: number;
  staffFill: number | null;
  stockoutHours: number;
  lostOpenMinutes: number;
  rating: number | null;
  baseRating: number | null;
  reviews: number;
  days: DayPoint[];
}

export interface Driver {
  key: DriverKey;
  title: string;
  summary: string;
  impact: number;
  share: number;
  days: string[];
  evidence: string[];
  confidence: Confidence;
  details: Cited[];
}

export interface SuggestedAction {
  id: string;
  driver: DriverKey;
  title: string;
  detail: string;
  evidence: string[];
}

export interface DayBrief {
  date: string;
  actual: number;
  expected: number;
  marketExpected: number;
  change: number;
  marketChange: number;
  status: 'down' | 'normal' | 'up';
  lines: Cited[];
}

export interface Report {
  branch: string;
  currency: string;
  period: { start: string; end: string; baselineStart: string; baselineEnd: string; dates: string[] };
  stats: BranchStats;
  allStats: BranchStats[];
  headline: string;
  summary: Cited[];
  changeBreakdown: { ordersEffect: number; ticketEffect: number; text: string };
  market: { impact: number; text: string; evidence: string[] };
  drivers: Driver[];
  ruledOut: Cited[];
  actions: SuggestedAction[];
  days: DayBrief[];
  dataNotes: string[];
  branchGap: number;
}

export interface AnalyzeOptions {
  end?: string;
  branch?: string;
  baselineWeeks?: number;
  currency?: string;
}

export type AnalyzeResult = { ok: true; report: Report } | { ok: false; error: string };

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const key = (branch: string, date: string) => `${branch.toLowerCase()}|${date}`;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const avg = (xs: number[]) => (xs.length ? sum(xs) / xs.length : 0);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

function groupBy<T extends { branch: string; date: string }>(rows: T[]) {
  const m = new Map<string, T[]>();
  for (const r of rows) {
    const k = key(r.branch, r.date);
    const list = m.get(k);
    if (list) list.push(r);
    else m.set(k, [r]);
  }
  return m;
}

const THEMES: { id: string; label: string; re: RegExp }[] = [
  { id: 'wait', label: 'slow service or long waits', re: /\b(wait|waited|waiting|slow|queue|line|took|minutes|overwhelm|forever|ages|busy)\b/i },
  { id: 'stock', label: 'items not available', re: /(out of|ran out|not available|unavailable|sold out|empty|no more|didn't have|did not have|\bno (oat|milk|croissant|stock))/i },
  { id: 'closed', label: 'branch closed or opened late', re: /\b(closed|opened late|late opening|not open|doors were|still closed)\b/i },
  { id: 'staff', label: 'staff attitude', re: /\b(rude|unfriendly|ignored|attitude|unprofessional)\b/i },
  { id: 'quality', label: 'product quality', re: /\b(cold|burnt|bitter|stale|wrong order|bad taste|dirty|tasteless)\b/i },
];

export function feedbackThemes(rows: FeedbackRow[]) {
  const out: Record<string, FeedbackRow[]> = {};
  for (const r of rows) {
    if (r.rating > 3 || !r.comment) continue;
    for (const t of THEMES) if (t.re.test(r.comment)) (out[t.id] ||= []).push(r);
  }
  return out;
}

function bestQuote(rows: FeedbackRow[]): string | undefined {
  const sorted = [...rows].sort((a, b) => a.rating - b.rating);
  return (sorted.find((r) => r.comment && THEMES.some((t) => t.re.test(r.comment))) ?? sorted.find((r) => r.comment))?.comment;
}

export const themeLabel = (id: string) => THEMES.find((t) => t.id === id)?.label ?? id;

export function listBranches(ds: Dataset): string[] {
  const seen = new Map<string, string>();
  for (const r of ds.sales) if (!seen.has(r.branch.toLowerCase())) seen.set(r.branch.toLowerCase(), r.branch);
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

export function dateBounds(ds: Dataset): { min: string; max: string } | null {
  if (!ds.sales.length) return null;
  let min = ds.sales[0].date;
  let max = min;
  for (const r of ds.sales) {
    if (r.date < min) min = r.date;
    if (r.date > max) max = r.date;
  }
  return { min, max };
}

/** Week-ending dates you can analyse (each needs at least one earlier week as a baseline). */
export function availableWeeks(ds: Dataset): string[] {
  const b = dateBounds(ds);
  if (!b) return [];
  const out: string[] = [];
  let end = b.max;
  while (addDays(end, -13) >= b.min) {
    out.push(end);
    end = addDays(end, -7);
    if (out.length > 52) break;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Core statistics                                                      */
/* ------------------------------------------------------------------ */

interface Context {
  ds: Dataset;
  dates: string[];
  start: string;
  end: string;
  baselineStart: string;
  baselineEnd: string;
  sales: Map<string, SalesRow[]>;
  staff: Map<string, StaffRow[]>;
  stock: Map<string, StockRow[]>;
  hours: Map<string, HoursRow[]>;
  feedback: Map<string, FeedbackRow[]>;
}

function salesFor(ctx: Context, branch: string, date: string) {
  const rows = ctx.sales.get(key(branch, date)) ?? [];
  return { revenue: sum(rows.map((r) => r.revenue)), orders: sum(rows.map((r) => r.orders)), rows };
}

function baselineFor(ctx: Context, branch: string) {
  const byWeekday: { rev: number[]; ord: number[] }[] = Array.from({ length: 7 }, () => ({ rev: [], ord: [] }));
  const all = { rev: [] as number[], ord: [] as number[] };
  for (let d = ctx.baselineStart; d <= ctx.baselineEnd; d = addDays(d, 1)) {
    const s = salesFor(ctx, branch, d);
    if (!s.rows.length) continue;
    byWeekday[weekday(d)].rev.push(s.revenue);
    byWeekday[weekday(d)].ord.push(s.orders);
    all.rev.push(s.revenue);
    all.ord.push(s.orders);
  }
  return {
    has: all.rev.length > 0,
    expected(date: string) {
      const w = byWeekday[weekday(date)];
      if (w.rev.length) return { rev: avg(w.rev), ord: avg(w.ord) };
      return { rev: avg(all.rev), ord: avg(all.ord) };
    },
    ticket: sum(all.ord) ? sum(all.rev) / sum(all.ord) : 0,
  };
}

function lostMinutes(h: HoursRow) {
  return Math.max(0, h.actualOpen - h.scheduledOpen) + Math.max(0, h.scheduledClose - h.actualClose);
}

function openMinutes(h: HoursRow) {
  let m = h.scheduledClose - h.scheduledOpen;
  if (m <= 0) m += 1440;
  return m;
}

function computeStats(ctx: Context, branches: string[]): BranchStats[] {
  const baselines = new Map(branches.map((b) => [b, baselineFor(ctx, b)]));
  const valid = branches.filter((b) => baselines.get(b)!.has);

  // Per-day expectation for each branch.
  const perDay = new Map<string, { actual: number; expected: number; orders: number; expectedOrders: number; salesId?: string; present: boolean }>();
  for (const b of valid) {
    const base = baselines.get(b)!;
    for (const d of ctx.dates) {
      const s = salesFor(ctx, b, d);
      const e = base.expected(d);
      perDay.set(key(b, d), {
        actual: s.revenue,
        orders: s.orders,
        expected: e.rev,
        expectedOrders: e.ord,
        salesId: s.rows[0]?.id,
        present: s.rows.length > 0,
      });
    }
  }

  return valid.map((b) => {
    const base = baselines.get(b)!;
    const days: DayPoint[] = ctx.dates.map((d) => {
      const me = perDay.get(key(b, d))!;
      let pa = 0;
      let pe = 0;
      for (const o of valid) {
        if (o === b) continue;
        const p = perDay.get(key(o, d))!;
        if (!p.present) continue;
        pa += p.actual;
        pe += p.expected;
      }
      const peerRatio = pe > 0 ? clamp(pa / pe, 0.5, 1.5) : 1;
      return {
        date: d,
        actual: me.actual,
        expected: me.expected,
        marketExpected: me.expected * peerRatio,
        orders: me.orders,
        expectedOrders: me.expectedOrders,
        peerRatio,
        salesId: me.salesId,
      };
    });

    const actual = sum(days.map((x) => x.actual));
    const expected = sum(days.map((x) => x.expected));
    const orders = sum(days.map((x) => x.orders));
    const expectedOrders = sum(days.map((x) => x.expectedOrders));

    let pa = 0;
    let pe = 0;
    for (const o of valid) {
      if (o === b) continue;
      for (const d of ctx.dates) {
        const p = perDay.get(key(o, d))!;
        pa += p.actual;
        pe += p.expected;
      }
    }
    const change = expected ? actual / expected - 1 : 0;
    const peerChange = pe ? pa / pe - 1 : 0;

    const staffRows = ctx.dates.flatMap((d) => ctx.staff.get(key(b, d)) ?? []);
    const sched = sum(staffRows.map((r) => r.scheduled));
    const act = sum(staffRows.map((r) => r.actual));
    const stockRows = ctx.dates.flatMap((d) => ctx.stock.get(key(b, d)) ?? []);
    const hoursRows = ctx.dates.flatMap((d) => ctx.hours.get(key(b, d)) ?? []);
    const fb = ctx.dates.flatMap((d) => ctx.feedback.get(key(b, d)) ?? []);
    const baseFb: number[] = [];
    for (let d = ctx.baselineStart; d <= ctx.baselineEnd; d = addDays(d, 1)) {
      for (const r of ctx.feedback.get(key(b, d)) ?? []) baseFb.push(r.rating);
    }

    return {
      branch: b,
      actual,
      expected,
      change,
      peerChange,
      relative: change - peerChange,
      orders,
      expectedOrders,
      ticket: orders ? actual / orders : 0,
      baseTicket: base.ticket,
      staffFill: sched > 0 ? act / sched : null,
      stockoutHours: sum(stockRows.map((r) => r.hoursOut)),
      lostOpenMinutes: sum(hoursRows.map(lostMinutes)),
      rating: fb.length ? avg(fb.map((r) => r.rating)) : null,
      baseRating: baseFb.length ? avg(baseFb) : null,
      reviews: fb.length,
      days,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Main analysis                                                        */
/* ------------------------------------------------------------------ */

interface DaySignals {
  staff?: { rows: StaffRow[]; scheduled: number; actual: number; ratio: number };
  stock?: { rows: StockRow[]; hours: number; items: string[] };
  hours?: { rows: HoursRow[]; lost: number; late: number; early: number; loss: number };
  events?: { rows: EventRow[] };
  feedback?: { rows: FeedbackRow[]; negatives: FeedbackRow[]; avg: number; themes: Record<string, FeedbackRow[]> };
  marketEvents: EventRow[];
}

export function analyze(ds: Dataset, opts: AnalyzeOptions = {}): AnalyzeResult {
  const currency = opts.currency || 'SAR';
  if (!ds.sales.length) return { ok: false, error: 'Add a sales file first. Everything else is optional.' };

  const bounds = dateBounds(ds)!;
  const end = opts.end && opts.end <= bounds.max ? opts.end : bounds.max;
  const start = addDays(end, -6);
  const weeks = clamp(Math.round(opts.baselineWeeks ?? 4), 1, 12);
  const baselineEnd = addDays(start, -1);
  const baselineStart = addDays(start, -7 * weeks);

  if (addDays(start, -7) < bounds.min) {
    return {
      ok: false,
      error: `BranchPulse needs at least two weeks of sales to compare against. Your sales file covers ${shortDate(bounds.min)} to ${shortDate(bounds.max)}.`,
    };
  }

  const dates: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) dates.push(d);

  const ctx: Context = {
    ds,
    dates,
    start,
    end,
    baselineStart,
    baselineEnd,
    sales: groupBy(ds.sales),
    staff: groupBy(ds.staffing),
    stock: groupBy(ds.stock),
    hours: groupBy(ds.hours),
    feedback: groupBy(ds.feedback),
  };

  const branches = listBranches(ds);
  const allStats = computeStats(ctx, branches);
  if (!allStats.length) return { ok: false, error: 'None of your branches have sales in the comparison weeks before this period.' };

  let stats: BranchStats | undefined;
  if (opts.branch) stats = allStats.find((s) => same(s.branch, opts.branch!));
  if (!stats) stats = [...allStats].sort((a, b) => a.relative - b.relative)[0];
  const branch = stats.branch;
  const multi = allStats.length > 1;

  const dataNotes: string[] = [];
  if (!multi) dataNotes.push('Only one branch has enough data, so BranchPulse compares it with its own past weeks, not with other branches.');
  if (!ds.staffing.length) dataNotes.push('No staffing file yet, so staffing could not be checked.');
  if (!ds.stock.length) dataNotes.push('No stockout file yet, so product availability could not be checked.');
  if (!ds.hours.length) dataNotes.push('No opening-hours file yet, so late openings could not be checked.');
  if (!ds.feedback.length) dataNotes.push('No customer feedback file yet, so service complaints could not be checked.');
  if (!ds.events.length) dataNotes.push('No events file yet. Add weather, holidays or nearby events to explain outside factors.');
  const missingDays = stats.days.filter((d) => !d.salesId).map((d) => d.date);
  if (missingDays.length) dataNotes.push(`No sales recorded for ${branch} on ${listDays(missingDays)}. Those days count as zero.`);

  const baseFbAvg = stats.baseRating;

  /* ---- Signals per day ---- */
  const signals = new Map<string, DaySignals>();
  for (const d of dates) {
    const sig: DaySignals = { marketEvents: [] };
    const sr = ctx.staff.get(key(branch, d)) ?? [];
    if (sr.length) {
      const s = sum(sr.map((r) => r.scheduled));
      const a = sum(sr.map((r) => r.actual));
      const ratio = s > 0 ? Math.max(0, (s - a) / s) : 0;
      if (ratio >= 0.1) sig.staff = { rows: sr, scheduled: s, actual: a, ratio };
    }
    const st = ctx.stock.get(key(branch, d)) ?? [];
    const stHours = sum(st.map((r) => r.hoursOut));
    if (st.length && stHours >= 2) sig.stock = { rows: st, hours: stHours, items: [...new Set(st.map((r) => r.item))] };

    const hr = ctx.hours.get(key(branch, d)) ?? [];
    if (hr.length) {
      const lost = sum(hr.map(lostMinutes));
      if (lost >= 15) {
        const late = sum(hr.map((h) => Math.max(0, h.actualOpen - h.scheduledOpen)));
        const early = sum(hr.map((h) => Math.max(0, h.scheduledClose - h.actualClose)));
        sig.hours = { rows: hr, lost, late, early, loss: 0 };
      }
    }
    const ev = ds.events.filter((e) => e.date === d);
    const local = ev.filter((e) => same(e.branch, branch));
    if (local.length) sig.events = { rows: local };
    sig.marketEvents = ev.filter((e) => same(e.branch, 'all') || same(e.branch, 'all branches') || e.branch === '*');

    const fb = ctx.feedback.get(key(branch, d)) ?? [];
    if (fb.length) {
      const negatives = fb.filter((r) => r.rating <= 2);
      const a = avg(fb.map((r) => r.rating));
      const dropped = baseFbAvg !== null && fb.length >= 3 && a <= baseFbAvg - 0.8;
      if (negatives.length >= 2 || dropped) sig.feedback = { rows: fb, negatives, avg: a, themes: feedbackThemes(fb) };
    }
    signals.set(d, sig);
  }

  /* ---- Attribution ---- */
  const NOISE = 0.03;
  const impact: Record<DriverKey, number> = { staffing: 0, stock: 0, hours: 0, events: 0, feedback: 0, unexplained: 0 };
  const dayGapPct = new Map<string, number>();

  for (const day of stats.days) {
    const sig = signals.get(day.date)!;
    const gap = day.marketExpected - day.actual;
    const gapPct = day.marketExpected > 0 ? gap / day.marketExpected : 0;
    dayGapPct.set(day.date, gapPct);
    if (gap <= 0 || gapPct < NOISE) continue;

    let remaining = gap;
    if (sig.hours) {
      const om = openMinutes(sig.hours.rows[0]);
      const est = Math.min(remaining, day.marketExpected * (sig.hours.lost / om) * 1.15);
      sig.hours.loss = est;
      impact.hours += est;
      remaining -= est;
    }
    const weights: Partial<Record<DriverKey, number>> = {};
    if (sig.staff) weights.staffing = clamp(sig.staff.ratio * 1.8, 0.2, 1);
    if (sig.stock) weights.stock = clamp(sig.stock.hours / 14, 0.15, 1);
    if (sig.events) weights.events = 0.45;
    const hasCause = Object.keys(weights).length > 0;
    if (sig.feedback && !hasCause && !sig.hours) weights.feedback = 0.5;
    const total = sum(Object.values(weights) as number[]);
    if (total > 0 && remaining > 0) {
      // Strong signals explain most of the day; a lone weak signal explains part of it.
      const coverage = clamp(0.55 + total * 0.45, 0.55, 1);
      for (const [k, w] of Object.entries(weights) as [DriverKey, number][]) {
        impact[k] += remaining * coverage * (w / total);
      }
      impact.unexplained += remaining * (1 - coverage);
    } else if (remaining > 0) {
      impact.unexplained += remaining;
    }
  }

  const branchGap = sum(stats.days.map((d) => d.marketExpected - d.actual));
  const positiveGap = Math.max(1, sum(stats.days.map((d) => Math.max(0, d.marketExpected - d.actual))));

  /* ---- Confidence ---- */
  const confidenceFor = (daysWith: string[]): Confidence => {
    const withPct = avg(daysWith.map((d) => dayGapPct.get(d) ?? 0));
    const others = dates.filter((d) => !daysWith.includes(d));
    const clean = others.filter((d) => {
      const s = signals.get(d)!;
      return !s.staff && !s.stock && !s.hours && !s.events && !s.feedback;
    });
    const without = clean.length ? clean : others;
    const withoutPct = without.length ? avg(without.map((d) => dayGapPct.get(d) ?? 0)) : 0;
    const diff = withPct - withoutPct;
    if (daysWith.length >= 2 && diff >= 0.08) return 'High';
    if (diff >= 0.04 || (daysWith.length === 1 && withPct >= 0.1)) return 'Medium';
    return 'Low';
  };

  const drivers: Driver[] = [];
  const share = (v: number) => v / positiveGap;
  const C = (v: number) => money(v, currency);

  // Staffing
  const staffDays = dates.filter((d) => signals.get(d)!.staff);
  if (staffDays.length) {
    const details: Cited[] = staffDays.map((d) => {
      const s = signals.get(d)!.staff!;
      return {
        text: `${shortDate(d)}: ${s.actual} of ${s.scheduled} scheduled staff worked (${Math.round(s.ratio * 100)}% short). Sales were ${pct(-(dayGapPct.get(d) ?? 0))} vs expected.`,
        evidence: s.rows.map((r) => r.id),
      };
    });
    const short = sum(staffDays.map((d) => signals.get(d)!.staff!.scheduled - signals.get(d)!.staff!.actual));
    drivers.push({
      key: 'staffing',
      title: 'Short-staffed shifts',
      summary: `${plural(short, 'person', 'people')} missing across ${plural(staffDays.length, 'day')} (${listDays(staffDays)}).`,
      impact: impact.staffing,
      share: share(impact.staffing),
      days: staffDays,
      evidence: details.flatMap((x) => x.evidence),
      confidence: confidenceFor(staffDays),
      details,
    });
  }

  // Stockouts
  const stockDays = dates.filter((d) => signals.get(d)!.stock);
  if (stockDays.length) {
    const items = new Map<string, number>();
    const details: Cited[] = stockDays.map((d) => {
      const s = signals.get(d)!.stock!;
      for (const r of s.rows) items.set(r.item, (items.get(r.item) ?? 0) + r.hoursOut);
      return {
        text: `${shortDate(d)}: ${s.rows.map((r) => `${r.item} out for ${r.hoursOut} h`).join(', ')}.`,
        evidence: s.rows.map((r) => r.id),
      };
    });
    const top = [...items.entries()].sort((a, b) => b[1] - a[1]);
    const ticketDrop = stats.baseTicket ? stats.ticket / stats.baseTicket - 1 : 0;
    drivers.push({
      key: 'stock',
      title: 'Items ran out',
      summary: `${joinList(top.slice(0, 3).map(([i]) => i))} ran out on ${listDays(stockDays)}${ticketDrop < -0.03 ? `, and the average order was ${Math.abs(ticketDrop * 100).toFixed(1)}% smaller than usual` : ''}.`,
      impact: impact.stock,
      share: share(impact.stock),
      days: stockDays,
      evidence: details.flatMap((x) => x.evidence),
      confidence: confidenceFor(stockDays),
      details,
    });
  }

  // Opening hours
  const hourDays = dates.filter((d) => signals.get(d)!.hours);
  if (hourDays.length) {
    const details: Cited[] = hourDays.map((d) => {
      const h = signals.get(d)!.hours!;
      const parts: string[] = [];
      if (h.late) parts.push(`opened ${minutes(h.late)} late`);
      if (h.early) parts.push(`closed ${minutes(h.early)} early`);
      return {
        text: `${shortDate(d)}: ${parts.join(' and ')}${h.loss > 0 ? `, about ${C(h.loss)} in lost sales` : ''}.`,
        evidence: h.rows.map((r) => r.id),
      };
    });
    const total = sum(hourDays.map((d) => signals.get(d)!.hours!.lost));
    drivers.push({
      key: 'hours',
      title: 'Late opening or early closing',
      summary: `The doors were shut for ${minutes(total)} of planned trading time on ${listDays(hourDays)}.`,
      impact: impact.hours,
      share: share(impact.hours),
      days: hourDays,
      evidence: details.flatMap((x) => x.evidence),
      confidence: impact.hours > 0 ? 'High' : 'Low',
      details,
    });
  }

  // Local events
  const eventDays = dates.filter((d) => signals.get(d)!.events);
  if (eventDays.length) {
    const details: Cited[] = eventDays.map((d) => {
      const e = signals.get(d)!.events!;
      return {
        text: `${shortDate(d)}: ${e.rows.map((r) => `${r.type}${r.description ? ` — ${r.description}` : ''}`).join('; ')}.`,
        evidence: e.rows.map((r) => r.id),
      };
    });
    drivers.push({
      key: 'events',
      title: 'Something happened nearby',
      summary: `Outside factors were logged for this branch on ${listDays(eventDays)}.`,
      impact: impact.events,
      share: share(impact.events),
      days: eventDays,
      evidence: details.flatMap((x) => x.evidence),
      confidence: confidenceFor(eventDays),
      details,
    });
  }

  // Feedback (as a cause when nothing else explains a day, and as corroboration otherwise)
  const fbDays = dates.filter((d) => signals.get(d)!.feedback);
  const allFbWeek = dates.flatMap((d) => ctx.feedback.get(key(branch, d)) ?? []);
  const weekThemes = feedbackThemes(allFbWeek);
  if (fbDays.length) {
    const details: Cited[] = fbDays.map((d) => {
      const f = signals.get(d)!.feedback!;
      const themed = f.negatives.filter((r) => r.comment && THEMES.some((t) => t.re.test(r.comment)));
      const quote = (themed[0] ?? f.negatives.find((r) => r.comment))?.comment;
      return {
        text: `${shortDate(d)}: ${plural(f.negatives.length, 'unhappy review')} (average ${f.avg.toFixed(1)}★)${quote ? ` — “${quote}”` : ''}.`,
        evidence: f.negatives.length ? f.negatives.map((r) => r.id) : f.rows.map((r) => r.id),
      };
    });
    const themeText = Object.entries(weekThemes)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 2)
      .map(([t, rows]) => `${themeLabel(t)} (${rows.length})`);
    drivers.push({
      key: 'feedback',
      title: 'Customers noticed',
      summary: `Complaints rose on ${listDays(fbDays)}${themeText.length ? `, mostly about ${joinList(themeText)}` : ''}.`,
      impact: impact.feedback,
      share: share(impact.feedback),
      days: fbDays,
      evidence: details.flatMap((x) => x.evidence),
      confidence: confidenceFor(fbDays),
      details,
    });
  }

  const quiet = dates.filter((d) => {
    const s = signals.get(d)!;
    return (dayGapPct.get(d) ?? 0) >= NOISE && !s.staff && !s.stock && !s.hours && !s.events && !s.feedback;
  });
  if (branchGap > 0 && (quiet.length ? impact.unexplained > positiveGap * 0.08 : impact.unexplained > positiveGap * 0.18)) {
    drivers.push({
      key: 'unexplained',
      title: 'Not explained by your data',
      summary: quiet.length
        ? `Sales were low on ${listDays(quiet)} but nothing in your files lines up with it.`
        : 'Part of the drop is bigger than the signals in your files can account for.',
      impact: impact.unexplained,
      share: share(impact.unexplained),
      days: quiet,
      evidence: quiet.map((d) => stats!.days.find((x) => x.date === d)?.salesId).filter((x): x is string => !!x),
      confidence: 'Low',
      details: quiet.map((d) => {
        const p = stats!.days.find((x) => x.date === d)!;
        return {
          text: `${shortDate(d)}: ${C(p.actual)} vs about ${C(p.marketExpected)} expected, with no staffing, stock, hours, event or feedback signal.`,
          evidence: p.salesId ? [p.salesId] : [],
        };
      }),
    });
  }

  drivers.sort((a, b) => (a.key === 'unexplained' ? 1 : b.key === 'unexplained' ? -1 : b.impact - a.impact));

  /* ---- Market-wide effect ---- */
  const marketImpact = sum(stats.days.map((d) => d.expected - d.marketExpected));
  const marketEv = dates.flatMap((d) => signals.get(d)!.marketEvents);
  const worstPeerDay = [...stats.days].sort((a, b) => a.peerRatio - b.peerRatio)[0];
  let marketText: string;
  if (!multi) marketText = 'No other branches to compare with.';
  else if (stats.peerChange <= -0.04)
    marketText = `Every branch had a softer week: the others were ${pct(stats.peerChange)} vs usual, which accounts for about ${C(Math.max(0, marketImpact))} of ${branch}'s drop.`;
  else if (stats.peerChange >= 0.02) marketText = `The other branches were ${pct(stats.peerChange)} vs usual, so this was not a city-wide slowdown.`;
  else marketText = `The other branches were roughly normal (${pct(stats.peerChange)}), so most of the drop is specific to ${branch}.`;
  if (multi && worstPeerDay && worstPeerDay.peerRatio < 0.93) {
    const ev = marketEv.filter((e) => e.date === worstPeerDay.date);
    marketText += ` The weakest day for everyone was ${shortDate(worstPeerDay.date)} (${pct(worstPeerDay.peerRatio - 1)} across other branches)${ev.length ? `: ${ev.map((e) => e.description || e.type).join('; ')}` : ''}.`;
  }

  /* ---- Change breakdown ---- */
  const ordersEffect = (stats.orders - stats.expectedOrders) * stats.baseTicket;
  const ticketEffect = (stats.ticket - stats.baseTicket) * stats.orders;
  const ordPct = stats.expectedOrders ? stats.orders / stats.expectedOrders - 1 : 0;
  const tktPct = stats.baseTicket ? stats.ticket / stats.baseTicket - 1 : 0;
  const breakdownText = `${plural(Math.round(stats.orders), 'order')} vs about ${Math.round(stats.expectedOrders).toLocaleString('en-US')} usually (${pct(ordPct)}), and the average order was ${money(stats.ticket, currency, 2)} vs ${money(stats.baseTicket, currency, 2)} (${pct(tktPct)}). ${
    Math.abs(ordersEffect) >= Math.abs(ticketEffect) ? 'Fewer customers matter more than smaller baskets.' : 'Smaller baskets matter more than fewer customers.'
  }`;

  /* ---- Ruled out ---- */
  const ruledOut: Cited[] = [];
  const weekRows = <T extends { branch: string; date: string }>(m: Map<string, T[]>) => dates.flatMap((d) => m.get(key(branch, d)) ?? []);
  if (ds.staffing.length && !staffDays.length) {
    const rows = weekRows(ctx.staff);
    if (rows.length) ruledOut.push({ text: `Staffing: actual staff matched the schedule on every recorded day (${plural(rows.length, 'record')}).`, evidence: rows.map((r) => r.id) });
  }
  if (ds.stock.length && !stockDays.length) ruledOut.push({ text: 'Stock: no meaningful stockouts were recorded for this branch this week.', evidence: weekRows(ctx.stock).map((r) => r.id) });
  if (ds.hours.length && !hourDays.length) {
    const rows = weekRows(ctx.hours);
    if (rows.length) ruledOut.push({ text: `Opening hours: the branch opened and closed on time (${plural(rows.length, 'record')}).`, evidence: rows.map((r) => r.id) });
  }
  if (ds.feedback.length && !fbDays.length && allFbWeek.length)
    ruledOut.push({
      text: `Customer feedback: ${plural(allFbWeek.length, 'review')} averaging ${avg(allFbWeek.map((r) => r.rating)).toFixed(1)}★, in line with usual${baseFbAvg ? ` (${baseFbAvg.toFixed(1)}★)` : ''}.`,
      evidence: allFbWeek.slice(0, 12).map((r) => r.id),
    });
  if (multi && stats.peerChange > -0.02)
    ruledOut.push({ text: `A city-wide slowdown: other branches were ${pct(stats.peerChange)} vs their usual week.`, evidence: [] });
  if (ds.events.length && !eventDays.length) ruledOut.push({ text: 'Local events: nothing was logged near this branch this week.', evidence: [] });

  /* ---- Actions ---- */
  const actions: SuggestedAction[] = [];
  const aid = (k: string) => `${branch}|${end}|${k}`.toLowerCase().replace(/\s+/g, '-');
  const real = drivers.filter((d) => d.key !== 'unexplained' && (d.impact > 0 || d.key === 'feedback'));
  for (const d of real) {
    if (d.key === 'staffing') {
      const names = [...new Set(d.days.map((x) => DAY_NAMES[weekday(x)]))];
      actions.push({
        id: aid('staffing'),
        driver: 'staffing',
        title: `Line up standby cover for ${branch}`,
        detail: `${joinList(names)} ran short-staffed and sales fell with it (about ${C(d.impact)}). Keep two on-call people who can cover at short notice, and ask the shift lead to flag gaps the evening before.`,
        evidence: d.evidence,
      });
    }
    if (d.key === 'stock') {
      const items = new Map<string, number>();
      for (const id of d.evidence) {
        const r = ds.stock.find((s) => s.id === id);
        if (r) items.set(r.item, (items.get(r.item) ?? 0) + r.hoursOut);
      }
      const top = [...items.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
      actions.push({
        id: aid('stock'),
        driver: 'stock',
        title: `Raise stock levels for ${joinList(top.map(([i]) => i))}`,
        detail: `${top.map(([i, h]) => `${i} was out for ${h} h`).join(', ')} this week. Increase the order for these items or move the delivery earlier, and set a reorder alert before the weekend rush.`,
        evidence: d.evidence,
      });
    }
    if (d.key === 'hours') {
      actions.push({
        id: aid('hours'),
        driver: 'hours',
        title: `Name a backup key-holder for ${branch}`,
        detail: `${d.details.map((x) => x.text.replace(/\.$/, '')).join('. ')}. Give a second person keys and alarm access, and send an automatic alert if the branch isn't open 10 minutes after opening time.`,
        evidence: d.evidence,
      });
    }
    if (d.key === 'events') {
      actions.push({
        id: aid('events'),
        driver: 'events',
        title: 'Plan around outside disruptions',
        detail: `When something nearby is known in advance (${d.details.map((x) => x.text.split(': ')[1]?.replace(/\.$/, '')).filter(Boolean).join('; ')}), push delivery and app orders, put up clear signage, and schedule fewer staff for those hours.`,
        evidence: d.evidence,
      });
    }
    if (d.key === 'feedback') {
      const negatives = d.evidence.length;
      const wait = weekThemes.wait?.length ?? 0;
      actions.push({
        id: aid('feedback'),
        driver: 'feedback',
        title: `Reply to ${plural(negatives, 'unhappy customer')}`,
        detail: `${wait ? `${plural(wait, 'review')} mention waiting. ` : ''}Thank them, explain what you are fixing, and offer a small make-good. People who get a reply often come back.`,
        evidence: d.evidence,
      });
    }
  }
  const unexplained = drivers.find((d) => d.key === 'unexplained');
  if (unexplained) {
    actions.push({
      id: aid('unexplained'),
      driver: 'unexplained',
      title: `Ask the ${branch} manager about ${unexplained.days.length ? listDays(unexplained.days) : 'the rest of the week'}`,
      detail: 'Your files show nothing unusual on those days. Check things the data does not capture: card machine or POS downtime, a new competitor, maintenance, delivery-app issues, or parking.',
      evidence: unexplained.evidence,
    });
  }

  /* ---- Day briefs ---- */
  const days: DayBrief[] = stats.days.map((p) => {
    const sig = signals.get(p.date)!;
    const change = p.expected ? p.actual / p.expected - 1 : 0;
    const marketChange = p.expected ? p.marketExpected / p.expected - 1 : 0;
    const gp = dayGapPct.get(p.date) ?? 0;
    const status: DayBrief['status'] = gp >= NOISE ? 'down' : gp <= -NOISE ? 'up' : 'normal';
    const lines: Cited[] = [];
    if (sig.staff) lines.push({ text: `${sig.staff.actual} of ${sig.staff.scheduled} scheduled staff worked.`, evidence: sig.staff.rows.map((r) => r.id) });
    if (sig.stock) lines.push({ text: `Ran out of ${joinList(sig.stock.rows.map((r) => `${r.item} (${r.hoursOut} h)`))}.`, evidence: sig.stock.rows.map((r) => r.id) });
    if (sig.hours) {
      const bits = [];
      if (sig.hours.late) bits.push(`opened ${minutes(sig.hours.late)} late`);
      if (sig.hours.early) bits.push(`closed ${minutes(sig.hours.early)} early`);
      lines.push({ text: `The branch ${bits.join(' and ')}.`, evidence: sig.hours.rows.map((r) => r.id) });
    }
    if (sig.events) lines.push({ text: sig.events.rows.map((r) => `${r.type}${r.description ? `: ${r.description}` : ''}`).join('. ') + '.', evidence: sig.events.rows.map((r) => r.id) });
    if (sig.marketEvents.length)
      lines.push({ text: `All branches: ${sig.marketEvents.map((r) => r.description || r.type).join('. ')}.`, evidence: sig.marketEvents.map((r) => r.id) });
    if (sig.feedback && sig.feedback.negatives.length)
      lines.push({
        text: `${plural(sig.feedback.negatives.length, 'unhappy review')}${bestQuote(sig.feedback.negatives) ? `, e.g. “${bestQuote(sig.feedback.negatives)}”` : ''}.`,
        evidence: sig.feedback.negatives.map((r) => r.id),
      });
    if (!lines.length) lines.push({ text: status === 'down' ? 'Nothing in your files explains this day.' : 'A normal day. Nothing unusual recorded.', evidence: p.salesId ? [p.salesId] : [] });
    return { date: p.date, actual: p.actual, expected: p.expected, marketExpected: p.marketExpected, change, marketChange, status, lines };
  });

  /* ---- Headline & summary ---- */
  const lost = stats.expected - stats.actual;
  const named = drivers.filter((d) => d.key !== 'unexplained' && d.impact > 0).slice(0, 2);
  let headline: string;
  if (stats.change >= 0 && stats.relative >= 0) {
    headline = `${branch} had a good week: ${C(stats.actual)}, ${pct(stats.change)} vs its usual week.`;
  } else {
    headline = `${branch} made ${C(Math.abs(lost))} ${lost >= 0 ? 'less' : 'more'} than a usual week (${pct(stats.change)})${multi ? `, while the other branches were ${pct(stats.peerChange)}` : ''}.`;
    if (named.length) headline += ` Most of the gap lines up with ${joinList(named.map((d) => d.title.toLowerCase()))}.`;
  }

  const summary: Cited[] = [];
  summary.push({
    text: `${branch} took ${C(stats.actual)} from ${shortDate(start)} to ${shortDate(end)}, against about ${C(stats.expected)} on a usual week (average of the same weekdays over the previous ${plural(weeks, 'week')}).`,
    evidence: stats.days.map((d) => d.salesId).filter((x): x is string => !!x),
  });
  for (const d of drivers.slice(0, 4)) {
    if (d.key === 'unexplained') continue;
    summary.push({ text: `${d.title}: ${d.summary}${d.impact > 0 ? ` Estimated effect: ${C(d.impact)}.` : ''}`, evidence: d.evidence });
  }

  return {
    ok: true,
    report: {
      branch,
      currency,
      period: { start, end, baselineStart, baselineEnd, dates },
      stats,
      allStats,
      headline,
      summary,
      changeBreakdown: { ordersEffect, ticketEffect, text: breakdownText },
      market: { impact: marketImpact, text: marketText, evidence: marketEv.map((e) => e.id) },
      drivers,
      ruledOut,
      actions,
      days,
      dataNotes,
      branchGap,
    },
  };
}

/** Weekly revenue per branch for trend charts. */
export function weeklySeries(ds: Dataset, end?: string, weeks = 6) {
  const b = dateBounds(ds);
  if (!b) return { weeks: [] as string[], series: [] as { branch: string; values: number[] }[] };
  const last = end && end <= b.max ? end : b.max;
  const ends: string[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const e = addDays(last, -7 * i);
    if (addDays(e, -6) >= b.min) ends.push(e);
  }
  const branches = listBranches(ds);
  const m = groupBy(ds.sales);
  const series = branches.map((br) => ({
    branch: br,
    values: ends.map((e) => {
      let t = 0;
      for (let d = addDays(e, -6); d <= e; d = addDays(d, 1)) for (const r of m.get(key(br, d)) ?? []) t += r.revenue;
      return t;
    }),
  }));
  return { weeks: ends, series };
}

/** Finds any record by id across all files. */
export function findRecord(ds: Dataset, id: string) {
  const prefix = id.split('-')[0];
  const map: Record<string, keyof Dataset> = { SAL: 'sales', STF: 'staffing', STK: 'stock', HRS: 'hours', FBK: 'feedback', EVT: 'events' };
  const k = map[prefix];
  if (!k) return null;
  const row = (ds[k] as { id: string; line: number }[]).find((r) => r.id === id);
  return row ? { dataset: k, row } : null;
}
