// Dry-run frames for every problem in src/dsa-lessons/intervals.mdx. Each generator replays the lesson's
// algorithm on a small input and ends with a text view holding `answer` (checked in tests/intervals.test.ts).
import { recorder, tvars, type Frame, type View, type CellTone, type Val } from '../../lib/dryrun.ts';

type P = number[];
const s = (p: P) => `${p[0]}–${p[1]}`;
const list = (ps: P[]) => (ps.length ? ps.map(s).join(', ') : 'none');
const byStart = (a: P[]) => [...a].sort((x, y) => x[0] - y[0]);
const byEnd = (a: P[]) => [...a].sort((x, y) => x[1] - y[1]);
const yesno = (b: boolean) => (b ? 'yes' : 'no');

const q = (question: string, options: string[], answer: number, explain: string) => ({ question, options, answer, explain });

export function mergeFrames(input: P[]): Frame[] {
  const a = byStart(input), r = recorder(), out: P[] = [];
  let cur = [...a[0]];
  const snap = () => ({ cur: s(cur), merged: list(out) });
  let prev = snap();
  const arr = (i: number, tones: Record<number, CellTone>): View => ({
    kind: 'array', name: 'sorted by start', values: a.map(s), indices: false,
    pointers: i < a.length ? [{ at: i, label: 'next', tone: 'blue' }] : [], tones,
  });
  r.frame(`Sort by start: ${list(a)}. Open a card with the first booking, ${s(cur)}. Nothing is settled yet.`,
    [arr(1, { 0: 'active' }), tvars(snap())]);
  for (let i = 1; i < a.length; i++) {
    const n = a[i];
    const tones: Record<number, CellTone> = {};
    for (let k = 0; k < i; k++) tones[k] = 'visited';
    tones[i] = 'compared';
    if (n[0] <= cur[1]) {
      const newEnd = Math.max(cur[1], n[1]);
      const was = s(cur);
      cur = [cur[0], newEnd];
      r.frame(`${s(n)} starts at ${n[0]}, which is at most the card's end ${was.split('–')[1]}. They share time, so extend the end to max(${was.split('–')[1]}, ${n[1]}) = ${newEnd}.`,
        [arr(i, tones), tvars(snap(), prev)],
        q(`Card is ${was}. Next is ${s(n)}. What happens?`, ['Extend the card', 'Emit the card, open a new one'], 0,
          `${n[0]} <= ${was.split('–')[1]}, so there is no gap.`));
    } else {
      const done = s(cur);
      out.push(cur);
      cur = [...n];
      r.frame(`${s(n)} starts at ${n[0]}, after the card's end. That is a gap, and every later booking starts even later, so nothing can reach back. Emit ${done} and open a new card.`,
        [arr(i, tones), tvars(snap(), prev)],
        q(`Card is ${done}. Next is ${s(n)}. What happens?`, ['Extend the card', 'Emit the card, open a new one'], 1,
          `${n[0]} > ${done.split('–')[1]}: a real gap, so the card is final.`));
    }
    prev = snap();
  }
  out.push(cur);
  const all: Record<number, CellTone> = {};
  a.forEach((_, k) => (all[k] = 'visited'));
  r.frame(`No bookings are left, but the card is still open. A gap never closed it, so emit it now. Result: ${list(out)}.`,
    [arr(a.length, all), tvars({ ...snap(), merged: list(out), answer: list(out) }, prev)]);
  return r.frames;
}

