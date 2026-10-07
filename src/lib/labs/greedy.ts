// Greedy playground: run Kadane's reset rule move by move (extend or restart, then record or keep the best);
// count Jump Game II's levels (scan the window, update far, jump only at the window's edge); and drive
// the Gas Station scan (add a station; a negative tank means restart after it; then the total decides).
import { makeLab, type LabBase, type LabRow } from '../lab.ts';

type Phase = 'choose' | 'check' | 'scan' | 'decide' | 'add';
export interface GreedyState extends LabBase {
  a: number[];                 // kadane values, or jump lengths
  i: number;                   // index being handled
  phase: Phase;
  // kadane
  run: number | null;          // best total of a stretch ending at i (null before the first value)
  from: number;                // where the current run starts
  best: number | null;
  bestFrom: number;
  bestTo: number;
  // jump levels
  end: number;                 // last stone reachable with `jumps` jumps
  far: number;                 // farthest stone reachable with one more jump
  jumps: number;
  stuck: boolean;
  // gas
  gas: number[];
  cost: number[];
  tank: number;
  total: number;
  start: number;
  answer: number | null;
}

type Input =
  | { mode: 'kadane'; a: number[] }
  | { mode: 'levels'; a: number[] }
  | { mode: 'gas'; gas: number[]; cost: number[] };

export const kadaneCases: number[][] = [[-2, 1, -3, 4, -1, 2, 1, -5, 4], [-3, -1, -2], [5, -2, 5], [0, -1, 0]];
export const levelCases: number[][] = [[2, 3, 1, 1, 4], [2, 3, 0, 1, 4], [1, 1, 1, 1], [0]];
export const gasCases: { gas: number[]; cost: number[] }[] = [
  { gas: [1, 2, 3, 4, 5], cost: [3, 4, 5, 1, 2] },
  { gas: [2, 3, 4], cost: [3, 4, 3] },
  { gas: [4, 1, 1, 6], cost: [1, 2, 5, 1] },
  { gas: [5], cost: [4] },
];

const blank = () => ({
  a: [] as number[], i: 0, phase: 'choose' as Phase,
  run: null as number | null, from: 0, best: null as number | null, bestFrom: 0, bestTo: 0,
  end: 0, far: 0, jumps: 0, stuck: false,
  gas: [] as number[], cost: [] as number[], tank: 0, total: 0, start: 0, answer: null as number | null,
});

export function fromInput(input: Input) {
  const base = blank();
  if (input.mode === 'kadane') return { ...base, a: [...input.a], phase: 'choose' as Phase };
  if (input.mode === 'levels') return { ...base, a: [...input.a], phase: 'scan' as Phase };
  return { ...base, gas: [...input.gas], cost: [...input.cost], phase: 'add' as Phase };
}

const fmt = (x: number | null) => (x === null ? 'none' : x < 0 ? `−${-x}` : String(x));
const plus = (x: number, y: number) => `${fmt(x)} + ${y < 0 ? `(${fmt(y)})` : fmt(y)}`;

