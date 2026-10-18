// Dry-run frames for every problem in src/dsa-lessons/advanced-graphs.mdx. Each generator replays the lesson's algorithm on a
// small input and ends with a text view holding `answer` (checked against brute force in tests/advanced-graphs-frames.test.ts).
// Graph generators take optional fixed node positions (a 320 by 220 box) so nodes never jump between frames.
import { recorder, tvars } from '../../lib/dryrun.ts';
import type { CellTone, EdgeTone, Frame, GraphView, NodeTone, Predict, Val, View } from '../../lib/dryrun.ts';

const J = JSON.stringify;
const range = (n: number) => Array.from({ length: n }, (_, i) => i);
const fmt = (x: number): Val => (x === Infinity ? '∞' : x);
const ask = (question: string, options: string[], answer: number, explain: string): Predict => ({ question, options, answer, explain });
const uniq = (xs: string[]) => [...new Set(xs)];
type Rec = ReturnType<typeof recorder>;
export type Pos = Record<number, [number, number]>;

interface GOpts { name?: string; directed?: boolean; pos?: Pos; labels?: string[]; tones?: Record<number, NodeTone>; edgeTones?: Record<number, EdgeTone>; weighted?: boolean }
// edges are [a, b] or [a, b, weight]; edgeTones is keyed by the edge's index in the list.
function gview(n: number, edges: number[][], o: GOpts = {}): GraphView {
  return {
    kind: 'graph', name: o.name ?? 'graph', directed: !!o.directed,
    nodes: range(n).map(i => ({ id: String(i), ...(o.labels ? { label: o.labels[i] } : {}), ...(o.pos ? { x: o.pos[i][0], y: o.pos[i][1] } : {}) })),
    edges: edges.map((e, k) => ({ from: String(e[0]), to: String(e[1]), ...(o.weighted ? { weight: e[2] } : {}), ...(o.edgeTones?.[k] ? { tone: o.edgeTones[k] } : {}) })),
    tones: Object.fromEntries(Object.entries(o.tones ?? {}).map(([k, v]) => [k, v])),
  };
}

// ---- union-find forest drawing ----------------------------------------------------------------
function forestPos(parent: number[]): Pos {
  const n = parent.length, kids: number[][] = range(n).map(() => []);
  parent.forEach((p, i) => { if (p !== i) kids[p].push(i); });
  const roots = range(n).filter(i => parent[i] === i);
  const height = (i: number): number => (kids[i].length ? 1 + Math.max(...kids[i].map(height)) : 0);
  const maxH = Math.max(0, ...roots.map(height));
  const leaves = range(n).filter(i => !kids[i].length).length;
  const gap = leaves > 1 ? 272 / (leaves - 1) : 0, step = Math.min(56, 170 / Math.max(1, maxH));
  let next = 0;
  const pos: Pos = {};
  const place = (i: number, depth: number): number => {
    const x = kids[i].length ? kids[i].map(k => place(k, depth + 1)).reduce((a, b) => a + b, 0) / kids[i].length : leaves > 1 ? 24 + next++ * gap : 160;
    pos[i] = [x, 24 + depth * step];
    return x;
  };
  roots.forEach(rt => place(rt, 0));
  return pos;
}
// Arrows point from a node to its parent; roots are green. weight(i) labels the arrow of node i.
function forestView(parent: number[], o: { labels?: string[]; tones?: Record<number, NodeTone>; edgeTones?: Record<number, EdgeTone>; weight?: (i: number) => Val; name?: string } = {}): GraphView {
  const pos = forestPos(parent), tones: Record<string, NodeTone> = {};
  parent.forEach((p, i) => { if (p === i) tones[i] = 'done'; });
  for (const [k, v] of Object.entries(o.tones ?? {})) tones[k] = v;
  return {
    kind: 'graph', name: o.name ?? 'forest (arrow = parent; green = root)', directed: true,
    nodes: parent.map((_, i) => ({ id: String(i), ...(o.labels ? { label: o.labels[i] } : {}), x: pos[i][0], y: pos[i][1] })),
    edges: parent.flatMap((p, i) => (p === i ? [] : [{ from: String(i), to: String(p), ...(o.weight ? { weight: o.weight(i) } : {}), ...(o.edgeTones?.[i] ? { tone: o.edgeTones[i] } : {}) }])),
    tones,
  };
}

