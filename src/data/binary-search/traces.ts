// Decision puzzles for the Binary Search lesson. Every number here is re-derived in tests/binary-search.test.ts.
import { row, step } from '../../lib/trace.ts';

// Chapter 1 · first index with nums[i] >= 9 in [-1, 0, 3, 5, 9, 12]
export const search = [
  step('lo = 0, hi = 6 (that is n, the "nowhere" slot). mid = 3, and nums[3] = 5. The question is "nums[mid] ≥ 9?". What is the move?',
    [row('nums', [-1, 0, 3, 5, 9, 12], { 0: 'LO', 3: 'MID' }, { tones: { 3: 'hot' } })], 1, [
      ['No: lo = mid = 3', 'mid is a proven no; keeping it gains nothing and can freeze the loop. A few moves later you would sit at lo = 3, hi = 4, compute mid = 3 again, and never leave.'],
      ['No: lo = mid + 1 = 4', 'Yes. 5 < 9, and the array is sorted, so index 3 and everything left of it is a proven no. lo jumps past all of them in one move.'],
      ['Yes: hi = mid = 3', '5 ≥ 9 is false. Setting hi = 3 would declare index 3 a yes and throw away the 9 at index 4.'],
    ]),
  step('Now lo = 4, hi = 6. mid = 5, and nums[5] = 12. 12 ≥ 9 is a yes. What do you do with hi?',
    [row('nums', [-1, 0, 3, 5, 9, 12], { 4: 'LO', 5: 'MID' }, { tones: { 0: 'out', 1: 'out', 2: 'out', 3: 'out', 5: 'hot' } })], 0, [
      ['hi = mid = 5', 'Right. 12 might be the first yes for all you know, so it stays inside the range as a candidate. Only a proven no gets skipped.'],
      ['hi = mid − 1 = 4', 'It happens to land on 9 this time. On [1, 5] with target 5 it jumps over the only answer and returns −1. Keep true candidates; skip only proven falses.'],
      ['12 ≠ 9, so return −1', 'Index 4 is still unasked. The loop ends when lo == hi, not when one guess misses.'],
    ]),
  step('lo = 4, hi = 5. mid = 4 holds 9, a yes, so hi = 4. Now lo == hi == 4. What do you return?',
    [row('nums', [-1, 0, 3, 5, 9, 12], { 4: 'LO = HI' }, { tones: { 0: 'out', 1: 'out', 2: 'out', 3: 'out', 4: 'done', 5: 'done' } })], 2, [
      ['Keep looping to be sure', 'With lo == hi there is one candidate left, and the promise says it is the first yes. Another round would compute nothing new.'],
      ['−1: the loop never saw an equality', 'This template never tests equality inside the loop. It finds the boundary first, then checks it once.'],
      ['4, after checking nums[4] == 9', 'Yes. lo is the first index with nums[i] ≥ 9. One equality check turns "where would 9 go?" into "is 9 here?".'],
    ]),
];

// Chapter 2 · [5, 7, 7, 8, 8, 10], target 8 (and 6)
export const range = [
  step('First boundary: the first index where nums[i] ≥ 8. Where does it land?',
    [row('nums', [5, 7, 7, 8, 8, 10])], 1, [
      ['Index 4', 'That is the last 8. "≥ 8" first becomes true at the first 8.'],
      ['Index 3', 'Right: indexes 0–2 hold 5, 7, 7 (no), index 3 holds the first 8 (yes).'],
      ['Index 2', 'nums[2] = 7, and 7 ≥ 8 is false.'],
    ]),
  step('Second boundary: the first index where nums[i] > 8. It lands on index 5 (value 10). Where is the last 8?',
    [row('nums', [5, 7, 7, 8, 8, 10], { 3: 'FIRST', 5: 'AFTER' }, { tones: { 3: 'done', 4: 'done', 5: 'hot' } })], 1, [
      ['Index 5', 'Index 5 is the first value past the run of 8s. The last 8 sits one step before it.'],
      ['Index 4 = 5 − 1', 'Yes. The run of 8s is [first, after − 1] = [3, 4]. Two runs of one template, nothing new to memorise.'],
      ['Index 3', 'Index 3 is the first 8. There are two copies.'],
    ]),
  step('Target 6 instead. "≥ 6" lands on index 1 and "> 6" also lands on index 1. What do you return?',
    [row('nums', [5, 7, 7, 8, 8, 10], { 1: 'BOTH' }, { tones: { 1: 'hot' } })], 2, [
      ['[1, 0]', 'That is [first, after − 1] without the check: an upside-down range. It means "zero copies", but the problem wants [−1, −1].'],
      ['[0, 1]', 'Neither 5 nor 7 is a 6.'],
      ['[−1, −1], because nums[1] = 7 ≠ 6', 'Right. Check that the first boundary actually holds the target before trusting either boundary.'],
    ]),
];

