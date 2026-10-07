import test from 'node:test';
import assert from 'node:assert/strict';
import { solveLab } from '../src/lib/lab.ts';
import { lab, fromInput, mergeCases, roomsCases, keepCases, type S } from '../src/lib/labs/intervals.ts';
import { figures, mergeSweep, insertPhases, attendAll, roomsSweep, keepByEnd, mixedReview } from '../src/data/intervals/traces.ts';
import { hints } from '../src/data/intervals/hints.ts';
import { practice, conceptIds } from '../src/data/practice/intervals.ts';
import { answerMatches } from '../src/lib/review.ts';

type Pair = [number, number];

// ---------- Independent oracles (brute force; no sweeps) ----------
// Closed-interval union by repeated pairwise merging.
function union(ps: Pair[]): Pair[] {
  const xs = ps.map(p => [p[0], p[1]] as Pair);
  for (let changed = true; changed;) {
    changed = false;
    search: for (let i = 0; i < xs.length; i++) for (let j = i + 1; j < xs.length; j++) {
      const [a, b] = [xs[i], xs[j]];
      if (a[0] <= b[1] && b[0] <= a[1]) { xs[i] = [Math.min(a[0], b[0]), Math.max(a[1], b[1])]; xs.splice(j, 1); changed = true; break search; }
    }
  }
  return xs.sort((x, y) => x[0] - y[0]);
}
const clash = (a: Pair, b: Pair) => a[0] < b[1] && b[0] < a[1];            // [start, end)
const peakAt = (ps: Pair[], t: number) => ps.filter(p => p[0] <= t && t < p[1]).length;
function peak(ps: Pair[]): number { let best = 0; for (let t = -2; t <= 80; t++) best = Math.max(best, peakAt(ps, t)); return best; }
function maxDisjoint(ps: Pair[]): number {
  let best = 0;
  for (let mask = 0; mask < 1 << ps.length; mask++) {
    const pick = ps.filter((_, k) => mask >> k & 1);
    if (pick.every((x, a) => pick.every((y, b) => a === b || !clash(x, y)))) best = Math.max(best, pick.length);
  }
  return best;
}
function minStab(ps: Pair[]): number {
  if (!ps.length) return 0;
  const lo = Math.min(...ps.map(p => p[0])), hi = Math.max(...ps.map(p => p[1]));
  const pts = Array.from({ length: hi - lo + 1 }, (_, k) => lo + k);
  const ok = (chosen: number[]) => ps.every(p => chosen.some(x => p[0] <= x && x <= p[1]));
  const choose = (from: number, k: number, chosen: number[]): boolean => chosen.length === k ? ok(chosen) : pts.slice(from).some((x, d) => choose(from + d + 1, k, [...chosen, x]));
  for (let k = 1; ; k++) if (choose(0, k, [])) return k;
}
let seed = 2024;
const random = (max: number) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % max; };
const randPairs = (n: number, span: number, minLen: number, maxLen: number): Pair[] =>
  Array.from({ length: n }, () => { const s = random(span); return [s, s + minLen + random(maxLen - minLen + 1)] as Pair; });
const parsePair = (text: string): Pair => text.split('–').map(Number) as Pair;

