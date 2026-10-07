// Decision puzzles for the Prefix Sum lesson. Every number here is re-derived in tests/prefix-sum.test.ts.
import { row, step } from '../../lib/trace.ts';

export const rangeSum = [
  step('The ledger for [3, 1, 4, 1, 5] is written. The auditor asks for positions 1 through 3, inclusive. Which subtraction answers it?',
    [row('Values', [3, 1, 4, 1, 5], { 1: 'L', 3: 'R' }, { tones: { 1: 'hot', 2: 'hot', 3: 'hot' } }),
      row('Ledger', [0, 3, 4, 8, 9, 14], { 1: 'prefix[1]', 4: 'prefix[4]' })], 0, [
      ['prefix[4] − prefix[1] = 9 − 3 = 6', 'Yes. prefix[4] covers positions 0..3 and prefix[1] covers position 0. The shared 3 cancels, leaving 1 + 4 + 1 = 6.'],
      ['prefix[3] − prefix[1] = 8 − 3 = 5', 'prefix[3] stops before position 3, so this is 1 + 4 only. It drops the last value you were asked for, the 1 at position 3.'],
      ['prefix[4] − prefix[2] = 9 − 4 = 5', 'prefix[2] already includes position 1, so subtracting it removes the 1 you were asked to keep. This is 4 + 1.'],
    ]),
  step('Now the auditor asks for positions 0 through 2. You take prefix[3] = 8. Which line do you subtract?',
    [row('Values', [3, 1, 4, 1, 5], { 0: 'L', 2: 'R' }, { tones: { 0: 'hot', 1: 'hot', 2: 'hot' } }),
      row('Ledger', [0, 3, 4, 8, 9, 14], { 0: 'prefix[0]', 3: 'prefix[3]' })], 1, [
      ['prefix[1] = 3', 'prefix[1] holds the 3 at position 0, which is inside the range. 8 − 3 = 5 would lose it.'],
      ['prefix[0] = 0, the blank line above everything', 'Exactly. 8 − 0 = 8 = 3 + 1 + 4. The extra zero line means a range from 0 has the same shape as every other range.'],
      ['There is no line before 0, so add the values one by one', 'That is the O(n)-per-question work the ledger exists to avoid. The zero line is the line before 0.'],
    ]),
];

export const pivot = [
  step('Values [1, 7, 3, 6, 5, 6]; the total is 28. At index 3, leftSum = 1 + 7 + 3 = 11. What does the right side weigh?',
    [row('Values', [1, 7, 3, 6, 5, 6], { 3: 'i' }, { tones: { 0: 'done', 1: 'done', 2: 'done', 3: 'hot' } })], 1, [
      ['28 − 11 = 17', 'That still includes the 6 at index 3 itself. The pivot belongs to neither side.'],
      ['28 − 11 − 6 = 11', 'Yes. Left 11 equals right 11, and indexes 0, 1 and 2 did not balance, so index 3 is the leftmost pivot.'],
      ['Add 5 + 6 directly', 'The number is right, but re-adding the right side at every index is O(n) each time, O(n²) overall. The total already knows it.'],
    ]),
  step('Values [2, 1, −1]. At index 0 nothing lies to the left. Can index 0 be the pivot?',
    [row('Values', [2, 1, -1], { 0: 'i' }, { tones: { 0: 'hot' } })], 1, [
      ['No: a pivot needs values on both sides', 'The problem defines an empty side as weighing 0. Here both sides weigh 0, so index 0 is the answer.'],
      ['Yes: left is 0 and right is 2 − 0 − 2 = 0', 'Correct. leftSum starts at 0, so the first comparison handles the empty left side with no special case. (1 + (−1) = 0 on the right.)'],
    ]),
];

