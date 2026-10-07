// Independent practice for the heaps lesson. Prompts never name the pattern; inputs change with `variant`.
import type { Challenge, PracticeSet } from '../../lib/practice.ts';

export const strategies = {
  structure: 'Restore order in an array-stored tree (every parent ≤ its children)',
  gate: 'Keep only the best k; the weakest of them guards the door',
  halves: 'Split the values into a lower half and an upper half',
  frontier: 'Repeatedly take the smallest of the current fronts of sorted sources',
  greedy: 'Repeatedly take the best choice currently available',
  other: 'Another tool fits better: nothing here changes, so no repeated best-of-a-set',
} as const;
type Strategy = keyof typeof strategies;

export const conceptIds = ['sink', 'kth', 'frequent', 'closest', 'median', 'window', 'merge', 'schedule', 'stream-kth', 'stones', 'reorganize', 'capital', 'range', 'matrix', 'sorted-decoy'] as const;
type ConceptId = typeof conceptIds[number];

const arr = (a: number[]) => `[${a.join(', ')}]`;
function rng(seed: number) {
  let s = (seed >>> 0) || 1;
  return (max: number) => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return (s >>> 8) % max; };
}
function shuffle<T>(a: T[], r: (max: number) => number): T[] {
  for (let i = a.length - 1; i > 0; i--) { const j = r(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const nth = (k: number) => `${k}${k % 10 === 1 && k % 100 !== 11 ? 'st' : k % 10 === 2 && k % 100 !== 12 ? 'nd' : k % 10 === 3 && k % 100 !== 13 ? 'rd' : 'th'}`;
const asc = (a: number[]) => [...a].sort((x, y) => x - y);
const medianOf = (a: number[]) => { const s = asc(a); return s[(s.length - 1) >> 1]; }; // used only for odd lengths

// A small min-heap, used to build the 'sink' prompt and its answer.
function push(h: number[], x: number) { h.push(x); let i = h.length - 1; while (i > 0 && h[(i - 1) >> 1] > h[i]) { const p = (i - 1) >> 1; [h[p], h[i]] = [h[i], h[p]]; i = p; } }
function popRoot(h: number[]) {
  const out = [...h]; out[0] = out[out.length - 1]; out.pop();
  let i = 0;
  for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < out.length && out[l] < out[m]) m = l; if (r < out.length && out[r] < out[m]) m = r; if (m === i) return out; [out[m], out[i]] = [out[i], out[m]]; i = m; }
}

export function challengeFor(id: ConceptId, variant = 0): Challenge {
  const r = rng(variant * 97 + conceptIds.indexOf(id) * 7919 + 13);
  const base = { id, question: 'Enter only the result.' };
  switch (id) {
    case 'sink': {
      const values = shuffle(Array.from({ length: 20 }, (_, i) => i + 1), r).slice(0, 7);
      const heap: number[] = []; values.forEach(v => push(heap, v));
      const answer = popRoot(heap);
      return { ...base, topic: 'Remove the top of an array-stored tree', section: 'build-the-pyramid', strategy: 'structure',
        prompt: `The array ${arr(heap)} stores a complete binary tree row by row (children of index i are at 2i + 1 and 2i + 2), and every parent is ≤ its children. Remove the root the standard way: move the last value into the root, then restore the order in O(log n).`,
        question: 'Enter the whole array after the removal.', answer,
        hints: ['Only one path from the root downward can be out of order.', 'The moved value sinks. At each step, compare it with its children.', 'Swap with the SMALLER child while that child is smaller; stop otherwise.'],
        rubric: ['The last value fills the root so the tree stays complete.', 'Swapping with the smaller child makes the new parent ≤ both children.', 'Stop when no child is smaller or there are no children: O(log n) swaps.'],
        explanation: `${heap[heap.length - 1]} moves to the root and sinks along the smaller children, giving ${arr(answer)}.` };
    }
    case 'kth': {
      const k = 2 + variant % 3;
      const stream = Array.from({ length: 7 }, () => 1 + r(15));
      const answer = asc(stream)[stream.length - k];
      return { ...base, topic: 'Kth largest with O(k) memory', section: 'the-door-guard', strategy: 'gate',
        prompt: `Numbers arrive one at a time: ${arr(stream)}. You may remember at most ${k} numbers at any moment. After the last arrival, report the ${nth(k)} largest value seen. Repeated values count separately.`,
        answer,
        hints: ['Which numbers could still matter after you have seen many?', `Keep the ${k} largest so far. Who among them is first in line to be replaced?`, 'The weakest of the kept numbers decides: a newcomer either beats it and replaces it, or is ignored.'],
        rubric: [`A min-ordered structure holds the ${k} largest so far; its top is the weakest of them.`, 'A newcomer that beats the top replaces it; anything else can never be in the best k.', `After the last arrival, the top is the ${nth(k)} largest: O(n log k) time, O(k) memory.`],
        explanation: `Sorted descending, the ${nth(k)} value is ${answer}. The kept set never grows past ${k}.` };
    }
    case 'frequent': {
      const values = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], r).slice(0, 4);
      const counts = shuffle([4, 3, 2, 1], r);
      const list = shuffle(values.flatMap((v, i) => Array(counts[i]).fill(v)), r);
      const answer = asc(values.filter((_, i) => counts[i] >= 3));
      return { ...base, topic: 'Most frequent k', section: 'top-k-frequent', strategy: 'gate',
        prompt: `In ${arr(list)}, which 2 values appear most often? The answer is unique. Do better than sorting all the values by count when there are many distinct values.`,
        question: 'Enter the two values in ascending order.', answer,
        hints: ['First turn the list into counts.', 'Now you want the 2 best by count, not by value.', 'Keep 2 values ordered by count; the least frequent of them is the one a newcomer must beat.'],
        rubric: ['Count with a hash map in O(n).', 'Order candidates by COUNT; the kept set’s least frequent member guards the door.', 'Trim to k after each offer: O(u log k) for u distinct values.'],
        explanation: `Counts: ${values.map((v, i) => `${v} → ${counts[i]}`).join(', ')}. The two largest counts belong to ${answer.join(' and ')}.` };
    }
    case 'closest': {
      const k = 2 + variant % 2;
      let pts: number[][] = [];
      for (;;) {
        pts = Array.from({ length: 5 }, () => [r(11) - 5, r(11) - 5]);
        const d = pts.map(([x, y]) => x * x + y * y);
        if (new Set(d).size === d.length) break;
      }
      const d = pts.map(([x, y]) => x * x + y * y);
      const answer = asc(d.map((_, i) => i).sort((a, b) => d[a] - d[b]).slice(0, k));
      return { ...base, topic: 'Closest k by a custom key', section: 'k-closest', strategy: 'gate',
        prompt: `Points: ${pts.map(([x, y]) => `(${x}, ${y})`).join(', ')}. Which ${k} are nearest to (0, 0)? Use memory proportional to ${k}, not to the number of points.`,
        question: 'Enter their zero-based positions in ascending order.', answer,
        hints: ['Compare x² + y²; no square roots needed.', `You keep the ${k} SMALLEST distances. Which kept point is in danger?`, 'The farthest kept point guards the door. A closer newcomer replaces it.'],
        rubric: ['Squared distance preserves the order of true distance.', 'Keep the k smallest with the LARGEST of them on top (the flipped guard).', 'Trim to k after each offer: O(n log k) time, O(k) space; use long for big coordinates.'],
        explanation: `Squared distances: ${d.join(', ')}. The ${k} smallest are at positions ${answer.join(', ')}.` };
    }
    case 'median': {
      const stream = Array.from({ length: 7 }, () => 1 + r(20));
      const answer = [1, 3, 5, 7].map(n => medianOf(stream.slice(0, n)));
      return { ...base, topic: 'Running middle value', section: 'running-median', strategy: 'halves',
        prompt: `Numbers arrive one at a time: ${arr(stream)}. After the 1st, 3rd, 5th and 7th arrivals, report the middle value of everything seen so far. Each report should cost O(1) and each arrival O(log n).`,
        question: 'Enter the four middle values in order.', answer,
        hints: ['The middle value sits on the border between a lower half and an upper half.', 'You need the largest of the lower half and the smallest of the upper half, fast.', 'Each arrival enters the lower half, its largest moves up, and if the upper half is now bigger, its smallest moves back.'],
        rubric: ['A max-ordered lower half and a min-ordered upper half; every lower value ≤ every upper value.', 'Sizes stay equal or the lower half holds one extra.', 'With an odd count, the lower half’s top is the median.'],
        explanation: `The middle values are ${answer.join(', ')}.` };
    }
    case 'window': {
      const nums = Array.from({ length: 6 }, () => r(10));
      const answer = [0, 1, 2, 3].map(s => medianOf(nums.slice(s, s + 3)));
      return { ...base, topic: 'Middle value of a moving window', section: 'window-median', strategy: 'halves',
        prompt: `nums = ${arr(nums)}. A window of 3 consecutive values slides one step at a time from the left. Report the middle value of each window. Aim for O(log n) work per slide.`,
        question: 'Enter the four middle values in order.', answer,
        hints: ['Each slide adds one value and removes one value.', 'Two halves give the middle; the trouble is removing a value that is not on top.', 'Mark a leaving value as dead and fix the live counts now; pop it only when it surfaces. Rebalance by live counts.'],
        rubric: ['Lower and upper halves, compared by (value, index) so no two entries tie.', 'Removal is lazy: only the live count changes until the entry reaches a top.', 'Rebalance using live counts, never physical heap sizes.'],
        explanation: `Windows: ${[0, 1, 2, 3].map(s => arr(nums.slice(s, s + 3))).join(', ')} → middle values ${answer.join(', ')}.` };
    }
    case 'merge': {
      const lists = [0, 1, 2].map(() => asc(Array.from({ length: 2 + r(2) }, () => r(13))));
      const answer = asc(lists.flat());
      return { ...base, topic: 'Combine several sorted sources', section: 'merge-k', strategy: 'frontier',
        prompt: `Three sorted lists: ${lists.map(arr).join(', ')}. Combine them into one sorted list. Imagine k lists and N values in total: aim for O(N log k).`,
        question: 'Enter the combined list.', answer,
        hints: ['The next output value is always one of the current fronts.', 'Hold exactly one front per list and always take the smallest.', 'After taking a front, its list offers its next value. Stop when every list is empty.'],
        rubric: ['Only the k fronts compete; the structure never holds more than k entries.', 'Taking the smallest front is safe: everything behind every front is at least as large.', 'Each of N values enters and leaves once: O(N log k).'],
        explanation: `The combined list is ${arr(answer)}.` };
    }
    case 'schedule': {
      const n = 1 + r(3);
      const counts = [2 + r(3), 1 + r(3), r(3)];
      const tasks = shuffle(counts.flatMap((c, i) => Array(c).fill('ABC'[i])), r).join('');
      const max = Math.max(...counts), tied = counts.filter(c => c === max).length;
      const answer = Math.max(tasks.length, (max - 1) * (n + 1) + tied);
      return { ...base, topic: 'Cooling-down jobs', section: 'task-scheduler', strategy: 'greedy',
        prompt: `Jobs “${tasks}” run one per time unit, in any order. Two runs of the same letter must be at least ${n + 1} units apart (${n} units of rest between them). Idle units are allowed. What is the fewest time units to finish?`,
        question: 'Enter the number of time units.', answer,
        hints: ['Which letter’s rests are hardest to hide?', 'At each unit, run the ready letter with the most copies left; letters that just ran wait in a queue.', `Check with frames: (most copies − 1) × ${n + 1} + (letters tied for most), but never less than the job count.`],
        rubric: ['Running the most-remaining ready job first overlaps its rests with other work.', 'A job that just ran waits n units in a FIFO queue, then returns to the ready set.', 'Idle units count. The frame formula confirms the simulation.'],
        explanation: `Counts A=${counts[0]}, B=${counts[1]}, C=${counts[2]}, n=${n}: max(${tasks.length}, (${max} − 1) × ${n + 1} + ${tied}) = ${answer}.` };
    }
    case 'stream-kth': {
      const k = 2 + variant % 2;
      const start = Array.from({ length: k }, () => r(10));
      const adds = Array.from({ length: 4 }, () => r(10));
      const answer = adds.map((_, i) => asc([...start, ...adds.slice(0, i + 1)]).reverse()[k - 1]);
      return { ...base, topic: 'Kth largest, asked after every arrival', section: 'kth-in-a-stream', strategy: 'gate',
        prompt: `k = ${k}. You start with ${arr(start)}. Then ${arr(adds)} arrive one at a time. After each arrival, report the ${nth(k)} largest value so far (repeats count separately), using O(log k) per arrival.`,
        question: 'Enter the four reports in order.', answer,
        hints: ['This is a gate that never closes.', `Keep the ${k} largest so far. The answer after each arrival is the weakest of them.`, 'Offer the arrival; if more than k are kept, drop the weakest; report the weakest.'],
        rubric: [`Only the best ${k} values matter for every future answer.`, 'The weakest of them is both the answer and the eviction candidate.', 'Each arrival costs O(log k); memory stays O(k).'],
        explanation: `Reports: ${answer.join(', ')}.` };
    }
    case 'stones': {
      const stones = Array.from({ length: 5 }, () => 1 + r(10));
      const pile = [...stones];
      while (pile.length > 1) { pile.sort((a, b) => a - b); const y = pile.pop()!, x = pile.pop()!; if (y !== x) pile.push(y - x); }
      const answer = pile.length ? pile[0] : 0;
      return { ...base, topic: 'Smash the two heaviest', section: 'last-stone', strategy: 'greedy',
        prompt: `Stones weigh ${arr(stones)}. Each turn, take the two heaviest: if they are equal both vanish, otherwise only their difference remains. What does the last stone weigh (0 if none remain)?`,
        question: 'Enter the weight.', answer,
        hints: ['Each turn needs the two largest of a changing collection.', 'The difference goes back and competes again.', 'Repeat until at most one stone remains.'],
        rubric: ['A max-ordered collection gives the two heaviest in O(log n).', 'The leftover is re-inserted because it may be heavier than stones still waiting.', 'Stop at one or zero stones.'],
        explanation: `Simulating the smashes leaves ${answer}.` };
    }
    case 'reorganize': {
      const pool = ['aab', 'aaab', 'aabbc', 'aaabc', 'aaaabc', 'abcabc', 'aaabb', 'aaaab', 'abbbbc', 'vvvlo', 'zzyy', 'aaa'];
      const text = pool[variant % pool.length];
      const most = Math.max(...[...new Set(text)].map(c => [...text].filter(x => x === c).length));
      const answer = most <= Math.ceil(text.length / 2);
      return { ...base, topic: 'No two neighbours equal', section: 'reorganize-string', strategy: 'greedy',
        prompt: `Can the letters of “${text}” be rearranged so that no two adjacent letters are equal?`,
        question: 'Enter yes or no.', answer,
        hints: ['Which letter is hardest to place?', 'Place the letter with the most copies left, but never the one you just placed.', 'It is possible exactly when the most common letter appears at most ⌈n / 2⌉ times.'],
        rubric: ['Greedy: the most common remaining letter goes next, unless it was just used.', 'The letter just used sits out one turn, then returns.', 'If the only letter left is the one sitting out, it is impossible.'],
        explanation: `${text.length} letters; the most common appears ${most} time(s), and the limit is ⌈${text.length} / 2⌉ = ${Math.ceil(text.length / 2)}.` };
    }
    case 'capital': {
      const profits = Array.from({ length: 4 }, () => 1 + r(5));
      const capital = Array.from({ length: 4 }, () => r(7));
      const w0 = r(3), k = 2 + variant % 2;
      let w = w0; const used = new Set<number>();
      for (let round = 0; round < k; round++) {
        let best = -1;
        for (let i = 0; i < 4; i++) if (!used.has(i) && capital[i] <= w && (best === -1 || profits[i] > profits[best])) best = i;
        if (best === -1) break;
        used.add(best); w += profits[best];
      }
      return { ...base, topic: 'Unlock, then take the best', section: 'ipo', strategy: 'greedy',
        prompt: `You start with ${w0} coins. Projects have profits ${arr(profits)} and required capital ${arr(capital)}. A project needs at least its required capital to start; it is not spent, and its profit is added when done. You may finish at most ${k} projects, one after another. What is the most coins you can end with?`,
        question: 'Enter the final number of coins.', answer: w,
        hints: ['Every round has two questions: what can I afford, and what pays most?', 'Keep locked projects ordered by capital and affordable ones ordered by profit.', 'Each round: unlock everything you can afford, then take the best profit. Stop if nothing is affordable.'],
        rubric: ['Profits are never negative, so taking the best affordable project never hurts later options.', 'Unlocked projects stay unlocked: coins only grow.', 'Two heaps: O(n log n) total.'],
        explanation: `Greedy rounds end with ${w} coins.` };
    }
    case 'range': {
      const lists = [0, 1, 2].map(() => [...new Set(asc(Array.from({ length: 2 + r(2) }, () => r(16))))]);
      const all = asc([...new Set(lists.flat())]);
      let best: number[] = [];
      for (const lo of all) for (const hi of all) {
        if (hi < lo || !lists.every(l => l.some(v => v >= lo && v <= hi))) continue;
        if (!best.length || hi - lo < best[1] - best[0] || (hi - lo === best[1] - best[0] && lo < best[0])) best = [lo, hi];
      }
      return { ...base, topic: 'One value from every list', section: 'smallest-range', strategy: 'frontier',
        prompt: `Sorted lists: ${lists.map(arr).join(', ')}. Find the narrowest inclusive range from lo to hi that contains at least one value from each list. If two ranges are equally narrow, choose the one with the smaller lo.`,
        question: 'Enter lo and hi.', answer: best,
        hints: ['Look at one candidate from each list at a time.', 'Those candidates span [their minimum, their maximum]. Which end can you improve?', 'Advance the list holding the minimum; record the range each time; stop when that list runs out.'],
        rubric: ['One entry per list in a min-ordered structure, plus the running maximum.', 'Only advancing the minimum can shrink the range; advancing anything else only widens it.', 'When the minimum’s list is exhausted, no later range can cover that list.'],
        explanation: `The best range is [${best.join(', ')}].` };
    }
    case 'matrix': {
      const m: number[][] = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) m[i][j] = Math.max(i ? m[i - 1][j] : 0, j ? m[i][j - 1] : 0) + 1 + r(4);
      const k = 2 + variant % 7;
      const answer = asc(m.flat())[k - 1];
      return { ...base, topic: 'Kth smallest in a sorted grid', section: 'sorted-matrix', strategy: 'frontier',
        prompt: `Every row and every column of this grid is sorted ascending: ${m.map(arr).join(', ')} (rows listed top to bottom). What is the ${nth(k)} smallest value? Avoid sorting all n² values.`,
        answer,
        hints: ['Each row is a sorted list.', 'Keep one front per row and repeatedly take the smallest front.', `Take ${k - 1} values; the next smallest front is the answer.`],
        rubric: ['Rows are sorted sources: this is a merge of n lists.', 'At most n fronts compete at once.', 'Pop k − 1 times, pushing the next cell in the same row: O(k log n).'],
        explanation: `Sorted, the grid’s values are ${arr(asc(m.flat()))}; the ${nth(k)} is ${answer}.` };
    }
    case 'sorted-decoy': {
      const a = asc(Array.from({ length: 6 }, () => r(30)));
      const k = 2 + variant % 3;
      return { ...base, topic: 'Know when to choose another tool', section: 'choose-the-tool', strategy: 'other',
        prompt: `The list ${arr(a)} is already sorted ascending and never changes. What is its ${nth(k)} largest value? Aim for O(1) time.`,
        answer: a[a.length - k],
        hints: ['Is anything changing?', 'Sorted order already tells you where every rank lives.', `The ${nth(k)} largest is at index n − ${k}.`],
        rubric: ['Nothing changes, so there is no repeated best-of-a-set to maintain.', 'Sorted input makes rank an index lookup.', 'O(1) time and no extra memory; building any structure would be wasted work.'],
        explanation: `Index ${a.length - k} holds ${a[a.length - k]}.` };
    }
  }
}

export const practice: PracticeSet = {
  storageKey: 'citadel-heaps-review-v1',
  strategies,
  conceptIds,
  challengeFor: (id, variant = 0) => challengeFor(id as ConceptId, variant),
};
