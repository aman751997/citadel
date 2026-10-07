// Decision puzzles and timeline figures for the Intervals lesson (src/dsa-lessons/intervals.mdx).
// Every number here is re-derived independently in tests/intervals.test.ts.
import { row, step, type TraceStep } from '../../lib/trace.ts';

// ---------- Timeline figures (rendered by the <Timeline> helper exported inside the lesson) ----------
export type Tone = 'gold' | 'blue' | 'green' | 'purple' | 'red' | 'dim';
export interface Bar { from: number; to: number; tone?: Tone; label?: string; ghost?: boolean }
export interface Lane { name: string; bars: Bar[] }
export interface TimelineFigure {
  from: number; to: number; step?: number; unit?: number;
  lanes: Lane[];
  marks?: { at: number; label: string; tone?: Tone }[];
  bands?: { from: number; to: number; label?: string; tone?: Tone }[];
}
const bar = (from: number, to: number, tone: Tone = 'blue', extra: Partial<Bar> = {}): Bar => ({ from, to, tone, ...extra });
const lane = (name: string, ...bars: Bar[]): Lane => ({ name, bars });

export const figures = {
  // Prologue: two bookings share time exactly when max(starts) <= min(ends).
  overlap: {
    from: 0, to: 12, unit: 34,
    lanes: [lane('booking a', bar(2, 7, 'blue')), lane('booking b', bar(5, 10, 'purple'))],
    bands: [{ from: 5, to: 7, label: 'shared: 5–7', tone: 'gold' }],
  },
  // Chapter 1: Merge Intervals, LeetCode example 1.
  merge: {
    from: 0, to: 18, unit: 28,
    lanes: [
      lane('booking 1', bar(1, 3)), lane('booking 2', bar(2, 6)), lane('booking 3', bar(8, 10)), lane('booking 4', bar(15, 18)),
      lane('merged', bar(1, 6, 'green'), bar(8, 10, 'green'), bar(15, 18, 'green')),
    ],
  },
  // Chapter 2: Insert Interval, LeetCode example 2. Phase 1 dim, phase 2 gold, phase 3 blue.
  insert: {
    from: 0, to: 17, unit: 40,
    lanes: [
      lane('ledger', bar(1, 2, 'dim'), bar(3, 5, 'gold'), bar(6, 7, 'gold'), bar(8, 10, 'gold'), bar(12, 16, 'blue')),
      lane('late booking', bar(4, 8, 'purple')),
      lane('after', bar(1, 2, 'dim'), bar(3, 10, 'green'), bar(12, 16, 'blue')),
    ],
  },
  // Chapter 3: Meeting Rooms, the classic "false" input.
  attend: {
    from: 0, to: 30, step: 5, unit: 18,
    lanes: [lane('meeting 1', bar(0, 30)), lane('meeting 2', bar(5, 10)), lane('meeting 3', bar(15, 20))],
    bands: [{ from: 5, to: 10, label: 'clash', tone: 'red' }, { from: 15, to: 20, label: 'clash', tone: 'red' }],
  },
  // Chapter 4: Meeting Rooms II event sweep, with a tie at 10. The last lane is the running count.
  roomsSweep: {
    from: 0, to: 30, step: 5, unit: 18,
    lanes: [
      lane('meeting 1', bar(0, 30)), lane('meeting 2', bar(5, 10)), lane('meeting 3', bar(10, 20)),
      lane('in use', bar(0, 5, 'dim', { label: '1' }), bar(5, 10, 'gold', { label: '2' }), bar(10, 20, 'gold', { label: '2' }), bar(20, 30, 'dim', { label: '1' })),
    ],
    marks: [{ at: 10, label: 'tie at 10: checkout first', tone: 'purple' }],
  },
  // Chapter 4: the Bell Captain's heap on [0,5], [1,2], [6,7]. Lanes are rooms.
  roomsHeap: {
    from: 0, to: 8, unit: 50,
    lanes: [lane('room A', bar(0, 5, 'blue')), lane('room B', bar(1, 2, 'purple'), bar(6, 7, 'purple'))],
    marks: [{ at: 6, label: 'heap now holds 5 and 7', tone: 'gold' }],
  },
  // Chapter 5: Non-overlapping Intervals in end order. Start order would keep 1–12 and cancel three.
  keepByEnd: {
    from: 0, to: 13, unit: 34,
    lanes: [
      lane('ends at 4', bar(2, 4, 'green')), lane('ends at 7', bar(5, 7, 'green')), lane('ends at 11', bar(8, 11, 'green')),
      lane('ends at 12', bar(1, 12, 'red', { ghost: true, label: '1–12 cancelled' })),
    ],
  },
  // Side quest 1: Minimum Number of Arrows, LeetCode example 1, sorted by end.
  arrows: {
    from: 0, to: 17, unit: 40,
    lanes: [lane('balloon', bar(1, 6)), lane('balloon', bar(2, 8)), lane('balloon', bar(7, 12, 'purple')), lane('balloon', bar(10, 16, 'purple'))],
    marks: [{ at: 6, label: 'arrow 1', tone: 'gold' }, { at: 12, label: 'arrow 2', tone: 'gold' }],
  },
  // Side quest 2: Interval List Intersections, LeetCode example 1.
  intersections: {
    from: 0, to: 26, step: 2, unit: 26,
    lanes: [
      lane('list A', bar(0, 2), bar(5, 10), bar(13, 23), bar(24, 25)),
      lane('list B', bar(1, 5, 'purple'), bar(8, 12, 'purple'), bar(15, 24, 'purple'), bar(25, 26, 'purple')),
      lane('A and B', bar(1, 2, 'green'), bar(5, 5, 'green'), bar(8, 10, 'green'), bar(15, 23, 'green'), bar(24, 24, 'green'), bar(25, 25, 'green')),
    ],
  },
  // Side quest 3: Employee Free Time, LeetCode example 1.
  freeTime: {
    from: 0, to: 11, unit: 40,
    lanes: [
      lane('porter 1', bar(1, 2), bar(5, 6)), lane('porter 2', bar(1, 3)), lane('porter 3', bar(4, 10)),
      lane('all free', bar(3, 4, 'green')),
    ],
  },
  // Side quest 4: My Calendar I, LeetCode example.
  calendar: {
    from: 8, to: 32, step: 2, unit: 24,
    lanes: [lane('accepted', bar(10, 20, 'green'), bar(20, 30, 'green')), lane('refused', bar(15, 25, 'red', { ghost: true }))],
  },
  // Side quest 5: Car Pooling, LeetCode example 1. The last lane is riders on board.
  carPool: {
    from: 0, to: 8, unit: 50,
    lanes: [
      lane('trip A: 2', bar(1, 5)), lane('trip B: 3', bar(3, 7, 'purple')),
      lane('on board', bar(1, 3, 'dim', { label: '2' }), bar(3, 5, 'red', { label: '5' }), bar(5, 7, 'dim', { label: '3' })),
    ],
  },
} satisfies Record<string, TimelineFigure>;