export const product = [
  step('Pass 1 is done: answer holds the product of everything LEFT of each index. Pass 2 starts at the end with suffix = 1. What is the final answer[3]?',
    [row('nums', [1, 2, 3, 4], { 3: 'i' }), row('answer after pass 1', [1, 1, 2, 6], { 3: 'i' })], 0, [
      ['6 × 1 = 6', 'Yes. Nothing lies right of index 3, so the suffix is the empty product, 1. Only after writing does suffix become 1 × 4 = 4.'],
      ['6 × 4 = 24', 'That multiplies index 3 by its own value. Use suffix first, then fold nums[3] into it.'],
      ['24 ÷ 4 = 6', 'Right number, but division is banned, and it breaks the moment a value is 0.'],
    ]),
  step('suffix is now 4. At index 2, answer[2] holds 2 (that is 1 × 2). What is the final answer[2]?',
    [row('nums', [1, 2, 3, 4], { 2: 'i' }), row('answer so far', [1, 1, 2, 6], { 2: 'i' }, { tones: { 3: 'done' } })], 0, [
      ['2 × 4 = 8', 'Yes. Left of index 2 is 1 × 2 = 2; right of it is 4. Then suffix becomes 4 × 3 = 12 for index 1.'],
      ['2 × 12 = 24', 'A suffix of 12 would already include the 3 at index 2, the one value you must leave out.'],
      ['3 × 4 = 12', 'That uses nums[2] = 3 itself. answer[i] is everything except position i.'],
    ]),
  step('Values [−1, 1, 0, −3, 3]. Which positions end with a nonzero answer?',
    [row('nums', [-1, 1, 0, -3, 3], {}, { tones: { 2: 'hot' } })], 1, [
      ['None: a zero wipes out everything', 'The zero is left out of its own product. Index 2 gets (−1) × 1 × (−3) × 3 = 9.'],
      ['Only index 2, the zero itself: 9', 'Yes. Every other position’s product includes the zero. The answer is [0, 0, 9, 0, 0], with no division and no special case.'],
      ['Every position except index 2', 'Those are exactly the positions whose product includes the zero, so they are the ones that become 0.'],
    ]),
];

export const countK = [
  step('Values [3, 4, 7, −2, 2], k = 7. Before reading any value, what goes into the vault?',
    [row('Values', [3, 4, 7, -2, 2]), row('Vault', [])], 1, [
      ['Nothing yet', 'Then the run [3, 4], which starts at the very first value, has no earlier total 0 to match and is never counted.'],
      ['Total 0, seen once', 'Yes: the empty prefix, the line above the first value. Every run that starts at index 0 matches it.'],
      ['Total 7, the target', 'The vault records totals that actually happened. A fake 7 would let a running total of 14 match a start that never existed.'],
    ]),
  step('You have read 3, 4, 7. Running total 14. The vault holds 0, 3 and 7, once each. How many runs end at index 2?',
    [row('Values', [3, 4, 7, -2, 2], { 2: 'HERE' }, { tones: { 0: 'done', 1: 'done' } }), row('Vault (total ×times)', ['0 ×1', '3 ×1', '7 ×1'], {}, { tones: { 2: 'hot' } })], 0, [
      ['1: look up 14 − 7 = 7, found once', 'Yes. Total 7 was written after index 1, so the run is index 2 alone: [7]. With [3, 4], found at index 1, that makes 2 runs so far.'],
      ['0: 14 is not in the vault', 'You look up running − k, not the running total itself. The question is about where the run began.'],
      ['2: both 7 and 0 are in the vault', 'Total 0 would mean a run from the start: 3 + 4 + 7 = 14, not 7. Only the line holding 14 − 7 = 7 marks a start.'],
    ]),
  step('Now k = 0 and the values are [1]. Running total 1. You record 1 in the vault FIRST, then count. What happens?',
    [row('Values', [1], { 0: 'HERE' }), row('Vault (total ×times)', ['0 ×1', '1 ×1'], {}, { tones: { 1: 'hot' } })], 1, [
      ['Count = 1, correctly: [1] sums to 0', '[1] sums to 1. The match is the total you just recorded, which describes a run of length zero.'],
      ['Count = 1, but it is a phantom: count first, then record', 'Yes. Recording first lets the current total match itself. With k = 0 that counts an empty run. The correct answer is 0.'],
      ['Count = 0 either way', 'Only when k ≠ 0. With k = 0, running − k is the running total itself, which you just put in the vault.'],
    ]),
];