export function insertFrames(ledger: P[], nw: P): Frame[] {
  const r = recorder(), out: P[] = [];
  let i = 0, start = nw[0], end = nw[1];
  const snap = () => ({ newcomer: `${start}–${end}`, out: list(out) });
  let prev = snap();
  const arr = (tones: Record<number, CellTone>): View => ({
    kind: 'array', name: 'ledger (sorted, no clashes)', values: ledger.map(s), indices: false,
    pointers: i < ledger.length ? [{ at: i, label: 'i', tone: 'blue' }] : [], tones,
  });
  const tones: Record<number, CellTone> = {};
  r.frame(`The ledger is sorted, so it splits into three runs. The newcomer is ${s(nw)}. Phase 1: copy every entry that ends before ${start}.`,
    [arr(tones), tvars(snap())]);
  while (i < ledger.length && ledger[i][1] < start) {
    out.push(ledger[i]); tones[i] = 'done';
    r.frame(`${s(ledger[i])} ends at ${ledger[i][1]}, before the newcomer starts at ${start}. It cannot touch the newcomer, so copy it unchanged.`,
      [arr({ ...tones }), tvars(snap(), prev)],
      q(`Entry ${s(ledger[i])}, newcomer starts at ${start}. Which run?`, ['Phase 1: copy it', 'Phase 2: absorb it'], 0, `${ledger[i][1]} < ${start}, so it ends before the newcomer.`));
    i++; prev = snap();
  }
  while (i < ledger.length && ledger[i][0] <= end) {
    const e = ledger[i];
    const ns = Math.min(start, e[0]), ne = Math.max(end, e[1]);
    start = ns; end = ne; tones[i] = 'compared';
    r.frame(`${s(e)} starts at ${e[0]}, which is at most the newcomer's end. They overlap (touching counts), so the newcomer becomes ${start}–${end}: min of starts, max of ends.`,
      [arr({ ...tones }), tvars(snap(), prev)],
      q(`Entry ${s(e)} reaches the newcomer. What is the newcomer afterwards?`,
        [`${start}–${end}`, `${e[0]}–${e[1]}`, `${nw[0]}–${nw[1]}`], 0, 'Take the smaller start and the larger end so no booked time is lost.'));
    i++; prev = snap();
  }
  out.push([start, end]);
  r.frame(`Phase 2 is over: the next entry starts after ${end} (or none is left). Add the grown newcomer ${start}–${end} exactly once.`,
    [arr({ ...tones }), tvars(snap(), prev)]);
  prev = snap();
  while (i < ledger.length) {
    out.push(ledger[i]); tones[i] = 'done';
    r.frame(`${s(ledger[i])} starts after the newcomer ends, and so does everything after it. Copy it unchanged.`, [arr({ ...tones }), tvars(snap(), prev)]);
    i++; prev = snap();
  }
  r.frame(`The ledger is fully read. Result: ${list(out)}.`, [arr({ ...tones }), tvars({ ...snap(), answer: list(out) }, prev)]);
  return r.frames;
}

export function attendFrames(input: P[]): Frame[] {
  const a = byStart(input), r = recorder();
  const arr = (i: number, tones: Record<number, CellTone>): View => ({
    kind: 'array', name: 'sorted by start', values: a.map(s), indices: false,
    pointers: i < a.length ? [{ at: i, label: 'cur', tone: 'blue' }] : [], tones,
  });
  r.frame(`Sort by start: ${list(a)}. Now each meeting only needs to be compared with the one just before it.`, [arr(1, {}), tvars({ answer: '?' })]);
  for (let i = 1; i < a.length; i++) {
    const tones: Record<number, CellTone> = {};
    for (let k = 0; k < i - 1; k++) tones[k] = 'visited';
    tones[i - 1] = 'active'; tones[i] = 'compared';
    const clash = a[i][0] < a[i - 1][1];
    r.frame(clash
      ? `${s(a[i])} starts at ${a[i][0]}, before the previous meeting ends at ${a[i - 1][1]}. One clash is enough: return false.`
      : `${s(a[i])} starts at ${a[i][0]}, which is not before ${a[i - 1][1]}. ${a[i][0] === a[i - 1][1] ? 'Back-to-back is fine, since a meeting is [start, end). ' : ''}No clash here.`,
      [arr(i, tones), tvars({ cur: s(a[i]), previous_end: a[i - 1][1], answer: clash ? 'false' : '?' })],
      q(`Previous ends at ${a[i - 1][1]}, this one starts at ${a[i][0]}. Clash?`, ['Yes, return false', 'No, keep going'], clash ? 0 : 1,
        clash ? `${a[i][0]} < ${a[i - 1][1]}.` : `Clash only when start < previous end, and ${a[i][0]} is not less than ${a[i - 1][1]}.`));
    if (clash) return r.frames;
  }
  const all: Record<number, CellTone> = {};
  a.forEach((_, k) => (all[k] = 'visited'));
  r.frame('No neighbours clash, and the closest clashing pair would always be neighbours. Return true.', [arr(a.length, all), tvars({ answer: 'true' })]);
  return r.frames;
}

