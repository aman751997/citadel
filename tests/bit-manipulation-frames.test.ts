import test from 'node:test';
import assert from 'node:assert/strict';
import { lastVar, type Frame } from '../src/lib/dryrun.ts';
import * as f from '../src/data/bit-manipulation/frames.ts';

// Deterministic PRNG so failures reproduce.
let seed = 31;
const rnd = (n: number) => { seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff; return seed % n; };
const MIN = -2147483648, MAX = 2147483647, TWO32 = 4294967296;
const EDGES = [0, 1, -1, 2, -2, 5, -5, 7, 8, 12, 88, 255, 256, 65535, 65536, 1 << 30, MAX, MIN, MAX - 1, MIN + 1, -8, 0x55555555, -1431655766];
const anyInt = () => (rnd(3) === 0 ? EDGES[rnd(EDGES.length)] : rnd(5) === 0 ? rnd(300) : (rnd(65536) * 65536 + rnd(65536)) | 0);
const ans = (frames: Frame[]) => lastVar(frames, 'answer')!;

// Oracles: BigInt and binary strings, never the bitwise shortcuts the generators use.
const wrap = (b: bigint) => Number(BigInt.asIntN(32, b));
const bin32 = (x: number) => (x < 0 ? x + TWO32 : x).toString(2).padStart(32, '0');
const fromBin = (s: string) => Number(BigInt.asIntN(32, BigInt('0b' + s)));
const ones = (x: number) => [...bin32(x)].filter(c => c === '1').length;
const flipStr = (s: string) => [...s].map(c => (c === '1' ? '0' : '1')).join('');
const oddOne = (a: number[]) => a.find(x => a.filter(y => y === x).length % 2 === 1)!;
const isPrime = (n: number) => { if (n < 2) return false; for (let d = 2; d * d <= n; d++) if (n % d === 0) return false; return true; };

test('every generator frame has a caption and a view; predict answers are in range with unique options', () => {
  const all = [f.negateFrames(5), f.negateFrames(MIN), f.shiftFrames(-8, 1), f.lowestBitFrames(88), f.lowestBitFrames(0), f.bitOpsFrames(88, 3), f.singleNumberFrames([4, 1, 2, 1, 2]),
    f.missingNumberFrames([4, 0, 1, 3]), f.popcountFrames(88), f.countingBitsFrames(8), f.reverseBitsFrames(22, 8), f.subsetsMaskFrames([3, 5, 9]), f.gcdFrames(48, 18),
    f.modPowFrames(3, 13, 1000007), f.sieveFrames(30), f.singleNumberIIFrames([2, 2, 3, 2]), f.singleNumberIICountFrames([2, 2, 3, 2]), f.singleNumberIIIFrames([1, 2, 1, 3, 2, 5]),
    f.getSumFrames(5, 7), f.powerOfTwoFrames(16), f.hammingFrames(1, 4), f.totalHammingFrames([4, 14, 2]), f.reverseIntegerFrames(-123)];
  for (const frames of all) {
    assert.ok(frames.length >= 2);
    for (const fr of frames) {
      assert.ok(fr.caption.length > 10 && fr.views.length > 0);
      if (fr.predict) {
        assert.ok(fr.predict.answer >= 0 && fr.predict.answer < fr.predict.options.length);
        assert.equal(new Set(fr.predict.options).size, fr.predict.options.length);
      }
      for (const v of fr.views) if (v.kind === 'grid') {
        assert.ok(v.cells.every(row => row.length === v.cells[0].length));
        for (const t of v.tones || []) assert.ok(t.r < v.cells.length && t.c >= 0 && t.c < v.cells[0].length, `tone out of grid: ${JSON.stringify(t)}`);
      }
    }
  }
});

test('grid rows are the true 32-bit patterns (negative numbers and MIN_VALUE included)', () => {
  for (const x of [5, -5, -1, MIN, MAX, 0]) {
    const g = f.negateFrames(x)[0].views[0];
    assert.equal(g.kind, 'grid');
    if (g.kind === 'grid') assert.equal(g.cells[0].join(''), bin32(x));
  }
});

test('negateFrames: answer is -x wrapped to an int, MIN_VALUE maps to itself', () => {
  for (const x of [...EDGES, ...Array.from({ length: 300 }, anyInt)]) {
    const expected = fromBin(flipStr(bin32(x)));                   // ~x via string
    const neg = wrap(-BigInt(x));
    assert.equal(ans(f.negateFrames(x)), String(neg), String(x));
    assert.equal(wrap(BigInt(expected) + 1n), neg);                 // -x == ~x + 1, checked on strings
  }
  assert.equal(ans(f.negateFrames(MIN)), String(MIN));
});

