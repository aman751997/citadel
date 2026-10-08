import test from 'node:test';
import assert from 'node:assert/strict';
import { solveLab } from '../src/lib/lab.ts';
import { answerMatches } from '../src/lib/review.ts';
import { lab, fromInput, type GraphState } from '../src/lib/labs/advanced-graphs.ts';
import { figures, mstPoints, kahnSteps, orderSteps, alienSteps, componentSteps, treeSteps, redundantSteps, dijkstraSteps, primSteps, flightSteps, mixedReview } from '../src/data/advanced-graphs/traces.ts';
import { hints } from '../src/data/advanced-graphs/hints.ts';
import { practice, conceptIds } from '../src/data/practice/advanced-graphs.ts';

// ---------- independent helpers (deliberately naive) ----------
const range = (n: number) => Array.from({ length: n }, (_, i) => i);
type E = [number, number];
type W = [number, number, number];
// reach[i][j]: a directed path of length >= 1 from i to j
function closure(n: number, edges: E[]) {
  const r = range(n).map(() => Array(n).fill(false));
  for (const [a, b] of edges) r[a][b] = true;
  for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) if (r[i][k]) for (let j = 0; j < n; j++) if (r[k][j]) r[i][j] = true;
  return r;
}
const hasCycle = (n: number, edges: E[]) => closure(n, edges).some((row, i) => row[i]);
// nodes that are on a cycle or can be reached from one (Kahn's leftovers)
function stuckNodes(n: number, edges: E[]) {
  const r = closure(n, edges);
  return range(n).filter(v => r[v][v] || range(n).some(c => r[c][c] && r[c][v]));
}
const forward = (order: number[], edges: E[]) => edges.every(([u, v]) => order.indexOf(u) < order.indexOf(v));
function labels(n: number, edges: E[]) {
  const lab = range(n);
  let changed = true;
  while (changed) {
    changed = false;
    for (const [a, b] of edges) { const m = Math.min(lab[a], lab[b]); if (lab[a] !== m || lab[b] !== m) { lab[a] = m; lab[b] = m; changed = true; } }
  }
  return lab;
}
const componentCount = (n: number, edges: E[]) => new Set(labels(n, edges)).size;
function isTree(n: number, edges: E[]) {
  if (componentCount(n, edges) !== 1) return false;
  return edges.every((e, i) => { const lab = labels(n, edges.filter((_, j) => j !== i)); return lab[e[0]] !== lab[e[1]]; });
}
const closesLoop = (n: number, edges: E[]) => edges.filter((e, i) => { const lab = labels(n, edges.slice(0, i)); return lab[e[0]] === lab[e[1]]; });
function floyd(n: number, roads: W[]) {
  const d = range(n).map(i => range(n).map(j => (i === j ? 0 : Infinity)));
  for (const [a, b, w] of roads) d[a][b] = Math.min(d[a][b], w);
  for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (d[i][k] + d[k][j] < d[i][j]) d[i][j] = d[i][k] + d[k][j];
  return d;
}
const manhattan = (p: number[], q: number[]) => Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]);
function bruteMst(pts: number[][]) {
  const n = pts.length;
  if (n === 1) return 0;
  const cables: E[] = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) cables.push([i, j]);
  let best = Infinity;
  for (let mask = 0; mask < 1 << cables.length; mask++) {
    const chosen = cables.filter((_, b) => mask >> b & 1);
    if (chosen.length !== n - 1) continue;
    const cost = chosen.reduce((s, [a, b]) => s + manhattan(pts[a], pts[b]), 0);
    if (cost < best && componentCount(n, chosen) === 1) best = cost;
  }
  return best;
}
function bruteFlights(n: number, flights: W[], src: number, dst: number, k: number) {
  let best = Infinity;
  const walk = (city: number, cost: number, left: number) => {
    if (city === dst) best = Math.min(best, cost);
    if (left === 0) return;
    for (const [a, b, p] of flights) if (a === city) walk(b, cost + p, left - 1);
  };
  walk(src, 0, k + 1);
  return best === Infinity ? -1 : best;
}
function permutations<T>(xs: T[]): T[][] {
  if (xs.length <= 1) return [xs];
  return xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map(p => [x, ...p]));
}
function sortedUnder(words: string[], alphabet: string) {
  const rank = (c: string) => alphabet.indexOf(c);
  return words.every((a, i) => {
    if (i + 1 === words.length) return true;
    const b = words[i + 1];
    for (let j = 0; j < Math.min(a.length, b.length); j++) if (a[j] !== b[j]) return rank(a[j]) < rank(b[j]);
    return a.length <= b.length;
  });
}
function validAlphabets(words: string[]) {
  const letters = [...new Set(words.join('').split(''))];
  return permutations(letters).map(p => p.join('')).filter(a => sortedUnder(words, a));
}
const firstRule = (a: string, b: string) => { for (let j = 0; j < Math.min(a.length, b.length); j++) if (a[j] !== b[j]) return `${a[j]}${b[j]}`; return null; };
const cells = (row: { cells: { value: string }[] }) => row.cells.map(c => c.value);
const nums = (row: { cells: { value: string }[] }) => cells(row).map(Number);
const correct = (s: { answer: number; choices: { label: string }[] }) => s.choices[s.answer].label;

