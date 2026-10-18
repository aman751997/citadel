// Dry-run frames for every problem in src/dsa-lessons/dp-2d.mdx. Each generator replays the lesson's
// algorithm on a small input, one table cell per frame, and ends with a text view holding `answer`
// (pinned against brute-force oracles in tests/dp-2d-frames.test.ts).
import { recorder, tvars, type Frame, type GridView, type View, type Val, type Predict, type CellTone } from '../../lib/dryrun.ts';

type Tone = { r: number; c: number; tone: CellTone };
type Cell = Val | null;
const show = (x: number): Val => (x === -Infinity ? '−∞' : x);
const J = (x: unknown) => JSON.stringify(x);
const T = (r: number, c: number, tone: CellTone): Tone => ({ r, c, tone });
const yes = '✓', no = '·';
const mark = (b: boolean) => (b ? yes : no);

function grid(name: string, cells: Cell[][], rowLabels: Val[], colLabels: Val[], tones: Tone[] = []): GridView {
  return { kind: 'grid', name, cells: cells.map(row => [...row]), rowLabels, colLabels, tones };
}

// Three numeric choices with the right one rotated by `salt` so it is not always first.
function numQ(question: string, right: number, salt: number, explain: string): Predict {
  const list = [right, right + 1, right - 1].map(String);
  const shift = ((salt % 3) + 3) % 3;
  const options = list.map((_, k) => list[(k + 3 - shift) % 3]);
  return { question, options, answer: options.indexOf(String(right)), explain };
}
const boolQ = (question: string, right: boolean, explain: string): Predict => ({ question, options: [yes, no], answer: right ? 0 : 1, explain });

// ---- Unique Paths ------------------------------------------------------------------------------
// Final text var `answer` = number of routes in an m x n grid.
export function pathsFrames(m: number, n: number): Frame[] {
  const r = recorder();
  const t: Cell[][] = Array.from({ length: m }, (_, i) => Array.from({ length: n }, (_, j) => (i === 0 || j === 0 ? 1 : null)));
  const rows = Array.from({ length: m }, (_, i) => i), cols = Array.from({ length: n }, (_, j) => j);
  const view = (tones: Tone[] = []) => grid('dp[r][c] = routes from the start to (r, c)', t, rows, cols, tones);
  r.frame('dp[r][c] counts the routes from the top-left to (r, c). The top row and left column can only be reached by going straight, so each holds exactly 1 route.', [view()]);
  let k = 0;
  for (let i = 1; i < m; i++) for (let j = 1; j < n; j++) {
    const up = t[i - 1][j] as number, left = t[i][j - 1] as number, v = up + left;
    t[i][j] = v;
    r.frame(`(${i}, ${j}): the last step came from above (${up} routes) or from the left (${left} routes). The two groups never overlap, so add: ${up} + ${left} = ${v}.`,
      [view([T(i - 1, j, 'compared'), T(i, j - 1, 'compared'), T(i, j, 'active')])],
      numQ(`Above holds ${up}, left holds ${left}. What goes in (${i}, ${j})?`, v, k++, `Routes add: ${up} + ${left} = ${v}.`));
  }
  const ans = t[m - 1][n - 1] as number;
  r.frame(`The answer sits in the far corner: ${ans} routes.`, [view([T(m - 1, n - 1, 'found')]), tvars({ answer: ans })]);
  return r.frames;
}

// Memoised recursion on the same grid. Final text var `answer` = routes, `hits` = memo hits.
export function pathsMemoFrames(m: number, n: number): Frame[] {
  const r = recorder();
  type RN = { id: string; parent?: string; label: string; edge?: string; tone: 'exploring' | 'pruned' | 'solution' };
  const nodes: RN[] = [], memo = new Map<string, number>();
  let id = 0, hits = 0;
  const snap = (): View => ({ kind: 'recursion', name: 'calls to paths(r, c)', nodes: nodes.map(x => ({ ...x })) });
  const go = (rr: number, cc: number, parent?: string, edge?: string): number => {
    const key = `${rr},${cc}`, node: RN = { id: `n${id++}`, parent, edge, label: `(${rr},${cc})`, tone: 'exploring' };
    nodes.push(node);
    const hit = memo.get(key);
    if (hit !== undefined) {
      hits++; node.tone = 'pruned'; node.label = `(${rr},${cc}) = ${hit} memo`;
      r.frame(`paths(${rr}, ${cc}) was already solved and is in the memo, so it returns ${hit} at once. This repeat is exactly what the plain recursion would have recomputed.`, [snap()]);
      return hit;
    }
    if (rr === 0 || cc === 0) {
      node.tone = 'solution'; node.label = `(${rr},${cc}) = 1`; memo.set(key, 1);
      r.frame(`(${rr}, ${cc}) is on the top row or left column: one straight route. Base case, return 1.`, [snap()]);
      return 1;
    }
    r.frame(`paths(${rr}, ${cc}) is not in the memo. It asks about the square above and the square to the left.`, [snap()]);
    const v = go(rr - 1, cc, node.id, 'up') + go(rr, cc - 1, node.id, 'left');
    node.tone = 'solution'; node.label = `(${rr},${cc}) = ${v}`; memo.set(key, v);
    r.frame(`Both children are back, so paths(${rr}, ${cc}) = up + left = ${v}. Save it in the memo.`, [snap()]);
    return v;
  };
  const ans = go(m - 1, n - 1);
  r.frame(`The root returns ${ans}. Dashed grey nodes are memo hits: each repeated question is answered without a new subtree.`, [snap(), tvars({ answer: ans, hits })]);
  return r.frames;
}

