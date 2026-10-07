// Three-step hint ladders for every <HintLadder> in matrix.mdx.
export const hints: Record<string, [string, string, string]> = {
  rotate: [
    'Write down where one knot goes. A clockwise quarter turn sends (r, c) to which (row, column)? Can that map be built from two simpler moves that each swap pairs in place?',
    'Clockwise is (r, c) → (c, n − 1 − r). A transpose gives (c, r); reversing each row then turns column r into column n − 1 − r.',
    'Transpose: for r in 0..n − 1 and c in r + 1..n − 1, swap matrix[r][c] with matrix[c][r] (above the diagonal only). Then reverse every row with two pointers.',
  ],
  spiral: [
    'Think of the unread cells as a rectangle that shrinks. Which four numbers describe it?',
    'top, bottom, left, right. Walk the top row left to right, then top++. Walk the right column down, then right--. Then the bottom row right to left, bottom--; then the left column up, left++.',
    'Loop while top <= bottom && left <= right. Before the bottom walk check top <= bottom again; before the up walk check left <= right again. The first two walks are protected by the loop condition.',
  ],
  zeroes: [
    'You need one bit per row (“must this row be zeroed?”) and one per column. Is there somewhere in the grid that could hold those bits?',
    'Row 0 can hold the column notes and column 0 the row notes. But then row 0 and column 0 lose their own information, so save that first in two booleans.',
    'Order: read the two flags; chalk notes from every inner zero (r, c ≥ 1); zero inner cells whose row note or column note is 0; finally zero row 0 and column 0 if their flags say so.',
  ],
  pow: [
    'x^13 = x^8 × x^4 × x^1. Which powers of x can you produce cheaply, one after another?',
    'Keep result, base and e with result × base^e = x^n. When e is odd, multiply base into result. Then square base and halve e. Stop when e reaches 0.',
    'Copy n into a long before anything else. If it is negative, set x = 1 / x and negate the long. Loop while e > 0: if (e & 1) == 1, result *= x; x *= x; e >>= 1.',
  ],
  spiralII: [
    'Same four walls, same four walks. What changes when you write instead of read?',
    'Keep a counter next = 1. Every step of every walk writes next++ into the cell it visits.',
    'Copy the Spiral Matrix loop with its two guards, replacing out.add(matrix[r][c]) by matrix[r][c] = next++. For a square grid the guards only matter at the centre, but keeping them costs nothing.',
  ],
  transpose: [
    'The result has a different shape. What are its dimensions?',
    'An rows × cols grid becomes cols × rows. The knot at (r, c) moves to (c, r).',
    'Allocate int[cols][rows]; for every r and c, out[c][r] = matrix[r][c]. In place is impossible because the shape changes. A clockwise turn of a non-square grid is out[c][rows − 1 − r] = matrix[r][c].',
  ],
  life: [
    'Every cell needs its neighbours’ OLD state, but you want to write the new state in the same cell. Cells only hold 0 or 1. Is there unused room in an int?',
    'Keep the current state in bit 0 and write the next state into bit 1. Always count neighbours with board[r][c] & 1.',
    'Pass 1: count live neighbours (& 1); if live == 3, or the cell is alive and live == 2, set bit 1 with |= 2. Pass 2: shift every cell right by one.',
  ],
  diagonals: [
    'Along one diagonal, which combination of r and c stays the same?',
    'On an anti-diagonal (going up-right), r + c is constant. On a main-direction diagonal (going down-right), r − c is constant.',
    'Zigzag: for d from 0 to rows + cols − 2, rows run from max(0, d − cols + 1) to min(d, rows − 1); go up when d is even, down when odd. Toeplitz: every cell with r, c ≥ 1 must equal matrix[r − 1][c − 1].',
  ],
  staircase: [
    'Find a corner where “too big” and “too small” point in two different directions.',
    'At the top-right corner, the value is the largest in its row and the smallest in its column.',
    'Start at r = 0, c = cols − 1. Equal → found. Too big → the rest of the column is bigger too: c--. Too small → the rest of the row is smaller too: r++. Stop when you fall off the grid.',
  ],
  square: [
    'What do a square’s six pairwise distances look like?',
    'Four equal sides and two equal diagonals, with diagonal² = 2 × side². Squared distances are integers, so no square roots are needed.',
    'Compute the six squared distances in long, sort them, and check d[0] > 0, d[0] == d[3], d[4] == d[5] and d[4] == 2 × d[0].',
  ],
};
