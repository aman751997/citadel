import test from 'node:test';
import assert from 'node:assert/strict';
import { solveLab } from '../src/lib/lab.ts';
import { answerMatches } from '../src/lib/review.ts';
import { lab, fromInput, type BitState } from '../src/lib/labs/bit-manipulation.ts';
import { twos, operators, single, missing, popcount, countingBits, reverse, masks, clock, sieve, mixedReview } from '../src/data/bit-manipulation/traces.ts';
import { hints } from '../src/data/bit-manipulation/hints.ts';
import { practice, conceptIds } from '../src/data/practice/bit-manipulation.ts';

// ---------- independent helpers: binary STRINGS and BigInt, never the bitwise shortcuts under test ----------
const MAX = 2147483647, MIN = -2147483648, TWO32 = 4294967296;
const bin32 = (x: number) => { let u = x; if (u < 0) u += TWO32; return u.toString(2).padStart(32, '0'); };   // x in int range
const bin8 = (x: number) => x.toString(2).padStart(8, '0');                                                   // x in 0..255
const fromBin = (s: string) => parseInt(s, 2);
const toSigned = (u: number) => (u > MAX ? u - TWO32 : u);
const ones = (x: number) => [...bin32(x)].filter(c => c === '1').length;
const ones8 = (x: number) => [...bin8(x)].filter(c => c === '1').length;
const flipStr = (s: string) => [...s].map(c => (c === '1' ? '0' : '1')).join('');
const reverseUnsigned = (x: number) => fromBin([...bin32(x)].reverse().join(''));
const bytes = (x: number) => bin32(x).match(/.{8}/g)!;
const wrap = (big: bigint) => Number(BigInt.asIntN(32, big));                                                  // Java int arithmetic
const javaShr = (x: number, s: number) => Math.floor(x / 2 ** s);                                              // >> rounds toward −∞
const javaUshr = (x: number, s: number) => Math.floor((x < 0 ? x + TWO32 : x) / 2 ** s);
const isPrime = (n: number) => { if (n < 2) return false; for (let d = 2; d * d <= n; d++) if (n % d === 0) return false; return true; };
const cells = (r: { cells: { value: string }[] }) => r.cells.map(c => c.value);
const correct = (s: { answer: number; choices: { label: string }[] }) => s.choices[s.answer].label;
const label = (s: { choices: { label: string }[] }, i: number) => s.choices[i].label;
const oddOne = (a: number[]) => a.find(x => a.filter(y => y === x).length % 2 === 1)!;

test('every trace step has a valid answer and feedback for each choice', () => {
  for (const steps of [twos, operators, single, missing, popcount, countingBits, reverse, masks, clock, sieve, mixedReview]) for (const s of steps) {
    assert.ok(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length);
    for (const c of s.choices) assert.ok(c.feedback.length > 20, c.label);
  }
});

test('helpers agree with each other on a few known patterns', () => {
  assert.equal(bin32(-1), '1'.repeat(32));
  assert.equal(bin32(MIN), '1' + '0'.repeat(31));
  assert.equal(ones(-8), 29);
  assert.equal(reverseUnsigned(43261596), 964176192);       // LeetCode's example
  assert.equal(javaShr(-7, 1), -4); assert.equal(Math.trunc(-7 / 2), -3);
  assert.equal(javaUshr(-8, 1), 2147483644);
});

test('chapter 1 (two’s complement) trace numbers', () => {
  assert.deepEqual(cells(twos[0].rows[0]), bytes(5));
  assert.equal(bin32(-5), (TWO32 - 5).toString(2));
  assert.equal(toSigned(fromBin(bin32(-5))), -5);
  assert.equal(correct(twos[0]), bytes(-5).join(' '));
  assert.equal(label(twos[0], 2), flipStr(bin32(5)).match(/.{8}/g)!.join(' '));    // ~5
  assert.equal(toSigned(fromBin(flipStr(bin32(5)))), -6);
  assert.equal(label(twos[0], 0), ('1' + bin32(5).slice(1)).match(/.{8}/g)!.join(' '));
  assert.deepEqual(cells(twos[1].rows[0]), bytes(MAX));
  assert.equal(wrap(BigInt(MAX) + 1n), MIN);
  assert.match(correct(twos[1]), /−2147483648/);
  assert.deepEqual(cells(twos[2].rows[0]), bytes(MIN));
  assert.equal(wrap(-BigInt(MIN)), MIN);
  assert.match(correct(twos[2]), /−2147483648/);
  // −x == ~x + 1 on samples across the range, using strings for ~
  for (const x of [0, 1, 5, -5, 123456789, MAX, MIN, -1]) assert.equal(wrap(BigInt(toSigned(fromBin(flipStr(bin32(x))))) + 1n), wrap(-BigInt(x)));
});

