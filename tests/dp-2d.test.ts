import test from 'node:test';
import assert from 'node:assert/strict';
import { solveLab } from '../src/lib/lab.ts';
import { answerMatches } from '../src/lib/review.ts';
import { lab, fromInput, type DpState } from '../src/lib/labs/dp-2d.ts';
import { figures, NEG, paths, lcs, edit, partition, coins, cooldown, climb, balloons, mixedReview } from '../src/data/dp-2d/traces.ts';
import { hints } from '../src/data/dp-2d/hints.ts';
import { practice, conceptIds } from '../src/data/practice/dp-2d.ts';

// ---------- independent oracles: enumeration only, no tables ----------
const subsets = <T>(a: T[]): T[][] => a.reduce<T[][]>((acc, x) => acc.concat(acc.map(s => [...s, x])), [[]]);
const subseqs = (s: string) => subsets(s.split('')).map(x => x.join(''));
const isSubseq = (small: string, big: string) => { let k = 0; for (const ch of big) if (k < small.length && ch === small[k]) k++; return k === small.length; };
const lcsBrute = (a: string, b: string) => Math.max(0, ...subseqs(a).filter(x => isSubseq(x, b)).map(x => x.length));
const isPal = (s: string) => s === s.split('').reverse().join('');
const lpsBrute = (s: string) => Math.max(0, ...subseqs(s).filter(isPal).map(x => x.length));
function everyRoute(m: number, n: number): [number, number][][] {
  const out: [number, number][][] = [];
  const moves = m + n - 2;
  for (let mask = 0; mask < 1 << moves; mask++) {
    let downs = 0; for (let k = 0; k < moves; k++) downs += (mask >> k) & 1;
    if (downs !== m - 1) continue;
    const cells: [number, number][] = [[0, 0]]; let r = 0, c = 0;
    for (let k = 0; k < moves; k++) { if ((mask >> k) & 1) r++; else c++; cells.push([r, c]); }
    out.push(cells);
  }
  return out;
}
const routesBrute = (m: number, n: number) => everyRoute(m, n).length;
const rockRoutesBrute = (g: number[][]) => everyRoute(g.length, g[0].length).filter(p => p.every(([r, c]) => g[r][c] === 0)).length;
const cheapestBrute = (g: number[][]) => Math.min(...everyRoute(g.length, g[0].length).map(p => p.reduce((s, [r, c]) => s + g[r][c], 0)));
function editBfs(a: string, b: string) {
  const letters = [...new Set((a + b).split(''))], cap = Math.max(a.length, b.length);
  const dist = new Map<string, number>([[a, 0]]), q = [a];
  for (let h = 0; h < q.length; h++) {
    const w = q[h], d = dist.get(w)!;
    if (w === b) return d;
    const next: string[] = [];
    for (let i = 0; i < w.length; i++) next.push(w.slice(0, i) + w.slice(i + 1));
    if (w.length < cap) for (let i = 0; i <= w.length; i++) for (const ch of letters) next.push(w.slice(0, i) + ch + w.slice(i));
    for (let i = 0; i < w.length; i++) for (const ch of letters) if (ch !== w[i]) next.push(w.slice(0, i) + ch + w.slice(i + 1));
    for (const x of next) if (!dist.has(x)) { dist.set(x, d + 1); q.push(x); }
  }
  throw new Error('unreachable');
}
const sumOf = (a: number[]) => a.reduce((x, y) => x + y, 0);
const canReach = (items: number[], s: number) => subsets(items).some(x => sumOf(x) === s);
const partitionBrute = (a: number[]) => subsets(a.map((_, i) => i)).some(idx => 2 * sumOf(idx.map(i => a[i])) === sumOf(a));
const combosBrute = (c: number[], left: number, k = 0): number => {
  if (k === c.length) return left === 0 ? 1 : 0;
  let ways = 0; for (let take = 0; take * c[k] <= left; take++) ways += combosBrute(c, left - take * c[k], k + 1);
  return ways;
};
const sequencesBrute = (c: number[], left: number): number => left === 0 ? 1 : c.filter(x => x <= left).reduce((s, x) => s + sequencesBrute(c, left - x), 0);
// every legal action sequence; returns the best cash per end-of-day situation
function tradeBrute(p: number[], days: number, cooldownOn: boolean) {
  const best = { hold: -Infinity, sold: -Infinity, rest: -Infinity };
  const go = (d: number, holding: boolean, soldToday: boolean, cash: number) => {
    if (d === days) { const key = holding ? 'hold' : soldToday ? 'sold' : 'rest'; best[key] = Math.max(best[key], cash); return; }
    go(d + 1, holding, false, cash);
    if (!holding && !(cooldownOn && soldToday)) go(d + 1, true, false, cash - p[d]);
    if (holding) go(d + 1, false, true, cash + p[d]);
  };
  go(0, false, false, 0);
  return best;
}
const cooldownBrute = (p: number[]) => { const b = tradeBrute(p, p.length, true); return Math.max(b.sold, b.rest); };
const unlimitedBrute = (p: number[]) => { const b = tradeBrute(p, p.length, false); return Math.max(b.sold, b.rest); };
const kTradesBrute = (p: number[], k: number) => {
  let best = 0;
  const go = (d: number, holding: boolean, left: number, cash: number) => {
    if (d === p.length) { if (!holding) best = Math.max(best, cash); return; }
    go(d + 1, holding, left, cash);
    if (!holding && left > 0) go(d + 1, true, left - 1, cash - p[d]);
    if (holding) go(d + 1, false, left, cash + p[d]);
  };
  go(0, false, k, 0);
  return best;
};
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const walkBrute = (g: number[][], r: number, c: number): number => 1 + Math.max(0, ...DIRS.map(([dr, dc]) => [r + dr, c + dc]).filter(([nr, nc]) => nr >= 0 && nc >= 0 && nr < g.length && nc < g[0].length && g[nr][nc] > g[r][c]).map(([nr, nc]) => walkBrute(g, nr, nc)));
const climbBrute = (g: number[][]) => Math.max(...g.flatMap((row, r) => row.map((_, c) => walkBrute(g, r, c))));
const burstBrute = (row: number[], wl = 1, wr = 1): number => row.length === 0 ? 0 : Math.max(...row.map((x, i) => (i > 0 ? row[i - 1] : wl) * x * (i + 1 < row.length ? row[i + 1] : wr) + burstBrute(row.filter((_, k) => k !== i), wl, wr)));
const distinctBrute = (s: string, t: string) => subsets(s.split('').map((_, i) => i)).filter(idx => idx.map(i => s[i]).join('') === t).length;
const targetBrute = (a: number[], target: number) => subsets(a.map((_, i) => i)).filter(plus => sumOf(a.map((x, i) => (plus.includes(i) ? x : -x))) === target).length;
function mazeBrute(g: number[][]) {
  // every simple path, depth-first, keeping the shortest that reaches the goal
  const R = g.length, C = g[0].length, seen = g.map(r => r.map(() => false));
  let best = Infinity;
  const go = (r: number, c: number, steps: number) => {
    if (r === R - 1 && c === C - 1) { best = Math.min(best, steps); return; }
    seen[r][c] = true;
    for (const [dr, dc] of DIRS) { const nr = r + dr, nc = c + dc; if (nr >= 0 && nc >= 0 && nr < R && nc < C && !g[nr][nc] && !seen[nr][nc]) go(nr, nc, steps + 1); }
    seen[r][c] = false;
  };
  if (!g[0][0]) go(0, 0, 0);
  return best === Infinity ? -1 : best;
}
const cells = (row: { cells: { value: string }[] }) => row.cells.map(c => c.value);
const nums = (row: { cells: { value: string }[] }) => cells(row).map(x => Number(x.replace('−', '-')));
const correct = (s: { answer: number; choices: { label: string }[] }) => s.choices[s.answer].label;
const Y = '✓', N = '·';

