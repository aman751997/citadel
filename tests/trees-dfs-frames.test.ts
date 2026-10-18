import test from 'node:test';
import assert from 'node:assert/strict';
import { lastVar } from '../src/lib/dryrun.ts';
import { renderFrame, renderLegend } from '../src/lib/dryrun-render.ts';
import {
  ordersFrames, invertFrames, pairFrames, maxDepthFrames, maxDepthDownFrames, balancedFrames, diameterFrames, maxPathFrames, lcaFrames,
  pathSumFrames, validateFrames, kthFrames, buildFrames, serializeWriteFrames, serializeReadFrames, subtreeFrames, lcaBstFrames,
  goodNodesFrames, robFrames, flattenFrames, type Tree,
} from '../src/data/trees-dfs/frames.ts';

// ---------- random trees and deliberately naive oracles (object trees, nothing shared with the generators) ----------
interface T { v: number; l: T | null; r: T | null }
let seed = 11;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const int = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
function shape(n: number): T | null {
  if (n === 0) return null;
  const left = int(0, n - 1);
  return { v: 0, l: shape(left), r: shape(n - 1 - left) };
}
const all = (t: T | null): T[] => (t ? [t, ...all(t.l), ...all(t.r)] : []);
function randomTree(n: number, lo = -3, hi = 6, unique = false): T | null {
  const root = shape(n);
  const ns = all(root);
  if (unique) { const vals = ns.map((_, i) => i + 1).sort(() => rnd() - 0.5); ns.forEach((t, i) => { t.v = vals[i]; }); }
  else ns.forEach(t => { t.v = int(lo, hi); });
  return root;
}
function bst(n: number): T | null {
  const vals = Array.from({ length: n }, (_, i) => i * 2 + 1).sort(() => rnd() - 0.5);
  let root: T | null = null;
  for (const v of vals) {
    const node: T = { v, l: null, r: null };
    if (!root) { root = node; continue; }
    let c = root;
    for (;;) { const side = v < c.v ? 'l' : 'r'; if (c[side]) c = c[side]!; else { c[side] = node; break; } }
  }
  return root;
}
function toArray(root: T | null): Tree {
  if (!root) return [];
  const out: Tree = [];
  const waiting: (T | null)[] = [root];
  while (waiting.length) { const t = waiting.shift()!; if (!t) { out.push(null); continue; } out.push(t.v); waiting.push(t.l, t.r); }
  while (out[out.length - 1] === null) out.pop();
  return out;
}
const clone = (t: T | null): T | null => (t ? { v: t.v, l: clone(t.l), r: clone(t.r) } : null);
const mirror = (t: T | null): T | null => (t ? { v: t.v, l: mirror(t.r), r: mirror(t.l) } : null);
const eq = (a: T | null, b: T | null): boolean => (!a || !b ? a === b : a.v === b.v && eq(a.l, b.l) && eq(a.r, b.r));
const pre = (t: T | null): number[] => (t ? [t.v, ...pre(t.l), ...pre(t.r)] : []);
const ino = (t: T | null): number[] => (t ? [...ino(t.l), t.v, ...ino(t.r)] : []);
const post = (t: T | null): number[] => (t ? [...post(t.l), ...post(t.r), t.v] : []);
const height = (t: T | null): number => (t ? 1 + Math.max(height(t.l), height(t.r)) : 0);
const bruteBalanced = (t: T | null): boolean => all(t).every(n => Math.abs(height(n.l) - height(n.r)) <= 1);
const parents = (root: T | null) => { const p = new Map<T, T>(); for (const n of all(root)) for (const c of [n.l, n.r]) if (c) p.set(c, n); return p; };
const upFrom = (n: T, p: Map<T, T>) => { const out: T[] = []; for (let c: T | undefined = n; c; c = p.get(c)) out.push(c); return out; };
function pathBetween(a: T, b: T, p: Map<T, T>): T[] {
  const ua = upFrom(a, p), ub = upFrom(b, p);
  const meet = ub.find(x => ua.includes(x))!;
  return [...ua.slice(0, ua.indexOf(meet) + 1), ...ub.slice(0, ub.indexOf(meet)).reverse()];
}
const paths = (root: T | null) => { const p = parents(root), ns = all(root), out: T[][] = []; for (const a of ns) for (const b of ns) out.push(pathBetween(a, b, p)); return out; };
const bruteDiameter = (root: T | null) => Math.max(0, ...paths(root).map(x => x.length - 1));
const bruteMaxPath = (root: T | null) => Math.max(...paths(root).map(x => x.reduce((s, n) => s + n.v, 0)));
const bruteLca = (root: T | null, p: number, q: number) => {
  const par = parents(root), ns = all(root);
  const a = upFrom(ns.find(n => n.v === p)!, par), b = upFrom(ns.find(n => n.v === q)!, par);
  return a.find(x => b.includes(x))!.v;
};
const bruteValid = (root: T | null) => all(root).every(n => all(n.l).every(x => x.v < n.v) && all(n.r).every(x => x.v > n.v));
const rootToLeaf = (root: T | null) => { const par = parents(root); return all(root).filter(n => !n.l && !n.r).map(n => upFrom(n, par).reverse().map(x => x.v)); };
const bruteGood = (root: T | null) => { const par = parents(root); return all(root).filter(n => upFrom(n, par).every(x => x.v <= n.v)).length; };
function bruteRob(root: T | null) {
  const ns = all(root), par = parents(root);
  let best = 0;
  for (let mask = 0; mask < 1 << ns.length; mask++) {
    const chosen = new Set(ns.filter((_, i) => mask >> i & 1));
    if ([...chosen].some(n => par.has(n) && chosen.has(par.get(n)!))) continue;
    best = Math.max(best, [...chosen].reduce((s, n) => s + n.v, 0));
  }
  return best;
}
const ans = (f: ReturnType<typeof ordersFrames>) => lastVar(f, 'answer')!;
const trees = (count: number, max = 9, lo?: number, hi?: number, unique = false) => Array.from({ length: count }, (_, i) => randomTree(i % (max + 1), lo, hi, unique));

