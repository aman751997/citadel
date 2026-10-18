import test from 'node:test';
import assert from 'node:assert/strict';
import { lastVar, type Frame } from '../src/lib/dryrun.ts';
import {
  flagTimingFrames, countComponentsFrames, islandsFrames, maxAreaFrames, shortestPathFrames, rottingFrames, surroundedFrames, pacificFrames,
  ladderFrames, cloneFrames, floodFillFrames, provincesFrames, nearestZeroFrames, shortestBridgeFrames, openLockFrames, bipartiteFrames,
} from '../src/data/graphs/frames.ts';

// ---------- seeded randomness and independent oracles (different from the lesson's traversals) ----------
let seed = 11;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const int = (n: number) => Math.floor(rnd() * n);
const grid = (rows: number, cols: number, pOne: number) => Array.from({ length: rows }, () => Array.from({ length: cols }, () => (rnd() < pOne ? 1 : 0)));
const dims = () => [1 + int(5), 1 + int(5)] as const;
const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const D8 = [-1, 0, 1].flatMap(a => [-1, 0, 1].map(b => [a, b])).filter(([a, b]) => a || b);
const ans = (f: Frame[]) => lastVar(f, 'answer')!;

function labels(g: number[][], land: (v: number) => boolean) {
  const cols = g[0].length, parent = Array.from({ length: g.length * cols }, (_, i) => i);
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  g.forEach((row, r) => row.forEach((v, c) => {
    if (!land(v)) return;
    if (r + 1 < g.length && land(g[r + 1][c])) parent[find(r * cols + c)] = find((r + 1) * cols + c);
    if (c + 1 < cols && land(g[r][c + 1])) parent[find(r * cols + c)] = find(r * cols + c + 1);
  }));
  return g.map((row, r) => row.map((v, c) => (land(v) ? find(r * cols + c) : -1)));
}
const sizes = (g: number[][]) => { const m = new Map<number, number>(); for (const x of labels(g, v => v === 1).flat()) if (x >= 0) m.set(x, (m.get(x) ?? 0) + 1); return [...m.values()]; };
function relax(rows: number, cols: number, starts: number[][], open: (r: number, c: number) => boolean, dirs: number[][]) {
  const INF = 1e9, d = Array.from({ length: rows }, () => new Array(cols).fill(INF));
  for (const [r, c] of starts) d[r][c] = 0;
  for (let changed = true; changed;) {
    changed = false;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (d[r][c] < INF) for (const [dr, dc] of dirs) {
      const a = r + dr, b = c + dc;
      if (a >= 0 && a < rows && b >= 0 && b < cols && open(a, b) && d[r][c] + 1 < d[a][b]) { d[a][b] = d[r][c] + 1; changed = true; }
    }
  }
  return d;
}
function simulateRot(g0: number[][]) {
  let g = g0.map(r => [...r]), minutes = 0;
  for (;;) {
    if (!g.flat().includes(1)) return minutes;
    const next = g.map(r => [...r]); let any = false;
    g.forEach((row, r) => row.forEach((v, c) => { if (v === 1 && D4.some(([dr, dc]) => g[r + dr]?.[c + dc] === 2)) { next[r][c] = 2; any = true; } }));
    if (!any) return -1;
    g = next; minutes++;
  }
}
function reachesBorder(board: string[][], r0: number, c0: number) {   // forward search from one O
  const seen = new Set([`${r0},${c0}`]), todo = [[r0, c0]];
  for (let i = 0; i < todo.length; i++) {
    const [r, c] = todo[i];
    if (r === 0 || c === 0 || r === board.length - 1 || c === board[0].length - 1) return true;
    for (const [dr, dc] of D4) if (board[r + dr][c + dc] === 'O' && !seen.has(`${r + dr},${c + dc}`)) { seen.add(`${r + dr},${c + dc}`); todo.push([r + dr, c + dc]); }
  }
  return false;
}
function bothOceans(h: number[][]) {   // search DOWNHILL from every square
  const out: number[][] = [];
  h.forEach((row, r) => row.forEach((_, c) => {
    const seen = new Set([`${r},${c}`]), todo = [[r, c]]; let p = false, a = false;
    for (let i = 0; i < todo.length; i++) {
      const [x, y] = todo[i];
      if (x === 0 || y === 0) p = true;
      if (x === h.length - 1 || y === h[0].length - 1) a = true;
      for (const [dr, dc] of D4) { const u = x + dr, w = y + dc; if (h[u]?.[w] !== undefined && h[u][w] <= h[x][y] && !seen.has(`${u},${w}`)) { seen.add(`${u},${w}`); todo.push([u, w]); } }
    }
    if (p && a) out.push([r, c]);
  }));
  return out;
}
const oneApart = (a: string, b: string) => [...a].filter((ch, i) => ch !== b[i]).length === 1;
function ladderOracle(begin: string, end: string, list: string[]) {
  if (!list.includes(end)) return 0;
  const nodes = [...new Set([begin, ...list])], d = nodes.map(w => (w === begin ? 1 : Infinity));
  for (let changed = true; changed;) { changed = false; nodes.forEach((a, i) => nodes.forEach((b, j) => { if (oneApart(a, b) && d[i] + 1 < d[j]) { d[j] = d[i] + 1; changed = true; } })); }
  const e = d[nodes.indexOf(end)];
  return e === Infinity ? 0 : e;
}
function lockOracle(dead: string[], target: string, wheels: number) {
  const bad = new Set(dead), size = 10 ** wheels, name = (n: number) => String(n).padStart(wheels, '0');
  if (bad.has(name(0))) return -1;
  const d = new Array(size).fill(Infinity); d[0] = 0;
  for (let changed = true; changed;) {
    changed = false;
    for (let s = 0; s < size; s++) if (d[s] < Infinity) {
      const digits = name(s);
      for (let i = 0; i < wheels; i++) for (const step of [1, 9]) {
        const t = digits.slice(0, i) + ((Number(digits[i]) + step) % 10) + digits.slice(i + 1);
        if (!bad.has(t) && d[s] + 1 < d[Number(t)]) { d[Number(t)] = d[s] + 1; changed = true; }
      }
    }
  }
  const e = d[Number(target)];
  return e === Infinity ? -1 : e;
}
function ufGroups(n: number, edges: number[][]) {
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  for (const [a, b] of edges) parent[find(a)] = find(b);
  return new Set(Array.from({ length: n }, (_, i) => find(i))).size;
}
function bipartiteBrute(graph: number[][]) {   // try every 2-colouring
  const n = graph.length;
  for (let mask = 0; mask < 2 ** n; mask++) if (graph.every((vs, u) => vs.every(v => ((mask >> u) & 1) !== ((mask >> v) & 1)))) return true;
  return false;
}
function randomEdges(n: number, p: number) {
  const edges: number[][] = [];
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) if (rnd() < p) edges.push([a, b]);
  return edges;
}
const adjList = (n: number, edges: number[][]) => { const g: number[][] = Array.from({ length: n }, () => []); for (const [a, b] of edges) { g[a].push(b); g[b].push(a); } return g; };
const word = (len: number) => Array.from({ length: len }, () => 'abc'[int(3)]).join('');

