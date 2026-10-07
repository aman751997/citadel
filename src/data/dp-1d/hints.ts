// Three-step hint ladders for every <HintLadder> in dp-1d.mdx. Each ladder walks the five-step recipe:
// state in words → the last decision → base cases, order and where the answer lives.
export const hints: Record<string, [string, string, string]> = {
  climb: [
    'Look at the last move of any climb to step i. What could it have been, and where did it start?',
    'ways[i] = the number of ways to stand on step i. The last move came from i − 1 or i − 2, so ways[i] = ways[i − 1] + ways[i − 2], with ways[0] = ways[1] = 1.',
    'The loop reads only the last two scrolls: keep prev = ways[i − 2] and curr = ways[i − 1]. Compute next = curr + prev, then slide: prev = curr, curr = next. At loop exit curr = ways[n].',
  ],
  minCost: [
    'Same stair, same last move as counting the climbs. What replaces the sum when you want the cheapest?',
    'dp[i] = the cheapest toll to ARRIVE at position i, where position n (past the last step) is the top. Arriving from i − 1 pays cost[i − 1]; from i − 2 pays cost[i − 2].',
    'dp[0] = dp[1] = 0 (free starts). For i = 2..n take the min of the two arrivals. Return dp[n], not dp[n − 1].',
  ],
  robber: [
    'Stand at the last house of the street and decide only that house. If you take it, what do you already know? If you skip it?',
    'dp[i] = the most from the first i houses. Take house i − 1: nums[i − 1] + dp[i − 2]. Skip it: dp[i − 1]. Keep the larger.',
    'dp[0] = 0. Only the last two scrolls are read, so carry prev and curr: next = max(curr, prev + x), then slide. Return curr.',
  ],
  circle: [
    'On a ring the first and last houses are neighbours. In any valid plan, can both be used?',
    'At least one end is always skipped, so every valid plan lives on houses 0..n − 2 or on houses 1..n − 1 — two straight streets.',
    'Run the straight-street solution on each range and return the larger. A single house has no neighbour: return nums[0] before splitting.',
  ],
  decode: [
    'The last letter of any reading used either the last digit or the last two. When is each one allowed?',
    'dp[i] = readings of the first i digits. One digit is allowed for 1..9 and adds dp[i − 1]; two digits are allowed for 10..26 and add dp[i − 2].',
    'dp[0] = 1 (the empty prefix). Loop i = 1..n; check the two-digit case only when i ≥ 2, and test 10 ≤ value ≤ 26 so a leading zero never counts. Return dp[n].',
  ],
  coins: [
    'You don’t know the best FIRST coin. Do you know the best way to make every smaller amount?',
    'dp[a] = fewest coins summing to exactly a. The last coin c leaves a − c, so dp[a] = 1 + min dp[a − c] over coins c ≤ a.',
    'dp[0] = 0; every other cell starts at the sentinel amount + 1 (never Integer.MAX_VALUE, which overflows on + 1). Fill a = 1..amount; return −1 if dp[amount] is still the sentinel.',
  ],
  words: [
    'Don’t guess the first word. For each position, ask whether everything before it can be read.',
    'dp[i] = true if the first i characters split into words. The last word is s[j..i) for some j: dp[i] = OR of (dp[j] AND s[j..i) is a word).',
    'Put the words in a HashSet; dp[0] = true. For each i, try j from i − 1 down to i − maxLen, and stop as soon as dp[i] is true. Return dp[n].',
  ],
  lis: [
    'To extend a rising run with nums[i], what must you know about the run? Does “best of the first i elements” tell you that?',
    'dp[i] = the longest increasing subsequence that ENDS at index i. It is 1 + the largest dp[j] over j < i with nums[j] < nums[i], or 1 alone.',
    'Fill i left to right with an inner loop over j < i. The answer is the MAXIMUM of all dp[i], not dp[n − 1]. O(n²).',
  ],
  tails: [
    'For each possible length, which ending is the most useful to remember: a big one or a small one?',
    'tails[k] = the smallest value that ends any increasing run of length k + 1 so far. It stays strictly increasing, so it can be binary searched.',
    'For each x, binary search the first k with tails[k] ≥ x. Overwrite tails[k] = x; if k equals the current size, the size grows. Return the size — the array itself is not the subsequence.',
  ],
  longestPal: [
    'A palindrome is a smaller palindrome with one matching pair around it. Where could you start growing one?',
    'Every palindrome has a centre: a letter (odd length) or the gap between two letters (even length). That is 2n − 1 centres.',
    'For each centre, widen l-- and r++ while both are in range and s[l] == s[r]. The last matching window is s[l + 1..r − 1]; keep the longest.',
  ],
  countPal: [
    'Each time a widening from a centre succeeds, what have you just found?',
    'Use the same 2n − 1 centres. Every successful widening is a different palindromic substring, found exactly once.',
    'Add up the successful widenings over all centres. (The 2-D table version must fill i from n − 1 down to 0, because pal[i][j] reads pal[i + 1][j − 1].)',
  ],
  earn: [
    'If you take one copy of x, is there any reason not to take every copy of x?',
    'Collapse each value into one “house” worth x × count(x), lined up by value. Taking x destroys x − 1 and x + 1: neighbouring houses.',
    'Fill earn[0..max], then run the no-two-adjacent recurrence over it: next = max(curr, prev + earn[v]). Return curr.',
  ],
  squares: [
    'Which problem with coins and an amount is this, if the coins are 1, 4, 9, 16, …?',
    'dp[a] = fewest squares summing to a; the last square r² leaves a − r², so dp[a] = 1 + min dp[a − r²].',
    'Start each dp[a] at a (all ones), since 1 is a square and every amount is reachable. Loop r while r × r ≤ a. Return dp[n].',
  ],
  partition: [
    'Two groups with equal totals means one group totals exactly what?',
    'If the total is odd, the answer is no. Otherwise ask: does some subset sum to total / 2? can[s] = some subset of the numbers seen so far sums to s; can[0] = true.',
    'For each number x, update can[s] = can[s] || can[s − x] with s running from target DOWN to x, so x is used at most once. Return can[target].',
  ],
  countLis: [
    'Keep the length of the longest run ending at each index. What second number would let you count the runs that reach it?',
    'cnt[i] = how many increasing runs ending at i have length len[i]. A j giving a longer run replaces: cnt[i] = cnt[j]. A j giving an equal length adds: cnt[i] += cnt[j].',
    'Track the overall best length; sum cnt[i] over every i whose len[i] equals it. Use strict < for “increasing”.',
  ],
  kSteps: [
    'The last move can now be 1, 2, …, k steps. How many scrolls does each new one read?',
    'ways[i] = ways[i − 1] + … + ways[i − k] (ignoring negative indexes), ways[0] = 1. Summing k cells per step is O(n × k).',
    'Keep a running window sum: add ways[i − 1] as it comes into reach, subtract ways[i − k − 1] as it falls out. ways[i] = window. O(n).',
  ],
  tickets: [
    'Index the scrolls by calendar day, not by visit. What does a day with no visit cost?',
    'dp[d] = cheapest cover for every visit on days 1..d. A quiet day copies dp[d − 1]. On a visit day, the last pass bought covers day d: 1, 7 or 30 days ending on d.',
    'dp[d] = min(dp[d − 1] + costs[0], dp[max(0, d − 7)] + costs[1], dp[max(0, d − 30)] + costs[2]). Fill d = 1..last day; return dp[last].',
  ],
};
