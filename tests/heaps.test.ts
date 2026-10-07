import test from 'node:test';
import assert from 'node:assert/strict';
import { solveLab } from '../src/lib/lab.ts';
import { answerMatches } from '../src/lib/review.ts';
import { lab, fromInput, guardCases, siftCases, medianCases, type S } from '../src/lib/labs/heaps.ts';
import * as traces from '../src/data/heaps/traces.ts';
import { hints } from '../src/data/heaps/hints.ts';
import { practice, conceptIds } from '../src/data/practice/heaps.ts';

// ---------- Independent helpers (deliberately not shared with the code under test) ----------
const sortAsc = (a: number[]) => [...a].sort((x, y) => x - y);
// Min-heap on a plain array, written separately from src/lib/labs/heaps.ts.
function hPush(h: number[], x: number, less: (a: number, b: number) => boolean = (a, b) => a < b): number {
  h.push(x);
  let i = h.length - 1, swaps = 0;
  while (i > 0) { const p = Math.floor((i - 1) / 2); if (!less(h[i], h[p])) break; const t = h[i]; h[i] = h[p]; h[p] = t; i = p; swaps++; }
  return swaps;
}
function hPop(h: number[], less: (a: number, b: number) => boolean = (a, b) => a < b): number {
  const top = h[0], last = h.pop()!;
  if (!h.length) return top;
  h[0] = last;
  let i = 0;
  while (true) {
    const l = 2 * i + 1, r = l + 1;
    let m = i;
    if (l < h.length && less(h[l], h[m])) m = l;
    if (r < h.length && less(h[r], h[m])) m = r;
    if (m === i) return top;
    const t = h[i]; h[i] = h[m]; h[m] = t; i = m;
  }
}
const isMinHeap = (h: number[]) => h.every((v, i) => i === 0 || h[Math.floor((i - 1) / 2)] <= v);
const median = (a: number[]) => { const s = sortAsc(a), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const values = (stepIndex: number, rows: { cells: { value: string }[] }[], r = 0) => rows[r].cells.map(c => Number(c.value));

// Two-heaps median dance, written independently; returns the state after each add.
function dance(stream: number[]) {
  const low: number[] = [], high: number[] = [];
  const greater = (a: number, b: number) => a > b;
  const states: { low: number[]; high: number[]; median: number }[] = [];
  for (const x of stream) {
    hPush(low, x, greater);
    hPush(high, hPop(low, greater));
    if (high.length > low.length) hPush(low, hPop(high), greater);
    states.push({ low: [...low], high: [...high], median: low.length > high.length ? low[0] : (low[0] + high[0]) / 2 });
  }
  return states;
}

// Lazy sliding-window median (index entries, live counts), optionally with the physical-size bug.
function lazyWindow(nums: number[], k: number, physical = false) {
  const before = (a: number, b: number) => nums[a] !== nums[b] ? nums[a] < nums[b] : a < b;
  const after = (a: number, b: number) => before(b, a);
  const low: number[] = [], high: number[] = [];
  let lowLive = 0, highLive = 0;
  const out: number[] = [];
  const prune = (h: number[], less: (a: number, b: number) => boolean, start: number) => { while (h.length && h[0] < start) hPop(h, less); };
  const snapshots: { low: number[]; high: number[] }[] = [];
  for (let i = 0; i < nums.length; i++) {
    if (!low.length || before(i, low[0])) { hPush(low, i, after); lowLive++; } else { hPush(high, i, before); highLive++; }
    if (i - k >= 0) { if (!after(i - k, low[0])) lowLive--; else highLive--; }
    const start = i - k + 1;
    prune(low, after, start); prune(high, before, start);
    const L = physical ? low.length : lowLive, H = physical ? high.length : highLive;
    if (L > H + 1) { hPush(high, hPop(low, after), before); lowLive--; highLive++; prune(low, after, start); }
    else if (H > L) { hPush(low, hPop(high, before), after); highLive--; lowLive++; prune(high, before, start); }
    snapshots.push({ low: [...low], high: [...high] });
    if (start >= 0) out.push(k % 2 ? nums[low[0]] : (nums[low[0]] + nums[high[0]]) / 2);
  }
  return { out, snapshots };
}

// Task scheduler: exhaustive search (run any ready task, or idle while something rests).
function bruteSchedule(counts: number[], n: number): number {
  const memo = new Map<string, number>();
  const go = (c: number[], w: number[]): number => {
    if (c.every(x => x === 0)) return 0;
    const key = c.join() + '|' + w.join();
    if (memo.has(key)) return memo.get(key)!;
    let best = Infinity;
    for (let run = -1; run < c.length; run++) {
      if (run === -1 && !w.some(x => x > 0)) continue;
      if (run >= 0 && (c[run] === 0 || w[run] > 0)) continue;
      const c2 = [...c], w2 = w.map(x => Math.max(0, x - 1));
      if (run >= 0) { c2[run]--; w2[run] = n; }
      best = Math.min(best, 1 + go(c2, w2));
    }
    memo.set(key, best);
    return best;
  };
  return go(counts, counts.map(() => 0));
}
function simulateScheduler(order: 'most' | 'fewest', counts: number[], n: number) {
  // Greedy by remaining count, ties to the lower letter, with an explicit timeline.
  const left = [...counts], readyAt = counts.map(() => 1), timeline: string[] = [];
  for (let t = 1; left.some(x => x > 0); t++) {
    let pick = -1;
    for (let i = 0; i < left.length; i++) if (left[i] > 0 && readyAt[i] <= t && (pick === -1 || (order === 'most' ? left[i] > left[pick] : left[i] < left[pick]))) pick = i;
    if (pick === -1) { timeline.push('_'); continue; }
    timeline.push('ABCDEFG'[pick]); left[pick]--; readyAt[pick] = t + n + 1;
  }
  return timeline;
}

// ---------- Traces ----------
const allTraces = Object.entries(traces) as [string, { question: string; rows: { name: string; cells: { value: string; label?: string }[] }[]; choices: { label: string; feedback: string }[]; answer: number }[]][];

test('every trace step has a valid answer and feedback for every choice', () => {
  assert.ok(allTraces.length >= 9);
  for (const [name, steps] of allTraces) {
    assert.ok(steps.length >= 2, `${name} has at least two decisions`);
    for (const s of steps) {
      assert.ok(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `${name}: answer index valid`);
      assert.ok(s.choices.length >= 2);
      for (const c of s.choices) assert.ok(c.label.length > 0 && c.feedback.length > 20, `${name}: feedback explains "${c.label}"`);
    }
  }
});

test('pyramid trace: index math, the climb of 0, and the sink of 7', () => {
  const [kids, climb, sink] = traces.pyramid;
  const a = values(0, kids.rows);
  assert.deepEqual(a, [1, 3, 2, 7, 4, 5, 8]);
  assert.ok(isMinHeap(a));
  assert.deepEqual([a[2 * 1 + 1], a[2 * 1 + 2]], [7, 4]);
  assert.match(kids.choices[kids.answer].label, /3 and 4 \(values 7 and 4\)/);
  const h = [1, 3, 2, 7, 4, 5, 8];
  const swaps = hPush(h, 0);
  assert.deepEqual(values(0, climb.rows), [1, 3, 2, 7, 4, 5, 8, 0]);
  assert.equal((7 - 1) >> 1, 3);
  assert.deepEqual(h, [0, 1, 2, 3, 4, 5, 8, 7]);
  assert.equal(swaps, 3);
  assert.match(climb.choices[climb.answer].feedback, /\[0, 1, 2, 3, 4, 5, 8, 7\]. Three swaps/);
  const p = [1, 2, 3, 4, 5, 6, 7];
  assert.equal(hPop(p), 1);
  assert.deepEqual(values(0, sink.rows), [7, 2, 3, 4, 5, 6]);
  assert.deepEqual(p, [2, 4, 3, 7, 5, 6]);
  assert.match(sink.choices[sink.answer].feedback, /\[2, 4, 3, 7, 5, 6\]/);
});

test('door-guard trace follows a real size-k min-heap', () => {
  const stream = [3, 2, 1, 5, 6, 4], k = 2, inside: number[] = [], states: number[][] = [];
  for (const x of stream) { hPush(inside, x); if (inside.length > k) hPop(inside); states.push(sortAsc(inside)); }
  assert.deepEqual(states[1], [2, 3]);            // before 1 arrives
  assert.deepEqual(states[2], [2, 3]);            // 1 turned away
  assert.deepEqual(states[3], [3, 5]);            // 5 evicts the guard 2
  assert.deepEqual(states[5], [5, 6]);
  assert.equal(inside[0], sortAsc(stream).reverse()[k - 1]);
  assert.deepEqual(values(0, traces.kthLargest[2].rows), [5, 6]);
  assert.match(traces.kthLargest[2].choices[traces.kthLargest[2].answer].label, /^5/);
});

test('top-k frequent trace: counts and the by-value mistake', () => {
  const nums = [1, 1, 1, 2, 2, 3], counts = new Map<number, number>();
  nums.forEach(v => counts.set(v, (counts.get(v) || 0) + 1));
  assert.deepEqual(values(0, traces.topK[0].rows, 1), [3, 2, 1]);
  assert.deepEqual([1, 2, 3].map(v => counts.get(v)), [3, 2, 1]);
  const byValue: number[] = [];
  for (const v of counts.keys()) { hPush(byValue, v); if (byValue.length > 2) hPop(byValue); }
  assert.deepEqual(sortAsc(byValue), [2, 3]);
});

test('k-closest trace: squared distances and the flipped guard', () => {
  const pts = traces.closest[0].rows[0].cells.map(c => c.value.replace(/[()]/g, '').replace('−', '-').split(', ').map(Number));
  const d = pts.map(([x, y]) => x * x + y * y);
  assert.deepEqual(d, [18, 26, 20]);
  assert.deepEqual(values(0, traces.closest[0].rows, 1), d);
  const gate: number[] = [];
  const farther = (a: number, b: number) => a > b;
  for (const x of d) { hPush(gate, x, farther); if (gate.length > 2) hPop(gate, farther); }
  assert.deepEqual(sortAsc(gate), [18, 20]);
  const before: number[] = []; hPush(before, 18, farther); hPush(before, 26, farther);
  assert.deepEqual(values(0, traces.closest[1].rows), before);
});

test('median trace states come from the real dance', () => {
  const states = dance([5, 2, 8]);
  assert.deepEqual(states[1], { low: [2], high: [5], median: 3.5 });
  assert.deepEqual(states[2], { low: [5, 2], high: [8], median: 5 });
  assert.match(traces.median[0].choices[0].feedback, /3\.5/);
  assert.match(traces.median[1].choices[1].feedback, /median is Low’s top: 5/);
  const [low, high] = [values(0, traces.median[2].rows, 0), values(0, traces.median[2].rows, 1)];
  assert.equal((low[0] + high[0]) / 2, 5.5);
  assert.equal(median([...low, ...high]), 5.5);
  assert.match(traces.median[2].choices[traces.median[2].answer].label, /^5\.5$/);
  assert.equal((4 + 1 + 7 + 9) / 4, 5.25);
});

test('sliding-window trace: live counts, the buried dead 3, and the physical-size bug', () => {
  const nums = [3, 5, 6, 1];
  const good = lazyWindow(nums, 3), bad = lazyWindow(nums, 3, true);
  assert.deepEqual(good.out, [5, 5]);
  assert.deepEqual(bad.out, [5, 1]);
  assert.deepEqual(good.snapshots[2].low.map(i => nums[i]), [5, 3]);
  assert.deepEqual(good.snapshots[2].high.map(i => nums[i]), [6]);
  assert.deepEqual(good.snapshots[3].low.map(i => nums[i]), [5, 3, 1]);   // the 3 is dead but buried
  assert.deepEqual(traces.windowMedian[1].rows[0].cells.map(c => c.value), ['5', '3 ✗', '1']);
  assert.equal(median([5, 6, 1]), 5);
  assert.equal((5 + 6 + 1) / 3, 4);
  for (let t = 0; t < 300; t++) {
    const a = Array.from({ length: 1 + (t % 9) }, (_, i) => (i * 7 + t * 3) % 5 - 2);
    const k = 1 + (t % a.length);
    const expect = a.slice(0, a.length - k + 1).map((_, s) => median(a.slice(s, s + k)));
    assert.deepEqual(lazyWindow(a, k).out, expect);
  }
});

test('merge-k trace: one head per list', () => {
  const heads: number[] = [1, 1, 2];
  hPop(heads); hPush(heads, 4);
  assert.deepEqual(sortAsc(heads), [1, 2, 4]);
});

test('scheduler trace: timeline, idle unit, formula, and the fewest-first counterexample', () => {
  assert.equal(simulateScheduler('most', [3, 3], 2).join(''), 'AB_AB_AB');
  assert.equal(bruteSchedule([3, 3], 2), 8);
  assert.equal(Math.max(6, (3 - 1) * (2 + 1) + 2), 8);
  assert.equal(simulateScheduler('most', [3, 1], 2).length, 7);
  assert.equal(simulateScheduler('fewest', [3, 1], 2).length, 8);
  assert.equal(bruteSchedule([3, 1], 2), 7);
});

test('mixed-recall facts', () => {
  const pq: number[] = [];
  [3, 1, 2].forEach(v => hPush(pq, v));
  assert.deepEqual(pq, [1, 3, 2]);
  assert.ok(((2_000_000_000 - -2_000_000_000) | 0) < 0, 'int subtraction wraps');
  const m = [[1, 5], [2, 6]], k = 2, n = 2;
  assert.equal(sortAsc(m.flat())[k - 1], 2);
  assert.equal(m[Math.floor((k - 1) / n)][(k - 1) % n], 5);
});

test('every HintLadder key has three non-empty hints', () => {
  for (const key of ['minHeap', 'kthLargest', 'topK', 'kClosest', 'median', 'windowMedian', 'mergeK', 'scheduler', 'streamKth', 'stones', 'reorganize', 'ipo', 'smallestRange', 'matrixKth', 'quickselect']) {
    assert.ok(hints[key], key);
    assert.equal(hints[key].length, 3);
    for (const h of hints[key]) assert.ok(h.length > 10);
  }
});

// ---------- Lab ----------
function checkFinal(start: S, final: S) {
  assert.equal(final.done, true, 'lab terminates');
  if (start.mode === 'guard') {
    assert.deepEqual(sortAsc(final.heap), sortAsc(start.stream).slice(start.stream.length - start.k));
    assert.ok(isMinHeap(final.heap));
    assert.equal(final.idx, start.stream.length);
  } else if (start.mode === 'sift') {
    assert.ok(isMinHeap(final.arr), `sift result is a heap: ${final.arr}`);
    assert.deepEqual(sortAsc(final.arr), sortAsc(start.arr));
    // Sink the root with an independent loop; following the expected moves must give exactly this.
    const direct = [...start.arr];
    for (let i = 0; ;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < direct.length && direct[l] < direct[m]) m = l; if (r < direct.length && direct[r] < direct[m]) m = r; if (m === i) break; [direct[i], direct[m]] = [direct[m], direct[i]]; i = m; }
    assert.deepEqual(final.arr, direct);
  } else {
    assert.deepEqual(final.medians, start.stream.map((_, i) => median(start.stream.slice(0, i + 1))));
  }
}