// ---------- structural sanity: every frame draws something and every predict is well formed ----------
function wellFormed(frames: Frame[]) {
  assert.ok(frames.length > 0);
  for (const f of frames) {
    assert.ok(f.caption.length > 0 && f.views.length > 0);
    if (f.predict) { assert.ok(f.predict.options.length >= 2); assert.ok(f.predict.answer >= 0 && f.predict.answer < f.predict.options.length); }
  }
}

test('Number of Islands and Max Area end on the union-find answers', () => {
  const cases: number[][][] = [[[0]], [[1]], [[1, 1]], [[0, 0], [0, 0]], [[1, 1], [1, 1]], [[1, 0], [0, 1]], [[1, 1, 0, 0, 0], [1, 1, 0, 0, 0], [0, 0, 1, 0, 0], [0, 0, 0, 1, 1]]];
  for (let i = 0; i < 300; i++) { const [r, c] = dims(); cases.push(grid(r, c, 0.3 + 0.4 * rnd())); }
  for (const g of cases) {
    const count = new Set(labels(g, v => v === 1).flat().filter(x => x >= 0)).size;
    assert.equal(ans(islandsFrames(g)), String(count), `islands ${JSON.stringify(g)}`);
    assert.equal(ans(maxAreaFrames(g)), String(Math.max(0, ...sizes(g))), `maxArea ${JSON.stringify(g)}`);
  }
  wellFormed(islandsFrames(cases[cases.length - 1])); wellFormed(maxAreaFrames(cases[6]));
});

