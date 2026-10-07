import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as traces from '../src/data/binary-search/traces.ts';
import { hints } from '../src/data/binary-search/hints.ts';
import { lab, fromInput, cases, type Mode } from '../src/lib/labs/binary-search.ts';
import { solveLab } from '../src/lib/lab.ts';
import { practice } from '../src/data/practice/binary-search.ts';
import { answerMatches } from '../src/lib/review.ts';

const lesson = readFileSync(new URL('../src/dsa-lessons/binary-search.mdx', import.meta.url), 'utf8');

// ---------- Independent helpers (deliberately not shared with the src files) ----------
// The one template, recording every mid it asks about.
function firstTrue(lo: number, hi: number, ok: (i: number) => boolean) {
  const mids: number[] = [];
  while (lo < hi) { const mid = lo + Math.floor((hi - lo) / 2); mids.push(mid); if (ok(mid)) hi = mid; else lo = mid + 1; }
  return { at: lo, mids };
}
const hoursSim = (piles: number[], k: number) => piles.reduce((total, p) => { let h = 0; for (let left = p; left > 0; left -= k) h++; return total + h; }, 0);
const greedyGroups = (a: number[], cap: number) => {
  const groups: number[][] = [[]]; let load = 0;
  for (const w of a) { if (load + w > cap) { groups.push([]); load = 0; } groups[groups.length - 1].push(w); load += w; }
  return groups;
};
// Every way to cut `a` into contiguous non-empty pieces; returns [pieceCount, largestSum] pairs.
function allCuts(a: number[]) {
  const out: { pieces: number; largest: number }[] = [];
  for (let mask = 0; mask < 1 << (a.length - 1); mask++) {
    let largest = 0, sum = 0, pieces = 1;
    for (let i = 0; i < a.length; i++) { sum += a[i]; if (i < a.length - 1 && (mask >> i) & 1) { largest = Math.max(largest, sum); sum = 0; pieces++; } }
    out.push({ pieces, largest: Math.max(largest, sum) });
  }
  return out;
}
const mergedMedian = (a: number[], b: number[]) => {
  const all = [...a, ...b].sort((x, y) => x - y), n = all.length;
  return n % 2 ? all[(n - 1) / 2] : (all[n / 2 - 1] + all[n / 2]) / 2;
};
const nums = (text: string) => (text.trim() === '' ? [] : text.split(',').map(v => Number(v.trim())));
const arraysIn = (text: string) => [...text.matchAll(/\[([^\]]*)\]/g)].map(m => nums(m[1]));
const num = (text: string, re: RegExp) => { const m = text.match(re); assert.ok(m, `prompt should match ${re}: ${text}`); return Number(m![1]); };

// ---------- Traces ----------
test('every trace step has a valid answer and feedback for every choice', () => {
  for (const [name, steps] of Object.entries(traces)) {
    assert.ok(steps.length >= 2, `${name} has at least two decisions`);
    for (const s of steps) {
      assert.ok(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `${name}: answer index`);
      assert.ok(s.choices.length >= 2);
      for (const c of s.choices) assert.ok(c.label.length > 0 && c.feedback.length > 20, `${name}: feedback for "${c.label}"`);
    }
  }
  // Correct answers are not always in the same slot.
  const positions = new Set(Object.values(traces).flat().map(s => s.answer));
  assert.ok(positions.size >= 3);
});

test('chapter 1 trace: mids, comparisons and the final index match the template', () => {
  const a = [-1, 0, 3, 5, 9, 12];
  const run = firstTrue(0, a.length, i => a[i] >= 9);
  assert.deepEqual(run.mids, [3, 5, 4]); assert.equal(run.at, 4);
  const [s1, s2, s3] = traces.search;
  assert.match(s1.question, /mid = 3, and nums\[3\] = 5/); assert.match(s1.choices[s1.answer].label, /lo = mid \+ 1 = 4/);
  assert.match(s2.question, /mid = 5, and nums\[5\] = 12/); assert.match(s2.choices[s2.answer].label, /^hi = mid = 5/);
  assert.match(s3.choices[s3.answer].label, /^4/);
  // The "lo = mid" wrong choice really freezes at lo = 3, hi = 4.
  let lo = 0, hi = 6, frozen = false;
  for (let i = 0; i < 20 && lo < hi; i++) { const mid = lo + Math.floor((hi - lo) / 2); const next = a[mid] >= 9 ? [lo, mid] : [mid, hi]; if (next[0] === lo && next[1] === hi) { frozen = lo === 3 && hi === 4; break; } [lo, hi] = next; }
  assert.equal(frozen, true);
  // hi = mid − 1 on [1, 5], target 5 loses the answer.
  const bug = (b: number[], t: number) => { let l = 0, h = b.length; while (l < h) { const m = l + Math.floor((h - l) / 2); if (b[m] >= t) h = m - 1; else l = m + 1; } return l < b.length && b[l] === t ? l : -1; };
  assert.equal(bug([1, 5], 5), -1); assert.equal(bug(a, 9), 4); // "lands on 9 this time"
});

