// Dry-run frames for every problem in src/dsa-lessons/graphs.mdx. Each generator replays the lesson's Java on a
// small input and ends with a text view holding `answer` (checked against brute-force oracles in
// tests/graphs-frames.test.ts). Grids always show: the grid, the queue or stack, the visited set and the order.
import { recorder, tvars, type Frame, type View, type CellTone, type NodeTone, type GridView, type GraphView, type Val, type Adj } from '../../lib/dryrun.ts';

type Cell = [number, number];
const J = (x: unknown) => JSON.stringify(x);
const pt = (r: number, c: number) => `(${r},${c})`;
const pts = (cs: Cell[]) => (cs.length ? cs.map(([r, c]) => pt(r, c)).join(', ') : 'none');
const K = (r: number, c: number) => `${r},${c}`;
const unK = (k: string): Cell => k.split(',').map(Number) as Cell;
const D4: Cell[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const D8: Cell[] = [-1, 0, 1].flatMap(a => [-1, 0, 1].map(b => [a, b] as Cell)).filter(([a, b]) => a || b);
const q = (question: string, options: string[], answer: number, explain: string) => ({ question, options, answer, explain });
const inside = (rows: number, cols: number, r: number, c: number) => r >= 0 && r < rows && c >= 0 && c < cols;
const near = (n: number) => { const v = n === 0 ? [0, 1, 2] : [n - 1, n, n + 1]; return { options: v.map(String), answer: v.indexOf(n) }; };
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function tracker() {
  let prev: Record<string, Val> | undefined;
  return (now: Record<string, Val>) => { const v = tvars(now, prev); prev = now; return v; };
}
function gridView(name: string, cells: Val[][], tones: Record<string, CellTone>): GridView {
  return {
    kind: 'grid', name, cells, rowLabels: cells.map((_, i) => i), colLabels: cells[0].map((_, i) => i),
    tones: Object.entries(tones).map(([k, tone]) => { const [r, c] = unK(k); return { r, c, tone }; }),
  };
}
const listView = (kind: 'queue' | 'stack' | 'set', name: string, items: Val[], changed: number[] = [], removed: Val[] = []): View =>
  ({ kind, name, items, changed, removed, note: items.length ? undefined : 'empty' });
function graphOf(name: string, ids: string[], edges: [string, string][], tones: Record<string, NodeTone>, labels: Record<string, Val> = {}, active?: [string, string], directed = false): GraphView {
  return {
    kind: 'graph', name, directed, tones: { ...tones },
    nodes: ids.map(id => ({ id, ...(labels[id] !== undefined ? { label: labels[id] } : {}) })),
    edges: edges.map(([a, b]) => ({ from: a, to: b, ...(active && (active[0] === a && active[1] === b || !directed && active[0] === b && active[1] === a) ? { tone: 'active' as const } : {}) })),
  };
}
function edgesOf(adj: Adj): [string, string][] {
  const seen = new Set<string>(), out: [string, string][] = [];
  for (const [u, vs] of Object.entries(adj)) for (const v of vs) {
    const key = [u, v].sort().join('|');
    if (!seen.has(key)) { seen.add(key); out.push([u, v]); }
  }
  return out;
}

// ---- prologue: why the flag goes down at enqueue time -------------------------------------------
// Final var `answer` = how many queue entries the late-flag version creates (the lesson's version creates one per node).
export function flagTimingFrames(adj: Adj, start: string): Frame[] {
  const r = recorder(), ids = [...new Set([...Object.keys(adj), ...Object.values(adj).flat()])], edges = edgesOf(adj);
  const visited: string[] = [], queue = [start], order: string[] = [];
  let enqueued = 1;
  const vars = tracker();
  const view = (cur?: string, active?: [string, string], changed: number[] = [], removed: string[] = []): View[] => {
    const tones: Record<string, NodeTone> = {};
    for (const v of visited) tones[v] = 'done';
    for (const x of queue) if (!visited.includes(x)) tones[x] = 'queued';
    if (cur) tones[cur] = 'current';
    return [graphOf('graph', ids, edges, tones, {}, active), listView('queue', 'queue (front on the left)', queue, changed, removed),
      listView('set', 'visited (flagged when POLLED: the wrong rule)', visited), vars({ enqueued, 'nodes in graph': ids.length })];
  };
  r.frame(`Wrong rule, on purpose: flag a node only when it leaves the queue. The queue starts with ${start}, and nothing is flagged yet.`, view());
  while (queue.length) {
    const u = queue.shift()!;
    if (visited.includes(u)) {
      r.frame(`Poll ${u}. It is already flagged, so this entry is wasted work. It was queued a second time because it was not flagged when the other neighbour looked at it.`, view(u, undefined, [], [u]),
        q(`${u} is polled and already flagged. What does the code do with this entry?`, ['Skip it: the entry was wasted', 'Visit it again'], 0, 'The skip keeps the answer right, but the duplicate still cost a queue slot.'));
      continue;
    }
    visited.push(u); order.push(u);
    const before = queue.length, fresh = (adj[u] || []).filter(v => !visited.includes(v));
    for (const v of fresh) { queue.push(v); enqueued++; }
    const dup = fresh.filter(v => queue.indexOf(v) < before);
    r.frame(`Poll ${u} and flag it now. Enqueue every unflagged neighbour: ${fresh.join(', ') || 'none'}.${dup.length ? ` ${dup.join(', ')} ${dup.length > 1 ? 'are' : 'is'} already waiting in the queue, but not flagged yet, so ${dup.length > 1 ? 'they are' : 'it is'} queued AGAIN.` : ''}`,
      view(u, fresh.length ? [u, fresh[0]] : undefined, fresh.map((_, k) => before + k), [u]),
      fresh.length ? q(`${u} is polled. Which of its neighbours are enqueued?`, ['Only neighbours that are not flagged', 'Only neighbours that are not in the queue'], 0, 'With the late flag the only check is "flagged", and a queued node is not flagged yet. That is the bug.') : undefined);
  }
  r.frame(`Done. The visiting order is ${order.join(' → ')}, the same as the correct version, but the queue took ${enqueued} entries for ${ids.length} nodes. Flag at enqueue time and it takes exactly ${ids.length}. On a 10 by 10 grid the gap is 181 against 100.`,
    [...view().slice(0, 3), tvars({ enqueued, 'nodes in graph': ids.length, answer: enqueued })]);
  return r.frames;
}

// ---- prologue: count components of an edge list -------------------------------------------------
export function countComponentsFrames(n: number, edgeList: number[][]): Frame[] {
  const r = recorder(), ids = Array.from({ length: n }, (_, i) => String(i));
  const adj: Adj = Object.fromEntries(ids.map(i => [i, [] as string[]]));
  for (const [a, b] of edgeList) { adj[String(a)].push(String(b)); adj[String(b)].push(String(a)); }
  const edges: [string, string][] = edgeList.map(([a, b]) => [String(a), String(b)]);
  const visited: string[] = [], done = new Set<string>(), vars = tracker();
  let components = 0, queue: string[] = [];
  const view = (cur?: string, changed: number[] = [], removed: string[] = [], active?: [string, string]): View[] => {
    const tones: Record<string, NodeTone> = {};
    for (const v of visited) tones[v] = 'visited';
    for (const x of queue) tones[x] = 'queued';
    for (const d of done) tones[d] = 'done';
    if (cur) tones[cur] = 'current';
    return [graphOf('graph', ids, edges, tones, {}, active), listView('queue', 'queue (front on the left)', queue, changed, removed), listView('set', 'visited', visited), vars({ components })];
  };
  r.frame(`${n} nodes, ${edgeList.length} edges. The outer loop tries every node as a start. A node that is not visited yet must belong to a group nobody has explored.`, view());
  for (let s = 0; s < n; s++) {
    const id = String(s);
    if (visited.includes(id)) {
      r.frame(`Scan reaches node ${id}. It is already visited (an earlier group took it), so skip it. This is why one group is never counted twice.`, view(id),
        q(`The scan reaches node ${id}, which is visited. Does components change?`, ['Yes, +1', 'No, skip it'], 1, 'A visited node belongs to a group that was already counted.'));
      continue;
    }
    components++; visited.push(id); queue = [id];
    r.frame(`Scan reaches node ${id}: not visited, so this is a new group. components becomes ${components}. Enqueue ${id} and flag it at once.`, view(id, [0]),
      q(`The scan reaches node ${id}, which is not visited. What now?`, ['Count a new group and explore it', 'Skip it'], 0, 'No earlier exploration reached it, so it cannot belong to a counted group.'));
    while (queue.length) {
      const u = queue.shift()!;
      const fresh = adj[u].filter(v => !visited.includes(v)), before = queue.length;
      for (const v of fresh) { visited.push(v); queue.push(v); }
      done.add(u);
      r.frame(`Poll ${u}. ${fresh.length ? `${fresh.join(', ')} ${fresh.length > 1 ? 'are' : 'is'} new: flag and enqueue.` : 'No new neighbours.'}`, view(undefined, fresh.map((_, k) => before + k), [u], fresh.length ? [u, fresh[0]] : undefined));
    }
  }
  r.frame(`The scan is finished and every node is visited. The graph has ${components} groups.`, [...view().slice(0, 3), tvars({ components, answer: components })]);
  return r.frames;
}

// ---- Number of Islands --------------------------------------------------------------------------
export function islandsFrames(input: number[][]): Frame[] {
  const g = input.map(row => [...row]), rows = g.length, cols = g[0].length, r = recorder();
  const sunk: string[] = [], path: Cell[] = [], vars = tracker();
  let islands = 0, depth = 0, first = true;
  const view = (): View[] => {
    const tones: Record<string, CellTone> = {};
    for (const k of sunk) tones[k] = 'done';
    for (const [a, b] of path) tones[K(a, b)] = 'compared';
    if (path.length) tones[K(...path[path.length - 1])] = 'active';
    return [gridView('grid (a sunk square reads 0)', g, tones), listView('stack', 'call stack (sink calls in progress)', path.map(([a, b]) => `sink${pt(a, b)}`)),
      listView('set', 'visited (sunk) squares', sunk.map(k => `(${k})`)), vars({ islands })];
  };
  const sink = (a: number, b: number) => {
    if (!inside(rows, cols, a, b) || g[a][b] !== 1) return;
    g[a][b] = 0; sunk.push(K(a, b));
    const parent = path.length ? path[path.length - 1] : null, back = path.length < depth;
    path.push([a, b]); depth = path.length;
    const pred = parent && first ? (first = false, q(`sink${pt(...parent)} just ran. It asks down, up, right, left in that order. Which square is sunk next?`, ['Down', 'Up', 'Right'], 0, 'Down comes first. If the square below is land, the recursion goes there before trying up, right or left.')) : undefined;
    r.frame(`Call sink${pt(a, b)}${parent ? `, made from sink${pt(...parent)}${back ? ' after the deeper calls returned' : ''}` : ''}. It is land, so set it to 0 FIRST, then ask the four neighbours. Neighbours that are off the grid, water or already sunk return immediately.`, view(), pred);
    for (const [dr, dc] of D4) sink(a + dr, b + dc);
    path.pop();
  };
  r.frame(`The scan reads squares in reading order. Water is skipped silently, so we only stop at squares that start as land. Nothing is sunk yet.`, view());
  for (let a = 0; a < rows; a++) for (let b = 0; b < cols; b++) {
    if (input[a][b] !== 1) continue;
    if (g[a][b] === 1) {
      islands++; depth = 0;
      r.frame(`Scan reaches ${pt(a, b)}: land that no flood has touched. That is a new island, so islands becomes ${islands}. Now sink the whole island before the scan moves on.`, view(),
        q(`The scan reaches ${pt(a, b)}, land with value 1. What now?`, ['Count a new island and flood it', 'Skip it, it was counted'], 0, 'Its value is still 1, so no flood has reached it.'));
      sink(a, b);
    } else {
      r.frame(`Scan reaches ${pt(a, b)}. It was land, but it now reads 0 because an earlier flood sank it. Skip it: its island is already counted.`, view(),
        q(`The scan reaches ${pt(a, b)}, which was land but now reads 0. Does islands change?`, ['Yes, +1', 'No'], 1, 'The 0 is the flag. Its island was counted when the scan first touched it.'));
    }
  }
  r.frame(`The scan is finished. ${plural(islands, 'island')}, one per flood, and every land square was sunk exactly once.`, [...view().slice(0, 3), tvars({ islands, answer: islands })]);
  return r.frames;
}

// ---- Max Area of Island (explicit stack, mark on push) -------------------------------------------
export function maxAreaFrames(input: number[][]): Frame[] {
  const g = input.map(row => [...row]), rows = g.length, cols = g[0].length, r = recorder();
  const marked: string[] = [], popped = new Set<string>(), stack: Cell[] = [], vars = tracker();
  let best = 0, area = 0, order: string[] = [];
  const view = (cur?: Cell, changed: number[] = [], removed: string[] = []): View[] => {
    const tones: Record<string, CellTone> = {};
    for (const k of marked) tones[k] = 'visited';
    for (const k of popped) tones[k] = 'done';
    for (const [a, b] of stack) tones[K(a, b)] = 'compared';
    if (cur) tones[K(...cur)] = 'active';
    return [gridView('grid (1 = land, marked squares shaded)', input, tones), listView('stack', 'stack (top on the right)', stack.map(([a, b]) => pt(a, b)), changed, removed),
      listView('set', 'marked (visited) squares', marked.map(k => `(${k})`)), vars({ area, best, 'pop order': order.join(' ') || '(none)' })];
  };
  r.frame('Scan for land. Each time the scan finds land that is not marked, it starts a flood with an explicit stack on the heap, so no call-stack limit applies.', view());
  for (let a = 0; a < rows; a++) for (let b = 0; b < cols; b++) {
    if (g[a][b] !== 1) continue;
    stack.push([a, b]); g[a][b] = 0; marked.push(K(a, b)); area = 0; order = [];
    r.frame(`Scan reaches ${pt(a, b)}: unmarked land. Push it and mark it in the same step. area restarts at 0.`, view(undefined, [0]));
    while (stack.length) {
      const cell = stack.pop()!;
      popped.add(K(...cell)); area++; order.push(pt(...cell));
      const pushed: Cell[] = [], already: Cell[] = [], before = stack.length;
      for (const [dr, dc] of D4) {
        const na = cell[0] + dr, nb = cell[1] + dc;
        if (!inside(rows, cols, na, nb) || input[na][nb] !== 1) continue;
        if (g[na][nb] === 1) { g[na][nb] = 0; marked.push(K(na, nb)); stack.push([na, nb]); pushed.push([na, nb]); } else already.push([na, nb]);
      }
      r.frame(`Pop ${pt(...cell)} and count it: area = ${area}. Land neighbours not marked yet: ${pts(pushed)}; they are pushed and marked now.${already.length ? ` ${pts(already)} ${already.length > 1 ? 'are' : 'is'} land but already marked, so ${already.length > 1 ? 'they are' : 'it is'} not pushed again.` : ''}`,
        view(cell, pushed.map((_, k) => before + k), [pt(...cell)]),
        pushed.length + already.length ? q(`Popping ${pt(...cell)}. How many of its neighbours are pushed?`, near(pushed.length).options, near(pushed.length).answer,
          `Only unmarked land is pushed. ${already.length ? 'Marked land was claimed already: pushing it again would count it twice.' : 'Water and off-grid squares are never pushed.'}`) : undefined);
    }
    best = Math.max(best, area);
    r.frame(`The stack is empty, so this island is complete: area ${area}. best = max(best, ${area}) = ${best}.`, view());
  }
  r.frame(`Every square has been scanned. The largest island has ${best} squares.`, [...view().slice(0, 3), tvars({ area, best, answer: best })]);
  return r.frames;
}

// ---- Shortest Path in Binary Matrix (BFS in rings, 8 directions) --------------------------------
export function shortestPathFrames(input: number[][]): Frame[] {
  const n = input.length, r = recorder(), vars = tracker();
  const dist: (number | null)[][] = input.map(row => row.map(() => null)), queue: Cell[] = [], done = new Set<string>(), order: string[] = [];
  const cells = (): Val[][] => input.map((row, a) => row.map((v, b) => (v === 1 ? '█' : dist[a][b] ?? '·')));
  let length = 1;
  const view = (cur?: Cell, changed: number[] = [], removed: string[] = []): View[] => {
    const tones: Record<string, CellTone> = {};
    input.forEach((row, a) => row.forEach((v, b) => { if (v === 1) tones[K(a, b)] = 'out'; else if (dist[a][b] !== null) tones[K(a, b)] = 'visited'; }));
    for (const k of done) tones[k] = 'done';
    for (const [a, b] of queue) tones[K(a, b)] = 'compared';
    if (cur) tones[K(...cur)] = 'active';
    const flagged = input.flatMap((row, a) => row.flatMap((_, b) => (dist[a][b] !== null ? [`(${a},${b})`] : [])));
    return [gridView('grid (number = ring, █ = rock, · = not flagged)', cells(), tones), listView('queue', 'queue (front on the left)', queue.map(([a, b]) => pt(a, b)), changed, removed),
      listView('set', 'visited (flagged) squares', flagged), vars({ ring: length, 'poll order': order.join(' ') || '(none)' })];
  };
  if (input[0][0] === 1 || input[n - 1][n - 1] === 1) {
    r.frame(`${input[0][0] === 1 ? 'The start' : 'The goal'} is rock, so no clear path can exist. Return -1 before enqueueing anything.`, [...view(), tvars({ answer: -1 })]);
    return r.frames;
  }
  queue.push([0, 0]); dist[0][0] = 1;
  r.frame('Enqueue the start and flag it right now (its ring is 1, because the path counts squares). Rock squares can never be entered.', view(undefined, [0]));
  while (queue.length) {
    for (let size = queue.length; size > 0; size--) {
      const cell = queue.shift()!;
      order.push(pt(...cell));
      if (cell[0] === n - 1 && cell[1] === n - 1) {
        done.add(K(...cell));
        r.frame(`Poll ${pt(...cell)}: it is the goal, polled while the ring number is ${length}. Rings leave the queue in order, so no shorter path exists. Return ${length}.`, [...view(cell, [], [pt(...cell)]).slice(0, 3), tvars({ ring: length, answer: length })]);
        return r.frames;
      }
      const added: Cell[] = [], before = queue.length;
      for (const [dr, dc] of D8) {
        const na = cell[0] + dr, nb = cell[1] + dc;
        if (inside(n, n, na, nb) && input[na][nb] === 0 && dist[na][nb] === null) { dist[na][nb] = length + 1; queue.push([na, nb]); added.push([na, nb]); }
      }
      done.add(K(...cell));
      r.frame(`Poll ${pt(...cell)} from ring ${length}. Open, unflagged neighbours among the 8 around it: ${pts(added)}. Each is flagged now with ring ${length + 1} and enqueued.`,
        view(cell, added.map((_, k) => before + k), [pt(...cell)]),
        q(`Polling ${pt(...cell)}. How many of its 8 neighbours are enqueued?`, near(added.length).options, near(added.length).answer, 'Only squares that are inside the grid, open water and not flagged yet are enqueued.'));
    }
    length++;
    if (queue.length) r.frame(`The ring is finished. The queue holds exactly the squares of ring ${length}, and the ring counter goes up by one.`, view());
  }
  r.frame('The queue is empty and the goal was never polled: no path exists. Return -1.', [...view().slice(0, 3), tvars({ ring: length, answer: -1 })]);
  return r.frames;
}

// ---- Rotting Oranges (multi-source BFS, one frame per minute) -----------------------------------
export function rottingFrames(input: number[][]): Frame[] {
  const g = input.map(row => [...row]), rows = g.length, cols = g[0].length, r = recorder(), vars = tracker();
  let queue: Cell[] = [], fresh = 0, minutes = 0;
  const when: (number | null)[][] = input.map(row => row.map(v => (v === 2 ? 0 : null)));
  const rotten = (): string[] => g.flatMap((row, a) => row.flatMap((v, b) => (v === 2 ? [`(${a},${b})`] : [])));
  const view = (changed: number[] = [], removed: string[] = []): View[] => {
    const tones: Record<string, CellTone> = {};
    g.forEach((row, a) => row.forEach((v, b) => { if (v === 0) tones[K(a, b)] = 'out'; else if (v === 2) tones[K(a, b)] = 'visited'; }));
    for (const [a, b] of queue) tones[K(a, b)] = 'compared';
    const cells = g.map((row, a) => row.map((v, b) => (v === 0 ? '·' : v === 1 ? 'F' : when[a][b])));
    return [gridView('grid (number = minute it rotted, F = fresh, · = empty)', cells, tones), listView('queue', 'queue = oranges that rotted last minute', queue.map(([a, b]) => pt(a, b)), changed, removed),
      listView('set', 'visited (rotten) oranges', rotten()), vars({ minutes, fresh })];
  };
  for (let a = 0; a < rows; a++) for (let b = 0; b < cols; b++) { if (g[a][b] === 2) queue.push([a, b]); else if (g[a][b] === 1) fresh++; }
  r.frame(`Scan once. Every rotten orange goes into the queue now, all as minute 0, and fresh counts the F squares: ${fresh}. Starting every source together is what makes this one BFS instead of one per source.`, view());
  while (fresh > 0 && queue.length) {
    const ring = queue, next: Cell[] = [], spoiled: string[] = [];
    queue = [];
    for (const cell of ring) for (const [dr, dc] of D4) {
      const na = cell[0] + dr, nb = cell[1] + dc;
      if (inside(rows, cols, na, nb) && g[na][nb] === 1) { g[na][nb] = 2; fresh--; when[na][nb] = minutes + 1; next.push([na, nb]); spoiled.push(`${pt(...cell)} spoils ${pt(na, nb)}`); }
    }
    minutes++; queue = next;
    r.frame(`Minute ${minutes}: every orange from the last ring spreads to its fresh neighbours at the same time (${spoiled.join('; ') || 'nothing spreads'}). Rotting is the flag, set at enqueue. fresh is now ${fresh}.`,
      view(next.map((_, k) => k), ring.map(([a, b]) => pt(a, b))),
      q(`After minute ${minutes - 1}, how many fresh oranges rot in minute ${minutes}?`, near(next.length).options, near(next.length).answer, 'Count the fresh oranges next to any orange that rotted last minute, each only once.'));
  }
  const ok = fresh === 0;
  r.frame(ok ? `fresh is 0, so the loop stops now. Counting one more round would add a minute in which nothing rots. Answer: ${minutes}.` : `The queue ran out while ${fresh} fresh orange(s) remain. No rotten neighbour can ever reach them. Answer: -1.`,
    [...view().slice(0, 3), tvars({ minutes, fresh, answer: ok ? minutes : -1 })]);
  return r.frames;
}

// ---- Surrounded Regions (flood from the border) -------------------------------------------------
// Final var `answer` = the board as a JSON array of row strings.
export function surroundedFrames(input: string[][]): Frame[] {
  const b = input.map(row => [...row]), rows = b.length, cols = b[0].length, r = recorder(), queue: Cell[] = [], vars = tracker();
  const polled = new Set<string>();
  const safe = (): string[] => b.flatMap((row, a) => row.flatMap((v, c) => (v === 'S' ? [pt(a, c)] : [])));
  const view = (cur?: Cell, changed: number[] = [], removed: string[] = []): View[] => {
    const tones: Record<string, CellTone> = {};
    b.forEach((row, a) => row.forEach((v, c) => { if (v === 'S') tones[K(a, c)] = 'visited'; }));
    for (const k of polled) tones[k] = 'done';
    for (const [a, c] of queue) tones[K(a, c)] = 'compared';
    if (cur) tones[K(...cur)] = 'active';
    return [gridView('board (S = safe, reached from the border)', b, tones), listView('queue', 'queue (front on the left)', queue.map(([a, c]) => pt(a, c)), changed, removed),
      listView('set', 'visited (safe) squares', safe()), vars({ safe: safe().length })];
  };
  if (!rows || !cols) return [{ caption: 'An empty board has nothing to flip.', views: [tvars({ answer: J([]) })] }];
  for (let a = 0; a < rows; a++) for (let c = 0; c < cols; c++) if ((a === 0 || a === rows - 1 || c === 0 || c === cols - 1) && b[a][c] === 'O') { b[a][c] = 'S'; queue.push([a, c]); }
  r.frame(`Do not ask each O whether it reaches the border. Ask the border instead. Every O on any of the four edges is safe: mark it S and enqueue it. Seeds: ${pts(queue)}.`, view(undefined, queue.map((_, k) => k)));
  while (queue.length) {
    const cell = queue.shift()!, added: Cell[] = [], before = queue.length;
    for (const [dr, dc] of D4) {
      const na = cell[0] + dr, nc = cell[1] + dc;
      if (inside(rows, cols, na, nc) && b[na][nc] === 'O') { b[na][nc] = 'S'; queue.push([na, nc]); added.push([na, nc]); }
    }
    polled.add(K(...cell));
    r.frame(`Poll ${pt(...cell)}. An O next to a safe square is connected to the border, so it is safe too: ${pts(added)} ${added.length ? 'marked S and enqueued' : '(no new O neighbours)'}.`, view(cell, added.map((_, k) => before + k), [pt(...cell)]),
      q(`Polling ${pt(...cell)}. How many neighbouring O squares become safe?`, near(added.length).options, near(added.length).answer, 'Any neighbour that is still O has a path of Os to the border through this square.'));
  }
  const captured = b.flatMap((row, a) => row.flatMap((v, c) => (v === 'O' ? [[a, c] as Cell] : [])));
  r.frame(`The queue is empty, so the safe set is complete. Every O still showing was never reached from the border: ${pts(captured)}. Final pass: S becomes O, a remaining O becomes X.`, view());
  for (let a = 0; a < rows; a++) for (let c = 0; c < cols; c++) b[a][c] = b[a][c] === 'S' ? 'O' : 'X';
  const tones: Record<string, CellTone> = {};
  b.forEach((row, a) => row.forEach((v, c) => { if (v === 'O') tones[K(a, c)] = 'found'; }));
  r.frame('Final board. Only the Os connected to the border remain. X stays X, and the S flags are gone.', [gridView('final board', b, tones), tvars({ answer: J(b.map(row => row.join(''))) })]);
  return r.frames;
}

// ---- Pacific Atlantic Water Flow (two uphill floods, then intersect) ----------------------------
// Final var `answer` = JSON [[r,c],...] in row-major order.
export function pacificFrames(h: number[][]): Frame[] {
  const rows = h.length, cols = h[0].length, r = recorder(), vars = tracker();
  const marks = { Pacific: new Set<string>(), Atlantic: new Set<string>() };
  const stack: Cell[] = [], order: string[] = [];
  let ocean: 'Pacific' | 'Atlantic' = 'Pacific';
  const view = (cur?: Cell, changed: number[] = [], removed: string[] = []): View[] => {
    const tones: Record<string, CellTone> = {};
    for (const k of marks.Pacific) tones[k] = 'visited';
    for (const k of marks.Atlantic) tones[k] = marks.Pacific.has(k) ? 'found' : 'done';
    for (const [a, c] of stack) tones[K(a, c)] = 'compared';
    if (cur) tones[K(...cur)] = 'active';
    return [gridView('heights (shaded = reached by a flood)', h, tones), listView('stack', `${ocean} stack (top on the right)`, stack.map(([a, c]) => pt(a, c)), changed, removed),
      listView('set', `visited by the ${ocean} flood`, [...marks[ocean]].map(k => `(${k})`)), vars({ Pacific: marks.Pacific.size, Atlantic: marks.Atlantic.size, 'pop order': order.join(' ') || '(none)' })];
  };
  const flood = (shore: Cell[], intro: string) => {
    stack.length = 0; order.length = 0;
    for (const [a, c] of shore) if (!marks[ocean].has(K(a, c))) { marks[ocean].add(K(a, c)); stack.push([a, c]); }
    r.frame(intro, view(undefined, stack.map((_, k) => k)));
    while (stack.length) {
      const cell = stack.pop()!, added: Cell[] = [], before = stack.length, lower: Cell[] = [];
      order.push(pt(...cell));
      for (const [dr, dc] of D4) {
        const na = cell[0] + dr, nc = cell[1] + dc;
        if (!inside(rows, cols, na, nc) || marks[ocean].has(K(na, nc))) continue;
        if (h[na][nc] >= h[cell[0]][cell[1]]) { marks[ocean].add(K(na, nc)); stack.push([na, nc]); added.push([na, nc]); } else lower.push([na, nc]);
      }
      r.frame(`Pop ${pt(...cell)} (height ${h[cell[0]][cell[1]]}). Walk UPHILL or level, because water could run from there down to here: ${pts(added)} ${added.length ? 'pushed and marked' : '(none)'}.${lower.length ? ` ${pts(lower)} ${lower.length > 1 ? 'are' : 'is'} lower, so rain there cannot reach this square's ocean through here.` : ''}`,
        view(cell, added.map((_, k) => before + k), [pt(...cell)]),
        q(`Popping ${pt(...cell)} at height ${h[cell[0]][cell[1]]}. Which unmarked neighbours does the ${ocean} flood step onto?`, ['Neighbours at least as high', 'Neighbours strictly lower', 'Neighbours strictly higher'], 0, 'The flood retraces the water backwards: water runs downhill or level, so the flood goes uphill or level.'));
    }
  };
  const left = Array.from({ length: rows }, (_, a) => [a, 0] as Cell), top = Array.from({ length: cols }, (_, c) => [0, c] as Cell);
  const right = Array.from({ length: rows }, (_, a) => [a, cols - 1] as Cell), bottom = Array.from({ length: cols }, (_, c) => [rows - 1, c] as Cell);
  flood([...left, ...top], 'Flood 1 starts from every Pacific shore square (top row and left column), all marked and pushed at once. Searching forward from every square would repeat work; searching from the oceans does it once.');
  const pacificDone = marks.Pacific.size;
  ocean = 'Atlantic';
  flood([...right, ...bottom], `The Pacific flood is finished: it reached ${pacificDone} squares. Flood 2 starts from every Atlantic shore square (bottom row and right column), with its own marks.`);
  const both = [...marks.Pacific].filter(k => marks.Atlantic.has(k)).map(unK).sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  r.frame(`Both floods are finished. The answer is the squares marked by both: ${pts(both)}. Marked once means the rain reaches one ocean, twice means both.`, [...view().slice(0, 1), tvars({ Pacific: marks.Pacific.size, Atlantic: marks.Atlantic.size, answer: J(both) })]);
  return r.frames;
}

// ---- Word Ladder --------------------------------------------------------------------------------
export function ladderFrames(begin: string, end: string, list: string[]): Frame[] {
  const r = recorder(), ids = [...new Set([begin, ...list])];
  const one = (a: string, b: string) => a.length === b.length && [...a].filter((ch, i) => ch !== b[i]).length === 1;
  const edges: [string, string][] = [];
  ids.forEach((a, i) => ids.slice(i + 1).forEach(b => { if (one(a, b)) edges.push([a, b]); }));
  const unvisited = new Set(list), queue: string[] = [], done = new Set<string>(), flagged = new Set<string>(), vars = tracker();
  let words = 1;
  const view = (cur?: string, changed: number[] = [], removed: string[] = [], active?: [string, string]): View[] => {
    const tones: Record<string, NodeTone> = {};
    for (const f of flagged) tones[f] = 'visited';
    for (const d of done) tones[d] = 'done';
    for (const x of queue) tones[x] = 'queued';
    if (cur) tones[cur] = 'current';
    return [graphOf('words (edge = differ in one letter)', ids, edges, tones, {}, active), listView('queue', 'queue (front on the left)', queue, changed, removed),
      listView('set', 'unvisited register (a removed word is a flagged word)', [...unvisited]), vars({ words })];
  };
  if (!unvisited.has(end)) { r.frame(`${end} is not in the register, so no ladder can end there. Return 0 before searching.`, [...view().slice(0, 1), tvars({ answer: 0 })]); return r.frames; }
  queue.push(begin); unvisited.delete(begin); flagged.add(begin);
  r.frame(`Enqueue ${begin} and flag it (remove it from the register set if it is there). A ladder counts words, so ${begin} alone is ring 1.`, view(undefined, [0]));
  while (queue.length) {
    for (let size = queue.length; size > 0; size--) {
      const word = queue.shift()!, w = [...word], found: string[] = [], before = queue.length;
      for (let i = 0; i < w.length; i++) {
        const original = w[i];
        for (let code = 97; code <= 122; code++) {
          const ch = String.fromCharCode(code);
          if (ch === original) continue;
          w[i] = ch;
          const next = w.join('');
          if (unvisited.delete(next)) {
            flagged.add(next);
            if (next === end) {
              r.frame(`Poll ${word}. Changing letter ${i + 1} to "${ch}" gives ${next}: a real register word, not yet flagged, and it is the end word. It sits in ring ${words + 1}, so return ${words + 1}.`,
                [...view(word, [], [word], [word, next]).slice(0, 3), tvars({ words, answer: words + 1 })]);
              return r.frames;
            }
            queue.push(next); found.push(next);
          }
        }
        w[i] = original;
      }
      done.add(word);
      r.frame(`Poll ${word} (ring ${words}). Try 25 other letters in each position; ${found.length ? `${found.join(', ')} ${found.length > 1 ? 'are' : 'is'} in the register and unflagged, so removed from it (flagged) and enqueued` : 'no unflagged register word is one letter away'}.`,
        view(word, found.map((_, k) => before + k), [word], found.length ? [word, found[0]] : undefined),
        q(`Polling ${word}. How many unflagged register words are one letter away?`, near(found.length).options, near(found.length).answer, 'A candidate counts only if it is in the register and has not been removed from it yet.'));
    }
    words++;
  }
  r.frame('The queue is empty and the end word was never generated. Return 0.', [...view().slice(0, 3), tvars({ words, answer: 0 })]);
  return r.frames;
}

// ---- Clone Graph (DFS with an original -> copy map) ---------------------------------------------
// Final var `answer` = JSON adjacency of the copy (by original labels); `created` = number of new nodes.
export function cloneFrames(adj: Adj, startId: string): Frame[] {
  const r = recorder(), ids = Object.keys(adj), edges = edgesOf(adj), vars = tracker();
  const copies = new Map<string, string[]>(), stack: string[] = [], wired: [string, string][] = [], wiredKeys = new Set<string>();
  const view = (cur?: string, active?: [string, string], changed: number[] = []): View[] => {
    const tones: Record<string, NodeTone> = {};
    for (const id of copies.keys()) tones[id] = 'done';
    for (const s of stack) tones[s] = 'queued';
    if (cur) tones[cur] = 'current';
    const copyIds = [...copies.keys()];
    return [graphOf('original graph', ids, edges, tones, {}, active),
      graphOf('the copy so far', copyIds.map(i => `${i}′`), wired, Object.fromEntries(copyIds.map(i => [`${i}′`, 'done' as NodeTone]))),
      { kind: 'map', name: 'map: original → copy', entries: copyIds.map(i => [i, `${i}′`] as [Val, Val]), changed },
      listView('stack', 'call stack', stack.map(s => `clone(${s})`)), vars({ created: copies.size })];
  };
  const clone = (u: string, from?: string) => {
    if (copies.has(u)) {
      r.frame(`clone(${u}) is called from ${from}. ${u} is already in the map, so return its copy ${u}′ at once. No new node, no recursion: this is what closes the cycle.`, view(u, from ? [from, u] : undefined),
        q(`clone(${u}) finds ${u} in the map. What is returned?`, [`The existing copy ${u}′`, `A new copy of ${u}`, `The original ${u}`], 0, 'Return the stored copy. A new copy would be a second copy of the same node; the original would leave the copy tied to the old graph.'));
      return `${u}′`;
    }
    copies.set(u, []); stack.push(u);
    r.frame(`clone(${u})${from ? ` from ${from}` : ''}: not in the map, so create ${u}′ and register it BEFORE visiting any neighbour. Neighbours of ${u}: ${adj[u].join(', ') || 'none'}.`, view(u, from ? [from, u] : undefined, [copies.size - 1]));
    for (const v of adj[u]) {
      const got = clone(v, u);
      copies.get(u)!.push(v);
      const key = [u, v].sort().join('|');
      if (!wiredKeys.has(key)) { wiredKeys.add(key); wired.push([`${u}′`, got]); }
      r.frame(`Back in clone(${u}): append ${got} to ${u}′.neighbors. The copy points at a copy, never at an original.`, view(u, [u, v]));
    }
    stack.pop();
    return `${u}′`;
  };
  clone(startId);
  const out = Object.fromEntries([...copies.entries()].map(([k, v]) => [k, v]));
  r.frame(`Done. The map holds ${copies.size} entries, one new node per original, and the copy has the same edges. Nothing in the copy points at an original.`, [...view().slice(0, 3), tvars({ created: copies.size, answer: J(out) })]);
  return r.frames;
}

// ---- Side quest 1: Flood Fill -------------------------------------------------------------------
// Final var `answer` = the image as JSON.
export function floodFillFrames(input: number[][], sr: number, sc: number, color: number): Frame[] {
  const img = input.map(row => [...row]), rows = img.length, cols = img[0].length, r = recorder(), vars = tracker();
  const old = img[sr][sc], painted: string[] = [], path: Cell[] = [];
  const view = (): View[] => {
    const tones: Record<string, CellTone> = {};
    for (const k of painted) tones[k] = 'done';
    for (const [a, b] of path) tones[K(a, b)] = 'compared';
    if (path.length) tones[K(...path[path.length - 1])] = 'active';
    return [gridView('image', img, tones), listView('stack', 'call stack', path.map(([a, b]) => `paint${pt(a, b)}`)), listView('set', 'visited (repainted) squares', painted.map(k => `(${k})`)), vars({ old, color })];
  };
  if (old === color) {
    r.frame(`The start square already has colour ${color}, the new colour. Repainting changes nothing, so the "flag" would be invisible and two touching squares would call each other forever. Return the image untouched.`,
      [gridView('image', img, {}), tvars({ old, color, answer: J(img) })]);
    return r.frames;
  }
  r.frame(`Start at ${pt(sr, sc)}, colour ${old}. Repaint every square connected to it that has colour ${old}. The new colour ${color} is the flag: a repainted square no longer matches ${old}, so the flood never returns to it.`, view());
  const paint = (a: number, b: number) => {
    if (!inside(rows, cols, a, b) || img[a][b] !== old) return;
    img[a][b] = color; painted.push(K(a, b)); path.push([a, b]);
    r.frame(`paint${pt(a, b)}: it still has the old colour ${old}, so set it to ${color} first, then ask down, up, right, left.`, view());
    for (const [dr, dc] of D4) paint(a + dr, b + dc);
    path.pop();
  };
  paint(sr, sc);
  r.frame(`Every connected square of colour ${old} is repainted (${painted.length} squares). Squares that touch only at a corner, or have another colour, are untouched.`, [...view().slice(0, 3), tvars({ old, color, answer: J(img) })]);
  return r.frames;
}

// ---- Side quest 2: Number of Provinces (matrix costume) -----------------------------------------
export function provincesFrames(m: number[][]): Frame[] {
  const n = m.length, r = recorder(), ids = Array.from({ length: n }, (_, i) => String(i)), vars = tracker();
  const edges: [string, string][] = [];
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) if (m[a][b] === 1) edges.push([String(a), String(b)]);
  const visited: string[] = [], path: string[] = [], done = new Set<string>();
  let provinces = 0;
  const view = (active?: [string, string]): View[] => {
    const tones: Record<string, NodeTone> = {};
    for (const v of visited) tones[v] = 'visited';
    for (const d of done) tones[d] = 'done';
    for (const p of path) tones[p] = 'queued';
    if (path.length) tones[path[path.length - 1]] = 'current';
    const mat = gridView('isConnected (row = a town\'s neighbour list)', m, path.length ? { ...Object.fromEntries(m[+path[path.length - 1]].map((v, c) => [K(+path[path.length - 1], c), v === 1 ? 'active' as CellTone : 'out' as CellTone])) } : {});
    return [graphOf('towns', ids, edges, tones, {}, active), mat, listView('stack', 'call stack', path.map(p => `visit(${p})`)), listView('set', 'visited', visited), vars({ provinces })];
  };
  const visit = (t: number, from?: number) => {
    visited.push(String(t)); path.push(String(t));
    r.frame(`visit(${t})${from !== undefined ? ` from ${from}` : ''}: mark ${t} visited, then scan row ${t} of the matrix. Its neighbours are the columns holding a 1: ${m[t].flatMap((v, c) => (v === 1 && c !== t ? [c] : [])).join(', ') || 'none'}.`, view(from !== undefined ? [String(from), String(t)] : undefined));
    for (let o = 0; o < n; o++) if (m[t][o] === 1 && !visited.includes(String(o))) visit(o, t);
    path.pop(); done.add(String(t));
  };
  r.frame(`${n} towns. A 1 in row i, column j joins towns i and j. The diagonal is always 1 (a town is connected to itself); the visited check makes that harmless.`, view());
  for (let t = 0; t < n; t++) {
    if (visited.includes(String(t))) { r.frame(`Scan reaches town ${t}: already visited, so it belongs to a province that is counted.`, view(), q(`Town ${t} is already visited. Does provinces change?`, ['Yes, +1', 'No'], 1, 'It was reached from an earlier town of the same province.')); continue; }
    provinces++;
    r.frame(`Scan reaches town ${t}: not visited, so it starts a new province. provinces = ${provinces}. Visit everything connected to it.`, view(),
      q(`Town ${t} is not visited. What now?`, ['Count a province and explore it', 'Skip it'], 0, 'Nothing reached it before, so it is in a group nobody counted.'));
    visit(t);
  }
  r.frame(`Every town is visited. ${plural(provinces, 'province')}. The matrix was read row by row, so the cost is O(n squared).`, [...view().slice(0, 1), listView('set', 'visited', visited), tvars({ provinces, answer: provinces })]);
  return r.frames;
}

