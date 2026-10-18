import test from 'node:test';
import assert from 'node:assert/strict';
import { lastVar, subsetsBacktrackFrames, type Frame } from '../src/lib/dryrun.ts';
import * as f from '../src/data/backtracking/frames.ts';

// Deterministic PRNG so failures reproduce.
let seed = 41;
const rnd = (n: number) => { seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff; return seed % n; };
const arr = (len: number, max: number, min = 0) => Array.from({ length: len }, () => min + rnd(max - min + 1));
const ans = (frames: Frame[]) => lastVar(frames, 'answer')!;
const got = (frames: Frame[]) => JSON.parse(ans(frames));
const sorted = <T>(xs: T[]) => [...xs].sort();
const keys = (xs: number[][]) => xs.map(x => x.join(',')).sort();
const sortedKeys = (xs: number[][]) => xs.map(x => [...x].sort((a, b) => a - b).join(',')).sort();
const fact = (n: number): number => (n <= 1 ? 1 : n * fact(n - 1));

// ---- brute-force oracles (independent of the lesson's recursion) --------------------------------
const maskSubsets = <T>(a: T[]) => Array.from({ length: 1 << a.length }, (_, m) => a.filter((_, i) => m >> i & 1));
const dedupe = (xs: number[][]) => [...new Set(sortedKeys(xs))];
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

function multisetCombos(c: number[], target: number): string[] {   // count vector per distinct coin
  const d = [...new Set(c)].sort((a, b) => a - b), out: string[] = [], cnt = d.map(() => 0);
  const rec = (i: number, left: number) => {
    if (i === d.length) { if (left === 0) out.push(d.flatMap((v, j) => Array(cnt[j]).fill(v)).join(',')); return; }
    for (let k = 0; k * d[i] <= left; k++) { cnt[i] = k; rec(i + 1, left - k * d[i]); }
    cnt[i] = 0;
  };
  rec(0, target);
  return out.sort();
}
function allPerms(a: number[]): number[][] {
  let out: number[][] = [[]];
  for (const v of a) { const next: number[][] = []; for (const p of out) for (let i = 0; i <= p.length; i++) next.push([...p.slice(0, i), v, ...p.slice(i)]); out = next; }
  return out;
}
const pal = (s: string) => s === [...s].reverse().join('');
function bruteWord(b: string[][], w: string): boolean {   // explicit stack of (path) states, no marking and no recursion
  const stack: [number, number][][] = [];
  b.forEach((row, r) => row.forEach((ch, c) => { if (ch === w[0]) stack.push([[r, c]]); }));
  while (stack.length) {
    const p = stack.pop()!;
    if (p.length === w.length) return true;
    const [r, c] = p[p.length - 1];
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = r + dr, nc = c + dc;
      if (b[nr]?.[nc] === w[p.length] && !p.some(([pr, pc]) => pr === nr && pc === nc)) stack.push([...p, [nr, nc]]);
    }
  }
  return false;
}
function brutePartitions(s: string): string[] {
  const out: string[] = [];
  for (let m = 0; m < 1 << (s.length - 1); m++) {
    const parts: string[] = []; let from = 0;
    for (let i = 0; i < s.length; i++) if (i === s.length - 1 || (m >> i & 1)) { parts.push(s.slice(from, i + 1)); from = i + 1; }
    if (parts.every(pal)) out.push(JSON.stringify(parts));
  }
  return out.sort();
}
function bruteQueens(n: number): string[] {
  return allPerms(Array.from({ length: n }, (_, i) => i)).filter(p => p.every((c, r) => p.every((d, q) => q <= r || Math.abs(c - d) !== q - r))).map(p => p.join(',')).sort();
}
function bruteParens(n: number): string[] {
  const out: string[] = [];
  for (let m = 0; m < 1 << (2 * n); m++) {
    let s = '', d = 0, ok = true;
    for (let i = 0; i < 2 * n; i++) { const open = (m >> i & 1) === 1; s += open ? '(' : ')'; d += open ? 1 : -1; if (d < 0) ok = false; }
    if (ok && d === 0) out.push(s);
  }
  return out.sort();
}
function bruteIps(s: string): string[] {
  const out: string[] = [];
  for (let a = 1; a < s.length; a++) for (let b = a + 1; b < s.length; b++) for (let c = b + 1; c < s.length; c++) {
    const parts = [s.slice(0, a), s.slice(a, b), s.slice(b, c), s.slice(c)];
    if (parts.every(p => p.length <= 3 && (p === '0' || p[0] !== '0') && +p <= 255)) out.push(parts.join('.'));
  }
  return out.sort();
}
function bruteKPartition(a: number[], k: number): boolean {
  const total = sum(a);
  if (total % k) return false;
  for (let m = 0; m < k ** a.length; m++) {
    const sums = Array(k).fill(0); let x = m;
    for (const v of a) { sums[x % k] += v; x = Math.floor(x / k); }
    if (sums.every(s => s === total / k)) return true;
  }
  return false;
}

