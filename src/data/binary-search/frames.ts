// Dry-run frames for src/dsa-lessons/binary-search.mdx. Every generator replays the lesson's Java loop on a small
// input and ends with a text view holding `answer` (pinned against brute force in tests/binary-search-frames.test.ts).
// The live range [lo, hi] is drawn normally; every index outside it is faded ('out') because it is eliminated.
import { recorder, tvars, type ArrayView, type CellTone, type Frame, type Predict, type Val, type View } from '../../lib/dryrun.ts';

const J = JSON.stringify;
const END = 'end';

let slot = 0;
// Two-way predict; the right option alternates sides so the first option is not always correct.
function yn(question: string, right: string, wrong: string, explain: string): Predict {
  const flip = slot++ % 2 === 1;
  return { question, options: flip ? [wrong, right] : [right, wrong], answer: flip ? 1 : 0, explain };
}

function strip(name: string, cells: Val[], lo: number, hi: number, mid?: number, o: { indices?: boolean; regions?: ArrayView['regions']; found?: number } = {}): ArrayView {
  const tones: Record<number, CellTone> = {};
  cells.forEach((_, i) => { if (i < lo || i > hi) tones[i] = 'out'; });
  if (mid !== undefined) tones[mid] = 'compared';
  if (o.found !== undefined) tones[o.found] = 'found';
  const pointers: ArrayView['pointers'] = lo <= hi ? [{ at: lo, label: lo === hi ? 'lo = hi' : 'lo', tone: 'gold' }] : [];
  if (lo < hi) pointers.push({ at: hi, label: 'hi', tone: 'blue' });
  if (mid !== undefined) pointers.push({ at: mid, label: 'mid', tone: 'purple' });
  return { kind: 'array', name, values: cells, indices: o.indices ?? true, pointers, tones, ...(o.regions ? { regions: o.regions } : {}) };
}

interface Ask { yes: boolean; test: string; yesWhy: string; noWhy: string }
interface Run {
  name: string; cells: Val[]; lo: number; hi: number; intro: string;
  ask: (mid: number, lo: number, hi: number) => Ask;
  pos?: (i: number) => Val;             // what lo / hi / mid are called in the variables panel (default: the index)
  indices?: boolean; regions?: ArrayView['regions'];
  extra?: (lo: number, hi: number) => Record<string, Val>;
}

// The one template: first yes over FFFF|TTTT. Candidates for the first yes are always [lo, hi].
function boundary(o: Run): { frames: Frame[]; lo: number } {
  const r = recorder(), pos = o.pos ?? ((i: number) => i);
  let lo = o.lo, hi = o.hi;
  const vars = (mid?: number) => ({ lo: pos(lo), hi: pos(hi), ...(mid !== undefined ? { mid: pos(mid) } : {}), candidates: hi - lo + 1, ...(o.extra ? o.extra(lo, hi) : {}) });
  const view = (mid?: number) => strip(o.name, o.cells, lo, hi, mid, { indices: o.indices, regions: o.regions });
  let prev = vars();
  r.frame(`${o.intro} The first yes is somewhere in [${pos(lo)}, ${pos(hi)}]: ${hi - lo + 1} candidates. Each step will eliminate about half of them.`, [view(), tvars(prev)]);
  while (lo < hi) {
    const mid = lo + Math.floor((hi - lo) / 2), a = o.ask(mid, lo, hi), before = hi - lo + 1;
    const how = o.pos ? `The middle candidate is ${pos(mid)}` : `mid = ${lo} + (${hi} - ${lo}) / 2 = ${mid}`;
    r.frame(`${how}. Ask the question there: ${a.test}`, [view(mid), tvars(vars(mid), prev)]);
    const [oldLo, oldHi] = [lo, hi];
    if (a.yes) hi = mid; else lo = mid + 1;
    prev = vars();
    const at = o.pos ? `${pos(mid)}` : `index ${mid}`, gone = a.yes ? `everything after ${at}` : `${at} and everything before it`;
    r.frame(a.yes
      ? `Yes. ${a.yesWhy} The first yes is at mid or to its left, so eliminate ${gone}: hi = mid = ${pos(hi)}. Candidates: ${before} -> ${hi - lo + 1}.`
      : `No. ${a.noWhy} Eliminate ${gone}: lo = mid + 1 = ${pos(lo)}. Candidates: ${before} -> ${hi - lo + 1}.`,
      [view(), tvars(prev, { ...vars(), lo: pos(oldLo), hi: pos(oldHi) })],
      yn(`${a.test} Which half of the candidates [${pos(oldLo)}, ${pos(oldHi)}] is eliminated?`,
        a.yes ? `After mid: hi = mid` : `Mid and before: lo = mid + 1`, a.yes ? `Mid and before: lo = mid + 1` : `After mid: hi = mid`,
        a.yes ? 'A yes keeps mid as a candidate (it may be the first yes) and removes only what comes after it.' : 'A no proves mid and everything below it are also no, so none of them is the first yes.'));
  }
  return { frames: r.frames, lo };
}

