import test from 'node:test';
import assert from 'node:assert/strict';
import { lastVar } from '../src/lib/dryrun.ts';
import type { Frame } from '../src/lib/dryrun.ts';
import { kahnFrames, safeFrames, parallelFrames, alienFrames, colourFrames, dsuFrames, dijkstraFrames, primFrames, kruskalFrames, bellmanFrames, ratioFrames, effortFrames } from '../src/data/advanced-graphs/frames.ts';

let seed = 90210;
const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return (seed >> 4) % n; };
const range = (n: number) => Array.from({ length: n }, (_, i) => i);
const answer = (f: Frame[]) => lastVar(f, 'answer')!;
const run = (n: number, body: () => void) => { for (let t = 0; t < n; t++) body(); };
type E = number[];
const edgesOf = (n: number, m: number, selfLoops = true): E[] => Array.from({ length: rnd(m + 1) }, () => [rnd(n), rnd(n)]).filter(e => selfLoops || e[0] !== e[1]);

function wellFormed(f: Frame[]) {
  assert.ok(f.length >= 2);
  for (const fr of f) {
    assert.ok(fr.caption.length > 10 && fr.views.length > 0);
    for (const v of fr.views) if (v.kind === 'graph') {
      const ids = new Set(v.nodes.map(n => n.id));
      assert.equal(ids.size, v.nodes.length, 'node ids are unique');
      for (const e of v.edges) assert.ok(ids.has(e.from) && ids.has(e.to), 'edge ends exist');
      for (const k of Object.keys(v.tones ?? {})) assert.ok(ids.has(k), `tone for unknown node ${k}`);
    }
    if (fr.predict) {
      assert.ok(fr.predict.options.length >= 2);
      assert.equal(new Set(fr.predict.options).size, fr.predict.options.length, fr.predict.question);
      assert.ok(fr.predict.answer >= 0 && fr.predict.answer < fr.predict.options.length);
    }
  }
  assert.ok(lastVar(f, 'answer') !== undefined, 'last frame carries an answer');
}

// ---------- naive oracles ----------
function closure(n: number, edges: E[]) {
  const r = range(n).map(() => Array(n).fill(false));
  for (const [a, b] of edges) r[a][b] = true;
  for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) if (r[i][k]) for (let j = 0; j < n; j++) if (r[k][j]) r[i][j] = true;
  return r;
}
const hasCycle = (n: number, edges: E[]) => closure(n, edges).some((row, i) => row[i]);
function labels(n: number, edges: E[]) {
  const lab = range(n);
  for (let changed = true; changed;) {
    changed = false;
    for (const [a, b] of edges) { const m = Math.min(lab[a], lab[b]); if (lab[a] !== m || lab[b] !== m) { lab[a] = m; lab[b] = m; changed = true; } }
  }
  return lab;
}
const comps = (n: number, edges: E[]) => new Set(labels(n, edges)).size;
const floyd = (n: number, roads: E[]) => {
  const d = range(n).map(i => range(n).map(j => (i === j ? 0 : Infinity)));
  for (const [a, b, w] of roads) d[a][b] = Math.min(d[a][b], w);
  for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (d[i][k] + d[k][j] < d[i][j]) d[i][j] = d[i][k] + d[k][j];
  return d;
};
const perms = <T,>(xs: T[]): T[][] => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) => perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map(p => [x, ...p])));
const subsets = (m: number) => range(1 << m).map(mask => range(m).filter(b => mask >> b & 1));

test('Kahn: order is a full topological order exactly when the graph is acyclic', () => {
  run(400, () => {
    const n = 1 + rnd(6), edges = edgesOf(n, 8);
    const f = kahnFrames(n, edges); wellFormed(f);
    const cyc = hasCycle(n, edges);
    assert.equal(lastVar(f, 'canFinish'), String(!cyc), J(n, edges));
    if (cyc) assert.equal(answer(f), '[]');
    else {
      const order: number[] = JSON.parse(answer(f));
      assert.deepEqual([...order].sort((a, b) => a - b), range(n));
      assert.ok(edges.every(([a, b]) => order.indexOf(a) < order.indexOf(b)), J(n, edges));
    }
  });
  assert.equal(answer(kahnFrames(1, [])), '[0]');
  assert.equal(answer(kahnFrames(2, [[0, 0]])), '[]');                  // a self-loop is a cycle
  assert.equal(answer(kahnFrames(4, [[0, 1], [0, 2], [1, 3], [2, 3]])), '[0,1,2,3]');
  assert.equal(answer(kahnFrames(3, [[0, 1], [2, 1], [1, 2]])), '[]');
});
function J(...a: unknown[]) { return JSON.stringify(a); }

