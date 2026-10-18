// Data model, frame recorder, predict-mode state machine and ready-made frame generators for <DryRun>.
// Everything here is pure and JSON-serialisable so frames can be built at build time and shipped to the browser.
export type Val = string | number;
export type CellTone = 'active' | 'compared' | 'swapped' | 'visited' | 'done' | 'out' | 'found';
export type PtrTone = 'gold' | 'blue' | 'green' | 'purple' | 'red' | 'dim';
export type NodeTone = 'current' | 'visited' | 'queued' | 'done';
export type RecTone = 'exploring' | 'pruned' | 'solution' | 'undone';
export type EdgeTone = 'active' | 'used' | 'dim';

export interface ArrayView {
  kind: 'array'; name?: string; values: Val[]; indices?: boolean; join?: string;
  pointers?: { at: number; label: string; tone?: PtrTone }[];
  regions?: { from: number; to: number; label?: string; tone?: PtrTone }[];
  tones?: Record<number, CellTone>;
}
export interface GridView {
  kind: 'grid'; name?: string; cells: (Val | null)[][]; rowLabels?: Val[]; colLabels?: Val[];
  tones?: { r: number; c: number; tone: CellTone }[];
  pointers?: { r: number; c: number; label: string; tone?: PtrTone }[];
}
export interface ListView {
  kind: 'stack' | 'queue' | 'set'; name?: string; items: Val[];
  changed?: number[]; removed?: Val[]; note?: string;
}
export interface MapView {
  kind: 'map'; name?: string; entries: [Val, Val][];
  changed?: number[]; removed?: Val[]; note?: string;
}
export interface TreeNode { id?: string; v: Val; l?: TreeNode | null; r?: TreeNode | null }
export interface TreeView {
  kind: 'tree'; name?: string; root?: TreeNode | null; array?: (Val | null)[];
  tones?: Record<string, NodeTone>; path?: string[];
}
export interface GraphView {
  kind: 'graph'; name?: string; directed?: boolean;
  nodes: { id: string; label?: Val; x?: number; y?: number }[];
  edges: { from: string; to: string; weight?: Val; tone?: EdgeTone }[];
  tones?: Record<string, NodeTone>;
}
export interface RecursionView {
  kind: 'recursion'; name?: string;
  nodes: { id: string; parent?: string | null; label: Val; edge?: string; tone?: RecTone }[];
}
export interface TextView { kind: 'text'; name?: string; vars: { name: string; value: Val; changed?: boolean }[] }
export type View = ArrayView | GridView | ListView | MapView | TreeView | GraphView | RecursionView | TextView;

export interface Predict { question: string; options: string[]; answer: number; explain: string }
export interface Frame { caption: string; views: View[]; predict?: Predict }

// ---- recorder ----------------------------------------------------------------------------------
export function recorder() {
  const frames: Frame[] = [];
  return {
    frames,
    frame(caption: string, views: View[], predict?: Predict) {
      frames.push({ caption, views, ...(predict ? { predict } : {}) });
      return this;
    },
  };
}

// tvars({ l: 0, r: 5 }, prev) flags every value that differs from prev.
export function tvars(now: Record<string, Val>, prev?: Record<string, Val>, name?: string): TextView {
  return { kind: 'text', ...(name ? { name } : {}), vars: Object.entries(now).map(([n, value]) => ({ name: n, value, changed: !!prev && prev[n] !== value })) };
}

export const lastVar = (frames: Frame[], name: string): string | undefined => {
  for (const v of frames[frames.length - 1].views) if (v.kind === 'text') { const hit = v.vars.find(x => x.name === name); if (hit) return String(hit.value); }
  return undefined;
};

