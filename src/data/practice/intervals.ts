// Independent practice for the Intervals lesson. Prompts describe the task, never the technique.
// Every input changes with `variant`; tests/intervals.test.ts re-derives each answer by brute force.
// Data in prompts is the only bracketed text, so it can be parsed back out.
import type { Challenge, PracticeSet } from '../../lib/practice.ts';

type Pair = [number, number];

export const strategies = {
  merge: 'Sort by start; extend a running range or close it at a gap',
  phases: 'Walk sorted ranges in phases: before, overlapping, after',
  neighbours: 'Sort by start and compare each range with its neighbour',
  sweep: 'Turn ranges into +/− events and sweep in time order',
  'greedy-end': 'Sort by end; keep whatever starts after the last kept end',
  'two-lists': 'Walk two sorted lists, advancing whichever range ends first',
  'ordered-map': 'Keep accepted ranges in an ordered map; check the neighbours',
  cover: 'Sort by start (longer first on ties); track the furthest end',
  other: 'Use another tool: these sorts and sweeps do not fit',
} as const;

export const conceptIds = ['merge', 'insert', 'attend', 'rooms', 'cancel', 'arrows', 'intersect', 'free-time', 'calendar', 'shuttle', 'covered', 'paid-jobs'] as const;
type ConceptId = typeof conceptIds[number];

const fmt = (x: unknown) => JSON.stringify(x).replace(/,/g, ', ');
const flat = (ps: Pair[]) => ps.flatMap(p => [p[0], p[1]]);
function rng(seed: number) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return (max: number) => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return (s >>> 8) % max; };
}
const randPairs = (r: (m: number) => number, n: number, span: number, maxLen: number, minLen = 1): Pair[] =>
  Array.from({ length: n }, () => { const a = r(span); return [a, a + minLen + r(maxLen - minLen + 1)] as Pair; });
// Sorted, internally disjoint closed ranges with at least one free unit between neighbours.
function disjoint(r: (m: number) => number, n: number, startAt = 0): Pair[] {
  const out: Pair[] = []; let t = startAt + r(3);
  for (let k = 0; k < n; k++) { const len = r(4); out.push([t, t + len]); t += len + 1 + r(3); }
  return out;
}

// Reference answers (the lesson's algorithms, transcribed). Tests check them against brute force.
function merged(ps: Pair[]): Pair[] {
  const a = [...ps].sort((x, y) => x[0] - y[0]); const out: Pair[] = [];
  for (const p of a) { const last = out[out.length - 1]; if (last && p[0] <= last[1]) last[1] = Math.max(last[1], p[1]); else out.push([p[0], p[1]]); }
  return out;
}
function peak(ps: Pair[]): number {
  const ev = ps.flatMap(p => [[p[0], 1], [p[1], -1]]).sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  let c = 0, best = 0; for (const [, d] of ev) { c += d; best = Math.max(best, c); } return best;
}

