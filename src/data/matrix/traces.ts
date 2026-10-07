// Decision puzzles for the Matrix & Geometry lesson. Every number here is re-derived in tests/matrix.test.ts.
import { row, step, type TraceRow } from '../../lib/trace.ts';

const grid = (m: (number | string)[][], name = 'row', labels: Record<string, string> = {}, hot: [number, number][] = []): TraceRow[] =>
  m.map((values, r) => row(`${name} ${r}`, values,
    Object.fromEntries(Object.entries(labels).filter(([k]) => Number(k.split(',')[0]) === r).map(([k, v]) => [Number(k.split(',')[1]), v])),
    { tones: Object.fromEntries(hot.filter(([hr]) => hr === r).map(([, hc]) => [hc, 'hot' as const])) }));

const g16 = [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]];
const g9 = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];

export const rotate = [
  step('A 4 × 4 tapestry turns a quarter turn clockwise. The knot 2 sits at row 0, column 1. Where does it land?',
    grid(g16, 'row', { '0,1': '(0, 1)' }, [[0, 1]]), 0, [
      ['Row 1, column 3', 'Yes. Clockwise sends (r, c) to (c, n − 1 − r) = (1, 4 − 1 − 0) = (1, 3). The top row becomes the right-hand column, read top to bottom.'],
      ['Row 1, column 0', 'That is (c, r): a transpose, a flip across the main diagonal. It puts the top row down the LEFT column. Half a rotation, not the whole one.'],
      ['Row 2, column 0', 'That is (n − 1 − c, r) = (2, 0): the counter-clockwise turn. The top row would run UP the left column.'],
      ['Row 0, column 2', 'That is (r, n − 1 − c): a mirror. Each row reversed, but nothing left row 0. A rotation must move rows into columns.'],
    ]),
  step('You transposed [[1, 2, 3], [4, 5, 6], [7, 8, 9]] and now hold [[1, 4, 7], [2, 5, 8], [3, 6, 9]]. Which second move finishes the clockwise turn?',
    grid([[1, 4, 7], [2, 5, 8], [3, 6, 9]], 'row'), 0, [
      ['Reverse each row: [[7, 4, 1], [8, 5, 2], [9, 6, 3]]', 'Yes. The transpose sends (r, c) to (c, r); reversing each row sends (c, r) to (c, n − 1 − r). Together: (r, c) → (c, n − 1 − r), the clockwise map.'],
      ['Reverse the order of the rows: [[3, 6, 9], [2, 5, 8], [1, 4, 7]]', 'That finishes a COUNTER-clockwise turn: (c, r) → (n − 1 − c, r). The 1 from the top-left corner ends bottom-left instead of top-right.'],
      ['Transpose again', 'A transpose is its own inverse: (r, c) → (c, r) → (r, c). You would be holding the original tapestry.'],
    ]),
  step('Your transpose loop swaps matrix[r][c] with matrix[c][r] for EVERY r and EVERY c, from 0 to n − 1. What does [[1, 2], [3, 4]] look like afterwards?',
    grid([[1, 2], [3, 4]], 'row'), 1, [
      ['[[1, 3], [2, 4]], transposed', 'The pair (0, 1)/(1, 0) is visited twice: once at r = 0, c = 1 and again at r = 1, c = 0. The second swap undoes the first.'],
      ['[[1, 2], [3, 4]], unchanged', 'Yes. Every off-diagonal pair is swapped twice, so the loop does nothing. Swap only above the diagonal: c starts at r + 1.'],
      ['It throws an index error', 'Every (c, r) with r and c in 0..n − 1 is a real cell of a square grid. The bug is silent, which is what makes it dangerous.'],
    ]),
];

