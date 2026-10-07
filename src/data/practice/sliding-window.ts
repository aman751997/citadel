// Independent practice for the Sliding Window lesson. Prompts never name the pattern or technique;
// inputs are generated from (concept, variant) so each review sees a fresh input.
// Answers are computed here with the lesson's linear-time methods and re-checked by brute force in tests.
import type { Challenge, PracticeSet } from '../../lib/practice.ts';

export const strategies = {
  fixed: 'Fixed-width stretch: add what enters, subtract what leaves',
  longest: 'Grow freely; shrink only while the rule is broken; record after',
  shortest: 'Grow until it qualifies; record, then shrink while it still qualifies',
  count: 'Count every valid stretch ending here (right − left + 1), or at-most(K) − at-most(K − 1)',
  deque: 'Keep a monotonic queue of candidate indices (over values or prefix totals)',
  running: 'One pass, remembering the lowest value so far',
  complement: 'Work on the contiguous part you leave behind',
  other: 'Another tool: prefix totals with a hash map of how often each was seen',
} as const;
type Strategy = keyof typeof strategies;

export const conceptIds = ['fixed-sum', 'anagram', 'flips', 'no-repeat', 'two-kinds', 'repaint', 'toll', 'cover', 'window-max', 'stock', 'exactly-k', 'delete-one', 'product', 'cards', 'negatives', 'sum-equals'] as const;
export type ConceptId = typeof conceptIds[number];

export interface PracticeInput { a: number[]; k: number; s: string; t: string }

// Small deterministic generator (mulberry32) so a concept's input depends only on (concept, variant).
function generator(seed: number) {
  let state = seed | 0;
  const next = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  return {
    int,
    array: (minLen: number, maxLen: number, lo: number, hi: number) => Array.from({ length: int(minLen, maxLen) }, () => int(lo, hi)),
    text: (alphabet: string, minLen: number, maxLen: number) => Array.from({ length: int(minLen, maxLen) }, () => alphabet[int(0, alphabet.length - 1)]).join(''),
  };
}

