// Intervals playground: you make every move of the three core sweeps.
//   merge — sort by start, then extend the open card, close it at a gap, and emit the last one.
//   rooms — sweep check-ins and checkouts in time order; at equal times the checkout goes first.
//   keep  — sort by END, then keep or cancel each booking against the last kept end.
import { makeLab, type LabBase, type LabRow } from '../lab.ts';

type Pair = [number, number];
export interface S extends LabBase {
  input: Pair[];          // bookings as given
  a: Pair[];              // bookings on the board (sorted once the sort move is made)
  sorted: boolean;
  i: number;              // next booking to read (merge, keep)
  cur: Pair | null;       // merge: the open card
  out: Pair[];            // merge: finished ranges
  starts: number[];       // rooms: check-in times, sorted
  ends: number[];         // rooms: checkout times, sorted
  si: number; ei: number; // rooms: next check-in / checkout
  inUse: number; best: number;
  lastEnd: number | null; // keep: end of the last kept booking (null before the first)
  status: ('kept' | 'cancelled' | null)[];
}

const show = (p: Pair) => `${p[0]}–${p[1]}`;
const list = (ps: Pair[]) => ps.length ? ps.map(show).join(', ') : 'nothing';
const byStart = (x: Pair, y: Pair) => x[0] - y[0] || x[1] - y[1];
const byEnd = (x: Pair, y: Pair) => x[1] - y[1] || x[0] - y[0];

export const mergeCases: Pair[][] = [
  [[8, 10], [1, 3], [15, 18], [2, 6]],
  [[4, 5], [1, 10], [2, 3]],
  [[1, 4], [4, 5], [7, 7]],
  [],
];
export const roomsCases: Pair[][] = [
  [[0, 30], [5, 10], [15, 20]],
  [[0, 30], [5, 10], [10, 20]],
  [[2, 4], [2, 4], [2, 4], [4, 6]],
  [],
];
export const keepCases: Pair[][] = [
  [[1, 2], [2, 3], [3, 4], [1, 3]],
  [[1, 100], [2, 3], [4, 5]],
  [[1, 2], [1, 2], [1, 2]],
  [],
];

const blank = (input: Pair[]) => ({
  input: input.map(p => [p[0], p[1]] as Pair), a: input.map(p => [p[0], p[1]] as Pair), sorted: false, i: 0, cur: null, out: [],
  starts: [], ends: [], si: 0, ei: 0, inUse: 0, best: 0, lastEnd: null, status: input.map(() => null),
});

// Build a fresh state for any input (used by the cases and by the randomised tests).
export function fromInput(mode: 'merge' | 'rooms' | 'keep', input: Pair[]): Omit<S, 'mode' | 'done' | 'moves' | 'message'> {
  const s = blank(input);
  if (mode === 'rooms') {
    s.starts = input.map(p => p[0]).sort((x, y) => x - y);
    s.ends = input.map(p => p[1]).sort((x, y) => x - y);
    s.sorted = true;
  }
  return s;
}

// Greedy "keep if start >= lastEnd" over a given order; returns how many are kept.
const keptInOrder = (ps: Pair[]) => { let kept = 0, last = -Infinity; for (const p of ps) if (p[0] >= last) { kept++; last = p[1]; } return kept; };