test('chapter 2 (operators) trace numbers', () => {
  assert.deepEqual(cells(operators[0].rows[0]), bytes(-8));
  assert.equal(ones(-8), 29);
  let n = -8; const seen: number[] = [];
  for (let k = 0; k < 100 && n !== 0; k++) { seen.push(n); n = javaShr(n, 1); }
  assert.notEqual(n, 0, 'the >> loop never reaches 0');
  assert.deepEqual(seen.slice(0, 5), [-8, -4, -2, -1, -1]);
  assert.match(correct(operators[0]), /−8, −4, −2, −1, −1/);
  let u = -8, rounds = 0, count = 0;
  while (u !== 0) { count += u % 2 === 0 ? 0 : 1; u = javaUshr(u, 1); rounds++; }
  assert.equal(rounds, 32); assert.equal(count, 29);
  assert.equal(correct(operators[1]), '32');
  // x & (x − 1) and x & −x, by strings
  const x = 88;
  assert.equal(bin8(x), '01011000'); assert.equal(bin8(x - 1), '01010111');
  const and = (a: string, b: string) => [...a].map((c, i) => (c === '1' && b[i] === '1' ? '1' : '0')).join('');
  assert.equal(and(bin8(88), bin8(87)), '01010000'); assert.equal(fromBin('01010000'), 80);
  assert.equal(correct(operators[2]), '01010000 (80)');
  assert.equal(and(bin32(88), bin32(-88)).slice(24), '00001000');
  assert.equal(label(operators[2], 2), '00001000 (8)');
  assert.deepEqual(cells(operators[2].rows[1]), [...bin8(88)]);
  assert.deepEqual(cells(operators[2].rows[2]), [...bin8(87)]);
  assert.equal(correct(operators[3]), '(x & (1 << 3)) != 0');
});

test('chapters 3–4 (single, missing) trace numbers', () => {
  const a = [4, 1, 2, 1, 2];
  assert.deepEqual(cells(single[0].rows[0]).map(Number), a);
  assert.equal(4 ^ 1 ^ 2, 7); assert.equal(7 ^ 1, 6); assert.equal(6, 4 ^ 2); assert.equal(7 | 1, 7);
  assert.deepEqual(cells(single[0].rows[2]), [...bin8(7)]);
  assert.equal(6 ^ 2, 4); assert.equal(oddOne(a), 4);
  assert.equal(oddOne([1, 2, 4, 2, 1]), 4);
  // missing: [4, 0, 1, 3], n = 4
  const nums = [4, 0, 1, 3];
  assert.equal(nums.reduce((p, q) => p ^ q, 0), 6);
  assert.equal(0 ^ 1 ^ 2 ^ 3, 0);
  assert.match(label(missing[0], 1), /= 6$/);
  assert.equal(4 ^ 0 ^ 6, 2);
  assert.equal([0, 1, 2, 3, 4].find(v => !nums.includes(v)), 2);
  assert.match(correct(missing[0]), /= 2$/);
  assert.ok(50000 * 50001 > MAX); assert.equal(50000 * 50001, 2_500_050_000);
  assert.equal(50000 * 50001 / 2, 1_250_025_000); assert.ok(1_250_025_000 <= MAX);
  assert.ok(wrap(50000n * 50001n) < 0);
  assert.equal((50000 * 50001) % 2, 0);
});

