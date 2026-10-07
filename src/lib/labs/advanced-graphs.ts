// Advanced Graphs playground: run Kahn's algorithm by hand (seed, pop, cut tracks, declare a cycle),
// keep a union-find register (find heads, merge or flag the loop track), and work Dijkstra's ticket
// rack (pop the cheapest, skip stale tickets, relax roads).
import { makeLab, type LabBase, type LabRow } from '../lab.ts';

export interface GraphState extends LabBase {
  n: number;
  // Kahn's platform
  edges: [number, number][];         // directed tracks u -> v (u must come before v)
  indeg: number[];                   // tracks into each station not yet cut
  ready: number[];                   // the platform, first in first out
  order: number[];                   // the timetable so far
  seeded: boolean;
  holding: number | null;            // popped station whose tracks are not cut yet
  verdict: '' | 'order' | 'cycle';
  // the clan register
  links: [number, number][];         // undirected tracks, in arrival order
  parent: number[];
  size: number[];
  li: number;                        // index of the next track
  roots: [number, number] | null;    // heads found for the current track
  closers: [number, number][];       // tracks that closed a loop
  sets: number;
  // the ticket rack
  roads: [number, number, number][]; // one-way roads u -> v with toll w
  src: number;
  dist: (number | null)[];           // null = ∞ (not reached yet)
  heap: [number, number][];          // [fare, town], kept cheapest first (ties: lower town first)
  ticket: [number, number] | null;   // the ticket in hand
  settled: boolean[];
}

export type Input =
  | { mode: 'kahn'; n: number; edges: [number, number][] }
  | { mode: 'uf'; n: number; edges: [number, number][] }
  | { mode: 'dijkstra'; n: number; roads: [number, number, number][]; src: number };

const blank = () => ({
  n: 0,
  edges: [] as [number, number][], indeg: [] as number[], ready: [] as number[], order: [] as number[], seeded: false, holding: null as number | null, verdict: '' as GraphState['verdict'],
  links: [] as [number, number][], parent: [] as number[], size: [] as number[], li: 0, roots: null as [number, number] | null, closers: [] as [number, number][], sets: 0,
  roads: [] as [number, number, number][], src: 0, dist: [] as (number | null)[], heap: [] as [number, number][], ticket: null as [number, number] | null, settled: [] as boolean[],
});

const kahnCases: { n: number; edges: [number, number][] }[] = [
  { n: 4, edges: [[0, 1], [0, 2], [1, 3], [2, 3]] },          // the diamond: a full timetable
  { n: 4, edges: [[0, 1], [1, 2], [2, 3], [3, 2]] },          // 2 and 3 wait on each other
  { n: 3, edges: [] },                                         // nothing waits on anything
  { n: 5, edges: [[0, 2], [1, 2], [2, 3], [1, 4]] },
];
const ufCases: { n: number; edges: [number, number][] }[] = [
  { n: 5, edges: [[0, 1], [1, 2], [3, 4]] },
  { n: 3, edges: [[0, 1], [0, 2], [1, 2]] },                   // the last track closes a loop
  { n: 4, edges: [] },
  { n: 6, edges: [[0, 1], [2, 3], [1, 3], [0, 2], [4, 5]] },
];
const dijkstraCases: { n: number; roads: [number, number, number][]; src: number }[] = [
  { n: 4, roads: [[1, 0, 1], [1, 2, 1], [2, 3, 1]], src: 1 },
  { n: 4, roads: [[0, 1, 4], [0, 2, 1], [2, 1, 2], [1, 3, 1], [2, 3, 5]], src: 0 },   // stale tickets appear
  { n: 3, roads: [[0, 1, 5], [2, 0, 1]], src: 0 },             // town 2 is never reached
  { n: 1, roads: [], src: 0 },
];

export function fromInput(input: Input) {
  const base = blank();
  base.n = input.n;
  if (input.mode === 'kahn' || input.mode === 'uf') {
    const edges = input.edges.map(e => [...e] as [number, number]);
    if (input.mode === 'kahn') {
      const indeg = Array(input.n).fill(0);
      for (const [, v] of edges) indeg[v]++;
      return { ...base, edges, indeg };
    }
    return { ...base, links: edges, parent: Array.from({ length: input.n }, (_, i) => i), size: Array(input.n).fill(1), sets: input.n };
  }
  const dist: (number | null)[] = Array(input.n).fill(null);
  dist[input.src] = 0;
  return { ...base, roads: input.roads.map(r => [...r] as [number, number, number]), src: input.src, dist, heap: [[0, input.src]] as [number, number][], settled: Array(input.n).fill(false) };
}

