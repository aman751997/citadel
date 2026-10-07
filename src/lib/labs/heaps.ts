// Playground for the heaps lesson: the door guard (top-k), sinking a value (sift-down),
// and the two-stand median dance. Every heap here is a real array heap, so the board shows
// exactly the array layout the lesson teaches.
import { makeLab, type LabBase, type LabRow } from '../lab.ts';

export type Cmp = (a: number, b: number) => number;
export const minFirst: Cmp = (a, b) => a - b;
export const maxFirst: Cmp = (a, b) => b - a;

// Same rules as java.util.PriorityQueue and the lesson's MinHeap: climb only while strictly
// better than the parent; sink toward the left child unless the right one is strictly better.
export function siftUp(h: number[], i: number, cmp: Cmp): void {
  while (i > 0) {
    const p = (i - 1) >> 1;
    if (cmp(h[p], h[i]) <= 0) return;
    [h[p], h[i]] = [h[i], h[p]];
    i = p;
  }
}
export function siftDown(h: number[], i: number, cmp: Cmp): void {
  for (;;) {
    const l = 2 * i + 1, r = l + 1;
    let best = i;
    if (l < h.length && cmp(h[l], h[best]) < 0) best = l;
    if (r < h.length && cmp(h[r], h[best]) < 0) best = r;
    if (best === i) return;
    [h[best], h[i]] = [h[i], h[best]];
    i = best;
  }
}
export function heapPush(h: number[], x: number, cmp: Cmp): void { h.push(x); siftUp(h, h.length - 1, cmp); }
export function heapPop(h: number[], cmp: Cmp): number {
  const top = h[0];
  const last = h.pop()!;
  if (h.length) { h[0] = last; siftDown(h, 0, cmp); }
  return top;
}
export function isHeap(h: number[], cmp: Cmp): boolean {
  return h.every((v, i) => i === 0 || cmp(h[(i - 1) >> 1], v) <= 0);
}

type Mode = 'guard' | 'sift' | 'median';
type Phase = 'offer' | 'push' | 'balance' | 'read';
export interface S extends LabBase {
  // guard
  stream: number[]; k: number; idx: number; heap: number[];
  // sift
  arr: number[]; at: number;
  // median
  low: number[]; high: number[]; phase: Phase; medians: number[];
}
const blank = { stream: [] as number[], k: 0, idx: 0, heap: [] as number[], arr: [] as number[], at: 0, low: [] as number[], high: [] as number[], phase: 'offer' as Phase, medians: [] as number[] };

export const guardCases = [
  { stream: [3, 2, 1, 5, 6, 4], k: 2 },
  { stream: [3, 2, 3, 1, 2, 4, 5, 5, 6], k: 4 },
  { stream: [7], k: 1 },
  { stream: [-1, -1, -1], k: 2 },
];
export const siftCases = [
  [7, 2, 3, 4, 5, 6],
  [9, 4, 2, 8, 5, 3],
  [6, 3, 3, 5, 4, 7],
  [5],
];
export const medianCases = [
  [5, 2, 8, 1, 9],
  [1, 2, 3, 4],
  [4, 4, 4],
  [] as number[],
];

// Build a starting state from any input (tests use this for random boards).
export function fromInput(mode: Mode, input: { stream?: number[]; k?: number; arr?: number[] }): S {
  const base = { ...blank, mode, done: false, moves: 0, message: 'Say what is settled, then choose the next move.' };
  if (mode === 'guard') return { ...base, stream: [...input.stream!], k: input.k! };
  if (mode === 'sift') return { ...base, arr: [...input.arr!] };
  return { ...base, stream: [...input.stream!] };
}

const nth = (k: number) => `${k}${k % 10 === 1 && k % 100 !== 11 ? 'st' : k % 10 === 2 && k % 100 !== 12 ? 'nd' : k % 10 === 3 && k % 100 !== 13 ? 'rd' : 'th'}`;
const heapRow = (name: string, h: number[], topLabel: string, tone?: 'hot' | 'done'): LabRow => ({
  name, empty: 'Empty',
  cells: h.map((v, i) => ({ value: String(v), label: i === 0 ? topLabel : `i=${i}`, tone: i === 0 ? tone : undefined })),
});
const streamRow = (stream: number[], idx: number, label = 'NEXT'): LabRow => ({
  name: 'Arrivals', empty: 'Nobody in the queue',
  cells: stream.map((v, i) => ({ value: String(v), label: i === idx ? label : undefined, tone: i < idx ? 'done' : i === idx ? 'hot' : undefined })),
});
const median = (low: number[], high: number[]) => low.length > high.length ? low[0] : (low[0] + high[0]) / 2;