test('chapter 5 (popcount) trace numbers', () => {
  assert.equal(bin8(12), '00001100'); assert.equal(bin8(11), '00001011');
  assert.equal(fromBin('00001000'), 8);
  assert.match(correct(popcount[0]), /00001000 \(8\)/);
  assert.equal(Math.floor(12 / 2), 6);
  assert.equal(ones(-1), 32);
  // Kernighan rounds on −1 and MIN, simulated with BigInt (unsigned 32-bit)
  const kernighan = (x: number) => { let u = BigInt(x < 0 ? x + TWO32 : x), r = 0; while (u) { u &= u - 1n; r++; } return r; };
  assert.equal(kernighan(-1), 32); assert.equal(kernighan(MIN), 1);
  assert.equal(correct(popcount[1]), '32');
  let u = MIN, rounds = 0; while (u !== 0) { u = javaUshr(u, 1); rounds++; }
  assert.equal(rounds, 32);
  assert.match(correct(popcount[2]), /takes 32; the clearing loop takes 1/);
  assert.equal(wrap(BigInt(MIN) & BigInt(MAX)), 0);
});

test('chapter 6 (counting bits) trace numbers', () => {
  const bits = Array.from({ length: 13 }, (_, i) => ones(i));
  assert.deepEqual(cells(countingBits[0].rows[1]).map(Number), bits.slice(0, 8));
  assert.equal(bits[8], 1); assert.equal(bits[7] + 1, 4); assert.equal(bits[4], 1);
  assert.match(correct(countingBits[0]), /bits\[4\] \+ 0 = 1/);
  assert.equal(12 & 11, 8); assert.equal(bits[8] + 1, bits[12]); assert.equal(bits[12], 2);
  assert.equal(bits[11] + 1, 4); assert.equal(bits[6] + 1, 3);
  assert.deepEqual(cells(countingBits[2].rows[1]).map(Number), [bits[6], bits[8], bits[11], bits[12]]);
  for (let i = 1; i < 2000; i++) {
    assert.equal(ones(i), ones(Math.floor(i / 2)) + (i % 2));
    assert.equal(ones(i), ones(fromBin(bin32(i).replace(/1(0*)$/, '0$1'))) + 1);   // i & (i − 1) by strings
  }
});

test('chapter 7 (reverse bits) trace numbers', () => {
  // buggy: stop when n == 0, logical shift, on n = 1
  let n = 1, r = 0; while (n !== 0) { r = r * 2 + (n % 2); n = javaUshr(n, 1); }
  assert.equal(r, 1);
  assert.equal(toSigned(reverseUnsigned(1)), MIN);
  assert.match(correct(reverse[0]), /returns 1/);
  // take, then shift, 32 rounds, as Java ints
  let res = 0n; n = 1;
  for (let k = 0; k < 32; k++) { res = BigInt.asIntN(32, res | BigInt(n % 2)); res = BigInt.asIntN(32, res << 1n); n = javaUshr(n, 1); }
  assert.equal(Number(res), 0);
  // exactly 32 rounds with the SIGNED shift on 0xF0000000: still the right answer
  let m = toSigned(0xf0000000); res = 0n;
  for (let k = 0; k < 32; k++) { res = BigInt.asIntN(32, (res << 1n) | BigInt(((m % 2) + 2) % 2)); m = javaShr(m, 1); }
  assert.equal(Number(res), 15); assert.equal(reverseUnsigned(toSigned(0xf0000000)), 15);
  assert.match(correct(reverse[2]), /^Yes, by luck/);
  // ... and the same holds for random ints: the fixed loop never reads a copied sign lantern
  let seed = 5; const rnd = () => { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; return toSigned(seed); };
  for (let t = 0; t < 300; t++) {
    let x = rnd(), acc = 0n; const x0 = x;
    for (let k = 0; k < 32; k++) { acc = BigInt.asIntN(32, (acc << 1n) | BigInt(((x % 2) + 2) % 2)); x = javaShr(x, 1); }
    assert.equal(Number(acc), toSigned(reverseUnsigned(x0)));
  }
});