// ---- Side quest 3: 01 Matrix (multi-source BFS) -------------------------------------------------
// Final var `answer` = the distance matrix as JSON.
export function nearestZeroFrames(mat: number[][]): Frame[] {
  const rows = mat.length, cols = mat[0].length, r = recorder(), queue: Cell[] = [], vars = tracker();
  const dist = mat.map(row => row.map(v => (v === 0 ? 0 : -1))), done = new Set<string>();
  const view = (cur?: Cell, changed: number[] = [], removed: string[] = []): View[] => {
    const tones: Record<string, CellTone> = {};
    dist.forEach((row, a) => row.forEach((v, b) => { if (v >= 0) tones[K(a, b)] = 'visited'; }));
    for (const k of done) tones[k] = 'done';
    for (const [a, b] of queue) tones[K(a, b)] = 'compared';
    if (cur) tones[K(...cur)] = 'active';
    const flagged = dist.flatMap((row, a) => row.flatMap((v, b) => (v >= 0 ? [`(${a},${b})`] : [])));
    return [gridView('dist (-1 = not reached yet)', dist, tones), listView('queue', 'queue (front on the left)', queue.map(([a, b]) => pt(a, b)), changed, removed), listView('set', 'visited (distance set)', flagged), vars({ unreached: dist.flat().filter(v => v < 0).length })];
  };
  mat.forEach((row, a) => row.forEach((v, b) => { if (v === 0) queue.push([a, b]); }));
  r.frame(`Every 0 is a source with distance 0, and every 1 starts at -1 ("not reached"). All sources go into the queue together: ring 0. Each 1 will be reached first from its nearest 0.`, view(undefined, queue.map((_, k) => k)));
  while (queue.length) {
    const cell = queue.shift()!, added: Cell[] = [], before = queue.length;
    for (const [dr, dc] of D4) {
      const na = cell[0] + dr, nb = cell[1] + dc;
      if (inside(rows, cols, na, nb) && dist[na][nb] === -1) { dist[na][nb] = dist[cell[0]][cell[1]] + 1; queue.push([na, nb]); added.push([na, nb]); }
    }
    done.add(K(...cell));
    r.frame(`Poll ${pt(...cell)} (distance ${dist[cell[0]][cell[1]]}). Neighbours still at -1: ${pts(added)}. Each gets distance ${dist[cell[0]][cell[1]] + 1} and joins the queue; setting the distance is the flag.`, view(cell, added.map((_, k) => before + k), [pt(...cell)]),
      added.length || queue.length ? q(`Polling ${pt(...cell)}. How many neighbours get a distance now?`, near(added.length).options, near(added.length).answer, 'Only neighbours still at -1 are set. A neighbour that already has a distance was reached from a closer or equal source.') : undefined);
  }
  r.frame('The queue is empty: every square has its distance to the nearest 0.', [...view().slice(0, 3), tvars({ answer: J(dist) })]);
  return r.frames;
}

