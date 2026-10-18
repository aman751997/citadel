// Dry-run frames for every problem in src/dsa-lessons/matrix.mdx. Each generator replays the lesson's
// algorithm on a small input and ends with a text view holding `answer` (checked in tests/matrix-frames.test.ts).
import { recorder, tvars, type Frame, type View, type CellTone, type Val } from '../../lib/dryrun.ts';

type G = number[][];
type Tones = { r: number; c: number; tone: CellTone }[];
type Ptrs = { r: number; c: number; label: string }[];
const copy = (m: G) => m.map(r => [...r]);
const show = (m: unknown) => JSON.stringify(m);
const yesno = (b: boolean) => (b ? 'true' : 'false');
const q = (question: string, options: string[], answer: number, explain: string) => ({ question, options, answer, explain });
const uq = (question: string, correct: string, wrong: string[], explain: string) => q(question, [...new Set([correct, ...wrong])], 0, explain);
const idx = (n: number) => Array.from({ length: n }, (_, i) => i);
const gv = (cells: (Val | null)[][], tones: Tones = [], name?: string, pointers: Ptrs = []): View => ({
  kind: 'grid', ...(name ? { name } : {}), cells: cells.map(r => [...r]),
  rowLabels: idx(cells.length), colLabels: idx(cells[0]?.length ?? 0), tones, pointers,
});
const tone = (cells: [number, number][], t: CellTone): Tones => cells.map(([r, c]) => ({ r, c, tone: t }));

export function rotateFrames(input: G): Frame[] {
  const a = copy(input), n = a.length, r = recorder();
  r.frame(`Goal: cell (r, c) must end at (c, n − 1 − r), with n = ${n}. Pass 1 transposes: swap (r, c) with (c, r), but only for c > r so every pair is swapped exactly once. Pass 2 reverses each row.`,
    [gv(a, [], 'matrix'), tvars({ n, pass: 'transpose' })]);
  let first = true;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const x = a[i][j], y = a[j][i];
    a[i][j] = y; a[j][i] = x;
    r.frame(`Swap (${i}, ${j}) = ${x} with (${j}, ${i}) = ${y}. Both values are in hand, so nothing is lost. Starting c at r + 1 means (${j}, ${i}) is never visited as a first cell, so this pair is not swapped back.`,
      [gv(a, tone([[i, j], [j, i]], 'swapped'), 'matrix'), tvars({ r: i, c: j, pass: 'transpose' })],
      first ? q(`r = ${i}, c = ${j}. Which cell does matrix[r][c] swap with?`, ['(c, r)', '(r, n − 1 − c)', '(n − 1 − r, c)'], 0, 'Transpose sends (r, c) to (c, r).') : undefined);
    first = false;
  }
  r.frame(`Transpose done: every cell sits at (c, r). Pass 2: reversing row c sends (c, r) to (c, n − 1 − r), which is the clockwise map. Each row swaps (row, i) with (row, n − 1 − i) for i below n / 2.`,
    [gv(a, [], 'matrix'), tvars({ n, pass: 'reverse rows' })]);
  first = true;
  for (let row = 0; row < n; row++) for (let i = 0, j = n - 1; i < j; i++, j--) {
    const x = a[row][i], y = a[row][j];
    a[row][i] = y; a[row][j] = x;
    r.frame(`Row ${row}: swap (${row}, ${i}) = ${x} with (${row}, ${j}) = ${y}, where j = n − 1 − i = ${j}. Rows above ${row} are already final.`,
      [gv(a, tone([[row, i], [row, j]], 'swapped'), 'matrix'), tvars({ row, i, j, pass: 'reverse rows' })],
      first ? uq(`Row ${row} is being reversed. Which cell does (${row}, ${i}) swap with?`, `(${row}, ${j})`, [`(${j}, ${row})`, `(${row}, ${i + 1})`, `(${row + 1}, ${i})`], 'Reversal swaps column i with column n − 1 − i inside the same row.') : undefined);
    first = false;
  }
  r.frame(`Both passes are done. Result: ${show(a)}. The top row of the input is now the right-hand column.`,
    [gv(a, [], 'matrix'), tvars({ answer: show(a) })]);
  return r.frames;
}