// ---------- figures ----------
test('every figure is well formed: square rows, arrows and tones inside the table', () => {
  for (const [name, f] of Object.entries(figures)) {
    assert.equal(f.cells.length, f.rows.length, name);
    for (const r of f.cells) assert.equal(r.length, f.cols.length, name);
    for (const a of f.arrows ?? []) for (const [r, c] of [a.from, a.to]) assert.ok(r >= 0 && c >= 0 && r < f.rows.length && c < f.cols.length, `${name} arrow`);
    for (const key of Object.keys(f.tones ?? {})) {
      assert.match(key, /^\d+,\d+$/, `${name} tone key "${key}"`);
      const [r, c] = key.split(',').map(Number);
      assert.ok(r < f.rows.length && c < f.cols.length, `${name} tone ${key}`);
    }
  }
});

test('figure numbers match brute force', () => {
  // Unique Paths 3 x 4
  figures.paths.cells.forEach((r, i) => r.forEach((v, j) => assert.equal(v, routesBrute(i + 1, j + 1))));
  // LCS of LBRCT / BLCRT, both figures
  for (const f of [figures.lcs, figures.lcsRoute]) {
    const a = f.rows.slice(1).join(''), b = f.cols.slice(1).join('');
    assert.equal(a, 'LBRCT'); assert.equal(b, 'BLCRT');
    f.cells.forEach((r, i) => r.forEach((v, j) => assert.equal(v, lcsBrute(a.slice(0, i), b.slice(0, j)), `lcs (${i}, ${j})`)));
  }
  // the route figure: arrows walk back from (5,5) to an edge; gold squares are the kept letters L, R, T
  {
    const f = figures.lcsRoute, a = 'LBRCT', b = 'BLCRT';
    const steps = f.arrows!;
    assert.deepEqual(steps[0].from, [5, 5]);
    for (let k = 1; k < steps.length; k++) assert.deepEqual(steps[k].from, steps[k - 1].to);
    const end = steps[steps.length - 1].to; assert.ok(end[0] === 0 || end[1] === 0);
    let kept = '';
    for (const s of steps) {
      const [i, j] = s.from, [x, y] = s.to;
      const value = f.cells[i][j] as number;
      if (x === i - 1 && y === j - 1 && a[i - 1] === b[j - 1]) { kept = a[i - 1] + kept; assert.equal(s.tone, 'gold'); assert.equal(f.tones![`${i},${j}`], 'gold'); }
      else { assert.notEqual(a[i - 1], b[j - 1]); assert.equal(f.cells[x][y], value, 'a non-match step keeps the value'); }
    }
    assert.equal(kept, 'LRT');
    assert.equal(kept.length, lcsBrute(a, b));
    // the ties: from (4, 4) up and left both hold 2
    assert.equal(f.cells[3][4], 2); assert.equal(f.cells[4][3], 2);
  }
  // Edit distance horse -> ros, and the highlighted script
  {
    const f = figures.edit, a = 'horse', b = 'ros';
    f.cells.forEach((r, i) => r.forEach((v, j) => assert.equal(v, editBfs(a.slice(0, i), b.slice(0, j)), `edit (${i}, ${j})`)));
    const route = [[5, 3], [4, 3], [3, 2], [2, 2], [1, 1], [0, 0]];
    for (const [i, j] of route) assert.equal(f.tones![`${i},${j}`], 'gold');
    // each step is a legal move whose cost accounts for the drop in value
    for (let k = 0; k + 1 < route.length; k++) {
      const [i, j] = route[k], [x, y] = route[k + 1];
      const free = x === i - 1 && y === j - 1 && a[i - 1] === b[j - 1];
      assert.equal((f.cells[i][j] as number) - (f.cells[x][y] as number), free ? 0 : 1);
    }
    assert.deepEqual([f.cells[4][2], f.cells[4][3], f.cells[5][2]], [3, 2, 4]);
  }
  // Partition [2, 3, 5]
  figures.partition.cells.forEach((r, i) => r.forEach((v, s) => assert.equal(v, canReach([2, 3, 5].slice(0, i), s) ? Y : N)));
  // Coin Change II [1, 2, 5]
  figures.coins.cells.forEach((r, i) => r.forEach((v, a) => assert.equal(v, combosBrute([1, 2, 5].slice(0, i), a))));
  // Cooldown lanterns for [1, 2, 3, 0, 2]
  {
    const p = [1, 2, 3, 0, 2];
    for (let d = 0; d < p.length; d++) {
      const b = tradeBrute(p, d + 1, true);
      ['hold', 'sold', 'rest'].forEach((k, r) => {
        const want = b[k as 'hold'] === -Infinity ? NEG : b[k as 'hold'];
        assert.equal(figures.cooldown.cells[r][d], want, `${k} day ${d}`);
      });
    }
    assert.equal(cooldownBrute(p), 3);
  }
  // Longest increasing path: memo values and the drawn climb
  {
    const g = figures.heights.cells as number[][];
    figures.climbs.cells.forEach((r, i) => r.forEach((v, j) => assert.equal(v, walkBrute(g, i, j))));
    const walk = [figures.heights.arrows![0].from, ...figures.heights.arrows!.map(a => a.to)];
    for (let k = 1; k < walk.length; k++) assert.ok(g[walk[k][0]][walk[k][1]] > g[walk[k - 1][0]][walk[k - 1][1]]);
    assert.equal(walk.length, climbBrute(g));
    assert.equal(climbBrute(g), 4);
  }
  // Burst Balloons: dp[i][j] = best for the balloons strictly between walls i and j
  {
    const v = [1, 3, 1, 5, 8, 1];
    assert.deepEqual(figures.burst.rows.map(r => Number(r.split(' · ')[1])), v);
    figures.burst.cells.forEach((r, i) => r.forEach((x, j) => {
      if (j <= i) assert.equal(x, null);
      else assert.equal(x, burstBrute(v.slice(i + 1, j), v[i], v[j]), `burst (${i}, ${j})`);
    }));
  }
  // Side quests
  {
    const g = [[0, 0, 0], [0, 1, 0], [0, 0, 0]];
    figures.rocks.cells.forEach((r, i) => r.forEach((v, j) => {
      const sub = g.slice(0, i + 1).map(row => row.slice(0, j + 1));
      const want = g[i][j] ? '0 ▲' : rockRoutesBrute(sub);
      assert.equal(v, want);
    }));
    const t = [[1, 3, 1], [1, 5, 1], [4, 2, 1]];
    figures.tolls.cells.forEach((r, i) => r.forEach((v, j) => assert.equal(v, cheapestBrute(t.slice(0, i + 1).map(row => row.slice(0, j + 1))))));
    const s = 'bbbab';
    figures.palindrome.cells.forEach((r, i) => r.forEach((v, j) => assert.equal(v, j < i ? null : lpsBrute(s.slice(i, j + 1)))));
  }
});