test('shiftFrames: >>, >>> and << match floor division and BigInt arithmetic for every shift distance', () => {
  for (let t = 0; t < 600; t++) {
    const x = anyInt(), k = rnd(32);
    const sar = Math.floor(x / 2 ** k);
    const u = x < 0 ? x + TWO32 : x;
    const shr = wrap(BigInt(Math.floor(u / 2 ** k)));
    const shl = wrap(BigInt(x) * 2n ** BigInt(k));
    assert.equal(ans(f.shiftFrames(x, k)), JSON.stringify([sar, shr, shl]), `${x} ${k}`);
  }
  assert.equal(ans(f.shiftFrames(-7, 1)), JSON.stringify([-4, 2147483644, -14]));
  assert.equal(ans(f.shiftFrames(MIN, 31)), JSON.stringify([-1, 1, 0]));
});

test('lowestBitFrames: [x & (x-1), x & -x] match a string-based search for the lowest set bit', () => {
  for (const x of [...EDGES, ...Array.from({ length: 400 }, anyInt)]) {
    const s = bin32(x), pos = s.lastIndexOf('1');           // lowest set bit (rightmost 1)
    const low = pos < 0 ? 0 : fromBin('0'.repeat(pos) + '1' + '0'.repeat(31 - pos));
    const drop = pos < 0 ? 0 : fromBin(s.slice(0, pos) + '0' + s.slice(pos + 1));
    assert.equal(ans(f.lowestBitFrames(x)), JSON.stringify([drop, low]), String(x));
  }
});

test('bitOpsFrames: test, set, clear and flip bit i match string edits, including bit 31', () => {
  for (let t = 0; t < 400; t++) {
    const x = anyInt(), i = rnd(3) === 0 ? 31 : rnd(32), s = bin32(x), at = 31 - i;
    const edit = (c: string) => fromBin(s.slice(0, at) + c + s.slice(at + 1));
    const tested = s[at] === '1' ? 1 : 0, flip = edit(s[at] === '1' ? '0' : '1');
    assert.equal(ans(f.bitOpsFrames(x, i)), JSON.stringify([tested, edit('1'), edit('0'), flip]), `${x} bit ${i}`);
  }
});

test('singleNumberFrames: finds the odd-count value, negatives and MIN_VALUE included', () => {
  for (let t = 0; t < 400; t++) {
    const pool = new Set<number>(); while (pool.size < 1 + rnd(5)) pool.add(anyInt());
    const [single, ...pairs] = [...pool];
    const a = [single, ...pairs, ...pairs];
    for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    assert.equal(ans(f.singleNumberFrames(a)), String(oddOne(a)), JSON.stringify(a));
    assert.equal(oddOne(a), single);
  }
  assert.equal(ans(f.singleNumberFrames([MIN])), String(MIN));
  assert.equal(ans(f.singleNumberFrames([4, 1, 2, 1, 2])), '4');
});

test('missingNumberFrames: the gap in a shuffled 0..n', () => {
  for (let t = 0; t < 300; t++) {
    const n = rnd(40), full = Array.from({ length: n + 1 }, (_, i) => i), gap = rnd(n + 1);
    const a = full.filter(v => v !== gap);
    for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    assert.equal(ans(f.missingNumberFrames(a)), String(gap), `${JSON.stringify(a)}`);
  }
  assert.equal(ans(f.missingNumberFrames([])), '0');
  assert.equal(ans(f.missingNumberFrames([0, 1, 2])), '3');
});

test('popcountFrames: counts set bits of any 32-bit pattern; the number of rounds equals the count', () => {
  for (const x of [...EDGES, ...Array.from({ length: 300 }, anyInt)]) {
    const frames = f.popcountFrames(x);
    assert.equal(ans(frames), String(ones(x)), String(x));
    assert.equal(frames.length, ones(x) + 2);
  }
  assert.equal(ans(f.popcountFrames(-1)), '32');
  assert.equal(ans(f.popcountFrames(MIN)), '1');
});

test('countingBitsFrames: every entry equals a direct count', () => {
  for (let n = 0; n <= 70; n++) assert.equal(ans(f.countingBitsFrames(n)), JSON.stringify(Array.from({ length: n + 1 }, (_, i) => ones(i))), String(n));
  assert.equal(ans(f.countingBitsFrames(300)), JSON.stringify(Array.from({ length: 301 }, (_, i) => ones(i))));
});