export const spiral = [
  step('3 × 4 tapestry. The first lap read 1, 2, 3, 4, 8, 12, 11, 10, 9, 5. The second lap walked right along row 1 (6, 7), so now top = 2, bottom = 1, left = 1, right = 2. The walk down reads nothing and right becomes 1. Do you walk left along the bottom row?',
    grid([[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]], 'row', { '1,1': 'left = right' }, [[1, 1], [1, 2]]), 1, [
      ['Yes: row bottom = 1, from column 1 back to column 1', 'Row 1 is the row you just read left to right. Walking it again re-reads the 6: the output becomes 1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7, 6, with 13 values from 12 cells.'],
      ['No: top (2) has passed bottom (1), so no unread row remains', 'Yes. The guard if (top <= bottom) skips the bottom walk. The output stops at 12 values: 1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7.'],
      ['Yes, but only if the row has more than one cell', 'Length is not the issue: the row was already read. The only question is whether top and bottom have crossed.'],
    ]),
  step('A single row, [[1, 2, 3]]. The top walk reads 1, 2, 3 and sets top = 1, while bottom is still 0. The while-condition was checked before the top walk. What stops the bottom walk re-reading 2, 1?',
    grid([[1, 2, 3]], 'row'), 0, [
      ['The guard if (top <= bottom) before the bottom walk', 'Yes. 1 > 0, so the walk is skipped. Without it the output is 1, 2, 3, 2, 1.'],
      ['The while condition top <= bottom && left <= right', 'It is only tested at the top of each lap. Between the four walks, the boundaries move and nothing re-checks them unless you add a guard.'],
      ['Nothing: a single row has no bottom row', 'bottom = 0 is the same row as top = 0. That is exactly why it is read twice.'],
    ]),
  step('A single column, [[1], [2], [3]]. After the top walk (1) and the down walk (2, 3): top = 1, bottom = 2, left = 0, right = −1. The bottom walk reads nothing and bottom becomes 1. Which check stops the up walk re-reading 2?',
    grid([[1], [2], [3]], 'row'), 1, [
      ['if (top <= bottom)', 'top = 1 and bottom = 1, so this check passes. It cannot see that the only column is used up.'],
      ['if (left <= right)', 'Yes. left = 0 has passed right = −1: the only column was read on the way down. Without it the output is 1, 2, 3, 2.'],
      ['No check needed: the up walk starts below top', 'It runs from row bottom = 1 up to row top = 1, which is one cell: the 2 you already read.'],
    ]),
];

export const zeroes = [
  step('[[1, 2, 3], [4, 0, 6], [7, 8, 9]]. Scanning row by row, you find the 0 at (1, 1). With O(1) extra space, what do you do right now?',
    grid([[1, 2, 3], [4, 0, 6], [7, 8, 9]], 'row', { '1,1': 'zero' }, [[1, 1]]), 1, [
      ['Zero row 1 and column 1 immediately', 'The new zeros look exactly like original ones. Scanning on, (1, 2) and (2, 1) now hold 0 and spread too: you end with [[1, 0, 0], [0, 0, 0], [0, 0, 0]] instead of [[1, 0, 3], [0, 0, 0], [7, 0, 9]].'],
      ['Chalk a note on the edges: matrix[1][0] = 0 and matrix[0][1] = 0', 'Yes. Row 1’s fate is written at its left end and column 1’s at its top. The inside is not touched until every note is written.'],
      ['Record 1 in a boolean[] for rows and 1 in a boolean[] for columns', 'Correct, and the clearest first answer, but that is O(rows + cols) extra space. The follow-up asks for O(1): the edges of the grid can hold those same booleans.'],
    ]),
  step('LeetCode’s second example: [[0, 1, 2, 0], [3, 4, 5, 2], [1, 3, 1, 5]]. Row 0 holds a zero, so its flag is set. You zero row 0 BEFORE the inside pass. What happens?',
    grid([[0, 1, 2, 0], [3, 4, 5, 2], [1, 3, 1, 5]], 'row', {}, [[0, 0], [0, 3]]), 2, [
      ['Nothing: row 0 had to be zeroed anyway', 'Row 0 doubles as the column markers. Zeroing it early tells every column it holds a zero.'],
      ['Only column 0 is affected', 'Row 0 is the marker row for EVERY column, not just column 0.'],
      ['Every column marker now reads 0, so the inside pass wipes the whole grid', 'Yes. The answer should be [[0, 0, 0, 0], [0, 4, 5, 0], [0, 3, 1, 0]]; instead every cell becomes 0. Read the notes into the inside first, then settle the edges.'],
    ]),
  step('[[1, 2, 3], [4, 0, 6], [7, 8, 9]] again. You chalk the notes first, then check whether row 0 and column 0 “contain a zero”. What goes wrong?',
    grid([[1, 0, 3], [0, 0, 6], [7, 8, 9]], 'after notes · row', { '0,1': 'note', '1,0': 'note' }, [[0, 1], [1, 0]]), 0, [
      ['Your own notes look like original zeros, so row 0 and column 0 are wiped: [[0, 0, 0], [0, 0, 0], [0, 0, 9]]', 'Yes. The correct answer is [[1, 0, 3], [0, 0, 0], [7, 0, 9]]. Read the two flags BEFORE writing any note on the edges.'],
      ['Nothing: the notes are zeros anyway', 'A note says “this row or column must be zeroed”. It does not say the edge row itself held a zero, and here it didn’t: the 1, 3 and 7 should survive.'],
      ['The inside pass misses (2, 1)', 'The note at matrix[0][1] still zeroes (2, 1), correctly. The damage is on the edges.'],
    ]),
];

