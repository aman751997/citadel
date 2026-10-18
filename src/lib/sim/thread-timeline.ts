// Interpreter for a tiny concurrent "program": threads of ops interleaved one op per step against shared state.
// Outcomes (lost update, double put, stale read, deadlock) are computed from the schedule, never hard-coded.
// Memory model (deliberately simplified): writes go to main memory; a non-volatile read is served from the
// thread's private cache once it has one; volatile vars, CAS and lock() always see/refresh main memory.

export type Val = number | boolean | string | null;
export type Op =
  | { op: 'read'; v: string; reg: string }
  | { op: 'calc'; reg: string; from: string; add: number }
  | { op: 'write'; v: string; reg?: string; value?: Val }
  | { op: 'lock' | 'unlock'; lock: string }
  | { op: 'cas'; v: string; expect: string; next: string; ok: string; retry: number }
  | { op: 'skipIf'; reg: string; to: number };

export type Goal =
  | { kind: 'var'; v: string; equals: Val }
  | { kind: 'writes'; v: string; equals: number }
  | { kind: 'reg'; thread: number; reg: string; equals: Val }
  | { kind: 'noDeadlock' };

export interface Scenario {
  id: string;
  title: string;
  summary: string;
  vars: Record<string, Val>;
  volatile?: string[];
  locks?: string[];
  threads: { name: string; ops: Op[] }[];
  schedule: number[];
  goal: Goal;
  good: string;
  bad: string;
}

export interface ThreadState { pc: number; regs: Record<string, Val>; cache: Record<string, Val> }
export interface Machine {
  vars: Record<string, Val>;
  locks: Record<string, number | null>;
  writes: Record<string, number>;
  threads: ThreadState[];
}
export type EventKind = 'ran' | 'blocked' | 'cas-fail' | 'stale';
export interface StepEvent { tid: number; pc: number; text: string; note: string; kind: EventKind; snap: Machine }

export function newMachine(s: Scenario): Machine {
  return {
    vars: { ...s.vars },
    locks: Object.fromEntries((s.locks ?? []).map((l) => [l, null])),
    writes: {},
    threads: s.threads.map(() => ({ pc: 0, regs: {}, cache: {} })),
  };
}

export const isDone = (s: Scenario, m: Machine, t: number) => m.threads[t].pc >= s.threads[t].ops.length;

export function isBlocked(s: Scenario, m: Machine, t: number) {
  if (isDone(s, m, t)) return false;
  const op = s.threads[t].ops[m.threads[t].pc];
  return op.op === 'lock' && m.locks[op.lock] !== null && m.locks[op.lock] !== t;
}

export const runnable = (s: Scenario, m: Machine) =>
  s.threads.map((_, t) => t).filter((t) => !isDone(s, m, t) && !isBlocked(s, m, t));
export const isFinished = (s: Scenario, m: Machine) => s.threads.every((_, t) => isDone(s, m, t));
export const isDeadlocked = (s: Scenario, m: Machine) => !isFinished(s, m) && runnable(s, m).length === 0;

const show = (v: Val | undefined) => (v === null || v === undefined ? 'null' : typeof v === 'string' ? `"${v}"` : String(v));

export function describe(op: Op): string {
  switch (op.op) {
    case 'read': return `${op.reg} = read ${op.v}`;
    case 'calc': return `${op.reg} = ${op.from} ${op.add >= 0 ? '+' : '-'} ${Math.abs(op.add)}`;
    case 'write': return `write ${op.v} = ${op.reg ?? show(op.value)}`;
    case 'lock': return `lock(${op.lock})`;
    case 'unlock': return `unlock(${op.lock})`;
    case 'cas': return `${op.ok} = CAS(${op.v}, ${op.expect} -> ${op.next})`;
    case 'skipIf': return `if ${op.reg} is set, skip ahead`;
  }
}

