// Dry-run frames for src/dsa-lessons/heaps.mdx. Every generator replays the lesson's algorithm on a small input,
// drawing each heap twice (as a tree and as the array it is stored in). The last frame has a text view holding
// `answer`, which tests/heaps-frames.test.ts pins against a brute-force oracle.
import { recorder, tvars, type Frame, type View, type CellTone, type NodeTone, type Val } from '../../lib/dryrun.ts';

// t is the short label drawn in a tree circle; u (optional) is the longer label drawn in the array cell.
type Item = { key: number; t: string; u?: string; m?: number[] };
type Heap = { a: Item[]; before: (x: Item, y: Item) => boolean };
const minHeap = (): Heap => ({ a: [], before: (x, y) => x.key < y.key });
const maxHeap = (): Heap => ({ a: [], before: (x, y) => x.key > y.key });
const num = (key: number, extra: Partial<Item> = {}): Item => ({ key, t: String(key), ...extra });
const nth = (n: number) => `${n}${[11, 12, 13].includes(n % 100) ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
const J = (x: unknown) => JSON.stringify(x);
const q = (question: string, options: string[], answer: number, explain: string) => ({ question, options, answer, explain });
const swap = (a: Item[], i: number, j: number) => { [a[i], a[j]] = [a[j], a[i]]; };

function siftUp(h: Heap, i: number): number[] {
  const path = [i];
  while (i > 0) {
    const p = (i - 1) >> 1;
    if (!h.before(h.a[i], h.a[p])) break;
    swap(h.a, i, p); i = p; path.push(i);
  }
  return path;
}
function siftDown(h: Heap, i: number): number[] {
  const path = [i];
  for (;;) {
    const l = 2 * i + 1, r = l + 1;
    let m = i;
    if (l < h.a.length && h.before(h.a[l], h.a[m])) m = l;
    if (r < h.a.length && h.before(h.a[r], h.a[m])) m = r;
    if (m === i) return path;
    swap(h.a, i, m); i = m; path.push(i);
  }
}
const push = (h: Heap, x: Item) => { h.a.push(x); return siftUp(h, h.a.length - 1); };
function pop(h: Heap): { top: Item; path: number[] } {
  const top = h.a[0], last = h.a.pop()!;
  if (!h.a.length) return { top, path: [] };
  h.a[0] = last;
  return { top, path: siftDown(h, 0) };
}

// A heap drawn twice: the tree, then the array it is stored in. `path` is the walk the moving value just made
// (last entry = where it rests); `dead` marks entries that are physically present but no longer count.
function hv(name: string, h: Heap, path: number[] = [], dead: (x: Item) => boolean = () => false): View[] {
  const treeTones: Record<string, NodeTone> = {};
  const tones: Record<number, CellTone> = {};
  h.a.forEach((x, i) => { if (dead(x)) { treeTones[String(i)] = 'visited'; tones[i] = 'out'; } });
  path.forEach((p, k) => { const last = k === path.length - 1; treeTones[String(p)] = last ? 'current' : 'done'; tones[p] = last ? 'active' : 'swapped'; });
  return [
    { kind: 'tree', name: `${name} · tree`, array: h.a.map(x => x.t), tones: treeTones, path: path.map(String) },
    { kind: 'array', name: `${name} · array (row by row)`, values: h.a.map(x => x.u ?? x.t), pointers: h.a.length ? [{ at: 0, label: 'top' }] : [], tones },
  ];
}
const seen = (n: number, upTo: number): Record<number, CellTone> => Object.fromEntries(Array.from({ length: upTo }, (_, i) => [i, 'visited' as CellTone]).slice(0, n));
const strip = (name: string, values: Val[], i: number): View => ({
  kind: 'array', name, values, pointers: i < values.length ? [{ at: i, label: 'next', tone: 'blue' }] : [], tones: seen(values.length, i),
});

// ---- Chapter 1: sift-up and sift-down on a real heap --------------------------------------------------
// `heap` must be a valid min-heap array. Answer: the array after the push.
export function siftUpFrames(heap: number[], x: number): Frame[] {
  const r = recorder(), h = minHeap();
  h.a = heap.map(v => num(v));
  r.frame(`A valid min-heap: every parent is at most its children. The array lists the tree row by row. We will push ${x}.`, [...hv('heap', h), tvars({ pushing: x })]);
  h.a.push(num(x));
  let i = h.a.length - 1;
  r.frame(`Put ${x} in the next free seat, index ${i}, so the tree stays complete. Only ${x} can break the rule now, and only against its parent at index ${i === 0 ? 'none' : (i - 1) >> 1}.`, [...hv('heap', h, [i]), tvars({ pushing: x, at: i })]);
  const path = [i];
  while (i > 0) {
    const p = (i - 1) >> 1;
    if (h.a[p].key <= x) {
      r.frame(`Parent at index ${p} holds ${h.a[p].key}, which is at most ${x}. The rule holds, so ${x} stops here. Nothing above it can be affected: it never moved past anything.`,
        [...hv('heap', h, path), tvars({ pushing: x, at: i })],
        q(`${x} at index ${i}; parent (index ${p}) holds ${h.a[p].key}. What now?`, ['Swap with the parent', 'Stop: the rule holds'], 1, `${h.a[p].key} <= ${x}, so the parent may stay above.`));
      break;
    }
    swap(h.a, i, p); path.push(p);
    r.frame(`${x} is smaller than its parent ${h.a[i].key}, so they swap. The old parent moves down one row, and it is still at most everything below it. ${x} is now at index ${p}.`,
      [...hv('heap', h, [...path]), tvars({ pushing: x, at: p })],
      q(`${x} at index ${i}; parent (index ${p}) holds ${h.a[i].key}. What now?`, ['Swap with the parent', 'Stop: the rule holds'], 0, `${x} < ${h.a[i].key} breaks parent <= child, so they swap.`));
    i = p;
  }
  if (i === 0 && path.length > 1) r.frame(`${x} reached index 0, the root, so it has no parent. It is the new minimum. Each swap moved it up one row: at most log2 n swaps.`, [...hv('heap', h, path), tvars({ pushing: x, at: 0 })]);
  r.frame(`Done. Result array: ${h.a.map(v => v.key).join(', ')}.`, [...hv('heap', h, [i]), tvars({ answer: J(h.a.map(v => v.key)) })]);
  return r.frames;
}

// `heap` must be a valid, non-empty min-heap array. Answer: the array after the pop.
export function siftDownFrames(heap: number[]): Frame[] {
  const r = recorder(), h = minHeap();
  h.a = heap.map(v => num(v));
  const top = h.a[0].key;
  r.frame(`A valid min-heap. The minimum, ${top}, is at index 0. We will pop it.`, [...hv('heap', h), tvars({ popping: top })]);
  const last = h.a.pop()!;
  if (!h.a.length) {
    r.frame(`${top} was the only value, so the heap is now empty.`, [...hv('heap', h), tvars({ answer: '[]' })]);
    return r.frames;
  }
  h.a[0] = last;
  let i = 0;
  const path = [0];
  r.frame(`Remove the root and move the LAST value, ${last.key}, into the root seat. That keeps the tree complete, but ${last.key} is probably too big for the top.`, [...hv('heap', h, [0]), tvars({ popped: top, sinking: last.key })]);
  for (;;) {
    const l = 2 * i + 1, rt = l + 1, v = h.a[i].key;
    if (l >= h.a.length) {
      r.frame(`Index ${i} has no children, so ${v} cannot sink further. Done.`, [...hv('heap', h, path), tvars({ sinking: v, at: i })]);
      break;
    }
    const pick = rt < h.a.length && h.a[rt].key < h.a[l].key ? rt : l;
    const kids = rt < h.a.length ? `children ${h.a[l].key} (left) and ${h.a[rt].key} (right)` : `its only child ${h.a[l].key}`;
    if (h.a[pick].key >= v) {
      r.frame(`${v} has ${kids}. Neither is smaller, so the rule holds and ${v} stays.`, [...hv('heap', h, path), tvars({ sinking: v, at: i })],
        q(`${v} has ${kids}. What now?`, ['Swap with the left child', 'Swap with the right child', 'Stop: the rule holds'], 2, `No child is smaller than ${v}, so nothing above or below is out of order.`));
      break;
    }
    const side = pick === l ? 'left' : 'right';
    const options = ['Swap with the left child', 'Swap with the right child', 'Stop: the rule holds'];
    swap(h.a, i, pick); path.push(pick);
    r.frame(`${v} has ${kids}. Swap with the SMALLER child, ${h.a[i].key}: it then sits above its sibling and above ${v}, so the rule holds there. ${v} moves to index ${pick}.`,
      [...hv('heap', h, [...path]), tvars({ sinking: v, at: pick })],
      q(`${v} has ${kids}. Which way does it sink?`, options, side === 'left' ? 0 : 1, `The smaller child (${h.a[i].key}) is the only one that can safely become the parent.`));
    i = pick;
  }
  r.frame(`Result array: ${h.a.map(v => v.key).join(', ')}. The popped value was ${top}.`, [...hv('heap', h, [i]), tvars({ answer: J(h.a.map(v => v.key)) })]);
  return r.frames;
}

// ---- Chapter 2: Kth Largest (size-k min-heap) ---------------------------------------------------------
// Assumes 1 <= k <= nums.length. Answer: the kth largest.
export function kthLargestFrames(nums: number[], k: number): Frame[] {
  const r = recorder(), h = minHeap();
  const snap = () => ({ k, size: h.a.length, guard: h.a.length ? h.a[0].key : 'none' });
  let prev = snap();
  r.frame(`Keep a MIN-heap of the k = ${k} largest values seen so far. Its root is the smallest of them, the guard: a newcomer only has to beat the guard to get in.`, [strip('nums', nums, 0), ...hv('heap', h), tvars(snap())]);
  const opts = ['Admit it (room left)', 'Turn it away', 'Evict the guard, admit it'];
  nums.forEach((x, i) => {
    let path: number[] = [], caption: string, which: number, why: string;
    if (h.a.length < k) {
      path = push(h, num(x)); which = 0;
      caption = `${x}: the heap holds ${h.a.length - 1} of ${k} so far, so there is room. Offer it; it climbs to its seat.`;
      why = 'The heap is not full yet, so nobody has to leave.';
    } else if (x <= h.a[0].key) {
      which = 1;
      caption = `${x} is not bigger than the guard ${h.a[0].key}. At least ${k} values already seen are at least as big, so ${x} can never be among the ${k} largest. Turn it away; the heap does not change.`;
      why = `${x} <= ${h.a[0].key}: it cannot beat the weakest of the best ${k}.`;
    } else {
      const old = h.a[0].key;
      h.a[0] = num(x); path = siftDown(h, 0); which = 2;
      caption = `${x} beats the guard ${old}. That makes ${old} the ${nth(k + 1)} largest, so it leaves. ${x} takes the root seat and sinks to its place. New guard: ${h.a[0].key}.`;
      why = `${x} > ${old}: the guard is no longer among the ${k} largest.`;
    }
    r.frame(caption, [strip('nums', nums, i + 1), ...hv('heap', h, path), tvars(snap(), prev)], q(`Heap size ${which === 0 ? h.a.length - 1 : k}, next value ${x}. What happens?`, opts, which, why));
    prev = snap();
  });
  r.frame(`No values are left. The heap holds the ${k} largest, and its root, ${h.a[0].key}, is the weakest of them: the ${nth(k)} largest overall.`, [strip('nums', nums, nums.length), ...hv('heap', h), tvars({ ...snap(), answer: h.a[0].key }, prev)]);
  return r.frames;
}

// ---- Chapter 3: Top K Frequent (heap ordered by count) ------------------------------------------------
// Answer: JSON array of the k values, most frequent first (the problem promises the answer is unique).
export function topKFrequentFrames(nums: number[], k: number): Frame[] {
  const r = recorder(), h = minHeap();
  const count = new Map<number, number>();
  for (const x of nums) count.set(x, (count.get(x) ?? 0) + 1);
  const distinct = [...count.keys()];
  const entries = () => [...count.entries()].map(([v, c]) => [v, c] as [Val, Val]);
  const snap = () => ({ k, size: h.a.length, guardCount: h.a.length ? h.a[0].key : 'none' });
  let prev = snap();
  const view = (changed?: number[]): View => ({ kind: 'map', name: 'count (value to times seen)', entries: entries(), changed });
  r.frame(`Step 1: count every value with a hash map. Step 2: keep a MIN-heap of the k = ${k} values with the biggest counts. The heap compares COUNTS, never the values themselves.`, [view(), ...hv('heap (labels are counts)', h), tvars(snap())]);
  const opts = ['Admit it (room left)', 'Turn it away', 'Evict the guard, admit it'];
  distinct.forEach((v, i) => {
    const c = count.get(v)!;
    let path: number[] = [], which: number, caption: string;
    const item = num(c, { u: `${v}×${c}` });
    if (h.a.length < k) {
      path = push(h, item); which = 0;
      caption = `Value ${v} has count ${c}. The heap holds ${h.a.length - 1} of ${k}, so there is room: offer it.`;
    } else if (c <= h.a[0].key) {
      which = 1;
      caption = `Value ${v} has count ${c}, not more than the guard's count ${h.a[0].key}. ${k} values are already at least as frequent, so ${v} is out.`;
    } else {
      const old = h.a[0];
      h.a[0] = item; path = siftDown(h, 0); which = 2;
      caption = `Value ${v} has count ${c}, more than the guard's count ${old.key} (value ${old.u!.split('×')[0]}). The guard becomes the ${nth(k + 1)} most frequent and leaves; ${v} takes its seat.`;
    }
    r.frame(caption, [view([i]), ...hv('heap (labels are counts)', h, path), tvars(snap(), prev)], q(`Value ${v} has count ${c}. What happens?`, opts, which, which === 0 ? 'The heap is not full.' : which === 1 ? 'Its count does not beat the guard.' : 'Its count beats the guard, so the guard goes.'));
    prev = snap();
  });
  const result = [...h.a].sort((x, y) => y.key - x.key).map(x => Number(x.u!.split('×')[0]));
  r.frame(`All distinct values are offered. The heap holds the ${k} most frequent values. Poll them out and read the answer from most frequent to least: ${result.join(', ')}.`, [view(), ...hv('heap (labels are counts)', h), tvars({ ...snap(), answer: J(result) }, prev)]);
  return r.frames;
}

