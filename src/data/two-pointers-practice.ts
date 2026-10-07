import type { TraceStep } from '../lib/trace';

const row = (name: string, values: (string | number)[], labels: Record<number, string> = {}) => ({
  name, cells: values.map((value, index) => ({ value: String(value), label: labels[index] })),
});
const step = (question: string, rows: TraceStep['rows'], answer: number, choices: [string, string][]): TraceStep => ({
  question, rows, answer, choices: choices.map(([label, feedback]) => ({ label, feedback })),
});

export const palindrome = [
  step('Ignore punctuation and case. The left pointer is on a comma. What do you do?',
    [row('Text: A,ba', ['A', ',', 'b', 'a'], { 1: 'LEFT', 2: 'RIGHT' })], 1, [
      ['Mismatch: return false', 'The comma does not count as a letter or digit. Skip it before comparing.'],
      ['Skip the comma on the left', 'Yes. A and a already matched. Skip the comma; the pointers meet at b, so every required pair matches.'],
      ['Sort the letters', 'Sorting changes the order. A palindrome must match in its original order.'],
    ]),
  step('Now try abca. After a matches a, b and c face each other. Is this a palindrome?',
    [row('Text: abca', ['a', 'b', 'c', 'a'], { 1: 'LEFT', 2: 'RIGHT' })], 0, [
      ['No: b and c differ', 'Correct. These are both letters, so this mismatch is real. For Valid Palindrome, you cannot delete one.'],
      ['Yes: just skip b', 'Skipping letters changes this problem. Only punctuation may be ignored here.'],
    ]),
];

export const triplets = [
  step('Fix −2. What sum do the other two numbers need to make the total zero?',
    [row('Sorted numbers', [-2, 0, 0, 2, 2], { 0: 'FIXED', 1: 'LEFT', 4: 'RIGHT' })], 2, [
      ['−2', 'The three values must add to zero. −2 needs +2 from the remaining pair.'],
      ['0', 'A pair summing to zero would leave the total at −2.'],
      ['2', 'Exactly: −2 + 2 = 0. You have turned this into the pair-search game.'],
    ]),
  step('You found [−2, 0, 2]. There is another 0 and another 2. What next?',
    [row('Same values, different positions', [-2, 0, 0, 2, 2], { 0: 'FIXED', 1: 'LEFT', 4: 'RIGHT' })], 0, [
      ['Save once; move both pointers past repeats', 'Yes. The answer asks for unique value triplets. Repeating the same 0 and 2 produces the same triplet. After skipping them, the pointers cross.'],
      ['Save it again using the other positions', 'Different positions do not make a new value triplet. That would duplicate the answer.'],
      ['Delete all duplicates before searching', 'That can erase valid answers such as [0, 0, 0]. Skip repeated results, not all repeated input values.'],
    ]),
];

export const container = [
  step('The ends have heights 2 and 8, with width 3. Area = 2 × 3 = 6. Which side should move?',
    [row('Heights', [2, 9, 4, 8], { 0: 'LEFT', 3: 'RIGHT' })], 0, [
      ['Move the shorter left side', 'Yes. Keeping height 2 while shrinking the width cannot beat 6. A taller left side might help.'],
      ['Move the taller right side', 'The short side would still cap the height at 2, while the width gets smaller. You could miss a better pair between the right wall and a taller line further inside.'],
      ['Move both sides', 'That can skip the best pair. Here heights 9 and 8, one move away, make area 16.'],
    ]),
  step('Now the ends are 9 and 8, width 2. Which area do you record?',
    [row('Heights', [2, 9, 4, 8], { 1: 'LEFT', 3: 'RIGHT' })], 1, [
      ['18: taller height × width', 'Water spills over the shorter line. Use min(9, 8), not max(9, 8).'],
      ['16: shorter height × width', 'Correct: 8 × 2 = 16. Keep the best area seen, then move the shorter right side.'],
    ]),
];

export const rain = [
  step('The known left wall is 4 and the right wall is 5. How much water sits above the next bar, height 1?',
    [row('Heights', [4, 1, 0, 2, 5], { 0: 'MAX L = 4', 1: 'NEXT', 4: 'MAX R = 5' })], 1, [
      ['4 units', 'The lower wall is 4, but the bar itself already takes up 1 unit. Water is 4 − 1.'],
      ['3 units', 'Right: min(4, 5) − 1 = 3. The right wall is already tall enough, so this left position is settled.'],
      ['We must scan every middle bar first', 'We already have a right wall at least as tall as the left wall. Taller walls inside cannot raise the left limit above 4 at this position.'],
    ]),
  step('Process height 0, then height 2. How much water is trapped across the three inside bars?',
    [row('Heights', [4, 1, 0, 2, 5]), row('Water above each bar', [0, 3, '?', '?', 0])], 2, [
      ['6', 'There are 3 units over height 1, 4 over height 0, and 2 over height 2. Add those amounts.'],
      ['12', 'The bars occupy some of the space below the waterline. Subtract each bar height.'],
      ['9', 'Yes: 3 + 4 + 2 = 9. Unlike Container With Most Water, this problem adds water above individual bars.'],
    ]),
];

