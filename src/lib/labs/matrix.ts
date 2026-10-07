// Matrix & Geometry playground: walk a spiral by shrinking four boundaries; rotate a square grid by
// transposing above the diagonal and reversing each row; zero rows and columns with notes on the
// grid's own edges, in the only safe order; and raise x to the n by squaring the base and halving n.
import { makeLab, type LabBase, type LabRow } from '../lab.ts';

type Dir = 'right' | 'down' | 'left' | 'up';
type Phase = 'flags' | 'mark' | 'inner' | 'edges';
const DIRS: Dir[] = ['right', 'down', 'left', 'up'];
const PHASES: Phase[] = ['flags', 'mark', 'inner', 'edges'];

export interface MatrixState extends LabBase {
  grid: number[][];
  start: number[][];                 // the grid as the case began (for messages and oracles)
  // spiral
  top: number; bottom: number; left: number; right: number;
  dir: number;                       // index into DIRS
  out: number[];
  seen: number[][];                  // 1 = already read
  // rotate
  pr: number; pc: number;            // next pair above the diagonal to swap: (pr, pc) <-> (pc, pr)
  rowsReversed: number;
  // markers
  phase: number;                     // index into PHASES; 4 = every phase done
  firstRow: boolean | null;          // does row 0 hold an original zero? null = not read yet
  firstCol: boolean | null;
  // power
  x: number; n: number; base: number; e: number; result: number;
}

export type Input =
  | { mode: 'spiral' | 'rotate' | 'markers'; grid: number[][] }
  | { mode: 'power'; x: number; n: number };

const copy = (m: number[][]) => m.map(r => [...r]);
const blank = () => ({
  grid: [] as number[][], start: [] as number[][],
  top: 0, bottom: -1, left: 0, right: -1, dir: 0, out: [] as number[], seen: [] as number[][],
  pr: 0, pc: 1, rowsReversed: 0,
  phase: 0, firstRow: null as boolean | null, firstCol: null as boolean | null,
  x: 0, n: 0, base: 0, e: 0, result: 1,
});

const spiralCases = [
  [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]],
  [[5, 6, 7, 8]],
  [[2], [2], [5], [2]],
  [[1, 2, 3], [4, 5, 6], [7, 8, 9]],
];
const rotateCases = [
  [[1, 2, 3], [4, 5, 6], [7, 8, 9]],
  [[5, 1, 9, 11], [2, 4, 8, 10], [13, 3, 6, 7], [15, 14, 12, 16]],
  [[4, 4], [4, 9]],
  [[7]],
];
const markerCases = [
  [[1, 2, 3], [4, 0, 6], [7, 8, 9]],
  [[0, 1, 2, 0], [3, 4, 5, 2], [1, 3, 1, 5]],
  [[1, 0, 3], [4, 5, 6], [7, 8, 9]],
  [[1, 2], [3, 4]],
];
const powerCases: [number, number][] = [[3, 13], [2, -3], [-2, 7], [5, 0]];

export function fromInput(input: Input) {
  const base = blank();
  if (input.mode === 'power') return { ...base, x: input.x, n: input.n, base: input.x, e: input.n, result: 1 };
  const grid = copy(input.grid), rows = grid.length, cols = rows ? grid[0].length : 0;
  return {
    ...base, grid, start: copy(grid),
    top: 0, bottom: rows - 1, left: 0, right: cols - 1,
    seen: grid.map(r => r.map(() => 0)),
  };
}

const fmt = (x: number) => (x < 0 ? `−${-x}` : String(x));
const list = (a: number[]) => a.map(fmt).join(', ');
const show = (m: number[][]) => `[${m.map(r => `[${list(r)}]`).join(', ')}]`;
const same = (a: number[][], b: number[][]) => JSON.stringify(a) === JSON.stringify(b);

