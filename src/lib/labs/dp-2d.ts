// 2-D Dynamic Programming playground: ink an LCS table square by square and walk back to read the route;
// choose the move behind every edit-distance square; and sweep a one-row subset table for each crate,
// in the only direction that uses each crate at most once.
import { makeLab, type LabBase, type LabRow } from '../lab.ts';

type KPhase = 'parity' | 'choose' | 'cell' | 'end';
export interface DpState extends LabBase {
  // lcs + edit
  a: string;
  b: string;
  dp: number[][];                    // −1 = not inked yet
  i: number;                         // the square being inked (1-based); i > a.length once the table is full
  j: number;
  // lcs walk-back
  walking: boolean;
  wi: number;
  wj: number;
  route: string;
  trail: [number, number][];         // squares visited on the walk
  // knapsack
  nums: number[];
  total: number;
  target: number;
  row: boolean[];
  item: number;                      // index of the crate being swept
  s: number;                         // the total being decided
  kphase: KPhase;
  answer: boolean | null;
}

type Input =
  | { mode: 'lcs'; a: string; b: string }
  | { mode: 'edit'; a: string; b: string }
  | { mode: 'knap'; nums: number[] };

const blank = () => ({
  a: '', b: '', dp: [] as number[][], i: 1, j: 1,
  walking: false, wi: 0, wj: 0, route: '', trail: [] as [number, number][],
  nums: [] as number[], total: 0, target: 0, row: [] as boolean[], item: 0, s: 0, kphase: 'parity' as KPhase, answer: null as boolean | null,
});

const lcsCases = [
  { a: 'LBRCT', b: 'BLCRT' },
  { a: 'AA', b: 'A' },
  { a: 'ABC', b: 'DEF' },
  { a: '', b: 'ABC' },
];
const editCases = [
  { a: 'horse', b: 'ros' },
  { a: 'flaw', b: 'lawn' },
  { a: 'aa', b: 'a' },
  { a: '', b: 'abc' },
];
const knapCases = [
  { nums: [1, 2, 5] },
  { nums: [2, 3, 5] },
  { nums: [3, 3, 3, 3] },
  { nums: [1, 2, 4] },
];

function table(a: string, b: string, edit: boolean) {
  return Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => {
    if (i === 0) return edit ? j : 0;
    if (j === 0) return edit ? i : 0;
    return -1;
  }));
}

export function fromInput(input: Input) {
  const base = blank();
  if (input.mode === 'knap') {
    const total = input.nums.reduce((x, y) => x + y, 0);
    return { ...base, nums: [...input.nums], total };
  }
  const dp = table(input.a, input.b, input.mode === 'edit');
  const full = input.a.length === 0 || input.b.length === 0;
  return {
    ...base, a: input.a, b: input.b, dp, i: full ? input.a.length + 1 : 1, j: 1,
    walking: input.mode === 'lcs' && full, wi: input.a.length, wj: input.b.length,
  };
}

const fmt = (x: number) => (x < 0 ? `−${-x}` : String(x));
const tableFull = (s: DpState) => s.i > s.a.length;
const blanks = (s: DpState) => s.dp.reduce((n, r) => n + r.filter(v => v === -1).length, 0);
function advance(s: DpState) {
  s.j++;
  if (s.j > s.b.length) { s.i++; s.j = 1; }
}
function tableRows(s: DpState, mark: (i: number, j: number) => { label?: string; tone?: 'hot' | 'done' | 'out' | 'ghost' }): LabRow[] {
  const head: LabRow = { name: `Second word / map along the top`, cells: ['∅', ...s.b.split('')].map((ch, j) => ({ value: ch, label: `j = ${j}` })) };
  return [head, ...s.dp.map((r, i) => ({
    name: i === 0 ? 'i = 0 · ∅ (empty prefix)' : `i = ${i} · ${s.a[i - 1]}`,
    cells: r.map((v, j) => {
      const m = mark(i, j);
      return { value: v === -1 ? '·' : String(v), label: m.label, tone: m.tone ?? (v === -1 ? 'ghost' : undefined) };
    }),
  }))];
}
function readMarks(s: DpState, i: number, j: number) {
  if (tableFull(s)) return {};
  if (i === s.i && j === s.j) return { label: 'HERE', tone: 'hot' as const };
  if (i === s.i - 1 && j === s.j - 1) return { label: 'diag' };
  if (i === s.i - 1 && j === s.j) return { label: 'up' };
  if (i === s.i && j === s.j - 1) return { label: 'left' };
  return {};
}

