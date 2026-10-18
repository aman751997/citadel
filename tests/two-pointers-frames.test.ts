import test from 'node:test';
import assert from 'node:assert/strict';
import { lastVar } from '../src/lib/dryrun.ts';
import type { Frame } from '../src/lib/dryrun.ts';
import { renderFrame } from '../src/lib/dryrun-render.ts';
import * as f from '../src/data/two-pointers-frames.ts';

// Deterministic PRNG so failures reproduce.
let seed = 31;
const rnd = (n: number) => { seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff; return (seed >>> 8) % n; };
const run = (n: number, body: (t: number) => void) => { for (let t = 0; t < n; t++) body(t); };
const arr = (len: number, lo: number, hi: number) => Array.from({ length: len }, () => lo + rnd(hi - lo + 1));
const sorted = (len: number, lo: number, hi: number) => arr(len, lo, hi).sort((a, b) => a - b);
const str = (len: number, alpha: string) => Array.from({ length: len }, () => alpha[rnd(alpha.length)]).join('');
const J = (x: unknown) => JSON.stringify(x);

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
const finalArray = (frames: Frame[], name: string) => {
  const v = frames[frames.length - 1].views.find(x => x.kind === 'array' && x.name === name);
  assert.ok(v && v.kind === 'array', `no array view ${name}`);
  return v.values.map(Number);
};
const pairs = (n: number) => Array.from({ length: n }, (_, i) => Array.from({ length: n - i - 1 }, (_, k) => [i, i + 1 + k])).flat();
const isPal = (s: string) => s === [...s].reverse().join('');

test('palindromeFrames vs filter-and-reverse (case, punctuation, empty, single)', () => {
  run(400, () => {
    const s = str(rnd(9), 'aAbB1, :');
    const t = s.toLowerCase().replace(/[^a-z0-9]/g, '');
    assert.equal(answer(f.palindromeFrames(s), J(s)), String(isPal(t)), J(s));
  });
  assert.equal(answer(f.palindromeFrames(''), 'empty'), 'true');
  assert.equal(answer(f.palindromeFrames('x'), 'single'), 'true');
  assert.equal(answer(f.palindromeFrames(',,,'), 'only punctuation'), 'true');
  assert.equal(answer(f.palindromeFrames('A man, a plan, a canal: Panama'), 'classic'), 'true');
  assert.equal(answer(f.palindromeFrames('race a car'), 'classic false'), 'false');
});

test('threeSumFrames vs brute-force unique triplets (duplicates, all zeros, negatives)', () => {
  run(400, () => {
    const a = sorted(rnd(9), -4, 4);
    const set = new Set<string>();
    for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) for (let k = j + 1; k < a.length; k++) if (a[i] + a[j] + a[k] === 0) set.add(J([a[i], a[j], a[k]]));
    const got = (JSON.parse(answer(f.threeSumFrames(a), J(a))) as number[][]).map(t => J(t));
    assert.equal(new Set(got).size, got.length, `duplicate triplet for ${J(a)}`);
    assert.deepEqual([...got].sort(), [...set].sort(), J(a));
  });
  assert.equal(answer(f.threeSumFrames([]), 'empty'), '[]');
  assert.equal(answer(f.threeSumFrames([0, 0]), 'two elements'), '[]');
  assert.equal(answer(f.threeSumFrames([0, 0, 0, 0, 0]), 'all zeros'), '[[0,0,0]]');
  assert.equal(answer(f.threeSumFrames([-1, -1, 0, 1, 2, 2]), 'mixed duplicates'), '[[-1,-1,2],[-1,0,1]]');
});

test('containerFrames vs all-pairs area', () => {
  run(400, () => {
    const h = arr(rnd(9), 0, 9);
    const best = pairs(h.length).reduce((m, [i, j]) => Math.max(m, Math.min(h[i], h[j]) * (j - i)), 0);
    assert.equal(answer(f.containerFrames(h), J(h)), String(best), J(h));
  });
  assert.equal(answer(f.containerFrames([]), 'empty'), '0');
  assert.equal(answer(f.containerFrames([5]), 'single'), '0');
  assert.equal(answer(f.containerFrames([3, 3, 3, 3]), 'all equal'), '9');
  assert.equal(answer(f.containerFrames([1, 8, 6, 2, 5, 4, 8, 3, 7]), 'LeetCode 11'), '49');
});

test('rainFrames vs per-bar max-left/max-right (non-empty input)', () => {
  run(400, () => {
    const h = arr(1 + rnd(9), 0, 6);
    const water = h.reduce((s, x, i) => s + Math.min(Math.max(...h.slice(0, i + 1)), Math.max(...h.slice(i))) - x, 0);
    assert.equal(answer(f.rainFrames(h), J(h)), String(water), J(h));
  });
  assert.equal(answer(f.rainFrames([4]), 'single'), '0');
  assert.equal(answer(f.rainFrames([2, 2, 2]), 'all equal'), '0');
  assert.equal(answer(f.rainFrames([0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]), 'LeetCode 42'), '6');
});

