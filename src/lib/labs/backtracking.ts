// Backtracking playground: walk the subsets tree with a thread (record, choose, skip a twin, un-choose);
// pay a toll with reusable sorted coins (choose, prune, record, un-choose); and place queens on a small board
// (place, skip an attacked column, backtrack). Every wrong move explains what it would break.
import { makeLab, type LabBase, type LabRow } from '../lab.ts';

interface Frame { start: number; next: number; recorded: boolean; remain: number }
export interface BacktrackState extends LabBase {
  // subsets + combination sum
  items: number[];                   // sorted
  target: number;                    // combination sum only
  frames: Frame[];                   // one per junction on the current thread; frames[0] is the entrance
  path: number[];                    // the thread (values)
  book: number[][];                  // recorded copies
  // queens
  n: number;
  queens: number[];                  // queens[r] = column of row r's queen
  col: number;                       // next column to test in row queens.length
  recordedBoard: boolean;
  solutions: number[][];
}

type Input =
  | { mode: 'subsets'; items: number[] }
  | { mode: 'combo'; items: number[]; target: number }
  | { mode: 'queens'; n: number };

const blank = () => ({
  items: [] as number[], target: 0, frames: [] as Frame[], path: [] as number[], book: [] as number[][],
  n: 0, queens: [] as number[], col: 0, recordedBoard: false, solutions: [] as number[][],
});

const subsetCases = [[1, 2, 3], [1, 2, 2], [], [4, 4]];
const comboCases: { items: number[]; target: number }[] = [
  { items: [2, 3, 6, 7], target: 7 },
  { items: [2, 3, 5], target: 8 },
  { items: [2], target: 1 },
  { items: [4, 2], target: 6 },
];
const queenCases = [4, 1, 2, 3];

export function fromInput(input: Input) {
  const base = blank();
  if (input.mode === 'queens') return { ...base, n: input.n };
  const items = [...input.items].sort((a, b) => a - b);
  const target = input.mode === 'combo' ? input.target : 0;
  return { ...base, items, target, frames: [{ start: 0, next: 0, recorded: false, remain: target }] };
}

const list = (a: number[]) => `[${a.join(', ')}]`;
const top = (s: BacktrackState) => s.frames[s.frames.length - 1];
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

