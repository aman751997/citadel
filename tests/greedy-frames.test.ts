import test from 'node:test';
import assert from 'node:assert/strict';
import { lastVar } from '../src/lib/dryrun.ts';
import type { Frame } from '../src/lib/dryrun.ts';
import { kadaneFrames, maxProductFrames, gasFrames, canJumpFrames, jumpIIFrames, partitionFrames, straightsFrames, stockFrames, cookiesFrames, boatsFrames, candyFrames, wildcardFrames, tripletsFrames } from '../src/data/greedy/frames.ts';

let seed = 24680;
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
      assert.ok(fr.predict.answer >= 0 && fr.predict.answer < fr.predict.options.length, fr.predict.question);
    }
  }
}

// ---------- independent brute-force oracles (none uses the lesson's greedy rule) ----------
const stretches = (a: number[], f: (s: number[]) => number) => Math.max(...a.flatMap((_, l) => a.slice(l).map((_, k) => f(a.slice(l, l + k + 1)))));
const validStarts = (g: number[], c: number[]) => g.map((_, s) => s).filter(s => {
  let tank = 0;
  for (let k = 0; k < g.length; k++) { const i = (s + k) % g.length; tank += g[i] - c[i]; if (tank < 0) return false; }
  return true;
});
function minJumps(a: number[]) {
  const dist = new Map([[0, 0]]), queue = [0];
  for (let h = 0; h < queue.length; h++) for (let j = queue[h] + 1; j <= queue[h] + a[queue[h]] && j < a.length; j++) if (!dist.has(j)) { dist.set(j, dist.get(queue[h])! + 1); queue.push(j); }
  return dist.get(a.length - 1) ?? -1;
}
function bestSplit(s: string): number[] {          // every split with no letter in two pieces; most pieces wins
  const all: string[][] = [];
  const go = (from: number, acc: string[]) => {
    if (from === s.length) { all.push(acc); return; }
    for (let e = from; e < s.length; e++) {
      const piece = s.slice(from, e + 1);
      if ([...piece].some(ch => s.slice(0, from).includes(ch) || s.slice(e + 1).includes(ch))) continue;
      go(e + 1, [...acc, piece]);
    }
  };
  go(0, []);
  const most = Math.max(...all.map(p => p.length));
  return all.find(p => p.length === most)!.map(p => p.length);
}
function groupable(cards: number[], w: number): boolean {   // the FIRST card listed must sit in some run that contains it
  if (!cards.length) return true;
  const [x, ...rest] = cards;
  for (let lo = x - w + 1; lo <= x; lo++) {
    const left = [...rest];
    if (Array.from({ length: w }, (_, k) => lo + k).filter(v => v !== x).every(v => { const at = left.indexOf(v); if (at < 0) return false; left.splice(at, 1); return true; }) && groupable(left, w)) return true;
  }
  return false;
}
function bestStock(p: number[], i = 0, holding = false): number {   // exhaustive: each day sit, buy or sell
  if (i === p.length) return 0;
  const sit = bestStock(p, i + 1, holding);
  return Math.max(sit, holding ? p[i] + bestStock(p, i + 1, false) : -p[i] + bestStock(p, i + 1, true));
}
function bestMatch(g: number[], s: number[], i = 0, used = 0): number {   // try giving child i every unused roll, or nothing
  if (i === g.length) return 0;
  let best = bestMatch(g, s, i + 1, used);
  for (let j = 0; j < s.length; j++) if (!(used >> j & 1) && s[j] >= g[i]) best = Math.max(best, 1 + bestMatch(g, s, i + 1, used | 1 << j));
  return best;
}
function fewestBoats(p: number[], limit: number): number {   // the first person rides alone or with any one other
  if (!p.length) return 0;
  const [x, ...rest] = p;
  let best = 1 + fewestBoats(rest, limit);
  rest.forEach((y, k) => { if (x + y <= limit) best = Math.min(best, 1 + fewestBoats(rest.filter((_, m) => m !== k), limit)); });
  return best;
}
function fewestSweets(r: number[]): number {
  let best = Infinity;
  const c: number[] = [];
  const go = (i: number, sum: number) => {
    if (sum >= best) return;
    if (i === r.length) { best = sum; return; }
    for (let v = 1; v <= r.length; v++) {
      if (i > 0 && ((r[i] > r[i - 1] && v <= c[i - 1]) || (r[i] < r[i - 1] && c[i - 1] <= v))) continue;
      c[i] = v; go(i + 1, sum + v);
    }
  };
  go(0, 0);
  return best;
}
function balanced(s: string): boolean {              // read every * all three ways
  const star = s.indexOf('*');
  if (star < 0) { let d = 0; for (const ch of s) { d += ch === '(' ? 1 : -1; if (d < 0) return false; } return d === 0; }
  return ['(', ')', ''].some(t => balanced(s.slice(0, star) + t + s.slice(star + 1)));
}
function canMake(ts: number[][], target: number[]): boolean {   // merge every non-empty subset
  for (let mask = 1; mask < 1 << ts.length; mask++) {
    const m = [0, 0, 0];
    ts.forEach((t, i) => { if (mask >> i & 1) for (let k = 0; k < 3; k++) m[k] = Math.max(m[k], t[k]); });
    if (m.every((v, k) => v === target[k])) return true;
  }
  return false;
}