export const pow = [
  step('Compute 3^13. result = 1, base = 3, e = 13. The promise: result × base^e = 3^13. e is odd. Which move keeps the promise and makes progress?',
    [row('state', ['result 1', 'base 3', 'e 13'], {}, { tones: { 2: 'hot' } })], 0, [
      ['Take one base: result = 3, e = 12', 'Yes. 3 × 3^12 = 3^13. Peeling off one factor makes e even, ready to halve.'],
      ['Square: base = 9, e = 13 / 2 = 6', 'Integer division drops the odd factor: 1 × 9^6 = 3^12. You would return 531441 instead of 1594323.'],
      ['Multiply result by 3 thirteen times', 'Correct but O(n). With n up to 2^31 − 1 that is two billion multiplications.'],
    ]),
  step('result = 3, base = 9, e = 6. e is even. What next?',
    [row('state', ['result 3', 'base 9', 'e 6'], {}, { tones: { 1: 'hot', 2: 'hot' } })], 1, [
      ['Take one base: result = 27, e = 5', 'Still true (27 × 9^5 = 3^13), but it trades a halving for a decrement. Done every time, that is the slow road.'],
      ['Square and halve: base = 81, e = 3', 'Yes. 9^6 = (9²)^3 = 81^3, so 3 × 81^3 = 3^13. Each halving removes one bit of e: O(log n) steps.'],
      ['Stop: result already holds 3', 'The promise says result × base^e = 3^13. With e = 6, the 9^6 part is still owed.'],
    ]),
  step('n = −2147483648 (Integer.MIN_VALUE). The code does if (n < 0) { x = 1 / x; n = −n; } with n an int. What is n afterwards?',
    [], 2, [
      ['2147483648', 'That number does not fit in an int: the largest int is 2147483647. Copy n into a long first.'],
      ['0', 'Negation in Java wraps; it does not clamp to zero.'],
      ['Still −2147483648', 'Yes. Two’s complement has one more negative value than positive, so −MIN_VALUE wraps back to MIN_VALUE. A while (n > 0) loop never runs and myPow(2.0, n) returns 1.0 instead of 0.0.'],
      ['Java throws ArithmeticException', 'Integer negation never throws in Java (Math.negateExact would). It wraps silently.'],
    ]),
];