export function rotateRingFrames(input: G): Frame[] {
  const a = copy(input), n = a.length, r = recorder();
  r.frame(`Each cell moves in a cycle of four: (i, j) → (j, n − 1 − i) → (n − 1 − i, n − 1 − j) → (n − 1 − j, i) → (i, j). Hold one cell, slide the other three, drop the held cell in the gap. n = ${n}.`,
    [gv(a, [], 'matrix'), tvars({ n })]);
  for (let i = 0; i < Math.floor(n / 2); i++) for (let j = i; j < n - 1 - i; j++) {
    const cells: [number, number][] = [[i, j], [n - 1 - j, i], [n - 1 - i, n - 1 - j], [j, n - 1 - i]];
    const t = a[i][j];
    a[i][j] = a[n - 1 - j][i];
    a[n - 1 - j][i] = a[n - 1 - i][n - 1 - j];
    a[n - 1 - i][n - 1 - j] = a[j][n - 1 - i];
    a[j][n - 1 - i] = t;
    r.frame(`Ring ${i}, j = ${j}. Hold t = ${t} from top (${i}, ${j}). top ← left (${n - 1 - j}, ${i}); left ← bottom (${n - 1 - i}, ${n - 1 - j}); bottom ← right (${j}, ${n - 1 - i}); right ← t. Four cells change in one go.`,
      [gv(a, tone(cells, 'swapped'), 'matrix'), tvars({ ring: i, j, held: t })]);
  }
  r.frame(`Every ring is turned. Result: ${show(a)}, the same as transpose plus reverse, with each cell written once.`, [gv(a, [], 'matrix'), tvars({ answer: show(a) })]);
  return r.frames;
}

export function spiralFrames(input: G): Frame[] {
  const rows = input.length, cols = input[0].length, r = recorder(), out: number[] = [];
  let top = 0, bottom = rows - 1, left = 0, right = cols - 1;
  const read: [number, number][] = [];
  const vars = () => ({ top, bottom, left, right, read: out.length });
  let prev = vars();
  const walkFrame = (caption: string, cells: [number, number][], arrow: string, predict?: ReturnType<typeof q>) => {
    const last = cells[cells.length - 1];
    r.frame(caption, [gv(input, [...tone(read, 'visited'), ...tone(cells, 'active')], 'matrix', last ? [{ r: last[0], c: last[1], label: arrow }] : []),
      { kind: 'array', name: 'output so far', values: out.length ? [...out] : ['(empty)'], indices: false }, tvars(vars(), prev)], predict);
    cells.forEach(p => read.push(p)); prev = vars();
  };
  r.frame(`The unread cells are always a rectangle: rows top..bottom, columns left..right. Each lap walks its four edges, and after each walk that edge moves inward. Start: top = 0, bottom = ${bottom}, left = 0, right = ${right}.`,
    [gv(input, [], 'matrix'), { kind: 'array', name: 'output so far', values: ['(empty)'], indices: false }, tvars(vars())]);
  while (top <= bottom && left <= right) {
    let cells: [number, number][] = [];
    for (let c = left; c <= right; c++) cells.push([top, c]);
    top++;
    cells.forEach(([a, b]) => out.push(input[a][b]));
    walkFrame(`Walk right along row ${top - 1}, columns ${left}..${right}: read ${cells.map(([a, b]) => input[a][b]).join(', ')}. Then top becomes ${top}, because row ${top - 1} is used up.`, cells, '→');
    cells = [];
    for (let rr = top; rr <= bottom; rr++) cells.push([rr, right]);
    right--;
    cells.forEach(([a, b]) => out.push(input[a][b]));
    walkFrame(cells.length
      ? `Turn down. Walk column ${right + 1}, rows ${top}..${bottom}: read ${cells.map(([a, b]) => input[a][b]).join(', ')}. Then right becomes ${right}.`
      : `Turn down. Rows ${top}..${bottom} is an empty range, so nothing is read. right becomes ${right}.`, cells, '↓');
    const rowLeft = top <= bottom;
    if (rowLeft) {
      cells = [];
      for (let c = right; c >= left; c--) cells.push([bottom, c]);
      bottom--;
      cells.forEach(([a, b]) => out.push(input[a][b]));
      walkFrame(`Guard top <= bottom holds (${top} <= ${bottom + 1}), so an unread row exists. Walk left along row ${bottom + 1}, columns ${right} down to ${left}: read ${cells.map(([a, b]) => input[a][b]).join(', ')}. Then bottom becomes ${bottom}.`, cells, '←',
        q(`After the right and down walks: top = ${top}, bottom = ${bottom + 1}. Walk left along the bottom row?`, ['Yes, an unread row remains', 'No, skip it'], 0, 'top <= bottom, so row bottom has not been read yet.'));
    } else {
      r.frame(`Guard top <= bottom fails (${top} > ${bottom}): every row is already read. Walking left along row ${bottom} would read it a second time, so skip the walk.`,
        [gv(input, tone(read, 'visited'), 'matrix'), { kind: 'array', name: 'output so far', values: [...out], indices: false }, tvars(vars(), prev)],
        q(`top = ${top}, bottom = ${bottom}. Walk left along the bottom row?`, ['Yes, walk it', 'No, skip it'], 1, 'top has passed bottom, so no unread row remains. Walking would repeat cells.'));
    }
    if (left <= right) {
      cells = [];
      for (let rr = bottom; rr >= top; rr--) cells.push([rr, left]);
      left++;
      cells.forEach(([a, b]) => out.push(input[a][b]));
      walkFrame(`Guard left <= right holds, so an unread column exists. Walk up column ${left - 1}, rows ${bottom} up to ${top}: read ${cells.length ? cells.map(([a, b]) => input[a][b]).join(', ') : 'nothing (empty range)'}. Then left becomes ${left}.`, cells, '↑');
    } else {
      r.frame(`Guard left <= right fails (${left} > ${right}): every column is already read. Walking up column ${left} would repeat cells, so skip it.`,
        [gv(input, tone(read, 'visited'), 'matrix'), { kind: 'array', name: 'output so far', values: [...out], indices: false }, tvars(vars(), prev)]);
    }
  }
  r.frame(`The loop ends because top (${top}) > bottom (${bottom}) or left (${left}) > right (${right}). ${out.length} values for ${rows * cols} cells. Result: ${show(out)}.`,
    [gv(input, tone(read, 'done'), 'matrix'), tvars({ ...vars(), answer: show(out) }, prev)]);
  return r.frames;
}