test('every playground case terminates with the oracle’s answer; wrong moves never change the board', () => {
  for (const mode of Object.keys(lab.modes)) {
    for (let v = 0; v < lab.modes[mode].cases; v++) {
      const start = lab.create(mode, v);
      const { final, wrongMovesChangedBoard } = solveLab(lab, start);
      assert.equal(wrongMovesChangedBoard, false, `${mode} case ${v}`);
      checkFinal(start, final);
    }
  }
  assert.equal(lab.modes.guard.cases, guardCases.length);
  assert.equal(lab.modes.sift.cases, siftCases.length);
  assert.equal(lab.modes.median.cases, medianCases.length);
});

test('the sift lab reproduces the lesson’s pop: [7, 2, 3, 4, 5, 6] sinks to [2, 4, 3, 7, 5, 6]', () => {
  const { final } = solveLab(lab, lab.create('sift', 0));
  assert.deepEqual(final.arr, [2, 4, 3, 7, 5, 6]);
});

test('ties are accepted both ways: equal children, and an arrival equal to the guard', () => {
  const tie = lab.create('sift', 2);
  assert.deepEqual(tie.arr.slice(0, 3), [6, 3, 3]);
  assert.equal(lab.move(tie, 'left').accepted, true);
  assert.equal(lab.move(tie, 'right').accepted, true);
  assert.ok(isMinHeap(solveLab(lab, lab.move(tie, 'right').state).final.arr));
  let g = fromInput('guard', { stream: [4, 5, 4], k: 2 });
  g = lab.move(g, 'admit').state; g = lab.move(g, 'admit').state;
  assert.equal(lab.move(g, 'reject').accepted, true);
  assert.equal(lab.move(g, 'replace').accepted, true);
  assert.equal(lab.move(g, 'admit').accepted, false);
});

