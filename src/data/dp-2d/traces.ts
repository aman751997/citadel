// Decision puzzles and table figures for the 2-D Dynamic Programming lesson.
// Every number here is re-derived by brute force in tests/dp-2d.test.ts.
import { row, step } from '../../lib/trace.ts';

// ---------- table figures (drawn by the <DpGrid> helper inside dp-2d.mdx) ----------
export type GridTone = 'gold' | 'blue' | 'green' | 'purple' | 'red' | 'dim' | 'ghost';
export interface GridArrow { from: [number, number]; to: [number, number]; tone?: GridTone }
export interface GridFigure {
  rowHead?: string;
  colHead?: string;
  rows: string[];
  cols: string[];
  cells: (string | number | null)[][];        // null = no square here (outside the table's meaning)
  tones?: Record<string, GridTone>;            // "r,c" -> tone
  arrows?: GridArrow[];
}

const Y = '✓', N = '·';
export const NEG = '−∞';

export const figures: Record<string, GridFigure> = {
  // Prologue: a generic map. Settled squares, the square being inked, the squares it reads, the future.
  map: {
    rowHead: 'i', colHead: 'j',
    rows: ['0', '1', '2', '3'], cols: ['0', '1', '2', '3', '4'],
    cells: [
      [Y, Y, Y, Y, Y],
      [Y, Y, Y, Y, Y],
      [Y, Y, '↖', '↑', N],
      [Y, '←', '?', N, N],
    ],
    tones: { '2,1': 'blue', '2,2': 'blue', '3,1': 'blue', '3,2': 'gold', '2,4': 'ghost', '3,3': 'ghost', '3,4': 'ghost' },
    arrows: [{ from: [2, 1], to: [3, 2], tone: 'purple' }, { from: [2, 2], to: [3, 2], tone: 'blue' }, { from: [3, 1], to: [3, 2], tone: 'green' }],
  },
  // Chapter 1: Unique Paths, 3 x 4.
  paths: {
    rowHead: 'row', colHead: 'column',
    rows: ['0', '1', '2'], cols: ['0', '1', '2', '3'],
    cells: [[1, 1, 1, 1], [1, 2, 3, 4], [1, 3, 6, 10]],
    tones: { '0,0': 'green', '2,3': 'gold', '1,3': 'blue', '2,2': 'blue' },
    arrows: [{ from: [1, 3], to: [2, 3], tone: 'blue' }, { from: [2, 2], to: [2, 3], tone: 'blue' }],
  },
  // Chapter 2: LCS of LBRCT (map A, rows) and BLCRT (map B, columns).
  lcs: {
    rowHead: 'map A', colHead: 'map B',
    rows: ['∅', 'L', 'B', 'R', 'C', 'T'], cols: ['∅', 'B', 'L', 'C', 'R', 'T'],
    cells: [
      [0, 0, 0, 0, 0, 0],
      [0, 0, 1, 1, 1, 1],
      [0, 1, 1, 1, 1, 1],
      [0, 1, 1, 1, 2, 2],
      [0, 1, 1, 2, 2, 2],
      [0, 1, 1, 2, 2, 3],
    ],
    tones: { '0,0': 'ghost', '0,1': 'ghost', '0,2': 'ghost', '0,3': 'ghost', '0,4': 'ghost', '0,5': 'ghost', '1,0': 'ghost', '2,0': 'ghost', '3,0': 'ghost', '4,0': 'ghost', '5,0': 'ghost', '3,4': 'gold', '4,4': 'blue' },
    arrows: [{ from: [2, 3], to: [3, 4], tone: 'gold' }, { from: [3, 4], to: [4, 4], tone: 'blue' }, { from: [4, 3], to: [4, 4], tone: 'blue' }],
  },
  // Chapter 2: walking back from the answer square (ties go up) spells L, R, T.
  lcsRoute: {
    rowHead: 'map A', colHead: 'map B',
    rows: ['∅', 'L', 'B', 'R', 'C', 'T'], cols: ['∅', 'B', 'L', 'C', 'R', 'T'],
    cells: [
      [0, 0, 0, 0, 0, 0],
      [0, 0, 1, 1, 1, 1],
      [0, 1, 1, 1, 1, 1],
      [0, 1, 1, 1, 2, 2],
      [0, 1, 1, 2, 2, 2],
      [0, 1, 1, 2, 2, 3],
    ],
    tones: { '5,5': 'gold', '3,4': 'gold', '1,2': 'gold', '4,4': 'blue', '2,3': 'blue', '1,3': 'blue', '0,1': 'green' },
    arrows: [
      { from: [5, 5], to: [4, 4], tone: 'gold' }, { from: [4, 4], to: [3, 4], tone: 'blue' }, { from: [3, 4], to: [2, 3], tone: 'gold' },
      { from: [2, 3], to: [1, 3], tone: 'blue' }, { from: [1, 3], to: [1, 2], tone: 'blue' }, { from: [1, 2], to: [0, 1], tone: 'gold' },
    ],
  },
  // Chapter 3: Edit Distance, horse -> ros.
  edit: {
    rowHead: 'horse', colHead: 'ros',
    rows: ['∅', 'h', 'o', 'r', 's', 'e'], cols: ['∅', 'r', 'o', 's'],
    cells: [[0, 1, 2, 3], [1, 1, 2, 3], [2, 2, 1, 2], [3, 2, 2, 2], [4, 3, 3, 2], [5, 4, 4, 3]],
    tones: { '5,3': 'gold', '4,3': 'gold', '3,2': 'gold', '2,2': 'gold', '1,1': 'gold', '0,0': 'gold', '4,2': 'purple', '5,2': 'green' },
    arrows: [{ from: [4, 2], to: [5, 3], tone: 'purple' }, { from: [4, 3], to: [5, 3], tone: 'red' }, { from: [5, 2], to: [5, 3], tone: 'green' }],
  },
  // Chapter 4: subset sums of [2, 3, 5] up to 5.
  partition: {
    rowHead: 'items', colHead: 'total s',
    rows: ['none', '+2', '+3', '+5'], cols: ['0', '1', '2', '3', '4', '5'],
    cells: [[Y, N, N, N, N, N], [Y, N, Y, N, N, N], [Y, N, Y, Y, N, Y], [Y, N, Y, Y, N, Y]],
    tones: { '2,5': 'gold', '1,5': 'blue', '1,2': 'green' },
    arrows: [{ from: [1, 5], to: [2, 5], tone: 'blue' }, { from: [1, 2], to: [2, 5], tone: 'green' }],
  },
  // Chapter 5: combinations of [1, 2, 5] up to 5.
  coins: {
    rowHead: 'coins', colHead: 'amount a',
    rows: ['none', '{1}', '{1,2}', '{1,2,5}'], cols: ['0', '1', '2', '3', '4', '5'],
    cells: [[1, 0, 0, 0, 0, 0], [1, 1, 1, 1, 1, 1], [1, 1, 2, 2, 3, 3], [1, 1, 2, 2, 3, 4]],
    tones: { '2,4': 'gold', '1,4': 'blue', '2,2': 'green' },
    arrows: [{ from: [1, 4], to: [2, 4], tone: 'blue' }, { from: [2, 2], to: [2, 4], tone: 'green' }],
  },
  // Chapter 6: hold / sold / rest for prices [1, 2, 3, 0, 2].
  cooldown: {
    rowHead: 'lantern', colHead: 'day · price',
    rows: ['hold', 'sold', 'rest'], cols: ['0 · 1', '1 · 2', '2 · 3', '3 · 0', '4 · 2'],
    cells: [[-1, -1, -1, 1, 1], [NEG, 1, 2, -1, 3], [0, 0, 1, 2, 2]],
    tones: { '0,3': 'gold', '2,2': 'blue', '1,4': 'green', '2,4': 'dim' },
    arrows: [{ from: [2, 2], to: [0, 3], tone: 'blue' }, { from: [0, 3], to: [1, 4], tone: 'green' }],
  },
  // Chapter 7: heights, and the climb 1 -> 2 -> 6 -> 9.
  heights: {
    rowHead: 'row', colHead: 'column',
    rows: ['0', '1', '2'], cols: ['0', '1', '2'],
    cells: [[9, 9, 4], [6, 6, 8], [2, 1, 1]],
    tones: { '2,1': 'gold', '2,0': 'gold', '1,0': 'gold', '0,0': 'gold' },
    arrows: [{ from: [2, 1], to: [2, 0], tone: 'gold' }, { from: [2, 0], to: [1, 0], tone: 'gold' }, { from: [1, 0], to: [0, 0], tone: 'gold' }],
  },
  // Chapter 7: what the archivist writes, the longest climb starting at each square.
  climbs: {
    rowHead: 'row', colHead: 'column',
    rows: ['0', '1', '2'], cols: ['0', '1', '2'],
    cells: [[1, 1, 2], [2, 2, 1], [3, 4, 2]],
    tones: { '2,1': 'gold', '0,0': 'green', '0,1': 'green' },
  },
  // Chapter 8: dp[i][j] for the padded row [1, 3, 1, 5, 8, 1]; only j > i means anything.
  burst: {
    rowHead: 'wall i', colHead: 'wall j',
    rows: ['0 · 1', '1 · 3', '2 · 1', '3 · 5', '4 · 8', '5 · 1'], cols: ['0 · 1', '1 · 3', '2 · 1', '3 · 5', '4 · 8', '5 · 1'],
    cells: [
      [null, 0, 3, 30, 159, 167],
      [null, null, 0, 15, 135, 159],
      [null, null, null, 0, 40, 48],
      [null, null, null, null, 0, 40],
      [null, null, null, null, null, 0],
      [null, null, null, null, null, null],
    ],
    tones: { '0,5': 'gold', '0,4': 'blue', '4,5': 'blue', '0,1': 'ghost', '1,2': 'ghost', '2,3': 'ghost', '3,4': 'ghost' },
    arrows: [{ from: [0, 4], to: [0, 5], tone: 'blue' }, { from: [4, 5], to: [0, 5], tone: 'blue' }],
  },
  // Side quest 1: a rock in the middle.
  rocks: {
    rowHead: 'row', colHead: 'column',
    rows: ['0', '1', '2'], cols: ['0', '1', '2'],
    cells: [[1, 1, 1], [1, '0 ▲', 1], [1, 1, 2]],
    tones: { '1,1': 'red', '2,2': 'gold', '1,2': 'blue', '2,1': 'blue' },
    arrows: [{ from: [1, 2], to: [2, 2], tone: 'blue' }, { from: [2, 1], to: [2, 2], tone: 'blue' }],
  },
  // Side quest 2: cheapest tolls for [[1,3,1],[1,5,1],[4,2,1]].
  tolls: {
    rowHead: 'row', colHead: 'column',
    rows: ['0', '1', '2'], cols: ['0', '1', '2'],
    cells: [[1, 4, 5], [2, 7, 6], [6, 8, 7]],
    tones: { '0,0': 'gold', '0,1': 'gold', '0,2': 'gold', '1,2': 'gold', '2,2': 'gold', '2,1': 'blue' },
    arrows: [{ from: [1, 2], to: [2, 2], tone: 'gold' }, { from: [2, 1], to: [2, 2], tone: 'blue' }],
  },
  // Side quest 3: longest palindrome kept from s[i..j] for "bbbab".
  palindrome: {
    rowHead: 'from i', colHead: 'to j',
    rows: ['0 · b', '1 · b', '2 · b', '3 · a', '4 · b'], cols: ['0 · b', '1 · b', '2 · b', '3 · a', '4 · b'],
    cells: [
      [1, 2, 3, 3, 4],
      [null, 1, 2, 2, 3],
      [null, null, 1, 1, 3],
      [null, null, null, 1, 1],
      [null, null, null, null, 1],
    ],
    tones: { '0,4': 'gold', '1,3': 'blue', '0,0': 'green', '1,1': 'green', '2,2': 'green', '3,3': 'green', '4,4': 'green' },
    arrows: [{ from: [1, 3], to: [0, 4], tone: 'blue' }],
  },
};

