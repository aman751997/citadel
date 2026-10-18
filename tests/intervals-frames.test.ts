import test from 'node:test';
import assert from 'node:assert/strict';
import { lastVar } from '../src/lib/dryrun.ts';
import type { Frame } from '../src/lib/dryrun.ts';
import { renderFrame } from '../src/lib/dryrun-render.ts';
import * as f from '../src/data/intervals/frames.ts';

// Deterministic PRNG so failures reproduce.
let seed = 4242;
const rnd = (n: number) => { seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff; return (seed >>> 8) % n; };
const run = (n: number, body: (t: number) => void) => { for (let t = 0; t < n; t++) body(t); };
const ans = (frames: Frame[]) => lastVar(frames, 'answer')!;

type P = number[];
const fmt = (ps: P[]) => (ps.length ? ps.map(p => `${p[0]}–${p[1]}`).join(', ') : 'none');
const J = (x: unknown) => JSON.stringify(x);
// Random half-open-valid intervals (start < end).
const ivs = (n: number, span = 10, maxLen = 5): P[] => Array.from({ length: n }, () => { const s = rnd(span); return [s, s + 1 + rnd(maxLen)]; });
const overlapsClosed = (a: P, b: P) => Math.max(a[0], b[0]) <= Math.min(a[1], b[1]);
const overlapsOpen = (a: P, b: P) => a[0] < b[1] && b[0] < a[1];

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
const check = (frames: Frame[], label: string) => { wellFormed(frames, label); return ans(frames); };

// ---- oracles (independent of the lesson algorithms) ----
// Closed intervals that share any point (touching counts) belong to one connected component.
function mergeOracle(ps: P[]): P[] {
  const comp = ps.map((_, i) => i);
  const find = (x: number): number => (comp[x] === x ? x : (comp[x] = find(comp[x])));
  ps.forEach((a, i) => ps.forEach((b, j) => { if (overlapsClosed(a, b)) comp[find(i)] = find(j); }));
  const groups = new Map<number, P>();
  ps.forEach((p, i) => { const g = groups.get(find(i)); groups.set(find(i), g ? [Math.min(g[0], p[0]), Math.max(g[1], p[1])] : [...p]); });
  return [...groups.values()].sort((a, b) => a[0] - b[0]);
}
const maxOverlap = (ps: P[]) => { let best = 0; for (let t = -1; t <= 30; t++) best = Math.max(best, ps.filter(p => p[0] <= t && t < p[1]).length); return best; };
const subsets = <T,>(xs: T[]) => Array.from({ length: 1 << xs.length }, (_, m) => xs.filter((_, i) => m >> i & 1));
const pairwiseOk = (xs: P[]) => xs.every((a, i) => xs.every((b, j) => i >= j || !overlapsOpen(a, b)));

test('mergeFrames vs connected-components oracle', () => {
  run(300, () => {
    const a = ivs(1 + rnd(7));
    assert.equal(check(f.mergeFrames(a), J(a)), fmt(mergeOracle(a)), J(a));
  });
});
test('mergeFrames edge cases: single, duplicates, all equal, touching, nested', () => {
  for (const a of [[[1, 4]], [[2, 3], [2, 3]], [[5, 6], [5, 6], [5, 6]], [[1, 2], [2, 3]], [[1, 10], [2, 3], [4, 5]], [[0, 0]], [[3, 4], [1, 2]]] as P[][])
    assert.equal(check(f.mergeFrames(a), J(a)), fmt(mergeOracle(a)), J(a));
  assert.equal(ans(f.mergeFrames([[1, 3], [2, 6], [8, 10], [15, 18]])), '1–6, 8–10, 15–18');
});

test('insertFrames vs merge-everything oracle (ledger sorted, strictly separated)', () => {
  run(300, () => {
    const ledger: P[] = []; let cur = rnd(3);
    for (let n = rnd(6); n > 0; n--) { const s = cur + 1 + rnd(3), e = s + 1 + rnd(3); ledger.push([s, e]); cur = e; }
    const s = rnd(14), nw = [s, s + rnd(6)];
    assert.equal(check(f.insertFrames(ledger, nw), J([ledger, nw])), fmt(mergeOracle([...ledger, nw])), J([ledger, nw]));
  });
});
test('insertFrames edge cases: empty ledger, before all, after all, swallow all, touching', () => {
  const L: P[] = [[1, 2], [4, 6], [9, 12]];
  for (const nw of [[0, 0], [20, 21], [0, 100], [2, 4], [6, 9], [3, 3], [1, 2]] as P[]) assert.equal(check(f.insertFrames(L, nw), J(nw)), fmt(mergeOracle([...L, nw])), J(nw));
  assert.equal(check(f.insertFrames([], [3, 5]), 'empty'), '3–5');
});

