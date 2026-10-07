// Independent practice for the 1-D Dynamic Programming lesson. Prompts never name the pattern or the
// technique; inputs vary with `variant`. Every answer is recomputed by brute force in tests/dp-1d.test.ts.
import type { Challenge, PracticeSet } from '../../lib/practice.ts';

export const strategies = {
  line: 'A table over positions where each entry combines the one or two just before it',
  pieces: 'A table over prefixes: try every possible last piece (a letter, a word, a pass)',
  amount: 'A table over totals: try every item as the last one added',
  ends: 'A table of the best answer ending at each position, looking back at every earlier one',
  centres: 'Grow outward from every centre: each letter and each gap',
  other: 'Another tool fits better than a table here',
} as const;
type Strategy = keyof typeof strategies;

export const conceptIds = [
  'stairs', 'min-cost', 'robber', 'robber-circle', 'decode', 'coins', 'word-break', 'lis',
  'longest-pal', 'count-pal', 'delete-earn', 'squares', 'partition', 'count-lis', 'k-steps',
  'tickets', 'jump',
] as const;
type ConceptId = typeof conceptIds[number];

const arr = (a: (number | string)[]) => `[${a.join(', ')}]`;
const rotate = <T,>(a: T[], by: number) => (a.length ? a.map((_, i) => a[(i + by) % a.length]) : []);

// ---------- reference answers (the tests recompute each one by brute force) ----------
function stepsWays(n: number, k: number) {
  const w = [1];
  for (let i = 1; i <= n; i++) { w[i] = 0; for (let m = 1; m <= k && m <= i; m++) w[i] += w[i - m]; }
  return w[n];
}
function minCost(cost: number[]) {
  const n = cost.length, dp = [0, 0];
  for (let i = 2; i <= n; i++) dp[i] = Math.min(dp[i - 1] + cost[i - 1], dp[i - 2] + cost[i - 2]);
  return dp[n];
}
function robLine(a: number[]) {
  let prev = 0, curr = 0;
  for (const x of a) [prev, curr] = [curr, Math.max(curr, prev + x)];
  return curr;
}
const robCircle = (a: number[]) => (a.length === 1 ? a[0] : Math.max(robLine(a.slice(0, -1)), robLine(a.slice(1))));
function decodeWays(s: string) {
  const dp = [1];
  for (let i = 1; i <= s.length; i++) {
    dp[i] = s[i - 1] !== '0' ? dp[i - 1] : 0;
    if (i >= 2 && s[i - 2] !== '0' && Number(s.slice(i - 2, i)) <= 26) dp[i] += dp[i - 2];
  }
  return dp[s.length];
}
function fewestCoins(coins: number[], amount: number) {
  const INF = amount + 1, dp = [0];
  for (let a = 1; a <= amount; a++) { dp[a] = INF; for (const c of coins) if (c <= a) dp[a] = Math.min(dp[a], dp[a - c] + 1); }
  return dp[amount] >= INF ? -1 : dp[amount];
}
function canSplit(s: string, words: string[]) {
  const set = new Set(words), dp = [true];
  for (let i = 1; i <= s.length; i++) { dp[i] = false; for (let j = 0; j < i && !dp[i]; j++) dp[i] = dp[j] && set.has(s.slice(j, i)); }
  return dp[s.length];
}
function lisInfo(a: number[]) {
  const len: number[] = [], cnt: number[] = [];
  for (let i = 0; i < a.length; i++) {
    len[i] = 1; cnt[i] = 1;
    for (let j = 0; j < i; j++) if (a[j] < a[i]) {
      if (len[j] + 1 > len[i]) { len[i] = len[j] + 1; cnt[i] = cnt[j]; } else if (len[j] + 1 === len[i]) cnt[i] += cnt[j];
    }
  }
  const best = Math.max(0, ...len);
  return { best, count: len.reduce((t, l, i) => (l === best ? t + cnt[i] : t), 0) };
}
function centres(s: string) {
  let longest = 0, count = 0;
  for (let c = 0; c < s.length; c++) for (const [l0, r0] of [[c, c], [c, c + 1]]) {
    let l = l0, r = r0;
    while (l >= 0 && r < s.length && s[l] === s[r]) { count++; longest = Math.max(longest, r - l + 1); l--; r++; }
  }
  return { longest, count };
}
function earn(a: number[]) {
  const max = Math.max(...a), e = Array(max + 1).fill(0);
  for (const x of a) e[x] += x;
  return robLine(e);
}
function squares(n: number) {
  const dp = [0];
  for (let a = 1; a <= n; a++) { dp[a] = a; for (let r = 1; r * r <= a; r++) dp[a] = Math.min(dp[a], dp[a - r * r] + 1); }
  return dp[n];
}
function partition(a: number[]) {
  const total = a.reduce((t, x) => t + x, 0);
  if (total % 2) return false;
  const can = [true, ...Array(total / 2).fill(false)];
  for (const x of a) for (let s = total / 2; s >= x; s--) can[s] = can[s] || can[s - x];
  return can[total / 2];
}
function tickets(days: number[], costs: number[]) {
  const last = days[days.length - 1], visit = new Set(days), dp = [0];
  for (let d = 1; d <= last; d++) dp[d] = !visit.has(d) ? dp[d - 1] : Math.min(dp[d - 1] + costs[0], dp[Math.max(0, d - 7)] + costs[1], dp[Math.max(0, d - 30)] + costs[2]);
  return dp[last];
}
function canReach(a: number[]) {
  let reach = 0;
  for (let i = 0; i < a.length; i++) { if (i > reach) return false; reach = Math.max(reach, i + a[i]); }
  return true;
}