// ---- Longest Common Subsequence ----------------------------------------------------------------
// Final text vars: `answer` = LCS length, `subsequence` = one LCS read back from the table.
export function lcsFrames(a: string, b: string): Frame[] {
  const n = a.length, m = b.length, r = recorder();
  const t: Cell[][] = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: m + 1 }, (_, j) => (i === 0 || j === 0 ? 0 : null)));
  const rows = ['∅', ...a], cols = ['∅', ...b];
  const num = (i: number, j: number) => t[i][j] as number;
  const view = (tones: Tone[] = []) => grid('dp[i][j] = LCS of the first i letters of A and the first j of B', t, rows, cols, tones);
  r.frame('Row 0 and column 0 are the empty prefixes. A list with nothing read shares nothing with anything, so they hold 0.', [view()]);
  let k = 0;
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
    if (a[i - 1] === b[j - 1]) {
      const d = num(i - 1, j - 1), v = d + 1;
      t[i][j] = v;
      r.frame(`(${i}, ${j}): ${a[i - 1]} and ${b[j - 1]} match, so both can end a common subsequence. Take the diagonal and add 1: ${d} + 1 = ${v}.`,
        [view([T(i - 1, j - 1, 'compared'), T(i, j, 'active')])], numQ(`${a[i - 1]} meets ${b[j - 1]}: a match. The diagonal holds ${d}. What goes in (${i}, ${j})?`, v, k++, `Match: diagonal + 1 = ${v}.`));
    } else {
      const up = num(i - 1, j), left = num(i, j - 1), v = Math.max(up, left);
      t[i][j] = v;
      r.frame(`(${i}, ${j}): ${a[i - 1]} and ${b[j - 1]} differ, so at least one of them is left out. Drop A's letter (up ${up}) or B's (left ${left}) and keep the larger: ${v}.`,
        [view([T(i - 1, j, 'compared'), T(i, j - 1, 'compared'), T(i, j, 'active')])], numQ(`${a[i - 1]} meets ${b[j - 1]}: no match. Up holds ${up}, left holds ${left}. What goes in (${i}, ${j})?`, v, k++, `No match: max(${up}, ${left}) = ${v}.`));
    }
  }
  const ans = num(n, m);
  r.frame(`The table is full: the LCS has length dp[${n}][${m}] = ${ans}. Now walk back from the corner to read the letters themselves.`, [view([T(n, m, 'found')])]);
  let i = n, j = m, kept = '';
  const trail: Tone[] = [];
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      kept = a[i - 1] + kept; trail.push(T(i, j, 'found'));
      r.frame(`(${i}, ${j}): ${a[i - 1]} = ${b[j - 1]}, so this square was built from the diagonal. Keep the letter ${a[i - 1]} and step up-left. Kept so far, front to back: ${kept}.`, [view([...trail, T(i - 1, j - 1, 'active')])]);
      i--; j--;
    } else if (num(i - 1, j) >= num(i, j - 1)) {
      trail.push(T(i, j, 'visited'));
      r.frame(`(${i}, ${j}): the letters differ and up (${num(i - 1, j)}) is at least left (${num(i, j - 1)}), so the value came from above. Step up and keep nothing.`, [view([...trail, T(i - 1, j, 'active')])]);
      i--;
    } else {
      trail.push(T(i, j, 'visited'));
      r.frame(`(${i}, ${j}): the letters differ and left (${num(i, j - 1)}) is larger than up (${num(i - 1, j)}), so the value came from the left. Step left and keep nothing.`, [view([...trail, T(i, j - 1, 'active')])]);
      j--;
    }
  }
  r.frame(`A row or column hit 0, so the walk is over. The kept letters, read front to back, are "${kept}".`, [view(trail), tvars({ answer: ans, subsequence: kept })]);
  return r.frames;
}

