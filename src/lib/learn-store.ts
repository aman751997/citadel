// Tiny localStorage wrapper for lesson progress. Falls back to memory when storage is blocked.
// Pure helpers (keys, scoring) live below and are unit-tested in tests/learn-store.test.ts.

export const QUIZ_PREFIX = 'citadel-quiz-v1';
export const CHAPTER_PREFIX = 'citadel-chapter-v1';
export const PASS_RATIO = 0.7;

export const quizKey = (pathname: string, idOrIndex: string | number) => `${QUIZ_PREFIX}:${pathname}:${idOrIndex}`;
export const chapterKey = (pathname: string, id: string) => `${CHAPTER_PREFIX}:${pathname}:${id}`;

export interface QuizState {
  picks: (number | null)[];
  best: number | null;
}

export function scorePicks(picks: (number | null)[], answers: number[]) {
  const total = answers.length;
  const answered = picks.filter((p, i) => i < total && p !== null && p !== undefined).length;
  const score = answers.reduce((n, a, i) => n + (picks[i] === a ? 1 : 0), 0);
  return { score, total, done: total > 0 && answered === total };
}

export const bestOf = (prev: number | null | undefined, score: number) => Math.max(prev ?? 0, score);
export const isPassed = (best: number | null | undefined, total: number) =>
  best != null && total > 0 && best / total >= PASS_RATIO;

// Coerce untrusted stored JSON into a valid QuizState for `total` questions.
export function normalizeQuizState(raw: unknown, total: number, optionCounts: number[]): QuizState {
  const r = (raw ?? {}) as Partial<QuizState>;
  const picks = Array.from({ length: total }, (_, i) => {
    const p = Array.isArray(r.picks) ? r.picks[i] : null;
    return Number.isInteger(p) && (p as number) >= 0 && (p as number) < optionCounts[i] ? (p as number) : null;
  });
  const best = typeof r.best === 'number' && r.best >= 0 && r.best <= total ? r.best : null;
  return { picks, best };
}

const memory = new Map<string, string>();

function storage(): Storage | null {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

export function getJSON<T>(key: string): T | null {
  let raw: string | null | undefined;
  try { raw = storage()?.getItem(key); } catch { raw = undefined; }
  raw ??= memory.get(key);
  if (raw == null) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export function setJSON(key: string, value: unknown) {
  const raw = JSON.stringify(value);
  memory.set(key, raw);
  try { storage()?.setItem(key, raw); } catch { /* blocked or full: memory copy remains */ }
}

export function remove(key: string) {
  memory.delete(key);
  try { storage()?.removeItem(key); } catch { /* ignore */ }
}

export function keysWithPrefix(prefix: string): string[] {
  const found = new Set([...memory.keys()].filter((k) => k.startsWith(prefix)));
  try {
    const s = storage();
    for (let i = 0; s && i < s.length; i++) {
      const k = s.key(i);
      if (k?.startsWith(prefix)) found.add(k);
    }
  } catch { /* ignore */ }
  return [...found];
}
