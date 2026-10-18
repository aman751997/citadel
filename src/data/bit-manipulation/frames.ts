// Dry-run frames for every problem in src/dsa-lessons/bit-manipulation.mdx. Numbers are drawn as rows of bits
// (a grid: one row per number, one column per bit position). All arithmetic uses JavaScript's 32-bit bitwise
// operators, which behave exactly like Java's int (>> copies the sign bit, >>> shifts in zeros, shift counts
// are taken mod 32). Each generator ends with a text view holding `answer`, pinned in
// tests/bit-manipulation-frames.test.ts against independent oracles.
import { recorder, tvars, type Frame, type View, type CellTone, type Predict } from '../../lib/dryrun.ts';

const I = (x: number) => x | 0;
const bit = (x: number, p: number) => (x >>> p) & 1;
const J = (x: unknown) => JSON.stringify(x);
const widthFor = (...vs: number[]) => (vs.some(v => v < 0 || v > 0xffff) ? 32 : vs.some(v => v > 0xff) ? 16 : 8);
const ctz = (x: number) => { let t = 0; while (t < 32 && bit(x, t) === 0) t++; return t; };
const range = (from: number, to: number) => (to < from ? [] : Array.from({ length: to - from + 1 }, (_, i) => from + i));
const binStr = (x: number, w: number) => range(0, w - 1).map(p => bit(x, w - 1 - p)).join('');

interface BitRow { label: string; v: number; hot?: number[]; tone?: CellTone }

// One row per number, bit w-1 on the left, bit 0 on the right. `hot` lists the bit positions to highlight.
function bitGrid(rows: BitRow[], w: number, name?: string): View {
  const tones: { r: number; c: number; tone: CellTone }[] = [];
  rows.forEach((r, ri) => (r.hot || []).forEach(p => tones.push({ r: ri, c: w - 1 - p, tone: r.tone ?? 'active' })));
  return {
    kind: 'grid', ...(name ? { name } : {}),
    cells: rows.map(r => range(0, w - 1).map(c => bit(r.v, w - 1 - c))),
    rowLabels: rows.map(r => `${r.label} = ${r.v}`),
    colLabels: range(0, w - 1).map(c => w - 1 - c),
    tones,
  };
}

const widthNote = (w: number) => (w === 32 ? ' (all 32 bits)' : ` (low ${w} bits shown)`);

// Multiple choice with unique options and the right one rotated by `salt`. Returns undefined when the choices collide.
function mc(question: string, right: number | string, wrong: (number | string)[], explain: string, salt = 0): Predict | undefined {
  const list = [...new Set([right, ...wrong].map(String))];
  if (list.length < 2) return undefined;
  const shift = ((salt % list.length) + list.length) % list.length;
  const options = list.map((_, k) => list[(k + list.length - shift) % list.length]);
  return { question, options, answer: options.indexOf(String(right)), explain };
}
const yn = (question: string, yes: boolean, explain: string, a = 'Yes', b = 'No'): Predict => ({ question, options: [a, b], answer: yes ? 0 : 1, explain });
const fmt = (v: number, w: number) => `${binStr(v, w)} (${v})`;

// ---- Chapter 1: two's complement -----------------------------------------------------------------------------
// answer = -x as a Java int.
export function negateFrames(x: number): Frame[] {
  const r = recorder(), w = 32, n = I(~x), neg = I(n + 1);
  const t = ctz(x);                       // ~x ends in t ones (all 32 when x is 0); adding 1 flips bits 0..t
  const flipped = range(0, Math.min(t, 31));
  r.frame(`x = ${x} as 32 bits. In a Java int bit 31 is worth −2³¹ and every other bit keeps its usual positive worth.`,
    [bitGrid([{ label: 'x', v: x, hot: [31], tone: 'compared' }], w), tvars({ x })]);
  r.frame(`Flip every bit to get ~x. Each column of x and ~x holds exactly one 1, so x + ~x is all 32 bits set, which is −1. Rearranged: ~x = −x − 1.`,
    [bitGrid([{ label: 'x', v: x }, { label: '~x', v: n, hot: range(0, 31).filter(p => bit(x, p) !== bit(n, p)), tone: 'swapped' }], w), tvars({ x, '~x': n })],
    mc(`x = ${x}. What is ~x?`, n, [-x, x + 1, x - 1], `Flipping every bit gives −x − 1 = ${n}.`, 1));
  r.frame(x === 0
    ? `Add 1 to ~x. It is all ones, so the carry runs through all 32 columns and falls off the top: the result is 0. Zero is its own negation.`
    : `Add 1 to ~x. It ends in ${t} one${t === 1 ? '' : 's'}, so the carry ripples through bits 0 to ${t - 1} (they become 0) and stops at bit ${t}, which becomes 1.${t === 31 ? ' That is the sign bit: the carry lands on it and −x is the same pattern as x.' : ''} Bits above ${t} are untouched.`,
    [bitGrid([{ label: '~x', v: n }, { label: '1', v: 1 }, { label: '~x + 1', v: neg, hot: flipped, tone: 'swapped' }], w), tvars({ '−x': neg })],
    mc(`Which bit does the carry stop at when you add 1 to ~${x}?`, x === 0 ? 'It falls off the top' : `bit ${t}`, x === 0 ? ['bit 0', 'bit 31'] : ['bit 0', `bit ${t + 1}`, 'It falls off the top'], 'The carry stops at the first 0 of ~x, the position of the lowest 1 of x.', 2));
  const carryOut = (BigInt(x >>> 0) + BigInt(neg >>> 0)) >> 32n;
  r.frame(`Check: x + (−x) in 32 columns. Every column carries into the next, the final carry goes past bit 31 and is dropped, and the row is all zeros.${x === -2147483648 ? ' For MIN_VALUE, −x is MIN_VALUE again: there is no +2³¹ in an int.' : ''}`,
    [bitGrid([{ label: 'x', v: x }, { label: '−x', v: neg }, { label: 'x + (−x)', v: I(x + neg) }], w), tvars({ dropped_carry: Number(carryOut), answer: neg })]);
  return r.frames;
}