// ---------- traces ----------
test('every trace step has a valid answer and feedback for each choice', () => {
  for (const steps of [paths, lcs, edit, partition, coins, cooldown, climb, balloons, mixedReview]) for (const s of steps) {
    assert.ok(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length);
    for (const c of s.choices) assert.ok(c.feedback.length > 20, c.label);
  }
});

test('chapter 1 trace numbers', () => {
  assert.deepEqual(nums(paths[0].rows[0]), [1, 1, 1, 1]);
  assert.deepEqual(nums(paths[0].rows[1]).slice(0, 3), [routesBrute(2, 1), routesBrute(2, 2), routesBrute(2, 3)]);
  assert.equal(routesBrute(2, 4), 4);
  assert.match(correct(paths[0]), /^4: up \(1\) \+ left \(3\)/);
  // the rolling row, swept the right way, and the wrong way on a 3 x 3 grid
  const row = [1, 2, 3, 4]; for (let c = 1; c < 4; c++) row[c] += row[c - 1];
  assert.deepEqual(row, [1, 3, 6, 10]); assert.deepEqual(row, [1, 2, 3, 4].map((_, c) => routesBrute(3, c + 1)));
  const back = [1, 1, 1]; for (let r = 1; r < 3; r++) for (let c = 2; c >= 1; c--) back[c] += back[c - 1];
  assert.equal(back[2], 4); assert.equal(routesBrute(3, 3), 6);
  assert.match(paths[1].choices[1].feedback, /returns 4 instead of 6/);
});