// ---------- Figures ----------
test('every timeline figure says what the lesson claims', () => {
  const bars = (lane: number, f: { lanes: { bars: { from: number; to: number }[] }[] }) => f.lanes[lane].bars.map(b => [b.from, b.to] as Pair);
  // Overlap band is max(starts)..min(ends).
  const [a] = bars(0, figures.overlap), [b] = bars(1, figures.overlap);
  assert.deepEqual([figures.overlap.bands![0].from, figures.overlap.bands![0].to], [Math.max(a[0], b[0]), Math.min(a[1], b[1])]);
  // Merge: last lane is the union of the others.
  const m = figures.merge; assert.deepEqual(bars(m.lanes.length - 1, m), union(m.lanes.slice(0, -1).flatMap((_, k) => bars(k, m))));
  // Insert: "after" lane = union(ledger + new); phase tones are right.
  const ins = figures.insert, ledger = bars(0, ins), add = bars(1, ins)[0];
  assert.deepEqual(bars(2, ins), union([...ledger, add]));
  ins.lanes[0].bars.forEach(x => assert.equal(x.tone, x.to < add[0] ? 'dim' : x.from > 10 ? 'blue' : 'gold'));
  // Meeting Rooms: clash bands are exactly the pairwise overlaps with meeting 1.
  const att = figures.attend, ms = att.lanes.map((_, k) => bars(k, att)[0]);
  assert.deepEqual(att.bands!.map(x => [x.from, x.to]), ms.slice(1).filter(x => clash(ms[0], x)).map(x => [Math.max(ms[0][0], x[0]), Math.min(ms[0][1], x[1])]));
  // Rooms sweep: the in-use lane labels equal the live count on each segment; peak 2.
  const rs = figures.roomsSweep, meetings = rs.lanes.slice(0, 3).map((_, k) => bars(k, rs)[0]);
  for (const seg of rs.lanes[3].bars) for (let t = seg.from; t < seg.to; t++) assert.equal(String(peakAt(meetings, t)), seg.label);
  assert.equal(peak(meetings), 2);
  // Heap figure: rooms are valid (no double booking) and there are as many as the peak.
  const rh = figures.roomsHeap, rooms = rh.lanes.map((_, k) => bars(k, rh));
  rooms.forEach(r => r.forEach((x, i) => r.forEach((y, j) => i < j && assert.equal(clash(x, y), false))));
  assert.equal(rooms.length, peak(rooms.flat()));
  assert.equal(peakAt(rooms.flat(), 6), 1);
  // Keep-by-end figure: green kept, red cancelled; matches brute force and start order cancels 3.
  const kb = figures.keepByEnd, all = kb.lanes.map((_, k) => bars(k, kb)[0]);
  assert.equal(kb.lanes.filter(l => l.bars[0].tone === 'red').length, all.length - maxDisjoint(all));
  { const byStart = [...all].sort((x, y) => x[0] - y[0]); let kept = 0, last = -1e9; for (const p of byStart) if (p[0] >= last) { kept++; last = p[1]; } assert.equal(all.length - kept, 3); }
  // Arrows: two arrows at 6 and 12 pop everything, and two is the minimum.
  const ar = figures.arrows, balloons = ar.lanes.map((_, k) => bars(k, ar)[0]);
  assert.ok(balloons.every(p => ar.marks!.some(mk => p[0] <= mk.at && mk.at <= p[1])));
  assert.equal(minStab(balloons), ar.marks!.length);
  // Intersections: third lane is every pairwise closed overlap.
  const it = figures.intersections, A = bars(0, it), B = bars(1, it);
  const inter = A.flatMap(x => B.map(y => [Math.max(x[0], y[0]), Math.min(x[1], y[1])] as Pair)).filter(p => p[0] <= p[1]).sort((x, y) => x[0] - y[0]);
  assert.deepEqual(bars(2, it), inter);
  // Free time: the gap lane is the complement of the union, between first start and last end.
  const ft = figures.freeTime, busy = union(ft.lanes.slice(0, 3).flatMap((_, k) => bars(k, ft)));
  assert.deepEqual(bars(3, ft), busy.slice(1).map((p, k) => [busy[k][1], p[0]] as Pair));
  // Calendar: replay requests 10–20, 15–25, 20–30.
  const accepted: Pair[] = []; const decide = (p: Pair) => { const ok = !accepted.some(x => clash(x, p)); if (ok) accepted.push(p); return ok; };
  assert.deepEqual([decide([10, 20]), decide([15, 25]), decide([20, 30])], [true, false, true]);
  assert.deepEqual(bars(0, figures.calendar), accepted); assert.deepEqual(bars(1, figures.calendar), [[15, 25]]);
  // Car pool: on-board labels match riders aboard on each stretch; peak 5.
  const trips = [[2, 1, 5], [3, 3, 7]];
  for (const seg of figures.carPool.lanes[2].bars) for (let x = seg.from; x < seg.to; x++) assert.equal(String(trips.reduce((t, [n, f, to]) => t + (f <= x && x < to ? n : 0), 0)), seg.label);
});

// ---------- Traces ----------
const allTraces = { mergeSweep, insertPhases, attendAll, roomsSweep, keepByEnd, mixedReview };
test('every trace step has a valid answer and feedback on every choice', () => {
  for (const [name, steps] of Object.entries(allTraces)) for (const [k, s] of steps.entries()) {
    assert.ok(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `${name}[${k}] answer index`);
    assert.ok(s.choices.length >= 2, `${name}[${k}] needs a real choice`);
    for (const c of s.choices) assert.ok(c.feedback.length > 20, `${name}[${k}] feedback for "${c.label}"`);
  }
  for (const [name, h] of Object.entries(hints)) { assert.equal(h.length, 3, name); h.forEach(x => assert.ok(x.length > 10)); }
});

