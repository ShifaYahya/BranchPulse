import Papa from 'papaparse';
import type {
  AnyRow,
  DatasetKey,
  EventRow,
  FeedbackRow,
  HoursRow,
  SalesRow,
  StaffRow,
  StockRow,
} from './types';

export interface ColumnSpec {
  key: string;
  label: string;
  aliases: string[];
  kind: 'date' | 'text' | 'number' | 'time';
  required: boolean;
  example: string;
}

export interface Schema {
  key: DatasetKey;
  title: string;
  fileName: string;
  prefix: string;
  required: boolean;
  description: string;
  columns: ColumnSpec[];
}

const date: ColumnSpec = {
  key: 'date',
  label: 'date',
  aliases: ['date', 'day', 'business_date', 'sales_date', 'التاريخ'],
  kind: 'date',
  required: true,
  example: '2026-11-15',
};
const branch: ColumnSpec = {
  key: 'branch',
  label: 'branch',
  aliases: ['branch', 'location', 'store', 'site', 'outlet', 'shop', 'الفرع'],
  kind: 'text',
  required: true,
  example: 'Olaya',
};

export const SCHEMAS: Record<DatasetKey, Schema> = {
  sales: {
    key: 'sales',
    title: 'Sales',
    fileName: 'sales.csv',
    prefix: 'SAL',
    required: true,
    description: 'One row per branch per day: how many orders and how much money came in.',
    columns: [
      date,
      branch,
      { key: 'orders', label: 'orders', aliases: ['orders', 'transactions', 'tickets', 'receipts', 'visits', 'bookings', 'checkins', 'count'], kind: 'number', required: true, example: '312' },
      { key: 'revenue', label: 'revenue', aliases: ['revenue', 'sales', 'net_sales', 'gross_sales', 'amount', 'total', 'income'], kind: 'number', required: true, example: '9850.50' },
    ],
  },
  staffing: {
    key: 'staffing',
    title: 'Staffing',
    fileName: 'staffing.csv',
    prefix: 'STF',
    required: false,
    description: 'How many people were planned for each day, and how many actually worked.',
    columns: [
      date,
      branch,
      { key: 'scheduled', label: 'scheduled_staff', aliases: ['scheduled_staff', 'scheduled', 'planned', 'planned_staff', 'rostered', 'scheduled_hours', 'planned_hours'], kind: 'number', required: true, example: '5' },
      { key: 'actual', label: 'actual_staff', aliases: ['actual_staff', 'actual', 'present', 'worked', 'actual_hours', 'worked_hours', 'clocked_in'], kind: 'number', required: true, example: '4' },
    ],
  },
  stock: {
    key: 'stock',
    title: 'Stockouts',
    fileName: 'stock.csv',
    prefix: 'STK',
    required: false,
    description: 'Items that ran out, and for roughly how many hours they were unavailable.',
    columns: [
      date,
      branch,
      { key: 'item', label: 'item', aliases: ['item', 'product', 'sku', 'service', 'item_name'], kind: 'text', required: true, example: 'Oat milk' },
      { key: 'hoursOut', label: 'hours_out', aliases: ['hours_out', 'hours', 'stockout_hours', 'out_hours', 'duration_hours'], kind: 'number', required: true, example: '4' },
    ],
  },
  hours: {
    key: 'hours',
    title: 'Opening hours',
    fileName: 'hours.csv',
    prefix: 'HRS',
    required: false,
    description: 'Planned and actual opening and closing times (24-hour, like 07:00).',
    columns: [
      date,
      branch,
      { key: 'scheduledOpen', label: 'scheduled_open', aliases: ['scheduled_open', 'planned_open', 'open_time_planned'], kind: 'time', required: true, example: '07:00' },
      { key: 'actualOpen', label: 'actual_open', aliases: ['actual_open', 'opened_at', 'open_time_actual'], kind: 'time', required: true, example: '07:35' },
      { key: 'scheduledClose', label: 'scheduled_close', aliases: ['scheduled_close', 'planned_close', 'close_time_planned'], kind: 'time', required: true, example: '23:00' },
      { key: 'actualClose', label: 'actual_close', aliases: ['actual_close', 'closed_at', 'close_time_actual'], kind: 'time', required: true, example: '23:00' },
    ],
  },
  feedback: {
    key: 'feedback',
    title: 'Customer feedback',
    fileName: 'feedback.csv',
    prefix: 'FBK',
    required: false,
    description: 'Reviews or survey answers: a 1–5 rating and the comment, if any.',
    columns: [
      date,
      branch,
      { key: 'rating', label: 'rating', aliases: ['rating', 'score', 'stars', 'csat'], kind: 'number', required: true, example: '2' },
      { key: 'comment', label: 'comment', aliases: ['comment', 'review', 'text', 'feedback', 'notes'], kind: 'text', required: false, example: 'Waited 20 minutes for a latte' },
    ],
  },
  events: {
    key: 'events',
    title: 'Local events & weather',
    fileName: 'events.csv',
    prefix: 'EVT',
    required: false,
    description: 'Anything outside your control: weather, road works, holidays, nearby events. Use "All" for every branch.',
    columns: [
      date,
      branch,
      { key: 'type', label: 'type', aliases: ['type', 'category', 'kind'], kind: 'text', required: true, example: 'Road works' },
      { key: 'description', label: 'description', aliases: ['description', 'details', 'note', 'notes'], kind: 'text', required: false, example: 'Main entrance road closed until 6pm' },
    ],
  },
};

export const DATASET_ORDER: DatasetKey[] = ['sales', 'staffing', 'stock', 'hours', 'feedback', 'events'];

export interface ParseIssue {
  line: number;
  message: string;
}

export interface ParseResult<T extends AnyRow = AnyRow> {
  rows: T[];
  issues: ParseIssue[];
  fatal?: string;
  totalLines: number;
}

