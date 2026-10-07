// Independent practice for the Backtracking lesson. Prompts never name the pattern; inputs vary with `variant`.
// Answers are counts, yes/no, or one small list — the reader writes the family out, then types what is asked.
import type { Challenge, PracticeSet } from '../../lib/practice.ts';

export const strategies = {
  'in-out': 'Decide in or out for every item; every partial pick is an answer',
  'from-start': 'Pick items from a start position onward (sorted, twins skipped at the same depth) so each group is built once',
  menu: 'Fill one position at a time from that position’s own menu of options',
  orders: 'Fill positions one at a time, tracking which items are already placed',
  grid: 'Walk the grid, marking cells on the current path and unmarking them on the way back',
  constraint: 'Place one piece (or cut one segment) at a time and abandon any branch that already breaks a rule',
  other: 'Another tool fits better than generating every candidate',
} as const;

export const conceptIds = [
  'subsets-sum', 'subsets-dup', 'combinations-kth', 'combo-sum', 'letters-kth', 'perm-kth', 'word-search',
  'palindrome', 'queens', 'combo-sum-ii', 'perm-dup', 'parens', 'combo-sum-iii', 'ip', 'k-partition',
  'count-ways', 'fewest-moves',
] as const;
type ConceptId = typeof conceptIds[number];

const arr = (a: number[]) => `[${a.join(', ')}]`;
const rotate = <T,>(a: T[], by: number) => (a.length ? a.map((_, i) => a[(i + by) % a.length]) : []);
const KEYS: Record<string, string> = { 2: 'abc', 3: 'def', 4: 'ghi', 5: 'jkl', 6: 'mno', 7: 'pqrs', 8: 'tuv', 9: 'wxyz' };

