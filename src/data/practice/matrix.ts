// Independent practice for the Matrix & Geometry lesson. Prompts never name the technique; inputs vary with `variant`.
import type { Challenge, PracticeSet } from '../../lib/practice.ts';

export const strategies = {
  index: 'Work out where each cell goes with index arithmetic (flatten, turn, flip)',
  edges: 'Walk the edge of a rectangle that shrinks after every side',
  inplace: 'Keep extra state inside the grid itself, and write it in a safe order',
  lines: 'Group cells by the quantity that stays constant along a line',
  corner: 'Start at a corner where each comparison discards a whole row or column',
  halving: 'Split the exponent in half again and again',
  geometry: 'Compare exact integer distances, never square roots',
  other: 'Another tool fits better than grid index arithmetic',
} as const;

export const conceptIds = [
  'flat-index', 'rotate', 'rotate-ccw', 'spiral', 'zeroes', 'pow', 'pow-mod', 'spiral-gen',
  'transpose', 'life', 'zigzag', 'constant-lines', 'sorted-grid', 'square', 'islands',
] as const;
type ConceptId = typeof conceptIds[number];

// Small deterministic generator so every variant is reproducible.
const rng = (seed: number) => { let s = (seed * 2654435761 + 12345) >>> 0; return (n: number) => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s % n; }; };
const arr = (a: number[]) => `[${a.join(', ')}]`;
const gridText = (m: number[][]) => `[${m.map(arr).join(', ')}]`;
const flat = (m: number[][]) => m.flat();
const make2d = (rows: number, cols: number, f: (r: number, c: number) => number) => Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => f(r, c)));

function spiralOf(m: number[][]) {
  const out: number[] = [];
  if (!m.length) return out;
  let top = 0, bottom = m.length - 1, left = 0, right = m[0].length - 1;
  while (top <= bottom && left <= right) {
    for (let c = left; c <= right; c++) out.push(m[top][c]);
    top++;
    for (let r = top; r <= bottom; r++) out.push(m[r][right]);
    right--;
    if (top <= bottom) { for (let c = right; c >= left; c--) out.push(m[bottom][c]); bottom--; }
    if (left <= right) { for (let r = bottom; r >= top; r--) out.push(m[r][left]); left++; }
  }
  return out;
}
const modPow = (a: bigint, b: bigint, m: bigint) => { let r = 1n % m, x = a % m; while (b > 0n) { if (b & 1n) r = (r * x) % m; x = (x * x) % m; b >>= 1n; } return r; };