// ---- Edit Distance -----------------------------------------------------------------------------
// Final text vars: `answer` = distance, `script` = JSON array of "keep x" / "replace x->y" / "delete x" / "insert y".
export function editFrames(a: string, b: string): Frame[] {
  const n = a.length, m = b.length, r = recorder();
  const t: Cell[][] = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: m + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : null)));
  const rows = ['∅', ...a], cols = ['∅', ...b];
  const num = (i: number, j: number) => t[i][j] as number;
  const view = (tones: Tone[] = []) => grid('dp[i][j] = fewest edits: first i letters of A to first j of B', t, rows, cols, tones);
  r.frame('Row 0 and column 0 are not zeros here. Turning i letters into nothing costs i deletes; building j letters from nothing costs j inserts.', [view()]);
  let k = 0;
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
    if (a[i - 1] === b[j - 1]) {
      const v = num(i - 1, j - 1);
      t[i][j] = v;
      r.frame(`(${i}, ${j}): ${a[i - 1]} and ${b[j - 1]} agree, so the last letters cost nothing. Copy the diagonal: ${v}.`,
        [view([T(i - 1, j - 1, 'compared'), T(i, j, 'active')])], numQ(`${a[i - 1]} = ${b[j - 1]}. The diagonal holds ${v}. What goes in (${i}, ${j})?`, v, k++, `Equal letters: copy the diagonal for free.`));
    } else {
      const d = num(i - 1, j - 1), u = num(i - 1, j), l = num(i, j - 1), v = 1 + Math.min(d, u, l);
      t[i][j] = v;
      r.frame(`(${i}, ${j}): ${a[i - 1]} and ${b[j - 1]} differ. The last edit is a replace (diagonal ${d}), a delete (up ${u}) or an insert (left ${l}). Each costs 1 more than its neighbour: 1 + min = ${v}.`,
        [view([T(i - 1, j - 1, 'compared'), T(i - 1, j, 'compared'), T(i, j - 1, 'compared'), T(i, j, 'active')])],
        numQ(`Diagonal ${d}, up ${u}, left ${l}. What goes in (${i}, ${j})?`, v, k++, `1 + min(${d}, ${u}, ${l}) = ${v}.`));
    }
  }
  const ans = num(n, m);
  r.frame(`The table is full: the cheapest conversion costs dp[${n}][${m}] = ${ans}. Walk back to recover the actual edits.`, [view([T(n, m, 'found')])]);
  let i = n, j = m;
  const ops: string[] = [], trail: Tone[] = [];
  while (i > 0 || j > 0) {
    trail.push(T(i, j, 'found'));
    let op: string, why: string, ni = i, nj = j;
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) { op = `keep ${a[i - 1]}`; why = 'the letters agree, so the value came free from the diagonal'; ni--; nj--; }
    else if (i > 0 && j > 0 && num(i, j) === num(i - 1, j - 1) + 1) { op = `replace ${a[i - 1]}->${b[j - 1]}`; why = 'the value is the diagonal plus 1: a replace'; ni--; nj--; }
    else if (i > 0 && num(i, j) === num(i - 1, j) + 1) { op = `delete ${a[i - 1]}`; why = 'the value is the cell above plus 1: a delete'; ni--; }
    else { op = `insert ${b[j - 1]}`; why = 'the value is the cell to the left plus 1: an insert'; nj--; }
    ops.unshift(op);
    r.frame(`(${i}, ${j}): ${why}. Edit: ${op}.`, [view([...trail, T(ni, nj, 'active')])]);
    i = ni; j = nj;
  }
  r.frame(`The walk reached (0, 0). Read the edits front to back: ${ops.join(', ')}. ${ans} of them cost a move.`, [view(trail), tvars({ answer: ans, script: J(ops) })]);
  return r.frames;
}

// ---- Partition Equal Subset Sum ----------------------------------------------------------------
// Table version. Final text var `answer` = true/false.
export function partitionFrames(nums: number[]): Frame[] {
  const r = recorder(), total = nums.reduce((x, y) => x + y, 0);
  if (total % 2) {
    r.frame(`The total is ${total}, which is odd. Two equal halves are impossible, so there is nothing to tabulate.`, [tvars({ total })]);
    r.frame('Answer: false, the crates cannot be split evenly.', [tvars({ total, answer: 'false' })]);
    return r.frames;
  }
  const T0 = total / 2, n = nums.length;
  const t: Cell[][] = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: T0 + 1 }, (_, s) => (i === 0 ? mark(s === 0) : s === 0 ? yes : null)));
  const rows = ['none', ...nums.map(w => `+${w}`)], cols = Array.from({ length: T0 + 1 }, (_, s) => s);
  const view = (tones: Tone[] = []) => grid('dp[i][s] = some of the first i crates weigh exactly s', t, rows, cols, tones);
  r.frame(`The total is ${total}, so each side must weigh ${T0}. With no crates only total 0 is possible. Total 0 is also possible after any crate: take none of them.`, [view()]);
  for (let i = 1; i <= n; i++) for (let s = 1; s <= T0; s++) {
    const w = nums[i - 1], skip = t[i - 1][s] === yes, canTake = s >= w, take = canTake && t[i - 1][s - w] === yes, v = skip || take;
    t[i][s] = mark(v);
    const tones = [T(i - 1, s, 'compared'), ...(canTake ? [T(i - 1, s - w, 'compared')] : []), T(i, s, 'active')];
    const why = canTake
      ? `Crate ${w}: skip it (row above, total ${s}: ${mark(skip)}) or take it (row above, total ${s - w}: ${mark(take)}). Either is enough.`
      : `Crate ${w} is heavier than ${s}, so it cannot be taken. Copy the cell above: ${mark(skip)}.`;
    r.frame(`(${rows[i]}, ${s}): ${why} Result: ${mark(v)}.`, [view(tones)], boolQ(`Row ${rows[i]}, total ${s}. Is some group of these crates exactly ${s}?`, v, v ? 'At least one of skip or take is possible.' : 'Neither skip nor take reaches this total.'));
  }
  const ans = t[n][T0] === yes;
  r.frame(`The answer is dp[${n}][${T0}] = ${mark(ans)}: ${ans ? `some crates weigh exactly ${T0}, so the rest weigh ${T0} too` : `no group weighs ${T0}`}.`, [view([T(n, T0, 'found')]), tvars({ answer: String(ans) })]);
  return r.frames;
}

