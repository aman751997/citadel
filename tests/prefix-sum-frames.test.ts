import test from 'node:test';
import assert from 'node:assert/strict';
import { lastVar } from '../src/lib/dryrun.ts';
import type { Frame } from '../src/lib/dryrun.ts';
import { renderFrame } from '../src/lib/dryrun-render.ts';
import * as f from '../src/data/prefix-sum/dryruns.ts';

// Deterministic PRNG so failures reproduce.
let seed = 7;
const rnd = (n: number) => { seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff; return (seed >>> 8) % n; };
const run = (n: number, body: (t: number) => void) => { for (let t = 0; t < n; t++) body(t); };
const arr = (len: number, lo: number, hi: number) => Array.from({ length: len }, () => lo + rnd(hi - lo + 1));
const J = (x: unknown) => JSON.stringify(x);
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

function wellFormed(frames: Frame[], label: string) {
  assert.ok(frames.length >= 1, label);
  for (const fr of frames) {
    assert.ok(fr.caption.trim().length > 0, `${label}: empty caption`);
    assert.ok(fr.views.length > 0, `${label}: no views`);
    for (const text of [fr.caption, renderFrame(fr), fr.predict ? J(fr.predict) : '']) {
      assert.ok(!/undefined|NaN|Infinity/.test(text), `${label}: bad text in frame "${fr.caption}"`);
    }
    if (fr.predict) {
      const p = fr.predict;
      assert.ok(p.options.length >= 2, `${label}: <2 options for "${p.question}"`);
      assert.ok(Number.isInteger(p.answer) && p.answer >= 0 && p.answer < p.options.length, `${label}: answer index ${p.answer} for "${p.question}"`);
      assert.equal(new Set(p.options).size, p.options.length, `${label}: duplicate options for "${p.question}"`);
    }
  }
}
const answer = (frames: Frame[], label: string) => { wellFormed(frames, label); return lastVar(frames, 'answer')!; };
// Every frame that carries an `answer` var, in order (one per query).
const allAnswers = (frames: Frame[]) => frames.flatMap(fr => fr.views.flatMap(v => (v.kind === 'text' ? v.vars.filter(x => x.name === 'answer').map(x => String(x.value)) : [])));
// Values of the final frame's array view with the given name (used by generators whose result is an array).
const finalArray = (frames: Frame[], name: string) => {
  const v = frames[frames.length - 1].views.find(x => x.kind === 'array' && x.name === name);
  assert.ok(v && v.kind === 'array', `no array view ${name}`);
  return v.values.map(Number);
};
const norm = (a: number[]) => a.map(x => x + 0); // -0 -> 0
const queries = (n: number): [number, number][] => Array.from({ length: 1 + rnd(3) }, () => { const l = rnd(n), r = l + rnd(n - l); return [l, r]; });

test('rangeSumFrames: every query answer equals the direct slice sum (negatives, single element)', () => {
  run(300, () => {
    const a = arr(1 + rnd(8), -6, 9), q = queries(a.length);
    wellFormed(f.rangeSumFrames(a, q), J([a, q]));
    assert.deepEqual(allAnswers(f.rangeSumFrames(a, q)), q.map(([l, r]) => String(sum(a.slice(l, r + 1)))), J([a, q]));
  });
  assert.deepEqual(allAnswers(f.rangeSumFrames([5], [[0, 0]])), ['5']);
  assert.deepEqual(allAnswers(f.rangeSumFrames([3, 3, 3, 3], [[0, 3], [1, 2]])), ['12', '6']);
});

test('pivotFrames vs leftmost balanced index scan', () => {
  run(400, () => {
    const a = arr(rnd(9), -3, 4);
    let exp = -1;
    for (let i = 0; i < a.length && exp < 0; i++) if (sum(a.slice(0, i)) === sum(a.slice(i + 1))) exp = i;
    assert.equal(answer(f.pivotFrames(a), J(a)), String(exp), J(a));
  });
  assert.equal(answer(f.pivotFrames([]), 'empty'), '-1');
  assert.equal(answer(f.pivotFrames([7]), 'single'), '0');
  assert.equal(answer(f.pivotFrames([0, 0, 0]), 'all equal: leftmost wins'), '0');
  assert.equal(answer(f.pivotFrames([1, 7, 3, 6, 5, 6]), 'LeetCode 724'), '3');
});

