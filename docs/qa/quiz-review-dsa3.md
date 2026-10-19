# Quiz review dsa3 (dp-1d, dp-2d, tries, bit-manipulation, greedy, hashing, matrix)

Method: every question solved first by hand, then checked with a Python re-implementation of the quiz code (spiral, Coin Change overflow, numDecodings "06", forward knapsack, LCS bug, edit distance without base loops, Unique Paths II bug, LIS count) and arithmetic recomputes (3^13 = 1594323, 39365 paths, 5.67M, 1.7e11). Java snippets (shifts, Math.abs(MIN_VALUE), byte widening) checked by reasoning on two's complement.

| lesson | quiz id | Q# | verdict | note |
|---|---|---|---|---|
| dp-1d | dp-1d-part-one | 1-3 | OK | n=5 returns 16; Min Cost [10,15,20] is 15; HR2 [7] returns 0 |
| dp-1d | dp-1d-part-two | 1-3 | OK | "06" gives 1; MAX_VALUE+1 = -2147483648; Word Break greedy false |
| dp-1d | dp-1d-part-three | 1-2 | OK | LIS dp[n-1]=1; tails [1,4] |
| dp-1d | dp-1d-part-three | 3 | FIXED | stem now says "keep the first longest" (letter-only expansion on "cbbd" ties at length 1; the first is "c") |
| dp-1d | dp-1d-variations | 1-3 | OK | forward loop true; greedy 4 vs table 3; cnt = [1,1,1,1,2] |
| dp-1d | dp-1d-tools | 1-2 | OK | |
| dp-2d | dp-2d-part-two | 1-3 | OK | LCS bug 2; edit-distance zero fill returns 0 not 1 |
| dp-2d | dp-2d-part-three | 1-3 | OK | forward loop true; coin combos 2 vs 3 permutations |
| dp-2d | dp-2d-part-four | 1-3 | OK | cooldown without rule gives 4; >= makes a cycle |
| dp-2d | dp-2d-side-quests | 1-2 | OK | UP II bug returns 2 (true 1) |
| dp-2d | dp-2d-side-quests | 3 | FIXED | wrong-option explain: "Two sign choices" -> four combinations, none sums to 3 |
| tries | tries-part-one | 1-3 | OK | |
| tries | tries-part-two | 1-3 | OK | 39,365 x 144 = 5.67M; x 30,000 = 1.7e11 recomputed |
| tries | tries-sidequests-one | 1-3 | OK | |
| tries | tries-sidequests-two | 1-3 | OK | |
| bit-manipulation | part-one | 1-4 | OK | -16>>2=-4, -16>>>28=15; abs(MIN) % 10 = -8 |
| bit-manipulation | part-two | 1-3 | OK | |
| bit-manipulation | part-three | 1-3 | OK | |
| bit-manipulation | part-four | 1-4 | OK | 3x81x6561 = 1594323 |
| bit-manipulation | variations | 1-4 | OK | |
| greedy | part-one | 1-3 | OK | restart code returns 5; gas example returns 2 with total -1 |
| greedy | part-two | 1-3 | OK | traced: returns 2 |
| greedy | part-three | 1-3 | OK | "abba" gives [3,1] |
| greedy | side-quests | 1-4 | OK | |
| hashing | part-one | 1-3 | OK | |
| hashing | part-two | 1-3 | OK | "ad"/"bc" both 197 |
| hashing | part-three | 1-3 | OK | |
| hashing | part-four | 1-3 | OK | |
| matrix | part-one | 1-2 | OK | |
| matrix | part-one | 2 | FIXED | option 3 explain claimed the up-walk guard left <= right fails; simulation shows left=1, right=1, so it passes (loop reads nothing because bottom < top) |
| matrix | part-one | 3 | OK | |
| matrix | part-two | 1-2 | OK | |
| matrix | part-three | 1-3 | OK | |
| matrix | side-quests | 1-4 | OK | |
