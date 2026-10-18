// Dry-run frames for src/dsa-lessons/dp-1d.mdx. Each generator replays the lesson's Java loop cell by cell:
// the cell being written is gold, the cells that feed it are blue, settled cells are green.
// The last frame always carries a text variable `answer`, checked against a brute force in tests/dp-1d-frames.test.ts.
import { recorder, tvars } from '../../lib/dryrun.ts';
import type { CellTone, Frame, Predict, PtrTone, Val, View } from '../../lib/dryrun.ts';

type Rec = ReturnType<typeof recorder>;
type ArrExtra = Partial<Extract<View, { kind: 'array' }>>;
const arr = (name: string, values: Val[], extra: ArrExtra = {}): View => ({ kind: 'array', name, values, ...extra });
const ptr = (at: number, label: string, tone: PtrTone = 'gold') => ({ at, label, tone });
const ans = (v: Val) => tvars({ answer: v });

// Numeric question: the right number plus two neighbours, rotated by `slot` so the answer is not always first.
function num(question: string, right: number, slot: number, explain: string): Predict {
  const list = [right, right + 1, Math.max(0, right - 1) === right ? right + 2 : right - 1].map(String);
  const shift = slot % 3;
  const options = list.map((_, k) => list[(k + 3 - shift) % 3]);
  return { question, options, answer: options.indexOf(String(right)), explain };
}
function yn(question: string, right: string, wrong: string, slot: number, explain: string): Predict {
  const flip = slot % 2 === 1;
  const options = flip ? [wrong, right] : [right, wrong];
  return { question, options, answer: flip ? 1 : 0, explain };
}

// One row of a DP table. Cells at index >= filled are not written yet. Feeder cells (blue) get a pointer label.
function dpRow(name: string, vals: Val[], filled: number, o: { cur?: number; feeds?: [number, string][]; found?: number[]; size?: number } = {}): View {
  const tones: Record<number, CellTone> = {};
  for (let k = 0; k < filled; k++) tones[k] = 'done';
  const labels = new Map<number, string[]>();
  for (const [at, label] of o.feeds ?? []) { tones[at] = 'compared'; labels.set(at, [...(labels.get(at) ?? []), label]); }
  if (o.cur !== undefined) tones[o.cur] = 'active';
  for (const k of o.found ?? []) tones[k] = 'found';
  const pointers = [...labels].map(([at, l]) => ptr(at, l.join(' / '), 'blue'));
  if (o.cur !== undefined) pointers.push(ptr(o.cur, 'writes'));
  return arr(name, Array.from({ length: o.size ?? vals.length }, (_, k) => (k < filled ? vals[k] : '·')), { tones, pointers });
}

// ---- Chapter 1: Climbing Stairs (n >= 1) -------------------------------------------------------------
export function climbFrames(n: number): Frame[] {
  const r = recorder();
  const w = [1, 1];
  for (let i = 2; i <= n; i++) w[i] = w[i - 1] + w[i - 2];
  const row = (filled: number, o = {}) => dpRow('ways', w.slice(0, n + 1), filled, o);
  r.frame('State: ways[i] is the number of ways to stand on step i, starting from the ground. Base cases: ways[0] = 1 (the empty climb) and ways[1] = 1. Every later cell reads the two cells just before it.', [row(Math.min(2, n + 1)), ans('?')]);
  for (let i = 2; i <= n; i++) {
    r.frame(`ways[${i}] = ways[${i - 1}] + ways[${i - 2}] = ${w[i - 1]} + ${w[i - 2]} = ${w[i]}. The last move was one step from ${i - 1} or two steps from ${i - 2}. Those groups never overlap, so they add.`,
      [row(i + 1, { cur: i, feeds: [[i - 1, 'i − 1'], [i - 2, 'i − 2']] }), ans('?')],
      num(`ways[${i - 1}] = ${w[i - 1]} and ways[${i - 2}] = ${w[i - 2]}. What is ways[${i}]?`, w[i], i, `${w[i - 1]} + ${w[i - 2]} = ${w[i]}.`));
  }
  r.frame(`The table is full. The answer is the last cell, ways[${n}] = ${w[n]}. Only the last two cells were ever read, so two variables would have been enough.`, [row(n + 1, { found: [n] }), ans(w[n])]);
  return r.frames;
}

