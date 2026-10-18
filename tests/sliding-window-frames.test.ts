import test from 'node:test';
import assert from 'node:assert/strict';
import { lastVar } from '../src/lib/dryrun.ts';
import type { Frame } from '../src/lib/dryrun.ts';
import { renderFrame } from '../src/lib/dryrun-render.ts';
import * as f from '../src/data/sliding-window/dryruns.ts';

// Deterministic PRNG so failures reproduce.
let seed = 101;
const rnd = (n: number) => { seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff; return (seed >>> 8) % n; };
const run = (n: number, body: (t: number) => void) => { for (let t = 0; t < n; t++) body(t); };
const arr = (len: number, lo: number, hi: number) => Array.from({ length: len }, () => lo + rnd(hi - lo + 1));
const str = (len: number, alpha: string) => Array.from({ length: len }, () => alpha[rnd(alpha.length)]).join('');
const J = (x: unknown) => JSON.stringify(x);
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
// Every non-empty window [i, j] of a.
const windows = <T,>(a: T[]) => a.flatMap((_, i) => a.slice(i).map((_, k) => a.slice(i, i + k + 1)));

function wellFormed(frames: Frame[], label: string) {
  assert.ok(frames.length >= 1, label);
  for (const fr of frames) {
    assert.ok(fr.caption.trim().length > 0, `${label}: empty caption`);
    assert.ok(fr.views.length > 0, `${label}: no views`);
    for (const text of [fr.caption, renderFrame(fr), fr.predict ? J(fr.predict) : '']) {
      assert.ok(!/undefined|NaN|Infinity/.test(text), `${label}: bad text in frame "${fr.caption}"`);
    }
    if (fr.predict) {
      const p = fr.predict;
      assert.ok(p.options.length >= 2, `${label}: <2 options for "${p.question}"`);
      assert.ok(Number.isInteger(p.answer) && p.answer >= 0 && p.answer < p.options.length, `${label}: answer index ${p.answer} for "${p.question}"`);
      assert.equal(new Set(p.options).size, p.options.length, `${label}: duplicate options for "${p.question}"`);
    }
  }
}
const answer = (frames: Frame[], label: string) => { wellFormed(frames, label); return lastVar(frames, 'answer')!; };
const distinct = (w: (string | number)[]) => new Set(w).size;

test('zerosFrames vs longest window with at most k zeros', () => {
  run(400, () => {
    const a = arr(rnd(11), 0, 1), k = rnd(4);
    const exp = Math.max(0, ...windows(a).filter(w => w.filter(x => x === 0).length <= k).map(w => w.length));
    assert.equal(answer(f.zerosFrames(a, k), J([a, k])), String(exp), J([a, k]));
  });
  assert.equal(answer(f.zerosFrames([], 2), 'empty'), '0');
  assert.equal(answer(f.zerosFrames([0], 0), 'single zero, k=0'), '0');
  assert.equal(answer(f.zerosFrames([1, 1, 1], 0), 'all ones'), '3');
  assert.equal(answer(f.zerosFrames([0, 0, 0], 3), 'all equal, all allowed'), '3');
  assert.equal(answer(f.zerosFrames([1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0], 2), 'LeetCode 1004'), '6');
});

test('zerosFrames deleteOne mode vs longest 0/1 window with at most one zero, minus the deleted element', () => {
  run(300, () => {
    const a = arr(rnd(11), 0, 1);
    const exp = Math.max(0, ...windows(a).filter(w => w.filter(x => x === 0).length <= 1).map(w => w.length - 1));
    assert.equal(answer(f.zerosFrames(a, 1, true), J(a)), String(exp), J(a));
  });
  assert.equal(answer(f.zerosFrames([1, 1, 1], 1, true), 'all ones: one must still be deleted'), '2');
  assert.equal(answer(f.zerosFrames([0, 0, 0], 1, true), 'all zeros: window [0] minus the deleted one'), '0');
  assert.equal(answer(f.zerosFrames([1, 1, 0, 1], 1, true), 'LeetCode 1493'), '3');
});

test('noRepeatFrames and noRepeatJumpFrames vs longest substring without repeats', () => {
  run(400, () => {
    const s = str(rnd(11), 'abcd');
    const exp = Math.max(0, ...windows([...s]).filter(w => distinct(w) === w.length).map(w => w.length));
    assert.equal(answer(f.noRepeatFrames(s), J(s)), String(exp), `counting: ${s}`);
    assert.equal(answer(f.noRepeatJumpFrames(s), J(s)), String(exp), `jump: ${s}`);
  });
  for (const [s, e] of [['', '0'], ['a', '1'], ['bbbbb', '1'], ['abcabcbb', '3'], ['abba', '2'], ['tmmzuxt', '5']] as const) {
    assert.equal(answer(f.noRepeatFrames(s), s), e, s);
    assert.equal(answer(f.noRepeatJumpFrames(s), s), e, s);
  }
});