// ---- Chapter 2: shifts ---------------------------------------------------------------------------------------
// answer = [x >> k, x >>> k, x << k] as Java ints.
export function shiftFrames(x: number, k: number): Frame[] {
  const r = recorder(), w = 32;
  const sar = I(x >> k), shr = I(x >>> k), shl = I(x << k);
  const top = k === 0 ? [] : range(32 - k, 31);
  r.frame(`x = ${x}. Slide it by k = ${k} places. Java has three shifts; they differ only in which bits enter and which leave.`,
    [bitGrid([{ label: 'x', v: x, hot: [31], tone: 'compared' }], w), tvars({ x, k })]);
  r.frame(`x >> ${k} (arithmetic): bits move right, and ${k} copies of the sign bit (${bit(x, 31)}) enter at the top. The sign is kept, and the value is floor(x / 2^${k}) = ${sar}.`,
    [bitGrid([{ label: 'x', v: x }, { label: `x >> ${k}`, v: sar, hot: top, tone: 'swapped' }], w), tvars({ 'x >> k': sar })],
    mc(`x = ${x}. What enters at the top for x >> ${k}?`, bit(x, 31) ? 'copies of 1 (the sign)' : 'zeros (the sign is 0)', [bit(x, 31) ? 'zeros' : 'copies of 1'], 'The arithmetic shift copies the sign bit so negatives stay negative.'));
  r.frame(`x >>> ${k} (logical): the same slide, but zeros always enter. The row is read as unsigned, so ${x < 0 && k > 0 ? 'a negative x becomes a large positive number' : 'for a non-negative x it matches >>'}: ${shr}.${k === 0 ? ' With k = 0 nothing moves, so the result is x itself.' : ''}`,
    [bitGrid([{ label: 'x', v: x }, { label: `x >>> ${k}`, v: shr, hot: top, tone: 'out' }], w), tvars({ 'x >>> k': shr })],
    mc(`Same x, shifted with >>> ${k}. What is the result?`, shr, [sar, shl, I(shr + 1)], 'Zeros enter at the top instead of copies of the sign.', 1));
  r.frame(`x << ${k}: bits move left, zeros enter at the bottom, and the top ${k} bits fall off. That is x * 2^${k} wrapped to 32 bits: ${shl}.`,
    [bitGrid([{ label: 'x', v: x }, { label: `x << ${k}`, v: shl, hot: k === 0 ? [] : range(0, k - 1), tone: 'out' }], w), tvars({ 'x << k': shl, answer: J([sar, shr, shl]) })]);
  return r.frames;
}

// ---- Chapter 2: lowest set bit -------------------------------------------------------------------------------
// answer = [x & (x - 1), x & -x].
export function lowestBitFrames(x: number): Frame[] {
  const r = recorder(), w = widthFor(x), t = x === 0 ? -1 : ctz(x);
  const dec = I(x - 1), drop = I(x & dec), inv = I(~x), neg = I(-x), low = I(x & neg);
  const shown = range(0, Math.min(t, w - 1));
  r.frame(x === 0
    ? `x = 0 has no set bit. Watch both tricks: they must both return 0.`
    : `x = ${x}. Its lowest set bit is bit ${t}: below it there are ${t} zero${t === 1 ? '' : 's'}. Write x as prefix, then that 1, then ${t} zeros.${widthNote(w)}`,
    [bitGrid([{ label: 'x', v: x, hot: t < 0 ? [] : [t], tone: 'found' }], w), tvars({ x })]);
  r.frame(x === 0
    ? `x − 1 = −1: the subtraction borrows through every bit, so all bits become 1.`
    : `x − 1: subtracting borrows from the lowest 1. That bit becomes 0 and the ${t} zeros below it become 1s. The prefix is untouched.`,
    [bitGrid([{ label: 'x', v: x }, { label: 'x − 1', v: dec, hot: t < 0 ? [] : shown, tone: 'swapped' }], w), tvars({ 'x − 1': dec })],
    mc(`x = ${x}. Which bits change when you compute x − 1?`, x === 0 ? 'all of them' : `bits 0 to ${t}`, x === 0 ? ['none'] : ['only bit 0', `only bit ${t}`, 'all of them'], 'The borrow flips the lowest 1 and every zero below it, and nothing above.', 1));
  r.frame(`x & (x − 1): the flipped region disagrees with x in every column, so AND gives 0 there. The prefix agrees with itself and stays. Result: bit ${t < 0 ? 'none' : t} is cleared and nothing else changed (${drop}).`,
    [bitGrid([{ label: 'x', v: x }, { label: 'x − 1', v: dec }, { label: 'x & (x − 1)', v: drop, hot: t < 0 ? [] : [t], tone: 'out' }], w), tvars({ 'x & (x − 1)': drop })],
    mc(`What is ${x} & ${dec}?`, drop, [dec, low, x], 'Exactly the lowest set bit goes out.', 2));
  r.frame(`Now negate: −x = ~x + 1. ~x is the exact opposite of x. Adding 1 carries through the ${t < 0 ? 'bits' : `${t} ones that ~x has below bit ${t}`} and lands on bit ${t < 0 ? '–' : t}, so −x repeats x at bit ${t < 0 ? '–' : t} and is the opposite of x everywhere above.`,
    [bitGrid([{ label: 'x', v: x }, { label: '~x', v: inv }, { label: '−x', v: neg, hot: t < 0 ? [] : [t], tone: 'found' }], w), tvars({ '−x': neg })]);
  r.frame(`x & −x: x and −x agree only at bit ${t < 0 ? '–' : t} (below it both are 0, above it they are opposites). AND keeps just that one bit: ${low}. Compare with x & (x − 1) = ${drop}, which removes it.`,
    [bitGrid([{ label: 'x', v: x }, { label: '−x', v: neg }, { label: 'x & −x', v: low, hot: t < 0 ? [] : [t], tone: 'found' }], w), tvars({ 'x & (x − 1)': drop, 'x & −x': low, answer: J([drop, low]) })]);
  return r.frames;
}