// ---------- spiral ----------
const crossed = (s: MatrixState) => s.top > s.bottom || s.left > s.right;
const unread = (s: MatrixState) => s.seen.reduce((t, r) => t + r.filter(v => !v).length, 0);
function walkCells(s: MatrixState, d: Dir): [number, number][] {
  const cells: [number, number][] = [];
  const ok = (r: number, c: number) => r >= 0 && r < s.grid.length && c >= 0 && c < (s.grid[0]?.length ?? 0);
  if (d === 'right') for (let c = s.left; c <= s.right; c++) cells.push([s.top, c]);
  if (d === 'down') for (let r = s.top; r <= s.bottom; r++) cells.push([r, s.right]);
  if (d === 'left') for (let c = s.right; c >= s.left; c--) cells.push([s.bottom, c]);
  if (d === 'up') for (let r = s.bottom; r >= s.top; r--) cells.push([r, s.left]);
  return cells.filter(([r, c]) => ok(r, c));
}
const bounds = (s: MatrixState) => `top ${s.top}, bottom ${s.bottom}, left ${s.left}, right ${s.right}`;
function spiralExpected(s: MatrixState) { return crossed(s) ? 'finish' : DIRS[s.dir]; }
function spiralReject(s: MatrixState, action: string) {
  if (action === 'finish') return `${unread(s)} cell(s) are still unread: rows ${s.top}..${s.bottom} × columns ${s.left}..${s.right}. Neither pair of boundaries has crossed (${bounds(s)}).`;
  const d = action as Dir;
  if (crossed(s)) {
    const why = s.top > s.bottom ? `top (${s.top}) has passed bottom (${s.bottom})` : `left (${s.left}) has passed right (${s.right})`;
    const again = walkCells(s, d).map(([r, c]) => s.grid[r][c]);
    return `The boundaries have crossed: ${why}, so every cell is read. ` + (again.length
      ? `Walking ${d} now would re-read ${list(again)}: the output would hold ${s.out.length + again.length} values from ${s.out.length} cells. That is the missing guard.`
      : `This walk would read nothing, but only because of luck in the indexes. Stop the moment the boundaries cross.`);
  }
  const edge = { right: 'top row', down: 'right column', left: 'bottom row', up: 'left column' }[DIRS[s.dir]];
  return `The binders keep a fixed order: right, down, left, up. The ${edge} is next (${list(walkCells(s, DIRS[s.dir]).map(([r, c]) => s.grid[r][c]))}); walking ${d} first would skip it and break clockwise order.`;
}
function spiralApply(s: MatrixState, action: string) {
  if (action === 'finish') {
    s.done = true;
    s.message = s.out.length ? `Spiral order: ${list(s.out)}. ${s.out.length} values, each cell exactly once. Loop exit: ${bounds(s)}.` : 'An empty grid: the boundaries start crossed, and nothing is read.';
    return;
  }
  const d = action as Dir, cells = walkCells(s, d);
  for (const [r, c] of cells) { s.out.push(s.grid[r][c]); s.seen[r][c] = 1; }
  if (d === 'right') s.top++;
  if (d === 'down') s.right--;
  if (d === 'left') s.bottom--;
  if (d === 'up') s.left++;
  s.dir = (s.dir + 1) % 4;
  const moved = { right: 'top moves down', down: 'right moves in', left: 'bottom moves up', up: 'left moves in' }[d];
  s.message = `Walked ${d}: ${cells.length ? list(cells.map(([r, c]) => s.grid[r][c])) : 'nothing'}. Then ${moved}: ${bounds(s)}.` + (crossed(s) ? ' The boundaries have crossed.' : '');
}
function spiralView(s: MatrixState): LabRow[] {
  const live = !crossed(s);
  const rows: LabRow[] = s.grid.map((row, r) => ({
    name: `row ${r}${live && r === s.top ? ' · top' : ''}${live && r === s.bottom ? ' · bottom' : ''}`,
    cells: row.map((v, c) => {
      const label = live && r === s.top ? [c === s.left ? 'left' : '', c === s.right ? 'right' : ''].filter(Boolean).join(' · ') : '';
      const inside = live && r >= s.top && r <= s.bottom && c >= s.left && c <= s.right;
      return { value: String(v), label: label || undefined, tone: s.seen[r][c] ? 'done' : inside ? undefined : 'ghost' };
    }),
  }));
  if (!rows.length) rows.push({ name: 'grid', empty: 'Empty grid', cells: [] });
  return [...rows, { name: 'Read so far', empty: 'Nothing yet', cells: s.out.map(v => ({ value: String(v), tone: 'done' })) }];
}
function spiralDescribe(s: MatrixState) {
  if (s.done) return `Done: [${list(s.out)}].`;
  if (crossed(s)) return `Boundaries: ${bounds(s)}. Have they crossed?`;
  return `Boundaries: ${bounds(s)}. ${unread(s)} unread cell(s). Next edge in the cycle: ${DIRS[s.dir]}.`;
}

