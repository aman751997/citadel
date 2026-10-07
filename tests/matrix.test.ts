import test from 'node:test';
import assert from 'node:assert/strict';
import { solveLab } from '../src/lib/lab.ts';
import { answerMatches } from '../src/lib/review.ts';
import { lab, fromInput, type MatrixState } from '../src/lib/labs/matrix.ts';
import { rotate, spiral, zeroes, pow, mixedReview } from '../src/data/matrix/traces.ts';
import { hints } from '../src/data/matrix/hints.ts';
import { practice, conceptIds } from '../src/data/practice/matrix.ts';

// ---------- independent helpers (deliberately naive) ----------
type G = number[][];
const copy = (m: G) => m.map(r => [...r]);
// Rotation by a fresh array and the index map, never by swaps.
const rotCW = (m: G) => { const n = m.length, o = copy(m); for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) o[c][n - 1 - r] = m[r][c]; return o; };
const rotCCW = (m: G) => { const n = m.length, o = copy(m); for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) o[n - 1 - c][r] = m[r][c]; return o; };
const transpose = (m: G) => m.length ? m[0].map((_, c) => m.map(row => row[c])) : [];
// Spiral by walking with a visited matrix, turning right when blocked.
function spiralSim(m: G) {
  const rows = m.length, cols = rows ? m[0].length : 0, out: number[] = [];
  const seen = m.map(r => r.map(() => false)), dr = [0, 1, 0, -1], dc = [1, 0, -1, 0];
  let r = 0, c = 0, d = 0;
  for (let k = 0; k < rows * cols; k++) {
    out.push(m[r][c]); seen[r][c] = true;
    const nr = r + dr[d], nc = c + dc[d];
    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || seen[nr][nc]) d = (d + 1) % 4;
    r += dr[d]; c += dc[d];
  }
  return out;
}
// The buggy spiral the lesson shows: no guards on the bottom and left walks.
function spiralNoGuards(m: G) {
  const out: number[] = []; let t = 0, b = m.length - 1, l = 0, r = m[0].length - 1;
  while (t <= b && l <= r) {
    for (let c = l; c <= r; c++) out.push(m[t][c]); t++;
    for (let x = t; x <= b; x++) out.push(m[x][r]); r--;
    for (let c = r; c >= l; c--) out.push(m[b][c]); b--;
    for (let x = b; x >= t; x--) out.push(m[x][l]); l++;
  }
  return out;
}
// Zeroes via a copy: read the original, write the answer.
function zeroesCopy(m: G) {
  return m.map((row, r) => row.map((v, c) => (m[r].includes(0) || m.some(rr => rr[c] === 0) ? 0 : v)));
}
function zeroesSpread(m0: G) { const m = copy(m0); for (let r = 0; r < m.length; r++) for (let c = 0; c < m[0].length; c++) if (m[r][c] === 0) { m[r].fill(0); for (const row of m) row[c] = 0; } return m; }
function zeroesEdgesFirst(m0: G) {
  const m = copy(m0), R = m.length, C = m[0].length, fr = m[0].includes(0), fc = m.some(r => r[0] === 0);
  for (let r = 1; r < R; r++) for (let c = 1; c < C; c++) if (m[r][c] === 0) { m[r][0] = 0; m[0][c] = 0; }
  if (fr) m[0].fill(0); if (fc) for (const row of m) row[0] = 0;
  for (let r = 1; r < R; r++) for (let c = 1; c < C; c++) if (m[r][0] === 0 || m[0][c] === 0) m[r][c] = 0;
  return m;
}
function zeroesFlagsAfter(m0: G) {
  const m = copy(m0), R = m.length, C = m[0].length;
  for (let r = 1; r < R; r++) for (let c = 1; c < C; c++) if (m[r][c] === 0) { m[r][0] = 0; m[0][c] = 0; }
  const fr = m[0].includes(0), fc = m.some(r => r[0] === 0);
  for (let r = 1; r < R; r++) for (let c = 1; c < C; c++) if (m[r][0] === 0 || m[0][c] === 0) m[r][c] = 0;
  if (fr) m[0].fill(0); if (fc) for (const row of m) row[0] = 0;
  return m;
}
const neighbours = (b: G, r: number, c: number) => { let n = 0; for (let y = r - 1; y <= r + 1; y++) for (let x = c - 1; x <= c + 1; x++) if ((y !== r || x !== c) && b[y]?.[x] !== undefined) n += b[y][x]; return n; };
const lifeCopy = (b: G) => b.map((row, r) => row.map((v, c) => { const n = neighbours(b, r, c); return n === 3 || (v === 1 && n === 2) ? 1 : 0; }));
const lifeDirect = (b0: G) => { const b = copy(b0); for (let r = 0; r < b.length; r++) for (let c = 0; c < b[0].length; c++) { const n = neighbours(b, r, c); b[r][c] = n === 3 || (b[r][c] === 1 && n === 2) ? 1 : 0; } return b; };
const powSlow = (x: number, n: number) => { let p = 1; for (let i = 0; i < Math.abs(n); i++) p *= x; return n < 0 ? 1 / p : p; };
const show = (m: G) => `[${m.map(r => `[${r.join(', ')}]`).join(', ')}]`;
const cells = (row: { cells: { value: string }[] }) => row.cells.map(c => c.value);
const gridOf = (rows: { cells: { value: string }[] }[]) => rows.map(r => cells(r).map(Number));
const correct = (s: { answer: number; choices: { label: string }[] }) => s.choices[s.answer].label;
const allText = (s: { question: string; choices: { label: string; feedback: string }[] }) => [s.question, ...s.choices.flatMap(c => [c.label, c.feedback])].join(' ');