// ---- Chapter 2: Min Cost Climbing Stairs (cost.length >= 2) -------------------------------------------
export function minCostFrames(cost: number[]): Frame[] {
  const r = recorder();
  const n = cost.length;
  const d = [0, 0];
  for (let i = 2; i <= n; i++) d[i] = Math.min(d[i - 1] + cost[i - 1], d[i - 2] + cost[i - 2]);
  const costView = (t: Record<number, CellTone> = {}) => arr('cost of standing on each step', cost, { tones: t });
  r.frame('State: dp[i] is the cheapest total toll to arrive at position i. Positions run 0 to n, and position n is the top, past the last step. You may start on step 0 or 1 for free, so dp[0] = dp[1] = 0.', [costView(), dpRow('dp', d, 2), ans('?')]);
  for (let i = 2; i <= n; i++) {
    const a = d[i - 1] + cost[i - 1], b = d[i - 2] + cost[i - 2];
    r.frame(`dp[${i}] = min(dp[${i - 1}] + cost[${i - 1}], dp[${i - 2}] + cost[${i - 2}]) = min(${d[i - 1]} + ${cost[i - 1]}, ${d[i - 2]} + ${cost[i - 2]}) = min(${a}, ${b}) = ${d[i]}. ${a === b ? 'Both last moves cost the same.' : a < b ? `One step up from ${i - 1} is cheaper.` : `Two steps up from ${i - 2} is cheaper.`}`,
      [costView({ [i - 1]: 'compared', [i - 2]: 'compared' }), dpRow('dp', d, i + 1, { cur: i, feeds: [[i - 1, 'i − 1'], [i - 2, 'i − 2']] }), ans('?')],
      num(`min(${a}, ${b}) is what?`, d[i], i, `The cheaper of the two last moves: ${d[i]}.`));
  }
  r.frame(`The top is position ${n}, so the answer is dp[${n}] = ${d[n]}, not dp[${n - 1}] = ${d[n - 1]}. dp[${n - 1}] is the price of arriving on the last step, before paying its toll.`, [costView(), dpRow('dp', d, n + 1, { found: [n] }), ans(d[n])]);
  return r.frames;
}

// ---- Chapters 3 and 4: House Robber, House Robber II --------------------------------------------------
// Runs House Robber on nums[lo..hi] and records one frame per cell. Needs at least one house.
function robStreet(r: Rec, nums: number[], lo: number, hi: number, name: string, intro: string, status: () => View, streetLabel?: string): number {
  const m = hi - lo + 1;
  const d = [0, nums[lo]];
  for (let i = 2; i <= m; i++) d[i] = Math.max(nums[lo + i - 1] + d[i - 2], d[i - 1]);
  const houses = (tones: Record<number, CellTone> = {}) => arr('purses', nums, { tones, ...(streetLabel ? { regions: [{ from: lo, to: hi, label: streetLabel, tone: 'blue' as PtrTone }] } : {}) });
  r.frame(intro, [houses(), dpRow(name, d, Math.min(2, m + 1)), status()]);
  for (let i = 2; i <= m; i++) {
    const h = lo + i - 1, knock = nums[h] + d[i - 2], skip = d[i - 1];
    r.frame(`dp[${i}]: house ${h} has ${nums[h]}. Knock: ${nums[h]} + dp[${i - 2}] = ${knock} (house ${h - 1} is off-limits). Skip: dp[${i - 1}] = ${skip}. Keep the larger: ${d[i]}${knock === skip ? ' (a tie)' : knock > skip ? ', so knocking wins' : ', so skipping wins'}.`,
      [houses({ [h]: 'active' }), dpRow(name, d, i + 1, { cur: i, feeds: [[i - 2, 'knock reads'], [i - 1, 'skip reads']] }), status()],
      num(`Knock gives ${knock}, skip gives ${skip}. What is dp[${i}]?`, d[i], i, `dp[${i}] = max(${knock}, ${skip}) = ${d[i]}.`));
  }
  return d[m];
}

export function robFrames(nums: number[]): Frame[] {
  const r = recorder();
  const n = nums.length;
  const best = robStreet(r, nums, 0, n - 1, 'dp', 'State: dp[i] is the most you can collect from the first i houses. dp[0] = 0 (no houses) and dp[1] = nums[0]. Each later cell is either "knock at the last house" or "skip it".', () => ans('?'));
  r.frame(`The table is full. The answer is dp[${n}] = ${best}. It is the best for the whole street, whether or not the last house was used.`, [arr('purses', nums), ans(best)]);
  return r.frames;
}

export function robCircleFrames(nums: number[]): Frame[] {
  const r = recorder();
  const n = nums.length;
  if (n === 1) {
    r.frame('One cottage has no neighbour, so nothing forbids it. Splitting would give two empty streets and answer 0, so return nums[0] directly.', [arr('purses', nums), ans('?')]);
    r.frame(`The answer is nums[0] = ${nums[0]}.`, [arr('purses', nums), ans(nums[0])]);
    return r.frames;
  }
  let a: Val = '?', b: Val = '?';
  const status = () => tvars({ 'skip last': a, 'skip first': b, answer: '?' });
  r.frame('On a ring, house 0 and house n − 1 are neighbours, so every valid plan skips at least one of them. That leaves two ordinary streets: houses 0..n − 2 and houses 1..n − 1. Solve each with House Robber and take the larger.',
    [arr('ring', nums, { pointers: [ptr(0, 'first'), ptr(n - 1, 'last', 'blue')] }), status()]);
  a = robStreet(r, nums, 0, n - 2, 'dp (skip last)', `Street one: houses 0..${n - 2}. The last house is skipped. dp[0] = 0 and dp[1] = nums[0].`, status, 'street one');
  b = robStreet(r, nums, 1, n - 1, 'dp (skip first)', `Street two: houses 1..${n - 1}. The first house is skipped. Same table, shifted by one.`, status, 'street two');
  const best = Math.max(a, b);
  r.frame(`max(${a}, ${b}) = ${best}. Every valid ring plan lives on one of the two streets, and every plan on either street is valid on the ring.`, [arr('ring', nums), tvars({ 'skip last': a, 'skip first': b, answer: best })]);
  return r.frames;
}