// ---- Kahn's algorithm (Course Schedule I and II, Alien Dictionary, Safe States, Parallel Courses III) ----------
// Edge [a, b] means "a is released before b": popping a lowers b's count. `draw` is the picture's orientation.
interface KahnOpts { labels?: string[]; pos?: Pos; minFirst?: boolean; draw?: number[][]; time?: number[]; kind?: 'order' | 'safe'; name?: string }
function kahnInto(r: Rec, n: number, edges: number[][], o: KahnOpts = {}) {
  const L = (i: number) => o.labels?.[i] ?? String(i), safe = o.kind === 'safe', draw = o.draw ?? edges;
  const out = range(n).map(u => edges.flatMap((e, k) => (e[0] === u ? [{ v: e[1], k }] : [])));
  const deg: number[] = Array(n).fill(0), start: number[] = Array(n).fill(0);
  edges.forEach(e => deg[e[1]]++);
  const queue: number[] = [], order: number[] = [], popped = new Set<number>(), used: Record<number, EdgeTone> = {};
  let best = 0;
  const views = (cur?: number, changedQ: number[] = [], removed: number[] = [], dec: number[] = [], zero: number[] = [], active: number[] = []): View[] => {
    const tones: Record<number, NodeTone> = {};
    popped.forEach(p => (tones[p] = 'done'));
    queue.forEach(q => (tones[q] = 'queued'));
    if (cur !== undefined) tones[cur] = 'current';
    const et = { ...used }; active.forEach(k => (et[k] = 'active'));
    const changed = range(n).filter(i => dec.includes(i) || zero.includes(i));
    const vs: View[] = [
      gview(n, draw, { name: o.name, directed: true, pos: o.pos, labels: o.labels, tones, edgeTones: et }),
      { kind: 'map', name: safe ? 'unproven exits per node' : 'in-degree (prerequisites not yet taken)', entries: range(n).map(i => [L(i), deg[i]] as [Val, Val]), changed },
      { kind: 'queue', name: o.minFirst ? 'ready (smallest first)' : 'queue (front on the left)', items: queue.map(L), changed: changedQ, removed: removed.map(L), note: queue.length ? undefined : 'empty' },
    ];
    if (o.time) vs.push({ kind: 'map', name: 'start time (latest prerequisite finish) and duration', entries: range(n).map(i => [L(i), `start ${start[i]}, takes ${o.time![i]}`] as [Val, Val]) });
    vs.push(tvars({ [safe ? 'safe' : 'order']: (safe ? [...order].sort((a, b) => a - b) : order).map(L).join(safe ? ', ' : ' → ') || '(none yet)' }));
    return vs;
  };
  r.frame(safe
    ? `Safety is about what comes after a node, so we run Kahn's algorithm backwards: the map counts each node's exits that are not yet proven safe. A node with no exits (a dead end) is safe already.`
    : `Draw an arrow from each prerequisite to the course that needs it. The map counts the arrows running into each node: its in-degree, the prerequisites still untaken.${o.time ? ' Each node also has a duration.' : ''}`, views());
  deg.forEach((d, i) => { if (d === 0) queue.push(i); });
  r.frame(`Seed the queue with every node whose count is 0: ${queue.map(L).join(', ') || 'none'}. ${queue.length ? 'They wait for nothing, so they can go first.' : 'Nothing is ready, so no order can even start.'}`, views(undefined, queue.map((_, i) => i)));
  while (queue.length) {
    if (o.minFirst) queue.sort((a, b) => a - b);
    const listed = [...queue].sort((a, b) => a - b), u = queue.shift()!;
    order.push(u); popped.add(u);
    const fin = start[u] + (o.time?.[u] ?? 0);
    if (o.time) best = Math.max(best, fin);
    r.frame(safe ? `Pop ${L(u)}: all of its exits are proven safe, so ${L(u)} is safe.`
      : o.time ? `Pop ${L(u)}. Every prerequisite has already reported, so it starts at ${start[u]} and finishes at ${start[u]} + ${o.time[u]} = ${fin}.`
        : `Pop ${L(u)} from the queue and append it to the order. Its count is 0, so everything it waits for is already in the order.`,
      views(u, [], [u]),
      listed.length > 1 ? ask(`The queue holds ${listed.map(L).join(', ')} (listed in numeric order here). Which node is popped next?`, listed.map(L), listed.indexOf(u),
        o.minFirst ? 'The smallest ready node goes first. That tie-break is what makes the answer one fixed string.' : 'A queue is first in, first out: the node that has waited longest is at the front.') : undefined);
    const dec: number[] = [], zero: number[] = [], act: number[] = [], before = queue.length;
    for (const { v, k } of out[u]) {
      deg[v]--; dec.push(v); act.push(k);
      if (o.time) start[v] = Math.max(start[v], fin);
      if (deg[v] === 0) zero.push(v);
    }
    zero.forEach(v => queue.push(v));
    act.forEach(k => (used[k] = 'used'));
    const freed = zero.map(L).join(', ') || 'none', all = uniq(dec.map(L)).join(', ');
    const opts = uniq([freed, 'none', all]);
    r.frame(out[u].length === 0 ? `${L(u)} has no outgoing arrows, so no count changes.`
      : safe ? `Every node that has ${L(u)} as an exit loses one unproven exit: ${all}. ${zero.length ? `${freed} reached 0, so every exit of them is safe and they join the queue.` : 'None reached 0 yet.'}`
        : `Cut the arrows out of ${L(u)}: ${all} each lose one waiting prerequisite${o.time ? ` and note the finish time ${fin}` : ''}. ${zero.length ? `${freed} reached 0 and join the queue.` : 'None reached 0.'}`,
      views(undefined, zero.map((_, i) => before + i), [], dec, zero, act),
      out[u].length && opts.length > 1 ? ask(`Popping ${L(u)} lowers the counts of ${all}. Which of them reach 0 and join the queue?`, opts, opts.indexOf(freed),
        zero.length ? 'A node joins only when its last waiting prerequisite is cut. Any node whose count is still above 0 waits for something else.' : 'Every neighbour still waits on something else, so none reaches 0 yet.') : undefined);
  }
  return { order, best, views };
}

export function kahnFrames(n: number, edges: number[][], o: KahnOpts = {}): Frame[] {
  const r = recorder(), { order, views } = kahnInto(r, n, edges, o), ok = order.length === n;
  r.frame(ok ? `The queue is empty and all ${n} nodes are in the order, so every arrow points forward in it. A valid order exists.`
    : `The queue is empty but ${n - order.length} node(s) are left. Each of them waits for something that never gets released, so they sit on a cycle or behind one. No valid order exists.`,
    [...views().slice(0, 3), tvars({ taken: order.length, canFinish: String(ok), answer: ok ? J(order) : '[]' })]);
  return r.frames;
}

// Safe states: answer = JSON array of safe nodes, ascending.
export function safeFrames(graph: number[][], pos?: Pos): Frame[] {
  const n = graph.length, edges = graph.flatMap((vs, u) => vs.map(v => [u, v])), r = recorder();
  const { order, views } = kahnInto(r, n, edges.map(([u, v]) => [v, u]), { draw: edges, kind: 'safe', pos });
  const safe = [...order].sort((a, b) => a - b);
  r.frame(`The queue is empty. The ${safe.length} popped node(s) are safe. The rest can reach a cycle, so some journey from them never ends.`, [...views().slice(0, 3), tvars({ answer: J(safe) })]);
  return r.frames;
}

// Parallel Courses III: relations are [prev, next] (0-indexed). answer = months until everything is done.
export function parallelFrames(n: number, relations: number[][], time: number[], pos?: Pos): Frame[] {
  const r = recorder(), { best, views } = kahnInto(r, n, relations, { time, pos });
  r.frame(`The queue is empty. The latest finish time is ${best}: a course starts when its slowest prerequisite finishes, so this is the longest path through the graph.`, [...views().slice(0, 3), tvars({ answer: best })]);
  return r.frames;
}

