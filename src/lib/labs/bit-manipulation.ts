// Math & Bit Manipulation playground, on an 8-bit board (the real rows have 32; every
// move is the same). Fold values so pairs cancel; clear the lowest set bit until the row is
// clear; and reverse a row one bit at a time with the unsigned shift.
import { makeLab, type LabBase, type LabRow } from '../lab.ts';

export const WIDTH = 8;
const FULL = (1 << WIDTH) - 1;
const TOP = 1 << (WIDTH - 1);

type Phase = 'room' | 'take' | 'slide';
export interface BitState extends LabBase {
  // fold mode
  a: number[];
  i: number;
  acc: number;
  // clear mode
  start: number;
  x: number;
  count: number;
  // reverse mode
  n: number;
  rest: number;
  result: number;
  round: number;
  phase: Phase;
}

type Input =
  | { mode: 'fold'; a: number[] }
  | { mode: 'clear'; x: number }
  | { mode: 'reverse'; n: number };

const blank = () => ({
  a: [] as number[], i: 0, acc: 0,
  start: 0, x: 0, count: 0,
  n: 0, rest: 0, result: 0, round: 0, phase: 'room' as Phase,
});

const foldCases = [[4, 1, 2, 1, 2], [7], [6, 0, 6], [12, 5, 9, 5, 12]];
const clearCases = [0b01011000, 0, 0b11111111, 0b10000000];
const reverseCases = [0b10110000, 0b00000001, 0, 0b01101001];

export function fromInput(input: Input) {
  const base = blank();
  if (input.mode === 'fold') return { ...base, a: input.a.map(v => v & FULL) };
  if (input.mode === 'clear') return { ...base, start: input.x & FULL, x: input.x & FULL };
  return { ...base, n: input.n & FULL, rest: input.n & FULL };
}

// ---------- helpers ----------
export const row8 = (v: number) => (v & FULL).toString(2).padStart(WIDTH, '0');
const lowestLit = (v: number) => { for (let p = 0; p < WIDTH; p++) if ((v >> p) & 1) return p; return -1; };
const litCount = (v: number) => { let c = 0; for (let p = 0; p < WIDTH; p++) c += (v >> p) & 1; return c; };
const signedSlide = (v: number) => ((v >> 1) | (v & TOP)) & FULL;     // 8-bit arithmetic shift
export const reverse8 = (v: number) => { let r = 0; for (let k = 0; k < WIDTH; k++) r = ((r << 1) | ((v >> k) & 1)) & FULL; return r; };

function bitRow(name: string, v: number, labels: Record<number, string> = {}, dim = false): LabRow {
  return {
    name,
    cells: Array.from({ length: WIDTH }, (_, c) => {
      const p = WIDTH - 1 - c;                 // column c shows bit p
      const set = ((v >> p) & 1) === 1;
      return { value: set ? '1' : '0', label: labels[p], tone: dim ? 'ghost' : set ? 'hot' : undefined };
    }),
  };
}
const header: LabRow = { name: 'Bit position', cells: Array.from({ length: WIDTH }, (_, c) => ({ value: String(WIDTH - 1 - c), tone: 'ghost' as const })) };

