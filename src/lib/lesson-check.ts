// Per-key id lists ("lesson done" ticks) on top of learn-store's blocked-storage-safe JSON helpers.
import { getJSON, setJSON } from './learn-store.ts';

export function getList(key: string): string[] {
  const v = getJSON<unknown>(key);
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

export const hasItem = (key: string, id: string): boolean => getList(key).includes(id);

// Adds (on=true) or removes (on=false) id; returns the resulting list.
export function toggleItem(key: string, id: string, on: boolean): string[] {
  const rest = getList(key).filter((x) => x !== id);
  const next = on ? [...rest, id] : rest;
  setJSON(key, next);
  return next;
}