test('productFrames vs product-of-others (zeros, negatives, single)', () => {
  run(300, () => {
    const a = arr(1 + rnd(6), -3, 4);
    const exp = a.map((_, i) => a.reduce((p, x, j) => (i === j ? p : p * x), 1));
    const frames = f.productFrames(a);
    wellFormed(frames, J(a));
    assert.deepEqual(norm(finalArray(frames, 'answer')), norm(exp), J(a));
  });
  assert.deepEqual(finalArray(f.productFrames([4]), 'answer'), [1]);
  assert.deepEqual(norm(finalArray(f.productFrames([2, 2, 2, 2]), 'answer')), [8, 8, 8, 8]);
});

test('countKFrames vs all-subarrays count (negatives, zeros)', () => {
  run(400, () => {
    const a = arr(rnd(9), -3, 4), k = rnd(9) - 3;
    let exp = 0;
    for (let i = 0; i < a.length; i++) for (let j = i; j < a.length; j++) if (sum(a.slice(i, j + 1)) === k) exp++;
    assert.equal(answer(f.countKFrames(a, k), J([a, k])), String(exp), J([a, k]));
  });
  assert.equal(answer(f.countKFrames([], 0), 'empty'), '0');
  assert.equal(answer(f.countKFrames([0, 0, 0], 0), 'all zeros'), '6');
  assert.equal(answer(f.countKFrames([1, 1, 1], 2), 'LeetCode 560'), '2');
});

test('multipleKFrames vs brute force (non-negative nums, length >= 2)', () => {
  run(400, () => {
    const a = arr(rnd(8), 0, 9), k = 1 + rnd(7);
    let exp = false;
    for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) if (sum(a.slice(i, j + 1)) % k === 0) exp = true;
    assert.equal(answer(f.multipleKFrames(a, k), J([a, k])), String(exp), J([a, k]));
  });
  assert.equal(answer(f.multipleKFrames([], 3), 'empty'), 'false');
  assert.equal(answer(f.multipleKFrames([6], 6), 'single element is too short'), 'false');
  assert.equal(answer(f.multipleKFrames([0, 0], 5), 'two zeros'), 'true');
  assert.equal(answer(f.multipleKFrames([23, 2, 4, 6, 7], 6), 'LeetCode 523'), 'true');
});

test('equalZerosOnesFrames vs longest balanced subarray scan', () => {
  run(400, () => {
    const a = arr(rnd(10), 0, 1);
    let best = 0;
    for (let i = 0; i < a.length; i++) for (let j = i; j < a.length; j++) { const w = a.slice(i, j + 1); if (w.filter(x => x === 1).length * 2 === w.length) best = Math.max(best, w.length); }
    assert.equal(answer(f.equalZerosOnesFrames(a), J(a)), String(best), J(a));
  });
  assert.equal(answer(f.equalZerosOnesFrames([]), 'empty'), '0');
  assert.equal(answer(f.equalZerosOnesFrames([1]), 'single'), '0');
  assert.equal(answer(f.equalZerosOnesFrames([1, 1, 1, 1]), 'all equal'), '0');
  assert.equal(answer(f.equalZerosOnesFrames([0, 1]), 'pair'), '2');
});

test('divisibleFrames vs brute force (negatives, k = 1 included)', () => {
  run(400, () => {
    const a = arr(rnd(9), -7, 9), k = 1 + rnd(6);
    let exp = 0;
    for (let i = 0; i < a.length; i++) for (let j = i; j < a.length; j++) if (sum(a.slice(i, j + 1)) % k === 0) exp++;
    assert.equal(answer(f.divisibleFrames(a, k), J([a, k])), String(exp), J([a, k]));
  });
  assert.equal(answer(f.divisibleFrames([], 5), 'empty'), '0');
  assert.equal(answer(f.divisibleFrames([4, 5, 0, -2, -3, 1], 5), 'LeetCode 974'), '7');
  assert.equal(answer(f.divisibleFrames([5, 5], 1), 'k = 1: everything divisible'), '3');
});