// One row of paper, one frame per square, sweeping each crate DOWN (correct) or UP (the bug).
// Final text var `answer` = dp[target] as true/false.
export function subsetRowFrames(nums: number[], target: number, dir: 'down' | 'up'): Frame[] {
  const r = recorder();
  const dp = Array.from({ length: target + 1 }, (_, s) => s === 0);
  const view = (pointers: { at: number; label: string; tone?: 'blue' | 'green' }[] = [], tones: Record<number, CellTone> = {}): View =>
    ({ kind: 'array', name: `dp[s] (sweeping ${dir === 'down' ? 'downwards' : 'upwards'})`, values: dp.map(mark), pointers, tones });
  r.frame(`One row of paper: dp[s] says whether some crates so far total s. Only total 0 is possible before any crate. Sweep direction: ${dir === 'down' ? 'downwards' : 'upwards (this is the bug)'}.`, [view()]);
  for (const w of nums) {
    if (w > target) { r.frame(`Crate ${w} is heavier than ${target}, so it cannot be in the group. Nothing changes.`, [view()]); continue; }
    const order = Array.from({ length: target - w + 1 }, (_, k) => (dir === 'down' ? target - k : w + k));
    for (const s of order) {
      const old = dp[s], src = dp[s - w], v = old || src;
      dp[s] = v;
      const note = dir === 'down'
        ? `dp[${s - w}] still describes the crates BEFORE this one.`
        : `dp[${s - w}] may already include this very crate, because the sweep reached it first.`;
      r.frame(`Crate ${w}, s = ${s}: dp[${s}] was ${mark(old)}, dp[${s - w}] is ${mark(src)}. ${note} dp[${s}] becomes ${mark(v)}.`,
        [view([{ at: s, label: 's', tone: 'blue' }, { at: s - w, label: 's-w', tone: 'green' }], { [s - w]: 'compared', [s]: 'active' })],
        boolQ(`Crate ${w}, s = ${s}. dp[${s}] is ${mark(old)}, dp[${s - w}] is ${mark(src)}. What is dp[${s}] after this step?`, v, v ? 'Already reachable, or reachable by adding this crate.' : 'Not reachable before, and dp[s-w] is not reachable either.'));
    }
  }
  r.frame(`All crates are swept. dp[${target}] = ${mark(dp[target])}.`, [view([{ at: target, label: 'target', tone: 'blue' }]), tvars({ answer: String(dp[target]) })]);
  return r.frames;
}

// ---- Coin Change II ----------------------------------------------------------------------------
// Final text var `answer` = number of combinations.
export function coinsFrames(amount: number, coins: number[]): Frame[] {
  const n = coins.length, r = recorder();
  const t: Cell[][] = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: amount + 1 }, (_, a) => (a === 0 ? 1 : i === 0 ? 0 : null)));
  const rows = ['none', ...coins.map((_, i) => `{${coins.slice(0, i + 1).join(',')}}`)], cols = Array.from({ length: amount + 1 }, (_, a) => a);
  const num = (i: number, a: number) => t[i][a] as number;
  const view = (tones: Tone[] = []) => grid('dp[i][a] = combinations of the first i coin types that make a', t, rows, cols, tones);
  r.frame('With no coin types only amount 0 can be paid, by taking nothing: one way. Amount 0 is one way in every row.', [view()]);
  let k = 0;
  for (let i = 1; i <= n; i++) for (let a = 1; a <= amount; a++) {
    const c = coins[i - 1], none = num(i - 1, a), more = a >= c ? num(i, a - c) : 0, v = none + more;
    t[i][a] = v;
    const tones = [T(i - 1, a, 'compared'), ...(a >= c ? [T(i, a - c, 'compared')] : []), T(i, a, 'active')];
    const why = a >= c
      ? `no coin ${c} at all (row above: ${none}) plus at least one coin ${c} (take one off, the same row at ${a - c}: ${more}).`
      : `coin ${c} is bigger than ${a}, so only the row above counts: ${none}.`;
    r.frame(`(${rows[i]}, ${a}): ${why} Add: ${v}.`, [view(tones)], numQ(`Row ${rows[i]}, amount ${a}: up ${none}, same-row cell ${a >= c ? more : 'n/a (0)'}. What goes in?`, v, k++, `${none} + ${more} = ${v}.`));
  }
  const ans = num(n, amount);
  r.frame(`The answer is dp[${n}][${amount}] = ${ans} combinations.`, [view([T(n, amount, 'found')]), tvars({ answer: ans })]);
  return r.frames;
}