// ---- Chapter 4: K Closest Points (size-k MAX-heap by squared distance) ---------------------------------
// Answer: JSON array of the k points.
export function kClosestFrames(points: number[][], k: number): Frame[] {
  const r = recorder(), h = maxHeap();
  const d = (p: number[]) => p[0] * p[0] + p[1] * p[1];
  const name = (p: number[]) => `(${p[0]}, ${p[1]})`;
  const pts = points.map(p => `${name(p)} = ${d(p)}`);
  const pt = (p: number[]) => num(d(p), { u: `${d(p)} ${name(p)}`, m: p });
  const snap = () => ({ k, size: h.a.length, guardDistance: h.a.length ? h.a[0].key : 'none' });
  let prev = snap();
  r.frame(`Keep the k = ${k} points with the SMALLEST squared distance (x² + y²: same order as the real distance, no square root). The point in danger is the FARTHEST of the chosen ones, so this is a MAX-heap: the guard on top is the farthest point inside.`, [strip('points = squared distance', pts, 0), ...hv('heap', h), tvars(snap())]);
  const opts = ['Admit it (room left)', 'Turn it away', 'Evict the farthest, admit it'];
  points.forEach((p, i) => {
    const dist = d(p);
    let path: number[] = [], which: number, caption: string;
    if (h.a.length < k) {
      path = push(h, pt(p)); which = 0;
      caption = `${name(p)} is at squared distance ${dist}. Only ${h.a.length - 1} of ${k} are inside, so there is room: offer it.`;
    } else if (dist >= h.a[0].key) {
      which = 1;
      caption = `${name(p)} is at ${dist}, no closer than the guard (${h.a[0].key}, ${name(h.a[0].m!)}). ${k} points are already at least as close, so it is out.`;
    } else {
      const old = h.a[0];
      h.a[0] = pt(p); path = siftDown(h, 0); which = 2;
      caption = `${name(p)} is at ${dist}, closer than the guard ${old.key} (${name(old.m!)}). Smaller is better here, so the farthest point leaves and ${name(p)} takes its seat.`;
    }
    r.frame(caption, [strip('points = squared distance', pts, i + 1), ...hv('heap', h, path), tvars(snap(), prev)], q(`${name(p)} is at ${dist}. What happens?`, opts, which, which === 0 ? 'Not full yet.' : which === 1 ? 'Not closer than the farthest chosen point.' : 'Closer than the farthest chosen point: it takes that seat.'));
    prev = snap();
  });
  const ans = h.a.map(x => x.m!);
  r.frame(`All points are offered. The heap holds the ${k} closest: ${ans.map(name).join(', ')}.`, [strip('points = squared distance', pts, points.length), ...hv('heap', h), tvars({ ...snap(), answer: J(ans) }, prev)]);
  return r.frames;
}