test('chapter 2 trace numbers', () => {
  // AA vs A
  assert.equal(lcsBrute('AA', 'A'), 1); assert.equal(lcsBrute('A', 'A'), 1);
  assert.deepEqual(nums(lcs[0].rows[2]), [lcsBrute('A', ''), lcsBrute('A', 'A')]);
  assert.equal(nums(lcs[0].rows[3])[0], lcsBrute('AA', ''));
  assert.match(correct(lcs[0]), /^1: diagonal \+ 1/);
  // (4, 4) of LBRCT / BLCRT
  const a = 'LBRCT', b = 'BLCRT', at = (i: number, j: number) => lcsBrute(a.slice(0, i), b.slice(0, j));
  assert.deepEqual(nums(lcs[1].rows[0]), [0, 1, 2, 3, 4, 5].map(j => at(3, j)));
  assert.deepEqual(nums(lcs[1].rows[1]).slice(0, 4), [0, 1, 2, 3].map(j => at(4, j)));
  assert.equal(at(4, 4), 2); assert.equal(at(3, 3), 1);
  assert.match(correct(lcs[1]), /max\(up, left\) = 2/);
  assert.deepEqual(nums(lcs[2].rows[1]), [0, 1, 2, 3, 4, 5].map(j => at(4, j)));
  // both walks are longest routes
  for (const r of ['LRT', 'LCT']) { assert.ok(isSubseq(r, a) && isSubseq(r, b)); assert.equal(r.length, lcsBrute(a, b)); }
});

