// Prefix Sum playground: write the ledger and answer range questions; run the vault (seed, add, count,
// record) in the only safe order; and post range updates on a notice board, then sweep once.
import { makeLab, type LabBase, type LabRow } from '../lab.ts';

type Phase = 'add' | 'count' | 'record';
export interface PrefixState extends LabBase {
  a: number[];
  // ledger mode
  prefix: number[];                  // lines written so far; prefix.length − 1 values absorbed
  queries: [number, number][];
  qi: number;
  answers: number[];
  // vault mode
  k: number;
  seeded: boolean;
  i: number;                         // index of the value being handled
  running: number;
  phase: Phase;
  vault: [number, number][];         // [total, times seen] in insertion order
  count: number;
  // notice-board mode
  n: number;
  updates: [number, number, number][];   // [l, r, v], 0-indexed, inclusive
  ui: number;
  diff: number[];                    // n + 1 slots
  out: number[];                     // settled totals, swept left to right
  carry: number;
}

type Input =
  | { mode: 'ledger'; a: number[]; queries: [number, number][] }
  | { mode: 'vault'; a: number[]; k: number }
  | { mode: 'board'; n: number; updates: [number, number, number][] };

const blank = () => ({
  a: [] as number[], prefix: [0], queries: [] as [number, number][], qi: 0, answers: [] as number[],
  k: 0, seeded: false, i: 0, running: 0, phase: 'add' as Phase, vault: [] as [number, number][], count: 0,
  n: 0, updates: [] as [number, number, number][], ui: 0, diff: [] as number[], out: [] as number[], carry: 0,
});

const ledgerCases: { a: number[]; queries: [number, number][] }[] = [
  { a: [3, 1, 4, 1, 5], queries: [[1, 3], [0, 2], [4, 4]] },
  { a: [-2, 0, 3, -5, 2, -1], queries: [[0, 2], [2, 5], [0, 5]] },
  { a: [2, 2, 2, 2], queries: [[1, 2], [0, 3]] },
  { a: [], queries: [] },
];
const vaultCases: { a: number[]; k: number }[] = [
  { a: [1, 2, 3], k: 3 },
  { a: [3, 4, 7, -2, 2], k: 7 },
  { a: [1, -1, 1, -1], k: 0 },
  { a: [], k: 5 },
];
const boardCases: { n: number; updates: [number, number, number][] }[] = [
  { n: 5, updates: [[0, 1, 10], [1, 2, 20], [1, 4, 25]] },
  { n: 4, updates: [[0, 3, 5], [0, 3, -2]] },
  { n: 1, updates: [[0, 0, 7]] },
  { n: 3, updates: [] },
];

export function fromInput(input: Input) {
  const base = blank();
  if (input.mode === 'ledger') return { ...base, a: [...input.a], queries: input.queries.map(q => [...q] as [number, number]) };
  if (input.mode === 'vault') return { ...base, a: [...input.a], k: input.k };
  return { ...base, n: input.n, updates: input.updates.map(u => [...u] as [number, number, number]), diff: Array(input.n + 1).fill(0) };
}

const fmt = (x: number) => (x < 0 ? `−${-x}` : String(x));
const plus = (v: number) => (v < 0 ? `−${-v}` : `+${v}`);
const minus = (v: number) => (v < 0 ? `+${-v}` : `−${v}`);
const sub = (x: number, y: number) => `${fmt(x)} − ${y < 0 ? `(${fmt(y)})` : fmt(y)}`;
const vaultGet = (s: PrefixState, total: number) => s.vault.find(([t]) => t === total)?.[1] ?? 0;