// ---------- LCS ----------
function lcsExpected(s: DpState) {
  if (!tableFull(s)) return s.a[s.i - 1] === s.b[s.j - 1] ? 'diag' : 'max';
  if (s.wi === 0 || s.wj === 0) return 'finish';
  if (s.a[s.wi - 1] === s.b[s.wj - 1]) return 'walk-diag';
  return s.dp[s.wi - 1][s.wj] >= s.dp[s.wi][s.wj - 1] ? 'walk-up' : 'walk-left';
}
function lcsAlso(s: DpState, action: string) {
  if (!tableFull(s) || s.wi === 0 || s.wj === 0 || s.a[s.wi - 1] === s.b[s.wj - 1]) return false;
  return action === 'walk-left' && s.dp[s.wi - 1][s.wj] === s.dp[s.wi][s.wj - 1];
}
function lcsReject(s: DpState, action: string) {
  const walk = action.startsWith('walk');
  if (!tableFull(s)) {
    const x = s.a[s.i - 1], y = s.b[s.j - 1];
    const up = s.dp[s.i - 1][s.j], left = s.dp[s.i][s.j - 1], diag = s.dp[s.i - 1][s.j - 1];
    if (walk) return `Ink the table first. The walk starts at the answer square dp[${s.a.length}][${s.b.length}], and ${blanks(s)} square(s) are still blank.`;
    if (action === 'finish') return `${blanks(s)} square(s) are still blank, including the answer square.`;
    if (action === 'diag') return `${x} ≠ ${y}: they can’t pair. Diagonal + 1 = ${diag + 1} would claim a shared landmark that isn’t there. Drop one map’s last letter instead: max(up ${up}, left ${left}) = ${Math.max(up, left)}.`;
    if (Math.max(up, left) === diag + 1) return `${x} = ${y}: both last letters can join the route, so the rule is diagonal + 1 = ${diag + 1}. Here max(up, left) happens to be ${diag + 1} as well, but only by luck: when up, left and the diagonal are all equal, max(up, left) misses the pair. On a match, take the diagonal.`;
    return `${x} = ${y}: both last letters can join the route. max(up ${up}, left ${left}) = ${Math.max(up, left)} ignores the pair; diagonal ${diag} + 1 = ${diag + 1} uses it.`;
  }
  if (action === 'diag' || action === 'max') return `Every square is inked; dp[${s.a.length}][${s.b.length}] = ${s.dp[s.a.length][s.b.length]}. Now walk back from it to read which landmarks the route keeps.`;
  if (s.wi === 0 || s.wj === 0) return `You have reached ${s.wi === 0 ? 'row 0' : 'column 0'}: one map has no letters left, so no more landmarks can be shared. Read off the route.`;
  const x = s.a[s.wi - 1], y = s.b[s.wj - 1], here = s.dp[s.wi][s.wj];
  const up = s.dp[s.wi - 1][s.wj], left = s.dp[s.wi][s.wj - 1];
  if (action === 'finish') return `The walk isn’t over: you stand on (${s.wi}, ${s.wj}) holding ${here}, so ${here} more landmark(s) are still to collect.`;
  if (x === y) return `${x} = ${y}: this square was inked as diagonal + 1. Step diagonally and keep the ${x}.`;
  if (action === 'walk-diag') return `${x} ≠ ${y}: this square didn’t come from the diagonal. Keeping a letter here would spell a route one of the maps doesn’t contain.`;
  if (action === 'walk-up') return `Up holds ${up}, less than this square’s ${here}: the longest route doesn’t pass through it. Left holds ${left}.`;
  return `Left holds ${left}, less than this square’s ${here}: the longest route doesn’t pass through it. Up holds ${up}.`;
}
function lcsApply(s: DpState, action: string) {
  if (action === 'diag' || action === 'max') {
    const x = s.a[s.i - 1], y = s.b[s.j - 1];
    const up = s.dp[s.i - 1][s.j], left = s.dp[s.i][s.j - 1], diag = s.dp[s.i - 1][s.j - 1];
    const v = action === 'diag' ? diag + 1 : Math.max(up, left);
    s.dp[s.i][s.j] = v;
    s.message = action === 'diag'
      ? `${x} = ${y}: diagonal ${diag} + 1 = ${v}. Both last letters join the route.`
      : `${x} ≠ ${y}: max(up ${up}, left ${left}) = ${v}. One of the two last letters is left out.`;
    advance(s);
    if (tableFull(s)) {
      s.walking = true;
      s.trail = [[s.wi, s.wj]];
      s.message += ` The table is full: the answer square holds ${s.dp[s.a.length][s.b.length]}. Now walk back from it.`;
    }
  } else if (action === 'finish') {
    s.done = true;
    s.message = s.route.length ? `The agreed route is ${s.route.split('').join(', ')}: ${s.route.length} landmark(s), read back to front from the answer square.` : 'No landmark is shared: the longest common route is empty, length 0.';
  } else {
    if (!s.trail.length) s.trail = [[s.wi, s.wj]];
    if (action === 'walk-diag') {
      s.route = s.a[s.wi - 1] + s.route;
      s.message = `Kept ${s.a[s.wi - 1]}. Route so far, back to front: ${s.route.split('').join(', ')}.`;
      s.wi--; s.wj--;
    } else if (action === 'walk-up') {
      s.message = `Stepped up: map A’s ${s.a[s.wi - 1]} is not on this route.`;
      s.wi--;
    } else {
      s.message = `Stepped left: map B’s ${s.b[s.wj - 1]} is not on this route.`;
      s.wj--;
    }
    s.trail.push([s.wi, s.wj]);
  }
}
function lcsView(s: DpState): LabRow[] {
  const onTrail = (i: number, j: number) => s.trail.some(([x, y]) => x === i && y === j);
  return tableRows(s, (i, j) => {
    if (!tableFull(s)) return readMarks(s, i, j);
    if (i === s.wi && j === s.wj && !s.done) return { label: 'WALKER', tone: 'hot' };
    if (onTrail(i, j)) return { tone: 'done' };
    return {};
  });
}
function lcsDescribe(s: DpState) {
  if (s.done) return `Route: ${s.route || '(empty)'}. Length ${s.route.length}.`;
  if (!tableFull(s)) return `Square (${s.i}, ${s.j}): ${s.a[s.i - 1]} versus ${s.b[s.j - 1]}. up = ${s.dp[s.i - 1][s.j]}, left = ${s.dp[s.i][s.j - 1]}, diagonal = ${s.dp[s.i - 1][s.j - 1]}.`;
  if (s.wi === 0 || s.wj === 0) return `Walk complete. Route collected: ${s.route || '(empty)'}.`;
  return `Walking back at (${s.wi}, ${s.wj}) = ${s.dp[s.wi][s.wj]}: ${s.a[s.wi - 1]} versus ${s.b[s.wj - 1]}. Route so far: ${s.route || '(none)'}.`;
}