export function zeroesFrames(input: G): Frame[] {
  const m = copy(input), R = m.length, C = m[0].length, r = recorder();
  let fr = false, fc = false;
  r.frame('Plan: 1) save what row 0 and column 0 say in two booleans, 2) write notes on the edges for every inner zero, 3) zero the inner cells from the notes, 4) settle the edges last.',
    [gv(m, [], 'matrix'), tvars({ firstRowZero: '?', firstColZero: '?' })]);
  for (let c = 0; c < C; c++) if (m[0][c] === 0) fr = true;
  for (let rr = 0; rr < R; rr++) if (m[rr][0] === 0) fc = true;
  r.frame(`Step 1, flags first. Row 0 ${fr ? 'holds a zero' : 'has no zero'}, column 0 ${fc ? 'holds a zero' : 'has no zero'}. Notes are about to overwrite these edges, so their own answer must be saved before the first note is written.`,
    [gv(m, [...tone(idx(C).map(c => [0, c] as [number, number]), 'compared'), ...tone(idx(R).map(x => [x, 0] as [number, number]), 'compared')], 'matrix'), tvars({ firstRowZero: yesno(fr), firstColZero: yesno(fc) })]);
  const flags = { firstRowZero: yesno(fr), firstColZero: yesno(fc) };
  let noted = false;
  for (let rr = 1; rr < R; rr++) for (let c = 1; c < C; c++) if (m[rr][c] === 0) {
    m[rr][0] = 0; m[0][c] = 0; noted = true;
    r.frame(`Step 2, notes. Inner zero at (${rr}, ${c}): write matrix[${rr}][0] = 0 (row ${rr} must go) and matrix[0][${c}] = 0 (column ${c} must go). The inner cells are not touched yet, so no new zero can be mistaken for an old one.`,
      [gv(m, [...tone([[rr, c]], 'active'), ...tone([[rr, 0], [0, c]], 'swapped')], 'matrix'), tvars(flags)],
      uq(`Inner zero at (${rr}, ${c}). Where do the notes go?`, `matrix[${rr}][0] and matrix[0][${c}]`, [`matrix[${rr}][${c}] only`, `matrix[${c}][0] and matrix[0][${rr}]`], 'The row note lives at the start of the row, the column note at the top of the column.'));
  }
  if (!noted) r.frame('Step 2, notes. The inner cells (rows 1.., columns 1..) hold no zero, so no new notes are written. Only the edges themselves can request zeroing.', [gv(m, [], 'matrix'), tvars(flags)]);
  let any = false;
  for (let rr = 1; rr < R; rr++) for (let c = 1; c < C; c++) if (m[rr][0] === 0 || m[0][c] === 0) {
    const why = m[rr][0] === 0 ? `row note matrix[${rr}][0] = 0` : `column note matrix[0][${c}] = 0`;
    const was = m[rr][c];
    m[rr][c] = 0; any = true;
    r.frame(`Step 3, inside. Cell (${rr}, ${c}): its ${why}, so it becomes 0${was === 0 ? ' (it already was)' : ` (was ${was})`}. Only notes are read here, and notes are never overwritten in this step.`,
      [gv(m, [...tone([[rr, 0], [0, c]], 'compared'), ...tone([[rr, c]], 'done')], 'matrix'), tvars(flags)],
      q(`Cell (${rr}, ${c}): row note matrix[${rr}][0] = ${m[rr][0]}, column note matrix[0][${c}] = ${m[0][c]}. Zero it?`, ['Yes', 'No'], 0, 'One note of 0 is enough: its row or its column must be zeroed.'));
  }
  if (!any) r.frame('Step 3, inside. No inner cell has a zero note on its row or column, so none changes.', [gv(m, [], 'matrix'), tvars(flags)]);
  if (fr) { for (let c = 0; c < C; c++) m[0][c] = 0; }
  r.frame(fr ? 'Step 4, edges last. firstRowZero is true, so every cell of row 0 becomes 0. Settling it now is safe: nobody needs row 0 as a column note any more.' : 'Step 4, edges. firstRowZero is false, so row 0 keeps its values (notes in it, if any, are real zeros already).',
    [gv(m, fr ? tone(idx(C).map(c => [0, c] as [number, number]), 'done') : [], 'matrix'), tvars(flags)]);
  if (fc) { for (let rr = 0; rr < R; rr++) m[rr][0] = 0; }
  r.frame(fc ? 'Step 4, edges last. firstColZero is true, so every cell of column 0 becomes 0.' : 'Step 4, edges. firstColZero is false, so column 0 keeps its values.',
    [gv(m, fc ? tone(idx(R).map(x => [x, 0] as [number, number]), 'done') : [], 'matrix'), tvars(flags)]);
  r.frame(`Result: ${show(m)}. Every value was read before the step that overwrote it.`, [gv(m, [], 'matrix'), tvars({ ...flags, answer: show(m) })]);
  return r.frames;
}