// ---------- Chapter traces ----------
export const mergeSweep: TraceStep[] = [
  step('cur is 1–3. The next booking starts at 2. What do you do?',
    [row('Sorted by start', ['1–3', '2–6', '8–10', '15–18'], { 0: 'CUR', 1: 'NEXT' })], 0, [
      ['Extend cur to 1–6', 'Yes. 2 ≤ 3, so the two bookings share time. cur becomes [1, max(3, 6)] = [1, 6].'],
      ['Emit 1–3, then open a new card at 2–6', 'That outputs two bookings that both cover 2–3. You may only close a card when there is a gap: next.start > cur.end.'],
      ['Compare 6 with 3 to decide', 'The next booking’s END decides how far cur stretches, not whether they touch. Overlap is decided by next.start against cur.end.'],
    ]),
  step('cur is 1–10 and the next booking is 2–3. They overlap. What is cur’s new end?',
    [row('Sorted by start', ['1–10', '2–3', '4–5'], { 0: 'CUR', 1: 'NEXT' })], 1, [
      ['3: take next.end', 'Then cur shrinks to 1–3, and 4–5 wrongly becomes a separate booking. 2–3 sits entirely inside 1–10.'],
      ['10: Math.max(10, 3)', 'Right. A swallowed booking can never shorten the card. cur stays 1–10, and 4–5 is swallowed next.'],
      ['13: add the lengths', 'Merging is a union of time, not a sum of durations. 1–10 already covers all of 2–3.'],
    ]),
  step('The loop has run out of bookings. What is left to do?',
    [row('Merged output', ['1–6', '8–10'], {}, { tones: { 0: 'done', 1: 'done' } }), row('Open card', ['15–18'], { 0: 'CUR' })], 1, [
      ['Nothing: return the output list', 'Then 15–18 is lost. A card is only emitted when a gap closes it, and no booking came after this one.'],
      ['Emit cur, then return', 'Yes. The last open card is never closed by a gap. Result: [1,6], [8,10], [15,18].'],
    ]),
];