// Run thread t's next op. Returns null when the thread has finished.
export function step(s: Scenario, m: Machine, t: number): StepEvent | null {
  if (isDone(s, m, t)) return null;
  const th = m.threads[t];
  const pc = th.pc;
  const op = s.threads[t].ops[pc];
  const text = describe(op);
  const vol = (v: string) => s.volatile?.includes(v) ?? false;
  let kind: EventKind = 'ran';
  let note = '';
  let next = pc + 1;
  switch (op.op) {
    case 'read': {
      const useCache = !vol(op.v) && op.v in th.cache;
      const val = useCache ? th.cache[op.v] : m.vars[op.v];
      th.regs[op.reg] = val;
      if (!vol(op.v)) th.cache[op.v] = val;
      if (useCache && val !== m.vars[op.v]) { kind = 'stale'; note = `served from this thread's cached copy (${show(val)}); main memory already holds ${show(m.vars[op.v])}`; }
      else note = `${op.reg} is now ${show(val)}`;
      break;
    }
    case 'calc':
      th.regs[op.reg] = (th.regs[op.from] as number) + op.add;
      note = `${op.reg} is now ${show(th.regs[op.reg])} (private to this thread)`;
      break;
    case 'write': {
      const val = op.reg !== undefined ? th.regs[op.reg] : (op.value ?? null);
      const old = m.vars[op.v];
      m.vars[op.v] = val;
      th.cache[op.v] = val;
      m.writes[op.v] = (m.writes[op.v] ?? 0) + 1;
      note = old !== null && old !== val && m.writes[op.v] > 1 ? `${op.v} overwritten: ${show(old)} -> ${show(val)}` : `${op.v} is now ${show(val)}`;
      break;
    }
    case 'lock':
      if (m.locks[op.lock] !== null && m.locks[op.lock] !== t) {
        kind = 'blocked';
        next = pc;
        note = `${op.lock} is held by ${s.threads[m.locks[op.lock]!].name}, so ${s.threads[t].name} waits`;
      } else {
        m.locks[op.lock] = t;
        th.cache = {};
        note = `${s.threads[t].name} now owns ${op.lock}`;
      }
      break;
    case 'unlock':
      if (m.locks[op.lock] === t) m.locks[op.lock] = null;
      note = `${op.lock} released`;
      break;
    case 'cas': {
      const ok = m.vars[op.v] === th.regs[op.expect];
      th.regs[op.ok] = ok;
      if (ok) { m.vars[op.v] = th.regs[op.next]; m.writes[op.v] = (m.writes[op.v] ?? 0) + 1; note = `${op.v} was still ${show(th.regs[op.expect])}: swapped to ${show(th.regs[op.next])}`; }
      else { kind = 'cas-fail'; next = op.retry; note = `${op.v} is ${show(m.vars[op.v])}, not ${show(th.regs[op.expect])}: nothing written, retry from the read`; }
      break;
    }
    case 'skipIf':
      if (th.regs[op.reg]) { next = op.to; note = `${op.reg} is ${show(th.regs[op.reg])}, so the guarded work is skipped`; }
      else note = `${op.reg} is ${show(th.regs[op.reg])}, so the guarded work will run`;
      break;
  }
  th.pc = next;
  return { tid: t, pc, text, note, kind, snap: structuredClone(m) };
}

export function evaluate(s: Scenario, m: Machine): { met: boolean; text: string } {
  const g = s.goal;
  const met =
    g.kind === 'var' ? m.vars[g.v] === g.equals
    : g.kind === 'writes' ? (m.writes[g.v] ?? 0) === g.equals
    : g.kind === 'reg' ? m.threads[g.thread].regs[g.reg] === g.equals
    : !isDeadlocked(s, m);
  return { met, text: met ? s.good : s.bad };
}

// Run `schedule` (a scheduled thread that is blocked records a "blocked" event; a finished one is skipped),
// then let the first runnable thread finish the rest. Stops early on deadlock.
export function trace(s: Scenario, schedule: number[] = s.schedule) {
  const m = newMachine(s);
  const steps: StepEvent[] = [];
  for (const t of schedule) { const e = step(s, m, t); if (e) steps.push(e); }
  for (let guard = 0; guard < 500 && runnable(s, m).length; guard++) steps.push(step(s, m, runnable(s, m)[0])!);
  return { steps, final: m, deadlock: isDeadlocked(s, m), ...evaluate(s, m) };
}