// ---------- rotate ----------
const transposed = (s: MatrixState) => s.pr >= s.grid.length - 1;   // no pair above the diagonal left
function nextPair(s: MatrixState) { s.pc++; if (s.pc >= s.grid.length) { s.pr++; s.pc = s.pr + 1; } }
function rotateExpected(s: MatrixState) {
  if (!transposed(s)) return 'swap';
  return s.rowsReversed < s.grid.length ? 'reverse' : 'finish';
}
function rotateReject(s: MatrixState, action: string) {
  const n = s.grid.length, corner = s.start[0][0];
  if (n === 1) return action === 'finish' ? 'Reverse the single row first (it is one knot, so nothing moves) to complete the recipe.' : `A 1 × 1 grid has no pairs above the diagonal and only one row: the recipe is just “reverse row 0”, which moves nothing.`;
  if (action === 'swap') {
    return `Every pair above the diagonal is already swapped. Swapping (0, 1) with (1, 0) again would undo it: a transpose done twice is no transpose at all.`;
  }
  if (action === 'flip') {
    return transposed(s) && s.rowsReversed === 0
      ? `Reversing the ORDER of the rows after a transpose is the counter-clockwise turn: (c, r) → (n − 1 − c, r). The corner ${fmt(corner)} would end at bottom-left (${n - 1}, 0) instead of top-right (0, ${n - 1}).`
      : `A clockwise turn is transpose, then reverse each row. Flipping the row order belongs to the counter-clockwise turn, and here it would carry the corner ${fmt(corner)} to the wrong side.`;
  }
  if (action === 'reverse' && transposed(s)) {
    return `All ${n} rows are already reversed. Reversing row 0 again would undo the second half of the turn.`;
  }
  if (action === 'reverse') {
    return `The transpose isn’t finished: (${s.pr}, ${s.pc}) = ${fmt(s.grid[s.pr][s.pc])} and (${s.pc}, ${s.pr}) = ${fmt(s.grid[s.pc][s.pr])} are still unswapped. Reversing rows first gives the counter-clockwise turn (reverse, then transpose), not the clockwise one.`;
  }
  // finish
  if (!transposed(s)) return `Pairs above the diagonal are still unswapped, starting with (${s.pr}, ${s.pc}). The grid is not yet a transpose, let alone a rotation.`;
  return `${n - s.rowsReversed} row(s) are not reversed yet. Right now the grid is only transposed (a flip across the diagonal); ${fmt(corner)} must still travel from (0, 0) to (0, ${n - 1}).`;
}
function rotateApply(s: MatrixState, action: string) {
  const n = s.grid.length;
  if (action === 'swap') {
    const r = s.pr, c = s.pc, a = s.grid[r][c], b = s.grid[c][r];
    s.grid[r][c] = b; s.grid[c][r] = a;
    nextPair(s);
    s.message = `Swapped (${r}, ${c}) and (${c}, ${r}): ${fmt(a)} ↔ ${fmt(b)}.` + (transposed(s) ? ' Every pair above the diagonal is done: the grid is transposed.' : '');
  } else if (action === 'reverse') {
    const r = s.rowsReversed;
    s.grid[r].reverse();
    s.rowsReversed++;
    s.message = `Row ${r} reversed: [${list(s.grid[r])}]. Column ${r} of the original is now row ${r}, read bottom to top.`;
  } else {
    s.done = true;
    s.message = `Rotated clockwise: ${show(s.grid)}. Every knot (r, c) landed at (c, ${n} − 1 − r), using only swaps.`;
  }
}
function rotateView(s: MatrixState): LabRow[] {
  const n = s.grid.length;
  return s.grid.map((row, r) => ({
    name: `row ${r}`,
    cells: row.map((v, c) => {
      const pair = !transposed(s) && ((r === s.pr && c === s.pc) || (r === s.pc && c === s.pr));
      const label = pair ? 'SWAP' : !transposed(s) && r === c ? '╲' : transposed(s) && r === s.rowsReversed && !s.done && c === 0 ? 'NEXT' : undefined;
      const a = Math.min(r, c), b = Math.max(r, c);
      const swapped = !transposed(s) && r !== c && (a < s.pr || (a === s.pr && b < s.pc));
      const tone = pair ? 'hot' : r < s.rowsReversed || s.done || swapped ? 'done' : undefined;
      return { value: String(v), label: n > 1 ? label : undefined, tone };
    }),
  }));
}
function rotateDescribe(s: MatrixState) {
  const n = s.grid.length;
  if (s.done) return `Done: ${show(s.grid)}.`;
  if (!transposed(s)) return `${n} × ${n}. Step 1, transpose: next pair (${s.pr}, ${s.pc}) ↔ (${s.pc}, ${s.pr}). Only pairs above the diagonal are swapped.`;
  if (s.rowsReversed < n) return `Transposed. Step 2: reverse each row. ${s.rowsReversed} of ${n} done.`;
  return 'Transposed and every row reversed.';
}