// ---------- fold: Single Number ----------
function foldExpected(s: BitState) { return s.i < s.a.length ? 'fold' : 'finish'; }
function foldReject(s: BitState, action: string) {
  const left = s.a.length - s.i;
  if (left === 0) return `Every value is folded in. acc = ${s.acc} (${row8(s.acc)}) is the value with no partner. Report it.`;
  const v = s.a[s.i];
  if (action === 'finish') return `${left} value(s) are not folded in yet. acc = ${s.acc} still holds the unmatched half of at least one pair.`;
  if (action === 'add') return `${s.acc} + ${v} = ${s.acc + v}. Addition carries, and it never takes anything back out: when ${v}’s partner arrives, the total holds both copies instead of neither. Only XOR makes a pair vanish: ${s.acc} ^ ${v} = ${s.acc ^ v}.`;
  return `${s.acc} | ${v} = ${s.acc | v} (${row8(s.acc | v)}). OR can set a bit but never put one out, so when ${v}’s partner arrives its bits stay set and the pair never cancels.`;
}
function foldApply(s: BitState, action: string) {
  if (action === 'fold') {
    const v = s.a[s.i], before = s.acc;
    s.acc ^= v;
    s.i++;
    const seenBefore = s.a.slice(0, s.i - 1).filter(x => x === v).length;
    s.message = `${before} ^ ${v} = ${s.acc} (${row8(s.acc)}).` + (v === 0 ? ' 0 has no set bits, so acc doesn’t change: x ^ 0 = x.' : seenBefore % 2 === 1 ? ` ${v} met its partner: every bit it had set is flipped back, so the pair has cancelled.` : ` ${v}’s set bits are flipped into acc; if its partner comes, they flip back.`);
  } else {
    s.done = true;
    s.message = `acc = ${s.acc}. Every pair cancelled (x ^ x = 0), and the single survived (x ^ 0 = x). One pass, one number of memory.`;
  }
}
function foldView(s: BitState): LabRow[] {
  const rows: LabRow[] = [{
    name: 'Values', empty: 'No values',
    cells: s.a.map((v, i) => ({ value: String(v), label: i === s.i && !s.done ? 'NEXT' : undefined, tone: i < s.i ? 'done' : i === s.i ? 'hot' : undefined })),
  }, header];
  if (s.i < s.a.length) rows.push(bitRow(`Next value ${s.a[s.i]}`, s.a[s.i], {}, true));
  rows.push(bitRow(`acc = ${s.acc} (running XOR)`, s.acc));
  return rows;
}
function foldDescribe(s: BitState) {
  if (s.done) return `Done: the single is ${s.acc}.`;
  if (s.i < s.a.length) return `Folded ${s.i} of ${s.a.length}. acc = ${s.acc}. Next value: ${s.a[s.i]}.`;
  return `All ${s.a.length} values folded. acc = ${s.acc}.`;
}

// ---------- clear: Number of 1 Bits ----------
function clearExpected(s: BitState) { return s.x !== 0 ? 'clear' : 'finish'; }
function clearReject(s: BitState, action: string) {
  if (s.x === 0) return `Every bit is clear: x = 0. You cleared ${s.count} bit(s). Report the count.`;
  const low = lowestLit(s.x), left = litCount(s.x);
  if (action === 'finish') return `${left} bit(s) are still set (x = ${row8(s.x)}). Stopping now reports ${s.count} instead of ${s.count + left}.`;
  if (action === 'minus') {
    const m = (s.x - 1) & FULL;
    if (low === 0) return `Here bit 0 is the lowest set one, so x − 1 = ${row8(m)} happens to equal x & (x − 1). The habit is still wrong: on 01011000, x − 1 = 01010111 sets three new bits. AND with x is what puts them back out.`;
    return `x − 1 = ${row8(m)}: bit ${low} goes out, but the ${low} clear bit(s) below it all become set. AND with x puts those back out; that is why the move is x & (x − 1).`;
  }
  // isolate
  const iso = s.x & -s.x & FULL;
  if (left === 1) return `x & −x = ${row8(iso)} is x itself: it keeps the lowest set bit instead of putting it out. x would stay the same, and the loop would never end.`;
  return `x & −x = ${row8(iso)} keeps ONLY the lowest set bit. The other ${left - 1} set bit(s) would vanish without being counted.`;
}
function clearApply(s: BitState, action: string) {
  if (action === 'clear') {
    const before = s.x, low = lowestLit(before);
    s.x = before & (before - 1) & FULL;
    s.count++;
    s.message = `${row8(before)} & ${row8((before - 1) & FULL)} = ${row8(s.x)}. Bit ${low} went out and nothing else changed. Count = ${s.count}.`;
  } else {
    s.done = true;
    s.message = s.start === 0 ? 'x was clear from the start: 0 set bits, 0 rounds.' : `${row8(s.start)} has ${s.count} set bit(s): one round per set bit, not one per position.`;
  }
}
function clearView(s: BitState): LabRow[] {
  const low = lowestLit(s.x);
  return [
    header,
    bitRow(`x = ${s.x}`, s.x, low >= 0 && !s.done ? { [low]: 'LOW' } : {}),
    ...(s.x !== 0 ? [bitRow(`x − 1 = ${(s.x - 1) & FULL}`, (s.x - 1) & FULL, {}, true)] : []),
    { name: 'Count', cells: [{ value: String(s.count), tone: s.done ? 'done' : undefined }] },
  ];
}
function clearDescribe(s: BitState) {
  if (s.done) return `Done: ${s.count} set bit(s).`;
  return `x = ${row8(s.x)} · count = ${s.count}${s.x === 0 ? ' · every bit is clear' : ''}`;
}