// ---- Chapter 5: Decode Ways ---------------------------------------------------------------------------
export function decodeFrames(s: string): Frame[] {
  const r = recorder();
  const n = s.length, digits = [...s];
  const d = [1];
  const note: string[] = [''];
  for (let i = 1; i <= n; i++) {
    d[i] = 0;
    const one = s[i - 1] !== '0';
    if (one) d[i] += d[i - 1];
    const v = i >= 2 ? Number(s.slice(i - 2, i)) : -1;
    const two = i >= 2 && v >= 10 && v <= 26;
    if (two) d[i] += d[i - 2];
    note[i] = `${one ? `"${s[i - 1]}" is a letter on its own (1..9): add dp[${i - 1}] = ${d[i - 1]}.` : `"0" is no letter on its own: add nothing.`} ${i < 2 ? '' : two ? `"${s.slice(i - 2, i)}" is in 10..26: add dp[${i - 2}] = ${d[i - 2]}.` : `"${s.slice(i - 2, i)}" is ${v < 10 ? 'a leading zero, not a letter' : 'above 26'}: add nothing.`}`.trim();
  }
  r.frame('State: dp[i] is the number of ways to decode the first i digits. dp[0] = 1: the empty prefix decodes exactly one way, so a valid first letter can extend it. The last letter used one digit (1..9) or two digits (10..26).', [arr('digits', digits, { indices: false }), dpRow('dp', d, 1), ans('?')]);
  for (let i = 1; i <= n; i++) {
    const feeds: [number, string][] = [];
    if (s[i - 1] !== '0') feeds.push([i - 1, 'one digit']);
    const v = i >= 2 ? Number(s.slice(i - 2, i)) : -1;
    if (i >= 2 && v >= 10 && v <= 26) feeds.push([i - 2, 'two digits']);
    const tones: Record<number, CellTone> = { [i - 1]: 'active' };
    if (i >= 2) tones[i - 2] = 'compared';
    r.frame(`dp[${i}] = ${d[i]}. ${note[i]}`, [arr('digits', digits, { indices: false, tones, ...(i >= 2 ? { regions: [{ from: i - 2, to: i - 1, label: 'last two', tone: 'blue' as PtrTone }] } : {}) }), dpRow('dp', d, i + 1, { cur: i, feeds }), ans('?')],
      num(`What is dp[${i}] after looking at "${s[i - 1]}"${i >= 2 ? ` and "${s.slice(i - 2, i)}"` : ''}?`, d[i], i, note[i]));
  }
  r.frame(`The answer is dp[${n}] = ${d[n]}.${d[n] === 0 ? ' A zero that could not join the digit before it made some cell 0, and that 0 spread to every cell that read it.' : ''}`, [arr('digits', digits, { indices: false }), dpRow('dp', d, n + 1, { found: [n] }), ans(d[n])]);
  return r.frames;
}

// ---- Chapter 6: Coin Change (distinct coins >= 1) -----------------------------------------------------
export function coinFrames(coins: number[], amount: number): Frame[] {
  const r = recorder();
  const INF = amount + 1;
  const d: number[] = [0];
  const full = (): Val[] => d.map(v => (v >= INF ? '∞' : v));
  r.frame(`State: dp[a] is the fewest coins that sum to exactly a. dp[0] = 0. Every other cell starts as "unreachable", written ∞ here and stored as amount + 1 = ${INF} in Java so that adding 1 cannot overflow.`, [dpRow('dp', full(), 1, { size: amount + 1 }), ans('?')]);
  for (let a = 1; a <= amount; a++) {
    let best = INF;
    const parts: string[] = [], feeds: [number, string][] = [];
    for (const c of coins) {
      if (c > a) continue;
      feeds.push([a - c, `a − ${c}`]);
      if (d[a - c] >= INF) parts.push(`coin ${c}: dp[${a - c}] is unreachable`);
      else { parts.push(`coin ${c}: 1 + dp[${a - c}] = ${d[a - c] + 1}`); best = Math.min(best, d[a - c] + 1); }
    }
    d[a] = best;
    const reachable = best < INF;
    r.frame(`dp[${a}]: ${parts.length ? parts.join('; ') : 'no coin fits'}. ${reachable ? `The best last coin gives ${best}.` : `Nothing reaches ${a}, so it stays ∞.`}`,
      [dpRow('dp', full(), a + 1, { cur: a, feeds, size: amount + 1 }), ans('?')],
      reachable ? num(`Trying every coin as the LAST coin for amount ${a}. What is dp[${a}]?`, best, a, `The smallest "1 + dp[a − c]" over the coins that fit: ${best}.`)
        : yn(`Amount ${a} with coins ${coins.join(', ')}: is it reachable?`, 'No: it stays ∞', 'Yes', a, `Every coin leaves an amount that is itself unreachable, and one more coin cannot fix that.`));
  }
  const res = d[amount] >= INF ? -1 : d[amount];
  r.frame(res === -1 ? `dp[${amount}] is still ∞, so the answer is −1.` : `The answer is dp[${amount}] = ${res}.`, [dpRow('dp', full(), amount + 1, { found: [amount], size: amount + 1 }), ans(res)]);
  return r.frames;
}