function make(id: ConceptId, variant: number): Omit<Challenge, 'id'> {
  const v = Math.abs(Math.trunc(variant));
  switch (id) {
    case 'stairs': {
      const n = 4 + (v % 9);
      const answer = stepsWays(n, 2);
      return {
        topic: 'Count the ways, one or two at a time', section: 'climbing-stairs', strategy: 'line',
        prompt: `A garden path has ${n} stepping stones beyond the gate. You move forward 1 or 2 stones at a time and must land exactly on stone ${n}. How many different sequences of moves get you there?`,
        question: 'Enter the number of sequences.', answer,
        hints: ['Look at the LAST move of any sequence. Where could it have started?', 'Let w[i] be the sequences that land on stone i. The last move came from i − 1 or i − 2.', 'w[0] = w[1] = 1 and w[i] = w[i − 1] + w[i − 2]. Two running numbers are enough.'],
        rubric: ['The state is “sequences that land on stone i”.', 'The last move splits sequences into two groups that never overlap, so they add.', 'w[0] = 1 (the empty sequence); O(n) time, O(1) space.'],
        explanation: `There are ${answer} sequences: w[${n}] = w[${n - 1}] + w[${n - 2}] = ${stepsWays(n - 1, 2)} + ${stepsWays(n - 2, 2)}.`,
      };
    }
    case 'min-cost': {
      const bases = [[10, 15, 20], [1, 100, 1, 1, 1, 100, 1, 1, 100, 1], [3, 7, 2, 8, 1, 9], [5, 5, 5, 5], [0, 4, 0, 4, 0], [9, 1, 9, 1, 1, 9]];
      const base = bases[v % bases.length];
      const cost = Math.floor(v / bases.length) % 2 ? [...base].reverse() : base;
      const answer = minCost(cost);
      return {
        topic: 'Cheapest climb with tolls', section: 'min-cost-stairs', strategy: 'line',
        prompt: `Stair tolls are ${arr(cost)}: standing on step i costs the i-th toll (steps start at 0). You may begin on step 0 or step 1 for free, move up 1 or 2 steps at a time, and finish on the landing just past the last step. What is the cheapest total toll?`,
        question: 'Enter the cheapest total.', answer,
        hints: ['What did the cheapest way to arrive at each position cost? The landing is a position too.', 'Arriving at position i from i − 1 pays toll i − 1; from i − 2 pays toll i − 2.', 'Start with 0 for positions 0 and 1, take the min of the two arrivals, and answer at position n, the landing.'],
        rubric: ['The state is the cheapest cost to ARRIVE at position i (0..n).', 'Min over the two possible last moves.', 'The answer is position n, past the last step; O(n) time, O(1) space possible.'],
        explanation: `The cheapest climb costs ${answer}.`,
      };
    }
    case 'robber': {
      const bases = [[2, 7, 9, 3, 1], [2, 1, 1, 2], [3, 4, 3], [5, 1, 1, 5, 1], [6, 7, 1, 30, 8, 2, 4], [4, 4, 4, 4, 4]];
      const base = bases[v % bases.length];
      const a = rotate(base, Math.floor(v / bases.length) % base.length);
      const answer = robLine(a);
      return {
        topic: 'Best total, no two neighbours', section: 'house-robber', strategy: 'line',
        prompt: `Houses along a straight street hold ${arr(a)} coins. You may collect from any houses you like, but never from two houses that stand next to each other. What is the most you can collect?`,
        question: 'Enter the most coins.', answer,
        hints: ['Decide only the last house. If you take it, which house is off-limits?', 'best[i] = the most from the first i houses: take house i − 1 (its coins + best[i − 2]) or skip it (best[i − 1]).', 'best[0] = 0; carry two running numbers; the answer is best[n].'],
        rubric: ['The state is the best total for a prefix of the street, whether or not its last house is used.', 'max(take: value + best two back, skip: best one back).', 'Alternating houses or biggest-first are wrong; O(n), O(1) space.'],
        explanation: `The most you can collect is ${answer}.`,
      };
    }
    case 'robber-circle': {
      const bases = [[2, 3, 2], [1, 2, 3, 1], [2, 7, 9, 3, 1], [4, 1, 2, 7, 5, 3, 1], [6, 3, 10, 8, 2, 10, 3, 5, 10, 5, 3], [9]];
      const base = bases[v % bases.length];
      const a = rotate(base, Math.floor(v / bases.length) % base.length);
      const answer = robCircle(a);
      return {
        topic: 'No two neighbours, on a ring', section: 'house-robber-circle', strategy: 'line',
        prompt: `${a.length} huts stand in a ring and hold ${arr(a)} coins, in order around the ring, so the first and last huts are neighbours. Never collect from two neighbouring huts. What is the most you can collect?`,
        question: 'Enter the most coins.', answer,
        hints: ['In any valid plan, can both the first and the last hut be used?', 'At least one end is always left alone. Solve each straight line that leaves one end out.', 'Answer = max(best of huts 0..n − 2, best of huts 1..n − 1); a single hut is its own answer.'],
        rubric: ['Some end of the ring is always skipped, so every plan lives on one of two straight lines.', 'Each line is the no-two-neighbours problem on a street.', 'Handle one hut separately; O(n) time, O(1) space.'],
        explanation: `The ring’s best is ${answer}.`,
      };
    }
    case 'decode': {
      const bases = ['226', '11106', '12', '2101', '1201234', '27', '100', '10', '06', '2611055971756562'];
      const s = bases[v % bases.length];
      const answer = decodeWays(s);
      return {
        topic: 'Count the readings of a digit string', section: 'decode-ways', strategy: 'pieces',
        prompt: `Letters were encoded as numbers, A = 1 through Z = 26, and written with no separators: "${s}". In how many ways can the message be read back as letters? (Answer 0 if it can’t be read at all.)`,
        question: 'Enter the number of readings.', answer,
        hints: ['The last letter used either the last digit or the last two. When is each allowed?', 'One digit: 1..9. Two digits: 10..26, which means no leading zero.', 'r[0] = 1; r[i] adds r[i − 1] if the one-digit case applies and r[i − 2] if the two-digit case applies.'],
        rubric: ['The state counts readings of the first i digits.', 'A 0 can only end a 10 or a 20; “06” is not a letter.', 'The empty prefix reads one way; O(n) time.'],
        explanation: `“${s}” has ${answer} reading(s).`,
      };
    }
    case 'coins': {
      const bases: [number[], number][] = [[[1, 2, 5], 11], [[1, 3, 4], 6], [[2], 3], [[2, 5], 8], [[3, 7], 11], [[5, 7], 3], [[1, 5, 6, 9], 11], [[4, 6], 14]];
      const [coins, amount0] = bases[v % bases.length];
      const amount = amount0 + (Math.floor(v / bases.length) % 3) * (coins.includes(1) ? 1 : 0);
      const answer = fewestCoins(coins, amount);
      return {
        topic: 'Fewest coins for an exact amount', section: 'coin-change', strategy: 'amount',
        prompt: `Coins come in values ${arr(coins)}, with an unlimited supply of each. What is the fewest coins that add up to exactly ${amount}? Answer −1 if it can’t be done.`,
        question: 'Enter the fewest coins (or −1).', answer,
        hints: ['You don’t know the best first coin. Do you know the best way to make every smaller amount?', 'f[a] = fewest coins for a. The last coin c leaves a − c.', 'f[0] = 0; f[a] = 1 + min f[a − c]; mark impossible amounts with amount + 1, not the largest int.'],
        rubric: ['The state is “fewest coins for exactly a”.', 'Try every coin as the last one; impossible stays impossible.', 'Biggest-coin-first can fail; O(amount × coins) time.'],
        explanation: answer < 0 ? `${amount} can’t be made from ${coins.join(', ')}.` : `${amount} needs ${answer} coin(s).`,
      };
    }
    case 'word-break': {
      const bases: [string, string[]][] = [['praysong', ['pray', 'prays', 'song']], ['catsandog', ['cats', 'dog', 'sand', 'and', 'cat']], ['applepenapple', ['apple', 'pen']], ['abcd', ['a', 'abc', 'b', 'cd']], ['aaaaaaab', ['a', 'aa', 'aaa']], ['leetcode', ['leet', 'code']], ['carsun', ['car', 'ca', 'rs', 'sun']]];
      const [s, words] = bases[v % bases.length];
      const answer = canSplit(s, words);
      return {
        topic: 'Cut a string into allowed words', section: 'word-break', strategy: 'pieces',
        prompt: `Can "${s}" be cut into pieces that all appear in the word list ${words.map(w => `"${w}"`).join(', ')}? Words may be used more than once.`,
        question: 'Enter yes or no.', answer,
        hints: ['Don’t guess the first word. For each position, could everything before it be read?', 'ok[i] is true if some j has ok[j] true and the piece from j to i is a word.', 'ok[0] = true; answer ok[n]. Taking the longest or shortest word first can fail.'],
        rubric: ['The state is “the first i characters can be split”.', 'Try every possible start of the last word; OR the results.', 'A hash set for words; O(n × L²) with L the longest word.'],
        explanation: answer ? `Yes, “${s}” splits into listed words.` : `No split of “${s}” uses only listed words.`,
      };
    }
    case 'lis': {
      const bases = [[10, 9, 2, 5, 3, 7, 101, 18], [0, 1, 0, 3, 2, 3], [7, 7, 7, 7, 7], [4, 10, 4, 3, 8, 9], [1, 3, 6, 7, 9, 4, 10, 5, 6], [3, 4, 1, 2, 8, 5, 6]];
      const base = bases[v % bases.length];
      const a = Math.floor(v / bases.length) % 2 ? base.map(x => x * 2 - 3) : base;
      const answer = lisInfo(a).best;
      return {
        topic: 'Longest rising selection, order kept', section: 'lis', strategy: 'ends',
        prompt: `From ${arr(a)}, keep some values (in their original order) so that each kept value is strictly larger than the one kept before it. What is the most values you can keep?`,
        question: 'Enter the largest count.', answer,
        hints: ['To decide whether a value can extend a selection, what must you know about that selection?', 'best[i] = the longest valid selection that ENDS with value i; extend any earlier smaller value.', 'The answer is the largest best[i], not the last one. (Smallest-tail shelves with binary search give O(n log n).)'],
        rubric: ['The state ends AT i, so it knows the last value.', 'Extend from every earlier j with a smaller value; O(n²).', 'Answer = max over all i, not best[n − 1].'],
        explanation: `At most ${answer} values can be kept.`,
      };
    }
    case 'count-lis': {
      const bases = [[1, 3, 5, 4, 7], [2, 2, 2, 2, 2], [1, 2, 4, 3, 5, 4, 7, 2], [3, 1, 2, 2, 4], [5, 4, 3, 2, 1]];
      const base = bases[v % bases.length];
      const a = rotate(base, Math.floor(v / bases.length) % base.length);
      const answer = lisInfo(a).count;
      return {
        topic: 'How many longest rising selections?', section: 'count-lis', strategy: 'ends',
        prompt: `From ${arr(a)}, keep values in their original order so that each kept value is strictly larger than the one before. How many different sets of positions reach the largest possible count?`,
        question: 'Enter the number of longest selections.', answer,
        hints: ['Alongside the longest length ending at each position, keep how many selections reach it.', 'An earlier j that gives a LONGER length replaces the count; one that gives an EQUAL length adds to it.', 'Sum the counts at every position whose length is the overall maximum.'],
        rubric: ['Two numbers per position: best length ending here, and how many reach it.', 'Longer replaces, equal adds.', 'Sum over all positions achieving the maximum; O(n²).'],
        explanation: `${answer} different selection(s) reach length ${lisInfo(a).best}.`,
      };
    }
    case 'longest-pal': {
      const bases = ['babad', 'cbbd', 'forgeeksskeegfor', 'abacdfgdcaba', 'aaaa', 'xyz', 'racecars', 'abccbx'];
      const s = bases[v % bases.length];
      const answer = centres(s).longest;
      return {
        topic: 'Longest mirror stretch', section: 'longest-palindrome', strategy: 'centres',
        prompt: `In "${s}", how long is the longest contiguous stretch that reads the same forwards and backwards? Use O(1) extra space.`,
        question: 'Enter the length.', answer,
        hints: ['A mirror stretch is a smaller one with a matching pair around it. Where can its middle be?', 'Middles are letters (odd length) or gaps between letters (even length): 2n − 1 of them.', 'From each middle, widen while both ends match; keep the longest window.'],
        rubric: ['2n − 1 centres, including gaps for even lengths.', 'Widen while the ends match; the last matching window counts.', 'O(n²) time, O(1) space; a 2-D table would need O(n²) space.'],
        explanation: `The longest such stretch has length ${answer}.`,
      };
    }
    case 'count-pal': {
      const bases = ['abc', 'aaa', 'abba', 'aabaa', 'racecar', 'abab', 'aaaa'];
      const s = bases[v % bases.length];
      const answer = centres(s).count;
      return {
        topic: 'Count every mirror stretch', section: 'palindromic-substrings', strategy: 'centres',
        prompt: `How many contiguous stretches of "${s}" read the same forwards and backwards? Stretches at different positions count separately, even if they spell the same thing.`,
        question: 'Enter the count.', answer,
        hints: ['Every mirror stretch has exactly one middle.', 'Use all 2n − 1 middles: letters and gaps.', 'Each successful widening from a middle is one more stretch; add them all.'],
        rubric: ['Each stretch is found exactly once, from its own centre.', 'Count widenings rather than remembering the longest.', 'O(n²) time, O(1) space.'],
        explanation: `“${s}” has ${answer} such stretches.`,
      };
    }
    case 'delete-earn': {
      const bases = [[3, 4, 2], [2, 2, 3, 3, 3, 4], [1, 1, 1, 2, 4, 5, 5, 5, 6], [8, 3, 4, 7, 6, 6, 9, 2, 5, 8], [1], [5, 5, 5]];
      const a = bases[v % bases.length];
      const answer = earn(a);
      return {
        topic: 'Take a value, lose its neighbours', section: 'delete-and-earn', strategy: 'line',
        prompt: `You are given ${arr(a)}. Repeatedly pick one number x, earn x points, then remove that copy along with every copy of x − 1 and x + 1. Continue until nothing is left. What is the most you can earn?`,
        question: 'Enter the most points.', answer,
        hints: ['If you take one x, is there any reason not to take every x?', 'Collapse each value into one pile worth x × (copies of x), ordered by value.', 'Taking a pile forbids the piles for x − 1 and x + 1: no two neighbouring piles. Best total over piles 0..max.'],
        rubric: ['Taking one copy of x means taking all of them.', 'Piles by value turn the rule into “no two neighbours”.', 'O(n + max value) time.'],
        explanation: `The most you can earn is ${answer}.`,
      };
    }
    case 'squares': {
      const n = [12, 13, 7, 43, 18, 27, 99, 50, 61][v % 9] + Math.floor(v / 9);
      const answer = squares(n);
      return {
        topic: 'Fewest squares for a total', section: 'perfect-squares', strategy: 'amount',
        prompt: `What is the smallest number of perfect squares (1, 4, 9, 16, …) that add up to exactly ${n}? A square may be used more than once.`,
        question: 'Enter the smallest count.', answer,
        hints: ['This is “fewest coins for an amount” — with which coins?', 'f[a] = fewest squares for a; the last square r² leaves a − r².', 'f[0] = 0; start each f[a] at a (all ones), then try every r with r² ≤ a.'],
        rubric: ['Squares are the coins; 1 guarantees every amount is reachable.', 'Try every square as the last one.', 'Biggest-square-first can fail (12 → 9 + 1 + 1 + 1); O(n √n).'],
        explanation: `${n} needs ${answer} square(s).`,
      };
    }
    case 'partition': {
      const bases = [[1, 5, 11, 5], [1, 2, 3, 5], [1, 2, 5], [2, 2, 3, 5], [3, 3, 3, 4, 5], [1, 1], [7], [14, 9, 8, 4, 3, 2]];
      const a = bases[v % bases.length];
      const answer = partition(a);
      return {
        topic: 'Two groups, equal totals, each item once', section: 'partition-preview', strategy: 'amount',
        prompt: `Can ${arr(a)} be split into two groups with equal totals, every number going into exactly one group?`,
        question: 'Enter yes or no.', answer,
        hints: ['Two equal groups means one group totals exactly half. What if the total is odd?', 'can[s] = some subset of the numbers seen so far totals s; start with can[0] = true.', 'For each number x, update s from half DOWN to x, so x is used at most once.'],
        rubric: ['Reduce to “does a subset total half?”, with odd totals ruled out.', 'One boolean row; each number updates it once.', 'The inner loop runs downward; upward would reuse a number. O(n × total).'],
        explanation: answer ? 'Yes: some subset totals exactly half.' : 'No subset totals exactly half.',
      };
    }
    case 'k-steps': {
      const k = 2 + (v % 3), n = 5 + (Math.floor(v / 3) % 6);
      const answer = stepsWays(n, k);
      return {
        topic: 'Count the ways, up to k at a time', section: 'k-steps', strategy: 'line',
        prompt: `A garden path has ${n} stepping stones beyond the gate. Each move goes forward between 1 and ${k} stones, and you must land exactly on stone ${n}. How many different sequences of moves get you there?`,
        question: 'Enter the number of sequences.', answer,
        hints: ['The last move is now one of several lengths. How many earlier counts does each new count read?', `w[i] = w[i − 1] + … + w[i − ${k}], ignoring negative positions, with w[0] = 1.`, 'Keep a running sum of the last k counts: add the newest, drop the one that falls out of reach.'],
        rubric: ['Same “last move” split as the 1-or-2 version, with k groups.', 'w[0] = 1; base cases decide the sequence.', 'O(n × k), or O(n) with a running window sum.'],
        explanation: `There are ${answer} sequences.`,
      };
    }
    case 'tickets': {
      const bases: [number[], number[]][] = [[[1, 4, 6, 7, 8, 20], [2, 7, 15]], [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 30, 31], [2, 7, 15]], [[3, 5, 6, 30, 31, 32, 33], [4, 10, 25]], [[1, 50, 100], [3, 9, 30]], [[2, 3, 4, 5, 6, 7, 8], [3, 12, 40]]];
      const [days, costs] = bases[v % bases.length];
      const answer = tickets(days, costs);
      return {
        topic: 'Cheapest passes for travel days', section: 'tickets', strategy: 'pieces',
        prompt: `A pilgrim travels on days ${arr(days)} of the year. A 1-day pass costs ${costs[0]}, a 7-day pass costs ${costs[1]} and a 30-day pass costs ${costs[2]}; each covers that many consecutive days starting the day it is first used. What is the cheapest way to cover every travel day?`,
        question: 'Enter the cheapest total.', answer,
        hints: ['Index by calendar day. What does a day without travel add?', 'c[d] = cheapest cover for travel on days 1..d. On a travel day, the last pass bought covers day d.', 'c[d] = min(c[d − 1] + 1-day, c[d − 7] + 7-day, c[d − 30] + 30-day), clamping negative days to 0.'],
        rubric: ['The state runs over calendar days; quiet days copy the day before.', 'Try each pass as the one covering day d.', 'O(last day) time and space.'],
        explanation: `The cheapest cover costs ${answer}.`,
      };
    }
    case 'jump': {
      const bases = [[2, 3, 1, 1, 4], [3, 2, 1, 0, 4], [0], [1, 0, 1], [2, 0, 0], [1, 1, 0, 1], [4, 0, 0, 0, 0, 1]];
      const a = bases[v % bases.length];
      const answer = canReach(a);
      return {
        topic: 'Know when to choose another tool', section: 'choose-the-tool', strategy: 'other',
        prompt: `Each position of ${arr(a)} says the farthest you may jump forward from it (any shorter jump is allowed too). Starting at position 0, can you reach the last position? Use O(n) time and O(1) extra space.`,
        question: 'Enter yes or no.', answer,
        hints: ['What single number would summarise every position you can reach so far?', 'Carry the farthest reachable position; every position up to it is reachable.', 'Walk forward; if you ever stand beyond the farthest reach, the answer is no.'],
        rubric: ['One number (the farthest reach) replaces a whole table of reachable flags.', 'Fail as soon as the walk passes the reach.', 'O(n) time, O(1) space; a reachability table would be O(n²).'],
        explanation: answer ? 'Yes: the farthest reach never falls behind the walk.' : 'No: the walk passes the farthest reach before the end.',
      };
    }
  }
}

export function challengeFor(id: string, variant = 0): Challenge {
  return { id, question: 'Enter only the result.', ...make(id as ConceptId, variant) };
}

export const practice: PracticeSet = {
  storageKey: 'citadel-dp-1d-review-v1',
  strategies,
  conceptIds,
  challengeFor,
};