// ---------- reverse: Reverse Bits ----------
function reverseExpected(s: BitState) { return s.round < WIDTH ? s.phase : 'finish'; }
function reverseReject(s: BitState, action: string) {
  const rounds = WIDTH - s.round;
  if (s.round === WIDTH) return `All ${WIDTH} rounds are done. result = ${row8(s.result)} is the reversed row. Report it.`;
  if (action === 'finish') {
    if (s.rest === 0) return `rest is clear, but only ${s.round} of ${WIDTH} rounds are done. Each remaining round still shifts result left: stopping now returns ${row8(s.result)} = ${s.result} instead of ${row8(reverse8(s.n))} = ${reverse8(s.n)}. Clear bits are part of the row too.`;
    return `${rounds} round(s) are left, and rest still has set bits (${row8(s.rest)}).`;
  }
  const low = s.rest & 1;
  if (s.phase === 'room') {
    if (action === 'take') return 'Make room first. Take before shifting and, after the last round, every bit sits one place too far left: the first bit you took falls off the top.';
    return `rest’s bit 0 (${low}) hasn’t been copied into result yet. Sliding rest now would drop it.`;
  }
  if (s.phase === 'take') {
    if (action === 'room') return `result was already shifted this round. Shifting twice opens a gap, and the row ends up one place too far left.`;
    return `rest’s bit 0 (${low}) hasn’t been copied yet. Sliding now drops it, and result would be missing a bit.`;
  }
  // phase === 'slide'
  if (action === 'room') return `This round’s bit is already copied. Shifting result again opens a gap before the next one arrives.`;
  if (action === 'take') return `You already copied bit 0 of rest (${low}). Taking again copies the same bit twice. Slide rest first.`;
  const plain = s.rest >>> 1, signed = signedSlide(s.rest);
  if (s.rest & TOP) return `rest’s top bit is set. The signed shift copies it back in: rest would become ${row8(signed)} instead of ${row8(plain)}. In this fixed ${WIDTH}-round loop those copies arrive too late to be read, so the answer would survive. But rest would no longer mean “what is left to read”, and any loop that stops when rest is clear would never stop.`;
  return `rest’s top bit is clear, so both shifts give ${row8(plain)} this time. The habit still matters: on a row whose top bit is set, >> copies it in at the top. The unsigned shift >>> always lets a clear bit in.`;
}
function reverseApply(s: BitState, action: string) {
  if (action === 'room') {
    const before = s.result;
    s.result = (s.result << 1) & FULL;
    s.phase = 'take';
    s.message = `Round ${s.round + 1}: result << 1 = ${row8(s.result)} (was ${row8(before)}). Bit 0 of result is free.`;
  } else if (action === 'take') {
    const low = s.rest & 1;
    s.result |= low;
    s.phase = 'slide';
    s.message = `rest & 1 = ${low}: bit ${s.round} of the input goes into result’s bit 0. result = ${row8(s.result)}.`;
  } else if (action === 'slide') {
    s.rest = s.rest >>> 1;
    s.round++;
    s.phase = 'room';
    s.message = `rest >>> 1 = ${row8(s.rest)}: a clear bit enters at the top. ${s.round} of ${WIDTH} rounds done.` + (s.round < WIDTH && s.rest === 0 ? ' rest is clear, but the rounds aren’t finished.' : '');
  } else {
    s.done = true;
    s.message = `${row8(s.n)} reversed is ${row8(s.result)} = ${s.result}. Exactly ${WIDTH} rounds, whatever the input.`;
  }
}
function reverseView(s: BitState): LabRow[] {
  const readNext = s.round < WIDTH && !s.done;
  return [
    header,
    bitRow(`Input n = ${s.n}`, s.n, readNext ? { [s.round]: 'READ' } : {}, true),
    bitRow(`rest = ${s.rest} (still to read)`, s.rest, readNext && s.phase !== 'room' ? { 0: s.phase === 'take' ? 'TAKE' : 'TAKEN' } : {}),
    bitRow(`result = ${s.result}`, s.result, readNext && s.phase === 'slide' ? { 0: 'NEW' } : {}),
    { name: 'Rounds done', cells: [{ value: `${s.round} / ${WIDTH}`, tone: s.round === WIDTH ? 'done' : undefined }] },
  ];
}
function reverseDescribe(s: BitState) {
  if (s.done) return `Done: ${row8(s.n)} → ${row8(s.result)}.`;
  if (s.round === WIDTH) return `${WIDTH} of ${WIDTH} rounds done. result = ${row8(s.result)}.`;
  const next = { room: 'make room in result', take: 'copy rest’s bit 0 into result', slide: 'slide rest one place right' }[s.phase];
  return `Round ${s.round + 1} of ${WIDTH}: ${next}. rest = ${row8(s.rest)}, result = ${row8(s.result)}.`;
}