export const multipleK = [
  step('[23, 2, 4, 6, 7], k = 6. Running totals leave remainders 5, 1, 5 after indexes 0, 1, 2. Remainder 5 was first seen at index 0. What does seeing it again at index 2 prove?',
    [row('Values', [23, 2, 4, 6, 7], { 2: 'HERE' }), row('Remainder mod 6', [5, 1, 5, '·', '·'], { 0: 'FIRST 5', 2: '5 AGAIN' })], 0, [
      ['Positions 1..2 total a multiple of 6 (2 + 4 = 6), length 2: return true', 'Yes. Equal remainders mean the totals differ by a multiple of 6, and their difference is exactly positions 1..2. Length 2 − 0 = 2 is enough.'],
      ['Positions 0..2 total a multiple of 6', '23 + 2 + 4 = 29, which is not. The equal remainders cancel everything up to and including index 0.'],
      ['Nothing: remainders can repeat by chance', 'Equal remainders always mean the difference of the two totals is divisible by 6. That is the whole trick.'],
    ]),
  step('[5, 0, 0], k = 3. Remainder 2 appears after index 0, then again after index 1 (length 1, too short). Do you overwrite its stored index with 1?',
    [row('Values', [5, 0, 0], { 1: 'HERE' }), row('Remainder mod 3', [2, 2, '·'], { 0: 'FIRST 2' })], 1, [
      ['Yes: keep the latest index', 'Then at index 2 the length is 2 − 1 = 1, too short again, and you miss positions 1..2 = [0, 0], whose total 0 is a multiple of 3. You would return false.'],
      ['No: keep the first index, 0', 'Yes. At index 2 the length is 2 − 0 = 2: positions 1..2 = [0, 0], total 0, a multiple of 3. The earliest index gives the longest stretch.'],
    ]),
];

