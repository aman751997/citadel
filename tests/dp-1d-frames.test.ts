import test from 'node:test';
import assert from 'node:assert/strict';
import { lastVar } from '../src/lib/dryrun.ts';
import type { Frame } from '../src/lib/dryrun.ts';
import { climbFrames, minCostFrames, robFrames, robCircleFrames, decodeFrames, coinFrames, wordBreakFrames, lisFrames, lisTailsFrames, longestPalFrames, countPalFrames, earnFrames, squaresFrames, partitionFrames, countLisFrames, kStepsFrames, ticketsFrames } from '../src/data/dp-1d/frames.ts';

let seed = 20261018;
const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
const list = (len: number, lo: number, hi: number) => Array.from({ length: len }, () => lo + rnd(hi - lo + 1));
const answer = (f: Frame[]) => lastVar(f, 'answer')!;
const run = (n: number, body: () => void) => { for (let t = 0; t < n; t++) body(); };

function wellFormed(f: Frame[]) {
  assert.ok(f.length >= 2);
  for (const fr of f) {
    assert.ok(fr.caption.length > 10 && fr.views.length > 0);
    if (fr.predict) {
      assert.ok(fr.predict.options.length >= 2);
      assert.equal(new Set(fr.predict.options).size, fr.predict.options.length, fr.predict.question);
      assert.ok(fr.predict.answer >= 0 && fr.predict.answer < fr.predict.options.length);
    }
  }
}

