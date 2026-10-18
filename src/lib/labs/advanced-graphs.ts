// Advanced Graphs playground: run Kahn's algorithm by hand (seed, pop, cut edges, declare a cycle),
// keep a union-find union-find structure (find roots, merge or flag the loop edge), and work Dijkstra's entry
// heap (pop the cheapest, skip stale entries, relax edges).
import { makeLab, type LabBase, type LabRow } from '../lab.ts';

export interface GraphState extends LabBase {
  n: number;
  // Kahn's queue
  edges: [number, number][];         // directed edges u -> v (u must come before v)
  indeg: number[];                   // edges into each node not yet cut
  ready: number[];                   // the queue, first in first out
  order: number[];                   // the timetable so far
  seeded: boolean;
  holding: number | null;            // popped node whose edges are not cut yet
  verdict: '' | 'order' | 'cycle';
  // the group union-find structure
  links: [number, number][];         // undirected edges, in arrival order
  parent: number[];
  size: number[];
  li: number;                        // index of the next edge
  roots: [number, number] | null;    // roots found for the current edge
  closers: [number, number][];       // edges that closed a loop
  sets: number;
  // the heap
  roads: [number, number, number][]; // one-way edges u -> v with weight w
  src: number;
  dist: (number | null)[];           // null = ∞ (not reached yet)
  heap: [number, number][];          // [distance, node], kept cheapest first (ties: lower node first)
  ticket: [number, number] | null;   // the entry in hand
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
  { n: 3, edges: [[0, 1], [0, 2], [1, 2]] },                   // the last edge closes a loop
  { n: 4, edges: [] },
  { n: 6, edges: [[0, 1], [2, 3], [1, 3], [0, 2], [4, 5]] },
];
const dijkstraCases: { n: number; roads: [number, number, number][]; src: number }[] = [
  { n: 4, roads: [[1, 0, 1], [1, 2, 1], [2, 3, 1]], src: 1 },
  { n: 4, roads: [[0, 1, 4], [0, 2, 1], [2, 1, 2], [1, 3, 1], [2, 3, 5]], src: 0 },   // stale entries appear
  { n: 3, roads: [[0, 1, 5], [2, 0, 1]], src: 0 },             // node 2 is never reached
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

// ---------- Kahn's queue ----------
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
    if (action === 'seed') return 'Seed the queue.';
    const zeros = s.indeg.map((d, i) => (d === 0 ? i : -1)).filter(i => i >= 0);
    return zeros.length
      ? `Nothing is in the queue yet. Seed it first: node(s) ${list(zeros)} wait on nothing and can be built today.`
      : 'Nothing is in the queue yet. Seed it first — and notice what seeding finds: every node waits on something.';
  }
  if (action === 'seed') return 'The queue was seeded already. From now on a node joins only when its count drops to 0.';
  if (s.holding !== null) {
    const h = s.holding, targets = outOf(s, h);
    const tail = targets.length ? `its edges to ${list(targets)} still count against them` : 'it has no outgoing edges, so cutting them is quick';
    return `Node ${h} is in the timetable, but ${tail}. Cut its edges first${targets.length ? ', or those nodes can never become ready' : ''}.`;
  }
  if (s.ready.length) {
    if (action === 'cut') return `No node in hand. Pop the next one from the queue first: node ${s.ready[0]}.`;
    if (action === 'cycle') return `Node(s) ${list(s.ready)} are still in the queue. A cycle can be declared only when the queue is empty and nodes are left over.`;
    if (action === 'finish') return `${s.n - s.order.length} node(s) are not in the timetable yet, and ${list(s.ready)} can be built right now.`;
    return `Node ${s.ready[0]} is ready, with nothing left to wait for. Forcing a node that still waits would build it before one of its prerequisites.`;
  }
  const left = unplaced(s);
  if (left.length) {
    if (action === 'pop') return `The queue is empty. Every remaining node (${list(left)}) still waits on something.`;
    if (action === 'cut') return 'No node in hand, and none ready.';
    if (action === 'finish') return `Only ${s.order.length} of ${s.n} nodes are placed. The rest (${list(left)}) wait on each other: that is a cycle, not a finished timetable.`;
    const c = stalledCandidate(s)!;
    const preds = s.edges.filter(([u, v]) => v === c && !s.order.includes(u)).map(([u]) => u);
    return `Node ${c} still waits on ${s.indeg[c]} unbuilt node(s) (${list(preds)}). Building it now would put it before its own prerequisite. The rules form a cycle: declare it.`;
  }
  if (action === 'cycle') return `All ${s.n} nodes are placed and every edge points forward. There is no cycle.`;
  if (action === 'force') return `Nothing is stalled: all ${s.n} nodes are placed.`;
  return 'Every node is placed. Close the timetable.';
}
function kahnApply(s: GraphState, action: string) {
  if (action === 'seed') {
    s.seeded = true;
    s.ready = s.indeg.map((d, i) => (d === 0 ? i : -1)).filter(i => i >= 0);
    s.message = s.ready.length ? `Node(s) ${list(s.ready)} wait on nothing: in the queue they go.` : 'No node has in-degree 0. The queue starts empty.';
  } else if (action === 'pop') {
    const c = s.ready.shift()!;
    s.holding = c;
    s.order.push(c);
    s.message = `Node ${c} is built: slot ${s.order.length} of the timetable. Every node it waited for was built earlier.`;
  } else if (action === 'cut') {
    const c = s.holding!, freed: number[] = [], lowered: string[] = [];
    for (const v of outOf(s, c)) {
      s.indeg[v]--;
      lowered.push(`${v} → ${s.indeg[v]}`);
      if (s.indeg[v] === 0) { s.ready.push(v); freed.push(v); }
    }
    s.holding = null;
    s.message = lowered.length
      ? `Cut the edges out of ${c}: ${lowered.join(', ')}.` + (freed.length ? ` Node(s) ${list(freed)} reached 0 and join the queue.` : ' Nobody reached 0 yet.')
      : `Node ${c} has no outgoing edges. Nothing waited on it.`;
  } else if (action === 'cycle') {
    s.done = true;
    s.verdict = 'cycle';
    s.message = `Cycle. ${s.order.length} of ${s.n} placed; node(s) ${list(unplaced(s))} sit on a cycle or behind one. Course Schedule returns false; Course Schedule II returns an empty array.`;
  } else {
    s.done = true;
    s.verdict = 'order';
    s.message = s.n ? `Timetable: ${s.order.join(' → ')}. Every edge points forward.` : 'No nodes, nothing to order.';
  }
}
function kahnView(s: GraphState): LabRow[] {
  return [
    {
      name: 'Nodes (edges still to wait for)', empty: 'No nodes',
      cells: Array.from({ length: s.n }, (_, i) => ({
        value: String(i), label: s.order.includes(i) ? 'built' : `in ${s.indeg[i]}`,
        tone: s.holding === i || s.ready.includes(i) ? 'hot' : s.order.includes(i) ? 'done' : s.verdict === 'cycle' ? 'out' : undefined,
      })),
    },
    { name: 'queue', empty: s.seeded ? 'Queue empty' : 'Not seeded yet', cells: s.ready.map((v, i) => ({ value: String(v), label: i === 0 ? 'next' : undefined, tone: 'hot' })) },
    { name: 'Timetable (pop order)', empty: 'Nothing built yet', join: '→', cells: s.order.map(v => ({ value: String(v), tone: s.holding === v ? 'hot' : 'done' })) },
    {
      name: 'Edges', empty: 'No edges',
      cells: s.edges.map(([u, v]) => {
        const cut = s.order.includes(u) && s.holding !== u;
        return { value: `${u}→${v}`, label: cut ? 'cut' : undefined, tone: cut ? 'ghost' : s.holding === u ? 'hot' : undefined };
      }),
    },
  ];
}
function kahnDescribe(s: GraphState) {
  if (s.done) return s.verdict === 'cycle' ? `Stopped: ${s.order.length} of ${s.n} placed, the rest are stuck.` : `Done: ${s.order.join(' → ') || 'empty'}.`;
  return `${s.n} node(s) · ${s.order.length} built · queue: ${s.ready.length ? list(s.ready) : 'empty'}${s.holding !== null ? ` · holding ${s.holding}, edges not cut yet` : ''}${s.seeded ? '' : ' · not seeded'}`;
}

