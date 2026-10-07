// Sliding Window playground: the same four levers (grow, shrink, record, finish) in three rhythms.
// The drill is record placement: fixed panes record once full, longest windows record after the repair,
// shortest windows record before every squeeze. A misplaced record is rejected with the numbers on the board.
import { makeLab, type LabBase, type LabRow, type ModeDef } from '../lab.ts';
import type { CellTone } from '../trace.ts';

export type Mode = 'fixed' | 'longest' | 'shortest';
export interface WindowState extends LabBase {
  a: number[];
  k: number;            // fixed: pane width · longest: how many zeros may be in view
  target: number;       // shortest: the sum a window must reach
  left: number;         // Tail: first index in view
  right: number;        // Head: last index in view (−1 before the first grow)
  sum: number;
  zeros: number;
  best: number | null;  // fixed: best pane sum · longest: best length · shortest: best length (null = none yet)
  recorded: boolean;    // has the current window been logged?
}
export interface LabInput { a: number[]; k?: number; target?: number }

const cases: Record<Mode, LabInput[]> = {
  fixed: [{ a: [1, 12, -5, -6, 50, 3], k: 4 }, { a: [2, 1, 5, 1, 3, 2], k: 3 }, { a: [-2, -2, -2], k: 2 }, { a: [7, 2], k: 3 }],
  longest: [{ a: [1, 0, 1, 1, 0, 1], k: 1 }, { a: [0, 1, 1, 0, 1, 0, 1], k: 2 }, { a: [0, 0, 0], k: 0 }, { a: [], k: 1 }],
  shortest: [{ a: [2, 3, 1, 2, 4, 3], target: 7 }, { a: [1, 4, 4], target: 4 }, { a: [1, 1, 1, 1], target: 5 }, { a: [], target: 3 }],
};

export function fromInput(mode: Mode, input: LabInput): Omit<WindowState, 'mode' | 'done' | 'moves' | 'message'> {
  return {
    a: [...input.a], k: input.k ?? 0, target: input.target ?? 1,
    left: 0, right: -1, sum: 0, zeros: 0,
    best: mode === 'longest' ? 0 : null,
    recorded: mode !== 'fixed',
  };
}

const size = (s: WindowState) => Math.max(0, s.right - s.left + 1);
const inView = (s: WindowState) => `[${s.a.slice(s.left, s.right + 1).join(', ')}]`;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const unseen = (s: WindowState) => {
  const left = s.a.length - 1 - s.right;
  const where = s.right < 0 ? 'Head hasn’t taken anything yet' : `Head is at position ${s.right} of ${s.a.length - 1}`;
  return `${where}; ${plural(left, 'item')} still unseen, and the answer could use ${left === 1 ? 'it' : 'them'}. Keep going.`;
};

function grow(s: WindowState) {
  s.right++;
  const v = s.a[s.right];
  s.sum += v;
  if (v === 0) s.zeros++;
  s.recorded = false;
  return v;
}
function shrink(s: WindowState) {
  const v = s.a[s.left];
  s.sum -= v;
  if (v === 0) s.zeros--;
  s.left++;
  s.recorded = size(s) === 0;   // an empty window has nothing to log
  return v;
}

