import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { solveLab } from '../src/lib/lab.ts';
import { answerMatches } from '../src/lib/review.ts';
import { lab, fromInput, type TreeLabState } from '../src/lib/labs/trees-dfs.ts';
import {
  figures, layoutTree, treeRows, invert, same, depth, balanced, diameter, maxPath, lca, pathSum, validate, kth, build, serialize, mixedReview,
} from '../src/data/trees-dfs/traces.ts';
import { hints } from '../src/data/trees-dfs/hints.ts';
import { practice, conceptIds } from '../src/data/practice/trees-dfs.ts';

// ---------- independent helpers (deliberately naive; objects, not indexes) ----------
type L = (number | null)[];
interface T { val: number; left: T | null; right: T | null; key: number }
function mk(level: L): T | null {
  if (!level.length || level[0] === null) return null;
  const root: T = { val: level[0] as number, left: null, right: null, key: 0 };
  const q: T[] = [root];
  let i = 1;
  while (q.length && i < level.length) {
    const n = q.shift()!;
    for (const side of ['left', 'right'] as const) {
      if (i < level.length && level[i] !== null) { const c: T = { val: level[i] as number, left: null, right: null, key: i }; n[side] = c; q.push(c); }
      i++;
    }
  }
  return root;
}
const nodes = (t: T | null): T[] => (t ? [t, ...nodes(t.left), ...nodes(t.right)] : []);
const h = (t: T | null): number => (t ? 1 + Math.max(h(t.left), h(t.right)) : 0);
const pre = (t: T | null): number[] => (t ? [t.val, ...pre(t.left), ...pre(t.right)] : []);
const ino = (t: T | null): number[] => (t ? [...ino(t.left), t.val, ...ino(t.right)] : []);
const post = (t: T | null): number[] => (t ? [...post(t.left), ...post(t.right), t.val] : []);
const levelOf = (t: T | null): (number | null)[] => {
  const out: (number | null)[] = [];
  const q: (T | null)[] = t ? [t] : [];
  while (q.length) { const n = q.shift()!; out.push(n ? n.val : null); if (n) q.push(n.left, n.right); }
  while (out.length && out[out.length - 1] === null) out.pop();
  return out;
};
const mirror = (t: T | null): T | null => (t ? { ...t, left: mirror(t.right), right: mirror(t.left) } : null);
const parents = (root: T | null) => { const p = new Map<T, T>(); for (const n of nodes(root)) for (const c of [n.left, n.right]) if (c) p.set(c, n); return p; };
const up = (n: T, p: Map<T, T>) => { const out: T[] = []; for (let c: T | undefined = n; c; c = p.get(c)) out.push(c); return out; };
function pathBetween(a: T, b: T, p: Map<T, T>): T[] {
  const ua = up(a, p), ub = up(b, p);
  const meet = ub.find(x => ua.includes(x))!;
  return [...ua.slice(0, ua.indexOf(meet) + 1), ...ub.slice(0, ub.indexOf(meet)).reverse()];
}
const allPaths = (root: T | null) => { const p = parents(root), ns = nodes(root), out: T[][] = []; for (const a of ns) for (const b of ns) out.push(pathBetween(a, b, p)); return out; };
const bruteDiameter = (root: T | null) => Math.max(0, ...allPaths(root).map(x => x.length - 1));
const bruteMaxPath = (root: T | null) => Math.max(...allPaths(root).map(x => x.reduce((s, n) => s + n.val, 0)));
const has = (t: T | null, v: number): boolean => nodes(t).some(n => n.val === v);
const byKey = (root: T | null) => new Map(nodes(root).map(n => [n.key, n]));
const leafPaths = (root: T | null) => { const p = parents(root); return nodes(root).filter(n => !n.left && !n.right).map(n => up(n, p).reverse().map(x => x.val)); };
const isBST = (t: T | null) => { const v = ino(t); return v.every((x, i) => i === 0 || v[i - 1] < x); };
const cells = (r: { cells: { value: string }[] }) => r.cells.map(c => c.value);
const correct = (s: { answer: number; choices: { label: string }[] }) => s.choices[s.answer].label;
const all = [invert, same, depth, balanced, diameter, maxPath, lca, pathSum, validate, kth, build, serialize, mixedReview];