// ---- Side quest 4: Shortest Bridge (DFS claims island A, BFS rings through water) ---------------
export function shortestBridgeFrames(input: number[][]): Frame[] {
  const n = input.length, g = input.map(row => [...row]), r = recorder(), queue: Cell[] = [], vars = tracker();
  const path: Cell[] = [], polled = new Set<string>();
  let flips = 0, phase = 'claim island A';
  const view = (cur?: Cell, changed: number[] = [], removed: string[] = []): View[] => {
    const tones: Record<string, CellTone> = {};
    g.forEach((row, a) => row.forEach((v, b) => { if (v === 2) tones[K(a, b)] = 'visited'; }));
    for (const k of polled) tones[k] = 'done';
    for (const [a, b] of queue) tones[K(a, b)] = 'compared';
    for (const [a, b] of path) tones[K(a, b)] = 'compared';
    if (cur) tones[K(...cur)] = 'active';
    const marked = g.flatMap((row, a) => row.flatMap((v, b) => (v === 2 ? [`(${a},${b})`] : [])));
    return [gridView('grid (1 = land, 0 = water, 2 = claimed)', g, tones), listView('queue', 'queue = ring 0 is all of island A', queue.map(([a, b]) => pt(a, b)), changed, removed), listView('set', 'visited (claimed) squares', marked), vars({ phase, flips })];
  };
  const claim = (a: number, b: number) => {
    if (!inside(n, n, a, b) || g[a][b] !== 1) return;
    g[a][b] = 2; queue.push([a, b]); path.push([a, b]);
    r.frame(`claim${pt(a, b)}: land of island A. Mark it 2 and put it in the queue. The whole island must be ring 0, because the bridge can leave from any of its squares.`, view(undefined, [queue.length - 1]));
    for (const [dr, dc] of D4) claim(a + dr, b + dc);
    path.pop();
  };
  let seeded = false;
  for (let a = 0; a < n && !seeded; a++) for (let b = 0; b < n && !seeded; b++) if (g[a][b] === 1) { seeded = true; claim(a, b); }
  phase = 'BFS through water';
  r.frame(`Island A is fully claimed: ${queue.length} squares in the queue, all at ring 0. Now BFS outward through water, one ring per fill. The first land square found that is not claimed belongs to island B.`, view());
  for (flips = 0; queue.length; flips++) {
    for (let size = queue.length; size > 0; size--) {
      const cell = queue.shift()!, added: Cell[] = [], before = queue.length;
      for (const [dr, dc] of D4) {
        const na = cell[0] + dr, nb = cell[1] + dc;
        if (!inside(n, n, na, nb) || g[na][nb] === 2) continue;
        if (g[na][nb] === 1) {
          r.frame(`Poll ${pt(...cell)} (ring ${flips}). Its neighbour ${pt(na, nb)} is land that is not claimed: island B. ${flips} water squares were filled to get here. Return ${flips}.`, [...view(cell, [], [pt(...cell)]).slice(0, 3), tvars({ phase, flips, answer: flips })]);
          return r.frames;
        }
        g[na][nb] = 2; queue.push([na, nb]); added.push([na, nb]);
      }
      polled.add(K(...cell));
      r.frame(`Poll ${pt(...cell)} (ring ${flips}). Unclaimed water neighbours: ${pts(added)}; each is claimed now and joins ring ${flips + 1}.`, view(cell, added.map((_, k) => before + k), [pt(...cell)]),
        q(`Polling ${pt(...cell)} in ring ${flips}. How many water squares are claimed?`, near(added.length).options, near(added.length).answer, 'Water that is unclaimed gets claimed; claimed squares and island B (the goal) are handled separately.'));
    }
  }
  r.frame('The queue emptied without reaching island B (the problem promises two islands, so this should not happen). Return -1.', [...view().slice(0, 3), tvars({ phase, flips, answer: -1 })]);
  return r.frames;
}