// ---------- Chapter 1 ----------
export const paths = [
  step('A 3 × 4 street grid. Row 0 is all 1s. Row 1 so far reads 1, 2, 3. What goes in square (1, 3)?',
    [row('row 0', [1, 1, 1, 1]), row('row 1', [1, 2, 3, '?'], { 3: 'HERE' }, { tones: { 2: 'hot' } })], 1, [
      ['3: copy the square to the left', 'That counts only routes whose last step came from the left. Routes that arrived from above, through (0, 3), are lost.'],
      ['4: up (1) + left (3)', 'Yes. Every route into (1, 3) took its last step from (0, 3) or from (1, 2), never both, so the two counts add without overlap.'],
      ['6: everything in the row so far, 1 + 2 + 3', 'The courier can only step right or down. Square (1, 1) is not a neighbour of (1, 3); its routes are already inside the 3 at (1, 2).'],
    ]),
  step('You keep only one row of paper: row = [1, 2, 3, 4] (row 1). For row 2 you will do row[c] += row[c − 1]. Which way do you sweep c?',
    [row('row (holds row 1)', [1, 2, 3, 4])], 0, [
      ['Left to right, c = 1, 2, 3', 'Yes. When you reach c, row[c − 1] has already become this row’s square (the left neighbour), and row[c] still holds the row above (the up neighbour). Result: [1, 3, 6, 10].'],
      ['Right to left, c = 3, 2, 1', 'Then row[c − 1] is still last row’s value, the up-left square, which is not a neighbour at all. On a 3 × 3 grid this returns 4 instead of 6.'],
      ['It makes no difference', 'It does: the direction decides whether row[c − 1] means “left, this row” or “up-left, last row”. Sweep right to left on a 3 × 3 grid and you get 4, not 6.'],
    ]),
];