// ---------- ledger ----------
const ledgerBuilt = (s: PrefixState) => s.prefix.length === s.a.length + 1;
function ledgerExpected(s: PrefixState) {
  if (!ledgerBuilt(s)) return 'write';
  return s.qi < s.queries.length ? 'exact' : 'finish';
}
function ledgerReject(s: PrefixState, action: string) {
  const built = ledgerBuilt(s), next = s.prefix.length - 1;
  if (action === 'write') return `Every value is already on the ledger: line ${s.a.length} holds the grand total ${fmt(s.prefix[s.a.length])}. Nothing is left to write.`;
  if (action === 'finish') {
    if (!built) return `The ledger is unfinished: ${s.a.length - next} line(s) still unwritten, and the auditor has ${s.queries.length} question(s).`;
    return `The auditor still has ${s.queries.length - s.qi} question(s) waiting.`;
  }
  if (!built) return `Build first, answer later. The questions can reach any line, and line ${s.a.length} isn’t written yet. Finishing the ledger costs one pass; after that every answer is one subtraction.`;
  if (s.qi >= s.queries.length) return 'No questions are left. Close the ledger.';
  const [l, r] = s.queries[s.qi];
  if (action === 'short') {
    const covers = r > l ? `positions ${l}..${r - 1}` : 'no positions at all';
    return `prefix[${r}] − prefix[${l}] = ${sub(s.prefix[r], s.prefix[l])} = ${fmt(s.prefix[r] - s.prefix[l])} covers ${covers}. It leaves out a[${r}] = ${fmt(s.a[r])}.`;
  }
  const covers = r > l ? `positions ${l + 1}..${r}` : 'no positions at all';
  return `prefix[${r + 1}] − prefix[${l + 1}] = ${sub(s.prefix[r + 1], s.prefix[l + 1])} = ${fmt(s.prefix[r + 1] - s.prefix[l + 1])} covers ${covers}. It drops a[${l}] = ${fmt(s.a[l])}, which the question includes.`;
}
function ledgerApply(s: PrefixState, action: string) {
  if (action === 'write') {
    const i = s.prefix.length - 1, value = s.prefix[i] + s.a[i];
    s.prefix.push(value);
    s.message = `Line ${i + 1} = line ${i} + a[${i}] = ${fmt(s.prefix[i])} + ${s.a[i] < 0 ? `(${fmt(s.a[i])})` : fmt(s.a[i])} = ${fmt(value)}: the total of everything before index ${i + 1}.`;
  } else if (action === 'exact') {
    const [l, r] = s.queries[s.qi], value = s.prefix[r + 1] - s.prefix[l];
    s.answers.push(value);
    s.qi++;
    s.message = `sum(${l}..${r}) = prefix[${r + 1}] − prefix[${l}] = ${sub(s.prefix[r + 1], s.prefix[l])} = ${fmt(value)}. The shared beginning cancels.` + (s.qi === s.queries.length ? ' No questions left.' : '');
  } else {
    s.done = true;
    s.message = s.queries.length ? `Answers: ${s.answers.map(fmt).join(', ')}. One pass to build, one subtraction per question.` : 'A ledger with no values is just the zero line. Nothing to answer.';
  }
}
function ledgerView(s: PrefixState): LabRow[] {
  const q = s.qi < s.queries.length && ledgerBuilt(s) ? s.queries[s.qi] : null;
  const values: LabRow = {
    name: 'Values a', empty: 'No values',
    cells: s.a.map((v, i) => {
      const labels = [q && i === q[0] ? 'L' : '', q && i === q[1] ? 'R' : ''].filter(Boolean).join(' / ');
      return { value: String(v), label: labels || undefined, tone: q && i >= q[0] && i <= q[1] ? 'hot' : i < s.prefix.length - 1 ? 'done' : undefined };
    }),
  };
  const lines: LabRow = {
    name: 'Ledger prefix (n + 1 lines)',
    cells: Array.from({ length: s.a.length + 1 }, (_, i) => {
      const written = i < s.prefix.length;
      let label: string | undefined;
      if (!ledgerBuilt(s) && i === s.prefix.length) label = 'NEXT';
      if (q && (i === q[0] || i === q[1] + 1)) label = `prefix[${i}]`;
      return { value: written ? String(s.prefix[i]) : '·', label, tone: written ? (label ? 'hot' : undefined) : 'ghost' };
    }),
  };
  const answers: LabRow = { name: 'Answers given', empty: 'None yet', cells: s.answers.map((v, i) => ({ value: String(v), label: `${s.queries[i][0]}..${s.queries[i][1]}`, tone: 'done' })) };
  return [values, lines, answers];
}
function ledgerDescribe(s: PrefixState) {
  if (s.done) return `Ledger closed. Answers: [${s.answers.join(', ')}].`;
  if (!ledgerBuilt(s)) {
    const i = s.prefix.length - 1;
    return `Building the ledger: ${i} of ${s.a.length} values absorbed. Next: line ${i + 1} = line ${i} + a[${i}].`;
  }
  if (s.qi < s.queries.length) {
    const [l, r] = s.queries[s.qi];
    return `Question ${s.qi + 1} of ${s.queries.length}: the total of a[${l}..${r}], inclusive. Which two lines?`;
  }
  return 'Every question is answered.';
}