test('every trace step has a valid answer and real feedback for each choice', () => {
  for (const steps of all) for (const s of steps) {
    assert.ok(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length);
    for (const c of s.choices) assert.ok(c.feedback.length > 20, c.label);
    assert.equal(new Set(s.choices.map(c => c.label)).size, s.choices.length);
  }
});

test('trace rows draw the tree one depth per row, children under their parents', () => {
  const rows = treeRows([3, 9, 20, null, null, 15, 7]);
  assert.deepEqual(rows.map(cells), [['3'], ['9', '20'], ['·', '·', '15', '7']]);
  const deep = treeRows(figures.pathSum.level);
  assert.equal(deep.length, h(mk(figures.pathSum.level)));
  deep.forEach((r, d) => assert.equal(r.cells.length, 2 ** d));
  // every non-empty cell has a parent cell directly above it
  for (let d = 1; d < deep.length; d++) deep[d].cells.forEach((c, s) => { if (c.value !== '·') assert.notEqual(deep[d - 1].cells[s >> 1].value, '·'); });
  assert.deepEqual(treeRows([]), []);
});

test('the SVG layout places nodes in in-order and draws n + 1 markers when asked', () => {
  for (const level of [figures.orders.level, figures.diameter.level, figures.pathSum.level, figures.lca.level, [1], [] as L]) {
    const t = layoutTree(level);
    assert.deepEqual([...t.nodes].sort((a, b) => a.x - b.x).map(p => Number(p.val)), ino(mk(level)));
    assert.equal(t.edges.length, Math.max(0, nodes(mk(level)).length - 1));
    assert.equal(t.height, h(mk(level)));
  }
  const withNulls = layoutTree(figures.serialize.level, true);
  const n = nodes(mk(figures.serialize.level)).length;
  assert.equal(withNulls.nodes.filter(p => p.isNull).length, n + 1);
});