// ---------- Chapter 2 ----------
export const lcs = [
  step('Map A reads A A; map B reads A. Square (2, 1): both last letters are A. Up holds 1, left holds 0, the diagonal holds 0. What do you write?',
    [row('map A', ['A', 'A']), row('map B', ['A']), row('row 1 · A', [0, 1], { 0: 'diag', 1: 'up' }), row('row 2 · A', [0, '?'], { 0: 'left', 1: 'HERE' }, { tones: { 1: 'hot' } })], 0, [
      ['1: diagonal + 1', 'Yes. The diagonal is the best for A versus nothing, and then the two A’s pair up. Map B has only one A, so the answer cannot be 2.'],
      ['2: up + 1', 'Up already used map B’s only A (paired with map A’s first A). Adding 1 pairs that same A a second time. This is the classic LCS bug.'],
      ['0: the letters are used up', 'They match, so they can join the route. Ignoring a match can only lose length.'],
    ]),
  step('In the LBRCT / BLCRT table, square (4, 4) compares C (map A) with R (map B). Up = 2, left = 2, diagonal = 1. What goes in?',
    [row('row 3 · R', [0, 1, 1, 1, 2, 2], { 4: 'up' }), row('row 4 · C', [0, 1, 1, 2, '?', '·'], { 3: 'left', 4: 'HERE' }, { tones: { 4: 'hot' } })], 1, [
      ['diagonal + 1 = 2', 'The letters differ, so they can’t pair. A diagonal step is only for a match.'],
      ['max(up, left) = 2', 'Yes. C and R can’t both end the route, so drop one: drop C (up, 2) or drop R (left, 2). Keep the better, 2.'],
      ['up + left = 4', 'The two neighbours describe overlapping routes (both may use L and R), so adding them double-counts. LCS takes the better choice, not the total.'],
      ['max(up, left) + 1 = 3', 'The + 1 is earned only by a matching pair. C ≠ R, so nothing new joins the route.'],
    ]),
  step('Walking back from the answer square, you reach (4, 4): C ≠ R, and up and left both hold 2. Which way do you step?',
    [row('row 3 · R', [0, 1, 1, 1, 2, 2], { 4: 'up = 2' }), row('row 4 · C', [0, 1, 1, 2, 2, 2], { 3: 'left = 2', 4: 'HERE' }, { tones: { 4: 'hot' } })], 2, [
      ['Up only: left would break the route', 'Left holds 2 as well, so a route of length 2 lives there too. Going left finishes as L, C, T.'],
      ['Diagonally, keeping the C', 'C and R differ, so this square didn’t come from the diagonal. Taking a letter here would spell something one map doesn’t contain.'],
      ['Either: both hold 2, so both lead to a longest route', 'Yes. Up gives L, R, T; left gives L, C, T. Ties are why a longest common route need not be unique.'],
    ]),
];