// ---------- Kadane ----------
function kadaneExpected(s: GreedyState) {
  if (s.phase === 'choose') {
    if (s.i >= s.a.length) return 'finish';
    return s.run === null || s.run < 0 ? 'restart' : 'extend';
  }
  return s.best === null || (s.run as number) > s.best ? 'record' : 'keep';
}
function kadaneAlso(s: GreedyState, action: string) {
  if (s.phase === 'choose' && s.i < s.a.length && s.run === 0 && action === 'restart') return true;   // 0 + x = x: a tie
  if (s.phase === 'check' && s.best !== null && s.run === s.best && action === 'record') return true;
  return false;
}
function kadaneReject(s: GreedyState, action: string) {
  const n = s.a.length;
  if (s.phase === 'choose') {
    if (s.i >= n) {
      if (action === 'record' || action === 'keep') return 'Every value has been read and judged. The best is final.';
      return `All ${n} value(s) are read. Report the best: ${fmt(s.best)}.`;
    }
    const x = s.a[s.i];
    if (action === 'record' || action === 'keep') return `a[${s.i}] = ${fmt(x)} hasn’t joined a run yet. First decide: extend the run or restart here.`;
    if (action === 'finish') return `${n - s.i} value(s) are still unread. A later value could start a better stretch.`;
    if (s.run === null) return `There is no run yet to extend. a[0] = ${fmt(x)} starts the first one.`;
    if (action === 'extend') return `The run so far is ${fmt(s.run)}. Carrying it makes every later total ${-s.run} smaller: ${plus(s.run, x)} = ${fmt(s.run + x)}, but ${fmt(x)} alone is ${fmt(x)}. A negative run is a burden; drop it.`;
    return `The run so far is ${fmt(s.run)}, not negative. Dropping it throws away ${s.run} for nothing: ${plus(s.run, x)} = ${fmt(s.run + x)} beats ${fmt(x)} alone.`;
  }
  // check phase
  const run = s.run as number;
  if (action === 'extend' || action === 'restart') return `a[${s.i}] is already in the run (run = ${fmt(run)}). Now compare the run with the best.`;
  if (action === 'finish') return `a[${s.i}] isn’t settled yet: compare run ${fmt(run)} with best ${fmt(s.best)} first.`;
  if (action === 'record') return `The run is ${fmt(run)}, below the best ${fmt(s.best)}. Recording it would overwrite a better answer.`;
  if (s.best === null) return `No best yet: the first run, ${fmt(run)}, must be recorded.`;
  return `The run ${fmt(run)} beats the best ${fmt(s.best)}. The run will change at the next value, so this total is lost unless you record it now.`;
}
function kadaneApply(s: GreedyState, action: string) {
  const x = s.a[s.i];
  if (action === 'extend') {
    const before = s.run as number;
    s.run = before + x;
    s.phase = 'check';
    s.message = `Extend: run = ${plus(before, x)} = ${fmt(s.run)}, the stretch ${s.from}..${s.i}.`;
  } else if (action === 'restart') {
    const before = s.run;
    s.run = x;
    s.from = s.i;
    s.phase = 'check';
    s.message = before === null ? `The first run starts here: run = ${fmt(x)}.` : before === 0 ? `Restart at ${s.i}: run = ${fmt(x)}. (The old run was 0, so extending would give the same total.)` : `Restart at ${s.i}: the old run ${fmt(before)} was a burden. run = ${fmt(x)}.`;
  } else if (action === 'record') {
    s.best = s.run;
    s.bestFrom = s.from;
    s.bestTo = s.i;
    s.i++;
    s.phase = 'choose';
    s.message = `Recorded: best = ${fmt(s.best)}, the stretch ${s.bestFrom}..${s.bestTo}.`;
  } else if (action === 'keep') {
    s.i++;
    s.phase = 'choose';
    s.message = `Run ${fmt(s.run)} does not beat best ${fmt(s.best)}. The best stays.`;
  } else {
    s.done = true;
    s.message = `Best total: ${fmt(s.best)}, from the stretch ${s.bestFrom}..${s.bestTo}. One pass; every move was either “keep a helpful run” or “drop a burden”.`;
  }
}
function kadaneView(s: GreedyState): LabRow[] {
  return [
    {
      name: 'Values a',
      cells: s.a.map((v, i) => {
        const inRun = s.run !== null && i >= s.from && i <= Math.min(s.i, s.a.length - 1) && (i < s.i || s.phase === 'check');
        const label = i === s.i && !s.done ? (s.phase === 'choose' ? 'NEXT' : 'HERE') : i === s.from && s.run !== null && inRun ? 'RUN' : undefined;
        return { value: String(v), label, tone: inRun ? 'hot' : i < s.i ? 'done' : undefined };
      }),
    },
    {
      name: 'Best stretch so far', empty: 'None yet',
      cells: s.best === null ? [] : s.a.slice(s.bestFrom, s.bestTo + 1).map((v, k) => ({ value: String(v), label: k === 0 ? `from ${s.bestFrom}` : undefined, tone: 'done' as const })),
    },
  ];
}
function kadaneDescribe(s: GreedyState) {
  if (s.done) return `Done. Best = ${fmt(s.best)}.`;
  if (s.phase === 'choose' && s.i >= s.a.length) return `Every value read · best = ${fmt(s.best)}`;
  const x = s.a[s.i];
  return s.phase === 'choose'
    ? `Next value a[${s.i}] = ${fmt(x)} · run = ${fmt(s.run)} · best = ${fmt(s.best)} · extend or restart?`
    : `run = ${fmt(s.run)} (stretch ${s.from}..${s.i}) · best = ${fmt(s.best)} · record or keep?`;
}