// Chapter 3 · 3 × 4 matrix, target 3
export const matrix = [
  step('The grid has 3 rows and 4 columns: cells 0 to 11. lo = 0, hi = 12, mid = 6. Which cell is index 6?',
    [row('row 0', [1, 3, 5, 7]), row('row 1', [10, 11, 16, 20], { 2: '?' }), row('row 2', [23, 30, 34, 60])], 2, [
      ['Row 6 / 3 = 2, column 6 % 3 = 0 → 23', 'That divides by the number of rows. Row r starts at index r × cols, so you divide by cols.'],
      ['Row 1, column 1 → 11', 'Index 5 is (1, 1). Index 6 is one cell further: (1, 2).'],
      ['Row 6 / 4 = 1, column 6 % 4 = 2 → 16', 'Yes. Divide and take the remainder by the number of COLUMNS: each row holds 4 cells.'],
    ]),
  step('16 ≥ 3, so hi = 6. Next mid = 3 → cell (0, 3) = 7, a yes, so hi = 3. Now mid = 1 → cell (0, 1) = 3. What happens?',
    [row('flattened', [1, 3, 5, 7, 10, 11, 16, 20, 23, 30, 34, 60], { 0: 'LO', 1: 'MID', 3: 'HI' }, { tones: { 1: 'hot', 3: 'done', 4: 'done', 5: 'done', 6: 'done', 7: 'done', 8: 'done', 9: 'done', 10: 'done', 11: 'done' } })], 1, [
      ['3 ≥ 3 is a no: lo = 2', '3 ≥ 3 is true. Moving lo past index 1 throws the target away.'],
      ['3 ≥ 3: hi = 1. Then mid = 0 says no, lo = 1, and cell (0, 1) holds 3', 'Yes. The same template as Chapter 1, run over cell numbers instead of a real array.'],
      ['Restart the search inside row 0 only', 'You could search rows first and then columns, but you would need a second loop. The flattened view needs just one.'],
    ]),
];

// Chapter 4 · [4, 5, 6, 7, 0, 1, 2] and the unrotated [1, 2, 3, 4, 5]
export const rotatedMin = [
  step('lo = 0, hi = 6, mid = 3. nums[mid] = 7 and nums[hi] = 2. What is the move?',
    [row('nums', [4, 5, 6, 7, 0, 1, 2], { 0: 'LO', 3: 'MID', 6: 'HI' }, { tones: { 3: 'hot' } })], 1, [
      ['7 > 2: hi = mid = 3', 'That keeps the higher run and throws away the drop, where the minimum lives.'],
      ['7 > 2: lo = mid + 1 = 4', 'Yes. A value bigger than nums[hi] belongs to the higher run, before the drop. The minimum is strictly to the right of mid.'],
      ['Compare with nums[lo] = 4 instead', '7 ≥ 4 tells you the left side is in order, but not where the minimum is. On an unrotated array the same test sends you away from the minimum.'],
    ]),
  step('lo = 4, hi = 6, mid = 5. nums[mid] = 1 and nums[hi] = 2. What is the move?',
    [row('nums', [4, 5, 6, 7, 0, 1, 2], { 4: 'LO', 5: 'MID', 6: 'HI' }, { tones: { 0: 'out', 1: 'out', 2: 'out', 3: 'out', 5: 'hot' } })], 2, [
      ['1 ≤ 2: hi = mid − 1 = 4', 'It lands on 0 here by luck. On [3, 1, 2] the same move skips the 1 and returns 3.'],
      ['lo = mid + 1 = 6', 'That throws away 0 and 1, including the minimum.'],
      ['1 ≤ 2: hi = mid = 5', 'Right. mid is in the minimum’s run, so it might BE the minimum. Keep it. The next step (mid = 4, 0 ≤ 1) brings hi to 4, and nums[4] = 0.'],
    ]),
  step('No rotation at all: [1, 2, 3, 4, 5]. lo = 0, hi = 4, mid = 2. nums[mid] = 3 and nums[hi] = 5. What is the move?',
    [row('nums', [1, 2, 3, 4, 5], { 0: 'LO', 2: 'MID', 4: 'HI' }, { tones: { 2: 'hot' } })], 0, [
      ['3 ≤ 5: hi = mid = 2', 'Yes. The whole array is one run, the minimum’s run. hi walks left (2, then 1, then 0) and the answer is 1.'],
      ['The left half [1, 2, 3] is sorted, so the minimum is on the right: lo = 3', 'That is the nums[lo] reasoning, and it walks away from 1. A sorted half can still hold the minimum. Test [1, 2, 3] before you trust a rotated-array loop.'],
    ]),
];