// Alien Dictionary: answer = JSON string ("" when no order exists). Ready letters are taken smallest first.
export function alienFrames(words: string[]): Frame[] {
  const r = recorder(), letters = [...new Set(words.join(''))].sort(), idx = new Map(letters.map((c, i) => [c, i]));
  const rules: [string, string][] = [];
  const wordsView = (at?: number): View => ({ kind: 'array', name: 'words', values: [...words], indices: false, ...(at === undefined ? {} : { regions: [{ from: at, to: at + 1, label: 'pair', tone: 'gold' as const }] }) });
  const ruleView = (): View => ({ kind: 'set', name: 'rules found (x → y: x comes first)', items: rules.map(([a, b]) => `${a} → ${b}`) });
  r.frame(`The words are sorted by an unknown alphabet. Every letter that appears (${letters.join(', ')}) becomes a node. Each neighbouring pair of words will give at most one rule.`, [wordsView(), ruleView()]);
  for (let i = 0; i + 1 < words.length; i++) {
    const a = words[i], b = words[i + 1], len = Math.min(a.length, b.length);
    let j = 0;
    while (j < len && a[j] === b[j]) j++;
    const pair = (tone: CellTone): View[] => [wordsView(i), { kind: 'array', name: a, values: [...a], indices: false, ...(j < len ? { tones: { [j]: tone } } : {}) }, { kind: 'array', name: b, values: [...b], indices: false, ...(j < len ? { tones: { [j]: tone } } : {}) }];
    if (j === len) {
      if (a.length > b.length) {
        r.frame(`"${a}" comes before "${b}", but "${b}" is a prefix of "${a}". In every alphabet a prefix sorts before the longer word, so no alphabet fits. Return the empty string.`,
          [...pair('out'), ruleView(), tvars({ answer: J('') })],
          ask(`"${a}" is listed before "${b}", and "${b}" is its prefix. What do you return?`, ['No rule: skip this pair', 'The empty string: no alphabet can do this'], 1, 'A prefix always sorts first, so this list contradicts every possible alphabet.'));
        return r.frames;
      }
      r.frame(`"${a}" and "${b}" never differ${a === b ? ' (identical)' : ': the first is a prefix of the second, which is allowed'}. This pair gives no rule.`, [...pair('compared'), ruleView()]);
      continue;
    }
    const known = rules.some(([x, y]) => x === a[j] && y === b[j]);
    if (!known) rules.push([a[j], b[j]]);
    r.frame(`"${a}" and "${b}" first differ at position ${j}: ${a[j]} versus ${b[j]}. So ${a[j]} comes before ${b[j]}${known ? ' (already known)' : ''}. Nothing after the first difference matters.`,
      [...pair('compared'), ruleView()],
      ask(`The first difference between "${a}" and "${b}" is ${a[j]} versus ${b[j]}. What does that prove?`, [`${a[j]} comes before ${b[j]}`, `${b[j]} comes before ${a[j]}`, 'Nothing: they must match first'], 0, 'The dictionary decided this pair at its first difference. The earlier word has the earlier letter there.'));
  }
  const edges = rules.map(([a, b]) => [idx.get(a)!, idx.get(b)!]);
  const { order, views } = kahnInto(r, letters.length, edges, { labels: letters, minFirst: true });
  const ok = order.length === letters.length, text = order.map(i => letters[i]).join('');
  r.frame(ok ? `Every letter was popped, so the alphabet is "${text}".` : `Only ${order.length} of ${letters.length} letters were popped: the rules contradict each other (a cycle). Return the empty string.`,
    [...views().slice(0, 3), tvars({ answer: J(ok ? text : '') })]);
  return r.frames;
}

// ---- Depth-first cycle detection with three colours -------------------------------------------------------------
// answer = "true" when the directed graph has a cycle.
export function colourFrames(n: number, edges: number[][], pos?: Pos): Frame[] {
  const r = recorder(), adj = range(n).map(u => edges.flatMap((e, k) => (e[0] === u ? [{ v: e[1], k }] : [])));
  const colour: ('white' | 'grey' | 'black')[] = Array(n).fill('white'), stack: number[] = [], used: Record<number, EdgeTone> = {};
  const views = (changed: number[] = [], active?: number, removed: number[] = []): View[] => {
    const tones: Record<number, NodeTone> = {};
    range(n).forEach(i => { if (colour[i] === 'black') tones[i] = 'done'; if (colour[i] === 'grey') tones[i] = 'visited'; });
    if (stack.length) tones[stack[stack.length - 1]] = 'current';
    return [
      gview(n, edges, { directed: true, pos, tones, edgeTones: { ...used, ...(active === undefined ? {} : { [active]: 'active' as const }) } }),
      { kind: 'map', name: 'colour (white = unseen, grey = on the path, black = finished)', entries: range(n).map(i => [i, colour[i]] as [Val, Val]), changed },
      { kind: 'stack', name: 'current path (top = where we are)', items: [...stack], removed },
    ];
  };
  r.frame('Every node starts white. A node turns grey when the walk enters it and black when everything after it has been explored. Following an arrow into a grey node closes a cycle.', views());
  const visit = (u: number, via?: number): boolean => {
    colour[u] = 'grey'; stack.push(u);
    r.frame(`${via === undefined ? 'Start a walk at' : 'Follow the arrow to'} ${u}. It turns grey: it is on the path we are walking now.`, views([u], via));
    if (via !== undefined) used[via] = 'used';
    for (const { v, k } of adj[u]) {
      if (colour[v] === 'white') { if (visit(v, k)) return true; continue; }
      const grey = colour[v] === 'grey';
      r.frame(grey ? `The arrow ${u} → ${v} points at ${v}, which is grey: it is on our own path. We can walk from ${v} back to ${v}: a cycle.`
        : `The arrow ${u} → ${v} points at ${v}, which is black: ${v} was fully explored and leads to no cycle. Reaching it again is harmless (this is why one "visited" flag is not enough).`,
        views([], k), ask(`${u} → ${v}, and ${v} is ${colour[v]}. Is there a cycle?`, ['Yes: a cycle', 'No: harmless'], grey ? 0 : 1,
          grey ? 'Grey means still on the current path, so the arrow leads back onto it.' : 'Black means finished and cycle-free. Grey and black must be told apart.'));
      if (grey) { r.frame(`Cycle found. Return true.`, [...views().slice(0, 2), tvars({ answer: 'true' })]); return true; }
    }
    colour[u] = 'black'; stack.pop();
    r.frame(`Every arrow out of ${u} is handled, so ${u} turns black and leaves the path.`, views([u], undefined, [u]));
    return false;
  };
  for (let c = 0; c < n; c++) if (colour[c] === 'white' && visit(c)) return r.frames;
  r.frame('Every node ended black and no arrow ever pointed at a grey node: there is no cycle.', [...views().slice(0, 2), tvars({ answer: 'false' })]);
  return r.frames;
}