function finish(r: { frames: Frame[]; lo: number }, caption: string, answer: Val, o: { cells: Val[]; name: string; indices?: boolean; regions?: ArrayView['regions']; found?: number; vars?: Record<string, Val> }) {
  r.frames.push({ caption, views: [strip(o.name, o.cells, r.lo, r.lo, undefined, { indices: o.indices, regions: o.regions, found: o.found }), tvars({ ...(o.vars ?? {}), answer })] });
  return r.frames;
}

const withEnd = (a: Val[]) => [...a, END];

// ---- Chapter 1: Binary Search (first nums[i] >= target, then one check) ---------------------------
export function searchFrames(nums: number[], target: number): Frame[] {
  const n = nums.length, cells = withEnd(nums);
  const run = boundary({
    name: 'nums', cells, lo: 0, hi: n,
    intro: `Target ${target}. The question "nums[i] >= ${target}?" goes no, no, ..., yes, yes on sorted data. hi starts at n = ${n}, the "nowhere" slot.`,
    ask: mid => ({ yes: nums[mid] >= target, test: `nums[${mid}] = ${nums[mid]} >= ${target}?`,
      yesWhy: `${nums[mid]} >= ${target} and the array is sorted, so every index after mid is a yes too.`,
      noWhy: `${nums[mid]} < ${target} and the array is sorted, so every index up to mid is also a no.` }),
  });
  const hit = run.lo < n && nums[run.lo] === target;
  return finish(run, hit ? `lo == hi == ${run.lo}. One last check: nums[${run.lo}] = ${target}, so it is found at index ${run.lo}.`
    : run.lo === n ? `lo == hi == ${n}, the "nowhere" slot: no value is >= ${target}. Return -1 (never read nums[${n}]).`
    : `lo == hi == ${run.lo}, but nums[${run.lo}] = ${nums[run.lo]}, not ${target}. The first value >= ${target} is not the target, so return -1.`,
    hit ? run.lo : -1, { cells, name: 'nums', found: hit ? run.lo : undefined });
}

// ---- Chapter 2: first and last (the template run twice) ------------------------------------------
export function rangeFrames(nums: number[], target: number): Frame[] {
  const n = nums.length, cells = withEnd(nums);
  const mk = (strict: boolean) => boundary({
    name: 'nums', cells, lo: 0, hi: n,
    intro: strict ? `Second run: the first index with nums[i] > ${target}. The last copy sits just before it.` : `First run: the first index with nums[i] >= ${target}.`,
    ask: mid => {
      const yes = strict ? nums[mid] > target : nums[mid] >= target, op = strict ? '>' : '>=';
      return { yes, test: `nums[${mid}] = ${nums[mid]} ${op} ${target}?`,
        yesWhy: `Sorted data: every index after mid also satisfies ${op} ${target}.`, noWhy: `Sorted data: every index up to mid fails ${op} ${target} too.` };
    },
  });
  const a = mk(false), frames = [...a.frames];
  if (a.lo === n || nums[a.lo] !== target) {
    return finish({ frames, lo: a.lo }, `The first boundary is ${a.lo}${a.lo < n ? ` and nums[${a.lo}] = ${nums[a.lo]}, not ${target}` : ', past the end'}. The target is absent: return [-1, -1].`, J([-1, -1]), { cells, name: 'nums' });
  }
  frames.push({ caption: `nums[${a.lo}] = ${target}, so the target exists and its first copy is index ${a.lo}. Now run the same loop with a stricter question.`, views: [strip('nums', cells, a.lo, a.lo, undefined, { found: a.lo }), tvars({ first: a.lo })] });
  const b = mk(true);
  frames.push(...b.frames);
  return finish({ frames, lo: b.lo }, `The first index with nums[i] > ${target} is ${b.lo}, so the last copy is ${b.lo} - 1 = ${b.lo - 1}. The run of ${target}s is [${a.lo}, ${b.lo - 1}].`, J([a.lo, b.lo - 1]), { cells, name: 'nums', vars: { first: a.lo, 'after last': b.lo } });
}