// ---------- Mode 1: the door guard keeps the best k ----------
function guardExpected(s: S): string {
  if (s.idx >= s.stream.length) return 'done';
  if (s.heap.length < s.k) return 'admit';
  return s.stream[s.idx] > s.heap[0] ? 'replace' : 'reject';
}

// ---------- Mode 2: sink the root to its place ----------
function siftChildren(s: S) {
  const l = 2 * s.at + 1, r = l + 1;
  const hasL = l < s.arr.length, hasR = r < s.arr.length;
  let best = -1;
  if (hasL) best = l;
  if (hasR && s.arr[r] < s.arr[l]) best = r;
  return { l, r, hasL, hasR, best };
}
function siftExpected(s: S): string {
  const { l, best } = siftChildren(s);
  if (best === -1 || s.arr[best] >= s.arr[s.at]) return 'stop';
  return best === l ? 'left' : 'right';
}

// ---------- Mode 3: the median dance ----------
function medianExpected(s: S): string {
  if (s.phase === 'offer') return s.idx >= s.stream.length ? 'done' : 'offer';
  if (s.phase === 'push') return 'push';
  if (s.phase === 'balance') return s.high.length > s.low.length ? 'rebalance' : 'read';
  return 'read';
}

export const lab = makeLab<S>({
  guard: {
    name: 'The door guard · keep the best k',
    cases: guardCases.length,
    actions: [
      { action: 'admit', label: 'Admit: there is still room' },
      { action: 'replace', label: 'Beats the guard: evict the guard, admit' },
      { action: 'reject', label: 'Turn away: not better than the guard' },
      { action: 'done', label: 'Queue empty: the guard is the answer' },
    ],
    create: v => ({ ...blank, ...guardCases[v], stream: [...guardCases[v].stream], heap: [] }),
    expected: guardExpected,
    // Equal to the guard: replacing swaps in an identical value, so either verdict keeps the same k values.
    alsoValid: (s, action) => action === 'replace' && s.idx < s.stream.length && s.heap.length === s.k && s.stream[s.idx] === s.heap[0],
    apply: (s, action) => {
      const x = s.stream[s.idx];
      if (action === 'admit') { heapPush(s.heap, x, minFirst); s.idx++; s.message = `${x} walks in and climbs to its seat. Inside: ${s.heap.length} of ${s.k}. The guard (weakest inside) is now ${s.heap[0]}.`; }
      else if (action === 'replace') { const old = s.heap[0]; s.heap[0] = x; siftDown(s.heap, 0, minFirst); s.idx++; s.message = `${old} is evicted; ${x} takes the root seat and sinks to its place. New guard: ${s.heap[0]}.`; }
      else if (action === 'reject') { s.idx++; s.message = `${x} is not better than the guard ${s.heap[0]}, so it could never be among the best ${s.k}. Nothing inside changes.`; }
      else { s.done = true; s.message = s.heap.length ? `The guard ${s.heap[0]} is the weakest of the best ${s.k}: the ${nth(s.k)} largest.` : 'Nobody arrived, so there is no answer.'; }
    },
    reject: (s, action) => {
      const x = s.stream[s.idx], guard = s.heap[0], full = s.heap.length >= s.k;
      if (action === 'done') return `${s.stream.length - s.idx} arrival(s) still wait in the queue, starting with ${x}. Any of them might beat the guard.`;
      if (s.idx >= s.stream.length) return 'The queue is empty. Nobody is left to admit or turn away; read the answer from the guard.';
      if (action === 'admit') return `The gate already holds k = ${s.k}. Letting ${x} in without an eviction makes ${s.k + 1} inside, and the root would no longer be the ${nth(s.k)} largest.`;
      if (action === 'replace') return full ? `${x} is not bigger than the guard ${guard}. Evicting ${guard} for ${x} would make the group weaker, and ${guard} beats ${x}.` : `There is still room (${s.heap.length} of ${s.k}). Evicting now would throw away a value that may belong in the best ${s.k}.`;
      return full ? `${x} beats the guard ${guard}. Turning it away loses a value bigger than one already inside.` : `There is room for ${s.k - s.heap.length} more. Until the gate is full, every arrival is among the best ${s.k} seen so far.`;
    },
    view: s => [streamRow(s.stream, s.idx), heapRow('Inside the gate · min-heap array', s.heap, 'GUARD', 'hot')],
    describe: s => s.idx < s.stream.length
      ? `k = ${s.k}. Next arrival: ${s.stream[s.idx]}. Inside: ${s.heap.length} of ${s.k}${s.heap.length ? `, guard ${s.heap[0]}` : ''}.`
      : `k = ${s.k}. Queue empty. Inside: [${s.heap.join(', ')}].`,
  },
  sift: {
    name: 'Sink the root · sift-down',
    cases: siftCases.length,
    actions: [
      { action: 'left', label: 'Swap with the left child' },
      { action: 'right', label: 'Swap with the right child' },
      { action: 'stop', label: 'Stop: no child is smaller' },
    ],
    create: v => ({ ...blank, arr: [...siftCases[v]], at: 0 }),
    expected: siftExpected,
    alsoValid: (s, action) => {
      const { l, r, hasR } = siftChildren(s);
      return hasR && s.arr[l] === s.arr[r] && s.arr[l] < s.arr[s.at] && (action === 'left' || action === 'right');
    },
    apply: (s, action) => {
      if (action === 'stop') { s.done = true; s.message = `${s.arr[s.at]} is no bigger than its children. Every parent is ≤ its children again: a valid min-heap.`; return; }
      const c = action === 'left' ? 2 * s.at + 1 : 2 * s.at + 2;
      const sinking = s.arr[s.at], rising = s.arr[c];
      [s.arr[s.at], s.arr[c]] = [s.arr[c], s.arr[s.at]];
      s.message = `${rising} rises to index ${s.at}; ${sinking} sinks to index ${c}. ${rising} is ≤ both of its new children, so the seat above is settled.`;
      s.at = c;
    },
    reject: (s, action) => {
      const { l, r, hasL, hasR, best } = siftChildren(s);
      const v = s.arr[s.at];
      if (action === 'stop') return `${v} is bigger than its child ${s.arr[best]} at index ${best}. Stopping leaves a parent above a smaller child, so peek() would lie.`;
      if (action === 'left' && !hasL) return `Index ${s.at} has no left child (2·${s.at}+1 = ${l} is past the end). Nothing to swap with.`;
      if (action === 'right' && !hasR) return `Index ${s.at} has no right child (2·${s.at}+2 = ${r} is past the end).`;
      const c = action === 'left' ? l : r, other = action === 'left' ? r : l;
      if (s.arr[c] >= v) return `${s.arr[c]} is not smaller than ${v}. Swapping would put the bigger value on top. ${best !== -1 && s.arr[best] < v ? `Look at index ${best} instead.` : 'Nothing below is smaller: stop.'}`;
      return `${s.arr[c]} would rise above its sibling ${s.arr[other]}, which is smaller. Then the parent ${s.arr[c]} sits over a smaller child. Always swap with the SMALLER child.`;
    },
    view: s => [{
      name: 'Heap array · children of i are 2i+1 and 2i+2', empty: 'Empty',
      cells: s.arr.map((v, i) => {
        const { l, r } = siftChildren(s);
        const label = i === s.at ? 'SINKING' : !s.done && i === l ? 'LEFT' : !s.done && i === r ? 'RIGHT' : `i=${i}`;
        return { value: String(v), label, tone: s.done ? 'done' as const : i === s.at ? 'hot' as const : undefined };
      }),
    }],
    describe: s => {
      const { l, r, hasL, hasR } = siftChildren(s);
      return `Sinking ${s.arr[s.at]} at index ${s.at}. ${hasL ? `Left child ${s.arr[l]} (index ${l})` : 'No left child'}${hasR ? `, right child ${s.arr[r]} (index ${r}).` : hasL ? ', no right child.' : '.'}`;
    },
  },
  median: {
    name: 'Two stands · the running median',
    cases: medianCases.length,
    actions: [
      { action: 'offer', label: '1 · Offer the arrival to Low' },
      { action: 'push', label: "2 · Move Low's top up to High" },
      { action: 'rebalance', label: "3 · High is bigger: move High's top back to Low" },
      { action: 'read', label: 'Read the median' },
      { action: 'done', label: 'Stream finished' },
    ],
    create: v => ({ ...blank, stream: [...medianCases[v]], low: [], high: [], phase: 'offer', medians: [] }),
    expected: medianExpected,
    apply: (s, action) => {
      if (action === 'offer') { const x = s.stream[s.idx]; heapPush(s.low, x, maxFirst); s.phase = 'push'; s.message = `${x} enters through Low. Low's top is now ${s.low[0]}, which may be too big for the lower half.`; }
      else if (action === 'push') { const x = heapPop(s.low, maxFirst); heapPush(s.high, x, minFirst); s.phase = 'balance'; s.message = `${x}, the largest in Low, steps up to High. Every Low value ≤ every High value again.`; }
      else if (action === 'rebalance') { const x = heapPop(s.high, minFirst); heapPush(s.low, x, maxFirst); s.phase = 'read'; s.message = `${x}, the smallest in High, comes back down. Low holds one extra, never High.`; }
      else if (action === 'read') { const m = median(s.low, s.high); s.medians.push(m); s.idx++; s.phase = 'offer'; s.message = `Median ${m}: ${s.low.length > s.high.length ? `odd count, so Low's top ${s.low[0]}` : `even count, so (${s.low[0]} + ${s.high[0]}) / 2`}.`; }
      else { s.done = true; s.message = s.medians.length ? `Medians after each arrival: ${s.medians.join(', ')}.` : 'Nobody arrived; there was never a median to read.'; }
    },
    reject: (s, action) => {
      const expected = medianExpected(s);
      if (action === 'done') return `${s.stream.length - s.idx} number(s) still to come${s.phase !== 'offer' ? ', and the current one is mid-dance' : ''}.`;
      if (expected === 'done') return 'Every arrival has been placed and its median read. The stream is finished.';
      if (s.phase === 'offer') return action === 'read' ? `The median was already read for the last arrival. Next, ${s.stream[s.idx]} must enter through Low.` : `Nothing is waiting in the dance yet. Start by offering ${s.stream[s.idx]} to Low.`;
      if (s.phase === 'push') return action === 'read' ? `Low's top ${s.low[0]} may be bigger than High's smallest. Reading now could mix the halves. Push Low's top up first.` : `Step 2 always comes next: move Low's top (${s.low[0]}) up to High, so order between the halves is restored.`;
      if (s.phase === 'balance') return expected === 'rebalance'
        ? (action === 'read' ? `High has ${s.high.length}, Low has ${s.low.length}. With High bigger, Low's top is not the middle. Move High's top back first.` : `High has more values than Low (${s.high.length} vs ${s.low.length}). Fix the sizes before anything else.`)
        : (action === 'rebalance' ? `Sizes are ${s.low.length} (Low) and ${s.high.length} (High). Low may hold one extra, so no move is needed. Moving would make High smaller and break the rule the other way.` : `Both halves are in order and the sizes are right. Read the median.`);
      return `The dance for this arrival is complete. Read the median before the next arrival.`;
    },
    view: s => [
      streamRow(s.stream, s.idx, s.phase === 'offer' ? 'NEXT' : 'PLACING'),
      heapRow('Low · max-heap array (smaller half)', s.low, 'TOP', 'hot'),
      heapRow('High · min-heap array (larger half)', s.high, 'TOP', 'hot'),
      { name: 'Medians read so far', empty: 'None yet', cells: s.medians.map(m => ({ value: String(m), tone: 'done' as const })) },
    ],
    describe: s => `Step: ${s.phase === 'offer' ? (s.idx < s.stream.length ? `next arrival ${s.stream[s.idx]}` : 'stream exhausted') : s.phase === 'push' ? `placing ${s.stream[s.idx]}` : s.phase === 'balance' ? 'check sizes' : 'read the median'}. Low ${s.low.length} · High ${s.high.length}.`,
  },
}, 'Gold = the top of a heap or the value moving · green = settled · labels show array indexes');
