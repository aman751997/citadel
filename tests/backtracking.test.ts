import test from 'node:test';
import assert from 'node:assert/strict';
import { solveLab } from '../src/lib/lab.ts';
import { answerMatches } from '../src/lib/review.ts';
import { lab, fromInput, type BacktrackState } from '../src/lib/labs/backtracking.ts';
import { subsets, subsetsDup, combinations, comboSum, letters, permutations, wordSearch, palindrome, queens, permDup, mixedReview } from '../src/data/backtracking/traces.ts';
import { hints } from '../src/data/backtracking/hints.ts';
import { practice, conceptIds } from '../src/data/practice/backtracking.ts';

// ---------- independent helpers (deliberately naive: bitmasks, odometers, brute force) ----------
const keyOf = (a: number[]) => [...a].sort((x, y) => x - y).join(',');
const maskSubsets = (a: number[]) => Array.from({ length: 1 << a.length }, (_, m) => a.filter((_, i) => (m >> i) & 1));
const distinctSubsetKeys = (a: number[]) => new Set(maskSubsets(a).map(keyOf));
function nextPerm(x: number[]): boolean {
  let i = x.length - 2;
  while (i >= 0 && x[i] >= x[i + 1]) i--;
  if (i < 0) return false;
  let j = x.length - 1;
  while (x[j] <= x[i]) j--;
  [x[i], x[j]] = [x[j], x[i]];
  for (let l = i + 1, r = x.length - 1; l < r; l++, r--) [x[l], x[r]] = [x[r], x[l]];
  return true;
}
const lexOrderings = (a: number[]) => { const x = [...a].sort((p, q) => p - q), out = [x.slice()]; while (nextPerm(x)) out.push(x.slice()); return out; };
function odometer(coins: number[], target: number): string[] {          // multiplicity vectors
  const distinct = [...new Set(coins)], cnt = distinct.map(() => 0), out: string[] = [];
  for (;;) {
    const total = cnt.reduce((s, c, i) => s + c * distinct[i], 0);
    if (total === target) out.push(keyOf(cnt.flatMap((c, i) => Array(c).fill(distinct[i]))));
    let p = 0;
    while (p < distinct.length && cnt[p] === Math.floor(target / distinct[p])) { cnt[p] = 0; p++; }
    if (p === distinct.length) return out;
    cnt[p]++;
  }
}
function bfsSpell(rows: string[], word: string): boolean {               // states: cell + visited mask
  const R = rows.length, C = rows[0].length;
  let layer: [number, number][] = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (rows[r][c] === word[0]) layer.push([r * C + c, 1 << (r * C + c)]);
  for (let k = 1; k < word.length && layer.length; k++) {
    const next: [number, number][] = [];
    for (const [cell, mask] of layer) {
      const r = Math.floor(cell / C), c = cell % C;
      for (const [nr, nc] of [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]]) {
        if (nr < 0 || nc < 0 || nr >= R || nc >= C) continue;
        const nb = nr * C + nc;
        if ((mask >> nb) & 1 || rows[nr][nc] !== word[k]) continue;
        next.push([nb, mask | (1 << nb)]);
      }
    }
    layer = next;
  }
  return layer.length > 0;
}
// The lesson's word search and its two named bugs, on a mutable grid.
function spell(rows: string[], word: string, mode: 'ok' | 'noRestore' | 'noMark'): boolean {
  const g = rows.map(r => r.split(''));
  const go = (r: number, c: number, k: number): boolean => {
    if (k === word.length) return true;
    if (r < 0 || c < 0 || r >= g.length || c >= g[0].length || g[r][c] !== word[k]) return false;
    const saved = g[r][c];
    if (mode !== 'noMark') g[r][c] = '#';
    const f = go(r + 1, c, k + 1) || go(r - 1, c, k + 1) || go(r, c + 1, k + 1) || go(r, c - 1, k + 1);
    if (mode === 'ok') g[r][c] = saved;
    return f;
  };
  for (let r = 0; r < g.length; r++) for (let c = 0; c < g[0].length; c++) if (go(r, c, 0)) return true;
  return false;
}
const isPal = (s: string) => s === [...s].reverse().join('');
function gapCuts(s: string): string[][] {
  const out: string[][] = [];
  for (let m = 0; m < 1 << Math.max(0, s.length - 1); m++) {
    const pieces: string[] = [];
    let from = 0;
    for (let g = 0; g < s.length - 1; g++) if ((m >> g) & 1) { pieces.push(s.slice(from, g + 1)); from = g + 1; }
    pieces.push(s.slice(from));
    if (pieces.every(isPal)) out.push(pieces);
  }
  return out;
}
function queenBoards(n: number): number[][] {                           // every column order, filtered
  const x = Array.from({ length: n }, (_, i) => i), out: number[][] = [];
  if (n === 0) return out;
  do {
    let good = true;
    for (let a = 0; a < n && good; a++) for (let b = a + 1; b < n && good; b++) if (Math.abs(a - b) === Math.abs(x[a] - x[b])) good = false;
    if (good) out.push(x.slice());
  } while (nextPerm(x));
  return out;
}
const fact = (n: number): number => (n <= 1 ? 1 : n * fact(n - 1));
// Generic buggy-variant runner for the subsets family.
function subsetsRun(a: number[], opts: { unchoose?: boolean; alias?: boolean; skip?: 'start' | 'zero' | 'none'; sort?: boolean } = {}) {
  const items = opts.sort ? [...a].sort((x, y) => x - y) : [...a];
  const book: number[][] = [], path: number[] = [];
  let calls = 0;
  const walk = (start: number) => {
    calls++;
    book.push(opts.alias ? path : [...path]);
    for (let i = start; i < items.length; i++) {
      if (opts.skip === 'start' && i > start && items[i] === items[i - 1]) continue;
      if (opts.skip === 'zero' && i > 0 && items[i] === items[i - 1]) continue;
      path.push(items[i]); walk(i + 1);
      if (opts.unchoose !== false) path.pop();
    }
  };
  walk(0);
  return { book, calls };
}
function permRun(a: number[], rule: 'not' | 'used' | 'any' | 'none' | 'noReset') {
  const x = [...a].sort((p, q) => p - q), used = x.map(() => false), book: number[][] = [], path: number[] = [];
  let calls = 0;
  const walk = () => {
    calls++;
    if (path.length === x.length) { book.push([...path]); return; }
    for (let i = 0; i < x.length; i++) {
      if (used[i]) continue;
      const twin = i > 0 && x[i] === x[i - 1];
      if (twin && ((rule === 'not' && !used[i - 1]) || (rule === 'used' && used[i - 1]) || rule === 'any')) continue;
      used[i] = true; path.push(x[i]); walk(); path.pop();
      if (rule !== 'noReset') used[i] = false;
    }
  };
  walk();
  return { book, calls };
}
const cells = (r: { cells: { value: string }[] }) => r.cells.map(c => c.value);
const correct = (s: { answer: number; choices: { label: string }[] }) => s.choices[s.answer].label;