// ---------- Chapter 3 ----------
export const edit = [
  step('horse → ros. Square (1, 1): h versus r. Diagonal = 0, up = 1, left = 1. What goes in?',
    [row('row 0 · ∅', [0, 1, 2, 3], { 0: 'diag', 1: 'up' }), row('row 1 · h', [1, '?', '·', '·'], { 0: 'left', 1: 'HERE' }, { tones: { 1: 'hot' } })], 1, [
      ['0: copy the diagonal for free', 'Free is only for matching letters. h ≠ r.'],
      ['1: replace h with r, 1 + diagonal', 'Yes. 1 + min(diagonal 0, up 1, left 1) = 1. Hammer the h into an r and “h” has become “r”.'],
      ['2: delete h, then insert r', 'That is a real script, but it costs 2. Replace does the same job in one move.'],
    ]),
  step('Square (4, 3): s versus s (horse’s 4th letter, ros’s 3rd). Diagonal = 2, up = 2, left = 3. What goes in?',
    [row('row 3 · r', [3, 2, 2, 2], { 2: 'diag', 3: 'up' }), row('row 4 · s', [4, 3, 3, '?'], { 2: 'left', 3: 'HERE' }, { tones: { 3: 'hot' } })], 0, [
      ['2: the letters agree, copy the diagonal', 'Yes. Whatever turned “hor” into “ro” (2 moves) also turns “hors” into “ros”: the matching s rides along for free.'],
      ['3: 1 + min(2, 2, 3)', 'That pays for an edit you don’t need. On a match the diagonal is free, and it is never worse than paying 1 for a neighbour.'],
      ['1: the diagonal minus the match', 'A match never makes a cost go down. It only means this pair costs nothing.'],
    ]),
  step('Square (5, 3): e versus s. Diagonal = 3, up = 2, left = 4. Which move ends the cheapest script, and what is the total?',
    [row('row 4 · s', [4, 3, 3, 2], { 2: 'diag 3', 3: 'up 2' }), row('row 5 · e', [5, 4, 4, '?'], { 2: 'left 4', 3: 'HERE' }, { tones: { 3: 'hot' } })], 1, [
      ['Replace e with s: 1 + 3 = 4', 'A real script, but not the cheapest. The square takes the minimum of all three moves.'],
      ['Delete e: 1 + up = 3', 'Yes. Turn “hors” into “ros” (2 moves), then delete the trailing e. Total 3: replace h → r, delete r, delete e.'],
      ['Insert s: 1 + 4 = 5', 'Inserting s after the e still leaves the e to get rid of. That route costs 5.'],
    ]),
];