// ---------- markers (Set Matrix Zeroes) ----------
function truth(m: number[][]) {
  const zr = new Set<number>(), zc = new Set<number>();
  m.forEach((row, r) => row.forEach((v, c) => { if (v === 0) { zr.add(r); zc.add(c); } }));
  return m.map((row, r) => row.map((v, c) => (zr.has(r) || zc.has(c) ? 0 : v)));
}
interface Sim { m: number[][]; fr: boolean | null; fc: boolean | null }
function run(sim: Sim, p: Phase) {
  const m = sim.m, rows = m.length, cols = m[0].length;
  if (p === 'flags') { sim.fr = m[0].some(v => v === 0); sim.fc = m.some(row => row[0] === 0); }
  if (p === 'mark') for (let r = 1; r < rows; r++) for (let c = 1; c < cols; c++) if (m[r][c] === 0) { m[r][0] = 0; m[0][c] = 0; }
  if (p === 'inner') for (let r = 1; r < rows; r++) for (let c = 1; c < cols; c++) if (m[r][0] === 0 || m[0][c] === 0) m[r][c] = 0;
  if (p === 'edges') {
    if (sim.fr === null) run(sim, 'flags');            // checked late: whatever the edges hold now
    if (sim.fr) for (let c = 0; c < cols; c++) m[0][c] = 0;
    if (sim.fc) for (let r = 0; r < rows; r++) m[r][0] = 0;
  }
}
function markersExpected(s: MatrixState) { return s.phase < PHASES.length ? PHASES[s.phase] : 'finish'; }
function markersReject(s: MatrixState, action: string) {
  const done = PHASES.slice(0, s.phase);
  if (action === 'finish') return `Still to do: ${PHASES.slice(s.phase).join(', ')}. The grid is not finished: it should end as ${show(truth(s.start))}.`;
  const a = action as Phase;
  if (done.includes(a)) return a === 'flags'
    ? `The flags are already read: row 0 ${s.firstRow ? 'holds' : 'has no'} original zero, column 0 ${s.firstCol ? 'holds' : 'has no'} original zero. Reading them again now could see your own notes.`
    : `That phase is done. Running it again won’t change the order problem; the next move is ${s.phase < PHASES.length ? PHASES[s.phase] : 'finish'}.`;
  const sim: Sim = { m: copy(s.grid), fr: s.firstRow, fc: s.firstCol };
  for (const p of [a, ...PHASES.filter(p => !done.includes(p) && p !== a)]) run(sim, p);
  const good = truth(s.start);
  const why = {
    mark: 'Notes would land on row 0 and column 0 before you know whether they held zeros of their own, and the flags would then mistake your notes for original zeros.',
    inner: 'No notes are written yet, so the inside pass would read only the edges’ raw values and miss the zeros hiding inside.',
    edges: s.phase < 1 ? 'You don’t know yet whether row 0 and column 0 held zeros, and they are about to carry the notes.' : 'Row 0 and column 0 ARE the notes. Zeroing them now turns notes into fake zeros for every row or column they cross.',
    flags: 'The flags must be read first.',
  }[a];
  return `${why} ` + (same(sim.m, good)
    ? `On this grid you would get lucky and still end at ${show(good)}, but the order is wrong in general.`
    : `Finishing in that order leaves ${show(sim.m)} instead of ${show(good)}.`);
}
function markersApply(s: MatrixState, action: string) {
  if (action === 'finish') { s.done = true; s.message = `Done: ${show(s.grid)}. Extra space: two booleans.`; return; }
  const sim: Sim = { m: s.grid, fr: s.firstRow, fc: s.firstCol };
  const before = copy(s.grid);
  run(sim, action as Phase);
  s.firstRow = sim.fr; s.firstCol = sim.fc;
  s.phase++;
  const changed = s.grid.flatMap((row, r) => row.map((v, c) => (v !== before[r][c] ? `(${r}, ${c})` : ''))).filter(Boolean);
  s.message = {
    flags: `Flags read before any note is written: row 0 ${s.firstRow ? 'has' : 'has no'} zero, column 0 ${s.firstCol ? 'has' : 'has no'} zero.`,
    mark: changed.length ? `Notes chalked on the edges at ${changed.join(', ')}.` : 'No inner zeros, so no notes. The edges keep their own values.',
    inner: changed.length ? `Inner cells zeroed from the notes: ${changed.join(', ')}.` : 'No inner cell sits under a note.',
    edges: changed.length ? `Edges settled last, from the flags: ${changed.join(', ')}.` : 'Neither flag is set, so the edges stay.',
  }[action as Phase];
}
function markersView(s: MatrixState): LabRow[] {
  return [
    ...s.grid.map((row, r) => ({
      name: r === 0 ? 'row 0 (column notes)' : `row ${r}`,
      cells: row.map((v, c) => ({
        value: String(v),
        label: r === 0 && c === 0 ? 'both' : undefined,
        tone: (v === 0 ? (s.start[r][c] === 0 ? 'hot' : 'done') : r === 0 || c === 0 ? 'ghost' : undefined) as 'hot' | 'done' | 'ghost' | undefined,
      })),
    })),
    { name: 'Flags', cells: [
      { value: s.firstRow === null ? '?' : String(s.firstRow), label: 'row 0 had a 0' },
      { value: s.firstCol === null ? '?' : String(s.firstCol), label: 'col 0 had a 0' },
    ] },
  ];
}
function markersDescribe(s: MatrixState) {
  if (s.done) return `Done: ${show(s.grid)}.`;
  return `Phase ${s.phase + 1} of 4. Gold zeros are original; green zeros were written by you. Dashed cells are the edges that double as notes.`;
}