// Chapter 5 · [4, 5, 6, 7, 0, 1, 2], target 0
export const rotatedSearch = [
  step('lo = 0, hi = 6, mid = 3. nums[mid] = 7, nums[hi] = 2. Which side is in plain sorted order?',
    [row('nums', [4, 5, 6, 7, 0, 1, 2], { 0: 'LO', 3: 'MID', 6: 'HI' }, { tones: { 3: 'hot' } })], 0, [
      ['[lo..mid] = [4, 5, 6, 7]', 'Yes. nums[mid] > nums[hi] means the drop lies somewhere after mid, so everything from lo to mid climbs steadily.'],
      ['[mid..hi] = [7, 0, 1, 2]', '7 then 0 is the drop itself. That side is not in order.'],
      ['Neither side can be trusted', 'At least one side is always in order: the array has only one drop, and it can be on only one side of mid.'],
    ]),
  step('Target 0. The ordered side runs from 4 to 7. What is the move?',
    [row('nums', [4, 5, 6, 7, 0, 1, 2], { 0: 'LO', 3: 'MID', 6: 'HI' }, { tones: { 0: 'hot', 1: 'hot', 2: 'hot', 3: 'hot' } })], 1, [
      ['0 ≤ 7, so it is on the left: hi = mid = 3', 'Checking one end is the classic bug. 0 ≤ 7, but 0 < 4 too. Both ends must hold, or you lose index 4 for good.'],
      ['0 is not in [4, 7], so lo = mid + 1 = 4', 'Right. Inside an ordered stretch, a value outside its two ends cannot be there. The target must be on the other side.'],
    ]),
  step('lo = 4, hi = 6, mid = 5: nums[mid] = 1 < nums[hi] = 2, so [1, 2] is in order. Is 0 inside (1, 2]?',
    [row('nums', [4, 5, 6, 7, 0, 1, 2], { 4: 'LO', 5: 'MID', 6: 'HI' }, { tones: { 0: 'out', 1: 'out', 2: 'out', 3: 'out', 5: 'hot' } })], 1, [
      ['No: lo = mid + 1 = 6', 'The target is not in the ordered side (mid, hi], so it must be in [lo, mid]. Moving lo up abandons index 4.'],
      ['No: hi = mid = 5', 'Yes. Then mid = 4: [0, 1] is in order and 0 is not above 0, so hi = 4. lo == hi == 4, and nums[4] == 0.'],
    ]),
];

// Chapter 6 · piles [3, 6, 7, 11], h = 8
export const koko = [
  step('At speed 6, how many hours does she need for [3, 6, 7, 11]?',
    [row('piles', [3, 6, 7, 11]), row('hours at 6', ['?', '?', '?', '?'])], 2, [
      ['5 hours: 27 bananas ÷ 6, rounded up', 'She cannot carry a half-eaten hour over to the next pile. Round up per pile, then add.'],
      ['4 hours: one per pile', 'Only true when the speed is at least the biggest pile (11).'],
      ['6 hours: 1 + 1 + 2 + 2', 'Right. Each pile rounds up on its own: ceil(3/6) = 1, ceil(6/6) = 1, ceil(7/6) = 2, ceil(11/6) = 2.'],
    ]),
  step('lo = 1, hi = 11, mid = 6. Speed 6 takes 6 ≤ 8 hours. What is the move?',
    [row('speed', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], { 0: 'LO', 5: 'MID', 10: 'HI' }, { tones: { 5: 'hot', 10: 'done' } })], 0, [
      ['Fast enough: hi = mid = 6', 'Yes. 6 works, and so does every faster speed. A slower one might also work, so keep 6 as the best candidate and look lower.'],
      ['Return 6', '6 works, but the question asks for the SLOWEST speed that works. 4 and 5 are still untested.'],
      ['lo = mid + 1 = 7', 'That throws away a speed you just proved works, and everything below it.'],
    ]),
  step('Speed 3 needs 1 + 2 + 3 + 4 = 10 > 8 hours, so lo = 4. Speed 5 needs 8 hours, so hi = 5. Now mid = 4 needs 1 + 2 + 2 + 3 = 8 hours. What is the answer?',
    [row('speed', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], { 3: 'LO / MID', 4: 'HI' }, { tones: { 0: 'out', 1: 'out', 2: 'out', 3: 'hot', 4: 'done', 5: 'done', 6: 'done', 7: 'done', 8: 'done', 9: 'done', 10: 'done' } }), row('done in 8?', ['F', 'F', 'F', '?', 'T', 'T', 'T', 'T', 'T', 'T', 'T'])], 1, [
      ['5', '5 was the last speed confirmed before this one, not the first that works. 4 also finishes in exactly 8 hours.'],
      ['4', 'Yes. 8 ≤ 8 is a yes, so hi = 4 = lo. Speed 4 is the first yes in F F F | T T T …'],
      ['3', 'Speed 3 needs 10 hours. It is a proven no.'],
    ]),
];