const fmt = (v: number) => (Number.isInteger(v) ? String(v) : String(+v.toPrecision(8)));

export function powFrames(x0: number, n: number): Frame[] {
  const r = recorder();
  let x = x0, e = n, result = 1;
  const bits = () => (e > 0 ? e.toString(2).split('') : ['0']);
  const view = (hl: boolean): View => ({
    kind: 'array', name: 'e in binary', values: bits(), indices: false,
    pointers: e > 0 ? [{ at: bits().length - 1, label: 'low bit', tone: 'gold' }] : [],
    tones: hl ? { [bits().length - 1]: 'active' } : {},
  });
  const vars = () => ({ result: fmt(result), base: fmt(x), e });
  r.frame(`Compute ${fmt(x0)}^${n}. Promise: result × base^e = x^n. Start result = 1, base = ${fmt(x)}, e = ${e}.`, [view(false), tvars(vars())]);
  if (e < 0) {
    x = 1 / x; e = -e;
    r.frame(`Negative exponent: x^−n = (1/x)^n. Invert the base to ${fmt(x)} and negate e to ${e}. In Java, copy n into a long first: −(−2147483648) does not fit in an int.`, [view(false), tvars(vars())]);
  }
  while (e > 0) {
    const prev = vars(), odd = e % 2 === 1, bit = e & 1;
    if (odd) result *= x;
    const b0 = x, e0 = e;
    x *= x; e = Math.floor(e / 2);
    r.frame(`e = ${e0} has low bit ${bit}. ${odd ? `It is 1, so base^e = base × (base^(e−1)): move one base into result (result = ${fmt(result)}).` : 'It is 0, so result is unchanged.'} Square the base (${fmt(b0)}² = ${fmt(x)}) and halve e to ${e}: base^e is unchanged.`,
      [{ kind: 'array', name: `e before this step: ${e0.toString(2)}`, values: e0.toString(2).split(''), indices: false, pointers: [{ at: e0.toString(2).length - 1, label: 'low bit', tone: 'gold' }], tones: { [e0.toString(2).length - 1]: odd ? 'active' : 'out' } }, tvars(vars(), prev)],
      q(`e = ${e0}, low bit ${bit}. Is the base multiplied into result?`, ['Yes', 'No'], odd ? 0 : 1, odd ? 'Odd e: one factor of base belongs to result.' : 'Even e: only squaring and halving.'));
  }
  r.frame(`e reached 0, so base^e = 1 and result = x^n = ${fmt(result)}. About log2(n) iterations instead of n multiplications.`, [view(false), tvars({ ...vars(), answer: String(result) })]);
  return r.frames;
}