export function roomsSweepFrames(input: P[]): Frame[] {
  const ev = input.flatMap(m => [[m[0], 1], [m[1], -1]]).sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  const r = recorder();
  let inUse = 0, rooms = 0;
  const label = (e: P) => `${e[0]}:${e[1] > 0 ? '+1' : '−1'}`;
  const arr = (i: number, tones: Record<number, CellTone>): View => ({
    kind: 'array', name: 'events (time sorted, checkout before check-in)', values: ev.map(label), indices: false,
    pointers: i < ev.length ? [{ at: i, label: 'next', tone: 'blue' }] : [], tones,
  });
  r.frame(`Split every meeting into a +1 event at its start and a −1 event at its end. Sort by time; at equal times −1 goes first. inUse counts meetings running now; rooms is the largest inUse seen.`,
    [arr(0, {}), tvars({ inUse, rooms })]);
  const tones: Record<number, CellTone> = {};
  ev.forEach((e, i) => {
    const prev = { inUse, rooms };
    inUse += e[1];
    rooms = Math.max(rooms, inUse);
    const tie = ev[i + 1] && ev[i + 1][0] === e[0] && ev[i + 1][1] !== e[1];
    tones[i] = 'compared';
    const caption = e[1] > 0
      ? `At ${e[0]} a meeting starts: inUse goes to ${inUse}.${rooms > prev.rooms ? ` That is a new peak, so rooms becomes ${rooms}.` : ' The peak does not change.'}`
      : `At ${e[0]} a meeting ends: inUse drops to ${inUse}. The freed room can host a meeting that starts at ${e[0]}.`;
    r.frame(caption, [arr(i + 1, { ...tones }), tvars({ inUse, rooms }, prev)],
      tie && e[1] < 0
        ? q(`A meeting ends and another starts at ${e[0]}. Which event is processed first?`, ['The −1 (checkout)', 'The +1 (check-in)'], 0,
            'Checkouts first, so a room freed at this time is free for the meeting starting at this time.')
        : undefined);
    tones[i] = 'visited';
  });
  r.frame(`All events are processed. The answer is the peak, ${rooms}.`, [arr(ev.length, tones), tvars({ inUse, rooms, answer: rooms })]);
  return r.frames;
}

export function roomsHeapFrames(input: P[]): Frame[] {
  const a = byStart(input), r = recorder();
  const heap: number[] = [];
  const arr = (i: number, tones: Record<number, CellTone>): View => ({
    kind: 'array', name: 'sorted by start', values: a.map(s), indices: false,
    pointers: i < a.length ? [{ at: i, label: 'next', tone: 'blue' }] : [], tones,
  });
  const hv = (changed?: number[], removed?: Val[]): View => ({
    kind: 'set', name: 'heap: when each room frees (smallest first)', items: [...heap].sort((x, y) => x - y),
    changed, removed, note: `size ${heap.length} = rooms opened`,
  });
  r.frame('Sort by start. The heap holds one end time per room ever opened. Its smallest value is the room that frees first.', [arr(0, {}), hv()]);
  const tones: Record<number, CellTone> = {};
  a.forEach((m, i) => {
    const minBefore = heap.length ? Math.min(...heap) : Infinity;
    const reuse = minBefore <= m[0];
    let removed: number | undefined;
    if (reuse) { removed = Math.min(...heap); heap.splice(heap.indexOf(removed), 1); }
    heap.push(m[1]);
    const sorted = [...heap].sort((x, y) => x - y);
    tones[i] = 'compared';
    r.frame(reuse
      ? `${s(m)} starts at ${m[0]}. The earliest-freeing room frees at ${removed}, which is at most ${m[0]}, so reuse it: poll ${removed}, then offer ${m[1]}. Size stays ${heap.length}.`
      : heap.length === 1
        ? `${s(m)} is the first meeting. No room exists yet, so open one: offer ${m[1]}. Size is 1.`
        : `${s(m)} starts at ${m[0]}. Even the earliest-freeing room frees at ${minBefore} (later than ${m[0]}), so every room is busy. Open a new one: offer ${m[1]}. Size is ${heap.length}.`,
      [arr(i + 1, { ...tones }), hv([sorted.indexOf(m[1])], removed !== undefined ? [removed] : [])],
      q(`Heap minimum versus start ${m[0]}: reuse a room or open a new one?`, ['Reuse (poll, then offer)', 'Open a new room (offer only)'], reuse ? 0 : 1,
        reuse ? 'min <= start means that room is already free.' : 'min > start means every room is still busy.'));
    tones[i] = 'visited';
  });
  r.frame(`Done. The size never shrank, so it equals the number of rooms ever opened: ${heap.length}.`, [arr(a.length, tones), hv(), tvars({ answer: heap.length })]);
  return r.frames;
}

