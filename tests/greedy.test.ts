import test from 'node:test';
import assert from 'node:assert/strict';
import { solveLab } from '../src/lib/lab.ts';
import { answerMatches } from '../src/lib/review.ts';
import { lab, fromInput, kadaneCases, levelCases, gasCases, type GreedyState } from '../src/lib/labs/greedy.ts';
import { kadane, product, gas, jump, jumpII, partition, straights, mixedReview } from '../src/data/greedy/traces.ts';
import { hints } from '../src/data/greedy/hints.ts';
import { practice, conceptIds } from '../src/data/practice/greedy.ts';

// ---------- independent oracles (deliberately naive; none uses the lesson's greedy rule) ----------
const sumOf = (a: number[], l: number, r: number) => a.slice(l, r + 1).reduce((s, x) => s + x, 0);
const prodOf = (a: number[], l: number, r: number) => a.slice(l, r + 1).reduce((p, x) => p * x, 1) + 0;
function bestOf(a: number[], f: (l: number, r: number) => number) {
  const all: number[] = [];
  for (let l = 0; l < a.length; l++) for (let r = l; r < a.length; r++) all.push(f(l, r));
  return Math.max(...all);
}
const maxSub = (a: number[]) => bestOf(a, (l, r) => sumOf(a, l, r));
const maxProd = (a: number[]) => bestOf(a, (l, r) => prodOf(a, l, r));
// best total of a stretch ending exactly at i (for the run rows in figures and traces)
const runAt = (a: number[], i: number) => Math.max(...Array.from({ length: i + 1 }, (_, l) => sumOf(a, l, i)));
const hiAt = (a: number[], i: number) => Math.max(...Array.from({ length: i + 1 }, (_, l) => prodOf(a, l, i)));
const loAt = (a: number[], i: number) => Math.min(...Array.from({ length: i + 1 }, (_, l) => prodOf(a, l, i)));
function validStarts(g: number[], c: number[]) {
  const out: number[] = [];
  for (let s = 0; s < g.length; s++) {
    let tank = 0, ok = true;
    for (let k = 0; k < g.length; k++) { const i = (s + k) % g.length; tank += g[i] - c[i]; if (tank < 0) { ok = false; break; } }
    if (ok) out.push(s);
  }
  return out;
}
function minJumps(a: number[]) {                    // BFS over the jump graph; −1 if unreachable
  const dist = new Map<number, number>([[0, 0]]);
  const queue = [0];
  for (let h = 0; h < queue.length; h++) {
    const i = queue[h];
    for (let j = i + 1; j <= i + a[i] && j < a.length; j++) if (!dist.has(j)) { dist.set(j, dist.get(i)! + 1); queue.push(j); }
  }
  return dist.get(a.length - 1) ?? -1;
}
function partitions(s: string, from = 0): string[][] {    // every valid split (no letter in two pieces)
  if (from === s.length) return [[]];
  const out: string[][] = [];
  for (let e = from; e < s.length; e++) {
    const piece = s.slice(from, e + 1);
    if ([...piece].some(ch => s.slice(0, from).includes(ch) || s.slice(e + 1).includes(ch))) continue;
    for (const rest of partitions(s, e + 1)) out.push([piece, ...rest]);
  }
  return out;
}
function bestPartition(s: string) {
  const all = partitions(s);
  const most = Math.max(...all.map(p => p.length));
  const winners = all.filter(p => p.length === most);
  assert.equal(winners.length, 1, `unique best split of ${s}`);
  return winners[0].map(p => p.length);
}
function groupable(cards: number[], w: number): boolean {   // the FIRST card listed joins some run that contains it
  if (!cards.length) return true;
  const c = cards[0];
  for (let lo = c - w + 1; lo <= c; lo++) {
    const left = [...cards]; let ok = true;
    for (let x = lo; x < lo + w && ok; x++) { const k = left.indexOf(x); if (k < 0) ok = false; else left.splice(k, 1); }
    if (ok && groupable(left, w)) return true;
  }
  return false;
}
function stockDP(p: number[]) { let cash = 0, hold = -Infinity; for (const x of p) { const c = Math.max(cash, hold + x); hold = Math.max(hold, cash - x); cash = c; } return cash; }
function matchCookies(g: number[], s: number[], k = 0, used: boolean[] = g.map(() => false)): number {
  if (k === s.length) return 0;
  let best = matchCookies(g, s, k + 1, used);
  g.forEach((need, child) => { if (!used[child] && s[k] >= need) { used[child] = true; best = Math.max(best, 1 + matchCookies(g, s, k + 1, used)); used[child] = false; } });
  return best;
}
function boatsBrute(w: number[], limit: number) {
  const n = w.length, f = Array(1 << n).fill(Infinity); f[0] = 0;
  for (let mask = 1; mask < 1 << n; mask++) {
    const i = Math.log2(mask & -mask);
    const rest = mask & ~(1 << i);
    f[mask] = f[rest] + 1;
    for (let j = 0; j < n; j++) if (rest >> j & 1 && w[i] + w[j] <= limit) f[mask] = Math.min(f[mask], f[rest & ~(1 << j)] + 1);
  }
  return f[(1 << n) - 1];
}
function candyBrute(r: number[]) {                  // every assignment with values 1..n
  const n = r.length; let best = Infinity;
  const c = Array(n).fill(1);
  const rec = (i: number) => {
    if (i === n) {
      for (let k = 0; k < n; k++) { if (k > 0 && r[k] > r[k - 1] && c[k] <= c[k - 1]) return; if (k + 1 < n && r[k] > r[k + 1] && c[k] <= c[k + 1]) return; }
      best = Math.min(best, c.reduce((x, y) => x + y, 0)); return;
    }
    for (let v = 1; v <= n; v++) { c[i] = v; rec(i + 1); }
  };
  rec(0);
  return best;
}
function wildBrute(s: string) {
  const stars = [...s].map((ch, i) => (ch === '*' ? i : -1)).filter(i => i >= 0);
  for (let code = 0; code < 3 ** stars.length; code++) {
    let open = 0, ok = true, x = code;
    for (let i = 0; i < s.length && ok; i++) {
      let ch = s[i];
      if (ch === '*') { ch = ['(', ')', ''][x % 3]; x = Math.floor(x / 3); }
      if (ch === '(') open++; else if (ch === ')') { open--; if (open < 0) ok = false; }
    }
    if (ok && open === 0) return true;
  }
  return false;
}
function tripletClosure(ts: number[][], target: number[]) {   // actually perform merges until nothing new appears
  const key = (t: number[]) => t.join(',');
  const seen = new Map(ts.map(t => [key(t), t]));
  for (let grew = true; grew;) {
    grew = false;
    for (const a of [...seen.values()]) for (const b of [...seen.values()]) {
      const m = a.map((x, k) => Math.max(x, b[k]));
      if (!seen.has(key(m))) { seen.set(key(m), m); grew = true; }
    }
  }
  return seen.has(key(target));
}
function coinsBFS(coins: number[], amount: number) {
  const dist = new Map<number, number>([[0, 0]]); const q = [0];
  for (let h = 0; h < q.length; h++) for (const c of coins) { const n = q[h] + c; if (n <= amount && !dist.has(n)) { dist.set(n, dist.get(q[h])! + 1); q.push(n); } }
  return dist.get(amount) ?? -1;
}
function knapRec(items: [number, number][], cap: number, k = 0): number {
  if (k === items.length) return 0;
  const skip = knapRec(items, cap, k + 1);
  return items[k][0] <= cap ? Math.max(skip, items[k][1] + knapRec(items, cap - items[k][0], k + 1)) : skip;
}