// ---- predict-mode state machine ---------------------------------------------------------------
// i = frame on screen. pending = frame i+1 has a predict question that is shown but not yet revealed.
export interface PlayerState { i: number; pending: boolean }
export const start: PlayerState = { i: 0, pending: false };
export const reveal = (s: PlayerState): PlayerState => ({ i: s.i + 1, pending: false });
export function forward(s: PlayerState, frames: Frame[], predictMode: boolean): PlayerState {
  if (s.pending) return reveal(s);
  if (s.i >= frames.length - 1) return s;
  if (predictMode && frames[s.i + 1].predict) return { i: s.i, pending: true };
  return reveal(s);
}
export const back = (s: PlayerState): PlayerState => (s.pending ? { i: s.i, pending: false } : { i: Math.max(0, s.i - 1), pending: false });
export const isCorrect = (p: Predict, choice: number) => choice === p.answer;

// ---- generator helpers -------------------------------------------------------------------------
const J = (x: unknown) => JSON.stringify(x);
const cmp = (a: number, b: number) => (a < b ? '<' : a > b ? '>' : '=');
// Three numeric choices with the right one rotated by `salt` so the answer is not always first.
function numberChoices(right: number, salt: number): { options: string[]; answer: number } {
  const list = [right, right + 1, right - 1].map(String);
  const shift = ((salt % 3) + 3) % 3;
  const options = list.map((_, k) => list[(k + 3 - shift) % 3]);
  return { options, answer: options.indexOf(String(right)) };
}

// ---- two pointers ------------------------------------------------------------------------------
// `nums` must be sorted ascending. Final frame has text var `answer` = [i, j] or [].
export function twoSumSortedFrames(nums: number[], target: number): Frame[] {
  const r = recorder();
  let l = 0, h = nums.length - 1;
  const out = new Set<number>();
  const arr = (extra: Partial<ArrayView> = {}): ArrayView => ({
    kind: 'array', name: 'nums', values: nums,
    pointers: l <= h ? [{ at: l, label: 'left', tone: 'gold' }, { at: h, label: 'right', tone: 'blue' }].filter(p => p.at >= 0 && p.at < nums.length) : [],
    tones: Object.fromEntries([...out].map(i => [i, 'out' as CellTone])), ...extra,
  });
  r.frame(`The array is sorted, so we can start with the widest pair: left at the smallest value, right at the largest. We want two numbers adding to ${target}.`, [arr(), tvars({ target })]);
  while (l < h) {
    const sum = nums[l] + nums[h];
    const tones: Record<number, CellTone> = Object.fromEntries([...out].map(i => [i, 'out' as CellTone]));
    tones[l] = 'compared'; tones[h] = 'compared';
    if (sum === target) {
      tones[l] = 'found'; tones[h] = 'found';
      r.frame(`${nums[l]} + ${nums[h]} = ${sum}, exactly the target ${target}. Found the pair at indices ${l} and ${h}.`, [arr({ tones }), tvars({ sum, target, answer: J([l, h]) })]);
      return r.frames;
    }
    const tooBig = sum > target;
    r.frame(`Compare: ${nums[l]} + ${nums[h]} = ${sum}, which is ${tooBig ? 'greater' : 'less'} than the target ${target}.`, [arr({ tones }), tvars({ sum, target })]);
    const was = { l, h };
    if (tooBig) { out.add(h); h--; } else { out.add(l); l++; }
    const why = tooBig
      ? `sum ${sum} > target ${target}, so the right pointer moves left: ${nums[was.h]} is too big for every remaining left partner (they are all >= ${nums[was.l]}), so it can never be part of the answer.`
      : `sum ${sum} < target ${target}, so the left pointer moves right: ${nums[was.l]} is too small for every remaining right partner (they are all <= ${nums[was.h]}), so it can never be part of the answer.`;
    r.frame(why, [arr(), tvars({ left: l, right: h, target })], {
      question: `sum = ${sum}, target = ${target}. Which pointer should move?`,
      options: ['Left pointer moves right', 'Right pointer moves left', 'Stop: the pair is found'],
      answer: tooBig ? 1 : 0,
      explain: tooBig ? `The sum is too big. Only moving right inward can make it smaller, since the array is sorted.` : `The sum is too small. Only moving left inward can make it bigger, since the array is sorted.`,
    });
  }
  r.frame(`The pointers met, so every pair has been ruled out. No two numbers add to ${target}.`, [{ kind: 'array', name: 'nums', values: nums, tones: Object.fromEntries(nums.map((_, i) => [i, 'out' as CellTone])) }, tvars({ answer: '[]' })]);
  return r.frames;
}