export function spiralIIFrames(n: number): Frame[] {
  const m: (number | null)[][] = Array.from({ length: n }, () => Array(n).fill(null));
  const r = recorder(), filled: [number, number][] = [];
  let top = 0, bottom = n - 1, left = 0, right = n - 1, next = 1;
  const vars = () => ({ top, bottom, left, right, next });
  let prev = vars();
  const fill = (caption: string, cells: [number, number][], arrow: string) => {
    const start = next;
    cells.forEach(([a, b]) => { m[a][b] = next++; });
    const last = cells[cells.length - 1];
    r.frame(caption.replace('#', cells.length ? `${start}..${next - 1}` : 'nothing'), [gv(m, [...tone(filled, 'visited'), ...tone(cells, 'active')], 'frame', last ? [{ r: last[0], c: last[1], label: arrow }] : []), tvars(vars(), prev)]);
    cells.forEach(p => filled.push(p)); prev = vars();
  };
  r.frame(`Write 1..${n * n} in spiral order into an empty ${n} × ${n} frame. It is the same walk as reading a spiral, but each step writes next++ instead of out.add(...).`, [gv(m, [], 'frame'), tvars(vars())]);
  while (top <= bottom && left <= right) {
    let cells: [number, number][] = [];
    for (let c = left; c <= right; c++) cells.push([top, c]);
    top++;
    fill(`Right along row ${top - 1}: write #. top becomes ${top}.`, cells, '→');
    cells = [];
    for (let rr = top; rr <= bottom; rr++) cells.push([rr, right]);
    right--;
    fill(`Down column ${right + 1}: write #. right becomes ${right}.`, cells, '↓');
    if (top <= bottom) {
      cells = [];
      for (let c = right; c >= left; c--) cells.push([bottom, c]);
      bottom--;
      fill(`Guard top <= bottom holds. Left along row ${bottom + 1}: write #. bottom becomes ${bottom}.`, cells, '←');
    }
    if (left <= right) {
      cells = [];
      for (let rr = bottom; rr >= top; rr--) cells.push([rr, left]);
      left++;
      fill(`Guard left <= right holds. Up column ${left - 1}: write #. left becomes ${left}.`, cells, '↑');
    }
  }
  r.frame(`Boundaries have crossed. next ended at ${next} = n² + 1 = ${n * n + 1}: a free self-check that every cell was written once. Result: ${show(m)}.`, [gv(m, tone(filled, 'done'), 'frame'), tvars({ ...vars(), answer: show(m) }, prev)]);
  return r.frames;
}

