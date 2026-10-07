// Binary Search playground: you play Mid, ask the Oracle, and move Lo or Hi yourself.
// Three modes share the ONE template (while lo < hi; yes → hi = mid; no → lo = mid + 1):
//   boundary: first index with nums[i] >= target (hi starts at n, the "nowhere" slot)
//   rotated:  minimum of a rotated sorted array (compare nums[mid] with nums[hi])
//   answer:   Koko's slowest safe eating speed (search the speeds, not the piles)
import { makeLab, type LabBase, type LabRow } from '../lab.ts';

export type Mode = 'boundary' | 'rotated' | 'answer';
export interface S extends LabBase {
  a: number[];      // boundary: sorted values · rotated: rotated values · answer: piles
  target: number;   // boundary: target · answer: hours allowed (h) · rotated: unused (0)
  lo: number;
  hi: number;
}

export const cases: Record<Mode, { a: number[]; target: number }[]> = {
  boundary: [
    { a: [1, 3, 5, 7, 9, 11], target: 7 },
    { a: [2, 2, 2, 4, 4], target: 2 },       // duplicates: the FIRST copy
    { a: [1, 3, 5], target: 9 },             // no yes at all: lo parks at n
    { a: [], target: 4 },                    // empty: lo == hi == 0 at once
  ],
  rotated: [
    { a: [4, 5, 6, 7, 0, 1, 2], target: 0 },
    { a: [1, 2, 3, 4, 5], target: 0 },       // not rotated: the trap for nums[lo] comparisons
    { a: [3, 1, 2], target: 0 },
    { a: [9], target: 0 },                   // a single value
  ],
  answer: [
    { a: [3, 6, 7, 11], target: 8 },
    { a: [2, 9, 4, 7], target: 6 },
    { a: [4, 4, 4], target: 3 },             // h == number of piles: the biggest pile wins
    { a: [9], target: 9 },                   // plenty of time: speed 1
  ],
};

export const hoursAt = (piles: number[], k: number) => piles.reduce((sum, p) => sum + Math.ceil(p / k), 0);
const midOf = (s: S) => s.lo + Math.floor((s.hi - s.lo) / 2);
const list = (values: number[]) => `[${values.join(', ')}]`;

// Initial state for any input (exported for random tests).
export function fromInput(mode: Mode, input: { a: number[]; target: number }): Omit<S, 'mode' | 'done' | 'moves' | 'message'> {
  const a = [...input.a];
  if (mode === 'boundary') return { a, target: input.target, lo: 0, hi: a.length };
  if (mode === 'rotated') return { a, target: 0, lo: 0, hi: a.length - 1 };
  return { a, target: input.target, lo: 1, hi: Math.max(...a) };
}

// The Oracle's answer at mid, in each mode: true means "keep mid, hi = mid".
function oracle(s: S, mid: number): boolean {
  if (s.mode === 'boundary') return s.a[mid] >= s.target;
  if (s.mode === 'rotated') return s.a[mid] <= s.a[s.hi];
  return hoursAt(s.a, mid) <= s.target;
}

function finishMessage(s: S): string {
  if (s.mode === 'boundary') {
    const n = s.a.length;
    if (s.lo === n) return n === 0 ? `lo == hi == 0 on an empty array: the first yes is "nowhere", so ${s.target} is absent (it would be inserted at 0).` : `lo == hi == ${n} = n: no value is ≥ ${s.target}. It is absent; it would be inserted at the end.`;
    return s.a[s.lo] === s.target
      ? `lo == hi == ${s.lo}: the first index with nums[i] ≥ ${s.target}. nums[${s.lo}] == ${s.target}, so it is found here — the first copy.`
      : `lo == hi == ${s.lo}: the first index with nums[i] ≥ ${s.target}, but nums[${s.lo}] = ${s.a[s.lo]}. ${s.target} is absent; ${s.lo} is where it would be inserted.`;
  }
  if (s.mode === 'rotated') return `lo == hi == ${s.lo}: the minimum is nums[${s.lo}] = ${s.a[s.lo]}.`;
  return `lo == hi == ${s.lo}: speed ${s.lo} needs ${hoursAt(s.a, s.lo)} ≤ ${s.target} hours${s.lo > 1 ? `, and speed ${s.lo - 1} needs ${hoursAt(s.a, s.lo - 1)}` : ''}. The slowest safe speed is ${s.lo}.`;
}