// ---- Union-find (Connected Components, Graph Valid Tree, Redundant Connection, Accounts Merge) ----------------
// mode 'count': answer = number of groups. 'tree': answer = "true" | "false". 'redundant': answer = the first edge whose
// union fails as a JSON pair, or "[]". Union by size, recursive-style path compression, exactly like the Java.
interface DsuOpts { mode?: 'count' | 'tree' | 'redundant'; labels?: string[] }
export function dsuFrames(n: number, edges: number[][], o: DsuOpts = {}): Frame[] {
  const mode = o.mode ?? 'count', L = (i: number) => o.labels?.[i] ?? String(i), r = recorder();
  const parent = range(n), size: number[] = Array(n).fill(1);
  let sets = n;
  const names = edges.map(([a, b]) => `${L(a)}–${L(b)}`), done = new Set<number>(), rejected = new Set<number>();
  const rootOf = (x: number) => { while (parent[x] !== x) x = parent[x]; return x; };
  const walk = (x: number) => { const p = [x]; while (parent[p[p.length - 1]] !== p[p.length - 1]) p.push(parent[p[p.length - 1]]); return p; };
  const views = (cur: number | null, path: number[] = [], swapped: number[] = [], pointers = true): View[] => {
    const tones: Record<number, NodeTone> = {};
    path.forEach(p => (tones[p] = 'visited'));
    const pt: Record<number, CellTone> = {}, st: Record<number, CellTone> = {};
    swapped.forEach(i => (pt[i] = 'swapped'));
    range(n).forEach(i => { if (parent[i] === i) st[i] = 'done'; });
    const et: Record<number, CellTone> = {};
    done.forEach(i => (et[i] = 'done')); rejected.forEach(i => (et[i] = 'out'));
    return [
      forestView(parent, { labels: o.labels, tones }),
      { kind: 'array', name: 'parent (index = node)', values: [...parent], tones: pt },
      { kind: 'array', name: 'size (valid at roots)', values: [...size], tones: st },
      { kind: 'array', name: 'edges in order', values: names, indices: false, tones: et, ...(pointers && cur !== null ? { pointers: [{ at: cur, label: 'now' }] } : {}) },
      tvars({ groups: sets }),
    ];
  };
  const finish = (caption: string, answer: Val) => r.frame(caption, [...views(null, [], [], false).slice(0, 2), tvars({ groups: sets, answer })]);
  r.frame(`Every node starts as its own root: parent[i] = i, size 1, so there are ${n} groups. Each edge will ask "are these two ends already in one group?"`, views(null));
  if (mode === 'tree') {
    const ok = edges.length === n - 1;
    r.frame(`A tree on ${n} nodes has exactly ${n - 1} edges. This input has ${edges.length}: ${ok ? 'the count fits, but a loop could still hide in it' : 'the count is wrong, so it cannot be a tree'}.`, views(null),
      ask(`${n} nodes and ${edges.length} edges. Can the answer already be decided from the count?`, ['No: always run the unions', 'Only a wrong count decides it (false)'], ok ? 0 : 1, ok ? 'The right count is necessary, not sufficient: n − 1 edges could still contain a loop.' : 'A tree needs exactly n − 1 edges, so any other count is false at once.'));
    if (!ok) { finish(`The edge count is wrong, so return false without any union.`, 'false'); return r.frames; }
  }
  for (let e = 0; e < edges.length; e++) {
    const [a, b] = edges[e], pa = walk(a), pb = walk(b), ra = pa[pa.length - 1], rb = pb[pb.length - 1];
    r.frame(`Edge ${names[e]}. find(${L(a)}) walks ${pa.map(L).join(' → ')} and ends at root ${L(ra)}. find(${L(b)}) walks ${pb.map(L).join(' → ')} and ends at root ${L(rb)}.`, views(e, [...pa, ...pb]));
    const long = [pa, pb].find(p => p.length > 2);
    if (long) {
      const x = long[0], old = parent[x], root = long[long.length - 1];
      const moved: number[] = [];
      for (const p of [pa, pb]) for (const v of p.slice(0, -1)) if (parent[v] !== p[p.length - 1]) { parent[v] = p[p.length - 1]; moved.push(v); }
      r.frame(`Path compression: every node on a long walk is re-pointed straight at its root (${moved.map(L).join(', ')}). The next find from them is one hop.`, views(e, [], moved),
        ask(`find(${L(x)}) walked ${long.map(L).join(' → ')}. With path compression, what does parent[${L(x)}] become?`, uniq([`${L(root)} (the root)`, `${L(old)} (unchanged)`, `${L(x)} (itself)`]), 0, 'Compression re-points every node on the walk at the root, so a later find is a single hop.'));
    }
    const same = rootOf(a) === rootOf(b), q = ask(`Roots ${L(rootOf(a))} and ${L(rootOf(b))}. What happens to edge ${names[e]}?`, ['Different roots: merge the two groups', 'Same root: it closes a loop'], same ? 1 : 0,
      same ? 'Both ends are already connected through earlier edges, so this edge only adds a cycle.' : 'Different roots mean different groups. The edge joins them.');
    if (same) {
      rejected.add(e);
      if (mode === 'tree') { r.frame(`Both ends already share root ${L(rootOf(a))}: this edge closes a loop. A tree has no loop, so return false.`, views(e), q); finish('A loop makes it not a tree: false.', 'false'); return r.frames; }
      if (mode === 'redundant') { r.frame(`Both ends already share root ${L(rootOf(a))}, so ${names[e]} closes the loop. It is the first edge that fails to union, which is the answer.`, views(e), q); finish(`The surplus edge is ${names[e]}.`, J(edges[e])); return r.frames; }
      r.frame(`Both ends already share root ${L(rootOf(a))}: they were connected already, so this edge closes a loop and changes nothing. The group count stays ${sets}.`, views(e), q);
      continue;
    }
    let big = ra, small = rb;
    if (size[big] < size[small]) [big, small] = [small, big];
    parent[small] = big; size[big] += size[small]; sets--; done.add(e);
    r.frame(`Different roots, so merge: the smaller group's root ${L(small)} (size ${size[big] - size[small]}) hangs under the larger group's root ${L(big)}. Link roots, never members. Groups left: ${sets}.`, views(e, [], [small]), q);
  }
  if (mode === 'tree') finish(`${n - 1} edges and no loop: one connected piece, so it is a tree. Return true.`, 'true');
  else if (mode === 'redundant') finish('No union failed (this cannot happen for valid input).', '[]');
  else finish(`All edges are processed. ${sets} group(s) remain: that is the number of connected components.`, sets);
  return r.frames;
}