// ---------- the group union-find structure ----------
function rootOf(parent: number[], x: number) { while (parent[x] !== x) x = parent[x]; return x; }
function pathOf(parent: number[], x: number) { const path = [x]; while (parent[x] !== x) { x = parent[x]; path.push(x); } return path; }
function ufExpected(s: GraphState) {
  if (s.li >= s.links.length) return 'finish';
  if (!s.roots) return 'find';
  return s.roots[0] === s.roots[1] ? 'loop' : 'union';
}
function ufReject(s: GraphState, action: string) {
  if (s.li >= s.links.length) return `All ${s.links.length} edge(s) are processed. Report ${s.sets} separate component(s).`;
  const [a, b] = s.links[s.li];
  if (!s.roots) {
    if (action === 'finish') return `${s.links.length - s.li} edge(s) remain, starting with ${a}–${b}.`;
    if (action === 'link') {
      if (s.parent[b] !== b) return `Node ${b} hangs under ${s.parent[b]} (root ${rootOf(s.parent, b)}). Writing parent[${b}] = ${a} would tear ${b} out of that group, and the union-find structure would forget it ever joined.`;
      return `Find both roots first. You need them to know whether ${a}–${b} closes a loop, and to hang the smaller group under the larger.`;
    }
    return `You don't know the roots yet. find(${a}) and find(${b}) first: roots, not members, decide whether this edge merges or loops.`;
  }
  const [ra, rb] = s.roots;
  if (action === 'find') return `Roots already found: find(${a}) = ${ra}, find(${b}) = ${rb}. Decide.`;
  if (action === 'finish') return `${s.links.length - s.li} edge(s) remain, starting with ${a}–${b}.`;
  if (ra === rb) {
    if (action === 'union') return `Both ends report root ${ra}: ${a} and ${b} are already connected. Merging a group with itself changes nothing — this edge closes a loop. Flag it.`;
    return `Both ends already share root ${ra}. There is nothing to link; this edge closes a loop.`;
  }
  if (action === 'loop') return `Roots ${ra} and ${rb} differ: ${a} and ${b} are in different groups, so this edge joins them. It cannot close a loop.`;
  const big = s.size[ra] >= s.size[rb] ? ra : rb, small = big === ra ? rb : ra;
  return `Link roots, not members: parent[${small}] = ${big} (group sizes ${s.size[small]} and ${s.size[big]}). Re-pointing node ${b} itself could tear it out of its group.`;
}
function ufApply(s: GraphState, action: string) {
  if (action === 'find') {
    const [a, b] = s.links[s.li];
    const pa = pathOf(s.parent, a), pb = pathOf(s.parent, b);
    const ra = pa[pa.length - 1], rb = pb[pb.length - 1];
    for (const x of pa) s.parent[x] = ra;            // path compression
    for (const x of pb) s.parent[x] = rb;
    s.roots = [ra, rb];
    const walk = (p: number[]) => (p.length > 1 ? p.join(' → ') : `${p[0]} (a root)`);
    const squashed = pa.length > 2 || pb.length > 2;
    s.message = `find(${a}): ${walk(pa)}. find(${b}): ${walk(pb)}.` + (squashed ? ' Every node on those walks now points straight at its root.' : '') + (ra === rb ? ' Same root.' : ' Different roots.');
  } else if (action === 'union') {
    let [ra, rb] = s.roots!;
    if (s.size[ra] < s.size[rb]) [ra, rb] = [rb, ra];
    s.parent[rb] = ra;
    s.size[ra] += s.size[rb];
    s.sets--;
    s.li++;
    s.roots = null;
    s.message = `parent[${rb}] = ${ra}: group ${rb} joins group ${ra} (size now ${s.size[ra]}). ${s.sets} group(s) remain.`;
  } else if (action === 'loop') {
    const t = s.links[s.li];
    s.closers.push([t[0], t[1]]);
    s.li++;
    s.roots = null;
    s.message = `Edge ${t[0]}–${t[1]} closes a loop: its ends were already connected. In Redundant Connection, the first such edge is the answer; in Graph Valid Tree, it means false.`;
  } else {
    s.done = true;
    s.message = `${s.sets} separate component(s)` + (s.closers.length ? `; loop edge(s): ${s.closers.map(([a, b]) => `${a}–${b}`).join(', ')}.` : '; no edge closed a loop.');
  }
}
function ufView(s: GraphState): LabRow[] {
  const cur = s.li < s.links.length ? s.links[s.li] : null;
  return [
    {
      name: 'Node (points to)', empty: 'No nodes',
      cells: s.parent.map((p, i) => ({
        value: String(i), label: p === i ? `root ×${s.size[i]}` : `→ ${p}`,
        tone: s.roots && s.roots.includes(i) ? 'hot' : cur && cur.includes(i) ? 'hot' : p === i ? 'done' : undefined,
      })),
    },
    {
      name: 'Edges in order', empty: 'No edges',
      cells: s.links.map(([a, b], i) => ({
        value: `${a}–${b}`, label: i === s.li ? 'now' : s.closers.some(([x, y]) => x === a && y === b) && i < s.li ? 'loop' : undefined,
        tone: i === s.li ? 'hot' : i < s.li ? (s.closers.some(([x, y]) => x === a && y === b) ? 'out' : 'done') : undefined,
      })),
    },
    { name: 'Loop edges', empty: 'None yet', cells: s.closers.map(([a, b]) => ({ value: `${a}–${b}`, tone: 'out' })) },
  ];
}
function ufDescribe(s: GraphState) {
  if (s.li >= s.links.length) return s.done ? `Done: ${s.sets} component(s).` : `All edges processed · ${s.sets} group(s).`;
  const [a, b] = s.links[s.li];
  return `Edge ${s.li + 1} of ${s.links.length}: ${a}–${b}${s.roots ? ` · roots ${s.roots[0]} and ${s.roots[1]}` : ''} · ${s.sets} group(s) so far.`;
}