const list = (xs: number[]) => xs.join(', ');
const fare = (x: number | null) => (x === null ? '∞' : String(x));

// ---------- Kahn's platform ----------
function kahnExpected(s: GraphState) {
  if (!s.seeded) return 'seed';
  if (s.holding !== null) return 'cut';
  if (s.ready.length) return 'pop';
  return s.order.length < s.n ? 'cycle' : 'finish';
}
const outOf = (s: GraphState, u: number) => s.edges.filter(([a]) => a === u).map(([, b]) => b);
const unplaced = (s: GraphState) => Array.from({ length: s.n }, (_, i) => i).filter(i => !s.order.includes(i));
function stalledCandidate(s: GraphState) {
  const left = unplaced(s).filter(i => !s.ready.includes(i) && s.holding !== i);
  if (!left.length) return null;
  return left.reduce((best, i) => (s.indeg[i] < s.indeg[best] ? i : best), left[0]);
}
function kahnReject(s: GraphState, action: string) {
  if (!s.seeded) {
    if (action === 'seed') return 'Seed the platform.';
    const zeros = s.indeg.map((d, i) => (d === 0 ? i : -1)).filter(i => i >= 0);
    return zeros.length
      ? `Nothing is on the platform yet. Seed it first: station(s) ${list(zeros)} wait on nothing and can be built today.`
      : 'Nothing is on the platform yet. Seed it first — and notice what seeding finds: every station waits on something.';
  }
  if (action === 'seed') return 'The platform was seeded already. From now on a station boards only when its count drops to 0.';
  if (s.holding !== null) {
    const h = s.holding, targets = outOf(s, h);
    const tail = targets.length ? `its tracks to ${list(targets)} still count against them` : 'it has no outgoing tracks, so cutting them is quick';
    return `Station ${h} is in the timetable, but ${tail}. Cut its tracks first${targets.length ? ', or those stations can never become ready' : ''}.`;
  }
  if (s.ready.length) {
    if (action === 'cut') return `No station in hand. Pop the next one from the platform first: station ${s.ready[0]}.`;
    if (action === 'cycle') return `Station(s) ${list(s.ready)} are still on the platform. A cycle can be declared only when the platform is empty and stations are left over.`;
    if (action === 'finish') return `${s.n - s.order.length} station(s) are not in the timetable yet, and ${list(s.ready)} can be built right now.`;
    return `Station ${s.ready[0]} is ready, with nothing left to wait for. Forcing a station that still waits would build it before one of its prerequisites.`;
  }
  const left = unplaced(s);
  if (left.length) {
    if (action === 'pop') return `The platform is empty. Every remaining station (${list(left)}) still waits on something.`;
    if (action === 'cut') return 'No station in hand, and none ready.';
    if (action === 'finish') return `Only ${s.order.length} of ${s.n} stations are placed. The rest (${list(left)}) wait on each other: that is a cycle, not a finished timetable.`;
    const c = stalledCandidate(s)!;
    const preds = s.edges.filter(([u, v]) => v === c && !s.order.includes(u)).map(([u]) => u);
    return `Station ${c} still waits on ${s.indeg[c]} unbuilt station(s) (${list(preds)}). Building it now would put it before its own prerequisite. The rules form a cycle: declare it.`;
  }
  if (action === 'cycle') return `All ${s.n} stations are placed and every track points forward. There is no cycle.`;
  if (action === 'force') return `Nothing is stalled: all ${s.n} stations are placed.`;
  return 'Every station is placed. Close the timetable.';
}
function kahnApply(s: GraphState, action: string) {
  if (action === 'seed') {
    s.seeded = true;
    s.ready = s.indeg.map((d, i) => (d === 0 ? i : -1)).filter(i => i >= 0);
    s.message = s.ready.length ? `Station(s) ${list(s.ready)} wait on nothing: on the platform they go.` : 'No station has in-degree 0. The platform starts empty.';
  } else if (action === 'pop') {
    const c = s.ready.shift()!;
    s.holding = c;
    s.order.push(c);
    s.message = `Station ${c} is built: slot ${s.order.length} of the timetable. Every station it waited for was built earlier.`;
  } else if (action === 'cut') {
    const c = s.holding!, freed: number[] = [], lowered: string[] = [];
    for (const v of outOf(s, c)) {
      s.indeg[v]--;
      lowered.push(`${v} → ${s.indeg[v]}`);
      if (s.indeg[v] === 0) { s.ready.push(v); freed.push(v); }
    }
    s.holding = null;
    s.message = lowered.length
      ? `Cut the tracks out of ${c}: ${lowered.join(', ')}.` + (freed.length ? ` Station(s) ${list(freed)} reached 0 and board the platform.` : ' Nobody reached 0 yet.')
      : `Station ${c} has no outgoing tracks. Nothing waited on it.`;
  } else if (action === 'cycle') {
    s.done = true;
    s.verdict = 'cycle';
    s.message = `Cycle. ${s.order.length} of ${s.n} placed; station(s) ${list(unplaced(s))} sit on a cycle or behind one. Course Schedule returns false; Course Schedule II returns an empty array.`;
  } else {
    s.done = true;
    s.verdict = 'order';
    s.message = s.n ? `Timetable: ${s.order.join(' → ')}. Every track points forward.` : 'No stations, nothing to order.';
  }
}
function kahnView(s: GraphState): LabRow[] {
  return [
    {
      name: 'Stations (tracks still to wait for)', empty: 'No stations',
      cells: Array.from({ length: s.n }, (_, i) => ({
        value: String(i), label: s.order.includes(i) ? 'built' : `in ${s.indeg[i]}`,
        tone: s.holding === i || s.ready.includes(i) ? 'hot' : s.order.includes(i) ? 'done' : s.verdict === 'cycle' ? 'out' : undefined,
      })),
    },
    { name: 'Ready platform', empty: s.seeded ? 'Platform empty' : 'Not seeded yet', cells: s.ready.map((v, i) => ({ value: String(v), label: i === 0 ? 'next' : undefined, tone: 'hot' })) },
    { name: 'Timetable (pop order)', empty: 'Nothing built yet', join: '→', cells: s.order.map(v => ({ value: String(v), tone: s.holding === v ? 'hot' : 'done' })) },
    {
      name: 'Tracks', empty: 'No tracks',
      cells: s.edges.map(([u, v]) => {
        const cut = s.order.includes(u) && s.holding !== u;
        return { value: `${u}→${v}`, label: cut ? 'cut' : undefined, tone: cut ? 'ghost' : s.holding === u ? 'hot' : undefined };
      }),
    },
  ];
}
function kahnDescribe(s: GraphState) {
  if (s.done) return s.verdict === 'cycle' ? `Stopped: ${s.order.length} of ${s.n} placed, the rest are stuck.` : `Done: ${s.order.join(' → ') || 'empty'}.`;
  return `${s.n} station(s) · ${s.order.length} built · platform: ${s.ready.length ? list(s.ready) : 'empty'}${s.holding !== null ? ` · holding ${s.holding}, tracks not cut yet` : ''}${s.seeded ? '' : ' · not seeded'}`;
}