// ---- Best Time to Buy and Sell Stock with Cooldown ---------------------------------------------
// Final text var `answer` = best profit.
export function cooldownFrames(prices: number[]): Frame[] {
  const n = prices.length, r = recorder();
  const hold: number[] = [], sold: number[] = [], rest: number[] = [];
  const cells = (upto: number): Cell[][] => [hold, sold, rest].map(row => Array.from({ length: n }, (_, d) => (d < upto ? show(row[d]) : null)));
  const cols = prices.map((p, d) => `${d} · ${p}`);
  const view = (upto: number, tones: Tone[] = []) => grid('best cash at the end of each day, per state', cells(upto), ['hold', 'sold', 'rest'], cols, tones);
  hold[0] = -prices[0]; sold[0] = -Infinity; rest[0] = 0;
  r.frame(`Day 0 (price ${prices[0]}): hold = ${-prices[0]} (bought), sold is impossible (nothing to sell yet, so −∞), rest = 0.`, [view(1, [T(0, 0, 'active'), T(1, 0, 'active'), T(2, 0, 'active')])]);
  for (let d = 1; d < n; d++) {
    const p = prices[d];
    hold[d] = Math.max(hold[d - 1], rest[d - 1] - p);
    sold[d] = hold[d - 1] + p;
    rest[d] = Math.max(rest[d - 1], sold[d - 1]);
    r.frame(`Day ${d} (price ${p}), reading yesterday only. hold = max(keep ${show(hold[d - 1])}, buy out of REST ${show(rest[d - 1])} - ${p}) = ${show(hold[d])}. sold = hold ${show(hold[d - 1])} + ${p} = ${show(sold[d])}. rest = max(rest ${show(rest[d - 1])}, finished cooldown ${show(sold[d - 1])}) = ${show(rest[d])}.`,
      [view(d + 1, [T(0, d - 1, 'compared'), T(1, d - 1, 'compared'), T(2, d - 1, 'compared'), T(0, d, 'active'), T(1, d, 'active'), T(2, d, 'active')])],
      numQ(`Day ${d}, price ${p}. Yesterday: hold ${show(hold[d - 1])}, sold ${show(sold[d - 1])}, rest ${show(rest[d - 1])}. What is hold today?`, hold[d], d, `max(${show(hold[d - 1])}, ${show(rest[d - 1])} - ${p}) = ${show(hold[d])}. Buying is only allowed out of rest, never out of sold.`));
  }
  const ans = Math.max(sold[n - 1], rest[n - 1]);
  r.frame(`End empty-handed: max(sold ${show(sold[n - 1])}, rest ${show(rest[n - 1])}) = ${ans}. Ending in hold would mean paying for a share you never sold.`, [view(n, [T(1, n - 1, 'found'), T(2, n - 1, 'found')]), tvars({ answer: ans })]);
  return r.frames;
}

// ---- Longest Increasing Path in a Matrix -------------------------------------------------------
// Final text var `answer` = longest strictly increasing walk (in squares).
export function climbFrames(m: number[][]): Frame[] {
  const rows = m.length, cols = m[0].length, r = recorder();
  const memo: (number | null)[][] = m.map(row => row.map(() => null));
  const rl = m.map((_, i) => i), cl = m[0].map((_, j) => j);
  const views = (tones: Tone[]): View[] => [grid('heights', m, rl, cl, tones), grid('climb(r, c) = longest climb starting here (the memo)', memo, rl, cl, tones)];
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  r.frame('Each square will get one number: the longest strictly increasing walk that STARTS there. The memo is empty. We ask about squares one at a time, and each question first asks the higher neighbours.', views([]));
  const climb = (rr: number, cc: number): number => {
    if (memo[rr][cc] !== null) return memo[rr][cc]!;
    const higher: { r: number; c: number; v: number; cached: boolean }[] = [];
    for (const [dr, dc] of DIRS) {
      const nr = rr + dr, nc = cc + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && m[nr][nc] > m[rr][cc]) {
        const cached = memo[nr][nc] !== null;
        higher.push({ r: nr, c: nc, v: climb(nr, nc), cached });
      }
    }
    const best = 1 + Math.max(0, ...higher.map(h => h.v));
    memo[rr][cc] = best;
    const nb = higher.map(h => `(${h.r}, ${h.c}) height ${m[h.r][h.c]} = ${h.v}${h.cached ? ' from the memo' : ''}`).join('; ');
    const tones = [...higher.map(h => T(h.r, h.c, 'compared')), T(rr, cc, 'active')];
    r.frame(higher.length
      ? `(${rr}, ${cc}) has height ${m[rr][cc]}. Strictly higher neighbours: ${nb}. Climb = 1 + max = ${best}.`
      : `(${rr}, ${cc}) has height ${m[rr][cc]} and no strictly higher neighbour (equal does not count). It is a peak: climb = 1.`,
      views(tones), higher.length ? numQ(`Height ${m[rr][cc]}. Higher neighbours have climbs ${higher.map(h => h.v).join(', ')}. What is climb(${rr}, ${cc})?`, best, rr + cc, `1 + ${Math.max(...higher.map(h => h.v))} = ${best}.`) : undefined);
    return best;
  };
  let ans = 0, at: [number, number] = [0, 0];
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) { const v = climb(i, j); if (v > ans) { ans = v; at = [i, j]; } }
  r.frame(`Every square has been asked. The answer is the largest value in the memo: ${ans}, starting at (${at[0]}, ${at[1]}).`, [...views([T(at[0], at[1], 'found')]), tvars({ answer: ans })]);
  return r.frames;
}

