// Independent practice for the Greedy lesson. Prompts never name the pattern; inputs vary with `variant`.
import type { Challenge, PracticeSet } from '../../lib/practice.ts';

export const strategies = {
  run: 'Carry one running value; drop it the moment it becomes a burden',
  extremes: 'Carry both the largest and the smallest running value',
  reach: 'Track the farthest point reachable so far, round by round',
  cover: 'Extend the current piece until it covers everything it promised',
  forced: 'Sort, then make the one move that cannot be wrong (smallest or heaviest first)',
  steps: 'Collect every gain that costs nothing, one small step at a time',
  passes: 'One pass per direction; keep the stricter requirement',
  range: 'Track the lowest and highest possible value instead of one guess',
  filter: 'Throw away what can never be safe, then combine everything left',
  other: 'No local rule survives a counterexample: try every option, with memory',
} as const;

export const conceptIds = [
  'best-run', 'best-product', 'circuit', 'reach', 'fewest-jumps', 'pieces', 'straights',
  'trades', 'cookies', 'boats', 'candy', 'wildcards', 'triplets', 'coins', 'knapsack',
] as const;
type ConceptId = typeof conceptIds[number];

const arr = (a: number[]) => `[${a.join(', ')}]`;
const rotate = <T>(a: T[], by: number) => (a.length ? a.map((_, i) => a[(i + by) % a.length]) : []);
const sum = (a: number[], l: number, r: number) => { let s = 0; for (let i = l; i <= r; i++) s += a[i]; return s; };
const prod = (a: number[], l: number, r: number) => { let p = 1; for (let i = l; i <= r; i++) p *= a[i]; return p + 0; };