// ---------- traces ----------
test('every trace step has a valid answer and real feedback for each choice', () => {
  for (const steps of [subsets, subsetsDup, combinations, comboSum, letters, permutations, wordSearch, palindrome, queens, permDup, mixedReview]) for (const s of steps) {
    assert.ok(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length);
    for (const c of s.choices) assert.ok(c.feedback.length > 20, c.label);
  }
});

test('chapter 1-3 trace numbers', () => {
  const noUndo = subsetsRun([1, 2, 3], { unchoose: false }).book;
  assert.deepEqual(noUndo[4], [1, 2, 3, 3]);
  assert.match(subsets[0].choices[0].feedback, /fifth page reads \[1, 2, 3, 3\] where \[1, 3\] belongs/);
  assert.deepEqual(subsetsRun([1, 2, 3]).book[4], [1, 3]);
  const aliased = subsetsRun([1, 2, 3], { alias: true }).book;
  assert.equal(aliased.length, 8);
  assert.ok(aliased.every(p => p.length === 0));
  assert.match(correct(subsets[1]), /8 empty lists/);
  const full = subsetsRun([1, 2, 3]);
  assert.equal(full.book.length, 8);
  assert.deepEqual(full.book, [[], [1], [1, 2], [1, 2, 3], [1, 3], [2], [2, 3], [3]]);
  assert.match(correct(subsets[2]), /^8/);
  // leaves of the loop tree: nodes with no child
  const leaves = full.book.filter(p => p.length === 0 ? false : p[p.length - 1] === 3);
  assert.deepEqual(leaves, [[1, 2, 3], [1, 3], [2, 3], [3]]);
  // Subsets II
  assert.deepEqual(subsetsRun([1, 2, 2], { skip: 'start', sort: true }).book, [[], [1], [1, 2], [1, 2, 2], [2], [2, 2]]);
  assert.equal(subsetsRun([1, 2, 2], { skip: 'zero', sort: true }).book.length, 4);
  assert.match(subsetsDup[1].choices[1].feedback, /4 pages instead of 6/);
  const unsorted = subsetsRun([2, 1, 2], { skip: 'start' }).book;
  assert.equal(unsorted.length, 8);
  assert.equal(unsorted.filter(p => p.join() === '2').length, 2);
  assert.match(subsetsDup[2].choices[2].feedback, /8 pages with \[2\] twice/);
  assert.equal(subsetsRun(Array(10).fill(7)).calls, 1024);
  assert.equal(subsetsRun(Array(10).fill(7), { skip: 'start' }).calls, 11);
  // Combinations
  const combos = (n: number, k: number, bound: (need: number) => number) => {
    const out: number[][] = [], path: number[] = [];
    const walk = (start: number) => {
      if (path.length === k) { out.push([...path]); return; }
      for (let i = start; i <= bound(k - path.length); i++) { path.push(i); walk(i + 1); path.pop(); }
    };
    walk(1);
    return out;
  };
  assert.equal(4 - 2 + 1, 3);
  assert.match(correct(combinations[0]), /n − need \+ 1/);
  assert.deepEqual(combos(4, 2, need => 4 - need + 1).map(keyOf).sort(), maskSubsets([1, 2, 3, 4]).filter(s => s.length === 2).map(keyOf).sort());
  assert.deepEqual(combos(4, 2, need => 4 - need), [[1, 2], [1, 3], [2, 3]]);
  assert.match(correct(combinations[2]), /^3: \[1, 2\], \[1, 3\], \[2, 3\]/);
});