test('figure data matches independent computations', () => {
  const o = mk(figures.orders.level);
  assert.deepEqual(pre(o), figures.orders.pre); assert.deepEqual(ino(o), figures.orders.inorder); assert.deepEqual(post(o), figures.orders.post);
  assert.deepEqual(levelOf(mirror(mk(figures.invertBefore))), figures.invertAfter);
  assert.deepEqual(pre(mk(figures.sameP)), pre(mk(figures.sameQ)));          // same listing...
  assert.notDeepEqual(levelOf(mk(figures.sameP)), levelOf(mk(figures.sameQ))); // ...different trees
  // depth / balanced / diameter: 'h k' notes are heights
  for (const f of [figures.depth, figures.balanced, figures.diameter]) {
    const by = byKey(mk(f.level));
    for (const [k, note] of Object.entries(f.notes)) assert.equal(Number(note.match(/^h (\d+)/)![1]), h(by.get(Number(k))!), `${note}`);
  }
  for (const [k, note] of Object.entries(figures.balanced.notes)) {
    const n = byKey(mk(figures.balanced.level)).get(Number(k))!;
    const gap = Math.abs(h(n.left) - h(n.right));
    if (note.includes('gap')) assert.equal(Number(note.match(/gap (\d+)/)![1]), gap); else assert.ok(gap <= 1);
  }
  const dt = mk(figures.diameter.level)!;
  assert.equal(bruteDiameter(dt), figures.diameter.best);
  assert.equal(h(dt), figures.diameter.rootReport);
  assert.equal(h(dt.left) + h(dt.right), figures.diameter.rootBend);
  const dby = byKey(dt);
  const bendAt2 = dby.get(1)!;
  assert.equal(h(bendAt2.left) + h(bendAt2.right), 6);
  const dp = figures.diameter.path.map(k => dby.get(k)!);
  assert.equal(dp.length - 1, figures.diameter.best);
  assert.deepEqual(pathBetween(dp[0], dp[dp.length - 1], parents(dt)).map(n => n.key), figures.diameter.path);
  // max path: gain = val + max(0, gains), bend = val + clamped arms
  const mt = mk(figures.maxPath.level)!;
  const gain = (n: T | null): number => (n ? n.val + Math.max(0, gain(n.left), gain(n.right)) : 0);
  for (const [k, note] of Object.entries(figures.maxPath.notes)) {
    const n = byKey(mt).get(Number(k))!;
    assert.equal(Number(note.match(/gain (-?\d+)/)![1]), gain(n), note);
    const b = note.match(/bend (-?\d+)/);
    if (b) assert.equal(Number(b[1]), n.val + Math.max(0, gain(n.left)) + Math.max(0, gain(n.right)));
  }
  assert.equal(bruteMaxPath(mt), 42);
  assert.equal(figures.maxPath.path.map(k => byKey(mt).get(k)!.val).reduce((s, x) => s + x, 0), 42);
  // LCA (p = 6, q = 4): each visited call returns the meeting point, the one found, or null
  const lt = mk(figures.lca.level)!;
  const ret = (n: T) => { const p = has(n, 6), q = has(n, 4); return p && q ? null : p ? '6' : q ? '4' : 'null'; };
  const lcaOf = (root: T, a: number, b: number): T => { for (const c of [root.left, root.right]) if (c && has(c, a) && has(c, b)) return lcaOf(c, a, b); return root; };
  assert.equal(lcaOf(lt, 6, 4).val, 5); assert.equal(lcaOf(lt, 5, 1).val, 3); assert.equal(lcaOf(lt, 5, 4).val, 5);
  for (const [k, note] of Object.entries(figures.lca.notes)) {
    const n = byKey(lt).get(Number(k))!;
    const want = ret(n) ?? String(lcaOf(lt, 6, 4).val);
    assert.equal(note.match(/→ (\w+)/)![1], want, note);
  }
  // path sum: 'left r' = target minus the root-to-node sum
  const pt = mk(figures.pathSum.level)!, pp = parents(pt);
  for (const [k, note] of Object.entries(figures.pathSum.notes)) {
    const n = byKey(pt).get(Number(k))!;
    const r = figures.pathSum.target - up(n, pp).reduce((s, x) => s + x.val, 0);
    assert.equal(Number(note.match(/left (−?\d+)/)![1].replace('−', '-')), r, note);
    assert.equal(note.includes('✓'), r === 0 && !n.left && !n.right);
  }
  assert.deepEqual(leafPaths(pt).filter(p => p.reduce((s, x) => s + x, 0) === 22), [[5, 4, 11, 2], [5, 8, 4, 5]]);
  // validate: windows from ancestors
  const vt = mk(figures.validate.level)!, vp = parents(vt);
  for (const [k, note] of Object.entries(figures.validate.notes)) {
    const n = byKey(vt).get(Number(k))!;
    let lo = -Infinity, hi = Infinity;
    for (let c = n, p = vp.get(n); p; c = p, p = vp.get(p)) { if (p.left === c) hi = Math.min(hi, p.val); else lo = Math.max(lo, p.val); }
    const text = `(${lo === -Infinity ? '−∞' : lo}, ${hi === Infinity ? '+∞' : hi})`;
    assert.ok(note.startsWith(text), `${note} vs ${text}`);
    assert.equal(note.includes('✗'), !(n.val > lo && n.val < hi));
  }
  assert.equal(isBST(vt), false);
  // kth: ranks in sorted order
  const kt = mk(figures.kth.level)!, sorted = ino(kt);
  for (const [k, note] of Object.entries(figures.kth.notes)) assert.equal(sorted.indexOf(byKey(kt).get(Number(k))!.val) + 1, parseInt(note));
  // build, serialize
  const bt = mk(figures.build.level);
  assert.deepEqual(pre(bt), figures.build.pre); assert.deepEqual(ino(bt), figures.build.inorder);
  const ser = (t: T | null): string => (t ? `${t.val},${ser(t.left)},${ser(t.right)}` : '#');
  assert.equal(ser(mk(figures.serialize.level)), figures.serialize.text);
  // side quests
  const sy = mk(figures.symmetric)!;
  assert.deepEqual(levelOf(sy.left), levelOf(mirror(sy.right)));
  const asym = mk([1, 2, 2, null, 3, null, 3])!;
  assert.notDeepEqual(levelOf(asym.left), levelOf(mirror(asym.right)));
  assert.ok(nodes(mk(figures.subtreeRoot)).some(n => JSON.stringify(levelOf(n)) === JSON.stringify(figures.subtreeSub)));
  assert.ok(!nodes(mk([3, 4, 5, 1, 2, null, null, null, null, 0])).some(n => JSON.stringify(levelOf(n)) === JSON.stringify(figures.subtreeSub)));
  const gt = mk(figures.good.level)!, gp = parents(gt);
  let goodCount = 0;
  for (const [k, note] of Object.entries(figures.good.notes)) {
    const n = byKey(gt).get(Number(k))!;
    const above = up(n, gp).slice(1).map(x => x.val);
    const max = above.length ? Math.max(...above) : null;
    assert.ok(note.startsWith(max === null ? 'max above −∞' : `max ${max}`), note);
    const good = max === null || n.val >= max;
    assert.equal(note.endsWith('✓'), good); if (good) goodCount++;
  }
  assert.equal(goodCount, 4);
  const bst = mk(figures.lcaBst.level)!;
  assert.ok(isBST(bst));
  assert.equal(lcaOf(bst, 3, 5).val, 4); assert.equal(lcaOf(bst, 2, 8).val, 6); assert.equal(lcaOf(bst, 2, 4).val, 2);
  const rob = (t: T | null): [number, number] => { if (!t) return [0, 0]; const l = rob(t.left), r = rob(t.right); return [Math.max(...l) + Math.max(...r), t.val + l[0] + r[0]]; };
  const rt = mk(figures.rob.level)!;
  for (const [k, note] of Object.entries(figures.rob.notes)) assert.equal(note, `(${rob(byKey(rt).get(Number(k))!).join(', ')})`);
  assert.equal(bruteRob(rt), 9);
  assert.deepEqual(pre(mk(figures.flatten.level)), figures.flatten.chain);
});