function view(s: WindowState): LabRow[] {
  const cells = s.a.map((value, i) => {
    const labels: string[] = [];
    if (s.right >= s.left && i === s.left) labels.push('TAIL');
    if (i === s.right) labels.push('HEAD');
    if (s.right < s.left && i === s.right + 1) labels.push('NEXT');
    const tone: CellTone = i < s.left ? 'out' : i <= s.right ? 'hot' : 'ghost';
    return { value: String(value), label: labels.join(' / ') || undefined, tone };
  });
  const stateCell = s.mode === 'longest'
    ? { value: `${s.zeros} / ${s.k}`, label: 'ZEROS / BUDGET' }
    : s.mode === 'shortest' ? { value: `${s.sum} / ${s.target}`, label: 'SUM / TARGET' } : { value: String(s.sum), label: 'SUM' };
  const log: LabRow = {
    name: 'Slate and logbook',
    cells: [
      stateCell,
      { value: String(size(s)), label: s.mode === 'fixed' ? `IN VIEW (k = ${s.k})` : 'LENGTH' },
      { value: s.best === null ? '—' : String(s.best), label: s.mode === 'fixed' ? 'BEST SUM' : s.mode === 'longest' ? 'LONGEST' : 'SHORTEST' },
      { value: s.right < s.left ? '·' : s.recorded ? 'yes' : 'no', label: 'LOGGED?', tone: s.right >= s.left && !s.recorded ? 'ghost' : undefined },
    ],
  };
  return [{ name: s.mode === 'longest' ? 'Lamps (1 = lit, 0 = dark)' : s.mode === 'shortest' ? 'Coins per stall' : 'Catch per stall', cells, empty: 'Empty bank: nothing to look at' }, log];
}

function describe(s: WindowState): string {
  const n = s.a.length;
  const rule = s.mode === 'fixed' ? `Pane width k = ${s.k}.` : s.mode === 'longest' ? `Longest window with at most ${s.k} zeros.` : `Shortest window with sum ≥ ${s.target}.`;
  const window = s.right < s.left ? 'The window is empty.' : `In view: positions ${s.left}–${s.right} = ${inView(s)}${s.mode === 'longest' ? `, ${plural(s.zeros, 'zero')}` : `, sum ${s.sum}`}.`;
  const best = s.best === null ? 'Nothing logged yet.' : `Logbook: ${s.best}.`;
  return `${rule} ${window} ${best}${s.right >= n - 1 && !s.done ? ' Head has reached the end.' : ''}`;
}

const actions = [
  { action: 'grow', label: 'Grow: Head takes the next item' },
  { action: 'shrink', label: 'Shrink: Tail lets one go' },
  { action: 'record', label: 'Record this window in the log' },
  { action: 'finish', label: 'Finish: no window left to check' },
];

function record(s: WindowState) {
  const len = size(s);
  if (s.mode === 'fixed') s.best = s.best === null ? s.sum : Math.max(s.best, s.sum);
  else if (s.mode === 'longest') s.best = Math.max(s.best ?? 0, len);
  else s.best = s.best === null ? len : Math.min(s.best, len);
  s.recorded = true;
}

const finishMessage = (s: WindowState) => {
  if (s.mode === 'fixed') return s.best === null
    ? `Done. No full pane of ${s.k} fits in ${plural(s.a.length, 'item')}, so there is nothing to log.`
    : `Done. Best pane sum ${s.best}, so the best average is ${s.best} / ${s.k} = ${+(s.best / s.k).toFixed(4)}.`;
  if (s.mode === 'longest') return `Done. The longest legal window has length ${s.best}.`;
  return s.best === null ? `Done. No stretch reaches ${s.target}, so the answer is 0.` : `Done. The shortest qualifying window has length ${s.best}.`;
};

function base(name: string, mode: Mode, expected: (s: WindowState) => string, reject: (s: WindowState, action: string) => string, alsoValid?: ModeDef<WindowState>['alsoValid']): ModeDef<WindowState> {
  return {
    name, cases: cases[mode].length, actions,
    create: v => fromInput(mode, cases[mode][v]),
    expected, alsoValid, reject, view, describe,
    apply(s, action) {
      if (action === 'grow') {
        const v = grow(s);
        const status = s.mode === 'longest' ? (s.zeros > s.k ? ` That makes ${plural(s.zeros, 'zero')} with a budget of ${s.k}: illegal.` : ' Still legal.')
          : s.mode === 'shortest' ? (s.sum >= s.target ? ` Sum ${s.sum} ≥ ${s.target}: it qualifies.` : ` Sum ${s.sum}, still short of ${s.target}.`)
          : ` ${size(s)} of ${s.k} in view, sum ${s.sum}.`;
        s.message = `Head takes ${v}.${status}`;
      } else if (action === 'shrink') {
        const v = shrink(s);
        s.message = `Tail lets ${v} go. In view: ${size(s) ? inView(s) : 'nothing'}${s.mode === 'longest' ? `, ${plural(s.zeros, 'zero')}` : `, sum ${s.sum}`}.`;
      } else if (action === 'record') {
        record(s);
        s.message = s.mode === 'fixed' ? `Logged pane ${inView(s)}, sum ${s.sum}. Best sum so far: ${s.best}.`
          : `Logged length ${size(s)} for ${inView(s)}. ${s.mode === 'longest' ? 'Longest' : 'Shortest'} so far: ${s.best}.`;
      } else {
        s.done = true;
        s.message = finishMessage(s);
      }
    },
  };
}

