import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { solveLab } from '../src/lib/lab.ts';
import { answerMatches } from '../src/lib/review.ts';
import { lab, fromInput, DENOMINATIONS, type DpState } from '../src/lib/labs/dp-1d.ts';
import { stairs, minCost, robber, circle, decode, coins, words, lis, palindromes, countPal, mixedReview } from '../src/data/dp-1d/traces.ts';
import { hints } from '../src/data/dp-1d/hints.ts';
import { practice, conceptIds } from '../src/data/practice/dp-1d.ts';

// ---------- independent oracles (deliberately naive: enumeration, search, simulation) ----------
const countSeq = (n: number, k: number): number => (n === 0 ? 1 : Array.from({ length: Math.min(k, n) }, (_, m) => countSeq(n - m - 1, k)).reduce((s, x) => s + x, 0));
const minCostBrute = (cost: number[]): number => {
  const from = (at: number): number => (at >= cost.length ? 0 : cost[at] + Math.min(from(at + 1), from(at + 2)));
  return Math.min(from(0), from(1));
};
function robBrute(a: number[], ring = false) {
  let best = 0;
  for (let mask = 0; mask < 1 << a.length; mask++) {
    if (mask & (mask >> 1)) continue;
    if (ring && a.length > 1 && mask & 1 && mask & (1 << (a.length - 1))) continue;
    best = Math.max(best, a.reduce((s, x, i) => (mask >> i & 1 ? s + x : s), 0));
  }
  return best;
}
const decodeBrute = (s: string): number => {
  if (s === '') return 1;
  let c = 0;
  for (const len of [1, 2]) {
    if (len > s.length || s[0] === '0') continue;
    const v = Number(s.slice(0, len));
    if (v >= 1 && v <= 26) c += decodeBrute(s.slice(len));
  }
  return c;
};
function coinsBfs(coinList: number[], amount: number) {           // shortest path over amounts
  const dist = new Map<number, number>([[0, 0]]), queue = [0];
  while (queue.length) {
    const x = queue.shift()!;
    if (x === amount) return dist.get(x)!;
    for (const c of coinList) if (x + c <= amount && !dist.has(x + c)) { dist.set(x + c, dist.get(x)! + 1); queue.push(x + c); }
  }
  return -1;
}
const wordBrute = (s: string, dict: string[]): boolean => s === '' || dict.some(w => s.startsWith(w) && wordBrute(s.slice(w.length), dict));
function lisBrute(a: number[]) {                                    // every subset of positions
  let best = 0, count = 0;
  for (let mask = 1; mask < 1 << a.length; mask++) {
    const picked = a.filter((_, i) => mask >> i & 1);
    if (!picked.every((x, i) => i === 0 || picked[i - 1] < x)) continue;
    if (picked.length > best) { best = picked.length; count = 1; } else if (picked.length === best) count++;
  }
  return { best, count };
}
const isPal = (s: string) => [...s].reverse().join('') === s;
function palBrute(s: string) {
  let longest = 0, count = 0;
  for (let i = 0; i < s.length; i++) for (let j = i + 1; j <= s.length; j++) if (isPal(s.slice(i, j))) { count++; longest = Math.max(longest, j - i); }
  return { longest, count };
}
function earnGame(bag: number[], seen = new Map<string, number>()): number {   // play the real game
  const key = bag.join(',');
  if (seen.has(key)) return seen.get(key)!;
  let best = 0;
  for (const x of new Set(bag)) {
    const rest = [...bag]; rest.splice(rest.indexOf(x), 1);
    best = Math.max(best, x + earnGame(rest.filter(y => y !== x - 1 && y !== x + 1), seen));
  }
  seen.set(key, best);
  return best;
}
function squaresBfs(n: number) {
  const dist = new Map<number, number>([[0, 0]]), queue = [0];
  while (queue.length) {
    const x = queue.shift()!;
    if (x === n) return dist.get(x)!;
    for (let r = 1; x + r * r <= n; r++) if (!dist.has(x + r * r)) { dist.set(x + r * r, dist.get(x)! + 1); queue.push(x + r * r); }
  }
  return -1;
}
function partitionBrute(a: number[]) {
  const total = a.reduce((s, x) => s + x, 0);
  for (let mask = 0; mask < 1 << a.length; mask++) if (2 * a.reduce((s, x, i) => (mask >> i & 1 ? s + x : s), 0) === total) return true;
  return false;
}
const ticketsBrute = (days: number[], costs: number[], idx = 0): number => {
  if (idx === days.length) return 0;
  return Math.min(...[1, 7, 30].map((span, p) => { let j = idx; while (j < days.length && days[j] < days[idx] + span) j++; return costs[p] + ticketsBrute(days, costs, j); }));
};
function jumpBrute(a: number[]) {
  const seen = new Set([0]), stack = [0];
  while (stack.length) { const i = stack.pop()!; for (let j = i + 1; j <= i + a[i] && j < a.length; j++) if (!seen.has(j)) { seen.add(j); stack.push(j); } }
  return seen.has(a.length - 1);
}
function tilings(n: number) {                                      // fill a 2 × n grid cell by cell
  const grid = [Array(n).fill(false), Array(n).fill(false)];
  const go = (): number => {
    let r = -1, c = -1;
    for (let col = 0; col < n && r < 0; col++) for (let row = 0; row < 2; row++) if (!grid[row][col]) { r = row; c = col; break; }
    if (r < 0) return 1;
    let total = 0;
    const tryPlace = (cells: [number, number][]) => {
      if (cells.some(([y, x]) => x >= n || grid[y][x])) return;
      cells.forEach(([y, x]) => (grid[y][x] = true)); total += go(); cells.forEach(([y, x]) => (grid[y][x] = false));
    };
    if (r === 0) tryPlace([[0, c], [1, c]]);
    tryPlace([[r, c], [r, c + 1]]);
    if (r === 0) tryPlace([[0, c], [1, c], [0, c + 1], [1, c + 1]]);
    return total;
  };
  return go();
}
// straightforward tables, used to check the numbers printed in traces and figures
const waysTable = (n: number, w0 = 1) => { const w = [w0, 1]; for (let i = 2; i <= n; i++) w[i] = w[i - 1] + w[i - 2]; return w; };
const minCostTable = (cost: number[]) => { const d = [0, 0]; for (let i = 2; i <= cost.length; i++) d[i] = Math.min(d[i - 1] + cost[i - 1], d[i - 2] + cost[i - 2]); return d; };
const robTable = (a: number[]) => { const d = [0, a[0]]; for (let i = 2; i <= a.length; i++) d[i] = Math.max(a[i - 1] + d[i - 2], d[i - 1]); return d; };
const decodeTable = (s: string) => { const d = [1]; for (let i = 1; i <= s.length; i++) d[i] = decodeBrute(s.slice(0, i)); return d; };
const coinTable = (c: number[], A: number) => Array.from({ length: A + 1 }, (_, a) => coinsBfs(c, a));
const lisEnding = (a: number[]) => a.map((_, i) => Math.max(...[...Array(1 << (i + 1)).keys()].filter(m => m >> i & 1).map(m => {
  const p = a.filter((_, k) => m >> k & 1); return p.every((x, k) => k === 0 || p[k - 1] < x) ? p.length : 0;
})));
function tailsHistory(a: number[]) {
  const t: number[] = [], out: number[][] = [];
  for (const x of a) { let k = t.findIndex(y => y >= x); if (k < 0) k = t.length; t[k] = x; out.push([...t]); }
  return out;
}
function asks(n: number) { const c = Array(n + 1).fill(0); const go = (i: number) => { c[i]++; if (i > 1) { go(i - 1); go(i - 2); } }; go(n); return c; }

