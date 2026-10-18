import test from 'node:test';
import assert from 'node:assert/strict';
import { lastVar, type Frame } from '../src/lib/dryrun.ts';
import * as f from '../src/data/heaps/frames.ts';

let seed = 41;
const rnd = (n: number) => { seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff; return seed % n; };
const arr = (len: number, max: number, min = 0) => Array.from({ length: len }, () => min + rnd(max - min + 1));
const ans = (frames: Frame[]) => lastVar(frames, 'answer')!;
const asc = (a: number[]) => [...a].sort((x, y) => x - y);
const desc = (a: number[]) => [...a].sort((x, y) => y - x);
const isMinHeap = (h: number[]) => h.every((v, i) => i === 0 || h[(i - 1) >> 1] <= v);
const heapOf = (a: number[]) => { const h: number[] = []; for (const x of a) { h.push(x); let i = h.length - 1; while (i > 0 && h[(i - 1) >> 1] > h[i]) { const p = (i - 1) >> 1; [h[p], h[i]] = [h[i], h[p]]; i = p; } } return h; };
const median = (a: number[]) => { const s = asc(a), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };

test('every frame has a caption and a view; predict answers are in range with distinct options', () => {
  const all = [f.siftUpFrames([1, 3, 2, 7, 4, 5, 8], 0), f.siftDownFrames([1, 2, 3, 4, 5, 6, 7]), f.kthLargestFrames([3, 2, 1, 5, 6, 4], 2), f.topKFrequentFrames([1, 1, 1, 2, 2, 3], 2),
    f.kClosestFrames([[3, 3], [5, -1], [-2, 4]], 2), f.medianFrames([5, 2, 8, 1, 9, 4]), f.windowMedianFrames([3, 5, 6, 1, 4], 3), f.mergeKFrames([[1, 4, 5], [1, 3, 4], [2, 6]]),
    f.taskSchedulerFrames('AAABBB', 2), f.kthStreamFrames(3, [4, 5, 8, 2], [3, 5, 10, 9, 4]), f.lastStoneFrames([2, 7, 4, 1, 8, 1]), f.reorganizeFrames('aab'),
    f.ipoFrames(2, 0, [1, 2, 3], [0, 1, 1]), f.smallestRangeFrames([[4, 10, 15, 24, 26], [0, 9, 12, 20], [5, 18, 22, 30]]), f.sortedMatrixFrames([[1, 5, 9], [10, 11, 13], [12, 13, 15]], 8)];
  for (const frames of all) {
    assert.ok(frames.length >= 2);
    for (const fr of frames) {
      assert.ok(fr.caption.length > 10 && fr.views.length > 0);
      if (fr.predict) { assert.ok(fr.predict.answer >= 0 && fr.predict.answer < fr.predict.options.length); assert.equal(new Set(fr.predict.options).size, fr.predict.options.length, fr.caption); }
    }
  }
});

test('siftUpFrames: result is a valid min-heap with the same values', () => {
  for (let t = 0; t < 300; t++) {
    const h = heapOf(arr(rnd(9), 20)), x = rnd(22) - 1;
    const got = JSON.parse(ans(f.siftUpFrames(h, x))) as number[];
    assert.ok(isMinHeap(got), JSON.stringify([h, x, got]));
    assert.deepEqual(asc(got), asc([...h, x]));
  }
});

test('siftDownFrames: pop leaves a valid min-heap of the remaining values (including a single value)', () => {
  assert.equal(ans(f.siftDownFrames([5])), '[]');
  for (let t = 0; t < 300; t++) {
    const h = heapOf(arr(1 + rnd(10), 20));
    const got = JSON.parse(ans(f.siftDownFrames(h))) as number[];
    assert.ok(isMinHeap(got), JSON.stringify([h, got]));
    assert.deepEqual(asc(got), asc(h).slice(1));
  }
});

test('kthLargestFrames vs sorting, including duplicates and k = 1 and k = n', () => {
  for (let t = 0; t < 400; t++) {
    const a = arr(1 + rnd(9), 8, -3), k = 1 + rnd(a.length);
    assert.equal(ans(f.kthLargestFrames(a, k)), String(desc(a)[k - 1]), JSON.stringify([a, k]));
  }
});

test('topKFrequentFrames: the returned values carry the k biggest counts', () => {
  for (let t = 0; t < 400; t++) {
    const a = arr(1 + rnd(10), 5), k = 1 + rnd(new Set(a).size);
    const count = (v: number) => a.filter(x => x === v).length;
    const got = JSON.parse(ans(f.topKFrequentFrames(a, k))) as number[];
    const counts = [...new Set(a)].map(count);
    assert.equal(got.length, k);
    assert.equal(new Set(got).size, k);
    assert.deepEqual(desc(got.map(count)), desc(counts).slice(0, k), JSON.stringify([a, k, got]));
  }
});