export const compact = [
  step('read sees 3; write points to the next slot for a nonzero. What should happen?',
    [row('Move Zeroes', [1, 0, 0, 3, 12], { 1: 'WRITE', 3: 'READ' })], 1, [
      ['Skip 3 and advance read', '3 must be kept. Skipping it would lose a nonzero value from the final prefix.'],
      ['Swap 3 into write; advance both', 'Yes: [1, 3, 0, 0, 12]. The kept prefix is now [1, 3], in its original order.'],
      ['Advance write only when a swap changes a value', 'write counts kept values, not swaps. Even a nonzero already at write must advance it.'],
    ]),
  step('Starting from [1, 0, 3], read and write both point to 1. No swap is needed. What advances?',
    [row('Move Zeroes', [1, 0, 3], { 0: 'READ / WRITE' })], 0, [
      ['Both read and write', 'Exactly. You kept 1, so write must mark the next slot. Advancing only read would let a later value overwrite 1.'],
      ['Only read', 'Then write would still point to the kept 1. The later 3 would overwrite or swap it away.'],
    ]),
];

export const duplicates = [
  step('Keep at most two copies. The kept prefix is [1, 1], write = 2, and read sees a third 1. Keep it?',
    [row('Sorted input', [1, 1, 1, 2, 2, 3], { 0: 'WRITE − 2', 2: 'READ / WRITE' })], 0, [
      ['Skip it; advance only read', 'Correct. It equals nums[write − 2], so two copies are already kept. write stays at 2.'],
      ['Keep it because read moved', 'Reading a value does not mean keeping it. This would allow a third copy.'],
    ]),
  step('read now sees 2, while write is still 2. What happens?',
    [row('Before the write', [1, 1, 1, 2, 2, 3], { 0: 'WRITE − 2', 2: 'WRITE', 3: 'READ' })], 1, [
      ['Compare only with the previous input value', 'That rule removes all duplicate copies. For a two-copy limit, compare with the kept prefix two slots back.'],
      ['Keep 2: it differs from nums[write − 2]', 'Yes. Copy 2 to write and advance write to 3. The kept prefix becomes [1, 1, 2].'],
    ]),
];

export const colors = [
  step('mid sees 2. Swap it with high. What should happen to mid?',
    [row('Before swap', [1, 2, 0], { 0: 'LOW', 1: 'MID', 2: 'HIGH' }), row('After swap', [1, 0, 2], { 0: 'LOW', 1: 'MID / HIGH', 2: 'DONE' })], 2, [
      ['Advance mid', 'That skips the incoming 0. You would finish with [1, 0, 2], which is still out of order.'],
      ['Move mid backwards', 'Earlier positions are already classified. Recheck the new value at the current mid.'],
      ['Keep mid; move high left', 'Exactly. The incoming 0 is unexamined. Only high moves because the 2 is now in its final zone.'],
    ]),
  step('mid now sees 0. Swap it with low. Which pointers advance?',
    [row('Before swap', [1, 0, 2], { 0: 'LOW', 1: 'MID / HIGH' })], 0, [
      ['Both low and mid', 'Yes: [0, 1, 2]. low was in the known-1 zone, so mid receives a known 1. The unknown zone is now empty.'],
      ['Only low', 'It is safe to advance mid too: the value received from low is already known to be 1 (or the swap was with itself).'],
      ['Only high', 'high marks the start of the 2 zone. This move placed a 0 and settled the current mid, so low and mid should advance.'],
    ]),
];

export const merge = [
  step('The spare slots are at the end of nums1. Which value goes into the last slot?',
    [row('nums1: 3 actual values + 3 spare slots', [1, 4, 7, '·', '·', '·'], { 2: 'I', 5: 'WRITE' }), row('nums2', [2, 5, 6], { 2: 'J' })], 1, [
      ['1: start with the smallest', 'Writing forward into nums1 can overwrite values you have not read. Use its free space at the back.'],
      ['7: the largest unread value', 'Correct. Write 7 at the back, then move i and write left. The remaining unread nums1 values stay safe.'],
    ]),
  step('Later, nums2 is exhausted. Only 1 remains unread in nums1. Is there more copying to do?',
    [row('nums1', [1, 2, 4, 5, 6, 7], { 0: 'I / WRITE' }), row('nums2', [2, 5, 6])], 0, [
      ['No: the remaining prefix is already in place', 'Exactly. That is why the loop can stop when j < 0. Remaining nums1 values already occupy the correct slots.'],
      ['Yes: move 1 to the end', 'The end is already filled with the largest values. Moving 1 there would break the order.'],
    ]),
];