// Try every interleaving (blocked threads are simply not chosen). Small programs only.
export function exploreAll(s: Scenario) {
  let met = 0, unmet = 0;
  const go = (m: Machine) => {
    const r = runnable(s, m);
    if (!r.length) { evaluate(s, m).met ? met++ : unmet++; return; }
    for (const t of r) { const c = structuredClone(m); step(s, c, t); go(c); }
  };
  go(newMachine(s));
  return { met, unmet, total: met + unmet };
}

const inc = (): Op[] => [
  { op: 'read', v: 'x', reg: 'r' }, { op: 'calc', reg: 'r', from: 'r', add: 1 }, { op: 'write', v: 'x', reg: 'r' },
];
const locked = (lock: string, ops: Op[]): Op[] => [{ op: 'lock', lock }, ...ops, { op: 'unlock', lock }];

const lostUpdate: Scenario = {
  id: 'lost-update',
  title: 'Lost update: counter++ from two threads',
  summary: 'x++ is three steps (read, add, write). Two threads each run it once on x = 0; we expect x = 2.',
  vars: { x: 0 },
  threads: [{ name: 'Thread A', ops: inc() }, { name: 'Thread B', ops: inc() }],
  schedule: [0, 1, 0, 1, 0, 1],
  goal: { kind: 'var', v: 'x', equals: 2 },
  good: 'x ended at 2: no update was lost.',
  bad: 'x ended below 2: both threads read the same old value, so one increment overwrote the other (a lost update).',
};

const lostUpdateSync: Scenario = {
  ...lostUpdate,
  id: 'lost-update-synchronized',
  title: 'Fixed with a lock: synchronized counter++',
  summary: 'Same increment, but the whole read-add-write sits inside lock(L). The second thread waits until the first unlocks.',
  locks: ['L'],
  threads: [{ name: 'Thread A', ops: locked('L', inc()) }, { name: 'Thread B', ops: locked('L', inc()) }],
  schedule: [0, 1, 0, 0, 0, 0, 1, 1, 1, 1, 1],
  good: 'x ended at 2: the lock made the read-add-write one indivisible unit, whatever the interleaving.',
};

const casLoop: Op[] = [
  { op: 'read', v: 'x', reg: 'r' }, { op: 'calc', reg: 'n', from: 'r', add: 1 },
  { op: 'cas', v: 'x', expect: 'r', next: 'n', ok: 'ok', retry: 0 },
];
const atomicCas: Scenario = {
  id: 'atomic-cas',
  title: 'AtomicInteger.incrementAndGet: compare-and-set retry loop',
  summary: 'No lock. Each thread reads x, computes x+1, then CAS(x, old, new); if x changed in between, the CAS fails and the loop retries.',
  vars: { x: 0 },
  volatile: ['x'],
  threads: [{ name: 'Thread A', ops: casLoop }, { name: 'Thread B', ops: casLoop }],
  schedule: [0, 1, 0, 1, 0, 1, 1, 1, 1],
  goal: { kind: 'var', v: 'x', equals: 2 },
  good: 'x ended at 2: one CAS failed and retried, so no increment was lost and nobody blocked.',
  bad: 'x ended below 2 (cannot happen with CAS).',
};