function bruteRob(root: T | null) {
  const ns = nodes(root), p = parents(root);
  let best = 0;
  for (let mask = 0; mask < 1 << ns.length; mask++) {
    const chosen = ns.filter((_, i) => mask >> i & 1);
    if (chosen.some(n => p.has(n) && chosen.includes(p.get(n)!))) continue;
    best = Math.max(best, chosen.reduce((s, n) => s + n.val, 0));
  }
  return best;
}

test('chapter trace numbers match independent computations', () => {
  // invert
  const ib = mk(figures.invertBefore)!;
  assert.deepEqual(cells(invert[0].rows[2]), ['1', '3', '6', '9']);
  const rootOnly = { ...ib, left: ib.right, right: ib.left };
  assert.deepEqual(levelOf(rootOnly), [4, 7, 2, 6, 9, 1, 3]);
  assert.match(invert[0].choices[1].feedback, /\[4, 7, 2, 6, 9, 1, 3\]/);
  const afterKids = { ...ib, left: mirror(ib.left), right: mirror(ib.right) };
  assert.deepEqual(levelOf(afterKids), [4, 2, 7, 3, 1, 9, 6]);
  assert.deepEqual(invert[1].rows.flatMap(cells), ['4', '2', '7', '3', '1', '9', '6']);
  const valueSwap = { ...afterKids, left: { ...afterKids.left!, val: 7 }, right: { ...afterKids.right!, val: 2 } };
  assert.deepEqual(levelOf(valueSwap), [4, 7, 2, 3, 1, 9, 6]);
  assert.match(invert[1].choices[0].feedback, /\[4, 7, 2, 3, 1, 9, 6\]/);
  assert.match(invert[1].choices[1].feedback, new RegExp(`\\[${levelOf(mirror(ib)).join(', ')}\\]`));
  // depth
  const dt = mk(figures.depth.level)!;
  assert.equal(h(dt.left), 1); assert.equal(h(dt.right), 2); assert.equal(h(dt), 3);
  assert.match(correct(depth[1]), /3: 1 \+ max\(1, 2\)/);
  // balanced
  const bt = mk(figures.balanced.level)!;
  assert.equal(h(bt.left), 3); assert.equal(h(bt.right), 3);
  assert.equal(h(bt.left!.left), 2); assert.equal(h(bt.left!.right), 0);
  assert.equal(1 + 2 + 3 + 4 + 5, 5 * 6 / 2);                                  // n + (n − 1) + … + 1
  // diameter trace tree
  const tr = mk([1, 2, null, 3, 4, 5, null, null, 6])!;
  const two = tr.left!;
  assert.equal(h(two.left), 2); assert.equal(h(two.right), 2); assert.equal(h(two), 3);
  const bendBelow = (n: T | null): number => (n ? Math.max(h(n.left) + h(n.right), bendBelow(n.left), bendBelow(n.right)) : 0);
  assert.equal(bendBelow(two.left), 1); assert.equal(bendBelow(two.right), 1);          // Best before node 2
  assert.equal(h(tr.left) + h(tr.right), 3); assert.equal(h(tr), 4); assert.equal(bruteDiameter(tr), 4);
  assert.match(correct(diameter[2]), /Best/);
  // max path
  assert.equal(bruteMaxPath(mk([2, -1])), 2);
  assert.equal(-10 + 9 + 35, 34); assert.equal(-10 + 35, 25);
  assert.match(correct(maxPath[2]), /42/);
  // lca node 2's return with p = 6, q = 4
  const lt = mk(figures.lca.level)!;
  const nodeTwo = lt.left!.right!;
  assert.equal(nodeTwo.val, 2); assert.ok(has(nodeTwo.right, 4)); assert.ok(!has(nodeTwo.left, 4) && !has(nodeTwo.left, 6));
  // path sum
  const pt = mk(figures.pathSum.level)!;
  assert.equal(22 - 5 - 4 - 11, 2);
  assert.deepEqual(leafPaths(mk([1, 2])).filter(p => p.reduce((s, x) => s + x, 0) === 1), []);
  assert.ok(pt);
  // validate
  assert.equal(isBST(mk([5, 4, 6, null, null, 3, 7])), false);
  assert.equal(2147483647 < 2147483647, false);
  // kth: pushes 5, 3, 2, 1 then pops 1, 2, 3
  const kt = mk(figures.kth.level)!;
  const chain: number[] = []; for (let c: T | null = kt; c; c = c.left) chain.push(c.val);
  assert.deepEqual(chain, [5, 3, 2, 1]);
  assert.deepEqual(ino(kt).slice(0, 3), [1, 2, 3]);
  // build
  assert.equal(figures.build.inorder.indexOf(figures.build.pre[0]), 1);
  // serialize: the token after "1,2,#,#" is 3, and it is 1's right child
  const tokens = figures.serialize.text.split(',');
  assert.equal(tokens[4], '3'); assert.equal(mk(figures.serialize.level)!.right!.val, 3);
  // mixed review: house robber vine, all-negative max path
  const vine = mk([4, 1, null, 2, null, 3]);
  assert.equal(bruteRob(vine), 7); assert.equal(4 + 2, 6); assert.equal(1 + 3, 4);
  assert.equal(bruteMaxPath(mk([-3])), -3);
});