test('chapter 3 trace numbers', () => {
  const a = 'horse', b = 'ros', at = (i: number, j: number) => editBfs(a.slice(0, i), b.slice(0, j));
  assert.deepEqual(nums(edit[0].rows[0]), [0, 1, 2, 3].map(j => at(0, j)));
  assert.equal(at(1, 1), 1); assert.match(correct(edit[0]), /^1: replace/);
  assert.deepEqual(nums(edit[1].rows[0]), [0, 1, 2, 3].map(j => at(3, j)));
  assert.deepEqual(nums(edit[1].rows[1]).slice(0, 3), [0, 1, 2].map(j => at(4, j)));
  assert.equal(at(4, 3), 2); assert.match(correct(edit[1]), /^2:/);
  assert.deepEqual(nums(edit[2].rows[0]), [0, 1, 2, 3].map(j => at(4, j)));
  assert.deepEqual(nums(edit[2].rows[1]).slice(0, 3), [0, 1, 2].map(j => at(5, j)));
  assert.equal(at(5, 3), 3); assert.match(correct(edit[2]), /1 \+ up = 3/);
});

test('chapter 4 and 5 trace numbers', () => {
  assert.equal(sumOf([1, 2, 4]) % 2, 1); assert.equal(partitionBrute([1, 2, 4]), false);
  assert.equal(partitionBrute([1, 2, 5]), false);
  // the upward sweep of crate 1 fills every total, and the forwards version claims [1, 2, 5] splits
  const up = [true, false, false, false, false]; for (let s = 1; s <= 4; s++) up[s] = up[s] || up[s - 1];
  assert.ok(up.every(Boolean));
  const down = [true, false, false, false, false]; for (let s = 4; s >= 1; s--) down[s] = down[s] || down[s - 1];
  assert.deepEqual(down, [true, true, false, false, false]);
  assert.deepEqual(cells(partition[2].rows[0]), [0, 1, 2, 3, 4, 5].map(s => (canReach([2], s) ? Y : N)));
  assert.deepEqual(cells(partition[2].rows[1]).slice(0, 5), [0, 1, 2, 3, 4].map(s => (canReach([2, 3], s) ? Y : N)));
  assert.equal(canReach([2, 3], 5), true); assert.equal(canReach([2], 5), false);
  // coins
  assert.deepEqual(nums(coins[0].rows[0]), [0, 1, 2, 3, 4, 5].map(a => combosBrute([1], a)));
  assert.deepEqual(nums(coins[0].rows[1]).slice(0, 4), [0, 1, 2, 3].map(a => combosBrute([1, 2], a)));
  assert.equal(combosBrute([1, 2], 4), 3); assert.match(correct(coins[0]), /^3:/);
  assert.equal(combosBrute([1, 2], 3), 2); assert.equal(sequencesBrute([1, 2], 3), 3);
  const outside = [1, 0, 0, 0]; for (let a = 1; a <= 3; a++) for (const c of [1, 2]) if (a >= c) outside[a] += outside[a - c];
  assert.deepEqual(nums(coins[1].rows[1]), outside);
  const once = [1, 0, 0, 0]; for (const c of [1, 2]) for (let a = 3; a >= c; a--) once[a] += once[a - c];
  assert.equal(once[3], 1); assert.match(coins[2].choices[0].feedback, /only 1 way/);
  const reuse = [1, 0, 0, 0]; for (let a = 1; a <= 3; a++) reuse[a] += reuse[a - 1];
  assert.deepEqual(nums(coins[2].rows[1]), reuse);
});

