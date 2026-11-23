import { useMemo } from 'react';
import { analyze, availableWeeks, listBranches } from './engine';
import { useStore } from './store';

export function useReport(branch?: string, end?: string) {
  const { ws } = useStore();
  const weeks = useMemo(() => availableWeeks(ws.data), [ws.data]);
  const branches = useMemo(() => listBranches(ws.data), [ws.data]);
  const validEnd = end && weeks.includes(end) ? end : weeks[0];
  const result = useMemo(
    () => analyze(ws.data, { end: validEnd, branch, baselineWeeks: ws.settings.baselineWeeks, currency: ws.settings.currency }),
    [ws.data, validEnd, branch, ws.settings.baselineWeeks, ws.settings.currency],
  );
  return { result, weeks, branches, end: validEnd };
}