export const insertPhases: TraceStep[] = [
  step('The new booking is 4–8. The first ledger entry, 1–2, ends at 2. Which phase is this?',
    [row('Ledger', ['1–2', '3–5', '6–7', '8–10', '12–16'], { 0: 'I' }), row('New', ['4–8'])], 0, [
      ['Phase 1: copy it unchanged', 'Yes. 2 < 4: it ends before the newcomer begins, so nothing about it changes.'],
      ['Phase 2: merge it into the new booking', 'Merging would claim 2–4 is booked. It is not; there is a gap between them.'],
      ['Re-sort the ledger first', 'The ledger is already sorted and free of clashes. Re-sorting costs O(n log n) and buys nothing.'],
    ]),
  step('3–5 starts at 3, which is ≤ 8, the new booking’s end. You merge. What does the new booking become?',
    [row('Ledger', ['1–2', '3–5', '6–7', '8–10', '12–16'], { 1: 'I' }, { tones: { 0: 'done' } }), row('New (growing)', ['4–8'])], 0, [
      ['3–8: the smaller start, the larger end', 'Right. min(4, 3) = 3 and max(8, 5) = 8. Only the first merged entry can lower the start; later ones start later.'],
      ['4–8: leave the new booking alone', 'The ledger entry starts at 3. Dropping 3–4 would lose booked time.'],
      ['3–5: keep the ledger entry', 'That drops 5–8, which the newcomer still needs.'],
    ]),
  step('6–7 merged without changing anything. Now 8–10 starts exactly at 8, where the new booking ends. Merge or stop?',
    [row('Ledger', ['1–2', '3–5', '6–7', '8–10', '12–16'], { 3: 'I' }, { tones: { 0: 'done', 1: 'done', 2: 'done' } }), row('New (growing)', ['3–8'])], 0, [
      ['Merge: 8 ≤ 8, so the new booking becomes 3–10', 'Yes. Insert Interval follows Merge Intervals: touching ranges join. 12–16 starts after 10, so you emit 3–10 and copy 12–16. Result: [1,2], [3,10], [12,16].'],
      ['Stop: touching is not overlapping', 'That is the meeting-room reading. In Insert Interval, as in Merge Intervals, [3,8] and [8,10] become one range. Read the definition of overlap first.'],
    ]),
];