export const mixedReview = [
  step('Rotate an n × n image a quarter turn clockwise, in place, O(1) extra space. The move?', [], 1, [
    ['Copy into a new grid with new[c][n − 1 − r] = old[r][c]', 'The map is exactly right, but a second grid is O(n²) extra space, and the problem says in place.'],
    ['Transpose (swap above the diagonal), then reverse each row', 'Yes. (r, c) → (c, r) → (c, n − 1 − r). Each step is an in-place swap, so the extra space is O(1).'],
    ['Reverse each row, then transpose', 'That gives the counter-clockwise turn: (r, c) → (r, n − 1 − c) → (n − 1 − c, r).'],
    ['Rotate each row in place by one position', 'That shifts values along a row. A rotation of the image moves rows into columns.'],
  ]),
  step('Return every cell of a 5 × 2 grid in clockwise spiral order.', [], 0, [
    ['Four boundaries; walk right, down, left, up; shrink each boundary after its walk; guard the left and up walks', 'Yes. On a non-square grid the boundaries cross mid-lap. The guards top <= bottom and left <= right stop double reads.'],
    ['Walk until all four boundaries move once, without guards', 'On a 5 × 2 grid the left/right boundaries cross after one lap while rows remain, and the unguarded up walk re-reads cells.'],
    ['Sort the cells by distance from the centre', 'Spiral order depends on lap and direction, not distance. Ties and order within a lap would be wrong.'],
  ]),
  step('Zero every row and column that contains a 0, with O(1) extra space.', [], 2, [
    ['Mark cells with −1, then zero the −1s', '−1 can be a real value: LeetCode allows any int. Every sentinel value can collide with real data.'],
    ['Zero rows and columns as soon as you find each 0', 'The new zeros are indistinguishable from originals and spread across the grid.'],
    ['Two flags for the first row and column, notes on the edges, the inside from the notes, the edges last', 'Yes. The edges are free storage only because their own fate is saved in two booleans first, and they are overwritten last.'],
  ]),
  step('Compute x^n with n anywhere in the int range.', [], 0, [
    ['Copy n into a long; if negative, invert x and negate; square the base and halve the exponent, multiplying in when the low bit is 1', 'Yes. O(log n) multiplications, and the long avoids the −Integer.MIN_VALUE wrap.'],
    ['A loop that multiplies x into the result |n| times', 'Correct for small n, but up to 2^31 multiplications is far too slow.'],
    ['Math.exp(n × Math.log(x))', 'log is undefined for negative x, and the result picks up extra floating-point error. Interviewers want the halving idea.'],
  ]),
  step('Compute the next generation of a Game of Life board in place.', [], 1, [
    ['Update each cell as soon as you know its next state', 'Neighbours visited later then count a mix of old and new cells. The blinker [[0, 1, 0], [0, 1, 0], [0, 1, 0]] dies out completely instead of turning sideways.'],
    ['Store the next state in bit 1 while reading the current state from bit 0, then shift every cell right once', 'Yes. Cells only ever hold 0 or 1, so bit 1 is free space. Every neighbour count reads bit 0, the untouched old state.'],
    ['Copy the board, read from the copy, write into the original', 'Correct and simple, but O(rows × cols) extra space. Fine as a first answer; the follow-up asks for in place.'],
  ]),
  step('Each row is sorted left to right and each column top to bottom (but a row may start below the previous row’s end). Is the target in the grid?', [], 2, [
    ['Binary search the grid as one flattened sorted list', 'Flattening needs every row to start above the previous row’s end. Here [[1, 4], [2, 5]] flattens to 1, 4, 2, 5, which is not sorted.'],
    ['Binary search every row', 'Correct, O(rows × log cols), but it ignores the column order entirely.'],
    ['Start at the top-right corner: too big → step left, too small → step down', 'Yes. Each step discards a whole column or a whole row: O(rows + cols).'],
  ]),
  step('Four points with integer coordinates. Do they form a square?', [], 1, [
    ['Compute the four side lengths with Math.sqrt and compare doubles', 'Square roots of integers are irrational and the comparison needs a tolerance. Compare squared distances instead: exact integers.'],
    ['Sort the six squared pairwise distances: the four smallest equal and non-zero, the two largest equal and twice the smallest', 'Yes. Four equal sides make a rhombus; equal diagonals make it a square. All integer arithmetic.'],
    ['Check that the four side lengths are equal', 'A rhombus has four equal sides and is not a square unless its diagonals are equal too.'],
  ]),
  step('A grid of 1s (land) and 0s (water). Count the islands of land that touch side by side.', [], 2, [
    ['Walk the grid in spiral order, counting changes from 0 to 1', 'An island can be entered many times along a spiral. Order of visit cannot tell you which cells are connected.'],
    ['Use the first row and column as markers', 'Markers summarise whole rows and columns. Connectivity needs to follow paths between neighbouring cells.'],
    ['Another tool: flood fill (DFS or BFS) from each unvisited land cell', 'Yes. This is a graph problem wearing a grid. Index arithmetic gives you the neighbours; a traversal does the counting.'],
  ]),
  step('Each row is sorted, and each row starts after the previous row ends. Find a target in O(log(rows × cols)).', [], 0, [
    ['Binary search positions 0..rows × cols − 1, reading cell (mid / cols, mid % cols)', 'Yes. The grid is one sorted list folded into rows; the index arithmetic unfolds it without copying.'],
    ['Start at the top-right corner and walk', 'Correct, but O(rows + cols). The stronger ordering here allows a logarithmic search.'],
    ['Scan every cell', 'Correct, but O(rows × cols). The ordering is a gift you would be throwing away.'],
  ]),
];