const cells = (row: { cells: { value: string }[] }) => row.cells.map(c => c.value);
const nums = (row: { cells: { value: string }[] }) => cells(row).map(Number);
const correct = (s: { answer: number; choices: { label: string }[] }) => s.choices[s.answer].label;
const mdx = readFileSync(new URL('../src/dsa-lessons/dp-1d.mdx', import.meta.url), 'utf8');
const strip = (a: (number | string)[]) => `values={[${a.map(x => (typeof x === 'string' ? `'${x}'` : String(x))).join(', ')}]}`;

test('every trace step has a valid answer and real feedback for each choice', () => {
  for (const steps of [stairs, minCost, robber, circle, decode, coins, words, lis, palindromes, countPal, mixedReview]) {
    assert.ok(steps.length >= 2);
    for (const s of steps) {
      assert.ok(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length);
      for (const c of s.choices) assert.ok(c.feedback.length > 20, c.label);
    }
  }
});

test('chapter 1: stairs trace and figure numbers', () => {
  const w = waysTable(30);
  assert.deepEqual(w.slice(0, 6), [1, 1, 2, 3, 5, 8]);
  for (let n = 0; n <= 20; n++) assert.equal(w[n], countSeq(n, 2));
  assert.deepEqual(nums(stairs[0].rows[0]).slice(0, 5), w.slice(0, 5));
  assert.match(correct(stairs[0]), /5 \+ 3 = 8/);
  assert.deepEqual(waysTable(5, 0), [0, 1, 1, 2, 3, 5]);              // the wrong base case in the feedback
  assert.match(stairs[1].choices[1].feedback, /0, 1, 1, 2, 3, 5, so ways\[5\] = 5/);
  assert.deepEqual(asks(5), [3, 5, 3, 2, 1, 1]);
  assert.deepEqual(nums(stairs[2].rows[0]), asks(5));
  assert.equal(asks(5).reduce((s, x) => s + x, 0), 15);
  assert.match(correct(stairs[2]), /^9 = 2n − 1/);
  const calls = (n: number): number => (n <= 1 ? 1 : 1 + calls(n - 1) + calls(n - 2));
  assert.equal(calls(30), 2692537); assert.equal(w[30], 1346269); assert.equal(2 * 30 - 1, 59);
  assert.equal(asks(30)[3], 317811);
  assert.match(mixedReview[2].choices[1].label, /317,811/);
  for (const n of [1, 5, 10, 30]) assert.equal(calls(n), 2 * w[n] - 1);
  assert.ok(mdx.includes('2,692,537 calls') && mdx.includes('1,346,269') && mdx.includes('59 for `n = 30`'));
});