// ---------- the lesson's methods (linear time) ----------
const maxFixedSum = (a: number[], k: number) => {
  let sum = 0; for (let i = 0; i < k; i++) sum += a[i];
  let best = sum;
  for (let r = k; r < a.length; r++) { sum += a[r] - a[r - k]; best = Math.max(best, sum); }
  return best;
};
const hasAnagram = (p: string, s: string) => {
  const k = p.length; if (k > s.length) return false;
  const diff = new Map<string, number>();
  for (const c of p) diff.set(c, (diff.get(c) || 0) + 1);
  const bump = (c: string, d: number) => { const v = (diff.get(c) || 0) + d; if (v === 0) diff.delete(c); else diff.set(c, v); };
  for (let r = 0; r < s.length; r++) {
    bump(s[r], -1);
    if (r >= k) bump(s[r - k], +1);
    if (r >= k - 1 && diff.size === 0) return true;
  }
  return false;
};
const longestAtMostZeros = (a: number[], k: number) => {
  let left = 0, zeros = 0, best = 0;
  for (let r = 0; r < a.length; r++) {
    if (a[r] === 0) zeros++;
    while (zeros > k) { if (a[left] === 0) zeros--; left++; }
    best = Math.max(best, r - left + 1);
  }
  return best;
};
const longestNoRepeat = (s: string) => {
  const last = new Map<string, number>(); let left = 0, best = 0;
  for (let r = 0; r < s.length; r++) {
    left = Math.max(left, (last.get(s[r]) ?? -1) + 1);
    last.set(s[r], r);
    best = Math.max(best, r - left + 1);
  }
  return best;
};
const atMostKinds = (a: number[], k: number) => {   // returns [longest, count]
  const inView = new Map<number, number>(); let left = 0, best = 0, count = 0;
  for (let r = 0; r < a.length; r++) {
    inView.set(a[r], (inView.get(a[r]) || 0) + 1);
    while (inView.size > k) { const out = a[left++]; const v = inView.get(out)! - 1; if (v === 0) inView.delete(out); else inView.set(out, v); }
    best = Math.max(best, r - left + 1);
    count += r - left + 1;
  }
  return [best, count];
};
const longestRepaint = (s: string, k: number) => {
  const count = new Map<string, number>(); let left = 0, maxFreq = 0, best = 0;
  for (let r = 0; r < s.length; r++) {
    const c = (count.get(s[r]) || 0) + 1; count.set(s[r], c); maxFreq = Math.max(maxFreq, c);
    while (r - left + 1 - maxFreq > k) { count.set(s[left], count.get(s[left])! - 1); left++; }
    best = Math.max(best, r - left + 1);
  }
  return best;
};
const shortestAtLeast = (a: number[], target: number) => {
  let left = 0, sum = 0, best = Infinity;
  for (let r = 0; r < a.length; r++) {
    sum += a[r];
    while (sum >= target) { best = Math.min(best, r - left + 1); sum -= a[left++]; }
  }
  return best === Infinity ? 0 : best;
};
const minCover = (s: string, t: string) => {
  const need = new Map<string, number>();
  for (const c of t) need.set(c, (need.get(c) || 0) + 1);
  let missing = t.length, left = 0, bestStart = 0, bestLen = Infinity;
  for (let r = 0; r < s.length; r++) {
    const c = s[r];
    if ((need.get(c) || 0) > 0) missing--;
    need.set(c, (need.get(c) || 0) - 1);
    while (missing === 0) {
      if (r - left + 1 < bestLen) { bestLen = r - left + 1; bestStart = left; }
      const out = s[left++];
      need.set(out, need.get(out)! + 1);
      if (need.get(out)! > 0) missing++;
    }
  }
  return bestLen === Infinity ? '' : s.slice(bestStart, bestStart + bestLen);
};
const windowMaxima = (a: number[], k: number) => {
  const deque: number[] = [], out: number[] = [];
  for (let r = 0; r < a.length; r++) {
    while (deque.length && a[deque[deque.length - 1]] <= a[r]) deque.pop();
    deque.push(r);
    if (deque[0] <= r - k) deque.shift();
    if (r >= k - 1) out.push(a[deque[0]]);
  }
  return out;
};
const bestProfit = (p: number[]) => {
  let low = Infinity, best = 0;
  for (const x of p) { low = Math.min(low, x); best = Math.max(best, x - low); }
  return best;
};
const longestAfterDelete = (a: number[]) => {
  let left = 0, zeros = 0, best = 0;
  for (let r = 0; r < a.length; r++) {
    if (a[r] === 0) zeros++;
    while (zeros > 1) { if (a[left] === 0) zeros--; left++; }
    best = Math.max(best, r - left);
  }
  return best;
};
const countProductBelow = (a: number[], k: number) => {
  if (k <= 1) return 0;
  let product = 1, left = 0, count = 0;
  for (let r = 0; r < a.length; r++) {
    product *= a[r];
    while (product >= k) product /= a[left++];
    count += r - left + 1;
  }
  return count;
};
const bestFromEnds = (a: number[], k: number) => {
  const keep = a.length - k, total = a.reduce((x, y) => x + y, 0);
  let window = 0; for (let i = 0; i < keep; i++) window += a[i];
  let smallest = window;
  for (let r = keep; r < a.length; r++) { window += a[r] - a[r - keep]; smallest = Math.min(smallest, window); }
  return total - smallest;
};
const shortestWithNegatives = (a: number[], k: number) => {
  const prefix = [0]; for (const x of a) prefix.push(prefix[prefix.length - 1] + x);
  let best = a.length + 1; const starts: number[] = [];
  for (let end = 0; end <= a.length; end++) {
    while (starts.length && prefix[end] - prefix[starts[0]] >= k) best = Math.min(best, end - starts.shift()!);
    while (starts.length && prefix[starts[starts.length - 1]] >= prefix[end]) starts.pop();
    starts.push(end);
  }
  return best <= a.length ? best : -1;
};
const countSumEquals = (a: number[], k: number) => {
  const seen = new Map<number, number>([[0, 1]]); let prefix = 0, count = 0;
  for (const x of a) { prefix += x; count += seen.get(prefix - k) || 0; seen.set(prefix, (seen.get(prefix) || 0) + 1); }
  return count;
};