// ---- answers computed by brute force, never by the technique the lesson teaches ----
function bestOver(a: number[], f: (l: number, r: number) => number) {
  let best = -Infinity;
  for (let l = 0; l < a.length; l++) for (let r = l; r < a.length; r++) best = Math.max(best, f(l, r));
  return best;
}
function circuitStart(gas: number[], cost: number[]) {
  const n = gas.length;
  for (let s = 0; s < n; s++) {
    let tank = 0, ok = true;
    for (let k = 0; k < n && ok; k++) { const i = (s + k) % n; tank += gas[i] - cost[i]; if (tank < 0) ok = false; }
    if (ok) return s;
  }
  return -1;
}
function bfsJumps(a: number[]) {
  const dist = a.map(() => -1); dist[0] = 0;
  const queue = [0];
  while (queue.length) { const i = queue.shift()!; for (let j = i + 1; j <= Math.min(a.length - 1, i + a[i]); j++) if (dist[j] < 0) { dist[j] = dist[i] + 1; queue.push(j); } }
  return dist[a.length - 1];
}
function maxPieces(s: string) {
  // A cut after index i is legal exactly when no letter appears on both sides of it.
  const sizes: number[] = [];
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const left = new Set(s.slice(0, i + 1)), right = s.slice(i + 1);
    if (![...right].some(ch => left.has(ch))) { sizes.push(i + 1 - start); start = i + 1; }
  }
  return sizes;
}
function canGroup(cards: number[], w: number): boolean {
  if (!cards.length) return true;
  for (const startValue of new Set(cards)) {
    const left = [...cards]; let ok = true;
    for (let v = startValue; v < startValue + w && ok; v++) { const k = left.indexOf(v); if (k < 0) ok = false; else left.splice(k, 1); }
    if (ok && canGroup(left, w)) return true;
  }
  return false;
}
function bestTrades(p: number[], day = 0, holding: number | null = null): number {
  if (day === p.length) return 0;
  const skip = bestTrades(p, day + 1, holding);
  if (holding === null) return Math.max(skip, bestTrades(p, day + 1, p[day]));
  return Math.max(skip, p[day] - holding + bestTrades(p, day, null));   // sell today; may buy again today
}
function bestCookies(g: number[], s: number[], child = 0, used = 0): number {
  if (child === g.length) return 0;
  let best = bestCookies(g, s, child + 1, used);                         // this child gets nothing
  for (let c = 0; c < s.length; c++) if (!(used >> c & 1) && s[c] >= g[child]) best = Math.max(best, 1 + bestCookies(g, s, child + 1, used | 1 << c));
  return best;
}
function fewestBoats(people: number[], limit: number): number {
  if (!people.length) return 0;
  const [first, ...rest] = people;
  let best = 1 + fewestBoats(rest, limit);
  rest.forEach((p, k) => { if (first + p <= limit) best = Math.min(best, 1 + fewestBoats(rest.filter((_, m) => m !== k), limit)); });
  return best;
}
function leastCandy(r: number[]) {
  const c = r.map(() => 1);
  for (let changed = true; changed;) {
    changed = false;
    for (let i = 0; i < r.length; i++) {
      if (i > 0 && r[i] > r[i - 1] && c[i] <= c[i - 1]) { c[i] = c[i - 1] + 1; changed = true; }
      if (i + 1 < r.length && r[i] > r[i + 1] && c[i] <= c[i + 1]) { c[i] = c[i + 1] + 1; changed = true; }
    }
  }
  return c.reduce((x, y) => x + y, 0);
}
function wildOk(s: string): boolean {
  const k = s.indexOf('*');
  if (k < 0) { let open = 0; for (const ch of s) { open += ch === '(' ? 1 : -1; if (open < 0) return false; } return open === 0; }
  return ['(', ')', ''].some(rep => wildOk(s.slice(0, k) + rep + s.slice(k + 1)));
}
function tripletsOk(ts: number[][], target: number[]) {
  for (let mask = 1; mask < 1 << ts.length; mask++) {
    const m = [0, 1, 2].map(k => Math.max(...ts.filter((_, j) => mask >> j & 1).map(t => t[k])));
    if (m.every((x, k) => x === target[k])) return true;
  }
  return false;
}
function fewestCoins(coins: number[], amount: number) {
  const best = Array(amount + 1).fill(Infinity); best[0] = 0;
  for (let a = 1; a <= amount; a++) for (const c of coins) if (c <= a) best[a] = Math.min(best[a], best[a - c] + 1);
  return best[amount] === Infinity ? -1 : best[amount];
}
function bestKnapsack(items: [number, number][], cap: number) {
  let best = 0;
  for (let mask = 0; mask < 1 << items.length; mask++) {
    let w = 0, v = 0;
    items.forEach(([wi, vi], k) => { if (mask >> k & 1) { w += wi; v += vi; } });
    if (w <= cap) best = Math.max(best, v);
  }
  return best;
}