// ---- Chapter 3: flattened matrix ------------------------------------------------------------------
export function matrixFrames(matrix: number[][], target: number): Frame[] {
  const rows = matrix.length, cols = matrix[0].length, flat = matrix.flat(), cells = withEnd(flat);
  const rowRegions: ArrayView['regions'] = matrix.map((_, r) => ({ from: r * cols, to: r * cols + cols - 1, label: `row ${r}`, tone: r % 2 ? 'purple' : 'blue' }));
  const run = boundary({
    name: 'cells in reading order', cells, lo: 0, hi: rows * cols, regions: rowRegions,
    intro: `Read the ${rows} x ${cols} grid row after row: it is one sorted line of ${rows * cols} cells. Cell k is at row k / ${cols}, column k % ${cols}.`,
    ask: mid => ({ yes: flat[mid] >= target, test: `cell ${mid} = (${Math.floor(mid / cols)}, ${mid % cols}) = ${flat[mid]} >= ${target}?`,
      yesWhy: 'Reading order is sorted, so every later cell is a yes too.', noWhy: 'Reading order is sorted, so every earlier cell is a no too.' }),
  });
  const k = run.lo, hit = k < rows * cols && flat[k] === target;
  return finish(run, hit ? `lo == hi == ${k}: cell ${k} is (${Math.floor(k / cols)}, ${k % cols}) = ${target}. Found.` : `lo == hi == ${k}, and that cell is not ${target}. Not in the grid.`, String(hit), { cells, name: 'cells in reading order', regions: rowRegions, found: hit ? k : undefined });
}

// ---- Chapter 4: rotated minimum -------------------------------------------------------------------
export function rotatedMinFrames(nums: number[]): Frame[] {
  const run = boundary({
    name: 'nums', cells: nums, lo: 0, hi: nums.length - 1,
    intro: 'The last value always belongs to the minimum\'s run, so "is nums[mid] <= nums[hi]?" is no for the higher run and yes from the minimum on. hi starts on the last index, a known yes.',
    ask: (mid, _lo, hi) => ({ yes: nums[mid] <= nums[hi], test: `nums[${mid}] = ${nums[mid]} <= nums[hi] = ${nums[hi]}?`,
      yesWhy: `${nums[mid]} is not above nums[hi], so mid is in the minimum's run; the minimum is at mid or to its left.`,
      noWhy: `${nums[mid]} is above nums[hi], so mid is in the higher run and the minimum is strictly to its right.` }),
  });
  return finish(run, `lo == hi == ${run.lo}: the minimum is ${nums[run.lo]}.`, nums[run.lo], { cells: nums, name: 'nums', found: run.lo });
}