test('every hint ladder referenced by the lesson exists with three hints, and none is unused', () => {
  const mdx = readFileSync(new URL('../src/dsa-lessons/trees-dfs.mdx', import.meta.url), 'utf8');
  const used = [...mdx.matchAll(/hints=\{hints\.(\w+)\}/g)].map(m => m[1]);
  assert.equal(used.length, 18);
  for (const key of used) assert.equal(hints[key]?.length, 3, key);
  for (const key of Object.keys(hints)) assert.ok(used.includes(key), `unused hint ${key}`);
  // every anchor a practice concept points at exists in the lesson
  for (const id of conceptIds) assert.match(mdx, new RegExp(`id="${practice.challengeFor(id, 0).section}"`), id);
});

// ---------- lab ----------
type Oracle = (start: TreeLabState, final: TreeLabState) => void;
const oracles: Record<string, Oracle> = {
  report: (s, f) => {
    assert.equal(f.best, bruteDiameter(mk(s.level)));
    for (const n of nodes(mk(s.level))) assert.equal(f.reports[String(n.key)], h(n));
  },
  bounds: (s, f) => assert.equal(f.verdict, isBST(mk(s.level))),
  basket: (s, f) => {
    const sorted = ino(mk(s.level));
    assert.equal(f.visited.length, s.k);
    const by = byKey(mk(s.level));
    assert.deepEqual(f.visited.map(k => by.get(k)!.val), sorted.slice(0, s.k));
  },
};
function runCase(start: TreeLabState) {
  const { final, wrongMovesChangedBoard } = solveLab(lab, start, 2000);
  assert.equal(final.done, true, `${start.mode} must terminate`);
  assert.equal(wrongMovesChangedBoard, false, `${start.mode}: a wrong move changed the board`);
  oracles[start.mode](start, final);
  return final;
}