const cells = (row: { cells: { value: string }[] }) => row.cells.map(c => c.value);
const nums = (row: { cells: { value: string }[] }) => cells(row).map(Number);
const correct = (s: { answer: number; choices: { label: string }[] }) => s.choices[s.answer].label;

// ---------- traces ----------
test('every trace step has a valid answer and real feedback for each choice', () => {
  for (const steps of [kadane, product, gas, jump, jumpII, partition, straights, mixedReview]) for (const s of steps) {
    assert.ok(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length);
    for (const c of s.choices) assert.ok(c.feedback.length > 20, c.label);
  }
});

test('chapter 1 (Kadane) trace numbers', () => {
  const a = [-2, 1, -3, 4, -1, 2, 1, -5, 4];
  assert.deepEqual(nums(kadane[0].rows[0]), a);
  assert.equal(runAt(a, 2), -2);
  assert.deepEqual(nums(kadane[0].rows[1]).slice(0, 3), [0, 1, 2].map(i => runAt(a, i)));
  assert.equal(runAt(a, 3), 4); assert.equal(-2 + 4, 2);
  assert.match(correct(kadane[0]), /^Restart/);
  assert.deepEqual(nums(kadane[1].rows[1]).slice(0, 7), [0, 1, 2, 3, 4, 5, 6].map(i => runAt(a, i)));
  assert.equal(runAt(a, 6), 6); assert.equal(sumOf(a, 3, 6), 6);
  assert.equal(runAt(a, 7), 1); assert.equal(runAt(a, 8), 5);
  assert.equal(maxSub(a), 6);
  assert.match(correct(kadane[1]), /run = 1\. Best stays 6/);
  assert.equal(maxSub([-3, -1, -2]), -1);
  // the zero-start version
  let run = 0, best = 0; for (const x of [-3, -1, -2]) { run = Math.max(0, run + x); best = Math.max(best, run); }
  assert.equal(best, 0);
  assert.match(correct(kadane[2]), /^0/);
});

