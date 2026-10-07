import test from 'node:test';
import assert from 'node:assert/strict';
import { solveLab } from '../src/lib/lab.ts';
import { answerMatches } from '../src/lib/review.ts';
import { lab, fromInput, type PrefixState } from '../src/lib/labs/prefix-sum.ts';
import { rangeSum, pivot, product, countK, multipleK, mixedReview } from '../src/data/prefix-sum/traces.ts';
import { hints } from '../src/data/prefix-sum/hints.ts';
import { practice, conceptIds } from '../src/data/practice/prefix-sum.ts';

// ---------- independent helpers (deliberately naive) ----------
const total = (a: number[], l: number, r: number) => a.slice(l, r + 1).reduce((s, x) => s + x, 0);
const ledger = (a: number[]) => a.reduce((p, x) => [...p, p[p.length - 1] + x], [0]);
const runs = (a: number[]) => { const out: { l: number; r: number; s: number }[] = []; for (let l = 0; l < a.length; l++) for (let r = l; r < a.length; r++) out.push({ l, r, s: total(a, l, r) }); return out; };
const countExact = (a: number[], k: number) => runs(a).filter(x => x.s === k).length;
const brutePivot = (a: number[]) => a.findIndex((_, i) => total(a, 0, i - 1) === total(a, i + 1, a.length - 1));
const exceptSelf = (a: number[]) => a.map((_, i) => a.reduce((p, x, j) => (j === i ? p : p * x), 1) + 0);
const mod = (x: number, k: number) => ((x % k) + k) % k;
const cells = (row: { cells: { value: string }[] }) => row.cells.map(c => c.value);
const nums = (row: { cells: { value: string }[] }) => cells(row).map(Number);
const correct = (s: { answer: number; choices: { label: string }[] }) => s.choices[s.answer].label;

test('every trace step has a valid answer and feedback for each choice', () => {
  for (const steps of [rangeSum, pivot, product, countK, multipleK, mixedReview]) for (const s of steps) {
    assert.ok(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length);
    for (const c of s.choices) assert.ok(c.feedback.length > 20, c.label);
  }
});

test('chapter 1 trace numbers match an independent ledger', () => {
  const a = [3, 1, 4, 1, 5], p = ledger(a);
  assert.deepEqual(nums(rangeSum[0].rows[0]), a);
  assert.deepEqual(nums(rangeSum[0].rows[1]), p);
  assert.equal(total(a, 1, 3), 6);
  assert.match(correct(rangeSum[0]), new RegExp(`prefix\\[4\\] − prefix\\[1\\] = ${p[4]} − ${p[1]} = 6`));
  assert.match(rangeSum[0].choices[1].label, new RegExp(`= ${p[3] - p[1]}$`));   // the version that drops position 3
  assert.equal(p[3] - p[1], total(a, 1, 2));
  assert.match(rangeSum[0].choices[2].label, new RegExp(`= ${p[4] - p[2]}$`));
  assert.equal(p[4] - p[2], total(a, 2, 3));
  assert.equal(p[3], 8); assert.equal(total(a, 0, 2), 8);
  assert.match(correct(rangeSum[1]), /prefix\[0\] = 0/);
  // Figure in chapter 1: LeetCode example
  const lc = [-2, 0, 3, -5, 2, -1], q = ledger(lc);
  assert.deepEqual(q, [0, -2, -2, 1, -4, -2, -3]);
  assert.deepEqual([q[3] - q[0], q[6] - q[2], q[6] - q[0], q[2] - q[0]], [1, -1, -3, -2]);
});

test('chapter 2 and 3 trace numbers', () => {
  const a = [1, 7, 3, 6, 5, 6];
  assert.equal(total(a, 0, 5), 28); assert.equal(total(a, 0, 2), 11); assert.equal(total(a, 4, 5), 11);
  assert.equal(brutePivot(a), 3);
  assert.match(correct(pivot[0]), /28 − 11 − 6 = 11/);
  assert.equal(brutePivot([2, 1, -1]), 0);
  assert.match(correct(pivot[1]), /^Yes/);
  const nums4 = [1, 2, 3, 4];
  const left = nums4.map((_, i) => nums4.slice(0, i).reduce((p, x) => p * x, 1));
  assert.deepEqual(nums(product[0].rows[1]), left);
  assert.deepEqual(exceptSelf(nums4), [24, 12, 8, 6]);
  assert.match(correct(product[0]), /= 6$/);
  assert.match(correct(product[1]), /2 × 4 = 8/);
  assert.deepEqual(exceptSelf([-1, 1, 0, -3, 3]), [0, 0, 9, 0, 0]);
  assert.match(correct(product[2]), /Only index 2.*9/);
});

