// Pure timer / phase / scoring logic for <MockInterview>. Wall-clock based: callers pass `now` (Date.now()).

export interface Timer { elapsedMs: number; startedAt: number | null }

export const newTimer = (): Timer => ({ elapsedMs: 0, startedAt: null });
export const isRunning = (t: Timer) => t.startedAt !== null;
export const elapsedMs = (t: Timer, now: number) => t.elapsedMs + (t.startedAt === null ? 0 : Math.max(0, now - t.startedAt));
export const startTimer = (t: Timer, now: number): Timer => (t.startedAt === null ? { ...t, startedAt: now } : t);
export const pauseTimer = (t: Timer, now: number): Timer =>
  t.startedAt === null ? t : { elapsedMs: elapsedMs(t, now), startedAt: null };
export const remainingMs = (t: Timer, now: number, totalMinutes: number) =>
  Math.max(0, totalMinutes * 60000 - elapsedMs(t, now));

// Whole seconds, rounded up so the clock never shows 00:00 while time is left. H:MM:SS from one hour.
export function formatClock(ms: number): string {
  const s = Math.ceil(Math.max(0, ms) / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const mm = String(m).padStart(h ? 2 : 1, '0'), ss = String(sec).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// Scale phase minutes so they add up to the session length (e.g. a 60-minute phase list run as a 90-minute mock).
export function scaleBudgets(minutes: number[], totalMinutes: number): number[] {
  const sum = minutes.reduce((a, b) => a + b, 0);
  return sum > 0 ? minutes.map((m) => (m * totalMinutes) / sum) : minutes.map(() => totalMinutes / Math.max(1, minutes.length));
}

export function phaseClock(budgetMin: number, spentMs: number) {
  const left = budgetMin * 60000 - spentMs;
  return { over: left < 0, ms: Math.abs(left) };
}

export const nextHintCount = (shown: number, available: number) => Math.min(available, Math.max(0, shown) + 1);
export const MAX_HINTS = 3;

// The reference stays locked until the learner wrote something or says they tried on paper.
export const canReveal = (notes: string, attempted: boolean) => attempted || notes.trim().length > 0;

export const scoreChecklist = (checks: boolean[]) => {
  const total = checks.length, done = checks.filter(Boolean).length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
};

export interface Session {
  timer: Timer;
  phase: number;
  phaseStarts: number[];
  notes: string[];
  attempted: boolean[];
  hints: number[];
  revealed: boolean[];
  checks: boolean[];
  finished: boolean;
}

export function newSession(phases: number, checks: number): Session {
  return {
    timer: newTimer(), phase: 0, phaseStarts: Array(phases).fill(0), notes: Array(phases).fill(''),
    attempted: Array(phases).fill(false), hints: Array(phases).fill(0), revealed: Array(phases).fill(false),
    checks: Array(checks).fill(false), finished: false,
  };
}

// Coerce untrusted stored JSON into a valid Session.
export function normalizeSession(raw: unknown, phases: number, checks: number): Session {
  const base = newSession(phases, checks);
  const r = (raw ?? {}) as Partial<Session>;
  const arr = <T>(v: unknown, n: number, ok: (x: unknown) => x is T, d: T): T[] =>
    Array.from({ length: n }, (_, i) => (Array.isArray(v) && ok(v[i]) ? (v[i] as T) : d));
  const num = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && x >= 0;
  const t = (r.timer ?? {}) as Partial<Timer>;
  return {
    timer: { elapsedMs: num(t.elapsedMs) ? t.elapsedMs : 0, startedAt: num(t.startedAt) ? t.startedAt : null },
    phase: Number.isInteger(r.phase) && r.phase! >= 0 && r.phase! < phases ? r.phase! : 0,
    phaseStarts: arr(r.phaseStarts, phases, num, 0),
    notes: arr(r.notes, phases, (x): x is string => typeof x === 'string', ''),
    attempted: arr(r.attempted, phases, (x): x is boolean => typeof x === 'boolean', false),
    hints: arr(r.hints, phases, (x): x is number => Number.isInteger(x) && (x as number) >= 0 && (x as number) <= MAX_HINTS, 0),
    revealed: arr(r.revealed, phases, (x): x is boolean => typeof x === 'boolean', false),
    checks: arr(r.checks, checks, (x): x is boolean => typeof x === 'boolean', false),
    finished: r.finished === true ? true : base.finished,
  };
}