test('chapter 8 (masks) trace numbers', () => {
  const nums = [3, 5, 9];
  const subset = (mask: number) => nums.filter((_, i) => bin32(mask)[31 - i] === '1');
  assert.deepEqual(subset(6), [5, 9]);
  assert.equal(correct(masks[0]), '{5, 9}');
  assert.deepEqual(cells(masks[0].rows[1]), [...bin32(6).slice(29)]);
  assert.equal(2 ** 3, 8);
  assert.equal(fromBin('1101'), 13);
  assert.equal(fromBin(bin32(13).slice(0, 29) + '0' + bin32(13).slice(30)), 9);   // clear lantern 2 by string
  assert.match(correct(masks[2]), /= 9 \(1001\)/);
  assert.equal(13 - 2, 11); assert.equal(bin8(11).slice(4), '1011');
  assert.deepEqual([0, 1, 2, 3].filter(i => bin8(11)[7 - i] === '1'), [0, 1, 3]);
  assert.equal(13 & 4, 4);
});

test('chapters 9–10 (clock, sieve) trace numbers', () => {
  assert.equal(48 % 18, 12); assert.equal(18 % 12, 6); assert.equal(12 % 6, 0);
  let g = 0; for (let d = 1; d <= 18; d++) if (48 % d === 0 && 18 % d === 0) g = d;
  assert.equal(g, 6);
  assert.equal(-7 % 3, -1);                      // JS % has Java's sign rule
  assert.equal(((-7 % 3) + 3) % 3, 2);
  assert.equal(correct(clock[1]), '−1');
  assert.equal(3 ** 13, 1594323); assert.equal(3 ** 13 % 1000, 323);
  assert.equal(fromBin('1101'), 13); assert.equal(1 + 4 + 8, 13); assert.equal(3 ** 1 * 3 ** 2 * 3 ** 4 * 3 ** 8, 3 ** 15);
  assert.ok(1_000_000_007 < 2 ** 30); assert.ok((2 ** 30) ** 2 === 2 ** 60 && 2 ** 60 < 2 ** 63);
  // sieve
  const crossed = [4, 6, 8, 9, 10];
  for (let k = 2; k <= 10; k++) assert.equal(crossed.includes(k), !isPrime(k) && (k % 2 === 0 || k % 3 === 0));
  assert.deepEqual(cells(sieve[0].rows[0]).map(Number), [2, 3, 4, 5, 6, 7, 8, 9, 10]);
  for (const m of [10, 15, 20]) assert.ok(m % 2 === 0 || m % 3 === 0);
  let primes = 0; for (let k = 0; k < 30; k++) if (isPrime(k)) primes++;
  assert.equal(primes, 10);
  assert.ok(isPrime(46349));
  for (let p = 46341; p < 46349; p++) assert.ok(!isPrime(p));
  assert.ok(46340 * 46340 <= MAX && 46341 * 46341 > MAX);
  assert.equal(46349 * 46349, 2_148_229_801);
  assert.equal(wrap(46349n * 46349n), -2_146_737_495);
  assert.match(correct(sieve[1]), /2,148,229,801/);
});

test('mixed review numbers', () => {
  assert.equal(2 ^ 2 ^ 3 ^ 2, 1);
  assert.equal(javaShr(-1, 1), -1); assert.equal(javaShr(-8, 1), -4); assert.equal(javaUshr(-8, 1), 2147483644);
  assert.equal(2 ** 12, 4096);
  assert.ok(46340 * 46341 <= MAX && 46341 * 46342 > MAX);
  assert.equal(wrap(0n & -1n), 0); assert.equal(wrap(BigInt(MIN) & BigInt(MAX)), 0);
  assert.equal(ones(MIN), 1);
});

test('every hint ladder referenced by the lesson exists with three hints', async () => {
  const { readFileSync } = await import('node:fs');
  const mdx = readFileSync(new URL('../src/dsa-lessons/bit-manipulation.mdx', import.meta.url), 'utf8');
  const used = [...mdx.matchAll(/hints=\{hints\.(\w+)\}/g)].map(m => m[1]);
  assert.ok(used.length >= 15);
  for (const key of used) assert.equal(hints[key]?.length, 3, key);
  for (const key of Object.keys(hints)) assert.ok(used.includes(key), `unused hint ${key}`);
  // every trace exported is used
  for (const name of ['twos', 'operators', 'single', 'missing', 'popcount', 'countingBits', 'reverse', 'masks', 'clock', 'sieve', 'mixedReview'])
    assert.match(mdx, new RegExp(`steps=\\{${name}\\}`), name);
});

