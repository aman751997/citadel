// Decision puzzles for the heaps lesson. Every number here is re-derived in tests/heaps.test.ts.
import { row, step, type TraceStep } from '../../lib/trace.ts';

export const pyramid: TraceStep[] = [
  step('The pyramid [1, 3, 2, 7, 4, 5, 8] is stored row by row. Who sits directly below index 1 (value 3)?',
    [row('Array', [1, 3, 2, 7, 4, 5, 8], { 1: 'i = 1' }, { tones: { 1: 'hot' } })], 1, [
      ['Indexes 2 and 3 (values 2 and 7)', 'Those are i + 1 and i + 2: neighbours in the array, not children. Index 2 is 3’s sibling on the same row.'],
      ['Indexes 3 and 4 (values 7 and 4)', 'Yes. Children of i are 2i + 1 = 3 and 2i + 2 = 4. Both hold values ≥ 3, so this corner of the pyramid is in order.'],
      ['Index 0 (value 1)', 'Index 0 is above it, not below: the parent of 1 is (1 − 1) / 2 = 0.'],
    ]),
  step('You push 0. It takes the next free seat, index 7. Its parent is (7 − 1) / 2 = 3, holding 7. What happens next?',
    [row('Array', [1, 3, 2, 7, 4, 5, 8, 0], { 3: 'PARENT', 7: 'NEW' }, { tones: { 7: 'hot', 3: 'ghost' } })], 0, [
      ['Swap 0 with 7, then compare with the next parent', 'Right. 0 < 7 breaks parent ≤ child, so they swap. 0 keeps climbing past 3 and then 1, and becomes the root: [0, 1, 2, 3, 4, 5, 8, 7]. Three swaps for a pyramid of height 3.'],
      ['Stop: new values always stay in the bottom row', 'Then 7 sits above a smaller 0, and peek() would still say 1 when the minimum is 0.'],
      ['Sort the array again', 'Sorting costs O(n log n) per push. Climbing touches one seat per row: O(log n).'],
    ]),
  step('You pop from [1, 2, 3, 4, 5, 6, 7]. The last value, 7, moves to the root. Its children are 2 and 3. Which way does it sink?',
    [row('Array', [7, 2, 3, 4, 5, 6], { 0: 'SINKING', 1: 'LEFT', 2: 'RIGHT' }, { tones: { 0: 'hot' } })], 0, [
      ['Swap with 2, the smaller child', 'Yes. 2 rises and sits above 7 and 3; both are bigger, so the top is settled. 7 then swaps with 4 and stops: [2, 4, 3, 7, 5, 6].'],
      ['Swap with 3, the right child', 'Then 3 becomes the parent of 2. A parent bigger than its child breaks the rule, and peek() returns 3 while 2 is still inside.'],
      ['Stop: 7 is already at the root', 'The root must be the smallest. 7 is the biggest value here, so it has to sink.'],
    ]),
];

export const kthLargest: TraceStep[] = [
  step('k = 2. Inside the gate: {2, 3}; the guard (root of the min-heap) is 2. Next arrival: 1. What happens?',
    [row('Arrivals', [3, 2, 1, 5, 6, 4], { 2: 'NEXT' }, { tones: { 0: 'done', 1: 'done', 2: 'hot' } }), row('Inside · min-heap', [2, 3], { 0: 'GUARD' }, { tones: { 0: 'hot' } })], 1, [
      ['1 evicts the guard', 'Eviction is for arrivals that beat the guard. 1 < 2, so 1 would make the group weaker.'],
      ['Turn 1 away; nothing changes', 'Yes. Two values inside are already bigger than 1, so 1 can never be among the 2 largest. (The code offers it and polls it straight back out: the same thing.)'],
      ['Admit 1; now three are inside', 'Then the root is the 3rd largest, not the 2nd. The size must come back to k after every arrival.'],
    ]),
  step('Still k = 2, inside {2, 3}, guard 2. Next arrival: 5. What happens?',
    [row('Arrivals', [3, 2, 1, 5, 6, 4], { 3: 'NEXT' }, { tones: { 0: 'done', 1: 'done', 2: 'out', 3: 'hot' } }), row('Inside · min-heap', [2, 3], { 0: 'GUARD' }, { tones: { 0: 'hot' } })], 2, [
      ['Turn 5 away', '5 beats both people inside. Turning it away loses the eventual answer.'],
      ['5 evicts 3, the strongest inside', 'The strongest is the last one who should leave. Evict the weakest, the guard.'],
      ['5 evicts the guard 2; inside becomes {3, 5}', 'Yes. The weakest leaves, and the new guard is 3. After 6 arrives (guard 3 leaves) and 4 is turned away, the gate holds {5, 6}.'],
    ]),
  step('The queue is empty and the gate holds {5, 6} with guard 5. What is the 2nd largest of [3, 2, 1, 5, 6, 4]?',
    [row('Inside · min-heap', [5, 6], { 0: 'GUARD' }, { tones: { 0: 'hot' } })], 0, [
      ['5, the guard', 'Yes. The gate holds the 2 largest; the weakest of them is the 2nd largest. peek() gives it in O(1).'],
      ['6, the biggest inside', 'That is the 1st largest. You want the weakest of the best k.'],
      ['11, the sum inside', 'The question asks for one value: the kth largest.'],
    ]),
];