// ---- sliding window ----------------------------------------------------------------------------
// Final frame text var `answer` = best window sum (or "none" when k > n).
export function slidingWindowMaxSumFrames(nums: number[], k: number): Frame[] {
  const r = recorder();
  const n = nums.length;
  if (k > n || k < 1) { r.frame(`A window of size ${k} does not fit in ${n} numbers.`, [{ kind: 'array', name: 'nums', values: nums }, tvars({ answer: 'none' })]); return r.frames; }
  const win = (a: number, b: number, tone: CellTone = 'active'): ArrayView => ({
    kind: 'array', name: 'nums', values: nums, regions: [{ from: a, to: b, label: `window of ${k}`, tone: 'gold' }],
    tones: Object.fromEntries(Array.from({ length: b - a + 1 }, (_, x) => [a + x, tone])),
  });
  let sum = nums.slice(0, k).reduce((x, y) => x + y, 0), best = sum;
  r.frame(`Add up the first ${k} numbers once: ${nums.slice(0, k).join(' + ')} = ${sum}. This is our first window and our best so far.`, [win(0, k - 1), tvars({ windowSum: sum, best })]);
  for (let i = k; i < n; i++) {
    const out = nums[i - k], prevSum = sum, prevBest = best;
    sum += nums[i] - out;
    const tones = { ...(win(i - k + 1, i).tones as Record<number, CellTone>), [i]: 'compared' as CellTone, [i - k]: 'out' as CellTone };
    r.frame(`Slide right by one: add the new number ${nums[i]} and drop the old one ${out}. New sum = ${prevSum} + ${nums[i]} - ${out} = ${sum}. No need to re-add all ${k} numbers.`,
      [{ ...win(i - k + 1, i), tones }, tvars({ windowSum: sum, best }, { windowSum: prevSum, best })],
      { question: `Window sum is ${prevSum}. We add ${nums[i]} and drop ${out}. New window sum?`, ...numberChoices(sum, i), explain: `${prevSum} + ${nums[i]} - ${out} = ${sum}. Updating the sum in O(1) is the whole point of a sliding window.` });
    best = Math.max(best, sum);
    r.frame(sum > prevBest ? `${sum} beats the previous best ${prevBest}, so best becomes ${sum}.` : `${sum} does not beat the best ${prevBest}, so best stays ${prevBest}.`,
      [win(i - k + 1, i, sum > prevBest ? 'found' : 'active'), tvars({ windowSum: sum, best }, { windowSum: sum, best: prevBest })]);
  }
  r.frame(`Every window has been checked. The largest window sum is ${best}.`, [win(0, n - 1, 'out'), tvars({ answer: best })]);
  return r.frames;
}