// ---------- traces ----------
const allTraces = { kahnSteps, orderSteps, alienSteps, componentSteps, treeSteps, redundantSteps, dijkstraSteps, primSteps, flightSteps, mixedReview };
test('every trace step has a valid answer and feedback for each choice', () => {
  for (const steps of Object.values(allTraces)) for (const s of steps) {
    assert.ok(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length);
    for (const c of s.choices) assert.ok(c.feedback.length > 20, c.label);
  }
});

const prereqTracks = (pre: E[]): E[] => pre.map(([a, b]) => [b, a]);
function kahn(n: number, edges: E[]) {        // returns pop order; independent of the lab
  const indeg = Array(n).fill(0);
  for (const [, v] of edges) indeg[v]++;
  const q = range(n).filter(i => indeg[i] === 0), order: number[] = [];
  while (q.length) { const u = q.shift()!; order.push(u); for (const [a, b] of edges) if (a === u && --indeg[b] === 0) q.push(b); }
  return { order, indeg };
}

test('chapter 1 and 2 traces match an independent Kahn run', () => {
  const diamond = prereqTracks([[1, 0], [2, 0], [3, 1], [3, 2]]);
  const indeg = range(4).map(v => diamond.filter(([, b]) => b === v).length);
  assert.deepEqual(indeg, [0, 1, 1, 2]);
  assert.match(correct(kahnSteps[0]), /1 → 3, and course 3 has in-degree 2/);
  assert.deepEqual(nums(kahnSteps[1].rows[0]), indeg);
  // after popping 0: courses 1 and 2 drop to 0, 3 stays at 2
  const after = [...indeg]; for (const [a, b] of diamond) if (a === 0) after[b]--;
  assert.deepEqual(range(4).filter(i => i !== 0 && after[i] === 0), [1, 2]);
  assert.match(correct(kahnSteps[1]), /\[1, 2\]/);
  const stuck = prereqTracks([[1, 0], [1, 2], [2, 1]]);
  const run = kahn(3, stuck);
  assert.deepEqual(run.order, [0]);
  assert.equal(run.indeg[1], 1);
  assert.ok(hasCycle(3, stuck));
  assert.match(correct(kahnSteps[2]), /^false/);
  // chapter 2
  assert.deepEqual(kahn(4, diamond).order, [0, 1, 2, 3]);
  assert.deepEqual(nums(orderSteps[0].rows[0]), [0, 1, 2, 3]);
  assert.ok(forward([0, 2, 1, 3], diamond));
  assert.match(correct(orderSteps[0]), /^Yes/);
  assert.deepEqual(kahn(2, [[1, 0]]).order, [1, 0]);                 // the reversed track 1 -> 0
  assert.match(correct(orderSteps[1]), /\[1, 0\]/);
  const partial: E[] = [[0, 1], [1, 2], [2, 3], [3, 2]];
  assert.deepEqual(kahn(4, partial).order, [0, 1]);
  assert.deepEqual(stuckNodes(4, partial), [2, 3]);
  assert.match(correct(orderSteps[2]), /empty array/);
});