export function keepFrames(input: P[]): Frame[] {
  const a = byEnd(input), r = recorder();
  let lastEnd: number | null = null, kept = 0;
  const arr = (i: number, tones: Record<number, CellTone>): View => ({
    kind: 'array', name: 'sorted by END', values: a.map(s), indices: false,
    pointers: i < a.length ? [{ at: i, label: 'next', tone: 'blue' }] : [], tones,
  });
  const vars = (prev?: Record<string, Val>) => tvars({ lastEnd: lastEnd ?? 'none', kept, cancelled: cur - kept }, prev);
  let cur = 0;
  r.frame(`Sort by end: ${list(a)}. Keep a booking when it starts at or after lastEnd (touching is allowed here); otherwise cancel it. Cancellations are n − kept.`,
    [arr(0, {}), vars()]);
  const tones: Record<number, CellTone> = {};
  a.forEach((m, i) => {
    cur = i + 1;
    const prev = { lastEnd: lastEnd ?? 'none', kept, cancelled: i - kept };
    const keep = lastEnd === null || m[0] >= lastEnd;
    if (keep) { kept++; tones[i] = 'done'; } else tones[i] = 'out';
    const was = lastEnd;
    if (keep) lastEnd = m[1];
    r.frame(keep
      ? `${s(m)} starts at ${m[0]}${was === null ? ', and nothing is kept yet' : `, at or after lastEnd ${was}`}. Keep it. lastEnd becomes ${m[1]}, the earliest possible, because we sorted by end.`
      : `${s(m)} starts at ${m[0]}, before lastEnd ${was}. It clashes with a booking we already kept, so cancel it.`,
      [arr(i + 1, { ...tones }), vars(prev)],
      q(`lastEnd is ${was ?? 'none'}; next is ${s(m)}. Keep or cancel?`, ['Keep', 'Cancel'], keep ? 0 : 1,
        keep ? 'start >= lastEnd, so it fits after the last kept booking.' : 'start < lastEnd, so it overlaps the last kept booking.'));
  });
  r.frame(`Done. Kept ${kept} of ${a.length}, so ${a.length - kept} to cancel.`, [arr(a.length, tones), tvars({ lastEnd: lastEnd ?? 'none', kept, answer: a.length - kept })]);
  return r.frames;
}

export function arrowsFrames(input: P[]): Frame[] {
  const a = byEnd(input), r = recorder();
  let arrows = 0, at: number | null = null;
  const arr = (i: number, tones: Record<number, CellTone>): View => ({
    kind: 'array', name: 'balloons sorted by end', values: a.map(s), indices: false,
    pointers: i < a.length ? [{ at: i, label: 'next', tone: 'blue' }] : [], tones,
  });
  r.frame(`Sort by end: ${list(a)}. Fire each arrow at the earliest end of the balloons not yet popped: it pops everything that has started by then.`, [arr(0, {}), tvars({ arrows, arrowAt: 'none' })]);
  const tones: Record<number, CellTone> = {};
  a.forEach((b, i) => {
    const prev = { arrows, arrowAt: at ?? 'none' };
    const fresh = at === null || b[0] > at;
    if (fresh) { arrows++; const was = at; at = b[1]; tones[i] = 'found';
      r.frame(was === null ? `First balloon ${s(b)}: fire an arrow at its end, ${at}.` : `${s(b)} starts at ${b[0]}, after the last arrow at ${was}. The arrow misses it, so fire a new one at its end, ${at}.`,
        [arr(i + 1, { ...tones }), tvars({ arrows, arrowAt: at }, prev)],
        was === null ? undefined : q(`Last arrow at ${was}. Balloon ${s(b)}. New arrow?`, ['Yes', 'No, it is already popped'], 0, `${b[0]} > ${was}, so the arrow is left of this balloon.`));
    } else { tones[i] = 'visited';
      r.frame(`${s(b)} starts at ${b[0]}, which is at most the arrow at ${at}, and it ends at ${b[1]}, at or after ${at}. The arrow already pops it.`,
        [arr(i + 1, { ...tones }), tvars({ arrows, arrowAt: at! }, prev)],
        q(`Last arrow at ${at}. Balloon ${s(b)}. New arrow?`, ['Yes', 'No, it is already popped'], 1, `${b[0]} <= ${at}: touching counts, so the same arrow pops it.`));
    }
  });
  r.frame(`Done. ${arrows} arrows.`, [arr(a.length, tones), tvars({ arrows, answer: arrows })]);
  return r.frames;
}