// ---- Chapter 5: Find Median from Data Stream (two heaps) -----------------------------------------------
// Answer: JSON array of the median after each number.
export function medianFrames(stream: number[]): Frame[] {
  const r = recorder(), low = maxHeap(), high = minHeap(), medians: number[] = [];
  const both = (lp: number[] = [], hp: number[] = []) => [...hv('low · max-heap · smaller half', low, lp), ...hv('high · min-heap · larger half', high, hp)];
  const snap = (median: Val): Record<string, Val> => ({ lowSize: low.a.length, highSize: high.a.length, median });
  let prev = snap('–');
  r.frame('Two heaps. LOW is a max-heap holding the smaller half (its top is the biggest of the small values). HIGH is a min-heap holding the larger half (its top is the smallest of the big values). Promises: every value in low is at most every value in high, and low has the same size as high or one more. Then the median is at the tops.',
    [strip('stream', stream, 0), ...both(), tvars(prev)]);
  stream.forEach((x, i) => {
    const lp = push(low, num(x));
    r.frame(`${x} arrives. It ALWAYS enters through low, with no case analysis. It may be too big for low, which the next step fixes.`, [strip('stream', stream, i + 1), ...both(lp), tvars(snap('–'), prev)]);
    prev = snap('–');
    const moved = pop(low).top;
    const hp = push(high, moved);
    r.frame(`Low's top, ${moved.key}, moves up to high. It is the biggest of low plus the newcomer, so everything left in low is at most ${moved.key}, and ${moved.key} joins the larger half. Order restored: every low value is at most every high value.`,
      [strip('stream', stream, i + 1), ...both([], hp), tvars(snap('–'), prev)],
      q(`${x} is now in low. What is the next move of the routine?`, ["Move low's top to high", "Move high's top to low", 'Nothing: sizes are already fine'], 0, 'Sending low’s biggest value to high fixes the ordering however big the newcomer was.'));
    prev = snap('–');
    const needsBack = high.a.length > low.a.length;
    const before = [low.a.length, high.a.length];
    let lp2: number[] = [];
    if (needsBack) lp2 = push(low, pop(high).top);
    const med = low.a.length > high.a.length ? low.a[0].key : (low.a[0].key + high.a[0].key) / 2;
    medians.push(med);
    r.frame(needsBack
      ? `High has ${before[1]} values and low only ${before[0]}: high must never be bigger. Move high's top back to low. Sizes: low ${low.a.length}, high ${high.a.length}. ${high.a.length ? `The tops are ${low.a[0].key} and ${high.a[0].key}` : `Only low has values, so its top decides`}: median ${med}.`
      : `Low has ${low.a.length} values and high ${high.a.length}: low keeps the extra one, so no move is needed. ${low.a.length > high.a.length ? `Odd count: the median is low's top, ${med}.` : `Even count: the median is the average of the tops, ${low.a[0].key} and ${high.a[0].key}, which is ${med}.`}`,
      [strip('stream', stream, i + 1), ...both(lp2), tvars(snap(med), prev)],
      q(`Low has ${before[0]} values, high has ${before[1]}. Does high's top move back?`, ['Yes', 'No'], needsBack ? 0 : 1, needsBack ? 'High is bigger than low, which breaks the size promise.' : 'High is not bigger than low, so the sizes are fine.'));
    prev = snap(med);
  });
  r.frame(`Done. The medians after each number: ${medians.join(', ')}. Each add cost a few O(log n) heap moves; each median read is a peek or two: O(1).`, [strip('stream', stream, stream.length), ...both(), tvars({ ...prev, answer: J(medians) })]);
  return r.frames;
}