test('chapter 3 trace and figure match the words', () => {
  const words = ['wrt', 'wrf', 'er', 'ett', 'rftt'];
  assert.equal(firstRule('wrf', 'er'), 'we');
  assert.match(correct(alienSteps[0]), /w comes before e/);
  const rules = words.slice(1).map((w, i) => firstRule(words[i], w)!);
  assert.deepEqual(new Set(rules), new Set(['tf', 'we', 'rt', 'er']));
  const letters = cells(alienSteps[1].rows[0]);
  const indeg = letters.map(c => rules.filter(r => r[1] === c).length);
  assert.deepEqual(nums(alienSteps[1].rows[1]), indeg);
  assert.deepEqual(validAlphabets(words), ['wertf']);
  assert.match(correct(alienSteps[1]), /"wertf"/);
  assert.deepEqual(validAlphabets(['abc', 'ab']), []);
  assert.match(correct(alienSteps[2]), /^"": /);
  // figure: one arrow per rule, labelled with the pair that proves it
  const fig = figures.alien;
  assert.deepEqual(new Set(fig.edges.map(e => `${e.from}${e.to}`)), new Set(rules));
  for (const e of fig.edges) { const [a, b] = e.label!.split(' | '); assert.equal(firstRule(a, b), `${e.from}${e.to}`); assert.equal(words.indexOf(b), words.indexOf(a) + 1); }
  for (const nd of fig.nodes) assert.equal(nd.note, `in ${rules.filter(r => r[1] === nd.id).length}`);
});

// A tiny DSU written independently of the lab and the practice file: union by size, ties keep the first root.
function dsu(n: number) {
  const parent = range(n), size = Array(n).fill(1);
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const union = (a: number, b: number) => { let ra = find(a), rb = find(b); if (ra === rb) return false; if (size[ra] < size[rb]) [ra, rb] = [rb, ra]; parent[rb] = ra; size[ra] += size[rb]; return true; };
  return { parent, size, find, union };
}

test('chapter 4–6 traces and figures match independent union-find runs', () => {
  const d = dsu(5);
  d.union(0, 1);
  assert.deepEqual(d.parent, [0, 0, 2, 3, 4]);
  assert.deepEqual(nums(componentSteps[0].rows[0]), d.parent);
  assert.deepEqual(nums(componentSteps[0].rows[1]), d.size);
  d.union(1, 2);
  assert.equal(d.parent[2], 0);
  assert.match(correct(componentSteps[0]), /parent\[2\] = 0/);
  d.union(3, 4);
  assert.deepEqual(d.parent, [0, 0, 0, 3, 3]);
  assert.equal(componentCount(5, [[0, 1], [1, 2], [3, 4]]), 2);
  assert.match(correct(componentSteps[1]), /^2:/);
  // compression of [0, 0, 1, 2]
  const c = dsu(4); c.parent.splice(0, 4, 0, 0, 1, 2); c.find(3);
  assert.deepEqual(c.parent, [0, 0, 0, 0]);
  assert.match(correct(componentSteps[2]), /\[0, 0, 0, 0\]/);
  // the wrong choice "parent[1] = 2" really disconnects 0 from 1
  const bad = [0, 0, 2, 3, 4]; bad[1] = 2;
  const root = (x: number) => { while (bad[x] !== x) x = bad[x]; return x; };
  assert.notEqual(root(0), root(1));
  // figures: compression before/after
  const before = Object.fromEntries(figures.forestBefore.edges.map(e => [Number(e.from), Number(e.to)]));
  const f = dsu(5); for (const [x, p] of Object.entries(before)) f.parent[Number(x)] = p;
  assert.equal(f.find(4), 0);
  const afterFig = Object.fromEntries(figures.forestAfter.edges.map(e => [Number(e.from), Number(e.to)]));
  for (let x = 1; x < 5; x++) assert.equal(f.parent[x], afterFig[x], `after find(4), parent[${x}]`);
  assert.deepEqual(figures.forestBefore.edges.filter(e => e.from === '2').map(e => e.to), ['0']);   // 2 was not on the walk
  // chapter 5
  assert.equal(isTree(5, [[0, 1], [0, 2], [0, 3], [1, 4]]), true);
  assert.match(correct(treeSteps[0]), /^Yes/);
  assert.equal(isTree(4, [[0, 1], [1, 2], [2, 0]]), false);
  assert.match(correct(treeSteps[1]), /^No/);
  assert.equal(isTree(4, [[0, 1], [2, 3]]), false);
  assert.match(correct(treeSteps[2]), /^No/);
  const loopFig = figures.loopAndIsland.edges.map(e => [Number(e.from), Number(e.to)] as E);
  assert.deepEqual(loopFig, [[0, 1], [1, 2], [2, 0]]);
  assert.deepEqual(figures.twoPieces.edges.map(e => [Number(e.from), Number(e.to)]), [[0, 1], [2, 3]]);
  // chapter 6: the last edge whose removal leaves a tree
  const lc: E[] = [[1, 2], [2, 3], [3, 4], [1, 4], [1, 5]];
  const removable = lc.filter((_, i) => isTree(5, lc.filter((__, j) => j !== i).map(([a, b]) => [a - 1, b - 1] as E)));
  assert.deepEqual(removable, [[1, 2], [2, 3], [3, 4], [1, 4]]);
  assert.deepEqual(removable[removable.length - 1], [1, 4]);
  assert.deepEqual(closesLoop(6, lc), [[1, 4]]);
  assert.match(correct(redundantSteps[0]), /Return \[1, 4\]/);
  const surplus = figures.surplus.edges;
  assert.deepEqual(surplus.map(e => [Number(e.from), Number(e.to)]), lc);
  assert.deepEqual(surplus.filter(e => e.tone === 'red').map(e => e.label), ['#4']);
});