// ---- Chapter 7: Word Break ----------------------------------------------------------------------------
export function wordBreakFrames(s: string, dict: string[]): Frame[] {
  const r = recorder();
  const n = s.length, words = new Set(dict), maxLen = Math.max(...dict.map(w => w.length));
  const chars = [...s];
  const d: boolean[] = [true];
  const T = (b: boolean) => (b ? 'T' : 'F');
  r.frame(`State: dp[i] is true when the first i characters can be split into dictionary words. dp[0] = true: the empty prefix needs no words. The last word is s[j..i), so dp[i] is true if some j has dp[j] true and s[j..i) in the dictionary. j never needs to reach back more than ${maxLen} characters, the longest word.`,
    [arr('s', chars), dpRow('dp', d.map(T), 1, { size: n + 1 }), ans('?')]);
  for (let i = 1; i <= n; i++) {
    d[i] = false;
    const tried: string[] = [], feeds: [number, string][] = [];
    let win = -1, lastJ = i - 1;
    for (let j = i - 1; j >= Math.max(0, i - maxLen) && !d[i]; j--) {
      lastJ = j;
      const w = s.slice(j, i);
      feeds.push([j, `j = ${j}`]);
      if (!d[j]) tried.push(`j = ${j}: dp[${j}] is false`);
      else if (words.has(w)) { d[i] = true; win = j; tried.push(`j = ${j}: dp[${j}] is true and "${w}" is a word`); }
      else tried.push(`j = ${j}: dp[${j}] is true but "${w}" is not a word`);
    }
    const from = win >= 0 ? win : lastJ;
    r.frame(`dp[${i}] = ${T(d[i])}. ${tried.join('. ')}. ${d[i] ? 'One split is enough, so we stop trying.' : 'No start position works.'}`,
      [arr('s', chars, { regions: [{ from, to: i - 1, label: win >= 0 ? s.slice(win, i) : 'last tried', tone: win >= 0 ? 'green' : 'dim' }], tones: win >= 0 ? Object.fromEntries(Array.from({ length: i - win }, (_, k) => [win + k, 'found'])) : {} }),
        dpRow('dp', d.map(T), i + 1, { cur: i, feeds, size: n + 1 }), ans('?')],
      yn(`Is dp[${i}] true? (the prefix is "${s.slice(0, i)}")`, d[i] ? 'True' : 'False', d[i] ? 'False' : 'True', i, tried.join('. ') + '.'));
  }
  r.frame(`The answer is dp[${n}] = ${T(d[n])}. The table kept every reachable cut point alive, so a bad early word could not hide a good one.`, [arr('s', chars), dpRow('dp', d.map(T), n + 1, { found: [n] }), ans(d[n])]);
  return r.frames;
}

// ---- Chapter 8: Longest Increasing Subsequence --------------------------------------------------------
export function lisFrames(nums: number[]): Frame[] {
  const r = recorder();
  const n = nums.length;
  const d: number[] = [];
  const view = (tones: Record<number, CellTone> = {}) => arr('nums', nums, { tones });
  r.frame('State: dp[i] is the length of the longest strictly increasing subsequence that ENDS at index i. Every cell starts at 1 (the element alone), then looks back at every earlier smaller element.', [view(), dpRow('dp', d, 0, { size: n }), ans('?')]);
  for (let i = 0; i < n; i++) {
    d[i] = 1;
    const tones: Record<number, CellTone> = {}, feeds: [number, string][] = [], notes: string[] = [];
    for (let j = 0; j < i; j++) {
      if (nums[j] < nums[i]) { d[i] = Math.max(d[i], d[j] + 1); tones[j] = 'compared'; feeds.push([j, `dp[${j}] = ${d[j]}`]); notes.push(`${nums[j]} < ${nums[i]} (dp[${j}] = ${d[j]})`); }
      else tones[j] = 'out';
    }
    tones[i] = 'active';
    r.frame(i === 0 ? `dp[0] = 1: nothing comes before it.` : `For ${nums[i]}: ${notes.length ? `earlier smaller elements are ${notes.join(', ')}. The best run to extend has length ${d[i] - 1}, so dp[${i}] = 1 + ${d[i] - 1} = ${d[i]}.` : 'no earlier element is smaller, so it starts a run alone: dp[' + i + '] = 1.'}`,
      [view(tones), dpRow('dp', d, i + 1, { cur: i, feeds, size: n }), ans('?')],
      num(`What is dp[${i}] for the value ${nums[i]}?`, d[i], i, notes.length ? `1 + the biggest dp among earlier smaller elements = ${d[i]}.` : 'No earlier smaller element, so the run is just this element.'));
  }
  const best = Math.max(...d);
  const top = d.map((v, k) => (v === best ? k : -1)).filter(k => k >= 0);
  r.frame(`The answer is the MAXIMUM over all dp[i], here ${best}, not dp[${n - 1}]. The longest run can end anywhere.`, [view(), dpRow('dp', d, n, { found: top }), ans(best)]);
  return r.frames;
}