export function intersectFrames(A: P[], B: P[]): Frame[] {
  const r = recorder(), out: P[] = [];
  let i = 0, j = 0;
  const views = (): View[] => [
    { kind: 'array', name: 'list A', values: A.map(s), indices: false, pointers: i < A.length ? [{ at: i, label: 'i', tone: 'blue' }] : [] },
    { kind: 'array', name: 'list B', values: B.map(s), indices: false, pointers: j < B.length ? [{ at: j, label: 'j', tone: 'purple' }] : [] },
  ];
  r.frame('Both lists are already sorted, so give each a reader. At every step compare exactly one slot from each.', [...views(), tvars({ result: 'none' })]);
  while (i < A.length && j < B.length) {
    const lo = Math.max(A[i][0], B[j][0]), hi = Math.min(A[i][1], B[j][1]);
    const hit = lo <= hi;
    if (hit) out.push([lo, hi]);
    const advA = A[i][1] < B[j][1];
    const a0 = A[i], b0 = B[j];
    if (advA) i++; else j++;
    r.frame(`${s(a0)} and ${s(b0)}: lo = max(starts) = ${lo}, hi = min(ends) = ${hi}. ${hit ? `lo <= hi, so record ${lo}–${hi}.` : 'lo > hi, so no overlap.'} ${advA ? s(a0) : s(b0)} ends first (${advA ? a0[1] : b0[1]}), so it cannot meet anything later: advance ${advA ? 'i' : 'j'}.`,
      [...views(), tvars({ lo, hi, result: list(out) })],
      q(`${s(a0)} versus ${s(b0)}: which reader advances?`, ['i (list A)', 'j (list B)'], advA ? 0 : 1, 'Advance the slot that ends first; the other one may still overlap the next slot.'));
  }
  r.frame(`One list is exhausted, so nothing more can overlap. Result: ${list(out)}.`, [...views(), tvars({ result: list(out), answer: list(out) })]);
  return r.frames;
}

export function freeTimeFrames(schedule: P[][]): Frame[] {
  const all = byStart(schedule.flat()), r = recorder(), free: P[] = [];
  let busyUntil = all[0][1];
  const arr = (i: number, tones: Record<number, CellTone>): View => ({
    kind: 'array', name: 'all shifts, pooled and sorted by start', values: all.map(s), indices: false,
    pointers: i < all.length ? [{ at: i, label: 'next', tone: 'blue' }] : [], tones,
  });
  r.frame(`Free for everyone means outside everyone's busy time. Pool every shift, sort by start, and sweep like Merge Intervals, but record the gaps. busyUntil starts at ${busyUntil}.`,
    [arr(1, { 0: 'active' }), tvars({ busyUntil, free: 'none' })]);
  const tones: Record<number, CellTone> = { 0: 'visited' };
  for (let i = 1; i < all.length; i++) {
    const sh = all[i], prev = { busyUntil, free: list(free) };
    const gap = sh[0] > busyUntil;
    if (gap) free.push([busyUntil, sh[0]]);
    const was = busyUntil;
    busyUntil = Math.max(busyUntil, sh[1]);
    tones[i] = 'visited';
    r.frame(gap
      ? `${s(sh)} starts at ${sh[0]}, after busyUntil ${was}. Nobody works from ${was} to ${sh[0]}: record that gap. busyUntil becomes ${busyUntil}.`
      : `${s(sh)} starts at ${sh[0]}, at or before busyUntil ${was}, so there is no gap (a zero-length gap is not reported). busyUntil becomes max(${was}, ${sh[1]}) = ${busyUntil}.`,
      [arr(i + 1, { ...tones, [i]: 'compared' }), tvars({ busyUntil, free: list(free) }, prev)],
      q(`busyUntil = ${was}; next shift starts at ${sh[0]}. Record a gap?`, ['Yes', 'No'], gap ? 0 : 1, gap ? `${sh[0]} > ${was}: positive length.` : `${sh[0]} is not greater than ${was}.`));
  }
  r.frame(`All shifts read. Free for everyone: ${list(free)}.`, [arr(all.length, tones), tvars({ busyUntil, answer: list(free) })]);
  return r.frames;
}

