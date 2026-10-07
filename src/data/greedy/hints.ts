// Three-step hint ladders for every <HintLadder> in greedy.mdx.
export const hints: Record<string, [string, string, string]> = {
  kadane: [
    'Stand at index i. The best stretch that ENDS here either starts here, or extends the best stretch that ended one step earlier. When is extending a bad deal?',
    'Carry run = the best total of a stretch ending at the current index, and best = the largest run ever seen. Start both at nums[0], never at 0: the stretch must be non-empty.',
    'For i from 1: run = max(nums[i], run + nums[i]) — restart when the old run is negative. Then best = max(best, run). Return best.',
  ],
  product: [
    'The product of a stretch ending at i is nums[i] times the product of a stretch ending at i − 1 (or nums[i] alone). Which earlier product makes it largest when nums[i] is negative?',
    'Carry two values: hi, the largest product of a stretch ending here, and lo, the smallest. A negative value swaps their roles; a zero resets both.',
    'For each new x: the candidates are x, hi × x and lo × x. Compute both products BEFORE overwriting hi; new hi = max of the three, new lo = min of the three, best = max(best, hi).',
  ],
  gas: [
    'Two separate questions: does ANY start work, and if so, which one? The first depends only on the totals.',
    'Carry total (all gains so far) and tank (gains since the current start). When tank drops below 0 after station i, no station from start to i can be a start.',
    'On tank < 0: start = i + 1, tank = 0. After the pass, return total ≥ 0 ? start : −1.',
  ],
  jump: [
    'If you can reach stone j, can you reach every stone before j? What does that say about the shape of the reachable set?',
    'The reachable stones always form one block 0..far. Carry far, the farthest stone reachable using the stones seen so far.',
    'Walk i from 0. If i > far, return false: there is a gap. Otherwise far = max(far, i + nums[i]). If the walk finishes, return true.',
  ],
  jump2: [
    'Think in rounds: the stones reachable with exactly one jump, then with at most two, and so on. What shape does each round have?',
    'Each round is a window ending at end. While scanning a window, carry far = the farthest any stone in it can reach. That is where the next window ends.',
    'For i from 0 to n − 2: far = max(far, i + nums[i]); if i == end, jumps++ and end = far. Stop before the last stone: you never jump from it.',
  ],
  partition: [
    'If a letter appears in a piece, every copy of that letter must be in that piece. What does the piece’s right edge have to reach?',
    'First pass: last[c] = the index of the last copy of letter c. Second pass: carry start and end, where end is the farthest last[c] of any letter seen in the current piece.',
    'At each i: end = max(end, last[s[i]]). If i == end, the piece start..i is closed: record its size and set start = i + 1.',
  ],
  straights: [
    'Look at the smallest card in the hand. Which group can it possibly belong to?',
    'The smallest card has nothing below it, so it must START a group: smallest, smallest + 1, …, smallest + groupSize − 1. Keep counts in a TreeMap so the smallest is always at hand.',
    'If the hand size is not a multiple of groupSize, return false. While cards remain: take first = firstKey(); for each value first .. first + groupSize − 1, decrement its count or return false if missing.',
  ],
  stock: [
    'A trade that buys on day a and sells on day b earns the sum of the day-to-day price changes from a to b.',
    'Every rising day-to-day step can be earned on its own (buy, sell the next day), and no falling step ever has to be taken.',
    'profit = sum over i of max(0, prices[i] − prices[i − 1]).',
  ],
  cookies: [
    'Who is easiest to satisfy, and which cookie is the least valuable one that still satisfies them?',
    'Sort children by greed and cookies by size. Walk the cookies smallest first, with a pointer to the least greedy unsatisfied child.',
    'If cookie ≥ greed[child], the child is content: child++. Either way, move to the next cookie. Return child.',
  ],
  boats: [
    'Look at the heaviest person. Who, if anyone, can share their boat?',
    'Sort the weights. The heaviest must leave in some boat; the best companion is the lightest person, because anyone who fits with the heaviest is someone the lightest could replace.',
    'Two indices, light and heavy. Each boat: if people[light] + people[heavy] ≤ limit, light++. Always heavy-- and boats++. Loop while light ≤ heavy.',
  ],
  candy: [
    'Each child’s rule involves a left neighbour and a right neighbour. Can you satisfy one side at a time?',
    'Left pass: if ratings[i] > ratings[i − 1], give c[i] = c[i − 1] + 1, otherwise 1. Right pass from the end: if ratings[i] > ratings[i + 1], c[i] must exceed c[i + 1] too.',
    'In the right pass, c[i] = max(c[i], c[i + 1] + 1): keep the stricter of the two requirements. Sum c.',
  ],
  wildcard: [
    'A * could be (, ) or nothing. Instead of guessing, could you track every possible count of open brackets at once?',
    'The possible open counts always form a range lo..hi. ( shifts it up, ) shifts it down, * widens it by one each way.',
    'If hi < 0, return false: even with every * as ( there are too many ). Clamp lo at 0: you never plan to go below zero open. At the end, return lo == 0.',
  ],
  coins: [
    'Run Nix’s three stones first: on coins {1, 3, 4} and amount 6, what does largest-first give, and what is the true best?',
    'The best answer for an amount ends with SOME coin c, and what comes before it is the best answer for amount − c. Remember the best answer for every smaller amount.',
    'best[0] = 0; for a from 1 to amount, best[a] = 1 + min over coins c ≤ a of best[a − c], skipping amounts that cannot be made. Answer −1 if best[amount] was never reached.',
  ],
  triplets: [
    'Merging takes the maximum in each position, and maxima never go down. Which triplets can never be part of the answer?',
    'Any triplet with some value above the target in the same position would overshoot forever: skip it. Every other triplet is safe to merge.',
    'Among the safe triplets, mark each position where some triplet equals the target exactly. Return true when all three positions are marked.',
  ],
};