test('moveZeroesFrames: nonzeros keep their order, zeros trail', () => {
  run(400, () => {
    const a = arr(rnd(9), -2, 2);
    const exp = [...a.filter(x => x !== 0), ...a.filter(x => x === 0)];
    assert.equal(answer(f.moveZeroesFrames(a), J(a)), J(exp), J(a));
  });
  assert.equal(answer(f.moveZeroesFrames([]), 'empty'), '[]');
  assert.equal(answer(f.moveZeroesFrames([0, 0, 0]), 'all zeros'), '[0,0,0]');
  assert.equal(answer(f.moveZeroesFrames([7, 7]), 'no zeros'), '[7,7]');
});

test('dedupeFrames: length and kept prefix match "at most k copies" (k = 1..3)', () => {
  run(400, () => {
    const a = sorted(rnd(10), -2, 3), k = 1 + rnd(3);
    const kept: number[] = [];
    for (const x of a) if (kept.filter(y => y === x).length < k) kept.push(x);
    const frames = f.dedupeFrames(a, k);
    assert.equal(answer(frames, J([a, k])), String(kept.length), J([a, k]));
    assert.deepEqual(finalArray(frames, 'nums').slice(0, kept.length), kept, J([a, k]));
  });
  assert.equal(answer(f.dedupeFrames([], 2), 'empty'), '0');
  assert.equal(answer(f.dedupeFrames([1, 1, 1, 1], 1), 'all equal, k=1'), '1');
  assert.equal(answer(f.dedupeFrames([1, 1, 1, 2, 2, 3], 2), 'LeetCode 80'), '5');
});

test('colorsFrames sorts 0/1/2 arrays', () => {
  run(400, () => {
    const a = arr(rnd(10), 0, 2);
    assert.equal(answer(f.colorsFrames(a), J(a)), J([...a].sort()), J(a));
  });
  assert.equal(answer(f.colorsFrames([]), 'empty'), '[]');
  assert.equal(answer(f.colorsFrames([2]), 'single'), '[2]');
  assert.equal(answer(f.colorsFrames([1, 1, 1]), 'all equal'), '[1,1,1]');
  assert.equal(answer(f.colorsFrames([2, 0, 2, 1, 1, 0]), 'LeetCode 75'), '[0,0,1,1,2,2]');
});

test('mergeFrames (nums1 with trailing slack) equals a sorted concatenation', () => {
  run(400, () => {
    const m = rnd(6), n = rnd(6), x = sorted(m, -5, 5), y = sorted(n, -5, 5);
    const first = [...x, ...Array(n).fill(0)];
    assert.equal(answer(f.mergeFrames(first, m, y, n), J([first, m, y, n])), J([...x, ...y].sort((a, b) => a - b)), J([first, m, y, n]));
  });
  assert.equal(answer(f.mergeFrames([], 0, [], 0), 'both empty'), '[]');
  assert.equal(answer(f.mergeFrames([0, 0], 0, [1, 2], 2), 'nums1 empty'), '[1,2]');
  assert.equal(answer(f.mergeFrames([4, 5], 2, [], 0), 'nums2 empty'), '[4,5]');
  assert.equal(answer(f.mergeFrames([2, 2, 0, 0], 2, [2, 2], 2), 'all equal'), '[2,2,2,2]');
});

test('subsequenceFrames: appended characters = target length - longest matched target prefix', () => {
  run(400, () => {
    const s = str(rnd(7), 'abc'), t = str(rnd(6), 'abc');
    let matched = 0; // independent check: try every subsequence of s against every prefix of t
    for (let mask = 0; mask < 1 << s.length; mask++) {
      const sub = [...s].filter((_, i) => mask >> i & 1).join('');
      if (t.startsWith(sub)) matched = Math.max(matched, sub.length);
    }
    assert.equal(answer(f.subsequenceFrames(s, t), J([s, t])), String(t.length - matched), J([s, t]));
  });
  assert.equal(answer(f.subsequenceFrames('', ''), 'both empty'), '0');
  assert.equal(answer(f.subsequenceFrames('', 'abc'), 'empty source'), '3');
  assert.equal(answer(f.subsequenceFrames('abc', ''), 'empty target'), '0');
  assert.equal(answer(f.subsequenceFrames('aaaa', 'aaaa'), 'all equal'), '0');
  assert.equal(answer(f.subsequenceFrames('coaching', 'coding'), 'LeetCode 2486'), '4');
});