test('wrong moves explain themselves with the numbers on the board', () => {
  let g = lab.create('guard', 0);
  g = lab.move(g, 'admit').state; g = lab.move(g, 'admit').state;   // inside {2, 3}, next is 1
  assert.match(lab.move(g, 'admit').state.message, /k = 2/);
  assert.match(lab.move(g, 'replace').state.message, /1 is not bigger than the guard 2/);
  const s = lab.create('sift', 0);
  assert.match(lab.move(s, 'right').state.message, /sibling 2/);
  assert.match(lab.move(s, 'stop').state.message, /bigger than its child 2/);
  let m = lab.create('median', 1);   // [1, 2, 3, 4]
  m = lab.move(m, 'offer').state; m = lab.move(m, 'push').state;
  assert.equal(lab.expected(m), 'rebalance');
  assert.match(lab.move(m, 'read').state.message, /High has 1, Low has 0/);
});

test('random boards in every mode agree with brute force', () => {
  let seed = 88;
  const rand = (max: number) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return (seed >>> 8) % max; };
  for (let t = 0; t < 200; t++) {
    const stream = Array.from({ length: 1 + rand(9) }, () => rand(9) - 4);
    const k = 1 + rand(stream.length);
    const guard = fromInput('guard', { stream, k });
    const r1 = solveLab(lab, guard); assert.equal(r1.wrongMovesChangedBoard, false); checkFinal(guard, r1.final);
    const med = fromInput('median', { stream: stream.slice(0, rand(stream.length + 1)) });
    const r2 = solveLab(lab, med); assert.equal(r2.wrongMovesChangedBoard, false); checkFinal(med, r2.final);
    // A heap whose root was replaced by an arbitrary value.
    const h: number[] = []; Array.from({ length: 1 + rand(9) }, () => rand(7)).forEach(v => hPush(h, v));
    h[0] = rand(9);
    const sift = fromInput('sift', { arr: h });
    const r3 = solveLab(lab, sift); assert.equal(r3.wrongMovesChangedBoard, false); checkFinal(sift, r3.final);
  }
});