// ---------- the clan register ----------
function rootOf(parent: number[], x: number) { while (parent[x] !== x) x = parent[x]; return x; }
function pathOf(parent: number[], x: number) { const path = [x]; while (parent[x] !== x) { x = parent[x]; path.push(x); } return path; }
function ufExpected(s: GraphState) {
  if (s.li >= s.links.length) return 'finish';
  if (!s.roots) return 'find';
  return s.roots[0] === s.roots[1] ? 'loop' : 'union';
}
function ufReject(s: GraphState, action: string) {
  if (s.li >= s.links.length) return `All ${s.links.length} track(s) are processed. Report ${s.sets} separate network(s).`;
  const [a, b] = s.links[s.li];
  if (!s.roots) {
    if (action === 'finish') return `${s.links.length - s.li} track(s) remain, starting with ${a}–${b}.`;
    if (action === 'link') {
      if (s.parent[b] !== b) return `Junction ${b} hangs under ${s.parent[b]} (clan head ${rootOf(s.parent, b)}). Writing parent[${b}] = ${a} would tear ${b} out of that clan, and the register would forget it ever joined.`;
      return `Find both heads first. You need them to know whether ${a}–${b} closes a loop, and to hang the smaller clan under the larger.`;
    }
    return `You don't know the clan heads yet. find(${a}) and find(${b}) first: heads, not members, decide whether this track merges or loops.`;
  }
  const [ra, rb] = s.roots;
  if (action === 'find') return `Heads already found: find(${a}) = ${ra}, find(${b}) = ${rb}. Decide.`;
  if (action === 'finish') return `${s.links.length - s.li} track(s) remain, starting with ${a}–${b}.`;
  if (ra === rb) {
    if (action === 'union') return `Both ends report head ${ra}: ${a} and ${b} are already connected. Merging a clan with itself changes nothing — this track closes a loop. Flag it.`;
    return `Both ends already share head ${ra}. There is nothing to link; this track closes a loop.`;
  }
  if (action === 'loop') return `Heads ${ra} and ${rb} differ: ${a} and ${b} are in different clans, so this track joins them. It cannot close a loop.`;
  const big = s.size[ra] >= s.size[rb] ? ra : rb, small = big === ra ? rb : ra;
  return `Link heads, not members: parent[${small}] = ${big} (clan sizes ${s.size[small]} and ${s.size[big]}). Re-pointing junction ${b} itself could tear it out of its clan.`;
}
function ufApply(s: GraphState, action: string) {
  if (action === 'find') {
    const [a, b] = s.links[s.li];
    const pa = pathOf(s.parent, a), pb = pathOf(s.parent, b);
    const ra = pa[pa.length - 1], rb = pb[pb.length - 1];
    for (const x of pa) s.parent[x] = ra;            // path compression
    for (const x of pb) s.parent[x] = rb;
    s.roots = [ra, rb];
    const walk = (p: number[]) => (p.length > 1 ? p.join(' → ') : `${p[0]} (a head)`);
    const squashed = pa.length > 2 || pb.length > 2;
    s.message = `find(${a}): ${walk(pa)}. find(${b}): ${walk(pb)}.` + (squashed ? ' Every node on those walks now points straight at its head.' : '') + (ra === rb ? ' Same head.' : ' Different heads.');
  } else if (action === 'union') {
    let [ra, rb] = s.roots!;
    if (s.size[ra] < s.size[rb]) [ra, rb] = [rb, ra];
    s.parent[rb] = ra;
    s.size[ra] += s.size[rb];
    s.sets--;
    s.li++;
    s.roots = null;
    s.message = `parent[${rb}] = ${ra}: clan ${rb} joins clan ${ra} (size now ${s.size[ra]}). ${s.sets} clan(s) remain.`;
  } else if (action === 'loop') {
    const t = s.links[s.li];
    s.closers.push([t[0], t[1]]);
    s.li++;
    s.roots = null;
    s.message = `Track ${t[0]}–${t[1]} closes a loop: its ends were already connected. In Redundant Connection, the first such track is the answer; in Graph Valid Tree, it means false.`;
  } else {
    s.done = true;
    s.message = `${s.sets} separate network(s)` + (s.closers.length ? `; loop track(s): ${s.closers.map(([a, b]) => `${a}–${b}`).join(', ')}.` : '; no track closed a loop.');
  }
}
function ufView(s: GraphState): LabRow[] {
  const cur = s.li < s.links.length ? s.links[s.li] : null;
  return [
    {
      name: 'Junction (points to)', empty: 'No junctions',
      cells: s.parent.map((p, i) => ({
        value: String(i), label: p === i ? `head ×${s.size[i]}` : `→ ${p}`,
        tone: s.roots && s.roots.includes(i) ? 'hot' : cur && cur.includes(i) ? 'hot' : p === i ? 'done' : undefined,
      })),
    },
    {
      name: 'Tracks in order', empty: 'No tracks',
      cells: s.links.map(([a, b], i) => ({
        value: `${a}–${b}`, label: i === s.li ? 'now' : s.closers.some(([x, y]) => x === a && y === b) && i < s.li ? 'loop' : undefined,
        tone: i === s.li ? 'hot' : i < s.li ? (s.closers.some(([x, y]) => x === a && y === b) ? 'out' : 'done') : undefined,
      })),
    },
    { name: 'Loop tracks', empty: 'None yet', cells: s.closers.map(([a, b]) => ({ value: `${a}–${b}`, tone: 'out' })) },
  ];
}
function ufDescribe(s: GraphState) {
  if (s.li >= s.links.length) return s.done ? `Done: ${s.sets} network(s).` : `All tracks processed · ${s.sets} clan(s).`;
  const [a, b] = s.links[s.li];
  return `Track ${s.li + 1} of ${s.links.length}: ${a}–${b}${s.roots ? ` · heads ${s.roots[0]} and ${s.roots[1]}` : ''} · ${s.sets} clan(s) so far.`;
}