// ---------- vault ----------
function vaultExpected(s: PrefixState) {
  if (!s.seeded) return 'seed';
  if (s.phase === 'add') return s.i < s.a.length ? 'add' : 'finish';
  return s.phase;
}
function lostFromStart(s: PrefixState) {
  let total = 0;
  for (let j = 0; j < s.a.length; j++) { total += s.a[j]; if (total === s.k) return j; }
  return -1;
}
function vaultReject(s: PrefixState, action: string) {
  if (!s.seeded) {
    if (action === 'seed') return 'Seed the vault.';
    const j = lostFromStart(s);
    if (j >= 0) return `Seed first. Without total 0 in the vault, a run that starts at the very first value can never be matched — and here a[0..${j}] sums to ${fmt(s.k)}. That run would be lost.`;
    return `Seed first. Without total 0 in the vault, runs that start at the very first value can never be matched. No such run exists in this case, so you would get lucky — but the bug is still there.`;
  }
  if (action === 'seed') return 'The vault already holds total 0 once. Seeding again would count every run from the start twice.';
  const unread = s.a.length - s.i;
  if (s.phase === 'add' && unread === 0) return `Every value has been read and every total recorded. Report the count: ${s.count}.`;
  if (s.phase === 'add') {
    if (action === 'count') return `a[${s.i}] = ${fmt(s.a[s.i])} isn’t in the running total yet. The count must describe runs that END at index ${s.i}, so add it first.`;
    if (action === 'record') return `The running total ${fmt(s.running)} is already in the vault. Recording it again would double its tally.`;
    if (action === 'finish') return `${unread} value(s) are still unread.`;
  }
  if (s.phase === 'count') {
    if (action === 'add') return `Runs ending at index ${s.i} haven’t been counted. Moving on would lose them for good.`;
    if (action === 'record') {
      if (s.k === 0) return `Record first and the total ${fmt(s.running)} matches itself: running − k = running when k = 0. That counts an empty run as a sum-0 subarray. Count first, then record.`;
      return `Record first and the current total sits in the vault while you count. With k = ${fmt(s.k)} it can’t match itself, so this answer would survive — but the same habit counts phantom empty runs when k = 0. Count first, then record.`;
    }
    if (action === 'finish') return `a[${s.i}] has been added, but the runs ending there haven’t been counted.`;
  }
  // phase === 'record'
  if (action === 'add') return `Record ${fmt(s.running)} first. Skip it, and later positions can’t find runs that start right after index ${s.i}.`;
  if (action === 'count') return `You already counted the runs ending at index ${s.i}. Counting again would double them.`;
  return `The running total ${fmt(s.running)} hasn’t been recorded yet${unread > 1 ? `, and ${unread - 1} value(s) are unread` : ''}.`;
}
function vaultApply(s: PrefixState, action: string) {
  if (action === 'seed') {
    s.seeded = true;
    s.vault = [[0, 1]];
    s.message = 'Total 0, seen once: the empty prefix above the first value. Runs that start at index 0 will match it.';
  } else if (action === 'add') {
    s.running += s.a[s.i];
    s.phase = 'count';
    s.message = `Running total ${fmt(s.running)} after a[${s.i}] = ${fmt(s.a[s.i])}. A run ending here began where the total was ${sub(s.running, s.k)} = ${fmt(s.running - s.k)}.`;
  } else if (action === 'count') {
    const found = vaultGet(s, s.running - s.k);
    s.count += found;
    s.phase = 'record';
    s.message = found ? `The vault has total ${fmt(s.running - s.k)} ×${found}: ${found} run(s) end at index ${s.i}. Count = ${s.count}.` : `No earlier total ${fmt(s.running - s.k)}: no run ends at index ${s.i}. Count stays ${s.count}.`;
  } else if (action === 'record') {
    const entry = s.vault.find(([t]) => t === s.running);
    if (entry) entry[1]++; else s.vault.push([s.running, 1]);
    s.message = `Recorded ${fmt(s.running)}${entry ? ` (now ×${entry[1]})` : ''}. Later positions can use it as a start.`;
    s.i++;
    s.phase = 'add';
  } else {
    s.done = true;
    s.message = `${s.count} run(s) sum to exactly ${fmt(s.k)}. One pass; each value added, counted against the vault, then recorded.`;
  }
}
function vaultView(s: PrefixState): LabRow[] {
  const target = s.phase === 'count' ? s.running - s.k : null;
  return [
    {
      name: 'Values a', empty: 'No values',
      cells: s.a.map((v, i) => ({ value: String(v), label: i === s.i && !s.done ? (s.phase === 'add' ? 'NEXT' : 'HERE') : undefined, tone: i < s.i || (i === s.i && s.phase !== 'add') ? 'done' : undefined })),
    },
    {
      name: 'Vault (total ×times)', empty: 'Vault is empty',
      cells: s.vault.map(([t, c]) => ({ value: String(t), label: `×${c}`, tone: target !== null && t === target ? 'hot' : undefined })),
    },
  ];
}
function vaultDescribe(s: PrefixState) {
  const look = s.phase === 'count' ? ` · look for ${sub(s.running, s.k)} = ${fmt(s.running - s.k)}` : '';
  return `k = ${fmt(s.k)} · running total = ${fmt(s.running)}${look} · count = ${s.count}${s.seeded ? '' : ' · vault not seeded'}`;
}

