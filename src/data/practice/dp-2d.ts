// Independent practice for the 2-D Dynamic Programming lesson. Prompts never name the pattern; inputs vary with `variant`.
import type { Challenge, PracticeSet } from '../../lib/practice.ts';

export const strategies = {
  grid: 'Fill a grid square by square from the neighbours above and to the left',
  align: 'A table over prefixes of two sequences: match, or drop a letter from one side',
  knapsack: 'Items against totals: each item once (sweep down) or reusable (sweep up)',
  states: 'A few named states per day, with arrows between them',
  memo: 'Recursion with a remembered answer per square, on moves that can’t loop',
  interval: 'Ranges i..j, filled from short to long, choosing what happens last',
  other: 'Another tool fits better than a table here',
} as const;

export const conceptIds = [
  'grid-paths', 'lcs', 'edit', 'partition', 'coin-ways', 'cooldown', 'increasing-path', 'balloons',
  'obstacles', 'min-path', 'palindrome', 'distinct', 'target-sum', 'k-trades', 'maze', 'free-trading',
] as const;
type ConceptId = typeof conceptIds[number];

const arr = (a: number[]) => `[${a.join(', ')}]`;
const grid = (g: number[][]) => g.map(arr).join(', ');
const rotate = <T>(a: T[], by: number) => (a.length ? a.map((_, i) => a[(i + by) % a.length]) : []);
const rotateStr = (s: string, by: number) => rotate(s.split(''), by).join('');
const transpose = (g: number[][]) => g[0].map((_, c) => g.map(r => r[c]));
const cells = (list: [number, number][]) => list.map(([r, c]) => `(${r}, ${c})`).join(', ');