// ---- Chapter 8b: LIS with tails -----------------------------------------------------------------------
export function lisTailsFrames(nums: number[]): Frame[] {
  const r = recorder();
  const tails: number[] = [];
  r.frame('State: tails[k] is the smallest value that ends any increasing subsequence of length k + 1 seen so far. A smaller ending is easier to extend later. The shelves stay strictly increasing, so we can binary search them.', [arr('tails', ['·']), ans(0)]);
  nums.forEach((x, idx) => {
    const before = tails.length ? `[${tails.join(', ')}]` : '[]';
    let lo = 0, hi = tails.length;
    while (lo < hi) { const mid = (lo + hi) >>> 1; if (tails[mid] < x) lo = mid + 1; else hi = mid; }
    const append = lo === tails.length;
    const old = tails[lo];
    tails[lo] = x;
    r.frame(append ? `Read ${x}. tails was ${before}. ${x} is bigger than every tail, so it extends the longest run: append it. The LIS grows to ${tails.length}.`
      : `Read ${x}. tails was ${before}. The first tail that is at least ${x} is ${old} (shelf ${lo}). Overwrite it with ${x}: a smaller ending for a run of length ${lo + 1}.`,
      [arr('nums', nums, { pointers: [ptr(idx, 'reading')], tones: Object.fromEntries(nums.map((_, k) => [k, k < idx ? 'done' : 'out']) as [number, CellTone][]) }),
        arr('tails', tails, { tones: { ...Object.fromEntries(tails.map((_, k) => [k, 'done']) as [number, CellTone][]), [lo]: append ? 'found' : 'active' } }), ans(tails.length)],
      yn(`tails is ${before} and the next value is ${x}. Append or overwrite?`, append ? 'Append' : 'Overwrite', append ? 'Overwrite' : 'Append', idx, append ? `${x} is larger than every tail.` : `${old} ≥ ${x}, so ${x} is a better ending for that length.`));
  });
  r.frame(`The answer is the number of shelves: ${tails.length}. Note that tails is not itself a subsequence; only its length is the answer.`, [arr('tails', tails, { tones: Object.fromEntries(tails.map((_, k) => [k, 'found']) as [number, CellTone][]) }), ans(tails.length)]);
  return r.frames;
}

// ---- Chapters 9 and 10: expand around centres ---------------------------------------------------------
function widen(s: string, l: number, rr: number) {
  let found = 0;
  while (l >= 0 && rr < s.length && s[l] === s[rr]) { found++; l--; rr++; }
  return { a: l + 1, b: rr - 1, found };
}

export function longestPalFrames(s: string): Frame[] {
  const r = recorder();
  const n = s.length, chars = [...s];
  let bestL = 0, bestR = 0;
  r.frame('There are 2n − 1 centres: every letter (odd length) and every gap between two letters (even length). From a centre, widen one letter each side while the two ends match. The last window that matched is the longest palindrome around that centre.', [arr('s', chars), tvars({ best: `"${s[0]}"`, answer: '?' })]);
  let slot = 0;
  for (let c = 0; c < n; c++) for (const even of [false, true]) {
    if (even && c === n - 1) continue;
    const { a, b } = widen(s, c, even ? c + 1 : c);
    const len = b - a + 1;
    const improved = b - a > bestR - bestL;
    if (improved) { bestL = a; bestR = b; }
    const win = len > 0 ? s.slice(a, b + 1) : '';
    const tones: Record<number, CellTone> = {};
    for (let k = a; k <= b; k++) tones[k] = 'compared';
    const centre = even ? `the gap between index ${c} and ${c + 1}` : `the letter "${s[c]}" at index ${c}`;
    r.frame(`Centre on ${centre}: ${len > 0 ? `widens to "${win}" (length ${len})` : 'the two neighbours differ, so nothing matches (length 0)'}. ${improved ? 'That beats the best so far, so keep it.' : `The best stays "${s.slice(bestL, bestR + 1)}" (length ${bestR - bestL + 1}).`}`,
      [arr('s', chars, { tones, pointers: [ptr(c, even ? 'gap after' : 'centre', 'purple')], regions: [{ from: bestL, to: bestR, label: 'best', tone: 'green' }] }), tvars({ best: `"${s.slice(bestL, bestR + 1)}"`, answer: '?' })],
      num(`How long is the palindrome around ${centre}?`, len, slot++, len > 0 ? `Widen while the ends match: "${win}" has length ${len}.` : 'The first pair already differs.'));
  }
  const res = s.slice(bestL, bestR + 1);
  r.frame(`All ${2 * n - 1} centres are tried. The answer is "${res}". Skipping the gap centres would miss every even-length palindrome.`, [arr('s', chars, { regions: [{ from: bestL, to: bestR, label: 'answer', tone: 'green' }] }), tvars({ best: `"${res}"`, answer: res })]);
  return r.frames;
}