test('the three orders end on the true pre, in and post order lists, including empty and one-node trees', () => {
  for (const t of trees(300)) {
    const a = toArray(t);
    assert.equal(ans(ordersFrames(a, 'pre')), JSON.stringify(pre(t)), `pre ${JSON.stringify(a)}`);
    assert.equal(ans(ordersFrames(a, 'in')), JSON.stringify(ino(t)), `in ${JSON.stringify(a)}`);
    assert.equal(ans(ordersFrames(a, 'post')), JSON.stringify(post(t)), `post ${JSON.stringify(a)}`);
  }
});

test('invert ends on the mirror image', () => {
  for (const t of trees(300)) assert.equal(ans(invertFrames(toArray(t))), JSON.stringify(toArray(mirror(t))), JSON.stringify(toArray(t)));
});

test('same tree and symmetric tree agree with structural comparison', () => {
  for (let i = 0; i < 400; i++) {
    const p = randomTree(i % 8, 1, 2), q = i % 3 === 0 ? clone(p) : i % 3 === 1 ? randomTree(i % 8, 1, 2) : randomTree(i % 8, 1, 2);
    assert.equal(ans(pairFrames(toArray(p), toArray(q), 'same')), String(eq(p, q)), `same ${JSON.stringify(toArray(p))} ${JSON.stringify(toArray(q))}`);
    const half = randomTree(i % 5, 1, 2);
    const sym: T | null = i % 2 ? { v: 1, l: half, r: mirror(half) } : { v: 1, l: half, r: randomTree(i % 5, 1, 2) };
    assert.equal(ans(pairFrames(toArray(sym), [], 'mirror')), String(eq(sym!.l, mirror(sym!.r))), `symmetric ${JSON.stringify(toArray(sym))}`);
  }
  assert.equal(ans(pairFrames([], [], 'same')), 'true');
  assert.equal(ans(pairFrames([], [], 'mirror')), 'true');
  assert.equal(ans(pairFrames([1, 2], [1, null, 2], 'same')), 'false');
});

