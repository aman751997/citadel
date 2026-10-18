import test from 'node:test';
import assert from 'node:assert/strict';
import { lastVar } from '../src/lib/dryrun.ts';
import type { Frame } from '../src/lib/dryrun.ts';
import { rotateFrames, rotateRingFrames, spiralFrames, zeroesFrames, powFrames, spiralIIFrames, turnFrames, lifeFrames, diagonalFrames, toeplitzFrames, staircaseFrames, squareFrames } from '../src/data/matrix/frames.ts';

type G = number[][];
let seed = 20260519;
const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
const grid = (R: number, C: number, lo: number, hi: number): G => Array.from({ length: R }, () => Array.from({ length: C }, () => lo + rnd(hi - lo + 1)));
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

// ---- independent oracles (deliberately different from the lesson's algorithms) ----
const transpose = (m: G) => m[0].map((_, c) => m.map(r => r[c]));
const rotCW = (m: G) => transpose(m).map(r => [...r].reverse());
const rotCCW = (m: G) => [...transpose(m)].reverse();
function spiralWalk(m: G) {
  const R = m.length, C = m[0].length, out: number[] = [], seen = m.map(r => r.map(() => false)), dr = [0, 1, 0, -1], dc = [1, 0, -1, 0];
  let r = 0, c = 0, d = 0;
  for (let k = 0; k < R * C; k++) {
    out.push(m[r][c]); seen[r][c] = true;
    const nr = r + dr[d], nc = c + dc[d];
    if (nr < 0 || nr >= R || nc < 0 || nc >= C || seen[nr][nc]) d = (d + 1) % 4;
    r += dr[d]; c += dc[d];
  }
  return out;
}
const spiralFill = (n: number) => {
  const m: G = Array.from({ length: n }, () => Array(n).fill(0)), dr = [0, 1, 0, -1], dc = [1, 0, -1, 0];
  let r = 0, c = 0, d = 0;
  for (let k = 1; k <= n * n; k++) {
    m[r][c] = k;
    const nr = r + dr[d], nc = c + dc[d];
    if (nr < 0 || nr >= n || nc < 0 || nc >= n || m[nr][nc]) d = (d + 1) % 4;
    r += dr[d]; c += dc[d];
  }
  return m;
};
const zeroesCopy = (m: G) => m.map((row, r) => row.map((v, c) => (row.includes(0) || m.some(x => x[c] === 0) ? 0 : v)));
function lifeCopy(b: G) {
  const R = b.length, C = b[0].length;
  return b.map((row, r) => row.map((v, c) => {
    let n = 0;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) if ((i || j) && b[r + i]?.[c + j] === 1) n++;
    return n === 3 || (v === 1 && n === 2) ? 1 : 0;
  }));
}
function zigzag(m: G) {
  const R = m.length, C = m[0].length, out: number[] = [];
  let r = 0, c = 0, up = true;
  for (let k = 0; k < R * C; k++) {
    out.push(m[r][c]);
    if (up) { if (c === C - 1) { r++; up = false; } else if (r === 0) { c++; up = false; } else { r--; c++; } }
    else { if (r === R - 1) { c++; up = true; } else if (c === 0) { r++; up = true; } else { r++; c--; } }
  }
  return out;
}
const toeplitz = (m: G) => { const seen = new Map<number, number>(); for (let r = 0; r < m.length; r++) for (let c = 0; c < m[0].length; c++) { const k = r - c; if (seen.has(k) && seen.get(k) !== m[r][c]) return false; seen.set(k, m[r][c]); } return true; };
const sortedGrid = (R: number, C: number) => { const m = grid(R, C, 0, 30); m.forEach(r => r.sort((a, b) => a - b)); for (let c = 0; c < C; c++) { const col = m.map(r => r[c]).sort((a, b) => a - b); col.forEach((v, r) => (m[r][c] = v)); } return m; };
function squareBrute(p: number[][]) {
  const perms = (a: number[]): number[][] => a.length <= 1 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map(t => [x, ...t]));
  const sub = (a: number[], b: number[]) => [a[0] - b[0], a[1] - b[1]];
  return perms([0, 1, 2, 3]).some(o => {
    const s = o.map((i, k) => sub(p[o[(k + 1) % 4]], p[i]));
    const len = s.map(v => v[0] ** 2 + v[1] ** 2);
    return len[0] > 0 && len.every(l => l === len[0]) && s.every((v, k) => v[0] * s[(k + 1) % 4][0] + v[1] * s[(k + 1) % 4][1] === 0);
  });
}