test('safe states: a node is safe exactly when no journey from it reaches a cycle', () => {
  run(400, () => {
    const n = 1 + rnd(6), edges = edgesOf(n, 8), graph = range(n).map(u => edges.filter(e => e[0] === u).map(e => e[1]));
    const f = safeFrames(graph); wellFormed(f);
    const reach = closure(n, edges);
    const expected = range(n).filter(u => !reach[u][u] && !range(n).some(c => reach[u][c] && reach[c][c]));
    assert.equal(answer(f), JSON.stringify(expected), J(graph));
  });
  assert.equal(answer(safeFrames([[1, 2], [2, 3], [5], [0], [5], [], []])), '[2,4,5,6]');
  assert.equal(answer(safeFrames([[0]])), '[]');
});

test('parallel courses: the answer is the longest path weighted by durations', () => {
  run(300, () => {
    const n = 1 + rnd(6), rel = edgesOf(n, 7, false).map(([a, b]) => (a < b ? [a, b] : [b, a])).filter(e => e[0] !== e[1]);
    const time = range(n).map(() => 1 + rnd(5));
    const longest = (u: number): number => time[u] + Math.max(0, ...rel.filter(e => e[1] === u).map(e => longest(e[0])));
    const f = parallelFrames(n, rel, time); wellFormed(f);
    assert.equal(answer(f), String(Math.max(...range(n).map(longest))), J(n, rel, time));
  });
  assert.equal(answer(parallelFrames(3, [[0, 2], [1, 2]], [3, 2, 5])), '8');
  assert.equal(answer(parallelFrames(1, [], [4])), '4');
});

test('alien dictionary: the smallest alphabet that sorts the words, or the empty string', () => {
  const sortedUnder = (ws: string[], alpha: string[]) => ws.every((a, i) => {
    if (i === 0) return true;
    const b = ws[i - 1];
    let j = 0;
    while (j < a.length && j < b.length && a[j] === b[j]) j++;
    return j === Math.min(a.length, b.length) ? b.length <= a.length : alpha.indexOf(b[j]) < alpha.indexOf(a[j]);
  });
  run(400, () => {
    const ws = Array.from({ length: 1 + rnd(4) }, () => Array.from({ length: 1 + rnd(3) }, () => 'abcd'[rnd(4)]).join(''));
    const letters = [...new Set(ws.join(''))].sort();
    const valid = perms(letters).filter(p => sortedUnder(ws, p)).map(p => p.join('')).sort();
    const f = alienFrames(ws); wellFormed(f);
    assert.equal(answer(f), JSON.stringify(valid[0] ?? ''), ws.join());
  });
  assert.equal(answer(alienFrames(['wrt', 'wrf', 'er', 'ett', 'rftt'])), '"wertf"');
  assert.equal(answer(alienFrames(['abc', 'ab'])), '""');               // a longer word before its own prefix
  assert.equal(answer(alienFrames(['z', 'x'])), '"zx"');
  assert.equal(answer(alienFrames(['ab', 'ab'])), '"ab"');
});

test('three-colour DFS reports a cycle exactly when one exists', () => {
  run(400, () => {
    const n = 1 + rnd(6), edges = edgesOf(n, 8);
    const f = colourFrames(n, edges); wellFormed(f);
    assert.equal(answer(f), String(hasCycle(n, edges)), J(n, edges));
  });
  assert.equal(answer(colourFrames(4, [[0, 1], [0, 2], [1, 3], [2, 3]])), 'false');   // the diamond is not a cycle
  assert.equal(answer(colourFrames(1, [[0, 0]])), 'true');
});

test('union-find count, tree and redundant modes match plain graph reasoning', () => {
  run(400, () => {
    const n = 1 + rnd(7), edges = edgesOf(n, 8);
    const c = dsuFrames(n, edges); wellFormed(c);
    assert.equal(answer(c), String(comps(n, edges)), J(n, edges));
    const t = dsuFrames(n, edges, { mode: 'tree' }); wellFormed(t);
    const isTree = edges.length === n - 1 && comps(n, edges) === 1;
    assert.equal(answer(t), String(isTree), J(n, edges));
    const rd = dsuFrames(n, edges, { mode: 'redundant' }); wellFormed(rd);
    const first = edges.findIndex((e, i) => { const lab = labels(n, edges.slice(0, i)); return lab[e[0]] === lab[e[1]]; });
    assert.equal(answer(rd), first < 0 ? '[]' : JSON.stringify(edges[first]), J(n, edges));
  });
  assert.equal(answer(dsuFrames(6, [[0, 1], [2, 3], [1, 3], [4, 5], [3, 5]])), '1');
  assert.equal(answer(dsuFrames(3, [[0, 1], [2, 1]])), '1');
  assert.equal(answer(dsuFrames(4, [[0, 1], [1, 2], [2, 0]], { mode: 'tree' })), 'false');   // right count, but a loop
  assert.equal(answer(dsuFrames(4, [[0, 1], [2, 3]], { mode: 'tree' })), 'false');           // no loop, but two pieces
  assert.equal(answer(dsuFrames(1, [], { mode: 'tree' })), 'true');
  assert.equal(answer(dsuFrames(6, [[1, 2], [2, 3], [3, 4], [1, 4], [1, 5]], { mode: 'redundant' })), '[1,4]');
  assert.equal(answer(dsuFrames(3, [[1, 1]], { mode: 'redundant' })), '[1,1]');
});