// ---- Chapter 6: Sliding Window Median (two heaps of indexes, lazy deletion) ----------------------------
// Assumes 1 <= k <= nums.length. Answer: JSON array of the window medians.
export function windowMedianFrames(nums: number[], k: number): Frame[] {
  const order = (a: number, b: number) => (nums[a] !== nums[b] ? (nums[a] < nums[b] ? -1 : 1) : a - b);
  const entry = (i: number): Item => ({ key: i, t: String(nums[i]), u: `${nums[i]}@${i}` });
  const low: Heap = { a: [], before: (x, y) => order(x.key, y.key) > 0 };
  const high: Heap = { a: [], before: (x, y) => order(x.key, y.key) < 0 };
  const r = recorder(), result: number[] = [];
  let lowLive = 0, highLive = 0, start = 0;
  const dead = (x: Item) => x.key < start;
  const both = (lp: number[] = [], hp: number[] = []) => [...hv('low (indexes) · max by value', low, lp, dead), ...hv('high (indexes) · min by value', high, hp, dead)];
  const win = (i: number): View => ({ kind: 'array', name: 'nums', values: nums, regions: i - k + 1 >= 0 ? [{ from: i - k + 1, to: i, label: 'window', tone: 'gold' }] : [], tones: Object.fromEntries(nums.map((_, j) => [j, j < i - k + 1 ? 'out' : j <= i ? 'visited' : 'compared']).filter(([, t]) => t !== 'compared')) });
  const vars = (prev?: Record<string, Val>) => tvars({ start, lowLive, highLive, lowSize: low.a.length, highSize: high.a.length }, prev);
  const snap = () => Object.fromEntries(vars().vars.map(v => [v.name, v.value]));
  const prune = (h: Heap) => { const gone: Item[] = []; while (h.a.length && dead(h.a[0])) gone.push(pop(h).top); return gone; };
  let prev = snap();
  r.frame(`Both heaps hold INDEXES, ordered by value then index, so every entry is distinct. Entries drawn faded are dead: their index is below start (they left the window) but they are still buried in the heap. Balance uses the LIVE counts, never the heap sizes. Window size k = ${k}.`, [win(-1), ...both(), vars()]);
  nums.forEach((_, i) => {
    let lp: number[] = [], hp: number[] = [];
    if (low.a.length === 0 || order(i, low.a[0].key) < 0) { lp = push(low, entry(i)); lowLive++; } else { hp = push(high, entry(i)); highLive++; }
    start = i - k + 1;
    const into = lp.length ? 'low' : 'high';
    r.frame(`Admit index ${i} (value ${nums[i]}) into ${into}: ${into === 'low' ? `it comes before low's top in (value, index) order, so it belongs to the smaller half` : `it is not before low's top, so it belongs to the larger half`}. Live counts: low ${lowLive}, high ${highLive}.`,
      [win(i), ...both(lp, hp), vars(prev)]);
    prev = snap();
    if (i - k >= 0) {
      const out = i - k;
      if (order(out, low.a[0].key) <= 0) lowLive--; else highLive--;
      const side = order(out, low.a[0].key) <= 0 ? 'low' : 'high';
      r.frame(`Retire index ${out} (value ${nums[out]}): it is ${side === 'low' ? 'at most' : 'bigger than'} low's top, so it sits in ${side}. Do NOT dig it out. Just lower ${side}'s live count to ${side === 'low' ? lowLive : highLive}. Its entry is now dead (faded).`,
        [win(i), ...both(), vars(prev)],
        q(`Index ${out} leaves the window but is buried in a heap. What do we do now?`, ['Remove it from the middle of the heap', 'Lower that side’s live count; leave the entry', 'Rebuild both heaps'], 1, 'Only the top of a heap can leave cheaply. The entry will be popped later, when it surfaces.'));
      prev = snap();
    }
    const gone = [...prune(low), ...prune(high)];
    let moved = '';
    if (lowLive > highLive + 1) { const m = pop(low).top; push(high, m); lowLive--; highLive++; moved = `Low has too many live entries (${lowLive + 1} vs ${highLive - 1}): move low's top (${nums[m.key]}) to high.`; gone.push(...prune(low)); }
    else if (highLive > lowLive) { const m = pop(high).top; push(low, m); highLive--; lowLive++; moved = `High has more live entries than low (${highLive + 1} vs ${lowLive - 1}): move high's top (${nums[m.key]}) to low.`; gone.push(...prune(high)); }
    let med = '';
    if (start >= 0) {
      const m = k % 2 === 1 ? nums[low.a[0].key] : (nums[low.a[0].key] + nums[high.a[0].key]) / 2;
      result.push(m); med = ` Window [${nums.slice(start, i + 1).join(', ')}]: median ${m}.`;
    }
    if (gone.length || moved || med) {
      r.frame(`${gone.length ? `Pop dead entries that reached a top: ${gone.map(g => g.u).join(', ')}. ` : ''}${moved || `Live counts are balanced (low ${lowLive}, high ${highLive}).`}${med} Both tops are live, so reading them is safe.`, [win(i), ...both(), vars(prev)]);
      prev = snap();
    }
  });
  r.frame(`Done. Window medians: ${result.join(', ')}. Dead entries leave only when they surface, so heap sizes can exceed the window size; the live counts are what stay balanced.`, [win(nums.length - 1), ...both(), tvars({ ...snap(), answer: J(result) })]);
  return r.frames;
}