export const topK: TraceStep[] = [
  step('[1, 1, 1, 2, 2, 3], k = 2. Counts: 1 → 3, 2 → 2, 3 → 1. What should the size-k heap compare?',
    [row('Value', [1, 2, 3]), row('Count', [3, 2, 1])], 1, [
      ['The values themselves', 'Then the heap keeps the 2 biggest VALUES, {2, 3}. 3 appears once; 1 appears three times and is the most frequent.'],
      ['The counts, smallest count on top', 'Yes. The guard is the least frequent of the chosen k, so a more frequent value can always evict it.'],
      ['The positions where each value first appears', 'Position says nothing about frequency.'],
    ]),
  step('The heap holds 2 (count 2) and 1 (count 3). Then 3 (count 1) is offered and the size becomes 3. Which one is polled?',
    [row('Heap by count', ['3 ×1', '2 ×2', '1 ×3'], { 0: 'TOP' }, { tones: { 0: 'hot' } })], 0, [
      ['3: the smallest count is on top', 'Right. It is offered and immediately polled. The heap ends as {2, 1}: the answer.'],
      ['1: the largest count', 'A min-heap by count never polls the largest count first. That is the value you most want to keep.'],
      ['Nothing: just let the heap grow', 'Then the heap holds every distinct value, and space grows to O(u) where u is the number of distinct values instead of O(k).'],
    ]),
];

export const closest: TraceStep[] = [
  step('Keep the k = 2 points CLOSEST to the origin. Which heap guards the door?',
    [row('Point', ['(3, 3)', '(5, −1)', '(−2, 4)'], {}, {}), row('x² + y²', [18, 26, 20])], 1, [
      ['A min-heap by distance', 'A trimmed min-heap evicts the closest point every time it overflows, so it ends up holding the FARTHEST k.'],
      ['A max-heap by distance', 'Yes. You keep the smallest k, so the guard is the largest of them: the farthest point still inside.'],
      ['No heap: sort by x', 'Distance depends on both coordinates. (−2, 4) has the smallest x but is not the closest.'],
    ]),
  step('Inside: (3, 3) at 18 and (5, −1) at 26, so the guard is 26. Next: (−2, 4) at 20. What happens?',
    [row('Inside · max-heap by x² + y²', [26, 18], { 0: 'GUARD' }, { tones: { 0: 'hot' } }), row('Arrival', [20], { 0: '(−2, 4)' })], 2, [
      ['Turn it away: 20 < 26', 'Smaller is BETTER here. 20 is closer than the guard, so it belongs inside.'],
      ['Evict (3, 3)', '(3, 3) is the closest of all. Evict the farthest one, the guard.'],
      ['Evict (5, −1); admit (−2, 4)', 'Yes. Inside becomes 18 and 20, with the new guard at 20. Answer: (3, 3) and (−2, 4).'],
    ]),
  step('Why compare x² + y² instead of the true distance √(x² + y²)?',
    [], 0, [
      ['Squaring keeps the same order and avoids floating-point roots', 'Yes. Square root is increasing for values ≥ 0, so whichever point has the smaller square is also the closer one. Use long if coordinates could be large.'],
      ['Because the problem asks for squared distances', 'It asks for the closest points. Squares are just a safe way to compare them.'],
    ]),
];