// ---------- notice board ----------
function boardExpected(s: PrefixState) {
  if (s.ui < s.updates.length) return 'mark';
  return s.out.length < s.n ? 'sweep' : 'finish';
}
function boardReject(s: PrefixState, action: string) {
  const pending = s.ui < s.updates.length ? s.updates[s.ui] : null;
  if (action === 'mark-r' || action === 'paint' || action === 'mark') {
    if (!pending) return `All ${s.updates.length} update(s) are already pinned.`;
    const [l, r, v] = pending;
    if (action === 'mark-r') return `Slot ${r} is still inside the range ${l}..${r}. A ${minus(v)} pinned at ${r} switches the update off one slot early, so slot ${r} would miss its ${plus(v)}.`;
    return `That is ${r - l + 1} write(s) for one update. The numbers would come out right, but 20,000 updates over 20,000 slots is 400 million writes. Two pins per update, then one sweep, is O(updates + n).`;
  }
  if (action === 'sweep') {
    if (pending) return `Update ${s.ui + 1} (add ${fmt(pending[2])} to ${pending[0]}..${pending[1]}) isn’t pinned yet. Sweeping now would settle slots without it.`;
    return `All ${s.n} slot(s) are settled; the spare slot ${s.n} is never read.`;
  }
  if (pending) return `${s.updates.length - s.ui} update(s) are still unpinned.`;
  return `${s.n - s.out.length} slot(s) are still unsettled.`;
}
function boardApply(s: PrefixState, action: string) {
  if (action === 'mark') {
    const [l, r, v] = s.updates[s.ui];
    s.diff[l] += v;
    s.diff[r + 1] -= v;
    s.ui++;
    s.message = `Pinned ${plus(v)} at slot ${l} and ${minus(v)} at slot ${r + 1}${r + 1 === s.n ? ' (the spare slot past the end)' : ''}. Two writes, whatever the range length.`;
  } else if (action === 'sweep') {
    const i = s.out.length;
    s.carry += s.diff[i];
    s.out.push(s.carry);
    s.message = `Slot ${i}: running total + diff[${i}] = ${fmt(s.carry)}. Every update switched on at or before slot ${i}, and not yet switched off, is included.`;
  } else {
    s.done = true;
    s.message = s.n ? `Final totals: ${s.out.map(fmt).join(', ')}.` : 'No slots.';
  }
}
function boardView(s: PrefixState): LabRow[] {
  return [
    {
      name: 'Notice board diff (n + 1 slots)',
      cells: s.diff.map((v, i) => ({ value: String(v), label: i === s.n ? 'spare' : i === s.out.length && s.ui === s.updates.length && !s.done ? 'SWEEP' : undefined, tone: i === s.n ? 'ghost' : i < s.out.length ? 'done' : undefined })),
    },
    {
      name: 'Settled totals',
      cells: Array.from({ length: s.n }, (_, i) => ({ value: i < s.out.length ? String(s.out[i]) : '·', tone: i < s.out.length ? 'done' : 'ghost' })),
    },
  ];
}
function boardDescribe(s: PrefixState) {
  if (s.ui < s.updates.length) {
    const [l, r, v] = s.updates[s.ui];
    return `Update ${s.ui + 1} of ${s.updates.length}: add ${fmt(v)} to every slot from ${l} to ${r}, inclusive.`;
  }
  if (s.out.length < s.n) return `All updates pinned. Sweep: running total so far = ${fmt(s.carry)}; next slot ${s.out.length}.`;
  return s.done ? `Done: [${s.out.join(', ')}].` : 'Every slot is settled.';
}