// ---- binary search -----------------------------------------------------------------------------
// `nums` must be sorted ascending. Final frame text var `answer` = index or -1.
export function binarySearchFrames(nums: number[], target: number): Frame[] {
  const r = recorder();
  let lo = 0, hi = nums.length - 1;
  const view = (mid?: number, extra: Record<number, CellTone> = {}): ArrayView => {
    const tones: Record<number, CellTone> = {};
    nums.forEach((_, i) => { if (i < lo || i > hi) tones[i] = 'out'; });
    if (mid !== undefined) tones[mid] = 'compared';
    Object.assign(tones, extra);
    const pointers: ArrayView['pointers'] = [];
    if (lo <= hi) { pointers.push({ at: lo, label: 'low', tone: 'gold' }, { at: hi, label: 'high', tone: 'blue' }); }
    if (mid !== undefined) pointers.push({ at: mid, label: 'mid', tone: 'purple' });
    return { kind: 'array', name: 'nums', values: nums, pointers, tones };
  };
  r.frame(`Looking for ${target}. The whole array is still possible, so low = 0 and high = ${hi}. Each step will throw away half of what is left.`, [view(), tvars({ target, low: lo, high: hi })]);
  while (lo <= hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    const v = nums[mid];
    r.frame(`Look at the middle of the live range: mid = ${lo} + (${hi} - ${lo}) / 2 = ${mid}, value ${v}. Compare with the target ${target}: ${v} ${cmp(v, target)} ${target}.`, [view(mid), tvars({ target, low: lo, high: hi, mid, 'nums[mid]': v })]);
    if (v === target) {
      r.frame(`nums[${mid}] = ${v} equals the target. Found at index ${mid}.`, [view(mid, { [mid]: 'found' }), tvars({ answer: mid })]);
      return r.frames;
    }
    const oldLo = lo, oldHi = hi;
    if (v < target) lo = mid + 1; else hi = mid - 1;
    r.frame(v < target
      ? `${v} < ${target}, and the array is sorted, so everything at or left of index ${mid} is also too small. Discard that half: low = ${mid} + 1 = ${lo}.`
      : `${v} > ${target}, and the array is sorted, so everything at or right of index ${mid} is also too big. Discard that half: high = ${mid} - 1 = ${hi}.`,
      [view(undefined), tvars({ target, low: lo, high: hi }, { target, low: oldLo, high: oldHi })],
      { question: `nums[mid] = ${v}, target = ${target}. Which half can be thrown away?`, options: ['The left half (low moves up)', 'The right half (high moves down)', 'Neither, check both'], answer: v < target ? 0 : 1,
        explain: v < target ? 'The middle is too small, and a sorted array means everything to its left is smaller still.' : 'The middle is too big, and a sorted array means everything to its right is bigger still.' });
  }
  r.frame(`low (${lo}) passed high (${hi}): no candidates are left, so ${target} is not in the array.`, [view(), tvars({ answer: -1 })]);
  return r.frames;
}

// ---- graphs ------------------------------------------------------------------------------------
export type Adj = Record<string, string[]>;
export interface GraphOpts { directed?: boolean }
function graphView(adj: Adj, tones: Record<string, NodeTone>, directed: boolean, active?: [string, string]): GraphView {
  const ids = [...new Set([...Object.keys(adj), ...Object.values(adj).flat()])];
  const seen = new Set<string>();
  const edges: GraphView['edges'] = [];
  for (const [u, vs] of Object.entries(adj)) for (const v of vs) {
    const key = directed ? `${u}>${v}` : [u, v].sort().join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    const on = active && (active[0] === u && active[1] === v || !directed && active[0] === v && active[1] === u);
    edges.push({ from: u, to: v, ...(on ? { tone: 'active' as EdgeTone } : {}) });
  }
  return { kind: 'graph', name: 'graph', directed, nodes: ids.map(id => ({ id })), edges, tones: { ...tones } };
}