// ---- Chapter 2: test, set, clear, flip one bit ---------------------------------------------------------------
// answer = [testedBit, set, clear, flip] with testedBit 0 or 1.
export function bitOpsFrames(x: number, i: number): Frame[] {
  const r = recorder(), m = I(1 << i), w = widthFor(x, m);
  const tested = I(x & m), set = I(x | m), clr = I(x & ~m), flip = I(x ^ m);
  const isSet = tested !== 0;
  r.frame(`To touch bit ${i} only, build a mask with a single 1 at that position: 1 << ${i} = ${m}.${m < 0 ? ' Bit 31 is the sign bit, so this mask is negative.' : ''}`,
    [bitGrid([{ label: 'x', v: x, hot: [i], tone: 'compared' }, { label: 'mask', v: m, hot: [i] }], w), tvars({ x, i })]);
  r.frame(`Test: x & mask keeps only bit ${i}. The result is ${tested}, ${isSet ? `which is 2^${i}, not 1 (so compare with != 0, never == 1)` : 'zero, so the bit is clear'}.`,
    [bitGrid([{ label: 'x', v: x }, { label: 'mask', v: m }, { label: 'x & mask', v: tested, hot: isSet ? [i] : [], tone: 'found' }], w), tvars({ 'x & mask': tested, 'bit is set': isSet ? 'yes' : 'no' })],
    yn(`Bit ${i} of x is ${bit(x, i)}. Is (x & (1 << ${i})) != 0?`, isSet, `The AND is ${tested}.`));
  r.frame(`Set: x | mask turns bit ${i} on whatever it was, and OR cannot change any other bit (the mask is 0 there). Result ${set}.`,
    [bitGrid([{ label: 'x', v: x }, { label: 'mask', v: m }, { label: 'x | mask', v: set, hot: [i], tone: 'swapped' }], w), tvars({ 'x | mask': set })]);
  r.frame(`Clear: AND with the inverted mask ~mask, which has a 0 at bit ${i} and 1 everywhere else. Only bit ${i} can change. Result ${clr}.`,
    [bitGrid([{ label: 'x', v: x }, { label: '~mask', v: I(~m) }, { label: 'x & ~mask', v: clr, hot: [i], tone: 'out' }], w), tvars({ 'x & ~mask': clr })],
    mc(`What is x & ~(1 << ${i}) for x = ${x}?`, clr, [set, flip, x === clr ? I(x ^ 1) : x], 'Bit i goes to 0; every other bit is kept.', 1));
  r.frame(`Flip: x ^ mask toggles bit ${i}: 0 becomes 1 and 1 becomes 0, because XOR with 1 flips and XOR with 0 keeps. Result ${flip}.`,
    [bitGrid([{ label: 'x', v: x }, { label: 'mask', v: m }, { label: 'x ^ mask', v: flip, hot: [i], tone: 'swapped' }], w), tvars({ 'x ^ mask': flip, answer: J([isSet ? 1 : 0, set, clr, flip]) })]);
  return r.frames;
}

// ---- Chapter 3: Single Number --------------------------------------------------------------------------------
// answer = the value with an odd count (nums has exactly one).
export function singleNumberFrames(nums: number[]): Frame[] {
  const r = recorder(), w = widthFor(...nums);
  let acc = 0;
  const arr = (i: number): View => ({ kind: 'array', name: 'nums', values: nums, pointers: i < nums.length ? [{ at: i, label: 'x', tone: 'blue' }] : [], tones: Object.fromEntries(nums.slice(0, i).map((_, k) => [k, 'visited' as CellTone])) });
  r.frame(`Start from acc = 0 (the empty fold: x ^ 0 = x). XOR each value into acc. A value that arrives twice flips the same bits twice, so it cancels.${widthNote(w)}`,
    [arr(0), bitGrid([{ label: 'acc', v: 0 }], w), tvars({ acc: 0 })]);
  nums.forEach((x, i) => {
    const before = acc, seen = nums.slice(0, i).filter(y => y === x).length;
    acc = I(acc ^ x);
    const flipped = range(0, w - 1).filter(p => bit(x, p));
    r.frame(seen % 2 === 1
      ? `acc ^ ${x}: this is the partner of an earlier ${x}. Every bit it sets was flipped by the first copy, so the second copy flips it back. The pair is gone.`
      : `acc ^ ${x}: every bit that ${x} has set is flipped in acc. ${seen === 0 ? 'So far no partner has arrived, so these flips stay.' : 'This is an odd copy, so the flips stay.'}`,
      [arr(i), bitGrid([{ label: 'acc before', v: before }, { label: 'x', v: x, hot: flipped, tone: 'compared' }, { label: 'acc ^ x', v: acc, hot: flipped, tone: 'swapped' }], w), tvars({ acc }, { acc: before })],
      mc(`acc = ${before}, next value ${x}. What does acc become?`, acc, [I(before + x), I(before | x), I(before & x)], 'XOR flips exactly the bits that x has set.', i));
  });
  r.frame(`No values left. Every pair has met its partner and cancelled; only the value without a partner is still in acc: ${acc}.`,
    [arr(nums.length), bitGrid([{ label: 'acc', v: acc }], w), tvars({ answer: acc })]);
  return r.frames;
}

// ---- Chapter 4: Missing Number -------------------------------------------------------------------------------
// nums holds n distinct values from 0..n; answer = the missing one.
export function missingNumberFrames(nums: number[]): Frame[] {
  const r = recorder(), n = nums.length, w = widthFor(n);
  let acc = n;
  const arr = (i: number): View => ({ kind: 'array', name: 'nums', values: nums, pointers: i < n ? [{ at: i, label: 'i', tone: 'blue' }] : [], tones: Object.fromEntries(nums.slice(0, i).map((_, k) => [k, 'visited' as CellTone])) });
  r.frame(`n = ${n}, so the full range is 0..${n}. The indexes 0..${n - 1} plus n are exactly that range. Fold n in first, because no index supplies it.${widthNote(w)}`,
    [arr(0), bitGrid([{ label: 'acc = n', v: acc }], w), tvars({ acc })]);
  nums.forEach((v, i) => {
    const before = acc;
    acc = I(acc ^ i ^ v);
    r.frame(`Fold index ${i} and value ${v}. Each number in the range that is present gets XORed in twice (once as an index or n, once as a value), so it cancels.`,
      [arr(i), bitGrid([{ label: 'acc before', v: before }, { label: 'index i', v: i, tone: 'compared', hot: range(0, w - 1).filter(p => bit(i, p)) }, { label: 'value', v, tone: 'compared', hot: range(0, w - 1).filter(p => bit(v, p)) }, { label: 'acc after', v: acc }], w), tvars({ acc }, { acc: before })],
      mc(`acc = ${before}. Fold in index ${i} and value ${v}. New acc?`, acc, [I(before ^ v), I(before ^ i), I(before + i + v)], 'XOR the index and the value into acc, in either order.', i));
  });
  r.frame(`Every number that is present appeared twice and cancelled. The missing number appeared once, so it is what is left: ${acc}.`,
    [arr(n), bitGrid([{ label: 'acc', v: acc }], w), tvars({ answer: acc })]);
  return r.frames;
}