test('attendFrames vs pairwise overlap (half-open: back-to-back is fine)', () => {
  run(300, () => {
    const a = ivs(rnd(7));
    const clash = a.some((x, i) => a.some((y, j) => i < j && overlapsOpen(x, y)));
    assert.equal(check(f.attendFrames(a), J(a)), String(!clash), J(a));
  });
  assert.equal(ans(f.attendFrames([[0, 5], [5, 9]])), 'true');
  assert.equal(ans(f.attendFrames([[0, 5], [4, 9]])), 'false');
  assert.equal(check(f.attendFrames([]), 'empty'), 'true');
  assert.equal(check(f.attendFrames([[1, 2]]), 'single'), 'true');
  assert.equal(check(f.attendFrames([[1, 5], [1, 5]]), 'identical'), 'false');
});

for (const [name, gen] of [['roomsSweepFrames', f.roomsSweepFrames], ['roomsHeapFrames', f.roomsHeapFrames]] as const) {
  test(`${name} vs peak-concurrency scan`, () => {
    run(300, () => {
      const a = ivs(rnd(8));
      assert.equal(check(gen(a), J(a)), String(maxOverlap(a)), J(a));
    });
    assert.equal(check(gen([]), 'empty'), '0');
    assert.equal(check(gen([[1, 2]]), 'single'), '1');
    assert.equal(check(gen([[1, 3], [1, 3], [1, 3]]), 'all equal'), '3');
    assert.equal(check(gen([[0, 5], [5, 10]]), 'back to back'), '1');
    assert.equal(check(gen([[0, 30], [5, 10], [15, 20]]), 'LeetCode 253'), '2');
  });
}

test('keepFrames vs subset brute force (cancellations = n - max compatible set)', () => {
  run(300, () => {
    const a = ivs(rnd(8), 10, 4);
    const best = Math.max(...subsets(a).filter(pairwiseOk).map(s => s.length));
    assert.equal(check(f.keepFrames(a), J(a)), String(a.length - best), J(a));
  });
  assert.equal(check(f.keepFrames([]), 'empty'), '0');
  assert.equal(check(f.keepFrames([[1, 2], [1, 2], [1, 2]]), 'all equal'), '2');
  assert.equal(check(f.keepFrames([[1, 2], [2, 3]]), 'touching'), '0');
});

test('arrowsFrames vs minimum hitting set over endpoints (closed: touching pops)', () => {
  run(300, () => {
    const a = ivs(rnd(7), 10, 4);
    const pts = [...new Set(a.flat())];
    const best = Math.min(...subsets(pts).filter(s => a.every(p => s.some(x => p[0] <= x && x <= p[1]))).map(s => s.length));
    assert.equal(check(f.arrowsFrames(a), J(a)), String(best), J(a));
  });
  assert.equal(check(f.arrowsFrames([]), 'empty'), '0');
  assert.equal(check(f.arrowsFrames([[1, 2], [2, 3]]), 'touching'), '1');
  assert.equal(check(f.arrowsFrames([[4, 4], [4, 4]]), 'duplicates'), '1');
  assert.equal(check(f.arrowsFrames([[-5, -3], [-4, 0], [1, 2]]), 'negatives'), '2');
});

// Two sorted lists of pairwise disjoint (strictly separated) intervals.
const sortedDisjoint = (): P[] => { const out: P[] = []; let cur = rnd(3); for (let n = rnd(5); n > 0; n--) { const s = cur + 1 + rnd(3), e = s + rnd(4); out.push([s, e]); cur = e; } return out; };
test('intersectFrames vs all-pairs overlap', () => {
  run(300, () => {
    const A = sortedDisjoint(), B = sortedDisjoint();
    const exp = A.flatMap(a => B.map(b => [Math.max(a[0], b[0]), Math.min(a[1], b[1])]).filter(p => p[0] <= p[1])).sort((x, y) => x[0] - y[0]);
    assert.equal(check(f.intersectFrames(A, B), J([A, B])), fmt(exp), J([A, B]));
  });
  assert.equal(check(f.intersectFrames([], [[1, 2]]), 'empty A'), 'none');
  assert.equal(check(f.intersectFrames([[1, 5]], [[1, 5]]), 'equal'), '1–5');
  assert.equal(check(f.intersectFrames([[1, 2]], [[2, 3]]), 'touching'), '2–2');
});