test('trace numbers agree with independent computation', () => {
  // Merge step 1: 2–6 overlaps 1–3 and the card becomes 1–6.
  const m1 = mergeSweep[0].rows[0].cells.map(c => parsePair(c.value));
  assert.ok(m1[1][0] <= m1[0][1]); assert.deepEqual(union([m1[0], m1[1]]), [[1, 6]]);
  assert.match(mergeSweep[0].choices[mergeSweep[0].answer].label, /1–6/);
  // Merge step 2: swallowed 2–3 keeps the card at 1–10 and the whole input merges to one range.
  const m2 = mergeSweep[1].rows[0].cells.map(c => parsePair(c.value));
  assert.deepEqual(union(m2), [[1, 10]]); assert.match(mergeSweep[1].choices[mergeSweep[1].answer].label, /^10/);
  // Merge step 3: the final answer quoted in the feedback.
  assert.deepEqual(union([[1, 3], [2, 6], [8, 10], [15, 18]]), [[1, 6], [8, 10], [15, 18]]);
  // Insert: phases and the final answer.
  const ledger = insertPhases[0].rows[0].cells.map(c => parsePair(c.value)), add = parsePair(insertPhases[0].rows[1].cells[0].value);
  assert.ok(ledger[0][1] < add[0]);
  assert.deepEqual([Math.min(add[0], ledger[1][0]), Math.max(add[1], ledger[1][1])], [3, 8]);
  assert.equal(ledger[3][0], 8);
  assert.deepEqual(union([...ledger, add]), [[1, 2], [3, 10], [12, 16]]);
  assert.match(insertPhases[2].choices[0].feedback, /\[1,2\], \[3,10\], \[12,16\]/);
  // Attend: clash, sort-then-fine, back-to-back fine.
  const ok = (ps: Pair[]) => ps.every((x, i) => ps.every((y, j) => i >= j || !clash(x, y)));
  assert.equal(ok(attendAll[0].rows[0].cells.map(c => parsePair(c.value))), false);
  assert.equal(ok(attendAll[1].rows[0].cells.map(c => parsePair(c.value))), true);
  assert.equal(ok(attendAll[2].rows[0].cells.map(c => parsePair(c.value))), true);
  // Rooms: start-first ordering at 10 would read 3; the counts row; the peak; the heap.
  const meetings = roomsSweep[0].rows[0].cells.map(c => parsePair(c.value));
  const counts = (order: 'end-first' | 'start-first') => {
    const ev = meetings.flatMap(p => [[p[0], 1], [p[1], -1]]).sort((x, y) => x[0] - y[0] || (order === 'end-first' ? x[1] - y[1] : y[1] - x[1]));
    let c = 0; return ev.map(([, d]) => (c += d));
  };
  assert.deepEqual(roomsSweep[1].rows[0].cells.map(c => Number(c.value)), counts('end-first'));
  assert.equal(Math.max(...counts('start-first')), 3);
  assert.equal(Math.max(...counts('end-first')), peak(meetings));
  assert.equal(roomsSweep[1].choices[roomsSweep[1].answer].label.startsWith(String(peak(meetings))), true);
  const heapIn = roomsSweep[2].rows[0].cells.map(c => parsePair(c.value));
  const heap: number[] = []; let maxSize = 0;
  for (const p of [...heapIn].sort((x, y) => x[0] - y[0])) { heap.sort((x, y) => x - y); if (heap.length && heap[0] <= p[0]) heap.shift(); heap.push(p[1]); maxSize = Math.max(maxSize, heap.length); }
  assert.deepEqual(heap.sort((x, y) => x - y), roomsSweep[2].rows[1].cells.map(c => Number(c.value)));
  assert.equal(heap.length, maxSize); assert.equal(heap.length, peak(heapIn)); assert.equal(peakAt(heapIn, 6), 1);
  // Keep by end: counterexample numbers.
  const ce = keepByEnd[0].rows[0].cells.map(c => parsePair(c.value));
  assert.equal(ce.length - maxDisjoint(ce), 1);
  { let kept = 0, last = -1e9; for (const p of [...ce].sort((x, y) => x[0] - y[0])) if (p[0] >= last) { kept++; last = p[1]; } assert.equal(ce.length - kept, 2); }
  assert.equal(maxDisjoint(keepByEnd[2].rows[0].cells.map(c => parsePair(c.value))), 2);
  // Mixed review claims.
  { // Input-order tie: [[10,20],[0,10]] with a stable time-only sort reports 2; truth is 1.
    const ps: Pair[] = [[10, 20], [0, 10]]; const ev = ps.flatMap(p => [[p[0], 1], [p[1], -1]]).sort((x, y) => x[0] - y[0]);
    let c = 0, best = 0; for (const [, d] of ev) { c += d; best = Math.max(best, c); } assert.equal(best, 2); assert.equal(peak(ps), 1);
  }
  { // Weighted jobs: greedy by end earns 2; best is 10.
    const jobs = [[1, 4, 10], [2, 3, 1], [3, 5, 1]];
    let pay = 0, last = -1e9; for (const j of [...jobs].sort((x, y) => x[1] - y[1])) if (j[0] >= last) { pay += j[2]; last = j[1]; }
    let best = 0; for (let mask = 0; mask < 8; mask++) { const pick = jobs.filter((_, k) => mask >> k & 1); if (pick.every((x, a) => pick.every((y, b) => a === b || !clash([x[0], x[1]], [y[0], y[1]])))) best = Math.max(best, pick.reduce((t, j) => t + j[2], 0)); }
    assert.equal(pay, 2); assert.equal(best, 10);
  }
  assert.equal(minStab([[1, 2], [2, 3]]), 1);
  assert.deepEqual(union([[1, 10], [2, 3], [4, 5]]), [[1, 10]]);
});