test('chapter 7 trace and figures match Floyd–Warshall', () => {
  const roads: W[] = [[0, 1, 4], [0, 2, 1], [2, 1, 2], [1, 3, 1], [2, 3, 5]];
  const d = floyd(4, roads)[0];
  assert.deepEqual(d, [0, 3, 1, 4]);
  assert.deepEqual(cells(dijkstraSteps[2].rows[0]).map(Number), d);
  // after relaxing 0 only, the board offers 4 to town 1 and 1 to town 2
  assert.deepEqual(cells(dijkstraSteps[0].rows[0]), ['0', '4', '1', '∞']);
  assert.match(correct(dijkstraSteps[0]), /^\(1, 2\)/);
  assert.equal(1 + 2, 3); assert.equal(1 + 5, 6);
  assert.match(correct(dijkstraSteps[1]), /dist\[1\] = 3, dist\[3\] = 6/);
  assert.equal(3 + 1, 4);                                           // 1 -> 3 after settling 1 at 3
  assert.match(correct(dijkstraSteps[2]), /4 > dist\[1\] = 3/);
  // figure: notes are the distances; green roads are tight (dist[u] + w = dist[v])
  const fig = figures.mail;
  for (const nd of fig.nodes) assert.equal(nd.note, `dist ${d[Number(nd.id)]}`);
  assert.deepEqual(fig.edges.map(e => [Number(e.from), Number(e.to), Number(e.label)]), roads);
  for (const e of fig.edges) {
    const tight = d[Number(e.from)] + Number(e.label) === d[Number(e.to)];
    assert.equal(e.tone === 'green', tight, `${e.from}->${e.to}`);
  }
  // negative counterexample: true fare 1; textbook Dijkstra settles B at 2
  const neg: W[] = [[0, 1, 2], [0, 2, 3], [2, 1, -2]];
  assert.equal(floyd(3, neg)[0][1], 1);
  const settledB = Math.min(2, 3);                                 // B (2) is popped before C (3)
  assert.equal(settledB, 2);
  assert.deepEqual(figures.negative.edges.map(e => e.label), ['2', '3', '−2']);
});

test('chapter 8 trace and figure match a brute-force MST', () => {
  const p = mstPoints;
  assert.deepEqual(p, [[0, 0], [2, 2], [3, 10], [5, 2], [7, 0]]);
  assert.equal(bruteMst(p), 20);
  assert.deepEqual(cells(primSteps[0].rows[0]).slice(1).map(Number), [1, 2, 3, 4].map(i => manhattan(p[0], p[i])));
  const afterP1 = [2, 3, 4].map(i => Math.min(manhattan(p[0], p[i]), manhattan(p[1], p[i])));
  assert.deepEqual(cells(primSteps[1].rows[0]).slice(2).map(Number), afterP1);
  assert.equal(Math.min(7, manhattan(p[3], p[4])), 4);
  assert.deepEqual(nums(primSteps[2].rows[0]), [0, 4, 9, 3, 4]);
  assert.equal([0, 4, 9, 3, 4].reduce((a, b) => a + b), 20);
  assert.match(correct(primSteps[2]), /= 20$/);
  const green = figures.cable.edges;
  const chosen = green.map(e => [Number(e.from.slice(1)), Number(e.to.slice(1))] as E);
  assert.equal(componentCount(5, chosen), 1);
  assert.equal(chosen.reduce((s, [a, b]) => s + manhattan(p[a], p[b]), 0), 20);
  for (const e of green) assert.equal(Number(e.label), manhattan(p[Number(e.from.slice(1))], p[Number(e.to.slice(1))]));
});