export function countPalFrames(s: string): Frame[] {
  const r = recorder();
  const n = s.length, chars = [...s];
  let total = 0, slot = 0;
  r.frame('Same 2n − 1 centres. Every successful widening is one more palindromic substring, so count the widenings instead of remembering the widest.', [arr('s', chars), tvars({ count: 0, answer: '?' })]);
  for (let c = 0; c < n; c++) for (const even of [false, true]) {
    if (even && c === n - 1) continue;
    const { a, b, found } = widen(s, c, even ? c + 1 : c);
    const before = total;
    total += found;
    const tones: Record<number, CellTone> = {};
    for (let k = a; k <= b; k++) tones[k] = 'compared';
    const centre = even ? `the gap after index ${c}` : `the letter at index ${c}`;
    r.frame(`Centre on ${centre}: ${found} successful widening${found === 1 ? '' : 's'}${found ? ` (the largest is "${s.slice(a, b + 1)}")` : ''}. The count goes from ${before} to ${total}.`,
      [arr('s', chars, { tones, pointers: [ptr(c, even ? 'gap after' : 'centre', 'purple')] }), tvars({ count: total, answer: '?' }, { count: before })],
      num(`How many palindromes does ${centre} contribute?`, found, slot++, found ? 'Each time the two ends match, the window is one more palindrome.' : 'The first pair already differs.'));
  }
  r.frame(`All centres are done. Each palindrome has exactly one centre, so each was counted exactly once: ${total}.`, [arr('s', chars), tvars({ count: total, answer: total })]);
  return r.frames;
}

// ---- Side quest 1: Delete and Earn (values >= 1) ------------------------------------------------------
export function earnFrames(nums: number[]): Frame[] {
  const r = recorder();
  const max = Math.max(...nums);
  const earn = Array<number>(max + 1).fill(0);
  for (const x of nums) earn[x] += x;
  const best: number[] = [];
  const at = (k: number) => (k < 0 ? 0 : best[k]);
  r.frame('Taking one x lets you take every copy of x, so collapse each value into one "house" worth x times its count. Taking x destroys x − 1 and x + 1, which makes it House Robber over the values: no two adjacent houses.', [arr('numbers', nums, { indices: false }), arr('earn[v] (index = value)', earn), ans('?')]);
  for (let v = 0; v <= max; v++) {
    best[v] = Math.max(at(v - 1), at(v - 2) + earn[v]);
    if (v === 0) continue;
    const take = at(v - 2) + earn[v], skip = at(v - 1);
    r.frame(`best[${v}]: take every ${v} for ${earn[v]} + best[${v - 2}] = ${take} (value ${v - 1} is destroyed), or skip value ${v} and keep best[${v - 1}] = ${skip}. Larger: ${best[v]}.`,
      [arr('earn[v] (index = value)', earn, { tones: { [v]: 'active' } }), dpRow('best[v]', best, v + 1, { size: max + 1, cur: v, feeds: [...(v >= 2 ? [[v - 2, 'take reads'] as [number, string]] : []), [v - 1, 'skip reads']] }), ans('?')],
      num(`Take: ${take}. Skip: ${skip}. What is best[${v}]?`, best[v], v, `max(${take}, ${skip}) = ${best[v]}.`));
  }
  r.frame(`The answer is best[${max}] = ${best[max]}, the best total over all values.`, [arr('earn[v] (index = value)', earn), dpRow('best[v]', best, max + 1, { found: [max], size: max + 1 }), ans(best[max])]);
  return r.frames;
}

// ---- Side quest 2: Perfect Squares (n >= 1) ----------------------------------------------------------
export function squaresFrames(n: number): Frame[] {
  const r = recorder();
  const d: number[] = [0];
  r.frame('This is coin change with every perfect square as a coin. dp[a] is the fewest squares that sum to a, and dp[0] = 0. Because 1 is a square, every amount is reachable, so each cell starts at a (all ones) as an upper bound.', [dpRow('dp', d, 1, { size: n + 1 }), ans('?')]);
  for (let a = 1; a <= n; a++) {
    d[a] = a;
    const parts: string[] = [], feeds: [number, string][] = [];
    for (let q = 1; q * q <= a; q++) {
      d[a] = Math.min(d[a], d[a - q * q] + 1);
      parts.push(`${q * q}: 1 + dp[${a - q * q}] = ${d[a - q * q] + 1}`);
      feeds.push([a - q * q, `a − ${q * q}`]);
    }
    r.frame(`dp[${a}]: last square ${parts.join('; ')}. The smallest is ${d[a]}.`, [dpRow('dp', d, a + 1, { cur: a, feeds, size: n + 1 }), ans('?')],
      num(`Fewest squares for ${a}?`, d[a], a, `The best last square gives ${d[a]}.`));
  }
  r.frame(`The answer is dp[${n}] = ${d[n]}.`, [dpRow('dp', d, n + 1, { found: [n], size: n + 1 }), ans(d[n])]);
  return r.frames;
}

