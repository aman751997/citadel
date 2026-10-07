// Hashing & Sets playground: run Two Sum's register (ask for the partner, then file), sort words into
// buckets by their fingerprint (sorted letters), and find the longest run of consecutive numbers by
// walking only from run starts.
import { makeLab, type LabBase, type LabRow } from '../lab.ts';

export interface HashState extends LabBase {
  // two-sum mode
  a: number[];
  target: number;
  i: number;                          // index being handled
  tsPhase: 'ask' | 'file' | 'found';
  register: [number, number][];       // [value, index] in filing order (a later index overwrites, as put does)
  partner: number | null;             // index of the partner once found
  pair: [number, number] | null;      // reported answer
  // group mode
  words: string[];
  w: number;
  key: string | null;                 // fingerprint of words[w], once taken
  buckets: [string, string[]][];      // [fingerprint, words] in creation order
  // streak mode
  nums: number[];
  distinct: number[];                 // the set's contents, in filing order
  d: number;                          // index into distinct
  walking: boolean;
  cur: number;
  len: number;
  best: number;
  lookups: number;
}

type Input =
  | { mode: 'twoSum'; a: number[]; target: number }
  | { mode: 'group'; words: string[] }
  | { mode: 'streak'; nums: number[] };

const blank = () => ({
  a: [] as number[], target: 0, i: 0, tsPhase: 'ask' as const, register: [] as [number, number][], partner: null, pair: null,
  words: [] as string[], w: 0, key: null, buckets: [] as [string, string[]][],
  nums: [] as number[], distinct: [] as number[], d: 0, walking: false, cur: 0, len: 0, best: 0, lookups: 0,
});

const twoSumCases: { a: number[]; target: number }[] = [
  { a: [2, 7, 11, 15], target: 9 },
  { a: [3, 2, 4], target: 6 },
  { a: [3, 3], target: 6 },
  { a: [5], target: 10 },
];
const groupCases: { words: string[] }[] = [
  { words: ['eat', 'tea', 'tan', 'ate', 'nat', 'bat'] },
  { words: ['abc', 'bca', 'xyz', 'cab', 'abc'] },
  { words: ['', 'b', ''] },
  { words: ['a'] },
];
const streakCases: { nums: number[] }[] = [
  { nums: [100, 4, 200, 1, 3, 2] },
  { nums: [0, 3, 7, 2, 5, 8, 4, 6, 0, 1] },
  { nums: [9, 1, -1, 0, 1] },
  { nums: [] },
];

export function fromInput(input: Input) {
  const base = blank();
  if (input.mode === 'twoSum') return { ...base, a: [...input.a], target: input.target };
  if (input.mode === 'group') return { ...base, words: [...input.words] };
  const distinct: number[] = [];
  for (const x of input.nums) if (!distinct.includes(x)) distinct.push(x);
  return { ...base, nums: [...input.nums], distinct };
}

const fmt = (x: number) => (x < 0 ? `−${-x}` : String(x));
const minus = (x: number, y: number) => `${fmt(x)} − ${y < 0 ? `(${fmt(y)})` : fmt(y)}`;
const q = (word: string) => `“${word}”`;
export const fingerprint = (word: string) => [...word].sort().join('');