// Final frame text var `answer` = visit order as JSON array.
export function bfsFrames(adj: Adj, start: string, opts: GraphOpts = {}): Frame[] {
  const directed = !!opts.directed, r = recorder();
  const seen = new Set([start]), queue = [start], order: string[] = [], done = new Set<string>();
  const tones = (cur?: string): Record<string, NodeTone> => {
    const t: Record<string, NodeTone> = {};
    for (const s of seen) t[s] = 'visited';
    for (const q of queue) t[q] = 'queued';
    for (const d of done) t[d] = 'done';
    if (cur) t[cur] = 'current';
    return t;
  };
  const side = (cur?: string, changed: number[] = [], removed: string[] = [], active?: [string, string]): View[] => [
    graphView(adj, tones(cur), directed, active),
    { kind: 'queue', name: 'queue (front on the left)', items: [...queue], changed, removed, note: queue.length ? undefined : 'empty' },
    { kind: 'set', name: 'visited', items: [...seen] },
    { kind: 'text', vars: [{ name: 'order', value: order.join(' → ') || '(none yet)' }] },
  ];
  r.frame(`Start at ${start}. Put it in the queue and mark it visited right away, so it can never be queued twice.`, side(undefined, [0]));
  while (queue.length) {
    const sortedQ = [...queue].sort();
    const u = queue.shift()!;
    order.push(u);
    r.frame(`Take the node at the front of the queue: ${u}. A queue is first-in first-out, so nodes closest to ${start} are always handled first.`,
      side(u, [], [u]),
      queue.length ? { question: `The queue holds ${sortedQ.join(', ')} (listed alphabetically here). Which node does BFS take out next?`, options: sortedQ, answer: sortedQ.indexOf(u),
        explain: `${u} has been waiting longest, so it is at the front. BFS always dequeues the oldest entry.` } : undefined);
    const fresh = (adj[u] || []).filter(v => !seen.has(v));
    const stale = (adj[u] || []).filter(v => seen.has(v));
    const before = queue.length;
    for (const v of fresh) { seen.add(v); queue.push(v); }
    const parts = [
      fresh.length ? `${fresh.join(', ')} ${fresh.length > 1 ? 'are' : 'is'} new, so ${fresh.length > 1 ? 'they join' : 'it joins'} the back of the queue and ${fresh.length > 1 ? 'are' : 'is'} marked visited` : `${u} has no new neighbours`,
      stale.length ? `${stale.join(', ')} ${stale.length > 1 ? 'were' : 'was'} already visited, so ${stale.length > 1 ? 'they are' : 'it is'} skipped (this is what stops cycles looping forever)` : '',
    ].filter(Boolean);
    done.add(u);
    r.frame(`Look at ${u}'s neighbours: ${parts.join('; ')}.`, side(undefined, fresh.map((_, k) => before + k), [], fresh.length ? [u, fresh[0]] : undefined));
  }
  r.frame(`The queue is empty, so every node reachable from ${start} has been visited. BFS order: ${order.join(', ')}.`, [...side().slice(0, 3), tvars({ answer: J(order) })]);
  return r.frames;
}

// Final frame text var `answer` = visit order as JSON array.
export function dfsFrames(adj: Adj, start: string, opts: GraphOpts = {}): Frame[] {
  const directed = !!opts.directed, r = recorder();
  const seen = new Set<string>(), stack: string[] = [], order: string[] = [], done = new Set<string>();
  const tones = (): Record<string, NodeTone> => {
    const t: Record<string, NodeTone> = {};
    for (const s of seen) t[s] = 'visited';
    for (const d of done) t[d] = 'done';
    if (stack.length) t[stack[stack.length - 1]] = 'current';
    return t;
  };
  const side = (changed: number[] = [], removed: string[] = [], active?: [string, string]): View[] => [
    graphView(adj, tones(), directed, active),
    { kind: 'stack', name: 'call stack (top = where we are)', items: [...stack], changed, removed },
    { kind: 'text', vars: [{ name: 'order', value: order.join(' → ') || '(none yet)' }] },
  ];
  const visit = (u: string, from?: string) => {
    seen.add(u); stack.push(u); order.push(u);
    r.frame(from ? `Go deeper: call dfs(${u}) from ${from}. ${u} is marked visited and pushed on the call stack.` : `Start: call dfs(${u}), mark it visited and push it on the call stack.`, side([stack.length - 1], [], from ? [from, u] : undefined));
    for (const v of adj[u] || []) {
      if (seen.has(v)) {
        r.frame(`Next neighbour of ${u} is ${v}, but ${v} is already visited. Skip it so we never loop.`, side([], [], [u, v]));
        continue;
      }
      const preview = `${u}'s next unvisited neighbour is ${v}.`;
      const pred: Predict = { question: `${preview} What does DFS do with it?`, options: [`Go deeper into ${v} right now`, `Queue ${v} and finish ${u}'s other neighbours first`, `Skip ${v}`], answer: 0,
        explain: `DFS dives as deep as it can before coming back. (Queueing the neighbours for later is BFS.)` };
      const at = r.frames.length;
      visit(v, u);
      r.frames[at].predict = pred;
    }
    stack.pop(); done.add(u);
    r.frame(`${u} has no unvisited neighbours left, so dfs(${u}) returns: pop it off the stack${stack.length ? ` and resume ${stack[stack.length - 1]}` : ''}.`, side([], [u]));
  };
  visit(start);
  r.frame(`The stack is empty: DFS is finished. Visit order: ${order.join(', ')}.`, [...side().slice(0, 2), tvars({ answer: J(order) })]);
  return r.frames;
}

