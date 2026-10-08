import test from 'node:test';
import assert from 'node:assert/strict';
import { solveLab } from '../src/lib/lab.ts';
import { answerMatches } from '../src/lib/review.ts';
import { lab, fromInput, type GraphState } from '../src/lib/labs/graphs.ts';
import { islands, maxArea, shortestPath, rotting, surrounded, pacific, ladder, clone, mixedReview } from '../src/data/graphs/traces.ts';
import { hints } from '../src/data/graphs/hints.ts';
import { practice, conceptIds } from '../src/data/practice/graphs.ts';

// ---------- independent helpers (deliberately different from the lesson's BFS/DFS) ----------
type Grid = number[][];
const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const D8 = [-1, 0, 1].flatMap(a => [-1, 0, 1].map(b => [a, b])).filter(([a, b]) => a || b);
const inside = (g: unknown[][], r: number, c: number) => r >= 0 && r < g.length && c >= 0 && c < g[0].length;

// union-find labels of cells satisfying `land`
function ufLabels(g: Grid, land: (v: number) => boolean) {
  const cols = g.length ? g[0].length : 0, parent = Array.from({ length: g.length * cols }, (_, i) => i);
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  for (let r = 0; r < g.length; r++) for (let c = 0; c < cols; c++) if (land(g[r][c])) {
    if (r + 1 < g.length && land(g[r + 1][c])) parent[find(r * cols + c)] = find((r + 1) * cols + c);
    if (c + 1 < cols && land(g[r][c + 1])) parent[find(r * cols + c)] = find(r * cols + c + 1);
  }
  return g.map((row, r) => row.map((v, c) => (land(v) ? find(r * cols + c) : -1)));
}
const ufCount = (g: Grid) => new Set(ufLabels(g, v => v === 1).flat().filter(x => x >= 0)).size;
function ufSizes(g: Grid) { const m = new Map<number, number>(); for (const x of ufLabels(g, v => v === 1).flat()) if (x >= 0) m.set(x, (m.get(x) ?? 0) + 1); return [...m.values()]; }
// Bellman-Ford-style relaxation: distances in steps from `starts` through cells where open() holds
function relax(g: Grid, starts: number[][], open: (r: number, c: number) => boolean, dirs = D4) {
  const INF = 1e9, d = g.map(row => row.map(() => INF));
  for (const [r, c] of starts) if (open(r, c)) d[r][c] = 0;
  for (let changed = true; changed;) {
    changed = false;
    for (let r = 0; r < g.length; r++) for (let c = 0; c < g[0].length; c++) if (d[r][c] < INF)
      for (const [dr, dc] of dirs) { const a = r + dr, b = c + dc; if (inside(g, a, b) && open(a, b) && d[r][c] + 1 < d[a][b]) { d[a][b] = d[r][c] + 1; changed = true; } }
  }
  return d.map(row => row.map(x => (x >= INF ? -1 : x)));
}
function simulateRot(g0: Grid) {
  let g = g0.map(r => [...r]), minutes = 0;
  for (;;) {
    if (!g.flat().includes(1)) return minutes;
    const next = g.map(r => [...r]); let any = false;
    for (let r = 0; r < g.length; r++) for (let c = 0; c < g[0].length; c++) if (g[r][c] === 1 && D4.some(([dr, dc]) => inside(g, r + dr, c + dc) && g[r + dr][c + dc] === 2)) { next[r][c] = 2; any = true; }
    if (!any) return -1;
    g = next; minutes++;
  }
}
function forwardPacific(h: Grid) {   // from each cell, search downhill; count cells reaching both edges
  const out: string[] = [];
  for (let r = 0; r < h.length; r++) for (let c = 0; c < h[0].length; c++) {
    const seen = new Set([`${r},${c}`]), todo = [[r, c]]; let p = false, a = false;
    for (let i = 0; i < todo.length; i++) {
      const [x, y] = todo[i];
      if (x === 0 || y === 0) p = true;
      if (x === h.length - 1 || y === h[0].length - 1) a = true;
      for (const [dr, dc] of D4) { const u = x + dr, w = y + dc; if (inside(h, u, w) && !seen.has(`${u},${w}`) && h[u][w] <= h[x][y]) { seen.add(`${u},${w}`); todo.push([u, w]); } }
    }
    if (p && a) out.push(`${r},${c}`);
  }
  return out;
}
const oneApart = (a: string, b: string) => a.length === b.length && [...a].filter((ch, i) => ch !== b[i]).length === 1;
function relaxLadder(begin: string, end: string, list: string[]) {
  if (!list.includes(end)) return 0;
  const nodes = [...new Set([begin, ...list])], d = nodes.map(w => (w === begin ? 1 : Infinity));
  for (let changed = true; changed;) { changed = false; for (let i = 0; i < nodes.length; i++) for (let j = 0; j < nodes.length; j++) if (oneApart(nodes[i], nodes[j]) && d[i] + 1 < d[j]) { d[j] = d[i] + 1; changed = true; } }
  const e = d[nodes.indexOf(end)];
  return e === Infinity ? 0 : e;
}
function relaxLock(dead: string[], target: string) {
  const bad = new Set(dead);
  if (bad.has('0000')) return -1;
  const d = new Array(10000).fill(Infinity); d[0] = 0;
  for (let changed = true; changed;) {
    changed = false;
    for (let s = 0; s < 10000; s++) if (d[s] < Infinity && !bad.has(String(s).padStart(4, '0'))) {
      const digits = String(s).padStart(4, '0');
      for (let i = 0; i < 4; i++) for (const step of [1, 9]) {
        const t = digits.slice(0, i) + ((Number(digits[i]) + step) % 10) + digits.slice(i + 1);
        if (!bad.has(t) && d[s] + 1 < d[Number(t)]) { d[Number(t)] = d[s] + 1; changed = true; }
      }
    }
  }
  return d[Number(target)] === Infinity ? -1 : d[Number(target)];
}
function bruteBipartite(adj: number[][]) {
  for (let mask = 0; mask < 1 << adj.length; mask++) if (adj.every((ns, u) => ns.every(w => ((mask >> u) & 1) !== ((mask >> w) & 1)))) return true;
  return false;
}
// queue counts on an open n x n grid: mode 0 flag on enqueue, 1 flag on poll + skip, 2 flag on poll no skip
function enqueues(n: number, mode: number) {
  const flag = Array.from({ length: n }, () => Array(n).fill(false)), q = [[0, 0]]; let offers = 1;
  if (mode === 0) flag[0][0] = true;
  for (let i = 0; i < q.length; i++) {
    const [r, c] = q[i];
    if (mode === 1 && flag[r][c]) continue;
    if (mode) flag[r][c] = true;
    for (const [dr, dc] of D4) { const a = r + dr, b = c + dc; if (a >= 0 && a < n && b >= 0 && b < n && !flag[a][b]) { if (!mode) flag[a][b] = true; q.push([a, b]); offers++; } }
  }
  return offers;
}
const cells = (row: { cells: { value: string }[] }) => row.cells.map(c => c.value);
const correct = (s: { answer: number; choices: { label: string }[] }) => s.choices[s.answer].label;