test('chapter 2 trace: both boundaries', () => {
  const a = [5, 7, 7, 8, 8, 10];
  assert.equal(firstTrue(0, a.length, i => a[i] >= 8).at, 3);
  assert.equal(firstTrue(0, a.length, i => a[i] > 8).at, 5);
  assert.equal(firstTrue(0, a.length, i => a[i] >= 6).at, 1);
  assert.equal(firstTrue(0, a.length, i => a[i] > 6).at, 1);
  assert.match(traces.range[0].choices[traces.range[0].answer].label, /Index 3/);
  assert.match(traces.range[1].choices[traces.range[1].answer].label, /Index 4 = 5 − 1/);
});

test('chapter 3 trace: index mapping and the search path', () => {
  const grid = [[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], cols = 4;
  const cell = (k: number) => grid[Math.floor(k / cols)][k % cols];
  assert.equal(cell(6), 16); assert.equal(grid[Math.floor(6 / 3)][6 % 3], 23); assert.equal(cell(5), 11);
  const run = firstTrue(0, 12, k => cell(k) >= 3);
  assert.deepEqual(run.mids, [6, 3, 1, 0]); assert.equal(run.at, 1); assert.equal(cell(1), 3);
  assert.match(traces.matrix[0].choices[traces.matrix[0].answer].label, /column 6 % 4 = 2 → 16/);
});

test('chapter 4 trace: rotated minimum moves, unrotated case, and the lo-comparison bug', () => {
  const findMin = (a: number[]) => { let lo = 0, hi = a.length - 1; const seen: number[] = []; while (lo < hi) { const mid = lo + Math.floor((hi - lo) / 2); seen.push(mid); if (a[mid] > a[hi]) lo = mid + 1; else hi = mid; } return { min: a[lo], seen }; };
  assert.deepEqual(findMin([4, 5, 6, 7, 0, 1, 2]), { min: 0, seen: [3, 5, 4] });
  assert.deepEqual(findMin([1, 2, 3, 4, 5]), { min: 1, seen: [2, 1, 0] });
  const hiMinusOne = (a: number[]) => { let lo = 0, hi = a.length - 1; while (lo < hi) { const mid = lo + Math.floor((hi - lo) / 2); if (a[mid] > a[hi]) lo = mid + 1; else hi = mid - 1; } return a[lo]; };
  assert.equal(hiMinusOne([3, 1, 2]), 3); assert.equal(hiMinusOne([4, 5, 6, 7, 0, 1, 2]), 0);
  const vsLo = (a: number[]) => { let lo = 0, hi = a.length - 1; while (lo < hi) { const mid = lo + Math.floor((hi - lo) / 2); if (a[mid] >= a[lo]) lo = mid + 1; else hi = mid; } return a[lo]; };
  assert.equal(vsLo([1, 2, 3]), 3);
});

test('chapter 5 trace: one-pass rotated search path, and the one-sided bug', () => {
  const run = (a: number[], t: number, oneSided = false) => {
    let lo = 0, hi = a.length - 1; const seen: number[] = [];
    while (lo < hi) {
      const mid = lo + Math.floor((hi - lo) / 2); seen.push(mid);
      if (a[mid] < a[hi]) { if (a[mid] < t && t <= a[hi]) lo = mid + 1; else hi = mid; }
      else if (oneSided ? t <= a[mid] : a[lo] <= t && t <= a[mid]) hi = mid; else lo = mid + 1;
    }
    return { index: a[lo] === t ? lo : -1, seen };
  };
  assert.deepEqual(run([4, 5, 6, 7, 0, 1, 2], 0), { index: 4, seen: [3, 5, 4] });
  assert.equal(run([4, 5, 6, 7, 0, 1, 2], 0, true).index, -1);
});

test('chapter 6 trace and figure: Koko hours', () => {
  const piles = [3, 6, 7, 11];
  assert.equal(hoursSim(piles, 6), 6); assert.deepEqual(piles.map(p => Math.ceil(p / 6)), [1, 1, 2, 2]);
  assert.equal(Math.ceil(27 / 6), 5); assert.equal(hoursSim(piles, 3), 10); assert.equal(hoursSim(piles, 4), 8); assert.equal(hoursSim(piles, 5), 8);
  const run = firstTrue(1, 11, k => hoursSim(piles, k) <= 8);
  assert.deepEqual(run.mids, [6, 3, 5, 4]); assert.equal(run.at, 4);
  const row = Array.from({ length: 11 }, (_, i) => hoursSim(piles, i + 1));
  assert.ok(lesson.includes(`values={[${row.join(', ')}]}`), 'Koko figure hours row matches the computation');
  assert.ok(lesson.includes(`values={[${row.map(h => (h <= 8 ? "'T'" : "'F'")).join(', ')}]}`), 'Koko figure feasibility row');
  // int overflow claim: 5 × 5e8 hours wraps negative.
  assert.equal((5 * 500_000_000) | 0, -1794967296); assert.ok(lesson.includes('−1,794,967,296'));
});

test('chapter 7 trace and figure: shipping days', () => {
  const w = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  assert.deepEqual(greedyGroups(w, 15), [[1, 2, 3, 4, 5], [6, 7], [8], [9], [10]]);
  assert.deepEqual(greedyGroups(w, 15).map(g => g.reduce((s, v) => s + v, 0)), [15, 13, 8, 9, 10]);
  assert.deepEqual(greedyGroups(w, 14), [[1, 2, 3, 4], [5, 6], [7], [8], [9], [10]]);
  assert.equal(greedyGroups(w, 10).length, 7);
  const best = Math.min(...allCuts(w).filter(c => c.pieces <= 5).map(c => c.largest));
  assert.equal(best, 15);
  // lo = 1 bug: capacity 2 "works" for [1, 2, 3, 1, 1] in 4 days, true answer 3.
  assert.equal(greedyGroups([1, 2, 3, 1, 1], 2).length, 4);
  assert.equal(Math.min(...allCuts([1, 2, 3, 1, 1]).filter(c => c.pieces <= 4).map(c => c.largest)), 3);
});

test('chapter 8 trace and figure: split array', () => {
  const a = [7, 2, 5, 10, 8];
  const twoCuts = allCuts(a).filter(c => c.pieces === 2);
  const pieceSums = new Set<number>();
  for (let cut = 1; cut < a.length; cut++) { pieceSums.add(a.slice(0, cut).reduce((s, v) => s + v, 0)); pieceSums.add(a.slice(cut).reduce((s, v) => s + v, 0)); }
  assert.deepEqual([...pieceSums].sort((x, y) => x - y), [7, 8, 9, 14, 18, 23, 24, 25]);
  assert.equal(Math.min(...twoCuts.map(c => c.largest)), 18);
  assert.deepEqual(greedyGroups(a, 17), [[7, 2, 5], [10], [8]]);
  assert.deepEqual(greedyGroups(a, 18), [[7, 2, 5], [10, 8]]);
  assert.equal(greedyGroups(a, 14).length, 3);
  assert.equal(Math.ceil(32 / 2), 16);
});

test('chapter 9 trace: time map boundaries', () => {
  const times = [1, 4, 7, 10], values = ['dim', 'bright', 'off', 'bright'];
  const at8 = firstTrue(0, 4, i => times[i] > 8).at; assert.equal(at8, 3); assert.equal(values[at8 - 1], 'off');
  assert.equal(firstTrue(0, 4, i => times[i] >= 8).at, 3); assert.equal(values[3], 'bright');
  assert.equal(firstTrue(0, 4, i => times[i] > 0).at, 0);
});

test('chapter 10 trace and figure: partition search', () => {
  const a = [1, 3, 8, 9, 15], b = [7, 11, 18, 19, 21, 25], half = Math.floor((a.length + b.length + 1) / 2);
  assert.equal(half, 6);
  assert.equal(a[2], 8); assert.equal(b[half - 2 - 1], 19);
  const run = firstTrue(0, a.length, i => a[i] >= b[half - i - 1]);
  assert.deepEqual(run.mids, [2, 4, 3]); assert.equal(run.at, 4);
  const i = run.at, j = half - i;
  assert.equal(j, 2); assert.ok(a[i - 1] <= b[j] && b[j - 1] <= a[i]);
  assert.equal(Math.max(a[i - 1], b[j - 1]), 11); assert.equal(mergedMedian(a, b), 11);
  // Reveal examples.
  assert.equal(mergedMedian([1, 2], [3, 4]), 2.5); assert.equal(mergedMedian([], [3]), 3);
  const even = firstTrue(0, 2, k => [1, 2][k] >= [3, 4][2 - k - 1]); assert.equal(even.at, 2);
  // Searching the longer list: i = 5 gives j = −2.
  assert.equal(Math.floor((5 + 1 + 1) / 2) - 5, -2);
});

test('choose-the-tool scene: a non-monotone question fools the template exactly as described', () => {
  const r = [1, 6, 2, 7, 3];
  const run = firstTrue(0, r.length, i => r[i] >= 5);
  assert.deepEqual(run.mids, [2, 4]); assert.equal(run.at, 5);
  assert.equal(r.findIndex(v => v >= 5), 1);
});

test('side-quest examples in the lesson are right', () => {
  // Insert position.
  const insert = (a: number[], t: number) => a.filter(v => v < t).length;
  assert.equal(insert([1, 3, 5, 6], 7), 4); assert.equal(insert([1, 3, 5, 6], 0), 0);
  // Peak figure: first move goes right; the search ends on index 5.
  const p = [1, 2, 1, 3, 5, 6, 4];
  let lo = 0, hi = p.length - 1; const mids: number[] = [];
  while (lo < hi) { const mid = lo + Math.floor((hi - lo) / 2); mids.push(mid); if (p[mid] > p[mid + 1]) hi = mid; else lo = mid + 1; }
  assert.equal(mids[0], 3); assert.equal(lo, 5);
  // Rotated duplicates figure: both arrays look identical at mid and hi.
  for (const a of [[1, 1, 1, 1, 1, 2, 1, 1], [1, 2, 1, 1, 1, 1, 1, 1]]) { assert.equal(a[3], 1); assert.equal(a[7], 1); }
  // Magnetic reveal: stalls [1, 2, 3, 4, 7], 3 birds → 3.
  const placed = (pos: number[], gap: number) => { let count = 1, last = pos[0]; for (const x of pos) if (x - last >= gap) { count++; last = x; } return count; };
  assert.equal(placed([1, 2, 3, 4, 7], 3), 3); assert.equal(placed([1, 2, 3, 4, 7], 4), 2);
  // sqrt reveal: first mid for x = 2^31 − 1 is 2^30, and the largest mid squared stays under 2^62.
  assert.equal(0 + Math.floor((2 ** 31 - 0) / 2), 2 ** 30);
  assert.ok((2 ** 31 - 1) ** 2 < 2 ** 62);
  // Prologue: ten halvings for 1,024 candidates.
  let size = 1024, climbs = 0; while (size > 1) { size = Math.ceil(size / 2); climbs++; } assert.equal(climbs, 10);
  assert.equal(Math.ceil(Math.log2(1e9)), 30);
});

test('lesson wiring: every hint ladder, trace and practice section exists', () => {
  for (const key of [...lesson.matchAll(/hints=\{hints\.(\w+)\}/g)].map(m => m[1])) assert.ok(hints[key], `hints.${key}`);
  for (const name of [...lesson.matchAll(/steps=\{(\w+)\}/g)].map(m => m[1])) assert.ok(name in traces, `trace ${name}`);
  const ids = new Set([...lesson.matchAll(/<h2 id="([^"]+)"/g)].map(m => m[1]));
  for (const id of practice.conceptIds) assert.ok(ids.has(practice.challengeFor(id, 0).section), `section for ${id}`);
  for (const m of lesson.matchAll(/\['([a-z-]+)', '[^']*'\]/g)) assert.ok(ids.has(m[1]), `hub link #${m[1]}`);
});

// ---------- Lab ----------
function oracleFinal(mode: Mode, input: { a: number[]; target: number }): number {
  if (mode === 'boundary') { const i = input.a.findIndex(v => v >= input.target); return i === -1 ? input.a.length : i; }
  if (mode === 'rotated') return input.a.indexOf(Math.min(...input.a));
  let k = 1; while (hoursSim(input.a, k) > input.target) k++; return k;
}
function check(mode: Mode, input: { a: number[]; target: number }, label: string) {
  const start = { ...lab.create(mode, 0), ...JSON.parse(JSON.stringify(fromInput(mode, input))) };
  const result = solveLab(lab, start);
  assert.equal(result.final.done, true, `${label} terminates`);
  assert.equal(result.wrongMovesChangedBoard, false, `${label} wrong moves leave the board alone`);
  assert.equal(result.final.lo, oracleFinal(mode, input), `${label} final lo`);
  assert.equal(result.final.lo, result.final.hi);
  assert.ok(result.steps <= Math.ceil(Math.log2(Math.max(input.a.length, Math.max(1, ...input.a)) + 1)) + 1, `${label} takes O(log n) moves`);
}
test('every playground case terminates on the right answer; wrong moves never move the board', () => {
  for (const mode of Object.keys(cases) as Mode[]) {
    assert.ok(cases[mode].length >= 3 && cases[mode].length <= 4);
    cases[mode].forEach((input, v) => {
      check(mode, input, `${mode} case ${v}`);
      const created = lab.create(mode, v);
      assert.deepEqual({ a: created.a, lo: created.lo, hi: created.hi }, { a: fromInput(mode, input).a, lo: fromInput(mode, input).lo, hi: fromInput(mode, input).hi });
    });
  }
  // The board and prompt render for every state along the way.
  for (const mode of Object.keys(cases) as Mode[]) for (let v = 0; v < cases[mode].length; v++) {
    let s = lab.create(mode, v);
    while (!s.done) { assert.ok(lab.view(s).length >= 2); assert.ok(lab.describe(s).length > 10); s = lab.move(s, lab.expected(s)).state; }
    assert.ok(s.message.includes(String(s.lo)));
  }
});
test('playground agrees with independent oracles on random inputs', () => {
  let seed = 66; const rand = (n: number) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
  for (let t = 0; t < 150; t++) {
    const sorted = Array.from({ length: rand(9) }, () => rand(13) - 6).sort((x, y) => x - y);
    check('boundary', { a: sorted, target: rand(17) - 8 }, `boundary random ${t}`);
    const distinct = [...new Set(Array.from({ length: 1 + rand(8) }, () => rand(30)))].sort((x, y) => x - y);
    const r = rand(distinct.length);
    check('rotated', { a: distinct.map((_, i) => distinct[(i + r) % distinct.length]), target: 0 }, `rotated random ${t}`);
    const piles = Array.from({ length: 1 + rand(4) }, () => 1 + rand(12));
    const total = piles.reduce((s, v) => s + v, 0);
    check('answer', { a: piles, target: piles.length + rand(total - piles.length + 2) }, `answer random ${t}`);
  }
});
test('a wrong move explains itself with the numbers on the board', () => {
  const s = lab.create('boundary', 0); // [1, 3, 5, 7, 9, 11], target 7, mid = 3
  const wrong = lab.move(s, 'no');
  assert.equal(wrong.accepted, false); assert.match(wrong.state.message, /7 ≥ 7 is TRUE/);
  assert.match(lab.move(s, 'done').state.message, /Not yet/);
  const k = lab.create('answer', 0); // piles [3, 6, 7, 11], h = 8, mid = 6
  assert.match(lab.describe(k), /1 \+ 1 \+ 2 \+ 2 = 6 hours/);
  const r = lab.create('rotated', 1); // unrotated
  assert.match(lab.move(r, 'no').state.message, /might BE the minimum/);
});

// ---------- Practice ----------
test('practice set shape', () => {
  assert.equal(practice.storageKey, 'citadel-binary-search-review-v1');
  assert.ok(practice.conceptIds.length >= 10);
  assert.ok('other' in practice.strategies);
  assert.ok(practice.conceptIds.some(id => practice.challengeFor(id).strategy === 'other'), 'has a decoy concept');
  for (const id of practice.conceptIds) assert.ok(practice.challengeFor(id).strategy in practice.strategies);
});

test('generated practice answers match independent brute force for variants 0..20', () => {
  for (const id of practice.conceptIds) {
    const prompts = new Set<string>();
    for (let variant = 0; variant <= 20; variant++) {
      const c = practice.challengeFor(id, variant);
      prompts.add(c.prompt);
      assert.doesNotMatch(c.prompt, /binary|halv|bisect|search/i, `${id}: prompt must not name the technique`);
      const arrays = arraysIn(c.prompt);
      let expected: number | number[] | boolean | string;
      switch (id) {
        case 'search': case 'rotated-search': {
          const a = arrays[0], t = num(c.prompt, /index of (-?\d+)/);
          assert.equal(new Set(a).size, a.length);
          if (id === 'search') assert.deepEqual(a, [...a].sort((x, y) => x - y));
          else { const drops = a.filter((v, i) => i > 0 && a[i - 1] > v).length; assert.ok(drops <= 1 && (drops === 0 || a[a.length - 1] < a[0])); }
          expected = a.indexOf(t); break;
        }
        case 'range': { const a = arrays[0], t = num(c.prompt, /positions of (-?\d+)/); assert.deepEqual(a, [...a].sort((x, y) => x - y)); expected = [a.indexOf(t), a.lastIndexOf(t)]; break; }
        case 'matrix': { const flat = arrays.flat(); assert.deepEqual(flat, [...flat].sort((x, y) => x - y)); expected = flat.includes(num(c.prompt, /Is (-?\d+) in the grid/)); break; }
        case 'rotated-min': expected = Math.min(...arrays[0]); break;
        case 'koko': { const piles = arrays[0], h = num(c.prompt, /within (\d+) hours/); let k = 1; while (hoursSim(piles, k) > h) k++; expected = k; break; }
        case 'ship': { const w = arrays[0], d = num(c.prompt, /within (\d+) days/); expected = Math.min(...allCuts(w).filter(x => x.pieces <= d).map(x => x.largest)); break; }
        case 'split': { const a = arrays[0], k = num(c.prompt, /exactly (\d+) non-empty/); expected = Math.min(...allCuts(a).filter(x => x.pieces === k).map(x => x.largest)); break; }
        case 'timemap': {
          const pairs = [...c.prompt.matchAll(/\((\d+), ([a-z]+)\)/g)].map(m => ({ t: Number(m[1]), v: m[2] }));
          const q = num(c.prompt, /lookup at time (\d+)/);
          const ok = pairs.filter(p => p.t <= q); expected = ok.length ? ok[ok.length - 1].v : 'none'; break;
        }
        case 'median': { expected = mergedMedian(arrays[0], arrays[1]); assert.ok(Number.isInteger(expected)); break; }
        case 'insert': { const a = arrays[0], t = num(c.prompt, /would (-?\d+) go/); let i = 0; while (i < a.length && a[i] < t) i++; expected = i; break; }
        case 'peak': {
          const a = arrays[0];
          for (let i = 1; i < a.length; i++) assert.notEqual(a[i], a[i - 1]);
          const peaks = a.map((v, i) => i).filter(i => (i === 0 || a[i] > a[i - 1]) && (i === a.length - 1 || a[i] > a[i + 1]));
          assert.equal(peaks.length, 1); expected = peaks[0]; break;
        }
        case 'sqrt': { const x = num(c.prompt, /at most (\d+)\./); let k = Math.floor(Math.sqrt(x)); while (k * k > x) k--; while ((k + 1) * (k + 1) <= x) k++; expected = k; break; }
        case 'rotated-dups': expected = arrays[0].includes(num(c.prompt, /Is (-?\d+) present/)); break;
        case 'magnetic': {
          const pos = [...arrays[0]].sort((x, y) => x - y), m = num(c.prompt, /Place (\d+) birds/);
          let best = -1;
          for (let mask = 0; mask < 1 << pos.length; mask++) {
            const chosen = pos.filter((_, i) => (mask >> i) & 1); if (chosen.length !== m) continue;
            best = Math.max(best, Math.min(...chosen.slice(1).map((v, i) => v - chosen[i])));
          }
          expected = best; break;
        }
        case 'kth-matrix': {
          const g = arrays; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { if (i) assert.ok(g[i][j] >= g[i - 1][j]); if (j) assert.ok(g[i][j] >= g[i][j - 1]); }
          const k = num(c.prompt, /the (\d+)(?:st|nd|rd|th) smallest/); expected = g.flat().sort((x, y) => x - y)[k - 1]; break;
        }
        case 'unsorted': {
          const a = arrays[0], t = num(c.prompt, /add up to (-?\d+)/); const found: number[][] = [];
          for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) if (a[i] + a[j] === t) found.push([i, j]);
          assert.equal(found.length, 1); expected = found[0]; break;
        }
        default: throw new Error(`untested concept ${id}`);
      }
      assert.deepEqual(c.answer, expected, `${id} variant ${variant}: ${c.prompt}`);
      const typed = typeof expected === 'boolean' ? (expected ? 'yes' : 'no') : typeof expected === 'string' ? expected : JSON.stringify(expected);
      assert.equal(answerMatches(c, typed), true, `${id} variant ${variant} accepts ${typed}`);
      assert.equal(answerMatches(c, 'not an answer'), false);
    }
    assert.ok(prompts.size >= 10, `${id}: inputs vary with the variant (${prompts.size} distinct)`);
  }
});