// Chapter 7 · weights 1..10, days = 5
export const ship = [
  step('Weights [1, 2, …, 10], 5 days. Which range of capacities do you search?',
    [row('weights', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])], 1, [
      ['[1, 55]', 'Below 10 the answer is impossible, and a careless daysNeeded will not notice: it gives the heavy parcel its own day and reports success. Start at max(weights).'],
      ['[10, 55]: the heaviest parcel up to the total', 'Yes. Below 10 the 10-ton parcel never fits. At 55 everything ships on day one. The bounds come from the problem’s physics.'],
      ['[1, 10]', 'Capacity 10 needs 7 days: [1–4] [5] [6] [7] [8] [9] [10]. The answer is above 10.'],
    ]),
  step('Capacity 15. Loading in order and starting a new day when the next parcel would overflow, how many days?',
    [row('weights', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])], 0, [
      ['5 days: [1–5] [6, 7] [8] [9] [10]', 'Right. 1 + … + 5 = 15 fills day one; 6 + 7 = 13 and adding 8 would make 21; then 8, 9, 10 each ride alone. 5 ≤ 5: a yes.'],
      ['4 days: 55 ÷ 15, rounded up', 'Parcels go in order and cannot be split, so trucks leave partly empty. Simulate; don’t divide.'],
      ['6 days', 'That is capacity 14: [1–4] [5, 6] [7] [8] [9] [10].'],
    ]),
  step('Capacity 14 needs 6 days (a no). Capacity 15 needs 5 days (a yes). What is the answer?',
    [row('capacity', [13, 14, 15, 16], {}, { tones: { 0: 'out', 1: 'out', 2: 'done', 3: 'done' } }), row('ships in 5?', ['F', 'F', 'T', 'T'])], 1, [
      ['14', '14 needs 6 days. It is the last no, one before the answer.'],
      ['15', 'Yes: the first yes in F F | T T. The template lands exactly there.'],
    ]),
];

// Chapter 8 · [7, 2, 5, 10, 8], k = 2
export const split = [
  step('[7, 2, 5, 10, 8] into 2 pieces, minimizing the largest piece-sum. Which yes/no question about a cap flips exactly once?',
    [row('nums', [7, 2, 5, 10, 8])], 2, [
      ['"Is cap the sum of some piece?"', 'Not monotone. The possible piece sums are 7, 25, 9, 23, 14, 18, 24, 8: 17 is not one, 18 is, 19 is not. The answers flip back and forth.'],
      ['"Is cap ≥ the average, 32 / 2 = 16?"', '16 is only a floor. No 2-cut actually reaches 16, so it cannot be the answer.'],
      ['"Can it be cut into at most 2 pieces with every sum ≤ cap?"', 'Yes. Raise the cap and the same cuts still work: no, no, …, yes, yes. The smallest yes is the answer.'],
    ]),
  step('Cap 17 cuts greedily into [7, 2, 5] [10] [8]: 3 pieces. Cap 18 cuts into [7, 2, 5] [10, 8]: 2 pieces. What is the answer?',
    [row('cap', [16, 17, 18, 19], {}, { tones: { 0: 'out', 1: 'out', 2: 'done', 3: 'done' } }), row('≤ 2 pieces?', ['F', 'F', 'T', 'T'])], 0, [
      ['18', 'Yes. 17 is a no (3 pieces), 18 is a yes. Same recipe as Chapter 7, with k pieces instead of D days.'],
      ['17', '17 forces a third piece: [10] and [8] cannot share a piece under 17.'],
      ['14', '14 is the first piece’s sum. Under a cap of 14, [10, 8] must split too: 3 pieces.'],
    ]),
];