// ---- Chapter 5: Number of 1 Bits (Kernighan) -----------------------------------------------------------------
// answer = number of set bits of the 32-bit pattern.
export function popcountFrames(n: number): Frame[] {
  const r = recorder(), w = widthFor(n);
  let x = n, count = 0;
  r.frame(`Count the set bits of ${n}. Instead of visiting every position, clear the lowest set bit with n &= n − 1 and count the rounds: one round per set bit.${widthNote(w)}`,
    [bitGrid([{ label: 'n', v: x, hot: range(0, w - 1).filter(p => bit(x, p)), tone: 'compared' }], w), tvars({ n: x, count })]);
  while (x !== 0) {
    const t = ctz(x), dec = I(x - 1), next = I(x & dec), prev = { n: x, count };
    count++;
    r.frame(`Round ${count}: the lowest set bit of ${x} is bit ${t}. n − 1 clears bit ${t} and sets bits 0 to ${t - 1}. ANDing with n: bit ${t} is 1 and 0, the bits below are 0 and 1, the bits above are unchanged. Exactly one bit is cleared, so count becomes ${count}.`,
      [bitGrid([{ label: 'n', v: x, hot: [t], tone: 'found' }, { label: 'n − 1', v: dec, hot: range(0, t), tone: 'swapped' }, { label: 'n & (n − 1)', v: next, hot: [t], tone: 'out' }], w), tvars({ n: next, count }, prev)],
      mc(`n = ${x}. What is n after n &= n − 1?`, next, [dec, I(x >>> 1), I(x & -x)], 'Exactly the lowest set bit is cleared; n − 1 alone would also set the zeros below it.', count));
    x = next;
  }
  r.frame(`n is 0: no set bits remain. The loop ran once per set bit, so count = ${count}.`,
    [bitGrid([{ label: 'n', v: 0 }], w), tvars({ n: 0, answer: count })]);
  return r.frames;
}

// ---- Chapter 6: Counting Bits --------------------------------------------------------------------------------
// answer = JSON array bits[0..n].
export function countingBitsFrames(n: number): Frame[] {
  const r = recorder(), w = widthFor(n), bits: number[] = [0];
  const table = (i: number, hi?: number): View => ({
    kind: 'array', name: 'bits[ ]', values: range(0, n).map(k => (k <= i ? bits[k] : '?')),
    tones: Object.fromEntries(range(0, i).map(k => [k, 'visited' as CellTone])),
    pointers: [{ at: i, label: 'i', tone: 'gold' }, ...(hi !== undefined ? [{ at: hi, label: 'i >> 1', tone: 'blue' as const }] : [])],
  });
  r.frame(`bits[0] = 0 is the only base case. Every later entry is built from a smaller one that is already filled in.`, [table(0), tvars({ i: 0 })]);
  for (let i = 1; i <= n; i++) {
    const half = i >> 1, lastBit = i & 1;
    bits[i] = bits[half] + lastBit;
    r.frame(`i = ${i}. Drop its last bit (i >> 1 = ${half}) and you get a smaller number whose count is already known: bits[${half}] = ${bits[half]}. The dropped bit is ${lastBit}, so bits[${i}] = ${bits[half]} + ${lastBit} = ${bits[i]}.`,
      [table(i, half), bitGrid([{ label: 'i', v: i, hot: [0], tone: lastBit ? 'found' : 'compared' }, { label: 'i >> 1', v: half, hot: [], tone: 'visited' }], w), tvars({ i, 'bits[i >> 1]': bits[half], 'i & 1': lastBit, 'bits[i]': bits[i] })],
      mc(`i = ${i}. bits[${half}] = ${bits[half]} and the dropped bit is ${lastBit}. What is bits[${i}]?`, bits[i], [bits[i] + 1, bits[i] - 1, bits[i - 1] + 1], 'Count of the smaller number plus the bit that was dropped.', i));
  }
  r.frame(`Every entry was built from an earlier one, so the table is done: ${bits.join(', ')}.`, [table(n), tvars({ answer: J(bits) })]);
  return r.frames;
}

// ---- Chapter 7: Reverse Bits ---------------------------------------------------------------------------------
// Reverses the low w bits (w = 32 by default). answer = result as a Java int when w = 32.
export function reverseBitsFrames(n: number, w = 32): Frame[] {
  const r = recorder(), keep = w === 32 ? -1 : (1 << w) - 1;
  let rest = n, result = 0;
  r.frame(`Reverse the ${w}-bit row. Each round: make room in result (result << 1), copy the lowest bit of the input into result, then slide the input right. Run exactly ${w} rounds: zeros count too.`,
    [bitGrid([{ label: 'rest (to read)', v: rest }, { label: 'result', v: result }], w), tvars({ round: 0 })]);
  for (let k = 1; k <= w; k++) {
    const low = rest & 1, room = I((result << 1) & keep), taken = I(room | low), slid = I(rest >>> 1);
    r.frame(`Round ${k}: result << 1 makes room. rest & 1 = ${low} is input bit ${k - 1}; OR it into position 0. Then rest >>> 1 brings input bit ${k} down. Input bit ${k - 1} will be shifted ${w - k} more time${w - k === 1 ? '' : 's'}, ending at position ${w - k}.`,
      [bitGrid([{ label: 'rest', v: rest, hot: [0], tone: 'compared' }, { label: 'result << 1', v: room, hot: [0], tone: 'out' }, { label: 'result', v: taken, hot: [0], tone: 'found' }, { label: 'rest >>> 1', v: slid }], w), tvars({ round: k, taken: low, result: taken }, { round: k - 1, taken: low, result })],
      mc(`Round ${k}: rest ends in ${low}. What is result afterwards?`, taken, [room, I(taken << 1), I(rest)], 'Shift result left first, then OR in the bit you just read.', k));
    result = taken; rest = slid;
  }
  r.frame(`${w} rounds done. Input bit k now sits at position ${w - 1} − k: the row is mirrored. Stopping early when rest hit zero would have left the high bits short.`,
    [bitGrid([{ label: 'original', v: n }, { label: 'result', v: result }], w), tvars({ answer: result })]);
  return r.frames;
}