// ---------- subsets (with the twin rule; distinct inputs never trigger it) ----------
const isTwin = (s: BacktrackState, f: Frame) => f.next > f.start && s.items[f.next] === s.items[f.next - 1];
function subsetsExpected(s: BacktrackState) {
  const f = top(s);
  if (!f.recorded) return 'record';
  if (f.next < s.items.length) return isTwin(s, f) ? 'skip' : 'choose';
  return s.frames.length > 1 ? 'unchoose' : 'finish';
}
// The next door the parent junction would actually walk (twins skipped), if any.
function parentNextDoor(s: BacktrackState): number | null {
  if (s.frames.length < 2) return null;
  const p = s.frames[s.frames.length - 2];
  for (let i = p.next; i < s.items.length; i++) if (!(i > p.start && s.items[i] === s.items[i - 1])) return i;
  return null;
}
function subsetsReject(s: BacktrackState, action: string) {
  const f = top(s), exp = subsetsExpected(s);
  if (action === 'alias') return `Pinning the thread itself puts the SAME list into the book every time. Every later move changes it, and when the search ends the thread is wound back to [ ] — so every page would read [ ]. Record a copy: new ArrayList<>(path).`;
  if (exp === 'record') {
    if (action === 'unchoose' && s.frames.length === 1) return 'The thread is empty: nothing to wind back. And [ ] is a subset that hasn’t been recorded yet.';
    return `You arrived at ${list(s.path)} and haven’t recorded it. In this tree every node is a subset; walk on and ${list(s.path)} is never written.`;
  }
  if (action === 'record') return `${list(s.path)} is already in the book — it was recorded when you arrived here. Writing it again duplicates it.`;
  if (exp === 'choose') {
    const v = s.items[f.next], then = list([...s.path, v]);
    if (action === 'skip') {
      if (f.next === f.start && f.next > 0 && s.items[f.next] === s.items[f.next - 1])
        return `i = start = ${f.next}: this ${v} is the FIRST door at this junction. Its twin to the left is on the thread (or was left out higher up), not a sibling. Skipping it is the i > 0 bug: ${then} would never be written.`;
      return `${v} at index ${f.next} is not a twin of an earlier door at this junction${f.next === f.start ? ' (it is the first door here)' : ` (index ${f.next - 1} holds ${s.items[f.next - 1]})`}. Skipping it loses ${then} and everything below it.`;
    }
    if (action === 'unchoose') {
      if (s.frames.length === 1) return `The thread is empty: nothing to wind back. And the door ${v} hasn’t been walked yet.`;
      return `There are still doors here: ${s.items.slice(f.next).join(', ')}. Winding back now loses ${then} and everything below it.`;
    }
    return `The search isn’t over: the door ${v} at this junction leads to ${then}.`;
  }
  if (exp === 'skip') {
    const v = s.items[f.next];
    if (action === 'choose') return `nums[${f.next}] = ${v} equals nums[${f.next - 1}], and i > start: its twin already opened this exact corridor at this junction. Taking it writes ${list([...s.path, v])} a second time.`;
    if (action === 'unchoose') {
      if (s.frames.length === 1) return 'The thread is empty: nothing to wind back. Deal with the twin at this junction first.';
      return `Index ${f.next} still has to be stepped past at this junction. It is a twin, so skip it — then see whether any doors remain before you wind back.`;
    }
    return `Index ${f.next} still has to be handled at this junction (it is a twin: skip it).`;
  }
  if (exp === 'unchoose') {
    const last = s.path[s.path.length - 1];
    if (action === 'choose') {
      const p = parentNextDoor(s);
      if (p !== null) {
        const wrong = list([...s.path, s.items[p]]), right = list([...s.path.slice(0, -1), s.items[p]]);
        return `No doors are left at this junction. Reaching for ${s.items[p]} while the thread still holds ${last} is the forgotten un-choose: you would write ${wrong} where ${right} belongs.`;
      }
      return `No doors are left at this junction. Wind the thread back first: remove ${last}.`;
    }
    if (action === 'skip') return `There is nothing left to skip: every door after ${last} at this junction has been handled. Remove ${last} from the thread.`;
    return `You are still ${s.frames.length - 1} turn(s) deep. Wind back first; the junctions above may still have doors.`;
  }
  // finish expected
  if (action === 'unchoose') return 'The thread is empty: nothing to wind back.';
  return 'Every door at the entrance has been walked. The book is complete.';
}
function subsetsApply(s: BacktrackState, action: string) {
  const f = top(s);
  if (action === 'record') {
    f.recorded = true;
    s.book.push([...s.path]);
    s.message = `Copied ${list(s.path)} onto page ${s.book.length}. The thread itself stays in your hand.`;
  } else if (action === 'choose') {
    const i = f.next, v = s.items[i];
    f.next++;
    s.path.push(v);
    s.frames.push({ start: i + 1, next: i + 1, recorded: false, remain: 0 });
    s.message = `Tied ${v} (index ${i}). The thread is ${list(s.path)}; this junction only offers items after index ${i}.`;
  } else if (action === 'skip') {
    const i = f.next;
    f.next++;
    s.message = `Skipped the twin ${s.items[i]} at index ${i}: index ${i - 1} already walked this corridor from ${list(s.path)}.`;
  } else if (action === 'unchoose') {
    s.frames.pop();
    const v = s.path.pop();
    s.message = `Removed ${v}. The thread is back to ${list(s.path)}, exactly as this junction left it.`;
  } else {
    s.done = true;
    s.message = `${s.book.length} page(s): ${s.book.map(list).join(' ')}. Every subset once, none twice.`;
  }
}
function subsetsView(s: BacktrackState): LabRow[] {
  const f = top(s), onThread = new Set<number>();
  for (let d = 1; d < s.frames.length; d++) onThread.add(s.frames[d].start - 1);
  return [
    {
      name: 'Items (sorted)', empty: 'No items',
      cells: s.items.map((v, i) => ({
        value: String(v),
        label: !s.done && f.recorded && i === f.next ? 'NEXT' : !s.done && i === f.start && f.start !== f.next ? 'start' : undefined,
        tone: onThread.has(i) ? 'done' : !s.done && f.recorded && i === f.next ? 'hot' : i < f.start ? 'out' : undefined,
      })),
    },
    { name: 'Thread (path)', empty: 'Empty thread', cells: s.path.map(v => ({ value: String(v), tone: 'done' as const })) },
    { name: 'Book of Ways', empty: 'Nothing recorded yet', cells: s.book.map((p, i) => ({ value: list(p), label: `p.${i + 1}` })) },
  ];
}
function subsetsDescribe(s: BacktrackState) {
  if (s.done) return `Done: ${s.book.length} page(s).`;
  const f = top(s);
  const doors = f.next < s.items.length ? `next door: index ${f.next} (${s.items[f.next]})` : 'no doors left here';
  return `Thread ${list(s.path)} · start = ${f.start} · ${f.recorded ? 'recorded' : 'not yet recorded'} · ${doors} · pages: ${s.book.length}`;
}