test('chapter 4 and 5 trace numbers', () => {
  const a = [3, 4, 7, -2, 2], k = 7;
  assert.equal(countExact(a, k), 3);
  assert.deepEqual(ledger(a), [0, 3, 7, 14, 12, 14]);
  // vault after reading 3 and 4, before index 2
  assert.deepEqual(cells(countK[1].rows[1]), ['0 ×1', '3 ×1', '7 ×1']);
  assert.deepEqual(ledger(a).slice(0, 3), [0, 3, 7]);
  assert.equal(runs(a).filter(x => x.r === 2 && x.s === k).length, 1);
  assert.equal(runs(a).filter(x => x.r <= 2 && x.s === k).length, 2);
  assert.equal(countExact([1], 0), 0);
  assert.equal(countExact([1, -1, 1, -1], 0), 4);
  assert.equal(countExact([1, 2, 3], 3), 2);
  const b = [23, 2, 4, 6, 7];
  assert.deepEqual(ledger(b).slice(1).map(x => x % 6), [5, 1, 5, 5, 0]);
  assert.deepEqual(nums(multipleK[0].rows[1]).slice(0, 3), [5, 1, 5]);
  assert.equal(total(b, 1, 2) % 6, 0); assert.notEqual(total(b, 0, 2) % 6, 0);
  // [5, 0, 0], k = 3: positions 1..2 total 0; keeping the latest index would miss it
  assert.deepEqual(ledger([5, 0, 0]).slice(1).map(x => x % 3), [2, 2, 2]);
  assert.equal(total([5, 0, 0], 1, 2) % 3, 0);
});

test('mixed review numbers', () => {
  assert.equal(countExact([1, -1, 1], 1), 3);
  // a window that only shrinks when the sum exceeds k never shrinks on [1, -1, 1], k = 1
  let found = 0, sum = 0; for (const x of [1, -1, 1]) { sum += x; if (sum === 1) found++; }
  assert.equal(found, 2);
  assert.equal(mod(-1, 5), 4); assert.equal(-1 % 5, -1);
  const prefixMax = [5, 1, 2].reduce((p, x) => [...p, Math.max(p[p.length - 1], x)], [5]);
  assert.equal(prefixMax[3] - prefixMax[1], 0); assert.equal(Math.max(1, 2), 2);
  assert.equal(20000 * 20000, 400_000_000);
});

test('every hint ladder referenced by the lesson exists with three hints', async () => {
  const { readFileSync } = await import('node:fs');
  const mdx = readFileSync(new URL('../src/dsa-lessons/prefix-sum.mdx', import.meta.url), 'utf8');
  const used = [...mdx.matchAll(/hints=\{hints\.(\w+)\}/g)].map(m => m[1]);
  assert.ok(used.length >= 11);
  for (const key of used) assert.equal(hints[key]?.length, 3, key);
  for (const key of Object.keys(hints)) assert.ok(used.includes(key), `unused hint ${key}`);
});

// ---------- lab ----------
type Oracle = (start: PrefixState, final: PrefixState) => void;
const oracles: Record<string, Oracle> = {
  ledger: (s, f) => {
    assert.deepEqual(f.prefix, ledger(s.a));
    assert.deepEqual(f.answers, s.queries.map(([l, r]) => total(s.a, l, r)));
  },
  vault: (s, f) => assert.equal(f.count, countExact(s.a, s.k)),
  board: (s, f) => {
    const expect = Array(s.n).fill(0);
    for (const [l, r, v] of s.updates) for (let i = l; i <= r; i++) expect[i] += v;
    assert.deepEqual(f.out, expect);
  },
};
function runCase(start: PrefixState) {
  const { final, wrongMovesChangedBoard } = solveLab(lab, start, 2000);
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
          assert.doesNotMatch(result.state.message, /undefined|NaN|\[object/, `${mode} case ${v}: ${action}`);
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
  let seed = 97; const rnd = (n: number) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
  for (let t = 0; t < 150; t++) {
    const a = Array.from({ length: rnd(8) }, () => rnd(11) - 5);
    const queries: [number, number][] = a.length ? Array.from({ length: 1 + rnd(3) }, () => { const l = rnd(a.length); return [l, l + rnd(a.length - l)]; }) : [];
    runCase({ ...lab.create('ledger'), ...fromInput({ mode: 'ledger', a, queries }) });
    runCase({ ...lab.create('vault'), ...fromInput({ mode: 'vault', a, k: rnd(7) - 3 }) });
    const n = 1 + rnd(6);
    const updates: [number, number, number][] = Array.from({ length: rnd(4) }, () => { const l = rnd(n); return [l, l + rnd(n - l), rnd(9) - 3]; });
    runCase({ ...lab.create('board'), ...fromInput({ mode: 'board', n, updates }) });
  }
});