// ---------- the heap ----------
function sortRack(heap: [number, number][]) { heap.sort((x, y) => x[0] - y[0] || x[1] - y[1]); }
function dijkstraExpected(s: GraphState) {
  if (!s.ticket) return s.heap.length ? 'pop' : 'finish';
  return s.ticket[0] > (s.dist[s.ticket[1]] as number) ? 'skip' : 'relax';
}
const roadsOut = (s: GraphState, u: number) => s.roads.filter(([a]) => a === u);
function dijkstraReject(s: GraphState, action: string) {
  if (!s.ticket) {
    if (!s.heap.length) return 'The heap is empty: every reachable node is settled. Report the distance table.';
    const [f, t] = s.heap[0];
    if (action === 'finish') return `The heap still holds ${s.heap.length} entry(s). Each must be popped and relaxed or skipped before the distance table is final; the cheapest is (${f}, node ${t}).`;
    return `No entry in hand. Pop the cheapest first: (${f}, node ${t}).`;
  }
  const [f, t] = s.ticket, d = s.dist[t] as number;
  if (action === 'pop' || action === 'finish') return `You are holding (${f}, node ${t}). Decide first: relax its edges or skip it.`;
  if (action === 'relax') return `This entry says ${f}, but dist[${t}] is already ${d} from a cheaper entry popped earlier. Relaxing from ${f} could only offer distances ${f - d} higher than ones already offered. Skip it.`;
  const out = roadsOut(s, t);
  return out.length
    ? `${f} equals dist[${t}]: this is node ${t}'s cheapest entry, so its distance is final. Skipping it would leave ${out.map(([, v, w]) => `${t}→${v} (${w})`).join(', ')} unexplored.`
    : `${f} equals dist[${t}]: this entry is fresh, so node ${t}'s distance is final. Relax it — node ${t} has no edges out, but settling it is the step that proves its distance.`;
}
function dijkstraApply(s: GraphState, action: string) {
  if (action === 'pop') {
    s.ticket = s.heap.shift()!;
    const [f, t] = s.ticket;
    s.message = `Popped (${f}, node ${t}). The table says dist[${t}] = ${fare(s.dist[t])}.`;
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
    s.message = `Node ${t} settled at ${f}. ` + (changes.length ? `Relaxed: ${changes.join(', ')}; new entries in the heap.` : roadsOut(s, t).length ? 'No edge out of it improves anything.' : 'No edges leave it.');
  } else if (action === 'skip') {
    const [f, t] = s.ticket!;
    s.ticket = null;
    s.message = `Discarded the stale entry (${f}, node ${t}): node ${t} was settled at ${fare(s.dist[t])}.`;
  } else {
    s.done = true;
    const unreached = s.dist.some(x => x === null);
    const last = Math.max(...s.dist.map(x => (x === null ? 0 : x)));
    s.message = `Final distances: ${s.dist.map(fare).join(', ')}. ` + (unreached ? 'Some node is never reached: Network Delay Time returns −1.' : `The last node hears at ${last}.`);
  }
}
function dijkstraView(s: GraphState): LabRow[] {
  return [
    {
      name: 'Node (distance on the distance table)', empty: 'No nodes',
      cells: s.dist.map((d, i) => ({ value: String(i), label: `${s.settled[i] ? 'final ' : ''}${fare(d)}`, tone: s.ticket && s.ticket[1] === i ? 'hot' : s.settled[i] ? 'done' : d === null ? 'ghost' : undefined })),
    },
    { name: 'Heap (cheapest first)', empty: 'Heap empty', cells: s.heap.map(([f, t], i) => ({ value: `(${f}, ${t})`, label: i === 0 ? 'next' : undefined, tone: f > (s.dist[t] as number) ? 'ghost' : undefined })) },
    { name: 'In hand', empty: 'No entry', cells: s.ticket ? [{ value: `(${s.ticket[0]}, ${s.ticket[1]})`, label: s.ticket[0] > (s.dist[s.ticket[1]] as number) ? 'stale' : 'fresh', tone: 'hot' }] : [] },
    { name: 'Edges (weight)', empty: 'No edges', cells: s.roads.map(([u, v, w]) => ({ value: `${u}→${v}`, label: `weight ${w}`, tone: s.ticket && s.ticket[1] === u ? 'hot' : undefined })) },
  ];
}
function dijkstraDescribe(s: GraphState) {
  if (s.done) return `Done. Distances: ${s.dist.map(fare).join(', ')}.`;
  const hold = s.ticket ? ` · holding (${s.ticket[0]}, node ${s.ticket[1]}); table says ${fare(s.dist[s.ticket[1]])}` : '';
  return `Source node ${s.src} · ${s.heap.length} entry(s) in the heap${hold}.`;
}

