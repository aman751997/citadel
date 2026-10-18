import test from 'node:test';
import assert from 'node:assert/strict';
import { lastVar, type Frame } from '../src/lib/dryrun.ts';
import * as f from '../src/data/binary-search/frames.ts';

// Deterministic PRNG so failures reproduce.
let seed = 77;
const rnd = (n: number) => { seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff; return seed % n; };
const arr = (len: number, max: number, min = 0) => Array.from({ length: len }, () => min + rnd(max - min + 1));
const sorted = (len: number, max: number, min = 0) => arr(len, max, min).sort((a, b) => a - b);
const ans = (frames: Frame[]) => lastVar(frames, 'answer')!;
const hours = (piles: number[], k: number) => piles.reduce((t, p) => { let h = 0; for (let left = p; left > 0; left -= k) h++; return t + h; }, 0);
const groupsAt = (a: number[], cap: number) => { let g = 1, load = 0; for (const w of a) { if (load + w > cap) { g++; load = 0; } load += w; } return g; };

test('every frame has a caption and a view; predict answers are in range; pointers stay on the strip', () => {
  const all = [f.searchFrames([-1, 0, 3, 5, 9, 12], 9), f.rangeFrames([5, 7, 7, 8, 8, 10], 8), f.matrixFrames([[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], 3),
    f.rotatedMinFrames([4, 5, 6, 7, 0, 1, 2]), f.rotatedSearchFrames([4, 5, 6, 7, 0, 1, 2], 0), f.rotatedSearchFrames([1, 1, 1, 1, 1, 2, 1, 1], 2),
    f.speedFrames([3, 6, 7, 11], 8), f.shipFrames([3, 2, 2, 4, 1, 4], 3), f.splitFrames([7, 2, 5, 10, 8], 2), f.timeMapFrames([1, 4, 7, 10], ['dim', 'bright', 'off', 'bright'], 8),
    f.medianFrames([1, 3, 8, 9, 15], [7, 11, 18, 19, 21, 25]), f.insertPositionFrames([1, 3, 5, 6], 7), f.peakFrames([1, 2, 1, 3, 5, 6, 4]), f.sqrtFrames(8),
    f.maxDistanceFrames([1, 2, 3, 4, 7], 3), f.kthFrames([[1, 5, 9], [10, 11, 13], [12, 13, 15]], 8), f.closedFrames([-1, 0, 3, 5, 9, 12], 9),
    f.midRoundingFrames([2, 4, 6, 8], 6, 'down'), f.midRoundingFrames([2, 4, 6, 8], 6, 'up')];
  for (const frames of all) {
    assert.ok(frames.length >= 2 && ans(frames) !== undefined);
    for (const fr of frames) {
      assert.ok(fr.caption.length > 10 && fr.views.length > 0);
      for (const v of fr.views) if (v.kind === 'array') for (const p of v.pointers ?? []) assert.ok(p.at >= 0 && p.at < v.values.length, `${fr.caption} pointer ${p.label}`);
      if (fr.predict) { assert.ok(fr.predict.answer >= 0 && fr.predict.answer < fr.predict.options.length); assert.equal(new Set(fr.predict.options).size, fr.predict.options.length); }
    }
  }
});

test('searchFrames returns the first copy or -1 (indexOf)', () => {
  for (let t = 0; t < 600; t++) {
    const a = sorted(rnd(9), 8), target = rnd(10) - 1;
    assert.equal(ans(f.searchFrames(a, target)), String(a.indexOf(target)), JSON.stringify([a, target]));
  }
  assert.equal(ans(f.searchFrames([], 3)), '-1');
});

test('rangeFrames matches indexOf / lastIndexOf, including empty and all-equal arrays', () => {
  for (let t = 0; t < 600; t++) {
    const a = sorted(rnd(10), 5), target = rnd(7) - 1;
    assert.equal(ans(f.rangeFrames(a, target)), JSON.stringify([a.indexOf(target), a.lastIndexOf(target)]), JSON.stringify([a, target]));
  }
  assert.equal(ans(f.rangeFrames([2, 2, 2, 2], 2)), '[0,3]');
  assert.equal(ans(f.rangeFrames([], 2)), '[-1,-1]');
});

test('matrixFrames matches includes on the flattened grid', () => {
  for (let t = 0; t < 400; t++) {
    const rows = 1 + rnd(4), cols = 1 + rnd(4), flat = sorted(rows * cols, 30), target = rnd(32);
    const grid = Array.from({ length: rows }, (_, r) => flat.slice(r * cols, r * cols + cols));
    assert.equal(ans(f.matrixFrames(grid, target)), String(flat.includes(target)), JSON.stringify([grid, target]));
  }
});

const rotate = (a: number[]) => { const k = rnd(a.length); return [...a.slice(k), ...a.slice(0, k)]; };
const distinctSorted = (len: number) => { const s = new Set<number>(); while (s.size < len) s.add(rnd(40)); return [...s].sort((a, b) => a - b); };

test('rotatedMinFrames equals Math.min on rotated distinct arrays (including unrotated)', () => {
  for (let t = 0; t < 500; t++) {
    const a = rotate(distinctSorted(1 + rnd(8)));
    assert.equal(ans(f.rotatedMinFrames(a)), String(Math.min(...a)), JSON.stringify(a));
  }
  assert.equal(ans(f.rotatedMinFrames([1, 2, 3])), '1');
});

test('rotatedSearchFrames matches indexOf on distinct rotated arrays', () => {
  for (let t = 0; t < 600; t++) {
    const a = rotate(distinctSorted(1 + rnd(8))), target = rnd(42);
    assert.equal(ans(f.rotatedSearchFrames(a, target)), String(a.indexOf(target)), JSON.stringify([a, target]));
  }
});

test('rotatedSearchFrames with repeats finds a copy exactly when the target exists', () => {
  for (let t = 0; t < 800; t++) {
    const a = rotate(sorted(1 + rnd(9), 4)), target = rnd(6);
    const got = Number(ans(f.rotatedSearchFrames(a, target)));
    if (a.includes(target)) assert.equal(a[got], target, JSON.stringify([a, target])); else assert.equal(got, -1);
  }
  assert.equal(ans(f.rotatedSearchFrames([1, 1, 1, 1, 1, 2, 1, 1], 2)), '5');
});

test('speedFrames is the slowest speed that finishes in time', () => {
  for (let t = 0; t < 300; t++) {
    const piles = arr(1 + rnd(5), 12, 1), h = piles.length + rnd(12);
    let k = 1; while (hours(piles, k) > h) k++;
    assert.equal(ans(f.speedFrames(piles, h)), String(k), JSON.stringify([piles, h]));
  }
  assert.equal(ans(f.speedFrames([3, 6, 7, 11], 8)), '4');
});

test('shipFrames and splitFrames find the smallest feasible capacity (linear scan)', () => {
  for (let t = 0; t < 300; t++) {
    const w = arr(1 + rnd(7), 9, 1), g = 1 + rnd(w.length);
    let cap = Math.max(...w); while (groupsAt(w, cap) > g) cap++;
    assert.equal(ans(f.shipFrames(w, g)), String(cap), JSON.stringify([w, g]));
    assert.equal(ans(f.splitFrames(w, g)), String(cap));
  }
  assert.equal(ans(f.shipFrames([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5)), '15');
  assert.equal(ans(f.splitFrames([7, 2, 5, 10, 8], 2)), '18');
});

test('timeMapFrames returns the latest value at or before t, or empty', () => {
  for (let t = 0; t < 400; t++) {
    const times = [...new Set(arr(rnd(7), 20, 1))].sort((a, b) => a - b), values = times.map((_, i) => `v${i}`), q = rnd(24);
    let want = '(empty)'; times.forEach((x, i) => { if (x <= q) want = values[i]; });
    assert.equal(ans(f.timeMapFrames(times, values, q)), want, JSON.stringify([times, q]));
  }
});

test('insertPositionFrames counts the smaller values', () => {
  for (let t = 0; t < 400; t++) {
    const a = sorted(rnd(9), 8), target = rnd(11) - 1;
    assert.equal(ans(f.insertPositionFrames(a, target)), String(a.filter(v => v < target).length), JSON.stringify([a, target]));
  }
  assert.equal(ans(f.insertPositionFrames([1, 3, 5, 6], 7)), '4'); assert.equal(ans(f.insertPositionFrames([1, 3, 5, 6], 0)), '0');
});

test('peakFrames returns an index higher than both neighbours', () => {
  for (let t = 0; t < 500; t++) {
    const a: number[] = []; const len = 1 + rnd(9);
    while (a.length < len) { const v = rnd(12); if (!a.length || a[a.length - 1] !== v) a.push(v); }
    const i = Number(ans(f.peakFrames(a)));
    assert.ok(i >= 0 && i < a.length && (i === 0 || a[i] > a[i - 1]) && (i === a.length - 1 || a[i] > a[i + 1]), JSON.stringify([a, i]));
  }
});

test('sqrtFrames equals floor(sqrt(x)) by linear scan', () => {
  for (let x = 0; x <= 150; x++) { let k = 0; while ((k + 1) * (k + 1) <= x) k++; assert.equal(ans(f.sqrtFrames(x)), String(k), `x=${x}`); }
});

test('maxDistanceFrames equals the best minimum gap over every subset of stalls', () => {
  for (let t = 0; t < 200; t++) {
    const pos = [...new Set(arr(2 + rnd(5), 20))].sort((a, b) => a - b); if (pos.length < 2) continue;
    const m = 2 + rnd(pos.length - 1);
    let best = 0;
    for (let mask = 0; mask < 1 << pos.length; mask++) {
      const pick = pos.filter((_, i) => mask >> i & 1);
      if (pick.length !== m) continue;
      best = Math.max(best, Math.min(...pick.slice(1).map((x, i) => x - pick[i])));
    }
    const shuffled = [...pos].reverse();
    assert.equal(ans(f.maxDistanceFrames(shuffled, m)), String(best), JSON.stringify([pos, m]));
  }
  assert.equal(ans(f.maxDistanceFrames([1, 2, 3, 4, 7], 3)), '3');
});

test('kthFrames equals the k-th element of the sorted flattening', () => {
  for (let t = 0; t < 200; t++) {
    const n = 1 + rnd(4), grid = Array.from({ length: n }, () => Array(n).fill(0));
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) grid[r][c] = Math.max(r ? grid[r - 1][c] : 1, c ? grid[r][c - 1] : 1) + rnd(4);
    const k = 1 + rnd(n * n);
    assert.equal(ans(f.kthFrames(grid, k)), String(grid.flat().sort((a, b) => a - b)[k - 1]), JSON.stringify([grid, k]));
  }
  assert.equal(ans(f.kthFrames([[1, 5, 9], [10, 11, 13], [12, 13, 15]], 8)), '13');
});

test('medianFrames equals merge-and-pick, including empty lists and even totals', () => {
  for (let t = 0; t < 600; t++) {
    const a = sorted(rnd(7), 9), b = sorted(rnd(7), 9);
    if (!a.length && !b.length) continue;
    const all = [...a, ...b].sort((x, y) => x - y), n = all.length;
    const want = n % 2 ? all[(n - 1) / 2] : (all[n / 2 - 1] + all[n / 2]) / 2;
    assert.equal(ans(f.medianFrames(a, b)), String(want), JSON.stringify([a, b]));
  }
  assert.equal(ans(f.medianFrames([1, 2], [3, 4])), '2.5');
  assert.equal(ans(f.medianFrames([], [3])), '3');
  assert.equal(ans(f.medianFrames([1, 3, 8, 9, 15], [7, 11, 18, 19, 21, 25])), '11');
});

test('closedFrames equals indexOf on distinct values', () => {
  for (let t = 0; t < 400; t++) {
    const a = distinctSorted(rnd(9)), target = rnd(42);
    assert.equal(ans(f.closedFrames(a, target)), String(a.indexOf(target)), JSON.stringify([a, target]));
  }
});

test('midRoundingFrames: rounding up finds the last value <= target; rounding down stalls on [2,4,6,8]', () => {
  for (let t = 0; t < 500; t++) {
    const a = sorted(1 + rnd(9), 9), target = rnd(11) - 1;
    const want = a.reduce((last, v, i) => (v <= target ? i : last), -1);
    assert.equal(ans(f.midRoundingFrames(a, target, 'up')), String(want), JSON.stringify([a, target]));
  }
  assert.equal(ans(f.midRoundingFrames([2, 4, 6, 8], 6, 'down')), 'infinite loop');
  assert.equal(ans(f.midRoundingFrames([2, 4, 6, 8], 6, 'up')), '2');
  // Independent stall oracle for the rounded-down form.
  for (let t = 0; t < 300; t++) {
    const a = sorted(1 + rnd(9), 9), target = rnd(11) - 1;
    let lo = 0, hi = a.length - 1, stalled = false;
    for (let g = 0; lo < hi; g++) {
      const mid = lo + Math.floor((hi - lo) / 2), [pl, ph] = [lo, hi];
      if (a[mid] <= target) lo = mid; else hi = mid - 1;
      if (lo === pl && hi === ph) { stalled = true; break; }
    }
    assert.equal(ans(f.midRoundingFrames(a, target, 'down')) === 'infinite loop', stalled, JSON.stringify([a, target]));
  }
});