// ---- Dijkstra (Network Delay Time) --------------------------------------------------------------------------------
// Edges are directed [from, to, weight]. answer = JSON array of distances (-1 = unreachable). settleOnce draws the
// textbook version that never touches a node again once it is popped; with negative weights it can be wrong.
export function dijkstraFrames(n: number, edges: number[][], src: number, o: { pos?: Pos; labels?: string[]; settleOnce?: boolean } = {}): Frame[] {
  const L = (i: number) => o.labels?.[i] ?? String(i), r = recorder(), once = !!o.settleOnce;
  const dist: number[] = Array(n).fill(Infinity), settled = new Set<number>(), pred: Record<number, number> = {};
  dist[src] = 0;
  let heap: [number, number][] = [[0, src]];
  const out = range(n).map(u => edges.flatMap((e, k) => (e[0] === u ? [{ v: e[1], w: e[2], k }] : [])));
  const cmp = (a: number[], b: number[]) => a[0] - b[0] || a[1] - b[1];
  const entry = (e: number[]) => `(${e[0]}, ${L(e[1])})`;
  const views = (cur?: number, active?: number, pushed?: [number, number], removed: string[] = [], lowered?: number): View[] => {
    const tones: Record<number, NodeTone> = {};
    heap.forEach(([, v]) => { if (!settled.has(v)) tones[v] = 'queued'; });
    settled.forEach(v => (tones[v] = 'done'));
    if (cur !== undefined) tones[cur] = 'current';
    const et: Record<number, EdgeTone> = {};
    Object.values(pred).forEach(k => (et[k] = 'used'));
    if (active !== undefined) et[active] = 'active';
    const cells: Record<number, CellTone> = {};
    settled.forEach(v => (cells[v] = 'done'));
    if (lowered !== undefined) cells[lowered] = 'swapped';
    return [
      gview(n, edges, { directed: true, pos: o.pos, labels: o.labels, tones, edgeTones: et, weighted: true }),
      { kind: 'array', name: 'dist (index = node; green = settled)', values: dist.map(fmt), tones: cells },
      { kind: 'queue', name: 'heap of (distance, node), cheapest first', items: heap.map(entry), changed: pushed ? [heap.findIndex(h => h === pushed)] : [], removed, note: heap.length ? undefined : 'empty' },
    ];
  };
  r.frame(`dist[${L(src)}] = 0 and every other distance is ∞. The heap holds one entry, (0, ${L(src)}). The heap always hands back the entry with the smallest distance.`, views());
  while (heap.length) {
    heap.sort(cmp);
    const listed = [...heap].sort((a, b) => a[1] - b[1] || a[0] - b[0]), top = heap.shift()!, [d, u] = top;
    r.frame(`Pop the cheapest entry: ${entry(top)}.`, views(u, undefined, undefined, [entry(top)]),
      listed.length > 1 ? ask(`The heap holds ${listed.map(entry).join(' ')} (listed by node here). Which entry comes out?`, listed.map(entry), listed.indexOf(top), 'A min-heap returns the smallest distance first, whatever order the entries were pushed in.') : undefined);
    const stale = d > dist[u] || settled.has(u);
    if (stale) {
      r.frame(`${entry(top)} is stale: ${once && settled.has(u) ? `${L(u)} is already settled` : `dist[${L(u)}] is already ${dist[u]}, from a cheaper entry popped earlier`}. Skip it without relaxing anything.`, views(),
        ask(`Entry ${entry(top)} while dist[${L(u)}] = ${fmt(dist[u])}. Fresh or stale?`, ['Fresh: settle it and relax its edges', 'Stale: skip it'], 1, 'A cheaper route to this node was already settled, so this entry can only offer worse distances.'));
      continue;
    }
    settled.add(u);
    r.frame(`${entry(top)} matches dist[${L(u)}], so ${L(u)} is settled at ${d}. ${once ? 'Every route that could still arrive would have to leave through the heap at no less than this (assuming no negative weights).' : 'Weights are never negative, so any other route to it costs at least this.'} Now relax its edges.`, views(u),
      d !== 0 || u !== src ? ask(`Entry ${entry(top)} while dist[${L(u)}] = ${fmt(dist[u])}. Fresh or stale?`, ['Fresh: settle it and relax its edges', 'Stale: skip it'], 0, 'The distance equals the board value, so no cheaper route was found.') : undefined);
    if (!out[u].length) { r.frame(`${L(u)} has no outgoing edges, so there is nothing to relax.`, views(u)); continue; }
    for (const { v, w, k } of out[u]) {
      const nd = d + w, old = dist[v];
      if (once && settled.has(v)) { r.frame(`Edge ${L(u)} → ${L(v)} (${w}): ${L(v)} is already settled, and textbook Dijkstra never revisits a settled node.`, views(u, k)); continue; }
      const better = nd < old;
      let pushed: [number, number] | undefined;
      if (better) { dist[v] = nd; pred[v] = k; pushed = [nd, v]; heap.push(pushed); heap.sort(cmp); }
      r.frame(better ? `Edge ${L(u)} → ${L(v)} (${w}): ${d} + ${w} = ${nd} beats dist[${L(v)}] = ${fmt(old)}. Lower it and push ${entry(pushed!)}.`
        : `Edge ${L(u)} → ${L(v)} (${w}): ${d} + ${w} = ${nd} does not beat dist[${L(v)}] = ${fmt(old)}. Leave it.`, views(u, k, pushed, [], better ? v : undefined),
        ask(`Edge ${L(u)} → ${L(v)} (${w}): ${d} + ${w} = ${nd}, and dist[${L(v)}] is ${fmt(old)}. What happens?`, ['Lower dist and push a new entry', 'Leave it alone'], better ? 0 : 1, better ? 'A strictly cheaper route was found, so record it.' : 'Not strictly cheaper, so the old route stays.'));
    }
  }
  const answer = dist.map(x => (x === Infinity ? -1 : x));
  r.frame(`The heap is empty. Final distances: ${dist.map((x, i) => `${L(i)} = ${fmt(x)}`).join(', ')}.${dist.includes(Infinity) ? ' ∞ means that node is never reached.' : ''}`, [...views().slice(0, 2), tvars({ answer: J(answer) })]);
  return r.frames;
}