// The unique shortest covering block, or null when there is none or several tie.
function uniqueCover(s: string, t: string): string | null {
  const covers = (w: string) => [...new Set(t)].every(c => w.split(c).length - 1 >= t.split(c).length - 1);
  let bestLen = Infinity, starts: number[] = [];
  for (let i = 0; i < s.length; i++) for (let j = i; j < s.length; j++) {
    if (!covers(s.slice(i, j + 1))) continue;
    const len = j - i + 1;
    if (len < bestLen) { bestLen = len; starts = [i]; } else if (len === bestLen) starts.push(i);
    break;
  }
  return starts.length === 1 ? s.slice(starts[0], starts[0] + bestLen) : null;
}

export function practiceInput(id: ConceptId, variant = 0): PracticeInput {
  const g = generator(1000003 * (conceptIds.indexOf(id) + 1) + 7919 * variant + 17);
  const blank = { a: [] as number[], k: 0, s: '', t: '' };
  switch (id) {
    case 'fixed-sum': { const a = g.array(6, 8, -5, 9); return { ...blank, a, k: g.int(2, 4) }; }
    case 'anagram': return { ...blank, t: g.text('abc', 2, 3), s: g.text('abcd', 6, 8) };
    case 'flips': return { ...blank, a: g.array(8, 11, 0, 1), k: g.int(1, 2) };
    case 'no-repeat': return { ...blank, s: g.text('abcde', 7, 10) };
    case 'two-kinds': return { ...blank, a: g.array(7, 10, 1, 4) };
    case 'repaint': return { ...blank, s: g.text(variant % 2 ? 'ABC' : 'AB', 6, 9).toUpperCase(), k: g.int(1, 2) };
    case 'toll': return { ...blank, a: g.array(6, 9, 1, 6), k: g.int(7, 15) };
    case 'cover': {
      for (;;) {   // retry until the shortest covering block exists and is unique
        const s = g.text('abc', 7, 10), t = g.text('abc', 2, 3);
        if (uniqueCover(s, t)) return { ...blank, s, t };
      }
    }
    case 'window-max': return { ...blank, a: g.array(6, 8, -3, 9), k: g.int(2, 3) };
    case 'stock': return { ...blank, a: g.array(6, 8, 1, 9) };
    case 'exactly-k': return { ...blank, a: g.array(5, 7, 1, 3), k: 2 };
    case 'delete-one': return { ...blank, a: g.array(7, 10, 0, 1) };
    case 'product': return { ...blank, a: g.array(4, 6, 1, 6), k: g.int(10, 40) };
    case 'cards': { const a = g.array(6, 8, 1, 9); return { ...blank, a, k: g.int(2, 4) }; }
    case 'negatives': return { ...blank, a: g.array(5, 7, -4, 6), k: g.int(3, 9) };
    case 'sum-equals': return { ...blank, a: g.array(6, 8, -3, 3), k: g.int(-2, 3) };
  }
}

const list = (a: number[]) => `[${a.join(', ')}]`;

