// Independent practice for the Prefix Sum lesson. Prompts never name the pattern; inputs vary with `variant`.
import type { Challenge, PracticeSet } from '../../lib/practice.ts';

export const strategies = {
  ledger: 'Precompute running totals; answer any range with one subtraction (or XOR)',
  sides: 'Combine an everything-to-the-left value with an everything-to-the-right value',
  vault: 'Running total plus a lookup of totals (or remainders) already seen',
  grid: 'Running totals over a 2-D table; add and subtract corner blocks',
  marks: 'Mark where each change starts and stops, then accumulate once',
  other: 'Another tool fits better than running totals here',
} as const;
type Strategy = keyof typeof strategies;

export const conceptIds = [
  'range-sum', 'pivot', 'product', 'count-k', 'multiple-k', 'equal-01', 'divisible',
  'nice', 'xor', 'grid', 'range-updates', 'positive-window', 'live-updates',
] as const;
type ConceptId = typeof conceptIds[number];

const arr = (a: number[]) => `[${a.join(', ')}]`;
const rotate = (a: number[], by: number) => a.length ? a.map((_, i) => a[(i + by) % a.length]) : [];
const sum = (a: number[], l: number, r: number) => { let s = 0; for (let i = l; i <= r; i++) s += a[i]; return s; };
const countRuns = (a: number[], ok: (s: number, len: number) => boolean) => {
  let c = 0;
  for (let i = 0; i < a.length; i++) for (let j = i; j < a.length; j++) if (ok(sum(a, i, j), j - i + 1)) c++;
  return c;
};