// ---- Side quest 5: Open the Lock (BFS on implicit states, one frame per ring) -------------------
// With 2 wheels the states are drawn as a 10 by 10 grid (row = first wheel, column = second wheel).
export function openLockFrames(deadends: string[], target: string, wheels = 2): Frame[] {
  const r = recorder(), zero = '0'.repeat(wheels), vars = tracker();
  const blocked = new Set(deadends), dist = new Map<string, number>();
  const dead = new Set(deadends);
  let queue: string[] = [], moves = 0;
  const view = (changed: number[] = []): View[] => {
    const out: View[] = [];
    if (wheels === 2) {
      const cells: Val[][] = Array.from({ length: 10 }, (_, a) => Array.from({ length: 10 }, (_, b) => { const s = `${a}${b}`; return dead.has(s) ? '█' : dist.get(s) ?? '·'; }));
      const tones: Record<string, CellTone> = {};
      for (const [s] of dist) tones[K(+s[0], +s[1])] = 'visited';
      for (const s of dead) tones[K(+s[0], +s[1])] = 'out';
      for (const s of queue) tones[K(+s[0], +s[1])] = 'compared';
      tones[K(+target[0], +target[1])] = tones[K(+target[0], +target[1])] ?? 'found';
      out.push(gridView('states (row = wheel 1, column = wheel 2; number = ring, █ = dead end)', cells, tones));
    }
    out.push(listView('queue', 'queue = the current ring', queue, changed), vars({ moves, 'dead or seen': blocked.size }));
    return out;
  };
  if (blocked.has(zero)) { r.frame(`The start ${zero} is itself a dead end, so the lock is jammed. Return -1.`, [tvars({ answer: -1 })]); return r.frames; }
  blocked.add(zero); dist.set(zero, 0); queue = [zero];
  r.frame(`Every lock setting is a node and each click is an edge: each setting has ${wheels * 2} neighbours (every wheel up or down, wrapping 9 to 0). Dead ends are pre-loaded into the visited set, so "dead" and "already seen" are one test. Start: ${zero}, ring 0.`, view([0]));
  for (moves = 0; queue.length; moves++) {
    const ring = queue, next: string[] = [];
    queue = [];
    for (const state of ring) {
      if (state === target) {
        r.frame(`Ring ${moves} is being polled and ${target} is in it. Rings leave in order, so ${moves} is the fewest moves. Return ${moves}.`, [...view().slice(0, wheels === 2 ? 1 : 0), tvars({ moves, answer: moves })]);
        return r.frames;
      }
      const w = [...state];
      for (let i = 0; i < wheels; i++) {
        const original = w[i];
        for (const click of [1, 9]) {
          w[i] = String((Number(original) + click) % 10);
          const s = w.join('');
          if (!blocked.has(s)) { blocked.add(s); next.push(s); dist.set(s, moves + 1); }
        }
        w[i] = original;
      }
    }
    queue = next;
    r.frame(`Ring ${moves} is finished (${plural(ring.length, 'setting')} polled). Every new setting is flagged when it is enqueued: ${next.length} new, ${next.slice(0, 6).join(', ')}${next.length > 6 ? ', ...' : ''}. Dead ends and earlier settings were skipped.`, view(next.map((_, k) => k)),
      q(`Ring ${moves} had ${ring.length} ${ring.length === 1 ? 'setting' : 'settings'}, each with ${wheels * 2} neighbours. Do all ${ring.length * wheels * 2} neighbour slots become new settings?`, ['Yes, every one is new', 'No: dead ends and seen settings are skipped'], 1, 'The ring that just ran, dead ends and duplicates reached from two sides all fail the one blocked-set test, so each setting enters the queue at most once.'));
  }
  r.frame('The queue is empty: the target cannot be reached. Return -1.', [...view().slice(0, 1), tvars({ moves, answer: -1 })]);
  return r.frames;
}