// ---------- lab ----------
type Oracle = (start: BitState, final: BitState) => void;
const oracles: Record<string, Oracle> = {
  fold: (s, f) => assert.equal(f.acc, oddOne(s.a)),
  clear: (s, f) => { assert.equal(f.count, ones8(s.start)); assert.equal(f.x, 0); },
  reverse: (s, f) => { assert.equal(f.result, fromBin([...bin8(s.n)].reverse().join(''))); assert.equal(f.round, 8); },
};
function runCase(start: BitState) {
  const { final, wrongMovesChangedBoard, steps } = solveLab(lab, start, 400);
  assert.equal(final.done, true, `${start.mode} must terminate`);
  assert.equal(wrongMovesChangedBoard, false, `${start.mode}: a wrong move changed the board`);
  oracles[start.mode](start, final);
  return { final, steps };
}

test('every lab mode and case terminates with the right result; wrong moves never change the board', () => {
  for (const [mode, info] of Object.entries(lab.modes)) {
    assert.ok(info.cases >= 3 && info.cases <= 4);
    for (let v = 0; v < info.cases; v++) runCase(lab.create(mode, v));
  }
  // the reverse drill always takes 8 × 3 moves plus finish, whatever the input
  for (let v = 0; v < lab.modes.reverse.cases; v++) assert.equal(runCase(lab.create('reverse', v)).steps, 25);
  // the clearing drill takes one move per lit lantern plus finish
  for (let v = 0; v < lab.modes.clear.cases; v++) { const s = lab.create('clear', v); assert.equal(runCase(s).steps, ones8(s.start) + 1); }
});

test('every rejected move on every reachable state explains itself with real numbers', () => {
  for (const [mode, info] of Object.entries(lab.modes)) for (let v = 0; v < info.cases; v++) {
    let state = lab.create(mode, v);
    for (let guard = 0; guard < 200; guard++) {
      for (const { action } of info.actions) {
        const result = lab.move(state, action);
        if (!result.accepted && !state.done) {
          assert.doesNotMatch(result.state.message, /undefined|NaN|\[object/, `${mode} case ${v}: ${action}`);
          assert.ok(result.state.message.length > 15, `${mode} case ${v}: ${action} needs an explanation`);
        }
      }
      for (const text of [lab.describe(state), ...lab.view(state).flatMap(r => [r.name, ...r.cells.map(c => `${c.value} ${c.label ?? ''}`)])])
        assert.doesNotMatch(text, /undefined|NaN/, `${mode} case ${v}`);
      if (state.done) break;
      state = lab.move(state, lab.expected(state)).state;
      assert.doesNotMatch(state.message, /undefined|NaN/);
    }
    assert.equal(state.done, true);
  }
});

test('lab agrees with brute force on random small inputs', () => {
  let seed = 41; const rnd = (n: number) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
  for (let t = 0; t < 150; t++) {
    const pairs = Array.from({ length: rnd(4) }, () => rnd(256));
    const loner = rnd(256);
    const list = [...pairs, loner, ...pairs];
    for (let i = list.length - 1; i > 0; i--) { const j = rnd(i + 1); [list[i], list[j]] = [list[j], list[i]]; }
    runCase({ ...lab.create('fold'), ...fromInput({ mode: 'fold', a: list }) });
    runCase({ ...lab.create('clear'), ...fromInput({ mode: 'clear', x: rnd(256) }) });
    runCase({ ...lab.create('reverse'), ...fromInput({ mode: 'reverse', n: rnd(256) }) });
  }
});

test('the lab catches the classic mistakes with the board numbers', () => {
  // fold: OR and + can't cancel
  const fold = lab.create('fold', 0);                                      // [4, 1, 2, 1, 2]
  let s = fold; for (let k = 0; k < 3; k++) s = lab.move(s, 'fold').state;  // acc = 7, next 1
  assert.equal(s.acc, 7);
  assert.match(lab.move(s, 'or').state.message, /7 \| 1 = 7/);
  assert.match(lab.move(s, 'add').state.message, /7 \+ 1 = 8/);
  assert.match(lab.move(s, 'add').state.message, /7 \^ 1 = 6/);
  // clear: x − 1 lights the lanterns below; x & −x keeps only the lowest
  const clear = lab.create('clear', 0);                                    // 01011000
  assert.match(lab.move(clear, 'minus').state.message, /x − 1 = 01010111/);
  assert.match(lab.move(clear, 'isolate').state.message, /x & −x = 00001000/);
  assert.match(lab.move(lab.create('clear', 3), 'isolate').state.message, /never end/);   // 10000000
  // reverse: stopping when rest is dark loses the trailing zeros
  let r = lab.create('reverse', 1);                                        // 00000001
  for (const act of ['room', 'take', 'slide']) r = lab.move(r, act).state;
  assert.equal(r.rest, 0);
  const early = lab.move(r, 'finish');
  assert.equal(early.accepted, false);
  assert.match(early.state.message, /returns 00000001 = 1 instead of 10000000 = 128/);
  // reverse: the signed crank on a row whose top lantern is lit
  let top = lab.create('reverse', 0);                                      // 10110000
  top = lab.move(lab.move(top, 'room').state, 'take').state;
  assert.match(lab.move(top, 'signed').state.message, /rest would become 11011000 instead of 01011000/);
});

// ---------- practice ----------
const ints = (text: string) => [...text.matchAll(/-?\d+/g)].map(m => Number(m[0]));
function lists(prompt: string) { return [...prompt.matchAll(/\[([^\]]*)\]/g)].map(m => m[1].trim() === '' ? [] : m[1].split(',').map(Number)); }
function num(prompt: string, re: RegExp) { const m = prompt.match(re); assert.ok(m, `${re} in ${prompt}`); return Number(m![1]); }