test('chapter 4-6 trace numbers', () => {
  const cs = (c: number[], target: number, child: (i: number) => number) => {
    const out: number[][] = [], path: number[] = [];
    const walk = (remain: number, start: number) => {
      if (remain === 0) { out.push([...path]); return; }
      for (let i = start; i < c.length; i++) { if (c[i] > remain) break; path.push(c[i]); walk(remain - c[i], child(i)); path.pop(); }
    };
    walk(target, 0);
    return out;
  };
  const c = [2, 3, 6, 7];
  assert.deepEqual(cs(c, 7, i => i), [[2, 2, 3], [7]]);
  assert.deepEqual(new Set(cs(c, 7, i => i).map(keyOf)), new Set(odometer(c, 7)));
  assert.deepEqual(cs(c, 7, i => i + 1), [[7]]);
  assert.match(comboSum[0].choices[0].feedback, /the book holds only \[7\]/);
  assert.deepEqual(cs(c, 7, () => 0), [[2, 2, 3], [2, 3, 2], [3, 2, 2], [7]]);
  assert.equal(7 - 2 - 2 - 2, 1);
  assert.equal(7 - 3, 4); assert.equal(4 - 3, 1);
  // Letters
  const words = ['a', 'b', 'c'].flatMap(x => ['d', 'e', 'f'].map(y => x + y));
  assert.equal(words.length, 9);
  assert.equal(words[3], 'bd'); assert.equal(words[1], 'ae'); assert.equal(words[6], 'cd');
  assert.match(correct(letters[0]), /3 × 3 = 9/);
  assert.equal(correct(letters[2]), 'bd');
  // Permutations
  assert.deepEqual(permRun([1, 2, 3], 'noReset').book, [[1, 2, 3]]);
  assert.equal(permRun([1, 2, 3], 'none').calls, 16);
  assert.equal(1 + 3 + 6 + 6, 16);
  assert.match(correct(permutations[2]), /^16/);
  assert.equal(permRun([1, 2, 3], 'none').book.length, fact(3));
});