// ---- Side quest 6: Is Graph Bipartite? ---------------------------------------------------------
// `graph[u]` lists the neighbours of u. Final var `answer` = true or false.
export function bipartiteFrames(graph: number[][]): Frame[] {
  const n = graph.length, r = recorder(), ids = Array.from({ length: n }, (_, i) => String(i)), vars = tracker();
  const edges: [string, string][] = [], seen = new Set<string>();
  graph.forEach((vs, u) => vs.forEach(v => { const k = [u, v].sort().join('|'); if (!seen.has(k)) { seen.add(k); edges.push([String(u), String(v)]); } }));
  const color = new Array(n).fill(0), done = new Set<string>();
  let queue: number[] = [];
  const name = (c: number) => (c === 1 ? 'red' : 'blue');
  const view = (cur?: number, changed: number[] = [], removed: string[] = [], active?: [string, string]): View[] => {
    const tones: Record<string, NodeTone> = {};
    color.forEach((c, i) => { if (c !== 0) tones[String(i)] = 'visited'; });
    for (const d of done) tones[d] = 'done';
    for (const x of queue) tones[String(x)] = 'queued';
    if (cur !== undefined) tones[String(cur)] = 'current';
    const labels: Record<string, Val> = Object.fromEntries(color.flatMap((c, i) => (c ? [[String(i), `${i}${c === 1 ? ' R' : ' B'}`]] : [])));
    return [graphOf('graph (R = red, B = blue)', ids, edges, tones, labels, active), listView('queue', 'queue (front on the left)', queue.map(String), changed, removed),
      { kind: 'map', name: 'colour (set at enqueue)', entries: color.flatMap((c, i) => (c ? [[i, name(c)] as [Val, Val]] : [])) }, vars({ coloured: color.filter(c => c).length })];
  };
  r.frame('Two colours, and every edge must join different colours. BFS can colour as it goes: each newly discovered node gets the opposite colour of the node that discovered it. Colour is the flag, set at enqueue.', view());
  for (let s = 0; s < n; s++) {
    if (color[s] !== 0) continue;
    color[s] = 1; queue = [s];
    r.frame(`Node ${s} is uncoloured, so it is the start of a component the earlier searches never saw. Colour it red and enqueue it. (The loop must restart from every uncoloured node because the graph may be in pieces.)`, view(undefined, [0]));
    while (queue.length) {
      const u = queue.shift()!, notes: string[] = [], before = queue.length;
      for (const v of graph[u]) {
        if (color[v] === 0) { color[v] = -color[u]; queue.push(v); notes.push(`${v} is new: colour it ${name(color[v])} and enqueue`); }
        else if (color[v] === color[u]) {
          r.frame(`Poll ${u} (${name(color[u])}). Neighbour ${v} is also ${name(color[v])}: an edge inside one side. That edge closes an odd cycle, which cannot alternate. Return false.`, [...view(u, [], [String(u)], [String(u), String(v)]).slice(0, 3), tvars({ answer: 'false' })]);
          return r.frames;
        } else notes.push(`${v} is already ${name(color[v])}, the other colour, which is consistent`);
      }
      done.add(String(u));
      r.frame(`Poll ${u} (${name(color[u])}). ${notes.join('; ') || 'It has no neighbours'}.`, view(u, queue.slice(before).map((_, k) => before + k), [String(u)]),
        graph[u].length ? q(`Polling ${u}, coloured ${name(color[u])}. A newly discovered neighbour gets which colour?`, ['Red', 'Blue'], color[u] === 1 ? 1 : 0, 'Every edge must join different colours, so a new neighbour takes the opposite of the node that found it.') : undefined);
    }
  }
  r.frame('Every component is coloured and no edge joined two nodes of the same colour. The graph is bipartite.', [...view().slice(0, 3), tvars({ answer: 'true' })]);
  return r.frames;
}