// ---------- Jump Game II levels ----------
function levelsExpected(s: GreedyState) {
  const last = s.a.length - 1;
  if (s.phase === 'scan') return s.end >= last || s.stuck ? 'finish' : 'scan';
  if (s.i === s.end && s.far <= s.i) return 'finish';           // the window cannot grow: unreachable
  return s.i === s.end ? 'jump' : 'next';
}
function levelsReject(s: GreedyState, action: string) {
  const last = s.a.length - 1;
  if (s.phase === 'scan') {
    if (s.end >= last || s.stuck) {
      if (s.stuck) return 'The window stopped growing. No more jumps can help.';
      return `The window already reaches stone ${s.end}, and the last stone is ${last}. ${s.jumps} jump(s) is final; scanning further cannot lower it.`;
    }
    if (action === 'finish') return `With ${s.jumps} jump(s) you reach stones up to ${s.end}; the last stone is ${last}. Not there yet.`;
    return `Scan stone ${s.i} first: its reach ${s.i} + ${s.a[s.i]} = ${s.i + s.a[s.i]} might push far (now ${s.far}).`;
  }
  if (action === 'scan') return `Stone ${s.i} is already scanned: far = ${s.far}.`;
  if (s.i === s.end && s.far <= s.i) return `Stone ${s.i} is the edge of the window and nothing in it reaches past ${s.far}. The last stone is unreachable: finish.`;
  if (action === 'finish') return `With ${s.jumps} jump(s) you reach stones up to ${s.end}; the last stone is ${last}. Keep going.`;
  if (action === 'jump') return `Stone ${s.i} is not the edge of this level: stone(s) ${s.i + 1}..${s.end} are reachable with ${s.jumps} jump(s) too and haven’t been scanned. Jumping now fixes the next window at far = ${s.far} before you know whether one of them reaches farther.`;
  return `Stone ${s.i} is the edge: nothing past it is reachable with ${s.jumps} jump(s). Moving on means taking jump ${s.jumps + 1}, and far = ${s.far} is where the new window ends.`;
}
function levelsApply(s: GreedyState, action: string) {
  if (action === 'scan') {
    const reach = s.i + s.a[s.i], before = s.far;
    s.far = Math.max(s.far, reach);
    s.phase = 'decide';
    s.message = `Stone ${s.i} reaches ${s.i} + ${s.a[s.i]} = ${reach}. far = max(${before}, ${reach}) = ${s.far}.`;
  } else if (action === 'jump') {
    s.jumps++;
    s.end = s.far;
    s.i++;
    s.phase = 'scan';
    s.message = `Edge of the level: jump ${s.jumps}. Every stone up to ${s.end} is now reachable with ${s.jumps} jump(s).`;
  } else if (action === 'next') {
    s.i++;
    s.phase = 'scan';
    s.message = `Stone ${s.i} is still inside the window (ends at ${s.end}): no jump needed to stand there.`;
  } else {
    s.done = true;
    if (s.phase === 'decide' || s.stuck) {
      s.stuck = true;
      s.message = `The window ends at ${s.end} and nothing inside reaches farther. The last stone can’t be reached.`;
    } else {
      s.message = `The window reaches stone ${s.end} ≥ ${s.a.length - 1}: ${s.jumps} jump(s). You counted levels; you never had to pick a landing stone.`;
    }
  }
}
function levelsView(s: GreedyState): LabRow[] {
  return [{
    name: 'Jump lengths',
    cells: s.a.map((v, i) => {
      const labels = [i === s.i && !s.done ? 'i' : '', i === s.end ? 'END' : '', i === s.far && s.far !== s.end ? 'FAR' : ''].filter(Boolean).join(' · ');
      const tone = i <= s.end ? (i < s.i || (i === s.i && s.phase === 'decide') ? 'done' : 'hot') : i <= s.far ? undefined : 'ghost';
      return { value: String(v), label: labels || undefined, tone };
    }),
  }];
}
function levelsDescribe(s: GreedyState) {
  if (s.done) return s.stuck ? 'Unreachable.' : `Done: ${s.jumps} jump(s).`;
  return `jumps = ${s.jumps} · window ends at ${s.end} · far = ${s.far} · last stone ${s.a.length - 1}`;
}