test('every trace step has a valid answer and real feedback for each choice', () => {
  for (const steps of [rotate, spiral, zeroes, pow, mixedReview]) for (const s of steps) {
    assert.ok(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length);
    for (const c of s.choices) assert.ok(c.feedback.length > 20, c.label);
  }
});

test('chapter 1 (rotate) trace numbers match a fresh-array rotation', () => {
  const g16 = [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]];
  assert.deepEqual(gridOf(rotate[0].rows), g16);
  const where = (m: G, v: number) => { for (let r = 0; r < m.length; r++) { const c = m[r].indexOf(v); if (c >= 0) return [r, c]; } return null; };
  assert.deepEqual(where(rotCW(g16), 2), [1, 3]);
  assert.equal(correct(rotate[0]), 'Row 1, column 3');
  assert.deepEqual(where(transpose(g16), 2), [1, 0]);
  assert.deepEqual(where(rotCCW(g16), 2), [2, 0]);
  assert.deepEqual(where(g16.map(r => [...r].reverse()), 2), [0, 2]);
  assert.deepEqual(rotate[0].choices.map(c => c.label), ['Row 1, column 3', 'Row 1, column 0', 'Row 2, column 0', 'Row 0, column 2']);
  const g9 = [[1, 2, 3], [4, 5, 6], [7, 8, 9]], t = transpose(g9);
  assert.deepEqual(gridOf(rotate[1].rows), t);
  assert.match(rotate[1].question, new RegExp(show(t).replace(/[[\]]/g, '\\$&')));
  assert.match(correct(rotate[1]), new RegExp(show(t.map(r => [...r].reverse())).replace(/[[\]]/g, '\\$&')));
  assert.deepEqual(t.map(r => [...r].reverse()), rotCW(g9));
  assert.deepEqual([...t].reverse(), rotCCW(g9));
  assert.match(rotate[1].choices[1].label, new RegExp(show([...t].reverse()).replace(/[[\]]/g, '\\$&')));
  // double swap over the whole square is a no-op
  const m = [[1, 2], [3, 4]];
  for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) [m[r][c], m[c][r]] = [m[c][r], m[r][c]];
  assert.deepEqual(m, [[1, 2], [3, 4]]);
  assert.match(correct(rotate[2]), /unchanged/);
});