// ---- Chapter 8: Subsets by bitmask ---------------------------------------------------------------------------
// answer = JSON list of subsets in mask order (keep nums.length <= 4).
export function subsetsMaskFrames(nums: number[]): Frame[] {
  const r = recorder(), n = nums.length, all: number[][] = [];
  r.frame(`${n} items means ${n} bits: bit i set means nums[i] is in the subset. There are 2^${n} = ${1 << n} masks, 0 to ${(1 << n) - 1}, and each is exactly one subset.`,
    [{ kind: 'array', name: 'nums', values: nums, indices: true }, tvars({ mask: 0 })]);
  for (let mask = 0; mask < 1 << n; mask++) {
    const sub = nums.filter((_, i) => bit(mask, i));
    all.push(sub);
    const on = range(0, n - 1).filter(i => bit(mask, i));
    r.frame(`mask = ${mask} = ${binStr(mask, n)}. ${on.length ? `Bits ${on.join(', ')} are set, so nums[${on.join('], nums[')}] are in.` : 'No bit is set: the empty subset.'} Bit 0 is the rightmost column.`,
      [{ kind: 'array', name: 'nums', values: nums, tones: Object.fromEntries(on.map(i => [i, 'found' as CellTone])) }, bitGrid([{ label: 'mask', v: mask, hot: on, tone: 'found' }], n), tvars({ mask, subset: J(sub) })],
      mc(`mask = ${mask} (${binStr(mask, n)}). Which subset is it?`, J(sub), [J(nums.filter((_, i) => !bit(mask, i))), J([...sub].reverse()), J(nums.filter((_, i) => bit(mask, n - 1 - i)))], 'Bit i of the mask decides nums[i]; bit 0 is on the right.', mask));
  }
  r.frame(`The counter ran from 0 to 2^${n} − 1, so every subset was produced exactly once: ${all.length} subsets.`, [{ kind: 'array', name: 'nums', values: nums }, tvars({ answer: J(all) })]);
  return r.frames;
}

// ---- Chapter 9: gcd, modPow ----------------------------------------------------------------------------------
// answer = gcd(a, b) for a, b >= 0.
export function gcdFrames(a0: number, b0: number): Frame[] {
  const r = recorder();
  let a = a0, b = b0;
  r.frame(`gcd(${a}, ${b}). Common divisors of a and b are exactly the common divisors of b and a % b, so replace the pair until b is 0.`,
    [{ kind: 'array', values: [a, b], indices: false, pointers: [{ at: 0, label: 'a' }, { at: 1, label: 'b', tone: 'blue' }] }, tvars({ a, b })]);
  while (b !== 0) {
    const rem = a % b, prev = { a, b };
    r.frame(`${a} % ${b} = ${rem}. The pair (${a}, ${b}) has the same common divisors as (${b}, ${rem}), and the numbers are smaller. New pair: (${b}, ${rem}).`,
      [{ kind: 'array', values: [b, rem], indices: false, pointers: [{ at: 0, label: 'a' }, { at: 1, label: 'b', tone: 'blue' }] }, tvars({ a: b, b: rem, remainder: rem }, prev)],
      mc(`a = ${a}, b = ${b}. What is a % b?`, rem, [rem + 1, a - b, b - rem], 'The remainder after dividing a by b.', a + b));
    a = b; b = rem;
  }
  r.frame(`b is 0, and gcd(a, 0) = a. The answer is ${a}.`, [{ kind: 'array', values: [a, 0], indices: false, tones: { 0: 'found' } }, tvars({ answer: a })]);
  return r.frames;
}

// answer = base^exp mod m as a decimal string. exp >= 0, 1 <= mod <= 2^31 - 1.
export function modPowFrames(base0: number, exp0: number, mod0: number): Frame[] {
  const r = recorder(), M = BigInt(mod0), w = Math.max(1, exp0.toString(2).length);
  let result = 1n % M, base = ((BigInt(base0) % M) + M) % M, exp = exp0;
  r.frame(`Compute ${base0}^${exp0} mod ${mod0}. Write the exponent in binary: ${exp0.toString(2)}. The base is squared once per bit (b, b², b⁴, …), and the squares for set bits are multiplied into result.`,
    [bitGrid([{ label: 'exp', v: exp }], w), tvars({ result: String(result), base: String(base), exp })]);
  let round = 0;
  while (exp > 0) {
    round++;
    const take = (exp & 1) === 1, nextResult = take ? (result * base) % M : result, nextBase = (base * base) % M;
    r.frame(take
      ? `Round ${round}: the lowest bit of exp is 1, so this square is part of the answer: result = ${result} × ${base} mod ${mod0} = ${nextResult}. Then square the base: ${nextBase}, and shift exp right.`
      : `Round ${round}: the lowest bit of exp is 0, so this square is skipped and result stays ${result}. Square the base anyway (${nextBase}), and shift exp right.`,
      [bitGrid([{ label: 'exp', v: exp, hot: [0], tone: take ? 'found' : 'compared' }, { label: 'exp >> 1', v: exp >> 1 }], w), tvars({ result: String(nextResult), base: String(nextBase), exp: exp >> 1 }, { result: String(result), base: String(base), exp })],
      yn(`exp = ${exp.toString(2)}. Is result multiplied by base this round?`, take, `The lowest bit of exp is ${exp & 1}.`));
    result = nextResult; base = nextBase; exp >>= 1;
  }
  r.frame(`exp is 0, so every set bit of the exponent has been used. result = ${result}.`, [bitGrid([{ label: 'exp', v: 0 }], w), tvars({ answer: String(result) })]);
  return r.frames;
}