// ---------- Lab ----------
function oracle(mode: string, input: Pair[], final: S) {
  if (mode === 'merge') assert.deepEqual(final.out, union(input));
  else if (mode === 'rooms') assert.equal(final.best, peak(input));
  else {
    assert.equal(final.status.filter(x => x === 'cancelled').length, input.length - maxDisjoint(input));
    const kept = final.a.filter((_, k) => final.status[k] === 'kept') as Pair[];
    kept.forEach((x, i) => kept.forEach((y, j) => i < j && assert.equal(clash(x, y), false)));
  }
}
test('every playground mode and case terminates correctly; wrong moves never change the board', () => {
  const cases: Record<string, Pair[][]> = { merge: mergeCases, rooms: roomsCases, keep: keepCases };
  for (const mode of Object.keys(lab.modes)) {
    assert.ok(lab.modes[mode].cases >= 3 && lab.modes[mode].cases <= 4);
    for (let v = 0; v < lab.modes[mode].cases; v++) {
      const { final, wrongMovesChangedBoard } = solveLab(lab, lab.create(mode, v));
      assert.equal(final.done, true, `${mode} case ${v} terminates`);
      assert.equal(wrongMovesChangedBoard, false, `${mode} case ${v}`);
      oracle(mode, cases[mode][v], final);
    }
  }
});
test('playground agrees with brute force on random inputs', () => {
  for (const mode of ['merge', 'rooms', 'keep'] as const) for (let t = 0; t < 150; t++) {
    const input = randPairs(random(7), 12, mode === 'merge' ? 0 : 1, 5);
    const start = { ...fromInput(mode, input), mode, done: false, moves: 0, message: '' } as S;
    const { final, wrongMovesChangedBoard } = solveLab(lab, start);
    assert.equal(final.done, true); assert.equal(wrongMovesChangedBoard, false);
    oracle(mode, input, final);
  }
});
test('the tie rule is enforced and explained with the numbers on the board', () => {
  let s = lab.create('rooms', 1); // [[0,30],[5,10],[10,20]]
  s = lab.move(s, 'checkin').state; s = lab.move(s, 'checkin').state;
  const wrong = lab.move(s, 'checkin');
  assert.equal(wrong.accepted, false); assert.match(wrong.state.message, /phantom/); assert.match(wrong.state.message, /3 rooms/);
  assert.equal(lab.move(s, 'checkout').accepted, true);
  const k = lab.create('keep', 1); // [[1,100],[2,3],[4,5]]
  assert.match(lab.move(k, 'sort-start').state.message, /keep only 1 and end order keeps 2/);
});