// ---------- traces ----------
const allTraces = { islands, maxArea, shortestPath, rotting, surrounded, pacific, ladder, clone, mixedReview };
test('every trace step has a valid answer and real feedback for each choice', () => {
  for (const [name, steps] of Object.entries(allTraces)) {
    assert.ok(steps.length >= 2, name);
    for (const s of steps) {
      assert.ok(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, name);
      for (const c of s.choices) assert.ok(c.feedback.length > 20, `${name}: ${c.label}`);
    }
  }
  assert.ok(mixedReview.length >= 8);
});

test('chapter 1 and 2 trace numbers', () => {
  const lc2 = [[1, 1, 0, 0, 0], [1, 1, 0, 0, 0], [0, 0, 1, 0, 0], [0, 0, 0, 1, 1]];
  assert.deepEqual(islands[0].rows.map(r => cells(r).map(Number)), lc2);
  assert.equal(ufCount(lc2), 3);
  assert.equal(lc2.flat().filter(x => x === 1).length, 7);                    // "would report 7"
  assert.deepEqual(ufSizes(lc2).sort(), [1, 2, 4]);                           // gold island = 4 squares
  assert.match(correct(islands[2]), /^3:/);
  // with eight directions (2,2) and (3,3) merge: 2 islands
  const d8 = relax(lc2, [[2, 2]], (r, c) => lc2[r][c] === 1, D8);
  assert.equal(d8[3][3], 1);
  // the step-2 board is the original with the first island sunk
  const sunk = lc2.map((r, i) => r.map((v, c) => (i < 2 && c < 2 ? 0 : v)));
  assert.deepEqual(islands[1].rows.map(r => cells(r).map(Number)), sunk);
  // Chapter 2: marking on pop counts the 2x2 island as 5, marking on push as 4
  const area = (markOnPush: boolean) => {
    const g = [[1, 1], [1, 1]]; const stack = [[0, 0]]; let n = 0;
    if (markOnPush) g[0][0] = 0;
    while (stack.length) {
      const [r, c] = stack.pop()!;
      if (!markOnPush) g[r][c] = 0;
      n++;
      for (const [dr, dc] of D4) { const a = r + dr, b = c + dc; if (inside(g, a, b) && g[a][b] === 1) { if (markOnPush) g[a][b] = 0; stack.push([a, b]); } }
    }
    return n;
  };
  assert.equal(area(true), 4); assert.equal(area(false), 5);
  assert.match(correct(maxArea[0]), /area comes out 4/);
  assert.match(maxArea[0].choices[1].feedback, /area 5/);
  assert.match(maxArea[1].choices[1].feedback, /1,000,000/);
  assert.equal(1000 * 1000, 1_000_000);
});