// ---- Prim (Min Cost to Connect All Points) --------------------------------------------------------------------------
// answer = total cost of the minimum spanning tree.
export function primFrames(points: number[][]): Frame[] {
  const n = points.length, r = recorder(), d = (i: number, j: number) => Math.abs(points[i][0] - points[j][0]) + Math.abs(points[i][1] - points[j][1]);
  const xs = points.map(p => p[0]), ys = points.map(p => p[1]), minX = Math.min(...xs), minY = Math.min(...ys);
  const s = Math.min(250 / Math.max(1, Math.max(...xs) - minX), 150 / Math.max(1, Math.max(...ys) - minY));
  const pos: Pos = {};
  points.forEach((p, i) => (pos[i] = [35 + (p[0] - minX) * s, 190 - (p[1] - minY) * s]));
  const labels = points.map((_, i) => `p${i}`), best: number[] = Array(n).fill(Infinity), from: number[] = Array(n).fill(-1), inTree = new Set<number>();
  const chosen: number[][] = [];
  best[0] = 0;
  let total = 0, lastEdge = -1;
  const views = (cur?: number, pick?: number, changed: number[] = []): View[] => {
    const tones: Record<number, NodeTone> = {};
    inTree.forEach(v => (tones[v] = 'done'));
    if (cur !== undefined) tones[cur] = 'current';
    const edges: { from: string; to: string; weight: Val; tone: EdgeTone }[] = chosen.map((e, k) => ({ from: String(e[0]), to: String(e[1]), weight: e[2], tone: k === lastEdge ? 'active' : 'used' }));
    range(n).forEach(v => { if (!inTree.has(v) && from[v] >= 0) edges.push({ from: String(from[v]), to: String(v), weight: best[v], tone: 'dim' }); });
    const cells: Record<number, CellTone> = {};
    inTree.forEach(v => (cells[v] = 'done'));
    changed.forEach(v => (cells[v] = 'swapped'));
    if (pick !== undefined) cells[pick] = 'active';
    return [
      { kind: 'graph', name: 'points (green = in the tree, grey = best offer)', directed: false, nodes: range(n).map(i => ({ id: String(i), label: labels[i], x: pos[i][0], y: pos[i][1] })), edges, tones: Object.fromEntries(Object.entries(tones)) },
      { kind: 'array', name: 'best[v] = cheapest cable from the tree to v', values: best.map(fmt), tones: cells },
      tvars({ total, inTree: [...inTree].map(v => labels[v]).join(', ') || '(none)' }),
    ];
  };
  r.frame(`The tree is empty. best[v] is the cheapest known cable from the tree to point v. Start anywhere: best[p0] = 0, everything else is ∞. Cable cost is the Manhattan distance.`, views());
  for (let round = 0; round < n; round++) {
    let u = -1;
    for (let v = 0; v < n; v++) if (!inTree.has(v) && (u === -1 || best[v] < best[u])) u = v;
    const outside = range(n).filter(v => !inTree.has(v));
    inTree.add(u); total += best[u];
    if (from[u] >= 0) { chosen.push([from[u], u, best[u]]); lastEdge = chosen.length - 1; }
    r.frame(round === 0 ? `p0 joins for free (best 0). From here on, the cheapest cable leaving the tree is always safe to lay.`
      : `${labels[u]} has the smallest best (${best[u]}) among the points outside, so cable ${labels[from[u]]}–${labels[u]} joins the tree. Total ${total}.`, views(u, undefined),
      round > 0 && outside.length > 1 ? ask(`best is ${outside.map(v => `${labels[v]}: ${fmt(best[v])}`).join(', ')}. Which point joins next (ties go to the lower number)?`, outside.map(v => labels[v]), outside.indexOf(u),
        'The cheapest cable crossing from the tree to the outside is safe: some minimum spanning tree contains it (the cut property).') : undefined);
    const changed: number[] = [], notes: string[] = [];
    for (let v = 0; v < n; v++) {
      if (inTree.has(v)) continue;
      const w = d(u, v);
      if (w < best[v]) { notes.push(`${labels[v]}: ${fmt(best[v])} → ${w}`); best[v] = w; from[v] = u; changed.push(v); }
    }
    if (round < n - 1) r.frame(changed.length ? `The newcomer ${labels[u]} may offer cheaper cables. Updated: ${notes.join('; ')}. The others keep their old offers.` : `${labels[u]} offers no cheaper cable to any outside point, so best is unchanged.`, views(undefined, undefined, changed));
  }
  r.frame(`Every point is in the tree. ${n - 1} cable(s) cost ${total} in total.`, [...views().slice(0, 2), tvars({ answer: total })]);
  return r.frames;
}