// ---- Burst Balloons ----------------------------------------------------------------------------
// Final text var `answer` = max coins.
export function balloonsFrames(nums: number[]): Frame[] {
  const n = nums.length, r = recorder();
  const v = [1, ...nums, 1];
  const t: Cell[][] = Array.from({ length: n + 2 }, (_, i) => Array.from({ length: n + 2 }, (_, j) => (j === i + 1 ? 0 : null)));
  const lab = v.map((x, i) => `${i} · ${x}`);
  const num = (i: number, j: number) => t[i][j] as number;
  const view = (tones: Tone[] = []) => grid('dp[i][j] = best coins for the balloons strictly between walls i and j', t, lab, lab, tones);
  r.frame(`Pad the row with a 1 at each end: [${v.join(', ')}]. Adjacent walls have nothing between them, so dp[i][i+1] = 0. Fill by gap length j - i, shortest first.`, [view()]);
  for (let len = 2; len <= n + 1; len++) for (let i = 0; i + len <= n + 1; i++) {
    const j = i + len;
    let best = -1, bk = i + 1;
    const cand: string[] = [];
    for (let k = i + 1; k < j; k++) {
      const val = num(i, k) + v[i] * v[k] * v[j] + num(k, j);
      cand.push(`k=${k} (${v[k]}): ${num(i, k)} + ${v[i]}x${v[k]}x${v[j]} + ${num(k, j)} = ${val}`);
      if (val > best) { best = val; bk = k; }
    }
    t[i][j] = best;
    r.frame(`dp[${i}][${j}]: which balloon between walls ${v[i]} and ${v[j]} bursts LAST? ${cand.join('; ')}. Best is k = ${bk}: ${best}.`,
      [view([T(i, bk, 'compared'), T(bk, j, 'compared'), T(i, j, 'active')])], numQ(`Walls ${i} and ${j}. Trying every last balloon k, what is the best total?`, best, i + j, `The maximum over k is ${best}, at k = ${bk}.`));
  }
  const ans = num(0, n + 1);
  r.frame(`The answer is dp[0][${n + 1}] = ${ans}: every balloon between the two outer walls.`, [view([T(0, n + 1, 'found')]), tvars({ answer: ans })]);
  return r.frames;
}

// ---- Side quest: Unique Paths II ---------------------------------------------------------------
// `grid`: 1 = rock. Final text var `answer` = routes avoiding rocks.
export function obstaclesFrames(g: number[][]): Frame[] {
  const m = g.length, n = g[0].length, r = recorder();
  const dp: number[][] = g.map(row => row.map(() => 0));
  const cells = (upto: number): Cell[][] => g.map((row, i) => row.map((x, j) => (i * n + j >= upto ? null : x === 1 ? 'X' : dp[i][j])));
  const rl = g.map((_, i) => i), cl = g[0].map((_, j) => j);
  const view = (upto: number, tones: Tone[] = []) => grid('dp[r][c] = routes to (r, c); X is a rock', cells(upto), rl, cl, tones);
  r.frame('Rocks are marked X. Every square is computed, including the top row and left column: a rock there cuts off everything beyond it, so the edges cannot be pre-filled with 1.', [view(0)]);
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) {
    const idx = i * n + j + 1, up = i > 0 ? dp[i - 1][j] : 0, left = j > 0 ? dp[i][j - 1] : 0;
    let why: string;
    if (g[i][j] === 1) { dp[i][j] = 0; why = 'a rock: no route can end here, so 0'; }
    else if (i === 0 && j === 0) { dp[i][j] = 1; why = 'the start is open: one route, the empty one'; }
    else { dp[i][j] = up + left; why = `up ${up} + left ${left} = ${up + left}${i === 0 || j === 0 ? ' (the missing neighbour off the grid counts as 0)' : ''}`; }
    const tones = [...(i > 0 ? [T(i - 1, j, 'compared')] : []), ...(j > 0 ? [T(i, j - 1, 'compared')] : []), T(i, j, g[i][j] === 1 ? 'out' : 'active')];
    r.frame(`(${i}, ${j}): ${why}.`, [view(idx, tones)], g[i][j] === 1 || (i === 0 && j === 0) ? undefined : numQ(`Up ${up}, left ${left}. What goes in (${i}, ${j})?`, dp[i][j], i + j, `${up} + ${left} = ${dp[i][j]}.`));
  }
  r.frame(`The corner holds ${dp[m - 1][n - 1]} routes that avoid every rock.`, [view(m * n, [T(m - 1, n - 1, 'found')]), tvars({ answer: dp[m - 1][n - 1] })]);
  return r.frames;
}

// ---- Side quest: Minimum Path Sum --------------------------------------------------------------
// Final text var `answer` = cheapest route cost.
export function minPathFrames(g: number[][]): Frame[] {
  const m = g.length, n = g[0].length, r = recorder();
  const dp: Cell[][] = g.map(row => row.map(() => null));
  const rl = g.map((_, i) => i), cl = g[0].map((_, j) => j);
  const views = (tones: Tone[] = []): View[] => [grid('tolls', g, rl, cl, tones), grid('dp[r][c] = cheapest cost from the start to (r, c), both ends paid', dp, rl, cl, tones)];
  r.frame('Counting became minimising, so the combine step changes from sum to min, and every square also pays its own toll: dp = toll + min(up, left).', views());
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) {
    const up = i > 0 ? dp[i - 1][j] as number : Infinity, left = j > 0 ? dp[i][j - 1] as number : Infinity;
    const best = i === 0 && j === 0 ? 0 : Math.min(up, left), v = g[i][j] + best;
    dp[i][j] = v;
    const tones = [...(i > 0 ? [T(i - 1, j, 'compared')] : []), ...(j > 0 ? [T(i, j - 1, 'compared')] : []), T(i, j, 'active')];
    const why = i === 0 && j === 0 ? `the start costs its own toll: ${v}` : i === 0 ? `top row, only reachable from the left: ${left} + ${g[i][j]} = ${v}` : j === 0 ? `left column, only reachable from above: ${up} + ${g[i][j]} = ${v}` : `toll ${g[i][j]} + min(up ${up}, left ${left}) = ${v}`;
    r.frame(`(${i}, ${j}): ${why}.`, views(tones), i > 0 && j > 0 ? numQ(`Toll ${g[i][j]}, up ${up}, left ${left}. What goes in (${i}, ${j})?`, v, i + j, `${g[i][j]} + min(${up}, ${left}) = ${v}.`) : undefined);
  }
  const ans = dp[m - 1][n - 1] as number;
  r.frame(`The cheapest route costs ${ans}.`, [...views([T(m - 1, n - 1, 'found')]), tvars({ answer: ans })]);
  return r.frames;
}

