// Hint ladders for every <HintLadder> in src/dsa-lessons/intervals.mdx.
export const hints: Record<string, [string, string, string]> = {
  merge: [
    'If the bookings were in start order, which one could the next booking possibly clash with?',
    'Sort by start. cur is the open card: the merged range still growing. out holds finished ranges.',
    'For each next booking: if next.start <= cur.end, set cur.end = max(cur.end, next.end); otherwise emit cur and open next. After the loop, emit cur.',
  ],
  insert: [
    'The ledger is already sorted and clash-free. Which entries can the newcomer possibly touch?',
    'One index i walks the ledger once. start and end describe the newcomer, growing as it absorbs entries.',
    'Copy entries with end < start. While entry.start <= end, absorb it (min start, max end). Add the newcomer. Copy the rest.',
  ],
  attend: [
    'In start order, if any two meetings clash, must some pair of neighbours clash?',
    'Sort by start. Compare each meeting with the one just before it.',
    'Return false as soon as start < previous end (back-to-back is fine). If no neighbours clash, return true.',
  ],
  roomsSweep: [
    'The rooms you need equal the most meetings running at the same moment.',
    'Turn each meeting into two events: (start, +1) and (end, −1). inUse is the running total; rooms is its maximum.',
    'Sort by time; at equal times put −1 before +1. Add each delta and record the maximum. Return it.',
  ],
  roomsHeap: [
    'When a meeting starts, which room is the best one to try to reuse?',
    'Sort meetings by start. A min-heap holds, for every room opened so far, the time its latest meeting ends.',
    'If heap.peek() <= start, poll it (reuse that room). Always offer this meeting’s end. Each step pops at most one, so the size only grows; return it.',
  ],
  eraseOverlap: [
    'Count the bookings you KEEP; cancellations are whatever is left.',
    'Sort by end. lastEnd is the end of the last booking you kept.',
    'Keep a booking when start >= lastEnd (touching is fine) and move lastEnd to its end; otherwise cancel it. Return n − kept.',
  ],
  arrows: [
    'An arrow fired at the earliest end pops every balloon that has started by then. Can it do better anywhere else?',
    'Sort by end, with Integer.compare. arrowAt is the position of the last arrow fired.',
    'Fire a new arrow, at this balloon’s end, only when start > arrowAt (touching balloons share an arrow). Count the arrows.',
  ],
  intersections: [
    'Two slots overlap from max(starts) to min(ends), when that range is not empty.',
    'Reader i walks the first list, j the second. Each step compares exactly one slot from each.',
    'Record [max start, min end] if lo <= hi. Then advance the reader whose slot ends first: it cannot overlap anything later.',
  ],
  freeTime: [
    'Free for everyone means: not inside anybody’s busy time. What does the union of all busy time look like?',
    'Pool every shift and sort by start. busyUntil is the end of the merged busy block so far.',
    'If a shift starts after busyUntil, record the gap [busyUntil, start]. Then busyUntil = max(busyUntil, end).',
  ],
  calendar: [
    'Accepted bookings never overlap each other. Which accepted bookings could a new one possibly clash with?',
    'A TreeMap from start to end. floorEntry(start) is the booking just before; ceilingEntry(start) the one just after.',
    'Refuse if the earlier booking ends after start, or the later booking starts before end. Otherwise put and accept.',
  ],
  carPool: [
    'The van is fine if and only if the load at its busiest moment fits the seats.',
    'Events: (pickup, +riders) and (dropoff, −riders). load is the running total.',
    'Sort by location, dropoffs before pickups on ties. Add each change; if load ever exceeds capacity, return false.',
  ],
  covered: [
    'In start order, a range is covered exactly when something before it reaches at least as far.',
    'Sort by start ascending; on equal starts, longer (larger end) first. furthestEnd is the furthest end seen.',
    'A range whose end exceeds furthestEnd survives: count it and move furthestEnd. Otherwise it is covered.',
  ],
  jobs: [
    'Process jobs by end time. For each one: either it is not in the best plan, or it is — together with the best plan that finishes by its start.',
    'best[k] = most pay using only the first k jobs in end order. ends[] lets you binary search.',
    'For job k: find how many earlier jobs end at or before its start (lo). best[k+1] = max(best[k], best[lo] + pay). Return best[n].',
  ],
};