test('distinctFrames (longest) vs brute force, k = 0..3', () => {
  run(400, () => {
    const a = arr(rnd(11), -2, 3), k = rnd(4);
    const exp = Math.max(0, ...windows(a).filter(w => distinct(w) <= k).map(w => w.length));
    assert.equal(answer(f.distinctFrames(a, k), J([a, k])), String(exp), J([a, k]));
  });
  assert.equal(answer(f.distinctFrames([], 2), 'empty'), '0');
  assert.equal(answer(f.distinctFrames([5, 5, 5], 1), 'all equal'), '3');
  assert.equal(answer(f.distinctFrames([1, 2, 3, 2, 2], 2), 'LeetCode 904 shape'), '4');
});

test('distinctFrames (count mode) vs number of subarrays with at most k distinct', () => {
  run(400, () => {
    const a = arr(rnd(10), -2, 3), k = rnd(4);
    const exp = windows(a).filter(w => distinct(w) <= k).length;
    assert.equal(answer(f.distinctFrames(a, k, true), J([a, k])), String(exp), J([a, k]));
  });
  assert.equal(answer(f.distinctFrames([], 2, true), 'empty'), '0');
  assert.equal(answer(f.distinctFrames([7, 7, 7], 1, true), 'all equal'), '6');
});

test('repaintFrames vs brute force (window length - most common letter <= k)', () => {
  run(400, () => {
    const s = str(rnd(11), 'abc'), k = rnd(4);
    const exp = Math.max(0, ...windows([...s]).filter(w => w.length - Math.max(...['a', 'b', 'c'].map(c => w.filter(x => x === c).length)) <= k).map(w => w.length));
    assert.equal(answer(f.repaintFrames(s, k), J([s, k])), String(exp), J([s, k]));
  });
  assert.equal(answer(f.repaintFrames('', 2), 'empty'), '0');
  assert.equal(answer(f.repaintFrames('aaaa', 0), 'all equal'), '4');
  assert.equal(answer(f.repaintFrames('AABABBA', 1), 'LeetCode 424'), '4');
});

test('tollFrames vs shortest subarray with sum >= target (non-negative values)', () => {
  run(400, () => {
    const a = arr(rnd(10), 0, 5), t = 1 + rnd(12);
    const lens = windows(a).filter(w => sum(w) >= t).map(w => w.length);
    assert.equal(answer(f.tollFrames(a, t), J([a, t])), String(lens.length ? Math.min(...lens) : 0), J([a, t]));
  });
  assert.equal(answer(f.tollFrames([], 3), 'empty'), '0');
  assert.equal(answer(f.tollFrames([4], 4), 'single, exact'), '1');
  assert.equal(answer(f.tollFrames([2, 2, 2], 7), 'unreachable'), '0');
  assert.equal(answer(f.tollFrames([2, 3, 1, 2, 4, 3], 7), 'LeetCode 209'), '2');
});

test('productFrames vs number of subarrays with product < k (positive values, k = 0, 1 included)', () => {
  run(400, () => {
    const a = arr(rnd(9), 1, 5), k = rnd(30);
    const exp = windows(a).filter(w => w.reduce((p, x) => p * x, 1) < k).length;
    assert.equal(answer(f.productFrames(a, k), J([a, k])), String(exp), J([a, k]));
  });
  assert.equal(answer(f.productFrames([], 5), 'empty'), '0');
  assert.equal(answer(f.productFrames([1, 1, 1], 1), 'k = 1: nothing is below 1'), '0');
  assert.equal(answer(f.productFrames([1, 1, 1], 2), 'all equal'), '6');
  assert.equal(answer(f.productFrames([10, 5, 2, 6], 100), 'LeetCode 713'), '8');
});

test('minWindowFrames vs brute force (leftmost shortest covering substring)', () => {
  run(500, () => {
    const s = str(rnd(11), 'abc'), t = str(1 + rnd(4), 'abc');
    const need = (w: string[], c: string) => w.filter(x => x === c).length >= [...t].filter(x => x === c).length;
    let best = '';
    for (const w of windows([...s])) if (['a', 'b', 'c'].every(c => need(w, c)) && (best === '' || w.length < best.length)) best = w.join('');
    assert.equal(answer(f.minWindowFrames(s, t), J([s, t])), best === '' ? '(empty)' : best, J([s, t]));
  });
  assert.equal(answer(f.minWindowFrames('', 'a'), 'empty s'), '(empty)');
  assert.equal(answer(f.minWindowFrames('a', 'a'), 'single'), 'a');
  assert.equal(answer(f.minWindowFrames('a', 'aa'), 'not enough copies'), '(empty)');
  assert.equal(answer(f.minWindowFrames('ADOBECODEBANC', 'ABC'), 'LeetCode 76'), 'BANC');
});