// ---- Side quest: Longest Palindromic Subsequence -----------------------------------------------
// Final text var `answer` = LPS length.
export function palindromeFrames(s: string): Frame[] {
  const n = s.length, r = recorder();
  const t: Cell[][] = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : null)));
  const lab = [...s].map((ch, i) => `${i} · ${ch}`);
  const num = (i: number, j: number) => t[i][j] as number;
  const view = (tones: Tone[] = []) => grid('dp[i][j] = longest palindromic subsequence of s[i..j]', t, lab, lab, tones);
  r.frame('A single letter is a palindrome, so the diagonal is 1. A square reads the row BELOW it (i + 1) and the cell to its left (j - 1), so i runs downwards from the end and j runs rightwards.', [view()]);
  let k = 0;
  for (let i = n - 2; i >= 0; i--) for (let j = i + 1; j < n; j++) {
    if (s[i] === s[j]) {
      const inner = j - 1 >= i + 1 ? num(i + 1, j - 1) : 0, v = inner + 2;
      t[i][j] = v;
      r.frame(`s[${i}..${j}]: the ends ${s[i]} and ${s[j]} match, so they wrap the best palindrome inside (${j - 1 >= i + 1 ? `dp[${i + 1}][${j - 1}] = ${inner}` : 'nothing inside = 0'}). ${inner} + 2 = ${v}.`,
        [view([...(j - 1 >= i + 1 ? [T(i + 1, j - 1, 'compared')] : []), T(i, j, 'active')])], numQ(`Ends ${s[i]} and ${s[j]} match. Inside holds ${inner}. What goes in (${i}, ${j})?`, v, k++, `Matching ends add 2 around the inside: ${v}.`));
    } else {
      const down = num(i + 1, j), left = num(i, j - 1), v = Math.max(down, left);
      t[i][j] = v;
      r.frame(`s[${i}..${j}]: the ends ${s[i]} and ${s[j]} differ, so one end goes. Drop the left end (row below: ${down}) or the right end (cell to the left: ${left}). max = ${v}.`,
        [view([T(i + 1, j, 'compared'), T(i, j - 1, 'compared'), T(i, j, 'active')])], numQ(`Ends differ. Below ${down}, left ${left}. What goes in (${i}, ${j})?`, v, k++, `max(${down}, ${left}) = ${v}.`));
    }
  }
  r.frame(`The answer is dp[0][${n - 1}] = ${num(0, n - 1)}.`, [view([T(0, n - 1, 'found')]), tvars({ answer: num(0, n - 1) })]);
  return r.frames;
}

// ---- Side quest: Distinct Subsequences ---------------------------------------------------------
// Final text var `answer` = number of ways to keep exactly t inside s.
export function distinctFrames(s: string, t: string): Frame[] {
  const n = s.length, m = t.length, r = recorder();
  const dp: Cell[][] = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: m + 1 }, (_, j) => (j === 0 ? 1 : i === 0 ? 0 : null)));
  const num = (i: number, j: number) => dp[i][j] as number;
  const view = (tones: Tone[] = []) => grid('dp[i][j] = ways to keep exactly t[0..j) from s[0..i)', dp, ['∅', ...s], ['∅', ...t], tones);
  r.frame('Keeping nothing can be done one way (delete everything), so column 0 is all 1. Keeping something from nothing is impossible, so row 0 is 0.', [view()]);
  let k = 0;
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
    const up = num(i - 1, j), match = s[i - 1] === t[j - 1], diag = match ? num(i - 1, j - 1) : 0, v = up + diag;
    dp[i][j] = v;
    r.frame(match
      ? `(${i}, ${j}): s has ${s[i - 1]} and t needs ${t[j - 1]}. Either delete this letter (up ${up}) or use it for t's last letter (diagonal ${diag}). Different ways, so add: ${v}.`
      : `(${i}, ${j}): ${s[i - 1]} cannot supply ${t[j - 1]}, so it must be deleted. Copy the cell above: ${v}.`,
      [view([T(i - 1, j, 'compared'), ...(match ? [T(i - 1, j - 1, 'compared')] : []), T(i, j, 'active')])],
      numQ(`s has ${s[i - 1]}, t needs ${t[j - 1]}. Up ${up}${match ? `, diagonal ${diag}` : ''}. What goes in (${i}, ${j})?`, v, k++, match ? `${up} + ${diag} = ${v}.` : `No match, so only the delete case: ${v}.`));
  }
  r.frame(`The answer is dp[${n}][${m}] = ${num(n, m)}.`, [view([T(n, m, 'found')]), tvars({ answer: num(n, m) })]);
  return r.frames;
}