test('kClosestFrames: the returned points carry the k smallest squared distances', () => {
  const d = (p: number[]) => p[0] * p[0] + p[1] * p[1];
  for (let t = 0; t < 400; t++) {
    const pts = Array.from({ length: 1 + rnd(8) }, () => [rnd(9) - 4, rnd(9) - 4]), k = 1 + rnd(pts.length);
    const got = JSON.parse(ans(f.kClosestFrames(pts, k))) as number[][];
    assert.deepEqual(asc(got.map(d)), asc(pts.map(d)).slice(0, k), JSON.stringify([pts, k]));
  }
});

test('medianFrames: the median after every prefix, including a single number and duplicates', () => {
  assert.equal(ans(f.medianFrames([7])), '[7]');
  for (let t = 0; t < 400; t++) {
    const s = arr(1 + rnd(9), 9, -4);
    assert.deepEqual(JSON.parse(ans(f.medianFrames(s))), s.map((_, i) => median(s.slice(0, i + 1))), JSON.stringify(s));
  }
});

test('windowMedianFrames vs sorting each window (k = 1, k = n, duplicates, rising and falling input)', () => {
  const brute = (a: number[], k: number) => Array.from({ length: a.length - k + 1 }, (_, i) => median(a.slice(i, i + k)));
  for (const a of [[3, 5, 6, 1], [1, 2, 3, 4, 5, 6], [6, 5, 4, 3, 2, 1], [2, 2, 2, 2], [2147483647, 2147483647]]) for (let k = 1; k <= a.length; k++) assert.deepEqual(JSON.parse(ans(f.windowMedianFrames(a, k))), brute(a, k), JSON.stringify([a, k]));
  for (let t = 0; t < 500; t++) {
    const a = arr(1 + rnd(10), 7, -3), k = 1 + rnd(a.length);
    assert.deepEqual(JSON.parse(ans(f.windowMedianFrames(a, k))), brute(a, k), JSON.stringify([a, k]));
  }
});

test('mergeKFrames vs concat and sort, including empty lists', () => {
  for (let t = 0; t < 400; t++) {
    const lists = Array.from({ length: 1 + rnd(4) }, () => asc(arr(rnd(5), 9)));
    assert.deepEqual(JSON.parse(ans(f.mergeKFrames(lists))), asc(lists.flat()), JSON.stringify(lists));
  }
  assert.equal(ans(f.mergeKFrames([[], []])), '[]');
});

test('taskSchedulerFrames vs the closed formula, and vs exhaustive search on tiny inputs', () => {
  const formula = (tasks: string, n: number) => {
    const c = new Map<string, number>();
    for (const x of tasks) c.set(x, (c.get(x) ?? 0) + 1);
    const m = Math.max(...c.values()), t = [...c.values()].filter(v => v === m).length;
    return Math.max(tasks.length, (m - 1) * (n + 1) + t);
  };
  for (let t = 0; t < 500; t++) {
    const tasks = Array.from({ length: 1 + rnd(9) }, () => 'ABCD'[rnd(4)]).join(''), n = rnd(4);
    assert.equal(ans(f.taskSchedulerFrames(tasks, n)), String(formula(tasks, n)), `${tasks} n=${n}`);
  }
  // exhaustive: try every order of single tasks, idling only when nothing can run.
  const search = (tasks: string, n: number): number => {
    let best = Infinity;
    const go = (left: string[], last: Map<string, number>, time: number) => {
      if (time >= best) return;
      if (!left.length) { best = time; return; }
      let ran = false;
      new Set(left).forEach(c => { if (!last.has(c) || time - last.get(c)! > n) { ran = true; const l = [...left]; l.splice(l.indexOf(c), 1); go(l, new Map(last).set(c, time), time + 1); } });
      if (!ran) go(left, last, time + 1);
    };
    go([...tasks], new Map(), 0);
    return best;
  };
  for (let t = 0; t < 60; t++) {
    const tasks = Array.from({ length: 1 + rnd(6) }, () => 'ABC'[rnd(3)]).join(''), n = rnd(3);
    assert.equal(ans(f.taskSchedulerFrames(tasks, n)), String(search(tasks, n)), `${tasks} n=${n}`);
  }
  assert.equal(ans(f.taskSchedulerFrames('AAABBB', 2)), '8');
  assert.equal(ans(f.taskSchedulerFrames('A', 5)), '1');
});