// ---- Chapter 10: Count Primes --------------------------------------------------------------------------------
// answer = number of primes strictly below n.
export function sieveFrames(n: number): Frame[] {
  const r = recorder();
  if (n < 3) { r.frame(`Fewer than 3 means no prime below ${n}.`, [{ kind: 'array', values: [], indices: false }, tvars({ answer: 0 })]); return r.frames; }
  const comp = new Array<boolean>(n).fill(false), nums = range(2, n - 1);
  const view = (cur: number): View => ({
    kind: 'array', name: `2 … ${n - 1}`, values: nums, indices: false,
    tones: Object.fromEntries(nums.map((v, k) => [k, v === cur ? 'active' : comp[v] ? 'out' : v < cur ? 'done' : undefined]).filter(([, t]) => t)) as Record<number, CellTone>,
  });
  r.frame(`Start with every number from 2 to ${n - 1} unmarked. Walk i upward: if i is still unmarked, nothing smaller divides it, so it is prime. Then cross out its multiples, starting at i × i.`, [view(0), tvars({ i: 2 })]);
  for (let i = 2; i * i < n; i++) {
    if (comp[i]) continue;
    const crossed: number[] = [];
    for (let j = i * i; j < n; j += i) if (!comp[j]) { comp[j] = true; crossed.push(j); }
    r.frame(`${i} is unmarked, so it is prime. Cross out ${i * i}, ${i * i + i}, … below ${n}. Smaller multiples ${i} × k with k < ${i} have a smaller prime factor and are already crossed out. ${crossed.length ? `Newly crossed: ${crossed.join(', ')}.` : 'Everything was already crossed out.'}`,
      [view(i), tvars({ i, start: i * i, crossed: crossed.join(' ') || 'none' })],
      yn(`${i} is unmarked. Prime?`, true, 'Anything smaller that divides it would already have crossed it out.'));
  }
  const count = nums.filter(v => !comp[v]).length;
  r.frame(`Once i × i reaches ${n}, no composite below ${n} is left uncrossed: every composite has a prime factor p with p × p at most itself. The unmarked numbers are the primes. Count: ${count}.`,
    [{ kind: 'array', name: 'primes remain', values: nums, indices: false, tones: Object.fromEntries(nums.map((v, k) => [k, comp[v] ? 'out' : 'done'])) as Record<number, CellTone> }, tvars({ answer: count })]);
  return r.frames;
}

// ---- Side quest 1: Single Number II --------------------------------------------------------------------------
// answer = the value that is not repeated three times.
export function singleNumberIIFrames(nums: number[]): Frame[] {
  const r = recorder(), w = widthFor(...nums);
  let ones = 0, twos = 0;
  r.frame(`Every value appears three times except one. Keep two rows, ones and twos. At each bit position they hold a count mod 3: (twos, ones) = (0,0) for 0, (0,1) for 1, (1,0) for 2. A set bit in the incoming value advances that position's counter.${widthNote(w)}`,
    [bitGrid([{ label: 'ones', v: 0 }, { label: 'twos', v: 0 }], w), tvars({ ones, twos })]);
  nums.forEach(x => {
    const po = ones, pt = twos;
    ones = I((ones ^ x) & ~twos);
    twos = I((twos ^ x) & ~ones);
    const inc = range(0, w - 1).filter(p => bit(x, p));
    r.frame(`Fold in ${x}. At each of its set bits the counter steps 0→1→2→0: ones = (ones ^ x) & ~twos, then twos = (twos ^ x) & ~ones using the NEW ones. Where x has a 0 nothing changes.`,
      [bitGrid([{ label: 'x', v: x, hot: inc, tone: 'compared' }, { label: 'ones', v: ones, hot: range(0, w - 1).filter(p => bit(ones, p) !== bit(po, p)), tone: 'swapped' }, { label: 'twos', v: twos, hot: range(0, w - 1).filter(p => bit(twos, p) !== bit(pt, p)), tone: 'swapped' }], w), tvars({ ones, twos }, { ones: po, twos: pt })],
      mc(`ones = ${po}, twos = ${pt}. Fold in ${x}. New ones?`, ones, [I(po ^ x), I(po | x), I(po & ~x)], 'Toggle ones where x is set, but only where twos is clear.', nums.indexOf(x)));
  });
  r.frame(`Every bit position has now seen 3k or 3k + 1 set values, so its counter is (0,0) or (0,1). ones holds the bits of the single value: ${ones}.`,
    [bitGrid([{ label: 'ones', v: ones }, { label: 'twos', v: twos }], w), tvars({ answer: ones })]);
  return r.frames;
}

// Version 1: count each bit position mod 3. answer = the single value.
export function singleNumberIICountFrames(nums: number[]): Frame[] {
  const r = recorder(), w = widthFor(...nums);
  let result = 0;
  const rows = (p?: number): BitRow[] => nums.map((x, k) => ({ label: `v${k}`, v: x, hot: p === undefined ? [] : [p], tone: bit(x, p ?? 0) ? 'found' : 'compared' }));
  r.frame(`Count, for each bit position, how many values have a 1 there. Triples add a multiple of 3, so count mod 3 is the single value's bit.${widthNote(w)}`,
    [bitGrid(rows(), w), tvars({ result })]);
  for (let p = 0; p < w; p++) {
    const count = nums.filter(x => bit(x, p)).length, m = count % 3;
    if (m) result = I(result | (1 << p));
    r.frame(`Bit ${p}: ${count} value${count === 1 ? ' has' : 's have'} a 1 here. ${count} mod 3 = ${m}, so bit ${p} of the single value is ${m}.`,
      [bitGrid(rows(p), w), tvars({ bit: p, count, 'count mod 3': m, result })],
      mc(`Bit ${p}: ${count} values have a 1. Is bit ${p} of the single value 1?`, m ? 'Yes' : 'No', [m ? 'No' : 'Yes'], `${count} mod 3 is ${m}.`, p));
  }
  r.frame(`All ${w} bit positions are decided. The single value is ${result}.`, [bitGrid([{ label: 'result', v: result }], w), tvars({ answer: result })]);
  return r.frames;
}