const checkThenAct = (lock: boolean): Scenario => {
  const body = (who: string): Op[] => [
    { op: 'read', v: 'map', reg: 'r' }, { op: 'skipIf', reg: 'r', to: lock ? 4 : 2 }, { op: 'write', v: 'map', value: `conn-${who}` },
  ];
  return {
    id: lock ? 'check-then-act-synchronized' : 'check-then-act',
    title: lock ? 'Fixed: check-then-act inside one lock' : 'Check-then-act: if (!map.containsKey(k)) map.put(k, v)',
    summary: lock
      ? 'The check and the put are guarded by the same lock, so only the first thread creates the entry.'
      : 'Each thread checks that the key is missing and then puts it. Each step is safe alone; the pair is not atomic.',
    vars: { map: null },
    locks: lock ? ['L'] : [],
    threads: [{ name: 'Thread A', ops: lock ? locked('L', body('A')) : body('A') }, { name: 'Thread B', ops: lock ? locked('L', body('B')) : body('B') }],
    schedule: lock ? [0, 1, 0, 0, 0, 0, 1, 1, 1, 1] : [0, 1, 0, 1, 0, 1],
    goal: { kind: 'writes', v: 'map', equals: 1 },
    good: 'The entry was created exactly once.',
    bad: 'The entry was created twice: both threads saw the key missing, and the second put silently replaced the first object.',
  };
};

const visibility = (vol: boolean): Scenario => ({
  id: vol ? 'visibility-volatile' : 'visibility',
  title: vol ? 'Fixed: volatile flag' : 'Visibility: a non-volatile stop flag',
  summary: vol
    ? 'The flag is volatile: every read goes to main memory, so the reader sees the writer\'s update.'
    : 'A reader polls a plain boolean while a writer sets it. Under the Java Memory Model, the reader is allowed to keep using its old copy.',
  vars: { flag: false },
  volatile: vol ? ['flag'] : [],
  threads: [
    { name: 'Writer', ops: [{ op: 'write', v: 'flag', value: true }] },
    { name: 'Reader', ops: [{ op: 'read', v: 'flag', reg: 'r1' }, { op: 'read', v: 'flag', reg: 'r2' }, { op: 'read', v: 'flag', reg: 'r3' }] },
  ],
  schedule: [1, 0, 1, 1],
  goal: { kind: 'reg', thread: 1, reg: 'r3', equals: true },
  good: 'The reader saw flag = true after the write: volatile guarantees the write becomes visible.',
  bad: 'The reader kept seeing flag = false. This is permitted by the Java Memory Model, not a guaranteed outcome: a real JVM may show the update at once. Without volatile you simply have no guarantee, so code must not rely on it.',
});

const deadlock = (ordered: boolean): Scenario => ({
  id: ordered ? 'deadlock-ordered' : 'deadlock',
  title: ordered ? 'Fixed: both threads lock in the same order' : 'Deadlock: two locks taken in opposite order',
  summary: ordered
    ? 'Both threads take L1 then L2, so a thread holding L1 can never be waiting on a thread that needs it.'
    : 'A takes L1 then L2; B takes L2 then L1. If each grabs its first lock, each waits for the other forever.',
  vars: {},
  locks: ['L1', 'L2'],
  threads: [
    { name: 'Thread A', ops: [{ op: 'lock', lock: 'L1' }, { op: 'lock', lock: 'L2' }, { op: 'unlock', lock: 'L2' }, { op: 'unlock', lock: 'L1' }] },
    { name: 'Thread B', ops: ordered
      ? [{ op: 'lock', lock: 'L1' }, { op: 'lock', lock: 'L2' }, { op: 'unlock', lock: 'L2' }, { op: 'unlock', lock: 'L1' }]
      : [{ op: 'lock', lock: 'L2' }, { op: 'lock', lock: 'L1' }, { op: 'unlock', lock: 'L1' }, { op: 'unlock', lock: 'L2' }] },
  ],
  schedule: ordered ? [0, 1, 0, 0, 0, 1, 1, 1, 1] : [0, 1, 0, 1],
  goal: { kind: 'noDeadlock' },
  good: 'Both threads finished: a consistent lock order makes a wait cycle impossible.',
  bad: 'Deadlock: A holds L1 and waits for L2, B holds L2 and waits for L1. Neither can ever proceed.',
});

export const PRESETS: Record<string, Scenario> = Object.fromEntries(
  [lostUpdate, lostUpdateSync, atomicCas, checkThenAct(false), checkThenAct(true), visibility(false), visibility(true), deadlock(false), deadlock(true)].map((s) => [s.id, s]),
);