export type TurnKind = 'transpose' | 'clockwise' | 'counter';
export function turnFrames(input: G, kind: TurnKind): Frame[] {
  const R = input.length, C = input[0].length, r = recorder();
  const out: (number | null)[][] = Array.from({ length: C }, () => Array(R).fill(null));
  const dest = (a: number, b: number): [number, number] => kind === 'transpose' ? [b, a] : kind === 'clockwise' ? [b, R - 1 - a] : [C - 1 - b, a];
  const rule = kind === 'transpose' ? '(r, c) → (c, r)' : kind === 'clockwise' ? '(r, c) → (c, rows − 1 − r)' : '(r, c) → (cols − 1 − c, r)';
  r.frame(`The input has rows = ${R} and cols = ${C}, so the result must be ${C} × ${R}: allocate int[${C}][${R}] before copying. Map: ${rule}. Allocating [${R}][${C}] would throw on the first rectangle.`,
    [gv(input, [], 'input'), gv(out, [], `output ${C} × ${R}`), tvars({ rows: R, cols: C })]);
  const done: [number, number][] = [];
  let first = true;
  for (let a = 0; a < R; a++) for (let b = 0; b < C; b++) {
    const [dr, dc] = dest(a, b);
    out[dr][dc] = input[a][b];
    const opts = [...new Set([`(${dr}, ${dc})`, `(${a}, ${b})`, `(${b}, ${a})`])];
    const ask = first && opts.length > 1 ? q(`Where does (${a}, ${b}) go under ${rule}?`, opts, 0, 'Substitute r and c into the map and use the new shape.') : undefined;
    if (ask) first = false;
    const arith = kind === 'transpose' ? `(${b}, ${a})` : kind === 'clockwise' ? `(${b}, ${R} − 1 − ${a}) = (${dr}, ${dc})` : `(${C} − 1 − ${b}, ${a}) = (${dr}, ${dc})`;
    r.frame(`Read (${a}, ${b}) = ${input[a][b]}. It goes to ${arith}. The input is never modified, so every read is of an original value.`,
      [gv(input, tone([[a, b]], 'active'), 'input'), gv(out, [...tone(done, 'visited'), ...tone([[dr, dc]], 'found')], `output ${C} × ${R}`), tvars({ r: a, c: b, 'goes to': `(${dr}, ${dc})` })],
      ask);
    done.push([dr, dc]);
  }
  r.frame(`All ${R * C} cells copied. Result (${C} × ${R}): ${show(out)}.`, [gv(out, [], 'output'), tvars({ answer: show(out) })]);
  return r.frames;
}

export function lifeFrames(input: G): Frame[] {
  const b = copy(input), R = b.length, C = b[0].length, r = recorder();
  r.frame('Every cell must see its neighbours\' OLD state. So bit 0 keeps the old state and bit 1 collects the new one. Always count neighbours with value & 1. A cell value is 0 (dead stays dead), 1 (alive dies), 2 (dead comes alive) or 3 (alive survives).',
    [gv(b, [], 'board'), tvars({ pass: 'count and write bit 1' })]);
  for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) {
    let live = 0; const nb: [number, number][] = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const nr = i + dr, nc = j + dc;
      if (nr >= 0 && nr < R && nc >= 0 && nc < C) { nb.push([nr, nc]); live += b[nr][nc] & 1; }
    }
    const alive = (b[i][j] & 1) === 1, next = live === 3 || (alive && live === 2);
    if (next) b[i][j] |= 2;
    r.frame(`Cell (${i}, ${j}) is ${alive ? 'alive' : 'dead'}; ${live} of its ${nb.length} neighbours are alive (counted with & 1, which ignores bit 1). Rule: ${live === 3 ? 'exactly 3 lives or is born' : alive && live === 2 ? 'alive with 2 survives' : 'dies or stays dead'}. ${next ? 'Set bit 1' : 'Leave bit 1 at 0'}, so the cell holds ${b[i][j]}.`,
      [gv(b, [...tone(nb, 'compared'), ...tone([[i, j]], 'active')], 'board'), tvars({ r: i, c: j, live, 'next state': next ? 1 : 0 })],
      q(`Cell (${i}, ${j}) is ${alive ? 'alive' : 'dead'} with ${live} live neighbours. Next state?`, ['Alive', 'Dead'], next ? 0 : 1, 'Alive survives on 2 or 3; dead is born on exactly 3.'));
  }
  r.frame('Pass 1 is over: bit 1 of every cell holds its future. Pass 2 shifts every cell right by one, so the future becomes the present.', [gv(b, [], 'board'), tvars({ pass: 'shift right' })]);
  for (const row of b) for (let j = 0; j < C; j++) row[j] >>= 1;
  r.frame(`After the shift: ${show(b)}. Every update used only old states.`, [gv(b, [], 'board'), tvars({ answer: show(b) })]);
  return r.frames;
}