// ---------- two sum ----------
const onFile = (s: HashState, value: number) => s.register.find(([v]) => v === value)?.[1] ?? null;
function tsExpected(s: HashState) {
  if (s.i >= s.a.length) return 'none';
  if (s.tsPhase === 'found') return 'report';
  return s.tsPhase;
}
function tsReject(s: HashState, action: string) {
  if (s.i >= s.a.length) return `Every value has been read and no partner was ever on file. Report that there is no pair.`;
  const x = s.a[s.i], need = s.target - x, left = s.a.length - s.i;
  if (s.tsPhase === 'ask') {
    if (action === 'file') {
      if (need === x) return `File first and ${fmt(x)} answers its own question: ${minus(s.target, x)} = ${fmt(x)} would now be on file at index ${s.i}, so you would report [${s.i}, ${s.i}] — one value used twice. Ask first, then file.`;
      return `Filing first is harmless here only because ${minus(s.target, x)} = ${fmt(need)} is not ${fmt(x)}. When target − x = x (say [3, 2, 4] with target 6), x finds itself and you report [0, 0]. Ask first, always.`;
    }
    if (action === 'report') return `Nothing has been looked up for x = ${fmt(x)} yet. Ask the register for ${fmt(need)} first.`;
    return `${left} value(s) are still unread, starting with ${fmt(x)}.`;
  }
  if (s.tsPhase === 'file') {
    if (action === 'ask') return `You already asked for ${fmt(need)}: not on file. Asking again changes nothing. File ${fmt(x)} so later values can find it.`;
    if (action === 'report') return `${fmt(need)} is not on file, so ${fmt(x)} has no partner yet.`;
    return `${fmt(x)} hasn’t been filed${left > 1 ? `, and ${left - 1} more value(s) are unread` : ''}. The code files every value it reads before moving on.`;
  }
  // found
  if (action === 'file') return `${fmt(need)} is on file at index ${s.partner}: the pair is found. Filing ${fmt(x)} now is wasted work.`;
  if (action === 'ask') return `You already asked, and ${fmt(need)} is on file at index ${s.partner}. Report the pair.`;
  return `A pair is on the board: index ${s.partner} and index ${s.i}. Report it.`;
}
function tsApply(s: HashState, action: string) {
  const x = s.a[s.i];
  if (action === 'ask') {
    const need = s.target - x, j = onFile(s, need);
    if (j !== null) {
      s.partner = j;
      s.tsPhase = 'found';
      s.message = `Asked for ${minus(s.target, x)} = ${fmt(need)}: on file at index ${j}. A pair, and index ${j} is earlier than ${s.i}, so it can’t be x itself.`;
    } else {
      s.tsPhase = 'file';
      s.message = `Asked for ${minus(s.target, x)} = ${fmt(need)}: not on file. No earlier value completes ${fmt(x)}.`;
    }
  } else if (action === 'file') {
    const entry = s.register.find(([v]) => v === x);
    if (entry) entry[1] = s.i; else s.register.push([x, s.i]);
    s.message = `Filed ${fmt(x)} → ${s.i}${entry ? ' (replacing an earlier index; either one is a valid partner)' : ''}. Later values can now find it.`;
    s.i++;
    s.tsPhase = 'ask';
  } else if (action === 'report') {
    s.pair = [s.partner!, s.i];
    s.done = true;
    s.message = `[${s.partner}, ${s.i}]: ${fmt(s.a[s.partner!])} + ${x < 0 ? `(${fmt(x)})` : fmt(x)} = ${fmt(s.target)}. One pass, one lookup per value.`;
  } else {
    s.done = true;
    s.message = s.a.length ? `No two different positions add up to ${fmt(s.target)}.` : 'No values, so no pair.';
  }
}
function tsView(s: HashState): LabRow[] {
  const need = s.i < s.a.length ? s.target - s.a[s.i] : null;
  return [
    {
      name: 'Values', empty: 'No values',
      cells: s.a.map((v, i) => ({
        value: String(v),
        label: i === s.partner ? 'PARTNER' : i === s.i && !s.done ? 'x' : undefined,
        tone: i === s.i && !s.done ? 'hot' : i === s.partner ? 'hot' : i < s.i ? 'done' : undefined,
      })),
    },
    {
      name: 'Register (value → index)', empty: 'Nothing on file',
      cells: s.register.map(([v, i]) => ({ value: `${v} → ${i}`, tone: s.tsPhase !== 'file' && need !== null && v === need ? 'hot' : undefined })),
    },
  ];
}
function tsDescribe(s: HashState) {
  if (s.done) return s.pair ? `Pair reported: [${s.pair.join(', ')}].` : 'No pair.';
  if (s.i >= s.a.length) return `target = ${fmt(s.target)} · every value read · no partner found.`;
  const x = s.a[s.i];
  return `target = ${fmt(s.target)} · x = ${fmt(x)} at index ${s.i} · partner needed: ${minus(s.target, x)} = ${fmt(s.target - x)}`;
}