// Small generators, written as plain recursion over choices.
function chooseAll<T>(items: T[]): T[][] {
  const out: T[][] = [];
  const walk = (i: number, path: T[]) => {
    if (i === items.length) { out.push([...path]); return; }
    path.push(items[i]); walk(i + 1, path); path.pop();
    walk(i + 1, path);
  };
  walk(0, []);
  return out;
}
const distinctKeys = (lists: number[][]) => new Set(lists.map(l => [...l].sort((a, b) => a - b).join(',')));
function orderings(items: number[]): number[][] {
  const sorted = [...items].sort((a, b) => a - b), used = sorted.map(() => false), out: number[][] = [], path: number[] = [];
  const walk = () => {
    if (path.length === sorted.length) { out.push([...path]); return; }
    for (let i = 0; i < sorted.length; i++) {
      if (used[i] || (i > 0 && sorted[i] === sorted[i - 1] && !used[i - 1])) continue;
      used[i] = true; path.push(sorted[i]); walk(); path.pop(); used[i] = false;
    }
  };
  walk();
  return out;
}
function canSpell(rows: string[], word: string): boolean {
  const g = rows.map(r => r.split(''));
  const go = (r: number, c: number, k: number): boolean => {
    if (k === word.length) return true;
    if (r < 0 || c < 0 || r >= g.length || c >= g[0].length || g[r][c] !== word[k]) return false;
    const saved = g[r][c]; g[r][c] = '#';
    const found = go(r + 1, c, k + 1) || go(r - 1, c, k + 1) || go(r, c + 1, k + 1) || go(r, c - 1, k + 1);
    g[r][c] = saved;
    return found;
  };
  for (let r = 0; r < g.length; r++) for (let c = 0; c < g[0].length; c++) if (go(r, c, 0)) return true;
  return false;
}
const isPal = (s: string) => s === [...s].reverse().join('');
function palCuts(s: string): number {
  if (s.length === 0) return 1;
  let ways = 0;
  for (let end = 1; end <= s.length; end++) if (isPal(s.slice(0, end))) ways += palCuts(s.slice(end));
  return ways;
}
function queensWithFirst(n: number, first: number): number {
  const cols: number[] = [first];
  const walk = (r: number): number => {
    if (r === n) return 1;
    let found = 0;
    for (let c = 0; c < n; c++) {
      if (cols.some((x, y) => x === c || Math.abs(x - c) === r - y)) continue;
      cols.push(c); found += walk(r + 1); cols.pop();
    }
    return found;
  };
  return walk(1);
}
function bracketCount(n: number, depth: number): number {
  const walk = (open: number, close: number): number => {
    if (open === n && close === n) return 1;
    let ways = 0;
    if (open < n && open - close < depth) ways += walk(open + 1, close);
    if (close < open) ways += walk(open, close + 1);
    return ways;
  };
  return walk(0, 0);
}
function addresses(s: string): number {
  const walk = (start: number, parts: number): number => {
    if (parts === 4) return start === s.length ? 1 : 0;
    let ways = 0;
    for (let len = 1; len <= 3 && start + len <= s.length; len++) {
      const piece = s.slice(start, start + len);
      if (len > 1 && piece[0] === '0') break;
      if (Number(piece) > 255) break;
      ways += walk(start + len, parts + 1);
    }
    return ways;
  };
  return walk(0, 0);
}
function equalShares(nums: number[], k: number): boolean {
  const total = nums.reduce((a, b) => a + b, 0);
  if (total % k !== 0) return false;
  const side = total / k, a = [...nums].sort((x, y) => y - x), bucket = Array(k).fill(0);
  if (a[0] > side) return false;
  const fill = (i: number): boolean => {
    if (i === a.length) return true;
    for (let b = 0; b < k; b++) {
      if (bucket[b] + a[i] > side) continue;
      bucket[b] += a[i];
      if (fill(i + 1)) return true;
      bucket[b] -= a[i];
      if (bucket[b] === 0) break;
    }
    return false;
  };
  return fill(0);
}
function countHandfuls(coins: number[], amount: number): number {
  const ways = Array(amount + 1).fill(0);
  ways[0] = 1;
  for (const c of coins) for (let x = c; x <= amount; x++) ways[x] += ways[x - c];
  return ways[amount];
}
function fewestMoves(rows: string[]): number {
  const R = rows.length, C = rows[0].length, dist = rows.map(r => r.split('').map(() => -1));
  if (rows[0][0] === '#') return -1;
  const queue: [number, number][] = [[0, 0]];
  dist[0][0] = 0;
  for (let q = 0; q < queue.length; q++) {
    const [r, c] = queue[q];
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nc < 0 || nr >= R || nc >= C || rows[nr][nc] === '#' || dist[nr][nc] >= 0) continue;
      dist[nr][nc] = dist[r][c] + 1;
      queue.push([nr, nc]);
    }
  }
  return dist[R - 1][C - 1];
}