export const median: TraceStep[] = [
  step('Low = {5}, High = {}. The arrival 2 enters through Low, so Low = {5, 2}. What is the next move of the dance?',
    [row('Low · max-heap', [5, 2], { 0: 'TOP' }, { tones: { 0: 'hot' } }), row('High · min-heap', [])], 0, [
      ['Move Low’s top, 5, up to High', 'Yes. Low = {2}, High = {5}. The sizes are equal, so no rebalance. Median = (2 + 5) / 2 = 3.5.'],
      ['Read the median: Low’s top is 5', 'The dance is not finished. Low has two values and High none, so 5 is not the middle of {2, 5}.'],
      ['Move 2 up to High', 'Only the top can leave a heap. And 2 is the SMALLER value; it belongs in the lower half.'],
    ]),
  step('Arrival 8: it enters Low, then Low’s top (8) steps up. Now Low = {2}, High = {5, 8}. What next?',
    [row('Low · max-heap', [2], { 0: 'TOP' }, { tones: { 0: 'hot' } }), row('High · min-heap', [5, 8], { 0: 'TOP' }, { tones: { 0: 'hot' } })], 1, [
      ['Read the median from High’s top', 'The rule is that Low keeps the extra value. Bending it here means findMedian needs a second case.'],
      ['High is bigger: move its top, 5, back to Low', 'Yes. Low = {5, 2}, High = {8}. Three values, Low has the extra, and the median is Low’s top: 5.'],
      ['Move 8 back to Low', 'Only High’s top can leave, and that is 5. Moving 8 under 5 would also put a big value in the small half.'],
    ]),
  step('Low = {4, 1} and High = {7, 9}. Sizes are equal. What does findMedian return?',
    [row('Low · max-heap', [4, 1], { 0: 'TOP' }, { tones: { 0: 'hot' } }), row('High · min-heap', [7, 9], { 0: 'TOP' }, { tones: { 0: 'hot' } })], 2, [
      ['4', 'With an even count the median sits between the two middle values.'],
      ['5.25', 'That is the mean of all four values. The median only looks at the two middle ones.'],
      ['5.5', 'Yes: (4 + 7) / 2 = 5.5. Widen to double or long before adding, or two huge ints overflow.'],
    ]),
];

export const windowMedian: TraceStep[] = [
  step('nums = [3, 5, 6, 1], k = 3. The window slides from [3, 5, 6] to [5, 6, 1]. The 3 is in Low, but not on top. How do you remove it?',
    [row('nums', [3, 5, 6, 1], { 0: 'LEAVING', 3: 'ARRIVING' }, { tones: { 0: 'out', 3: 'hot' } }), row('Low · max-heap', [5, 3], { 0: 'TOP' }, { tones: { 0: 'hot' } }), row('High · min-heap', [6], { 0: 'TOP' })], 1, [
      ['PriorityQueue.remove(3)', 'Correct but slow: remove(Object) scans the array, O(k) per slide, so O(n·k) overall. The lazy version keeps every step O(log n).'],
      ['Count it as dead (Low’s live count drops by one); pop it later when it reaches the top', 'Yes. A heap can only cheaply remove its top. Change the bookkeeping now, delete the entry when it surfaces.'],
      ['Do nothing: it will slide out on its own', 'Then Low still counts it as a member, and the halves no longer describe the window.'],
    ]),
  step('Now Low physically holds {5, 3 (dead), 1} and High holds {6}. Physical sizes: 3 and 1. Live sizes: 2 and 1. Rebalance?',
    [row('Low · max-heap', [5, '3 ✗', 1], { 0: 'TOP' }, { tones: { 0: 'hot', 1: 'out' } }), row('High · min-heap', [6], { 0: 'TOP' })], 0, [
      ['No. Live counts 2 and 1 are already balanced', 'Yes. Only live entries are in the window. Low has the one extra the rule allows, so the median is Low’s top: 5.'],
      ['Yes. Low is 2 bigger than High, so move 5 up', 'That counts the dead 3. Moving 5 up leaves Low’s live members as {1} and the median comes out as 1 for [5, 6, 1]. This is the classic lazy-deletion bug.'],
    ]),
  step('Window [5, 6, 1]. What is its median?',
    [row('window (sorted)', [1, 5, 6], { 1: 'MIDDLE' }, { tones: { 1: 'hot' } })], 1, [
      ['1', 'That is what the physical-size bug reports. Sorted, the window is [1, 5, 6].'],
      ['5', 'Yes. Odd k: the median is Low’s live top.'],
      ['4', 'That is the mean, (5 + 6 + 1) / 3. The median is the middle value.'],
    ]),
];