// ---------- the answers (computed here with the lesson’s methods; the test recomputes them by brute force) ----------
function routes(r: number, c: number) {
  const dp = Array.from({ length: r }, () => Array(c).fill(1));
  for (let i = 1; i < r; i++) for (let j = 1; j < c; j++) dp[i][j] = dp[i - 1][j] + dp[i][j - 1];
  return dp[r - 1][c - 1];
}
function lcs(a: string, b: string) {
  const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  return dp[a.length][b.length];
}
function edit(a: string, b: string) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
  return dp[a.length][b.length];
}
function subsetCount(nums: number[], target: number) {
  const ways = Array(target + 1).fill(0);
  ways[0] = 1;
  for (const x of nums) for (let s = target; s >= x; s--) ways[s] += ways[s - x];
  return ways[target];
}
function coinWays(coins: number[], amount: number) {
  const dp = Array(amount + 1).fill(0);
  dp[0] = 1;
  for (const c of coins) for (let a = c; a <= amount; a++) dp[a] += dp[a - c];
  return dp[amount];
}
function cooldown(p: number[]) {
  let hold = -p[0], sold = -1e9, rest = 0;
  for (let d = 1; d < p.length; d++) [hold, sold, rest] = [Math.max(hold, rest - p[d]), hold + p[d], Math.max(rest, sold)];
  return Math.max(sold, rest);
}
function longestClimb(g: number[][]) {
  const memo = g.map(r => r.map(() => 0));
  const climb = (r: number, c: number): number => {
    if (memo[r][c]) return memo[r][c];
    let best = 1;
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nc >= 0 && nr < g.length && nc < g[0].length && g[nr][nc] > g[r][c]) best = Math.max(best, 1 + climb(nr, nc));
    }
    return (memo[r][c] = best);
  };
  let best = 0;
  for (let r = 0; r < g.length; r++) for (let c = 0; c < g[0].length; c++) best = Math.max(best, climb(r, c));
  return best;
}
function burst(nums: number[]) {
  const v = [1, ...nums, 1], n = v.length;
  const dp = Array.from({ length: n }, () => Array(n).fill(0));
  for (let len = 2; len < n; len++) for (let i = 0; i + len < n; i++) {
    const j = i + len;
    for (let k = i + 1; k < j; k++) dp[i][j] = Math.max(dp[i][j], dp[i][k] + v[i] * v[k] * v[j] + dp[k][j]);
  }
  return dp[0][n - 1];
}
function rockRoutes(g: number[][]) {
  const dp = g.map(r => r.map(() => 0));
  for (let r = 0; r < g.length; r++) for (let c = 0; c < g[0].length; c++) {
    if (g[r][c] === 1) dp[r][c] = 0;
    else if (r === 0 && c === 0) dp[r][c] = 1;
    else dp[r][c] = (r > 0 ? dp[r - 1][c] : 0) + (c > 0 ? dp[r][c - 1] : 0);
  }
  return dp[g.length - 1][g[0].length - 1];
}
function cheapest(g: number[][]) {
  const dp = g.map(r => [...r]);
  for (let r = 0; r < g.length; r++) for (let c = 0; c < g[0].length; c++) {
    if (r === 0 && c === 0) continue;
    dp[r][c] = g[r][c] + Math.min(r > 0 ? dp[r - 1][c] : Infinity, c > 0 ? dp[r][c - 1] : Infinity);
  }
  return dp[g.length - 1][g[0].length - 1];
}
function palindrome(s: string) {
  const n = s.length, dp = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    dp[i][i] = 1;
    for (let j = i + 1; j < n; j++) dp[i][j] = s[i] === s[j] ? dp[i + 1][j - 1] + 2 : Math.max(dp[i + 1][j], dp[i][j - 1]);
  }
  return dp[0][n - 1];
}
function distinct(s: string, t: string) {
  const dp = Array.from({ length: s.length + 1 }, (_, i) => Array.from({ length: t.length + 1 }, (_, j) => (j === 0 ? 1 : 0)));
  for (let i = 1; i <= s.length; i++) for (let j = 1; j <= t.length; j++)
    dp[i][j] = dp[i - 1][j] + (s[i - 1] === t[j - 1] ? dp[i - 1][j - 1] : 0);
  return dp[s.length][t.length];
}
function targetWays(nums: number[], target: number) {
  const total = nums.reduce((x, y) => x + y, 0);
  if (Math.abs(target) > total || (total + target) % 2 !== 0) return 0;
  return subsetCount(nums, (total + target) / 2);
}
function kTrades(p: number[], k: number) {
  const buy = Array(k + 1).fill(-1e9), sell = Array(k + 1).fill(0);
  for (const x of p) for (let t = 1; t <= k; t++) { buy[t] = Math.max(buy[t], sell[t - 1] - x); sell[t] = Math.max(sell[t], buy[t] + x); }
  return sell[k];
}
function bfs(g: number[][]) {
  const R = g.length, C = g[0].length;
  if (g[0][0] || g[R - 1][C - 1]) return -1;
  const dist = g.map(r => r.map(() => -1));
  dist[0][0] = 0;
  const q: [number, number][] = [[0, 0]];
  for (let h = 0; h < q.length; h++) {
    const [r, c] = q[h];
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nc >= 0 && nr < R && nc < C && !g[nr][nc] && dist[nr][nc] < 0) { dist[nr][nc] = dist[r][c] + 1; q.push([nr, nc]); }
    }
  }
  return dist[R - 1][C - 1];
}
const rises = (p: number[]) => p.reduce((s, x, i) => s + (i > 0 && x > p[i - 1] ? x - p[i - 1] : 0), 0);
const blocked = (g: number[][]) => g.flatMap((r, i) => r.flatMap((v, j) => (v ? [[i, j] as [number, number]] : [])));