export const attendAll: TraceStep[] = [
  step('Sorted by start. 5–10 begins at 5; the meeting before it ends at 30. Can one person attend both?',
    [row('Sorted by start', ['0–30', '5–10', '15–20'], { 0: 'PREV', 1: 'CUR' })], 0, [
      ['No: 5 < 30, so return false', 'Right. One clash is enough to answer the whole question.'],
      ['Yes: 5–10 is over long before 30', 'Ending early does not help. It also starts before 30, so from 5 to 10 they would need to be in two rooms.'],
    ]),
  step('Two meetings arrive in this order: 7–10, then 2–4. Compare 2 with 10?',
    [row('As given', ['7–10', '2–4'])], 1, [
      ['Yes: 2 < 10, so they clash', 'The neighbour test is only valid after sorting. 2–4 is over before 7–10 begins.'],
      ['Sort first: 2–4, 7–10. 7 ≥ 4, so both fit', 'Right. Sorting by start is what makes “only neighbours need checking” true.'],
    ]),
  step('One meeting ends at 5; the next starts at 5. Is that a clash?',
    [row('Sorted by start', ['1–5', '5–8'])], 0, [
      ['No: walk out at 5, walk in at 5', 'Right. Meeting problems treat a meeting as [start, end): back-to-back is fine. The clash test is start < previous end.'],
      ['Yes: both include the moment 5', 'That is the closed reading Merge Intervals uses. For meetings, back-to-back is allowed. Say your assumption out loud.'],
    ]),
];

export const roomsSweep: TraceStep[] = [
  step('Two rooms are in use. At time 10, one meeting ends and another starts. Which event do you process first?',
    [row('Meetings', ['0–30', '5–10', '10–20']), row('Processed', ['0: +1', '5: +1'], {}, { tones: { 0: 'done', 1: 'done' } }), row('Waiting at 10', ['10: −1', '10: +1'], { 0: '?', 1: '?' })], 0, [
      ['The checkout (−1), then the check-in (+1)', 'Right. In use goes 2 → 1 → 2. The room freed at 10 hosts the 10 o’clock meeting.'],
      ['The check-in (+1) first', 'In use would read 3 for an instant: a phantom room. The sweep would answer 3 instead of 2.'],
      ['Either order: the count ends the same', 'The count after both events is the same, but the answer is the MAXIMUM along the way. Check-in first makes that maximum 3.'],
    ]),
  step('The counts after each event are below. What does the sweep return?',
    [row('In use after each event', [1, 2, 1, 2, 1, 0], { 0: '0', 1: '5', 2: '10', 3: '10', 4: '20', 5: '30' })], 1, [
      ['0: the final count', 'Every meeting is over at the end. You want the busiest moment.'],
      ['2: the largest count seen', 'Yes. Two meetings are running at the busiest moment, so two rooms are needed — and, as the Bell Captain will show, enough.'],
      ['3: the number of meetings', 'Only two of them ever run at once. Meeting 2 and meeting 3 never meet.'],
    ]),
  step('The Bell Captain’s heap finishes holding 5 and 7. At time 6, how many meetings are running — and what does the heap’s size count?',
    [row('Sorted by start', ['0–5', '1–2', '6–7']), row('Heap at the end', [5, 7], { 0: 'PEEK' })], 1, [
      ['2 running; the heap holds rooms in use', 'Only 6–7 is running at time 6. The room whose last meeting ended at 5 is free, but nothing removed it from the heap.'],
      ['1 running; the size counts rooms ever opened', 'Right. Each meeting either reuses a room (poll + offer: size unchanged) or opens one (offer: size + 1). The size never shrinks, so it ends at the number of rooms opened: 2.'],
      ['1 running, so the answer is 1', 'The question is the busiest moment. At time 1, 0–5 and 1–2 both run, so two rooms are needed.'],
    ]),
];