test('anagramFrames (permutation in string) vs sorted-window comparison', () => {
  run(500, () => {
    const s1 = str(rnd(5), 'abc'), s2 = str(rnd(9), 'abc');
    const key = [...s1].sort().join('');
    let exp = s1.length === 0;
    for (let i = 0; i + s1.length <= s2.length; i++) if ([...s2.slice(i, i + s1.length)].sort().join('') === key) exp = true;
    assert.equal(answer(f.anagramFrames(s1, s2), J([s1, s2])), String(exp), J([s1, s2]));
  });
  assert.equal(answer(f.anagramFrames('ab', 'eidbaooo'), 'LeetCode 567 true'), 'true');
  assert.equal(answer(f.anagramFrames('ab', 'eidboaoo'), 'LeetCode 567 false'), 'false');
  assert.equal(answer(f.anagramFrames('a', ''), 's2 shorter'), 'false');
  assert.equal(answer(f.anagramFrames('aa', 'a'), 'duplicates, s2 shorter'), 'false');
  assert.equal(answer(f.anagramFrames('', ''), 'both empty'), 'true');
});

test('dequeMaxFrames vs per-window Math.max', () => {
  run(400, () => {
    const a = arr(rnd(11), -4, 5), k = 1 + rnd(5);
    const out: number[] = [];
    for (let i = 0; i + k <= a.length; i++) out.push(Math.max(...a.slice(i, i + k)));
    assert.equal(answer(f.dequeMaxFrames(a, k), J([a, k])), `[${out.join(', ')}]`, J([a, k]));
  });
  assert.equal(answer(f.dequeMaxFrames([], 2), 'empty'), '[]');
  assert.equal(answer(f.dequeMaxFrames([4], 1), 'single'), '[4]');
  assert.equal(answer(f.dequeMaxFrames([2, 2, 2, 2], 2), 'all equal'), '[2, 2, 2]');
  assert.equal(answer(f.dequeMaxFrames([1, 3, -1, -3, 5, 3, 6, 7], 3), 'LeetCode 239'), '[3, 3, 5, 5, 6, 7]');
});

test('stockFrames vs all-pairs best profit (non-empty prices)', () => {
  run(400, () => {
    const p = arr(1 + rnd(9), 0, 9);
    let best = 0; for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) best = Math.max(best, p[j] - p[i]);
    assert.equal(answer(f.stockFrames(p), J(p)), String(best), J(p));
  });
  assert.equal(answer(f.stockFrames([5]), 'single'), '0');
  assert.equal(answer(f.stockFrames([3, 3, 3]), 'all equal'), '0');
  assert.equal(answer(f.stockFrames([7, 6, 4, 3, 1]), 'falling'), '0');
  assert.equal(answer(f.stockFrames([7, 1, 5, 3, 6, 4]), 'LeetCode 121'), '5');
});

test('cardsFrames vs trying every left/right split (negatives allowed, k up to n)', () => {
  run(400, () => {
    const a = arr(rnd(9), -3, 9), k = rnd(a.length + 1);
    let best = -Infinity;
    for (let i = 0; i <= k; i++) best = Math.max(best, sum(a.slice(0, i)) + sum(a.slice(a.length - (k - i))));
    assert.equal(answer(f.cardsFrames(a, k), J([a, k])), String(a.length === 0 ? 0 : best), J([a, k]));
  });
  assert.equal(answer(f.cardsFrames([4], 1), 'single, take it'), '4');
  assert.equal(answer(f.cardsFrames([2, 2, 2], 3), 'take all'), '6');
  assert.equal(answer(f.cardsFrames([1, 2, 3, 4, 5, 6, 1], 3), 'LeetCode 1423'), '12');
});

test('negativesFrames vs shortest subarray with sum >= k (negatives allowed, -1 when none)', () => {
  run(500, () => {
    const a = arr(rnd(9), -3, 5), k = 1 + rnd(8);
    const lens = windows(a).filter(w => sum(w) >= k).map(w => w.length);
    assert.equal(answer(f.negativesFrames(a, k), J([a, k])), String(lens.length ? Math.min(...lens) : -1), J([a, k]));
  });
  assert.equal(answer(f.negativesFrames([], 1), 'empty'), '-1');
  assert.equal(answer(f.negativesFrames([1], 1), 'LeetCode 862 #1'), '1');
  assert.equal(answer(f.negativesFrames([1, 2], 4), 'LeetCode 862 #2'), '-1');
  assert.equal(answer(f.negativesFrames([2, -1, 2], 3), 'LeetCode 862 #3'), '3');
  assert.equal(answer(f.negativesFrames([2, 2, 2], 2), 'all equal'), '1');
});