// ---------- Gas Station ----------
function gasExpected(s: GreedyState) {
  if (s.phase === 'add') return s.i < s.gas.length ? 'add' : s.total >= 0 ? 'report' : 'none';
  return s.tank < 0 ? 'restart' : 'keep';
}
function gasReject(s: GreedyState, action: string) {
  const n = s.gas.length;
  if (s.phase === 'add') {
    if (s.i < n) {
      if (action === 'restart' || action === 'keep') return `Station ${s.i} hasn’t been added yet: gas ${s.gas[s.i]} − cost ${s.cost[s.i]} is still unknown to the tank.`;
      return `${n - s.i} station(s) are still unread. The total isn’t known until the whole ring is read.`;
    }
    if (action === 'add') return 'Every station has been added.';
    if (action === 'restart' || action === 'keep') return 'The scan is over. Time to answer.';
    if (action === 'report') return `Total gas − total cost = ${fmt(s.total)} < 0. Every lap loses ${-s.total}, so no start can finish; ${s.start} is only where the scan stopped.`;
    return `Total gas − total cost = ${fmt(s.total)} ≥ 0, so a start exists, and the start after the last deficit, ${s.start}, is one.`;
  }
  const next = (s.i + 1) % n;
  if (action === 'add') return `Decide first: did the tank survive station ${s.i}? It reads ${fmt(s.tank)}.`;
  if (action === 'report' || action === 'none') return `Station ${s.i} isn’t judged yet, and ${n - s.i - 1} station(s) are unread.`;
  if (action === 'restart') return `The tank reads ${fmt(s.tank)} ≥ 0: from start ${s.start} you reach station ${next}. Restarting would discard a start that is still alive.`;
  return `The tank reads ${fmt(s.tank)}: from start ${s.start} you can’t reach station ${next}. And no station from ${s.start} to ${s.i} can start either: you reached each with a tank of at least 0 and still ran dry here.`;
}
function gasApply(s: GreedyState, action: string) {
  if (action === 'add') {
    const g = s.gas[s.i] - s.cost[s.i], before = s.tank;
    s.tank += g;
    s.total += g;
    s.phase = 'check';
    s.message = `Station ${s.i}: gain ${s.gas[s.i]} − ${s.cost[s.i]} = ${fmt(g)}. Tank = ${plus(before, g)} = ${fmt(s.tank)}; lap total so far ${fmt(s.total)}.`;
  } else if (action === 'restart') {
    const failed = s.start;
    s.start = s.i + 1;
    s.tank = 0;
    s.i++;
    s.phase = 'add';
    s.message = `Ran dry after station ${s.i - 1}. Stations ${failed}..${s.i - 1} are ruled out; try ${s.start === s.gas.length ? 'past the end (only possible if the total is negative)' : `station ${s.start}`} with an empty tank.`;
  } else if (action === 'keep') {
    s.i++;
    s.phase = 'add';
    s.message = `Tank ${fmt(s.tank)} ≥ 0: start ${s.start} is still alive.`;
  } else if (action === 'report') {
    s.answer = s.start;
    s.done = true;
    s.message = `Total ${fmt(s.total)} ≥ 0, so start at station ${s.start}. It sits just after the lowest point of the running total.`;
  } else {
    s.answer = -1;
    s.done = true;
    s.message = `Total ${fmt(s.total)} < 0: no start can complete the lap. Answer −1.`;
  }
}
function gasView(s: GreedyState): LabRow[] {
  return [
    {
      name: 'Gain = gas − cost',
      cells: s.gas.map((g, i) => {
        const labels = [i === s.start && !(s.done && s.answer === -1) ? 'START' : '', i === s.i && !s.done ? (s.phase === 'add' ? 'NEXT' : 'HERE') : ''].filter(Boolean).join(' · ');
        const read = i < s.i || (i === s.i && s.phase === 'check');
        return { value: String(g - s.cost[i]), label: labels || undefined, tone: !read ? undefined : i < s.start ? 'out' : 'hot' };
      }),
    },
    { name: 'gas', cells: s.gas.map(g => ({ value: String(g), tone: 'ghost' as const })) },
    { name: 'cost', cells: s.cost.map(c => ({ value: String(c), tone: 'ghost' as const })) },
  ];
}
function gasDescribe(s: GreedyState) {
  if (s.done) return `Answer: ${fmt(s.answer)}.`;
  return `start = ${s.start} · tank since start = ${fmt(s.tank)} · lap total so far = ${fmt(s.total)}`;
}