test('squaresFrames equals sorted squares (negatives, duplicates)', () => {
  run(400, () => {
    const a = sorted(rnd(9), -6, 6);
    assert.equal(answer(f.squaresFrames(a), J(a)), J(a.map(x => x * x).sort((p, q) => p - q)), J(a));
  });
  assert.equal(answer(f.squaresFrames([]), 'empty'), '[]');
  assert.equal(answer(f.squaresFrames([-3]), 'single'), '[9]');
  assert.equal(answer(f.squaresFrames([-2, -2, 2, 2]), 'symmetric'), '[4,4,4,4]');
});

test('oneDeletionFrames vs try-every-deletion', () => {
  run(500, () => {
    const s = str(rnd(9), 'abc');
    const exp = isPal(s) || [...s].some((_, i) => isPal(s.slice(0, i) + s.slice(i + 1)));
    assert.equal(answer(f.oneDeletionFrames(s), J(s)), String(exp), J(s));
  });
  assert.equal(answer(f.oneDeletionFrames(''), 'empty'), 'true');
  assert.equal(answer(f.oneDeletionFrames('a'), 'single'), 'true');
  assert.equal(answer(f.oneDeletionFrames('abca'), 'LeetCode 680'), 'true');
  assert.equal(answer(f.oneDeletionFrames('abcda'), 'needs two'), 'false');
});

test('countPairsFrames vs all-pairs count (sorted, duplicates, negatives)', () => {
  run(500, () => {
    const a = sorted(rnd(10), -3, 4), t = rnd(9) - 3;
    const exp = pairs(a.length).filter(([i, j]) => a[i] + a[j] === t).length;
    assert.equal(answer(f.countPairsFrames(a, t), J([a, t])), String(exp), J([a, t]));
  });
  assert.equal(answer(f.countPairsFrames([], 2), 'empty'), '0');
  assert.equal(answer(f.countPairsFrames([2], 4), 'single'), '0');
  assert.equal(answer(f.countPairsFrames([2, 2, 2, 2], 4), 'all equal'), '6');
});

test('countBelowFrames vs all-pairs count', () => {
  run(500, () => {
    const a = sorted(rnd(10), -3, 4), t = rnd(11) - 3;
    const exp = pairs(a.length).filter(([i, j]) => a[i] + a[j] < t).length;
    assert.equal(answer(f.countBelowFrames(a, t), J([a, t])), String(exp), J([a, t]));
  });
  assert.equal(answer(f.countBelowFrames([], 2), 'empty'), '0');
  assert.equal(answer(f.countBelowFrames([1, 1, 1], 3), 'all equal'), '3');
});

test('partitionFrames: returns the count below the pivot and groups the array', () => {
  run(400, () => {
    const a = arr(rnd(10), -3, 5), p = rnd(7) - 2;
    const frames = f.partitionFrames(a, p), below = a.filter(x => x < p).length;
    assert.equal(answer(frames, J([a, p])), String(below), J([a, p]));
    const out = finalArray(frames, 'nums');
    assert.deepEqual([...out].sort((x, y) => x - y), [...a].sort((x, y) => x - y), 'multiset preserved');
    assert.ok(out.slice(0, below).every(x => x < p) && out.slice(below).every(x => x >= p), J([a, p, out]));
  });
  assert.equal(answer(f.partitionFrames([], 3), 'empty'), '0');
  assert.equal(answer(f.partitionFrames([4, 4, 4], 4), 'all equal'), '0');
});

test('differenceFrames vs all-pairs difference (sorted, duplicates, target 0)', () => {
  run(500, () => {
    const a = sorted(rnd(9), -4, 5), t = rnd(8);
    const exp = pairs(a.length).some(([i, j]) => a[j] - a[i] === t);
    assert.equal(answer(f.differenceFrames(a, t), J([a, t])), String(exp), J([a, t]));
  });
  assert.equal(answer(f.differenceFrames([], 1), 'empty'), 'false');
  assert.equal(answer(f.differenceFrames([5], 0), 'single cannot pair with itself'), 'false');
  assert.equal(answer(f.differenceFrames([5, 5], 0), 'duplicate gives 0'), 'true');
});

test('intersectionFrames vs set intersection (duplicates collapse)', () => {
  run(400, () => {
    const a = sorted(rnd(8), -3, 5), b = sorted(rnd(8), -3, 5);
    const exp = [...new Set(a.filter(x => b.includes(x)))].sort((x, y) => x - y);
    assert.equal(answer(f.intersectionFrames(a, b), J([a, b])), J(exp), J([a, b]));
  });
  assert.equal(answer(f.intersectionFrames([], [1]), 'empty'), '[]');
  assert.equal(answer(f.intersectionFrames([2, 2, 2], [2, 2]), 'all equal'), '[2]');
});