test('reverseBitsFrames: mirrors all 32 bits (negative inputs, 1, MIN_VALUE) and any narrower width', () => {
  for (const x of [...EDGES, 43261596, -3, ...Array.from({ length: 200 }, anyInt)]) {
    const expected = fromBin([...bin32(x)].reverse().join(''));
    assert.equal(ans(f.reverseBitsFrames(x)), String(expected), String(x));
  }
  assert.equal(ans(f.reverseBitsFrames(1)), String(MIN));
  assert.equal(ans(f.reverseBitsFrames(MIN)), '1');
  assert.equal(ans(f.reverseBitsFrames(43261596)), '964176192');
  for (let x = 0; x < 256; x++) assert.equal(ans(f.reverseBitsFrames(x, 8)), String(parseInt(x.toString(2).padStart(8, '0').split('').reverse().join(''), 2)), String(x));
});

test('subsetsMaskFrames: 2^n distinct subsets, each a real subset, in mask order', () => {
  for (let n = 0; n <= 4; n++) {
    const nums = Array.from({ length: n }, (_, i) => 10 + 3 * i);
    const got = JSON.parse(ans(f.subsetsMaskFrames(nums))) as number[][];
    assert.equal(got.length, 2 ** n);
    assert.equal(new Set(got.map(s => s.join(','))).size, 2 ** n);
    const rec = (i: number): number[][] => (i === n ? [[]] : rec(i + 1).flatMap(s => [s, [nums[i], ...s]]));
    assert.deepEqual(got.map(s => s.join(',')).sort(), rec(0).map(s => s.join(',')).sort());
    for (const s of got) assert.ok(s.every(v => nums.includes(v)));
  }
  assert.deepEqual(JSON.parse(ans(f.subsetsMaskFrames([3, 5, 9]))), [[], [3], [5], [3, 5], [9], [3, 9], [5, 9], [3, 5, 9]]);
});

test('gcdFrames matches a divisor search', () => {
  for (let t = 0; t < 400; t++) {
    const a = rnd(200), b = rnd(200);
    let g = 0; for (let d = 1; d <= Math.max(a, b); d++) if (a % d === 0 && b % d === 0) g = d;
    assert.equal(ans(f.gcdFrames(a, b)), String(a === 0 && b === 0 ? 0 : g), `${a} ${b}`);
  }
  assert.equal(ans(f.gcdFrames(48, 18)), '6');
});

test('modPowFrames matches repeated multiplication, including mod 1, exp 0 and negative-free big moduli', () => {
  for (let t = 0; t < 300; t++) {
    const base = rnd(50), exp = rnd(40), mod = [1, 2, 7, 1000000007, 2147483647][rnd(5)];
    let expect = 1n % BigInt(mod); for (let k = 0; k < exp; k++) expect = (expect * BigInt(base)) % BigInt(mod);
    assert.equal(ans(f.modPowFrames(base, exp, mod)), String(expect), `${base}^${exp} mod ${mod}`);
  }
  assert.equal(ans(f.modPowFrames(3, 13, 1000)), String(1594323 % 1000));
  assert.equal(ans(f.modPowFrames(999999999, 5, 1000000007)), String(((999999999n ** 5n) % 1000000007n)));
});

test('sieveFrames: count of primes strictly below n', () => {
  for (let n = 0; n <= 120; n++) {
    let c = 0; for (let k = 2; k < n; k++) if (isPrime(k)) c++;
    assert.equal(ans(f.sieveFrames(n)), String(c), `n=${n}`);
  }
});

test('singleNumberIIFrames and the per-bit count version both find the value that is not tripled', () => {
  for (let t = 0; t < 300; t++) {
    const vals = new Set<number>(); while (vals.size < 1 + rnd(4)) vals.add(anyInt());
    const triples = [...vals], single = anyInt();
    if (vals.has(single)) continue;
    const a = [...triples, ...triples, ...triples, single];
    for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    assert.equal(ans(f.singleNumberIIFrames(a)), String(single), JSON.stringify(a));
    assert.equal(ans(f.singleNumberIICountFrames(a)), String(single), JSON.stringify(a));
  }
  assert.equal(ans(f.singleNumberIIFrames([2, 2, 3, 2])), '3');
  assert.equal(ans(f.singleNumberIICountFrames([MIN, MIN, MIN, -1])), '-1');
  assert.equal(ans(f.singleNumberIIFrames([-1, MIN, MIN, MIN])), '-1');
});