// ---------- group by fingerprint ----------
const show = (word: string) => (word === '' ? '(empty)' : word);
function grExpected(s: HashState) {
  if (s.w >= s.words.length) return 'finish';
  return s.key === null ? 'sign' : 'drop';
}
function grReject(s: HashState, action: string) {
  if (s.w >= s.words.length) return 'Every word is in a bucket. Hand the buckets over.';
  const word = s.words[s.w], key = fingerprint(word);
  if (action === 'spelling') {
    const partners = [...new Set(s.words.filter(other => other !== word && fingerprint(other) === key))];
    if (partners.length) return `Keyed by its spelling, ${q(show(word))} gets a bucket of its own and never meets ${partners.map(p => q(p)).join(' or ')}. Anagrams are spelled differently; only the fingerprint ${q(show(key))} is shared.`;
    return `Keyed by its spelling, ${q(show(word))} could only ever meet the same spelling. No anagram of it is on the board, so you’d get lucky here — but the first rearrangement to arrive would be split off.`;
  }
  if (action === 'finish') return `${s.words.length - s.w} word(s) are not in a bucket yet.`;
  if (action === 'drop') return `Which bucket? ${q(show(word))} has no fingerprint yet. Take it first.`;
  return `${q(show(word))} already has its fingerprint ${q(show(s.key!))}. Drop it in.`;
}
function grApply(s: HashState, action: string) {
  if (action === 'finish') {
    s.done = true;
    s.message = s.buckets.length ? `${s.buckets.length} group(s): ${s.buckets.map(([, ws]) => `[${ws.map(show).join(', ')}]`).join(' ')}.` : 'No words, no groups.';
    return;
  }
  const word = s.words[s.w];
  if (action === 'sign') {
    s.key = fingerprint(word);
    s.message = `${q(show(word))} → fingerprint ${q(show(s.key))}: the same letters in alphabetical order. Every rearrangement of it gets this exact key.`;
    return;
  }
  const bucket = s.buckets.find(([k]) => k === s.key);
  if (bucket) bucket[1].push(word); else s.buckets.push([s.key!, [word]]);
  s.message = bucket ? `${q(show(word))} joins the ${q(show(s.key!))} bucket, which now holds ${bucket[1].length} word(s).` : `No bucket for ${q(show(s.key!))} yet: computeIfAbsent makes one, and ${q(show(word))} goes in.`;
  s.key = null;
  s.w++;
}
function grView(s: HashState): LabRow[] {
  return [
    {
      name: 'Words', empty: 'No words',
      cells: s.words.map((word, i) => ({ value: show(word), label: i === s.w && !s.done ? (s.key === null ? 'NEXT' : s.key === '' ? 'key: (empty)' : `key: ${s.key}`) : undefined, tone: i < s.w ? 'done' : i === s.w ? 'hot' : undefined })),
    },
    {
      name: 'Buckets (fingerprint: words)', empty: 'No buckets yet',
      cells: s.buckets.map(([k, ws]) => ({ value: ws.map(show).join(' · '), label: k === '' ? 'key (empty)' : `key ${k}`, tone: s.key !== null && k === s.key ? 'hot' : undefined })),
    },
  ];
}
function grDescribe(s: HashState) {
  if (s.done) return `${s.buckets.length} group(s).`;
  if (s.w >= s.words.length) return 'Every word is filed.';
  const word = s.words[s.w];
  return `Word ${s.w + 1} of ${s.words.length}: ${q(show(word))}${s.key === null ? '' : ` · fingerprint ${q(show(s.key))}`} · ${s.buckets.length} bucket(s) so far`;
}