// ---------- Edit distance ----------
const MOVES = ['replace', 'delete', 'insert'] as const;
function costs(s: DpState) {
  const diag = s.dp[s.i - 1][s.j - 1], up = s.dp[s.i - 1][s.j], left = s.dp[s.i][s.j - 1];
  return { replace: 1 + diag, delete: 1 + up, insert: 1 + left, diag, up, left };
}
function editExpected(s: DpState) {
  if (tableFull(s)) return 'finish';
  if (s.a[s.i - 1] === s.b[s.j - 1]) return 'free';
  const c = costs(s), best = Math.min(c.replace, c.delete, c.insert);
  return MOVES.find(m => c[m] === best)!;
}
function editAlso(s: DpState, action: string) {
  if (tableFull(s) || s.a[s.i - 1] === s.b[s.j - 1] || !(MOVES as readonly string[]).includes(action)) return false;
  const c = costs(s);
  return c[action as typeof MOVES[number]] === Math.min(c.replace, c.delete, c.insert);
}
const moveText = (s: DpState, m: string) => {
  const x = s.a[s.i - 1], y = s.b[s.j - 1];
  if (m === 'replace') return `replace ${x} with ${y} (1 + diagonal)`;
  if (m === 'delete') return `delete ${x} (1 + up)`;
  return `insert ${y} (1 + left)`;
};
function editReject(s: DpState, action: string) {
  if (tableFull(s)) return `Every square is inked. The answer is the bottom-right square, dp[${s.a.length}][${s.b.length}] = ${s.dp[s.a.length][s.b.length]}.`;
  if (action === 'finish') return `${blanks(s)} square(s) are still blank, including the answer square.`;
  const x = s.a[s.i - 1], y = s.b[s.j - 1], c = costs(s);
  if (action === 'free') return `${x} ≠ ${y}: copying the diagonal (${c.diag}) for free would pretend they already agree. Some move must change them.`;
  const mine = c[action as typeof MOVES[number]];
  if (x === y) return `${x} = ${y}: copy the diagonal for free, ${c.diag}. To ${moveText(s, action)} costs ${mine}, and a free match is never worse.`;
  const best = editExpected(s);
  return `To ${moveText(s, action)} costs ${mine}. Cheaper: ${moveText(s, best)} = ${c[best as typeof MOVES[number]]}.`;
}
function editApply(s: DpState, action: string) {
  if (action === 'finish') {
    s.done = true;
    s.message = `“${s.a}” → “${s.b}” takes ${s.dp[s.a.length][s.b.length]} move(s). The bottom-right square is the whole of one word against the whole of the other.`;
    return;
  }
  const c = costs(s), x = s.a[s.i - 1], y = s.b[s.j - 1];
  const v = action === 'free' ? c.diag : c[action as typeof MOVES[number]];
  s.dp[s.i][s.j] = v;
  s.message = action === 'free' ? `${x} = ${y}: free, copy the diagonal ${c.diag}.` : `${x} ≠ ${y}: ${moveText(s, action)} = ${v}.`;
  advance(s);
  if (tableFull(s)) s.message += ` The table is full.`;
}
function editView(s: DpState): LabRow[] {
  return tableRows(s, (i, j) => {
    if (tableFull(s)) return i === s.a.length && j === s.b.length ? { label: 'ANSWER', tone: 'done' } : {};
    return readMarks(s, i, j);
  });
}
function editDescribe(s: DpState) {
  if (s.done || tableFull(s)) return `“${s.a}” → “${s.b}”: ${s.dp[s.a.length][s.b.length]} move(s).`;
  const c = costs(s);
  return `Square (${s.i}, ${s.j}): ${s.a[s.i - 1]} versus ${s.b[s.j - 1]}. diagonal = ${c.diag}, up = ${c.up}, left = ${c.left}.`;
}