export const lab = makeLab<S>({
  merge: {
    name: 'Merge the ledger',
    cases: mergeCases.length,
    actions: [
      { action: 'sort', label: 'Sort by start time' },
      { action: 'extend', label: 'Overlap: extend cur (max of the ends)' },
      { action: 'close', label: 'Gap: emit cur, open the next booking' },
      { action: 'finish', label: 'Nothing left: emit cur and stop' },
    ],
    create: v => fromInput('merge', mergeCases[v]),
    expected: s => {
      if (!s.sorted) return 'sort';
      if (s.i >= s.a.length) return 'finish';
      return s.a[s.i][0] <= s.cur![1] ? 'extend' : 'close';
    },
    apply: (s, action) => {
      if (action === 'sort') {
        s.a.sort(byStart); s.sorted = true;
        if (s.a.length) { s.cur = [s.a[0][0], s.a[0][1]]; s.i = 1; }
        s.message = s.a.length ? `Sorted. The first booking, ${show(s.a[0])}, becomes the open card. Nothing later can start before ${s.a[0][0]}.` : 'Sorted — there are no bookings at all.';
        return;
      }
      if (action === 'finish') {
        if (s.cur) s.out.push(s.cur);
        s.cur = null; s.done = true;
        s.message = s.out.length ? `The last card is emitted. Merged ledger: ${list(s.out)}.` : 'No bookings, so the merged ledger is empty.';
        return;
      }
      const next = s.a[s.i], cur = s.cur!;
      if (action === 'extend') {
        const before = cur[1];
        cur[1] = Math.max(cur[1], next[1]);
        s.message = next[1] <= before
          ? `${show(next)} sits inside the card. max(${before}, ${next[1]}) = ${before}: the card keeps its end.`
          : `${next[0]} ≤ ${before}, so they share time. The card stretches to ${show(cur)}.`;
      } else {
        s.out.push(cur); s.cur = [next[0], next[1]];
        s.message = `${next[0]} > ${cur[1]}: a gap. ${show(cur)} is final — every later booking starts at ${next[0]} or after. ${show(next)} is the new open card.`;
      }
      s.i++;
    },
    reject: (s, action) => {
      if (!s.sorted) return action === 'finish'
        ? 'Nothing has been read yet. Sort first, then sweep.'
        : 'The bookings are not in start order, so a later one could still start before the card. Sort by start first.';
      if (action === 'sort') return 'Already sorted by start. Sorting again changes nothing.';
      if (s.i >= s.a.length) return s.cur ? `No bookings are left. The open card ${show(s.cur)} must still be emitted — that is the finishing move.` : 'No bookings are left. Finish.';
      const next = s.a[s.i], cur = s.cur!;
      if (action === 'finish') return `${s.a.length - s.i} booking(s) are still unread, starting with ${show(next)}. Stopping now would drop them.`;
      if (action === 'extend') return `${next[0]} > ${cur[1]}: there is a gap from ${cur[1]} to ${next[0]}. Extending would claim that free time is booked.`;
      return `${next[0]} ≤ ${cur[1]}: ${show(next)} shares time with the card. Emitting now would output two ranges that overlap.`;
    },
    view: s => [
      { name: s.sorted ? 'Bookings, sorted by start' : 'Bookings, as they arrived', empty: 'No bookings', cells: s.a.map((p, k) => ({ value: show(p), label: s.sorted && k === s.i && !s.done ? 'NEXT' : undefined, tone: s.sorted && k < s.i ? 'done' : s.sorted && k === s.i && !s.done ? 'hot' : undefined })) },
      { name: 'Open card (cur)', empty: s.done ? 'Closed' : 'None yet', cells: s.cur ? [{ value: show(s.cur), label: 'CUR', tone: 'hot' }] : [] },
      { name: 'Merged output', empty: 'Empty', cells: s.out.map(p => ({ value: show(p), tone: 'done' })) },
    ] as LabRow[],
    describe: s => s.done ? `Merged: ${list(s.out)}.` : !s.sorted ? `Unsorted bookings: ${list(s.a)}.` : s.i >= s.a.length ? `All bookings read. Open card: ${s.cur ? show(s.cur) : 'none'}.` : `cur = ${show(s.cur!)}, next = ${show(s.a[s.i])}. Does ${s.a[s.i][0]} ≤ ${s.cur![1]}?`,
  },

  rooms: {
    name: 'Count the ballrooms',
    cases: roomsCases.length,
    actions: [
      { action: 'checkout', label: 'Process the next checkout (−1)' },
      { action: 'checkin', label: 'Process the next check-in (+1)' },
      { action: 'finish', label: 'No check-ins left: report the peak' },
    ],
    create: v => fromInput('rooms', roomsCases[v]),
    expected: s => {
      if (s.si >= s.starts.length) return 'finish';
      return s.ei < s.ends.length && s.ends[s.ei] <= s.starts[s.si] ? 'checkout' : 'checkin';
    },
    apply: (s, action) => {
      if (action === 'finish') {
        s.done = true;
        s.message = `No check-ins remain, and checkouts can only lower the count. Rooms needed: ${s.best}.`;
        return;
      }
      if (action === 'checkout') {
        const t = s.ends[s.ei++]; s.inUse--;
        s.message = `A room frees at ${t}. In use: ${s.inUse}.`;
      } else {
        const t = s.starts[s.si++]; s.inUse++;
        const record = s.inUse > s.best; s.best = Math.max(s.best, s.inUse);
        s.message = `A meeting starts at ${t}. In use: ${s.inUse}${record ? ` — a new peak` : ''}.`;
      }
    },
    reject: (s, action) => {
      if (s.si >= s.starts.length) return `Every check-in is done. The remaining checkouts can only lower the count; the peak, ${s.best}, is the answer.`;
      const start = s.starts[s.si], end = s.ei < s.ends.length ? s.ends[s.ei] : null;
      if (action === 'finish') return `The check-in at ${start} has not been counted yet. It could raise the peak.`;
      if (action === 'checkin') return end === start
        ? `A meeting ends at ${end} just as this one starts at ${start}. Free the room first: counting the arrival first would show ${s.inUse + 1} rooms in use — a phantom room.`
        : `The checkout at ${end} happens before the check-in at ${start}. Events must be processed in time order.`;
      return `The next check-in, at ${start}, comes before the next checkout${end === null ? '' : `, at ${end}`}. Process events in time order.`;
    },
    view: s => [
      { name: 'Check-ins (sorted)', empty: 'No meetings', cells: s.starts.map((t, k) => ({ value: String(t), label: k === s.si && !s.done ? 'NEXT' : undefined, tone: k < s.si ? 'done' : k === s.si && !s.done ? 'hot' : undefined })) },
      { name: 'Checkouts (sorted)', empty: 'No meetings', cells: s.ends.map((t, k) => ({ value: String(t), label: k === s.ei && !s.done ? 'NEXT' : undefined, tone: k < s.ei ? 'done' : k === s.ei && !s.done ? 'hot' : undefined })) },
    ] as LabRow[],
    describe: s => s.done ? `Rooms needed: ${s.best}.` : `Meetings: ${list(s.input)}. In use now: ${s.inUse}. Peak so far: ${s.best}.`,
  },

  keep: {
    name: 'Keep or cancel',
    cases: keepCases.length,
    actions: [
      { action: 'sort-end', label: 'Sort by end time' },
      { action: 'sort-start', label: 'Sort by start time' },
      { action: 'keep', label: 'Keep it (starts at or after lastEnd)' },
      { action: 'cancel', label: 'Cancel it (clashes with the last kept)' },
      { action: 'finish', label: 'All decided: report cancellations' },
    ],
    create: v => fromInput('keep', keepCases[v]),
    expected: s => {
      if (!s.sorted) return 'sort-end';
      if (s.i >= s.a.length) return 'finish';
      return s.lastEnd === null || s.a[s.i][0] >= s.lastEnd ? 'keep' : 'cancel';
    },
    apply: (s, action) => {
      if (action === 'sort-end') {
        s.a.sort(byEnd); s.sorted = true;
        s.message = s.a.length ? `Sorted by end. ${show(s.a[0])} finishes first, so it leaves the most room for everything else.` : 'Sorted — there are no bookings.';
        return;
      }
      if (action === 'finish') {
        s.done = true;
        const cancelled = s.status.filter(x => x === 'cancelled').length;
        s.message = `Kept ${s.a.length - cancelled}, cancelled ${cancelled}. That is the fewest cancellations possible.`;
        return;
      }
      const p = s.a[s.i];
      if (action === 'keep') {
        s.message = s.lastEnd === null ? `Nothing kept yet, so ${show(p)} is kept. lastEnd = ${p[1]}.` : `${p[0]} ≥ ${s.lastEnd}: no clash. Keep ${show(p)}; lastEnd = ${p[1]}.`;
        s.status[s.i] = 'kept'; s.lastEnd = p[1];
      } else {
        s.status[s.i] = 'cancelled';
        s.message = `${p[0]} < ${s.lastEnd}: ${show(p)} clashes with the last kept booking. Cancel it; lastEnd stays ${s.lastEnd}.`;
      }
      s.i++;
    },
    reject: (s, action) => {
      if (!s.sorted) {
        if (action === 'sort-start') {
          const startOrder = keptInOrder([...s.a].sort(byStart)), endOrder = keptInOrder([...s.a].sort(byEnd));
          return startOrder < endOrder
            ? `On this board start order would keep only ${startOrder} and end order keeps ${endOrder}: an early, long booking blocks the short ones. Sort by end.`
            : `On this board both orders happen to keep ${endOrder}, but only end order comes with a proof. One long early booking (try 1–100, 2–3, 4–5) traps start order.`;
        }
        return 'The order decides which booking you commit to first. Sort by end time before deciding anything.';
      }
      if (action === 'sort-end' || action === 'sort-start') return 'Already sorted by end. Re-sorting now would scramble the decisions you have made.';
      if (s.i >= s.a.length) return 'Every booking has been decided. Report the cancellations.';
      const p = s.a[s.i];
      if (action === 'finish') return `${show(p)} has not been decided yet.`;
      if (action === 'keep') return `${p[0]} < ${s.lastEnd}: ${show(p)} overlaps the last kept booking. Keeping both would leave a clash.`;
      return s.lastEnd === null
        ? `Nothing has been kept yet, so ${show(p)} cannot clash. It ends earliest of all: keeping it is always safe.`
        : `${p[0]} ≥ ${s.lastEnd}: ${show(p)} starts after the last kept booking ends (touching is allowed). Cancelling it would throw away a free keep.`;
    },
    view: s => [
      { name: s.sorted ? 'Bookings, sorted by end' : 'Bookings, as they arrived', empty: 'No bookings', cells: s.a.map((p, k) => ({
        value: show(p),
        label: s.status[k] === 'kept' ? 'KEPT' : s.status[k] === 'cancelled' ? 'CANCEL' : s.sorted && k === s.i && !s.done ? 'NEXT' : undefined,
        tone: s.status[k] === 'kept' ? 'done' : s.status[k] === 'cancelled' ? 'out' : s.sorted && k === s.i && !s.done ? 'hot' : undefined,
      })) },
    ] as LabRow[],
    describe: s => s.done ? `Cancelled ${s.status.filter(x => x === 'cancelled').length} of ${s.a.length}.` : `lastEnd = ${s.lastEnd === null ? 'none yet' : s.lastEnd}. Kept ${s.status.filter(x => x === 'kept').length}, cancelled ${s.status.filter(x => x === 'cancelled').length}.`,
  },
}, 'Gold = the booking or event you are deciding · green = settled · faded = cancelled');