test('depth (both directions), balanced, diameter and max path sum match brute force', () => {
  for (const t of trees(300, 9, -9, 9)) {
    const a = toArray(t);
    assert.equal(ans(maxDepthFrames(a)), String(height(t)), `depth ${JSON.stringify(a)}`);
    assert.equal(ans(maxDepthDownFrames(a)), String(height(t)), `depth down ${JSON.stringify(a)}`);
    assert.equal(ans(balancedFrames(a)), String(bruteBalanced(t)), `balanced ${JSON.stringify(a)}`);
    assert.equal(ans(diameterFrames(a)), String(bruteDiameter(t)), `diameter ${JSON.stringify(a)}`);
    if (t) assert.equal(ans(maxPathFrames(a)), String(bruteMaxPath(t)), `maxPath ${JSON.stringify(a)}`);
  }
  assert.equal(ans(maxPathFrames([-3])), '-3');
  assert.equal(ans(maxPathFrames([2, -1])), '2');
  assert.equal(ans(maxPathFrames([-10, 9, 20, null, null, 15, 7])), '42');
  assert.equal(ans(diameterFrames([1, 2, null, 3, 4, 5, null, null, 6, 7, null, null, 8])), '6');
  assert.equal(ans(balancedFrames([1, 2, 2, 3, null, null, 3, 4, null, null, 4])), 'false');
  const vine: Tree = [2, null, 3, null, 4, null, 5];
  assert.equal(ans(maxDepthFrames(vine)), '4');
});

test('lowest common ancestor matches a path-based brute force', () => {
  for (const t of trees(300, 10, 1, 1, true)) {
    const ns = all(t);
    if (!ns.length) continue;
    const p = ns[int(0, ns.length - 1)].v, q = ns[int(0, ns.length - 1)].v;
    assert.equal(ans(lcaFrames(toArray(t), p, q)), String(bruteLca(t, p, q)), `lca ${JSON.stringify(toArray(t))} ${p} ${q}`);
  }
  assert.equal(ans(lcaFrames([3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], 6, 4)), '5');
});

test('path sum II records exactly the root-to-leaf paths that hit the target', () => {
  for (const t of trees(300, 9, -3, 9)) {
    const a = toArray(t), leaves = rootToLeaf(t);
    for (const target of [0, 5, leaves.length ? leaves[0].reduce((s, x) => s + x, 0) : 1]) {
      const got = (JSON.parse(ans(pathSumFrames(a, target))) as number[][]).map(x => x.join(',')).sort();
      const want = leaves.filter(p => p.reduce((s, x) => s + x, 0) === target).map(x => x.join(',')).sort();
      assert.deepEqual(got, want, `pathSum ${JSON.stringify(a)} target=${target}`);
    }
  }
  assert.equal(ans(pathSumFrames([5, 4, 8, 11, null, 13, 4, 7, 2], 22)), '[[5,4,11,2]]');
  assert.equal(ans(pathSumFrames([1, 2], 1)), '[]');
});

test('validate BST matches the "everything left is smaller, everything right is larger" definition, duplicates included', () => {
  for (const t of trees(400, 8, 1, 6)) assert.equal(ans(validateFrames(toArray(t))), String(bruteValid(t)), JSON.stringify(toArray(t)));
  for (const t of Array.from({ length: 100 }, (_, i) => bst(i % 9))) assert.equal(ans(validateFrames(toArray(t))), 'true', JSON.stringify(toArray(t)));
  assert.equal(ans(validateFrames([5, 4, 6, null, null, 3, 7])), 'false');
  assert.equal(ans(validateFrames([2147483647])), 'true');
  assert.equal(ans(validateFrames([2, 2, 2])), 'false');
});

test('k-th smallest returns the k-th value of the sorted tree for every k', () => {
  for (let n = 1; n <= 10; n++) for (let rep = 0; rep < 20; rep++) {
    const t = bst(n), sorted = ino(t);
    for (let k = 1; k <= n; k++) assert.equal(ans(kthFrames(toArray(t), k)), String(sorted[k - 1]), `kth ${JSON.stringify(toArray(t))} k=${k}`);
  }
});