function describeMid(s: S): string {
  const mid = midOf(s);
  if (s.mode === 'boundary') return `target = ${s.target} · lo = ${s.lo}, hi = ${s.hi}, mid = ${mid} → nums[${mid}] = ${s.a[mid]}. Is nums[mid] ≥ ${s.target}?`;
  if (s.mode === 'rotated') return `lo = ${s.lo}, hi = ${s.hi}, mid = ${mid} → nums[mid] = ${s.a[mid]}, nums[hi] = ${s.a[s.hi]}.`;
  const per = s.a.map(p => Math.ceil(p / mid));
  return `h = ${s.target} · lo = ${s.lo}, hi = ${s.hi}, mid = ${mid}: at speed ${mid} the piles take ${per.join(' + ')} = ${hoursAt(s.a, mid)} hours.`;
}

function rejectFor(s: S, action: string): string {
  if (s.lo === s.hi) {
    const what = s.mode === 'rotated' ? 'everything before it is in the higher run, so it is the minimum'
      : s.mode === 'answer' ? 'every slower speed is proven too slow, and it is proven to work'
      : `every index below it is a proven no, and it is the first yes${s.lo === s.a.length ? ' (here, the "nowhere" slot n)' : ''}`;
    return `lo and hi both stand on ${s.mode === 'answer' ? 'speed' : 'index'} ${s.lo}. Nothing is left to ask: ${what}. Finish.`;
  }
  if (action === 'done') return `Not yet: lo = ${s.lo} and hi = ${s.hi} are still apart, so the answer could be any of ${s.mode === 'answer' ? 'speeds' : 'indexes'} ${s.lo}–${s.hi}. The loop runs while lo < hi.`;
  const mid = midOf(s), truth = oracle(s, mid);
  if (action === 'no' && truth) {
    if (s.mode === 'boundary') return `${s.a[mid]} ≥ ${s.target} is TRUE. lo = mid + 1 would throw index ${mid} away, and it might be the first yes. Keep it: hi = mid.`;
    if (s.mode === 'rotated') return `${s.a[mid]} ≤ ${s.a[s.hi]}: mid is in the minimum’s run and might BE the minimum. lo = mid + 1 would skip it. Keep it: hi = mid.`;
    return `Speed ${mid} needs ${hoursAt(s.a, mid)} ≤ ${s.target} hours: it works. lo = mid + 1 would throw away a working speed. Keep it: hi = mid.`;
  }
  if (s.mode === 'boundary') return `${s.a[mid]} ≥ ${s.target} is FALSE. hi = mid would keep a proven no as the answer. Every index up to ${mid} is a no, so lo jumps to ${mid + 1}.`;
  if (s.mode === 'rotated') return `${s.a[mid]} > ${s.a[s.hi]}: mid sits in the higher run, before the drop, so the minimum is strictly to its right. hi = mid would keep the wrong side. lo = mid + 1.`;
  return `Speed ${mid} needs ${hoursAt(s.a, mid)} > ${s.target} hours: too slow, and so is every slower speed. hi = mid would keep a failing speed. lo = mid + 1.`;
}

function applyMove(s: S, action: string) {
  if (action === 'done') { s.done = true; s.message = finishMessage(s); return; }
  const mid = midOf(s);
  if (action === 'yes') {
    s.hi = mid;
    s.message = s.mode === 'boundary' ? `Yes: hi = ${mid}. Index ${mid} stays as a candidate; everything after it is settled.`
      : s.mode === 'rotated' ? `hi = ${mid}. The minimum is somewhere in [${s.lo}, ${mid}].`
      : `Speed ${mid} works: hi = ${mid}. Maybe a slower one works too.`;
  } else {
    s.lo = mid + 1;
    s.message = s.mode === 'boundary' ? `No: lo = ${mid + 1}. Index ${mid} and everything before it are proven no.`
      : s.mode === 'rotated' ? `lo = ${mid + 1}. Everything up to ${mid} is in the higher run.`
      : `Speed ${mid} is too slow: lo = ${mid + 1}. So is every speed below it.`;
  }
}