export function challengeFor(id: ConceptId, variant = 0): Challenge {
  const { a, k, s, t } = practiceInput(id, variant);
  const base = { id, question: 'Enter only the result.' };
  switch (id) {
    case 'fixed-sum': return { ...base, strategy: 'fixed', topic: 'Best total of k in a row', section: 'fixed-pane',
      prompt: `Daily catches: ${list(a)}. Find the best total over exactly ${k} consecutive days. Aim for O(n) time and O(1) extra space.`,
      question: 'Enter the best total.', answer: maxFixedSum(a, k),
      hints: ['How many days change when the block moves by one day?', `Total the first ${k} days, then add the day that enters and subtract the day ${k} back.`, 'Start best at the first total, not at 0: totals can be negative.'],
      rubric: [`Every block of exactly ${k} days is checked once.`, 'Each move is one addition and one subtraction.', 'best starts at the first full block, so all-negative input still works.'],
      explanation: 'A fixed-width block changes by one item in and one item out. Keeping the running total makes every move O(1).' };
    case 'anagram': return { ...base, strategy: 'fixed', topic: 'Same letters, any order', section: 'anagram-flags',
      prompt: `Does “${s}” contain some rearrangement of “${t}” as a block of neighbouring letters? Aim for linear time.`,
      question: 'Enter yes or no.', answer: hasAnagram(t, s),
      hints: ['A rearrangement has the same letters and the same length.', `So look only at blocks of exactly ${t.length} letters.`, 'Keep letter counts for the block; update two counts per move and check whether they all match.'],
      rubric: [`The block width is fixed at ${t.length}.`, 'Counts are updated, not recomputed: one letter in, one out.', 'A single matching block is enough to answer yes.'],
      explanation: 'An anagram has the same multiset of letters and the same length, so a fixed-width block with a letter tally finds it in one pass.' };
    case 'flips': return { ...base, strategy: 'longest', topic: 'Operation budget becomes a contents budget', section: 'dark-lamps',
      prompt: `Lamps ${list(a)} (1 = lit, 0 = dark). You may switch on at most ${k} dark lamps. What is the longest run of neighbouring lit lamps you can make?`,
      question: 'Enter the length.', answer: longestAtMostZeros(a, k),
      hints: ['Stop choosing which lamps to switch on. What must a stretch satisfy to become fully lit?', `A stretch works exactly when it holds at most ${k} dark lamps.`, 'Grow; while there are too many dark lamps, drop from the left; record after.'],
      rubric: [`The rule is “at most ${k} zeros in the stretch”.`, 'An illegal stretch stays illegal as it grows, so the left end may move on for good.', 'The length is recorded after the repair loop, never before.'],
      explanation: 'Reframe the operation limit as a limit on the stretch’s contents, then it is a longest-legal-stretch scan.' };
    case 'no-repeat': return { ...base, strategy: 'longest', topic: 'No repeated characters', section: 'no-repeats',
      prompt: `In “${s}”, how long is the longest block of neighbouring characters in which no character appears twice?`,
      question: 'Enter the length.', answer: longestNoRepeat(s),
      hints: ['When a newcomer causes a repeat, which character is repeated?', 'Only the newcomer can be the repeat: the block was fine before it arrived.', 'Move the left end past the earlier copy, never backwards (use max), then record.'],
      rubric: ['The left end only moves forward; an old position behind it is ignored.', 'A block holding a repeat stays bad as it grows to the right.', 'The length is recorded after the left end has been fixed.'],
      explanation: 'Keep the last position of each character and jump the left end past the earlier copy, guarded with max so it never moves back.' };
    case 'two-kinds': return { ...base, strategy: 'longest', topic: 'At most two kinds', section: 'two-baskets',
      prompt: `Trees in a row bear fruit types ${list(a)}. You have two baskets, each for one type. Start at any tree and pick one fruit from each tree moving right, stopping as soon as a fruit fits neither basket. How many fruits can you pick at most?`,
      question: 'Enter the number of fruits.', answer: atMostKinds(a, 2)[0],
      hints: ['Say the basket rule as a rule about a stretch of trees.', 'A stretch works when it holds at most 2 different types.', 'Count types in view; drop from the left while there are 3; remove a type when its count hits 0.'],
      rubric: ['The rule is “at most 2 distinct values in the stretch”.', 'A type whose count reaches zero is removed, so the distinct count stays honest.', 'Record after shrinking.'],
      explanation: 'It is the longest stretch with at most two distinct values: a counts map, shrink while it has three keys.' };
    case 'repaint': return { ...base, strategy: 'longest', topic: 'Keep the majority, repaint the rest', section: 'k-repaints',
      prompt: `Doors are painted “${s}”. You may repaint at most ${k} doors to any letter. What is the longest block of neighbouring doors that can all end up the same letter?`,
      question: 'Enter the length.', answer: longestRepaint(s, k),
      hints: ['Inside one block, which letter should you keep?', 'A block needs (length − count of its most common letter) repaints.', `Grow; while length − maxFreq > ${k}, drop from the left; record. A stale maxFreq is safe.`],
      rubric: ['Legal means length − most common count ≤ k.', 'The block’s length never decreases, and grows only when it is genuinely legal.', 'Record the length, not maxFreq + k.'],
      explanation: 'Repaint everything except the most common letter. A block is legal when length − maxFreq ≤ k.' };
    case 'toll': return { ...base, strategy: 'shortest', topic: 'Shortest block reaching a total', section: 'toll',
      prompt: `Stalls pay ${list(a)} coins. What is the shortest block of neighbouring stalls that pays at least ${k}? Enter 0 if none does. Aim for O(n).`,
      question: 'Enter the length (0 if none).', answer: shortestAtLeast(a, k),
      hints: ['Once a block reaches the total, does growing it ever help?', 'Every payment is positive, so a qualifying block keeps qualifying as it grows.', 'Grow; while the total is enough, record the length, then drop from the left.'],
      rubric: ['Record inside the loop, while the block still qualifies.', 'Shrink with a while, not an if: several drops may still qualify.', 'Report 0 if nothing was ever recorded.'],
      explanation: 'With positive values, a qualifying block is the best one for its left end. Log it, then squeeze from the left.' };
    case 'cover': return { ...base, strategy: 'shortest', topic: 'Shortest block containing a list', section: 'shopping-list',
      prompt: `What is the shortest block of neighbouring letters in “${s}” that contains every letter of “${t}”, counting repeats?`,
      question: 'Enter the block itself.', answer: minCover(s, t),
      hints: ['What single number could tell you the block covers the whole list?', 'Track how many letters of the list are still missing. Only a still-needed letter lowers it.', 'Grow; while nothing is missing, record, then drop from the left (a needed letter leaving raises missing).'],
      rubric: ['missing drops only for a letter that was still needed; surplus copies don’t count.', 'Record inside the loop, before the left end moves.', 'Every right end gets its shortest covering block checked.'],
      explanation: 'A need tally plus a missing counter: grow until nothing is missing, then record and squeeze.' };
    case 'window-max': return { ...base, strategy: 'deque', topic: 'Maximum of every block', section: 'tallest-mast',
      prompt: `Mast heights ${list(a)}. Report the tallest of every ${k} neighbouring masts, from left to right, in O(n) total time.`,
      question: 'Enter the list of maxima.', answer: windowMaxima(a, k),
      hints: ['When a taller mast arrives, can an older, shorter one ever be the tallest again?', 'Keep only candidates, in decreasing height; the front is the answer.', 'Pop the back while it is no taller than the newcomer; pop the front once its index leaves; read the front.'],
      rubric: ['Store indices so you can tell when the front expires.', 'Each index is pushed once and popped at most once: amortised O(1).', `Answers start once ${k} masts are in view.`],
      explanation: 'A queue of indices with decreasing values: older, shorter masts are popped from the back; expired ones from the front.' };
    case 'stock': return { ...base, strategy: 'running', topic: 'Buy before you sell', section: 'buy-low',
      prompt: `Prices by day: ${list(a)}. Buy once, then sell once on a later day. What is the best profit? Enter 0 if no trade makes money.`,
      question: 'Enter the best profit.', answer: bestProfit(a),
      hints: ['For a sale today, which earlier day is the best one to have bought on?', 'Remember the lowest price so far.', 'Each day: update the lowest, then consider selling today against it.'],
      rubric: ['Only earlier days can be the buy day.', 'One running minimum is all the state you need.', 'max − min of the whole list ignores time order.'],
      explanation: 'Keep the cheapest price so far; each day, profit = price − cheapest so far.' };
    case 'exactly-k': return { ...base, strategy: 'count', topic: 'Exactly K different values', section: 'exactly-k',
      prompt: `How many blocks of neighbouring values in ${list(a)} contain exactly ${k} different values?`,
      question: 'Enter the count.', answer: atMostKinds(a, k)[1] - atMostKinds(a, k - 1)[1],
      hints: ['Is “exactly K” well-behaved as a block grows? Is “at most K”?', 'Counting blocks with at most K values: each right end adds right − left + 1.', `Answer = atMost(${k}) − atMost(${k - 1}).`],
      rubric: ['“Exactly K” isn’t monotone, so it is split into two “at most” counts.', 'Each right end counts every legal left end at once.', 'Zero-count keys are removed so the distinct count stays honest.'],
      explanation: 'exactly(K) = atMost(K) − atMost(K − 1), where atMost adds right − left + 1 per right end.' };
    case 'delete-one': return { ...base, strategy: 'longest', topic: 'A mandatory deletion', section: 'delete-one',
      prompt: `From ${list(a)} you must delete exactly one element. What is the longest block of neighbouring 1s that can remain?`,
      question: 'Enter the length.', answer: longestAfterDelete(a),
      hints: ['The deleted element can be a 0 you skip over. How many 0s may a block hold?', 'At most one 0 in the block.', 'Shrink while there are two 0s; record right − left (the length minus the deleted element).'],
      rubric: ['The block may hold at most one 0.', 'The deletion is mandatory, so the answer is the length − 1 even with no 0.', 'Record after the repair loop.'],
      explanation: 'A block with at most one zero, and the record is its length minus one for the mandatory deletion.' };
    case 'product': return { ...base, strategy: 'count', topic: 'Count blocks under a product limit', section: 'product-below',
      prompt: `How many blocks of neighbouring values in ${list(a)} have a product strictly less than ${k}?`,
      question: 'Enter the count.', answer: countProductBelow(a, k),
      hints: ['With every value at least 1, what happens to a product as a block grows?', 'Shrink by dividing out the left value while the product is too big.', 'Each right end then adds right − left + 1 blocks.'],
      rubric: ['Products of values ≥ 1 never shrink as the block grows.', 'Every block ending here and starting at left or later qualifies.', 'Guard limits ≤ 1, where nothing qualifies.'],
      explanation: 'Shrink while product ≥ limit, then count right − left + 1 blocks for each right end.' };
    case 'cards': return { ...base, strategy: 'complement', topic: 'Take from both ends', section: 'cards',
      prompt: `Cards ${list(a)} lie in a row. Take exactly ${k} cards, each from the left end or the right end. What is the highest total you can take?`,
      question: 'Enter the highest total.', answer: bestFromEnds(a, k),
      hints: ['The cards you take aren’t neighbours. What about the ones you leave behind?', `The cards left behind are one block of ${a.length - k}.`, 'Find the smallest total of any such block; subtract it from the total of all cards.'],
      rubric: ['The leftovers are always contiguous.', 'Maximising what you take = minimising what you leave.', 'A fixed-width scan over the leftovers runs in O(n).'],
      explanation: 'Slide a block of width n − k to find the cheapest leftovers; the answer is total − cheapest.' };
    case 'negatives': return { ...base, strategy: 'deque', topic: 'Shortest total with negatives', section: 'negatives',
      prompt: `Values ${list(a)} (some negative). What is the shortest block of neighbouring values with a total of at least ${k}? Enter -1 if none.`,
      question: 'Enter the length (-1 if none).', answer: shortestWithNegatives(a, k),
      hints: ['Does growing a block always raise its total here?', 'Use prefix totals: a block’s total is prefix[end] − prefix[start].', 'Keep candidate starts with increasing prefix totals; pop the front while it qualifies (record), pop the back while its prefix is ≥ the new one.'],
      rubric: ['Negative values break the shrink-while-it-qualifies promise.', 'A start with a higher or equal prefix that is also earlier can never win.', 'Each index enters and leaves the queue at most once.'],
      explanation: 'Prefix totals plus a monotonic queue of starts: O(n) even with negative values.' };
    case 'sum-equals': return { ...base, strategy: 'other', topic: 'Know when to choose another tool', section: 'choose-the-tool',
      prompt: `Values ${list(a)}, some negative. How many blocks of neighbouring values have a total of exactly ${k}? Aim for O(n) expected time.`,
      question: 'Enter the count.', answer: countSumEquals(a, k),
      hints: ['With negatives, can you tell which end of a block to move?', 'A block total is a difference of two prefix totals.', `For each prefix p, count how many earlier prefixes equal p − (${k}). Start with the empty prefix 0 seen once.`],
      rubric: ['Neither end has a safe move: totals aren’t monotone.', 'A hash map counts earlier prefix totals.', 'The empty prefix (0, seen once) counts blocks that start at index 0.'],
      explanation: 'Exact totals with negative values: prefix totals and a hash map of how often each total has appeared.' };
  }
}

export const practice: PracticeSet = {
  storageKey: 'citadel-sliding-window-review-v1',
  strategies,
  conceptIds,
  challengeFor: (id, variant = 0) => challengeFor(id as ConceptId, variant),
};