test('building from preorder and inorder reproduces the tree', () => {
  for (const t of trees(300, 10, 1, 1, true)) {
    assert.equal(ans(buildFrames(pre(t), ino(t))), JSON.stringify(toArray(t)), `build ${JSON.stringify(toArray(t))}`);
  }
  assert.equal(ans(buildFrames([3, 9, 20, 15, 7], [9, 3, 15, 20, 7])), JSON.stringify([3, 9, 20, null, null, 15, 7]));
});

test('serialize writes preorder with markers and deserialize reads any such letter back, duplicates and negatives included', () => {
  const write = (t: T | null): string[] => (t ? [String(t.v), ...write(t.l), ...write(t.r)] : ['#']);
  for (const t of trees(300, 10, -3, 3)) {
    const a = toArray(t), letter = write(t).join(',');
    assert.equal(ans(serializeWriteFrames(a)), letter, `write ${JSON.stringify(a)}`);
    assert.equal(ans(serializeReadFrames(letter)), JSON.stringify(a), `read ${letter}`);
  }
  assert.equal(ans(serializeWriteFrames([])), '#');
  assert.equal(ans(serializeReadFrames('#')), '[]');
  assert.notEqual(ans(serializeWriteFrames([1, 2])), ans(serializeWriteFrames([1, null, 2])));
});

test('subtree of another tree matches checking every node', () => {
  for (let i = 0; i < 400; i++) {
    const big = randomTree(i % 10, 1, 2);
    const nodes = all(big);
    const small = i % 2 && nodes.length ? clone(nodes[int(0, nodes.length - 1)]) : randomTree(1 + (i % 4), 1, 2);
    if (i % 5 === 0 && small) small.v = 3 - small.v;
    const want = nodes.some(n => eq(n, small));
    assert.equal(ans(subtreeFrames(toArray(big), toArray(small))), String(want), `subtree ${JSON.stringify(toArray(big))} / ${JSON.stringify(toArray(small))}`);
  }
});

test('LCA in a BST matches the path-based brute force', () => {
  for (let n = 1; n <= 10; n++) for (let rep = 0; rep < 20; rep++) {
    const t = bst(n), vals = ino(t);
    const p = vals[int(0, n - 1)], q = vals[int(0, n - 1)];
    assert.equal(ans(lcaBstFrames(toArray(t), p, q)), String(bruteLca(t, p, q)), `lcaBst ${JSON.stringify(toArray(t))} ${p} ${q}`);
  }
});

test('good nodes and the fruit thief match brute force', () => {
  for (const t of trees(300, 9, -4, 9)) assert.equal(ans(goodNodesFrames(toArray(t))), String(bruteGood(t)), `good ${JSON.stringify(toArray(t))}`);
  for (const t of trees(200, 9, 0, 9)) assert.equal(ans(robFrames(toArray(t))), String(bruteRob(t)), `rob ${JSON.stringify(toArray(t))}`);
  assert.equal(ans(goodNodesFrames([3, 1, 4, 3, null, 1, 5])), '4');
  assert.equal(ans(robFrames([3, 4, 5, 1, 3, null, 1])), '9');
});

test('flatten ends with the preorder as a chain of right pointers', () => {
  for (const t of trees(300, 10, -3, 6)) assert.equal(ans(flattenFrames(toArray(t))), JSON.stringify(pre(t)), JSON.stringify(toArray(t)));
});