// ---- brute-force oracles: enumeration or search, never the lesson's recurrence ----
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
function coinsBfs(coinList: number[], amount: number) {
  const dist = new Map<number, number>([[0, 0]]), queue = [0];
  while (queue.length) {
    const x = queue.shift()!;
    if (x === amount) return dist.get(x)!;
    for (const c of coinList) if (x + c <= amount && !dist.has(x + c)) { dist.set(x + c, dist.get(x)! + 1); queue.push(x + c); }
  }
  return -1;
}
const wordBrute = (s: string, dict: string[]): boolean => s === '' || dict.some(w => s.startsWith(w) && wordBrute(s.slice(w.length), dict));
function lisBrute(a: number[]) {
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
function earnGame(bag: number[], seen = new Map<string, number>()): number {
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

test('climbing stairs', () => {
  for (let n = 1; n <= 20; n++) { const f = climbFrames(n); wellFormed(f); assert.equal(answer(f), String(countSeq(n, 2)), `n = ${n}`); }
});

test('min cost climbing stairs', () => {
  run(200, () => {
    const cost = list(2 + rnd(8), 0, 20);
    const f = minCostFrames(cost); wellFormed(f);
    assert.equal(answer(f), String(minCostBrute(cost)), cost.join());
  });
  assert.equal(answer(minCostFrames([10, 15, 20])), '15');
  assert.equal(answer(minCostFrames([1, 100, 1, 1, 1, 100, 1, 1, 100, 1])), '6');
  assert.equal(answer(minCostFrames([0, 0])), '0');
});

test('house robber and the ring', () => {
  run(200, () => {
    const a = list(1 + rnd(8), 0, 9);
    const f = robFrames(a); wellFormed(f);
    assert.equal(answer(f), String(robBrute(a)), a.join());
    const g = robCircleFrames(a); wellFormed(g);
    assert.equal(answer(g), String(robBrute(a, true)), `ring ${a.join()}`);
  });
  assert.equal(answer(robFrames([2, 1, 1, 2])), '4');
  assert.equal(answer(robCircleFrames([7])), '7');
  assert.equal(answer(robCircleFrames([2, 7, 9, 3, 1])), '11');
  assert.equal(answer(robCircleFrames([1, 2])), '2');
});

test('decode ways', () => {
  run(300, () => {
    const s = Array.from({ length: 1 + rnd(8) }, () => String(rnd(10) < 3 ? 0 : 1 + rnd(9)) ).join('');
    const f = decodeFrames(s); wellFormed(f);
    assert.equal(answer(f), String(decodeBrute(s)), s);
  });
  for (const [s, n] of [['0', 0], ['06', 0], ['10', 1], ['27', 1], ['100', 0], ['226', 3], ['11106', 2], ['12', 2]] as [string, number][]) assert.equal(answer(decodeFrames(s)), String(n), s);
});

test('coin change', () => {
  run(300, () => {
    const pool = [1, 2, 3, 4, 5, 6, 7];
    const coins = pool.filter(() => rnd(3) === 0);
    if (!coins.length) coins.push(2 + rnd(5));
    const amount = rnd(14);
    const f = coinFrames(coins, amount); wellFormed(f);
    assert.equal(answer(f), String(coinsBfs(coins, amount)), `${coins.join()} -> ${amount}`);
  });
  assert.equal(answer(coinFrames([2], 3)), '-1');
  assert.equal(answer(coinFrames([1, 3, 4], 6)), '2');
  assert.equal(answer(coinFrames([5], 0)), '0');
});

test('word break', () => {
  run(300, () => {
    const dict = Array.from({ length: 1 + rnd(3) }, () => Array.from({ length: 1 + rnd(3) }, () => 'ab'[rnd(2)]).join(''));
    const s = Array.from({ length: 1 + rnd(8) }, () => 'ab'[rnd(2)]).join('');
    const f = wordBreakFrames(s, dict); wellFormed(f);
    assert.equal(answer(f), String(wordBrute(s, dict)), `${s} / ${dict.join()}`);
  });
  assert.equal(answer(wordBreakFrames('praysong', ['pray', 'prays', 'song'])), 'true');
  assert.equal(answer(wordBreakFrames('abc', ['a', 'abc', 'b'])), 'true');
  assert.equal(answer(wordBreakFrames('cars', ['car', 'ca', 'rs'])), 'true');
  assert.equal(answer(wordBreakFrames('catsandog', ['cats', 'dog', 'sand', 'and', 'cat'])), 'false');
});

test('longest increasing subsequence: table, tails and counting', () => {
  run(300, () => {
    const a = list(1 + rnd(9), 0, 6);
    const { best, count } = lisBrute(a);
    const f = lisFrames(a); wellFormed(f);
    assert.equal(answer(f), String(best), a.join());
    const g = lisTailsFrames(a); wellFormed(g);
    assert.equal(answer(g), String(best), `tails ${a.join()}`);
    const h = countLisFrames(a); wellFormed(h);
    assert.equal(answer(h), String(count), `count ${a.join()}`);
  });
  assert.equal(answer(lisFrames([1, 3, 2, 0])), '2');
  assert.equal(answer(lisTailsFrames([3, 4, 1])), '2');
  assert.equal(answer(lisTailsFrames([7, 7, 7, 7])), '1');
  assert.equal(answer(countLisFrames([2, 2, 2, 2, 2])), '5');
  assert.equal(answer(countLisFrames([1, 3, 5, 4, 7])), '2');
  assert.equal(answer(lisFrames([5])), '1');
});

test('palindromes by centres', () => {
  run(300, () => {
    const s = Array.from({ length: 1 + rnd(9) }, () => 'abc'[rnd(rnd(2) ? 3 : 2)]).join('');
    const { longest, count } = palBrute(s);
    const f = longestPalFrames(s); wellFormed(f);
    const got = answer(f);
    assert.equal(got.length, longest, s);
    assert.ok(isPal(got) && s.includes(got), `${s} -> ${got}`);
    const g = countPalFrames(s); wellFormed(g);
    assert.equal(answer(g), String(count), s);
  });
  assert.equal(answer(longestPalFrames('cbbd')), 'bb');
  assert.equal(answer(countPalFrames('aaa')), '6');
  assert.equal(answer(countPalFrames('abba')), '6');
  assert.equal(answer(longestPalFrames('a')), 'a');
});

test('delete and earn', () => {
  run(200, () => {
    const a = list(1 + rnd(7), 1, 6);
    const f = earnFrames(a); wellFormed(f);
    assert.equal(answer(f), String(earnGame(a)), a.join());
  });
  assert.equal(answer(earnFrames([2, 2, 3, 3, 3, 4])), '9');
  assert.equal(answer(earnFrames([3, 4, 2])), '6');
  assert.equal(answer(earnFrames([1])), '1');
});

test('perfect squares', () => {
  for (let n = 1; n <= 40; n++) { const f = squaresFrames(n); wellFormed(f); assert.equal(answer(f), String(squaresBfs(n)), `n = ${n}`); }
});

test('partition: backwards is right, forwards reuses a number', () => {
  run(200, () => {
    const a = list(1 + rnd(4), 1, 6);
    const f = partitionFrames(a); wellFormed(f);
    assert.equal(answer(f), String(partitionBrute(a)), a.join());
  });
  assert.equal(answer(partitionFrames([1, 2, 5])), 'false');
  assert.equal(answer(partitionFrames([3, 1, 2, 2])), 'true');
  assert.equal(answer(partitionFrames([1, 2, 3])), 'true');
  assert.equal(answer(partitionFrames([1, 2, 4])), 'false');
  // the forward loop uses the same number twice: [1, 2, 5] has no subset summing to 4, but the forward row says true
  assert.equal(answer(partitionFrames([1, 2, 5], 'forward')), 'true');
});

test('k steps and Tribonacci', () => {
  for (let k = 1; k <= 4; k++) for (let n = 1; n <= 12; n++) { const f = kStepsFrames(n, k); wellFormed(f); assert.equal(answer(f), String(countSeq(n, k)), `n = ${n}, k = ${k}`); }
});

test('minimum cost for tickets', () => {
  run(200, () => {
    const days = [...new Set(list(1 + rnd(6), 1, 40))].sort((x, y) => x - y);
    const costs = [1 + rnd(4), 3 + rnd(8), 8 + rnd(15)];
    const f = ticketsFrames(days, costs); wellFormed(f);
    assert.equal(answer(f), String(ticketsBrute(days, costs)), `${days.join()} / ${costs.join()}`);
  });
  assert.equal(answer(ticketsFrames([1, 4, 6, 7, 8, 20], [2, 7, 15])), '11');
  assert.equal(answer(ticketsFrames([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 30, 31], [2, 7, 15])), '17');
  assert.equal(answer(ticketsFrames([5], [3, 7, 15])), '3');
});