export const mergeK: TraceStep[] = [
  step('Lists A = 1→4→5, B = 1→3→4, C = 2→6. The heap holds the heads 1 (A), 1 (B), 2 (C). You poll 1 from A. What enters the heap?',
    [row('A', [1, 4, 5], { 0: 'HEAD' }, { tones: { 0: 'hot' }, join: '→' }), row('B', [1, 3, 4], { 0: 'HEAD' }, { join: '→' }), row('C', [2, 6], { 0: 'HEAD' }, { join: '→' })], 0, [
      ['4, the next node of A', 'Yes. Only A lost its head, so only A sends a replacement. The heap is back to one head per list: 1 (B), 2 (C), 4 (A).'],
      ['All of A: 4 and 5', 'Then the heap grows toward N entries and each operation costs log N. One head per list keeps it at k.'],
      ['Nothing until all three heads are used', 'Then the next smallest might be hiding behind a polled head. A’s 4 must compete right away.'],
    ]),
  step('k lists hold N nodes in total. How many entries can the heap hold at once?',
    [], 1, [
      ['N', 'Each list has at most one entry in the heap, its current head.'],
      ['At most k', 'Yes. That is why each offer and poll costs O(log k), for O(N log k) in total.'],
      ['At most 2', 'Merging two lists needs no heap at all. With k lists, k heads compete.'],
    ]),
  step('One of the k lists is empty (its head is null). What do you do with it?',
    [], 2, [
      ['Offer null; the comparator handles it', 'PriorityQueue rejects null with a NullPointerException, and a.val on null would throw anyway.'],
      ['Return an empty result', 'The other lists still have nodes to merge.'],
      ['Skip it when filling the heap', 'Yes. Guard every offer: heads at the start, and node.next later.'],
    ]),
];

export const scheduler: TraceStep[] = [
  step('Tasks AAABBB, n = 2 (a task must rest 2 units before it runs again). At time 1 the ready heap holds counts {3, 3}. What runs?',
    [row('ready · counts', [3, 3], { 0: 'TOP' }, { tones: { 0: 'hot' } })], 0, [
      ['A task with 3 copies left (A or B: a tie)', 'Yes. Run the task with the most work left. It has the longest chain of rests ahead of it, so starting it early hides those rests behind other work.'],
      ['Idle, to keep options open', 'An idle unit while work is ready never helps. It only pushes everything later.'],
      ['The task with the fewest copies left', 'That saves the big chain for last, where its rests can’t overlap with anything. AAAB with n = 2 shows it.'],
    ]),
  step('Time 3. A ran at time 1 and rests through time 3; B ran at time 2 and rests through time 4. The ready heap is empty. What happens at time 3?',
    [row('timeline', ['A', 'B', '?'], { 2: 'TIME 3' }, { tones: { 2: 'hot' } }), row('cooling · {left, rests through}', ['A: 2, t3', 'B: 2, t4'])], 1, [
      ['Run A: it has the most copies left', 'A ran at time 1. With n = 2 it needs times 2 and 3 off; it may run again at time 4.'],
      ['Idle; it still counts as a time unit', 'Yes. At the end of time 3, A leaves the cooling queue and is ready for time 4. The full run is A B _ A B _ A B: 8 units.'],
      ['Skip ahead without counting', 'The answer counts idle units. Skipping time is fine as an optimisation only if you add the skipped units.'],
    ]),
  step('Check with the formula: maxFreq = 3, n = 2, two tasks share that count. (3 − 1) × (2 + 1) + 2 = ? Then take the max with the task count, 6.',
    [], 2, [
      ['6', 'That is the number of tasks. The idle units forced by A and B are missing.'],
      ['7', 'Close: 2 frames of 3 units = 6, then BOTH tied tasks appear in the last frame: + 2.'],
      ['8', 'Yes: max(6, 8) = 8, matching the simulation.'],
    ]),
];