export const lab = makeLab<GreedyState>({
  kadane: {
    name: 'The running sum that resets (Maximum Subarray)',
    cases: kadaneCases.length,
    actions: [
      { action: 'extend', label: 'Extend: run + a[i]' },
      { action: 'restart', label: 'Restart here: run = a[i]' },
      { action: 'record', label: 'Record: best = run' },
      { action: 'keep', label: 'Keep the old best' },
      { action: 'finish', label: 'No values left: report best' },
    ],
    create: v => fromInput({ mode: 'kadane', a: kadaneCases[v] }),
    expected: kadaneExpected,
    alsoValid: kadaneAlso,
    apply: kadaneApply,
    reject: kadaneReject,
    view: kadaneView,
    describe: kadaneDescribe,
  },
  levels: {
    name: 'Jump in levels (Jump Game II)',
    cases: levelCases.length,
    actions: [
      { action: 'scan', label: 'Scan stone i: far = max(far, i + a[i])' },
      { action: 'next', label: 'Step to the next stone in this window' },
      { action: 'jump', label: 'Edge of the window: jumps++, end = far' },
      { action: 'finish', label: 'Report the jumps' },
    ],
    create: v => fromInput({ mode: 'levels', a: levelCases[v] }),
    expected: levelsExpected,
    apply: levelsApply,
    reject: levelsReject,
    view: levelsView,
    describe: levelsDescribe,
  },
  gas: {
    name: 'The ring road (Gas Station)',
    cases: gasCases.length,
    actions: [
      { action: 'add', label: 'Add the next station to the tank' },
      { action: 'keep', label: 'Tank ≥ 0: keep this start' },
      { action: 'restart', label: 'Tank < 0: restart after this station' },
      { action: 'report', label: 'Answer: the current start' },
      { action: 'none', label: 'Answer: −1, no circuit' },
    ],
    create: v => fromInput({ mode: 'gas', ...gasCases[v] }),
    expected: gasExpected,
    apply: gasApply,
    reject: gasReject,
    view: gasView,
    describe: gasDescribe,
  },
}, 'Gold = the current run or window · green = settled · faded = out of reach or ruled out · positions start at 0');