// ---- Chapter 5 and Side quest 4: rotated search (ties only appear when values repeat) -----------
export function rotatedSearchFrames(nums: number[], target: number): Frame[] {
  const r = recorder();
  let lo = 0, hi = nums.length - 1;
  const state = (mid?: number) => ({ target, lo, hi, ...(mid !== undefined ? { mid } : {}), candidates: hi - lo + 1 });
  let prev = state();
  r.frame(`Looking for ${target}. Every index is a candidate. Each step finds a side of mid that is in plain sorted order and uses its two ends to decide.`, [strip('nums', nums, lo, hi), tvars(prev)]);
  while (lo < hi) {
    const mid = lo + Math.floor((hi - lo) / 2), before = hi - lo + 1;
    if (nums[mid] === nums[hi]) {
      r.frame(`mid = ${mid}. nums[mid] = nums[hi] = ${nums[hi]}: with repeats a tie cannot say which side is in order.`, [strip('nums', nums, lo, hi, mid), tvars(state(mid), prev)]);
      const oldHi = hi; hi--;
      r.frame(`Eliminate only index ${oldHi}: hi = ${hi}. That is safe because mid holds the same value and stays in range. Candidates: ${before} -> ${hi - lo + 1}.`,
        [strip('nums', nums, lo, hi), tvars(state(), { ...prev, hi: oldHi })],
        yn(`nums[mid] = nums[hi] = ${nums[hi]}. What can the search safely eliminate?`, 'Just index hi (hi--)', 'The whole left or right half', 'A tie says nothing about sides, but hi has a twin at mid, so dropping hi loses no value.'));
      prev = state(); continue;
    }
    const rightOrdered = nums[mid] < nums[hi];
    const side = rightOrdered ? { from: mid, to: hi } : { from: lo, to: mid };
    const [a, b] = [nums[side.from], nums[side.to]];
    r.frame(rightOrdered ? `mid = ${mid}. nums[mid] = ${nums[mid]} < nums[hi] = ${nums[hi]}, so there is no drop between mid and hi: [mid..hi] holds ${a}..${b} in order.`
      : `mid = ${mid}. nums[mid] = ${nums[mid]} > nums[hi] = ${nums[hi]}, so the drop is after mid: [lo..mid] holds ${a}..${b} in order.`,
      [{ ...strip('nums', nums, lo, hi, mid), regions: [{ from: side.from, to: side.to, label: `in order: ${a}..${b}`, tone: 'gold' }] }, tvars(state(mid), prev)]);
    const [oldLo, oldHi] = [lo, hi];
    // Same decisions as the Java: the ordered side is kept only when the target lies between both of its ends.
    const inside = rightOrdered ? nums[mid] < target && target <= nums[hi] : nums[lo] <= target && target <= nums[mid];
    if (rightOrdered) { if (inside) lo = mid + 1; else hi = mid; } else if (inside) hi = mid; else lo = mid + 1;
    prev = state();
    const keptRight = lo > oldLo;
    r.frame(`${inside ? `${target} lies inside the ordered side's ends (${a}..${b}), so it can only be there: eliminate the other side.` : `${target} is outside the ordered side's ends (${a}..${b}), so it cannot be there: eliminate that side.`} ${keptRight ? `lo = ${lo}` : `hi = ${hi}`}. Candidates: ${before} -> ${hi - lo + 1}.`,
      [strip('nums', nums, lo, hi), tvars(prev, { ...prev, lo: oldLo, hi: oldHi })],
      yn(`Ordered side holds ${a}..${b}; target is ${target}. Which half survives?`, keptRight ? 'The right part: lo moves up' : 'The left part: hi moves down', keptRight ? 'The left part: hi moves down' : 'The right part: lo moves up',
        inside ? 'Inside both ends means it can only be on the ordered side.' : 'Outside either end means the ordered side cannot hold it.'));
  }
  const hit = nums[lo] === target;
  r.frame(hit ? `lo == hi == ${lo} and nums[${lo}] = ${target}. Found.` : `lo == hi == ${lo} and nums[${lo}] = ${nums[lo]}, not ${target}. Not present.`,
    [strip('nums', nums, lo, lo, undefined, { found: hit ? lo : undefined }), tvars({ answer: hit ? lo : -1 })]);
  return r.frames;
}

// ---- Chapters 6, 7, 8 and Side quest 5: search the answer ---------------------------------------
const ceilDiv = (a: number, b: number) => Math.floor((a + b - 1) / b);
const hoursAt = (piles: number[], k: number) => piles.reduce((t, p) => t + ceilDiv(p, k), 0);

export function speedFrames(piles: number[], h: number): Frame[] {
  const top = Math.max(...piles), cells = Array.from({ length: top }, (_, i) => i + 1);
  const run = boundary({
    name: 'candidate speeds', cells, lo: 0, hi: top - 1, indices: false, pos: i => cells[i],
    intro: `Piles ${J(piles)}, ${h} hours. Nothing is sorted, but "can she finish at speed k?" flips once as k grows. Search the speeds 1..${top}; at speed ${top} every pile takes one hour, so ${top} is a known yes.`,
    ask: mid => { const k = cells[mid], hrs = hoursAt(piles, k);
      return { yes: hrs <= h, test: `speed ${k}: hours = ${piles.map(p => `ceil(${p}/${k})`).join(' + ')} = ${hrs} <= ${h}?`,
        yesWhy: `Speed ${k} is fast enough, and so is every faster speed, so none of those can be the slowest.`,
        noWhy: `Speed ${k} is too slow, and so is every slower speed.` }; },
  });
  return finish(run, `lo == hi: the slowest speed that finishes in ${h} hours is ${cells[run.lo]}.`, cells[run.lo], { cells, name: 'candidate speeds', indices: false, found: run.lo });
}

