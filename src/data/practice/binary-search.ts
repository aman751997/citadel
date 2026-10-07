// Independent practice for the Binary Search lesson. Prompts never name the pattern; inputs change with `variant`.
// Every answer is recomputed by an independent brute force in tests/binary-search.test.ts.
import type { Challenge, PracticeSet } from '../../lib/practice.ts';

export const strategies = {
  index: 'Narrow an index range with one yes/no test at the middle',
  rotated: 'Narrow a range by working out which side is still in order',
  answer: 'Guess the answer, test whether it is feasible, narrow the guesses',
  partition: 'Search for a cut position across two sorted lists',
  history: 'Keep ordered history per key; search it on each lookup',
  other: 'Use another tool; halving does not fit here',
} as const;
type Strategy = keyof typeof strategies;

export const conceptIds = [
  'search', 'range', 'matrix', 'rotated-min', 'rotated-search', 'koko', 'ship', 'split', 'timemap', 'median',
  'insert', 'peak', 'sqrt', 'rotated-dups', 'magnetic', 'kth-matrix', 'unsorted',
] as const;
type ConceptId = typeof conceptIds[number];

// Small deterministic generator so each (concept, variant) gives a fixed but different input.
function rng(seed: number) {
  let x = seed >>> 0; // mulberry32
  return (max: number) => {
    x = (x + 0x6d2b79f5) >>> 0;
    let t = Math.imul(x ^ (x >>> 15), 1 | x);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) % max;
  };
}
const arr = (a: (number | string)[]) => `[${a.join(', ')}]`;
const distinctSorted = (r: (m: number) => number, len: number, lo: number, hi: number) => {
  const set = new Set<number>();
  while (set.size < len) set.add(lo + r(hi - lo + 1));
  return [...set].sort((x, y) => x - y);
};
const rotate = (a: number[], k: number) => a.map((_, i) => a[(i + k) % a.length]);
const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);
const hours = (piles: number[], k: number) => piles.reduce((s, p) => s + Math.ceil(p / k), 0);
const greedyGroups = (a: number[], cap: number) => { let groups = 1, load = 0; for (const w of a) { if (load + w > cap) { groups++; load = 0; } load += w; } return groups; };
const ordinal = (k: number) => `${k}${k === 1 ? 'st' : k === 2 ? 'nd' : k === 3 ? 'rd' : 'th'}`;

const seedOf = (id: string) => [...id].reduce((h, ch) => Math.imul(h, 31) + ch.charCodeAt(0) >>> 0, 7);