// ---------- Chapter 4 ----------
export const partition = [
  step('Crates [1, 2, 4]. Before you rule a single square, what do you check?',
    [row('crates', [1, 2, 4])], 2, [
      ['Sort the crates', 'Sorting changes nothing about which groups exist. There is a faster way to decide this one.'],
      ['Fill the table up to total 7', 'Two equal groups each hold half the total. You never need squares past the half.'],
      ['The total is 7, odd: no even split exists, answer false', 'Yes. Two equal whole-number groups add to an even number. Odd total, done: no table at all.'],
    ]),
  step('Crates [1, 2, 5]: total 8, half 4. One row of paper, dp = [✓, ·, ·, ·, ·]. Crate 1 arrives. Which way do you sweep s?',
    [row('dp before crate 1', ['✓', '·', '·', '·', '·'])], 1, [
      ['Upwards, s = 1 to 4', 'dp[1] turns ✓, then dp[2] reads that brand-new dp[1] and turns ✓ — crate 1 used twice — and so on up to dp[4]. The final answer claims [1, 2, 5] splits evenly. It doesn’t.'],
      ['Downwards, s = 4 to 1', 'Yes. Going down, dp[s − 1] is still the value from before crate 1 arrived, so the crate is counted at most once. After crate 1: [✓, ✓, ·, ·, ·].'],
      ['Either way, it is the same crate', 'The direction decides whether dp[s − w] already includes this crate. Upwards, one crate of weight 1 fills every total.'],
    ]),
  step('Crates [2, 3, 5], target 5. Square (row +3, total 5): up is · and up-left by 3, square (row +2, total 2), is ✓. What goes in?',
    [row('row +2', ['✓', '·', '✓', '·', '·', '·'], { 2: 'take 3 from here', 5: 'up' }), row('row +3', ['✓', '·', '✓', '✓', '·', '?'], { 5: 'HERE' }, { tones: { 5: 'hot' } })], 0, [
      ['✓: take the 3 on top of the group {2}', 'Yes. Skip crate 3 and total 5 is still impossible; take it and you need 2 from the earlier crates, which {2} provides. One of the two is enough.'],
      ['·: up says total 5 is impossible', 'Up only covers groups that skip the 3. The take arrow is the other half of the choice.'],
      ['✓ because the same row already has total 2', 'Reading the same row is the unbounded rule: it would let the 3 join twice. 0/1 reads the row above.'],
    ]),
];