// ---- Kruskal ----------------------------------------------------------------------------------------------------
// Undirected weighted edges [a, b, w]. answer = total weight of the minimum spanning forest.
export function kruskalFrames(n: number, edges: number[][], pos?: Pos): Frame[] {
  const r = recorder(), parent = range(n), size: number[] = Array(n).fill(1);
  const order = edges.map((e, i) => i).sort((x, y) => edges[x][2] - edges[y][2] || x - y);
  const rootOf = (x: number) => { while (parent[x] !== x) x = parent[x]; return x; };
  const tone: Record<number, EdgeTone> = {}, cellTone: Record<number, CellTone> = {};
  let total = 0, sets = n, taken = 0;
  const views = (at: number, active?: number): View[] => [
    gview(n, edges, { pos, weighted: true, edgeTones: { ...tone, ...(active === undefined ? {} : { [active]: 'active' as const }) } }),
    { kind: 'array', name: 'edges sorted by weight', values: order.map(k => `${edges[k][0]}–${edges[k][1]} (${edges[k][2]})`), indices: false, tones: cellTone, ...(at < order.length ? { pointers: [{ at, label: 'now' }] } : {}) },
    { kind: 'array', name: 'parent (index = node)', values: [...parent] },
    tvars({ total, groups: sets }),
  ];
  r.frame(`Sort every edge by weight, then take them cheapest first. An edge is kept only if its ends are in different groups; otherwise it would close a loop.`, views(0));
  for (let i = 0; i < order.length; i++) {
    const k = order[i], [a, b, w] = edges[k], ra = rootOf(a), rb = rootOf(b), same = ra === rb;
    const q = ask(`Edge ${a}–${b} (${w}): the roots are ${ra} and ${rb}. Keep it?`, ['Keep: the ends are in different groups', 'Skip: both ends are already connected'], same ? 1 : 0, same ? 'Adding it would close a loop, and a loop contains an edge we could drop.' : 'It joins two groups, and it is the cheapest edge left that does.');
    if (same) {
      tone[k] = 'dim'; cellTone[i] = 'out';
      r.frame(`Edge ${a}–${b} (${w}): both ends have root ${ra}, so they are already connected. Skip it.`, views(i, k), q);
    } else {
      let big = ra, small = rb;
      if (size[big] < size[small]) [big, small] = [small, big];
      parent[small] = big; size[big] += size[small]; sets--; taken++; total += w; tone[k] = 'used'; cellTone[i] = 'done';
      r.frame(`Edge ${a}–${b} (${w}): different roots ${ra} and ${rb}, so keep it and merge the groups. Total ${total}.`, views(i, k), q);
    }
    if (sets === 1 && i + 1 < order.length) { r.frame(`Everything is connected after ${taken} edges, so the remaining edges can only form loops. Stop early.`, views(order.length)); break; }
  }
  r.frame(`Done. The kept edges cost ${total}${sets > 1 ? ` (the graph has ${sets} separate pieces, so this is a spanning forest)` : ' and span every node'}.`, [...views(order.length).slice(0, 2), tvars({ total, answer: total })]);
  return r.frames;
}

// ---- Bellman-Ford with a round limit (Cheapest Flights Within K Stops) --------------------------------------------
// answer = cheapest price using at most k + 1 flights, or -1.
export function bellmanFrames(n: number, flights: number[][], src: number, dst: number, k: number, pos?: Pos): Frame[] {
  const r = recorder(), cost: number[] = Array(n).fill(Infinity);
  cost[src] = 0;
  let prev = [...cost];
  const views = (round: number, active?: number, changed?: number): View[] => {
    const cells: Record<number, CellTone> = {};
    if (changed !== undefined) cells[changed] = 'swapped';
    return [
      gview(n, flights, { directed: true, pos, weighted: true, edgeTones: active === undefined ? {} : { [active]: 'active' } }),
      { kind: 'array', name: 'prev (last round, read only)', values: prev.map(fmt) },
      { kind: 'array', name: 'cost (this round, being written)', values: cost.map(fmt), tones: cells },
      tvars({ round: `${round} of ${k + 1}` }),
    ];
  };
  r.frame(`At most ${k} stop(s) means at most ${k + 1} flights, so we run exactly ${k + 1} round(s). After round r, cost[v] is the cheapest price using at most r flights.`, views(0));
  for (let round = 1; round <= k + 1; round++) {
    prev = [...cost];
    r.frame(`Round ${round}: copy the board into prev. This round may only read prev, so it adds at most one flight to any route.`, views(round));
    flights.forEach(([from, to, price], f) => {
      const offer = prev[from] + price, old = cost[to];
      if (prev[from] === Infinity) { r.frame(`Flight ${from} → ${to} (${price}): prev[${from}] is ∞, so there is nothing to extend.`, views(round, f)); return; }
      const better = offer < old;
      if (better) cost[to] = offer;
      r.frame(`Flight ${from} → ${to} (${price}): prev[${from}] + ${price} = ${offer} ${better ? `beats cost[${to}] = ${fmt(old)}, so write it` : `does not beat cost[${to}] = ${fmt(old)}`}.`, views(round, f, better ? to : undefined),
        ask(`Flight ${from} → ${to} (${price}) reads prev[${from}] = ${fmt(prev[from])}. Is ${offer} an improvement on cost[${to}] = ${fmt(old)}?`, ['Yes: write it', 'No: keep the old value'], better ? 0 : 1,
          better ? 'The flight extends a route found in an earlier round by exactly one more flight, and it is cheaper.' : 'The existing value is already as good or better.'));
    });
  }
  r.frame(`All ${k + 1} round(s) are done. cost[${dst}] = ${fmt(cost[dst])}${cost[dst] === Infinity ? ', so there is no route within the limit: return −1' : ''}.`, [...views(k + 1).slice(0, 3), tvars({ answer: cost[dst] === Infinity ? -1 : cost[dst] })]);
  return r.frames;
}