// Chapter 9 · lamp: (1, dim) (4, bright) (7, off) (10, bright)
export const timeMap = [
  step('Key "lamp" has times [1, 4, 7, 10] with values [dim, bright, off, bright]. get("lamp", 8): which boundary do you search for?',
    [row('time', [1, 4, 7, 10]), row('value', ['dim', 'bright', 'off', 'bright'])], 1, [
      ['First time ≥ 8 (index 3); answer from that slot', 'That returns the value set at time 10, which is in the future of 8.'],
      ['First time > 8 (index 3); answer from the slot before it', 'Yes. Index 3 holds time 10; the slot before it, time 7, is the latest at or before 8: "off".'],
      ['Only an exact match at time 8', 'Nothing was set at 8. The lamp has said "off" since time 7.'],
    ]),
  step('get("lamp", 0): the first time > 0 is index 0. What do you return?',
    [row('time', [1, 4, 7, 10], { 0: 'LO' }, { tones: { 0: 'hot' } })], 2, [
      ['"dim"', '"dim" was set at time 1, after time 0.'],
      ['Read index lo − 1', 'lo − 1 = −1: that crashes. This case is why the lo == 0 check exists.'],
      ['"" (nothing was set yet)', 'Right. lo == 0 means no time is ≤ 0. Check this before reading lo − 1.'],
    ]),
];

// Chapter 10 · a = [1, 3, 8, 9, 15], b = [7, 11, 18, 19, 21, 25]; half = 6
export const median = [
  step('half = (5 + 6 + 1) / 2 = 6. Try i = 2: a gives [1, 3] to the left, so b gives j = 4: [7, 11, 18, 19]. Is a[i] = 8 ≥ b[j − 1] = 19?',
    [row('a', [1, 3, 8, 9, 15], { 2: 'a[i]' }, { tones: { 0: 'done', 1: 'done', 2: 'hot' } }), row('b', [7, 11, 18, 19, 21, 25], { 3: 'b[j−1]' }, { tones: { 0: 'done', 1: 'done', 2: 'done', 3: 'hot' }, })], 1, [
      ['Yes: hi = 2', '8 ≥ 19 is false. Moving hi down gives a fewer values on the left and makes the clash worse.'],
      ['No. 19 on the left beats 8 on the right; a must give more: lo = 3', 'Yes. A left value bigger than a right value means the cut in a is too far left. Every smaller i is even worse, so skip them all.'],
      ['The cut is fine; compute the median', 'A valid cut needs every left value ≤ every right value. 19 is on the left and 8 is on the right.'],
    ]),
  step('The search ends at i = 4, j = 2. Left: [1, 3, 8, 9] from a and [7, 11] from b. 11 values in total, an odd count. What is the median?',
    [row('a', [1, 3, 8, 9, 15], { 3: 'a[i−1]', 4: 'a[i]' }, { tones: { 0: 'done', 1: 'done', 2: 'done', 3: 'done' } }), row('b', [7, 11, 18, 19, 21, 25], { 1: 'b[j−1]', 2: 'b[j]' }, { tones: { 0: 'done', 1: 'done' } })], 0, [
      ['11 = max(9, 11)', 'Yes. The left half holds 6 of 11 values, so its largest value is the middle one. Merged: 1 3 7 8 9 11 | 15 18 19 21 25.'],
      ['9', '9 is the largest left value from a alone. b also put 11 on the left.'],
      ['13 = (11 + 15) / 2', 'That is the even-total formula. With 11 values, the median is one value: the largest on the left.'],
    ]),
];