test('rotate: two passes and four-cycles both turn clockwise', () => {
  run(200, () => {
    const n = 1 + rnd(5), m = grid(n, n, 1, 9);
    const f = rotateFrames(m); wellFormed(f);
    assert.equal(answer(f), JSON.stringify(rotCW(m)));
    const g = rotateRingFrames(m); wellFormed(g);
    assert.equal(answer(g), JSON.stringify(rotCW(m)));
  });
  assert.equal(answer(rotateFrames([[1, 2, 3], [4, 5, 6], [7, 8, 9]])), '[[7,4,1],[8,5,2],[9,6,3]]');
  assert.equal(answer(rotateFrames([[5]])), '[[5]]');
});

test('spiral order, including 1 x n, n x 1 and rectangles', () => {
  run(300, () => {
    const R = 1 + rnd(5), C = 1 + rnd(5), m = grid(R, C, 1, 99);
    const f = spiralFrames(m); wellFormed(f);
    assert.equal(answer(f), JSON.stringify(spiralWalk(m)), JSON.stringify(m));
  });
  assert.equal(answer(spiralFrames([[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]])), '[1,2,3,4,8,12,11,10,9,5,6,7]');
  assert.equal(answer(spiralFrames([[1, 2, 3]])), '[1,2,3]');
  assert.equal(answer(spiralFrames([[1], [2], [3]])), '[1,2,3]');
});

test('set zeroes, edges and inner zeros', () => {
  run(400, () => {
    const R = 1 + rnd(5), C = 1 + rnd(5), m = grid(R, C, 0, 4).map(r => r.map(v => (v === 0 && rnd(2) ? 7 : v)));
    const f = zeroesFrames(m); wellFormed(f);
    assert.equal(answer(f), JSON.stringify(zeroesCopy(m)), JSON.stringify(m));
  });
  assert.equal(answer(zeroesFrames([[1, 2, 3], [4, 0, 6], [7, 8, 9]])), '[[1,0,3],[0,0,0],[7,0,9]]');
  assert.equal(answer(zeroesFrames([[0, 1, 2, 0], [3, 4, 5, 2], [1, 3, 1, 5]])), '[[0,0,0,0],[0,4,5,0],[0,3,1,0]]');
  assert.equal(answer(zeroesFrames([[0]])), '[[0]]');
});

test('fast power, negative exponents and Integer.MIN_VALUE', () => {
  run(300, () => {
    const x = [2, 3, 0.5, 1.5, -2, -1, 1, 10][rnd(8)], n = rnd(41) - 20;
    const f = powFrames(x, n); wellFormed(f);
    const got = Number(answer(f)), want = Math.pow(x, n);
    assert.ok(Math.abs(got - want) <= 1e-9 * Math.max(1, Math.abs(want)), `${x}^${n}: ${got} vs ${want}`);
  });
  assert.equal(answer(powFrames(3, 13)), '1594323');
  assert.equal(answer(powFrames(2, 0)), '1');
  assert.equal(Number(answer(powFrames(2, -2147483648))), 0);
  assert.equal(Number(answer(powFrames(1, -2147483648))), 1);
});

test('spiral II fill', () => {
  for (let n = 1; n <= 7; n++) { const f = spiralIIFrames(n); wellFormed(f); assert.equal(answer(f), JSON.stringify(spiralFill(n))); }
});