export const mixedReview = [
  step('“Count subarrays summing to K” with negative numbers present. Why not a sliding window?', [], 1, [
    ['Windows cannot count, only measure length', 'Windows count runs happily when their movement rule is valid; Side quest 3’s at-most trick is a counting window. The problem is the movement rule.'],
    ['With negatives, extending the window does not monotonically change the sum, so grow/shrink has no valid direction. Prefix + hashmap counts every match in one pass', 'Yes. Window logic needs monotonicity (grow → sum up, shrink → sum down). Negatives kill it. This boundary IS the interview question half the time.'],
    ['Sliding window is O(n²) here', 'A window is O(n) when it applies. Here it doesn’t apply at all, because its shrink rule has no proof.'],
    ['It works; a window is fine', 'Try [1, −1, 1] with k = 1: the answer is 3. A window that shrinks only when the sum exceeds k never shrinks here, so it checks [1], [1, −1], [1, −1, 1] and never isolates the last [1]: it reports 2.'],
  ]),
  step('In subarraySum, what breaks without seen.put(0, 1)?', [], 1, [
    ['Nothing; it is an optimisation', 'It changes answers. [1, 2, 3] with k = 3 returns 1 instead of 2.'],
    ['Subarrays that START at index 0 are never counted: their match needs the empty prefix, total 0, in the map', 'Yes. prefix[j + 1] − K = 0 means the run from the very start sums to K, so the map must contain that empty prefix. The classic bug of this pattern.'],
    ['The map throws on missing keys', 'getOrDefault never throws. The bug is silent, which is what makes it dangerous.'],
    ['Negative K values fail', 'The sign of K is irrelevant. Only runs that begin at index 0 are lost.'],
  ]),
  step('Product of Array Except Self, no division, O(1) extra space. The move?', [], 1, [
    ['Total product divided by nums[i], handling zeros specially', 'Division is explicitly banned, and zeros poison it: one zero needs a different rule for its own position, two zeros another.'],
    ['answer[i] = left product × right product: pass 1 writes left products into answer, pass 2 multiplies in a running suffix', 'Yes. The constraint (“no division”) is the flag: decompose “everything except i” into left-of-i × right-of-i.'],
    ['Sort, then two pointers', 'Sorting destroys positions, and the answer is per position.'],
    ['Nested loops with early exit', 'That is O(n²). The two running products give O(n).'],
  ]),
  step('Every value is positive. Find the SHORTEST run with sum at least target, using O(1) extra space.', [], 1, [
    ['Running totals + a vault of earlier totals', 'The vault matches exact totals and costs O(n) space. “At least” with positive values has a cheaper, monotone tool.'],
    ['Sliding window: grow right; while the sum is ≥ target, record and shrink left', 'Yes. With positives, shrinking always lowers the sum, so the window’s moves are provably safe. O(n) time, O(1) space.'],
    ['A notice board of range updates', 'There are no updates here, only one question about runs.'],
  ]),
  step('A 0/1 array: find the LONGEST stretch with equally many 0s and 1s.', [], 2, [
    ['Count 0s and 1s for every stretch', 'Correct but O(n²). The ledger turns it into one pass.'],
    ['Map 0 → −1, then a tally map seeded 0 → 1', 'Tallies answer “how many”. “Longest” needs positions.'],
    ['Map 0 → −1, then balance → FIRST index, seeded 0 → −1', 'Yes. Equal balances bracket a balanced stretch; the earliest index gives the longest one.'],
  ]),
  step('Java, values can be negative: count runs divisible by k = 5. The running total is −1. Which bucket does it go in?', [], 1, [
    ['−1 % 5 = −1', 'Java’s % keeps the sign of the left operand. Bucket −1 crashes an int[k] and, in a map, never meets the equivalent bucket 4.'],
    ['Math.floorMod(−1, 5) = 4', 'Yes. −1 and 4 are the same remainder class. Fold every remainder into 0..k − 1 before using it as a key.'],
    ['Skip negative totals', 'Then every run that starts after a negative total is lost.'],
  ]),
  step('20,000 bookings each add seats to a range of flights. You read every flight’s total once, at the end.', [], 0, [
    ['Notice board: +v at the start, −v just after the end, then one sweep', 'Yes. Two writes per booking plus one O(n) sweep, instead of touching every flight in every range.'],
    ['Add v to every flight in each range', 'Correct but O(n × bookings): up to 400 million writes at 20,000 × 20,000.'],
    ['A prefix ledger of the flights, rebuilt after each booking', 'Rebuilding is O(n) per booking: the same O(n × bookings), with extra steps.'],
  ]),
  step('Values change between questions: “set position i to x” interleaved with “total of l..r”, 100,000 of each.', [], 2, [
    ['A prefix ledger, answered by subtraction', 'Each update invalidates every line below it, so a single update costs O(n). Interleaved, that is O(n) per operation.'],
    ['The vault of earlier totals', 'The vault counts runs in one pass over fixed data. It doesn’t answer arbitrary ranges after updates.'],
    ['A Fenwick tree or segment tree: O(log n) per update and per question', 'Yes. The ledger’s promise was that the past never changes. When it does, use a structure built for updates.'],
  ]),
  step('A fixed array gets many “maximum of l..r” questions. Can a prefix-max ledger answer them by subtraction?', [], 0, [
    ['No: max has no inverse, so a prefix max only answers ranges that start at 0', 'Yes. Subtraction and XOR undo a shared beginning; max cannot. Use a sparse table or a segment tree.'],
    ['Yes: prefixMax[r + 1] − prefixMax[l]', 'Try [5, 1, 2] with l = 1, r = 2: the prefix maxima are 5, 5, 5, so the formula says 0, but the answer is 2.'],
  ]),
];