test('chapter 2 (product) trace numbers', () => {
  const a = [-2, 3, -4];
  assert.deepEqual(nums(product[0].rows[1]).slice(0, 2), [hiAt(a, 0), hiAt(a, 1)]);
  assert.deepEqual(nums(product[0].rows[2]).slice(0, 2), [loAt(a, 0), loAt(a, 1)]);
  assert.equal(hiAt(a, 2), 24); assert.equal(maxProd(a), 24);
  assert.match(correct(product[0]), /= 24$/);
  // only-max version answers 3
  let hi = a[0], best = a[0]; for (const x of a.slice(1)) { hi = Math.max(x, hi * x); best = Math.max(best, hi); }
  assert.equal(best, 3);
  const b = [2, 3, 0, 4];
  assert.deepEqual(nums(product[1].rows[1]).slice(0, 3), [0, 1, 2].map(i => hiAt(b, i)));
  assert.deepEqual(nums(product[1].rows[2]).slice(0, 3), [0, 1, 2].map(i => loAt(b, i)));
  assert.equal(hiAt(b, 3), 4); assert.equal(loAt(b, 3), 0); assert.equal(maxProd(b), 6);
  assert.match(correct(product[1]), /hi = 4, lo = 0/);
});

test('chapter 3 (gas) trace numbers', () => {
  const g = [4, 1, 1, 6], c = [1, 2, 5, 1];
  assert.deepEqual(nums(gas[0].rows[0]), g.map((x, i) => x - c[i]));
  assert.deepEqual([sumOf([3, -1, -4, 5], 0, 0), sumOf([3, -1, -4, 5], 0, 1), sumOf([3, -1, -4, 5], 0, 2)], [3, 2, -2]);
  assert.deepEqual(validStarts(g, c), [3]);
  assert.equal(-1 + -4, -5);
  const g2 = [2, 3, 4], c2 = [3, 4, 3];
  assert.deepEqual(nums(gas[1].rows[0]), [-1, -1, 1]);
  assert.equal(sumOf(g2, 0, 2), 9); assert.equal(sumOf(c2, 0, 2), 10);
  assert.deepEqual(validStarts(g2, c2), []);
  assert.match(correct(gas[1]), /^−1/);
});

test('chapter 4 and 5 (jumps) trace numbers', () => {
  const a = [3, 2, 1, 0, 4];
  assert.equal(Math.max(...a.slice(0, 4).map((x, i) => i + x)), 3);
  assert.equal(minJumps(a), -1);
  const b = [2, 0, 1, 0];
  assert.ok(minJumps(b) > 0);
  assert.equal(0 + b[0], 2); assert.equal(2 + b[2], 3);
  const c = [2, 3, 1, 1, 4];
  assert.equal(minJumps(c), 2);
  // "always land as far as possible": 0 -> 2 -> 3 -> 4
  let pos = 0, hops = 0; while (pos < c.length - 1) { pos = Math.min(c.length - 1, pos + c[pos]); hops++; }
  assert.equal(hops, 3);
  assert.match(correct(jumpII[0]), /3 jumps, but 0 → 1 → 4 takes 2/);
  assert.equal(Math.max(1 + 3, 2 + 1), 4);
  assert.match(correct(jumpII[1]), /answer 2/);
});