export const keepByEnd: TraceStep[] = [
  step('Sort by START and keep every booking that starts at or after the last kept end. How many cancellations does that give — and what is the best possible?',
    [row('Bookings', ['1–100', '2–3', '4–5'])], 0, [
      ['Start order cancels 2; the best is 1', 'Right. Start order keeps 1–100 first, which then blocks 2–3 and 4–5. Keeping 2–3 and 4–5 cancels only 1–100.'],
      ['Both give 1', 'Start order keeps 1–100 before it has seen anything else, and that one booking rules out the other two: 2 cancellations.'],
      ['Both give 2', 'Two short bookings can both be kept: 2–3 ends before 4–5 starts. Only 1–100 has to go.'],
    ]),
  step('Sorted by END: 2–3 and 4–5 are kept, so lastEnd = 5. 1–100 starts at 1. Keep or cancel?',
    [row('Sorted by end', ['2–3', '4–5', '1–100'], { 2: 'NEXT' }, { tones: { 0: 'done', 1: 'done' } })], 0, [
      ['Cancel: 1 < 5, it clashes with a kept booking', 'Yes. One cancellation, which matches the best possible.'],
      ['Keep: it is the longest, so it is worth the most', 'This problem counts bookings, not hours. Every kept booking is worth 1, however long it is.'],
    ]),
  step('lastEnd = 2. The next booking starts at 2. Keep it?',
    [row('Sorted by end', ['1–2', '2–3'], { 0: 'KEPT', 1: 'NEXT' }, { tones: { 0: 'done' } })], 0, [
      ['Keep: touching does not count as a clash here', 'Right. Non-overlapping Intervals says [1,2] and [2,3] do not overlap, so the test is start >= lastEnd.'],
      ['Cancel: they share the point 2', 'That is the closed reading the balloon side quest uses. Here touching is allowed; testing start > lastEnd cancels one booking too many.'],
    ]),
];