export const subsequence = [
  step('We matched a. The source now offers x, but the target needs b. Which pointer moves?',
    [row('Source', ['a', 'x', 'b'], { 1: 'SOURCE' }), row('Target', ['a', 'b', 'c'], { 1: 'NEEDED' })], 1, [
      ['Both pointers', 'x did not satisfy b. Advancing the target would pretend that b had been matched.'],
      ['Only the source pointer', 'Yes. Skip x and keep looking for b. A subsequence allows gaps while preserving order.'],
    ]),
  step('The source ended after matching b. How many characters must be appended to make abc a subsequence?',
    [row('Matched target prefix', ['a', 'b', 'c'], { 0: 'MATCHED', 1: 'MATCHED', 2: 'NEEDED' })], 0, [
      ['1: append c', 'Correct. Two of the three target characters matched, so append the remaining suffix: c.'],
      ['0: a and b are enough', 'The full target includes c. Its unmatched suffix must still be appended.'],
      ['3: append abc', 'That works but is not minimal. Reuse the prefix that already matched.'],
    ]),
];

export const squares = [
  step('Which number produces the biggest square? Choose it for the LAST output slot.',
    [row('Sorted input', [-7, -3, 2, 5], { 0: 'LEFT', 3: 'RIGHT' }), row('Output', ['·', '·', '·', '?'], { 3: 'WRITE' })], 0, [
      ['−7 → 49', 'Yes. The largest absolute value is at an end. 49 belongs in the last output slot; move left forward.'],
      ['5 → 25', 'The largest original value does not always have the largest square. Compare both ends: 49 beats 25.'],
      ['2 → 4', 'That is the smallest square here. We are filling the output backwards, largest first.'],
    ]),
  step('49 is placed. The unread ends are −3 and 5. What goes in the next slot from the back?',
    [row('Unread input', [-3, 2, 5], { 0: 'LEFT', 2: 'RIGHT' }), row('Output', ['·', '·', '?', 49], { 2: 'WRITE' })], 2, [
      ['9', 'Compare 9 with 25. The larger square must be placed first when writing backwards.'],
      ['4', '2 is inside the remaining range. One of the ends still has the largest absolute value.'],
      ['25', 'Exactly. Then place 9 and 4. The final result is [4, 9, 25, 49].'],
    ]),
];

export const mixedReview = [
  step('A sorted array allows at most three copies of each value. Which family and keep rule fit?', [], 1, [
    ['Opposite ends: compare the first and last values', 'There is no pair to find. You are building a kept prefix, so use reader and writer.'],
    ['Reader/writer: write < 3 or value != nums[write − 3]', 'Yes. Sorted order groups duplicates; comparing three kept slots back detects a fourth copy.'],
    ['Sort Colors: move high after every write', 'Sort Colors partitions three distinct categories. A three-copy limit is a different rule.'],
  ]),
  step('Two strings: does one appear in the other in order, with gaps allowed?', [], 0, [
    ['One pointer per string; advance the target only on a match', 'Right. The source explores; the target counts the prefix successfully matched.'],
    ['Opposite ends; both strings must be sorted', 'Sorting destroys the order you are trying to check. This is subsequence matching.'],
  ]),
  step('A sorted array asks for unique triplets adding to zero. Does two pointers make the whole solution O(n)?', [], 2, [
    ['Yes: pointers only move inward', 'They move inward for each fixed number. There can be O(n) different fixed numbers.'],
    ['No: it always needs O(n³)', 'Fixing one number reduces the remaining search to a linear pair scan.'],
    ['No: O(n²), because each fixed number gets its own scan', 'Correct. Count the outer loop too. A pattern name is not a complexity guarantee.'],
  ]),
  step('Explain aloud: after swapping mid with high in Sort Colors, why does mid stay?', [], 1, [
    ['Because the new value is definitely 1', 'That describes a swap with low, when low is behind mid. The high side brings an unknown value.'],
    ['The incoming value is still unexamined', 'Exactly. It may be 0, 1, or 2. You must classify it before advancing.'],
  ]),
];