test('chapter 6 and 7 trace numbers', () => {
  const s = 'ababcbacadefegdehijhklij';
  assert.deepEqual(cells(partition[0].rows[0]), [...s]);
  assert.equal(s.lastIndexOf('a'), 8); assert.equal(s.lastIndexOf('b'), 5); assert.equal(s.lastIndexOf('c'), 7);
  assert.deepEqual(bestPartition(s), [9, 7, 8]);
  assert.deepEqual(bestPartition('abba'), [4]);
  // the "cut at the current letter's last copy" shortcut
  const t = 'abba'; const cuts: number[] = []; let st = 0;
  for (let i = 0; i < t.length; i++) if (t.lastIndexOf(t[i]) === i) { cuts.push(i - st + 1); st = i + 1; }
  assert.deepEqual(cuts, [3, 1]);
  assert.match(correct(partition[1]), /\[3, 1\]/);
  const hand = [1, 2, 3, 6, 2, 3, 4, 7, 8];
  const counts = [...new Set(hand)].sort((x, y) => x - y).map(v => `${v} ×${hand.filter(h => h === v).length}`);
  assert.deepEqual(cells(straights[0].rows[0]), counts);
  assert.equal(groupable(hand, 3), true);
  assert.equal(groupable([1, 1, 2, 2, 3, 4], 3), false);
  assert.equal(groupable([2, 1, 3, 4, 5, 6], 3), true);
});

test('mixed review numbers', () => {
  assert.equal(coinsBFS([1, 3, 4], 6), 2);
  let left = 6, used = 0; for (const coin of [4, 3, 1]) while (left >= coin) { left -= coin; used++; }
  assert.equal(used, 3);
  assert.equal(maxSub([5, -2, 5]), 8);
  assert.equal(maxProd([-2, 3, -4]), 24);
  assert.equal(knapRec([[10, 60], [20, 100], [30, 120]], 50), 220);
  assert.equal(60 + 100, 160); assert.equal(10 + 20 + 30 > 50, true);
  assert.deepEqual(bestPartition('abba'), [4]);
});

test('numbers claimed in the lesson prose and figures', () => {
  // Chapter 1 hunt: "restart whenever the next value is negative" answers 5 on [5, −2, 5]
  let run = 5, best = 5; for (const x of [-2, 5]) { run = x < 0 ? x : run + x; best = Math.max(best, run); }
  assert.equal(best, 5); assert.equal(maxSub([5, -2, 5]), 8);
  // Chapter 1 exit: run at the last index of LeetCode's example is 5, not the answer 6
  const lc = [-2, 1, -3, 4, -1, 2, 1, -5, 4];
  assert.deepEqual(lc.map((_, i) => runAt(lc, i)), [-2, 1, -2, 4, 3, 5, 6, 1, 5]);
  assert.deepEqual(lc.map((_, i) => maxSub(lc.slice(0, i + 1))), [-2, 1, 1, 4, 4, 5, 6, 6, 6]);
  // Chapter 2 figure and hunt
  assert.deepEqual([0, 1, 2].map(i => loAt([-2, 3, -4], i)), [-2, -6, -12]);
  assert.equal(maxProd([2, 3, 0, 4]), 6); assert.equal(maxProd([-2]), -2); assert.equal(maxProd([-2, 3, -4, -1]), 24);
  // Chapter 3 figure
  const g = [1, 2, 3, 4, 5], c = [3, 4, 5, 1, 2], gains = g.map((x, i) => x - c[i]);
  assert.deepEqual(gains, [-2, -2, -2, 3, 3]);
  assert.deepEqual(gains.map((_, i) => sumOf(gains, 0, i)), [-2, -4, -6, -3, 0]);
  assert.deepEqual([3, 4, 0, 1, 2].map((_, k) => sumOf([3, 4, 0, 1, 2].map(i => gains[i]), 0, k)), [3, 6, 4, 2, 0]);
  assert.deepEqual(validStarts(g, c), [3]);
  assert.deepEqual(validStarts([5], [4]), [0]);
  assert.deepEqual(validStarts([2, 2], [2, 2]), [0, 1]);
  // Chapter 4 and 5
  assert.equal(minJumps([0]), 0); assert.equal(minJumps([2, 0, 1, 0]), 2);
  // Chapter 6 hunt
  assert.deepEqual(bestPartition('abc'), [1, 1, 1]); assert.deepEqual(bestPartition('aaaa'), [4]);
  // Side quests
  assert.equal(stockDP([7, 1, 5, 3, 6, 4]), 7);
  assert.equal(matchCookies([1, 2, 3], [1, 1]), 1); assert.equal(matchCookies([1, 2], [1, 2, 3]), 2);
  assert.equal(boatsBrute([3, 2, 2, 1], 3), 3);
  // three-seat coracles: heaviest with the two lightest uses 3 boats on [1, 1, 2, 2, 2, 2], limit 5; 2 suffice
  assert.equal(1 + 1 + 2 <= 5 && 2 + 2 + 2 > 5, true); assert.equal(1 + 2 + 2, 5);
  assert.equal(candyBrute([1, 2, 87, 87, 87, 2, 1]), 13); assert.equal(candyBrute([1, 3, 4, 5, 2]), 11); assert.equal(candyBrute([5, 4, 3, 2, 1]), 15);
  assert.equal(wildBrute('(*))'), true); assert.equal(wildBrute('(*)'), true);
  assert.equal(tripletClosure([[2, 9, 5], [1, 7, 1]], [2, 7, 5]), false);
  // Epilogue: best[] for coins {1, 3, 4}
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map(a => coinsBFS([1, 3, 4], a)), [0, 1, 2, 1, 1, 2, 2]);
  assert.equal(knapRec([[10, 60], [20, 100]], 50), 160);
});