// ---------- Mixed recall (includes every question from the old checkpoint quiz) ----------
export const mixedReview: TraceStep[] = [
  step('Merging sorted [[1,10],[2,3],[4,5]]: after processing [2,3], cur must still be [1,10]. Which line guarantees it?', [], 1, [
    ['cur[1] = intervals[i][1]', 'This replaces the end: [2,3] would shrink cur to [1,3], and [4,5] would be split off as a separate range.'],
    ['cur[1] = Math.max(cur[1], intervals[i][1])', 'Right. [2,3] is swallowed whole; the max keeps the end at 10.'],
    ['cur[0] = Math.min(cur[0], intervals[i][0])', 'The start never needs a min: sorting by start already makes cur[0] the smallest start in the group.'],
    ['Sort by end time first', 'In end order [2,3] comes before [1,10], and the start-based sweep would report [2,10], losing 1–2.'],
  ]),
  step('Meeting Rooms II by event sweep: one meeting ends at 10 and another starts at 10. In what order, and why?', [], 1, [
    ['Start first: arrivals take priority', 'Counting the arrival first shows one more meeting than is ever really running: a phantom room.'],
    ['End (−1) first: the freed room is free at 10', 'Right. Encode it in the comparator: at equal times, −1 sorts before +1.'],
    ['Order does not matter at equal times', 'The count after both is the same, but the answer is the maximum along the way — and start-first raises it by 1.'],
    ['Whatever order the input happened to list them', 'Input order is arbitrary. Meetings [10,20] then [0,10] put the 10 o’clock check-in first and report 2 rooms when 1 is enough.'],
  ]),
  step('“Fewest bookings to remove so none overlap.” Why sort by END time for the greedy?', [], 1, [
    ['An end sort is faster', 'Both sorts cost O(n log n). The difference is correctness, not speed.'],
    ['The booking that ends earliest leaves the most room for the rest', 'Right. Swapping it into any best schedule keeps that schedule valid — the exchange argument. Start order with the same keep rule can be trapped by one long booking.'],
    ['A start sort fails on negative times', 'Negative times are fine for either sort. The failure is about long bookings, not signs.'],
    ['Either sort works with the same keep rule', 'Not with the same rule: start order keeps [1,100] and loses [2,3] and [4,5]. (Start order can be rescued by a different rule — on a clash keep whichever ends earlier — which is the earliest-end idea in disguise.)'],
  ]),
  step('A van has 6 seats. Trips are (riders, pickup, dropoff). Can it serve them all? Which approach fits?', [], 0, [
    ['Events: +riders at pickup, −riders at dropoff, dropoffs first on ties', 'Right. It is Meeting Rooms II with weights: the load at the busiest moment must fit the seats.'],
    ['Merge the trips, then count merged groups', 'Merging forgets how many riders overlap. Two big trips side by side and two small ones look the same once merged.'],
    ['Sort by dropoff and keep non-clashing trips', 'That chooses trips to drop. Here every trip must be served; you only need the peak load.'],
  ]),
  step('Booking requests arrive one at a time and must be accepted or refused on the spot. Which tool?', [], 1, [
    ['Sort all requests, then sweep once', 'You cannot sort requests that have not arrived yet. Each answer is due immediately.'],
    ['An ordered map: check the neighbour before and the neighbour after', 'Right. Accepted bookings never overlap, so only the floor and ceiling entries can clash. O(log n) per request.'],
    ['A min-heap of end times', 'A heap only shows the earliest end. A clash can come from a booking that ends later.'],
  ]),
  step('Three surgeons each have a sorted list of operations. When are ALL of them free?', [], 2, [
    ['Intersect the three lists pairwise', 'Intersection finds when they are BUSY together. You want the time nobody is busy.'],
    ['Count events and report when the count is 3', 'A count of 3 means all three are busy. The free stretches are where the count is 0.'],
    ['Pool all operations, merge them, and report the gaps', 'Right. The gaps between merged busy blocks are the shared free time.'],
  ]),
  step('Two sorted lists of free slots, each internally non-overlapping. Return the slots when both are free.', [], 0, [
    ['One reader per list; record the overlap, then advance whichever slot ends first', 'Right. The slot that ends first cannot meet anything later in the other list.'],
    ['Merge both lists into one and sweep', 'Merging gives times when EITHER is free. You want when BOTH are.'],
    ['Advance whichever slot starts first', 'A slot that starts early may end late and still overlap the next slot in the other list.'],
  ]),
  step('Jobs have pay. Choose non-clashing jobs for the most total pay. Does sort-by-end greedy work?', [], 1, [
    ['Yes: earliest end leaves the most room', 'Room is not pay. Jobs [1,4] paying 10, [2,3] paying 1, and [3,5] paying 1: greedy takes the two small jobs for 2; the best is 10.'],
    ['No: use DP over jobs sorted by end, with a binary search for the last compatible job', 'Right. Once bookings have weights, the exchange argument breaks. Each job is either skipped or taken with the best answer before its start.'],
  ]),
  step('Balloons [1,2] and [2,3]. One arrow at x pops every balloon with start ≤ x ≤ end. One arrow or two?', [], 0, [
    ['One: an arrow at 2 pops both', 'Right. Balloon spans are closed, so touching counts. Start a new arrow only when start > arrow position.'],
    ['Two: touching is not overlapping', 'That is the reading for Non-overlapping Intervals. For balloons, start ≤ x ≤ end includes the shared point 2.'],
  ]),
  step('A sorted, clash-free ledger and one new booking. The interviewer asks for O(n). What do you say?', [], 2, [
    ['Append it, sort, and merge', 'Correct output, but sorting makes it O(n log n). The ledger is already sorted; use that.'],
    ['Binary search for its spot, then insert into the array', 'It can be made to work, but the search buys nothing: building the output and merging touching neighbours is still O(n), and the code gets fiddly. Lead with the one-pass answer.'],
    ['Three phases: copy what ends before it, merge what overlaps it, copy the rest', 'Right. One pass, O(n), and the merged phase handles touching neighbours.'],
  ]),
];