export const mixedReview: TraceStep[] = [
  step('Kth largest from a stream of millions of numbers. Why a MIN-heap of size k?', [], 1, [
    ['Min-heaps are faster than max-heaps', 'They cost exactly the same: O(log n) per offer and poll.'],
    ['It holds the k largest seen; its root is the smallest of those, the door guard. Newcomers beat the guard or bounce. O(k) memory survives an endless stream', 'Yes. A max-heap of everything is O(n) memory and dies on a stream. The guard model derives the choice instead of memorising it.'],
    ['Max-heaps cannot be size-limited', 'Any heap can be trimmed. A trimmed max-heap just keeps the wrong end: the k smallest.'],
    ['To return results in ascending order', 'Order of output is not the point; the guard at the root is.'],
  ]),
  step('Two-heaps median: why does every addNum go THROUGH low (offer to low, poll to high, maybe rebalance)?', [], 1, [
    ['low is the max-heap, so it is faster', 'Both heaps cost the same. Speed is not the reason.'],
    ['The dance restores both promises (every low ≤ every high; sizes within one, low holding the extra) with no case analysis', 'Yes. Direct placement needs comparisons against both roots and empty-heap edge cases: the classic fumble zone. Both can be correct; the dance is the one you won’t fumble.'],
    ['Numbers must be processed in sorted order', 'They arrive in any order. The dance sorts them into halves, not into a list.'],
    ['It halves the number of comparisons', 'It does about three heap operations per add. Fewer bugs, not fewer operations.'],
  ]),
  step('Merge k sorted lists with N total nodes. Why is the heap version O(N log k) and not O(N log N)?', [], 1, [
    ['log k and log N are asymptotically equal', 'Not when k is much smaller than N, say 10 lists of a million nodes.'],
    ['The heap only ever holds at most k entries (one head per list); each of the N nodes passes through one offer and one poll costing O(log k)', 'Yes. The bound comes from heap SIZE, not total data, exactly like the size-k gate in top-k.'],
    ['Linked lists make heap operations O(1)', 'The heap is an array of node references. Its cost does not depend on what the nodes are.'],
    ['It is O(N log N); the claim is wrong', 'Count the heap’s size: never more than k.'],
  ]),
  step('A stream of numbers arrives; after each one you must report the middle value. Which tool?', [], 2, [
    ['Sort the list after each arrival', 'O(n log n) per arrival. Inserting into a sorted list is still O(n) per arrival.'],
    ['One size-k min-heap', 'A single heap gives one end. The median needs the boundary between two halves.'],
    ['Two heaps: a max-heap for the lower half, a min-heap for the upper half', 'Yes. The middle lives at the two tops: O(log n) per add, O(1) per read.'],
  ]),
  step('An n × n matrix has every row and every column sorted. Find the kth smallest value.', [], 0, [
    ['Treat each row as a sorted list and merge with a heap of row heads; pop k times', 'Yes. It is k-way merge in disguise: O(k log n), with at most n heads in the heap. (Binary search on the value range is the other classic answer.)'],
    ['A size-k max-heap over all n² values', 'That works, in O(n² log k), but ignores the sorted rows completely.'],
    ['Read it row by row: matrix[(k − 1) / n][(k − 1) % n]', 'Rows overlap in value. In [[1, 5], [2, 6]] with k = 2 that reads 5, but the 2nd smallest is 2.'],
  ]),
  step('You print a PriorityQueue after offering 3, 1, 2 and see [1, 3, 2]. Is the heap broken?', [], 1, [
    ['Yes: it should print [1, 2, 3]', 'A heap is only partly ordered. toString and iteration walk the array in index order.'],
    ['No: iteration follows the array layout, which is not sorted; only repeated poll() comes out in order', 'Yes. 1 is the root and 3, 2 are its children. Never debug a heap by printing it and reading it as sorted.'],
  ]),
  step('Your comparator is (a, b) -> a[1] - b[1]. When can it lie?', [], 0, [
    ['When the difference overflows int, e.g. 2,000,000,000 and −2,000,000,000', 'Yes. 2e9 − (−2e9) wraps to a negative number, so the bigger value looks smaller. Use Integer.compare(a[1], b[1]).'],
    ['Never: subtraction is exactly how comparison works', 'Only when the true difference fits in an int. Near the limits it wraps around.'],
    ['Only for negative numbers', 'Small negatives are fine. Only differences beyond about ±2.1 billion wrap.'],
  ]),
  step('You need the largest value of a fixed array, once. Which tool?', [], 2, [
    ['Build a max-heap, then peek', 'Correct answer, wasted work. Building is O(n) and so is a plain scan, but the scan needs no extra memory.'],
    ['A size-1 min-heap gate', 'It works, but it is a heap pretending to be one variable.'],
    ['One linear scan keeping the best so far', 'Yes. A heap pays off when the collection keeps changing and you need the best again and again.'],
  ]),
  step('Kth largest of a fixed array that you are allowed to reorder, and you want the best expected time.', [], 1, [
    ['A size-k min-heap: O(n log k)', 'Good, and the right choice for a stream. But for a fixed array you can do better on average.'],
    ['Quickselect: partition around a random pivot, keep only the side holding index n − k. Expected O(n)', 'Yes. It reorders the array, and its worst case is O(n²) with unlucky pivots. Say both trade-offs out loud.'],
    ['Sort, then index: O(n log n)', 'Correct and simple, but slower than both alternatives for large n.'],
  ]),
];
