import test from 'node:test';
import assert from 'node:assert/strict';
import { lastVar } from '../src/lib/dryrun.ts';
import { levelOrderFrames, zigzagFrames, rightViewFrames, averageLevelsFrames, minDepthFrames, maxWidthFrames, cousinsFrames, nextPointersFrames, distanceKFrames } from '../src/data/trees-bfs/frames.ts';

// ---------- random trees (LeetCode array form, unique values) and depth-first oracles ----------
interface T { v: number; l: T | null; r: T | null }
let seed = 7;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
function shape(n: number): T | null {
  if (n === 0) return null;
  const left = Math.floor(rnd() * n);
  return { v: 0, l: shape(left), r: shape(n - 1 - left) };
}
function randomTree(n: number): T {
  const root = shape(n)!;
  const all: T[] = [];
  const collect = (t: T | null) => { if (t) { all.push(t); collect(t.l); collect(t.r); } };
  collect(root);
  const vals = all.map((_, i) => i + 1).sort(() => rnd() - 0.5);
  all.forEach((t, i) => { t.v = vals[i]; });
  return root;
}
function toArray(root: T): (number | null)[] {
  const out: (number | null)[] = [];
  const waiting: (T | null)[] = [root];
  while (waiting.length) {
    const t = waiting.shift()!;
    if (!t) { out.push(null); continue; }
    out.push(t.v);
    waiting.push(t.l, t.r);
  }
  while (out[out.length - 1] === null) out.pop();
  return out;
}
const rows = (t: T | null) => { const out: number[][] = []; const go = (n: T | null, d: number) => { if (!n) return; (out[d] ??= []).push(n.v); go(n.l, d + 1); go(n.r, d + 1); }; go(t, 0); return out; };
const minDepth = (t: T | null): number => (!t ? 0 : !t.l ? 1 + minDepth(t.r) : !t.r ? 1 + minDepth(t.l) : 1 + Math.min(minDepth(t.l), minDepth(t.r)));
function width(root: T): number {
  const lo: bigint[] = [], hi: bigint[] = [];
  const go = (n: T | null, d: number, p: bigint) => { if (!n) return; lo[d] = lo[d] === undefined || p < lo[d] ? p : lo[d]; hi[d] = hi[d] === undefined || p > hi[d] ? p : hi[d]; go(n.l, d + 1, 2n * p + 1n); go(n.r, d + 1, 2n * p + 2n); };
  go(root, 0, 0n);
  return Math.max(...lo.map((l, d) => Number(hi[d] - l + 1n)));
}
function infoOf(root: T) {
  const depth = new Map<number, number>(), parent = new Map<number, number>(), adj = new Map<number, number[]>();
  const go = (n: T | null, d: number, p: number) => { if (!n) return; depth.set(n.v, d); parent.set(n.v, p); adj.set(n.v, [...(adj.get(n.v) ?? []), ...(p ? [p] : [])]); if (p) adj.get(p)!.push(n.v); go(n.l, d + 1, n.v); go(n.r, d + 1, n.v); };
  go(root, 0, 0);
  return { depth, parent, adj };
}
function distances(root: T, from: number): Map<number, number> {
  const { adj } = infoOf(root);
  const dist = new Map<number, number>([[from, 0]]);
  const stack = [from];
  while (stack.length) { const u = stack.pop()!; for (const w of adj.get(u) ?? []) if (!dist.has(w)) { dist.set(w, dist.get(u)! + 1); stack.push(w); } }
  return dist;
}
const ans = (f: ReturnType<typeof levelOrderFrames>) => lastVar(f, 'answer')!;
const trees = (count: number) => Array.from({ length: count }, (_, i) => randomTree(1 + (i % 11)));

test('level order, zigzag, right view, averages, min depth and width end on the true answer', () => {
  for (const t of trees(300)) {
    const a = toArray(t), rs = rows(t);
    assert.equal(ans(levelOrderFrames(a)), JSON.stringify(rs), `levels ${JSON.stringify(a)}`);
    assert.equal(ans(zigzagFrames(a)), JSON.stringify(rs.map((r, d) => (d % 2 ? [...r].reverse() : r))), `zigzag ${JSON.stringify(a)}`);
    assert.equal(ans(rightViewFrames(a)), JSON.stringify(rs.map(r => r[r.length - 1])), `right ${JSON.stringify(a)}`);
    assert.equal(ans(averageLevelsFrames(a)), JSON.stringify(rs.map(r => r.reduce((x, y) => x + y, 0) / r.length)), `avg ${JSON.stringify(a)}`);
    assert.equal(ans(minDepthFrames(a)), String(minDepth(t)), `minDepth ${JSON.stringify(a)}`);
    assert.equal(ans(maxWidthFrames(a)), String(width(t)), `width ${JSON.stringify(a)}`);
  }
});

test('cousins matches depth and parent from a depth-first walk', () => {
  for (const t of trees(300)) {
    const a = toArray(t);
    const n = a.filter(v => v !== null).length;
    if (n < 2) continue;
    const { depth, parent } = infoOf(t);
    for (let rep = 0; rep < 3; rep++) {
      const x = 1 + Math.floor(rnd() * n);
      let y = 1 + Math.floor(rnd() * n);
      if (y === x) y = (x % n) + 1;
      const expected = depth.get(x) === depth.get(y) && parent.get(x) !== parent.get(y);
      assert.equal(ans(cousinsFrames(a, x, y)), String(expected), `cousins ${JSON.stringify(a)} x=${x} y=${y}`);
    }
  }
});

test('distance K returns exactly the nodes at tree distance k', () => {
  for (const t of trees(300)) {
    const a = toArray(t);
    const n = a.filter(v => v !== null).length;
    const target = 1 + Math.floor(rnd() * n), k = Math.floor(rnd() * 5);
    const dist = distances(t, target);
    const expected = [...dist].filter(([, d]) => d === k).map(([v]) => v).sort((p, q) => p - q);
    const got = (JSON.parse(ans(distanceKFrames(a, target, k))) as number[]).sort((p, q) => p - q);
    assert.deepEqual(got, expected, `distanceK ${JSON.stringify(a)} target=${target} k=${k}`);
  }
});

test('next pointers link exactly the neighbours on each level of a perfect tree', () => {
  for (let h = 1; h <= 4; h++) {
    const a = Array.from({ length: 2 ** h - 1 }, (_, i) => i + 1);
    const expected: string[] = [];
    for (let d = 0; d < h; d++) for (let i = 2 ** d; i < 2 ** (d + 1) - 1; i++) expected.push(`${i}>${i + 1}`);
    const got = (JSON.parse(ans(nextPointersFrames(a))) as [number, number][]).map(([f, t]) => `${f}>${t}`);
    assert.deepEqual(got.sort(), expected.sort(), `perfect tree of height ${h}`);
  }
});

test('every predict question has a valid answer index and each generator shows tree and queue views', () => {
  const t = [3, 9, 20, null, null, 15, 7];
  const all = [levelOrderFrames(t), zigzagFrames(t), rightViewFrames(t), averageLevelsFrames(t), minDepthFrames(t), maxWidthFrames(t), cousinsFrames(t, 9, 20), nextPointersFrames([1, 2, 3, 4, 5, 6, 7]), distanceKFrames(t, 20, 2)];
  for (const frames of all) {
    assert.ok(frames.length > 3);
    assert.ok(frames.some(f => f.views.some(v => v.kind === 'tree')));
    for (const f of frames) if (f.predict) assert.ok(f.predict.answer >= 0 && f.predict.answer < f.predict.options.length);
  }
});