// Epilogue · mixed recognition, including every question from the old checkpoint quiz.
export const mixedReview = [
  step('Boundary template: condition(mid) is true. Why hi = mid and not hi = mid − 1?', [], 1, [
    ['Off-by-one convention; either works', 'They are not interchangeable. On [1, 5], target 5, hi = mid − 1 throws away index 1 and returns −1.'],
    ['mid itself might BE the first true. False mids are proven non-answers, so lo skips them; true mids stay as candidates', 'Yes. Keep the true, skip the false: that asymmetry is the whole template. Fumbling it gives the classic "returns the element after the answer" bug.'],
    ['hi = mid − 1 causes overflow', 'Overflow lives in (lo + hi) / 2, not here. This is about throwing an answer away.'],
    ['To keep the loop O(log n)', 'Both versions halve the range. The question is correctness, not speed.'],
  ]),
  step('"Minimum capacity to ship all packages within D days." Why is this binary search when nothing is sorted?', [], 1, [
    ['Sort the weights first', 'Shipping order is fixed. Sorting changes the problem.'],
    ['Feasibility is monotonic over the ANSWER space: if capacity c works, c + 1 works. canShip(c) is FFFF|TTTT over [max(weights), sum(weights)]; binary search the flip with a greedy O(n) checker', 'Yes. The sorted thing is the invisible feasibility row, not the input. Naming the bounds from the problem’s physics (max ≤ answer ≤ sum) is part of the answer.'],
    ['It is really DP; binary search is a heuristic', 'Binary search here is exact, because feasibility is monotone. DP also works, but slower.'],
    ['The days are sorted', 'Days are a count, not a sequence you search.'],
  ]),
  step('Find Minimum in Rotated: why compare nums[mid] with nums[hi] rather than nums[lo]?', [], 1, [
    ['hi comparisons are cache-friendlier', 'Both are single reads. This is about correctness.'],
    ['Against hi, the test cleanly splits "min is right of mid" from "mid could be the min", and stays correct when the array is NOT rotated; the lo-comparison misroutes exactly that case', 'Yes. The unrotated array is the edge case that kills the lo-version. Test your loop on [1, 2, 3] before declaring done: a ten-second habit that catches this whole class.'],
    ['nums[lo] might be the minimum', 'True sometimes, and that is the problem: nums[lo] ≤ nums[mid] cannot tell "sorted, min at lo" from "min further right".'],
    ['Either comparison works identically', 'Run the lo-version on [1, 2, 3]: 2 ≥ 1 sends lo to 2, and it returns 3.'],
  ]),
  step('"Return the smallest divisor d such that the sum of ceil(nums[i] / d) is at most threshold." First move?', [], 2, [
    ['Sort nums and use two pointers', 'Nothing pairs up here. The unknown is a single number, d.'],
    ['Try every d from 1 upward', 'Correct, but up to max(nums) checks of O(n) each. Halving the d range costs O(n log max).'],
    ['Search d on [1, max(nums)] with a checker that sums the ceilings', 'Yes. A bigger divisor never raises the sum, so "sum ≤ threshold" is FFFF|TTTT. It is Koko with a new costume.'],
  ]),
  step('Unsorted array, one query: "is 42 in it?" Which tool?', [], 2, [
    ['Binary search the indexes', 'Unsorted values give no FFFF|TTTT question: "nums[i] ≥ 42" can flip many times.'],
    ['Sort, then binary search', 'Correct, but O(n log n) for one question. A single scan is cheaper.'],
    ['One linear scan, O(n)', 'Yes. Binary search pays off when the order is already there, or when you will ask many questions of the same sorted data.'],
  ]),
  step('A teammate writes while (lo < hi) with lo = mid and hi = mid − 1, using mid = lo + (hi − lo) / 2. What happens when hi = lo + 1 and the test passes?', [], 1, [
    ['It finishes one step early', 'Nothing moves, so it never finishes.'],
    ['mid = lo, so lo = mid changes nothing: an infinite loop', 'Yes. Mixing templates is the bug. Keep one template and its moves: hi = mid, lo = mid + 1.'],
    ['Overflow', 'No large numbers are involved; the range simply stops shrinking.'],
  ]),
  step('Time-based store: "value at or before time T". Which boundary?', [], 1, [
    ['First time ≥ T', 'That can be a time after T. You want the last time that is ≤ T.'],
    ['First time > T, then step one slot back', 'Yes. The last ≤ is one before the first >. If the first > is index 0, nothing qualifies.'],
    ['Exact match only', 'Most lookups fall between two sets.'],
  ]),
  step('Median of two sorted arrays: why run the search over the SHORTER array?', [], 2, [
    ['The shorter array is more likely to hold the median', 'Either array can hold it. The reason is index safety and cost.'],
    ['It doesn’t matter', 'Try a = [1, 2, 3, 4, 5], b = [6]: half = 3, and i = 5 gives j = −2.'],
    ['So j = half − i always lands inside the longer array, and the cost is O(log min(m, n))', 'Yes. With i in [0, m] and m ≤ n, j stays in [0, n]. Search the longer one and j can go negative.'],
  ]),
];