test('every hint ladder referenced by the lesson exists with three hints, and none is unused', async () => {
  const { readFileSync } = await import('node:fs');
  const mdx = readFileSync(new URL('../src/dsa-lessons/greedy.mdx', import.meta.url), 'utf8');
  const used = [...mdx.matchAll(/hints=\{hints\.(\w+)\}/g)].map(m => m[1]);
  assert.ok(used.length >= 13);
  for (const key of used) assert.equal(hints[key]?.length, 3, key);
  for (const key of Object.keys(hints)) assert.ok(used.includes(key), `unused hint ${key}`);
});

// ---------- lab ----------
type Oracle = (start: GreedyState, final: GreedyState) => void;
const oracles: Record<string, Oracle> = {
  kadane: (s, f) => {
    assert.equal(f.best, maxSub(s.a));
    assert.equal(sumOf(s.a, f.bestFrom, f.bestTo), f.best);
  },
  levels: (s, f) => {
    const want = minJumps(s.a);
    if (want < 0) assert.equal(f.stuck, true); else { assert.equal(f.stuck, false); assert.equal(f.jumps, want); }
  },
  gas: (s, f) => {
    const ok = validStarts(s.gas, s.cost);
    if (!ok.length) assert.equal(f.answer, -1); else assert.ok(ok.includes(f.answer as number), `${f.answer} in ${ok}`);
  },
};
function runCase(start: GreedyState) {
  const { final, wrongMovesChangedBoard } = solveLab(lab, start, 2000);
  assert.equal(final.done, true, `${start.mode} must terminate`);
  assert.equal(wrongMovesChangedBoard, false, `${start.mode}: a wrong move changed the board`);
  oracles[start.mode](start, final);
  return final;
}

test('every lab mode and case terminates with the right result; wrong moves never change the board', () => {
  assert.equal(lab.modes.kadane.cases, kadaneCases.length);
  assert.equal(lab.modes.levels.cases, levelCases.length);
  assert.equal(lab.modes.gas.cases, gasCases.length);
  for (const [mode, info] of Object.entries(lab.modes)) {
    assert.ok(info.cases >= 3 && info.cases <= 4);
    for (let v = 0; v < info.cases; v++) runCase(lab.create(mode, v));
  }
  assert.equal(runCase(lab.create('kadane', 1)).best, -1);
  assert.equal(runCase(lab.create('levels', 3)).jumps, 0);
  assert.equal(runCase(lab.create('gas', 0)).answer, 3);
  assert.equal(runCase(lab.create('gas', 1)).answer, -1);
});