// ---- tests --------------------------------------------------------------------------------------
test('every frame has a caption and a view; predict answers are in range and options are distinct', () => {
  const all = [subsetsBacktrackFrames([1, 2, 3]), f.subsetsDupFrames([1, 2, 2]), f.combineFrames(4, 2), f.combinationSumFrames([2, 3, 6, 7], 7), f.letterFrames('23'),
    f.permuteFrames([1, 2, 3]), f.wordSearchFrames([['A', 'B'], ['A', 'A']], 'AAB'), f.palindromeFrames('aab'), f.queensFrames(4), f.combinationSum2Frames([2, 5, 2, 1, 2], 5),
    f.permuteUniqueFrames([1, 1, 2]), f.parenFrames(2), f.combinationSum3Frames(2, 5), f.restoreIpFrames('10203'), f.kPartitionFrames([2, 2, 2, 2, 3, 3], 2)];
  for (const frames of all) {
    assert.ok(frames.length >= 3);
    for (const fr of frames) {
      assert.ok(fr.caption.length > 10 && fr.views.length > 0);
      if (fr.predict) { assert.ok(fr.predict.answer >= 0 && fr.predict.answer < fr.predict.options.length); assert.equal(new Set(fr.predict.options).size, fr.predict.options.length); }
    }
    assert.notEqual(ans(frames), undefined);
  }
});

test('the recursion tree shows undone choices and pruned branches with a reason', () => {
  const frames = f.subsetsDupFrames([1, 2, 2]);
  const toneSeen = (tone: string) => frames.some(fr => fr.views.some(v => v.kind === 'recursion' && v.nodes.some(n => n.tone === tone)));
  assert.ok(toneSeen('undone') && toneSeen('pruned') && toneSeen('solution'));
  assert.ok(frames.some(fr => /^Un-choose /.test(fr.caption)) && frames.some(fr => /^Prune /.test(fr.caption)));
  const ids = new Set<string>();
  for (const fr of frames) for (const v of fr.views) if (v.kind === 'recursion') for (const n of v.nodes) { ids.add(n.id); if (n.parent) assert.ok(v.nodes.some(p => p.id === n.parent)); }
});

test('subsetsDupFrames vs mask enumeration of distinct multisets', () => {
  for (let t = 0; t < 300; t++) {
    const a = arr(rnd(7), 3, 1), g = got(f.subsetsDupFrames(a));
    assert.deepEqual(sortedKeys(g), dedupe(maskSubsets(a)), JSON.stringify(a));
    assert.equal(new Set(sortedKeys(g)).size, g.length, 'no duplicates');
  }
  assert.deepEqual(got(f.subsetsDupFrames([])), [[]]);
});

test('combineFrames vs mask enumeration of size-k subsets', () => {
  for (let n = 1; n <= 7; n++) for (let k = 1; k <= n; k++) {
    const nums = Array.from({ length: n }, (_, i) => i + 1);
    assert.deepEqual(keys(got(f.combineFrames(n, k))), keys(maskSubsets(nums).filter(s => s.length === k)), `${n},${k}`);
  }
});

test('combinationSumFrames vs count-vector enumeration', () => {
  for (let t = 0; t < 300; t++) {
    const c = [...new Set(arr(1 + rnd(4), 8, 1))], target = rnd(14) + 1;
    assert.deepEqual(keys(got(f.combinationSumFrames(c, target))), multisetCombos(c, target), JSON.stringify([c, target]));
  }
  assert.deepEqual(got(f.combinationSumFrames([2, 3, 6, 7], 7)), [[2, 2, 3], [7]]);
  assert.deepEqual(got(f.combinationSumFrames([5], 3)), []);
});

test('combinationSum2Frames: each coin at most once, distinct handfuls, vs mask enumeration', () => {
  for (let t = 0; t < 300; t++) {
    const c = arr(rnd(8), 6, 1), target = rnd(12) + 1;
    const want = dedupe(maskSubsets(c).filter(s => sum(s) === target));
    const g = got(f.combinationSum2Frames(c, target));
    assert.deepEqual(sortedKeys(g), want, JSON.stringify([c, target]));
    assert.equal(new Set(sortedKeys(g)).size, g.length);
  }
});