test('freeTimeFrames vs unit-cell coverage scan', () => {
  run(300, () => {
    const sched: P[][] = Array.from({ length: 1 + rnd(3) }, () => ivs(rnd(4), 12, 4));
    const all = sched.flat(); if (!all.length) return;
    const lo = Math.min(...all.map(p => p[0])), hi = Math.max(...all.map(p => p[1]));
    const free: P[] = [];
    for (let t = lo; t < hi; t++) if (!all.some(p => p[0] <= t && t < p[1])) { const last = free[free.length - 1]; if (last && last[1] === t) last[1] = t + 1; else free.push([t, t + 1]); }
    assert.equal(check(f.freeTimeFrames(sched), J(sched)), fmt(free), J(sched));
  });
  assert.equal(check(f.freeTimeFrames([[[1, 3]], [[3, 5]]]), 'touching = no gap'), 'none');
  assert.equal(check(f.freeTimeFrames([[[1, 2], [5, 6]], [[1, 2]]]), 'one gap'), '2–5');
  assert.equal(check(f.freeTimeFrames([[[2, 4]], []]), 'single shift, empty employee'), 'none');
  assert.equal(check(f.freeTimeFrames([[[-5, -3]], [[-1, 0]]]), 'negatives'), '-3–-1');
});

test('calendarFrames vs accept-if-no-overlap simulation (half-open)', () => {
  run(300, () => {
    const reqs = ivs(rnd(9), 12, 4);
    const booked: P[] = [], res: boolean[] = [];
    for (const r of reqs) { const ok = booked.every(b => !overlapsOpen(b, r)); res.push(ok); if (ok) booked.push(r); }
    assert.equal(check(f.calendarFrames(reqs), J(reqs)), res.join(', '), J(reqs));
  });
  assert.equal(check(f.calendarFrames([]), 'empty'), '');
  assert.equal(check(f.calendarFrames([[1, 3], [1, 3], [3, 5]]), 'duplicate + adjacent'), 'true, false, true');
});

test('carPoolFrames vs per-time load scan', () => {
  run(300, () => {
    const trips: P[] = Array.from({ length: rnd(6) }, () => { const s = rnd(8); return [1 + rnd(3), s, s + 1 + rnd(4)]; });
    const cap = 1 + rnd(6);
    let ok = true;
    for (let t = 0; t <= 15; t++) if (trips.filter(p => p[1] <= t && t < p[2]).reduce((x, p) => x + p[0], 0) > cap) ok = false;
    assert.equal(check(f.carPoolFrames(trips, cap), J([trips, cap])), String(ok), J([trips, cap]));
  });
  assert.equal(check(f.carPoolFrames([], 1), 'empty'), 'true');
  assert.equal(check(f.carPoolFrames([[2, 1, 5], [3, 3, 7]], 4), 'LeetCode 1094 #1'), 'false');
  assert.equal(check(f.carPoolFrames([[2, 1, 5], [3, 5, 7]], 3), 'drop-off before pick-up'), 'true');
});

test('coveredFrames vs pairwise containment (duplicates count once)', () => {
  run(300, () => {
    const a = ivs(rnd(8), 8, 5);
    const d = [...new Map(a.map(p => [J(p), p])).values()];
    const remaining = d.filter(p => !d.some(q => q !== p && q[0] <= p[0] && p[1] <= q[1])).length;
    assert.equal(check(f.coveredFrames(a), J(a)), String(remaining), J(a));
  });
  assert.equal(check(f.coveredFrames([]), 'empty'), '0');
  assert.equal(check(f.coveredFrames([[1, 4], [1, 4], [1, 4]]), 'all equal'), '1');
  assert.equal(check(f.coveredFrames([[1, 4], [1, 2], [3, 4]]), 'same start/end'), '1');
});

test('jobsFrames vs subset brute force (weighted scheduling, touching allowed)', () => {
  run(300, () => {
    const n = rnd(8), jobs = Array.from({ length: n }, () => { const s = rnd(10); return { s, e: s + 1 + rnd(5), p: 1 + rnd(9) }; });
    const best = Math.max(...subsets(jobs).filter(S => S.every((a, i) => S.every((b, j) => i >= j || !overlapsOpen([a.s, a.e], [b.s, b.e])))).map(S => S.reduce((x, j) => x + j.p, 0)));
    const got = check(f.jobsFrames(jobs.map(j => j.s), jobs.map(j => j.e), jobs.map(j => j.p)), J(jobs));
    assert.equal(got, String(best), J(jobs));
  });
  assert.equal(check(f.jobsFrames([], [], []), 'empty'), '0');
  assert.equal(check(f.jobsFrames([1, 2, 3, 3], [3, 4, 5, 6], [50, 10, 40, 70]), 'LeetCode 1235'), '120');
  assert.equal(check(f.jobsFrames([1, 1, 1], [2, 2, 2], [5, 7, 6]), 'all equal'), '7');
});