export function calendarFrames(requests: P[]): Frame[] {
  const r = recorder(), booked: [number, number][] = [], results: boolean[] = [];
  const mv = (changed?: number[]): View => ({ kind: 'map', name: 'booked: start → end (sorted by start)', entries: booked.map(b => [b[0], b[1]] as [Val, Val]), changed });
  r.frame('Requests arrive one at a time, so nothing can be sorted. Accepted bookings never overlap, so a new request can only clash with its two neighbours in start order.',
    [mv(), tvars({ results: 'none yet' })]);
  for (const [st, en] of requests) {
    const before = [...booked].reverse().find(b => b[0] <= st);
    const after = booked.find(b => b[0] >= st);
    const c1 = !!before && before[1] > st, c2 = !!after && after[0] < en;
    const ok = !c1 && !c2;
    results.push(ok);
    if (ok) { booked.push([st, en]); booked.sort((x, y) => x[0] - y[0]); }
    const why = c1 ? `The booking before (starts ${before![0]}) ends at ${before![1]}, past ${st}.`
      : c2 ? `The booking after starts at ${after![0]}, before ${en}.`
      : `Floor ${before ? `${before[0]}→${before[1]} ends at ${before[1]} <= ${st}` : 'none'}; ceiling ${after ? `starts at ${after[0]} >= ${en}` : 'none'}. No clash.`;
    r.frame(`book(${st}, ${en}) covers [${st}, ${en}). ${why} ${ok ? 'Accept and store it.' : 'Refuse.'}`,
      [mv(ok ? [booked.findIndex(b => b[0] === st)] : []), tvars({ request: `${st}–${en}`, floor: before ? s(before) : 'none', ceiling: after ? s(after) : 'none', results: results.join(', ') })],
      q(`book(${st}, ${en}): accept or refuse?`, ['Accept', 'Refuse'], ok ? 0 : 1, why));
  }
  r.frame(`Every request answered: ${results.join(', ')}. Each lookup was O(log n) in a TreeMap.`, [mv(), tvars({ answer: results.join(', ') })]);
  return r.frames;
}

export function carPoolFrames(trips: P[], capacity: number): Frame[] {
  const ev = trips.flatMap(t => [[t[1], t[0]], [t[2], -t[0]]]).sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  const r = recorder();
  let load = 0, ok = true;
  const label = (e: P) => `${e[0]}:${e[1] > 0 ? '+' : '−'}${Math.abs(e[1])}`;
  const arr = (i: number, tones: Record<number, CellTone>): View => ({
    kind: 'array', name: 'events (place sorted, dropoff before pickup)', values: ev.map(label), indices: false,
    pointers: i < ev.length ? [{ at: i, label: 'next', tone: 'blue' }] : [], tones,
  });
  r.frame(`Each trip becomes +riders at pickup and −riders at dropoff. Sort by place with dropoffs first. The shuttle has ${capacity} seats; load must never exceed that.`,
    [arr(0, {}), tvars({ load, capacity })]);
  const tones: Record<number, CellTone> = {};
  for (let i = 0; i < ev.length && ok; i++) {
    const prev = { load, capacity };
    load += ev[i][1];
    ok = load <= capacity;
    tones[i] = ok ? 'visited' : 'out';
    r.frame(ev[i][1] > 0 ? `At ${ev[i][0]}, ${ev[i][1]} riders board: load is ${load}. ${ok ? `That fits in ${capacity} seats.` : `${load} > ${capacity}: the shuttle overflows, return false.`}`
        : `At ${ev[i][0]}, ${-ev[i][1]} riders get off: load drops to ${load}.`,
      [arr(i + 1, { ...tones }), tvars({ load, capacity }, prev)],
      ev[i][1] > 0 ? q(`Load becomes ${load} with ${capacity} seats. Still fine?`, ['Yes', 'No, return false'], ok ? 0 : 1, `${load} ${ok ? '<=' : '>'} ${capacity}.`) : undefined);
  }
  r.frame(ok ? 'Every event was processed and the load never passed capacity. Return true.' : 'Return false.', [arr(ev.length, tones), tvars({ load, capacity, answer: String(ok) })]);
  return r.frames;
}