test('every practice answer matches an independent computation from the prompt', () => {
  assert.equal(practice.storageKey, 'citadel-bit-manipulation-review-v1');
  assert.ok(conceptIds.length >= 10);
  assert.ok(Object.keys(practice.strategies).includes('other'));
  const strategiesUsed = new Set<string>();
  const sections = new Set<string>();
  for (const id of practice.conceptIds) {
    const prompts = new Set<string>();
    for (let variant = 0; variant <= 20; variant++) {
      const c = practice.challengeFor(id, variant);
      prompts.add(c.prompt);
      strategiesUsed.add(c.strategy);
      sections.add(c.section);
      assert.ok(c.strategy in practice.strategies, `${id}: unknown strategy`);
      assert.doesNotMatch(c.prompt, /xor|kernighan|sieve|euclid|bitmask|two['’]s complement|popcount|lowest set bit|state machine|hash/i, `${id}: the prompt must not name the technique`);
      const a = lists(c.prompt)[0] ?? [];
      let expected: number | number[] | boolean;
      switch (id) {
        case 'twos': expected = ones(num(c.prompt, /value (-?\d+)\./)); break;
        case 'shifts': {
          const n = num(c.prompt, /int n = (-?\d+)\./), s = num(c.prompt, /n >> (\d+) and/);
          expected = [javaShr(n, s), javaUshr(n, s)]; break;
        }
        case 'single': case 'single-ii': {
          const k = id === 'single' ? 2 : 3;
          const counts = new Map<number, number>(); for (const x of a) counts.set(x, (counts.get(x) ?? 0) + 1);
          const once = [...counts].filter(([, n]) => n === 1).map(([x]) => x);
          assert.equal(once.length, 1); assert.ok([...counts].every(([, n]) => n === 1 || n === k));
          expected = once[0]; break;
        }
        case 'single-iii': {
          const counts = new Map<number, number>(); for (const x of a) counts.set(x, (counts.get(x) ?? 0) + 1);
          assert.ok([...counts].every(([, n]) => n === 1 || n === 2));
          expected = [...counts].filter(([, n]) => n === 1).map(([x]) => x).sort((x, y) => x - y);
          assert.equal((expected as number[]).length, 2); break;
        }
        case 'missing': {
          const n = num(c.prompt, /from 0 to (\d+)\./);
          assert.equal(a.length, n); assert.equal(new Set(a).size, n);
          expected = Array.from({ length: n + 1 }, (_, i) => i).find(i => !a.includes(i))!; break;
        }
        case 'popcount': expected = ones(num(c.prompt, /Java int (-?\d+)\?/)); break;
        case 'counting-bits': { const n = num(c.prompt, /from 0 to (\d+),/); expected = Array.from({ length: n + 1 }, (_, i) => ones(i)); break; }
        case 'reverse-bits': expected = reverseUnsigned(num(c.prompt, /Write (\d+) as/)); break;
        case 'subsets': {
          const t = num(c.prompt, /exactly (\d+)\?/);
          let count = 0;
          const go = (i: number, sum: number) => { if (i === a.length) { if (sum === t) count++; return; } go(i + 1, sum); go(i + 1, sum + a[i]); };
          go(0, 0); expected = count; break;
        }
        case 'gcd': {
          const [x, y] = ints(c.prompt.match(/both (\d+) and (\d+)/)![0]);
          let best = 0; for (let d = 1; d <= Math.max(x, y); d++) if (x % d === 0 && y % d === 0) best = d;
          expected = best; break;
        }
        case 'mod-pow': {
          const m = c.prompt.match(/when (\d+)\^(\d+) is divided by (\d+)/)!;
          expected = Number(BigInt(m[1]) ** BigInt(m[2]) % BigInt(m[3])); break;
        }
        case 'primes': { const n = num(c.prompt, /less than (\d+)\?/); let k = 0; for (let i = 0; i < n; i++) if (isPrime(i)) k++; expected = k; break; }
        case 'no-plus': {
          const m = c.prompt.match(/Adding (\d+) and (\d+)/)!;
          // independent: binary strings, column by column
          let x = bin32(Number(m[1])), y = bin32(Number(m[2])), rounds = 0;
          while (y.includes('1')) {
            const sum = [...x].map((ch, i) => (ch !== y[i] ? '1' : '0')).join('');
            const both = [...x].map((ch, i) => (ch === '1' && y[i] === '1' ? '1' : '0')).join('');
            x = sum; y = both.slice(1) + '0'; rounds++;
          }
          assert.equal(fromBin(x), Number(m[1]) + Number(m[2]));
          expected = rounds; break;
        }
        case 'power': {
          const x = num(c.prompt, /Java int (-?\d+) a power/);
          const base = /power of four/.test(c.prompt) ? 4 : 2;
          let ok = false; for (let p = 1; p <= MAX; p *= base) if (p === x) ok = true;
          expected = ok; break;
        }
        case 'hamming': {
          const m = c.prompt.match(/ints (-?\d+) and (-?\d+)\./)!;
          const p = bin32(Number(m[1])), q = bin32(Number(m[2]));
          expected = [...p].filter((ch, i) => ch !== q[i]).length; break;
        }
        case 'reverse-int': {
          const x = num(c.prompt, /32-bit int (-?\d+), keeping/);
          const r = BigInt((x < 0 ? '-' : '') + String(Math.abs(x)).split('').reverse().join(''));
          expected = r > BigInt(MAX) || r < BigInt(MIN) ? 0 : Number(r); break;
        }
        case 'duplicate': {
          const twice = a.filter(x => a.filter(y => y === x).length === 2);
          assert.equal(new Set(twice).size, 1); assert.equal(a.length - new Set(a).size, 1);
          expected = twice[0]; break;
        }
        default: throw new Error(`untested concept ${id}`);
      }
      assert.deepEqual(c.answer, expected, `${id} variant ${variant}`);
      const typed = typeof expected === 'boolean' ? (expected ? 'yes' : 'no') : JSON.stringify(expected);
      assert.equal(answerMatches(c, typed), true, `${id} variant ${variant}: ${typed}`);
      assert.equal(answerMatches(c, 'not an answer'), false);
      assert.equal(c.hints.length, 3); assert.equal(c.rubric.length, 3);
      assert.doesNotMatch(JSON.stringify(c), /undefined|NaN/);
    }
    assert.ok(prompts.size >= 2, `${id}: the input must vary with the variant`);
  }
  assert.ok(strategiesUsed.size >= 6);
  // every chapter and side quest has at least one practice concept
  for (const section of ['twos-complement', 'operators', 'single-number', 'missing-number', 'number-of-1-bits', 'counting-bits', 'reverse-bits', 'bitmask-sets', 'clock-arithmetic', 'sieve',
    'single-number-ii', 'single-number-iii', 'sum-without-plus', 'power-of-two', 'hamming-distance', 'reverse-integer', 'choose-the-tool'])
    assert.ok(sections.has(section), `no practice for ${section}`);
});