test('every lab mode and case terminates with the right result; wrong moves never change the board', () => {
  for (const [mode, info] of Object.entries(lab.modes)) {
    assert.ok(info.cases >= 3 && info.cases <= 4);
    for (let v = 0; v < info.cases; v++) runCase(lab.create(mode, v));
  }
});

test('every rejected move on every reachable state explains itself with real numbers', () => {
  for (const [mode, info] of Object.entries(lab.modes)) for (let v = 0; v < info.cases; v++) {
    let state = lab.create(mode, v);
    for (let guard = 0; guard < 500; guard++) {
      for (const { action } of info.actions) {
        const result = lab.move(state, action);
        if (!result.accepted && !state.done) {
          assert.doesNotMatch(result.state.message, /undefined|NaN|\[object|Infinity/, `${mode} case ${v}: ${action}`);
          assert.ok(result.state.message.length > 15, `${mode} case ${v}: ${action} needs an explanation`);
        }
      }
      for (const text of [lab.describe(state), ...lab.view(state).flatMap(r => r.cells.map(c => `${c.value} ${c.label ?? ''}`))])
        assert.doesNotMatch(text, /undefined|NaN|Infinity/, `${mode} case ${v}`);
      if (state.done) break;
      state = lab.move(state, lab.expected(state)).state;
      assert.doesNotMatch(state.message, /undefined|NaN/);
    }
    assert.equal(state.done, true);
  }
});

let seed = 2024;
const rnd = (n: number) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
function randomLevel(n: number, lo: number, hi: number): L {
  // random shape: attach each new node to a random free slot, then write level order
  if (!n) return [];
  const root: T = { val: lo + rnd(hi - lo + 1), left: null, right: null, key: 0 };
  const ns = [root];
  while (ns.length < n) {
    const p = ns[rnd(ns.length)], side = rnd(2) ? 'left' : 'right';
    if (p[side]) continue;
    const c: T = { val: lo + rnd(hi - lo + 1), left: null, right: null, key: 0 };
    p[side] = c; ns.push(c);
  }
  return levelOf(root);
}
function randomBST(n: number): L {
  const vals = [...new Set(Array.from({ length: n }, () => rnd(30)))];
  let root: T | null = null;
  const ins = (t: T | null, v: number): T => (!t ? { val: v, left: null, right: null, key: 0 } : (v < t.val ? { ...t, left: ins(t.left, v) } : { ...t, right: ins(t.right, v) }));
  for (const v of vals) root = ins(root, v);
  return levelOf(root);
}

test('lab agrees with brute force on random small trees', () => {
  for (let t = 0; t < 150; t++) {
    const shape = randomLevel(rnd(9), -5, 9);
    runCase({ ...lab.create('report'), ...fromInput({ mode: 'report', level: shape }) });
    const maybe = rnd(2) ? randomBST(1 + rnd(8)) : randomLevel(rnd(7), 0, 6);
    runCase({ ...lab.create('bounds'), ...fromInput({ mode: 'bounds', level: maybe }) });
    const b = randomBST(1 + rnd(8));
    const n = nodes(mk(b)).length;
    runCase({ ...lab.create('basket'), ...fromInput({ mode: 'basket', level: b, k: 1 + rnd(n) }) });
  }
});

test('the lab names the classic mistakes with the numbers on the board', () => {
  // report, case 1: [1, 2, null, 3, 4, 5, null, null, 6] — the bend lives below the root
  let s = lab.create('report', 1);
  assert.match(lab.move(s, 'report').state.message, /Check the bend first/);
  while (!(s.phase === 'report' && s.order[s.at] === 1)) s = lab.move(s, lab.expected(s)).state;   // node 2, ready to report
  assert.match(lab.move(s, 'report-path').state.message, /2 \+ 2 = 4 is a path that bends at 2/);
  while (s.phase !== 'answer') s = lab.move(s, lab.expected(s)).state;
  assert.equal(s.best, 4);
  assert.match(lab.move(s, 'answer-through').state.message, /Left \+ right at the root is 3/);
  assert.match(lab.move(s, 'answer-root').state.message, /reported 4.*coincidence.*Best = 4/);
  // bounds, case 1: [5, 4, 6, null, null, 3, 7] — the deep violation
  let b = lab.create('bounds', 1);
  while (!(b.phase === 'window' && b.order[b.at] === 5)) b = lab.move(b, lab.expected(b)).state;
  assert.match(lab.move(b, 'parent').state.message, /forgets the floor 5/);
  assert.match(lab.move(b, 'right').state.message, /hangs on the LEFT of 6/);
  b = lab.move(b, 'left').state;
  assert.deepEqual([b.lows['5'], b.highs['5']], [5, 6]);
  assert.match(lab.move(b, 'inside').state.message, /strictly above the floor 5/);
  b = lab.move(b, 'outside').state;
  assert.equal(b.verdict, false);
  // the root's children: comparing with the parent alone gives the same window, so it is accepted
  const c = lab.move(lab.move(lab.create('bounds', 0), 'inside').state, 'parent');
  assert.equal(c.accepted, true);
  // basket, case 0: k = 3
  let k = lab.create('basket', 0);
  assert.match(lab.move(k, 'visit').state.message, /Visiting 5 now puts it before its left side, which holds the smaller 1/);
  assert.match(lab.move(k, 'pop').state.message, /basket is empty/);
  for (let i = 0; i < 4; i++) k = lab.move(k, 'push').state;
  assert.deepEqual(k.basket.map(x => byKey(mk(k.level)).get(x)!.val), [5, 3, 2, 1]);
  assert.match(lab.move(k, 'push').state.message, /top of the basket, 1/);
});

// ---------- practice ----------
const BANNED = /recurs|depth-first|\bDFS\b|\bBFS\b|preorder|inorder|postorder|pre-order|in-order|post-order|traversal|stack|queue|bottom-up|top-down|backtrack|global/i;
const levels = (prompt: string) => [...prompt.matchAll(/\[([^\]]*)\]/g)].map(m => (m[1].trim() === '' ? [] : m[1].split(',').map(x => (x.trim() === 'null' ? null : Number(x)))));
const num = (prompt: string, re: RegExp) => { const m = prompt.match(re); assert.ok(m, `${re} in ${prompt}`); return Number(m![1]); };
function rebuild(preL: number[], inL: number[]): T | null {
  if (!preL.length) return null;
  const root = preL[0], i = inL.indexOf(root);
  return { val: root, key: 0, left: rebuild(preL.slice(1, 1 + i), inL.slice(0, i)), right: rebuild(preL.slice(1 + i), inL.slice(i + 1)) };
}
function readText(text: string): T | null {
  const tokens = text.split(',');
  let i = 0;
  const go = (): T | null => { const t = tokens[i++]; if (t === '#') return null; const n: T = { val: Number(t), key: 0, left: null, right: null }; n.left = go(); n.right = go(); return n; };
  return go();
}