// ---------- Practice ----------
const arrays = (text: string) => [...text.matchAll(/\[([^\]]*)\]/g)].map(m => m[1].trim() === '' ? [] : m[1].split(',').map(Number));
const num = (text: string, re: RegExp) => Number(text.match(re)![1]);

function independentAnswer(id: string, prompt: string): number | number[] | boolean {
  const a = arrays(prompt);
  switch (id) {
    case 'sink': { const h = [...a[0]]; assert.ok(isMinHeap(h)); assert.equal(new Set(h).size, h.length, 'distinct values: one valid answer'); hPop(h); return h; }
    case 'kth': { const k = num(prompt, /at most (\d+) numbers/); return sortAsc(a[0]).reverse()[k - 1]; }
    case 'frequent': {
      const c = new Map<number, number>(); a[0].forEach(v => c.set(v, (c.get(v) || 0) + 1));
      const byCount = [...c.entries()].sort((x, y) => y[1] - x[1]);
      assert.ok(byCount[1][1] > (byCount[2]?.[1] ?? -1), 'unique top 2');
      return sortAsc([byCount[0][0], byCount[1][0]]);
    }
    case 'closest': {
      const pts = [...prompt.split('Which')[0].matchAll(/\((-?\d+), (-?\d+)\)/g)].map(m => [Number(m[1]), Number(m[2])]);
      const k = num(prompt, /Which (\d+) are nearest/);
      const order = pts.map((p, i) => ({ i, d: p[0] ** 2 + p[1] ** 2 })).sort((x, y) => x.d - y.d);
      assert.ok(order[k - 1].d < order[k].d, 'unique closest set');
      return sortAsc(order.slice(0, k).map(o => o.i));
    }
    case 'median': return [1, 3, 5, 7].map(n => median(a[0].slice(0, n)));
    case 'window': return [0, 1, 2, 3].map(s => median(a[0].slice(s, s + 3)));
    case 'merge': return sortAsc(a.flat());
    case 'schedule': {
      const tasks = prompt.match(/“([A-Z]+)”/)![1], n = num(prompt, /at least (\d+) units apart/) - 1;
      const counts = ['A', 'B', 'C'].map(ch => [...tasks].filter(x => x === ch).length).filter(c => c > 0);
      return bruteSchedule(counts, n);
    }
    case 'stream-kth': {
      const k = num(prompt, /k = (\d+)/), [start, adds] = a;
      return adds.map((_, i) => sortAsc([...start, ...adds.slice(0, i + 1)]).reverse()[k - 1]);
    }
    case 'stones': {
      const pile = [...a[0]];
      while (pile.length > 1) { pile.sort((x, y) => y - x); const [y, x] = pile.splice(0, 2); if (y !== x) pile.push(y - x); }
      return pile[0] ?? 0;
    }
    case 'reorganize': {
      const text = prompt.match(/“([a-z]+)”/)![1];
      const counts = new Map<string, number>(); for (const ch of text) counts.set(ch, (counts.get(ch) || 0) + 1);
      const exists = (prev: string, left: number): boolean => left === 0 || [...counts.keys()].some(ch => {
        if (ch === prev || counts.get(ch)! === 0) return false;
        counts.set(ch, counts.get(ch)! - 1); const ok = exists(ch, left - 1); counts.set(ch, counts.get(ch)! + 1); return ok;
      });
      return exists('', text.length);
    }
    case 'capital': {
      const [profits, capital] = a, w = num(prompt, /start with (\d+) coins/), k = num(prompt, /at most (\d+) projects/);
      const best = (w: number, k: number, used: boolean[]): number => {
        let b = w;
        if (k === 0) return b;
        profits.forEach((p, i) => { if (!used[i] && capital[i] <= w) { used[i] = true; b = Math.max(b, best(w + p, k - 1, used)); used[i] = false; } });
        return b;
      };
      return best(w, k, profits.map(() => false));
    }
    case 'range': {
      const vals = sortAsc([...new Set(a.flat())]);
      let best: number[] | null = null;
      for (const lo of vals) for (const hi of vals) {
        if (hi < lo || !a.every(l => l.some(v => lo <= v && v <= hi))) continue;
        if (!best || hi - lo < best[1] - best[0] || (hi - lo === best[1] - best[0] && lo < best[0])) best = [lo, hi];
      }
      return best!;
    }
    case 'matrix': {
      const k = num(prompt, /What is the (\d+)(?:st|nd|rd|th) smallest/);
      a.forEach((row, i) => row.forEach((v, j) => { if (j) assert.ok(row[j - 1] <= v); if (i) assert.ok(a[i - 1][j] <= v); }));
      return sortAsc(a.flat())[k - 1];
    }
    case 'sorted-decoy': {
      const k = num(prompt, /its (\d+)(?:st|nd|rd|th) largest/);
      assert.deepEqual(a[0], sortAsc(a[0]));
      return sortAsc(a[0]).reverse()[k - 1];
    }
  }
  throw new Error('unknown concept ' + id);
}

