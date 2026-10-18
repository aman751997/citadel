import test from 'node:test';
import assert from 'node:assert/strict';
import { lastVar, type Frame } from '../src/lib/dryrun.ts';
import * as f from '../src/data/dp-2d/frames.ts';

// Deterministic PRNG so failures reproduce.
let seed = 23;
const rnd = (n: number) => { seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff; return seed % n; };
const arr = (len: number, max: number, min = 0) => Array.from({ length: len }, () => min + rnd(max - min + 1));
const str = (len: number, alpha: string) => Array.from({ length: len }, () => alpha[rnd(alpha.length)]).join('');
const mat = (r: number, c: number, max: number) => Array.from({ length: r }, () => arr(c, max));
const ans = (frames: Frame[]) => lastVar(frames, 'answer')!;

// ---- brute-force oracles: plain recursion or enumeration, no tables ----
const routes = (m: number, n: number): number => (m === 1 || n === 1 ? 1 : routes(m - 1, n) + routes(m, n - 1));
const subsets = <T>(a: T[]): T[][] => a.reduce<T[][]>((acc, x) => acc.concat(acc.map(s => [...s, x])), [[]]);
const isSubseq = (small: string, big: string) => { let k = 0; for (const ch of big) if (k < small.length && ch === small[k]) k++; return k === small.length; };
const lcsBrute = (a: string, b: string) => Math.max(...subsets([...a]).map(x => x.join('')).filter(x => isSubseq(x, b)).map(x => x.length));
const lpsBrute = (s: string) => Math.max(...subsets([...s]).map(x => x.join('')).filter(x => x === [...x].reverse().join('')).map(x => x.length));
const editBrute = (a: string, b: string): number => (!a ? b.length : !b ? a.length : a.at(-1) === b.at(-1) ? editBrute(a.slice(0, -1), b.slice(0, -1))
  : 1 + Math.min(editBrute(a.slice(0, -1), b.slice(0, -1)), editBrute(a.slice(0, -1), b), editBrute(a, b.slice(0, -1))));
const countCombos = (coins: number[], amount: number): number => (amount === 0 ? 1 : coins.length === 0 || amount < 0 ? 0 : countCombos(coins, amount - coins[0]) + countCombos(coins.slice(1), amount));
const canMake = (nums: number[], target: number) => subsets(nums).some(s => s.reduce((x, y) => x + y, 0) === target);
const signs = (nums: number[], target: number): number => (nums.length === 0 ? (target === 0 ? 1 : 0) : signs(nums.slice(1), target - nums[0]) + signs(nums.slice(1), target + nums[0]));
const distinctBrute = (s: string, t: string): number => (t === '' ? 1 : s === '' ? 0 : distinctBrute(s.slice(1), t) + (s[0] === t[0] ? distinctBrute(s.slice(1), t.slice(1)) : 0));
const pathCost = (g: number[][], i: number, j: number): number => (i === 0 && j === 0 ? g[0][0] : g[i][j] + Math.min(i > 0 ? pathCost(g, i - 1, j) : Infinity, j > 0 ? pathCost(g, i, j - 1) : Infinity));
const rockRoutes = (g: number[][], i: number, j: number): number => (g[i][j] === 1 ? 0 : i === 0 && j === 0 ? 1 : (i > 0 ? rockRoutes(g, i - 1, j) : 0) + (j > 0 ? rockRoutes(g, i, j - 1) : 0));
const burstBrute = (a: number[]): number => Math.max(0, ...a.map((x, i) => (a[i - 1] ?? 1) * x * (a[i + 1] ?? 1) + burstBrute([...a.slice(0, i), ...a.slice(i + 1)])));
const cooldownBrute = (p: number[], i = 0, holding = false, cool = false): number => {
  if (i === p.length) return 0;
  const wait = cooldownBrute(p, i + 1, holding, false);
  if (holding) return Math.max(wait, p[i] + cooldownBrute(p, i + 1, false, true));
  return cool ? wait : Math.max(wait, -p[i] + cooldownBrute(p, i + 1, true, false));
};
const kBrute = (p: number[], k: number, i = 0, holding = false): number => {
  if (i === p.length || k === 0 && !holding) return 0;
  const wait = kBrute(p, k, i + 1, holding);
  if (holding) return Math.max(wait, p[i] + kBrute(p, k - 1, i + 1, false));
  return Math.max(wait, -p[i] + kBrute(p, k, i + 1, true));
};
function climbBrute(m: number[][]): number {
  const walk = (r: number, c: number): number => Math.max(1, ...[[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dr, dc]) => {
    const nr = r + dr, nc = c + dc;
    return nr >= 0 && nr < m.length && nc >= 0 && nc < m[0].length && m[nr][nc] > m[r][c] ? 1 + walk(nr, nc) : 1;
  }));
  return Math.max(...m.flatMap((row, r) => row.map((_, c) => walk(r, c))));
}