test('the lab catches the seed and record-before-count bugs with the board numbers', () => {
  const s = lab.create('vault', 0);                       // [1, 2, 3], k = 3
  const early = lab.move(s, 'add');
  assert.equal(early.accepted, false);
  assert.match(early.state.message, /a\[0\.\.1\] sums to 3/);
  let state = lab.move(s, 'seed').state;
  state = lab.move(state, 'add').state;
  const recordFirst = lab.move(state, 'record');
  assert.equal(recordFirst.accepted, false);
  assert.match(recordFirst.state.message, /Count first, then record/);
  const zero = lab.create('vault', 2);                    // k = 0
  let z = lab.move(lab.move(zero, 'seed').state, 'add').state;
  assert.match(lab.move(z, 'record').state.message, /matches itself/);
  const ledgerState = lab.create('ledger', 0);
  let l = ledgerState; for (let i = 0; i < 5; i++) l = lab.move(l, 'write').state;
  assert.match(lab.move(l, 'short').state.message, /leaves out a\[3\] = 1/);
  const board = lab.create('board', 0);
  assert.match(lab.move(board, 'mark-r').state.message, /slot 1 would miss its \+10/);
});

// ---------- practice ----------
function arrays(prompt: string) { return [...prompt.matchAll(/\[([^\]]*)\]/g)].map(m => m[1].trim() === '' ? [] : m[1].split(',').map(Number)); }
function num(prompt: string, re: RegExp) { const m = prompt.match(re); assert.ok(m, `${re} in ${prompt}`); return Number(m![1]); }

test('every practice answer matches an independent computation from the prompt', () => {
  assert.equal(practice.storageKey, 'citadel-prefix-sum-review-v1');
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
      assert.doesNotMatch(c.prompt, /prefix|running total|hash|sliding|window|difference array|Fenwick|segment tree/i, `${id}: the prompt must not name the technique`);
      const a = arrays(c.prompt)[0] ?? [];
      let expected: number | number[] | boolean;
      switch (id) {
        case 'range-sum': expected = total(a, num(c.prompt, /l = (\d+)/), num(c.prompt, /r = (\d+)/)); break;
        case 'pivot': expected = brutePivot(a); break;
        case 'product': expected = exceptSelf(a); break;
        case 'count-k': expected = countExact(a, num(c.prompt, /exactly (-?\d+)\?/)); break;
        case 'multiple-k': { const k = num(c.prompt, /multiple of (\d+)\?/); expected = runs(a).some(x => x.r > x.l && x.s % k === 0); break; }
        case 'equal-01': expected = Math.max(0, ...runs(a).filter(x => 2 * x.s === x.r - x.l + 1).map(x => x.r - x.l + 1)); break;
        case 'divisible': { const k = num(c.prompt, /divisible by (\d+)\?/); expected = runs(a).filter(x => mod(x.s, k) === 0).length; break; }
        case 'nice': { const k = num(c.prompt, /exactly (\d+) odd/); expected = runs(a).filter(x => a.slice(x.l, x.r + 1).filter(v => Math.abs(v) % 2 === 1).length === k).length; break; }
        case 'xor': { const l = num(c.prompt, /l = (\d+)/), r = num(c.prompt, /r = (\d+)/); expected = a.slice(l, r + 1).reduce((x, y) => x ^ y, 0); break; }
        case 'grid': {
          const rows = arrays(c.prompt);
          const m = c.prompt.match(/rows (\d+) to (\d+) and columns (\d+) to (\d+)/)!.slice(1).map(Number);
          expected = 0; for (let r = m[0]; r <= m[1]; r++) for (let col = m[2]; col <= m[3]; col++) expected += rows[r][col];
          break;
        }
        case 'range-updates': {
          const n = num(c.prompt, /^(\d+) counters/);
          expected = Array(n).fill(0);
          for (const m of c.prompt.matchAll(/\((\d+), (\d+), (-?\d+)\)/g)) for (let i = Number(m[1]); i <= Number(m[2]); i++) (expected as number[])[i] += Number(m[3]);
          break;
        }
        case 'positive-window': { const t = num(c.prompt, /at least (\d+)\?/); const ok = runs(a).filter(x => x.s >= t).map(x => x.r - x.l + 1); expected = ok.length ? Math.min(...ok) : 0; assert.ok(a.every(x => x > 0)); break; }
        case 'live-updates': {
          const i = num(c.prompt, /setting position (\d+)/), x = num(c.prompt, /to (\d+), what/);
          const l = num(c.prompt, /positions (\d+) to \d+\?/), r = num(c.prompt, /positions \d+ to (\d+)\?/);
          const b = [...a]; b[i] = x; expected = total(b, l, r); break;
        }
        default: throw new Error(`untested concept ${id}`);
      }
      assert.deepEqual(c.answer, expected, `${id} variant ${variant}`);
      const typed = typeof expected === 'boolean' ? (expected ? 'yes' : 'no') : JSON.stringify(expected);
      assert.equal(answerMatches(c, typed), true, `${id} variant ${variant}: ${typed}`);
      assert.equal(answerMatches(c, 'not an answer'), false);
      assert.equal(c.hints.length, 3); assert.equal(c.rubric.length, 3);
    }
    assert.ok(prompts.size >= 2, `${id}: the input must vary with the variant`);
  }
  assert.ok(strategiesUsed.size >= 5);
});