test('chapters 2–4: min cost, robber, ring numbers', () => {
  assert.deepEqual(minCostTable([10, 15, 20]), [0, 0, 10, 15]);
  assert.equal(minCostBrute([10, 15, 20]), 15);
  assert.match(correct(minCost[0]), /min\(15, 10\) = 10/);
  assert.match(correct(minCost[1]), /min\(30, 15\) = 15/);
  const lc2 = [1, 100, 1, 1, 1, 100, 1, 1, 100, 1];
  assert.deepEqual(minCostTable(lc2), [0, 0, 1, 2, 2, 3, 3, 4, 4, 5, 6]);
  assert.equal(minCostBrute(lc2), 6);
  assert.ok(mdx.includes(strip(minCostTable(lc2))));
  assert.equal([0, 2, 4, 6, 7, 9].reduce((s, i) => s + lc2[i], 0), 6);

  const street = [2, 7, 9, 3, 1];
  assert.deepEqual(robTable(street), [0, 2, 7, 11, 11, 12]);
  assert.ok(mdx.includes(strip(robTable(street))));
  assert.equal(robBrute(street), 12);
  assert.equal(street[2] + robTable(street)[1], 11);
  assert.equal(street[3] + robTable(street)[2], 10);
  assert.deepEqual(robTable([2, 1, 1, 2]), [0, 2, 2, 3, 4]);
  assert.deepEqual(nums(robber[2].rows[1]), robTable([2, 1, 1, 2]));
  assert.equal(robBrute([2, 1, 1, 2]), 4);
  assert.equal(robBrute([3, 4, 3]), 6);

  assert.equal(robBrute(street, true), 11);
  assert.equal(robBrute(street.slice(0, 4)), 11); assert.equal(robBrute(street.slice(1)), 10);
  assert.match(correct(circle[1]), /max\(11, 10\) = 11/);
  assert.equal(robBrute([7], true), 7);
  assert.equal(robBrute([2, 3, 2], true), 3); assert.equal(robBrute([1, 2, 3, 1], true), 4);
});