test('chapter 6, 7 and 8 trace numbers', () => {
  const p = [1, 2, 3, 0, 2];
  const day2 = tradeBrute(p, 3, true), day3 = tradeBrute(p, 4, true), day4 = tradeBrute(p, 5, true);
  assert.deepEqual(nums(cooldown[0].rows[0]), [day2.hold, day2.sold, day2.rest]);
  assert.equal(day3.hold, 1); assert.match(correct(cooldown[0]), /^1:/);
  assert.deepEqual(nums(cooldown[1].rows[0]), [day4.hold, day4.sold, day4.rest]);
  assert.equal(Math.max(day4.sold, day4.rest), 3);
  assert.equal(unlimitedBrute(p), 4);
  // climb
  const g = [[9, 9, 4], [6, 6, 8], [2, 1, 1]];
  assert.deepEqual(climb[0].rows.map(nums), g);
  assert.equal(walkBrute(g, 1, 0), 2); assert.equal(walkBrute(g, 2, 0), 3); assert.equal(walkBrute(g, 1, 1), 2);
  assert.equal(walkBrute(g, 2, 1), 4); assert.match(correct(climb[2]), /^4:/);
  // balloons
  const v = [1, 3, 1, 5, 8, 1], best = (i: number, j: number) => burstBrute(v.slice(i + 1, j), v[i], v[j]);
  const cand = [1, 2, 3, 4].map(k => best(0, k) + v[0] * v[k] * v[5] + best(k, 5));
  assert.deepEqual(cand, [162, 52, 75, 167]);
  assert.deepEqual([best(0, 1), best(1, 5), best(0, 2), best(2, 5), best(0, 3), best(3, 5), best(0, 4), best(4, 5)], [0, 159, 3, 48, 30, 40, 159, 0]);
  assert.match(correct(balloons[1]), /167/);
  // filling i left to right reads unfilled squares
  const dp = v.map(() => v.map(() => 0));
  for (let i = 0; i < 6; i++) for (let j = i + 2; j < 6; j++) for (let k = i + 1; k < j; k++) dp[i][j] = Math.max(dp[i][j], dp[i][k] + v[i] * v[k] * v[j] + dp[k][j]);
  assert.equal(dp[0][5], 63); assert.match(balloons[2].choices[1].feedback, /returns 63 instead of 167/);
});

test('mixed review numbers', () => {
  // greedy biggest-first on [3, 3, 2, 2, 2], T = 7
  let left = 7; for (const x of [3, 3, 2, 2, 2]) if (x <= left) left -= x;
  assert.equal(left, 1); assert.ok(canReach([3, 3, 2, 2, 2], 7));
  // smallest-first bursting on [3, 1, 5, 8]
  let row = [3, 1, 5, 8], total = 0;
  while (row.length) { const i = row.indexOf(Math.min(...row)); total += (row[i - 1] ?? 1) * row[i] * (row[i + 1] ?? 1); row = row.filter((_, k) => k !== i); }
  assert.equal(total, 78); assert.equal(burstBrute([3, 1, 5, 8]), 167);
  // prose numbers: the clerk's 9 orderings, the binomial formula, greedy tolls, a pre-filled top row past a rock
  assert.equal(sequencesBrute([1, 2, 5], 5), 9); assert.equal(combosBrute([1, 2, 5], 5), 4);
  assert.equal(routesBrute(3, 7), 28); assert.equal(8 * 7 / 2, 28);
  { const g = [[1, 3, 1], [1, 5, 1], [4, 2, 1]]; let r = 0, c = 0, s = g[0][0];
    while (r < 2 || c < 2) { if (r === 2) c++; else if (c === 2) r++; else if (g[r + 1][c] <= g[r][c + 1]) r++; else c++; s += g[r][c]; }
    assert.equal(s, 9); assert.equal(cheapestBrute(g), 7); }
  { const g = [[0, 1, 0], [0, 0, 0]]; assert.equal(rockRoutesBrute(g), 1);
    const dp = [[1, 1, 1], [1, 0, 0]]; for (let c = 1; c < 3; c++) dp[1][c] = (g[0][c] ? 0 : dp[0][c]) + dp[1][c - 1];
    assert.equal(dp[1][2], 2); }
  assert.equal(distinctBrute('babgba', 'bag'), 1); assert.equal(distinctBrute('babgba', 'ba'), 4); assert.equal(distinctBrute('babgbag', 'bag'), 5);
  // delete-only distance = n + m − 2 LCS
  for (const [a, b] of [['sea', 'eat'], ['leetcode', 'etco']]) {
    let bestKeep = 0; for (const x of subseqs(a)) if (isSubseq(x, b)) bestKeep = Math.max(bestKeep, x.length);
    assert.equal(a.length + b.length - 2 * bestKeep, a === 'sea' ? 2 : 4);
  }
});