test('practice answers match independent brute-force oracles on 21 variants of every concept', () => {
  assert.equal(practice.storageKey, 'citadel-heaps-review-v1');
  assert.ok(conceptIds.length >= 10);
  assert.ok(Object.keys(practice.strategies).includes('other'));
  const sections = new Set<string>();
  for (const id of conceptIds) {
    for (let variant = 0; variant <= 20; variant++) {
      const c = practice.challengeFor(id, variant);
      sections.add(c.section);
      assert.ok(c.strategy in practice.strategies, `${id}: strategy key`);
      assert.doesNotMatch(c.prompt, /heap|priority|PriorityQueue/i, `${id}: prompt must not name the tool`);
      const expected = independentAnswer(id, c.prompt);
      assert.deepEqual(c.answer, expected, `${id} variant ${variant}: ${c.prompt}`);
      const typed = typeof expected === 'boolean' ? (expected ? 'yes' : 'no') : Array.isArray(expected) ? expected.join(', ') : String(expected);
      assert.equal(answerMatches(c, typed), true, `${id} accepts ${typed}`);
      assert.equal(answerMatches(c, 'not an answer'), false);
      assert.notEqual(practice.challengeFor(id, variant + 1).prompt, c.prompt, `${id}: the next review changes the input`);
    }
  }
  for (const s of ['build-the-pyramid', 'the-door-guard', 'top-k-frequent', 'k-closest', 'running-median', 'window-median', 'merge-k', 'task-scheduler', 'kth-in-a-stream', 'last-stone', 'reorganize-string', 'ipo', 'smallest-range', 'sorted-matrix', 'choose-the-tool']) assert.ok(sections.has(s), `practice covers ${s}`);
});