// ---- Side quest 3: subset sum row, the loop direction -------------------------------------------------
export function partitionFrames(nums: number[], direction: 'backward' | 'forward' = 'backward'): Frame[] {
  const r = recorder();
  const total = nums.reduce((s, x) => s + x, 0);
  const T = (b: boolean) => (b ? 'T' : 'F');
  if (total % 2 !== 0) {
    r.frame(`The total ${total} is odd, so it cannot split into two equal halves.`, [arr('numbers', nums, { indices: false }), ans('?')]);
    r.frame('Answer: false.', [arr('numbers', nums, { indices: false }), ans('false')]);
    return r.frames;
  }
  const target = total / 2;
  const can = Array<boolean>(target + 1).fill(false);
  can[0] = true;
  const row = (tones: Record<number, CellTone>, ptrs: ReturnType<typeof ptr>[] = []) => arr('can[s]', can.map(T), { tones, pointers: ptrs });
  const base = () => Object.fromEntries(can.map((b, k) => [k, b ? 'done' : 'out']) as [number, CellTone][]);
  r.frame(`Two equal halves exist exactly when some subset sums to ${total} / 2 = ${target}. State: can[s] is true when some subset of the numbers seen so far sums to s. can[0] = true (the empty subset). Each number may be used once, so the inner loop runs ${direction === 'backward' ? 'BACKWARDS' : 'FORWARDS (this is the bug)'}.`, [row(base()), ans('?')]);
  for (const x of nums) {
    const fresh = new Set<number>();
    if (x > target) { r.frame(`${x} is larger than the target ${target}, so the loop for ${x} has nothing to update.`, [row(base()), tvars({ x }), ans('?')]); continue; }
    const ss = direction === 'backward' ? Array.from({ length: target - x + 1 }, (_, k) => target - k) : Array.from({ length: target - x + 1 }, (_, k) => x + k);
    for (const s of ss) {
      const reads = can[s - x], was = can[s];
      const polluted = fresh.has(s - x);
      can[s] = was || reads;
      if (can[s] && !was) fresh.add(s);
      const tones = base();
      tones[s - x] = polluted ? 'out' : 'compared';
      tones[s] = 'active';
      r.frame(`x = ${x}, s = ${s}: can[${s}] = can[${s}] || can[${s - x}] = ${T(was)} || ${T(reads)} = ${T(can[s])}. ${polluted ? `But can[${s - x}] was set during THIS round, by this same ${x}, so ${x} is now used twice.` : reads ? `can[${s - x}] is last round's value: reachable without this ${x}.` : `can[${s - x}] is false, so ${x} cannot extend anything.`}`,
        [row(tones, [ptr(s - x, 'reads', 'blue'), ptr(s, 'writes')]), tvars({ x, s }), ans('?')],
        yn(`can[${s - x}] is ${T(reads)} and can[${s}] was ${T(was)}. What is can[${s}] now?`, T(can[s]), T(!can[s]), s + x, `${T(was)} || ${T(reads)} = ${T(can[s])}.`));
    }
  }
  r.frame(`The answer is can[${target}] = ${T(can[target])}.`, [row(Object.fromEntries(can.map((_, k) => [k, k === target ? 'found' : 'done']) as [number, CellTone][])), ans(can[target])]);
  return r.frames;
}

// ---- Side quest 4: number of longest increasing subsequences ------------------------------------------
export function countLisFrames(nums: number[]): Frame[] {
  const r = recorder();
  const n = nums.length;
  const len: number[] = [], cnt: number[] = [];
  let bestLen = 0, total = 0;
  const view = (i: number, tones: Record<number, CellTone>) => [arr('nums', nums, { tones }), dpRow('len[i]', len, i + 1, { cur: i, size: n }), dpRow('cnt[i]', cnt, i + 1, { cur: i, size: n })];
  r.frame('Keep len[i], the longest run ending at i, and cnt[i], how many runs of that length end at i. An earlier smaller j that gives a LONGER run replaces the count; one that gives an EQUAL run adds to it.', [arr('nums', nums), dpRow('len[i]', len, 0, { size: n }), dpRow('cnt[i]', cnt, 0, { size: n }), ans('?')]);
  for (let i = 0; i < n; i++) {
    len[i] = 1; cnt[i] = 1;
    const notes: string[] = [], tones: Record<number, CellTone> = {};
    for (let j = 0; j < i; j++) {
      if (nums[j] >= nums[i]) { tones[j] = 'out'; continue; }
      tones[j] = 'compared';
      if (len[j] + 1 > len[i]) { len[i] = len[j] + 1; cnt[i] = cnt[j]; notes.push(`j = ${j}: run of ${len[i]}, longer: replace, cnt = ${cnt[i]}`); }
      else if (len[j] + 1 === len[i]) { cnt[i] += cnt[j]; notes.push(`j = ${j}: run of ${len[i]}, a tie: add ${cnt[j]}, cnt = ${cnt[i]}`); }
      else notes.push(`j = ${j}: run of ${len[j] + 1}, shorter: ignore`);
    }
    tones[i] = 'active';
    if (len[i] > bestLen) { bestLen = len[i]; total = cnt[i]; } else if (len[i] === bestLen) total += cnt[i];
    r.frame(`i = ${i} (value ${nums[i]}): ${notes.length ? notes.join('; ') : 'no smaller element before it'}. So len = ${len[i]}, cnt = ${cnt[i]}. The running answer is ${total} run${total === 1 ? '' : 's'} of length ${bestLen}.`,
      [...view(i, tones), ans('?')], num(`What is cnt[${i}]?`, cnt[i], i, notes.join('; ') || 'Only the element alone.'));
  }
  r.frame(`Sum cnt[i] over every i whose len[i] equals the maximum ${bestLen}: the answer is ${total}.`, [arr('nums', nums), dpRow('len[i]', len, n), dpRow('cnt[i]', cnt, n), ans(total)]);
  return r.frames;
}