test('every rejected move on every reachable state explains itself with real numbers', () => {
  for (const [mode, info] of Object.entries(lab.modes)) for (let v = 0; v < info.cases; v++) {
    let state = lab.create(mode, v);
    for (let guard = 0; guard < 500; guard++) {
      for (const { action } of info.actions) {
        const result = lab.move(state, action);
        if (!result.accepted && !state.done) {
          assert.doesNotMatch(result.state.message, /undefined|NaN|null|\[object/, `${mode} case ${v}: ${action}`);
          assert.ok(result.state.message.length > 15, `${mode} case ${v}: ${action} needs an explanation`);
        }
      }
      for (const text of [lab.describe(state), ...lab.view(state).flatMap(r => r.cells.map(c => `${c.value} ${c.label ?? ''}`))])
        assert.doesNotMatch(text, /undefined|NaN/, `${mode} case ${v}`);
      if (state.done) break;
      state = lab.move(state, lab.expected(state)).state;
      assert.doesNotMatch(state.message, /undefined|NaN/);
    }
    assert.equal(state.done, true);
  }
});

test('lab agrees with brute force on random small inputs', () => {
  let seed = 18; const rnd = (n: number) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
  for (let t = 0; t < 200; t++) {
    const a = Array.from({ length: 1 + rnd(8) }, () => rnd(13) - 6);
    runCase({ ...lab.create('kadane'), ...fromInput({ mode: 'kadane', a }) });
    const j = Array.from({ length: 1 + rnd(8) }, () => rnd(4));
    runCase({ ...lab.create('levels'), ...fromInput({ mode: 'levels', a: j }) });
    const n = 1 + rnd(6);
    const g = Array.from({ length: n }, () => rnd(6)), c = Array.from({ length: n }, () => rnd(6));
    runCase({ ...lab.create('gas'), ...fromInput({ mode: 'gas', gas: g, cost: c }) });
  }
});

test('the lab catches the classic wrong moves with the board numbers', () => {
  // Kadane: extending a negative run
  let k = lab.create('kadane', 0);                                  // [-2, 1, -3, ...]
  k = lab.move(k, 'restart').state; k = lab.move(k, 'record').state;  // run -2, best -2
  const ext = lab.move(k, 'extend');
  assert.equal(ext.accepted, false);
  assert.match(ext.state.message, /run so far is −2.*−2 \+ 1 = −1/);
  // Kadane: forgetting to record a better run
  k = lab.move(k, 'restart').state;                                  // run 1 > best -2
  assert.match(lab.move(k, 'keep').state.message, /run 1 beats the best −2/);
  // Levels: jumping before the edge of the window
  let l = lab.create('levels', 0);                                   // [2, 3, 1, 1, 4]
  l = lab.move(l, 'scan').state; l = lab.move(l, 'jump').state;      // end = 2
  l = lab.move(l, 'scan').state;                                     // at stone 1, far = 4
  assert.match(lab.move(l, 'jump').state.message, /stone\(s\) 2\.\.2 are reachable with 1 jump/);
  // Gas: reporting a start when the total is negative
  let g = lab.create('gas', 1);
  for (let guard = 0; guard < 50 && !(g.phase === 'add' && g.i === g.gas.length); guard++) g = lab.move(g, lab.expected(g)).state;
  assert.equal(g.start, 2);
  assert.match(lab.move(g, 'report').state.message, /= −1 < 0/);
  // Gas: keeping a dead start
  let h = lab.create('gas', 2);
  h = lab.move(h, 'add').state; h = lab.move(h, 'keep').state;      // tank 3
  h = lab.move(h, 'add').state; h = lab.move(h, 'keep').state;      // tank 2
  h = lab.move(h, 'add').state;                                      // tank -2
  assert.match(lab.move(h, 'keep').state.message, /tank reads −2.*no station from 0 to 2/);
});

// ---------- practice ----------
const arrays = (prompt: string) => [...prompt.matchAll(/\[([^\]]*)\]/g)].map(m => (m[1].trim() === '' ? [] : m[1].split(',').map(x => Number(x.replace('−', '-')))));
const num = (prompt: string, re: RegExp) => { const m = prompt.match(re); assert.ok(m, `${re} in ${prompt}`); return Number(m![1]); };
const quoted = (prompt: string) => { const m = prompt.match(/“([^”]*)”/); assert.ok(m); return m![1]; };
const tuples = (text: string) => [...text.matchAll(/\((\d+), (\d+)(?:, (\d+))?\)/g)].map(m => m.slice(1).filter(x => x !== undefined).map(Number));