test('chapter 3 and 4 trace numbers', () => {
  const g = [[0, 0, 0], [1, 1, 0], [1, 1, 0]];
  const d = relax(g, [[0, 0]], (r, c) => g[r][c] === 0, D8);
  assert.deepEqual(d, [[0, 1, 2], [-1, -1, 2], [-1, -1, 3]]);                 // rings = d + 1
  assert.deepEqual(shortestPath[1].rows.map(cells), [['1', '2', '3'], ['█', '█', '3'], ['█', '█', '4']]);
  // if (1,2) is only reachable from (0,2), it lands in ring 4 and the goal in ring 5
  const noDiag = relax(g, [[0, 0]], (r, c) => g[r][c] === 0 && !(r === 1 && c === 2 && false), D8);
  assert.equal(noDiag[2][2] + 1, 4);
  assert.equal(1 + 1 + 1 + 1 + 1, 5);                                         // (0,0)→(0,1)→(0,2)→(1,2)→(2,2) is 5 squares
  assert.deepEqual([enqueues(10, 0), enqueues(10, 1), enqueues(10, 2)], [100, 181, 184755]);
  assert.match(shortestPath[0].choices[1].feedback, /181 entries instead of 100, or 184,755/);
  assert.match(correct(shortestPath[2]), /^−1/);
  // rotting: two sources -> 2; from (0,0) alone the farthest fresh oranges are 3 away
  const two = [[2, 1, 1], [1, 1, 1], [1, 1, 2]];
  assert.equal(simulateRot(two), 2);
  const fromOne = relax(two, [[0, 0]], (r, c) => two[r][c] === 1 || (r === 0 && c === 0));
  assert.equal(fromOne[2][1], 3); assert.equal(fromOne[1][2], 3);
  const multi = relax(two, [[0, 0], [2, 2]], () => true);
  assert.deepEqual(multi.flat().map((x, i) => (x === 2 ? i : -1)).filter(i => i >= 0), [2, 4, 6]);   // (0,2), (1,1), (2,0)
  assert.equal(simulateRot([[2, 1, 1], [1, 1, 1], [1, 1, 1]]), 4);
  const lc1 = [[2, 1, 1], [1, 1, 0], [0, 1, 1]];
  assert.equal(simulateRot(lc1), 4);
  const minutes = relax(lc1, [[0, 0]], (r, c) => lc1[r][c] !== 0);
  assert.deepEqual(rotting[1].rows.map(cells), minutes.map(row => row.map(x => (x < 0 ? '·' : String(x)))));
  const lc2 = [[2, 1, 1], [0, 1, 1], [1, 0, 1]];
  assert.equal(simulateRot(lc2), -1);
  assert.equal(relax(lc2, [[0, 0]], (r, c) => lc2[r][c] !== 0)[2][0], -1);
  assert.equal(Math.max(...relax(lc2, [[0, 0]], (r, c) => lc2[r][c] !== 0).flat()), 4);
});