export function diagonalFrames(input: G): Frame[] {
  const R = input.length, C = input[0].length, r = recorder(), out: number[] = [], seen: [number, number][] = [];
  r.frame(`Every cell on an up-right line has the same r + c. There are ${R + C - 1} lines: d = 0..${R + C - 2}. Even d is walked up (row falling), odd d is walked down. Row range on line d: max(0, d − ${C - 1}) to min(d, ${R - 1}).`,
    [gv(input, [], 'matrix'), tvars({ d: '?' })]);
  for (let d = 0; d <= R + C - 2; d++) {
    const lo = Math.max(0, d - (C - 1)), hi = Math.min(d, R - 1), cells: [number, number][] = [];
    if (d % 2 === 0) for (let rr = hi; rr >= lo; rr--) cells.push([rr, d - rr]);
    else for (let rr = lo; rr <= hi; rr++) cells.push([rr, d - rr]);
    cells.forEach(([a, b]) => out.push(input[a][b]));
    r.frame(`d = ${d}: rows ${lo}..${hi}, column = d − r. d is ${d % 2 === 0 ? 'even, so walk up (r falling)' : 'odd, so walk down (r rising)'}: read ${cells.map(([a, b]) => `(${a}, ${b})=${input[a][b]}`).join(', ')}. The clipped range means no bounds check is needed.`,
      [gv(input, [...tone(seen, 'visited'), ...tone(cells, 'active')], 'matrix'), { kind: 'array', name: 'output so far', values: [...out], indices: false }, tvars({ d, lo, hi })],
      q(`d = ${d} is ${d % 2 === 0 ? 'even' : 'odd'}. Which way is the line walked?`, ['Up-right (row falls)', 'Down-left (row rises)'], d % 2 === 0 ? 0 : 1, 'Even d goes up-right, odd d goes down-left.'));
    cells.forEach(p => seen.push(p));
  }
  r.frame(`All ${R + C - 1} lines are read. Result: ${show(out)}.`, [gv(input, tone(seen, 'done'), 'matrix'), tvars({ answer: show(out) })]);
  return r.frames;
}

export function toeplitzFrames(input: G): Frame[] {
  const R = input.length, C = input[0].length, r = recorder(), checked: [number, number][] = [];
  r.frame('Cells on one down-right line share r − c. So every cell must equal its up-left neighbour: matrix[r][c] == matrix[r − 1][c − 1] for r, c >= 1. No grouping is needed.', [gv(input, [], 'matrix'), tvars({ answer: '?' })]);
  for (let a = 1; a < R; a++) for (let b = 1; b < C; b++) {
    const same = input[a][b] === input[a - 1][b - 1];
    r.frame(same ? `(${a}, ${b}) = ${input[a][b]} equals its up-left neighbour (${a - 1}, ${b - 1}) = ${input[a - 1][b - 1]}. Both lie on line r − c = ${a - b}. Keep going.`
      : `(${a}, ${b}) = ${input[a][b]} differs from (${a - 1}, ${b - 1}) = ${input[a - 1][b - 1]}, yet both lie on line r − c = ${a - b}. One mismatch is enough: return false.`,
    [gv(input, [...tone(checked, 'visited'), ...tone([[a - 1, b - 1]], 'compared'), ...tone([[a, b]], same ? 'active' : 'out')], 'matrix'), tvars({ r: a, c: b, answer: same ? '?' : 'false' })],
    q(`(${a}, ${b}) = ${input[a][b]}, up-left (${a - 1}, ${b - 1}) = ${input[a - 1][b - 1]}. Continue or stop?`, ['Equal: continue', 'Different: return false'], same ? 0 : 1, 'Equal values keep the line constant; one difference breaks it.'));
    if (!same) return r.frames;
    checked.push([a, b]);
  }
  r.frame('Every cell matched its up-left neighbour, so every down-right line is constant. Return true.', [gv(input, tone(checked, 'done'), 'matrix'), tvars({ answer: 'true' })]);
  return r.frames;
}