test('chapter 9 trace and figure match exhaustive walk enumeration', () => {
  const tri: W[] = [[0, 1, 100], [1, 2, 100], [0, 2, 500]];
  assert.deepEqual(figures.tickets.edges.map(e => [Number(e.from), Number(e.to), Number(e.label)]), tri);
  assert.equal(bruteFlights(3, tri, 0, 2, 0), 500);
  assert.equal(bruteFlights(3, tri, 0, 2, 1), 200);
  // the in-place bug: one round, flights in input order
  const cost = [0, Infinity, Infinity];
  for (const [a, b, w] of tri) if (cost[a] + w < cost[b]) cost[b] = cost[a] + w;
  assert.equal(cost[2], 200);
  assert.match(correct(flightSteps[0]), /k \+ 1 = 1 round/);
  assert.match(correct(flightSteps[1]), /cost\[2\] = 500/);
  assert.match(correct(flightSteps[2]), /^200/);
  assert.deepEqual(cells(flightSteps[2].rows[0]), ['0', '100', '500']);
  // the Dijkstra trap from the lesson: 0->1 (1), 1->2 (1), 0->2 (5), 2->3 (1), k = 1
  assert.equal(bruteFlights(4, [[0, 1, 1], [1, 2, 1], [0, 2, 5], [2, 3, 1]], 0, 3, 1), 6);
});

test('mixed review numbers', () => {
  // shortest-path tree from A vs MST on A–B 2, A–C 2, B–C 1
  const tri: W[] = [[0, 1, 2], [0, 2, 2], [1, 2, 1]];
  const spt = 2 + 2;
  const mst = Math.min(...[[0, 1], [0, 2], [1, 2]].map(skip => tri.filter((_, i) => i !== tri.findIndex(t => t[0] === skip[0] && t[1] === skip[1])).reduce((s, t) => s + t[2], 0)));
  assert.equal(spt, 4); assert.equal(mst, 3);
  assert.equal(isTree(4, [[0, 1], [1, 2], [2, 0]]), false);
  assert.equal(floyd(3, [[0, 1, 2], [0, 2, 3], [2, 1, -2]])[0][1], 1);
});

test('every remaining figure matches its example', () => {
  // diamond and stuck figures
  const diamondTracks = prereqTracks([[1, 0], [2, 0], [3, 1], [3, 2]]);
  assert.deepEqual(figures.diamond.edges.map(e => [Number(e.from), Number(e.to)]), diamondTracks);
  for (const nd of figures.diamond.nodes) assert.equal(nd.note, `in ${diamondTracks.filter(([, b]) => b === Number(nd.id)).length}`);
  assert.deepEqual(new Set(figures.stuck.edges.map(e => `${e.from}${e.to}`)), new Set(prereqTracks([[1, 0], [1, 2], [2, 1]]).map(([a, b]) => `${a}${b}`)));
  // safe stations
  const graph = [[1, 2], [2, 3], [5], [0], [5], [], []];
  const edges: E[] = graph.flatMap((outs, u) => outs.map(v => [u, v] as E));
  assert.deepEqual(new Set(figures.safe.edges.map(e => `${e.from}${e.to}`)), new Set(edges.map(([a, b]) => `${a}${b}`)));
  const r = closure(7, edges);
  const safe = range(7).filter(u => !r[u][u] && !range(7).some(w => r[u][w] && r[w][w]));
  assert.deepEqual(safe, [2, 4, 5, 6]);
  assert.deepEqual(figures.safe.nodes.filter(nd => nd.tone === 'green').map(nd => Number(nd.id)).sort(), safe);
  // ratios: 2 × 3 = 6
  assert.deepEqual(figures.ratios.edges.map(e => e.label), ['a/b = 2', 'b/c = 3', 'a/c = 6']);
});

test('every hint ladder referenced by the lesson exists with three hints', async () => {
  const { readFileSync } = await import('node:fs');
  const mdx = readFileSync(new URL('../src/dsa-lessons/advanced-graphs.mdx', import.meta.url), 'utf8');
  const used = [...mdx.matchAll(/hints=\{hints\.(\w+)\}/g)].map(m => m[1]);
  assert.ok(used.length >= 14);
  for (const key of used) assert.equal(hints[key]?.length, 3, key);
  for (const key of Object.keys(hints)) assert.ok(used.includes(key), `unused hint ${key}`);
  const figs = [...mdx.matchAll(/figures\.(\w+)/g)].map(m => m[1]);
  for (const key of figs) assert.ok(key in figures, `missing figure ${key}`);
  for (const key of Object.keys(figures)) assert.ok(figs.includes(key), `unused figure ${key}`);
});