// ---------- combination sum (reuse allowed, sorted coins, prune by overshoot) ----------
function comboExpected(s: BacktrackState) {
  const f = top(s);
  if (f.remain === 0) return !f.recorded ? 'record' : s.frames.length > 1 ? 'unchoose' : 'finish';
  if (f.next < s.items.length) return s.items[f.next] > f.remain ? 'prune' : 'choose';
  return s.frames.length > 1 ? 'unchoose' : 'finish';
}
function comboReject(s: BacktrackState, action: string) {
  const f = top(s), exp = comboExpected(s), paid = s.target - f.remain;
  const coin = f.next < s.items.length ? s.items[f.next] : null;
  if (exp === 'record') {
    if (action === 'unchoose') return `${list(s.path)} pays exactly ${s.target}. Record a copy before you wind back, or this handful is lost.`;
    return `${list(s.path)} already pays exactly ${s.target}. Any further coin overshoots (every coin is at least ${s.items[0]}). Record it.`;
  }
  if (action === 'record') {
    if (f.remain === 0) return `${list(s.path)} is already in the book. Writing it again duplicates it.`;
    return `${list(s.path)} pays ${paid}, not ${s.target}: ${f.remain} is still owed. Only a thread that owes 0 is recorded.`;
  }
  if (exp === 'unchoose' && f.remain === 0) {
    if (action === 'choose' || action === 'choose-next' || action === 'prune') return `${list(s.path)} is paid and recorded; any further coin overshoots. Wind back: remove ${s.path[s.path.length - 1]}.`;
    return `You are still ${s.frames.length - 1} coin(s) deep. Wind back first.`;
  }
  if (exp === 'prune') {
    if (action === 'choose' || action === 'choose-next') return `${coin} > ${f.remain} still owed: the thread would pay ${paid + (coin as number)}, past ${s.target}. Coins are positive, so nothing below could come back down — and every later coin is at least ${coin}. Prune.`;
    if (action === 'unchoose') {
      if (s.frames.length === 1) return 'The thread is empty: nothing to wind back.';
      return `Pruning and winding back end in the same place here, but say why: ${coin} > ${f.remain}, so the sorted coins after it overshoot too. Prune first.`;
    }
    return `Coin ${coin} at this junction hasn’t been dealt with: it is bigger than the ${f.remain} owed. Prune it (and everything after it).`;
  }
  if (exp === 'choose') {
    const c = coin as number;
    if (action === 'choose-next') return `Moving the child’s start to index ${f.next + 1} forbids a second ${c}. Combination Sum lets a coin be paid again: with ${f.remain - c} still owed after this ${c}, another ${c} may be exactly what is needed.`;
    if (action === 'prune') return `${c} ≤ ${f.remain} still owed: this corridor can still reach ${s.target}. Only cut when the coin is bigger than what is owed.`;
    if (action === 'unchoose') {
      if (s.frames.length === 1) return 'The thread is empty: nothing to wind back.';
      return `Coins ${s.items.slice(f.next).join(', ')} haven’t been tried from ${list(s.path)} with ${f.remain} owed. Winding back now could lose a handful.`;
    }
    return `The search isn’t over: coin ${c} can still be tried with ${f.remain} owed.`;
  }
  if (exp === 'unchoose') {
    if (action === 'choose' || action === 'choose-next' || action === 'prune') return `Every coin at this junction has been tried or cut. Wind back: remove ${s.path[s.path.length - 1]}.`;
    return `You are still ${s.frames.length - 1} coin(s) deep. Wind back first; the junctions above may still have coins.`;
  }
  // finish expected
  if (action === 'unchoose') return 'The thread is empty: nothing to wind back.';
  return 'Every coin at the entrance has been tried or cut. The book is complete.';
}
function comboApply(s: BacktrackState, action: string) {
  const f = top(s);
  if (action === 'record') {
    f.recorded = true;
    s.book.push([...s.path]);
    s.message = `${list(s.path)} pays exactly ${s.target}. Copied onto page ${s.book.length}.`;
  } else if (action === 'choose') {
    const i = f.next, c = s.items[i];
    f.next++;
    s.path.push(c);
    s.frames.push({ start: i, next: i, recorded: false, remain: f.remain - c });
    s.message = `Paid ${c}: ${f.remain - c} still owed. The child starts at index ${i}, so ${c} may be paid again — but no coin to its left.`;
  } else if (action === 'prune') {
    const c = s.items[f.next];
    s.message = `Cut: ${c} > ${f.remain} owed${f.next + 1 < s.items.length ? `, and ${s.items.slice(f.next + 1).join(', ')} are bigger still` : ''}. That is a break, not a continue.`;
    f.next = s.items.length;
  } else if (action === 'unchoose') {
    s.frames.pop();
    const c = s.path.pop();
    s.message = `Removed ${c}. The thread is back to ${list(s.path)}, owing ${top(s).remain}.`;
  } else {
    s.done = true;
    s.message = s.book.length ? `${s.book.length} handful(s): ${s.book.map(list).join(' ')}. Each in non-decreasing order, so none twice.` : `No handful pays exactly ${s.target}. An empty book is a valid answer.`;
  }
}
function comboView(s: BacktrackState): LabRow[] {
  const f = top(s);
  return [
    {
      name: `Coins (sorted) · target ${s.target}`,
      cells: s.items.map((v, i) => ({
        value: String(v),
        label: !s.done && f.remain > 0 && i === f.next ? (v > f.remain ? 'TOO BIG' : 'NEXT') : !s.done && i === f.start ? 'start' : undefined,
        tone: !s.done && f.remain > 0 && i === f.next ? (v > f.remain ? 'out' : 'hot') : i < f.start ? 'out' : undefined,
      })),
    },
    { name: `Thread (paid ${sum(s.path)}, owe ${f.remain})`, empty: 'Empty thread', cells: s.path.map(v => ({ value: String(v), tone: 'done' as const })) },
    { name: 'Book of Ways', empty: 'Nothing recorded yet', cells: s.book.map((p, i) => ({ value: list(p), label: `p.${i + 1}` })) },
  ];
}
function comboDescribe(s: BacktrackState) {
  if (s.done) return `Done: ${s.book.length} handful(s).`;
  const f = top(s);
  const next = f.remain === 0 ? 'paid exactly' : f.next < s.items.length ? `next coin: ${s.items[f.next]} (index ${f.next})` : 'no coins left here';
  return `Target ${s.target} · thread ${list(s.path)} · owe ${f.remain} · start = ${f.start} · ${next}`;
}