// ---- Side quest 2: Single Number III -------------------------------------------------------------------------
// answer = JSON [a, b] with a < b (the two values that appear once).
export function singleNumberIIIFrames(nums: number[]): Frame[] {
  const r = recorder(), w = widthFor(...nums);
  const both = nums.reduce((x, y) => I(x ^ y), 0), split = I(both & -both), t = ctz(split);
  const a = nums.filter(x => (x & split) !== 0).reduce((x, y) => I(x ^ y), 0), b = I(both ^ a);
  const arr = (tones: Record<number, CellTone> = {}): View => ({ kind: 'array', name: 'nums', values: nums, tones });
  r.frame(`Two values appear once (call them a and b); the rest are pairs. Fold everything with XOR first.${widthNote(w)}`, [arr(), tvars({ both: '?' })]);
  r.frame(`The pairs cancel, leaving both = a ^ b = ${both}. It is not an answer, but every 1 in it marks a bit where a and b differ (a ≠ b, so there is at least one).`,
    [arr(), bitGrid([{ label: 'both', v: both, hot: range(0, w - 1).filter(p => bit(both, p)), tone: 'found' }], w), tvars({ both })],
    mc('What does a set bit in both = a ^ b tell you?', 'a and b differ at that bit', ['a and b are both 1 there', 'a is bigger than b', 'that bit is in no input'], 'XOR is 1 exactly where its two operands differ.'));
  r.frame(`Pick the lowest differing bit: split = both & −both = ${split} (bit ${t}). a and b have different values at this bit, so a mask built from it separates them.`,
    [arr(), bitGrid([{ label: 'both', v: both }, { label: '−both', v: I(-both) }, { label: 'split', v: split, hot: [t], tone: 'found' }], w), tvars({ split, bit: t })]);
  const tones: Record<number, CellTone> = Object.fromEntries(nums.map((x, k) => [k, (x & split) !== 0 ? 'compared' : 'visited']));
  r.frame(`Test each value with x & split. Values with bit ${t} set go to one group (highlighted), the rest to the other. a and b land in different groups, and each pair lands together because equal values agree on every bit.`,
    [arr(tones), bitGrid(nums.map((x, k) => ({ label: `v${k}`, v: x, hot: [t], tone: (x & split) !== 0 ? 'found' : 'compared' })), w), tvars({ split })]);
  r.frame(`Fold only the group with bit ${t} set. Its pairs cancel and its single value is left: ${a}.`,
    [arr(tones), bitGrid([{ label: 'a', v: a }], w), tvars({ a })]);
  r.frame(`The other single is both ^ a = ${both} ^ ${a} = ${b}. Answer (either order): ${a} and ${b}.`,
    [bitGrid([{ label: 'both', v: both }, { label: 'a', v: a }, { label: 'b = both ^ a', v: b, hot: range(0, w - 1).filter(p => bit(b, p)), tone: 'found' }], w), tvars({ answer: J([Math.min(a, b), Math.max(a, b)]) })]);
  return r.frames;
}

// ---- Side quest 3: add without + -----------------------------------------------------------------------------
// answer = a + b wrapped to a Java int.
export function getSumFrames(a0: number, b0: number): Frame[] {
  const rounds: { a: number; b: number; sum: number; carry: number }[] = [];
  let a = a0, b = b0;
  while (b !== 0) { const sum = I(a ^ b), carry = I((a & b) << 1); rounds.push({ a, b, sum, carry }); a = sum; b = carry; }
  const w = widthFor(a0, b0, ...rounds.flatMap(x => [x.sum, x.carry])), r = recorder();
  r.frame(`Add ${a0} and ${b0} the way you add by hand, but for all columns at once. a ^ b is each column's sum ignoring carries; (a & b) << 1 is the carries, moved one column left. Repeat until no carry remains.${widthNote(w)}`,
    [bitGrid([{ label: 'a', v: a0 }, { label: 'b', v: b0 }], w), tvars({ a: a0, b: b0 })]);
  rounds.forEach((x, k) => {
    r.frame(`Round ${k + 1}: columns where exactly one input is 1 give a 1 (a ^ b = ${x.sum}); columns where both are 1 give 0 and carry into the next column ((a & b) << 1 = ${x.carry}). ${x.carry === 0 ? 'No carry is left, so a ^ b is the answer.' : `Now add ${x.sum} and the carry ${x.carry} the same way.`}`,
      [bitGrid([{ label: 'a', v: x.a }, { label: 'b (carries)', v: x.b }, { label: 'a ^ b', v: x.sum, hot: range(0, w - 1).filter(p => bit(x.a, p) !== bit(x.b, p)), tone: 'swapped' }, { label: '(a & b) << 1', v: x.carry, hot: range(0, w - 1).filter(p => bit(x.carry, p)), tone: 'found' }], w), tvars({ a: x.sum, b: x.carry }, { a: x.a, b: x.b })],
      mc(`a = ${x.a}, b = ${x.b}. What is a ^ b this round?`, x.sum, [I(x.a | x.b), I(x.a & x.b), I(x.a + x.b)], 'Sum without carries: 1 only where the bits differ.', k));
  });
  r.frame(`b is 0: nothing is left to carry. a holds the sum: ${a}. This takes at most 32 rounds, because each round pushes the lowest carry bit at least one place left until it falls off the top.`,
    [bitGrid([{ label: 'a', v: a }], w), tvars({ answer: a })]);
  return r.frames;
}

// ---- Side quest 4: power of two / four -----------------------------------------------------------------------
// answer = JSON [isPowerOfTwo, isPowerOfFour].
export function powerOfTwoFrames(n: number): Frame[] {
  const r = recorder(), w = widthFor(n), dec = I(n - 1), and = I(n & dec);
  const p2 = n > 0 && and === 0, p4 = p2 && (n & 0x55555555) !== 0;
  r.frame(`A power of two has exactly one bit set. n = ${n}.${widthNote(w)}`, [bitGrid([{ label: 'n', v: n, hot: range(0, w - 1).filter(p => bit(n, p)), tone: 'compared' }], w), tvars({ n })]);
  r.frame(`n & (n − 1) clears the lowest set bit. If that was the only set bit, the result is 0. Here it is ${and}.${n === 0 ? ' But 0 has no set bit at all, so the test alone wrongly accepts it.' : n === -2147483648 ? ' MIN_VALUE has only the sign bit set, so the test alone wrongly accepts it too.' : ''}`,
    [bitGrid([{ label: 'n', v: n }, { label: 'n − 1', v: dec }, { label: 'n & (n − 1)', v: and, hot: and === 0 ? [] : range(0, w - 1).filter(p => bit(and, p)), tone: 'found' }], w), tvars({ 'n & (n − 1)': and })],
    yn(`n = ${n}. Is n & (n − 1) equal to 0?`, and === 0, `${n} & ${dec} = ${and}.`));
  r.frame(`Guard with n > 0: that rejects 0 and every negative number, including MIN_VALUE. Power of two: ${p2 ? 'yes' : 'no'}.`, [bitGrid([{ label: 'n', v: n }], w), tvars({ 'n > 0': n > 0 ? 'yes' : 'no', 'power of two': p2 ? 'yes' : 'no' })]);
  const m = I(0x55555555);
  r.frame(`Power of four: 4^k = 2^(2k), so the single set bit must sit at an even position. The mask 0x55555555 (…0101 0101) has a 1 at every even position. n & mask is ${I(n & m)}, so power of four: ${p4 ? 'yes' : 'no'}.`,
    [bitGrid([{ label: 'n', v: n }, { label: '0x55555555', v: m }, { label: 'n & mask', v: I(n & m), hot: range(0, w - 1).filter(p => bit(n & m, p)), tone: 'found' }], w), tvars({ answer: J([p2, p4]) })]);
  return r.frames;
}

