// Graphs playground: count islands by scanning and sinking whole islands; run a BFS by hand, ring by
// ring, where flagging late is caught; and spread a blight from every rotten orange at once, minute by minute.
import { makeLab, type LabBase, type LabRow } from '../lab.ts';

type Cell = [number, number];
export interface GraphState extends LabBase {
  grid: number[][];
  // islands mode
  scan: number;                  // index r * cols + c of the square the scan is on
  owner: number[][];             // 0 = not sunk, k = sunk as island k
  count: number;
  // bfs mode (4 directions, start (0,0), goal bottom-right, distances in steps)
  dist: number[][];              // −1 = unflagged
  queue: Cell[];                 // front at index 0
  cur: Cell | null;              // the square being expanded
  dir: number;                   // index into DIRS of the next neighbour to decide
  result: number | null;
  // rot mode
  seeded: boolean;
  minute: number;
  rotAt: number[][];             // −1 = not rotten, else the minute it rotted (sources: 0)
  frontier: Cell[];              // squares that rotted in the latest minute
  fresh: number;
}

type Input = { mode: 'islands' | 'bfs' | 'rot'; grid: number[][] };

const DIRS: Cell[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DIR_NAMES = ['down', 'up', 'right', 'left'];
const at = ([r, c]: Cell) => `(${r},${c})`;
const rowsOf = (s: GraphState) => s.grid.length;
const colsOf = (s: GraphState) => (s.grid.length ? s.grid[0].length : 0);
const inside = (s: GraphState, r: number, c: number) => r >= 0 && r < rowsOf(s) && c >= 0 && c < colsOf(s);
const fill = (s: { grid: number[][] }, v: number) => s.grid.map(row => row.map(() => v));

const islandCases = [
  [[1, 1, 0, 0, 0], [1, 1, 0, 0, 0], [0, 0, 1, 0, 0], [0, 0, 0, 1, 1]],
  [[1, 0, 1], [1, 0, 1], [1, 1, 1]],
  [[0, 0, 0], [0, 0, 0]],
  [[1]],
];
const bfsCases = [
  [[0, 0, 0], [1, 1, 0], [0, 0, 0]],
  [[0, 0, 0, 0], [0, 1, 1, 0], [0, 0, 0, 0]],
  [[0, 1], [1, 0]],
  [[0]],
];
const rotCases = [
  [[2, 1, 1], [1, 1, 0], [0, 1, 1]],
  [[2, 1, 1], [1, 1, 1], [1, 1, 2]],
  [[2, 1, 1], [0, 1, 1], [1, 0, 1]],
  [[0, 2]],
];

export function fromInput(input: Input) {
  const grid = input.grid.map(row => [...row]);
  const base = {
    grid, scan: 0, owner: fill({ grid }, 0), count: 0,
    dist: fill({ grid }, -1), queue: [] as Cell[], cur: null as Cell | null, dir: 0, result: null as number | null,
    seeded: false, minute: 0, rotAt: fill({ grid }, -1), frontier: [] as Cell[], fresh: 0,
  };
  if (input.mode === 'bfs' && grid.length && grid[0][0] === 0) { base.dist[0][0] = 0; base.queue = [[0, 0]]; }
  if (input.mode === 'rot') base.fresh = grid.flat().filter(v => v === 1).length;
  return base;
}

// Squares of the land component containing (r, c), found without touching the state.
function component(s: GraphState, r: number, c: number): Cell[] {
  const seen = new Set([`${r},${c}`]), out: Cell[] = [[r, c]];
  for (let i = 0; i < out.length; i++) for (const [dr, dc] of DIRS) {
    const a = out[i][0] + dr, b = out[i][1] + dc;
    if (inside(s, a, b) && s.grid[a][b] === 1 && !seen.has(`${a},${b}`)) { seen.add(`${a},${b}`); out.push([a, b]); }
  }
  return out;
}
const list = (cells: Cell[], max = 6) => cells.slice(0, max).map(at).join(', ') + (cells.length > max ? `, … (${cells.length} in all)` : '');

// ---------- islands ----------
const scanCell = (s: GraphState): Cell => [Math.floor(s.scan / colsOf(s)), s.scan % colsOf(s)];
const scanDone = (s: GraphState) => s.scan >= rowsOf(s) * colsOf(s);
function islandsExpected(s: GraphState) {
  if (scanDone(s)) return 'finish';
  const [r, c] = scanCell(s);
  return s.grid[r][c] === 1 && s.owner[r][c] === 0 ? 'sink' : 'skip';
}
function uncountedIslands(s: GraphState) {
  const seen = new Set<string>(); let k = 0;
  for (let r = 0; r < rowsOf(s); r++) for (let c = 0; c < colsOf(s); c++)
    if (s.grid[r][c] === 1 && s.owner[r][c] === 0 && !seen.has(`${r},${c}`)) { k++; for (const [a, b] of component(s, r, c)) seen.add(`${a},${b}`); }
  return k;
}
function islandsReject(s: GraphState, action: string) {
  if (scanDone(s)) return `Every square has been scanned. Report the count: ${s.count} island(s).`;
  const cell = scanCell(s), [r, c] = cell;
  if (action === 'finish') {
    const left = uncountedIslands(s);
    return `The scan is only at ${at(cell)}; ${rowsOf(s) * colsOf(s) - s.scan} square(s) are unread` + (left ? `, and ${left} island(s) are still uncounted.` : '. No island is left uncounted, but you can’t know that without reading them.');
  }
  if (action === 'sink') {
    if (s.grid[r][c] === 0) return `${at(cell)} is water. There is no island here to count.`;
    return `${at(cell)} was already sunk as part of island #${s.owner[r][c]}. Counting it again would report ${s.count + 1} islands where you have found ${s.count}.`;
  }
  const island = component(s, r, c);
  return `${at(cell)} is land that no flood has touched. Skip it, and its island — ${island.length} square(s): ${list(island)} — is never counted.`;
}
function islandsApply(s: GraphState, action: string) {
  if (action === 'finish') {
    s.done = true;
    s.message = `${s.count} island(s): one per flood. Every land square was sunk exactly once.`;
    return;
  }
  const cell = scanCell(s), [r, c] = cell;
  if (action === 'sink') {
    s.count++;
    const island = component(s, r, c);
    for (const [a, b] of island) s.owner[a][b] = s.count;
    s.message = `Island #${s.count}: flooded ${island.length} square(s) — ${list(island)}. None of them can be counted again.`;
  } else {
    s.message = s.grid[r][c] === 0 ? `${at(cell)} is water. Skip.` : `${at(cell)} was sunk with island #${s.owner[r][c]}. Skip.`;
  }
  s.scan++;
}
function islandsView(s: GraphState): LabRow[] {
  const cur = scanDone(s) ? null : scanCell(s);
  if (!rowsOf(s)) return [{ name: 'Chart', cells: [], empty: 'No squares' }];
  return s.grid.map((row, r) => ({
    name: `row ${r}`,
    cells: row.map((v, c) => {
      const here = cur && cur[0] === r && cur[1] === c;
      const owned = s.owner[r][c];
      return { value: String(v), label: here ? 'SCAN' : owned ? `#${owned}` : undefined, tone: here ? 'hot' : owned ? 'done' : v === 0 ? 'ghost' : undefined };
    }),
  }));
}
function islandsDescribe(s: GraphState) {
  if (s.done) return `Done: ${s.count} island(s).`;
  if (scanDone(s)) return `Scan complete. Islands counted: ${s.count}.`;
  const [r, c] = scanCell(s);
  const what = s.grid[r][c] === 0 ? 'water' : s.owner[r][c] ? `land, sunk with island #${s.owner[r][c]}` : 'land, untouched';
  return `Scan at (${r},${c}): ${what}. Islands counted: ${s.count}.`;
}

// ---------- bfs ----------
const goalOf = (s: GraphState): Cell => [rowsOf(s) - 1, colsOf(s) - 1];
const isGoal = (s: GraphState, cell: Cell | null) => !!cell && cell[0] === rowsOf(s) - 1 && cell[1] === colsOf(s) - 1;
const neighbour = (s: GraphState): Cell | null => (s.cur && s.dir < 4 ? [s.cur[0] + DIRS[s.dir][0], s.cur[1] + DIRS[s.dir][1]] : null);
// Skip neighbours that are off the chart; when none remain, the current square is finished.
function advance(s: GraphState) {
  while (s.cur && s.dir < 4) {
    const [a, b] = neighbour(s)!;
    if (inside(s, a, b)) return;
    s.dir++;
  }
  s.cur = null;
  s.dir = 0;
}
function bfsExpected(s: GraphState) {
  if (s.cur === null) return s.queue.length ? 'poll' : 'finish';
  if (isGoal(s, s.cur)) return 'finish';
  const [a, b] = neighbour(s)!;
  return s.grid[a][b] === 0 && s.dist[a][b] === -1 ? 'enqueue' : 'skip';
}
function bfsReject(s: GraphState, action: string) {
  const d = (cell: Cell) => s.dist[cell[0]][cell[1]];
  if (s.cur && isGoal(s, s.cur)) return `Stop: the goal ${at(s.cur)} was polled in ring ${d(s.cur)}. Rings leave the queue in order, so nothing later can be closer.`;
  if (s.cur === null) {
    if (!s.queue.length) return 'The queue is empty: every square reachable from the start is flagged, and the goal is not among them. Report −1.';
    if (action === 'finish') return `${s.queue.length} square(s) still wait in the queue, starting with ${at(s.queue[0])} in ring ${d(s.queue[0])}. The goal may still be reached.`;
    return `No square is being expanded. Poll the front of the queue, ${at(s.queue[0])}, first.`;
  }
  const n = neighbour(s)!, [a, b] = n;
  const valid = s.grid[a][b] === 0 && s.dist[a][b] === -1;
  if (action === 'poll') return `You are still expanding ${at(s.cur)}: its ${DIR_NAMES[s.dir]} neighbour ${at(n)} hasn’t been decided. Leaving now would lose it and every neighbour after it.`;
  if (action === 'finish') return `The goal hasn’t been polled yet, and ${s.queue.length} square(s) wait in the queue besides ${at(s.cur)}.`;
  if (action === 'skip') return `${at(n)} is open and unflagged. Skip it, and it can only be found later from a farther ring — its distance comes out too big, or never, if this is its only way in.`;
  // enqueue or late
  if (s.grid[a][b] === 1) return `${at(n)} is rock. Boats don’t land on rock.`;
  if (!valid) return `${at(n)} already has a flag (ring ${s.dist[a][b]}). Enqueueing it again would put it in the queue twice.`;
  // action === 'late' on a valid neighbour
  const rival = s.queue.find(([qr, qc]) => Math.abs(qr - a) + Math.abs(qc - b) === 1);
  if (rival) return `If ${at(n)} isn’t flagged now, ${at(rival)} — already in the queue and also next to it — will enqueue it a second time when it is polled. Flag when the boat is sent.`;
  return `Nothing else in the queue borders ${at(n)} yet, so you would get away with it this time — but on a 10 × 10 open grid, flagging on poll queues 181 squares instead of 100. Flag it now.`;
}
function bfsApply(s: GraphState, action: string) {
  if (action === 'finish') {
    s.done = true;
    s.result = s.cur && isGoal(s, s.cur) ? s.dist[s.cur[0]][s.cur[1]] : -1;
    s.message = s.result >= 0 ? `Shortest route: ${s.result} step(s). The goal was first reached in ring ${s.result}, and no later ring can be closer.` : 'The queue ran dry before the goal appeared: no route exists. Answer −1.';
    return;
  }
  if (action === 'poll') {
    const cell = s.queue.shift()!;
    s.cur = cell;
    s.dir = 0;
    if (isGoal(s, cell)) { s.message = `Polled ${at(cell)}: the goal, in ring ${s.dist[cell[0]][cell[1]]}. Its distance is final.`; return; }
    s.message = `Polled ${at(cell)}, ring ${s.dist[cell[0]][cell[1]]}. Decide its neighbours one by one.`;
    advance(s);
    if (!s.cur) s.message += ' It has no neighbours on the chart.';
    return;
  }
  const n = neighbour(s)!, [a, b] = n, from = s.cur!;
  if (action === 'enqueue') {
    s.dist[a][b] = s.dist[from[0]][from[1]] + 1;
    s.queue.push(n);
    s.message = `Flagged ${at(n)} with ring ${s.dist[a][b]} and enqueued it. Nobody can enqueue it again.`;
  } else {
    s.message = s.grid[a][b] === 1 ? `${at(n)} is rock. Skip.` : `${at(n)} is already flagged (ring ${s.dist[a][b]}). Skip.`;
  }
  s.dir++;
  advance(s);
  if (!s.cur) s.message += ` ${at(from)} is finished.`;
}
function bfsView(s: GraphState): LabRow[] {
  const n = neighbour(s);
  const queued = new Set(s.queue.map(([r, c]) => `${r},${c}`));
  const goal = goalOf(s);
  const grid: LabRow[] = s.grid.map((row, r) => ({
    name: `row ${r}`,
    cells: row.map((v, c) => {
      const here = !!s.cur && s.cur[0] === r && s.cur[1] === c;
      const next = !!n && n[0] === r && n[1] === c;
      const label = here ? 'HERE' : next ? 'NEXT?' : queued.has(`${r},${c}`) ? 'QUEUED' : r === goal[0] && c === goal[1] ? 'GOAL' : undefined;
      const value = v === 1 ? '█' : s.dist[r][c] >= 0 ? String(s.dist[r][c]) : '·';
      return { value, label, tone: v === 1 ? 'out' : here ? 'hot' : s.dist[r][c] >= 0 ? 'done' : undefined };
    }),
  }));
  return [...grid, { name: 'Queue (front first)', empty: 'Queue is empty', cells: s.queue.map(cell => ({ value: at(cell), label: `ring ${s.dist[cell[0]][cell[1]]}` })) }];
}
function bfsDescribe(s: GraphState) {
  if (s.done) return s.result !== null && s.result >= 0 ? `Done: ${s.result} step(s) from (0,0) to ${at(goalOf(s))}.` : 'Done: the goal is unreachable (−1).';
  if (s.cur && isGoal(s, s.cur)) return `The goal ${at(s.cur)} has been polled, in ring ${s.dist[s.cur[0]][s.cur[1]]}.`;
  if (s.cur) { const n = neighbour(s)!; return `Expanding ${at(s.cur)}, ring ${s.dist[s.cur[0]][s.cur[1]]}. Next neighbour (${DIR_NAMES[s.dir]}): ${at(n)}.`; }
  return s.queue.length ? `Queue holds ${s.queue.length} square(s). Front: ${at(s.queue[0])}.` : 'The queue is empty.';
}

// ---------- rot ----------
const sources = (s: GraphState): Cell[] => s.grid.flatMap((row, r) => row.flatMap((v, c) => (v === 2 ? [[r, c] as Cell] : [])));
const freshNeighbours = (s: GraphState, ring: Cell[]) => {
  const out: Cell[] = [], seen = new Set<string>();
  for (const [r, c] of ring) for (const [dr, dc] of DIRS) {
    const a = r + dr, b = c + dc;
    if (inside(s, a, b) && s.grid[a][b] === 1 && s.rotAt[a][b] === -1 && !seen.has(`${a},${b}`)) { seen.add(`${a},${b}`); out.push([a, b]); }
  }
  return out;
};
// Minute each fresh orange rots when the blight starts from `starts` only (−1 = never).
function rotTimes(s: GraphState, starts: Cell[]) {
  const t = s.grid.map(row => row.map(() => -1));
  const q: Cell[] = [...starts];
  for (const [r, c] of starts) t[r][c] = 0;
  for (let i = 0; i < q.length; i++) for (const [dr, dc] of DIRS) {
    const a = q[i][0] + dr, b = q[i][1] + dc;
    if (inside(s, a, b) && s.grid[a][b] === 1 && t[a][b] === -1) { t[a][b] = t[q[i][0]][q[i][1]] + 1; q.push([a, b]); }
  }
  return t;
}
function rotExpected(s: GraphState) {
  if (!s.seeded) return 'seed';
  return s.fresh > 0 && freshNeighbours(s, s.frontier).length ? 'spread' : 'finish';
}
function rotAlsoValid(s: GraphState, action: string) {
  return !s.seeded && action === 'seed-first' && sources(s).length <= 1;
}
function rotReject(s: GraphState, action: string) {
  const src = sources(s);
  if (!s.seeded) {
    if (action === 'seed-first') {
      // Only reached with 2+ sources (one or none makes seed-first equivalent, so it is allowed).
      const all = rotTimes(s, src), one = rotTimes(s, [src[0]]);
      const others = src.slice(1).map(at).join(', ');
      let never: Cell | null = null, worst: Cell | null = null, gap = 0;
      for (let r = 0; r < rowsOf(s); r++) for (let c = 0; c < colsOf(s); c++) {
        if (s.grid[r][c] !== 1 || all[r][c] === -1) continue;          // unreachable either way
        if (one[r][c] === -1) { never ??= [r, c]; continue; }
        if (one[r][c] - all[r][c] > gap) { gap = one[r][c] - all[r][c]; worst = [r, c]; }
      }
      if (never) return `Starting only from ${at(src[0])} ignores ${others}. Then ${at(never)} would never rot, though the blight really reaches it at minute ${all[never[0]][never[1]]}.`;
      if (worst) return `Starting only from ${at(src[0])} ignores ${others}. Then ${at(worst)} would rot at minute ${one[worst[0]][worst[1]]} instead of minute ${all[worst[0]][worst[1]]}.`;
      return `The rotten orange(s) at ${others} spoil their neighbours in minute 1 too. Queue every source in ring 0.`;
    }
    return 'The queue is empty. Seed it with the rotten oranges before any minute can pass.';
  }
  if (action === 'seed' || action === 'seed-first') return `The queue was seeded at minute 0 with ${src.length} rotten orange(s). Seeding again would restart the clock.`;
  const next = freshNeighbours(s, s.frontier);
  if (action === 'finish') return `${next.length} fresh orange(s) border the oranges that rotted at minute ${s.minute} — ${at(next[0])} for one. They rot in minute ${s.minute + 1}.`;
  // action === 'spread' when the right move is to finish
  if (s.fresh === 0) return `Every orange is rotten. Another round would rot nothing and still add a minute: ${s.minute + 1} instead of ${s.minute}. Stop when nothing fresh is left.`;
  const stuck: Cell[] = [];
  for (let r = 0; r < rowsOf(s); r++) for (let c = 0; c < colsOf(s); c++) if (s.grid[r][c] === 1 && s.rotAt[r][c] === -1) stuck.push([r, c]);
  return `No fresh orange borders the rotten ones. ${list(stuck)} can never be reached, so another minute changes nothing. Report −1.`;
}
function rotApply(s: GraphState, action: string) {
  if (action === 'seed' || action === 'seed-first') {
    s.seeded = true;
    s.frontier = sources(s);
    for (const [r, c] of s.frontier) s.rotAt[r][c] = 0;
    s.message = s.frontier.length ? `Ring 0: ${list(s.frontier)}. ${s.fresh} fresh orange(s) to go.` : `No rotten orange anywhere: nothing can start the blight. ${s.fresh} fresh orange(s).`;
    return;
  }
  if (action === 'spread') {
    const next = freshNeighbours(s, s.frontier);
    s.minute++;
    for (const [r, c] of next) s.rotAt[r][c] = s.minute;
    s.fresh -= next.length;
    s.frontier = next;
    s.message = `Minute ${s.minute}: ${list(next)} rot. ${s.fresh} fresh orange(s) left.`;
    return;
  }
  s.done = true;
  s.result = s.fresh === 0 ? s.minute : -1;
  s.message = s.result >= 0 ? `Answer: ${s.result} minute(s). That is the last minute in which an orange rotted.` : `Answer: −1. ${s.fresh} orange(s) can never be reached.`;
}
function rotView(s: GraphState): LabRow[] {
  const ring = new Set(s.frontier.map(([r, c]) => `${r},${c}`));
  return s.grid.map((row, r) => ({
    name: `row ${r}`,
    cells: row.map((v, c) => {
      const t = s.rotAt[r][c];
      if (v === 0) return { value: '·', tone: 'ghost' as const };
      if (t >= 0) return { value: '2', label: `min ${t}`, tone: ring.has(`${r},${c}`) && !s.done ? 'hot' as const : 'done' as const };
      return { value: '1', label: 'fresh' };
    }),
  }));
}
function rotDescribe(s: GraphState) {
  if (s.done) return `Done: ${s.result} (${s.result === -1 ? 'some orange never rots' : 'minutes until no fresh orange is left'}).`;
  if (!s.seeded) return `${sources(s).length} rotten orange(s), ${s.fresh} fresh. Nothing queued yet.`;
  return `Minute ${s.minute} · fresh left ${s.fresh} · latest ring holds ${s.frontier.length} orange(s).`;
}

export const lab = makeLab<GraphState>({
  islands: {
    name: 'Count the islands',
    cases: islandCases.length,
    actions: [
      { action: 'sink', label: 'New island: count it and sink all of it' },
      { action: 'skip', label: 'Skip: water, or already sunk' },
      { action: 'finish', label: 'Scan complete: report the count' },
    ],
    create: v => fromInput({ mode: 'islands', grid: islandCases[v] }),
    expected: islandsExpected,
    apply: islandsApply,
    reject: islandsReject,
    view: islandsView,
    describe: islandsDescribe,
  },
  bfs: {
    name: 'Ring by ring: shortest route (4 directions)',
    cases: bfsCases.length,
    actions: [
      { action: 'poll', label: 'Poll the front of the queue' },
      { action: 'enqueue', label: 'Flag this neighbour and enqueue it' },
      { action: 'late', label: 'Enqueue it; flag it when it is polled' },
      { action: 'skip', label: 'Skip this neighbour (rock or flagged)' },
      { action: 'finish', label: 'Stop and report the distance (or −1)' },
    ],
    create: v => fromInput({ mode: 'bfs', grid: bfsCases[v] }),
    expected: bfsExpected,
    apply: bfsApply,
    reject: bfsReject,
    view: bfsView,
    describe: bfsDescribe,
  },
  rot: {
    name: 'The blight: every source at once',
    cases: rotCases.length,
    actions: [
      { action: 'seed', label: 'Queue EVERY rotten orange at minute 0' },
      { action: 'seed-first', label: 'Queue only the first rotten orange' },
      { action: 'spread', label: 'Advance one minute' },
      { action: 'finish', label: 'Stop: report minutes (or −1)' },
    ],
    create: v => fromInput({ mode: 'rot', grid: rotCases[v] }),
    expected: rotExpected,
    alsoValid: rotAlsoValid,
    apply: rotApply,
    reject: rotReject,
    view: rotView,
    describe: rotDescribe,
  },
}, 'Gold = active · green = flagged or settled · faded = water or empty · █ = rock · squares are (row, column) from 0');