export function challengeFor(id: ConceptId, variant = 0): Challenge {
  const r = rng(variant * 131 + conceptIds.indexOf(id) * 17 + 7);
  const base = { id, question: 'Enter only the result.' };
  switch (id) {
    case 'merge': {
      let ps: Pair[]; do { ps = randPairs(r, 5, 14, 4); } while (merged(ps).length === ps.length || merged(ps).length === 1);
      return { ...base, topic: 'Combine overlapping ranges', section: 'merge-intervals', strategy: 'merge',
        prompt: `A ballroom’s bookings, in the order they were written down: ${fmt(ps)}. Each includes both its start and end hour, so two bookings that touch at one hour run together. Combine every group that shares time and list the result in time order.`,
        question: 'Enter the combined ranges as a flat list: start end start end …', answer: flat(merged(ps)),
        hints: ['Put the bookings in start order first.', 'Hold one range open. A booking that starts at or before its end joins it.', 'Join with the larger end. Close the range at a real gap — and remember the last one.'],
        rubric: ['Sorted by start before sweeping.', 'Extended with max(end), so a swallowed booking cannot shrink the range.', 'Emitted the final open range after the loop.'],
        explanation: `Sorted by start, sweep once: extend while next.start ≤ cur.end, close at a gap. Result: ${fmt(merged(ps))}.` };
    }
    case 'insert': {
      const ledger = disjoint(r, 4, 1); const s = r(18); const add: Pair = [s, s + 1 + r(5)];
      const ans = merged([...ledger, add]);
      return { ...base, topic: 'Add one range to a sorted ledger', section: 'insert-interval', strategy: 'phases',
        prompt: `A sorted ledger of clash-free bookings (ends included): ${fmt(ledger)}. Add the late booking ${fmt(add)} so the ledger stays sorted and clash-free; bookings that touch or overlap it join it. Aim for one linear pass.`,
        question: 'Enter the new ledger as a flat list: start end start end …', answer: flat(ans),
        hints: ['The ledger is already sorted — do not sort it again.', 'Some entries end before the newcomer starts, some overlap it, the rest start after it ends.', 'Copy the first group, absorb the second (min start, max end), add the newcomer, copy the third.'],
        rubric: ['Used the existing order; O(n), no re-sort.', 'Absorbed every entry with start ≤ new end and end ≥ new start.', 'Added the newcomer exactly once, even when it absorbed nothing.'],
        explanation: `Copy what ends before ${add[0]}, absorb what overlaps, copy the rest. Result: ${fmt(ans)}.` };
    }
    case 'attend': {
      // Odd variants: random meetings. Even variants: a clash-free day (some back-to-back), listed out of order.
      const ps: Pair[] = variant % 2 ? randPairs(r, 4, 16, 4) : (() => {
        const d = disjoint(r, 4, 0).map(p => p[0] === p[1] ? [p[0], p[1] + 1] as Pair : p);
        return d.map((p, k) => k > 0 && r(2) ? [d[k - 1][1], p[1]] as Pair : p).reverse();
      })();
      const a = [...ps].sort((x, y) => x[0] - y[0]); const ok = a.every((p, k) => k === 0 || p[0] >= a[k - 1][1]);
      return { ...base, topic: 'Can one person attend everything?', section: 'meeting-rooms', strategy: 'neighbours',
        prompt: `One guest’s meetings: ${fmt(ps)}. A meeting ending at t and another starting at t do not clash. Can the guest attend every meeting?`,
        question: 'Enter yes or no.', answer: ok,
        hints: ['If any two meetings clash, does some pair of neighbours in start order clash?', 'Sort by start.', 'Return no as soon as a start is earlier than the previous meeting’s end.'],
        rubric: ['Sorted before comparing.', 'Compared each meeting only with its predecessor, and explained why that suffices.', 'Used start < previous end, so back-to-back meetings pass.'],
        explanation: ok ? 'In start order, no meeting starts before the previous one ends.' : 'In start order, some meeting starts before the previous one ends.' };
    }
    case 'rooms': {
      const ps = randPairs(r, 5, 12, 6); const ans = peak(ps);
      return { ...base, topic: 'Fewest rooms for every meeting', section: 'meeting-rooms-ii', strategy: 'sweep',
        prompt: `Meetings ${fmt(ps)}. A room freed at time t can host a meeting that starts at t. What is the fewest rooms that hosts every meeting?`,
        question: 'Enter the number of rooms.', answer: ans,
        hints: ['The answer is the most meetings running at one moment.', 'Every meeting is a +1 at its start and a −1 at its end.', 'Sort the events; at equal times the −1 goes first. Track the highest running total.'],
        rubric: ['Reduced rooms to the peak number of simultaneous meetings.', 'Processed a checkout before a check-in at the same time.', 'Returned the maximum, not the final count.'],
        explanation: `The busiest moment has ${ans} meeting(s) running, so ${ans} room(s).` };
    }
    case 'cancel': {
      const ps = randPairs(r, 5, 12, 5);
      const a = [...ps].sort((x, y) => x[1] - y[1]); let kept = 0, last = -1e9; for (const p of a) if (p[0] >= last) { kept++; last = p[1]; }
      return { ...base, topic: 'Fewest cancellations', section: 'non-overlapping', strategy: 'greedy-end',
        prompt: `Bookings ${fmt(ps)}. Bookings that only touch, like one ending at 4 and another starting at 4, do not clash. What is the fewest bookings to cancel so that no two of the rest clash?`,
        question: 'Enter the number of cancellations.', answer: ps.length - kept,
        hints: ['Count the most bookings you can keep instead.', 'Which booking is always safe to keep first?', 'Sort by end; keep a booking when it starts at or after the last kept end.'],
        rubric: ['Sorted by end, not start.', 'Explained the exchange: the earliest end can replace the first booking of any best plan.', 'Used start >= lastEnd, so touching bookings both stay.'],
        explanation: `Keeping by earliest end keeps ${kept}, so cancel ${ps.length - kept}.` };
    }
    case 'arrows': {
      const ps = randPairs(r, 5, 14, 5, 0);
      const a = [...ps].sort((x, y) => x[1] - y[1]); let n = 0, at = -1e9; for (const p of a) if (p[0] > at) { n++; at = p[1]; }
      return { ...base, topic: 'Fewest shots to pop every balloon', section: 'burst-balloons', strategy: 'greedy-end',
        prompt: `Balloons hang across a wall; each spans ${fmt(ps)} (start, end). A dart thrown at position x pops every balloon with start ≤ x ≤ end. What is the fewest darts that pop them all?`,
        question: 'Enter the number of darts.', answer: n,
        hints: ['Where should the first dart go so it pops as many as possible without missing the earliest-ending balloon?', 'Sort by end. The first dart goes at the smallest end.', 'A new dart is needed only when a balloon starts AFTER the last dart (touching counts as popped).'],
        rubric: ['Sorted by end.', 'Placed each dart at the end of the first balloon it must pop.', 'Used start > dart position, since touching balloons are popped.'],
        explanation: `Darts at successive earliest ends: ${n} needed.` };
    }
    case 'intersect': {
      const A = disjoint(r, 3, 0), B = disjoint(r, 3, 1); const out: Pair[] = [];
      let i = 0, j = 0; while (i < A.length && j < B.length) { const lo = Math.max(A[i][0], B[j][0]), hi = Math.min(A[i][1], B[j][1]); if (lo <= hi) out.push([lo, hi]); if (A[i][1] < B[j][1]) i++; else j++; }
      return { ...base, topic: 'When are both free?', section: 'interval-intersections', strategy: 'two-lists',
        prompt: `Two guests’ free slots, each list sorted and internally non-overlapping, ends included. Guest A: ${fmt(A)}. Guest B: ${fmt(B)}. List every slot when both are free; a single shared hour (like 5 to 5) counts.`,
        question: 'Enter the shared slots as a flat list: start end start end …', answer: flat(out),
        hints: ['Two slots share time from the later start to the earlier end.', 'One reader per list.', 'Record the shared part if it is not empty, then advance whichever slot ends first.'],
        rubric: ['Overlap = [max start, min end], kept when lo ≤ hi.', 'Advanced the slot that ends first — it cannot meet anything later.', 'O(m + n): each step advances one reader.'],
        explanation: `Shared slots: ${fmt(out)}.` };
    }
    case 'free-time': {
      let people: Pair[][]; let gaps: Pair[];
      do {
        people = [disjoint(r, 2, 0), disjoint(r, 2, 1), disjoint(r, 1, 2)].map(p => p.map(q => q[0] === q[1] ? [q[0], q[1] + 1] as Pair : q));
        const all = merged(people.flat()); gaps = [];
        for (let k = 1; k < all.length; k++) gaps.push([all[k - 1][1], all[k][0]]);
      } while (!gaps.length);
      return { ...base, topic: 'When is nobody working?', section: 'free-time', strategy: 'merge',
        prompt: `Three porters’ shifts (each list sorted): ${fmt(people)}. List every stretch of positive length, between the first shift’s start and the last shift’s end, when nobody is working.`,
        question: 'Enter the free stretches as a flat list: start end start end …', answer: flat(gaps),
        hints: ['Free for everyone = outside the union of everybody’s busy time.', 'Pool every shift and sort by start.', 'Track how far the busy time reaches. A shift that starts later than that leaves a gap.'],
        rubric: ['Pooled and sorted every shift.', 'Recorded [busyUntil, start] only when start > busyUntil (positive length).', 'Moved busyUntil with max, so a long shift is not cut short.'],
        explanation: `Merged busy time leaves these gaps: ${fmt(gaps)}.` };
    }
    case 'calendar': {
      const reqs = randPairs(r, 5, 16, 5); const taken: Pair[] = [];
      const ans = reqs.map(([s, e]) => { const clash = taken.some(([a, b]) => s < b && a < e); if (!clash) taken.push([s, e]); return clash ? 0 : 1; });
      return { ...base, topic: 'Accept or refuse, on the spot', section: 'my-calendar', strategy: 'ordered-map',
        prompt: `Booking requests arrive in this order: ${fmt(reqs)}. Each covers start up to but not including end. Accept a request only if it does not clash with anything already accepted; otherwise refuse it.`,
        question: 'Enter 1 for accepted or 0 for refused, in order (e.g. 1 0 1).', answer: ans,
        hints: ['Accepted bookings never overlap each other.', 'Only the accepted booking just before and the one just after the new start can clash.', 'Refuse if the earlier one ends after the start, or the later one starts before the end.'],
        rubric: ['Answered each request immediately, without seeing later ones.', 'Checked only the floor and ceiling neighbours, and explained why that suffices.', 'Treated ranges as [start, end): touching is fine.'],
        explanation: `Decisions in order: ${ans.join(' ')}.` };
    }
    case 'shuttle': {
      const trips = Array.from({ length: 4 }, () => { const from = r(8); return [1 + r(4), from, from + 1 + r(4)]; });
      const cap = 3 + r(5); let maxLoad = 0;
      for (let x = 0; x <= 13; x++) maxLoad = Math.max(maxLoad, trips.reduce((t, [n, f, to]) => t + (f <= x && x < to ? n : 0), 0));
      return { ...base, topic: 'Does the shuttle ever overflow?', section: 'car-pooling', strategy: 'sweep',
        prompt: `The hotel shuttle has ${cap} seats and drives one way. Trips as (riders, pickup, dropoff): ${fmt(trips)}. Riders leave at their dropoff before anyone boards there. Can the shuttle serve every trip?`,
        question: 'Enter yes or no.', answer: maxLoad <= cap,
        hints: ['Only the busiest stretch of road matters.', 'Riders join at pickup and leave at dropoff.', 'Sort the changes by place, dropoffs first on ties, and watch the running load.'],
        rubric: ['Modelled each trip as +riders at pickup and −riders at dropoff.', 'Dropoffs before pickups at the same place.', 'Compared the peak load with the seats.'],
        explanation: `The peak load is ${maxLoad}; the shuttle has ${cap} seats.` };
    }
    case 'covered': {
      const seen = new Set<string>(); const ps: Pair[] = [];
      while (ps.length < 5) { const s = r(8); const p: Pair = [s, s + 1 + r(6)]; if (!seen.has(String(p))) { seen.add(String(p)); ps.push(p); } }
      const a = [...ps].sort((x, y) => x[0] - y[0] || y[1] - x[1]); let left = 0, far = -1;
      for (const p of a) if (p[1] > far) { left++; far = p[1]; }
      return { ...base, topic: 'Drop ranges inside other ranges', section: 'covered-intervals', strategy: 'cover',
        prompt: `Ranges ${fmt(ps)}. Remove every range that lies entirely within another (its start is at or after the other’s start and its end at or before the other’s end). How many ranges remain?`,
        question: 'Enter the number remaining.', answer: left,
        hints: ['In start order, what would have to be true of the ranges before this one for it to be covered?', 'On equal starts, the longer range must come first.', 'Track the furthest end seen. A range survives only if it reaches beyond that.'],
        rubric: ['Sorted by start, and by end descending on ties.', 'A range is covered exactly when an earlier one reaches at least as far.', 'Counted survivors; did not double-count equal starts.'],
        explanation: `${left} range(s) are not inside any other.` };
    }
    case 'paid-jobs': {
      const jobs = Array.from({ length: 4 }, () => { const s = r(8); return [s, s + 1 + r(4), 1 + r(9)]; });
      let best = 0;
      for (let mask = 0; mask < 16; mask++) {
        const pick = jobs.filter((_, k) => mask >> k & 1);
        if (pick.every((x, a) => pick.every((y, b) => a === b || x[1] <= y[0] || y[1] <= x[0]))) best = Math.max(best, pick.reduce((t, j) => t + j[2], 0));
      }
      return { ...base, topic: 'Know when greedy is the wrong tool', section: 'choose-the-tool', strategy: 'other',
        prompt: `Banquet jobs as (start, end, pay): ${fmt(jobs)}. Jobs that only touch (one ends at 3, the next starts at 3) can both be taken. Choose jobs with no clashes to earn the most total pay.`,
        question: 'Enter the most pay possible.', answer: best,
        hints: ['Does keeping the earliest-ending job still guarantee the best total when jobs have different pay?', 'Sort by end. For each job, either skip it or take it plus the best plan that finishes by its start.', 'best[k + 1] = max(best[k], best[last compatible] + pay), with a binary search for “last compatible”.'],
        rubric: ['Rejected the unweighted greedy: a long, well-paid job can beat two short ones.', 'Defined best over a prefix of jobs in end order.', 'Found the compatible prefix with a binary search: O(n log n).'],
        explanation: `The best non-clashing set pays ${best}.` };
    }
  }
}

export const practice: PracticeSet = {
  storageKey: 'citadel-intervals-review-v1',
  strategies,
  conceptIds,
  challengeFor: (id, variant = 0) => challengeFor(id as ConceptId, variant),
};