export function challengeFor(id: ConceptId, variant = 0): Challenge {
  const r = rng(seedOf(id) + Math.imul(variant + 1, 0x9e3779b1));
  const base = (topic: string, section: string, strategy: Strategy) => ({ id, topic, section, strategy });
  switch (id) {
    case 'search': {
      const a = distinctSorted(r, 6 + r(3), -10, 30);
      let target = a[r(a.length)];
      if (variant % 3 === 2) { target = r(41) - 10; while (a.includes(target)) target++; }
      const answer = a.indexOf(target);
      return { ...base('Exact search in sorted data', 'exact-search', 'index'), prompt: `Sorted, distinct values ${arr(a)}. Return the index of ${target}, or -1 if it is absent. Use O(log n) time.`, question: 'Enter the index (or -1).', answer,
        hints: ['Which question about an index is no, no, …, yes, yes?', 'Ask "is nums[i] ≥ target?" and find the first yes.', 'Then check that the first yes exists and holds the target.'],
        rubric: ['lo = 0, hi = n; while lo < hi.', 'A yes keeps mid (hi = mid); a no skips it (lo = mid + 1).', 'After the loop, lo < n and nums[lo] == target, else -1.'],
        explanation: answer >= 0 ? `${target} sits at index ${answer}.` : `No value equals ${target}; the first value ≥ ${target} is at index ${a.findIndex(v => v >= target) === -1 ? a.length : a.findIndex(v => v >= target)}, and it is not ${target}.` };
    }
    case 'range': {
      const values: number[] = [];
      for (let i = 0, v = r(5); i < 8; i++) { values.push(v); if (r(2)) v += 1 + r(2); }
      const present = variant % 4 !== 3;
      let target = present ? values[r(values.length)] : values[0] - 1 + r(values[values.length - 1] - values[0] + 3);
      if (!present) while (values.includes(target)) target++;
      const first = values.indexOf(target), last = values.lastIndexOf(target);
      return { ...base('First and last copy', 'first-and-last', 'index'), prompt: `Sorted values with repeats: ${arr(values)}. Return the first and last positions of ${target}, or [-1, -1]. Use O(log n) time.`, question: 'Enter [first, last].', answer: [first, last],
        hints: ['Two boundaries, not one.', 'First index with value ≥ target; first index with value > target.', 'The last copy is one before the second boundary. Check the first boundary holds the target.'],
        rubric: ['Two runs of the same boundary template, with ≥ and with >.', 'Each run keeps true candidates and skips proven falses.', 'Return [-1, -1] if the first boundary is n or holds another value.'],
        explanation: first >= 0 ? `The copies of ${target} run from index ${first} to ${last}.` : `${target} does not appear.` };
    }
    case 'matrix': {
      const rows = 3, cols = 3 + r(2);
      const flat = distinctSorted(r, rows * cols, 1, 60);
      const grid = Array.from({ length: rows }, (_, i) => flat.slice(i * cols, (i + 1) * cols));
      let target = variant % 2 ? flat[r(flat.length)] : r(62);
      if (variant % 4 === 0) while (flat.includes(target)) target++;
      const answer = flat.includes(target);
      return { ...base('A grid that reads as one sorted line', 'flat-matrix', 'index'), prompt: `Each row is sorted, and each row starts above the previous row's last value. Rows: ${grid.map(arr).join(', ')}. Is ${target} in the grid? Use O(log(rows × cols)) time.`, question: 'Enter yes or no.', answer,
        hints: ['Read the rows one after another. What do you get?', 'Cell k is at row k / cols, column k % cols.', 'Run one boundary search over k in [0, rows × cols).'],
        rubric: ['Treat the grid as one sorted array of rows × cols cells.', 'Map mid to (mid / cols, mid % cols): divide by the column count.', 'Check the cell at lo after the loop.'],
        explanation: `${answer ? 'Yes' : 'No'}: flattened, the grid is ${arr(flat)}.` };
    }
    case 'rotated-min': {
      const a = distinctSorted(r, 5 + r(4), 0, 40);
      const k = variant % 5 === 4 ? 0 : r(a.length);
      const rotated = rotate(a, k);
      return { ...base('Lowest point of a rotated list', 'rotated-minimum', 'rotated'), prompt: `A sorted list of distinct values was rotated at an unknown point: ${arr(rotated)}. What is its smallest value? Use O(log n) time.`, question: 'Enter the value.', answer: a[0],
        hints: ['Split it into the run before the drop and the run after.', 'The last value is always in the run that holds the minimum.', 'nums[mid] > nums[hi]: go right of mid. Otherwise keep mid: hi = mid.'],
        rubric: ['lo = 0, hi = n − 1, while lo < hi.', 'Compare with nums[hi], which stays correct when nothing was rotated.', 'Return nums[lo].'],
        explanation: k === 0 ? `Not rotated at all: the minimum is the first value, ${a[0]}. A nums[lo] comparison would get this one wrong.` : `The drop is just before ${a[0]}.` };
    }
    case 'rotated-search': {
      const a = distinctSorted(r, 6 + r(3), 0, 40);
      const rotated = rotate(a, 1 + r(a.length - 1));
      let target = variant % 3 === 1 ? r(42) : rotated[r(rotated.length)];
      if (variant % 3 === 1) while (rotated.includes(target)) target++;
      const answer = rotated.indexOf(target);
      return { ...base('Exact search in a rotated list', 'rotated-search', 'rotated'), prompt: `Distinct values, sorted and then rotated: ${arr(rotated)}. Return the index of ${target}, or -1 if it is absent. Use O(log n) time.`, question: 'Enter the index (or -1).', answer,
        hints: ['At least one side of mid is in plain order.', 'nums[mid] < nums[hi] means [mid..hi] is in order; otherwise [lo..mid] is.', 'Check the target against BOTH ends of the ordered side.'],
        rubric: ['Decide which side is ordered from nums[mid] vs nums[hi].', 'Inside the ordered side (both ends checked): keep it; otherwise keep the other side, with mid kept when it could be the target.', 'After the loop, compare nums[lo] with the target.'],
        explanation: answer >= 0 ? `${target} is at index ${answer}.` : `${target} is not in the list.` };
    }
    case 'koko': {
      const piles = Array.from({ length: 3 + r(3) }, () => 1 + r(15));
      const h = piles.length + r(7);
      let k = 1; while (hours(piles, k) > h) k++;
      return { ...base('Slowest rate that still finishes', 'eating-speed', 'answer'), prompt: `A collector must clear piles ${arr(piles)} within ${h} hours. Each hour she takes from one pile only, up to k items; if the pile runs out early, the rest of that hour is idle. What is the smallest whole k that works?`, question: 'Enter k.', answer: k,
        hints: ['If k works, does k + 1 work?', 'hours(k) = sum of ceil(pile / k). The range is 1 to the biggest pile.', 'Find the first k with hours(k) ≤ h.'],
        rubric: ['The answer space 1..max(pile) has a no-then-yes feasibility row.', 'The checker rounds up per pile and sums in a long.', 'A yes keeps mid; a no skips it. Return lo.'],
        explanation: `k = ${k} needs ${hours(piles, k)} hours${k > 1 ? `; k = ${k - 1} needs ${hours(piles, k - 1)}` : ''}.` };
    }
    case 'ship': {
      const w = Array.from({ length: 5 + r(3) }, () => 1 + r(9));
      const days = 2 + r(3);
      let c = Math.max(...w); while (greedyGroups(w, c) > days) c++;
      return { ...base('Smallest daily capacity', 'ship-capacity', 'answer'), prompt: `Parcels weighing ${arr(w)} must ship in this order, one truckload per day, within ${days} days. What is the smallest truck capacity that works?`, question: 'Enter the capacity.', answer: c,
        hints: ['A bigger truck never needs more days.', 'Bounds: the heaviest parcel up to the total weight.', 'Greedy day count; first capacity whose count ≤ days.'],
        rubric: ['lo = max(weights) (a parcel must fit), hi = sum(weights).', 'daysNeeded loads in order and starts a new day on overflow.', 'Find the first capacity with daysNeeded ≤ days.'],
        explanation: `Capacity ${c} needs ${greedyGroups(w, c)} days; capacity ${c - 1} ${c - 1 >= Math.max(...w) ? `needs ${greedyGroups(w, c - 1)}` : 'cannot lift the heaviest parcel'}.` };
    }
    case 'split': {
      const a = Array.from({ length: 4 + r(3) }, () => r(13));
      const k = 2 + r(2);
      let cap = Math.max(...a); while (greedyGroups(a, cap) > k) cap++;
      return { ...base('Fairest cut into pieces', 'split-array', 'answer'), prompt: `Cut ${arr(a)} into exactly ${k} non-empty contiguous pieces so that the largest piece sum is as small as possible. What is that largest sum?`, question: 'Enter the smallest possible largest sum.', answer: cap,
        hints: ['Turn "minimize the largest" into a yes/no question about a cap.', 'piecesNeeded(cap) cuts greedily; bounds are max to sum.', 'First cap with piecesNeeded ≤ k. Fewer pieces can always be cut further.'],
        rubric: ['Answer space [max, sum] with a monotone feasibility test.', 'Greedy cutting gives the fewest pieces for a cap.', 'Return the first feasible cap.'],
        explanation: `A cap of ${cap} needs ${greedyGroups(a, cap)} piece(s), at most ${k}${cap > Math.max(...a) ? `; ${cap - 1} needs ${greedyGroups(a, cap - 1)}` : ''}.` };
    }
    case 'timemap': {
      const names = ['red', 'blue', 'green', 'amber', 'white'];
      const times: number[] = []; let t = r(3) + 1;
      for (let i = 0; i < 4; i++) { times.push(t); t += 1 + r(4); }
      const values = times.map(() => names[r(names.length)]);
      const q = r(times[3] + 3);
      let at = -1; for (let i = 0; i < times.length; i++) if (times[i] <= q) at = i;
      const answer = at < 0 ? 'none' : values[at];
      return { ...base('Value as of a moment', 'time-map', 'history'), prompt: `A key "signal" was set to these (time, value) pairs, in increasing time order: ${times.map((tm, i) => `(${tm}, ${values[i]})`).join(', ')}. What does a lookup at time ${q} return: the value from the latest time at or before ${q}? Type none if there is no such time.`, question: 'Enter the value (or none).', answer,
        hints: ['Times arrive in increasing order: the list is already sorted.', 'The latest time ≤ q is one slot before the first time > q.', 'If the first time > q is the very first slot, nothing qualifies.'],
        rubric: ['Store times and values per key in arrival order.', 'Boundary search for the first time > q.', 'Return the value at lo − 1, or "" when lo == 0.'],
        explanation: at < 0 ? `Every time is after ${q}.` : `The latest time at or before ${q} is ${times[at]}, value ${values[at]}.` };
    }
    case 'median': {
      for (;;) {
        const a = Array.from({ length: r(5) }, () => r(30)).sort((x, y) => x - y);
        const b = Array.from({ length: 1 + r(5) }, () => r(30)).sort((x, y) => x - y);
        const all = [...a, ...b].sort((x, y) => x - y), n = all.length;
        const twice = n % 2 ? 2 * all[(n - 1) / 2] : all[n / 2 - 1] + all[n / 2];
        if (twice % 2 !== 0) continue; // keep answers whole numbers
        return { ...base('Middle of two sorted lists', 'two-list-median', 'partition'), prompt: `Two sorted lists: ${arr(a)} and ${arr(b)}. What is the median of all their values together? Use O(log(min(m, n))) time.`, question: 'Enter the median (a whole number here).', answer: twice / 2,
          hints: ['You need a cut that puts half the values on the left, not a merged list.', 'Take i from the shorter list and half − i from the other; check the two cross pairs.', '"a[i] ≥ b[j − 1]?" flips once as i grows. Find the first yes.'],
          rubric: ['Search i over [0, m] on the shorter list; j = half − i.', 'Valid cut: a[i−1] ≤ b[j] and b[j−1] ≤ a[i], with missing sides as ±infinity.', 'Odd total: max of the left. Even: average of max-left and min-right.'],
          explanation: `Merged: ${arr(all)}. ${n % 2 ? `The middle value is ${twice / 2}.` : `The two middle values average to ${twice / 2}.`}` };
      }
    }
    case 'insert': {
      const a = distinctSorted(r, 5 + r(3), 0, 30);
      let target = r(34) - 2; if (variant % 3 !== 0) while (a.includes(target)) target++;
      const answer = a.filter(v => v < target).length;
      return { ...base('Where a value belongs', 'insert-position', 'index'), prompt: `Sorted, distinct values ${arr(a)}. At which index would ${target} go to keep the list sorted? If it is already present, give its index. Use O(log n) time.`, question: 'Enter the index.', answer,
        hints: ['Where does "not found" end up in the template?', 'The first index with value ≥ target.', 'Return lo directly; n is a valid answer.'],
        rubric: ['hi starts at n so "after everything" is reachable.', 'Same keep-true, skip-false moves.', 'No equality check needed: return lo.'],
        explanation: `${answer} value(s) are smaller than ${target}, so it belongs at index ${answer}.` };
    }
    case 'peak': {
      const n = 5 + r(4), peakAt = variant % 6 === 5 ? n - 1 : variant % 6 === 4 ? 0 : 1 + r(n - 2);
      const a: number[] = new Array(n);
      a[peakAt] = 40 + r(10);
      for (let i = peakAt - 1; i >= 0; i--) a[i] = a[i + 1] - 1 - r(5);
      for (let i = peakAt + 1; i < n; i++) a[i] = a[i - 1] - 1 - r(5);
      return { ...base('A local high point', 'find-a-peak', 'index'), prompt: `Neighbouring values always differ in ${arr(a)}. Find the index of a value bigger than both neighbours (beyond either end counts as minus infinity). Exactly one such index exists here. Use O(log n) time.`, question: 'Enter the index.', answer: peakAt,
        hints: ['You do not need the list sorted, only a reason to drop half.', 'Compare nums[mid] with nums[mid + 1].', 'Downhill: a peak is at mid or left (hi = mid). Uphill: right (lo = mid + 1).'],
        rubric: ['lo = 0, hi = n − 1 so mid + 1 is always valid.', 'The kept side always has an uphill entering it and a downhill leaving it, so it holds a peak.', 'Return lo when lo == hi.'],
        explanation: `The values climb to index ${peakAt} and fall after it.` };
    }
    case 'sqrt': {
      const x = 2 + r(3000);
      let k = 0; while ((k + 1) * (k + 1) <= x) k++;
      return { ...base('Whole-number square root', 'square-root', 'answer'), prompt: `Without any square-root function, find the largest whole number whose square is at most ${x}. Use O(log x) time.`, question: 'Enter the number.', answer: k,
        hints: ['The answer is a number, not an index.', '"Is k × k > x?" is no, …, no, yes, ….', 'Find the first yes on [0, x + 1] in long arithmetic; return lo − 1.'],
        rubric: ['A no-then-yes question over candidate answers.', 'hi starts at x + 1, a guaranteed yes; products use long.', 'The answer is one less than the first yes.'],
        explanation: `${k}² = ${k * k} ≤ ${x} < ${(k + 1) * (k + 1)} = ${k + 1}².` };
    }
    case 'rotated-dups': {
      const sorted = Array.from({ length: 7 + r(3) }, () => r(6)).sort((x, y) => x - y);
      const a = rotate(sorted, r(sorted.length));
      let target = variant % 2 ? a[r(a.length)] : r(8);
      const answer = a.includes(target);
      return { ...base('Rotated list with repeats', 'rotated-duplicates', 'rotated'), prompt: `Values sorted with repeats allowed, then rotated: ${arr(a)}. Is ${target} present?`, question: 'Enter yes or no.', answer,
        hints: ['When can you no longer tell which side is in order?', 'nums[mid] == nums[hi]: shrink hi by one; its value survives at mid.', 'Otherwise use the distinct-value rules. Worst case O(n).'],
        rubric: ['Handle the tie nums[mid] == nums[hi] by hi−−.', 'Ordered side decided by nums[mid] vs nums[hi]; both ends checked.', 'All-equal runs can force a linear walk; say so.'],
        explanation: answer ? `${target} appears in the list.` : `${target} never appears.` };
    }
    case 'magnetic': {
      const sortedPos = distinctSorted(r, 5 + r(3), 1, 40);
      const pos = rotate(sortedPos, r(sortedPos.length)).reverse();
      const m = 3 + r(2);
      let best = 0;
      for (let d = 1; d <= sortedPos[sortedPos.length - 1] - sortedPos[0]; d++) {
        let count = 1, last = sortedPos[0];
        for (const p of sortedPos) if (p - last >= d) { count++; last = p; }
        if (count >= m) best = d;
      }
      return { ...base('Spread out as far as possible', 'maximize-the-minimum', 'answer'), prompt: `Stalls stand at positions ${arr(pos)}. Place ${m} birds in different stalls so that the closest two birds are as far apart as possible. What is that closest distance?`, question: 'Enter the distance.', answer: best,
        hints: ['If a gap d can be kept, can every smaller gap be kept too?', 'Sort; place greedily, each bird at the first stall at least d past the last.', 'Find the first gap that FAILS; the answer is one less.'],
        rubric: ['Maximize-the-minimum: feasibility is yes-then-no, so search for the first no.', 'Greedy placement from the leftmost stall is optimal for a fixed gap.', 'Return (first failing gap) − 1.'],
        explanation: `A gap of ${best} fits ${m} birds; a gap of ${best + 1} does not.` };
    }
    case 'kth-matrix': {
      const n = 3, grid: number[][] = [];
      for (let i = 0; i < n; i++) { grid.push([]); for (let j = 0; j < n; j++) grid[i].push(Math.max(i ? grid[i - 1][j] : 0, j ? grid[i][j - 1] : 0) + r(4)); }
      const k = 2 + r(7);
      const flat = grid.flat().sort((x, y) => x - y);
      return { ...base('k-th smallest in a sorted grid', 'kth-in-matrix', 'answer'), prompt: `Every row and every column of this grid is sorted ascending: ${grid.map(arr).join(', ')}. What is the ${ordinal(k)} smallest value, counting repeats?`, question: 'Enter the value.', answer: flat[k - 1],
        hints: ['Positions are tangled; values are not. Search the value range.', 'Count values ≤ v with a staircase walk from the bottom-left.', 'First v with count ≥ k.'],
        rubric: ['Search v over [smallest, largest] value.', 'Counting is O(n) per guess, so total O(n log range).', 'The first v with count ≥ k always occurs in the grid.'],
        explanation: `Sorted, the values are ${arr(flat)}; position ${k} holds ${flat[k - 1]}.` };
    }
    case 'unsorted': {
      for (;;) {
        const a = distinctSorted(r, 6, 1, 30);
        const shuffled = [...a]; for (let i = shuffled.length - 1; i > 0; i--) { const j = r(i + 1); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
        const i = r(6); let j = r(6); if (j === i) j = (i + 1) % 6;
        const target = shuffled[i] + shuffled[j];
        const pairs: number[][] = [];
        for (let x = 0; x < 6; x++) for (let y = x + 1; y < 6; y++) if (shuffled[x] + shuffled[y] === target) pairs.push([x, y]);
        if (pairs.length !== 1) continue;
        return { ...base('A pair in unsorted data', 'choose-the-tool', 'other'), prompt: `Unsorted values ${arr(shuffled)}. Return the positions of the two values that add up to ${target} (exactly one pair works), in O(n) expected time.`, question: 'Enter [i, j] with i < j.', answer: pairs[0],
          hints: ['Is there any yes/no question here that flips once?', 'You need original positions, and the data is not ordered.', 'Remember what you have seen: value → position.'],
          rubric: ['No monotone question exists; halving has nothing to stand on.', 'Sorting first would cost O(n log n) and scramble positions.', 'One pass with a hash map of value → index.'],
          explanation: `${shuffled[pairs[0][0]]} + ${shuffled[pairs[0][1]]} = ${target}. A hash map finds it in one pass.` };
      }
    }
  }
}

export const practice: PracticeSet = {
  storageKey: 'citadel-binary-search-review-v1',
  strategies,
  conceptIds,
  challengeFor: (id, variant = 0) => challengeFor(id as ConceptId, variant),
};