// ---- Side quest: Target Sum --------------------------------------------------------------------
// Final text var `answer` = number of sign assignments.
export function targetSumFrames(nums: number[], target: number): Frame[] {
  const r = recorder(), total = nums.reduce((x, y) => x + y, 0);
  if (Math.abs(target) > total || (total + target) % 2 !== 0) {
    r.frame(`Total ${total}, target ${target}. ${Math.abs(target) > total ? 'The target is out of reach.' : 'total + target is odd, so the + group cannot weigh a whole number.'} No sign choice works.`, [tvars({ total, target })]);
    r.frame('Answer: 0 sign choices work.', [tvars({ answer: 0 })]);
    return r.frames;
  }
  const plus = (total + target) / 2;
  const ways = Array.from({ length: plus + 1 }, (_, s) => (s === 0 ? 1 : 0));
  const view = (pointers: { at: number; label: string; tone?: 'blue' | 'green' }[] = [], tones: Record<number, CellTone> = {}): View =>
    ({ kind: 'array', name: 'ways[s] = subsets of the numbers so far that total s', values: [...ways], pointers, tones });
  r.frame(`P - N = ${target} and P + N = ${total}, so the + group must total P = (${total} + ${target}) / 2 = ${plus}. Count subsets that total ${plus}. ways[0] = 1: the empty subset.`, [view()]);
  for (const x of nums) {
    if (x === 0) {
      for (let s = 0; s <= plus; s++) ways[s] *= 2;
      r.frame('A zero can be +0 or -0: two choices for every subset, so every square doubles.', [view()]);
      continue;
    }
    for (let s = plus; s >= x; s--) {
      const was = ways[s];
      ways[s] += ways[s - x];
      r.frame(`Number ${x}, s = ${s}: ways[${s}] was ${was}; adding ${x} to every subset that totals ${s - x} (${ways[s - x]} of them) gives ${was} + ${ways[s - x]} = ${ways[s]}. Swept downwards so ways[${s - x}] is from before this number.`,
        [view([{ at: s, label: 's', tone: 'blue' }, { at: s - x, label: 's-x', tone: 'green' }], { [s - x]: 'compared', [s]: 'active' })],
        numQ(`Number ${x}, s = ${s}. ways[${s}] is ${was}, ways[${s - x}] is ${ways[s - x]}. New ways[${s}]?`, ways[s], s + x, `${was} + ${ways[s - x]} = ${ways[s]}.`));
    }
  }
  r.frame(`All numbers are used. ways[${plus}] = ${ways[plus]} sign choices reach ${target}.`, [view([{ at: plus, label: 'P', tone: 'blue' }]), tvars({ answer: ways[plus] })]);
  return r.frames;
}

// ---- Side quest: Best Time to Buy and Sell Stock IV --------------------------------------------
// Final text var `answer` = best profit with at most k trades.
export function kTradesFrames(k: number, prices: number[]): Frame[] {
  const n = prices.length, r = recorder();
  const buy = Array.from({ length: k + 1 }, () => -Infinity), sell = Array.from({ length: k + 1 }, () => 0);
  const hist: number[][] = [];
  const rowNames: string[] = [];
  for (let t = 1; t <= k; t++) rowNames.push(`buy ${t}`, `sell ${t}`);
  const cells = (upto: number): Cell[][] => rowNames.map((_, ri) => Array.from({ length: n }, (_, d) => (d < upto ? show(hist[d][ri]) : null)));
  const cols = prices.map((p, d) => `${d} · ${p}`);
  const view = (upto: number, tones: Tone[] = []) => grid('state after each day', cells(upto), rowNames, cols, tones);
  const snapshot = () => { const row: number[] = []; for (let t = 1; t <= k; t++) row.push(buy[t], sell[t]); return row; };
  r.frame(`buy[t] = best cash while holding during trade t; sell[t] = best cash with at most t trades closed. Before day 0 nobody holds (buy = −∞) and sell is 0. Each day updates t = 1..${k} in order.`, [tvars({ k, days: n })]);
  for (let d = 0; d < n; d++) {
    const p = prices[d], before = snapshot();
    for (let t = 1; t <= k; t++) { buy[t] = Math.max(buy[t], sell[t - 1] - p); sell[t] = Math.max(sell[t], buy[t] + p); }
    hist.push(snapshot());
    const changed: Tone[] = hist[d].map((x, ri) => (x !== before[ri] ? T(ri, d, 'active') : null)).filter((x): x is Tone => x !== null);
    r.frame(`Day ${d}, price ${p}. For each t: open trade t if sell[t-1] - ${p} beats buy[t], close it if buy[t] + ${p} beats sell[t]. Highlighted cells changed. sell[${k}] is now ${sell[k]}.`,
      [view(d + 1, changed)], numQ(`Day ${d}, price ${p}. What is sell[${k}] after today?`, sell[k], d, `Opening and closing a trade on the same day earns 0, so the in-place update is safe. sell[${k}] = ${sell[k]}.`));
  }
  r.frame(`The answer is sell[${k}] = ${sell[k]}.`, [view(n, [T(2 * k - 1, n - 1, 'found')]), tvars({ answer: sell[k] })]);
  return r.frames;
}