function make(id: ConceptId, variant: number): Omit<Challenge, 'id'> {
  const v = Math.abs(Math.trunc(variant));
  switch (id) {
    case 'range-sum': {
      const bases = [[3, -1, 4, 1, -5, 9, 2], [2, 7, -3, 0, 5, -8, 6], [-4, 6, 1, -2, 8, 3, -7]];
      const shift = Math.floor(v / 3) % 4;
      const a = bases[v % 3].map(x => x + shift);
      const l = v % 3, r = l + 2 + (Math.floor(v / 2) % 3);
      const answer = sum(a, l, r);
      return {
        topic: 'Many range totals on fixed data', section: 'range-sum', strategy: 'ledger',
        prompt: `The list ${arr(a)} never changes, but it will be asked thousands of questions of the form “what is the total from position l to position r, inclusive?” (positions start at 0). Answer one of them: l = ${l}, r = ${r}.`,
        question: 'Enter the total.', answer,
        hints: ['Re-adding each range is O(n) per question. What could you write down once?', 'Keep n + 1 lines: line 0 is 0, line i + 1 is line i plus value i.', `Answer = line ${r + 1} − line ${l}.`],
        rubric: ['The table has n + 1 entries with a leading 0, so a range from 0 needs no special case.', 'Line r + 1 minus line l cancels the shared beginning exactly, whatever the signs.', 'O(n) once to build, then O(1) per question.'],
        explanation: `Lines ${r + 1} and ${l} differ by exactly positions ${l}..${r}: the total is ${answer}.`,
      };
    }
    case 'pivot': {
      const bases = [[1, 7, 3, 6, 5, 6], [2, 1, -1], [1, 2, 3], [-1, -1, 0, 1, 1, 0], [0, 0, 0], [4, -2, 7, -3, 2, 4]];
      const m = 1 + (Math.floor(v / 6) % 3);
      const a = bases[v % 6].map(x => x * m);
      let answer = -1;
      for (let i = 0, left = 0, total = sum(a, 0, a.length - 1); i < a.length; left += a[i], i++) if (left === total - left - a[i]) { answer = i; break; }
      return {
        topic: 'Left side against right side', section: 'pivot-index', strategy: 'sides',
        prompt: `In ${arr(a)}, find the leftmost position whose values strictly to the left add up to the same total as its values strictly to the right. An empty side totals 0. Positions start at 0; answer −1 if there is none. Use O(1) extra space.`,
        question: 'Enter the position (or −1).', answer,
        hints: ['The left side, the position itself and the right side always add up to the grand total.', 'Compute the grand total once, then carry the left total as you walk.', 'Right = total − left − value. Compare, then add the value to the left side.'],
        rubric: ['The grand total is computed once.', 'The right side is total − left − value; the position itself belongs to neither side.', 'Scanning from the left makes the first match the leftmost; O(n) time, O(1) space.'],
        explanation: answer >= 0 ? `At position ${answer} both sides total ${sum(a, 0, answer - 1)}.` : 'No position balances the two sides.',
      };
    }
    case 'product': {
      const bases = [[1, 2, 3, 4], [-1, 1, 0, -3, 3], [2, 3, 0, 4], [0, 0, 5, 2], [3, -2, 1, 5], [2, 2, 2]];
      const base = bases[v % 6];
      const a = rotate(base, Math.floor(v / 6) % base.length);
      const answer = a.map((_, i) => a.reduce((p, x, j) => (j === i ? p : p * x), 1));
      return {
        topic: 'Everything except one position, no division', section: 'product-except-self', strategy: 'sides',
        prompt: `For ${arr(a)}, build a new list where position i holds the product of every value EXCEPT the one at position i. Division is not allowed; aim for O(n) time and O(1) extra space besides the output.`,
        question: 'Enter the whole output list.', answer: answer.map(x => x + 0),
        hints: ['Everything except i splits into two groups around i.', 'One pass from the front can write the product of everything before each position.', 'A second pass from the back carries one running product and multiplies it in before including the current value.'],
        rubric: ['answer[i] = (product left of i) × (product right of i), each starting from the empty product 1.', 'Pass 2 uses the running suffix before folding in nums[i].', 'Zeros need no special case because nothing is divided.'],
        explanation: `The result is ${arr(answer.map(x => x + 0))}.`,
      };
    }
    case 'count-k': {
      const bases: [number[], number][] = [[[3, 4, 7, -2, 2], 7], [[1, 2, 3], 3], [[1, -1, 1, -1], 0], [[2, -1, 1, 2, -2, 3], 3], [[1, 1, 1], 2], [[-1, 2, -1, 2, -1], 1]];
      const [base, k] = bases[v % 6];
      const a = rotate(base, Math.floor(v / 6) % base.length);
      const answer = countRuns(a, s => s === k);
      return {
        topic: 'Count runs with an exact total', section: 'count-k', strategy: 'vault',
        prompt: `How many contiguous, non-empty stretches of ${arr(a)} add up to exactly ${k}? Values can be negative. Aim for one pass.`,
        question: 'Enter the number of stretches.', answer,
        hints: ['Stand at the end of a stretch. What total must have been reached just before it began?', 'Keep the running total and a tally of every running total seen so far, starting with 0 seen once.', `At each position add the tally of (running − ${k}), then record the running total.`],
        rubric: ['The tally is seeded with total 0 once, so stretches from the first value count.', 'Count before recording, so a total never matches itself.', 'Tallies, not just presence: equal totals at different positions are different starts. O(n) expected time.'],
        explanation: `${answer} stretch(es) total ${k}. Negative values rule out a grow/shrink window.`,
      };
    }
    case 'multiple-k': {
      const bases: [number[], number][] = [[[23, 2, 4, 6, 7], 6], [[23, 2, 6, 4, 7], 13], [[5, 0, 0], 3], [[1, 2, 3], 5], [[0], 4], [[4, 1, 2, 3], 7], [[1, 1], 2], [[2, 4, 3], 6]];
      const [a, k] = bases[v % bases.length];
      const answer = countRuns(a, (s, len) => len >= 2 && s % k === 0) > 0;
      return {
        topic: 'A run of length ≥ 2 that is a multiple of k', section: 'multiple-of-k', strategy: 'vault',
        prompt: `Does ${arr(a)} contain a contiguous stretch of AT LEAST TWO values whose total is a multiple of ${k}? (0 counts as a multiple.)`,
        question: 'Enter yes or no.', answer,
        hints: ['If two running totals leave the same remainder, what does the stretch between them leave?', 'Remember the FIRST position where each remainder appeared; the empty start has remainder 0 at position −1.', 'At each position, if this remainder was first seen at least two positions back, answer yes.'],
        rubric: ['Equal remainders mean the stretch between them is divisible by k.', 'The first index of each remainder is kept and never overwritten (earliest = longest).', 'Seed remainder 0 at −1 so a stretch starting at position 0 has the right length.'],
        explanation: answer ? 'Two running totals share a remainder at least two positions apart.' : 'No remainder repeats with a gap of two or more positions.',
      };
    }
    case 'equal-01': {
      const bases = [[0, 1, 1, 1, 1, 1, 0, 0, 0], [0, 1, 0], [1, 1, 1, 0], [0, 0, 1, 0, 0, 0, 1, 1], [1, 0, 1, 1, 0, 0, 1], [1, 1, 1]];
      const base = bases[v % 6];
      const a = rotate(base, Math.floor(v / 6) % base.length);
      let answer = 0;
      for (let i = 0; i < a.length; i++) for (let j = i; j < a.length; j++) {
        const ones = a.slice(i, j + 1).filter(x => x === 1).length;
        if (2 * ones === j - i + 1) answer = Math.max(answer, j - i + 1);
      }
      return {
        topic: 'Longest balanced stretch', section: 'equal-zeros-ones', strategy: 'vault',
        prompt: `In the binary list ${arr(a)}, how long is the longest contiguous stretch with equally many 0s and 1s? Answer 0 if there is none.`,
        question: 'Enter the length.', answer,
        hints: ['Could “equally many” become “adds up to zero” under some rewriting of the values?', 'Count a 0 as −1 and a 1 as +1, and keep a running balance.', 'Remember the first position of each balance (balance 0 at position −1). A repeat at position i gives length i − first.'],
        rubric: ['0 → −1 makes a balanced stretch sum to 0.', 'Equal balances bracket a balanced stretch.', 'Keep the first index of each balance, seeded 0 → −1, to get the longest; O(n).'],
        explanation: `The longest balanced stretch has length ${answer}.`,
      };
    }
    case 'divisible': {
      const bases: [number[], number][] = [[[4, 5, 0, -2, -3, 1], 5], [[-1, 5], 5], [[-1, 2, 9], 2], [[2, -2, 2, -4], 6], [[7, -5, 5, -3], 4]];
      const [base, k] = bases[v % 5];
      const a = rotate(base, Math.floor(v / 5) % base.length);
      const answer = countRuns(a, s => s % k === 0);
      return {
        topic: 'Count runs divisible by k, with negatives', section: 'divisible-by-k', strategy: 'vault',
        prompt: `How many contiguous, non-empty stretches of ${arr(a)} have a total divisible by ${k}? Values can be negative.`,
        question: 'Enter the number of stretches.', answer,
        hints: ['Two running totals with the same remainder bracket a divisible stretch.', `Keep a tally per remainder 0..${k - 1}, starting with remainder 0 seen once.`, 'In Java, fold remainders with ((x % k) + k) % k — a negative total must land in the same bucket as its positive equivalent.'],
        rubric: ['Tally remainders, seeded with the empty total in bucket 0.', 'Negative remainders are folded into 0..k − 1 before use.', 'Count before recording; O(n + k) time, O(k) space.'],
        explanation: `${answer} stretch(es) are divisible by ${k}.`,
      };
    }
    case 'nice': {
      const bases: [number[], number][] = [[[2, 2, 2, 1, 2, 2, 1, 2, 2, 2], 2], [[1, 1, 2, 1, 1], 3], [[2, 4, 6], 1], [[1, 2, 3, 4, 5], 2], [[3, 3, 3], 1]];
      const [base, k] = bases[v % 5];
      const a = rotate(base, Math.floor(v / 5) % base.length);
      let answer = 0;
      for (let i = 0; i < a.length; i++) for (let j = i; j < a.length; j++) if (a.slice(i, j + 1).filter(x => x % 2 !== 0).length === k) answer++;
      return {
        topic: 'Count runs by a property of their values', section: 'nice-subarrays', strategy: 'vault',
        prompt: `How many contiguous, non-empty stretches of ${arr(a)} contain exactly ${k} odd number(s)?`,
        question: 'Enter the number of stretches.', answer,
        hints: ['Only odd-or-even matters. Rewrite each value as 1 or 0.', 'Now the number of odd values in a stretch is a sum of 1s.', `Tally the running odd-count (0 seen once at the start) and add the tally of (count − ${k}) at each position before recording.`],
        rubric: ['Odd → 1, even → 0 turns the property into a sum.', 'Same count-then-record loop as an exact-total count, seeded with 0.', 'The running count is at most n, so an array of tallies works; O(n).'],
        explanation: `${answer} stretch(es) contain exactly ${k} odd number(s).`,
      };
    }
    case 'xor': {
      const bases = [[1, 3, 4, 8], [4, 8, 2, 10], [5, 1, 7, 2, 6]];
      const a = bases[v % 3];
      const l = Math.floor(v / 3) % (a.length - 1), r = l + 1 + (v % (a.length - 1 - l));
      let answer = 0;
      for (let i = l; i <= r; i++) answer ^= a[i];
      return {
        topic: 'Range questions under XOR', section: 'prefix-xor', strategy: 'ledger',
        prompt: `The list ${arr(a)} gets many questions: “what is the bitwise XOR of positions l through r, inclusive?” (positions start at 0). Answer one: l = ${l}, r = ${r}.`,
        question: 'Enter the XOR.', answer,
        hints: ['What cancels itself under XOR?', 'Keep n + 1 running XORs, starting from 0.', `Answer = line ${r + 1} XOR line ${l}.`],
        rubric: ['x ^ x = 0, so a shared beginning cancels exactly as with subtraction.', 'A leading 0 line means a range from position 0 needs no special case.', 'O(n) to build, O(1) per question.'],
        explanation: `The XOR of positions ${l}..${r} is ${answer}.`,
      };
    }
    case 'grid': {
      const off = v % 3;
      const rows = [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]].map(row => row.map(x => x - 4 * off + (x % 3)));
      const r1 = v % 2, r2 = r1 + 1, c1 = Math.floor(v / 2) % 3, c2 = Math.min(3, c1 + 1 + (v % 2));
      let answer = 0;
      for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) answer += rows[r][c];
      return {
        topic: 'Rectangle totals in a fixed table', section: 'grid-sums', strategy: 'grid',
        prompt: `A fixed table has rows ${rows.map(arr).join(', ')}. Thousands of questions ask for the total inside a rectangle. What is the total of rows ${r1} to ${r2} and columns ${c1} to ${c2}, inclusive (counting from 0)?`,
        question: 'Enter the total.', answer,
        hints: ['Store, for every cell, the total of the whole block above and to the left of it.', 'Add a zero row and a zero column so blocks touching the edge need no special case.', 'Big block − block above − block to the left + the corner block that was removed twice.'],
        rubric: ['P[r + 1][c + 1] holds the block from (0, 0) to (r, c), with a zero border.', 'Inclusion–exclusion: the overlapping corner is added back once.', 'O(rows × cols) to build, O(1) per rectangle.'],
        explanation: `The rectangle totals ${answer}.`,
      };
    }
    case 'range-updates': {
      const n = 5 + (v % 2);
      const pool: [number, number, number][] = [[0, 1, 10], [1, 2, 20], [1, 4, 25], [2, 3, -5], [0, 4, 3], [3, n - 1, 7]];
      const updates = [0, 1, 2].map(j => pool[(v + 2 * j) % pool.length]);
      const answer = Array(n).fill(0);
      for (const [l, r, x] of updates) for (let i = l; i <= r; i++) answer[i] += x;
      return {
        topic: 'Many range updates, one read', section: 'range-updates', strategy: 'marks',
        prompt: `${n} counters start at 0. Apply these updates, each meaning “add v to every counter from position l to r, inclusive” (positions start at 0), written as (l, r, v): ${updates.map(([l, r, x]) => `(${l}, ${r}, ${x})`).join(', ')}. Up to 20,000 updates may arrive, so each update should touch as little as possible. What are the final counters?`,
        question: 'Enter all the counters.', answer,
        hints: ['Each update only changes things at two places: where it starts and just after it ends.', 'Keep n + 1 slots. Add v at l and subtract v at r + 1.', 'After all updates, one pass of running totals gives every counter.'],
        rubric: ['Two writes per update, independent of the range length.', 'The minus goes at r + 1 (just after the end), with a spare slot at n.', 'One accumulating pass at the end: O(updates + n).'],
        explanation: `The counters are ${arr(answer)}.`,
      };
    }
    case 'positive-window': {
      const bases: [number[], number][] = [[[2, 3, 1, 2, 4, 3], 7], [[1, 4, 4], 4], [[1, 1, 1, 1, 1, 1, 1, 1], 11], [[5, 1, 3, 5, 10, 7, 4, 9, 2, 8], 15]];
      const [base, t] = bases[v % 4];
      const a = rotate(base, Math.floor(v / 4) % base.length);
      let answer = 0;
      for (let i = 0; i < a.length; i++) for (let j = i; j < a.length; j++) if (sum(a, i, j) >= t && (answer === 0 || j - i + 1 < answer)) answer = j - i + 1;
      return {
        topic: 'Know when to choose another tool', section: 'choose-the-tool', strategy: 'other',
        prompt: `Every value in ${arr(a)} is positive. What is the length of the SHORTEST contiguous stretch whose total is at least ${t}? Use O(1) extra space; answer 0 if there is none.`,
        question: 'Enter the length.', answer,
        hints: ['All values are positive. What happens to a stretch’s total when it gains or loses a value at an end?', 'Totals move monotonically, so two boundaries can chase each other.', 'Grow the right end; while the total is at least the target, record the length and drop the left value.'],
        rubric: ['Positive values make growing raise the total and shrinking lower it.', 'Each boundary moves forward at most n times: O(n) time, O(1) space.', 'Stored running totals would cost O(n) space and match exact totals, not thresholds.'],
        explanation: `The shortest stretch has length ${answer}. With positive values a grow/shrink window fits the O(1)-space constraint.`,
      };
    }
    case 'live-updates': {
      const bases = [[3, 1, 4, 1, 5, 9], [2, 7, 1, 8, 2, 8], [6, -2, 5, 3, -1, 4]];
      const a = [...bases[v % 3]];
      const i = (v + 2) % a.length, x = 10 + (v % 5);
      const l = v % 2, r = l + 3;
      const after = [...a]; after[i] = x;
      const answer = sum(after, l, r);
      return {
        topic: 'Know when to choose another tool', section: 'choose-the-tool', strategy: 'other',
        prompt: `The list ${arr(a)} receives 100,000 operations, interleaved: “set position i to x” and “total of positions l through r”. Each must be fast. After setting position ${i} to ${x}, what is the total of positions ${l} to ${r}?`,
        question: 'Enter the total.', answer,
        hints: ['A table of totals written once goes stale when a value changes.', 'Updating every stored total after position i costs O(n) per change.', 'A structure built for changes answers both operations in O(log n).'],
        rubric: ['Interleaved point updates invalidate a precomputed table.', 'A Fenwick tree or segment tree gives O(log n) updates and range totals.', 'Precomputed totals are right only when the data never changes.'],
        explanation: `After the update the total of ${l}..${r} is ${answer}. With interleaved updates, use a Fenwick tree or a segment tree.`,
      };
    }
  }
}

export function challengeFor(id: string, variant = 0): Challenge {
  return { id, question: 'Enter only the result.', ...make(id as ConceptId, variant) };
}

export const practice: PracticeSet = {
  storageKey: 'citadel-prefix-sum-review-v1',
  strategies,
  conceptIds,
  challengeFor,
};