function capacityFrames(weights: number[], groups: number, unit: string, thing: string, loWhy: string): Frame[] {
  const lo0 = Math.max(...weights), sum = weights.reduce((a, b) => a + b, 0), cells = Array.from({ length: sum - lo0 + 1 }, (_, i) => lo0 + i);
  const pack = (cap: number) => { const gs: number[][] = [[]]; let load = 0; for (const w of weights) { if (load + w > cap) { gs.push([]); load = 0; } gs[gs.length - 1].push(w); load += w; } return gs; };
  const run = boundary({
    name: `candidate ${thing}`, cells, lo: 0, hi: cells.length - 1, indices: false, pos: i => cells[i],
    intro: `${J(weights)} in this order, at most ${groups} ${unit}s. ${loWhy} Bounds: ${lo0} (the largest value) to ${sum} (everything in one ${unit}). ${sum} always works, so it is a known yes.`,
    ask: mid => { const cap = cells[mid], gs = pack(cap);
      return { yes: gs.length <= groups, test: `${thing} ${cap}: greedy ${unit}s ${gs.map(g => `[${g.join(',')}]`).join('')} = ${gs.length} <= ${groups}?`,
        yesWhy: `${thing} ${cap} fits, and so does any larger one, so none of those can be the smallest.`,
        noWhy: `${thing} ${cap} needs too many ${unit}s, and so does any smaller one.` }; },
  });
  return finish(run, `lo == hi: the smallest ${thing} that works is ${cells[run.lo]}.`, cells[run.lo], { cells, name: `candidate ${thing}`, indices: false, found: run.lo });
}
export const shipFrames = (weights: number[], days: number) => capacityFrames(weights, days, 'day', 'capacity', 'A barge smaller than the heaviest crate can never ship it.');
export const splitFrames = (nums: number[], k: number) => capacityFrames(nums, k, 'piece', 'cap', 'A cap smaller than the largest value cannot hold it.');

export function maxDistanceFrames(position: number[], m: number): Frame[] {
  const p = [...position].sort((a, b) => a - b), span = p[p.length - 1] - p[0] + 1, cells = Array.from({ length: span }, (_, i) => i + 1);
  const placed = (gap: number) => { let c = 1, last = p[0]; const at = [p[0]]; for (const x of p) if (x - last >= gap) { c++; last = x; at.push(x); } return { c, at }; };
  const run = boundary({
    name: 'candidate gaps', cells, lo: 0, hi: span - 1, indices: false, pos: i => cells[i],
    intro: `Stalls ${J(p)}, ${m} birds. Larger gaps are harder, so "does gap d work?" goes yes..yes, no..no. Flip it: ask "does gap d FAIL?" (fewer than ${m} birds fit), which goes no..no, yes..yes. Gap ${span} always fails.`,
    ask: mid => { const gap = cells[mid], pl = placed(gap);
      return { yes: pl.c < m, test: `gap ${gap}: birds at ${pl.at.join(', ')} = ${pl.c} < ${m}? (fails)`,
        yesWhy: `Gap ${gap} fails, and so does every larger gap, so the first failing gap is at mid or smaller.`,
        noWhy: `Gap ${gap} works, and so does every smaller gap, so the first failing gap is bigger.` }; },
  });
  return finish(run, `lo == hi: the first failing gap is ${cells[run.lo]}, so the largest gap that works is ${cells[run.lo]} - 1 = ${cells[run.lo] - 1}.`, cells[run.lo] - 1, { cells, name: 'candidate gaps', indices: false, found: run.lo });
}

export function sqrtFrames(x: number): Frame[] {
  const cells = Array.from({ length: x + 2 }, (_, i) => i);
  const run = boundary({
    name: 'candidates k', cells, lo: 0, hi: x + 1, indices: false, pos: i => cells[i],
    intro: `Largest k with k * k <= ${x}. Ask "is k * k > ${x}?": no..no, yes..yes. Start hi at ${x + 1}, whose square always overshoots.`,
    ask: mid => ({ yes: mid * mid > x, test: `${mid} * ${mid} = ${mid * mid} > ${x}?`,
      yesWhy: `${mid} overshoots, and so does every larger k.`, noWhy: `${mid} fits, and so does every smaller k.` }),
  });
  return finish(run, `lo == hi == ${run.lo} is the first k that overshoots, so the answer is ${run.lo} - 1 = ${run.lo - 1}.`, run.lo - 1, { cells, name: 'candidates k', indices: false, found: run.lo - 1 >= 0 ? run.lo - 1 : undefined });
}

export function kthFrames(matrix: number[][], k: number): Frame[] {
  const n = matrix.length, lo0 = matrix[0][0], hi0 = matrix[n - 1][n - 1], cells = Array.from({ length: hi0 - lo0 + 1 }, (_, i) => lo0 + i);
  const count = (v: number) => matrix.flat().filter(x => x <= v).length;
  const run = boundary({
    name: 'candidate values', cells, lo: 0, hi: cells.length - 1, indices: false, pos: i => cells[i],
    intro: `Rows and columns are sorted, but positions do not flatten. Search the values ${lo0}..${hi0} instead: "are at least ${k} values <= v?" goes no..no, yes..yes. The largest value is a known yes.`,
    ask: mid => { const v = cells[mid], c = count(v);
      return { yes: c >= k, test: `${c} values are <= ${v}; is that >= ${k}?`,
        yesWhy: `${v} is big enough, and so is every larger v, so the k-th smallest is at most ${v}.`, noWhy: `${v} is too small, and so is every smaller v.` }; },
  });
  return finish(run, `lo == hi: the first v with at least ${k} values <= v is ${cells[run.lo]}, and it occurs in the matrix.`, cells[run.lo], { cells, name: 'candidate values', indices: false, found: run.lo });
}