test('singleNumberIIIFrames: the two values that appear once, in ascending order', () => {
  for (let t = 0; t < 300; t++) {
    const pool = new Set<number>(); while (pool.size < 2 + rnd(4)) pool.add(anyInt());
    const vals = [...pool], twoSingles = vals.slice(0, 2), pairs = vals.slice(2);
    const a = [...twoSingles, ...pairs, ...pairs];
    for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    assert.equal(ans(f.singleNumberIIIFrames(a)), JSON.stringify([...twoSingles].sort((x, y) => x - y)), JSON.stringify(a));
  }
  // the split bit is the sign bit: -both overflows for MIN_VALUE
  assert.equal(ans(f.singleNumberIIIFrames([MIN, 0, 5, 5])), JSON.stringify([MIN, 0]));
  assert.equal(ans(f.singleNumberIIIFrames([1, 2, 1, 3, 2, 5])), JSON.stringify([3, 5]));
});

test('getSumFrames equals Java int addition including overflow and negatives', () => {
  for (let t = 0; t < 600; t++) {
    const a = anyInt(), b = anyInt(), frames = f.getSumFrames(a, b);
    assert.equal(ans(frames), String(wrap(BigInt(a) + BigInt(b))), `${a} + ${b}`);
    assert.ok(frames.length <= 34);                           // at most 32 rounds plus the intro and the final frame
  }
  assert.equal(ans(f.getSumFrames(-1, 1)), '0');
  assert.equal(ans(f.getSumFrames(MAX, 1)), String(MIN));
  assert.equal(ans(f.getSumFrames(5, 7)), '12');
});

test('powerOfTwoFrames: [power of two, power of four] against an exact list of powers, rejecting 0 and MIN_VALUE', () => {
  const twos = new Set(Array.from({ length: 31 }, (_, k) => 2 ** k)), fours = new Set(Array.from({ length: 16 }, (_, k) => 4 ** k));
  const check = (n: number) => assert.equal(ans(f.powerOfTwoFrames(n)), JSON.stringify([twos.has(n), fours.has(n)]), String(n));
  for (const n of [...EDGES, 4, 16, 64, 1024, 2, 8, 32, 3, 6, 24, 1 << 30, 2 ** 30 / 2]) check(n);
  for (let t = 0; t < 300; t++) check(anyInt());
  for (let k = 0; k < 31; k++) check(2 ** k);
  assert.equal(ans(f.powerOfTwoFrames(0)), '[false,false]');
  assert.equal(ans(f.powerOfTwoFrames(MIN)), '[false,false]');
});

test('hammingFrames and totalHammingFrames match string comparison and a pair loop', () => {
  for (let t = 0; t < 400; t++) {
    const x = anyInt(), y = anyInt(), sx = bin32(x), sy = bin32(y);
    assert.equal(ans(f.hammingFrames(x, y)), String([...sx].filter((c, i) => c !== sy[i]).length), `${x} ${y}`);
  }
  for (let t = 0; t < 150; t++) {
    const a = Array.from({ length: 1 + rnd(6) }, () => (rnd(4) === 0 ? anyInt() : rnd(40)));
    let total = 0;
    for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) total += [...bin32(a[i])].filter((c, k) => c !== bin32(a[j])[k]).length;
    assert.equal(ans(f.totalHammingFrames(a)), String(total), JSON.stringify(a));
  }
  assert.equal(ans(f.hammingFrames(1, 4)), '2');
  assert.equal(ans(f.totalHammingFrames([4, 14, 2])), '6');
});

test('reverseIntegerFrames: reversed digits, or 0 when the result leaves the int range', () => {
  const oracle = (x: number) => {
    const neg = x < 0, digits = (neg ? -BigInt(x) : BigInt(x)).toString().split('').reverse().join('');
    const v = neg ? -BigInt(digits) : BigInt(digits);
    return v > BigInt(MAX) || v < BigInt(MIN) ? 0 : Number(v);
  };
  for (const x of [...EDGES, 123, -123, 120, 1534236469, 1463847412, 2147483647, -2147483648, -1563847412, 1000000003, 900000009]) assert.equal(ans(f.reverseIntegerFrames(x)), String(oracle(x)), String(x));
  for (let t = 0; t < 500; t++) { const x = anyInt(); assert.equal(ans(f.reverseIntegerFrames(x)), String(oracle(x)), String(x)); }
});
