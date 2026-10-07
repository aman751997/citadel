// Three-step hint ladders for every <HintLadder> in dp-2d.mdx.
export const hints: Record<string, [string, string, string]> = {
  uniquePaths: [
    'Stand on the goal square. The courier only moves right or down, so where could the last step have come from?',
    'dp[r][c] = number of routes from the start to (r, c). The top row and left column each have exactly one route: a straight line.',
    'Fill row by row, left to right: dp[r][c] = dp[r − 1][c] + dp[r][c − 1]. The answer sits at dp[m − 1][n − 1]. One row of paper is enough if you sweep left to right.',
  ],
  lcs: [
    'Look only at the last letter of each map. Either they match and both join the route, or at least one of them is not on it.',
    'dp[i][j] = longest common subsequence of the first i letters of text1 and the first j letters of text2. Row 0 and column 0 are 0: an empty prefix shares nothing.',
    'If text1[i − 1] == text2[j − 1], dp[i][j] = dp[i − 1][j − 1] + 1; otherwise max(dp[i − 1][j], dp[i][j − 1]). Fill row by row; the answer is dp[n][m].',
  ],
  edit: [
    'Look at the last letters. If they agree, they cost nothing. If not, the last move was an insert, a delete or a replace — which neighbour does each one leave you at?',
    'dp[i][j] = fewest moves to turn the first i letters of word1 into the first j letters of word2. dp[i][0] = i (delete everything), dp[0][j] = j (insert everything).',
    'Match: dp[i][j] = dp[i − 1][j − 1]. Otherwise 1 + min(dp[i − 1][j − 1] replace, dp[i − 1][j] delete, dp[i][j − 1] insert). Answer: dp[n][m].',
  ],
  partition: [
    'Two equal groups each weigh exactly half the total. So the question is: can some of the crates total exactly half?',
    'An odd total fails at once. Otherwise dp[s] = “some crates seen so far total exactly s”, starting from dp[0] = true.',
    'For each crate w, sweep s from target DOWN to w: dp[s] = dp[s] || dp[s − w]. Downwards keeps dp[s − w] from before this crate, so it joins at most once.',
  ],
  coins: [
    'Make each combination in one fixed order: first decide how many 1s, then how many 2s, and so on. Which loop has to be on the outside?',
    'dp[a] = number of combinations of the coins seen so far that make a. dp[0] = 1: taking nothing is one way to make 0.',
    'Coins outside. For each coin, sweep a UP from coin to amount: dp[a] += dp[a − coin]. Upwards lets this coin be used again; coins outside stops 1 + 2 and 2 + 1 counting twice.',
  ],
  cooldown: [
    'At the end of any day you are in exactly one of three situations. Name them, then draw the moves allowed between them.',
    'hold = holding a share; sold = sold today; rest = empty-handed and free to buy tomorrow. Day 0: hold = −price, sold impossible, rest = 0.',
    'hold = max(hold, rest − p); sold = hold + p; rest = max(rest, sold) — all from yesterday’s values. The answer is max(sold, rest) on the last day.',
  ],
  climb: [
    'The longest climb that starts here is 1 plus the longest climb from the best strictly-higher neighbour. Why can’t this loop forever?',
    'Recursion climb(r, c) with a memo grid. 0 means “not asked yet”; every finished answer is at least 1.',
    'climb(r, c): if memo is set, return it. Otherwise best = 1; for each of the four neighbours that is strictly higher, best = max(best, 1 + climb(neighbour)). Store and return. Answer: the max over all squares.',
  ],
  balloons: [
    'Choosing the FIRST balloon to burst tangles the two sides together. Which choice keeps the left side and the right side independent?',
    'Pad the row with a 1 at each end. dp[i][j] = best coins from bursting every balloon strictly between walls i and j; dp[i][i + 1] = 0.',
    'For gap = 2 up to n + 1, for each i with j = i + gap: dp[i][j] = max over k in (i, j) of dp[i][k] + v[i]·v[k]·v[j] + dp[k][j]. Answer: dp[0][n + 1].',
  ],
  rocks: [
    'Same map as before. What is the number of routes that end on a rock?',
    'A rock square holds 0. The start holds 1 unless it is itself a rock. Off-grid neighbours count as 0.',
    'dp[r][c] = 0 on a rock; otherwise (r > 0 ? dp[r − 1][c] : 0) + (c > 0 ? dp[r][c − 1] : 0), with dp[0][0] = 1. Don’t pre-fill the edges with 1s: a rock cuts off everything after it.',
  ],
  tolls: [
    'Counting became minimising. Which of the two ways in is cheaper to arrive from?',
    'dp[r][c] = cheapest toll from the start to (r, c), paying both ends. The top row can only be reached from the left, the left column only from above.',
    'dp[r][c] = grid[r][c] + min(dp[r − 1][c], dp[r][c − 1]), with the edges as running sums. Answer: dp[m − 1][n − 1].',
  ],
  palindrome: [
    'Look at both ends of the stretch. If they are the same letter, they can wrap whatever palindrome is inside.',
    'dp[i][j] = longest palindrome kept from s[i..j]. dp[i][i] = 1. It reads the square below-left (i + 1, j − 1), below (i + 1, j) and left (i, j − 1).',
    'Loop i from n − 1 down to 0 and j from i + 1 up: equal ends → dp[i + 1][j − 1] + 2; else max(dp[i + 1][j], dp[i][j − 1]). Answer: dp[0][n − 1].',
  ],
  distinct: [
    'Look at the last letter of s. Either it is deleted, or (if it matches) it supplies the last letter of t. Both are different ways — so add them.',
    'dp[i][j] = ways to keep exactly t[0..j) from s[0..i). dp[i][0] = 1 for every i (delete everything); dp[0][j] = 0 for j > 0.',
    'dp[i][j] = dp[i − 1][j], plus dp[i − 1][j − 1] when s[i − 1] == t[j − 1]. Answer: dp[n][m].',
  ],
  targetSum: [
    'Split the numbers into the + group P and the − group N. You know P − N = target and P + N = total. Solve for P.',
    'P = (total + target) / 2. If |target| > total or total + target is odd, the answer is 0. Otherwise count subsets that sum to P.',
    'ways[0] = 1; for each number x, sweep s from P DOWN to x: ways[s] += ways[s − x]. Zeros double the count, which is right: +0 and −0 are two choices.',
  ],
  stockK: [
    'With a limit of k trades, “holding or not” isn’t enough. What else must each state remember?',
    'buy[t] = best cash while holding during trade t; sell[t] = best cash with t trades closed. buy starts impossible, sell starts at 0.',
    'Each day, for t = 1..k: buy[t] = max(buy[t], sell[t − 1] − p); sell[t] = max(sell[t], buy[t] + p). The answer is sell[k].',
  ],
};