// ---------- queens ----------
function attacker(s: BacktrackState, r: number, c: number): string | null {
  for (let y = 0; y < s.queens.length; y++) {
    const x = s.queens[y];
    if (x === c) return `column ${c} already holds the queen at (${y}, ${x})`;
    if (y - x === r - c) return `r − c = ${r - c} is the diagonal of the queen at (${y}, ${x})`;
    if (y + x === r + c) return `r + c = ${r + c} is the anti-diagonal of the queen at (${y}, ${x})`;
  }
  return null;
}
function queensExpected(s: BacktrackState) {
  const r = s.queens.length;
  if (r === s.n) return s.recordedBoard ? 'backtrack' : 'record';
  if (s.col < s.n) return attacker(s, r, s.col) ? 'skip' : 'place';
  return r === 0 ? 'finish' : 'backtrack';
}
function queensReject(s: BacktrackState, action: string) {
  const r = s.queens.length, exp = queensExpected(s);
  if (exp === 'record') {
    if (action === 'backtrack') return `All ${s.n} rows hold a queen and none attack each other. Record this board before you lift a queen, or it is lost.`;
    return `All ${s.n} rows hold a queen: there is no row ${r} to fill. Record the board.`;
  }
  if (action === 'record') {
    if (r === s.n) return 'This board is already in the book. Writing it again duplicates it.';
    return `Only ${r} of ${s.n} queens are placed. A board is recorded only when every row holds one.`;
  }
  if (exp === 'backtrack' && r === s.n) return `This board is recorded. Lift the queen from row ${r - 1} and try its next column.`;
  if (exp === 'place') {
    if (action === 'skip') return `(${r}, ${s.col}) is safe: column ${s.col}, r − c = ${r - s.col} and r + c = ${r + s.col} are all free. Skipping it loses every board with a queen there.`;
    if (action === 'backtrack') {
      if (r === 0) return 'Row 0 has no queen above it to lift. Test the columns of row 0.';
      return `Columns ${s.col}..${s.n - 1} of row ${r} are still untested, and (${r}, ${s.col}) is safe. Lifting the row-${r - 1} queen now could lose boards.`;
    }
    return `The search isn’t over: (${r}, ${s.col}) is a safe square to try.`;
  }
  if (exp === 'skip') {
    const why = attacker(s, r, s.col) as string;
    if (action === 'place') return `(${r}, ${s.col}) is watched: ${why}. A queen here would be attacked.`;
    if (action === 'backtrack') {
      if (r === 0) return 'Row 0 has no queen above it to lift.';
      return `Columns ${s.col}..${s.n - 1} of row ${r} are still untested. This one is watched (${why}); skip it and test the next.`;
    }
    return `Row ${r} still has columns to test.`;
  }
  if (exp === 'backtrack') {
    if (action === 'place' || action === 'skip') return `Every column of row ${r} has been tried. Backtrack: lift the queen from row ${r - 1}, clear its column and both diagonals, and try the next column there.`;
    return `Row ${r} is a dead end, but row ${r - 1} may still have columns to try. Backtrack first.`;
  }
  // finish
  if (action === 'backtrack') return 'No queen is on the board: there is nothing to lift.';
  return `Every column of row 0 has been tried. The search is complete.`;
}
function queensApply(s: BacktrackState, action: string) {
  const r = s.queens.length;
  if (action === 'place') {
    const c = s.col;
    s.queens.push(c);
    s.col = 0;
    s.recordedBoard = false;
    s.message = `Queen at (${r}, ${c}): column ${c}, r − c = ${r - c}, r + c = ${r + c} are now taken.` + (r + 1 < s.n ? ` Row ${r + 1} starts at column 0.` : '');
  } else if (action === 'skip') {
    s.message = `(${r}, ${s.col}) is watched: ${attacker(s, r, s.col)}.`;
    s.col++;
  } else if (action === 'record') {
    s.recordedBoard = true;
    s.solutions.push([...s.queens]);
    s.message = `Board ${s.solutions.length}: ${list(s.queens)} (the column of each row’s queen).`;
  } else if (action === 'backtrack') {
    const c = s.queens.pop() as number;
    s.col = c + 1;
    s.recordedBoard = false;
    s.message = `Lifted the queen from (${s.queens.length}, ${c}) and cleared its column and diagonals. Row ${s.queens.length} continues at column ${c + 1}.`;
  } else {
    s.done = true;
    s.message = s.solutions.length ? `${s.solutions.length} board(s): ${s.solutions.map(list).join(' ')}.` : `No way to place ${s.n} queens on a ${s.n} × ${s.n} board. An empty book is the answer.`;
  }
}
function queensView(s: BacktrackState): LabRow[] {
  const r = s.queens.length;
  const rows: LabRow[] = Array.from({ length: s.n }, (_, y) => ({
    name: `Row ${y}`,
    cells: Array.from({ length: s.n }, (_, x) => {
      if (y < r && s.queens[y] === x) return { value: 'Q', tone: 'done' as const };
      if (y === r && !s.done) {
        if (x === s.col) return { value: attacker(s, y, x) ? '×' : '·', label: 'TEST', tone: 'hot' as const };
        if (attacker(s, y, x)) return { value: '×', tone: 'out' as const };
      }
      return { value: '·' };
    }),
  }));
  rows.push({ name: 'Boards recorded', empty: 'None yet', cells: s.solutions.map((b, i) => ({ value: b.join(''), label: `#${i + 1}`, tone: 'done' as const })) });
  return rows;
}
function queensDescribe(s: BacktrackState) {
  if (s.done) return `Done: ${s.solutions.length} board(s) for n = ${s.n}.`;
  const r = s.queens.length;
  const cols = s.queens.join(', '), diag = s.queens.map((c, y) => y - c).join(', '), anti = s.queens.map((c, y) => y + c).join(', ');
  const where = r === s.n ? 'every row is filled' : s.col < s.n ? `row ${r}, testing column ${s.col}` : `row ${r}: no columns left`;
  return `n = ${s.n} · ${where} · columns taken {${cols}} · r − c taken {${diag}} · r + c taken {${anti}}`;
}