test('the dry runs do not mutate their input', () => {
  const g = [[1, 1, 0], [0, 1, 0]], copy = JSON.stringify(g);
  islandsFrames(g); maxAreaFrames(g); rottingFrames(g); shortestBridgeFrames([[1, 0], [0, 1]]);
  assert.equal(JSON.stringify(g), copy);
});

test('Shortest Path in Binary Matrix equals the relaxation distance, with the rock-at-the-ends cases', () => {
  const cases: number[][][] = [[[0]], [[1]], [[0, 1], [1, 0]], [[0, 0, 0], [1, 1, 0], [1, 1, 0]], [[1, 0], [0, 0]], [[0, 0], [0, 1]]];
  for (let i = 0; i < 400; i++) { const n = 1 + int(5); cases.push(grid(n, n, 0.35)); }
  for (const g of cases) {
    const n = g.length;
    const want = g[0][0] === 1 ? -1 : (() => { const d = relax(n, n, [[0, 0]], (r, c) => g[r][c] === 0, D8)[n - 1][n - 1]; return d >= 1e9 ? -1 : d + 1; })();
    assert.equal(ans(shortestPathFrames(g)), String(want), `shortest ${JSON.stringify(g)}`);
  }
  wellFormed(shortestPathFrames(cases[3]));
});

test('Rotting Oranges equals a minute-by-minute simulation', () => {
  const cases: number[][][] = [[[0]], [[1]], [[2]], [[0, 2]], [[2, 1, 1], [1, 1, 0], [0, 1, 1]], [[2, 1, 1], [0, 1, 1], [1, 0, 1]], [[2, 1, 1], [1, 1, 1], [1, 1, 2]]];
  for (let i = 0; i < 400; i++) { const [r, c] = dims(); cases.push(Array.from({ length: r }, () => Array.from({ length: c }, () => [0, 1, 1, 1, 2][int(5)]))); }
  for (const g of cases) assert.equal(ans(rottingFrames(g)), String(simulateRot(g)), `rot ${JSON.stringify(g)}`);
  wellFormed(rottingFrames(cases[4]));
});

test('Surrounded Regions equals "an O survives iff a forward search reaches the border"', () => {
  const cases: string[][][] = [[['O']], [['X']], [['O', 'O', 'O']], [['X', 'X', 'X'], ['X', 'O', 'X'], ['X', 'X', 'X']], [['X', 'X', 'X'], ['O', 'O', 'X'], ['X', 'X', 'X']]];
  for (let i = 0; i < 400; i++) { const [r, c] = dims(); cases.push(Array.from({ length: r }, () => Array.from({ length: c }, () => (rnd() < 0.55 ? 'O' : 'X')))); }
  for (const b of cases) {
    const want = b.map((row, r) => row.map((v, c) => (v === 'O' && reachesBorder(b, r, c) ? 'O' : 'X')).join(''));
    assert.equal(ans(surroundedFrames(b)), JSON.stringify(want), `surrounded ${JSON.stringify(b)}`);
  }
  wellFormed(surroundedFrames(cases[4]));
});

test('Pacific Atlantic equals the downhill search from every square', () => {
  const cases: number[][][] = [[[1]], [[1, 1, 1], [1, 1, 1], [1, 1, 1]], [[1, 2, 3], [8, 9, 4], [7, 6, 5]], [[3, 2, 1]]];
  for (let i = 0; i < 300; i++) { const [r, c] = dims(); cases.push(Array.from({ length: r }, () => Array.from({ length: c }, () => 1 + int(4)))); }
  for (const h of cases) assert.equal(ans(pacificFrames(h)), JSON.stringify(bothOceans(h)), `pacific ${JSON.stringify(h)}`);
  wellFormed(pacificFrames(cases[2]));
});

