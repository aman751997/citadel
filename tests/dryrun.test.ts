import { test } from 'node:test';
import assert from 'node:assert/strict';
import { twoSumSortedFrames, slidingWindowMaxSumFrames, binarySearchFrames, bfsFrames, dfsFrames, subsetsBacktrackFrames, fibDpFrames, knapsackFrames, reverseListFrames, lastVar, recorder, tvars, start, forward, back, reveal, isCorrect, type Frame, type Adj } from '../src/lib/dryrun.ts';
import { renderFrame, renderLegend, layoutTree, treeFromArray, layoutRecursion, circularLayout, esc } from '../src/lib/dryrun-render.ts';

let seed = 12345;
const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
const arr = (len: number, max: number) => Array.from({ length: len }, () => rnd(max) - Math.floor(max / 3));
const sorted = (a: number[]) => [...a].sort((x, y) => x - y);
const ans = (f: Frame[]) => JSON.parse(lastVar(f, 'answer')!);
const every = (f: Frame[]) => { for (const fr of f) { assert.ok(fr.caption.length > 10); assert.ok(fr.views.length > 0); renderFrame(fr); renderLegend(fr); if (fr.predict) { assert.ok(fr.predict.answer >= 0 && fr.predict.answer < fr.predict.options.length); assert.equal(new Set(fr.predict.options).size, fr.predict.options.length); } } };

test('twoSumSorted agrees with brute force', () => {
  for (let t = 0; t < 200; t++) {
    const nums = sorted(arr(1 + rnd(8), 20)), target = rnd(30) - 5;
    const f = twoSumSortedFrames(nums, target); every(f);
    const exists = nums.some((a, i) => nums.some((b, j) => i < j && a + b === target));
    const a = ans(f);
    if (exists) { assert.equal(a.length, 2); assert.ok(a[0] < a[1]); assert.equal(nums[a[0]] + nums[a[1]], target); } else assert.deepEqual(a, []);
  }
});
test('twoSum captions explain why a pointer moves', () => {
  const f = twoSumSortedFrames([1, 3, 4, 6, 8, 11], 7);
  assert.ok(f.some(x => /too big for every remaining left partner/.test(x.caption)));
});

test('slidingWindowMaxSum agrees with brute force', () => {
  for (let t = 0; t < 200; t++) {
    const nums = arr(1 + rnd(9), 15), k = 1 + rnd(nums.length);
    const f = slidingWindowMaxSumFrames(nums, k); every(f);
    let best = -Infinity;
    for (let i = 0; i + k <= nums.length; i++) best = Math.max(best, nums.slice(i, i + k).reduce((a, b) => a + b, 0));
    assert.equal(ans(f), best);
  }
  assert.equal(lastVar(slidingWindowMaxSumFrames([1, 2], 5), 'answer'), 'none');
});

test('binarySearch agrees with indexOf semantics', () => {
  for (let t = 0; t < 300; t++) {
    const nums = sorted(arr(rnd(10), 25)), target = rnd(30) - 8;
    const f = binarySearchFrames(nums, target); every(f);
    const i = ans(f);
    if (nums.includes(target)) assert.equal(nums[i], target); else assert.equal(i, -1);
  }
});
test('binarySearch fades the eliminated half', () => {
  const f = binarySearchFrames([1, 3, 5, 7, 9, 11], 11);
  const v = f[3].views[0] as any;
  assert.ok(Object.values(v.tones).includes('out'));
});