function make(id: ConceptId, variant: number): Omit<Challenge, 'id'> {
  const v = Math.abs(Math.trunc(variant));
  switch (id) {
    case 'grid-paths': {
      const r = 2 + (v % 4), c = 2 + (Math.floor(v / 4) % 5);
      const answer = routes(r, c);
      return {
        topic: 'Count routes on a grid', section: 'unique-paths', strategy: 'grid',
        prompt: `A courier starts in the top-left square of a grid of ${r} rows and ${c} columns and may only step right or down, one square at a time. How many different routes end in the bottom-right square?`,
        question: 'Enter the number of routes.', answer,
        hints: ['Stand on the goal. Where could the very last step have come from?', 'Every route into a square arrives from above or from the left, never both. The top row and the left column each have one route.', 'Fill row by row: each square = the square above + the square to the left.'],
        rubric: ['Each square means “routes from the start to here”.', 'The two ways in are disjoint, so their counts add.', 'O(rows × cols) time; one row of memory if you sweep left to right.'],
        explanation: `${answer} routes. (Also C(${r + c - 2}, ${r - 1}): choose which ${r - 1} of the ${r + c - 2} steps go down.)`,
      };
    }
    case 'lcs': {
      const pairs: [string, string][] = [['LBRCT', 'BLCRT'], ['abcde', 'ace'], ['ABCBDAB', 'BDCABA'], ['stone', 'notes'], ['abc', 'def'], ['TIDES', 'DUSTS']];
      const [a, b0] = pairs[v % pairs.length];
      const b = rotateStr(b0, Math.floor(v / pairs.length) % b0.length);
      const answer = lcs(a, b);
      return {
        topic: 'Agreement between two sequences', section: 'lcs', strategy: 'align',
        prompt: `Two surveyors list the landmarks they passed along the same coast, in order: "${a}" and "${b}". What is the length of the longest run of landmarks that appears in both lists in the same order, not necessarily side by side?`,
        question: 'Enter the length.', answer,
        hints: ['Look only at the last landmark of each list.', 'If they are the same, both can end the shared run. If not, one of them is not in it.', 'A square per pair of prefixes: match → diagonal + 1; otherwise the better of dropping either last landmark.'],
        rubric: ['dp[i][j] is defined in words over the first i and first j landmarks, with an empty-prefix row and column of 0.', 'A match takes the diagonal + 1, never max(up, left) + 1.', 'O(n × m) time; the answer is the bottom-right square.'],
        explanation: `The longest shared run has ${answer} landmark(s).`,
      };
    }
    case 'edit': {
      const pairs: [string, string][] = [['horse', 'ros'], ['flaw', 'lawn'], ['cat', 'cut'], ['abc', 'cab'], ['', 'ab'], ['dog', 'god'], ['tide', 'ties']];
      const [p, q] = pairs[v % pairs.length];
      const [a, b] = Math.floor(v / pairs.length) % 2 ? [q, p] : [p, q];
      const answer = edit(a, b);
      return {
        topic: 'Fewest edits between two words', section: 'edit-distance', strategy: 'align',
        prompt: `An engraver may insert one letter, delete one letter, or replace one letter with another, one at a time. What is the fewest number of such moves that turns "${a}" into "${b}"?`,
        question: 'Enter the number of moves.', answer,
        hints: ['Look at the last letters. If they agree, they cost nothing.', 'If not, the last move was a replace, a delete or an insert. Each leaves you at a smaller pair of prefixes.', 'Base row and column: turning i letters into nothing costs i; nothing into j letters costs j. Then 1 + min(diagonal, up, left) on a mismatch.'],
        rubric: ['The empty-prefix row and column are 0, 1, 2, …, not zeros.', 'Replace = diagonal, delete = up, insert = left, each + 1; a match copies the diagonal free.', 'O(n × m) time; two rows of memory are enough.'],
        explanation: `“${a}” → “${b}” takes ${answer} move(s).`,
      };
    }
    case 'partition': {
      const bases = [[1, 5, 11, 5], [1, 2, 3, 5], [2, 3, 5], [1, 2, 5], [3, 3, 3, 3], [1, 2, 4], [4, 4, 1, 6, 5], [2, 2, 3, 5]];
      const base = bases[v % bases.length];
      const a = rotate(base, Math.floor(v / bases.length) % base.length);
      const total = a.reduce((x, y) => x + y, 0);
      const answer = total % 2 === 0 && subsetCount(a, total / 2) > 0;
      return {
        topic: 'Split into two equal groups', section: 'partition', strategy: 'knapsack',
        prompt: `Crates weigh ${arr(a)}. Can they be split into two groups of exactly equal total weight, with every crate in exactly one group?`,
        question: 'Enter yes or no.', answer,
        hints: ['What must each group weigh?', 'If the total is odd, stop. Otherwise ask: can some crates weigh exactly half?', 'One row of yes/no per total, starting with 0 = yes; each crate sweeps from half DOWN to its weight.'],
        rubric: ['Odd total → no, with no table.', 'Each crate is used at most once: the one-row sweep runs downwards.', 'O(n × total) time, O(total) space — pseudo-polynomial: it depends on the weights, not just n.'],
        explanation: answer ? `Total ${total}: some crates weigh exactly ${total / 2}.` : total % 2 ? `Total ${total} is odd.` : `Total ${total}, but no group weighs exactly ${total / 2}.`,
      };
    }
    case 'coin-ways': {
      const bases: [number[], number][] = [[[1, 2, 5], 5], [[2], 3], [[10], 10], [[1, 2], 3], [[2, 3, 5], 10], [[1, 5, 10], 12]];
      const [coins, amt0] = bases[v % bases.length];
      const amt = amt0 + (Math.floor(v / bases.length) % 3);
      const answer = coinWays(coins, amt);
      return {
        topic: 'Count combinations with reusable pieces', section: 'coin-change-ii', strategy: 'knapsack',
        prompt: `Coins come in values ${arr(coins)}, with an unlimited supply of each. In how many different ways can you pay exactly ${amt}? Using the same coins in a different order counts as the same way.`,
        question: 'Enter the number of ways.', answer,
        hints: ['Decide coin type by coin type: how many of the first, then how many of the next.', 'One count per amount, starting with “one way to pay 0”.', 'Coin types on the OUTSIDE loop; amounts swept UPWARDS inside: ways[a] += ways[a − coin].'],
        rubric: ['Coins outside, amounts inside, so each combination is built once, in coin order.', 'Upwards sweep, because a coin may be used again.', 'Swapping the loops would count 1 + 2 and 2 + 1 separately.'],
        explanation: `${answer} combination(s) pay ${amt}.`,
      };
    }
    case 'cooldown': {
      const bases = [[1, 2, 3, 0, 2], [1], [5, 4, 3, 2, 1], [1, 4, 2, 7], [2, 1, 4, 5, 2, 9, 7], [3, 3, 5, 0, 0, 3, 1, 4]];
      const base = bases[v % bases.length];
      const p = rotate(base, Math.floor(v / bases.length) % base.length);
      const answer = cooldown(p);
      return {
        topic: 'Trading with a waiting day', section: 'cooldown', strategy: 'states',
        prompt: `A share’s price on consecutive days is ${arr(p)}. You may buy and sell as many times as you like, holding at most one share at a time, but on the day after any sale you may not buy. What is the most profit you can make?`,
        question: 'Enter the profit.', answer,
        hints: ['At the end of each day, which situations can you be in?', 'Holding; just sold today; empty-handed and free to buy. Draw the arrows between them.', 'hold = max(hold, rest − price); sold = hold + price; rest = max(rest, sold) — all from yesterday. Answer: max(sold, rest).'],
        rubric: ['Three named states with the cooldown as the forced Sold → Rest arrow.', 'Buying only out of Rest.', 'O(n) time, O(1) space with three running numbers.'],
        explanation: `The best profit is ${answer}.`,
      };
    }
    case 'increasing-path': {
      const bases = [[[9, 9, 4], [6, 6, 8], [2, 1, 1]], [[3, 4, 5], [3, 2, 6], [2, 2, 1]], [[1]], [[7, 7], [7, 7]], [[1, 2, 3], [6, 5, 4], [7, 8, 9]], [[5, 1], [2, 3], [4, 6]]];
      const base = bases[v % bases.length];
      const g = Math.floor(v / bases.length) % 2 ? transpose(base) : base;
      const answer = longestClimb(g);
      return {
        topic: 'Longest climb on a height map', section: 'increasing-path', strategy: 'memo',
        prompt: `Heights on a map, row by row: ${grid(g)}. A walker moves up, down, left or right, one square at a time, and every step must land on a strictly higher square. How many squares does the longest such walk visit?`,
        question: 'Enter the number of squares.', answer,
        hints: ['The longest walk starting here is 1 + the longest walk starting at the best higher neighbour.', 'Can a walk ever come back to a square? What does that mean for the search?', 'Recursion from every square with a remembered answer per square; no visited set needed.'],
        rubric: ['Strictly increasing means no cycles, so every square’s answer is well defined.', 'The memo makes each square’s search happen once: O(rows × cols).', 'Equal neighbours are not steps (allowing them would loop forever).'],
        explanation: `The longest strictly rising walk visits ${answer} square(s).`,
      };
    }
    case 'balloons': {
      const bases = [[3, 1, 5, 8], [1, 5], [7], [2, 4, 3], [9, 1, 2, 6], [0, 3, 2]];
      const base = bases[v % bases.length];
      const a = rotate(base, Math.floor(v / bases.length) % base.length);
      const answer = burst(a);
      return {
        topic: 'Removals that change the neighbours', section: 'burst-balloons', strategy: 'interval',
        prompt: `Balloons in a row carry the numbers ${arr(a)}. Bursting a balloon earns left × it × right, using its neighbours at that moment (a missing neighbour counts as 1), and the row then closes up. You burst them all. What is the largest total you can earn?`,
        question: 'Enter the total.', answer,
        hints: ['Choosing which balloon goes FIRST tangles the two sides together. What about the one that goes last?', 'Pad the row with a 1 at each end. Think about everything strictly between two walls i and j.', 'best(i, j) = max over k between them of best(i, k) + v[i]·v[k]·v[j] + best(k, j), filled from short ranges to long.'],
        rubric: ['The last balloon’s neighbours are the walls, so the two sides are independent.', 'Ranges are filled in order of length (or i from the right).', 'O(n³) time, O(n²) space.'],
        explanation: `The best total is ${answer}.`,
      };
    }
    case 'obstacles': {
      const bases = [[[0, 0, 0], [0, 1, 0], [0, 0, 0]], [[0, 1], [0, 0]], [[1, 0], [0, 0]], [[0, 1, 0], [0, 0, 0]], [[0, 0, 0, 0], [0, 1, 0, 0], [0, 0, 0, 1], [1, 0, 0, 0]], [[0, 0, 0], [1, 1, 0], [0, 0, 0]]];
      const base = bases[v % bases.length];
      const g = Math.floor(v / bases.length) % 2 ? transpose(base) : base;
      const answer = rockRoutes(g);
      return {
        topic: 'Count routes around blocked squares', section: 'obstacles', strategy: 'grid',
        prompt: `A grid of ${g.length} rows and ${g[0].length} columns has rocks on the squares ${cells(blocked(g))} (written as (row, column), counting from 0). Moving only right or down, how many routes go from the top-left square to the bottom-right square without touching a rock?`,
        question: 'Enter the number of routes.', answer,
        hints: ['How many routes end on a rock?', 'A rock square holds 0; everything else is above + left, as before.', 'Don’t pre-fill the top row or left column with 1s: a rock there cuts off every square after it.'],
        rubric: ['Rocks hold 0, and a rock on the start makes the answer 0.', 'Edges are computed, not assumed.', 'O(rows × cols) time.'],
        explanation: `${answer} route(s) avoid the rocks.`,
      };
    }
    case 'min-path': {
      const bases = [[[1, 3, 1], [1, 5, 1], [4, 2, 1]], [[1, 2, 3], [4, 5, 6]], [[5]], [[1, 9, 1, 1], [1, 9, 1, 9], [1, 1, 1, 1]], [[2, 2, 2], [9, 0, 9], [2, 2, 2]]];
      const base = bases[v % bases.length];
      const g = Math.floor(v / bases.length) % 2 ? transpose(base) : base;
      const answer = cheapest(g);
      return {
        topic: 'Cheapest route on a grid', section: 'min-path-sum', strategy: 'grid',
        prompt: `Each square of the grid with rows ${grid(g)} charges the toll shown. Moving only right or down from the top-left square to the bottom-right square, and paying for every square you stand on (both ends included), what is the cheapest total?`,
        question: 'Enter the total.', answer,
        hints: ['Counting became minimising. How many ways into a square are there?', 'cheapest(here) = toll(here) + the cheaper of the two ways in.', 'The top row and left column have only one way in: running totals.'],
        rubric: ['Each square means “cheapest from the start to here, both ends paid”.', 'min of up and left, then add this square’s toll.', 'O(rows × cols) time; can overwrite the grid in place.'],
        explanation: `The cheapest route costs ${answer}.`,
      };
    }
    case 'palindrome': {
      const words = ['bbbab', 'cbbd', 'a', 'abcd', 'character', 'agbdba', 'abacaba'];
      const s = words[v % words.length];
      const answer = palindrome(Math.floor(v / words.length) % 2 ? s.split('').reverse().join('') : s);
      const shown = Math.floor(v / words.length) % 2 ? s.split('').reverse().join('') : s;
      return {
        topic: 'Longest mirror kept from a word', section: 'palindrome-subsequence', strategy: 'interval',
        prompt: `Delete any letters you like from "${shown}", without reordering the rest, so that what remains reads the same forwards and backwards. How long can the result be?`,
        question: 'Enter the length.', answer,
        hints: ['Look at both ends of the stretch at once.', 'Equal ends wrap whatever is kept inside; unequal ends mean one of them goes.', 'A square per stretch s[i..j], filled with i from the right: equal ends → inside + 2, else the better of dropping one end.'],
        rubric: ['dp[i][j] means “longest kept from s[i..j]”, with dp[i][i] = 1.', 'Fill order: i from n − 1 down, j from i + 1 up.', 'Same length as the longest shared run between the word and its reverse.'],
        explanation: `The longest mirror has length ${answer}.`,
      };
    }
    case 'distinct': {
      const pairs: [string, string][] = [['rabbbit', 'rabbit'], ['babgbag', 'bag'], ['aaa', 'a'], ['abc', 'abcd'], ['abab', 'ab'], ['banana', 'ban']];
      const [s, t] = pairs[v % pairs.length];
      const answer = distinct(s, t);
      return {
        topic: 'Count the ways to keep a word', section: 'distinct-subsequences', strategy: 'align',
        prompt: `In how many different ways can you delete letters from "${s}", keeping the order of the rest, so that exactly "${t}" remains? Two ways differ if they keep different positions.`,
        question: 'Enter the number of ways.', answer,
        hints: ['Look at the last letter of the long word: deleted, or used for the short word’s last letter?', 'Those are different ways, so their counts add.', 'Keeping nothing from anything is 1 way (column 0 is all 1s); keeping something from nothing is 0.'],
        rubric: ['dp[i][j] = ways to keep exactly t[0..j) from s[0..i).', 'dp[i − 1][j] always; + dp[i − 1][j − 1] when the letters match.', 'O(n × m) time.'],
        explanation: `${answer} way(s).`,
      };
    }
    case 'target-sum': {
      const bases: [number[], number][] = [[[1, 1, 1, 1, 1], 3], [[1], 1], [[1, 1, 1, 1, 1], 2], [[1, 1, 1, 1, 1], -3], [[0, 0, 1], 1], [[2, 3, 5], 0], [[1, 2, 3], 7], [[1, 2, 1], -2]];
      const [nums, target] = bases[v % bases.length];
      const a = rotate(nums, Math.floor(v / bases.length) % nums.length);
      const answer = targetWays(a, target);
      return {
        topic: 'Signs that hit a target', section: 'target-sum', strategy: 'knapsack',
        prompt: `Put a + or a − sign in front of each of the numbers ${arr(a)} and add everything up. How many different sign choices give exactly ${target}?`,
        question: 'Enter the number of choices.', answer,
        hints: ['Call the + numbers P and the − numbers N. You know P − N and P + N.', 'P = (total + target) / 2. If that isn’t a whole number, or the target is out of reach, the answer is 0.', 'Count subsets that total P: ways[0] = 1, each number sweeps DOWN.'],
        rubric: ['The parity check and the |target| > total check come first.', 'A negative target is fine: P is still (total + target) / 2.', 'Zeros double the count (+0 and −0 are different choices).'],
        explanation: `${answer} sign choice(s) give ${target}.`,
      };
    }
    case 'k-trades': {
      const bases: [number[], number][] = [[[3, 2, 6, 5, 0, 3], 2], [[2, 4, 1], 2], [[1, 5], 0], [[3, 2, 6, 5, 0, 3], 1], [[1, 2, 4, 2, 5, 7, 2, 4, 9, 0], 2], [[5, 1, 4, 2, 6], 3]];
      const [p, k] = bases[v % bases.length];
      const answer = kTrades(p, k);
      return {
        topic: 'Trading with a limit on trades', section: 'k-transactions', strategy: 'states',
        prompt: `A share’s price on consecutive days is ${arr(p)}. You may complete at most ${k} trade(s) — one buy followed later by one sell — and you can hold at most one share at a time. What is the most profit you can make?`,
        question: 'Enter the profit.', answer,
        hints: ['Holding or not is no longer enough. What else must each state remember?', 'How many trades have been opened. One “holding” and one “free” number per trade count.', 'For t = 1..k each day: buy[t] = max(buy[t], sell[t − 1] − p); sell[t] = max(sell[t], buy[t] + p). Answer: sell[k].'],
        rubric: ['States are (trades used, holding?).', 'Buying opens a new trade from the previous trade’s sell state.', 'O(n × k) time, O(k) space.'],
        explanation: `The best profit is ${answer}.`,
      };
    }
    case 'maze': {
      const mazes = [
        [[0, 0, 0, 0], [1, 1, 1, 0], [0, 0, 0, 0], [0, 1, 1, 1], [0, 0, 0, 0]],
        [[0, 0, 0], [1, 1, 0], [0, 0, 0], [0, 1, 1], [0, 0, 0]],
        [[0, 1, 0, 0, 0], [0, 1, 0, 1, 0], [0, 0, 0, 1, 0]],
        [[0, 0, 1], [1, 0, 1], [0, 0, 0]],
        [[0, 1], [1, 0]],
      ];
      const g = mazes[v % mazes.length];
      const answer = bfs(g);
      return {
        topic: 'Know when to choose another tool', section: 'choose-the-tool', strategy: 'other',
        prompt: `A maze has ${g.length} rows and ${g[0].length} columns, with walls on the squares ${cells(blocked(g))} (as (row, column), counting from 0). You may step up, down, left or right onto an open square. What is the fewest number of steps from the top-left square to the bottom-right square? Enter −1 if it can’t be reached.`,
        question: 'Enter the number of steps (or −1).', answer,
        hints: ['Can a good route ever need to step up or to the left?', 'Then a square’s best answer can depend on squares below or to its right, and routes can loop.', 'Search outward from the start, one ring of distance at a time.'],
        rubric: ['Four-way moves create cycles: there is no fill order for a table.', 'Breadth-first search settles squares in order of distance: O(rows × cols).', 'A table of “best from above or left” would miss routes that double back.'],
        explanation: answer < 0 ? 'The goal can’t be reached.' : `The shortest route takes ${answer} step(s). Breadth-first search, not a grid table: routes here must double back.`,
      };
    }
    case 'free-trading': {
      const bases = [[7, 1, 5, 3, 6, 4], [1, 2, 3, 4, 5], [7, 6, 4, 3, 1], [1, 2, 3, 0, 2], [2, 9, 1, 8]];
      const base = bases[v % bases.length];
      const p = rotate(base, Math.floor(v / bases.length) % base.length);
      const answer = rises(p);
      return {
        topic: 'Know when to choose another tool', section: 'choose-the-tool', strategy: 'other',
        prompt: `A share’s price on consecutive days is ${arr(p)}. You may buy and sell as many times as you like, holding at most one share at a time, with no waiting period and no fees. What is the most profit you can make?`,
        question: 'Enter the profit.', answer,
        hints: ['With no waiting and no fees, what does a long rise look like as a series of one-day trades?', 'Any rise from day to day can be captured by buying today and selling tomorrow.', 'Add up every positive day-to-day difference. No states needed.'],
        rubric: ['Every rise is collected; every fall is skipped.', 'O(n) time, O(1) space, one pass.', 'A two-state machine also works, but the greedy sum is simpler and provably optimal here.'],
        explanation: `Sum of every rise: ${answer}.`,
      };
    }
  }
}

export function challengeFor(id: string, variant = 0): Challenge {
  return { id, question: 'Enter only the result.', ...make(id as ConceptId, variant) };
}

export const practice: PracticeSet = {
  storageKey: 'citadel-dp-2d-review-v1',
  strategies,
  conceptIds,
  challengeFor,
};