export function staircaseFrames(input: G, target: number): Frame[] {
  const R = input.length, C = input[0].length, r = recorder();
  let row = 0, col = C - 1;
  const outside = () => { const t: Tones = []; for (let a = 0; a < R; a++) for (let b = 0; b < C; b++) if (a < row || b > col) t.push({ r: a, c: b, tone: 'out' }); return t; };
  r.frame(`Looking for ${target}. Start at the top-right corner (0, ${C - 1}): the largest value in its row and the smallest in its column, so "too big" and "too small" point different ways.`,
    [gv(input, tone([[0, C - 1]], 'active'), 'matrix'), tvars({ r: row, c: col, target })]);
  while (row < R && col >= 0) {
    const v = input[row][col];
    if (v === target) {
      r.frame(`(${row}, ${col}) = ${v} equals ${target}. Found.`, [gv(input, [...outside(), ...tone([[row, col]], 'found')], 'matrix'), tvars({ r: row, c: col, answer: 'true' })]);
      return r.frames;
    }
    const big = v > target, was = [row, col];
    const shown = [...outside(), ...tone([[row, col]], 'compared')];
    if (big) col--; else row++;
    r.frame(big ? `(${was[0]}, ${was[1]}) = ${v} > ${target}. Everything below it in column ${was[1]} is even bigger, so the whole column is out. Step left: c = ${col}.`
      : `(${was[0]}, ${was[1]}) = ${v} < ${target}. Everything left of it in row ${was[0]} is even smaller, so the whole row is out. Step down: r = ${row}.`,
    [gv(input, shown, 'matrix'), tvars({ r: row, c: col, target })],
    q(`${v} versus target ${target}. Which way?`, ['Left (column out)', 'Down (row out)'], big ? 0 : 1, big ? 'Too big: the column below is bigger still.' : 'Too small: the row to the left is smaller still.'));
  }
  r.frame(`The walk left the grid (r = ${row}, c = ${col}) without meeting ${target}: every row and column was ruled out. Return false.`, [gv(input, outside(), 'matrix'), tvars({ answer: 'false' })]);
  return r.frames;
}

export function squareFrames(pts: number[][]): Frame[] {
  const r = recorder(), names = 'ABCD';
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const x0 = Math.min(...xs), y1 = Math.max(...ys), W = Math.max(...xs) - x0 + 1, H = y1 - Math.min(...ys) + 1;
  const plot = (hot: number[] = []): View => {
    const cells: (string | null)[][] = Array.from({ length: H }, () => Array(W).fill(null));
    const t: Tones = [];
    pts.forEach((p, i) => { const rr = y1 - p[1], c = p[0] - x0; cells[rr][c] = (cells[rr][c] ?? '') + names[i]; if (hot.includes(i)) t.push({ r: rr, c, tone: 'active' }); });
    return { kind: 'grid', name: `points (x from ${x0}, y up from ${y1 - H + 1})`, cells, tones: t };
  };
  const d: number[] = [], labels: string[] = [];
  r.frame('The points come in any order, so use something order-free: all six pairwise distances, squared (dx² + dy²) so everything stays an exact integer. A square has four equal sides and two equal diagonals, with diagonal² = 2 × side².',
    [plot(), { kind: 'array', name: 'points', values: pts.map((p, i) => `${names[i]}(${p[0]}, ${p[1]})`), indices: false }, tvars({ answer: '?' })]);
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
    const dx = pts[i][0] - pts[j][0], dy = pts[i][1] - pts[j][1], v = dx * dx + dy * dy;
    d.push(v); labels.push(`${names[i]}${names[j]}`);
    r.frame(`${names[i]}${names[j]}: dx = ${dx}, dy = ${dy}, so squared distance = ${dx * dx} + ${dy * dy} = ${v}.`,
      [plot([i, j]), { kind: 'array', name: 'squared distances', values: [...d], indices: false, pointers: [{ at: d.length - 1, label: labels[labels.length - 1] }] }, tvars({ pair: names[i] + names[j], 'd²': v })]);
  }
  const s = [...d].sort((a, b) => a - b);
  r.frame(`Sorted: ${s.join(', ')}. In a square the four smallest are the sides and the two largest are the diagonals.`, [plot(), { kind: 'array', name: 'sorted', values: s, indices: true, regions: [{ from: 0, to: 3, label: 'sides', tone: 'blue' }, { from: 4, to: 5, label: 'diagonals', tone: 'gold' }] }, tvars({})]);
  const ok = s[0] > 0 && s[0] === s[3] && s[4] === s[5] && s[4] === 2 * s[0];
  r.frame(`Check: d[0] > 0 (${s[0]} > 0) rules out repeated points; d[0] == d[3] is four equal sides (${s[0]} vs ${s[3]}); d[4] == d[5] is equal diagonals (${s[4]} vs ${s[5]}); d[4] == 2 × d[0] is Pythagoras (${s[4]} vs ${2 * s[0]}). Result: ${ok}.`,
    [plot(), tvars({ 'd[0]': s[0], 'd[3]': s[3], 'd[4]': s[4], 'd[5]': s[5], answer: yesno(ok) })],
    q('All four checks hold?', ['Yes: it is a square', 'No: it is not'], ok ? 0 : 1, 'A square needs four equal non-zero sides, equal diagonals, and diagonal² = 2 × side².'));
  return r.frames;
}