test('chapters 5–7: decode, coins, word break numbers', () => {
  const table: [string, number][] = [['0', 0], ['06', 0], ['10', 1], ['27', 1], ['100', 0], ['226', 3], ['11106', 2], ['12', 2]];
  for (const [s, n] of table) assert.equal(decodeBrute(s), n, s);
  assert.deepEqual(decodeTable('226'), [1, 1, 2, 3]);
  assert.deepEqual(decodeTable('11106'), [1, 1, 2, 3, 2, 2]);
  assert.ok(mdx.includes(strip(decodeTable('11106'))));
  assert.deepEqual(nums(decode[1].rows[1]).slice(0, 4), [1, 1, 2, 3]);
  assert.match(correct(decode[0]), /2 \+ 1 = 3/);
  assert.match(correct(decode[1]), /dp\[2\] = 2/);
  assert.match(correct(decode[2]), /dp\[4\] = 2/);

  assert.deepEqual(coinTable([1, 3, 4], 6), [0, 1, 2, 1, 1, 2, 2]);
  assert.ok(mdx.includes(strip(coinTable([1, 3, 4], 6))));
  assert.deepEqual(nums(coins[0].rows[0]).slice(0, 6), [0, 1, 2, 1, 1, 2]);
  assert.match(correct(coins[0]), /1 \+ dp\[3\] = 1 \+ 1 = 2/);
  assert.equal(coinsBfs([2], 3), -1); assert.equal(coinsBfs([1, 2, 5], 11), 3);
  assert.equal((2 ** 31 - 1 + 1) | 0, -2147483648);                   // MAX_VALUE + 1 in 32-bit
  assert.equal(coinsBfs([2, 5], 8), 4);

  const prayDict = ['pray', 'prays', 'song'];
  const prayDp = Array.from({ length: 9 }, (_, i) => (wordBrute('praysong'.slice(0, i), prayDict) ? 'T' : 'F'));
  assert.deepEqual(prayDp, ['T', 'F', 'F', 'F', 'T', 'T', 'F', 'F', 'T']);
  assert.ok(mdx.includes(strip(prayDp)));
  assert.deepEqual(cells(words[0].rows[1]).slice(0, 8), prayDp.slice(0, 8));
  assert.equal(wordBrute('ong', prayDict), false);
  assert.equal(wordBrute('abc', ['a', 'abc', 'b']), true);
  assert.equal(countSeq(20, 2), 10946);                                 // Word Break II reveal: 20 a's, words a / aa
});

test('chapters 8–10: LIS, palindromes', () => {
  const bells = [10, 9, 2, 5, 3, 7, 101, 18];
  assert.deepEqual(lisEnding(bells), [1, 1, 1, 2, 2, 3, 4, 4]);
  assert.ok(mdx.includes(strip(lisEnding(bells))));
  assert.equal(lisBrute(bells).best, 4);
  const hist = tailsHistory(bells);
  assert.deepEqual(hist.slice(2), [[2], [2, 5], [2, 3], [2, 3, 7], [2, 3, 7, 101], [2, 3, 7, 18]]);
  for (const t of hist.slice(2)) assert.ok(mdx.includes(strip(t)));
  assert.deepEqual(nums(lis[1].rows[0]), [2, 3, 7, 101]);
  assert.match(correct(lis[1]), /\[2, 3, 7, 18\]/);
  assert.deepEqual(tailsHistory([3, 4, 1]).at(-1), [1, 4]);
  assert.equal(lisBrute([3, 4, 1]).best, 2);
  assert.deepEqual(lisEnding([1, 3, 2, 0]), [1, 2, 2, 1]);
  assert.equal(lisBrute([1, 3, 2, 0]).best, 2);
  assert.equal(lisBrute([1, 3, 5, 4, 7]).count, 2);
  assert.equal(lisBrute([2, 2, 2, 2, 2]).count, 5);

  assert.equal(palBrute('cbbd').longest, 2); assert.equal(palBrute('babad').longest, 3);
  assert.equal(2 * 5 - 1, 9);
  assert.match(correct(palindromes[1]), /^9/);
  assert.equal(palBrute('aaa').count, 6); assert.equal(palBrute('abba').count, 6); assert.equal(palBrute('abc').count, 3);
  assert.match(countPal[1].choices[1].label, /count is 5, not 6/);
  assert.equal(1000 * 1001 / 2, 500500);
});