test('kadane', () => {
  run(300, () => { const a = list(1 + rnd(8), -6, 6); const f = kadaneFrames(a); wellFormed(f); assert.equal(answer(f), String(stretches(a, s => s.reduce((x, y) => x + y, 0))), JSON.stringify(a)); });
  assert.equal(answer(kadaneFrames([-3, -1, -2])), '-1');
  assert.equal(answer(kadaneFrames([5, -2, 5])), '8');
  assert.equal(answer(kadaneFrames([-2])), '-2');
});

test('max product', () => {
  run(300, () => { const a = list(1 + rnd(7), -4, 4); const f = maxProductFrames(a); wellFormed(f); assert.equal(answer(f), String(stretches(a, s => s.reduce((x, y) => x * y, 1)) + 0), JSON.stringify(a)); });
  assert.equal(answer(maxProductFrames([-2, 3, -4])), '24');
  assert.equal(answer(maxProductFrames([2, 3, 0, 4])), '6');
});

test('gas station', () => {
  run(300, () => {
    const n = 1 + rnd(6), gas = list(n, 0, 6), cost = list(n, 0, 6);
    const f = gasFrames(gas, cost); wellFormed(f);
    const ok = validStarts(gas, cost), got = Number(answer(f));
    if (ok.length) assert.ok(ok.includes(got), `${gas} / ${cost}: ${got} not in ${ok}`); else assert.equal(got, -1);
  });
  assert.equal(answer(gasFrames([1, 2, 3, 4, 5], [3, 4, 5, 1, 2])), '3');
  assert.equal(answer(gasFrames([2, 3, 4], [3, 4, 3])), '-1');
});

test('jump game', () => {
  run(300, () => { const a = list(1 + rnd(8), 0, 4); const f = canJumpFrames(a); wellFormed(f); assert.equal(answer(f), String(minJumps(a) >= 0), JSON.stringify(a)); });
  assert.equal(answer(canJumpFrames([0])), 'true');
  assert.equal(answer(canJumpFrames([3, 2, 1, 0, 4])), 'false');
  assert.equal(answer(canJumpFrames([2, 0, 1, 0])), 'true');
});

test('jump game II', () => {
  run(300, () => { const a = list(1 + rnd(8), 1, 4); const f = jumpIIFrames(a); wellFormed(f); assert.equal(answer(f), String(minJumps(a)), JSON.stringify(a)); });
  assert.equal(answer(jumpIIFrames([2, 3, 1, 1, 4])), '2');
  assert.equal(answer(jumpIIFrames([0])), '0');
});