// ---------- lab ----------
type Oracle = (start: GraphState, final: GraphState) => void;
const oracles: Record<string, Oracle> = {
  kahn: (s, f) => {
    if (hasCycle(s.n, s.edges)) {
      assert.equal(f.verdict, 'cycle');
      const stuck = stuckNodes(s.n, s.edges);
      assert.deepEqual([...f.order].sort((a, b) => a - b), range(s.n).filter(v => !stuck.includes(v)));
    } else {
      assert.equal(f.verdict, 'order');
      assert.equal(f.order.length, s.n);
      assert.ok(forward(f.order, s.edges), `order ${f.order} must point every track forward`);
    }
  },
  uf: (s, f) => {
    assert.equal(f.sets, componentCount(s.n, s.links));
    assert.deepEqual(f.closers, closesLoop(s.n, s.links));
    const lab = labels(s.n, s.links);
    const root = (x: number) => { while (f.parent[x] !== x) x = f.parent[x]; return x; };
    for (let a = 0; a < s.n; a++) for (let b = 0; b < s.n; b++) assert.equal(root(a) === root(b), lab[a] === lab[b]);
  },
  dijkstra: (s, f) => {
    const d = floyd(s.n, s.roads)[s.src];
    assert.deepEqual(f.dist, d.map(x => (x === Infinity ? null : x)));
  },
};
function runCase(start: GraphState) {
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
      assert.doesNotMatch(state.message, /undefined|NaN|Infinity/);
    }
    assert.equal(state.done, true);
  }
});

test('lab agrees with brute force on random small inputs', () => {
  let seed = 4242; const rnd = (n: number) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return (seed >>> 8) % n; };
  const pairs = (n: number, max: number, undirected: boolean) => {
    const out: E[] = [], seen = new Set<string>();
    const m = rnd(max + 1);
    for (let t = 0; t < 50 && out.length < m; t++) {
      const a = rnd(n), b = rnd(n);
      const key = undirected ? `${Math.min(a, b)},${Math.max(a, b)}` : `${a},${b}`;
      if (a !== b && !seen.has(key)) { seen.add(key); out.push([a, b]); }
    }
    return out;
  };
  for (let t = 0; t < 200; t++) {
    const n = 1 + rnd(6);
    runCase({ ...lab.create('kahn'), ...fromInput({ mode: 'kahn', n, edges: pairs(n, 8, false) }) } as GraphState);
    runCase({ ...lab.create('uf'), ...fromInput({ mode: 'uf', n, edges: pairs(n, 7, true) }) } as GraphState);
    const roads = pairs(n, 9, false).map(([a, b]) => [a, b, rnd(10)] as W);
    runCase({ ...lab.create('dijkstra'), ...fromInput({ mode: 'dijkstra', n, roads, src: rnd(n) }) } as GraphState);
  }
});

test('the lab catches the classic wrong moves with the board numbers', () => {
  // Kahn: forcing a stalled station in the 2 <-> 3 loop
  let k = lab.create('kahn', 1);
  for (const a of ['seed', 'pop', 'cut', 'pop', 'cut']) k = lab.move(k, a).state;
  assert.equal(lab.expected(k), 'cycle');
  assert.match(lab.move(k, 'force').state.message, /Station 2 still waits on 1 unbuilt station\(s\) \(3\)/);
  assert.match(lab.move(k, 'finish').state.message, /Only 2 of 4 stations are placed/);
  // Kahn: popping before cutting
  let k0 = lab.move(lab.move(lab.create('kahn', 0), 'seed').state, 'pop').state;
  assert.match(lab.move(k0, 'pop').state.message, /tracks to 1, 2 still count against them/);
  // union-find: re-pointing a member, and merging a clan with itself
  let u = lab.create('uf', 3);                         // tracks 0–1, 2–3, 1–3, 0–2, 4–5
  for (const a of ['find', 'union', 'find', 'union']) u = lab.move(u, a).state;
  assert.match(lab.move(u, 'link').state.message, /Junction 3 hangs under 2 \(clan head 2\)/);
  for (const a of ['find', 'union', 'find']) u = lab.move(u, a).state;
  assert.equal(lab.expected(u), 'loop');
  assert.match(lab.move(u, 'union').state.message, /already connected/);
  // Dijkstra: relaxing a stale ticket
  let d = lab.create('dijkstra', 1);
  for (const a of ['pop', 'relax', 'pop', 'relax', 'pop', 'relax', 'pop']) d = lab.move(d, a).state;
  assert.deepEqual(d.ticket, [4, 1]);
  assert.match(lab.move(d, 'relax').state.message, /dist\[1\] is already 3/);
  assert.match(lab.move(d, 'skip').state.message, /stale ticket \(4, town 1\)/);
});