// ---- backtracking ------------------------------------------------------------------------------
// Keep nums.length <= 4 or the tree gets long. Final frame text var `answer` = JSON array of subsets.
export function subsetsBacktrackFrames(nums: number[]): Frame[] {
  const r = recorder();
  const nodes: RecursionView['nodes'] = [{ id: 'r', label: '[]', tone: 'solution' }];
  const found: string[] = ['[]'];
  const path: number[] = [];
  const view = (): View[] => [
    { kind: 'recursion', name: 'decision tree (each node = the path so far)', nodes: nodes.map(n => ({ ...n })) },
    { kind: 'text', vars: [{ name: 'path', value: J(path) }] },
    { kind: 'set', name: 'subsets found', items: [...found], changed: [found.length - 1] },
  ];
  const settle = (id: string, tone: RecTone) => { nodes.find(n => n.id === id)!.tone = tone; };
  r.frame(`Start with an empty path. The empty set is a valid subset, so record it. Then try adding each number in turn.`, view());
  const go = (from: number, id: string) => {
    for (let i = from; i < nums.length; i++) {
      path.push(nums[i]);
      const cid = `${id}.${i}`;
      nodes.forEach(n => { if (n.tone === 'solution') n.tone = 'exploring'; });
      nodes.push({ id: cid, parent: id, label: J(path), edge: `+${nums[i]}`, tone: 'solution' });
      found.push(J(path));
      r.frame(`Choose ${nums[i]}: path = ${J(path)}. Every path is a valid subset, so record it.`, view());
      go(i + 1, cid);
      path.pop();
      settle(cid, 'undone');
      nodes.forEach(n => { if (n.tone === 'solution') n.tone = 'exploring'; });
      r.frame(`Undo: take ${nums[i]} back off the path, giving ${J(path)}. This choice is fully explored, so we return to the caller and try its next option.`, view(), {
        question: `Everything below ${J([...path, nums[i]])} has been explored. What does backtracking do now?`,
        options: [`Pop ${nums[i]} off the path and try the next number`, 'Stop the whole algorithm', 'Clear the entire path and start over'], answer: 0,
        explain: `Backtracking undoes exactly the last choice (path.pop()) so the caller can try its next option with the same path it had before.`,
      });
    }
  };
  go(0, 'r');
  r.frame(`All choices are explored. ${found.length} subsets (2^${nums.length} = ${2 ** nums.length}).`, [view()[0], { kind: 'set', name: 'subsets found', items: [...found] }, tvars({ answer: J(found.map(s => JSON.parse(s))) })]);
  return r.frames;
}