// ---------- longest consecutive ----------
function runFrom(s: HashState, x: number) { let L = 0; while (s.distinct.includes(x + L)) L++; return L; }
function stExpected(s: HashState) {
  if (s.d >= s.distinct.length) return 'finish';
  if (!s.walking) return s.distinct.includes(s.distinct[s.d] - 1) ? 'skip' : 'start';
  return s.distinct.includes(s.cur + 1) ? 'extend' : 'close';
}
function stReject(s: HashState, action: string) {
  const m = s.distinct.length;
  if (s.d >= m) return `Every number has been judged. Report the longest run: ${s.best}.`;
  const x = s.distinct[s.d];
  if (!s.walking) {
    if (action === 'start') return `${fmt(x - 1)} is in the set, so ${fmt(x)} isn’t the first number of its run. Walking from here repeats steps the run’s real start will take anyway — on a run of length L, walking from every number costs about L²/2 lookups.`;
    if (action === 'skip') return `${fmt(x - 1)} is not in the set, so ${fmt(x)} is the first number of its run. Skip it and nobody ever walks this run: a run of length ${runFrom(s, x)} would be lost.`;
    if (action === 'finish') return `${m - s.d} number(s) haven’t been judged yet.`;
    return `First decide whether ${fmt(x)} starts a run: is ${fmt(x - 1)} in the set?`;
  }
  if (action === 'extend') return `${fmt(s.cur + 1)} is not in the set. The run stops at ${fmt(s.cur)}.`;
  if (action === 'close') return `${fmt(s.cur + 1)} is in the set: the run keeps going. Closing now would record ${s.len} instead of the real length.`;
  return `Finish walking the run that starts at ${fmt(x)} first.`;
}
function stApply(s: HashState, action: string) {
  const x = s.distinct[s.d];
  if (action === 'finish') {
    s.done = true;
    s.message = s.distinct.length ? `Longest run: ${s.best}. ${s.lookups} lookups for ${s.distinct.length} distinct numbers — exactly two each.` : 'No numbers, so the longest run is 0.';
    return;
  }
  s.lookups++;
  if (action === 'skip') {
    s.d++;
    s.message = `${fmt(x - 1)} is in the set, so ${fmt(x)} is mid-run. Its run’s start will walk past it.`;
  } else if (action === 'start') {
    s.walking = true; s.cur = x; s.len = 1;
    s.message = `${fmt(x - 1)} is absent: ${fmt(x)} starts a run. Walk upward.`;
  } else if (action === 'extend') {
    s.cur++; s.len++;
    s.message = `${fmt(s.cur)} is in the set: run length ${s.len}.`;
  } else {
    s.best = Math.max(s.best, s.len);
    s.message = `${fmt(s.cur + 1)} is absent, so the run ${fmt(x)}..${fmt(s.cur)} ends with length ${s.len} = ${fmt(s.cur)} − ${x < 0 ? `(${fmt(x)})` : fmt(x)} + 1. Best so far: ${s.best}.`;
    s.walking = false;
    s.d++;
  }
}
function stView(s: HashState): LabRow[] {
  const x = s.d < s.distinct.length ? s.distinct[s.d] : null;
  const inRun = (v: number) => s.walking && x !== null && v >= x && v <= s.cur;
  return [
    { name: 'Input (duplicates allowed)', empty: 'No numbers', cells: s.nums.map(v => ({ value: String(v) })) },
    {
      name: 'Set (filing order)', empty: 'The set is empty',
      cells: s.distinct.map((v, i) => ({
        value: String(v),
        label: i === s.d && !s.done ? (s.walking ? 'START' : 'x') : inRun(v) && v === s.cur ? 'cur' : undefined,
        tone: inRun(v) || (i === s.d && !s.done) ? 'hot' : i < s.d ? 'done' : undefined,
      })),
    },
  ];
}
function stDescribe(s: HashState) {
  const bound = 2 * s.distinct.length;
  if (s.done || s.d >= s.distinct.length) return `Longest run = ${s.best} · lookups = ${s.lookups} of ${bound} (two per distinct number)`;
  const x = s.distinct[s.d];
  if (s.walking) return `Walking from ${fmt(x)} · cur = ${fmt(s.cur)} · length = ${s.len} · is ${fmt(s.cur + 1)} present? · best = ${s.best} · lookups = ${s.lookups}`;
  return `x = ${fmt(x)} · is ${fmt(x - 1)} in the set? · best = ${s.best} · lookups = ${s.lookups} of ${bound}`;
}

export const lab = makeLab<HashState>({
  twoSum: {
    name: 'Two Sum: the register',
    cases: twoSumCases.length,
    actions: [
      { action: 'ask', label: 'Ask: is target − x on file?' },
      { action: 'file', label: 'File x → its index' },
      { action: 'report', label: 'Report the pair' },
      { action: 'none', label: 'Every value read: report no pair' },
    ],
    create: v => fromInput({ mode: 'twoSum', ...twoSumCases[v] }),
    expected: tsExpected,
    apply: tsApply,
    reject: tsReject,
    view: tsView,
    describe: tsDescribe,
  },
  group: {
    name: 'The fingerprint drawer: group anagrams',
    cases: groupCases.length,
    actions: [
      { action: 'sign', label: 'Take its fingerprint: sort its letters' },
      { action: 'drop', label: 'Drop it in the fingerprint’s bucket' },
      { action: 'spelling', label: 'Drop it in the bucket for its spelling' },
      { action: 'finish', label: 'Every word filed: hand over the buckets' },
    ],
    create: v => fromInput({ mode: 'group', ...groupCases[v] }),
    expected: grExpected,
    apply: grApply,
    reject: grReject,
    view: grView,
    describe: grDescribe,
  },
  streak: {
    name: 'House numbers: longest consecutive run',
    cases: streakCases.length,
    actions: [
      { action: 'start', label: 'x − 1 is absent: x starts a run, walk it' },
      { action: 'skip', label: 'x − 1 is present: skip x' },
      { action: 'extend', label: 'cur + 1 is present: extend the run' },
      { action: 'close', label: 'cur + 1 is absent: record the run' },
      { action: 'finish', label: 'Every number judged: report the longest' },
    ],
    create: v => fromInput({ mode: 'streak', ...streakCases[v] }),
    expected: stExpected,
    apply: stApply,
    reject: stReject,
    view: stView,
    describe: stDescribe,
  },
}, 'Gold = active · green = settled · positions start at 0');