test('chapter 2 (spiral) trace numbers match a visited-matrix walk and the unguarded bug', () => {
  const g = [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]];
  assert.deepEqual(gridOf(spiral[0].rows), g);
  const good = spiralSim(g), bad = spiralNoGuards(g);
  assert.deepEqual(good, [1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7]);
  assert.match(spiral[0].question, /1, 2, 3, 4, 8, 12, 11, 10, 9, 5\./);
  assert.match(spiral[0].choices[0].feedback, new RegExp(`${bad.join(', ')}, with ${bad.length} values`));
  assert.match(correct(spiral[0]), /top \(2\) has passed bottom \(1\)/);
  assert.match(spiral[0].choices[1].feedback, new RegExp(`${good.length} values: ${good.join(', ')}\\.`));
  assert.deepEqual(spiralNoGuards([[1, 2, 3]]), [1, 2, 3, 2, 1]);
  assert.deepEqual(spiralSim([[1, 2, 3]]), [1, 2, 3]);
  assert.match(spiral[1].choices[0].feedback, /1, 2, 3, 2, 1\./);
  assert.deepEqual(spiralNoGuards([[1], [2], [3]]), [1, 2, 3, 2]);
  assert.deepEqual(spiralSim([[1], [2], [3]]), [1, 2, 3]);
  assert.match(spiral[2].choices[1].feedback, /1, 2, 3, 2\./);
  assert.match(correct(spiral[2]), /left <= right/);
});

test('chapter 3 (zeroes) trace numbers match a copy-based oracle and each named bug', () => {
  const a = [[1, 2, 3], [4, 0, 6], [7, 8, 9]], lc2 = [[0, 1, 2, 0], [3, 4, 5, 2], [1, 3, 1, 5]];
  assert.deepEqual(gridOf(zeroes[0].rows), a);
  assert.equal(show(zeroesCopy(a)), '[[1, 0, 3], [0, 0, 0], [7, 0, 9]]');
  assert.ok(allText(zeroes[0]).includes(`you end with ${show(zeroesSpread(a))} instead of ${show(zeroesCopy(a))}`));
  assert.deepEqual(gridOf(zeroes[1].rows), lc2);
  assert.ok(allText(zeroes[1]).includes(`should be ${show(zeroesCopy(lc2))}`));
  assert.ok(zeroesEdgesFirst(lc2).flat().every(v => v === 0));
  assert.ok(allText(zeroes[2]).includes(show(zeroesFlagsAfter(a))));
  assert.equal(show(zeroesFlagsAfter(a)), '[[0, 0, 0], [0, 0, 0], [0, 0, 9]]');
  assert.ok(correct(zeroes[2]).includes(show(zeroesFlagsAfter(a))));
  // the "after notes" rows shown in step 3
  assert.deepEqual(gridOf(zeroes[2].rows), [[1, 0, 3], [0, 0, 6], [7, 8, 9]]);
});

test('chapter 4 (pow) trace numbers', () => {
  assert.equal(3 ** 13, 1594323);
  assert.equal(9 ** 6, 3 ** 12); assert.equal(3 ** 12, 531441);
  assert.match(pow[0].choices[1].feedback, /531441 instead of 1594323/);
  assert.equal(3 * 9 ** 6, 3 ** 13); assert.equal(27 * 9 ** 5, 3 ** 13); assert.equal(3 * 81 ** 3, 3 ** 13);
  assert.equal(-(-2147483648) | 0, -2147483648);                   // Java's int negation wraps the same way
  assert.match(correct(pow[2]), /Still −2147483648/);
  assert.equal(2 ** -2147483648, 0);                               // the true answer underflows to 0.0
});

test('mixed review numbers', () => {
  const blinker = [[0, 1, 0], [0, 1, 0], [0, 1, 0]];
  assert.deepEqual(lifeCopy(blinker), [[0, 0, 0], [1, 1, 1], [0, 0, 0]]);
  assert.ok(lifeDirect(blinker).flat().every(v => v === 0));
  const flatList = [[1, 4], [2, 5]].flat();
  assert.deepEqual(flatList, [1, 4, 2, 5]);
  assert.notDeepEqual(flatList, [...flatList].sort((x, y) => x - y));
  // a rhombus has four equal sides but unequal diagonals
  const d = (p: number[], q: number[]) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2;
  const rh = [[0, 0], [2, 1], [4, 0], [2, -1]];
  assert.deepEqual([d(rh[0], rh[1]), d(rh[1], rh[2]), d(rh[2], rh[3]), d(rh[3], rh[0])], [5, 5, 5, 5]);
  assert.notEqual(d(rh[0], rh[2]), d(rh[1], rh[3]));
});