const proven = (i: number, s: S) => (i < s.lo ? 'F' : i >= s.hi ? 'T' : '?');
function pointerLabels(i: number, s: S): string | undefined {
  const labels: string[] = [];
  if (i === s.lo) labels.push('LO');
  if (!s.done && s.lo < s.hi && i === midOf(s)) labels.push('MID');
  if (i === s.hi) labels.push('HI');
  return labels.join(' / ') || undefined;
}

function view(s: S): LabRow[] {
  if (s.mode === 'answer') {
    const speeds = Array.from({ length: Math.max(...s.a) }, (_, i) => i + 1);
    return [
      { name: `piles (h = ${s.target} hours)`, cells: s.a.map(p => ({ value: String(p) })) },
      { name: 'speed k', cells: speeds.map(k => ({ value: String(k), label: pointerLabels(k, s), tone: k === midOf(s) && !s.done && s.lo < s.hi ? 'hot' : k < s.lo ? 'out' : k >= s.hi ? 'done' : undefined })) },
      { name: 'finishes in h? (proven so far)', cells: speeds.map(k => ({ value: proven(k, s), tone: k < s.lo ? 'out' : k >= s.hi ? 'done' : undefined })) },
    ];
  }
  const n = s.a.length;
  const tone = (i: number) => (i === midOf(s) && !s.done && s.lo < s.hi ? 'hot' : i < s.lo ? 'out' : i >= s.hi ? 'done' : undefined) as 'hot' | 'out' | 'done' | undefined;
  const values = s.a.map((v, i) => ({ value: String(v), label: pointerLabels(i, s), tone: tone(i) }));
  const answers = s.a.map((_, i) => ({ value: proven(i, s), tone: tone(i) === 'hot' ? undefined : tone(i) }));
  if (s.mode === 'boundary') {
    // The virtual slot n: where hi starts, and where "not found" parks.
    values.push({ value: '·', label: pointerLabels(n, s) ? `${pointerLabels(n, s)} (n)` : 'n', tone: 'ghost' });
    answers.push({ value: 'T', tone: 'ghost' });
    return [
      { name: 'nums (· is the "nowhere" slot n)', cells: values, empty: 'Empty array' },
      { name: `nums[i] ≥ ${s.target}? (proven so far)`, cells: answers },
    ];
  }
  return [
    { name: 'nums', cells: values, empty: 'Empty array' },
    { name: 'in the minimum’s run? (proven so far)', cells: answers },
  ];
}

const yesNoDone = (yes: string, no: string, done: string) => [{ action: 'yes', label: yes }, { action: 'no', label: no }, { action: 'done', label: done }];

function mode(m: Mode, name: string, labels: [string, string, string]) {
  return {
    name,
    cases: cases[m].length,
    actions: yesNoDone(...labels),
    create: (v: number) => fromInput(m, cases[m][v]),
    expected: (s: S) => (s.lo >= s.hi ? 'done' : oracle(s, midOf(s)) ? 'yes' : 'no'),
    apply: (s: S, action: string) => applyMove(s, action),
    reject: (s: S, action: string) => rejectFor(s, action),
    view,
    describe: (s: S) => (s.done ? finishMessage(s) : s.lo >= s.hi ? `lo = hi = ${s.lo}. ${s.mode === 'boundary' ? `Every index below ${s.lo} answered no.` : s.mode === 'rotated' ? 'One candidate is left.' : `Every speed below ${s.lo} is too slow.`}` : describeMid(s)),
  };
}

export const lab = makeLab<S>({
  boundary: mode('boundary', 'Boundary: first nums[i] ≥ target', ['true → hi = mid', 'false → lo = mid + 1', 'lo == hi: answer']),
  rotated: mode('rotated', 'Rotated: find the minimum', ['nums[mid] ≤ nums[hi] → hi = mid', 'nums[mid] > nums[hi] → lo = mid + 1', 'lo == hi: minimum found']),
  answer: mode('answer', 'Search the answer: Koko’s speed', ['finishes in time → hi = mid', 'too slow → lo = mid + 1', 'lo == hi: slowest safe speed']),
}, 'Gold = Mid, asking the Oracle · green = proven yes (from Hi up) · faded = proven no (below Lo)');
