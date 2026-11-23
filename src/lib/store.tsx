import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { defaultSettings, emptyDataset, type ActionTask, type Dataset, type DatasetKey, type FileMeta, type Settings, type Workspace } from './types';

const STORAGE_KEY = 'branchpulse:workspace:v1';

const fresh = (): Workspace => ({ version: 1, data: emptyDataset(), files: {}, settings: defaultSettings(), actions: [] });

function load(): Workspace {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fresh();
    return normalize(JSON.parse(raw));
  } catch {
    return fresh();
  }
}

/** Accepts anything that looks like a workspace and fills in gaps safely. */
export function normalize(input: unknown): Workspace {
  const base = fresh();
  if (!input || typeof input !== 'object') return base;
  const w = input as Partial<Workspace>;
  const data = { ...base.data };
  if (w.data && typeof w.data === 'object') {
    for (const k of Object.keys(data) as DatasetKey[]) {
      const rows = (w.data as Partial<Dataset>)[k];
      if (Array.isArray(rows)) (data as Record<DatasetKey, unknown[]>)[k] = rows;
    }
  }
  return {
    version: 1,
    data,
    files: w.files && typeof w.files === 'object' ? w.files : {},
    settings: { ...base.settings, ...(w.settings ?? {}) },
    actions: Array.isArray(w.actions) ? w.actions : [],
  };
}

interface Store {
  ws: Workspace;
  saveError: string | null;
  hasData: boolean;
  setDataset: (key: DatasetKey, rows: Dataset[DatasetKey], meta: FileMeta) => void;
  removeDataset: (key: DatasetKey) => void;
  replaceAll: (ws: Workspace) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  addAction: (a: ActionTask) => void;
  updateAction: (id: string, patch: Partial<ActionTask>) => void;
  removeAction: (id: string) => void;
  resetData: () => void;
  resetAll: () => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ws, setWs] = useState<Workspace>(load);
  const [saveError, setSaveError] = useState<string | null>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ws));
      setSaveError(null);
    } catch {
      setSaveError('Your browser could not save this workspace (storage may be full or blocked). Download a backup from Settings so nothing is lost.');
    }
  }, [ws]);

  const setDataset = useCallback((key: DatasetKey, rows: Dataset[DatasetKey], meta: FileMeta) => {
    setWs((w) => ({ ...w, data: { ...w.data, [key]: rows }, files: { ...w.files, [key]: meta } }));
  }, []);
  const removeDataset = useCallback((key: DatasetKey) => {
    setWs((w) => {
      const files = { ...w.files };
      delete files[key];
      return { ...w, data: { ...w.data, [key]: [] }, files };
    });
  }, []);
  const replaceAll = useCallback((next: Workspace) => setWs(normalize(next)), []);
  const updateSettings = useCallback((patch: Partial<Settings>) => setWs((w) => ({ ...w, settings: { ...w.settings, ...patch } })), []);
  const addAction = useCallback(
    (a: ActionTask) => setWs((w) => (w.actions.some((x) => x.id === a.id) ? w : { ...w, actions: [a, ...w.actions] })),
    [],
  );
  const updateAction = useCallback(
    (id: string, patch: Partial<ActionTask>) => setWs((w) => ({ ...w, actions: w.actions.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
    [],
  );
  const removeAction = useCallback((id: string) => setWs((w) => ({ ...w, actions: w.actions.filter((a) => a.id !== id) })), []);
  const resetData = useCallback(() => setWs((w) => ({ ...w, data: emptyDataset(), files: {} })), []);
  const resetAll = useCallback(() => setWs(fresh()), []);

  const value = useMemo<Store>(
    () => ({
      ws,
      saveError,
      hasData: ws.data.sales.length > 0,
      setDataset,
      removeDataset,
      replaceAll,
      updateSettings,
      addAction,
      updateAction,
      removeAction,
      resetData,
      resetAll,
    }),
    [ws, saveError, setDataset, removeDataset, replaceAll, updateSettings, addAction, updateAction, removeAction, resetData, resetAll],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
}