export const lab = makeLab<PrefixState>({
  ledger: {
    name: 'Ledger and questions',
    cases: ledgerCases.length,
    actions: [
      { action: 'write', label: 'Write the next ledger line' },
      { action: 'exact', label: 'Answer prefix[r + 1] − prefix[l]' },
      { action: 'short', label: 'Answer prefix[r] − prefix[l]' },
      { action: 'shifted', label: 'Answer prefix[r + 1] − prefix[l + 1]' },
      { action: 'finish', label: 'Close the ledger' },
    ],
    create: v => fromInput({ mode: 'ledger', ...ledgerCases[v] }),
    expected: ledgerExpected,
    apply: ledgerApply,
    reject: ledgerReject,
    view: ledgerView,
    describe: ledgerDescribe,
  },
  vault: {
    name: 'The vault: count runs summing to k',
    cases: vaultCases.length,
    actions: [
      { action: 'seed', label: 'Seed the vault: total 0, once' },
      { action: 'add', label: 'Add the next value to the running total' },
      { action: 'count', label: 'Count vault entries equal to running − k' },
      { action: 'record', label: 'Record the running total in the vault' },
      { action: 'finish', label: 'No values left: report the count' },
    ],
    create: v => fromInput({ mode: 'vault', ...vaultCases[v] }),
    expected: vaultExpected,
    apply: vaultApply,
    reject: vaultReject,
    view: vaultView,
    describe: vaultDescribe,
  },
  board: {
    name: 'The notice board: range updates',
    cases: boardCases.length,
    actions: [
      { action: 'mark', label: 'Pin +v at l and −v at r + 1' },
      { action: 'mark-r', label: 'Pin +v at l and −v at r' },
      { action: 'paint', label: 'Add v to every slot l..r directly' },
      { action: 'sweep', label: 'Carry the running total into the next slot' },
      { action: 'finish', label: 'Every slot is settled' },
    ],
    create: v => fromInput({ mode: 'board', ...boardCases[v] }),
    expected: boardExpected,
    apply: boardApply,
    reject: boardReject,
    view: boardView,
    describe: boardDescribe,
  },
}, 'Gold = active · green = settled · faded = not yet written · positions start at 0');