// ---------- Chapter 5 ----------
export const coins = [
  step('Coins [1, 2, 5]. Square (row {1,2}, amount 4): up, row {1}, holds 1; the same row two squares left (amount 2) holds 2. What goes in?',
    [row('row {1}', [1, 1, 1, 1, 1, 1], { 4: 'up' }), row('row {1,2}', [1, 1, 2, 2, '?', '·'], { 2: 'one more 2', 4: 'HERE' }, { tones: { 4: 'hot' } })], 1, [
      ['2: up + the row above at amount 2', 'Reading the row above for “take a 2” lets each coin type be used at most once. It misses 2 + 2.'],
      ['3: up + the same row at amount 2', 'Yes. Ways with no 2s: 1 + 1 + 1 + 1. Ways with at least one 2: any way to make 2 (two of them) plus one more 2. Total 3.'],
      ['1: only 1 + 1 + 1 + 1', 'The 2-coin is allowed, and it can be used twice: 2 + 2 and 2 + 1 + 1 count too.'],
    ]),
  step('Coins [1, 2], amount 3. You loop over amounts on the outside and coins on the inside, and get 3. What did you count?',
    [row('coins', [1, 2]), row('dp (amounts outside)', [1, 1, 2, 3], { 3: 'claims 3' })], 2, [
      ['Three different combinations', 'Only two exist: {1, 1, 1} and {1, 2}.'],
      ['A double-counted 1 + 1 + 1', '1 + 1 + 1 can only be written one way. The extra comes from somewhere else.'],
      ['Orders: 1 + 1 + 1, 1 + 2 and 2 + 1', 'Yes. With amounts outside, every coin may be the LAST coin at every amount, so 1 + 2 and 2 + 1 are built separately. Coins outside builds each combination in coin order, once.'],
    ]),
  step('In the one-row version, why does change() sweep amounts upwards, when the 0/1 crates swept downwards?',
    [row('coins', [1, 2]), row('dp after coin 1, upwards', [1, 1, 1, 1])], 0, [
      ['Upwards lets dp[a − coin] already include this coin: reuse is the point', 'Yes. Unbounded wants dp[a − coin] from the SAME row (this coin allowed again). Sweep downwards and coin 1 is used at most once: [1, 2] would make 3 in only 1 way.'],
      ['Upwards is faster', 'Both directions touch the same squares. The direction changes what the squares mean.'],
      ['Downwards would count orders', 'Order-counting comes from the loop nesting (amounts outside), not the sweep direction.'],
    ]),
];

// ---------- Chapter 6 ----------
export const cooldown = [
  step('Prices [1, 2, 3, 0, 2]. End of day 2: hold = −1, sold = 2, rest = 1. Day 3 costs 0. What is hold on day 3?',
    [row('day 2', [-1, 2, 1], { 0: 'hold', 1: 'sold', 2: 'rest' }), row('day 3 price', [0])], 1, [
      ['2: buy with the cash from sold (2 − 0)', 'Sold means you sold on day 2. The cooldown forbids buying on day 3. That 2 is the no-cooldown answer sneaking in.'],
      ['1: buy out of rest (1 − 0), better than keeping −1', 'Yes. hold = max(keep holding −1, rest 1 − price 0) = 1. Only Rest has an arrow into Hold.'],
      ['−1: you can’t buy at price 0', 'A free share is the best buy of the week. Price 0 is allowed.'],
    ]),
  step('Day 4, price 2: hold = 1, sold = 3, rest = 2. Where is the answer?',
    [row('day 4', [1, 3, 2], { 0: 'hold', 1: 'sold', 2: 'rest' })], 1, [
      ['hold = 1', 'Hold means a share is still in your hands, and its 1 already paid for it. Ending while holding throws the share away.'],
      ['max(sold, rest) = 3', 'Yes. You must end empty-handed: either you sold today or you are resting. The plan: buy at 1, sell at 2 (day 1), cool down on day 2, buy at 0 (day 3), sell at 2 (day 4): 1 + 2 = 3.'],
      ['sold = 3, always', 'On falling prices sold can be negative while rest is 0. Take the larger of the two empty-handed lanterns.'],
    ]),
];

