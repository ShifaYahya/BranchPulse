export type DatasetKey = 'sales' | 'staffing' | 'stock' | 'hours' | 'feedback' | 'events';

interface BaseRow {
  /** Stable record id, e.g. "SAL-14" (row 14 of the sales file). */
  id: string;
  /** Line number in the original file (header is line 1). */
  line: number;
  date: string; // YYYY-MM-DD
  branch: string;
}

export interface SalesRow extends BaseRow {
  orders: number;
  revenue: number;
}

export interface StaffRow extends BaseRow {
  scheduled: number;
  actual: number;
}

export interface StockRow extends BaseRow {
  item: string;
  hoursOut: number;
}

export interface HoursRow extends BaseRow {
  scheduledOpen: number; // minutes after midnight
  actualOpen: number;
  scheduledClose: number;
  actualClose: number;
}

export interface FeedbackRow extends BaseRow {
  rating: number; // 1-5
  comment: string;
}

export interface EventRow extends BaseRow {
  type: string;
  description: string;
}

export type AnyRow = SalesRow | StaffRow | StockRow | HoursRow | FeedbackRow | EventRow;

export interface Dataset {
  sales: SalesRow[];
  staffing: StaffRow[];
  stock: StockRow[];
  hours: HoursRow[];
  feedback: FeedbackRow[];
  events: EventRow[];
}

export interface FileMeta {
  fileName: string;
  importedAt: number;
  rows: number;
  skipped: number;
}

export interface Settings {
  businessName: string;
  currency: string;
  baselineWeeks: number;
  aiKey: string;
  aiModel: string;
}

export type ActionStatus = 'todo' | 'doing' | 'done';

export interface ActionTask {
  id: string;
  branch: string;
  title: string;
  detail: string;
  evidence: string[];
  owner: string;
  due: string;
  status: ActionStatus;
  createdAt: number;
}

export interface Workspace {
  version: 1;
  data: Dataset;
  files: Partial<Record<DatasetKey, FileMeta>>;
  settings: Settings;
  actions: ActionTask[];
}

export const emptyDataset = (): Dataset => ({
  sales: [],
  staffing: [],
  stock: [],
  hours: [],
  feedback: [],
  events: [],
});

export const defaultSettings = (): Settings => ({
  businessName: '',
  currency: 'SAR',
  baselineWeeks: 4,
  aiKey: '',
  aiModel: 'gemini-flash-latest',
});