// ---------- Practice ----------
// Extract every bracketed JSON blob from a prompt, in order.
function blobs(text: string): unknown[] {
  const out: unknown[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '[') continue;
    let depth = 0, j = i;
    for (; j < text.length; j++) { if (text[j] === '[') depth++; else if (text[j] === ']' && --depth === 0) break; }
    out.push(JSON.parse(text.slice(i, j + 1))); i = j;
  }
  return out;
}
test('every practice answer matches an independent brute-force answer', () => {
  assert.equal(practice.storageKey, 'citadel-intervals-review-v1');
  assert.ok(conceptIds.length >= 10);
  assert.ok(Object.keys(practice.strategies).includes('other'));
  const seenPrompts = new Set<string>();
  for (const id of conceptIds) for (let variant = 0; variant <= 20; variant++) {
    const c = practice.challengeFor(id, variant);
    assert.ok(c.strategy in practice.strategies, `${id} strategy`);
    assert.doesNotMatch(c.prompt, /interval|sweep|greedy|heap|merge|two pointer/i, `${id} prompt must not name the technique`);
    const data = blobs(c.prompt);
    let expected: number | number[] | boolean;
    switch (id) {
      case 'merge': expected = union(data[0] as Pair[]).flat(); break;
      case 'insert': expected = union([...(data[0] as Pair[]), data[1] as Pair]).flat(); break;
      case 'attend': { const ps = data[0] as Pair[]; expected = ps.every((x, i) => ps.every((y, j) => i >= j || !clash(x, y))); break; }
      case 'rooms': expected = peak(data[0] as Pair[]); break;
      case 'cancel': { const ps = data[0] as Pair[]; expected = ps.length - maxDisjoint(ps); break; }
      case 'arrows': expected = minStab(data[0] as Pair[]); break;
      case 'intersect': { const [A, B] = data as Pair[][]; expected = A.flatMap(x => B.map(y => [Math.max(x[0], y[0]), Math.min(x[1], y[1])] as Pair)).filter(p => p[0] <= p[1]).sort((x, y) => x[0] - y[0]).flat(); break; }
      case 'free-time': {
        const busy = new Set<number>(); const shifts = (data[0] as Pair[][]).flat();
        shifts.forEach(([s, e]) => { for (let t = s; t < e; t++) busy.add(t); });
        const first = Math.min(...shifts.map(p => p[0])), last = Math.max(...shifts.map(p => p[1])); const gaps: number[] = [];
        for (let t = first; t < last;) { if (busy.has(t)) { t++; continue; } const s = t; while (t < last && !busy.has(t)) t++; gaps.push(s, t); }
        expected = gaps; break;
      }
      case 'calendar': { const acc: Pair[] = []; expected = (data[0] as Pair[]).map(p => { const okay = !acc.some(x => clash(x, p)); if (okay) acc.push(p); return okay ? 1 : 0; }); break; }
      case 'shuttle': {
        const cap = Number(c.prompt.match(/has (\d+) seats/)![1]); const trips = data[0] as number[][];
        let maxLoad = 0; for (let x = 0; x < 40; x++) maxLoad = Math.max(maxLoad, trips.reduce((t, [n, f, to]) => t + (f <= x && x < to ? n : 0), 0));
        expected = maxLoad <= cap; break;
      }
      case 'covered': { const ps = data[0] as Pair[]; expected = ps.filter((p, i) => !ps.some((q, j) => i !== j && q[0] <= p[0] && p[1] <= q[1])).length; break; }
      case 'paid-jobs': {
        const jobs = data[0] as number[][]; let best = 0;
        for (let mask = 0; mask < 1 << jobs.length; mask++) { const pick = jobs.filter((_, k) => mask >> k & 1); if (pick.every((x, a) => pick.every((y, b) => a === b || !clash([x[0], x[1]], [y[0], y[1]])))) best = Math.max(best, pick.reduce((t, j) => t + j[2], 0)); }
        expected = best; break;
      }
    }
    assert.deepEqual(c.answer, expected, `${id} variant ${variant}: ${c.prompt}`);
    const typed = typeof expected === 'boolean' ? (expected ? 'yes' : 'no') : JSON.stringify(expected);
    assert.equal(answerMatches(c, typed), true, `${id} variant ${variant} formatted answer`);
    assert.equal(answerMatches(c, 'not an answer'), false);
    seenPrompts.add(c.prompt);
    if (variant > 0) assert.notEqual(c.prompt, practice.challengeFor(id, variant - 1).prompt, `${id} must change between consecutive variants`);
  }
  // Covered sections exist as anchors in the lesson.
  assert.ok(seenPrompts.size > conceptIds.length * 10);
});
test('practice sections point at real lesson anchors', async () => {
  const { readFileSync } = await import('node:fs');
  const mdx = readFileSync(new URL('../src/dsa-lessons/intervals.mdx', import.meta.url), 'utf8');
  for (const id of conceptIds) assert.match(mdx, new RegExp(`<h2 id="${practice.challengeFor(id).section}">`), id);
});