test('every hint ladder referenced by the lesson exists with three hints', async () => {
  const { readFileSync, existsSync } = await import('node:fs');
  const url = new URL('../src/dsa-lessons/matrix.mdx', import.meta.url);
  if (!existsSync(url)) return;                                    // the lesson is written last
  const mdx = readFileSync(url, 'utf8');
  const used = [...mdx.matchAll(/hints=\{hints\.(\w+)\}/g)].map(m => m[1]);
  assert.ok(used.length >= 10);
  for (const key of used) assert.equal(hints[key]?.length, 3, key);
  for (const key of Object.keys(hints)) assert.ok(used.includes(key), `unused hint ${key}`);
});

// ---------- lab ----------
type Oracle = (start: MatrixState, final: MatrixState) => void;
const oracles: Record<string, Oracle> = {
  spiral: (s, f) => assert.deepEqual(f.out, spiralSim(s.grid)),
  rotate: (s, f) => assert.deepEqual(f.grid, rotCW(s.grid)),
  markers: (s, f) => assert.deepEqual(f.grid, zeroesCopy(s.grid)),
  power: (s, f) => {
    const want = powSlow(s.x, s.n);
    if (Number.isInteger(want)) assert.equal(f.result, want);
    else assert.ok(Math.abs(f.result - want) <= 1e-12 * Math.max(1, Math.abs(want)), `${s.x}^${s.n}: ${f.result} vs ${want}`);
  },
};
function runCase(start: MatrixState) {
  const { final, wrongMovesChangedBoard, steps } = solveLab(lab, start, 2000);
  assert.equal(final.done, true, `${start.mode} must terminate`);
  assert.equal(wrongMovesChangedBoard, false, `${start.mode}: a wrong move changed the board`);
  oracles[start.mode](start, final);
  return { final, steps };
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
          assert.doesNotMatch(result.state.message, /undefined|NaN|Infinity|\[object/, `${mode} case ${v}: ${action}`);
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

test('lab agrees with brute force on random small inputs, including 1 × n, n × 1 and empty grids', () => {
  let seed = 2026; const rnd = (n: number) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
  const randGrid = (rows: number, cols: number, hi: number) => Array.from({ length: rows }, () => Array.from({ length: cols }, () => rnd(hi)));
  runCase({ ...lab.create('spiral'), ...fromInput({ mode: 'spiral', grid: [] }) });
  for (let t = 0; t < 200; t++) {
    const rows = 1 + rnd(5), cols = 1 + rnd(5);
    const sp = runCase({ ...lab.create('spiral'), ...fromInput({ mode: 'spiral', grid: randGrid(rows, cols, 9) }) });
    assert.equal(sp.final.out.length, rows * cols);
    const n = 1 + rnd(5);
    runCase({ ...lab.create('rotate'), ...fromInput({ mode: 'rotate', grid: randGrid(n, n, 9) }) });
    runCase({ ...lab.create('markers'), ...fromInput({ mode: 'markers', grid: randGrid(rows, cols, 4) }) });
    const x = [-3, -2, -1, 1, 2, 3][rnd(6)], e = rnd(17) - 6;
    const pw = runCase({ ...lab.create('power'), ...fromInput({ mode: 'power', x, n: e }) });
    // O(log n): at most 2 moves per bit of |n|, plus invert and finish
    assert.ok(pw.steps <= 2 * Math.max(1, Math.ceil(Math.log2(Math.abs(e) + 1))) + 2, `power steps for n = ${e}: ${pw.steps}`);
  }
});

test('the lab names the classic bugs with the board numbers', () => {
  // spiral: walking left after the boundaries cross on 3 x 4 re-reads the 6
  let s = lab.create('spiral', 0);
  for (const a of ['right', 'down', 'left', 'up', 'right', 'down']) s = lab.move(s, a).state;
  assert.equal(lab.expected(s), 'finish');
  assert.match(lab.move(s, 'left').state.message, /re-read 7, 6: the output would hold 14 values from 12 cells/);
  // rotate: flipping the row order after a transpose is counter-clockwise
  let r = lab.create('rotate', 0);
  for (let i = 0; i < 3; i++) r = lab.move(r, 'swap').state;
  assert.match(lab.move(r, 'flip').state.message, /counter-clockwise.*bottom-left \(2, 0\) instead of top-right \(0, 2\)/);
  // markers: zeroing the edges before the inside wipes LeetCode's example 2
  let m = lab.create('markers', 1);
  m = lab.move(lab.move(m, 'flags').state, 'mark').state;
  assert.match(lab.move(m, 'edges').state.message, /leaves \[\[0, 0, 0, 0\], \[0, 0, 0, 0\], \[0, 0, 0, 0\]\] instead of \[\[0, 0, 0, 0\], \[0, 4, 5, 0\], \[0, 3, 1, 0\]\]/);
  // markers: chalking before reading the flags
  assert.match(lab.move(lab.create('markers', 0), 'mark').state.message, /leaves \[\[0, 0, 0\], \[0, 0, 0\], \[0, 0, 9\]\] instead of \[\[1, 0, 3\], \[0, 0, 0\], \[7, 0, 9\]\]/);
  // power: halving an odd exponent drops a factor
  assert.match(lab.move(lab.create('power', 0), 'square').state.message, /531441 instead of 1594323/);
});

// ---------- practice ----------
function arrays(text: string) { return [...text.matchAll(/\[([^[\]]*)\]/g)].map(m => (m[1].trim() === '' ? [] : m[1].split(',').map(Number))); }
function num(text: string, re: RegExp) { const m = text.match(re); assert.ok(m, `${re} in ${text}`); return Number(m![1]); }
function gridIn(prompt: string): G { return arrays(prompt); }
function modPowCycle(a: number, bigExp: bigint, m: number) {
  // Independent of squaring: walk a^0, a^1, ... mod m until a remainder repeats, then jump with the cycle.
  const firstAt = new Map<number, number>(), seq: number[] = [];
  let cur = 1 % m;
  for (let k = 0; ; k++) {
    if (firstAt.has(cur)) {
      const start = firstAt.get(cur)!, len = k - start;
      if (bigExp < BigInt(start)) return seq[Number(bigExp)];
      return seq[start + Number((bigExp - BigInt(start)) % BigInt(len))];
    }
    firstAt.set(cur, k); seq.push(cur);
    cur = (cur * a) % m;
  }
}
function islands(g: G) {
  const seen = new Set<string>(); let n = 0;
  const visit = (r: number, c: number): void => { if (g[r]?.[c] !== 1 || seen.has(`${r},${c}`)) return; seen.add(`${r},${c}`); visit(r + 1, c); visit(r - 1, c); visit(r, c + 1); visit(r, c - 1); };
  g.forEach((row, r) => row.forEach((v, c) => { if (v === 1 && !seen.has(`${r},${c}`)) { n++; visit(r, c); } }));
  return n;
}
function isSquareByRotation(p: number[][]) {
  // Try every ordering as a cycle: consecutive edges must be equal-length, non-zero, and turn by 90°.
  const perms = (a: number[][]): number[][][] => a.length <= 1 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map(rest => [x, ...rest]));
  return perms(p).some(q => {
    const e = q.map((pt, i) => [q[(i + 1) % 4][0] - pt[0], q[(i + 1) % 4][1] - pt[1]]);
    if (e[0][0] === 0 && e[0][1] === 0) return false;
    return e.every((v, i) => { const w = e[(i + 1) % 4]; return w[0] === -v[1] && w[1] === v[0]; });
  });
}

test('every practice answer matches an independent computation from the prompt', () => {
  assert.equal(practice.storageKey, 'citadel-matrix-review-v1');
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
      assert.doesNotMatch(c.prompt, /transpos|reverse|boundar|marker|first row|first column|flag|spare bit|bitmask|binary|halv|squaring|staircase|top-right|r \+ c|r − c|flood|BFS|DFS|depth-first|breadth-first|square root|distance/i, `${id}: the prompt must not name the technique`);
      let expected: number | number[] | boolean;
      switch (id) {
        case 'flat-index': {
          const rows = num(c.prompt, /\((\d+) rows/), cols = num(c.prompt, /, (\d+) columns\)/), k = num(c.prompt, /list position (\d+)\?/);
          assert.ok(k < rows * cols);
          expected = [Math.floor(k / cols), k % cols];
          break;
        }
        case 'rotate': expected = rotCW(gridIn(c.prompt)).flat(); assert.match(c.prompt, /clockwise/); assert.doesNotMatch(c.prompt, /counter/); break;
        case 'rotate-ccw': expected = rotCCW(gridIn(c.prompt)).flat(); assert.match(c.prompt, /counter-clockwise/); break;
        case 'spiral': expected = spiralSim(gridIn(c.prompt)); break;
        case 'zeroes': expected = zeroesCopy(gridIn(c.prompt)).flat(); break;
        case 'pow': {
          const m = c.prompt.match(/x = (-?\d+), n = (\d+):/)!;
          const x = Number(m[1]), n = Number(m[2]);
          // repeated multiplication for small exponents; parity for the giant exponent of −1
          expected = Math.abs(x) === 1 ? (x === 1 || n % 2 === 0 ? 1 : -1) : powSlow(x, n);
          if (Math.abs(x) !== 1) assert.ok(n <= 40);
          break;
        }
        case 'pow-mod': {
          const m = c.prompt.match(/when (\d+) raised to the power (\d+) is divided by (\d+)\?/)!;
          expected = modPowCycle(Number(m[1]), BigInt(m[2]), Number(m[3]));
          assert.ok(BigInt(m[2]) > 10n ** 14n);
          break;
        }
        case 'spiral-gen': {
          const n = num(c.prompt, /empty (\d+) × \d+ grid/), r = num(c.prompt, /row (\d+), column/), col = num(c.prompt, /column (\d+) \(/);
          const order = spiralSim(Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i * n + j)));
          expected = order.indexOf(r * n + col) + 1;
          break;
        }
        case 'transpose': expected = transpose(gridIn(c.prompt)).flat(); break;
        case 'life': expected = lifeCopy(gridIn(c.prompt)).flat(); break;
        case 'zigzag': {
          const g = gridIn(c.prompt), rows = g.length, cols = g[0].length, out: number[] = [];
          // Independent: sort cells by (r + c), then by row ascending on odd lines and descending on even lines.
          const all = g.flatMap((row, r) => row.map((v, col) => ({ r, c: col, v })));
          all.sort((p, q) => (p.r + p.c) - (q.r + q.c) || ((p.r + p.c) % 2 === 0 ? q.r - p.r : p.r - q.r));
          for (const cell of all) out.push(cell.v);
          assert.equal(out.length, rows * cols);
          expected = out;
          break;
        }
        case 'constant-lines': {
          const g = gridIn(c.prompt), byLine = new Map<number, Set<number>>();
          g.forEach((row, r) => row.forEach((v, col) => { if (!byLine.has(r - col)) byLine.set(r - col, new Set()); byLine.get(r - col)!.add(v); }));
          expected = [...byLine.values()].every(s => s.size === 1);
          break;
        }
        case 'sorted-grid': {
          const g = gridIn(c.prompt), target = num(c.prompt, /Is (\d+) in the grid/);
          g.forEach((row, r) => row.forEach((v, col) => { if (col) assert.ok(v > row[col - 1]); if (r) assert.ok(v > g[r - 1][col]); }));
          expected = g.flat().includes(target);
          break;
        }
        case 'square': {
          const pts = [...c.prompt.matchAll(/\((-?\d+), (-?\d+)\)/g)].map(m => [Number(m[1]), Number(m[2])]);
          assert.equal(pts.length, 4);
          expected = isSquareByRotation(pts);
          break;
        }
        case 'islands': expected = islands(gridIn(c.prompt)); break;
        default: throw new Error(`untested concept ${id}`);
      }
      assert.deepEqual(c.answer, expected, `${id} variant ${variant}: ${c.prompt}`);
      const typed = typeof expected === 'boolean' ? (expected ? 'yes' : 'no') : JSON.stringify(expected);
      assert.equal(answerMatches(c, typed), true, `${id} variant ${variant}: ${typed}`);
      assert.equal(answerMatches(c, 'not an answer'), false);
      assert.equal(c.hints.length, 3); assert.equal(c.rubric.length, 3);
    }
    assert.ok(prompts.size >= 2, `${id}: the input must vary with the variant`);
  }
  // both yes and no appear for the yes/no concepts
  for (const id of ['constant-lines', 'sorted-grid', 'square']) {
    const answers = new Set(Array.from({ length: 21 }, (_, v) => practice.challengeFor(id, v).answer));
    assert.equal(answers.size, 2, `${id} needs both yes and no variants`);
  }
  assert.ok(strategiesUsed.size >= 7);
});