test('side quests, choose-the-tool and exit-ticket numbers', () => {
  assert.equal(earnGame([2, 2, 3, 3, 3, 4]), 9); assert.equal(earnGame([3, 4, 2]), 6);
  assert.ok(mdx.includes(strip([0, 0, 4, 9, 4])));
  assert.equal(squaresBfs(12), 3); assert.equal(squaresBfs(13), 2);
  assert.equal(partitionBrute([1, 2, 5]), false);
  // the forwards loop with x = 1 on target 4 marks everything; backwards marks only 0 and 1
  const fwd = [true, false, false, false, false]; for (let s = 1; s <= 4; s++) fwd[s] = fwd[s] || fwd[s - 1];
  const bwd = [true, false, false, false, false]; for (let s = 4; s >= 1; s--) bwd[s] = bwd[s] || bwd[s - 1];
  assert.ok(mdx.includes(strip(fwd.map(b => (b ? 'T' : 'F')))) && mdx.includes(strip(bwd.map(b => (b ? 'T' : 'F')))));
  assert.equal(200 * 100, 20000);
  const trib = [0, 1, 1]; for (let i = 3; i <= 37; i++) trib[i] = trib[i - 1] + trib[i - 2] + trib[i - 3];
  for (let n = 0; n <= 15; n++) assert.equal(countSeq(n, 3), trib[n + 1], `ways(n) = T(n + 1) at ${n}`);
  assert.equal(trib[37], 2082876103);
  assert.equal(ticketsBrute([1, 4, 6, 7, 8, 20], [2, 7, 15]), 11);
  assert.equal(ticketsBrute([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 30, 31], [2, 7, 15]), 17);
  assert.equal(jumpBrute([2, 3, 1, 1, 4]), true); assert.equal(jumpBrute([3, 2, 1, 0, 4]), false);
  // exit ticket
  assert.deepEqual([0, 1, 2, 3, 4].map(tilings), [1, 1, 3, 5, 11]);
  const chain = (a: number[]) => { let best = 0; for (let m = 1; m < 1 << a.length; m++) { const p = a.filter((_, i) => m >> i & 1); if (p.every(x => p.every(y => x % y === 0 || y % x === 0))) best = Math.max(best, p.length); } return best; };
  assert.deepEqual([[1, 2, 3], [1, 2, 4, 8], [3, 5, 7]].map(chain), [2, 4, 1]);
  const ordered = (cs: number[], t: number): number => (t === 0 ? 1 : cs.filter(c => c <= t).reduce((s, c) => s + ordered(cs, t - c), 0));
  assert.deepEqual([0, 1, 2, 3, 4].map(t => ordered([1, 2, 3], t)), [1, 1, 2, 4, 7]);
});

test('every hint ladder referenced by the lesson exists with three hints', () => {
  const used = [...mdx.matchAll(/hints=\{hints\.(\w+)\}/g)].map(m => m[1]);
  assert.ok(used.length >= 17);
  for (const key of used) assert.equal(hints[key]?.length, 3, key);
  for (const key of Object.keys(hints)) assert.ok(used.includes(key), `unused hint ${key}`);
  for (const name of ['stairs', 'minCost', 'robber', 'circle', 'decode', 'coins', 'words', 'lis', 'palindromes', 'countPal', 'mixedReview'])
    assert.ok(mdx.includes(`steps={${name}}`), `trace ${name} is not shown`);
});

