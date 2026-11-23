export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function weekday(iso: string): number {
  return new Date(iso + 'T00:00:00Z').getUTCDay();
}

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
}

/** "Tue 17 Nov" */
export function shortDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  return `${DAY_SHORT[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** "17 Nov 2026" */
export function longDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function rangeLabel(start: string, end: string): string {
  const a = new Date(start + 'T00:00:00Z');
  const b = new Date(end + 'T00:00:00Z');
  if (a.getUTCFullYear() === b.getUTCFullYear()) {
    return `${a.getUTCDate()} ${MONTHS[a.getUTCMonth()]} – ${longDate(end)}`;
  }
  return `${longDate(start)} – ${longDate(end)}`;
}

/** Joins day names naturally: "Mon, Tue and Sat". */
export function listDays(dates: string[]): string {
  const names = dates.map((d) => DAY_SHORT[weekday(d)]);
  return joinList(names);
}

export function joinList(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
}