// ---- Chapter 9: time map, Side quests 1 and 2 ------------------------------------------------------
export function timeMapFrames(times: number[], values: string[], t: number): Frame[] {
  const n = times.length, cells = withEnd(times);
  const run = boundary({
    name: 'times', cells, lo: 0, hi: n,
    intro: `get at time ${t}: the latest entry with time <= ${t}. Search the first time > ${t}; the answer is the slot just before it.`,
    ask: mid => ({ yes: times[mid] > t, test: `times[${mid}] = ${times[mid]} > ${t}?`,
      yesWhy: 'Times are increasing, so every later entry is also after t.', noWhy: 'Times are increasing, so every earlier entry is also at or before t.' }),
  });
  return finish(run, run.lo === 0 ? `lo == hi == 0: even the first entry is after ${t}. Nothing was set yet, so return an empty string.` : `lo == hi == ${run.lo} is the first time after ${t}. The entry before it, index ${run.lo - 1} (time ${times[run.lo - 1]}), is the latest at or before ${t}: "${values[run.lo - 1]}".`,
    run.lo === 0 ? '(empty)' : values[run.lo - 1], { cells, name: 'times', found: run.lo > 0 ? run.lo - 1 : undefined });
}

export function insertPositionFrames(nums: number[], target: number): Frame[] {
  const n = nums.length, cells = withEnd(nums);
  const run = boundary({
    name: 'nums', cells, lo: 0, hi: n,
    intro: `Where would ${target} go? The first index with nums[i] >= ${target} is exactly the insert position.`,
    ask: mid => ({ yes: nums[mid] >= target, test: `nums[${mid}] = ${nums[mid]} >= ${target}?`,
      yesWhy: 'Sorted data: every later index is a yes too.', noWhy: 'Sorted data: every earlier index is a no too.' }),
  });
  return finish(run, `lo == hi == ${run.lo}. There is no equality check: ${target} goes at index ${run.lo}${run.lo === n ? ' (the end)' : ''}.`, run.lo, { cells, name: 'nums' });
}

export function peakFrames(nums: number[]): Frame[] {
  const run = boundary({
    name: 'nums (not sorted)', cells: nums, lo: 0, hi: nums.length - 1,
    intro: 'Not sorted, but the question "is nums[mid] > nums[mid + 1]?" (going downhill) goes no..no, yes..yes around a peak, and a peak is always inside the kept range.',
    ask: mid => ({ yes: nums[mid] > nums[mid + 1], test: `nums[${mid}] = ${nums[mid]} > nums[${mid + 1}] = ${nums[mid + 1]}?`,
      yesWhy: 'Downhill: walking left from mid either keeps rising to a peak or reaches the edge, so a peak is at mid or to its left.',
      noWhy: 'Uphill: a peak must be to the right of mid, so mid and everything before it can go.' }),
  });
  return finish(run, `lo == hi == ${run.lo}: nums[${run.lo}] = ${nums[run.lo]} is a peak.`, run.lo, { cells: nums, name: 'nums (not sorted)', found: run.lo });
}