// ---- dynamic programming -----------------------------------------------------------------------
// Final frame text var `answer` = fib(n).
export function fibDpFrames(n: number): Frame[] {
  const r = recorder();
  const dp: Val[] = Array.from({ length: n + 1 }, () => '?');
  const view = (tones: Record<number, CellTone> = {}, pointers: ArrayView['pointers'] = []): ArrayView => ({
    kind: 'array', name: 'dp', values: [...dp], tones: { ...Object.fromEntries(dp.map((v, i) => [i, v === '?' ? 'out' : 'done'])), ...tones }, pointers,
  });
  dp[0] = 0; if (n >= 1) dp[1] = 1;
  r.frame(`dp[i] means fib(i). Base cases come straight from the definition: dp[0] = 0${n >= 1 ? ', dp[1] = 1' : ''}. Every other cell is built from the two cells before it.`, [view(), tvars({ n })]);
  for (let i = 2; i <= n; i++) {
    const a = dp[i - 1] as number, b = dp[i - 2] as number, v = a + b;
    r.frame(`To fill dp[${i}] we only need dp[${i - 1}] = ${a} and dp[${i - 2}] = ${b}. They were computed earlier, so we reuse them instead of recursing again.`,
      [view({ [i - 1]: 'compared', [i - 2]: 'compared', [i]: 'active' }, [{ at: i, label: `i = ${i}`, tone: 'gold' }])]);
    dp[i] = v;
    r.frame(`dp[${i}] = dp[${i - 1}] + dp[${i - 2}] = ${a} + ${b} = ${v}.`, [view({ [i]: 'found' }, [{ at: i, label: `i = ${i}`, tone: 'gold' }])],
      { question: `dp[${i}] = dp[${i - 1}] + dp[${i - 2}] = ${a} + ${b} = ?`, ...numberChoices(v, i), explain: `${a} + ${b} = ${v}. The transition is dp[i] = dp[i-1] + dp[i-2].` });
  }
  r.frame(`The table is full. fib(${n}) = dp[${n}] = ${dp[n]}.`, [view({ [n]: 'found' }), tvars({ answer: dp[n] })]);
  return r.frames;
}

// 0/1 knapsack. Final frame text vars: `answer` = best value, `items` = JSON array of chosen item indices.
export function knapsackFrames(weights: number[], values: number[], capacity: number): Frame[] {
  const r = recorder();
  const n = weights.length;
  const table: (number | null)[][] = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: capacity + 1 }, (_, w) => (i === 0 || w === 0 ? 0 : null)));
  const dp = (i: number, w: number) => table[i][w] as number;
  const view = (tones: GridView['tones'] = []): GridView => ({
    kind: 'grid', name: 'dp[items considered][capacity]', cells: table.map(row => [...row]),
    rowLabels: ['none', ...weights.map((w, i) => `item ${i + 1} (w${w}, v${values[i]})`)], colLabels: Array.from({ length: capacity + 1 }, (_, w) => w), tones,
  });
  r.frame(`dp[i][w] = best value using only the first i items with capacity w. With no items, or capacity 0, the best value is 0, so row 0 and column 0 are zeros.`, [view()]);
  for (let i = 1; i <= n; i++) for (let w = 1; w <= capacity; w++) {
    const wt = weights[i - 1], val = values[i - 1], skip = dp(i - 1, w);
    const canTake = wt <= w, take = canTake ? val + dp(i - 1, w - wt) : -Infinity;
    const best = Math.max(skip, take);
    const compared: GridView['tones'] = [{ r: i - 1, c: w, tone: 'compared' }, ...(canTake ? [{ r: i - 1, c: w - wt, tone: 'compared' as CellTone }] : [])];
    const why = canTake
      ? `Item ${i} weighs ${wt}, which fits in capacity ${w}. Skip it: ${skip}. Take it: ${val} + dp[${i - 1}][${w - wt}] = ${val} + ${dp(i - 1, w - wt)} = ${take}. Keep the better one: ${best}.`
      : `Item ${i} weighs ${wt}, more than capacity ${w}, so it cannot be taken. Copy the cell above: dp[${i - 1}][${w}] = ${skip}.`;
    table[i][w] = best;
    r.frame(`dp[${i}][${w}]: ${why}`, [view([...compared, { r: i, c: w, tone: 'active' }])],
      canTake ? { question: `Capacity ${w}, item ${i} (weight ${wt}, value ${val}). Skip gives ${skip}, take gives ${take}. What goes in dp[${i}][${w}]?`, ...numberChoices(best, i + w), explain: `We keep the larger option: max(${skip}, ${take}) = ${best}.` } : undefined);
  }
  const chosen: number[] = [];
  const path: GridView['tones'] = [];
  for (let i = n, w = capacity; i > 0; i--) {
    path.push({ r: i, c: w, tone: 'found' });
    if (dp(i, w) !== dp(i - 1, w)) { chosen.unshift(i - 1); w -= weights[i - 1]; }
  }
  path.push({ r: 0, c: 0, tone: 'out' });
  r.frame(`The table is full: the best value is dp[${n}][${capacity}] = ${dp(n, capacity)}. Walking back up, a cell that differs from the one above means that item was taken.`, [view(path), tvars({ answer: dp(n, capacity), items: J(chosen) })]);
  return r.frames;
}