// ---------- the ticket rack ----------
function sortRack(heap: [number, number][]) { heap.sort((x, y) => x[0] - y[0] || x[1] - y[1]); }
function dijkstraExpected(s: GraphState) {
  if (!s.ticket) return s.heap.length ? 'pop' : 'finish';
  return s.ticket[0] > (s.dist[s.ticket[1]] as number) ? 'skip' : 'relax';
}
const roadsOut = (s: GraphState, u: number) => s.roads.filter(([a]) => a === u);
function dijkstraReject(s: GraphState, action: string) {
  if (!s.ticket) {
    if (!s.heap.length) return 'The rack is empty: every reachable town is settled. Report the board.';
    const [f, t] = s.heap[0];
    if (action === 'finish') return `The rack still holds ${s.heap.length} ticket(s). Each must be popped and relaxed or skipped before the board is final; the cheapest is (${f}, town ${t}).`;
    return `No ticket in hand. Pop the cheapest first: (${f}, town ${t}).`;
  }
  const [f, t] = s.ticket, d = s.dist[t] as number;
  if (action === 'pop' || action === 'finish') return `You are holding (${f}, town ${t}). Decide first: relax its roads or skip it.`;
  if (action === 'relax') return `This ticket says ${f}, but dist[${t}] is already ${d} from a cheaper ticket popped earlier. Relaxing from ${f} could only offer fares ${f - d} higher than ones already offered. Skip it.`;
  const out = roadsOut(s, t);
  return out.length
    ? `${f} equals dist[${t}]: this is town ${t}'s cheapest ticket, so its fare is final. Skipping it would leave ${out.map(([, v, w]) => `${t}→${v} (${w})`).join(', ')} unexplored.`
    : `${f} equals dist[${t}]: this ticket is fresh, so town ${t}'s fare is final. Relax it — town ${t} has no roads out, but settling it is the step that proves its fare.`;
}
function dijkstraApply(s: GraphState, action: string) {
  if (action === 'pop') {
    s.ticket = s.heap.shift()!;
    const [f, t] = s.ticket;
    s.message = `Popped (${f}, town ${t}). The board says dist[${t}] = ${fare(s.dist[t])}.`;
  } else if (action === 'relax') {
    const [f, t] = s.ticket!, changes: string[] = [];
    for (const [, v, w] of roadsOut(s, t)) {
      const nd = f + w;
      if (s.dist[v] === null || nd < (s.dist[v] as number)) {
        changes.push(`dist[${v}] ${fare(s.dist[v])} → ${nd}`);
        s.dist[v] = nd;
        s.heap.push([nd, v]);
      }
    }
    sortRack(s.heap);
    s.settled[t] = true;
    s.ticket = null;
    s.message = `Town ${t} settled at ${f}. ` + (changes.length ? `Relaxed: ${changes.join(', ')}; new tickets in the rack.` : roadsOut(s, t).length ? 'No road out of it improves anything.' : 'No roads leave it.');
  } else if (action === 'skip') {
    const [f, t] = s.ticket!;
    s.ticket = null;
    s.message = `Discarded the stale ticket (${f}, town ${t}): town ${t} was settled at ${fare(s.dist[t])}.`;
  } else {
    s.done = true;
    const unreached = s.dist.some(x => x === null);
    const last = Math.max(...s.dist.map(x => (x === null ? 0 : x)));
    s.message = `Final fares: ${s.dist.map(fare).join(', ')}. ` + (unreached ? 'Some town is never reached: Network Delay Time returns −1.' : `The last town hears at ${last}.`);
  }
}
function dijkstraView(s: GraphState): LabRow[] {
  return [
    {
      name: 'Town (fare on the board)', empty: 'No towns',
      cells: s.dist.map((d, i) => ({ value: String(i), label: `${s.settled[i] ? 'final ' : ''}${fare(d)}`, tone: s.ticket && s.ticket[1] === i ? 'hot' : s.settled[i] ? 'done' : d === null ? 'ghost' : undefined })),
    },
    { name: 'Ticket rack (cheapest first)', empty: 'Rack empty', cells: s.heap.map(([f, t], i) => ({ value: `(${f}, ${t})`, label: i === 0 ? 'next' : undefined, tone: f > (s.dist[t] as number) ? 'ghost' : undefined })) },
    { name: 'In hand', empty: 'No ticket', cells: s.ticket ? [{ value: `(${s.ticket[0]}, ${s.ticket[1]})`, label: s.ticket[0] > (s.dist[s.ticket[1]] as number) ? 'stale' : 'fresh', tone: 'hot' }] : [] },
    { name: 'Roads (toll)', empty: 'No roads', cells: s.roads.map(([u, v, w]) => ({ value: `${u}→${v}`, label: `toll ${w}`, tone: s.ticket && s.ticket[1] === u ? 'hot' : undefined })) },
  ];
}
function dijkstraDescribe(s: GraphState) {
  if (s.done) return `Done. Fares: ${s.dist.map(fare).join(', ')}.`;
  const hold = s.ticket ? ` · holding (${s.ticket[0]}, town ${s.ticket[1]}); board says ${fare(s.dist[s.ticket[1]])}` : '';
  return `Source town ${s.src} · ${s.heap.length} ticket(s) in the rack${hold}.`;
}