// ---- Chapter 7: Merge K Sorted Lists (min-heap of heads) -----------------------------------------------
// Each list is sorted ascending. Answer: JSON array of the merged values.
export function mergeKFrames(lists: number[][]): Frame[] {
  const r = recorder(), h = minHeap(), out: number[] = [];
  const names = lists.map((_, i) => String.fromCharCode(65 + i));
  const pos = lists.map(() => 0);
  const rows = (): View[] => lists.map((l, i): View => ({
    kind: 'array', name: `list ${names[i]}`, values: l, join: '→', indices: false,
    pointers: pos[i] < l.length ? [{ at: pos[i], label: 'head', tone: 'blue' }] : [],
    tones: Object.fromEntries(l.map((_, j) => [j, j < pos[i] ? 'done' : 'active'] as [number, CellTone]).slice(0, pos[i] + 1)),
  }));
  const outView = (): View => ({ kind: 'array', name: 'merged output so far', values: out, indices: false });
  const item = (i: number) => num(lists[i][pos[i]], { u: `${lists[i][pos[i]]}(${names[i]})`, m: [i] });
  lists.forEach((l, i) => { if (l.length) push(h, item(i)); });
  r.frame(`Only the current head of each list can be the next output, because every list is sorted. Put exactly one head per non-empty list in a min-heap: ${h.a.length} entries.`, [...rows(), ...hv('heap of heads', h), outView()]);
  while (h.a.length) {
    const heads = [...new Set(h.a.map(x => x.key))].sort((a, b) => a - b);
    const { top } = pop(h);
    const li = top.m![0];
    out.push(top.key);
    pos[li]++;
    let path: number[] = [], tail: string;
    if (pos[li] < lists[li].length) { path = push(h, item(li)); tail = `List ${names[li]} sends its next value, ${lists[li][pos[li]]}, into the heap.`; }
    else tail = `List ${names[li]} has no more values, so nothing is pushed. The heap shrinks.`;
    r.frame(`Poll the smallest head: ${top.key} from list ${names[li]}. Everything still unannounced is at least that big, so it is next in the output. ${tail}`,
      [...rows(), ...hv('heap of heads', h, path), outView()],
      heads.length > 1 ? q('Which head is announced next?', heads.map(String), 0, `${heads[0]} is the smallest head, and every other value is behind a head that is at least as big.`) : undefined);
  }
  r.frame(`The heap is empty: every value has been announced, in sorted order. The heap never held more than ${lists.length} entries, which is why the cost is O(N log k) and not O(N log N).`, [...rows(), ...hv('heap of heads', h), tvars({ answer: J(out) })]);
  return r.frames;
}