test('chapter 7-9 trace numbers', () => {
  assert.equal(spell(['AB', 'AA'], 'AAB', 'ok'), true);
  assert.equal(bfsSpell(['AB', 'AA'], 'AAB'), true);
  assert.equal(spell(['AB', 'AA'], 'AAB', 'noRestore'), false);
  assert.equal(spell(['AB'], 'ABA', 'ok'), false);
  assert.equal(spell(['AB'], 'ABA', 'noMark'), true);
  assert.deepEqual(cells(wordSearch[0].rows[0]), ['#', 'B']);
  // Palindrome Partitioning
  assert.deepEqual(new Set(gapCuts('aab').map(p => p.join('|'))), new Set(['a|a|b', 'aa|b']));
  assert.deepEqual(['a', 'aa', 'aab'].filter(isPal), ['a', 'aa']);
  assert.match(correct(palindrome[0]), /^a and aa$/);
  assert.equal(correct(palindrome[2]), '2');
  assert.equal(2 ** 2, 4);
  // N-Queens
  const safe = (qs: [number, number][], r: number, c: number) => qs.every(([y, x]) => x !== c && y - x !== r - c && y + x !== r + c);
  assert.deepEqual([0, 1, 2, 3].filter(c => safe([[0, 1]], 1, c)), [3]);
  assert.match(correct(queens[0]), /^Only 3/);
  assert.deepEqual([0, 1, 2, 3].filter(c => safe([[0, 0], [1, 2]], 2, c)), []);
  assert.equal(2 + 1, 3); assert.equal(2 - 3, -1); assert.equal(1 - 2, -1);
  assert.deepEqual(cells(queens[1].rows[0]).map(Number), [-3, -2, -1, 0, 1, 2, 3]);
  assert.deepEqual(queenBoards(4), [[1, 3, 0, 2], [2, 0, 3, 1]]);
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => queenBoards(n).length), [1, 0, 0, 2, 10, 4, 40, 92, 352]);
});

test('Permutations II trace numbers', () => {
  assert.equal(permRun([1, 1, 1, 1], 'not').calls, 5);
  assert.equal(permRun([1, 1, 1, 1], 'used').calls, 23);
  assert.deepEqual(permRun([1, 1, 1, 1], 'used').book, [[1, 1, 1, 1]]);
  assert.deepEqual(permRun([1, 1, 2], 'any').book, []);
  assert.deepEqual(permRun([1, 1, 2], 'not').book, [[1, 1, 2], [1, 2, 1], [2, 1, 1]]);
  const none = permRun([1, 1, 2], 'none').book;
  assert.equal(none.length, 6); assert.equal(new Set(none.map(p => p.join())).size, 3);
  assert.match(correct(permDup[2]), /23 calls instead of 5/);
  for (const a of [[1, 1, 2, 2], [1, 2, 2, 3, 3], [4, 4, 4, 5]]) {
    const want = new Set(lexOrderings(a).map(p => p.join()));
    for (const rule of ['not', 'used'] as const) {
      const got = permRun(a, rule).book.map(p => p.join());
      assert.equal(got.length, want.size); assert.deepEqual(new Set(got), want);
    }
  }
  assert.equal(lexOrderings([1, 1, 2, 2]).length, 6);
});

test('mixed review numbers', () => {
  let a = 1, b = 1;                                        // ways(1) = 1, ways(2) = 2
  for (let n = 2; n <= 40; n++) [a, b] = [b, a + b];
  assert.equal(b, 165_580_141);
  assert.equal(200 * 100, 20_000);
  // greedy largest-first on [6, 5, 5], T = 10 fails although 5 + 5 works
  let left = 10; for (const x of [6, 5, 5]) if (x <= left) left -= x;
  assert.notEqual(left, 0);
  assert.ok(maskSubsets([6, 5, 5]).some(s => s.reduce((p, q) => p + q, 0) === 10));
  assert.equal(subsetsRun([1, 2, 2], { skip: 'zero', sort: true }).book.some(p => p.join() === '2,2'), false);
});