test('niceFrames vs brute force count of exactly k odd numbers', () => {
  run(400, () => {
    const a = arr(rnd(9), -4, 6), k = rnd(4);
    let exp = 0;
    for (let i = 0; i < a.length; i++) for (let j = i; j < a.length; j++) if (a.slice(i, j + 1).filter(x => Math.abs(x) % 2 === 1).length === k) exp++;
    assert.equal(answer(f.niceFrames(a, k), J([a, k])), String(exp), J([a, k]));
  });
  assert.equal(answer(f.niceFrames([], 1), 'empty'), '0');
  assert.equal(answer(f.niceFrames([2, 2, 2], 1), 'no odd numbers'), '0');
  assert.equal(answer(f.niceFrames([1, 1, 1], 1), 'all odd'), '3');
});

test('xorFrames: every query answer equals the direct slice XOR', () => {
  run(300, () => {
    const a = arr(1 + rnd(8), 0, 31), q = queries(a.length);
    wellFormed(f.xorFrames(a, q), J([a, q]));
    assert.deepEqual(allAnswers(f.xorFrames(a, q)), q.map(([l, r]) => String(a.slice(l, r + 1).reduce((x, y) => x ^ y, 0))), J([a, q]));
  });
  assert.deepEqual(allAnswers(f.xorFrames([9], [[0, 0]])), ['9']);
  assert.deepEqual(allAnswers(f.xorFrames([5, 5, 5, 5], [[0, 3], [0, 2]])), ['0', '5']);
});

test('gridFrames vs direct block sum (negatives, 1x1, single row/column)', () => {
  run(300, () => {
    const R = 1 + rnd(4), C = 1 + rnd(4), m = Array.from({ length: R }, () => arr(C, -5, 9));
    const r1 = rnd(R), r2 = r1 + rnd(R - r1), c1 = rnd(C), c2 = c1 + rnd(C - c1);
    let exp = 0; for (let i = r1; i <= r2; i++) for (let j = c1; j <= c2; j++) exp += m[i][j];
    assert.equal(answer(f.gridFrames(m, [r1, c1, r2, c2]), J([m, r1, c1, r2, c2])), String(exp), J([m, r1, c1, r2, c2]));
  });
  assert.equal(answer(f.gridFrames([[-4]], [0, 0, 0, 0]), '1x1'), '-4');
  assert.equal(answer(f.gridFrames([[2, 2], [2, 2]], [0, 0, 1, 1]), 'all equal'), '8');
});

test('rangeUpdatesFrames vs per-flight accumulation (LeetCode 1109 shape, 1-indexed)', () => {
  run(300, () => {
    const n = 1 + rnd(7), b: [number, number, number][] = Array.from({ length: rnd(5) }, () => { const l = 1 + rnd(n), r = l + rnd(n - l + 1); return [l, r, 1 + rnd(9)]; });
    const exp = Array(n).fill(0);
    for (const [l, r, v] of b) for (let i = l; i <= r; i++) exp[i - 1] += v;
    const frames = f.rangeUpdatesFrames(n, b);
    wellFormed(frames, J([n, b]));
    assert.deepEqual(finalArray(frames, 'answer'), exp, J([n, b]));
  });
  assert.deepEqual(finalArray(f.rangeUpdatesFrames(3, []), 'answer'), [0, 0, 0]);
  assert.deepEqual(finalArray(f.rangeUpdatesFrames(1, [[1, 1, 5], [1, 1, 5]]), 'answer'), [10]);
  assert.deepEqual(finalArray(f.rangeUpdatesFrames(5, [[1, 2, 10], [2, 3, 20], [2, 5, 25]]), 'answer'), [10, 55, 45, 25, 25]);
});