// ---- Side quest 5: up to k steps, sliding window of cells ---------------------------------------------
export function kStepsFrames(n: number, k: number): Frame[] {
  const r = recorder();
  const w = [1];
  let window = 0;
  r.frame(`The last move can be 1 to ${k} steps, so ways[i] = ways[i − 1] + … + ways[i − ${k}], skipping negative indexes. Adding ${k} cells every time is O(n × k), but the sum is a window: add the newest cell, drop the one that fell out of reach.`, [dpRow('ways', w, 1, { size: n + 1 }), tvars({ window }), ans('?')]);
  for (let i = 1; i <= n; i++) {
    const prev = window;
    window += w[i - 1];
    const drop = i - k - 1 >= 0;
    if (drop) window -= w[i - k - 1];
    w[i] = window;
    const feeds: [number, string][] = [];
    for (let j = Math.max(0, i - k); j < i; j++) feeds.push([j, j === i - 1 ? 'newest' : 'in window']);
    r.frame(`window = ${prev} + ways[${i - 1}]${drop ? ` − ways[${i - k - 1}]` : ''} = ${prev} + ${w[i - 1]}${drop ? ` − ${w[i - k - 1]}` : ''} = ${window}. ${drop ? `Cell ${i - k - 1} is more than ${k} steps below ${i}, so it leaves the window.` : 'Nothing has fallen out of reach yet.'} ways[${i}] = ${window}.`,
      [dpRow('ways', w, i + 1, { cur: i, feeds, size: n + 1 }), tvars({ window }, { window: prev }), ans('?')],
      num(`The window sum is now what?`, window, i, `Add the newest cell${drop ? ', subtract the one that left' : ''}: ${window}.`));
  }
  r.frame(`The answer is ways[${n}] = ${w[n]}. O(n) total, not O(n × k).`, [dpRow('ways', w, n + 1, { found: [n], size: n + 1 }), tvars({ window }), ans(w[n])]);
  return r.frames;
}

// ---- Side quest 6: Minimum Cost for Tickets (days sorted, 1..365) -------------------------------------
export function ticketsFrames(days: number[], costs: number[]): Frame[] {
  const r = recorder();
  const last = days[days.length - 1];
  const visit = Array<boolean>(last + 1).fill(false);
  for (const d of days) visit[d] = true;
  const d: number[] = [0];
  const calendar = (cur: number | null) => arr('visit day?', visit.map((v, k) => (k === 0 ? '·' : v ? 'V' : '-')), { tones: cur === null ? {} : { [cur]: 'active' } });
  r.frame(`State: dp[d] is the cheapest cover for every visit on days 1..d, indexed by calendar day. dp[0] = 0. A quiet day copies dp[d − 1]. On a visit day, the last pass bought covers day d: a 1-day pass (dp[d − 1] + ${costs[0]}), a 7-day pass ending on d (dp[d − 7] + ${costs[1]}) or a 30-day pass (dp[d − 30] + ${costs[2]}). Negative days clamp to 0.`, [calendar(null), dpRow('dp', d, 1, { size: last + 1 }), ans('?')]);
  for (let day = 1; day <= last; day++) {
    if (!visit[day]) {
      d[day] = d[day - 1];
      r.frame(`Day ${day} has no visit, so nothing new is needed: dp[${day}] = dp[${day - 1}] = ${d[day]}.`, [calendar(day), dpRow('dp', d, day + 1, { cur: day, feeds: [[day - 1, 'copy']], size: last + 1 }), ans('?')]);
      continue;
    }
    const c1 = d[day - 1] + costs[0], c7 = d[Math.max(0, day - 7)] + costs[1], c30 = d[Math.max(0, day - 30)] + costs[2];
    d[day] = Math.min(c1, c7, c30);
    r.frame(`Day ${day} is a visit. 1-day: dp[${day - 1}] + ${costs[0]} = ${c1}. 7-day: dp[${Math.max(0, day - 7)}] + ${costs[1]} = ${c7}. 30-day: dp[${Math.max(0, day - 30)}] + ${costs[2]} = ${c30}. The cheapest is ${d[day]}.`,
      [calendar(day), dpRow('dp', d, day + 1, { cur: day, size: last + 1, feeds: [[day - 1, '1-day'], [Math.max(0, day - 7), '7-day'], [Math.max(0, day - 30), '30-day']] }), ans('?')],
      num(`What is dp[${day}]?`, d[day], day, `min(${c1}, ${c7}, ${c30}) = ${d[day]}.`));
  }
  r.frame(`The answer is dp[${last}] = ${d[last]}, the cheapest cover for every visit up to the last day.`, [calendar(null), dpRow('dp', d, last + 1, { found: [last], size: last + 1 }), ans(d[last])]);
  return r.frames;
}
