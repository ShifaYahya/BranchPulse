export function money(n: number, currency = 'SAR', digits = 0): string {
  const v = Number.isFinite(n) ? n : 0;
  const s = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return `${v < 0 ? '−' : ''}${currency} ${s}`;
}

export function compactMoney(n: number, currency = 'SAR'): string {
  const a = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (a >= 1_000_000) return `${sign}${currency} ${(a / 1_000_000).toFixed(1)}M`;
  if (a >= 10_000) return `${sign}${currency} ${(a / 1000).toFixed(0)}k`;
  if (a >= 1000) return `${sign}${currency} ${(a / 1000).toFixed(1)}k`;
  return `${sign}${currency} ${Math.round(a)}`;
}

/** 0.123 → "+12.3%" */
export function pct(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return '—';
  const v = n * 100;
  const s = Math.abs(v).toFixed(digits);
  if (Number(s) === 0) return '0%';
  return `${v > 0 ? '+' : '−'}${s}%`;
}

export function num(n: number, digits = 0): string {
  return (Number.isFinite(n) ? n : 0).toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

export function plural(n: number, one: string, many = one + 's'): string {
  return `${num(n)} ${n === 1 ? one : many}`;
}

export function minutes(m: number): string {
  if (m < 60) return `${Math.round(m)} min`;
  const h = Math.floor(m / 60);
  const r = Math.round(m % 60);
  return r ? `${h} h ${r} min` : `${h} h`;
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