// ---- Chapter 10: median of two sorted arrays ------------------------------------------------------
export function medianFrames(x: number[], y: number[]): Frame[] {
  const [a, b] = x.length <= y.length ? [x, y] : [y, x];
  const m = a.length, n = b.length, half = Math.floor((m + n + 1) / 2), r = recorder();
  let lo = 0, hi = m;
  const aCells = withEnd(a);
  const vars = (i?: number) => ({ lo, hi, ...(i !== undefined ? { i, j: half - i } : {}), candidates: hi - lo + 1 });
  const bView = (j?: number): View => ({ kind: 'array', name: 'b (longer)', values: b, pointers: j === undefined ? [] : [...(j > 0 ? [{ at: j - 1, label: 'b[j-1]', tone: 'blue' as const }] : []), ...(j < n ? [{ at: j, label: 'b[j]', tone: 'dim' as const }] : [])], tones: j !== undefined && j > 0 ? { [j - 1]: 'compared' } : {} });
  const aView = (i?: number) => strip('a (shorter): cut i sits before a[i]', aCells, lo, hi, i);
  let prev = vars();
  r.frame(`Left half takes half = (${m} + ${n} + 1) / 2 = ${half} values: i from a (the shorter list) and j = ${half} - i from b. Search the cut i in [0, ${m}]; the question is "a[i] >= b[j-1]?".`, [aView(), bView(), tvars(prev)]);
  while (lo < hi) {
    const i = lo + Math.floor((hi - lo) / 2), j = half - i, before = hi - lo + 1, yes = a[i] >= b[j - 1];
    r.frame(`i = ${i}, j = ${half} - ${i} = ${j}. Ask: a[${i}] = ${a[i]} >= b[${j - 1}] = ${b[j - 1]}?`, [aView(i), bView(j), tvars(vars(i), prev)]);
    const [oldLo, oldHi] = [lo, hi];
    if (yes) hi = i; else lo = i + 1;
    prev = vars();
    r.frame(yes ? `Yes: a already gives enough to the left (maybe too much), so the right cut is at i or smaller. Eliminate cuts after ${i}: hi = ${i}. Candidates: ${before} -> ${hi - lo + 1}.`
      : `No: b[${j - 1}] = ${b[j - 1]} is above a[${i}] = ${a[i]}, so b's left value would sit above a right value. a must give more: eliminate cuts up to ${i}: lo = ${i + 1}. Candidates: ${before} -> ${hi - lo + 1}.`,
      [aView(), bView(), tvars(prev, { ...prev, lo: oldLo, hi: oldHi })],
      yn(`a[${i}] = ${a[i]}, b[${j - 1}] = ${b[j - 1]}. Which cuts are eliminated?`, yes ? 'Cuts after i (hi = i)' : 'Cuts up to i (lo = i + 1)', yes ? 'Cuts up to i (lo = i + 1)' : 'Cuts after i (hi = i)',
        yes ? 'a[i] >= b[j-1] is the yes: this cut passes the check, so only smaller cuts can still improve it.' : 'b[j-1] > a[i] means too little of a is on the left; any smaller i is worse.'));
  }
  const i = lo, j = half - i, big = Number.MAX_SAFE_INTEGER;
  const leftMax = Math.max(i > 0 ? a[i - 1] : -big, j > 0 ? b[j - 1] : -big);
  const odd = (m + n) % 2 === 1, rightMin = Math.min(i < m ? a[i] : big, j < n ? b[j] : big);
  const median = odd ? leftMax : (leftMax + rightMin) / 2;
  r.frame(odd ? `lo == hi == ${i}, so j = ${j}. The total ${m + n} is odd: the median is the largest left value, ${leftMax}.` : `lo == hi == ${i}, so j = ${j}. The total ${m + n} is even: the median is the average of the largest left value ${leftMax} and the smallest right value ${rightMin}.`,
    [aView(), bView(j), tvars({ i, j, 'left max': leftMax, ...(odd ? {} : { 'right min': rightMin }), answer: median })]);
  return r.frames;
}

// ---- The off-by-one choices -----------------------------------------------------------------------
// Closed range [lo, hi] with lo <= hi and mid thrown away on every move (the classic exact-match form).
export function closedFrames(nums: number[], target: number): Frame[] {
  const r = recorder();
  let lo = 0, hi = nums.length - 1;
  const vars = (mid?: number) => ({ lo, hi, ...(mid !== undefined ? { mid } : {}), candidates: Math.max(0, hi - lo + 1) });
  const view = (mid?: number, found?: number) => strip('nums', nums, lo, hi, mid, { found });
  let prev = vars();
  r.frame(`Closed range: [lo, hi] = [0, ${hi}] holds every index that could still be the target. The loop runs while lo <= hi, because a single-index range (lo == hi) is still unchecked.`, [view(), tvars(prev)]);
  while (lo <= hi) {
    const mid = lo + Math.floor((hi - lo) / 2), v = nums[mid], before = hi - lo + 1;
    r.frame(`mid = ${lo} + (${hi} - ${lo}) / 2 = ${mid}. nums[${mid}] = ${v}; compare with ${target}.`, [view(mid), tvars(vars(mid), prev)]);
    if (v === target) { r.frame(`${v} == ${target}: return ${mid}.`, [view(mid, mid), tvars({ answer: mid })]); return r.frames; }
    const [oldLo, oldHi] = [lo, hi];
    if (v < target) lo = mid + 1; else hi = mid - 1;
    prev = vars();
    r.frame(v < target ? `${v} < ${target}: mid and everything before it are too small. Both moves throw mid away, so lo = mid + 1 = ${lo}. Candidates: ${before} -> ${Math.max(0, hi - lo + 1)}.`
      : `${v} > ${target}: mid and everything after it are too big. hi = mid - 1 = ${hi} (the -1 is needed because mid is already ruled out). Candidates: ${before} -> ${Math.max(0, hi - lo + 1)}.`,
      [view(), tvars(prev, { ...prev, lo: oldLo, hi: oldHi })],
      yn(`nums[mid] = ${v}, target = ${target}. In the closed form, what happens to hi and lo?`, v < target ? 'lo = mid + 1' : 'hi = mid - 1', v < target ? 'hi = mid - 1' : 'lo = mid + 1', 'Mid has been checked and failed, so it leaves the range on whichever side the move cuts.'));
  }
  r.frame(`lo (${lo}) is past hi (${hi}): the range is empty, so every index was eliminated and ${target} is not present.`, [view(), tvars({ answer: -1 })]);
  return r.frames;
}