// ---- Weighted union-find (Evaluate Division) ----------------------------------------------------------------------
// answer = JSON array of query results rounded to 5 places (-1 when undetermined).
const round5 = (x: number) => Math.round(x * 1e5) / 1e5;
export function ratioFrames(equations: [string, string, number][], queries: [string, string][]): Frame[] {
  const names = [...new Set(equations.flat().filter(x => typeof x === 'string'))] as string[], id = new Map(names.map((s, i) => [s, i]));
  const n = names.length, parent = range(n), ratio: number[] = Array(n).fill(1), r = recorder();
  const find = (x: number): number => { if (parent[x] === x) return x; const p = parent[x], root = find(p); ratio[x] *= ratio[p]; parent[x] = root; return root; };
  const views = (changed: number[] = []): View[] => [
    forestView(parent, { labels: names, weight: i => round5(ratio[i]), name: 'forest (arrow x → parent, labelled x / parent)' }),
    { kind: 'map', name: 'ratio[x] = x / parent[x]', entries: names.map((s, i) => [s, `${round5(ratio[i])} (parent ${names[parent[i]]})`] as [Val, Val]), changed },
  ];
  r.frame(`Each variable stores its parent and ratio[x] = x / parent[x]. A root has ratio 1. find multiplies ratios along the path, so afterwards ratio[x] = x / root.`, views());
  for (const [a, b, v] of equations) {
    const ia = id.get(a)!, ib = id.get(b)!, ra = find(ia), rb = find(ib);
    if (ra === rb) { r.frame(`${a} / ${b} = ${v}: ${a} and ${b} already share root ${names[ra]}, so nothing to join.`, views()); continue; }
    const rr = v * ratio[ib] / ratio[ia];
    parent[ra] = rb; ratio[ra] = rr;
    r.frame(`${a} / ${b} = ${v}. The roots are ${names[ra]} and ${names[rb]}. We need ${names[ra]} / ${names[rb]} = ${v} × ratio[${b}] / ratio[${a}] = ${round5(rr)}, so ${names[ra]} hangs under ${names[rb]} with that ratio.`, views([ra]));
  }
  const answers: number[] = [];
  for (const [c, d] of queries) {
    const ic = id.get(c), idd = id.get(d);
    if (ic === undefined || idd === undefined) { answers.push(-1); r.frame(`${c} / ${d}: ${ic === undefined ? c : d} never appeared in an equation, so the answer is −1 (even for x / x).`, views()); continue; }
    const rc = find(ic), rd = find(idd);
    if (rc !== rd) { answers.push(-1); r.frame(`${c} / ${d}: the roots differ (${names[rc]} and ${names[rd]}), so the ratio cannot be determined: −1.`, views()); continue; }
    const ans = round5(ratio[ic] / ratio[idd]);
    answers.push(ans);
    const opts = uniq([String(ans), String(round5(ratio[ic] * ratio[idd])), String(round5(ratio[idd] / ratio[ic]))]);
    r.frame(`${c} / ${d}: both reach root ${names[rc]}. (${c} / root) ÷ (${d} / root) = ${round5(ratio[ic])} ÷ ${round5(ratio[idd])} = ${ans}.`, views(),
      opts.length > 1 ? ask(`After find, ratio[${c}] = ${round5(ratio[ic])} and ratio[${d}] = ${round5(ratio[idd])}. What is ${c} / ${d}?`, opts, 0, 'Both are measured against the same root, so the root cancels: c / d = (c / root) ÷ (d / root).') : undefined);
  }
  r.frame(`All queries answered.`, [...views().slice(0, 1), tvars({ answer: J(answers) })]);
  return r.frames;
}

// ---- Dijkstra with max instead of + (Path With Minimum Effort) ----------------------------------------------------
// answer = the least possible largest single step between adjacent squares on a route from the top-left to the bottom-right.
export function effortFrames(heights: number[][]): Frame[] {
  const R = heights.length, C = heights[0].length, r = recorder();
  const eff = heights.map(row => row.map(() => Infinity)), settled = heights.map(row => row.map(() => false));
  eff[0][0] = 0;
  let heap: [number, number, number][] = [[0, 0, 0]];
  const cell = (r0: number, c0: number) => `(${r0}, ${c0})`;
  const views = (cur?: [number, number], changed: [number, number][] = []): View[] => {
    const tones: { r: number; c: number; tone: CellTone }[] = [];
    for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) if (settled[i][j]) tones.push({ r: i, c: j, tone: 'done' });
    if (cur) tones.push({ r: cur[0], c: cur[1], tone: 'active' });
    return [
      { kind: 'grid', name: 'heights', cells: heights, tones },
      { kind: 'grid', name: 'effort so far (largest step on the best route found)', cells: eff.map(row => row.map(fmt)), tones: [...tones.filter(t => t.tone === 'done'), ...changed.map(([i, j]) => ({ r: i, c: j, tone: 'swapped' as const }))] },
      { kind: 'queue', name: 'heap of (effort, square)', items: heap.map(h => `${h[0]} @ ${cell(h[1], h[2])}`), note: heap.length ? undefined : 'empty' },
    ];
  };
  r.frame(`A route's effort is its single largest step between neighbours, not the sum. Run Dijkstra with max(effort so far, this step) in place of distance + weight. Extending a route can never lower its effort, so cheapest-first is still safe.`, views());
  while (heap.length) {
    heap.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
    const listed = [...heap].sort((a, b) => a[1] - b[1] || a[2] - b[2] || a[0] - b[0]), top = heap.shift()!, [e, y, x] = top;
    const name = (h: number[]) => `${h[0]} @ ${cell(h[1], h[2])}`;
    r.frame(`Pop ${name(top)}, the smallest effort in the heap.`, views([y, x]),
      listed.length > 1 ? ask(`The heap holds ${listed.map(name).join(', ')}. Which entry comes out?`, listed.map(name), listed.indexOf(top), 'The smallest effort comes out first (ties by position).') : undefined);
    if (e > eff[y][x]) { r.frame(`Stale: ${cell(y, x)} already has effort ${eff[y][x]}. Skip.`, views()); continue; }
    settled[y][x] = true;
    if (y === R - 1 && x === C - 1) { r.frame(`The bottom-right square is popped, so its effort ${e} is final.`, [...views().slice(0, 2), tvars({ answer: e })]); return r.frames; }
    const notes: string[] = [], changed: [number, number][] = [];
    for (const [dy, dx] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ny = y + dy, nx = x + dx;
      if (ny < 0 || nx < 0 || ny >= R || nx >= C) continue;
      const step = Math.abs(heights[ny][nx] - heights[y][x]), ne = Math.max(e, step);
      if (ne < eff[ny][nx]) { notes.push(`${cell(ny, nx)}: step ${step}, max(${e}, ${step}) = ${ne} beats ${fmt(eff[ny][nx])}`); eff[ny][nx] = ne; heap.push([ne, ny, nx]); changed.push([ny, nx]); }
    }
    r.frame(notes.length ? `${cell(y, x)} is settled at ${e}. Relax the neighbours: ${notes.join('; ')}.` : `${cell(y, x)} is settled at ${e}, and none of its neighbours gets a better effort.`, views(undefined, changed));
  }
  r.frame(`The heap is empty: the effort of the last square is ${eff[R - 1][C - 1]}.`, [...views().slice(0, 2), tvars({ answer: eff[R - 1][C - 1] })]);
  return r.frames;
}