test('every hint ladder referenced by the lesson exists with three hints', async () => {
  const { readFileSync } = await import('node:fs');
  const mdx = readFileSync(new URL('../src/dsa-lessons/dp-2d.mdx', import.meta.url), 'utf8');
  const used = [...mdx.matchAll(/hints=\{hints\.(\w+)\}/g)].map(m => m[1]);
  assert.ok(used.length >= 14);
  for (const key of used) assert.equal(hints[key]?.length, 3, key);
  for (const key of Object.keys(hints)) assert.ok(used.includes(key), `unused hint ${key}`);
  for (const key of Object.keys(figures)) assert.ok(mdx.includes(`figures.${key}`), `unused figure ${key}`);
});

// ---------- lab ----------
type Oracle = (start: DpState, final: DpState) => void;
const oracles: Record<string, Oracle> = {
  lcs: (s, f) => {
    f.dp.forEach((r, i) => r.forEach((v, j) => assert.equal(v, lcsBrute(s.a.slice(0, i), s.b.slice(0, j)))));
    assert.equal(f.route.length, lcsBrute(s.a, s.b));
    assert.ok(isSubseq(f.route, s.a) && isSubseq(f.route, s.b), `route ${f.route}`);
  },
  edit: (s, f) => f.dp.forEach((r, i) => r.forEach((v, j) => assert.equal(v, editBfs(s.a.slice(0, i), s.b.slice(0, j))))),
  knap: (s, f) => {
    assert.equal(f.answer, partitionBrute(s.nums));
    if (s.total % 2 === 0) f.row.forEach((v, t) => assert.equal(v, canReach(s.nums, t), `dp[${t}]`));
  },
};
function runCase(start: DpState) {
  const { final, wrongMovesChangedBoard } = solveLab(lab, start, 3000);
  assert.equal(final.done, true, `${start.mode} must terminate`);
  assert.equal(wrongMovesChangedBoard, false, `${start.mode}: a wrong move changed the board`);
  oracles[start.mode](start, final);
  return final;
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
          assert.doesNotMatch(result.state.message, /undefined|NaN|\[object|Infinity/, `${mode} case ${v}: ${action}`);
          assert.ok(result.state.message.length > 15, `${mode} case ${v}: ${action} needs an explanation`);
        }
      }
      for (const text of [lab.describe(state), ...lab.view(state).flatMap(r => r.cells.map(c => `${c.value} ${c.label ?? ''}`))])
        assert.doesNotMatch(text, /undefined|NaN|Infinity/, `${mode} case ${v}`);
      if (state.done) break;
      state = lab.move(state, lab.expected(state)).state;
      assert.doesNotMatch(state.message, /undefined|NaN|Infinity/);
    }
    assert.equal(state.done, true);
  }
});

test('lab agrees with brute force on random small inputs, including either choice at ties', () => {
  let seed = 15; const rnd = (n: number) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
  const word = (max: number, letters: string) => Array.from({ length: rnd(max + 1) }, () => letters[rnd(letters.length)]).join('');
  for (let t = 0; t < 150; t++) {
    runCase({ ...lab.create('lcs'), ...fromInput({ mode: 'lcs', a: word(5, 'abc'), b: word(5, 'abc') }) });
    runCase({ ...lab.create('edit'), ...fromInput({ mode: 'edit', a: word(4, 'abc'), b: word(4, 'abc') }) });
    runCase({ ...lab.create('knap'), ...fromInput({ mode: 'knap', nums: Array.from({ length: 1 + rnd(5) }, () => 1 + rnd(7)) }) });
  }
  // walking LEFT at every tie still yields a longest common route
  for (let t = 0; t < 100; t++) {
    let s: DpState = { ...lab.create('lcs'), ...fromInput({ mode: 'lcs', a: word(5, 'ab'), b: word(5, 'ab') }) };
    const start = s;
    for (let guard = 0; !s.done && guard < 200; guard++) {
      const tie = lab.move(s, 'walk-left');
      s = tie.accepted ? tie.state : lab.move(s, lab.expected(s)).state;
    }
    oracles.lcs(start, s);
  }
});