// ---- linked list -------------------------------------------------------------------------------
// Final frame text var `answer` = reversed values as JSON array.
export function reverseListFrames(values: Val[]): Frame[] {
  const r = recorder();
  const n = values.length;
  const views = (k: number, flipped: boolean, vars: Record<string, Val>, prevVars?: Record<string, Val>): View[] => {
    const rev = values.slice(0, k + (flipped ? 1 : 0)).reverse();
    const rest = values.slice(k + (flipped ? 1 : 0));
    return [
      { kind: 'array', name: 'reversed so far', values: [...rev, 'null'], join: '→', tones: { ...(flipped && k < n ? { 0: 'active' as CellTone } : {}), [rev.length]: 'out' } },
      { kind: 'array', name: 'still to do', values: rest.length ? [...rest, 'null'] : ['null'], join: '→', indices: false,
        pointers: !flipped && k < n ? [{ at: 0, label: 'curr', tone: 'gold' }] : [], tones: { [rest.length]: 'out' } },
      tvars(vars, prevVars),
    ];
  };
  const nm = (i: number) => (i >= n ? 'null' : String(values[i]));
  r.frame(`The list is ${values.join(' → ')} → null. We build the reversed list at the front by re-pointing one arrow at a time. prev starts as null, curr at the head.`, views(0, false, { prev: 'null', curr: nm(0) }));
  for (let k = 0; k < n; k++) {
    const prev = k ? String(values[k - 1]) : 'null';
    r.frame(`Save next = curr.next = ${nm(k + 1)} first. In the next step we overwrite curr.next, and without this saved reference the rest of the list would be lost.`,
      views(k, false, { prev, curr: nm(k), next: nm(k + 1) }, { prev, curr: nm(k) }),
      { question: `We are about to set curr.next = prev. Why do we save curr.next first?`, options: ['Because the rest of the list would become unreachable', 'Because the list needs a new tail node', 'To make the loop run faster'], answer: 0,
        explain: `Once curr.next points backwards, the only link to ${nm(k + 1)} and the rest is gone. next remembers it.` });
    r.frame(`Flip the arrow: curr.next = prev, so ${nm(k)} now points to ${prev}. ${nm(k)} joins the front of the reversed list.`, views(k, true, { prev, curr: nm(k), next: nm(k + 1) }));
    r.frame(`Move forward: prev = ${nm(k)}, curr = ${nm(k + 1)}.`, views(k + 1, false, { prev: nm(k), curr: nm(k + 1), next: nm(k + 1) }, { prev, curr: nm(k), next: nm(k + 1) }));
  }
  r.frame(`curr is null, so every node has been flipped. prev is the new head: ${[...values].reverse().join(' → ')} → null.`, [
    { kind: 'array', name: 'reversed list', values: [...[...values].reverse(), 'null'], join: '→', tones: { ...Object.fromEntries(values.map((_, i) => [i, 'found' as CellTone])), [n]: 'out' } },
    tvars({ answer: J([...values].reverse()) }),
  ]);
  return r.frames;
}