// ---- Chapter 8: Task Scheduler (max-heap of counts + cooldown queue) ----------------------------------
// Answer: total time units, idle units included.
export function taskSchedulerFrames(tasks: string, n: number): Frame[] {
  const r = recorder();
  const cnt = new Map<string, number>();
  for (const c of tasks) cnt.set(c, (cnt.get(c) ?? 0) + 1);
  const ready = maxHeap();
  const label = (c: string, left: number) => num(left, { u: `${c}×${left}`, m: [c.charCodeAt(0)] });
  [...cnt.entries()].forEach(([c, left]) => push(ready, label(c, left)));
  const cooling: { item: Item; back: number }[] = [];
  const timeline: string[] = [];
  let time = 0;
  const coolView = (changed: number[] = [], removed: string[] = []): View => ({ kind: 'queue', name: 'cooldown queue (front = returns first)', items: cooling.map(c => `${c.item.u} back after unit ${c.back}`), changed, removed, note: 'empty' });
  const line = (): View => ({ kind: 'array', name: 'schedule so far', values: timeline, indices: false });
  r.frame(`The ready heap is a MAX-heap of copies left per task, so we always run the task with the most copies left: it has the longest chain of cooldowns ahead. After a task runs it waits n = ${n} units in the cooldown queue. If nothing is ready, that unit is idle (and still counts).`, [...hv('ready (max copies left)', ready), coolView(), line(), tvars({ time })]);
  while (ready.a.length || cooling.length) {
    time++;
    const hadReady = ready.a.length > 0;
    let ranText: string, path: number[] = [], changed: number[] = [];
    if (hadReady) {
      const { top } = pop(ready);
      const c = String.fromCharCode(top.m![0]), left = top.key - 1;
      timeline.push(c);
      ranText = `Unit ${time}: run ${c} (the ready task with the most copies left, ${top.key}). ${left > 0 ? `${left} left, so it rests until unit ${time + n} ends.` : `It is finished.`}`;
      if (left > 0) { cooling.push({ item: label(c, left), back: time + n }); changed = [cooling.length - 1]; }
    } else {
      timeline.push('·');
      ranText = `Unit ${time}: nothing is ready (every unfinished task is resting), so this unit is idle. Idle units count.`;
    }
    const removed: string[] = [];
    let backText = '';
    if (cooling.length && cooling[0].back === time) {
      const c = cooling.shift()!;
      path = push(ready, c.item); removed.push(`${c.item.u} back after unit ${c.back}`);
      backText = ` ${c.item.u} finishes its rest and returns to the ready heap.`;
    }
    r.frame(ranText + backText, [...hv('ready (max copies left)', ready, path), coolView(changed, removed), line(), tvars({ time, ready: ready.a.length, resting: cooling.length })],
      q(`Start of unit ${time}: ${hadReady ? `the ready heap has ${ready.a.length + (path.length ? -1 : 0) + 1} task(s)` : 'the ready heap is empty'}. What happens?`, ['Run the ready task with the most copies left', 'Idle: everything is resting'], hadReady ? 0 : 1, hadReady ? 'Something is ready, so run the one with the most copies left.' : 'Nothing is ready, so the unit is idle.'));
  }
  r.frame(`Both the heap and the queue are empty, so every task is done. Total time: ${time} units.`, [...hv('ready (max copies left)', ready), coolView(), line(), tvars({ answer: time })]);
  return r.frames;
}

// ---- Side quest 1: Kth Largest in a Stream -------------------------------------------------------------
// Answer: JSON array of the value returned by each add.
export function kthStreamFrames(k: number, start: number[], adds: number[]): Frame[] {
  const r = recorder(), h = minHeap(), res: number[] = [];
  const add = (x: number) => { let p: number[] = []; if (h.a.length < k) p = push(h, num(x)); else if (x > h.a[0].key) { h.a[0] = num(x); p = siftDown(h, 0); } return p; };
  start.forEach(add);
  r.frame(`The constructor feeds the starting numbers ${start.join(', ')} through the same add: the heap keeps the ${Math.min(k, start.length)} largest. The root, ${h.a[0]?.key ?? 'none'}, is the ${nth(k)} largest right now.`, [...hv('heap', h), tvars({ k, size: h.a.length })]);
  adds.forEach(x => {
    const before = h.a.length === k ? h.a[0].key : null;
    const p = add(x);
    res.push(h.a[0].key);
    r.frame(before === null ? `add(${x}): room left, so it goes in. The ${nth(k)} largest is the root: ${h.a[0].key}.`
      : x > before ? `add(${x}): beats the guard ${before}, which can never be the ${nth(k)} largest again (the heap only gets stronger). Swap it in. The ${nth(k)} largest is now ${h.a[0].key}.`
      : `add(${x}): not bigger than the guard ${before}, so the heap does not change. The ${nth(k)} largest is still ${h.a[0].key}.`,
    [...hv('heap', h, p), tvars({ add: x, returns: h.a[0].key })],
    q(`add(${x}): what does it return?`, [...new Set([h.a[0].key, before ?? h.a[0].key + 1, x + 1])].map(String), [...new Set([h.a[0].key, before ?? h.a[0].key + 1, x + 1])].indexOf(h.a[0].key), 'It is always the root of the size-k min-heap: the weakest of the k largest.'));
  });
  r.frame(`Every add cost O(log k) and the heap never grew past ${k}. Returned: ${res.join(', ')}.`, [...hv('heap', h), tvars({ answer: J(res) })]);
  return r.frames;
}