test('letterFrames vs Cartesian product; empty input gives no words', () => {
  const KEYS = ['', '', 'abc', 'def', 'ghi', 'jkl', 'mno', 'pqrs', 'tuv', 'wxyz'];
  for (let t = 0; t < 120; t++) {
    const d = Array.from({ length: 1 + rnd(3) }, () => 2 + rnd(8)).join('');
    const want = [...d].reduce<string[]>((acc, ch) => acc.flatMap(w => [...KEYS[+ch]].map(c => w + c)), ['']);
    assert.deepEqual(got(f.letterFrames(d)), want, d);
  }
  assert.deepEqual(got(f.letterFrames('')), []);
});

test('permuteFrames vs insertion-built permutations', () => {
  for (let n = 0; n <= 5; n++) {
    const a = Array.from({ length: n }, (_, i) => i + 1), g = got(f.permuteFrames(a));
    assert.equal(g.length, fact(n));
    assert.deepEqual(keys(g), keys(allPerms(a)));
  }
});

test('permuteUniqueFrames vs distinct insertion-built permutations', () => {
  for (let t = 0; t < 200; t++) {
    const a = arr(rnd(6), 2, 1), g = got(f.permuteUniqueFrames(a));
    assert.deepEqual(keys(g), [...new Set(keys(allPerms(a)))].sort(), JSON.stringify(a));
    assert.equal(new Set(keys(g)).size, g.length);
  }
  assert.deepEqual(got(f.permuteUniqueFrames([1, 1, 1, 1])), [[1, 1, 1, 1]]);
});

test('wordSearchFrames vs explicit-stack path search', () => {
  for (let t = 0; t < 400; t++) {
    const R = 1 + rnd(3), C = 1 + rnd(3), b = Array.from({ length: R }, () => Array.from({ length: C }, () => 'AB'[rnd(2)]));
    const w = Array.from({ length: 1 + rnd(5) }, () => 'AB'[rnd(2)]).join('');
    assert.equal(ans(f.wordSearchFrames(b, w)), String(bruteWord(b, w)), JSON.stringify([b, w]));
  }
  assert.equal(ans(f.wordSearchFrames([['A', 'B'], ['A', 'A']], 'AAB')), 'true');
  assert.equal(ans(f.wordSearchFrames([['A', 'B']], 'ABA')), 'false');
});

test('palindromeFrames vs every gap mask', () => {
  for (let t = 0; t < 200; t++) {
    const s = Array.from({ length: 1 + rnd(7) }, () => 'ab'[rnd(2)]).join('');
    assert.deepEqual(got(f.palindromeFrames(s)).map((x: string[]) => JSON.stringify(x)).sort(), brutePartitions(s), s);
  }
});

test('queensFrames vs permutation filter; counts 1, 0, 0, 2, 10, 4', () => {
  const counts = [1, 0, 0, 2, 10, 4];
  for (let n = 1; n <= 6; n++) {
    const g = got(f.queensFrames(n));
    assert.equal(g.length, counts[n - 1]);
    assert.deepEqual(keys(g), bruteQueens(n));
  }
});

test('parenFrames vs filter of every bit string', () => {
  for (let n = 1; n <= 5; n++) assert.deepEqual(sorted(got(f.parenFrames(n))), bruteParens(n), `n=${n}`);
});

test('combinationSum3Frames vs mask enumeration of 1..9', () => {
  const nine = Array.from({ length: 9 }, (_, i) => i + 1);
  for (let k = 1; k <= 5; k++) for (let n = 1; n <= 30; n++)
    assert.deepEqual(keys(got(f.combinationSum3Frames(k, n))), keys(maskSubsets(nine).filter(s => s.length === k && sum(s) === n)), `${k},${n}`);
});

test('restoreIpFrames vs every three-dot placement', () => {
  for (let t = 0; t < 400; t++) {
    const s = Array.from({ length: 4 + rnd(7) }, () => '0123'[rnd(4)] === '0' ? '0' : String(1 + rnd(9))).join('');
    assert.deepEqual(sorted(got(f.restoreIpFrames(s))), bruteIps(s), s);
  }
  assert.deepEqual(got(f.restoreIpFrames('0000')), ['0.0.0.0']);
  assert.deepEqual(got(f.restoreIpFrames('101023')).length, 5);
});

test('kPartitionFrames vs every bucket assignment', () => {
  for (let t = 0; t < 300; t++) {
    const a = arr(1 + rnd(6), 6, 1), k = 1 + rnd(3);
    assert.equal(ans(f.kPartitionFrames(a, k)), String(bruteKPartition(a, k)), JSON.stringify([a, k]));
  }
  assert.equal(ans(f.kPartitionFrames([2, 2, 2, 2, 3, 3], 2)), 'true');
  assert.equal(ans(f.kPartitionFrames([2, 2, 3, 5], 2)), 'false');
});