// ---------- 0/1 knapsack, one row ----------
const w = (s: DpState) => s.nums[s.item];
function nextItem(s: DpState) {
  s.item++;
  s.kphase = s.item < s.nums.length ? 'choose' : 'end';
}
function knapExpected(s: DpState) {
  if (s.kphase === 'parity') return s.total % 2 === 1 ? 'odd' : 'half';
  if (s.kphase === 'choose') return 'down';
  if (s.kphase === 'cell') return !s.row[s.s] && s.row[s.s - w(s)] ? 'take' : 'skip';
  return 'finish';
}
function knapAlso(s: DpState, action: string) {
  return s.kphase === 'cell' && action === 'take' && s.row[s.s] && s.row[s.s - w(s)];
}
function forwardClash(s: DpState) {
  // simulate an upward sweep of the current crate; report the first total it would wrongly switch on
  const up = [...s.row], down = [...s.row], x = w(s);
  for (let t = x; t <= s.target; t++) up[t] = up[t] || up[t - x];
  for (let t = s.target; t >= x; t--) down[t] = down[t] || down[t - x];
  for (let t = 0; t <= s.target; t++) if (up[t] && !down[t]) return t;
  return -1;
}
function knapReject(s: DpState, action: string) {
  if (s.kphase === 'parity') {
    if (action === 'half') return `The total is ${s.total}, odd. Two equal whole-number groups always add to an even number, so the answer is false without any table.`;
    if (action === 'odd') return `The total is ${s.total}, even, so half is ${s.total / 2}. An even total doesn’t promise a split; you still have to check.`;
    return `Check the total first: ${s.nums.join(' + ')} = ${s.total}.`;
  }
  if (s.kphase === 'end') return `Every crate has been swept. Read dp[${s.target}] = ${s.row[s.target] ? '✓' : '·'}.`;
  if (action === 'odd' || action === 'half') return `The total (${s.total}) is already checked; the target is ${s.target}.`;
  if (s.kphase === 'choose') {
    if (action === 'up') {
      const t = forwardClash(s), x = w(s);
      if (t >= 0) return `Sweeping up, dp[${t}] would read dp[${t - x}] after crate ${x} itself had just switched it on in this same sweep: crate ${x} used twice, and dp[${t}] turns ✓ with no real group behind it.`;
      return `On this row an upward sweep happens to change nothing extra, but only by luck: going up, dp[s − ${x}] may already include crate ${x}. Downwards is the rule.`;
    }
    if (action === 'finish') return `${s.nums.length - s.item} crate(s) are still to sweep: ${s.nums.slice(s.item).join(', ')}.`;
    return `Choose the sweep direction for crate ${w(s)} first.`;
  }
  const x = w(s), t = s.s;
  if (action === 'up' || action === 'down') return `You are mid-sweep for crate ${x}: totals ${t} down to ${x} are still to decide.`;
  if (action === 'finish') return `The sweep for crate ${x} isn’t done: totals ${t} down to ${x} remain.`;
  if (action === 'take') return `dp[${t - x}] is ·: no earlier group totals ${t - x}, so adding crate ${x} can’t make ${t}.`;
  return `dp[${t - x}] is ✓: an earlier group totals ${t - x}. Add crate ${x} and you reach ${t}. Leaving dp[${t}] as · loses that group.`;
}
function knapApply(s: DpState, action: string) {
  if (action === 'odd') {
    s.done = true; s.answer = false;
    s.message = `Total ${s.total} is odd: no even split exists. Answer: false.`;
  } else if (action === 'half') {
    s.target = s.total / 2;
    s.row = Array.from({ length: s.target + 1 }, (_, t) => t === 0);
    s.kphase = s.nums.length ? 'choose' : 'end';
    s.message = `Total ${s.total}, so each group must weigh ${s.target}. dp[0] = ✓: the empty group weighs 0.`;
  } else if (action === 'down') {
    const x = w(s);
    if (x > s.target) {
      s.message = `Crate ${x} is heavier than ${s.target}: it can’t be in the target group. Nothing changes.`;
      nextItem(s);
    } else {
      s.kphase = 'cell'; s.s = s.target;
      s.message = `Sweeping crate ${x} from ${s.target} down to ${x}. Every dp[s − ${x}] you read is still from before this crate.`;
    }
  } else if (action === 'take' || action === 'skip') {
    const x = w(s), t = s.s;
    if (action === 'take') {
      const fresh = !s.row[t];
      s.row[t] = true;
      s.message = fresh ? `dp[${t - x}] is ✓, so crate ${x} on top of that group reaches ${t}: dp[${t}] = ✓.` : `dp[${t}] was already ✓; it stays ✓.`;
    } else {
      s.message = s.row[t] ? `dp[${t}] is already ✓; it stays.` : `dp[${t - x}] is ·: crate ${x} can’t help reach ${t}. dp[${t}] stays ·.`;
    }
    s.s--;
    if (s.s < x) nextItem(s);
  } else {
    s.done = true; s.answer = s.row[s.target];
    s.message = s.answer ? `dp[${s.target}] = ✓: some crates weigh exactly ${s.target}, and the rest weigh ${s.total - s.target}. Answer: true.` : `dp[${s.target}] = ·: no group weighs exactly ${s.target}. Answer: false.`;
  }
}
function knapView(s: DpState): LabRow[] {
  const crates: LabRow = {
    name: 'Crates', empty: 'No crates',
    cells: s.nums.map((x, k) => ({ value: String(x), label: k === s.item && s.kphase !== 'end' && s.kphase !== 'parity' && !s.done ? 'NOW' : undefined, tone: k < s.item ? 'done' : k === s.item && (s.kphase === 'choose' || s.kphase === 'cell') ? 'hot' : undefined })),
  };
  if (!s.row.length) return [crates, { name: `dp[s]: some crates total exactly s`, empty: s.done ? 'No table needed' : 'Check the total first', cells: [] }];
  const x = s.kphase === 'cell' ? w(s) : 0;
  const dp: LabRow = {
    name: `dp[s] for s = 0..${s.target}: some crates seen so far total exactly s`,
    cells: s.row.map((v, t) => {
      let label = `s=${t}`, tone: 'hot' | 'done' | undefined;
      if (s.kphase === 'cell' && t === s.s) { label = `s=${t} HERE`; tone = 'hot'; }
      else if (s.kphase === 'cell' && t === s.s - x) label = `s=${t} s−w`;
      else if (s.kphase === 'cell' && t > s.s) tone = 'done';
      return { value: v ? '✓' : '·', label, tone };
    }),
  };
  return [crates, dp];
}
function knapDescribe(s: DpState) {
  if (s.done) return `Answer: ${s.answer}.`;
  if (s.kphase === 'parity') return `Crates ${s.nums.join(', ')}. Total ${s.total}.`;
  if (s.kphase === 'choose') return `Target ${s.target}. Next crate: ${w(s)}. Which way do you sweep?`;
  if (s.kphase === 'cell') return `Crate ${w(s)}, total s = ${s.s}: dp[${s.s}] = ${s.row[s.s] ? '✓' : '·'}, dp[${s.s - w(s)}] = ${s.row[s.s - w(s)] ? '✓' : '·'}.`;
  return `All crates swept. dp[${s.target}] = ${s.row[s.target] ? '✓' : '·'}.`;
}