const randomGraph = (directed: boolean) => {
  const n = 2 + rnd(6), ids = Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i));
  const adj: Adj = Object.fromEntries(ids.map(i => [i, []])) as Adj;
  for (let e = 0; e < n + rnd(n); e++) { const a = ids[rnd(n)], b = ids[rnd(n)]; if (a === b || adj[a].includes(b)) continue; adj[a].push(b); if (!directed && !adj[b].includes(a)) adj[b].push(a); }
  return { adj, ids };
};
const reachable = (adj: Adj, s: string) => { const seen = new Set([s]); let grew = true; while (grew) { grew = false; for (const u of [...seen]) for (const v of adj[u]) if (!seen.has(v)) { seen.add(v); grew = true; } } return seen; };
const refBfs = (adj: Adj, s: string) => { const q = [s], seen = new Set([s]), out: string[] = []; while (q.length) { const u = q.shift()!; out.push(u); for (const v of adj[u]) if (!seen.has(v)) { seen.add(v); q.push(v); } } return out; };
const refDfs = (adj: Adj, s: string) => { const seen = new Set<string>(), out: string[] = []; const go = (u: string) => { seen.add(u); out.push(u); for (const v of adj[u]) if (!seen.has(v)) go(v); }; go(s); return out; };

test('bfs order matches reference and reaches exactly the reachable set', () => {
  for (let t = 0; t < 150; t++) {
    const directed = rnd(2) === 1, { adj, ids } = randomGraph(directed), s = ids[rnd(ids.length)];
    const f = bfsFrames(adj, s, { directed }); every(f);
    const order: string[] = ans(f);
    assert.deepEqual(order, refBfs(adj, s));
    assert.deepEqual(new Set(order), reachable(adj, s));
  }
});
test('dfs order matches reference and reaches exactly the reachable set', () => {
  for (let t = 0; t < 150; t++) {
    const directed = rnd(2) === 1, { adj, ids } = randomGraph(directed), s = ids[rnd(ids.length)];
    const f = dfsFrames(adj, s, { directed }); every(f);
    const order: string[] = ans(f);
    assert.deepEqual(order, refDfs(adj, s));
    assert.deepEqual(new Set(order), reachable(adj, s));
  }
});
test('dfs predict sits on the frame that enters the child', () => {
  const f = dfsFrames({ A: ['B'], B: ['A'] }, 'A');
  const p = f.find(x => x.predict)!;
  assert.match(p.caption, /Go deeper/);
});

test('subsets equals the power set and shows an explicit undo', () => {
  for (let n = 0; n <= 4; n++) {
    const nums = Array.from({ length: n }, (_, i) => i + 1);
    const f = subsetsBacktrackFrames(nums); every(f);
    const got = (ans(f) as number[][]).map(s => JSON.stringify(s)).sort();
    const want = Array.from({ length: 1 << n }, (_, m) => nums.filter((_, i) => m >> i & 1)).map(s => JSON.stringify(s)).sort();
    assert.deepEqual(got, want);
    assert.equal(f.filter(x => /^Undo/.test(x.caption)).length, 2 ** n - 1);
  }
  const f = subsetsBacktrackFrames([1, 2]);
  const rec = f[f.length - 2].views[0] as any;
  assert.ok(rec.nodes.some((x: any) => x.tone === 'undone'));
});

test('fibDp equals iterative fib', () => {
  for (let n = 0; n <= 25; n++) {
    const f = fibDpFrames(n); every(f);
    let a = 0, b = 1; for (let i = 0; i < n; i++) [a, b] = [b, a + b];
    assert.equal(ans(f), a);
  }
});

test('knapsack equals brute force subset enumeration', () => {
  for (let t = 0; t < 100; t++) {
    const n = 1 + rnd(5), wt = Array.from({ length: n }, () => 1 + rnd(6)), val = Array.from({ length: n }, () => 1 + rnd(9)), cap = 1 + rnd(10);
    const f = knapsackFrames(wt, val, cap); every(f);
    let best = 0;
    for (let m = 0; m < 1 << n; m++) { let w = 0, v = 0; for (let i = 0; i < n; i++) if (m >> i & 1) { w += wt[i]; v += val[i]; } if (w <= cap) best = Math.max(best, v); }
    assert.equal(ans(f), best);
    const items: number[] = JSON.parse(lastVar(f, 'items')!);
    assert.ok(items.reduce((s, i) => s + wt[i], 0) <= cap);
    assert.equal(items.reduce((s, i) => s + val[i], 0), best);
  }
});