// ---------- fixed pane ----------
const fixedExpected = (s: WindowState) => {
  const n = size(s);
  if (n > s.k) return 'shrink';
  if (n === s.k && !s.recorded) return 'record';
  if (s.right < s.a.length - 1) return 'grow';
  return 'finish';
};
function fixedReject(s: WindowState, action: string): string {
  const n = size(s), last = s.right >= s.a.length - 1;
  if (action === 'grow') {
    if (n > s.k) return `The pane already holds ${n} items, but k = ${s.k}. Tail must drop ${s.a[s.left]} first, or the next sum you log is a ${n + 1}-item sum.`;
    if (n === s.k && !s.recorded) return `This full pane ${inView(s)} (sum ${s.sum}) isn’t in the log yet. Once Head moves, Tail must drop ${s.a[s.left]} and this exact pane is gone for good. Record first.`;
    return 'Head is already at the last item. There is nothing left to take.';
  }
  if (action === 'shrink') {
    if (n === 0) return 'The pane is empty. There is nothing for Tail to drop.';
    if (n < s.k) return `Only ${n} of ${s.k} items are in view. Dropping ${s.a[s.left]} now loses an item a full pane needs. Let Head grow the pane first.`;
    if (!s.recorded) return `This full pane ${inView(s)} (sum ${s.sum}) hasn’t been logged. Record it before Tail lets ${s.a[s.left]} go.`;
    return 'That was the last full pane: Head has reached the end and nothing new can come into view. Finish.';
  }
  if (action === 'record') {
    if (n === 0) return 'Nothing is in view yet.';
    if (n < s.k) return `Only ${n} of ${s.k} items are in view. A partial pane isn’t a candidate: its sum ${s.sum} can’t be compared with ${s.k}-item sums.`;
    if (n > s.k) return `The pane holds ${n} items, one too many. Its sum ${s.sum} isn’t a ${s.k}-item sum. Let Tail drop ${s.a[s.left]} first.`;
    return `This pane is already in the log (best sum ${s.best}). Move on.`;
  }
  if (!last) return unseen(s);
  if (n > s.k) return `The pane holds ${n} items. Let Tail drop ${s.a[s.left]}, then log the last full pane before finishing.`;
  return `The last full pane ${inView(s)} (sum ${s.sum}) isn’t logged yet. It might be the best one.`;
}