test('kthStreamFrames vs sorting every prefix', () => {
  for (let t = 0; t < 300; t++) {
    const k = 1 + rnd(3), start = arr(rnd(5), 9), adds = arr(1 + rnd(6), 9);
    if (start.length < k - 1) continue;
    const want = adds.map((_, i) => desc([...start, ...adds.slice(0, i + 1)])[k - 1]);
    assert.deepEqual(JSON.parse(ans(f.kthStreamFrames(k, start, adds))), want, JSON.stringify([k, start, adds]));
  }
  assert.deepEqual(JSON.parse(ans(f.kthStreamFrames(3, [4, 5, 8, 2], [3, 5, 10, 9, 4]))), [4, 5, 5, 8, 8]);
});

test('lastStoneFrames vs a sort-based simulation', () => {
  for (let t = 0; t < 400; t++) {
    const s = arr(1 + rnd(8), 12, 1);
    const w = [...s];
    while (w.length > 1) { w.sort((a, b) => a - b); const y = w.pop()!, x = w.pop()!; if (y > x) w.push(y - x); }
    assert.equal(ans(f.lastStoneFrames(s)), String(w[0] ?? 0), JSON.stringify(s));
  }
  assert.equal(ans(f.lastStoneFrames([2, 7, 4, 1, 8, 1])), '1');
});

test('reorganizeFrames: valid rearrangement exactly when the top letter fits in ceil(n / 2)', () => {
  for (let t = 0; t < 500; t++) {
    const s = Array.from({ length: 1 + rnd(8) }, () => 'abc'[rnd(3)]).join('');
    const top = Math.max(...['a', 'b', 'c'].map(c => [...s].filter(x => x === c).length));
    const got = ans(f.reorganizeFrames(s));
    if (top > Math.ceil(s.length / 2)) assert.equal(got, 'impossible', s);
    else {
      assert.equal([...got].sort().join(''), [...s].sort().join(''), s);
      for (let i = 1; i < got.length; i++) assert.notEqual(got[i], got[i - 1], `${s} -> ${got}`);
    }
  }
  assert.equal(ans(f.reorganizeFrames('aaab')), 'impossible');
  assert.equal(ans(f.reorganizeFrames('a')), 'a');
});

test('ipoFrames vs trying every order of up to k projects', () => {
  const best = (k: number, w: number, p: number[], c: number[], used = 0): number => {
    let top = w;
    if (k > 0) p.forEach((_, i) => { if (!(used & (1 << i)) && c[i] <= w) top = Math.max(top, best(k - 1, w + p[i], p, c, used | (1 << i))); });
    return top;
  };
  for (let t = 0; t < 400; t++) {
    const n = 1 + rnd(5), p = arr(n, 6), c = arr(n, 8), k = 1 + rnd(4), w = rnd(4);
    assert.equal(ans(f.ipoFrames(k, w, p, c)), String(best(k, w, p, c)), JSON.stringify([k, w, p, c]));
  }
  assert.equal(ans(f.ipoFrames(2, 0, [1, 2, 3], [0, 1, 1])), '4');
});

test('smallestRangeFrames vs scanning every candidate range', () => {
  const brute = (lists: number[][]) => {
    const vals = [...new Set(lists.flat())].sort((a, b) => a - b);
    let best: number[] | null = null;
    for (const lo of vals) for (const hi of vals) {
      if (hi < lo || !lists.every(l => l.some(v => v >= lo && v <= hi))) continue;
      if (!best || hi - lo < best[1] - best[0] || (hi - lo === best[1] - best[0] && lo < best[0])) best = [lo, hi];
    }
    return best;
  };
  for (let t = 0; t < 400; t++) {
    const lists = Array.from({ length: 1 + rnd(3) }, () => asc(arr(1 + rnd(4), 9)));
    assert.deepEqual(JSON.parse(ans(f.smallestRangeFrames(lists))), brute(lists), JSON.stringify(lists));
  }
  assert.equal(ans(f.smallestRangeFrames([[4, 10, 15, 24, 26], [0, 9, 12, 20], [5, 18, 22, 30]])), '[20,24]');
});

test('sortedMatrixFrames vs flatten and sort (duplicates, k = 1, k = n squared)', () => {
  for (let t = 0; t < 300; t++) {
    const n = 1 + rnd(4), m: number[][] = [];
    for (let r = 0; r < n; r++) { m.push([]); for (let c = 0; c < n; c++) m[r].push(Math.max(r ? m[r - 1][c] : -5, c ? m[r][c - 1] : -5) + rnd(3)); }
    const k = 1 + rnd(n * n);
    assert.equal(ans(f.sortedMatrixFrames(m, k)), String(asc(m.flat())[k - 1]), JSON.stringify([m, k]));
  }
  assert.equal(ans(f.sortedMatrixFrames([[1, 5, 9], [10, 11, 13], [12, 13, 15]], 8)), '13');
});