function make(id: ConceptId, variant: number): Omit<Challenge, 'id'> {
  const v = Math.abs(Math.trunc(variant));
  switch (id) {
    case 'subsets-sum': {
      const bases: [number[], number][] = [[[3, 1, 4, 6], 7], [[2, 5, 1, 8, 3], 9], [[4, 7, 2], 6], [[1, 2, 3, 4, 5], 6], [[6, 9, 2, 5], 11]];
      const [base, cap] = bases[v % bases.length];
      const a = rotate(base, Math.floor(v / bases.length) % base.length);
      const answer = chooseAll(a).filter(g => g.reduce((x, y) => x + y, 0) <= cap).length;
      return {
        topic: 'Every group, filtered by total', section: 'subsets', strategy: 'in-out',
        prompt: `From the distinct numbers ${arr(a)} you may take any group (taking none counts as a group). Write out every group whose total is at most ${cap}. How many groups are on your list?`,
        question: 'Enter the number of groups.', answer,
        hints: ['Every number is either in the group or out of it. Draw that as a tree, one level per number.', 'Carry the running total down the tree; a branch whose total already exceeds the cap can stop early (all numbers are positive).', `Count the nodes whose total is at most ${cap}, including the empty group.`],
        rubric: ['Each number is decided once (in or out), so each group is reached exactly once.', 'The empty group counts and has total 0.', `There are ${2 ** a.length} groups in all; the walk is O(n · 2ⁿ) at worst.`],
        explanation: `${answer} of the ${2 ** a.length} groups have a total of at most ${cap}.`,
      };
    }
    case 'subsets-dup': {
      const bases = [[1, 2, 2], [1, 2, 2, 3], [4, 4, 4, 1], [2, 1, 2, 1], [5, 5, 6, 6, 6], [3, 3, 3, 3]];
      const base = bases[v % bases.length];
      const a = rotate(base, Math.floor(v / bases.length) % base.length);
      const answer = distinctKeys(chooseAll(a)).size;
      return {
        topic: 'Distinct groups when values repeat', section: 'subsets-ii', strategy: 'from-start',
        prompt: `A drawer holds the tokens ${arr(a)}; tokens with the same number are identical. Write out every different collection of tokens you could take out (taking none counts). How many collections are on your list?`,
        question: 'Enter the number of collections.', answer,
        hints: ['Two identical tokens give the same collection whichever one you take. Line equal values up next to each other first.', 'Add tokens from a start position onward. At one level, a token equal to the one just tried at that level opens nothing new.', 'Skip a token when it is not the first option at its level and equals the token before it.'],
        rubric: ['Sorting puts equal tokens side by side.', 'The skip applies only to the second and later equal options at the SAME level, so collections with two equal tokens survive.', 'Every node is a collection; the empty one counts.'],
        explanation: `There are ${answer} different collections.`,
      };
    }
    case 'combinations-kth': {
      const configs: [number, number][] = [[5, 2], [5, 3], [6, 2], [4, 2], [6, 3]];
      const [n, k] = configs[v % configs.length];
      const all = chooseAll(Array.from({ length: n }, (_, i) => i + 1)).filter(g => g.length === k)
        .sort((x, y) => { for (let i = 0; i < k; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; });
      const m = 1 + ((v * 3 + 2) % all.length);
      const answer = all[m - 1];
      return {
        topic: 'Fixed-size groups, in order', section: 'combinations', strategy: 'from-start',
        prompt: `Write out every way to pick ${k} different numbers from 1 to ${n}, each pick written in increasing order, and the picks listed in dictionary order. What is pick number ${m}?`,
        question: 'Enter the pick, smallest number first.', answer,
        hints: ['Picks starting with 1 come first, then picks starting with 2, and so on.', `Under a first number f, the rest is a pick of ${k - 1} from the numbers above f.`, 'Count how many picks each first number contributes, and skip whole groups until you reach the one you need.'],
        rubric: ['Each pick is built in increasing order, so each set of numbers appears once.', 'The listing order is exactly the order in which a start-index walk records them.', `There are C(${n}, ${k}) = ${all.length} picks in all.`],
        explanation: `Pick number ${m} is ${arr(answer)}.`,
      };
    }
    case 'combo-sum': {
      const bases: [number[], number][] = [[[2, 3, 5], 8], [[2, 3, 6, 7], 7], [[3, 4, 5], 12], [[2, 5], 11], [[1, 3, 4], 6], [[2, 4, 6], 8]];
      const [base, t] = bases[v % bases.length];
      const coins = rotate(base, Math.floor(v / bases.length) % base.length);
      const hands: number[][] = [];
      const sorted = [...coins].sort((a, b) => a - b);
      const walk = (start: number, remain: number, path: number[]) => {
        if (remain === 0) { hands.push([...path]); return; }
        for (let i = start; i < sorted.length && sorted[i] <= remain; i++) { path.push(sorted[i]); walk(i, remain - sorted[i], path); path.pop(); }
      };
      walk(0, t, []);
      const answer = hands.length;
      return {
        topic: 'Reusable values to an exact total', section: 'combination-sum', strategy: 'from-start',
        prompt: `Coins come in values ${arr(coins)}, as many of each as you like. Write out every different handful (order doesn’t matter) worth exactly ${t}. How many handfuls are on your list?`,
        question: 'Enter the number of handfuls.', answer,
        hints: ['Write each handful with its coins in non-decreasing order, so each handful has one spelling.', 'After paying a coin, the next coin may be the same one again, but never a smaller one.', 'With the coins sorted, stop trying coins at a level as soon as one is bigger than what is still owed.'],
        rubric: ['The next coin starts at the same position (reuse), never to the left (no reorderings).', 'Sorted coins let an overshoot end the whole level.', 'A handful is recorded only when exactly nothing is owed.'],
        explanation: `${answer} handful(s): ${hands.map(arr).join(', ') || 'none'}.`,
      };
    }
    case 'letters-kth': {
      const digitsList = ['23', '79', '45', '27', '93', '68'];
      const digits = digitsList[v % digitsList.length];
      const words: string[] = [''];
      let all = words;
      for (const d of digits) all = all.flatMap(p => KEYS[d].split('').map(ch => p + ch));
      const m = 1 + ((v * 5 + 3) % all.length);
      const answer = all[m - 1];
      return {
        topic: 'One menu per position', section: 'letter-combinations', strategy: 'menu',
        prompt: `On an old phone keypad, 2 = abc, 3 = def, 4 = ghi, 5 = jkl, 6 = mno, 7 = pqrs, 8 = tuv, 9 = wxyz. List every two-letter word the digits "${digits}" can spell, in keypad order (the first letter changes slowest). What is word number ${m}?`,
        question: 'Enter the word.', answer,
        hints: ['Each position has its own menu of letters: the letters of its digit.', `Every first letter is followed by all ${KEYS[digits[1]].length} letters of the second digit.`, `Word number m has first letter number ⌈m / ${KEYS[digits[1]].length}⌉.`],
        rubric: ['One level per digit; the options at a level are that digit’s letters.', `There are ${KEYS[digits[0]].length} × ${KEYS[digits[1]].length} = ${all.length} words.`, 'Keypad order is the order a depth-first walk over the menus records them.'],
        explanation: `Word number ${m} is ${answer}.`,
      };
    }
    case 'perm-kth': {
      const bases = [[1, 2, 3], [1, 2, 3, 4], [2, 5, 7], [3, 4, 6, 9]];
      const a = bases[v % bases.length];
      const all = orderings(a);
      const m = 1 + ((v * 7 + 3) % all.length);
      const answer = all[m - 1];
      return {
        topic: 'Every ordering, in generation order', section: 'permutations', strategy: 'orders',
        prompt: `Write out every ordering of ${arr(a)} by filling the positions left to right and, at each position, trying the unused values from smallest to largest. What is ordering number ${m}?`,
        question: 'Enter the ordering.', answer,
        hints: ['Orderings that start with the smallest value come first.', `Each choice of first value is followed by ${all.length / a.length} orderings of the rest.`, 'Divide to find the first value, then repeat on the remaining values.'],
        rubric: ['Every unused value is an option at every position; a used value never is.', `There are ${a.length}! = ${all.length} orderings.`, 'Trying values smallest first lists the orderings in dictionary order.'],
        explanation: `Ordering number ${m} is ${arr(answer)}.`,
      };
    }
    case 'word-search': {
      const bases: [string[], string][] = [[['AB', 'AA'], 'AAB'], [['AB'], 'ABA'], [['ABCE', 'SFCS', 'ADEE'], 'ABCCED'], [['ABCE', 'SFCS', 'ADEE'], 'ABCB'], [['CAT', 'AXA', 'TAC'], 'CATAC'], [['AAA', 'ABA'], 'AABAA'], [['XY', 'ZX'], 'XYXZ']];
      const [rows, word] = bases[v % bases.length];
      const answer = canSpell(rows, word);
      return {
        topic: 'A path of cells, no cell twice', section: 'word-search', strategy: 'grid',
        prompt: `A grid has the rows ${rows.join(' / ')} (top to bottom). Can you spell ${word} by starting on any cell and stepping up, down, left or right, never standing on the same cell twice?`,
        question: 'Enter yes or no.', answer,
        hints: ['Try every cell that holds the first letter as a starting point.', 'From a cell, try the four neighbours for the next letter; a cell already on your current path is off limits.', 'When a path fails, the cells it used become free again for other paths.'],
        rubric: ['Cells on the current path are marked so they are not reused.', 'Marks are lifted when the path backs out, so a failed path never blocks a later one.', 'The work is at most R · C · 3^L for a word of length L.'],
        explanation: answer ? `Yes: ${word} can be traced without reusing a cell.` : `No: every attempt to trace ${word} either runs out of matching neighbours or would need a cell twice.`,
      };
    }
    case 'palindrome': {
      const words = ['aab', 'aaba', 'abba', 'racecar', 'aaaa', 'abcb', 'noon', 'level'];
      const s = words[v % words.length];
      const answer = palCuts(s);
      return {
        topic: 'Cut a string into valid pieces', section: 'palindrome-partitioning', strategy: 'constraint',
        prompt: `In how many ways can the word "${s}" be cut into pieces (keeping every letter, in order) so that every piece reads the same backwards?`,
        question: 'Enter the number of ways.', answer,
        hints: ['Decide where the first piece ends. Which first pieces read the same backwards?', 'After a valid first piece, the rest of the word is the same problem, smaller.', 'Count the ways to finish from each valid first piece and add them up.'],
        rubric: ['The options at each step are the end positions of the next piece.', 'A piece that is not a palindrome is never extended into a full cut.', 'A cut is complete when every letter belongs to a piece.'],
        explanation: `"${s}" has ${answer} such cut(s).`,
      };
    }
    case 'queens': {
      const configs: [number, number][] = [[6, 1], [5, 0], [6, 0], [7, 1], [5, 2], [8, 0], [7, 3], [8, 3]];
      const [n, first] = configs[v % configs.length];
      const answer = queensWithFirst(n, first);
      return {
        topic: 'Pieces that may not attack', section: 'n-queens', strategy: 'constraint',
        prompt: `Place ${n} queens on a ${n} × ${n} board so that no two share a row, column or diagonal. The queen in the top row must stand in column ${first} (columns counted from 0). How many such boards exist?`,
        question: 'Enter the number of boards.', answer,
        hints: ['Every row holds exactly one queen, so decide one row at a time.', 'Squares on one diagonal share r − c; on the other diagonal they share r + c.', 'A square is open when its column and both diagonal labels are unused; undo all three when you lift a queen.'],
        rubric: ['One queen per row; the options at a row are its columns.', 'Column, r − c and r + c are checked in O(1).', 'A dead row sends you back to change the queen in the row above.'],
        explanation: `${answer} board(s) have the top-row queen in column ${first}.`,
      };
    }
    case 'combo-sum-ii': {
      const bases: [number[], number][] = [[[10, 1, 2, 7, 6, 1, 5], 8], [[2, 5, 2, 1, 2], 5], [[1, 1, 1, 2, 2], 4], [[3, 1, 3, 5, 1, 1], 8], [[4, 4, 2, 1, 4, 5, 6], 9]];
      const [base, t] = bases[v % bases.length];
      const cards = rotate(base, Math.floor(v / bases.length) % base.length);
      const answer = distinctKeys(chooseAll(cards).filter(g => g.reduce((x, y) => x + y, 0) === t)).size;
      return {
        topic: 'Each value once, values repeat', section: 'combination-sum-ii', strategy: 'from-start',
        prompt: `The cards ${arr(cards)} each carry a number; each card can be used at most once, and cards with the same number are interchangeable. How many different collections of cards total exactly ${t}?`,
        question: 'Enter the number of collections.', answer,
        hints: ['Two rules at once: each card at most once, and equal cards are interchangeable.', 'Sort the cards. The next card always comes from after the current one.', 'At one level, skip a card equal to the one just tried at that level; stop the level when a card exceeds what is left.'],
        rubric: ['Moving past the current card prevents reuse.', 'The equal-card skip at the same level prevents duplicate collections.', 'Sorted cards allow stopping early on an overshoot.'],
        explanation: `${answer} different collection(s) total ${t}.`,
      };
    }
    case 'perm-dup': {
      const bases = [[1, 1, 2], [1, 1, 2, 2], [1, 1, 2, 2, 3], [3, 3, 3, 1], [1, 2, 2, 2, 2], [5, 5, 6, 6, 7, 7]];
      const a = rotate(bases[v % bases.length], Math.floor(v / bases.length));
      const answer = orderings(a).length;
      return {
        topic: 'Distinct orderings when values repeat', section: 'permutations-ii', strategy: 'orders',
        prompt: `How many different sequences can be formed by lining up all of the tiles ${arr(a)}? Tiles with the same number look identical.`,
        question: 'Enter the number of sequences.', answer,
        hints: ['Swapping two identical tiles does not make a new sequence.', 'Place equal tiles in one fixed order: a tile may go down only after its identical twin to the left already has.', 'Or count directly: n! divided by the factorial of each value’s count.'],
        rubric: ['Equal values are placed in index order, so each distinct sequence is built once.', 'A twin whose left twin is not yet placed is skipped.', 'The count matches n! / (c₁! · c₂! · …).'],
        explanation: `${answer} different sequence(s).`,
      };
    }
    case 'parens': {
      const configs: [number, number][] = [[3, 2], [4, 2], [3, 1], [4, 3], [5, 2], [3, 3], [4, 4]];
      const [n, depth] = configs[v % configs.length];
      const answer = bracketCount(n, depth);
      return {
        topic: 'Balanced strings with a cap', section: 'generate-parentheses', strategy: 'constraint',
        prompt: `How many strings of ${n} opening and ${n} closing brackets are well formed (every closer matches an earlier opener) and never have more than ${depth} brackets open at once?`,
        question: 'Enter the number of strings.', answer,
        hints: ['Build the string one bracket at a time. When is an opener allowed? When is a closer?', 'An opener needs one still unused and fewer than the cap currently open. A closer needs an unmatched opener.', 'With both rules enforced at every step, every partial string you build can still be finished.'],
        rubric: ['Opener allowed while opened < n and open − closed < cap.', 'Closer allowed while closed < opened.', 'Record when the string has 2n brackets.'],
        explanation: `${answer} string(s) qualify.`,
      };
    }
    case 'combo-sum-iii': {
      const configs: [number, number][] = [[3, 9], [3, 7], [2, 10], [4, 20], [3, 15], [4, 1], [2, 17], [5, 25]];
      const [k, n] = configs[v % configs.length];
      const answer = chooseAll([1, 2, 3, 4, 5, 6, 7, 8, 9]).filter(g => g.length === k && g.reduce((x, y) => x + y, 0) === n).length;
      return {
        topic: 'Exactly k numbers to an exact total', section: 'combination-sum-iii', strategy: 'from-start',
        prompt: `Choose exactly ${k} different numbers from 1 to 9 so that they add up to exactly ${n}. How many different choices are there?`,
        question: 'Enter the number of choices.', answer,
        hints: ['Write each choice in increasing order so each has one spelling.', 'Track how many numbers are still needed and how much total is still owed.', 'Stop a level when the next number exceeds what is owed; record only at exactly k numbers and nothing owed.'],
        rubric: ['Numbers increase along a choice, so no choice is listed twice.', 'Both limits are checked: the count and the total.', `At most C(9, ${k}) choices exist, so the work is tiny.`],
        explanation: `${answer} choice(s).`,
      };
    }
    case 'ip': {
      const list = ['25525511135', '0000', '101023', '1111', '010010', '19216811', '255255255255', '12300'];
      const s = list[v % list.length];
      const answer = addresses(s);
      return {
        topic: 'A fixed number of valid pieces', section: 'restore-ip', strategy: 'constraint',
        prompt: `The digits "${s}" are an address with its three dots rubbed off. Each of the four parts must be a number from 0 to 255 written without leading zeros ("0" is fine, "01" is not). How many different addresses could it have been?`,
        question: 'Enter the number of addresses.', answer,
        hints: ['Each part is 1, 2 or 3 digits long. Choose the parts left to right.', 'A part longer than one digit cannot start with 0, and no part may exceed 255.', 'With p parts still to place, the digits left must number between p and 3p.'],
        rubric: ['Options at each step are the next part’s length.', 'Invalid parts are rejected before going further.', 'An address is complete with exactly 4 parts using every digit.'],
        explanation: `${answer} address(es).`,
      };
    }
    case 'k-partition': {
      const bases: [number[], number][] = [[[4, 3, 2, 3, 5, 2, 1], 4], [[1, 2, 3, 4], 3], [[2, 2, 2, 2, 3, 4, 5], 4], [[1, 1, 1, 1, 2, 2, 2, 2], 4], [[5, 5, 4, 3, 3], 2], [[3, 3, 3, 3, 6], 3], [[10, 10, 10, 7, 7, 7, 6, 6, 6], 3]];
      const [base, k] = bases[v % bases.length];
      const a = rotate(base, Math.floor(v / bases.length) % base.length);
      const answer = equalShares(a, k);
      return {
        topic: 'Equal buckets', section: 'k-partition', strategy: 'constraint',
        prompt: `Can the coins ${arr(a)} be split among ${k} heirs so that every heir gets the same total? Every coin must go to someone.`,
        question: 'Enter yes or no.', answer,
        hints: ['Each heir must get exactly the grand total divided by the number of heirs.', 'Give out the biggest coins first; an heir may not go over the share.', 'If a coin fails with an heir who has nothing yet, it will fail with every other heir who has nothing.'],
        rubric: ['Quick no: the total must divide evenly, and no coin may exceed one share.', 'Coins go into buckets that never overflow; when every coin is placed, every bucket is full.', 'Biggest-first and the empty-bucket rule cut the search sharply.'],
        explanation: answer ? 'Yes: the coins can be split into equal shares.' : 'No: no assignment gives every heir the same total.',
      };
    }
    case 'count-ways': {
      const bases: [number[], number][] = [[[1, 2, 5], 11], [[2, 3, 5], 12], [[1, 5, 10], 17], [[3, 4, 7], 20], [[2, 5, 10], 25]];
      const [coins, price] = bases[v % bases.length];
      const answer = countHandfuls(coins, price);
      return {
        topic: 'Know when to choose another tool', section: 'choose-the-tool', strategy: 'other',
        prompt: `A vending machine takes coins of values ${arr(coins)} (unlimited supply). For each price it displays only the NUMBER of different handfuls (order doesn’t matter) worth exactly that price — and prices go up to 10,000. What does it display for a price of ${price}?`,
        question: 'Enter the number displayed.', answer,
        hints: ['Only a number is needed, and prices reach 10,000. Writing out every handful would take forever.', 'Let ways[x] be the number of handfuls worth x. How does adding one coin type change ways[]?', 'For each coin c, for x from c up to the price: ways[x] += ways[x − c]. Start with ways[0] = 1.'],
        rubric: ['Counting does not require listing; the count can be astronomically larger than the work.', 'A table over amounts, filled one coin type at a time, counts each handful once.', 'O(coins × price) time, O(price) space.'],
        explanation: `${answer} handfuls. Listing them one by one is exponential; a table over amounts counts them in O(coins × price).`,
      };
    }
    case 'fewest-moves': {
      const mazes = [['.#..', '...#', '#...'], ['..#', '#..', '...'], ['....', '.##.', '....'], ['.#.', '.#.', '...'], ['..', '#.']];
      const rows = mazes[v % mazes.length];
      const answer = fewestMoves(rows);
      return {
        topic: 'Know when to choose another tool', section: 'choose-the-tool', strategy: 'other',
        prompt: `A maze has the rows ${rows.join(' / ')} (top to bottom; # is a wall, . is open). Moving up, down, left or right, what is the fewest number of moves from the top-left corner to the bottom-right corner? Answer −1 if it can’t be done.`,
        question: 'Enter the number of moves.', answer,
        hints: ['Walking every possible route and keeping the shortest explores far too many routes.', 'Explore in rings: every cell 1 move away, then every cell 2 moves away, and so on.', 'The first time the ring reaches the bottom-right corner, its distance is the answer.'],
        rubric: ['Fewest moves in an unweighted grid is a shortest-path question.', 'A queue processes cells in order of distance; each cell is visited once.', 'O(rows × cols) time, far better than trying every path.'],
        explanation: `The fewest moves is ${answer}. Exploring ring by ring finds it with each cell visited once.`,
      };
    }
  }
}

export function challengeFor(id: string, variant = 0): Challenge {
  return { id, question: 'Enter only the result.', ...make(id as ConceptId, variant) };
}

export const practice: PracticeSet = {
  storageKey: 'citadel-backtracking-review-v1',
  strategies,
  conceptIds,
  challengeFor,
};