export const lab = makeLab<DpState>({
  lcs: {
    name: 'Two maps: ink the LCS table, then walk back',
    cases: lcsCases.length,
    actions: [
      { action: 'diag', label: 'Letters match: diagonal + 1' },
      { action: 'max', label: 'No match: max(up, left)' },
      { action: 'walk-diag', label: 'Walk back: keep the letter, step diagonally' },
      { action: 'walk-up', label: 'Walk back: step up' },
      { action: 'walk-left', label: 'Walk back: step left' },
      { action: 'finish', label: 'Read off the route' },
    ],
    create: v => fromInput({ mode: 'lcs', ...lcsCases[v] }),
    expected: lcsExpected,
    alsoValid: lcsAlso,
    apply: lcsApply,
    reject: lcsReject,
    view: lcsView,
    describe: lcsDescribe,
  },
  edit: {
    name: 'Redraw the label: choose each square’s move',
    cases: editCases.length,
    actions: [
      { action: 'free', label: 'Letters match: copy the diagonal (free)' },
      { action: 'replace', label: 'Replace: 1 + diagonal' },
      { action: 'delete', label: 'Delete from the first word: 1 + up' },
      { action: 'insert', label: 'Insert into the first word: 1 + left' },
      { action: 'finish', label: 'Read the answer square' },
    ],
    create: v => fromInput({ mode: 'edit', ...editCases[v] }),
    expected: editExpected,
    alsoValid: editAlso,
    apply: editApply,
    reject: editReject,
    view: editView,
    describe: editDescribe,
  },
  knap: {
    name: 'The crate room: one row, each crate once',
    cases: knapCases.length,
    actions: [
      { action: 'odd', label: 'Total is odd: answer false now' },
      { action: 'half', label: 'Total is even: aim for half' },
      { action: 'down', label: 'Sweep this crate from the target DOWN' },
      { action: 'up', label: 'Sweep this crate from its weight UP' },
      { action: 'take', label: 'dp[s − w] is ✓: mark dp[s] ✓' },
      { action: 'skip', label: 'Leave dp[s] as it is' },
      { action: 'finish', label: 'All crates swept: read dp[target]' },
    ],
    create: v => fromInput({ mode: 'knap', ...knapCases[v] }),
    expected: knapExpected,
    alsoValid: knapAlso,
    apply: knapApply,
    reject: knapReject,
    view: knapView,
    describe: knapDescribe,
  },
}, 'Gold = the square being decided · green = settled · dashed = not inked yet · labels show which neighbours it reads');