test('Dijkstra matches Floyd-Warshall, with zero weights, unreachable nodes and parallel edges', () => {
  run(500, () => {
    const n = 1 + rnd(6), edges = edgesOf(n, 9).map(e => [...e, rnd(6)]), src = rnd(n);
    const d = floyd(n, edges)[src].map(x => (x === Infinity ? -1 : x));
    const f = dijkstraFrames(n, edges, src); wellFormed(f);
    assert.equal(answer(f), JSON.stringify(d), J(n, edges, src));
    const g = dijkstraFrames(n, edges, src, { settleOnce: true }); wellFormed(g);
    assert.equal(answer(g), JSON.stringify(d), J(n, edges, src));
  });
  assert.equal(answer(dijkstraFrames(4, [[0, 1, 4], [0, 2, 1], [2, 1, 2], [1, 3, 1], [2, 3, 5]], 0)), '[0,3,1,4]');
  assert.equal(answer(dijkstraFrames(3, [[0, 1, 5], [2, 0, 1]], 0)), '[0,5,-1]');
});

test('settle-once Dijkstra equals a naive settle-once, and is wrong when a weight is negative', () => {
  const naive = (n: number, edges: E[], src: number) => {
    const dist: number[] = Array(n).fill(Infinity), done: boolean[] = Array(n).fill(false);
    dist[src] = 0;
    for (;;) {
      let u = -1;
      for (let v = 0; v < n; v++) if (!done[v] && dist[v] < Infinity && (u < 0 || dist[v] < dist[u])) u = v;
      if (u < 0) break;
      done[u] = true;
      for (const [a, b, w] of edges) if (a === u && !done[b] && dist[u] + w < dist[b]) dist[b] = dist[u] + w;
    }
    return dist.map(x => (x === Infinity ? -1 : x));
  };
  run(400, () => {
    const n = 1 + rnd(5), edges = edgesOf(n, 7).map(e => [...e, rnd(8) - 3]), src = rnd(n);
    const f = dijkstraFrames(n, edges, src, { settleOnce: true }); wellFormed(f);
    assert.equal(answer(f), JSON.stringify(naive(n, edges, src)), J(n, edges, src));
  });
  const neg = [[0, 1, 2], [0, 2, 3], [2, 1, -2]];
  assert.equal(answer(dijkstraFrames(3, neg, 0, { settleOnce: true })), '[0,2,3]');   // B settled at 2
  assert.equal(floyd(3, neg)[0][1], 1);                                                // the true cheapest fare is 1
});

test('Prim matches a brute-force search over edge subsets', () => {
  const dist = (p: number[], q: number[]) => Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]);
  const brute = (pts: number[][]) => {
    const n = pts.length, all: E[] = [];
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) all.push([i, j]);
    let best = n === 1 ? 0 : Infinity;
    for (const s of subsets(all.length)) if (s.length === n - 1 && comps(n, s.map(k => all[k])) === 1) best = Math.min(best, s.reduce((a, k) => a + dist(pts[all[k][0]], pts[all[k][1]]), 0));
    return best;
  };
  run(300, () => {
    const pts = Array.from({ length: 1 + rnd(5) }, () => [rnd(7), rnd(7)]);
    const f = primFrames(pts); wellFormed(f);
    assert.equal(answer(f), String(brute(pts)), J(pts));
  });
  assert.equal(answer(primFrames([[0, 0], [2, 2], [3, 10], [5, 2], [7, 0]])), '20');
  assert.equal(answer(primFrames([[3, 3]])), '0');
  assert.equal(answer(primFrames([[1, 1], [1, 1], [1, 1]])), '0');      // duplicate points cost nothing to join
  assert.equal(answer(primFrames([[0, 0], [1, 0], [0, 1], [10, 10]])), '21');
});