// ---------- lab ----------
function oracle(start: DpState, final: DpState) {
  if (start.mode === 'robber') {
    assert.equal(final.result, robBrute(start.a));
    if (start.a.length) assert.deepEqual(final.dp, robTable(start.a));
  } else if (start.mode === 'coins') {
    assert.equal(final.result, coinsBfs(start.coins, start.amount));
    assert.deepEqual(final.dp.map(x => (x === null ? -1 : x)), coinTable(start.coins, start.amount));
  } else {
    assert.equal(final.result, decodeBrute(start.s));
    assert.deepEqual(final.dp, decodeTable(start.s));
  }
}
function runCase(start: DpState) {
  const { final, wrongMovesChangedBoard } = solveLab(lab, start, 2000);
  assert.equal(final.done, true, `${start.mode} must terminate`);
  assert.equal(wrongMovesChangedBoard, false, `${start.mode}: a wrong move changed the board`);
  oracle(start, final);
}

test('every lab mode and case terminates with the right result; wrong moves never change the board', () => {
  for (const [mode, info] of Object.entries(lab.modes)) {
    assert.ok(info.cases >= 3 && info.cases <= 4);
    for (let v = 0; v < info.cases; v++) runCase(lab.create(mode, v));
  }
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
        assert.doesNotMatch(text, /undefined|NaN|null/, `${mode} case ${v}`);
      if (state.done) break;
      state = lab.move(state, lab.expected(state)).state;
      assert.doesNotMatch(state.message, /undefined|NaN|null/);
    }
    assert.equal(state.done, true);
  }
});

test('lab agrees with brute force on random small inputs', () => {
  let seed = 14; const rnd = (n: number) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
  for (let t = 0; t < 200; t++) {
    runCase({ ...lab.create('robber'), ...fromInput({ mode: 'robber', a: Array.from({ length: rnd(9) }, () => rnd(10)) }) });
    const coinList = DENOMINATIONS.filter(() => rnd(2) === 1);
    runCase({ ...lab.create('coins'), ...fromInput({ mode: 'coins', coins: coinList.length ? coinList : [3], amount: rnd(13) }) });
    runCase({ ...lab.create('decode'), ...fromInput({ mode: 'decode', s: Array.from({ length: 1 + rnd(8) }, () => '0122126379'[rnd(10)]).join('') }) });
  }
});

test('the lab explains wrong choices with the numbers on the board', () => {
  const r = lab.create('robber', 0);                            // [2, 7, 9, 3, 1], writing dp[2]
  const skip = lab.move(r, 'skip');
  assert.equal(skip.accepted, false);
  assert.match(skip.state.message, /knocking gives 7 \+ dp\[0\] = 7 \+ 0 = 7/);
  let s = lab.move(r, 'knock').state;                           // dp[2] = 7
  s = lab.move(s, 'knock').state;                               // dp[3] = 11
  assert.match(lab.move(s, 'knock').state.message, /3 \+ dp\[2\] = 3 \+ 7 = 10, but skipping it keeps dp\[3\] = 11/);
  const tie = lab.create('robber', 2);                          // [4, 4, 4, 4]: dp[2] is a tie
  assert.equal(lab.move(tie, 'skip').accepted, true);
  assert.equal(lab.move(tie, 'knock').accepted, true);

  let c = lab.create('coins', 0);                               // [1, 3, 4], amount 6
  for (let a = 1; a <= 5; a++) c = lab.move(c, lab.expected(c)).state;
  const four = lab.move(c, 'c4');
  assert.equal(four.accepted, false);
  assert.match(four.state.message, /1 \+ dp\[2\] = 1 \+ 2 = 3, but a last 3-coin gives 1 \+ dp\[3\] = 2/);
  assert.match(lab.move(c, 'c2').state.message, /no 2-coin/);
  let u = lab.create('coins', 2);                               // [2], amount 3
  assert.equal(lab.expected(u), 'none');
  u = lab.move(u, 'none').state; u = lab.move(u, 'c2').state;
  assert.match(lab.move(u, 'c2').state.message, /Amount 1 is unreachable/);

  let d = lab.create('decode', 1);                              // 11106
  for (let i = 1; i <= 4; i++) d = lab.move(d, lab.expected(d)).state;
  assert.equal(lab.expected(d), 'one');
  assert.match(lab.move(d, 'both').state.message, /“06” starts with 0/);
  const z = lab.create('decode', 2);                            // 100
  const z2 = lab.move(lab.move(z, 'one').state, 'two').state;
  assert.equal(lab.expected(z2), 'neither');
  assert.match(lab.move(z2, 'two').state.message, /“00” starts with 0/);
});