// ---- Side quest 5: Hamming distance --------------------------------------------------------------------------
// answer = number of bit positions where x and y differ.
export function hammingFrames(x: number, y: number): Frame[] {
  const r = recorder(), w = widthFor(x, y), diff = I(x ^ y), pos = range(0, w - 1).filter(p => bit(diff, p));
  r.frame(`Count the bit positions where ${x} and ${y} differ.${widthNote(w)}`, [bitGrid([{ label: 'x', v: x }, { label: 'y', v: y }], w), tvars({ x, y })]);
  r.frame(`x ^ y is 1 exactly where the bits differ and 0 where they agree.`,
    [bitGrid([{ label: 'x', v: x }, { label: 'y', v: y }, { label: 'x ^ y', v: diff, hot: pos, tone: 'found' }], w), tvars({ diff })],
    mc(`x = ${x}, y = ${y}. What is x ^ y?`, diff, [I(x & y), I(x | y), I(x + y)], 'XOR marks the differences.'));
  let d = diff, count = 0;
  while (d !== 0) {
    const next = I(d & (d - 1)), t = ctz(d);
    count++;
    r.frame(`d &= d − 1 clears the lowest set bit (bit ${t}). That was one disagreement, so count = ${count}.`,
      [bitGrid([{ label: 'd', v: d, hot: [t], tone: 'found' }, { label: 'd & (d − 1)', v: next, hot: [t], tone: 'out' }], w), tvars({ d: next, count })]);
    d = next;
  }
  r.frame(`d is 0, so every disagreement was counted: the Hamming distance is ${count}.`, [bitGrid([{ label: 'x ^ y', v: diff }], w), tvars({ answer: count })]);
  return r.frames;
}

// All pairs: per bit position, lit × dark pairs disagree. answer = total Hamming distance over all pairs.
export function totalHammingFrames(nums: number[]): Frame[] {
  const r = recorder(), n = nums.length, w = widthFor(...nums);
  let total = 0;
  const rows = (p?: number): BitRow[] => nums.map((x, k) => ({ label: `v${k}`, v: x, hot: p === undefined ? [] : [p], tone: bit(x, p ?? 0) ? 'found' : 'compared' }));
  r.frame(`Comparing every pair costs O(n²). Look at one bit position at a time instead: if s values have a 1 there and n − s have a 0, exactly s × (n − s) pairs differ at that position.${widthNote(w)}`,
    [bitGrid(rows(), w), tvars({ n, total })]);
  for (let p = w - 1; p >= 0; p--) {
    const s = nums.filter(x => bit(x, p)).length, add = s * (n - s), prev = total;
    total += add;
    r.frame(`Bit ${p}: ${s} value${s === 1 ? ' has' : 's have'} a 1 and ${n - s} ${n - s === 1 ? 'has' : 'have'} a 0, so ${s} × ${n - s} = ${add} pairs differ here. Running total ${total}.`,
      [bitGrid(rows(p), w), tvars({ bit: p, ones: s, zeros: n - s, total }, { bit: p, ones: s, zeros: n - s, total: prev })],
      mc(`Bit ${p}: ${s} ones and ${n - s} zeros. How many pairs differ at this bit?`, add, [s + (n - s), s * s, add + 1], 'Each 1 pairs with each 0: ones × zeros.', p));
  }
  r.frame(`All ${w} bit positions are summed. The total over all pairs is ${total}, in O(${w}·n) instead of O(n²).`, [bitGrid(rows(), w), tvars({ answer: total })]);
  return r.frames;
}

// ---- Side quest 6: Reverse Integer ---------------------------------------------------------------------------
// answer = reversed decimal digits, or 0 when the result leaves the int range.
export function reverseIntegerFrames(x0: number): Frame[] {
  const r = recorder(), MAX = 2147483647, MIN = -2147483648, MAXD = Math.trunc(MAX / 10), MIND = Math.trunc(MIN / 10);
  let x = x0, rev = 0;
  r.frame(`Reverse the decimal digits of ${x0}. Peel the last digit with x % 10, push it with rev × 10 + digit. The risk is overflow, and we may not use a 64-bit type, so refuse the multiply BEFORE it happens: rev must stay within ${MIND} … ${MAXD}.`,
    [{ kind: 'array', name: 'digits of x', values: String(Math.abs(x0)).split(''), indices: false }, tvars({ x, rev })]);
  while (x !== 0) {
    const digit = x % 10, nx = Math.trunc(x / 10);
    if (rev > MAXD || rev < MIND) {
      r.frame(`rev = ${rev} is beyond ${rev > 0 ? MAXD : MIND}, so rev × 10 would overflow an int. Return 0.`, [tvars({ x, digit, rev, answer: 0 })]);
      return r.frames;
    }
    const prev = rev;
    rev = rev * 10 + digit;
    r.frame(`digit = ${x} % 10 = ${digit} (Java keeps the sign of x). rev ${prev} is within ${MIND} … ${MAXD}, so rev × 10 cannot overflow. rev = ${prev} × 10 + ${digit} = ${rev}. Then x = ${x} / 10 = ${nx}.`,
      [tvars({ x: nx, digit, rev }, { x, rev: prev })],
      yn(`rev = ${prev}. Is it safe to multiply by 10?`, true, `${prev} lies between ${MIND} and ${MAXD}.`));
    x = nx;
  }
  r.frame(`x is 0, so all digits were pushed. Result: ${rev}.`, [tvars({ x: 0, answer: rev })]);
  return r.frames;
}