test('reverseList equals Array.reverse', () => {
  for (let t = 0; t < 60; t++) {
    const v = arr(rnd(8), 50);
    const f = reverseListFrames(v); every(f);
    assert.deepEqual(ans(f), [...v].reverse());
  }
});

test('recorder and tvars', () => {
  const r = recorder().frame('hello world frame', [tvars({ a: 1, b: 2 }, { a: 1, b: 3 })], { question: 'q', options: ['x', 'y'], answer: 1, explain: 'e' });
  assert.equal(r.frames.length, 1);
  const v = r.frames[0].views[0] as any;
  assert.deepEqual(v.vars.map((x: any) => x.changed), [false, true]);
  assert.equal(lastVar(r.frames, 'b'), '2');
});

test('predict state machine', () => {
  const f: Frame[] = [
    { caption: 'a', views: [] }, { caption: 'b', views: [], predict: { question: 'q', options: ['1', '2'], answer: 1, explain: 'e' } }, { caption: 'c', views: [] },
  ];
  assert.deepEqual(forward(start, f, false), { i: 1, pending: false });
  const p = forward(start, f, true);
  assert.deepEqual(p, { i: 0, pending: true });
  assert.deepEqual(back(p), start);
  assert.deepEqual(reveal(p), { i: 1, pending: false });
  assert.deepEqual(forward(p, f, true), { i: 1, pending: false });
  assert.deepEqual(forward({ i: 1, pending: false }, f, true), { i: 2, pending: false });
  assert.deepEqual(forward({ i: 2, pending: false }, f, true), { i: 2, pending: false });
  assert.deepEqual(back(start), start);
  assert.ok(isCorrect(f[1].predict!, 1) && !isCorrect(f[1].predict!, 0));
});

test('renderers: every view kind, escaping, layout', () => {
  const html = renderFrame({ caption: 'x', views: [
    { kind: 'array', name: '<n>', values: ['<b>', 2], pointers: [{ at: 0, label: 'i' }], regions: [{ from: 0, to: 1, label: 'w' }], tones: { 0: 'found' } },
    { kind: 'grid', cells: [[1, null]], rowLabels: ['r'], colLabels: ['a', 'b'], tones: [{ r: 0, c: 0, tone: 'active' }], pointers: [{ r: 0, c: 1, label: 'p' }] },
    { kind: 'stack', items: [1, 2], changed: [1] }, { kind: 'queue', items: [], removed: [1] }, { kind: 'set', items: ['a'] }, { kind: 'map', entries: [['k', 'v']] },
    { kind: 'tree', array: [1, 2, null, 3], tones: { '0': 'current' }, path: ['0', '1'] },
    { kind: 'graph', directed: true, nodes: [{ id: 'A' }, { id: 'B', x: 10, y: 10 }], edges: [{ from: 'A', to: 'B', weight: 3, tone: 'active' }] },
    { kind: 'recursion', nodes: [{ id: 'r', label: '[]' }, { id: 'a', parent: 'r', label: '[1]', tone: 'undone', edge: '+1' }] },
    { kind: 'text', vars: [{ name: 'x', value: 1, changed: true }] },
  ] });
  assert.ok(!html.includes('<b>')); assert.ok(html.includes('&lt;b&gt;'));
  assert.equal(esc('<&>"\''), '&lt;&amp;&gt;&quot;&#39;');
  assert.equal(layoutTree(treeFromArray([1, 2, 3])).length, 3);
  const { placed } = layoutRecursion([{ id: 'r', label: 'r' }, { id: 'a', parent: 'r', label: 'a' }, { id: 'b', parent: 'r', label: 'b' }]);
  const [r, a, b] = ['r', 'a', 'b'].map(id => placed.find(p => p.id === id)!);
  assert.equal(r.x, (a.x + b.x) / 2);
  assert.equal(Object.keys(circularLayout(['a', 'b', 'c'])).length, 3);
});