// ---------- practice ----------
const arrays = (prompt: string) => [...prompt.matchAll(/\[([^\]]*)\]/g)].map(m => (m[1].trim() === '' ? [] : m[1].split(',').map(Number)));
const quoted = (prompt: string) => [...prompt.matchAll(/"([^"]*)"/g)].map(m => m[1]);
function num(prompt: string, re: RegExp) { const m = prompt.match(re); assert.ok(m, `${re} in ${prompt}`); return Number(m![1]); }

test('every practice answer matches an independent brute force computed from the prompt', () => {
  assert.equal(practice.storageKey, 'citadel-dp-1d-review-v1');
  assert.ok(conceptIds.length >= 10);
  assert.ok(Object.keys(practice.strategies).includes('other'));
  const sections = new Set([...mdx.matchAll(/<h2 id="([^"]+)"/g)].map(m => m[1]));
  const strategiesUsed = new Set<string>();
  for (const id of practice.conceptIds) {
    const prompts = new Set<string>();
    for (let variant = 0; variant <= 20; variant++) {
      const c = practice.challengeFor(id, variant);
      prompts.add(c.prompt);
      strategiesUsed.add(c.strategy);
      assert.ok(c.strategy in practice.strategies, `${id}: unknown strategy`);
      assert.ok(sections.has(c.section), `${id}: section ${c.section} is not a heading in the lesson`);
      assert.doesNotMatch(c.prompt, /dynamic|\bdp\b|memo|tabulat|recurrence|knapsack|fibonacci|greedy|subsequence|palindrom|robber|coin change|decode ways|word break/i, `${id}: the prompt must not name the technique`);
      const a = arrays(c.prompt)[0] ?? [];
      let expected: number | boolean;
      switch (id) {
        case 'stairs': expected = countSeq(num(c.prompt, /exactly on stone (\d+)/), 2); break;
        case 'k-steps': expected = countSeq(num(c.prompt, /exactly on stone (\d+)/), num(c.prompt, /between 1 and (\d+) stones/)); break;
        case 'min-cost': expected = minCostBrute(a); break;
        case 'robber': expected = robBrute(a); break;
        case 'robber-circle': expected = robBrute(a, true); break;
        case 'decode': expected = decodeBrute(quoted(c.prompt)[0]); break;
        case 'coins': expected = coinsBfs(a, num(c.prompt, /exactly (\d+)\?/)); break;
        case 'word-break': { const [s, ...dict] = quoted(c.prompt); expected = wordBrute(s, dict); break; }
        case 'lis': expected = lisBrute(a).best; break;
        case 'count-lis': expected = lisBrute(a).count; break;
        case 'longest-pal': expected = palBrute(quoted(c.prompt)[0]).longest; break;
        case 'count-pal': expected = palBrute(quoted(c.prompt)[0]).count; break;
        case 'delete-earn': expected = earnGame(a); break;
        case 'squares': expected = squaresBfs(num(c.prompt, /exactly (\d+)\?/)); break;
        case 'partition': expected = partitionBrute(a); break;
        case 'tickets': {
          const m = c.prompt.match(/1-day pass costs (\d+), a 7-day pass costs (\d+) and a 30-day pass costs (\d+)/)!;
          expected = ticketsBrute(a, [Number(m[1]), Number(m[2]), Number(m[3])]); break;
        }
        case 'jump': expected = jumpBrute(a); break;
        default: throw new Error(`untested concept ${id}`);
      }
      assert.deepEqual(c.answer, expected, `${id} variant ${variant}`);
      const typed = typeof expected === 'boolean' ? (expected ? 'yes' : 'no') : String(expected);
      assert.equal(answerMatches(c, typed), true, `${id} variant ${variant}: ${typed}`);
      assert.equal(answerMatches(c, 'not an answer'), false);
      assert.equal(c.hints.length, 3); assert.equal(c.rubric.length, 3);
    }
    assert.ok(prompts.size >= 2, `${id}: the input must vary with the variant`);
  }
  assert.ok(strategiesUsed.size >= 6);
});