test('the lab catches the classic bugs with the board numbers', () => {
  // knapsack: sweeping crate 1 upwards on [1, 2, 5]
  let k = lab.move(lab.create('knap', 0), 'half').state;
  const up = lab.move(k, 'up');
  assert.equal(up.accepted, false);
  assert.match(up.state.message, /dp\[2\] would read dp\[1\]/);
  // odd total
  assert.match(lab.move(lab.create('knap', 3), 'half').state.message, /odd/);
  // LCS: max on a match, diag on a mismatch
  const aa = lab.create('lcs', 1);                         // AA vs A, first square A = A
  assert.match(lab.move(aa, 'max').state.message, /diagonal 0 \+ 1 = 1/);
  const first = lab.create('lcs', 0);                      // L vs B
  assert.match(lab.move(first, 'diag').state.message, /L ≠ B/);
  // edit: a free copy on a mismatch
  assert.match(lab.move(lab.create('edit', 0), 'free').state.message, /h ≠ r/);
});

// ---------- practice ----------
function arrays(prompt: string) { return [...prompt.matchAll(/\[([^\]]*)\]/g)].map(m => (m[1].trim() === '' ? [] : m[1].split(',').map(x => Number(x.trim().replace('−', '-'))))); }
function num(prompt: string, re: RegExp) { const m = prompt.match(re); assert.ok(m, `${re} in ${prompt}`); return Number(m![1].replace('−', '-')); }
function quoted(prompt: string) { return [...prompt.matchAll(/"([^"]*)"/g)].map(m => m[1]); }
function blockedGrid(prompt: string, rows: number, cols: number, after: RegExp) {
  const g = Array.from({ length: rows }, () => Array(cols).fill(0));
  const tail = prompt.slice(prompt.search(after));
  for (const m of tail.matchAll(/\((\d+), (\d+)\)/g)) g[Number(m[1])][Number(m[2])] = 1;
  return g;
}

test('every practice answer matches an independent computation from the prompt', () => {
  assert.equal(practice.storageKey, 'citadel-dp-2d-review-v1');
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
      assert.doesNotMatch(c.prompt, /dynamic|\bdp\b|table|memo|knapsack|recurrence|state machine|interval|breadth|greedy|subsequence/i, `${id}: the prompt must not name the technique`);
      const a = arrays(c.prompt)[0] ?? [];
      let expected: number | boolean;
      switch (id) {
        case 'grid-paths': expected = routesBrute(num(c.prompt, /(\d+) rows/), num(c.prompt, /(\d+) columns/)); break;
        case 'lcs': { const [x, y] = quoted(c.prompt); expected = lcsBrute(x, y); break; }
        case 'edit': { const [x, y] = quoted(c.prompt); expected = editBfs(x, y); break; }
        case 'partition': expected = partitionBrute(a); break;
        case 'coin-ways': expected = combosBrute(a, num(c.prompt, /pay exactly (\d+)/)); break;
        case 'cooldown': expected = cooldownBrute(a); break;
        case 'increasing-path': expected = climbBrute(arrays(c.prompt)); break;
        case 'balloons': expected = burstBrute(a); break;
        case 'obstacles': expected = rockRoutesBrute(blockedGrid(c.prompt, num(c.prompt, /(\d+) rows/), num(c.prompt, /(\d+) columns/), /rocks on/)); break;
        case 'min-path': expected = cheapestBrute(arrays(c.prompt)); break;
        case 'palindrome': expected = lpsBrute(quoted(c.prompt)[0]); break;
        case 'distinct': { const [s, t] = quoted(c.prompt); expected = distinctBrute(s, t); break; }
        case 'target-sum': expected = targetBrute(a, num(c.prompt, /give exactly (-?\d+)/)); break;
        case 'k-trades': expected = kTradesBrute(a, num(c.prompt, /at most (\d+) trade/)); break;
        case 'maze': expected = mazeBrute(blockedGrid(c.prompt, num(c.prompt, /(\d+) rows/), num(c.prompt, /(\d+) columns/), /walls on/)); break;
        case 'free-trading': expected = unlimitedBrute(a); break;
        default: throw new Error(`untested concept ${id}`);
      }
      assert.deepEqual(c.answer, expected, `${id} variant ${variant}: ${c.prompt}`);
      const typed = typeof expected === 'boolean' ? (expected ? 'yes' : 'no') : String(expected);
      assert.equal(answerMatches(c, typed), true, `${id} variant ${variant}: ${typed}`);
      assert.equal(answerMatches(c, 'not an answer'), false);
      assert.equal(c.hints.length, 3); assert.equal(c.rubric.length, 3);
    }
    assert.ok(prompts.size >= 2, `${id}: the input must vary with the variant`);
  }
  assert.ok(strategiesUsed.size >= 6);
});