test('partition labels', () => {
  run(300, () => {
    const s = Array.from({ length: 1 + rnd(8) }, () => 'abcd'[rnd(4)]).join('');
    const f = partitionFrames(s); wellFormed(f);
    assert.equal(answer(f), JSON.stringify(bestSplit(s)), s);
  });
  assert.equal(answer(partitionFrames('abba')), '[4]');
  assert.equal(answer(partitionFrames('ababcbacadefegdehijhklij')), '[9,7,8]');
});

test('hand of straights', () => {
  run(300, () => {
    const w = 1 + rnd(3), hand = list(rnd(4) * w + (rnd(5) === 0 ? 1 : 0), 1, 5);
    const f = straightsFrames(hand, w); wellFormed(f);
    assert.equal(answer(f), String(hand.length % w === 0 && groupable(hand, w)), `${hand} / ${w}`);
  });
  assert.equal(answer(straightsFrames([1, 2, 3, 6, 2, 3, 4, 7, 8], 3)), 'true');
  assert.equal(answer(straightsFrames([2, 1, 3, 4, 5, 6], 3)), 'true');
  assert.equal(answer(straightsFrames([1, 2, 3, 4, 5], 4)), 'false');
});

test('stock II', () => {
  run(200, () => { const a = list(1 + rnd(7), 1, 9); const f = stockFrames(a); wellFormed(f); assert.equal(answer(f), String(bestStock(a)), JSON.stringify(a)); });
  assert.equal(answer(stockFrames([7, 1, 5, 3, 6, 4])), '7');
  assert.equal(answer(stockFrames([5])), '0');
});

test('assign cookies', () => {
  run(300, () => { const g = list(rnd(5), 1, 5), s = list(rnd(5), 1, 5); const f = cookiesFrames(g, s); wellFormed(f); assert.equal(answer(f), String(bestMatch(g, s)), `${g} / ${s}`); });
  assert.equal(answer(cookiesFrames([1, 2, 3], [1, 1])), '1');
  assert.equal(answer(cookiesFrames([1, 2], [1, 2, 3])), '2');
});

test('boats', () => {
  run(300, () => { const limit = 3 + rnd(5), p = list(1 + rnd(6), 1, limit); const f = boatsFrames(p, limit); wellFormed(f); assert.equal(answer(f), String(fewestBoats(p, limit)), `${p} / ${limit}`); });
  assert.equal(answer(boatsFrames([3, 2, 2, 1], 3)), '3');
  assert.equal(answer(boatsFrames([1, 1, 3, 3], 4)), '2');
});

test('candy', () => {
  run(200, () => { const a = list(1 + rnd(6), 1, 4); const f = candyFrames(a); wellFormed(f); assert.equal(answer(f), String(fewestSweets(a)), JSON.stringify(a)); });
  assert.equal(answer(candyFrames([1, 2, 87, 87, 87, 2, 1])), '13');
  assert.equal(answer(candyFrames([5, 4, 3, 2, 1])), '15');
  assert.equal(answer(candyFrames([1, 3, 4, 5, 2])), '11');
});

test('wildcard parentheses', () => {
  run(400, () => {
    const s = Array.from({ length: rnd(9) }, () => '()*'[rnd(3)]).join('');
    const f = wildcardFrames(s); wellFormed(f);
    assert.equal(answer(f), String(balanced(s)), s);
  });
  assert.equal(answer(wildcardFrames('(*)')), 'true');
  assert.equal(answer(wildcardFrames('(*))')), 'true');
  assert.equal(answer(wildcardFrames('')), 'true');
  assert.equal(answer(wildcardFrames(')(')), 'false');
});

test('merge triplets', () => {
  run(300, () => {
    const ts = Array.from({ length: 1 + rnd(5) }, () => list(3, 1, 4)), target = list(3, 1, 4);
    const f = tripletsFrames(ts, target); wellFormed(f);
    assert.equal(answer(f), String(canMake(ts, target)), `${JSON.stringify(ts)} -> ${target}`);
  });
  assert.equal(answer(tripletsFrames([[2, 9, 5], [1, 7, 1]], [2, 7, 5])), 'false');
});