const normalizeHeader = (h: string) =>
  h
    .replace(/^﻿/, '')
    .trim()
    .toLowerCase()
    .replace(/[\s\-/.]+/g, '_')
    .replace(/[()]/g, '');

const pad = (n: number) => String(n).padStart(2, '0');

/** Accepts YYYY-MM-DD, YYYY/MM/DD, DD/MM/YYYY and DD-MM-YYYY. */
export function parseDate(raw: string): string | null {
  const s = raw.trim();
  let y: number, m: number, d: number;
  let match = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s].*)?$/);
  if (match) {
    y = +match[1];
    m = +match[2];
    d = +match[3];
  } else {
    match = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (!match) return null;
    d = +match[1];
    m = +match[2];
    y = +match[3];
  }
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** "07:30", "7:30", "0730", "7:30 PM" → minutes after midnight. */
export function parseTime(raw: string): number | null {
  const s = raw.trim().toLowerCase();
  const match = s.match(/^(\d{1,2}):?(\d{2})(?::\d{2})?\s*(am|pm)?$/);
  if (!match) return null;
  let h = +match[1];
  const min = +match[2];
  const ap = match[3];
  if (ap) {
    if (h < 1 || h > 12) return null;
    if (ap === 'pm' && h !== 12) h += 12;
    if (ap === 'am' && h === 12) h = 0;
  }
  if (h > 24 || min > 59 || (h === 24 && min > 0)) return null;
  return h * 60 + min;
}

export function parseNumber(raw: string): number | null {
  const s = raw.trim().replace(/[,\s]/g, '').replace(/^(SAR|SR|ر\.س|\$|€|£)/i, '');
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function cleanBranch(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

export function parseCsv(key: DatasetKey, text: string): ParseResult {
  const schema = SCHEMAS[key];
  const parsed = Papa.parse<string[]>(text.trim(), { skipEmptyLines: 'greedy' });
  const data = parsed.data;
  if (!data.length) return { rows: [], issues: [], fatal: 'The file is empty.', totalLines: 0 };

  const header = data[0].map(normalizeHeader);
  const index: Record<string, number> = {};
  const missing: string[] = [];
  for (const col of schema.columns) {
    const pos = header.findIndex((h) => col.aliases.includes(h));
    if (pos === -1) {
      if (col.required) missing.push(col.label);
    } else index[col.key] = pos;
  }
  if (missing.length) {
    return {
      rows: [],
      issues: [],
      totalLines: data.length - 1,
      fatal: `Missing column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}. Found: ${data[0].join(', ') || 'nothing'}.`,
    };
  }

  const rows: AnyRow[] = [];
  const issues: ParseIssue[] = [];

  for (let i = 1; i < data.length; i++) {
    const cells = data[i];
    const line = i + 1;
    const get = (k: string) => (index[k] === undefined ? '' : String(cells[index[k]] ?? ''));
    const problems: string[] = [];
    const values: Record<string, string | number> = {};

    for (const col of schema.columns) {
      const raw = get(col.key);
      if (raw.trim() === '') {
        if (col.required) problems.push(`${col.label} is empty`);
        else values[col.key] = '';
        continue;
      }
      if (col.kind === 'date') {
        const v = parseDate(raw);
        if (!v) problems.push(`"${raw}" is not a date (use YYYY-MM-DD)`);
        else values[col.key] = v;
      } else if (col.kind === 'number') {
        const v = parseNumber(raw);
        if (v === null || v < 0) problems.push(`${col.label} "${raw}" is not a positive number`);
        else values[col.key] = v;
      } else if (col.kind === 'time') {
        const v = parseTime(raw);
        if (v === null) problems.push(`${col.label} "${raw}" is not a time (use HH:MM)`);
        else values[col.key] = v;
      } else {
        values[col.key] = col.key === 'branch' ? cleanBranch(raw) : raw.trim();
      }
    }

    if (key === 'feedback' && typeof values.rating === 'number' && (values.rating < 1 || values.rating > 5)) {
      problems.push(`rating ${values.rating} must be between 1 and 5`);
    }
    if (key === 'stock' && typeof values.hoursOut === 'number' && values.hoursOut > 24) {
      problems.push(`hours_out ${values.hoursOut} is more than 24`);
    }

    if (problems.length) {
      issues.push({ line, message: problems.join('; ') });
      continue;
    }
    rows.push({ id: `${schema.prefix}-${line}`, line, ...values } as unknown as AnyRow);
  }

  return { rows, issues, totalLines: data.length - 1 };
}

export type RowOf<K extends DatasetKey> = K extends 'sales'
  ? SalesRow
  : K extends 'staffing'
    ? StaffRow
    : K extends 'stock'
      ? StockRow
      : K extends 'hours'
        ? HoursRow
        : K extends 'feedback'
          ? FeedbackRow
          : EventRow;

export const minutesToTime = (m: number) => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;

const csvCell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Turn rows back into CSV text (used for templates and sample downloads). */
export function toCsv(key: DatasetKey, rows: AnyRow[]): string {
  const schema = SCHEMAS[key];
  const head = schema.columns.map((c) => c.label).join(',');
  const body = rows.map((r) =>
    schema.columns
      .map((c) => {
        const v = (r as unknown as Record<string, string | number>)[c.key];
        if (c.kind === 'time' && typeof v === 'number') return minutesToTime(v);
        return csvCell(v ?? '');
      })
      .join(','),
  );
  return [head, ...body].join('\n') + '\n';
}

export function templateCsv(key: DatasetKey): string {
  const schema = SCHEMAS[key];
  return schema.columns.map((c) => c.label).join(',') + '\n' + schema.columns.map((c) => csvCell(c.example)).join(',') + '\n';
}