export const lab = makeLab<BitState>({
  fold: {
    name: 'Fold the pairs (Single Number)',
    cases: foldCases.length,
    actions: [
      { action: 'fold', label: 'acc ^= next value' },
      { action: 'add', label: 'acc += next value' },
      { action: 'or', label: 'acc |= next value' },
      { action: 'finish', label: 'No values left: acc is the single' },
    ],
    create: v => fromInput({ mode: 'fold', a: foldCases[v] }),
    expected: foldExpected,
    apply: foldApply,
    reject: foldReject,
    view: foldView,
    describe: foldDescribe,
  },
  clear: {
    name: 'Put out the lowest bit (Number of 1 Bits)',
    cases: clearCases.length,
    actions: [
      { action: 'clear', label: 'x &= x − 1, count++' },
      { action: 'minus', label: 'x −= 1, count++' },
      { action: 'isolate', label: 'x = x & −x, count++' },
      { action: 'finish', label: 'x is 0: report the count' },
    ],
    create: v => fromInput({ mode: 'clear', x: clearCases[v] }),
    expected: clearExpected,
    apply: clearApply,
    reject: clearReject,
    view: clearView,
    describe: clearDescribe,
  },
  reverse: {
    name: 'Reverse the row (Reverse Bits)',
    cases: reverseCases.length,
    actions: [
      { action: 'room', label: 'result <<= 1 (make room)' },
      { action: 'take', label: 'result |= rest & 1 (copy bit 0)' },
      { action: 'slide', label: 'rest >>>= 1 (unsigned shift)' },
      { action: 'signed', label: 'rest >>= 1 (signed shift)' },
      { action: 'finish', label: 'Stop: report result' },
    ],
    create: v => fromInput({ mode: 'reverse', n: reverseCases[v] }),
    expected: reverseExpected,
    apply: reverseApply,
    reject: reverseReject,
    view: reverseView,
    describe: reverseDescribe,
  },
}, 'An 8-bit board: position 7 on the left, 0 on the right · gold = set · dashed = for reference · green = settled');