export const lab = makeLab<GraphState>({
  kahn: {
    name: 'Kahn’s platform: order the stations',
    cases: kahnCases.length,
    actions: [
      { action: 'seed', label: 'Seed the platform with every in-degree-0 station' },
      { action: 'pop', label: 'Pop the next station into the timetable' },
      { action: 'cut', label: 'Cut its outgoing tracks (decrement neighbours)' },
      { action: 'force', label: 'Build the stalled station with the fewest unmet prerequisites' },
      { action: 'cycle', label: 'Platform empty, stations left: declare a cycle' },
      { action: 'finish', label: 'Every station is in the timetable' },
    ],
    create: v => fromInput({ mode: 'kahn', ...kahnCases[v] }),
    expected: kahnExpected,
    apply: kahnApply,
    reject: kahnReject,
    view: kahnView,
    describe: kahnDescribe,
  },
  uf: {
    name: 'The clan register: union-find',
    cases: ufCases.length,
    actions: [
      { action: 'find', label: 'find both ends’ clan heads (compress the paths)' },
      { action: 'union', label: 'Different heads: hang the smaller clan under the larger' },
      { action: 'loop', label: 'Same head: flag this track as closing a loop' },
      { action: 'link', label: 'Write parent[b] = a directly' },
      { action: 'finish', label: 'No tracks left: report the clans' },
    ],
    create: v => fromInput({ mode: 'uf', ...ufCases[v] }),
    expected: ufExpected,
    apply: ufApply,
    reject: ufReject,
    view: ufView,
    describe: ufDescribe,
  },
  dijkstra: {
    name: 'The ticket rack: Dijkstra',
    cases: dijkstraCases.length,
    actions: [
      { action: 'pop', label: 'Pop the cheapest ticket' },
      { action: 'relax', label: 'Fresh: settle the town and relax its roads' },
      { action: 'skip', label: 'Stale: the board already knows better, discard it' },
      { action: 'finish', label: 'Rack empty: report the board' },
    ],
    create: v => fromInput({ mode: 'dijkstra', ...dijkstraCases[v] }),
    expected: dijkstraExpected,
    apply: dijkstraApply,
    reject: dijkstraReject,
    view: dijkstraView,
    describe: dijkstraDescribe,
  },
}, 'Gold = active · green = settled or built · dashed = cut, stale or unreached · faded = stuck, or a loop track');
