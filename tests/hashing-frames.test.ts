import test from 'node:test';
import assert from 'node:assert/strict';
import { lastVar, type Frame } from '../src/lib/dryrun.ts';
import * as f from '../src/data/hashing/frames.ts';

// Deterministic PRNG so failures reproduce.
let seed = 19;
const rnd = (n: number) => { seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff; return seed % n; };
const arr = (len: number, max: number, min = 0) => Array.from({ length: len }, () => min + rnd(max - min + 1));
const str = (len: number, alpha: string) => Array.from({ length: len }, () => alpha[rnd(alpha.length)]).join('');
const ans = (frames: Frame[]) => lastVar(frames, 'answer')!;
const sameLetters = (a: string, b: string) => [...a].sort().join('') === [...b].sort().join('');

test('every generator frame has a caption and a view; predict answers are in range', () => {
  const all = [f.bucketFrames([3, 11, 4, 19, 8], 8, 19), f.containsDuplicateFrames([1, 2, 3, 1]), f.twoSumFrames([2, 7, 11, 15], 9), f.pathCrossingFrames('NESW'),
    f.anagramFrames('anagram', 'nagaram'), f.groupAnagramsFrames(['eat', 'tea', 'tan', 'ate', 'nat', 'bat']), f.longestConsecutiveFrames([100, 4, 200, 1, 3, 2]),
    f.codecFrames(['a#b', '', 'c']), f.isomorphicFrames('badc', 'baba'), f.nearbyDuplicateFrames([1, 2, 3, 1], 3), f.topKFrames([1, 1, 1, 2, 2, 3], 2),
    f.sudokuFrames(['53..7....', '.........', '.........', '.........', '.........', '.........', '.........', '.........', '5........']), f.happyFrames(19), f.firstUniqueFrames('loveleetcode')];
  for (const frames of all) {
    assert.ok(frames.length >= 2);
    for (const fr of frames) {
      assert.ok(fr.caption.length > 10 && fr.views.length > 0);
      if (fr.predict) { assert.ok(fr.predict.answer >= 0 && fr.predict.answer < fr.predict.options.length); assert.equal(new Set(fr.predict.options).size, fr.predict.options.length); }
    }
  }
});

test('bucketFrames: contains matches Array.includes', () => {
  for (let t = 0; t < 300; t++) {
    const keys = arr(rnd(8), 40), cap = [4, 8, 16][rnd(3)], look = rnd(40);
    assert.equal(ans(f.bucketFrames(keys, cap, look)), String(keys.includes(look)));
  }
});

test('containsDuplicateFrames vs pair scan', () => {
  for (let t = 0; t < 400; t++) {
    const a = arr(rnd(9), 6);
    const dup = a.some((x, i) => a.some((y, j) => i < j && x === y));
    assert.equal(ans(f.containsDuplicateFrames(a)), String(dup), JSON.stringify(a));
  }
});

test('twoSumFrames: found pair is valid, and [] exactly when no pair exists', () => {
  for (let t = 0; t < 500; t++) {
    const a = arr(rnd(8), 9, -3), target = rnd(14) - 3;
    const exists = a.some((x, i) => a.some((y, j) => i < j && x + y === target));
    const got = JSON.parse(ans(f.twoSumFrames(a, target))) as number[];
    if (!exists) assert.deepEqual(got, []);
    else { assert.equal(got.length, 2); assert.notEqual(got[0], got[1]); assert.equal(a[got[0]] + a[got[1]], target, JSON.stringify([a, target, got])); }
  }
});

test('pathCrossingFrames vs corner replay', () => {
  for (let t = 0; t < 400; t++) {
    const p = str(rnd(10), 'NSEW');
    let x = 0, y = 0; const pts = ['0,0']; let cross = false;
    for (const m of p) { if (m === 'N') y++; else if (m === 'S') y--; else if (m === 'E') x++; else x--; const k = `${x},${y}`; if (pts.includes(k)) cross = true; pts.push(k); }
    assert.equal(ans(f.pathCrossingFrames(p)), String(cross), p);
  }
});

test('anagramFrames vs sorted comparison (including different lengths)', () => {
  for (let t = 0; t < 400; t++) {
    const s = str(rnd(6), 'abc'), u = rnd(2) ? [...s].sort(() => rnd(3) - 1).join('') : str(rnd(6), 'abc');
    assert.equal(ans(f.anagramFrames(s, u)), String(sameLetters(s, u)), `${s} ${u}`);
  }
});