test('transpose and non-square turns', () => {
  run(200, () => {
    const R = 1 + rnd(4), C = 1 + rnd(4), m = grid(R, C, 1, 9);
    for (const [kind, want] of [['transpose', transpose(m)], ['clockwise', rotCW(m)], ['counter', rotCCW(m)]] as const) {
      const f = turnFrames(m, kind); wellFormed(f);
      assert.equal(answer(f), JSON.stringify(want), `${kind} ${JSON.stringify(m)}`);
    }
  });
  assert.equal(answer(turnFrames([[1, 2, 3], [4, 5, 6]], 'clockwise')), '[[4,1],[5,2],[6,3]]');
});

test('game of life', () => {
  run(200, () => {
    const R = 1 + rnd(4), C = 1 + rnd(4), b = grid(R, C, 0, 1);
    const f = lifeFrames(b); wellFormed(f);
    assert.equal(answer(f), JSON.stringify(lifeCopy(b)), JSON.stringify(b));
  });
  assert.equal(answer(lifeFrames([[0, 1, 0], [0, 1, 0], [0, 1, 0]])), '[[0,0,0],[1,1,1],[0,0,0]]');
});

test('diagonal traverse and toeplitz', () => {
  run(300, () => {
    const R = 1 + rnd(5), C = 1 + rnd(5), m = grid(R, C, 1, 50);
    const f = diagonalFrames(m); wellFormed(f);
    assert.equal(answer(f), JSON.stringify(zigzag(m)), JSON.stringify(m));
    const t = grid(R, C, 1, 2);
    const g = toeplitzFrames(t); wellFormed(g);
    assert.equal(answer(g), String(toeplitz(t)), JSON.stringify(t));
    const lines = Array.from({ length: R + C }, () => 1 + rnd(5));
    const yes = Array.from({ length: R }, (_, r) => Array.from({ length: C }, (_, c) => lines[r - c + C]));
    assert.equal(answer(toeplitzFrames(yes)), 'true');
  });
  assert.equal(answer(diagonalFrames([[1, 2, 3], [4, 5, 6], [7, 8, 9]])), '[1,2,4,7,5,3,6,8,9]');
});

test('staircase search', () => {
  run(400, () => {
    const R = 1 + rnd(5), C = 1 + rnd(5), m = sortedGrid(R, C), t = rnd(32);
    const f = staircaseFrames(m, t); wellFormed(f);
    assert.equal(answer(f), String(m.flat().includes(t)), `${JSON.stringify(m)} ${t}`);
  });
  const lc = [[1, 4, 7, 11, 15], [2, 5, 8, 12, 19], [3, 6, 9, 16, 22], [10, 13, 14, 17, 24], [18, 21, 23, 26, 30]];
  assert.equal(answer(staircaseFrames(lc, 5)), 'true');
  assert.equal(answer(staircaseFrames(lc, 20)), 'false');
});

test('valid square against a permutation oracle', () => {
  run(1500, () => {
    const p = Array.from({ length: 4 }, () => [rnd(5) - 2, rnd(5) - 2]);
    const f = squareFrames(p); wellFormed(f);
    assert.equal(answer(f), String(squareBrute(p)), JSON.stringify(p));
  });
  run(200, () => {
    const [a, b] = [rnd(3) + 1, rnd(3)], o = [rnd(3) - 1, rnd(3) - 1];
    const p = [[o[0], o[1]], [o[0] + a, o[1] + b], [o[0] + a - b, o[1] + b + a], [o[0] - b, o[1] + a]];
    assert.equal(answer(squareFrames(p)), 'true', JSON.stringify(p));
  });
  assert.equal(answer(squareFrames([[0, 0], [2, 1], [1, 3], [-1, 2]])), 'true');
  assert.equal(answer(squareFrames([[0, 0], [0, 0], [0, 0], [0, 0]])), 'false');
});