test('every hint ladder referenced by the lesson exists with three hints, and every trace is used', async () => {
  const { readFileSync } = await import('node:fs');
  const mdx = readFileSync(new URL('../src/dsa-lessons/backtracking.mdx', import.meta.url), 'utf8');
  const used = [...mdx.matchAll(/hints=\{hints\.(\w+)\}/g)].map(m => m[1]);
  assert.equal(used.length, 15);
  for (const key of used) assert.equal(hints[key]?.length, 3, key);
  for (const key of Object.keys(hints)) assert.ok(used.includes(key), `unused hint ${key}`);
  for (const name of ['subsets', 'subsetsDup', 'combinations', 'comboSum', 'letters', 'permutations', 'wordSearch', 'palindrome', 'queens', 'permDup', 'mixedReview'])
    assert.match(mdx, new RegExp(`steps=\\{${name}\\}`), name);
  for (const id of ['prologue', 'playground', 'subsets', 'subsets-ii', 'combinations', 'combination-sum', 'letter-combinations', 'permutations', 'word-search', 'palindrome-partitioning', 'n-queens', 'combination-sum-ii', 'permutations-ii', 'generate-parentheses', 'combination-sum-iii', 'restore-ip', 'k-partition', 'choose-the-tool', 'wider-family', 'exit-ticket', 'mixed-recall', 'independent-practice', 'cheat-sheet', 'beyond'])
    assert.match(mdx, new RegExp(`<h2 id="${id}">`), id);
});

// ---------- lab ----------
function bookKeys(book: number[][], sortInside: boolean) {
  const keys = book.map(p => (sortInside ? keyOf(p) : p.join(',')));
  assert.equal(new Set(keys).size, keys.length, `duplicate page in ${JSON.stringify(book)}`);
  return new Set(keys);
}
type Oracle = (start: BacktrackState, final: BacktrackState) => void;
const oracles: Record<string, Oracle> = {
  subsets: (s, f) => assert.deepEqual(bookKeys(f.book, true), distinctSubsetKeys(s.items)),
  combo: (s, f) => assert.deepEqual(bookKeys(f.book, true), new Set(odometer(s.items, s.target))),
  queens: (s, f) => assert.deepEqual(bookKeys(f.solutions, false), new Set(queenBoards(s.n).map(b => b.join(',')))),
};
function runCase(start: BacktrackState) {
  const { final, wrongMovesChangedBoard } = solveLab(lab, start, 50_000);
  assert.equal(final.done, true, `${start.mode} must terminate`);
  assert.equal(wrongMovesChangedBoard, false, `${start.mode}: a wrong move changed the board`);
  oracles[start.mode](start, final);
  if (start.mode !== 'queens') assert.deepEqual(final.path, [], 'the thread ends wound back');
  return final;
}

test('every lab mode and case terminates with the right result; wrong moves never change the board', () => {
  for (const [mode, info] of Object.entries(lab.modes)) {
    assert.ok(info.cases >= 3 && info.cases <= 4);
    for (let v = 0; v < info.cases; v++) runCase(lab.create(mode, v));
  }
  assert.deepEqual(runCase(lab.create('subsets', 0)).book, [[], [1], [1, 2], [1, 2, 3], [1, 3], [2], [2, 3], [3]]);
  assert.deepEqual(runCase(lab.create('subsets', 1)).book, [[], [1], [1, 2], [1, 2, 2], [2], [2, 2]]);
  assert.deepEqual(runCase(lab.create('subsets', 2)).book, [[]]);
  assert.deepEqual(runCase(lab.create('combo', 0)).book, [[2, 2, 3], [7]]);
  assert.deepEqual(runCase(lab.create('combo', 2)).book, []);
  assert.deepEqual(runCase(lab.create('queens', 0)).solutions, [[1, 3, 0, 2], [2, 0, 3, 1]]);
  assert.deepEqual(runCase(lab.create('queens', 2)).solutions, []);
});