export const lab = makeLab<GraphState>({
  kahn: {
    name: 'Kahn’s queue: order the nodes',
    cases: kahnCases.length,
    actions: [
      { action: 'seed', label: 'Seed the queue with every in-degree-0 node' },
      { action: 'pop', label: 'Pop the next node into the timetable' },
      { action: 'cut', label: 'Cut its outgoing edges (decrement neighbours)' },
      { action: 'force', label: 'Build the stalled node with the fewest unmet prerequisites' },
      { action: 'cycle', label: 'Queue empty, nodes left: declare a cycle' },
      { action: 'finish', label: 'Every node is in the timetable' },
    ],
    create: v => fromInput({ mode: 'kahn', ...kahnCases[v] }),
    expected: kahnExpected,
    apply: kahnApply,
    reject: kahnReject,
    view: kahnView,
    describe: kahnDescribe,
  },
  uf: {
    name: 'The group union-find structure: union-find',
    cases: ufCases.length,
    actions: [
      { action: 'find', label: 'find both ends’ roots (compress the paths)' },
      { action: 'union', label: 'Different roots: hang the smaller group under the larger' },
      { action: 'loop', label: 'Same root: flag this edge as closing a loop' },
      { action: 'link', label: 'Write parent[b] = a directly' },
      { action: 'finish', label: 'No edges left: report the groups' },
    ],
    create: v => fromInput({ mode: 'uf', ...ufCases[v] }),
    expected: ufExpected,
    apply: ufApply,
    reject: ufReject,
    view: ufView,
    describe: ufDescribe,
  },
  dijkstra: {
    name: 'The heap: Dijkstra',
    cases: dijkstraCases.length,
    actions: [
      { action: 'pop', label: 'Pop the cheapest entry' },
      { action: 'relax', label: 'Fresh: settle the node and relax its edges' },
      { action: 'skip', label: 'Stale: the distance table already knows better, discard it' },
      { action: 'finish', label: 'Heap empty: report the distance table' },
    ],
    create: v => fromInput({ mode: 'dijkstra', ...dijkstraCases[v] }),
    expected: dijkstraExpected,
    apply: dijkstraApply,
    reject: dijkstraReject,
    view: dijkstraView,
    describe: dijkstraDescribe,
  },
}, 'Gold = active · green = settled or built · dashed = cut, stale or unreached · faded = stuck, or a loop edge');