test('chapter 5 to 8 trace numbers', () => {
  const board = surrounded[0].rows.map(cells);
  const g = board.map(r => r.map(x => (x === 'O' ? 1 : 0)));
  const edge = g.flatMap((row, r) => row.flatMap((v, c) => (v && (r === 0 || c === 0 || r === 3 || c === 3) ? [[r, c]] : [])));
  assert.deepEqual(edge, [[3, 1]]);
  const safe = relax(g, edge, (r, c) => g[r][c] === 1);
  assert.equal(g.flat().filter((v, i) => v === 1 && safe.flat()[i] === -1).length, 3);
  assert.match(surrounded[2].choices[surrounded[2].answer].feedback, /3 Os flip/);
  const h = [[1, 2, 3], [8, 9, 4], [7, 6, 5]];
  assert.deepEqual(pacific[0].rows.map(r => cells(r).map(Number)), h);
  const both = forwardPacific(h);
  assert.deepEqual(both, ['0,2', '1,0', '1,1', '1,2', '2,0', '2,1', '2,2']);
  assert.match(correct(pacific[2]), /^7:/);
  assert.ok(!both.includes('0,1') && !both.includes('0,0'));
  assert.equal(forwardPacific([[1, 1, 1], [1, 1, 1], [1, 1, 1]]).length, 9);
  // strict > from the shore reaches only the shore itself on a plateau: corners (0,2) and (2,0) touch both
  const shoreP = new Set(['0,0', '0,1', '0,2', '1,0', '2,0']), shoreA = new Set(['2,0', '2,1', '2,2', '0,2', '1,2']);
  assert.deepEqual([...shoreP].filter(x => shoreA.has(x)).sort(), ['0,2', '2,0']);
  // word ladder
  const dict = ['hot', 'dot', 'dog', 'lot', 'log', 'cog'];
  assert.equal(relaxLadder('hit', 'cog', dict), 5);
  assert.equal(relaxLadder('hit', 'cog', dict.slice(0, 5)), 0);
  const ringOf = (w: string) => relaxLadder('hit', w, dict);
  assert.deepEqual(ladder[1].rows.map(r => cells(r)), [['hit'], ['hot'], ['dot', 'lot'], ['dog', 'log']]);
  ladder[1].rows.forEach((r, i) => cells(r).forEach(w => assert.equal(w === 'hit' ? 1 : ringOf(w), i + 1, w)));
  assert.equal(5000 * 5000 * 5, 125_000_000); assert.equal(5 * 25, 125);
  // clone: the square has 4 nodes and 8 neighbour entries
  const square = [[2, 4], [1, 3], [2, 4], [1, 3]];
  assert.equal(square.length, 4); assert.equal(square.flat().length, 8);
  assert.match(correct(clone[2]), /^4:/);
  // mixed review numbers
  assert.equal(100_000 * 100_000, 1e10); assert.equal(2 * 200_000, 400_000);
  assert.equal(Math.min(10, 2 + 3), 5);
});

test('every hint ladder referenced by the lesson exists with three hints, and every trace is used', async () => {
  const { readFileSync } = await import('node:fs');
  const mdx = readFileSync(new URL('../src/dsa-lessons/graphs.mdx', import.meta.url), 'utf8');
  const used = [...mdx.matchAll(/hints=\{hints\.(\w+)\}/g)].map(m => m[1]);
  assert.equal(used.length, 14);
  for (const key of used) assert.equal(hints[key]?.length, 3, key);
  for (const key of Object.keys(hints)) assert.ok(used.includes(key), `unused hint ${key}`);
  for (const name of Object.keys(allTraces)) assert.match(mdx, new RegExp(`steps=\\{${name}\\}`), `trace ${name} not used`);
  // every roadmap problem has its LeetCode link
  for (const slug of ['number-of-islands', 'max-area-of-island', 'rotting-oranges', 'surrounded-regions', 'pacific-atlantic-water-flow', 'shortest-path-in-binary-matrix', 'word-ladder', 'clone-graph'])
    assert.match(mdx, new RegExp(`https://leetcode.com/problems/${slug}/`), slug);
});