test('groupAnagramsFrames: a partition where two words share a group exactly when they are anagrams', () => {
  for (let t = 0; t < 300; t++) {
    const w = Array.from({ length: rnd(7) }, () => str(rnd(4), 'abc'));
    const groups = JSON.parse(ans(f.groupAnagramsFrames(w))) as string[][];
    assert.deepEqual(groups.flat().sort(), [...w].sort());
    const gid = new Map<string, number>();
    groups.forEach((g, i) => g.forEach(x => gid.set(x, i)));
    for (const a of w) for (const b of w) assert.equal(gid.get(a) === gid.get(b), sameLetters(a, b), `${a} ${b}`);
    assert.equal(new Set(groups.map(g => [...g[0]].sort().join(''))).size, groups.length);
  }
});

test('longestConsecutiveFrames vs naive run search', () => {
  for (let t = 0; t < 400; t++) {
    const a = arr(rnd(10), 12, -2);
    let best = 0;
    for (const x of a) { let L = 0; while (a.includes(x + L)) L++; best = Math.max(best, L); }
    assert.equal(ans(f.longestConsecutiveFrames(a)), String(best), JSON.stringify(a));
  }
});

test('codecFrames: decode(encode(x)) equals x, also for # digits and empty strings', () => {
  for (let t = 0; t < 400; t++) {
    const strs = Array.from({ length: rnd(5) }, () => str(rnd(5), 'ab#1,'));
    assert.deepEqual(JSON.parse(ans(f.codecFrames(strs))), strs);
  }
  assert.deepEqual(JSON.parse(ans(f.codecFrames(['hello world!', '']))), ['hello world!', '']);
});

test('isomorphicFrames vs signature comparison', () => {
  const sig = (s: string) => [...s].map(c => s.indexOf(c)).join(',');
  for (let t = 0; t < 500; t++) {
    const n = rnd(7), s = str(n, 'abcd'), u = str(n, 'abcd');
    assert.equal(ans(f.isomorphicFrames(s, u)), String(sig(s) === sig(u)), `${s} ${u}`);
  }
});

test('nearbyDuplicateFrames vs pair scan within k', () => {
  for (let t = 0; t < 500; t++) {
    const a = arr(rnd(10), 5), k = rnd(5);
    const exp = a.some((x, i) => a.some((y, j) => i < j && j - i <= k && x === y));
    assert.equal(ans(f.nearbyDuplicateFrames(a, k)), String(exp), `${JSON.stringify(a)} k=${k}`);
  }
});

test('topKFrames: returns k distinct values whose counts are the k largest counts', () => {
  for (let t = 0; t < 400; t++) {
    const a = arr(1 + rnd(10), 5);
    const cnt = (v: number) => a.filter(x => x === v).length;
    const distinct = [...new Set(a)], k = 1 + rnd(distinct.length);
    const got = JSON.parse(ans(f.topKFrames(a, k))) as number[];
    assert.equal(new Set(got).size, k);
    got.forEach(v => assert.ok(a.includes(v)));
    assert.deepEqual(got.map(cnt), distinct.map(cnt).sort((x, y) => y - x).slice(0, k));
  }
});

test('sudokuFrames vs brute-force duplicate check on sparse boards', () => {
  for (let t = 0; t < 400; t++) {
    const g = Array.from({ length: 9 }, () => Array(9).fill('.'));
    for (let c = 0, n = rnd(14); c < n; c++) g[rnd(9)][rnd(9)] = String(1 + rnd(4));
    const filled: [number, number, string][] = [];
    g.forEach((row, i) => row.forEach((d, j) => { if (d !== '.') filled.push([i, j, d]); }));
    const bad = filled.some(([i, j, d], x) => filled.some(([i2, j2, d2], y) => x < y && d === d2 && (i === i2 || j === j2 || (Math.floor(i / 3) === Math.floor(i2 / 3) && Math.floor(j / 3) === Math.floor(j2 / 3)))));
    assert.equal(ans(f.sudokuFrames(g.map(r => r.join('')))), String(!bad), g.map(r => r.join('')).join('/'));
  }
});

test('happyFrames vs simulation', () => {
  const sq = (n: number) => String(n).split('').reduce((a, d) => a + Number(d) ** 2, 0);
  for (let n = 1; n <= 300; n++) {
    let x = n; for (let i = 0; i < 1000; i++) x = sq(x);
    assert.equal(ans(f.happyFrames(n)), String(x === 1), String(n));
  }
});

test('firstUniqueFrames vs indexOf/lastIndexOf scan', () => {
  for (let t = 0; t < 400; t++) {
    const s = str(rnd(9), 'abcd');
    const exp = [...s].findIndex(c => s.indexOf(c) === s.lastIndexOf(c));
    assert.equal(ans(f.firstUniqueFrames(s)), String(exp), s);
  }
});