test('Word Ladder equals the relaxation distance, including a missing end word', () => {
  assert.equal(ans(ladderFrames('hit', 'cog', ['hot', 'dot', 'dog', 'lot', 'log', 'cog'])), '5');
  assert.equal(ans(ladderFrames('hit', 'cog', ['hot', 'dot', 'dog', 'lot', 'log'])), '0');
  assert.equal(ans(ladderFrames('a', 'c', ['a', 'b', 'c'])), '2');
  for (let i = 0; i < 400; i++) {
    const len = 1 + int(3), words = Array.from({ length: 2 + int(7) }, () => word(len)), begin = word(len), end = rnd() < 0.8 ? words[int(words.length)] : word(len);
    if (begin === end) continue;   // the problem promises beginWord != endWord
    assert.equal(ans(ladderFrames(begin, end, words)), String(ladderOracle(begin, end, words)), `ladder ${begin} ${end} ${words}`);
  }
  wellFormed(ladderFrames('hit', 'cog', ['hot', 'dot', 'dog', 'lot', 'log', 'cog']));
});

test('Clone Graph rebuilds exactly the original adjacency with one new node per original', () => {
  for (let i = 0; i < 300; i++) {
    const n = 1 + int(7), edges = randomEdges(n, 0.4);
    for (let k = 1; k < n; k++) edges.push([int(k), k]);                       // connect it
    const g = adjList(n, edges), adj = Object.fromEntries(g.map((vs, u) => [String(u), [...new Set(vs)].map(String)]));
    const frames = cloneFrames(adj, '0');
    assert.equal(ans(frames), JSON.stringify(adj), `clone ${JSON.stringify(adj)}`);
    assert.equal(lastVar(frames, 'created'), String(n));
    wellFormed(frames);
  }
  assert.equal(lastVar(cloneFrames({ '1': [] }, '1'), 'created'), '1');
});

test('Flood Fill equals a fixpoint repaint, including the same-colour case', () => {
  for (let i = 0; i < 400; i++) {
    const [r, c] = dims(), img = Array.from({ length: r }, () => Array.from({ length: c }, () => int(3))), sr = int(r), sc = int(c), color = int(3);
    const old = img[sr][sc], mark = img.map(row => row.map(() => false)); mark[sr][sc] = true;
    for (let changed = true; changed;) { changed = false; img.forEach((row, a) => row.forEach((v, b) => { if (!mark[a][b] && v === old && D4.some(([dr, dc]) => mark[a + dr]?.[b + dc])) { mark[a][b] = true; changed = true; } })); }
    const want = img.map((row, a) => row.map((v, b) => (mark[a][b] ? color : v)));
    assert.equal(ans(floodFillFrames(img, sr, sc, color)), JSON.stringify(want), `floodFill ${JSON.stringify(img)} ${sr},${sc}->${color}`);
  }
  wellFormed(floodFillFrames([[1, 1, 1], [1, 1, 0], [1, 0, 1]], 1, 1, 2));
});

test('Provinces, 01 Matrix and Shortest Bridge end on the oracle answers', () => {
  for (let i = 0; i < 300; i++) {
    const n = 1 + int(6), edges = randomEdges(n, 0.25), m = Array.from({ length: n }, (_, a) => Array.from({ length: n }, (_, b) => (a === b ? 1 : 0)));
    for (const [a, b] of edges) { m[a][b] = 1; m[b][a] = 1; }
    assert.equal(ans(provincesFrames(m)), String(ufGroups(n, edges)), `provinces ${JSON.stringify(m)}`);
    const [r, c] = dims(), mat = grid(r, c, 0.6);
    if (!mat.flat().includes(0)) mat[int(r)][int(c)] = 0;
    const zeros = mat.flatMap((row, a) => row.flatMap((v, b) => (v === 0 ? [[a, b]] : [])));
    const want = mat.map((row, a) => row.map((_, b) => Math.min(...zeros.map(([x, y]) => Math.abs(x - a) + Math.abs(y - b)))));
    assert.equal(ans(nearestZeroFrames(mat)), JSON.stringify(want), `nearestZero ${JSON.stringify(mat)}`);
  }
  let tested = 0;
  for (let i = 0; i < 4000 && tested < 150; i++) {
    const n = 2 + int(4), g = grid(n, n, 0.4), lab = labels(g, v => v === 1);
    const ids = [...new Set(lab.flat().filter(x => x >= 0))];
    if (ids.length !== 2) continue;
    const a = lab.flatMap((row, x) => row.flatMap((v, y) => (v === ids[0] ? [[x, y]] : []))), b = lab.flatMap((row, x) => row.flatMap((v, y) => (v === ids[1] ? [[x, y]] : [])));
    const want = Math.min(...a.flatMap(([x, y]) => b.map(([u, w]) => Math.abs(x - u) + Math.abs(y - w) - 1)));
    assert.equal(ans(shortestBridgeFrames(g)), String(want), `bridge ${JSON.stringify(g)}`);
    tested++;
  }
  assert.ok(tested >= 100, 'enough two-island grids were generated');
  assert.equal(ans(provincesFrames([[1]])), '1');
  wellFormed(shortestBridgeFrames([[1, 1, 0, 0], [1, 0, 0, 0], [0, 0, 0, 1], [0, 0, 1, 1]]));
});