// ---------- Chapter 7 ----------
export const climb = [
  step('Heights [[9, 9, 4], [6, 6, 8], [2, 1, 1]]. You stand on the 6 at (1, 0). Its neighbours are 9 (up), 6 (right) and 2 (down). Which do you explore?',
    [row('row 0', [9, 9, 4], { 0: 'up' }), row('row 1', [6, 6, 8], { 0: 'HERE', 1: 'right' }, { tones: { 0: 'hot' } }), row('row 2', [2, 1, 1], { 0: 'down' })], 0, [
      ['Only the 9: the climb must go strictly up', 'Yes. The 6 beside you is equal, and the 2 is lower. climb(6) = 1 + climb(9) = 2.'],
      ['The 9 and the other 6', 'Equal isn’t increasing. Allow it and the two 6s would send you back and forth forever.'],
      ['All three, then keep the longest', 'Walking down to the 2 isn’t a climb. Every step must be strictly higher.'],
    ]),
  step('A friend adds a visited[][] grid “so the search can’t loop”. Does this search need one?',
    [], 1, [
      ['Yes: every graph search needs a visited set', 'Searches on graphs with cycles do. Here every step is strictly higher, so a walk can never return to a square.'],
      ['No: heights strictly increase along every walk, so there are no cycles — the memo is all you need', 'Yes. Strictly increasing makes the moves a DAG. The memo stops repeated work; nothing can loop.'],
      ['Only for squares on the edge', 'Edges change nothing. The order of the heights is what rules out loops.'],
    ]),
  step('The memo already holds climb(2) = 3 at (2, 0). Now you start at the 1 at (2, 1). Its only higher neighbours are the 2 (left) and the 6 at (1, 1), which holds 2. What is climb(1)?',
    [row('memo row 1', [2, 2, 1], { 1: 'up: 2' }), row('memo row 2', [3, '?', '·'], { 0: 'left: 3', 1: 'HERE' }, { tones: { 1: 'hot' } })], 2, [
      ['3: the memo already knows the 2', 'You still add the step onto the 2. climb(1) = 1 + climb(2).'],
      ['5: 1 + 3 + 2 (both neighbours)', 'A climb goes one way. Take the better neighbour, not both.'],
      ['4: 1 + max(3, 2)', 'Yes, with no new searching: the archive answers in O(1). The whole grid’s answer is 4: 1 → 2 → 6 → 9.'],
    ]),
];

// ---------- Chapter 8 ----------
export const balloons = [
  step('Inside the walls i and j, you will pick one balloon k and split the problem around it. Why pick the balloon that bursts LAST, not first?',
    [], 1, [
      ['It is just a convention; first works as well', 'If k bursts first, its two neighbours become neighbours of each other, so the left side’s coins depend on the right side. The halves aren’t independent.'],
      ['If k bursts last, walls i and j and balloon k stand the whole time: the left half and right half never touch, and k earns v[i] × v[k] × v[j]', 'Yes. Everything strictly between i and k bursts with k as its right wall; everything between k and j with k as its left wall. Two smaller copies of the same question.'],
      ['Bursting last earns more coins', 'Coins depend on neighbours at the moment of bursting, not on timing. “Last” is about independence, not value.'],
    ]),
  step('Padded row [1, 3, 1, 5, 8, 1]. For dp[0][5], the candidates for the last balloon give: k=1 (3): 0 + 3 + 159; k=2 (1): 3 + 1 + 48; k=3 (5): 30 + 5 + 40; k=4 (8): 159 + 8 + 0. Which wins?',
    [row('padded', [1, 3, 1, 5, 8, 1], { 0: 'wall', 5: 'wall' })], 3, [
      ['k = 1 (the 3): 162', 'Save the 3 for last: nothing lies between wall 0 and it (0), it earns 1·3·1 = 3, and the 1, 5, 8 to its right earn 159. Total 162: close, but not the best.'],
      ['k = 2 (the 1): 52', 'Save the 1 for last: the 3 alone earns 3, the 1 earns 1·1·1 = 1, and the 5, 8 earn 48. Total 52: a cheap balloon makes a poor finale.'],
      ['k = 3 (the 5): 75', 'Save the 5 for last: the 3, 1 earn 30, the 5 earns 1·5·1 = 5, and the 8 alone earns 40. Total 75.'],
      ['k = 4 (the 8): 167', 'Yes. Save the 8 for last: the 3, 1 and 5 burst between walls 1 and 8 for 159, then the 8 alone earns 1·8·1 = 8.'],
    ]),
  step('Which fill order is safe for dp[i][j], which reads dp[i][k] and dp[k][j] for every k between?',
    [], 0, [
      ['By gap length: all gaps of 2, then 3, and so on', 'Yes. dp[i][k] and dp[k][j] are both shorter gaps, so they are finished. (i from right to left with j left to right also works.)'],
      ['i from left to right, j left to right', 'dp[k][j] has k > i: a row you haven’t filled yet. It reads zeros, and [3, 1, 5, 8] returns 63 instead of 167.'],
      ['Any order: every square is filled eventually', 'A square must be filled before anyone reads it. Order is the whole point of the map.'],
    ]),
];