// ---------- power ----------
const pw = (x: number) => (x < 0 ? `(${fmt(x)})` : fmt(x));
const bits = (e: number) => (e > 0 ? e.toString(2) : '0');
function powerExpected(s: MatrixState) {
  if (s.e < 0) return 'invert';
  if (s.e === 0) return 'finish';
  return s.e % 2 === 1 ? 'take' : 'square';
}
function powerReject(s: MatrixState, action: string) {
  if (s.e < 0 && action !== 'invert') return `e = ${fmt(s.e)} is negative. x^${fmt(s.n)} = (1 / x)^${-s.n}: invert the base and negate the exponent first (in a long, so −2147483648 can be negated).`;
  if (action === 'invert') return `e = ${s.e} is not negative; there is nothing to invert.`;
  if (s.e === 0) return action === 'take'
    ? `e = 0: nothing is owed. Taking another base would make result = ${fmt(s.result * s.base)}, one factor too many, and e would go negative.`
    : `e = 0: there are no bits left to halve. result = ${fmt(s.result)} is already ${pw(s.x)}^${fmt(s.n)}; stop.`;
  if (action === 'finish') return `e = ${s.e}: the promise result × base^e = ${pw(s.x)}^${fmt(s.n)} still owes base^${s.e}. Stop only when e = 0.`;
  if (action === 'square') {
    const half = Math.floor(s.e / 2), wrong = s.result * (s.base * s.base) ** half, right = s.result * s.base ** s.e;
    return `e = ${s.e} is odd. Halving drops a factor: ${s.e} / 2 = ${half} in integer division, so you would compute ${fmt(s.result)} × (${pw(s.base)}²)^${half} = ${fmt(wrong)} instead of ${fmt(right)}. Take one base first.`;
  }
  return `e = ${s.e} is even. Taking one base keeps the promise, but done every time it is ${s.e} more multiplications instead of about ${Math.ceil(Math.log2(s.e + 1))} halvings. Square the base and halve e while you can.`;
}
function powerApply(s: MatrixState, action: string) {
  if (action === 'invert') {
    s.base = 1 / s.base; s.e = -s.e;
    s.message = `Inverted: base = 1 / ${fmt(s.x)} = ${fmt(s.base)}, e = ${s.e}. x^${fmt(s.n)} = (1 / x)^${s.e}.`;
  } else if (action === 'take') {
    s.result *= s.base; s.e -= 1;
    s.message = `e was odd: result ×= ${fmt(s.base)} → ${fmt(s.result)}, e = ${s.e}. Still result × base^e = ${pw(s.x)}^${fmt(s.n)}.`;
  } else if (action === 'square') {
    const old = s.base;
    s.base = s.base * s.base; s.e /= 2;
    s.message = `e was even: base = ${pw(old)}² = ${fmt(s.base)}, e = ${s.e}. One bit of e gone.`;
  } else {
    s.done = true;
    s.message = `e = 0, so result = ${pw(s.x)}^${fmt(s.n)} = ${fmt(s.result)}.`;
  }
}
function powerView(s: MatrixState): LabRow[] {
  return [
    { name: 'The promise: result × base^e = x^n', cells: [
      { value: fmt(s.result), label: 'result', tone: 'done' },
      { value: fmt(s.base), label: 'base' },
      { value: fmt(s.e), label: 'e', tone: s.done ? undefined : 'hot' },
    ] },
    { name: 'e in binary (the low bit decides)', cells: (s.e < 0 ? '−' + bits(-s.e) : bits(s.e)).split('').map((b, i, all) => ({ value: b, label: i === all.length - 1 && s.e > 0 ? 'low' : undefined, tone: i === all.length - 1 && s.e > 0 ? 'hot' : undefined })) },
  ];
}
function powerDescribe(s: MatrixState) {
  if (s.done) return `${pw(s.x)}^${fmt(s.n)} = ${fmt(s.result)}.`;
  return `x = ${fmt(s.x)}, n = ${fmt(s.n)}. Now result = ${fmt(s.result)}, base = ${fmt(s.base)}, e = ${fmt(s.e)}.`;
}