// "Last index with nums[i] <= target" written with lo = mid. With the rounded-down mid it can stall forever;
// with the rounded-up mid it cannot. `round` picks the midpoint; the stalled run stops when a step changes nothing.
export function midRoundingFrames(nums: number[], target: number, round: 'down' | 'up'): Frame[] {
  const r = recorder();
  let lo = 0, hi = nums.length - 1;
  const vars = (mid?: number) => ({ lo, hi, ...(mid !== undefined ? { mid } : {}), candidates: hi - lo + 1 });
  const view = (mid?: number) => strip('nums', nums, lo, hi, mid);
  const mode = round === 'down' ? 'mid = lo + (hi - lo) / 2 (rounds down)' : 'mid = lo + (hi - lo + 1) / 2 (rounds up)';
  let prev = vars();
  r.frame(`Goal: the last index with nums[i] <= ${target}. This form keeps mid on a yes (lo = mid) and drops it on a no (hi = mid - 1), so the loop is while (lo < hi) with ${mode}.`, [view(), tvars(prev)]);
  for (let guard = 0; lo < hi && guard < 20; guard++) {
    const mid = lo + Math.floor((hi - lo + (round === 'up' ? 1 : 0)) / 2), yes = nums[mid] <= target, before = hi - lo + 1;
    r.frame(`mid = ${lo} + (${hi} - ${lo}${round === 'up' ? ' + 1' : ''}) / 2 = ${mid}. nums[${mid}] = ${nums[mid]} <= ${target}? ${yes ? 'Yes' : 'No'}.`, [view(mid), tvars(vars(mid), prev)]);
    const [oldLo, oldHi] = [lo, hi];
    if (yes) lo = mid; else hi = mid - 1;
    prev = vars();
    if (lo === oldLo && hi === oldHi) {
      r.frame(`lo = mid = ${lo}: nothing was eliminated (candidates stay at ${before}) and the next step will compute the same mid. The loop never ends. A move that can leave the range unchanged must never be paired with a rounded-down mid.`,
        [view(), tvars({ ...prev, answer: 'infinite loop' })]);
      return r.frames;
    }
    r.frame(yes ? `Yes: mid is a candidate for "last yes", so keep it and eliminate everything before it: lo = ${lo}. Candidates: ${before} -> ${hi - lo + 1}.` : `No: mid and everything after it are too big: hi = mid - 1 = ${hi}. Candidates: ${before} -> ${hi - lo + 1}.`,
      [view(), tvars(prev, { ...prev, lo: oldLo, hi: oldHi })],
      yn(`nums[mid] = ${nums[mid]}, target ${target}. What changes?`, yes ? 'lo = mid' : 'hi = mid - 1', yes ? 'hi = mid - 1' : 'lo = mid', yes ? 'A yes keeps mid because it may be the last yes.' : 'A no rules mid out, so hi steps below it.'));
  }
  const ans = nums[lo] <= target ? lo : -1;
  r.frame(`lo == hi == ${lo}. Check nums[${lo}] = ${nums[lo]} <= ${target}: ${ans === -1 ? 'no, so no value qualifies' : `yes, so index ${lo} is the last one`}. Rounding up guarantees mid > lo, so lo = mid always makes progress.`,
    [strip('nums', nums, lo, lo, undefined, { found: ans === -1 ? undefined : ans }), tvars({ answer: ans })]);
  return r.frames;
}