// ---- Side quest 2: Last Stone Weight (max-heap simulation) ---------------------------------------------
// Answer: weight of the last stone, 0 if none.
export function lastStoneFrames(stones: number[]): Frame[] {
  const r = recorder(), h = maxHeap();
  stones.forEach(s => push(h, num(s)));
  r.frame(`A MAX-heap of stone weights: each turn needs the two heaviest, and the leftover goes back in because it may be lighter than stones still waiting.`, [...hv('stones', h), tvars({ stones: h.a.length })]);
  while (h.a.length > 1) {
    const y = pop(h).top.key, x = pop(h).top.key;
    let p: number[] = [];
    if (y > x) p = push(h, num(y - x));
    r.frame(y === x ? `Smash ${y} and ${x}: equal stones both vanish. Nothing goes back.` : `Smash ${y} and ${x}: the lighter one shatters and the heavier loses ${x}, leaving ${y - x}. It goes back into the heap and finds its place.`,
      [...hv('stones', h, p), tvars({ smashed: `${y} + ${x}`, stones: h.a.length })],
      q(`The two heaviest are ${y} and ${x}. What goes back?`, ['Nothing (both vanish)', `The difference, ${y - x}`, 'Both stones'], y === x ? 0 : 1, y === x ? 'Equal stones destroy each other.' : 'Only the leftover weight survives.'));
  }
  const ans = h.a.length ? h.a[0].key : 0;
  r.frame(h.a.length ? `One stone is left: ${ans}.` : 'No stones are left: 0.', [...hv('stones', h), tvars({ answer: ans })]);
  return r.frames;
}

// ---- Side quest 3: Reorganize String (max-heap + a bench of one) --------------------------------------
// Answer: a valid rearrangement, or the word "impossible". `s` must be non-empty.
export function reorganizeFrames(s: string): Frame[] {
  const r = recorder(), h = maxHeap();
  const cnt = new Map<string, number>();
  for (const c of s) cnt.set(c, (cnt.get(c) ?? 0) + 1);
  const entry = (c: string, left: number) => num(left, { u: `${c}×${left}`, m: [c.charCodeAt(0)] });
  [...cnt.entries()].sort().forEach(([c, n]) => push(h, entry(c, n)));
  let out = '', benched: Item | null = null;
  const ex = (p: number[] = []): View[] => [...hv('heap (copies left)', h, p), { kind: 'text', name: 'built so far', vars: [{ name: 'output', value: out || '(empty)' }, { name: 'benched', value: benched ? benched.u! : 'none' }] }];
  r.frame(`Place the letter with the MOST copies left, but never the letter just placed. That letter sits on a bench of one for a turn, then returns to the max-heap. (This is the task scheduler with n = 1.)`, ex());
  while (h.a.length) {
    const { top } = pop(h);
    const c = String.fromCharCode(top.m![0]);
    out += c;
    const left = top.key - 1;
    let p: number[] = [];
    if (benched) p = push(h, benched);
    const back = benched ? ` ${benched.u} comes off the bench and returns to the heap.` : '';
    benched = left > 0 ? entry(c, left) : null;
    r.frame(`Place ${c} (most copies left, ${top.key}).${back} ${left > 0 ? `${c} has ${left} left and sits on the bench for one turn.` : `${c} is used up.`}`, ex(p));
  }
  r.frame(benched ? `The heap is empty but ${benched.u} is still on the bench: the only letter left would have to touch itself. Impossible.` : `Every letter is placed and no two neighbours match: ${out}.`, [...ex(), tvars({ answer: benched ? 'impossible' : out })]);
  return r.frames;
}

// ---- Side quest 4: IPO (min-heap by capital + max-heap by profit) --------------------------------------
// Answer: final capital.
export function ipoFrames(k: number, w0: number, profits: number[], capital: number[]): Frame[] {
  const r = recorder();
  const locked: Heap = { a: [], before: (x, y) => x.key < y.key };
  const open = maxHeap();
  let w = w0;
  profits.forEach((_, i) => push(locked, num(capital[i], { u: `need ${capital[i]}, +${profits[i]}`, m: [i] })));
  const boards = (lp: number[] = [], op: number[] = []) => [...hv('locked · min by capital', locked, lp), ...hv('open · max by profit', open, op), tvars({ coins: w })];
  r.frame(`Two heaps. LOCKED holds projects we cannot afford yet, cheapest requirement on top. OPEN holds the affordable ones, biggest profit on top. Coins only grow, so an unlocked project stays unlocked. We have ${w} coins and may do ${k} projects.`, boards());
  for (let round = 1; round <= k; round++) {
    const moved: number[] = [];
    let op: number[] = [];
    while (locked.a.length && locked.a[0].key <= w) { const t = pop(locked).top; op = push(open, num(profits[t.m![0]], { u: `+${profits[t.m![0]]}`, m: t.m })); moved.push(profits[t.m![0]]); }
    r.frame(`Round ${round}: unlock every project needing at most ${w} coins. ${moved.length ? `Moved to open: profits ${moved.join(', ')}.` : 'Nobody new becomes affordable.'}`, boards([], op));
    if (!open.a.length) {
      r.frame(`Open is empty: nothing is affordable now, and coins cannot grow without doing a project, so nothing will ever be. Stop with ${w} coins.`, [...boards(), tvars({ answer: w })]);
      return r.frames;
    }
    const profs = [...new Set(open.a.map(x => x.key))].sort((a, b) => a - b);
    const { top } = pop(open);
    w += top.key;
    r.frame(`Take the biggest profit on offer, ${top.key}. Doing it first can only raise our coins sooner, so nothing later becomes unaffordable. Coins: ${w}.`, boards(),
      profs.length > 1 ? q(`Affordable profits: ${profs.join(', ')}. Which project do we take?`, profs.map(String), profs.length - 1, 'The biggest profit: it never hurts to have more coins sooner.') : undefined);
  }
  r.frame(`${k} projects done. Final coins: ${w}.`, [...boards(), tvars({ answer: w })]);
  return r.frames;
}

