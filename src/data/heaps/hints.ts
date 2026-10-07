// Hint ladders for every <HintLadder> in the heaps lesson: nudge, moving parts, loop and stopping rule.
export const hints: Record<string, [string, string, string]> = {
  minHeap: [
    'A complete tree has no gaps, so you can number its seats row by row and keep them in an array.',
    'An int array a and a size. Parent of i is (i − 1) / 2; children are 2i + 1 and 2i + 2. push appends and climbs; pop moves the last value to the root and sinks it.',
    'Climb while the parent is bigger; stop at the root or when parent ≤ child. Sink by swapping with the SMALLER child while it is smaller; stop when no child is smaller or there are no children.',
  ],
  kthLargest: [
    'You only ever need the best k values seen so far. Who among them is in danger of being replaced?',
    'A min-heap holds the k largest so far. Its root is the weakest of them: the guard at the door.',
    'Offer every value; whenever the size passes k, poll once. After the loop the root is the kth largest.',
  ],
  topK: [
    'First turn values into counts. Then it is the previous chapter with a different thing to compare.',
    'A HashMap of value → count, and a min-heap of values ordered by their count, trimmed to size k.',
    'For each distinct value: offer, and poll when the size passes k. Poll the heap into the result array, filling from the back if you want the most frequent first.',
  ],
  kClosest: [
    'You keep the k SMALLEST distances this time. Which of the chosen points is in danger?',
    'A max-heap of points ordered by x² + y², computed in long. The root is the farthest point still inside.',
    'Offer each point; poll when the size passes k. Return the heap’s contents in any order.',
  ],
  median: [
    'The median sits on the border between a lower half and an upper half. What do you need to see at that border?',
    'low is a max-heap (its top is the largest small value); high is a min-heap (its top is the smallest large value). low may hold one extra.',
    'addNum: offer to low, move low’s top to high, and if high is now bigger, move high’s top back. findMedian: low’s top if low is bigger, else the average of both tops, computed in double.',
  ],
  windowMedian: [
    'This is the running median, plus values that leave. A heap can only remove its top cheaply. What if you delay the removal?',
    'Store indexes, ordered by (value, index) so no two entries tie. Keep live counts for low and high. An index below the window start is dead.',
    'Each step: admit the new index on its side; retire index i − k by decrementing the live count of its side; pop dead tops; rebalance once by live counts, popping dead tops after a move; read the median when the window is full.',
  ],
  mergeK: [
    'The next node of the merged list is always one of the current heads. How do you find the smallest of k heads quickly?',
    'A min-heap of ListNode ordered by val with Integer.compare. A dummy node and a tail pointer build the answer.',
    'Offer every non-null head. Repeatedly poll the smallest, append it, and offer its next if it is not null. Stop when the heap is empty.',
  ],
  scheduler: [
    'At each time unit, which ready task should run so its rests overlap with other work?',
    'A max-heap of remaining counts (letters don’t matter, only counts). A FIFO queue of {count left, last rest time} for tasks that are cooling down.',
    'Each unit: time++; if the heap is not empty, poll, decrement, and queue it to rest through time + n if copies remain. Then move the queue’s front back into the heap if its rest ends at this time. Stop when both are empty.',
  ],
  streamKth: [
    'Chapter 2’s gate, but the gate stays open and someone asks for the answer after every arrival.',
    'A field: a min-heap that never holds more than k values. The constructor feeds it the starting numbers through add.',
    'add: offer; if the size passes k, poll; return the root.',
  ],
  stones: [
    'Each round needs the two heaviest stones, and the leftover goes back into play.',
    'A max-heap of weights.',
    'While at least two remain: poll y, then x; if y > x, offer y − x. Return the last stone, or 0 if none.',
  ],
  reorganize: [
    'Which letter is the most dangerous to leave until the end?',
    'A max-heap of {letter, copies left}. One “bench” slot holds the letter you just placed so it can’t be chosen twice in a row.',
    'Poll the top, append it, decrement it; put the previously benched letter back; bench the current one if copies remain. If the heap empties while a letter is still benched, it is impossible.',
  ],
  ipo: [
    'Two questions each round: which projects can I afford now, and which of those pays most?',
    'A min-heap of projects by required capital (still locked) and a max-heap of profits (affordable now).',
    'For up to k rounds: unlock every project whose capital ≤ w into the profit heap; if it is empty, stop; otherwise add the best profit to w.',
  ],
  smallestRange: [
    'A range that covers every list must contain at least one value from each. Look at one candidate from each list at a time.',
    'A min-heap of {value, list, position} holding one entry per list, plus the current maximum among those entries.',
    'Record [heap minimum, max] when it beats the best. Replace the minimum with the next value of its list and update max. Stop when the minimum’s list runs out.',
  ],
  matrixKth: [
    'Each row is a sorted list. Have you merged sorted lists before?',
    'A min-heap of {value, row, column}, seeded with the first column (at most k rows).',
    'Poll k − 1 times, each time offering the next cell to the right in the same row. The root is then the kth smallest.',
  ],
  quickselect: [
    'Sorting does more work than needed: you only care which value lands at one index.',
    'target = n − k. A random pivot and a three-way partition: less than, equal to, greater than the pivot.',
    'If target falls in the equal block, return the pivot. Otherwise keep only the side that contains target and repeat.',
  ],
};