test('every practice answer matches an independent computation from the prompt', () => {
  assert.equal(practice.storageKey, 'citadel-trees-dfs-review-v1');
  assert.ok(conceptIds.length >= 10);
  assert.ok(Object.keys(practice.strategies).includes('other'));
  const strategiesUsed = new Set<string>();
  for (const id of practice.conceptIds) {
    const prompts = new Set<string>();
    for (let variant = 0; variant <= 20; variant++) {
      const c = practice.challengeFor(id, variant);
      prompts.add(c.prompt);
      strategiesUsed.add(c.strategy);
      assert.ok(c.strategy in practice.strategies, `${id}: unknown strategy`);
      assert.doesNotMatch(c.prompt, BANNED, `${id}: the prompt must not name the technique`);
      const ls = levels(c.prompt);
      const t = mk(ls[0] ?? []);
      let expected: number | number[] | boolean;
      switch (id) {
        case 'invert': expected = pre(mirror(t)); break;
        case 'same': expected = JSON.stringify(levelOf(mk(ls[0]))) === JSON.stringify(levelOf(mk(ls[1]))); break;
        case 'depth': expected = h(t); break;
        case 'balanced': expected = nodes(t).every(n => Math.abs(h(n.left) - h(n.right)) <= 1); break;
        case 'diameter': expected = bruteDiameter(t); break;
        case 'max-path': expected = bruteMaxPath(t); break;
        case 'lca': case 'lca-bst': {
          const m = c.prompt.match(/both (-?\d+) and (-?\d+)/)!;
          const p = nodes(t).find(n => n.val === Number(m[1]))!, q = nodes(t).find(n => n.val === Number(m[2]))!;
          const pa = parents(t), upP = up(p, pa);
          expected = up(q, pa).find(x => upP.includes(x))!.val;
          if (id === 'lca-bst') assert.ok(isBST(t));
          break;
        }
        case 'path-sum': { const target = num(c.prompt, /exactly (-?\d+)\?/); expected = leafPaths(t).filter(p => p.reduce((s, x) => s + x, 0) === target).length; break; }
        case 'validate': expected = isBST(t); break;
        case 'kth': { const k = num(c.prompt, /its (\d+)(st|nd|rd|th) smallest/); assert.ok(isBST(t)); expected = [...ino(t)].sort((a, b) => a - b)[k - 1]; break; }
        case 'build': { const r = rebuild(ls[0] as number[], ls[1] as number[]); assert.deepEqual(ino(r), ls[1]); assert.deepEqual(pre(r), ls[0]); expected = post(r); break; }
        case 'serialize': expected = ino(readText(c.prompt.match(/text "([^"]+)"/)![1])); break;
        case 'symmetric': expected = JSON.stringify(levelOf(t)) === JSON.stringify(levelOf(mirror(t))); break;
        case 'subtree': expected = nodes(t).some(n => JSON.stringify(levelOf(n)) === JSON.stringify(levelOf(mk(ls[1])))); break;
        case 'good-nodes': { const pa = parents(t); expected = nodes(t).filter(n => up(n, pa).every(x => x.val <= n.val)).length; break; }
        case 'rob': expected = bruteRob(t); break;
        case 'flatten': expected = pre(t); break;
        case 'right-view': {
          const depthOf = new Map<T, number>(); const pa = parents(t);
          for (const n of nodes(t)) depthOf.set(n, up(n, pa).length);
          const out: number[] = [];
          // rightmost per depth: among nodes at depth d, the last in a row-major (level-order) listing
          const order: T[] = []; const q: T[] = t ? [t] : []; while (q.length) { const n = q.shift()!; order.push(n); for (const ch of [n.left, n.right]) if (ch) q.push(ch); }
          for (let d = 1; d <= h(t); d++) out.push(order.filter(n => depthOf.get(n) === d).pop()!.val);
          expected = out; break;
        }
        default: throw new Error(`untested concept ${id}`);
      }
      assert.deepEqual(c.answer, expected, `${id} variant ${variant}: ${c.prompt}`);
      const typed = typeof expected === 'boolean' ? (expected ? 'yes' : 'no') : JSON.stringify(expected);
      assert.equal(answerMatches(c, typed), true, `${id} variant ${variant}: ${typed}`);
      assert.equal(answerMatches(c, 'not an answer'), false);
      assert.equal(c.hints.length, 3); assert.equal(c.rubric.length, 3);
    }
    assert.ok(prompts.size >= 2, `${id}: the input must vary with the variant`);
  }
  assert.ok(strategiesUsed.size >= 6);
});