test('every generator frame has a caption and a view; predict answers are in range', () => {
  const all = [f.pathsFrames(3, 4), f.pathsMemoFrames(3, 3), f.lcsFrames('abcde', 'ace'), f.editFrames('horse', 'ros'), f.partitionFrames([2, 3, 5]), f.partitionFrames([1, 2, 4]),
    f.subsetRowFrames([1, 2, 5], 4, 'down'), f.subsetRowFrames([1, 2, 5], 4, 'up'), f.coinsFrames(5, [1, 2, 5]), f.cooldownFrames([1, 2, 3, 0, 2]),
    f.climbFrames([[9, 9, 4], [6, 6, 8], [2, 1, 1]]), f.balloonsFrames([3, 1, 5, 8]), f.obstaclesFrames([[0, 0, 0], [0, 1, 0], [0, 0, 0]]),
    f.minPathFrames([[1, 3, 1], [1, 5, 1], [4, 2, 1]]), f.palindromeFrames('bbbab'), f.distinctFrames('babgbag', 'bag'), f.targetSumFrames([1, 1, 2, 3], 1),
    f.targetSumFrames([1, 2], 10), f.kTradesFrames(2, [3, 2, 6, 5, 0, 3])];
  for (const frames of all) {
    assert.ok(frames.length >= 2);
    for (const fr of frames) {
      assert.ok(fr.caption.length > 10 && fr.views.length > 0);
      if (fr.predict) { assert.ok(fr.predict.answer >= 0 && fr.predict.answer < fr.predict.options.length); assert.equal(new Set(fr.predict.options).size, fr.predict.options.length); }
    }
  }
});

test('pathsFrames and pathsMemoFrames vs recursive route count, including 1-wide grids', () => {
  for (let t = 0; t < 60; t++) {
    const m = 1 + rnd(5), n = 1 + rnd(5);
    assert.equal(ans(f.pathsFrames(m, n)), String(routes(m, n)), `${m}x${n}`);
    assert.equal(ans(f.pathsMemoFrames(m, n)), String(routes(m, n)), `${m}x${n}`);
  }
  assert.equal(lastVar(f.pathsMemoFrames(3, 3), 'hits'), '1');
});

test('lcsFrames: length matches subsequence enumeration; the read-back string is a real common subsequence of that length', () => {
  for (let t = 0; t < 300; t++) {
    const a = str(1 + rnd(6), 'abc'), b = str(1 + rnd(6), 'abc'), frames = f.lcsFrames(a, b);
    const len = lcsBrute(a, b), sub = lastVar(frames, 'subsequence')!;
    assert.equal(ans(frames), String(len), `${a}/${b}`);
    assert.equal(sub.length, len);
    assert.ok(isSubseq(sub, a) && isSubseq(sub, b), `${a}/${b}/${sub}`);
  }
  assert.equal(ans(f.lcsFrames('aa', 'a')), '1');
  assert.equal(ans(f.lcsFrames('abc', 'def')), '0');
});

test('editFrames: distance matches recursion; replaying the script on a gives b with exactly that many edits', () => {
  for (let t = 0; t < 300; t++) {
    const a = str(rnd(6), 'abc'), b = str(rnd(6), 'abc'), frames = f.editFrames(a, b);
    const d = editBrute(a, b);
    assert.equal(ans(frames), String(d), `${a}/${b}`);
    const ops = JSON.parse(lastVar(frames, 'script')!) as string[];
    let out = '', i = 0, cost = 0;
    for (const op of ops) {
      const [name, rest] = op.split(' ');
      if (name === 'keep') { assert.equal(a[i], rest); out += rest; i++; }
      else if (name === 'replace') { assert.equal(a[i], rest[0]); out += rest[3]; i++; cost++; }
      else if (name === 'delete') { assert.equal(a[i], rest); i++; cost++; }
      else { out += rest; cost++; }
    }
    assert.equal(i, a.length); assert.equal(out, b); assert.equal(cost, d);
  }
  assert.equal(ans(f.editFrames('', '')), '0');
  assert.equal(ans(f.editFrames('ab', 'b')), '1');
});

test('partitionFrames (table) and subsetRowFrames (down) vs subset enumeration; the upward sweep is the unbounded variant', () => {
  for (let t = 0; t < 300; t++) {
    const nums = arr(1 + rnd(6), 7, 1), total = nums.reduce((x, y) => x + y, 0);
    const want = total % 2 === 0 && canMake(nums, total / 2);
    assert.equal(ans(f.partitionFrames(nums)), String(want), JSON.stringify(nums));
    if (total % 2 === 0) {
      assert.equal(ans(f.subsetRowFrames(nums, total / 2, 'down')), String(want), JSON.stringify(nums));
      const reuse = Array.from({ length: total / 2 + 1 }, (_, s) => s === 0);
      for (let s = 1; s <= total / 2; s++) reuse[s] = nums.some(w => w <= s && reuse[s - w]);
      assert.equal(ans(f.subsetRowFrames(nums, total / 2, 'up')), String(reuse[total / 2]), JSON.stringify(nums));
    }
  }
  assert.equal(ans(f.subsetRowFrames([1, 2, 5], 4, 'down')), 'false');
  assert.equal(ans(f.subsetRowFrames([1, 2, 5], 4, 'up')), 'true');
  assert.equal(ans(f.partitionFrames([1, 2, 4])), 'false');
});