export const lab = makeLab<MatrixState>({
  spiral: {
    name: 'Spiral walk: four boundaries',
    cases: spiralCases.length,
    actions: [
      { action: 'right', label: 'Walk right along the top row, then top++' },
      { action: 'down', label: 'Walk down the right column, then right--' },
      { action: 'left', label: 'Walk left along the bottom row, then bottom--' },
      { action: 'up', label: 'Walk up the left column, then left++' },
      { action: 'finish', label: 'Stop: the boundaries have crossed' },
    ],
    create: v => fromInput({ mode: 'spiral', grid: spiralCases[v] }),
    expected: spiralExpected,
    apply: spiralApply,
    reject: spiralReject,
    view: spiralView,
    describe: spiralDescribe,
  },
  rotate: {
    name: 'Rotate clockwise: transpose, then reverse rows',
    cases: rotateCases.length,
    actions: [
      { action: 'swap', label: 'Swap the next pair (r, c) ↔ (c, r) above the diagonal' },
      { action: 'reverse', label: 'Reverse the next row' },
      { action: 'flip', label: 'Reverse the order of the rows' },
      { action: 'finish', label: 'The turn is complete' },
    ],
    create: v => fromInput({ mode: 'rotate', grid: rotateCases[v] }),
    expected: rotateExpected,
    apply: rotateApply,
    reject: rotateReject,
    view: rotateView,
    describe: rotateDescribe,
  },
  markers: {
    name: 'Zero rows and columns with notes on the edges',
    cases: markerCases.length,
    actions: [
      { action: 'flags', label: 'Read the flags: does row 0 / column 0 hold a zero?' },
      { action: 'mark', label: 'Chalk notes: each inner zero marks matrix[r][0] and matrix[0][c]' },
      { action: 'inner', label: 'Zero inner cells whose row note or column note is 0' },
      { action: 'edges', label: 'Zero row 0 and column 0 as the flags say' },
      { action: 'finish', label: 'Done' },
    ],
    create: v => fromInput({ mode: 'markers', grid: markerCases[v] }),
    expected: markersExpected,
    apply: markersApply,
    reject: markersReject,
    view: markersView,
    describe: markersDescribe,
  },
  power: {
    name: 'Fast power: square and halve',
    cases: powerCases.length,
    actions: [
      { action: 'invert', label: 'n < 0: base = 1 / base, e = −e' },
      { action: 'take', label: 'Low bit is 1: result ×= base, e −= 1' },
      { action: 'square', label: 'Low bit is 0: base = base², e = e / 2' },
      { action: 'finish', label: 'e = 0: return result' },
    ],
    create: v => fromInput({ mode: 'power', x: powerCases[v][0], n: powerCases[v][1] }),
    expected: powerExpected,
    apply: powerApply,
    reject: powerReject,
    view: powerView,
    describe: powerDescribe,
  },
}, 'Gold = active · green = settled or read · dashed = outside the live region (or an edge doubling as notes)');