test('every practice answer matches an independent computation from the prompt', () => {
  assert.equal(practice.storageKey, 'citadel-greedy-review-v1');
  assert.ok(conceptIds.length >= 10);
  assert.ok(Object.keys(practice.strategies).includes('other'));
  const strategiesUsed = new Set<string>();
  for (const id of practice.conceptIds) {
    const prompts = new Set<string>();
    for (let variant = 0; variant <= 20; variant++) {
      const c = practice.challengeFor(id, variant);
      prompts.add(c.prompt);
      strategiesUsed.add(c.strategy);
      assert.ok(c.strategy in practice.strategies, `${id}: unknown strategy`);
      assert.doesNotMatch(c.prompt, /greedy|kadane|dynamic|memo|BFS|breadth|two pointer|sort|interval|window|prefix|heap/i, `${id}: the prompt must not name the technique`);
      const a = arrays(c.prompt)[0] ?? [];
      let expected: number | number[] | boolean;
      switch (id) {
        case 'best-run': expected = maxSub(a); break;
        case 'best-product': expected = maxProd(a); break;
        case 'circuit': {
          const [g, cost] = arrays(c.prompt);
          const ok = validStarts(g, cost);
          assert.ok(ok.length <= 1, `${id}: the prompt promises at most one start`);
          expected = ok.length ? ok[0] : -1; break;
        }
        case 'reach': expected = minJumps(a) >= 0; break;
        case 'fewest-jumps': expected = minJumps(a); assert.ok(expected >= 0); break;
        case 'pieces': expected = bestPartition(quoted(c.prompt)); break;
        case 'straights': expected = groupable(a, num(c.prompt, /groups of exactly (\d+) cards/)); break;
        case 'trades': expected = stockDP(a); break;
        case 'cookies': { const [g, s] = arrays(c.prompt); expected = matchCookies(g, s); break; }
        case 'boats': {
          const limit = num(c.prompt, /at most (\d+) in total/);
          assert.ok(a.every(x => x <= limit));
          expected = boatsBrute(a, limit); break;
        }
        case 'candy': expected = candyBrute(a); break;
        case 'wildcards': expected = wildBrute(quoted(c.prompt)); break;
        case 'triplets': {
          const ts = tuples(c.prompt.split('Can some')[0]);
          const target = tuples(c.prompt.split('Can some')[1])[0];
          expected = tripletClosure(ts, target); break;
        }
        case 'coins': expected = coinsBFS(a, num(c.prompt, /up to exactly (\d+)\?/)); break;
        case 'knapsack': {
          const items = tuples(c.prompt.split('weight, value):')[1]) as [number, number][];
          expected = knapRec(items, num(c.prompt, /holds at most (\d+) kg/)); break;
        }
        default: throw new Error(`untested concept ${id}`);
      }
      assert.deepEqual(c.answer, expected, `${id} variant ${variant}: ${c.prompt}`);
      const typed = typeof expected === 'boolean' ? (expected ? 'yes' : 'no') : JSON.stringify(expected);
      assert.equal(answerMatches(c, typed), true, `${id} variant ${variant}: ${typed}`);
      assert.equal(answerMatches(c, 'not an answer'), false);
      assert.equal(c.hints.length, 3); assert.equal(c.rubric.length, 3);
    }
    assert.ok(prompts.size >= 2, `${id}: the input must vary with the variant`);
  }
  assert.ok(strategiesUsed.size >= 8);
});

test('the decoys really defeat the obvious local rule on at least one variant', () => {
  let coinFail = 0, knapFail = 0;
  for (let v = 0; v <= 20; v++) {
    const c = practice.challengeFor('coins', v);
    const coins = arrays(c.prompt)[0].sort((x, y) => y - x), amount = num(c.prompt, /up to exactly (\d+)\?/);
    let left = amount, used = 0; for (const coin of coins) while (left >= coin) { left -= coin; used++; }
    if ((left === 0 ? used : -1) !== c.answer) coinFail++;
    const k = practice.challengeFor('knapsack', v);
    const items = tuples(k.prompt.split('weight, value):')[1]).sort((x, y) => y[1] / y[0] - x[1] / x[0]);
    let room = num(k.prompt, /holds at most (\d+) kg/), value = 0;
    for (const [w, x] of items) if (w <= room) { room -= w; value += x; }
    if (value !== k.answer) knapFail++;
  }
  assert.ok(coinFail >= 5, `coin decoys that beat largest-first: ${coinFail}`);
  assert.ok(knapFail >= 3, `knapsack decoys that beat the ratio rule: ${knapFail}`);
});