test('every generator draws a tree, has sensible frames, and every predict question is well formed', () => {
  const t = [3, 9, 20, null, null, 15, 7], b = [5, 3, 6, 2, 4, null, null, 1];
  const sets = [
    ordersFrames(t, 'pre'), ordersFrames(t, 'in'), ordersFrames(t, 'post'), invertFrames([4, 2, 7, 1, 3, 6, 9]), pairFrames([1, 2, 3], [1, 2, 4], 'same'), pairFrames([1, 2, 2, 3, 4, 4, 3], [], 'mirror'),
    maxDepthFrames(t), maxDepthDownFrames(t), balancedFrames([1, 2, 2, 3, null, null, 3, 4, null, null, 4]), diameterFrames([1, 2, null, 3, 4, 5, null, null, 6, 7, null, null, 8]),
    maxPathFrames([-10, 9, 20, null, null, 15, 7]), lcaFrames([3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], 6, 4), pathSumFrames([5, 4, 8, 11, null, 13, 4, 7, 2], 22),
    validateFrames([5, 4, 6, null, null, 3, 7]), kthFrames(b, 3), buildFrames([3, 9, 20, 15, 7], [9, 3, 15, 20, 7]), serializeWriteFrames([1, 2, 3, null, null, 4, 5]),
    serializeReadFrames('1,2,#,#,3,4,#,#,5,#,#'), subtreeFrames([3, 5, 4, 6, 2, 1, 2], [4, 1, 2]), lcaBstFrames([6, 2, 8, 0, 4, 7, 9, null, null, 3, 5], 3, 5),
    goodNodesFrames([3, 1, 4, 3, null, 1, 5]), robFrames([3, 4, 5, 1, 3, null, 1]), flattenFrames([1, 2, 5, 3, 4, null, 6]),
  ];
  for (const frames of sets) {
    assert.ok(frames.length > 3);
    assert.ok(frames.some(f => f.views.some(v => v.kind === 'tree')));
    assert.ok(frames.every(f => f.caption.length > 10));
    for (const f of frames) if (f.predict) {
      const p = f.predict;
      assert.ok(p.answer >= 0 && p.answer < p.options.length);
      assert.equal(new Set(p.options).size, p.options.length, `duplicate options: ${p.options.join(' | ')}`);
    }
  }
  const asked = sets.filter(fs => fs.some(f => f.predict)).length;
  assert.ok(asked >= sets.length - 3, 'most dry runs should have at least one predict question');
});

test('the recursion engine shows the call stack, the values passed down and the values returned up', () => {
  const f = validateFrames([5, 4, 6, null, null, 3, 7]);
  const names = (fr: (typeof f)[number]) => fr.views.map(v => ('name' in v ? v.name : '') ?? '').join('|');
  assert.ok(f.slice(1, -1).every(fr => /call stack/.test(names(fr)) && /passed DOWN/.test(names(fr)) && /returned UP/.test(names(fr))));
  const deepest = Math.max(...f.map(fr => (fr.views.find(v => v.kind === 'stack') as { items: unknown[] }).items.length));
  assert.equal(deepest, 3);
});

test('every frame renders, including for empty and one-node trees', () => {
  const small: Tree[] = [[], [7], [2, null, 3, null, 4], [4, 2, 7, 1, 3, 6, 9]];
  for (const a of small) {
    const sets = [
      ordersFrames(a, 'pre'), ordersFrames(a, 'in'), ordersFrames(a, 'post'), invertFrames(a), pairFrames(a, a, 'same'), pairFrames(a, [], 'mirror'),
      maxDepthFrames(a), maxDepthDownFrames(a), balancedFrames(a), diameterFrames(a), maxPathFrames(a), lcaFrames(a, 7, 3), pathSumFrames(a, 7), validateFrames(a),
      serializeWriteFrames(a), subtreeFrames(a, [7]), goodNodesFrames(a), robFrames(a), flattenFrames(a),
    ];
    for (const frames of sets) for (const f of frames) { assert.ok(typeof renderFrame(f) === 'string'); assert.ok(typeof renderLegend(f) === 'string'); }
  }
  for (const f of [...kthFrames([5, 3, 6, 2, 4, null, null, 1], 3), ...buildFrames([3, 9, 20, 15, 7], [9, 3, 15, 20, 7]), ...serializeReadFrames('1,2,#,#,3,4,#,#,5,#,#'), ...lcaBstFrames([6, 2, 8, 0, 4, 7, 9, null, null, 3, 5], 3, 5)]) renderFrame(f);
});