test('every rejected move on every reachable state explains itself with real numbers', () => {
  for (const [mode, info] of Object.entries(lab.modes)) for (let v = 0; v < info.cases; v++) {
    let state = lab.create(mode, v);
    for (let guard = 0; guard < 2000; guard++) {
      for (const { action } of info.actions) {
        const result = lab.move(state, action);
        if (!result.accepted && !state.done) {
          assert.doesNotMatch(result.state.message, /undefined|NaN|\[object|null/, `${mode} case ${v}: ${action}`);
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
  let seed = 4242; const rnd = (n: number) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
  for (let t = 0; t < 150; t++) {
    const items = Array.from({ length: rnd(6) }, () => 1 + rnd(3));
    runCase({ ...lab.create('subsets'), ...fromInput({ mode: 'subsets', items }) });
    const pool = [1, 2, 3, 4, 5, 6, 7, 8].sort(() => 0).filter(() => rnd(2) === 1).slice(0, 4);
    const coins = pool.length ? pool : [2 + rnd(5)];
    runCase({ ...lab.create('combo'), ...fromInput({ mode: 'combo', items: coins, target: 1 + rnd(12) }) });
    runCase({ ...lab.create('queens'), ...fromInput({ mode: 'queens', n: 1 + rnd(6) }) });
  }
});

test('the lab catches the classic bugs with the board’s numbers', () => {
  // subsets: skipping the record, then the forgotten un-choose, then pinning the thread
  let s = lab.create('subsets', 0);                            // [1, 2, 3]
  assert.match(lab.move(s, 'choose').state.message, /haven’t recorded it/);
  assert.match(lab.move(s, 'alias').state.message, /every page would read \[ \]/);
  for (const a of ['record', 'choose', 'record', 'choose', 'record', 'choose', 'record']) s = lab.move(s, a).state;
  assert.deepEqual(s.path, [1, 2, 3]);
  assert.match(lab.move(s, 'choose').state.message, /No doors are left at this junction\. Wind the thread back first: remove 3/);
  s = lab.move(s, 'unchoose').state;                             // back at [1, 2]; its loop is exhausted, [1] still has door 3
  const forgot = lab.move(s, 'choose');
  assert.equal(forgot.accepted, false);
  assert.match(forgot.state.message, /forgotten un-choose: you would write \[1, 2, 3\] where \[1, 3\] belongs/);
  // twin rule: i == start is walked, i > start is skipped
  let d = lab.create('subsets', 1);                              // [1, 2, 2]
  for (const a of ['record', 'choose', 'record', 'choose', 'record']) d = lab.move(d, a).state;   // thread [1, 2], start = 2
  const zeroBug = lab.move(d, 'skip');
  assert.equal(zeroBug.accepted, false);
  assert.match(zeroBug.state.message, /i > 0 bug: \[1, 2, 2\] would never be written/);
  for (const a of ['choose', 'record', 'unchoose', 'unchoose']) d = lab.move(d, a).state;          // back at [1], next = index 2
  const twin = lab.move(d, 'choose');
  assert.equal(twin.accepted, false);
  assert.match(twin.state.message, /writes \[1, 2\] a second time/);
  // combo: prune and reuse
  let c = lab.create('combo', 0);                                // [2, 3, 6, 7], target 7
  assert.match(lab.move(c, 'choose-next').state.message, /forbids a second 2/);
  for (const a of ['choose', 'choose', 'choose']) c = lab.move(c, a).state;                       // [2, 2, 2], owe 1
  assert.equal(lab.expected(c), 'prune');
  assert.match(lab.move(c, 'choose').state.message, /2 > 1 still owed/);
  c = lab.move(c, 'prune').state;
  assert.equal(lab.expected(c), 'unchoose');
  // queens: the attacked square and the safe square
  let q = lab.create('queens', 0);                               // n = 4
  q = lab.move(q, 'place').state;                                // (0, 0)
  assert.match(lab.move(q, 'place').state.message, /column 0 already holds the queen at \(0, 0\)/);
  q = lab.move(q, 'skip').state;                                 // (1, 1) is on the diagonal
  assert.match(lab.move(q, 'place').state.message, /r − c = 0 is the diagonal/);
  q = lab.move(q, 'skip').state;                                 // (1, 2) is safe
  assert.match(lab.move(q, 'skip').state.message, /\(1, 2\) is safe/);
});

// ---------- practice ----------
function nums(prompt: string) { return [...prompt.matchAll(/\[([^\]]*)\]/g)].map(m => (m[1].trim() === '' ? [] : m[1].split(',').map(Number))); }
function num(prompt: string, re: RegExp) { const m = prompt.match(re); assert.ok(m, `${re} in ${prompt}`); return Number(m![1]); }
function str(prompt: string, re: RegExp) { const m = prompt.match(re); assert.ok(m, `${re} in ${prompt}`); return m![1]; }
const KEYPAD: Record<string, string> = { 2: 'abc', 3: 'def', 4: 'ghi', 5: 'jkl', 6: 'mno', 7: 'pqrs', 8: 'tuv', 9: 'wxyz' };

test('every practice answer matches an independent computation from the prompt', () => {
  assert.equal(practice.storageKey, 'citadel-backtracking-review-v1');
  assert.ok(conceptIds.length >= 10);
  assert.ok(Object.keys(practice.strategies).includes('other'));
  const strategiesUsed = new Set<string>();
  const sections = new Set<string>();
  for (const id of practice.conceptIds) {
    const prompts = new Set<string>();
    for (let variant = 0; variant <= 20; variant++) {
      const c = practice.challengeFor(id, variant);
      prompts.add(c.prompt);
      strategiesUsed.add(c.strategy);
      sections.add(c.section);
      assert.ok(c.strategy in practice.strategies, `${id}: unknown strategy`);
      assert.doesNotMatch(c.prompt, /backtrack|recurs|dfs|bfs|depth-first|breadth|prune|pruning|dynamic programming|memo|un-choose|thread/i, `${id}: the prompt must not name the technique`);
      const a = nums(c.prompt)[0] ?? [];
      let expected: number | number[] | boolean | string;
      switch (id) {
        case 'subsets-sum': { const cap = num(c.prompt, /at most (\d+)\./); expected = maskSubsets(a).filter(s => s.reduce((p, q) => p + q, 0) <= cap).length; break; }
        case 'subsets-dup': {   // product of (count + 1) over distinct values
          const counts = new Map<number, number>(); for (const x of a) counts.set(x, (counts.get(x) ?? 0) + 1);
          expected = [...counts.values()].reduce((p, k) => p * (k + 1), 1);
          assert.equal(expected, distinctSubsetKeys(a).size);
          break;
        }
        case 'combinations-kth': {
          const k = num(c.prompt, /pick (\d+) different/), n = num(c.prompt, /from 1 to (\d+),/), m = num(c.prompt, /pick number (\d+)\?/);
          const all = maskSubsets(Array.from({ length: n }, (_, i) => i + 1)).filter(s => s.length === k).sort((x, y) => { for (let i = 0; i < k; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; });
          expected = all[m - 1];
          break;
        }
        case 'combo-sum': expected = odometer(a, num(c.prompt, /worth exactly (\d+)\./)).length; break;
        case 'letters-kth': {
          const digits = str(c.prompt, /digits "(\d+)"/), m = num(c.prompt, /word number (\d+)\?/);
          const all: string[] = [];
          for (const x of KEYPAD[digits[0]]) for (const y of KEYPAD[digits[1]]) all.push(x + y);
          expected = all[m - 1];
          break;
        }
        case 'perm-kth': expected = lexOrderings(a)[num(c.prompt, /ordering number (\d+)\?/) - 1]; break;
        case 'word-search': expected = bfsSpell(str(c.prompt, /rows ([A-Z /]+) \(top/).split(' / '), str(c.prompt, /spell ([A-Z]+) by/)); break;
        case 'palindrome': expected = gapCuts(str(c.prompt, /word "([a-z]+)"/)).length; break;
        case 'queens': { const n = num(c.prompt, /^Place (\d+) queens/), col = num(c.prompt, /stand in column (\d+)/); expected = queenBoards(n).filter(b => b[0] === col).length; break; }
        case 'combo-sum-ii': { const t = num(c.prompt, /total exactly (\d+)\?/); expected = new Set(maskSubsets(a).filter(s => s.reduce((p, q) => p + q, 0) === t).map(keyOf)).size; break; }
        case 'perm-dup': {
          const counts = new Map<number, number>(); for (const x of a) counts.set(x, (counts.get(x) ?? 0) + 1);
          expected = fact(a.length) / [...counts.values()].reduce((p, k) => p * fact(k), 1);
          break;
        }
        case 'parens': {
          const n = num(c.prompt, /strings of (\d+) opening/), cap = num(c.prompt, /more than (\d+) brackets/);
          let count = 0;
          for (let m = 0; m < 1 << (2 * n); m++) {
            let open = 0, ok = true;
            for (let i = 0; i < 2 * n && ok; i++) { open += (m >> i) & 1 ? 1 : -1; if (open < 0 || open > cap) ok = false; }
            if (ok && open === 0) count++;
          }
          expected = count;
          break;
        }
        case 'combo-sum-iii': {
          const k = num(c.prompt, /exactly (\d+) different/), n = num(c.prompt, /up to exactly (\d+)\./);
          expected = maskSubsets([1, 2, 3, 4, 5, 6, 7, 8, 9]).filter(s => s.length === k && s.reduce((p, q) => p + q, 0) === n).length;
          break;
        }
        case 'ip': {
          const s = str(c.prompt, /digits "(\d+)"/);
          let count = 0;
          for (let i = 1; i < s.length; i++) for (let j = i + 1; j < s.length; j++) for (let l = j + 1; l < s.length; l++) {
            const parts = [s.slice(0, i), s.slice(i, j), s.slice(j, l), s.slice(l)];
            if (parts.every(p => p.length <= 3 && Number(p) <= 255 && String(Number(p)) === p)) count++;
          }
          expected = count;
          break;
        }
        case 'k-partition': {
          const k = num(c.prompt, /among (\d+) heirs/);
          let found = false;
          for (let code = 0; code < k ** a.length && !found; code++) {
            const sums = Array(k).fill(0); let x = code;
            for (const v of a) { sums[x % k] += v; x = Math.floor(x / k); }
            if (sums.every(v => v === sums[0])) found = true;
          }
          expected = found;
          break;
        }
        case 'count-ways': expected = odometer(a, num(c.prompt, /price of (\d+)\?/)).length; break;
        case 'fewest-moves': {   // repeated relaxation until nothing changes (no queue)
          const rows = str(c.prompt, /rows ([.# /]+) \(top/).split(' / ');
          const R = rows.length, C = rows[0].length, INF = 1e9;
          const dist = rows.map(r => r.split('').map(() => INF));
          dist[0][0] = 0;
          for (let changed = true; changed;) {
            changed = false;
            for (let r = 0; r < R; r++) for (let col = 0; col < C; col++) {
              if (rows[r][col] === '#') continue;
              for (const [nr, nc] of [[r + 1, col], [r - 1, col], [r, col + 1], [r, col - 1]])
                if (nr >= 0 && nc >= 0 && nr < R && nc < C && rows[nr][nc] !== '#' && dist[nr][nc] + 1 < dist[r][col]) { dist[r][col] = dist[nr][nc] + 1; changed = true; }
            }
          }
          expected = dist[R - 1][C - 1] >= INF ? -1 : dist[R - 1][C - 1];
          break;
        }
        default: throw new Error(`untested concept ${id}`);
      }
      assert.deepEqual(c.answer, expected, `${id} variant ${variant}`);
      const typed = typeof expected === 'boolean' ? (expected ? 'yes' : 'no') : typeof expected === 'string' ? expected : JSON.stringify(expected);
      assert.equal(answerMatches(c, typed), true, `${id} variant ${variant}: ${typed}`);
      assert.equal(answerMatches(c, 'not an answer'), false);
      assert.equal(c.hints.length, 3); assert.equal(c.rubric.length, 3);
      assert.doesNotMatch(c.explanation + c.prompt, /undefined|NaN/);
    }
    assert.ok(prompts.size >= 2, `${id}: the input must vary with the variant`);
  }
  assert.ok(strategiesUsed.size >= 6);
  for (const id of ['subsets', 'subsets-ii', 'combinations', 'combination-sum', 'letter-combinations', 'permutations', 'word-search', 'palindrome-partitioning', 'n-queens', 'combination-sum-ii', 'permutations-ii', 'generate-parentheses', 'combination-sum-iii', 'restore-ip', 'k-partition', 'choose-the-tool'])
    assert.ok(sections.has(id), `no practice concept for section ${id}`);
});