test('coinsFrames vs recursive combination count', () => {
  for (let t = 0; t < 200; t++) {
    const coins = [...new Set(arr(1 + rnd(3), 6, 1))], amount = rnd(10);
    assert.equal(ans(f.coinsFrames(amount, coins)), String(countCombos(coins, amount)), `${amount} ${coins}`);
  }
  assert.equal(ans(f.coinsFrames(3, [2])), '0');
  assert.equal(ans(f.coinsFrames(0, [7])), '1');
});

test('cooldownFrames vs exhaustive buy/sell/wait recursion, including a single day', () => {
  for (let t = 0; t < 300; t++) {
    const p = arr(1 + rnd(7), 6);
    assert.equal(ans(f.cooldownFrames(p)), String(cooldownBrute(p)), JSON.stringify(p));
  }
  assert.equal(ans(f.cooldownFrames([1, 2, 3, 0, 2])), '3');
});

test('climbFrames vs unmemoised walk recursion', () => {
  for (let t = 0; t < 100; t++) {
    const m = mat(1 + rnd(3), 1 + rnd(3), 5);
    assert.equal(ans(f.climbFrames(m)), String(climbBrute(m)), JSON.stringify(m));
  }
  assert.equal(ans(f.climbFrames([[1, 1]])), '1');
});

test('balloonsFrames vs try-every-first-burst recursion', () => {
  for (let t = 0; t < 120; t++) {
    const a = arr(1 + rnd(5), 6, 1);
    assert.equal(ans(f.balloonsFrames(a)), String(burstBrute(a)), JSON.stringify(a));
  }
  assert.equal(ans(f.balloonsFrames([3, 1, 5, 8])), '167');
});

test('obstaclesFrames and minPathFrames vs recursion', () => {
  for (let t = 0; t < 150; t++) {
    const m = 1 + rnd(4), n = 1 + rnd(4), g = Array.from({ length: m }, () => Array.from({ length: n }, () => (rnd(4) === 0 ? 1 : 0)));
    assert.equal(ans(f.obstaclesFrames(g)), String(rockRoutes(g, m - 1, n - 1)), JSON.stringify(g));
    const tolls = mat(m, n, 9);
    assert.equal(ans(f.minPathFrames(tolls)), String(pathCost(tolls, m - 1, n - 1)), JSON.stringify(tolls));
  }
  assert.equal(ans(f.obstaclesFrames([[0, 1, 0], [0, 0, 0]])), '1');
  assert.equal(ans(f.obstaclesFrames([[1]])), '0');
});

test('palindromeFrames vs subsequence enumeration; distinctFrames vs recursion', () => {
  for (let t = 0; t < 200; t++) {
    const s = str(1 + rnd(8), 'abc');
    assert.equal(ans(f.palindromeFrames(s)), String(lpsBrute(s)), s);
    const text = str(rnd(8), 'ab'), pat = str(1 + rnd(3), 'ab');
    assert.equal(ans(f.distinctFrames(text, pat)), String(distinctBrute(text, pat)), `${text}/${pat}`);
  }
  assert.equal(ans(f.palindromeFrames('a')), '1');
  assert.equal(ans(f.distinctFrames('babgbag', 'bag')), '5');
});

test('targetSumFrames vs trying every sign, with zeros, odd totals and unreachable targets', () => {
  for (let t = 0; t < 300; t++) {
    const nums = arr(1 + rnd(6), 4), target = rnd(15) - 7;
    assert.equal(ans(f.targetSumFrames(nums, target)), String(signs(nums, target)), `${nums} ${target}`);
  }
  assert.equal(ans(f.targetSumFrames([1, 1, 1, 1, 1], 3)), '5');
  assert.equal(ans(f.targetSumFrames([0, 0, 1], 1)), '4');
  assert.equal(ans(f.targetSumFrames([1, 1, 1, 1, 1], -3)), '5');
});

test('kTradesFrames vs exhaustive trade recursion, including k >= n/2', () => {
  for (let t = 0; t < 300; t++) {
    const p = arr(1 + rnd(7), 6), k = 1 + rnd(3);
    assert.equal(ans(f.kTradesFrames(k, p)), String(kBrute(p, k)), `${k} ${p}`);
  }
  assert.equal(ans(f.kTradesFrames(2, [3, 2, 6, 5, 0, 3])), '7');
  assert.equal(ans(f.kTradesFrames(1, [3, 2, 6, 5, 0, 3])), '4');
});