// ---- Side quest 5: Smallest Range Covering Elements from K Lists ---------------------------------------
// Lists are sorted ascending and non-empty. Answer: JSON [lo, hi].
export function smallestRangeFrames(lists: number[][]): Frame[] {
  const r = recorder(), h = minHeap();
  const pos = lists.map(() => 0);
  const entry = (i: number) => num(lists[i][pos[i]], { u: `${lists[i][pos[i]]}(L${i + 1})`, m: [i] });
  const rows = (): View[] => lists.map((l, i): View => ({ kind: 'array', name: `list ${i + 1}`, values: l, indices: false, pointers: pos[i] < l.length ? [{ at: pos[i], label: 'cand', tone: 'blue' }] : [], tones: Object.fromEntries(l.map((_, j) => [j, 'visited' as CellTone]).slice(0, pos[i])) }));
  let max = -Infinity;
  lists.forEach((_, i) => { push(h, entry(i)); max = Math.max(max, lists[i][0]); });
  let bestLo = h.a[0].key, bestHi = max;
  const vars = (prev?: Record<string, Val>) => tvars({ min: h.a[0].key, max, bestLo, bestHi }, prev);
  const snap = () => Object.fromEntries(vars().vars.map(v => [v.name, v.value]));
  r.frame(`One candidate from every list sits in a min-heap. The range [heap min, running max] = [${h.a[0].key}, ${max}] already covers every list. To get a NARROWER range we must advance the list holding the minimum: advancing any other list only raises the max.`, [...rows(), ...hv('heap of candidates', h), vars()]);
  let prev = snap();
  for (;;) {
    const mn = pop(h).top, li = mn.m![0];
    const better = max - mn.key < bestHi - bestLo;
    const range = `[${mn.key}, ${max}] (width ${max - mn.key})`;
    if (better) { bestLo = mn.key; bestHi = max; }
    pos[li]++;
    if (pos[li] === lists[li].length) {
      r.frame(`Poll the minimum ${mn.key} (list ${li + 1}). Range ${range} ${better ? 'is narrower than the best, so record it' : 'is not narrower than the best'}. List ${li + 1} has no next value, so any later range would miss it entirely: stop. Answer: [${bestLo}, ${bestHi}].`,
        [...rows(), ...hv('heap of candidates', h), tvars({ min: mn.key, max, bestLo, bestHi, answer: J([bestLo, bestHi]) }, prev)]);
      return r.frames;
    }
    const nv = lists[li][pos[li]];
    const p = push(h, entry(li));
    max = Math.max(max, nv);
    r.frame(`Poll the minimum ${mn.key} (list ${li + 1}). Range ${range} ${better ? 'is narrower than the best, so record it' : 'is not narrower than the best'}. Advance list ${li + 1} to ${nv}${nv === max && nv > mn.key ? ' (a new maximum)' : ''}. The candidates now span [${h.a[0].key}, ${max}].`,
      [...rows(), ...hv('heap of candidates', h, p), vars(prev)],
      q('Which list do we advance?', lists.map((_, i) => `List ${i + 1}`), li, 'The one holding the minimum: advancing any other list only makes the range wider.'));
    prev = snap();
  }
}

// ---- Side quest 6: Kth Smallest in a Sorted Matrix (heap of row fronts) --------------------------------
// Rows and columns are sorted ascending, 1 <= k <= n*n. Answer: the kth smallest.
export function sortedMatrixFrames(matrix: number[][], k: number): Frame[] {
  const r = recorder(), h = minHeap();
  const n = matrix.length;
  const popped: { r: number; c: number }[] = [];
  const grid = (): View => ({
    kind: 'grid', name: 'matrix', cells: matrix, rowLabels: matrix.map((_, i) => `row ${i}`),
    tones: [...popped.map(p => ({ r: p.r, c: p.c, tone: 'done' as CellTone })), ...h.a.map(x => ({ r: x.m![0], c: x.m![1], tone: 'active' as CellTone }))],
  });
  const item = (row: number, c: number) => num(matrix[row][c], { u: `${matrix[row][c]}(r${row})`, m: [row, c] });
  for (let row = 0; row < Math.min(n, k); row++) push(h, item(row, 0));
  r.frame(`Every row is a sorted list, so this is merge-k in disguise. Seed a min-heap with the first cell of the first min(n, k) = ${Math.min(n, k)} rows. Each pop removes the next smallest value overall; the kth smallest is what remains on top after k − 1 pops.`, [grid(), ...hv('heap of row fronts', h), tvars({ discarded: 0, need: k - 1 })]);
  for (let taken = 1; taken < k; taken++) {
    const cur = pop(h).top, [row, c] = cur.m!;
    popped.push({ r: row, c });
    let p: number[] = [];
    if (c + 1 < n) p = push(h, item(row, c + 1));
    r.frame(`Pop ${cur.key} (row ${row}, column ${c}): it is number ${taken} in sorted order, so discard it. ${c + 1 < n ? `Push its right neighbour ${matrix[row][c + 1]}: the next candidate from that row.` : 'That row has no more cells.'}`, [grid(), ...hv('heap of row fronts', h, p), tvars({ discarded: taken, need: k - 1 })]);
  }
  r.frame(`${k - 1} values are discarded, so the root, ${h.a[0].key}, is the ${nth(k)} smallest. Duplicates count separately.`, [grid(), ...hv('heap of row fronts', h), tvars({ answer: h.a[0].key })]);
  return r.frames;
}