// ---------- longest legal window (at most k zeros) ----------
const longestExpected = (s: WindowState) => {
  if (s.zeros > s.k) return 'shrink';
  if (!s.recorded) return 'record';
  if (s.right < s.a.length - 1) return 'grow';
  return 'finish';
};
function longestReject(s: WindowState, action: string): string {
  const n = size(s), illegal = s.zeros > s.k, last = s.right >= s.a.length - 1;
  if (action === 'grow') {
    if (illegal) return `The window ${inView(s)} holds ${plural(s.zeros, 'zero')} but the budget is ${s.k}. Growing keeps every one of them in view, so it stays illegal. Tail must move first.`;
    if (!s.recorded) return `This legal window ${inView(s)} (length ${n}) isn’t logged. If Head moves on and the window turns illegal, you’ll shrink past it, and length ${n} might have been the longest you’d ever see. Record first.`;
    return 'Head is already at the last item. There is nothing left to take.';
  }
  if (action === 'shrink') {
    if (n === 0) return 'The window is empty. There is nothing for Tail to drop.';
    return `The window ${inView(s)} is legal (${plural(s.zeros, 'zero')}, budget ${s.k}). Shrinking a legal window throws length away. In a longest problem, Tail moves only to repair.`;
  }
  if (action === 'record') {
    if (illegal) return `The window ${inView(s)} holds ${plural(s.zeros, 'zero')}, but only ${s.k} may be flipped. It isn’t a legal run, and logging length ${n} would overstate the answer. Longest records after the repair: shrink first.`;
    if (n === 0) return 'Nothing is in view yet.';
    return `This window is already logged (longest so far ${s.best}).`;
  }
  if (!last) return unseen(s);
  if (illegal) return `The last window ${inView(s)} is illegal (${s.zeros} zeros > ${s.k}). Repair it, then log what is left; it might be the longest.`;
  return `The last window ${inView(s)} (length ${n}) isn’t logged yet.`;
}

// ---------- shortest qualifying window (sum ≥ target, positive values) ----------
const shortestExpected = (s: WindowState) => {
  if (s.sum >= s.target) return s.recorded ? 'shrink' : 'record';
  if (s.right < s.a.length - 1) return 'grow';
  return 'finish';
};
function shortestReject(s: WindowState, action: string): string {
  const n = size(s), qualifies = s.sum >= s.target, last = s.right >= s.a.length - 1;
  if (action === 'grow') {
    if (qualifies && !s.recorded) return `This window ${inView(s)} already reaches ${s.sum} ≥ ${s.target}, and it isn’t logged. Grow now and Tail will never come back for it. Record first.`;
    if (qualifies) return `${inView(s)} already qualifies (sum ${s.sum}). Growing only makes it longer. Squeeze it: shrink while it still qualifies.`;
    return 'Head is already at the last item. There is nothing left to take.';
  }
  if (action === 'shrink') {
    if (n === 0) return 'The window is empty. There is nothing for Tail to drop.';
    if (!qualifies) return `Sum ${s.sum} is below ${s.target}. Dropping ${s.a[s.left]} only lowers it further (every value is positive). Let Head grow.`;
    return `${inView(s)} qualifies (sum ${s.sum} ≥ ${s.target}) but isn’t logged. Shortest records inside the loop: log length ${n}, then shrink.`;
  }
  if (action === 'record') {
    if (n === 0) return 'Nothing is in view yet.';
    if (!qualifies) return `Sum ${s.sum} < ${s.target}: this window doesn’t qualify. Logging length ${n} here is the record-after-the-loop bug.`;
    return `Length ${n} is already logged. Now see whether a shorter window still qualifies: shrink.`;
  }
  if (!last) return unseen(s);
  if (!s.recorded) return `${inView(s)} qualifies (sum ${s.sum}) and isn’t logged yet.`;
  return `${inView(s)} still qualifies. Squeeze it: a shorter window may qualify too.`;
}

export const lab = makeLab<WindowState>({
  fixed: base('Fixed pane · best sum of k in a row', 'fixed', fixedExpected, fixedReject,
    // Shrink-then-grow slides the pane just as well as grow-then-shrink, once the full pane is logged.
    (s, action) => action === 'shrink' && size(s) === s.k && s.recorded && s.right < s.a.length - 1 && s.k > 0),
  longest: base('Longest legal · at most k dark lamps', 'longest', longestExpected, longestReject),
  shortest: base('Shortest qualifying · sum reaches the toll', 'shortest', shortestExpected, shortestReject),
}, 'Gold = in view · faded = Tail has let it go · dashed = Head hasn’t reached it · the second row is the slate and the logbook');