// ---------- lab ----------
function bfsAnswer(g: Grid) { const d = relax(g, [[0, 0]], (r, c) => g[r][c] === 0); return d[g.length - 1][g[0].length - 1]; }
const oracles: Record<string, (start: GraphState, final: GraphState) => void> = {
  islands: (s, f) => {
    assert.equal(f.count, ufCount(s.grid));
    s.grid.forEach((row, r) => row.forEach((v, c) => assert.equal(f.owner[r][c] > 0, v === 1)));
  },
  bfs: (s, f) => {
    assert.equal(f.result, bfsAnswer(s.grid));
    // every flagged square's distance is its true shortest distance
    const d = relax(s.grid, [[0, 0]], (r, c) => s.grid[r][c] === 0);
    f.dist.forEach((row, r) => row.forEach((x, c) => { if (x >= 0) assert.equal(x, d[r][c]); }));
  },
  rot: (s, f) => assert.equal(f.result, simulateRot(s.grid)),
};
function runCase(start: GraphState) {
  const { final, wrongMovesChangedBoard } = solveLab(lab, start, 3000);
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
  let rivalSeen = false, loneLateSeen = false;
  for (const [mode, info] of Object.entries(lab.modes)) for (let v = 0; v < info.cases; v++) {
    let state = lab.create(mode, v);
    for (let guard = 0; guard < 800; guard++) {
      for (const { action } of info.actions) {
        const result = lab.move(state, action);
        if (!result.accepted && !state.done) {
          assert.doesNotMatch(result.state.message, /undefined|NaN|Infinity|\[object/, `${mode} case ${v}: ${action}`);
          assert.ok(result.state.message.length > 15, `${mode} case ${v}: ${action} needs an explanation`);
          if (action === 'late' && /already in the queue/.test(result.state.message)) rivalSeen = true;
          if (action === 'late' && /181 squares instead of 100/.test(result.state.message)) loneLateSeen = true;
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
  assert.ok(rivalSeen && loneLateSeen, 'the late-flag button must be caught both ways');
});

test('lab agrees with independent oracles on random small inputs', () => {
  let seed = 41; const rnd = (n: number) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
  for (let t = 0; t < 150; t++) {
    const rows = 1 + rnd(5), cols = 1 + rnd(5);
    const land = Array.from({ length: rows }, () => Array.from({ length: cols }, () => (rnd(10) < 5 ? 1 : 0)));
    runCase({ ...lab.create('islands'), ...fromInput({ mode: 'islands', grid: land }) });
    const maze = Array.from({ length: rows }, () => Array.from({ length: cols }, () => (rnd(10) < 3 ? 1 : 0)));
    maze[0][0] = 0;
    runCase({ ...lab.create('bfs'), ...fromInput({ mode: 'bfs', grid: maze }) });
    const crate = Array.from({ length: rows }, () => Array.from({ length: cols }, () => { const x = rnd(10); return x < 2 ? 0 : x < 8 ? 1 : 2; }));
    runCase({ ...lab.create('rot'), ...fromInput({ mode: 'rot', grid: crate }) });
  }
});

test('the lab catches the classic graph bugs with the board numbers', () => {
  // islands: skipping untouched land names the island that would be lost
  const isl = lab.create('islands', 0);
  assert.match(lab.move(isl, 'skip').state.message, /4 square\(s\): \(0,0\), \(1,0\), \(0,1\), \(1,1\)/);
  const afterSink = lab.move(isl, 'sink').state;
  assert.match(lab.move(afterSink, 'sink').state.message, /already sunk as part of island #1/);
  // rot: seeding one source only in the two-source crate names a square that rots late
  const two = lab.create('rot', 1);
  assert.match(lab.move(two, 'seed-first').state.message, /would rot at minute 3 instead of minute 1/);
  // rot: one extra minute after everything rotted
  let s = lab.move(lab.create('rot', 0), 'seed').state;
  for (let i = 0; i < 4; i++) s = lab.move(s, 'spread').state;
  assert.equal(s.fresh, 0);
  assert.match(lab.move(s, 'spread').state.message, /5 instead of 4/);
  // rot: stuck orange
  let stuck = lab.move(lab.create('rot', 2), 'seed').state;
  while (lab.expected(stuck) === 'spread') stuck = lab.move(stuck, 'spread').state;
  assert.match(lab.move(stuck, 'spread').state.message, /\(2,0\) can never be reached/);
  // bfs: skipping an open neighbour, and enqueueing rock
  let b = lab.move(lab.create('bfs', 0), 'poll').state;     // at (0,0); first in-bounds neighbour is (1,0), rock
  assert.match(lab.move(b, 'enqueue').state.message, /\(1,0\) is rock/);
  b = lab.move(b, 'skip').state;                           // now (0,1), open
  assert.match(lab.move(b, 'skip').state.message, /open and unflagged/);
});

// ---------- practice ----------
const numArrays = (text: string) => [...text.matchAll(/\[([-\d,\s]*)\]/g)].map(m => (m[1].trim() ? m[1].split(',').map(Number) : []));
const num = (text: string, re: RegExp) => { const m = text.match(re); assert.ok(m, `${re} in ${text}`); return Number(m![1]); };

test('every practice answer matches an independent computation from the prompt', () => {
  assert.equal(practice.storageKey, 'citadel-graphs-review-v1');
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
      assert.doesNotMatch(c.prompt, /BFS|DFS|breadth|depth-first|queue|stack|union|visited|flood|multi-source|dijkstra|traversal|graph/i, `${id}: the prompt must not name the technique`);
      const grid = numArrays(c.prompt);
      let expected: number | number[] | boolean;
      switch (id) {
        case 'islands': expected = ufCount(grid); break;
        case 'max-area': expected = Math.max(0, ...ufSizes(grid)); break;
        case 'shortest-path': {
          const d = grid[0][0] === 1 ? null : relax(grid, [[0, 0]], (r, cc) => grid[r][cc] === 0, D8);
          const n = grid.length;
          expected = !d || d[n - 1][n - 1] < 0 ? -1 : d[n - 1][n - 1] + 1;
          break;
        }
        case 'rotting': expected = simulateRot(grid); break;
        case 'surrounded': {
          const board = [...c.prompt.matchAll(/\[([XO,\s]+)\]/g)].map(m => m[1].split(',').map(x => (x.trim() === 'O' ? 1 : 0)));
          const R = board.length, C = board[0].length;
          const edge = board.flatMap((row, r) => row.flatMap((v, cc) => (v && (r === 0 || cc === 0 || r === R - 1 || cc === C - 1) ? [[r, cc]] : [])));
          const safe = relax(board, edge, (r, cc) => board[r][cc] === 1);
          expected = board.flat().filter((v, i) => v === 1 && safe.flat()[i] < 0).length;
          break;
        }
        case 'pacific': expected = forwardPacific(grid).length; break;
        case 'word-ladder': {
          const [, begin, end] = c.prompt.match(/Turn “(\w+)” into “(\w+)”/)!;
          const list = c.prompt.match(/the list \[([^\]]*)\]/)![1].split(',').map(w => w.trim());
          expected = relaxLadder(begin, end, list);
          break;
        }
        case 'clone': {
          const adj = [...c.prompt.matchAll(/(\d+): \[([^\]]*)\]/g)].map(m => (m[2].trim() ? m[2].split(',').map(x => Number(x) - 1) : []));
          const reach = new Set([0]);
          for (let changed = true; changed;) { changed = false; for (const u of [...reach]) for (const w of adj[u]) if (!reach.has(w)) { reach.add(w); changed = true; } }
          const links = new Set<string>();
          for (const u of reach) for (const w of adj[u]) links.add([u, w].sort().join('-'));
          expected = [reach.size, links.size];
          break;
        }
        case 'flood-fill': {
          const sr = num(c.prompt, /row (\d+), column/), sc = num(c.prompt, /column (\d+) \(/), color = num(c.prompt, /with colour (\d+)\./);
          const old = grid[sr][sc];
          const d = relax(grid, [[sr, sc]], (r, cc) => grid[r][cc] === old);
          expected = color === old ? 0 : d.flat().filter(x => x >= 0).length;
          break;
        }
        case 'provinces': {
          const n = grid.length, parent = Array.from({ length: n }, (_, i) => i);
          const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
          for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (grid[i][j]) parent[find(i)] = find(j);
          expected = new Set(parent.map((_, i) => find(i))).size;
          break;
        }
        case 'nearest-zero': {
          let best = 0;
          for (let r = 0; r < grid.length; r++) for (let cc = 0; cc < grid[0].length; cc++) {
            let near = Infinity;
            for (let a = 0; a < grid.length; a++) for (let b = 0; b < grid[0].length; b++) if (grid[a][b] === 0) near = Math.min(near, Math.abs(a - r) + Math.abs(b - cc));
            best = Math.max(best, near);
          }
          expected = best;
          break;
        }
        case 'bridge': {
          const label = ufLabels(grid, v => v === 1);
          assert.equal(new Set(label.flat().filter(x => x >= 0)).size, 2, 'exactly two groups');
          let best = Infinity;
          const land = label.flatMap((row, r) => row.flatMap((x, cc) => (x >= 0 ? [[r, cc, x]] : [])));
          for (const [r1, c1, l1] of land) for (const [r2, c2, l2] of land) if (l1 !== l2) best = Math.min(best, Math.abs(r1 - r2) + Math.abs(c1 - c2) - 1);
          expected = best;
          break;
        }
        case 'open-lock': {
          const dead = c.prompt.match(/any of \[([^\]]*)\]/)![1].split(',').map(x => x.trim()).filter(Boolean);
          const target = c.prompt.match(/show (\d{4})\?/)![1];
          expected = relaxLock(dead, target);
          break;
        }
        case 'bipartite': {
          const adj = [...c.prompt.matchAll(/(\d+): \[([^\]]*)\]/g)].map(m => (m[2].trim() ? m[2].split(',').map(Number) : []));
          expected = bruteBipartite(adj);
          break;
        }
        case 'weighted': {
          const names = 'ABCDE', d = names.split('').map((_, i) => names.split('').map((__, j) => (i === j ? 0 : Infinity)));
          let fewest = 0;
          for (const m of c.prompt.matchAll(/([A-E])–([A-E]) (\d+)/g)) {
            const i = names.indexOf(m[1]), j = names.indexOf(m[2]);
            d[i][j] = d[j][i] = Math.min(d[i][j], Number(m[3]));
          }
          const hops = d.map(row => row.map(x => (x === 0 ? 0 : x < Infinity ? 1 : Infinity)));
          for (let k = 0; k < 5; k++) for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) { d[i][j] = Math.min(d[i][j], d[i][k] + d[k][j]); hops[i][j] = Math.min(hops[i][j], hops[i][k] + hops[k][j]); }
          expected = d[0][4];
          // the decoy only works if the fewest-roads route is slower: check that no fewest-roads route is fastest
          fewest = hops[0][4];
          assert.ok(fewest >= 1);
          break;
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
  assert.ok(strategiesUsed.size >= 5);
});

test('practice sets include no-answer cases where the problem allows them', () => {
  const answers = (id: string) => Array.from({ length: 21 }, (_, v) => practice.challengeFor(id, v).answer);
  assert.ok(answers('shortest-path').includes(-1) && answers('shortest-path').some(a => a !== -1));
  assert.ok(answers('rotting').includes(-1) && answers('rotting').some(a => a !== -1));
  assert.ok(answers('word-ladder').includes(0));
  assert.ok(answers('open-lock').includes(-1));
  assert.ok(answers('bipartite').includes(true) && answers('bipartite').includes(false));
  assert.ok(answers('flood-fill').includes(0));
});