function make(id: ConceptId, variant: number): Omit<Challenge, 'id'> {
  const v = Math.abs(Math.trunc(variant));
  const rnd = rng(v + 1);
  switch (id) {
    case 'flat-index': {
      const shapes: [number, number][] = [[5, 7], [4, 6], [3, 9], [6, 4], [8, 5], [2, 11]];
      const [rows, cols] = shapes[v % shapes.length];
      const k = (v * 7 + 5) % (rows * cols);
      const answer = [Math.floor(k / cols), k % cols];
      return {
        topic: 'One number for every cell', section: 'prologue', strategy: 'index',
        prompt: `A ${rows} × ${cols} grid (${rows} rows, ${cols} columns) is stored as one long list, row after row, starting at position 0. Which row and column hold list position ${k}? Rows and columns count from 0.`,
        question: 'Enter the row and the column, e.g. 2, 5.', answer,
        hints: ['How many list positions does one full row use up?', `Each row uses ${cols} positions, so whole rows before position ${k} = ${k} ÷ ${cols}, rounded down.`, 'Row = position / cols (integer division); column = position % cols.'],
        rubric: ['The row is the number of complete rows before the position: integer division by the column count.', 'The column is what is left over: the remainder.', 'The reverse map is r × cols + c; it is the column count that matters, not the row count.'],
        explanation: `${k} = ${answer[0]} × ${cols} + ${answer[1]}, so row ${answer[0]}, column ${answer[1]}.`,
      };
    }
    case 'rotate':
    case 'rotate-ccw': {
      const n = 3 + (v % 2);
      const m = make2d(n, n, () => 1 + rnd(9));
      const cw = id === 'rotate';
      const out = make2d(n, n, () => 0);
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        if (cw) out[c][n - 1 - r] = m[r][c]; else out[n - 1 - c][r] = m[r][c];
      }
      return {
        topic: cw ? 'A quarter turn, in place' : 'A quarter turn the other way', section: 'rotate-image', strategy: 'index',
        prompt: `Turn the square picture ${gridText(m)} a quarter turn ${cw ? 'clockwise' : 'counter-clockwise'}, in place, using O(1) extra memory. What does it look like afterwards?`,
        question: 'Enter the result row by row as one list.', answer: flat(out),
        hints: [`Where does the cell at row 0, column 0 end up after a ${cw ? 'clockwise' : 'counter-clockwise'} quarter turn?`, cw ? 'Clockwise sends (r, c) to (c, n − 1 − r). Can that be built from two moves that each only swap pairs?' : 'Counter-clockwise sends (r, c) to (n − 1 − c, r). Can that be built from two moves that each only swap pairs?', cw ? 'Swap across the main diagonal (only pairs above it), then reverse each row.' : 'Swap across the main diagonal (only pairs above it), then reverse the order of the rows.'],
        rubric: ['The index map is written down before any code.', 'The in-place version swaps only pairs above the diagonal, so nothing is swapped twice.', 'O(n²) time and O(1) extra space.'],
        explanation: `Result: ${gridText(out)}.`,
      };
    }
    case 'spiral': {
      const shapes: [number, number][] = [[3, 4], [1, 5], [4, 1], [3, 3], [2, 4], [4, 2], [5, 3]];
      const [rows, cols] = shapes[v % shapes.length];
      const m = make2d(rows, cols, () => rnd(20));
      const answer = spiralOf(m);
      return {
        topic: 'Around and inward', section: 'spiral-matrix', strategy: 'edges',
        prompt: `List every value of the ${rows} × ${cols} grid ${gridText(m)} in clockwise order: along the top row, down the right side, back along the bottom, up the left side, then inward, each cell exactly once.`,
        question: 'Enter the values in order.', answer,
        hints: ['Describe the cells you have not read yet. What shape is that region, and which four numbers describe it?', 'top, bottom, left, right. After each side is read, one of them moves inward.', 'Before reading the bottom row check top <= bottom again; before reading the left column check left <= right again.'],
        rubric: ['Four boundaries; each walk is followed by moving its boundary inward.', 'The bottom and left walks are guarded, so a single remaining row or column is not read twice.', `Exactly ${rows * cols} values come out: O(rows × cols) time, O(1) extra space besides the output.`],
        explanation: `Order: ${arr(answer)}.`,
      };
    }
    case 'zeroes': {
      const shapes: [number, number][] = [[3, 3], [3, 4], [4, 3], [2, 5], [4, 4]];
      const [rows, cols] = shapes[v % shapes.length];
      const m = make2d(rows, cols, () => 1 + rnd(9));
      const zeros = 1 + (v % 2);
      for (let z = 0; z < zeros; z++) m[rnd(rows)][rnd(cols)] = 0;
      if (v % 3 === 0) m[0][rnd(cols)] = 0;                       // sometimes a zero on the top edge
      const zr = new Set<number>(), zc = new Set<number>();
      m.forEach((row, r) => row.forEach((x, c) => { if (x === 0) { zr.add(r); zc.add(c); } }));
      const out = m.map((row, r) => row.map((x, c) => (zr.has(r) || zc.has(c) ? 0 : x)));
      return {
        topic: 'Clear rows and columns without extra memory', section: 'set-matrix-zeroes', strategy: 'inplace',
        prompt: `In ${gridText(m)}, every row and every column that contains a 0 must become all 0s. Do it in place with O(1) extra memory. What is the final grid?`,
        question: 'Enter the result row by row as one list.', answer: flat(out),
        hints: ['You need one yes/no per row and one per column. Where in the grid could those live?', 'Row 0 can hold the column notes and column 0 the row notes, after you save whether row 0 and column 0 had zeros of their own.', 'Order: two flags, notes from inner zeros, inner cells from notes, edges last.'],
        rubric: ['New zeros are never mistaken for original ones.', 'The two edge flags are read before any note is written, and the edges are zeroed last.', 'O(rows × cols) time, O(1) extra space.'],
        explanation: `Final grid: ${gridText(out)}.`,
      };
    }
    case 'pow': {
      const pairs: [number, number][] = [[3, 13], [-3, 9], [2, 30], [-2, 11], [5, 8], [7, 10], [-5, 7], [3, 20], [2, 0], [-1, 2147483647]];
      const [x, n] = pairs[v % pairs.length];
      const answer = x === -1 ? (n % 2 === 0 ? 1 : -1) : x ** n;
      return {
        topic: 'A power with a huge exponent', section: 'pow', strategy: 'halving',
        prompt: `Write x to the power n for any 32-bit integer n, from −2147483648 to 2147483647, in far fewer than |n| multiplications. Check your method by hand on x = ${x}, n = ${n}: what does it return?`,
        question: 'Enter the value.', answer,
        hints: ['x^13 = x^8 × x^4 × x^1. Which powers of x can you reach cheaply one after another?', 'Keep result × base^e equal to the answer. Odd e: multiply base into result. Then square base and halve e.', 'Copy n into a long first; for negative n invert x and negate the long.'],
        rubric: ['O(log |n|) multiplications by squaring the base and halving the exponent.', 'The invariant result × base^e = x^n is stated and kept by every step.', 'The exponent is held in a long so that −2147483648 can be negated.'],
        explanation: `${x < 0 ? `(${x})` : x}^${n} = ${answer}.`,
      };
    }
    case 'pow-mod': {
      const as = [7, 3, 12, 5, 11, 2];
      const ms = [1337, 1000, 97, 10007];
      const a = as[v % as.length], m = ms[v % ms.length];
      const b = 10n ** BigInt(15 + (v % 4)) + BigInt(3 + v);
      const answer = Number(modPow(BigInt(a), b, BigInt(m)));
      return {
        topic: 'Last digits of an enormous power', section: 'exit-ticket', strategy: 'halving',
        prompt: `What is the remainder when ${a} raised to the power ${b} is divided by ${m}? Every intermediate number in your method must stay small enough for a 64-bit integer.`,
        question: 'Enter the remainder.', answer,
        hints: ['You cannot loop that many times. How else can the exponent shrink?', 'The same squaring idea works if you take the remainder after every multiplication.', `Keep result and base below ${m}: result = result × base % ${m} when the low bit is 1; base = base × base % ${m}; halve the exponent.`],
        rubric: ['About 60 halvings instead of 10^15 multiplications.', `Every product is reduced mod ${m}, so it stays below ${m}² and fits in a long.`, 'The base is reduced mod m before the loop starts.'],
        explanation: `${a}^${b} mod ${m} = ${answer}.`,
      };
    }
    case 'spiral-gen': {
      const n = 3 + (v % 4);
      const r = rnd(n), c = rnd(n);
      const m = make2d(n, n, () => 0);
      let top = 0, bottom = n - 1, left = 0, right = n - 1, next = 1;
      while (top <= bottom && left <= right) {
        for (let k = left; k <= right; k++) m[top][k] = next++;
        top++;
        for (let k = top; k <= bottom; k++) m[k][right] = next++;
        right--;
        if (top <= bottom) { for (let k = right; k >= left; k--) m[bottom][k] = next++; bottom--; }
        if (left <= right) { for (let k = bottom; k >= top; k--) m[k][left] = next++; left++; }
      }
      return {
        topic: 'Fill the grid around and inward', section: 'spiral-ii', strategy: 'edges',
        prompt: `Fill an empty ${n} × ${n} grid with the numbers 1 to ${n * n}: 1 goes top-left, and the numbers continue clockwise along the outside, then inward. Which number lands at row ${r}, column ${c} (counting from 0)?`,
        question: 'Enter the number.', answer: m[r][c],
        hints: ['Reading in that order and writing in that order are the same walk.', 'Four boundaries again; write next++ at each step instead of reading.', 'Fill one ring at a time, or count how many numbers the outer rings use before the ring that holds the cell.'],
        rubric: ['The same four-boundary walk as reading, writing a counter instead.', 'The counter ends at n² + 1, a quick self-check.', 'O(n²) time, no extra space beyond the output.'],
        explanation: `The cell at (${r}, ${c}) holds ${m[r][c]}.`,
      };
    }
    case 'transpose': {
      const shapes: [number, number][] = [[2, 3], [3, 2], [1, 4], [4, 1], [2, 4], [3, 4]];
      const [rows, cols] = shapes[v % shapes.length];
      const m = make2d(rows, cols, () => rnd(10));
      const out = make2d(cols, rows, (r, c) => m[c][r]);
      return {
        topic: 'Rows become columns', section: 'transpose', strategy: 'index',
        prompt: `Flip the ${rows} × ${cols} grid ${gridText(m)} across its main diagonal, so row i becomes column i. What is the result?`,
        question: 'Enter the result row by row as one list.', answer: flat(out),
        hints: ['What shape does the result have?', `It is ${cols} × ${rows}. The cell at (r, c) moves to (c, r).`, 'Allocate the new shape and copy out[c][r] = grid[r][c]; the shape change rules out doing it in place.'],
        rubric: ['The result has the column count and row count swapped.', 'out[c][r] = grid[r][c] for every cell.', 'O(rows × cols) time and space; in place is impossible when the shape changes.'],
        explanation: `Result (${cols} × ${rows}): ${gridText(out)}.`,
      };
    }
    case 'life': {
      const shapes: [number, number][] = [[3, 3], [4, 4], [3, 4], [4, 3]];
      const [rows, cols] = shapes[v % shapes.length];
      const b = make2d(rows, cols, () => (rnd(5) < 2 ? 1 : 0));
      const out = b.map((row, r) => row.map((x, c) => {
        let live = 0;
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          const y = r + dr, z = c + dc;
          if (y >= 0 && y < rows && z >= 0 && z < cols) live += b[y][z];
        }
        return live === 3 || (x === 1 && live === 2) ? 1 : 0;
      }));
      return {
        topic: 'Every cell changes at once', section: 'game-of-life', strategy: 'inplace',
        prompt: `Cells are 1 (alive) or 0 (dead): ${gridText(b)}. All cells update at the same moment: a live cell with 2 or 3 live neighbours (of its up to 8 neighbours) stays alive, a dead cell with exactly 3 comes alive, and every other cell is dead. Update the grid in place. What is the next state?`,
        question: 'Enter the result row by row as one list.', answer: flat(out),
        hints: ['Every cell needs its neighbours’ OLD state. Where can the new state wait without destroying the old one?', 'The cells hold only 0 or 1. An int has many more bits than that.', 'Write the next state into bit 1 while counting neighbours with & 1; then shift every cell right once.'],
        rubric: ['Neighbour counts read only the old state.', 'The new state is stored in a spare bit and revealed in a second pass.', 'O(rows × cols) time, O(1) extra space.'],
        explanation: `Next state: ${gridText(out)}.`,
      };
    }
    case 'zigzag': {
      const shapes: [number, number][] = [[3, 3], [2, 4], [3, 2], [1, 4], [4, 1], [3, 4]];
      const [rows, cols] = shapes[v % shapes.length];
      const m = make2d(rows, cols, () => rnd(20));
      const answer: number[] = [];
      for (let d = 0; d <= rows + cols - 2; d++) {
        const cells: number[] = [];
        for (let r = 0; r < rows; r++) { const c = d - r; if (c >= 0 && c < cols) cells.push(m[r][c]); }
        answer.push(...(d % 2 === 0 ? cells.reverse() : cells));
      }
      return {
        topic: 'Zigzag along the slanted lines', section: 'diagonals', strategy: 'lines',
        prompt: `Read the ${rows} × ${cols} grid ${gridText(m)} along its up-right slanted lines, zigzagging: start at the top-left cell, go up-right along the first line, then down-left along the next, and so on, alternating direction each line.`,
        question: 'Enter the values in order.', answer,
        hints: ['What do all the cells on one up-right slanted line have in common?', 'On each such line, row + column is the same number d, from 0 up to rows + cols − 2.', 'For each d, the rows run from max(0, d − cols + 1) to min(d, rows − 1). Even d: go up (row decreasing). Odd d: go down.'],
        rubric: ['Cells are grouped by r + c.', 'The row range on each line is clipped to the grid, so no bounds checks fail.', 'Direction alternates with the parity of d; O(rows × cols) time.'],
        explanation: `Order: ${arr(answer)}.`,
      };
    }
    case 'constant-lines': {
      const shapes: [number, number][] = [[3, 4], [4, 3], [2, 2], [3, 3], [1, 5], [4, 2]];
      const [rows, cols] = shapes[v % shapes.length];
      const seeds = Array.from({ length: rows + cols }, () => rnd(9));
      const m = make2d(rows, cols, (r, c) => seeds[r - c + cols]);
      if (v % 2 === 1 && rows > 1 && cols > 1) { const r = 1 + rnd(rows - 1), c = 1 + rnd(cols - 1); m[r][c] = m[r][c] + 1; }
      let answer = true;
      for (let r = 1; r < rows; r++) for (let c = 1; c < cols; c++) if (m[r][c] !== m[r - 1][c - 1]) answer = false;
      return {
        topic: 'Constant down-right lines', section: 'diagonals', strategy: 'lines',
        prompt: `In ${gridText(m)}, is every down-right slanted line (top-left to bottom-right) made of one repeated value?`,
        question: 'Enter yes or no.', answer,
        hints: ['What do all the cells on one down-right slanted line have in common?', 'Row − column is constant along it. So each cell sits on the same line as its up-left neighbour.', 'Check every cell with r ≥ 1 and c ≥ 1 against grid[r − 1][c − 1].'],
        rubric: ['Cells on one down-right line share r − c.', 'Comparing each cell with its up-left neighbour checks every line without grouping.', 'O(rows × cols) time, O(1) space; works row by row if the grid streams in.'],
        explanation: answer ? 'Every cell equals its up-left neighbour.' : 'At least one cell differs from its up-left neighbour.',
      };
    }
    case 'sorted-grid': {
      const rows = 3 + (v % 3), cols = 3 + (Math.floor(v / 3) % 3);
      const m = make2d(rows, cols, () => 0);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) m[r][c] = Math.max(r ? m[r - 1][c] : 0, c ? m[r][c - 1] : 0) + 1 + rnd(3);
      const present = new Set(m.flat());
      let target = m[rnd(rows)][rnd(cols)];
      if (v % 2 === 1) { target = 1; while (present.has(target)) target++; }
      return {
        topic: 'Search a grid sorted two ways', section: 'staircase', strategy: 'corner',
        prompt: `Every row of ${gridText(m)} increases left to right and every column increases top to bottom (a row may start below the previous row’s end). Is ${target} in the grid? Aim for O(rows + cols) comparisons.`,
        question: 'Enter yes or no.', answer: present.has(target),
        hints: ['Find a corner where “too big” and “too small” send you in two different directions.', 'The top-right value is the largest in its row and the smallest in its column.', 'Too big: step left (the column below is bigger still). Too small: step down (the row to the left is smaller still).'],
        rubric: ['Starts at the top-right (or bottom-left) corner.', 'Each comparison discards a whole row or column, so at most rows + cols steps.', 'Flattening into one sorted list would be wrong here: rows overlap in value.'],
        explanation: present.has(target) ? `${target} is in the grid.` : `${target} is not in the grid.`,
      };
    }
    case 'square': {
      const shapesPts: [number, number][][] = [
        [[0, 0], [2, 1], [1, 3], [-1, 2]],        // tilted square
        [[0, 0], [2, 1], [4, 0], [2, -1]],        // rhombus, unequal diagonals
        [[0, 0], [4, 0], [4, 2], [0, 2]],         // rectangle
        [[0, 0], [3, 0], [3, 3], [0, 3]],         // axis square
        [[1, 1], [1, 1], [1, 1], [1, 1]],         // one point four times
        [[0, 0], [1, 2], [3, 1], [2, -1]],        // tilted square, side² = 5
      ];
      const base = shapesPts[v % shapesPts.length];
      const dx = rnd(7) - 3, dy = rnd(7) - 3, spin = rnd(4);
      const pts = base.map((_, i) => base[(i + spin) % 4]).map(([x, y]) => [x + dx, y + dy]);
      if (v % 2 === 1) [pts[1], pts[2]] = [pts[2], pts[1]];
      const d: number[] = [];
      for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) d.push((pts[i][0] - pts[j][0]) ** 2 + (pts[i][1] - pts[j][1]) ** 2);
      d.sort((a, b) => a - b);
      const answer = d[0] > 0 && d[0] === d[3] && d[4] === d[5] && d[4] === 2 * d[0];
      return {
        topic: 'Four points, one shape', section: 'valid-square', strategy: 'geometry',
        prompt: `Do the points ${pts.map(([x, y]) => `(${x}, ${y})`).join(', ')}, given in no particular order, form a square with positive area?`,
        question: 'Enter yes or no.', answer,
        hints: ['The order of the points is unknown. What can you compute that ignores order?', 'All six pairwise distances. Squared, they are exact integers.', 'Sorted, a square has four equal non-zero sides and two equal diagonals, with diagonal² = 2 × side².'],
        rubric: ['Squared distances only: no square roots, no floating point.', 'Checks the four smallest are equal and non-zero, the two largest equal, and the diagonal relation.', 'Constant time; independent of the order the points arrive in.'],
        explanation: `Sorted squared distances: ${arr(d)}. ${answer ? 'Four equal sides, two equal diagonals, diagonal² = 2 × side²: a square.' : 'That pattern is not a square’s.'}`,
      };
    }
    case 'islands': {
      const rows = 4 + (v % 2), cols = 5;
      const g = make2d(rows, cols, () => (rnd(5) < 2 ? 1 : 0));
      const seen = g.map(r => r.map(() => false));
      let answer = 0;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        if (!g[r][c] || seen[r][c]) continue;
        answer++;
        const stack: [number, number][] = [[r, c]]; seen[r][c] = true;
        while (stack.length) {
          const [y, x] = stack.pop()!;
          for (const [a, b] of [[y + 1, x], [y - 1, x], [y, x + 1], [y, x - 1]]) if (a >= 0 && a < rows && b >= 0 && b < cols && g[a][b] && !seen[a][b]) { seen[a][b] = true; stack.push([a, b]); }
        }
      }
      return {
        topic: 'Know when to choose another tool', section: 'choose-the-tool', strategy: 'other',
        prompt: `In ${gridText(g)}, 1 is land and 0 is water. Land cells that touch up, down, left or right belong to the same island. How many islands are there?`,
        question: 'Enter the number of islands.', answer,
        hints: ['Which cells belong together depends on paths between neighbours, not on rows or columns as a whole.', 'From each land cell you haven’t visited yet, visit everything reachable from it.', 'Count how many times you start a fresh visit: depth-first or breadth-first search over the four neighbours.'],
        rubric: ['Recognises connectivity: a graph traversal, not an index map.', 'Every land cell is visited once (marked on entry), so O(rows × cols).', 'Index arithmetic only supplies the four neighbours (r ± 1, c) and (r, c ± 1).'],
        explanation: `${answer} island(s). Counting connected groups is a flood fill, not a grid-arithmetic trick.`,
      };
    }
  }
}

export function challengeFor(id: string, variant = 0): Challenge {
  return { id, question: 'Enter only the result.', ...make(id as ConceptId, variant) };
}

export const practice: PracticeSet = {
  storageKey: 'citadel-matrix-review-v1',
  strategies,
  conceptIds,
  challengeFor,
};