// ---------- practice ----------
const pairsIn = (text: string): E[] => [...text.matchAll(/\((\d+), (\d+)\)/g)].map(m => [Number(m[1]), Number(m[2])]);
const triplesIn = (text: string): W[] => [...text.matchAll(/\((\d+), (\d+), (\d+)\)/g)].map(m => [Number(m[1]), Number(m[2]), Number(m[3])]);
function num(prompt: string, re: RegExp) { const m = prompt.match(re); assert.ok(m, `${re} in ${prompt}`); return Number(m![1]); }
function bruteEffort(h: number[][]) {                 // every simple route, worst step minimised
  const rows = h.length, cols = h[0].length;
  let best = Infinity;
  const seen = h.map(r => r.map(() => false));
  const go = (r: number, c: number, worst: number) => {
    if (worst >= best) return;
    if (r === rows - 1 && c === cols - 1) { best = worst; return; }
    seen[r][c] = true;
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nc >= 0 && nr < rows && nc < cols && !seen[nr][nc]) go(nr, nc, Math.max(worst, Math.abs(h[nr][nc] - h[r][c])));
    }
    seen[r][c] = false;
  };
  go(0, 0, 0);
  return best;
}

test('every practice answer matches an independent computation from the prompt', () => {
  assert.equal(practice.storageKey, 'citadel-advanced-graphs-review-v1');
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
      assert.doesNotMatch(c.prompt, /topolog|in-?degree|union|disjoint|dijkstra|\bheap|priority|spanning|kruskal|\bprim|bellman|\bbfs\b|breadth|\bdfs\b|depth-first|graph|\btree\b|queue/i, `${id}: the prompt must not name the technique`);
      let expected: number | number[] | boolean | string;
      const p = c.prompt;
      switch (id) {
        case 'can-finish': case 'blocked': {
          const n = num(p, /workshops? (?:numbered )?0 to (\d+)/i) + 1;
          const tracks = prereqTracks(pairsIn(p));
          expected = id === 'can-finish' ? !hasCycle(n, tracks) : stuckNodes(n, tracks).length;
          break;
        }
        case 'build-order': {
          const n = num(p, /Stations 0 to (\d+)/) + 1;
          const tracks = prereqTracks(pairsIn(p));
          const valid = permutations(range(n)).filter(o => forward(o, tracks));
          assert.equal(valid.length, 1, `${id} variant ${variant}: order must be unique`);
          expected = valid[0];
          break;
        }
        case 'alien': {
          const words = [...p.matchAll(/"([a-z]+)"/g)].map(m => m[1]);
          const valid = validAlphabets(words);
          assert.ok(valid.length <= 1, `${id} variant ${variant}: order must be unique when it exists`);
          expected = valid.length ? valid[0] : 'none';
          break;
        }
        case 'components': expected = componentCount(num(p, /^(\d+) junctions/), pairsIn(p)); break;
        case 'valid-tree': expected = isTree(num(p, /^(\d+) junctions/), pairsIn(p)); break;
        case 'redundant': {
          const n = num(p, /Junctions 1 to (\d+)/);
          const es = pairsIn(p);
          const ok = es.filter((_, i) => isTree(n, es.filter((__, j) => j !== i).map(([a, b]) => [a - 1, b - 1] as E)));
          expected = ok[ok.length - 1];
          break;
        }
        case 'delay': {
          const n = num(p, /numbered 1 to (\d+)/), k = num(p, /starts at relay (\d+)/);
          const d = floyd(n, triplesIn(p).map(([a, b, w]) => [a - 1, b - 1, w] as W))[k - 1];
          expected = d.some(x => x === Infinity) ? -1 : Math.max(...d);
          break;
        }
        case 'cable': expected = bruteMst([...p.matchAll(/\((-?\d+), (-?\d+)\)/g)].map(m => [Number(m[1]), Number(m[2])])); break;
        case 'k-stops': {
          const n = num(p, /Cities 0 to (\d+)/) + 1;
          expected = bruteFlights(n, triplesIn(p), num(p, /from city (\d+)/), num(p, /to city (\d+) with/), num(p, /at most (\d+) stop/));
          break;
        }
        case 'safe': {
          const lists = [...p.matchAll(/(\d+) → \[([^\]]*)\]/g)];
          const n = lists.length;
          const es: E[] = lists.flatMap(m => (m[2].trim() ? m[2].split(', ').map(x => [Number(m[1]), Number(x)] as E) : []));
          const r = closure(n, es);
          expected = range(n).filter(u => !r[u][u] && !range(n).some(w => r[u][w] && r[w][w]));
          break;
        }
        case 'parallel': {
          const times = [...p.matchAll(/course (\d+) takes (\d+) month/g)].map(m => Number(m[2]));
          const n = times.length;
          const rel = pairsIn(p).map(([a, b]) => [a - 1, b - 1] as E);
          const finish = Array(n).fill(0);
          for (let round = 0; round <= n; round++) for (let v = 0; v < n; v++) finish[v] = times[v] + Math.max(0, ...rel.filter(([, b]) => b === v).map(([a]) => finish[a]));
          expected = Math.max(...finish);
          break;
        }
        case 'accounts': {
          const recs = [...p.matchAll(/\[(\w+): ([^\]]+)\]/g)].map(m => m[2].split(', '));
          const share = (i: number, j: number) => recs[i].some(e => recs[j].includes(e));
          const es: E[] = [];
          for (let i = 0; i < recs.length; i++) for (let j = i + 1; j < recs.length; j++) if (share(i, j)) es.push([i, j]);
          expected = componentCount(recs.length, es);
          break;
        }
        case 'ratios': {
          const eqs = [...p.matchAll(/(\w) \/ (\w) = (\d+)/g)].map(m => [m[1], m[2], Number(m[3])] as [string, string, number]);
          const [, qx, qy] = p.match(/What is (\w) \/ (\w)\?/)!;
          const val = new Map<string, number>([[qx, 1]]);          // val(y) = qx / y
          const queue = [qx];
          const known = new Set(eqs.flatMap(([a, b]) => [a, b]));
          while (queue.length) {
            const x = queue.shift()!;
            for (const [a, b, r] of eqs) {
              if (a === x && !val.has(b)) { val.set(b, val.get(x)! * r); queue.push(b); }
              if (b === x && !val.has(a)) { val.set(a, val.get(x)! / r); queue.push(a); }
            }
          }
          expected = known.has(qx) && known.has(qy) && val.has(qy) ? val.get(qy)! : -1;
          assert.ok(Number.isInteger(expected), `${id} variant ${variant}: whole-number answer`);
          break;
        }
        case 'effort': expected = bruteEffort([...p.matchAll(/\[([^\]]*)\]/g)].map(m => m[1].split(', ').map(Number))); break;
        case 'hops': {
          const n = num(p, /Cities 0 to (\d+)/) + 1;
          const es = pairsIn(p);
          const d = floyd(n, es.flatMap(([a, b]) => [[a, b, 1], [b, a, 1]] as W[]));
          const s = num(p, /from city (\d+)/), t = num(p, /to city (\d+)\?/);
          expected = d[s][t] === Infinity ? -1 : d[s][t];
          break;
        }
        default: throw new Error(`untested concept ${id}`);
      }
      assert.deepEqual(c.answer, expected, `${id} variant ${variant}: ${p}`);
      const typed = typeof expected === 'boolean' ? (expected ? 'yes' : 'no') : typeof expected === 'string' ? expected : JSON.stringify(expected);
      assert.equal(answerMatches(c, typed), true, `${id} variant ${variant}: ${typed}`);
      assert.equal(answerMatches(c, 'not an answer'), false);
      assert.equal(c.hints.length, 3); assert.equal(c.rubric.length, 3);
    }
    assert.ok(prompts.size >= 2, `${id}: the input must vary with the variant`);
  }
  assert.ok(strategiesUsed.size >= 5);
  for (const s of ['course-schedule', 'course-schedule-ii', 'alien-dictionary', 'connected-components', 'graph-valid-tree', 'redundant-connection', 'network-delay', 'min-cost-points', 'cheapest-flights', 'safe-states', 'parallel-courses', 'accounts-merge', 'evaluate-division', 'min-effort', 'choose-the-tool'])
    assert.ok(sections.has(s), `no practice concept points at ${s}`);
});

test('practice sections exist in the lesson', async () => {
  const { readFileSync } = await import('node:fs');
  const mdx = readFileSync(new URL('../src/dsa-lessons/advanced-graphs.mdx', import.meta.url), 'utf8');
  for (const id of practice.conceptIds) assert.match(mdx, new RegExp(`id="${practice.challengeFor(id, 0).section}"`), id);
});