test('Kruskal returns the weight of a minimum spanning forest (disconnected, zero weights, loops)', () => {
  run(400, () => {
    const n = 1 + rnd(5), edges = edgesOf(n, 7).map(e => [...e, rnd(6)]);
    const plain = edges.map(e => [e[0], e[1]]), c = comps(n, plain);
    let best = Infinity;
    for (const s of subsets(edges.length)) if (s.length === n - c && comps(n, s.map(k => plain[k])) === c) best = Math.min(best, s.reduce((a, k) => a + edges[k][2], 0));
    const f = kruskalFrames(n, edges); wellFormed(f);
    assert.equal(answer(f), String(best), J(n, edges));
  });
  assert.equal(answer(kruskalFrames(4, [[0, 1, 1], [1, 2, 2], [0, 2, 3], [2, 3, 0]])), '3');
  assert.equal(answer(kruskalFrames(4, [[0, 1, 5], [2, 3, 7]])), '12');   // two pieces: a spanning forest
});

test('Bellman-Ford with a copy equals the cheapest walk of at most k + 1 flights', () => {
  run(500, () => {
    const n = 2 + rnd(4), flights = edgesOf(n, 8, false).map(e => [...e, rnd(12) - 2]), src = rnd(n), dst = rnd(n), k = rnd(4);
    let best = Infinity;
    const walk = (u: number, left: number, cost: number) => { if (u === dst) best = Math.min(best, cost); if (left) for (const [a, b, w] of flights) if (a === u) walk(b, left - 1, cost + w); };
    walk(src, k + 1, 0);
    const f = bellmanFrames(n, flights, src, dst, k); wellFormed(f);
    assert.equal(answer(f), String(best === Infinity ? -1 : best), J(n, flights, src, dst, k));
  });
  const three = [[0, 1, 100], [1, 2, 100], [0, 2, 500]];
  assert.equal(answer(bellmanFrames(3, three, 0, 2, 0)), '500');   // in place it would chain two flights and say 200
  assert.equal(answer(bellmanFrames(3, three, 0, 2, 1)), '200');
  assert.equal(answer(bellmanFrames(3, [[0, 1, 5]], 0, 2, 2)), '-1');
});

test('weighted union-find answers division queries like a direct computation', () => {
  run(400, () => {
    const names = 'abcdef'.split(''), value = Object.fromEntries(names.map(s => [s, 1 + rnd(8)]));
    const eq: [string, string, number][] = Array.from({ length: 1 + rnd(4) }, () => { const a = names[rnd(6)], b = names[rnd(6)]; return [a, b, value[a] / value[b]]; });
    const qs: [string, string][] = Array.from({ length: 1 + rnd(3) }, () => [[...names, 'z'][rnd(7)], [...names, 'z'][rnd(7)]]);
    const ids = [...new Set(eq.flatMap(e => [e[0], e[1]]))];
    const lab = labels(names.length, eq.map(e => [names.indexOf(e[0]), names.indexOf(e[1])]));
    const f = ratioFrames(eq, qs); wellFormed(f);
    const got: number[] = JSON.parse(answer(f));
    qs.forEach(([c, d], i) => {
      const ok = ids.includes(c) && ids.includes(d) && lab[names.indexOf(c)] === lab[names.indexOf(d)];
      if (!ok) assert.equal(got[i], -1, J(eq, qs));
      else assert.ok(Math.abs(got[i] - value[c] / value[d]) < 1e-4, `${J(eq, qs)} -> ${got}`);
    });
  });
  assert.equal(answer(ratioFrames([['a', 'b', 2], ['b', 'c', 3]], [['a', 'c'], ['c', 'a'], ['a', 'e'], ['a', 'a']])), '[6,0.16667,-1,1]');
});

test('minimum effort Dijkstra matches binary search on a flood fill', () => {
  run(500, () => {
    const R = 1 + rnd(3), C = 1 + rnd(3), h = range(R).map(() => range(C).map(() => rnd(10)));
    const reach = (t: number) => {
      const seen = new Set(['0,0']), stack = [[0, 0]];
      while (stack.length) {
        const [y, x] = stack.pop()!;
        for (const [dy, dx] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ny = y + dy, nx = x + dx;
          if (ny < 0 || nx < 0 || ny >= R || nx >= C || seen.has(`${ny},${nx}`) || Math.abs(h[ny][nx] - h[y][x]) > t) continue;
          seen.add(`${ny},${nx}`); stack.push([ny, nx]);
        }
      }
      return seen.has(`${R - 1},${C - 1}`);
    };
    let t = 0;
    while (!reach(t)) t++;
    const f = effortFrames(h); wellFormed(f);
    assert.equal(answer(f), String(t), J(h));
  });
  assert.equal(answer(effortFrames([[1, 2, 2], [3, 8, 2], [5, 3, 5]])), '2');
  assert.equal(answer(effortFrames([[7]])), '0');
  assert.equal(answer(effortFrames([[4, 4], [4, 4]])), '0');
});