// ---------- mixed review ----------
export const mixedReview = [
  step('Two words. The only move is deleting one letter from either word. Fewest moves to make them equal?', [], 1, [
    ['Edit distance with all three moves', 'Replace isn’t allowed here, so the full edit distance can undercount.'],
    ['n + m − 2 × LCS: keep the longest shared subsequence, delete everything else', 'Yes. Whatever both words keep is a common subsequence; keep the longest. That is Delete Operation for Two Strings.'],
    ['Sort both words and compare', 'Sorting destroys the order, and order is the whole question.'],
  ]),
  step('Count the ways to make an amount with unlimited coins, where 1 + 2 and 2 + 1 are the same way.', [], 0, [
    ['Coins outside, amounts inside, one row swept upwards', 'Yes. Coins outside builds each combination in coin order once; upwards lets each coin repeat.'],
    ['Amounts outside, coins inside', 'That counts ordered sequences: 1 + 2 and 2 + 1 separately.'],
    ['Coins outside, amounts swept downwards', 'Downwards uses each coin at most once. 1 + 1 + 1 disappears.'],
  ]),
  step('Each item can be used at most once. Can some of them total exactly T? One row of paper.', [], 1, [
    ['Sweep s upwards', 'Upwards lets an item read a square it already changed: the same item twice.'],
    ['Sweep s downwards, from T to the item’s weight', 'Yes. Downwards, dp[s − w] still describes the earlier items only.'],
    ['Greedy: take the biggest items that still fit', 'Greedy fails: [3, 3, 2, 2, 2] with T = 7 takes 3 + 3, and then no 2 fits; yet 3 + 2 + 2 = 7.'],
  ]),
  step('A maze: you may step up, down, left or right. Fewest steps from corner to corner?', [], 2, [
    ['A grid table filled row by row from the top-left', 'With four directions a route can come from below or from the right, which haven’t been filled yet. There is no fill order.'],
    ['DFS with a memo of the best answer per square', 'Squares form cycles, so “best from here” depends on paths that come back through here. The memo can store wrong answers.'],
    ['Breadth-first search from the start', 'Yes. Moves in all four directions make cycles. BFS settles squares in order of distance, which is exactly the order a table can’t give you.'],
  ]),
  step('Longest path in a grid where every step must be strictly higher, moving in four directions.', [], 0, [
    ['DFS from every square with a memo; no visited set', 'Yes. Strictly higher means no cycles, so “longest climb from here” is a well-defined smaller question.'],
    ['BFS from the lowest square', 'The longest climb needn’t start at the global minimum, and BFS finds shortest routes, not longest.'],
    ['A table filled row by row', 'A climb can go up or left, so row order doesn’t put neighbours first. Let the recursion find the order.'],
  ]),
  step('Removing an element earns points that depend on its CURRENT neighbours, and the row closes up after each removal.', [], 1, [
    ['A table over prefixes, like LCS', 'Prefixes don’t capture who the neighbours will be after removals.'],
    ['Intervals: dp[i][j] over a range, choosing which element goes LAST', 'Yes. The last element’s neighbours are the range’s walls, so the two sides become independent.'],
    ['Greedy: remove the smallest first', 'On [3, 1, 5, 8], smallest-first bursts 1, 3, 5, 8 for 15 + 15 + 40 + 8 = 78. The best order earns 167.'],
  ]),
  step('dp[i][j] reads dp[i + 1][j − 1], dp[i + 1][j] and dp[i][j − 1]. Which loop order fills it?', [], 2, [
    ['i from 0 up, j from 0 up', 'dp[i + 1][…] is the next row, not filled yet.'],
    ['j from the end down', 'dp[i][j − 1] needs the smaller j first.'],
    ['i from the end down, j from i + 1 up', 'Yes. Row i + 1 is finished before row i, and within a row, j − 1 is finished before j.'],
  ]),
  step('Buy and sell as often as you like, but each sale pays a fee. Which shape fits?', [], 0, [
    ['Two states per day — holding, not holding — with the fee on the sell arrow', 'Yes. A state machine: hold = max(hold, free − price), free = max(free, hold + price − fee).'],
    ['A 2-D table of buy day × sell day', 'That is O(n²) squares and still doesn’t chain several trades together cleanly.'],
    ['Sum every rise, minus a fee for each', 'With a fee, many small rises should merge into one trade. Summing rises pays too many fees.'],
  ]),
  step('Where does the 2-D table’s answer usually live in a two-sequence problem?', [], 1, [
    ['dp[0][0], where the fill starts', 'dp[0][0] is the empty-versus-empty base case.'],
    ['dp[n][m]: all of the first sequence against all of the second', 'Yes. Say where the answer lives before you fill the table — for LCS, edit distance and distinct subsequences it is the bottom-right square.'],
    ['The largest square anywhere in the table', 'That is true for some problems (Maximal Square, Longest Common Substring), but those squares mean “ending exactly here”. For prefix tables, the full-prefix square is the answer.'],
  ]),
];