test('Open the Lock equals the relaxation distance (2 and 3 wheels), including a dead start', () => {
  assert.equal(ans(openLockFrames(['00'], '11')), '-1');
  assert.equal(ans(openLockFrames([], '00')), '0');
  assert.equal(ans(openLockFrames(['10', '01', '90'], '11')), String(lockOracle(['10', '01', '90'], '11', 2)));
  const num = (w: number) => String(int(10 ** w)).padStart(w, '0');
  for (let i = 0; i < 200; i++) {
    const w = 2 + (i % 2), dead = Array.from({ length: int(w === 2 ? 40 : 300) }, () => num(w)), target = num(w);
    assert.equal(ans(openLockFrames(dead, target, w)), String(lockOracle(dead, target, w)), `lock ${w} ${target} ${dead}`);
  }
  wellFormed(openLockFrames(['10', '01', '90'], '11'));
});

test('Bipartite colouring agrees with trying every 2-colouring', () => {
  assert.equal(ans(bipartiteFrames([[1, 3], [0, 2], [1, 3], [0, 2]])), 'true');
  assert.equal(ans(bipartiteFrames([[1, 2, 3], [0, 2], [0, 1, 3], [0, 2]])), 'false');
  assert.equal(ans(bipartiteFrames([[1], [0], [3, 4], [2, 4], [2, 3]])), 'false');   // a harmless piece first, odd cycle second
  assert.equal(ans(bipartiteFrames([[], []])), 'true');
  for (let i = 0; i < 500; i++) {
    const n = 1 + int(7), g = adjList(n, randomEdges(n, 0.3));
    assert.equal(ans(bipartiteFrames(g)), String(bipartiteBrute(g)), `bipartite ${JSON.stringify(g)}`);
  }
  wellFormed(bipartiteFrames([[1, 2, 3], [0, 2], [0, 1, 3], [0, 2]]));
});

test('countComponents matches union-find; the late flag queues duplicates the lesson version never does', () => {
  assert.equal(ans(countComponentsFrames(6, [[0, 1], [0, 2], [1, 3], [2, 3], [4, 5]])), '2');
  assert.equal(ans(countComponentsFrames(1, [])), '1');
  for (let i = 0; i < 300; i++) {
    const n = 1 + int(8), edges = randomEdges(n, 0.2);
    assert.equal(ans(countComponentsFrames(n, edges)), String(ufGroups(n, edges)), `components ${n} ${JSON.stringify(edges)}`);
  }
  // late-flag oracle: one queue entry for the start plus one per unvisited neighbour of every first-time poll
  for (let i = 0; i < 300; i++) {
    const n = 2 + int(7), g = adjList(n, randomEdges(n, 0.4)), adj = Object.fromEntries(g.map((vs, u) => [String(u), vs.map(String)]));
    const seen = new Array(n).fill(false), q = [0]; let entries = 1;
    for (let head = 0; head < q.length; head++) {
      const u = q[head];
      if (seen[u]) continue;
      seen[u] = true;
      for (const v of g[u]) if (!seen[v]) { q.push(v); entries++; }
    }
    assert.equal(ans(flagTimingFrames(adj, '0')), String(entries), `late flag ${JSON.stringify(adj)}`);
  }
  assert.equal(ans(flagTimingFrames({ A: ['B', 'C'], B: ['A', 'D'], C: ['A', 'D'], D: ['B', 'C'] }, 'A')), '5');
  wellFormed(flagTimingFrames({ A: ['B', 'C'], B: ['A', 'D'], C: ['A', 'D'], D: ['B', 'C'] }, 'A'));
  wellFormed(countComponentsFrames(6, [[0, 1], [0, 2], [1, 3], [2, 3], [4, 5]]));
});