export function coveredFrames(input: P[]): Frame[] {
  const a = [...input].sort((x, y) => x[0] - y[0] || y[1] - x[1]), r = recorder();
  let remaining = 0, furthest: number | null = null;
  const arr = (i: number, tones: Record<number, CellTone>): View => ({
    kind: 'array', name: 'start ascending, then end descending', values: a.map(s), indices: false,
    pointers: i < a.length ? [{ at: i, label: 'next', tone: 'blue' }] : [], tones,
  });
  r.frame(`Sort by start; on equal starts put the LONGER interval first so it can cover the shorter one. A range is covered exactly when something earlier reaches at least as far: track furthestEnd.`,
    [arr(0, {}), tvars({ furthestEnd: 'none', remaining })]);
  const tones: Record<number, CellTone> = {};
  a.forEach((iv, i) => {
    const prev = { furthestEnd: furthest ?? 'none', remaining };
    const survives = furthest === null || iv[1] > furthest;
    const was = furthest;
    if (survives) { remaining++; furthest = iv[1]; tones[i] = 'done'; } else tones[i] = 'out';
    r.frame(survives ? `${s(iv)} ends at ${iv[1]}, past furthestEnd ${was ?? 'none'}. Nothing earlier covers it, so it stays. furthestEnd becomes ${iv[1]}.`
      : `${s(iv)} ends at ${iv[1]}, not past furthestEnd ${was}. An earlier range starts no later and reaches as far, so this one is covered.`,
      [arr(i + 1, { ...tones }), tvars({ furthestEnd: furthest!, remaining }, prev)],
      q(`furthestEnd is ${was ?? 'none'}; next is ${s(iv)}. Survives or covered?`, ['Survives', 'Covered'], survives ? 0 : 1, survives ? `${iv[1]} > ${was ?? 'nothing'}.` : `${iv[1]} <= ${was}.`));
  });
  r.frame(`Done. ${remaining} ranges remain.`, [arr(a.length, tones), tvars({ remaining, answer: remaining })]);
  return r.frames;
}

export function jobsFrames(startT: number[], endT: number[], profit: number[]): Frame[] {
  const order = startT.map((_, i) => i).sort((x, y) => endT[x] - endT[y]);
  const ends = order.map(k => endT[k]);
  const r = recorder(), best = [0];
  const jobs = order.map(k => `${startT[k]}–${endT[k]} pays ${profit[k]}`);
  const views = (k: number, shown: number): View[] => [
    { kind: 'array', name: 'jobs sorted by end', values: jobs, indices: false, pointers: k < jobs.length ? [{ at: k, label: 'job', tone: 'blue' }] : [] },
    { kind: 'array', name: 'best[k] = top pay using the first k jobs', values: best.slice(0, shown), pointers: [{ at: shown - 1, label: 'latest', tone: 'gold' }] },
  ];
  r.frame('Weighted jobs: greedy by end fails. For each job (in end order) choose the better of: skip it, or take it plus the best plan that finishes by its start. best[0] = 0.', views(0, 1));
  order.forEach((job, k) => {
    const lo = ends.slice(0, k).filter(e => e <= startT[job]).length;
    const take = best[lo] + profit[job], skip = best[k];
    best[k + 1] = Math.max(skip, take);
    const opts = [...new Set([String(skip), String(take), String(skip + take)])];
    r.frame(`Job ${startT[job]}–${endT[job]} pays ${profit[job]}. ${lo} earlier job${lo === 1 ? '' : 's'} end by ${startT[job]} (binary search), so taking it gives best[${lo}] + ${profit[job]} = ${take}. Skipping gives best[${k}] = ${skip}. best[${k + 1}] = ${best[k + 1]}.`,
      views(k, k + 2),
      q(`Skip = ${skip}, take = ${take}. What is best[${k + 1}]?`, opts, opts.indexOf(String(best[k + 1])), 'Take the larger of skipping and taking.'));
  });
  r.frame(`Every job decided. The answer is best[${jobs.length}] = ${best[jobs.length]}.`, [...views(jobs.length, jobs.length + 1), tvars({ answer: best[jobs.length] })]);
  return r.frames;
}