function make(id: ConceptId, variant: number): Omit<Challenge, 'id'> {
  const v = Math.abs(Math.trunc(variant));
  switch (id) {
    case 'best-run': {
      const bases = [[-2, 1, -3, 4, -1, 2, 1, -5, 4], [5, 4, -1, 7, 8], [-3, -1, -2], [2, -8, 3, -2, 4, -10], [-1, 3, -2, 3, -6, 2], [6, -7, 2, 2, -1, 3]];
      const base = bases[v % bases.length];
      const a = rotate(base, Math.floor(v / bases.length) % base.length);
      const answer = bestOver(a, (l, r) => sum(a, l, r));
      return {
        topic: 'Best contiguous total', section: 'max-subarray', strategy: 'run',
        prompt: `What is the largest total of a contiguous, non-empty stretch of ${arr(a)}? Aim for one pass and O(1) extra space.`,
        question: 'Enter the total.', answer,
        hints: ['The best stretch ending at position i either starts at i, or extends the best stretch ending at i − 1.', 'When would carrying the earlier stretch make things worse?', 'Restart whenever the carried total is negative; track the largest carried total ever seen, starting from the first value, not from 0.'],
        rubric: ['The carried total is the best total of a stretch ending at the current position.', 'It restarts exactly when it has become negative: a negative prefix only lowers what follows.', 'Best starts at the first value, so an all-negative list returns its largest value. O(n) time, O(1) space.'],
        explanation: `The largest stretch total is ${answer}.`,
      };
    }
    case 'best-product': {
      const bases = [[2, 3, -2, 4], [-2, 0, -1], [-2, 3, -4], [0, 2], [-1, -2, -3], [3, -1, 4], [2, -5, -2, -4, 3]];
      const base = bases[v % bases.length];
      const a = rotate(base, Math.floor(v / bases.length) % base.length);
      const answer = bestOver(a, (l, r) => prod(a, l, r));
      return {
        topic: 'Best contiguous product', section: 'max-product', strategy: 'extremes',
        prompt: `What is the largest product of a contiguous, non-empty stretch of ${arr(a)}? Values may be negative or zero. Aim for one pass.`,
        question: 'Enter the product.', answer,
        hints: ['Multiplying by a negative value turns the smallest product into the largest.', 'At each position carry two products of stretches ending there: the largest and the smallest.', 'The new largest is the max of the value alone, old largest × value, and old smallest × value; the new smallest is the min of the same three.'],
        rubric: ['Both the largest and the smallest product ending here are carried.', 'Both are computed from the OLD values before either is overwritten.', 'The value alone is always a candidate, so a zero resets both. O(n) time, O(1) space.'],
        explanation: `The largest stretch product is ${answer}.`,
      };
    }
    case 'circuit': {
      const bases: [number[], number[]][] = [[[1, 2, 3, 4, 5], [3, 4, 5, 1, 2]], [[2, 3, 4], [3, 4, 3]], [[4, 1, 1, 6], [1, 2, 5, 1]], [[5, 1, 2, 3, 4], [4, 4, 1, 5, 1]], [[3, 1, 1], [1, 2, 2]], [[1, 1, 1], [1, 2, 1]]];
      const [g0, c0] = bases[v % bases.length];
      const by = Math.floor(v / bases.length) % g0.length;
      const gas = rotate(g0, by), cost = rotate(c0, by);
      const answer = circuitStart(gas, cost);
      return {
        topic: 'Where to start a loop', section: 'gas-station', strategy: 'run',
        prompt: `A ring road has ${gas.length} depots, numbered from 0. The fuel you can take on at each depot, in order: ${arr(gas)}. The fuel burned driving from each depot to the next one: ${arr(cost)}. You start with an empty tank. From which depot can you drive the whole loop once? Answer −1 if none can. (At most one depot works.)`,
        question: 'Enter the depot number (or −1).', answer,
        hints: ['First decide whether any depot can work at all. That depends on two totals only.', 'Drive from depot 0, tracking fuel since your chosen start. If it goes negative after depot i, which starts are ruled out?', 'Restart just after the depot where you ran dry. If total fuel ≥ total burn, that last restart point is the answer.'],
        rubric: ['Total fuel < total burn means −1: every lap loses fuel.', 'Running dry after depot i rules out every depot from the current start to i, because each was reached with fuel ≥ 0.', 'With totals non-negative, the start after the last deficit completes the loop. O(n), one pass.'],
        explanation: answer >= 0 ? `Depot ${answer} completes the loop.` : 'Total fuel is less than total burn, so no depot works.',
      };
    }
    case 'reach': {
      const bases = [[2, 3, 1, 1, 4], [3, 2, 1, 0, 4], [2, 0, 0], [1, 0, 1], [0], [2, 0, 1, 0], [1, 2, 0, 1], [4, 0, 0, 0, 0, 1], [1, 1, 0, 2]];
      const a = bases[v % bases.length];
      const answer = bfsJumps(a) >= 0;
      return {
        topic: 'Can you reach the end?', section: 'jump-game', strategy: 'reach',
        prompt: `You stand on stone 0 of ${arr(a)}. From stone i you may jump forward any distance from 1 up to the number on it. Can you reach the last stone?`,
        question: 'Enter yes or no.', answer,
        hints: ['If you can reach stone j, can you reach every stone before it?', 'Then the reachable stones form one block starting at 0. Track where that block ends.', 'Walk forward; if your position ever passes the end of the block, you are stuck. Otherwise extend the block with i + value.'],
        rubric: ['Reachable stones always form a single block 0..far.', 'far = max(far, i + value) for every stone inside the block.', 'Answer no as soon as i > far; O(n), O(1) space.'],
        explanation: answer ? 'The reachable block grows to cover the last stone.' : 'The reachable block stops short of the last stone.',
      };
    }
    case 'fewest-jumps': {
      const bases = [[2, 3, 1, 1, 4], [2, 3, 0, 1, 4], [1, 1, 1, 1], [0], [3, 1, 1, 1, 1, 1], [1, 2, 1, 1, 1], [5, 1, 1, 1, 1, 1, 1], [2, 1, 3, 1, 1, 1, 1]];
      const a = bases[v % bases.length];
      const answer = bfsJumps(a);
      return {
        topic: 'Fewest moves to the end', section: 'jump-game-ii', strategy: 'reach',
        prompt: `You stand on stone 0 of ${arr(a)}. From stone i you may jump forward any distance from 1 up to the number on it. The last stone is always reachable. What is the fewest number of jumps that reaches it?`,
        question: 'Enter the number of jumps.', answer,
        hints: ['Think in rounds: which stones can you reach with one jump? With at most two?', 'Each round is a block of stones. While scanning one block, track the farthest any stone in it reaches.', 'When the scan hits the end of the current block, count one jump and make the farthest reach the end of the next block. Never jump from the last stone.'],
        rubric: ['Stones reachable in at most k jumps form one block; the next block ends at the farthest reach from this one.', 'A jump is counted only when the scan crosses the end of a block.', 'This is breadth-first search by levels without a queue: O(n), O(1) space.'],
        explanation: `The fewest jumps is ${answer}.`,
      };
    }
    case 'pieces': {
      const words = ['ababcbacadefegdehijhklij', 'eccbbbbdec', 'abcab', 'caedbdedda', 'abacdcef', 'qiejxqfnqceocmy', 'aabbcc', 'abba'];
      const s = words[v % words.length];
      const answer = maxPieces(s);
      return {
        topic: 'Cut into the most pieces', section: 'partition-labels', strategy: 'cover',
        prompt: `Cut the string “${s}” into as many contiguous pieces as possible so that each letter appears in at most one piece. List the piece lengths from left to right.`,
        question: 'Enter the lengths, e.g. 3, 2.', answer,
        hints: ['If a letter appears in a piece, all its copies must be in that piece.', 'Record where each letter appears for the last time.', 'Walk the string, stretching the current piece to the farthest last appearance of any letter in it. When the walk reaches that point, cut.'],
        rubric: ['A first pass records each letter’s last index.', 'end = max(end, last[letter]) for every letter in the current piece; cut when i == end.', 'Cutting at every safe point gives the most pieces. O(n) time, O(alphabet) space.'],
        explanation: `The pieces have lengths ${arr(answer)}.`,
      };
    }
    case 'straights': {
      const bases: [number[], number][] = [[[1, 2, 3, 6, 2, 3, 4, 7, 8], 3], [[1, 2, 3, 4, 5], 4], [[1, 1, 2, 2, 3, 3], 3], [[1, 1, 2, 2, 3, 4], 3], [[3, 2, 1, 2, 3, 4, 3, 4, 5, 9, 10, 11], 3], [[8, 10, 12], 3], [[5, 6, 6, 7], 2], [[2, 1, 3, 4, 5, 6], 3]];
      const [base, w] = bases[v % bases.length];
      const cards = rotate(base, Math.floor(v / bases.length) % base.length);
      const answer = canGroup(cards, w);
      return {
        topic: 'Groups of consecutive cards', section: 'hand-of-straights', strategy: 'forced',
        prompt: `Can the cards ${arr(cards)} be split into groups of exactly ${w} cards, where each group's values are consecutive (like 4, 5, 6)? Every card must be used.`,
        question: 'Enter yes or no.', answer,
        hints: ['Look at the smallest card. Which group can it belong to?', 'Nothing is smaller, so it must be the first card of its group. That group is fixed.', 'Keep counts in sorted order. Repeatedly take the smallest value and remove one of each value up to smallest + size − 1; a missing value means no.'],
        rubric: ['The hand size must be a multiple of the group size.', 'The smallest remaining card is forced to start a group, so no choice can be regretted.', 'A sorted count map makes this O(n log n).'],
        explanation: answer ? 'Starting each group at the smallest remaining card uses every card.' : 'At some point the smallest remaining card cannot complete its forced group.',
      };
    }
    case 'trades': {
      const bases = [[7, 1, 5, 3, 6, 4], [1, 2, 3, 4, 5], [7, 6, 4, 3, 1], [3, 3, 5, 0, 0, 3, 1, 4], [2, 1, 2, 0, 1], [1, 7, 2, 9, 4]];
      const base = bases[v % bases.length];
      const p = rotate(base, Math.floor(v / bases.length) % base.length);
      const answer = bestTrades(p);
      return {
        topic: 'Many trades', section: 'stock-ii', strategy: 'steps',
        prompt: `A share's price on consecutive days is ${arr(p)}. You may hold at most one share at a time but may buy and sell as often as you like (selling and buying again on the same day is allowed). What is the largest total profit?`,
        question: 'Enter the profit.', answer,
        hints: ['A trade from day a to day b earns the sum of the day-to-day changes between them.', 'Could you earn each rising day-to-day step separately?', 'Add up max(0, today − yesterday) over all days.'],
        rubric: ['Any trade’s profit is a sum of consecutive daily changes.', 'Every rising step can be earned alone, and no falling step ever has to be taken.', 'So the answer is the sum of positive daily changes: O(n), O(1).'],
        explanation: `The largest profit is ${answer}.`,
      };
    }
    case 'cookies': {
      const bases: [number[], number[]][] = [[[1, 2, 3], [1, 1]], [[1, 2], [1, 2, 3]], [[10, 9, 8, 7], [5, 6, 7, 8]], [[2, 2, 3], [1, 2, 2, 3]], [[4], [1, 2, 3]], [[1, 3, 3, 5], [2, 3, 4]]];
      const [g0, s0] = bases[v % bases.length];
      const by = Math.floor(v / bases.length);
      const g = rotate(g0, by % g0.length), s = rotate(s0, by % s0.length);
      const answer = bestCookies(g, s);
      return {
        topic: 'Satisfy the most people', section: 'assign-cookies', strategy: 'forced',
        prompt: `Children need snacks of at least these sizes: ${arr(g)}. The snacks available have sizes ${arr(s)}. Each child gets at most one snack and each snack goes to at most one child. How many children can be satisfied?`,
        question: 'Enter the number of children.', answer,
        hints: ['Which child is easiest to satisfy, and which snack is the cheapest that does it?', 'Sort both lists. Try snacks from smallest to largest against the least demanding child still waiting.', 'If the snack is big enough, that child is satisfied; either way the snack is used up or useless to everyone still waiting.'],
        rubric: ['Both lists are sorted.', 'The smallest snack that fits the least demanding child is never a wrong choice (exchange argument).', 'A snack too small for the least demanding child is too small for everyone. O(n log n).'],
        explanation: `${answer} child(ren) can be satisfied.`,
      };
    }
    case 'boats': {
      const bases: [number[], number][] = [[[1, 2], 3], [[3, 2, 2, 1], 3], [[3, 5, 3, 4], 5], [[2, 4, 1, 3, 5], 5], [[2, 2, 2, 2], 4], [[5, 1, 4, 2], 6]];
      const [base, limit] = bases[v % bases.length];
      const people = rotate(base, Math.floor(v / bases.length) % base.length);
      const answer = fewestBoats(people, limit);
      return {
        topic: 'Fewest boats', section: 'boats', strategy: 'forced',
        prompt: `People weigh ${arr(people)}. Each boat carries at most 2 people and at most ${limit} in total weight (nobody is heavier than ${limit}). What is the fewest number of boats that carries everyone?`,
        question: 'Enter the number of boats.', answer,
        hints: ['Focus on the heaviest person. Who could share their boat?', 'If the lightest person cannot ride with the heaviest, nobody can.', 'Sort; pair the heaviest with the lightest when they fit, otherwise send the heaviest alone. Repeat.'],
        rubric: ['The heaviest person always leaves in the next boat.', 'Pairing them with the lightest is safe: any other partner could be swapped for the lightest.', 'Two indices over the sorted list: O(n log n).'],
        explanation: `${answer} boat(s) are needed.`,
      };
    }
    case 'candy': {
      const bases = [[1, 0, 2], [1, 2, 2], [1, 3, 4, 5, 2], [1, 2, 87, 87, 87, 2, 1], [5, 4, 3, 2, 1], [2, 2, 2], [1, 6, 10, 8, 7, 3, 2]];
      const base = bases[v % bases.length];
      const r = rotate(base, Math.floor(v / bases.length) % base.length);
      const answer = leastCandy(r);
      return {
        topic: 'Fewest sweets, neighbour rules', section: 'candy', strategy: 'passes',
        prompt: `Children stand in a line with scores ${arr(r)}. Each child gets at least one sweet, and a child with a higher score than an immediate neighbour must get more sweets than that neighbour. What is the fewest number of sweets in total?`,
        question: 'Enter the total.', answer,
        hints: ['Each child has two rules: one about the left neighbour, one about the right.', 'Satisfy the left rules in a pass left to right, then the right rules in a pass right to left.', 'In the second pass keep the larger of the two requirements; then add everything up.'],
        rubric: ['The left pass gives the least amount the left rules force.', 'The right pass takes max(current, right neighbour + 1) so it never breaks a left rule.', 'Each value is the larger of two lower bounds, so the total is minimal. O(n).'],
        explanation: `The fewest sweets is ${answer}.`,
      };
    }
    case 'wildcards': {
      const words = ['()', '(*)', '(*))', '((*', ')*(', '(((**)', '*(**', '(()*', '**())', '(*()'];
      const s = words[v % words.length];
      const answer = wildOk(s);
      return {
        topic: 'Brackets with jokers', section: 'wildcard-parens', strategy: 'range',
        prompt: `In “${s}”, each * may be read as “(”, as “)”, or as nothing. Can the string be read as correctly matched brackets?`,
        question: 'Enter yes or no.', answer,
        hints: ['Instead of choosing what each * is, keep track of every possible number of open brackets.', 'Those possibilities always form a range from a lowest to a highest count.', '“(” moves both ends up, “)” both down, “*” lowers the lowest and raises the highest. Fail if the highest drops below 0; never let the lowest go below 0; succeed if the lowest ends at 0.'],
        rubric: ['The set of possible open counts is a contiguous range lo..hi.', 'hi < 0 means too many closers even with every * as an opener.', 'lo is clamped at 0, and the answer is lo == 0 at the end. O(n), O(1).'],
        explanation: answer ? 'Some reading of the jokers matches every bracket.' : 'No reading of the jokers matches every bracket.',
      };
    }
    case 'triplets': {
      const bases: [number[][], number[]][] = [
        [[[2, 5, 3], [1, 8, 4], [1, 7, 5]], [2, 7, 5]], [[[3, 4, 5], [4, 5, 6]], [3, 2, 5]],
        [[[2, 5, 3], [2, 3, 4], [1, 2, 5], [5, 2, 3]], [5, 5, 5]], [[[2, 9, 5], [1, 7, 1]], [2, 7, 5]],
        [[[1, 2, 3], [3, 1, 2]], [3, 2, 3]], [[[1, 3, 4], [2, 5, 8]], [2, 5, 8]],
      ];
      const [t0, target] = bases[v % bases.length];
      const ts = rotate(t0, Math.floor(v / bases.length) % t0.length);
      const answer = tripletsOk(ts, target);
      const show = (t: number[]) => `(${t.join(', ')})`;
      return {
        topic: 'Build a target by maxima', section: 'merge-triplets', strategy: 'filter',
        prompt: `You have the triples ${ts.map(show).join(', ')}. One operation picks two triples and replaces the second with their position-by-position maximum. Can some triple become exactly ${show(target)}?`,
        question: 'Enter yes or no.', answer,
        hints: ['Maxima never go down. Which triples could never be part of a merge that ends at the target?', 'Any triple with a value larger than the target in the same position overshoots for good.', 'Merge every other triple; check that each of the three positions is matched exactly by at least one of them.'],
        rubric: ['Triples that exceed the target anywhere are discarded.', 'Every remaining triple is safe to merge: its maxima stay within the target.', 'Answer yes exactly when the safe triples together hit all three target values. O(n).'],
        explanation: answer ? 'The safe triples together reach every target value.' : 'The safe triples cannot reach every target value.',
      };
    }
    case 'coins': {
      const bases: [number[], number][] = [[[1, 3, 4], 6], [[1, 3, 4], 10], [[1, 5, 6, 9], 11], [[1, 7, 10], 14], [[2, 5], 3], [[1, 3, 4], 7], [[2, 5], 11]];
      const [coins, amount] = bases[v % bases.length];
      const answer = fewestCoins(coins, amount);
      return {
        topic: 'Know when to choose another tool', section: 'choose-the-tool', strategy: 'other',
        prompt: `Coins come in values ${arr(coins)}, with an unlimited supply of each. What is the fewest number of coins that adds up to exactly ${amount}? Answer −1 if it cannot be done.`,
        question: 'Enter the number of coins (or −1).', answer,
        hints: ['Try “largest coin first” on this input and compare with every other combination.', 'If it fails even once, no local rule is safe: the best answer for an amount depends on smaller amounts.', 'best[a] = 1 + min over coins c ≤ a of best[a − c], with best[0] = 0.'],
        rubric: ['A counterexample to largest-first was checked before trusting it.', 'Every amount from 0 up to the target is solved once and reused.', 'O(amount × coins) time, O(amount) space.'],
        explanation: answer >= 0 ? `The fewest coins is ${answer}. Taking the largest coin first is not reliable for this coin set.` : 'No combination adds up to that amount.',
      };
    }
    case 'knapsack': {
      const bases: [[number, number][], number][] = [
        [[[10, 60], [20, 100], [30, 120]], 50], [[[5, 10], [4, 40], [6, 30], [3, 50]], 10],
        [[[3, 4], [4, 5], [2, 3]], 6], [[[1, 1], [3, 4], [4, 5], [5, 7]], 7],
      ];
      const [items, cap] = bases[v % bases.length];
      const shown = rotate(items, Math.floor(v / bases.length) % items.length);
      const answer = bestKnapsack(shown, cap);
      return {
        topic: 'Know when to choose another tool', section: 'choose-the-tool', strategy: 'other',
        prompt: `A bag holds at most ${cap} kg. The items, as (weight, value): ${shown.map(([w, x]) => `(${w}, ${x})`).join(', ')}. Each item is taken whole or left behind. What is the largest total value you can carry?`,
        question: 'Enter the value.', answer,
        hints: ['Try “best value per kg first” and compare with every other choice of items.', 'Whole items can leave useless empty space, which breaks any exchange argument.', 'best[c] over capacities: for each item, from c = capacity down to its weight, best[c] = max(best[c], best[c − w] + value).'],
        rubric: ['A counterexample to the ratio rule was checked.', 'Each capacity is solved once per item (0/1 knapsack).', 'O(items × capacity) time; with fractions allowed, the ratio rule would be optimal.'],
        explanation: `The best value is ${answer}.`,
      };
    }
  }
}

export function challengeFor(id: string, variant = 0): Challenge {
  return { id, question: 'Enter only the result.', ...make(id as ConceptId, variant) };
}

export const practice: PracticeSet = {
  storageKey: 'citadel-greedy-review-v1',
  strategies,
  conceptIds,
  challengeFor,
};