export const lab = makeLab<BacktrackState>({
  subsets: {
    name: 'Subsets with a thread',
    cases: subsetCases.length,
    actions: [
      { action: 'record', label: 'Record a copy of the thread' },
      { action: 'choose', label: 'Choose the next door (tie its item)' },
      { action: 'skip', label: 'Skip a twin (i > start, equals nums[i − 1])' },
      { action: 'unchoose', label: 'Un-choose: remove the last item' },
      { action: 'alias', label: 'Pin the thread itself into the book' },
      { action: 'finish', label: 'Close the Book of Ways' },
    ],
    create: v => fromInput({ mode: 'subsets', items: subsetCases[v] }),
    expected: subsetsExpected,
    apply: subsetsApply,
    reject: subsetsReject,
    view: subsetsView,
    describe: subsetsDescribe,
  },
  combo: {
    name: 'The toll purse: reusable coins to a target',
    cases: comboCases.length,
    actions: [
      { action: 'choose', label: 'Pay this coin; child starts at i (reuse)' },
      { action: 'choose-next', label: 'Pay this coin; child starts at i + 1' },
      { action: 'prune', label: 'Prune: too big (break)' },
      { action: 'record', label: 'Record a copy of the thread' },
      { action: 'unchoose', label: 'Un-choose: take the last coin back' },
      { action: 'finish', label: 'Close the Book of Ways' },
    ],
    create: v => fromInput({ mode: 'combo', ...comboCases[v] }),
    expected: comboExpected,
    apply: comboApply,
    reject: comboReject,
    view: comboView,
    describe: comboDescribe,
  },
  queens: {
    name: 'The queens’ chamber',
    cases: queenCases.length,
    actions: [
      { action: 'place', label: 'Place a queen on the tested square' },
      { action: 'skip', label: 'Skip this column (it is watched)' },
      { action: 'backtrack', label: 'Backtrack: lift the last queen' },
      { action: 'record', label: 'Record this board' },
      { action: 'finish', label: 'Every corridor is walked' },
    ],
    create: v => fromInput({ mode: 'queens', n: queenCases[v] }),
    expected: queensExpected,
    apply: queensApply,
    reject: queensReject,
    view: queensView,
    describe: queensDescribe,
  },
}, 'Gold = active · green = on the thread / recorded · faded = out of reach or watched');
