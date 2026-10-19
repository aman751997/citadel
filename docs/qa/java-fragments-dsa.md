# java-fragments-dsa: evidence

Date: 2026-10-19. Java: ms-17.0.18 (javac/java from PATH). Harness (throwaway, deleted after): extracts every ```java fragment block from src/dsa-lessons/*.mdx (same wrapping as scripts/check-java.mjs: imports hoisted, ListNode/TreeNode provided), compiles each alone, then a hand-written test program ran every complete method and every 'catch the bug' claim.

## Result

- 96 fragment blocks in 19 DSA lessons (two-pointers has none).
- 29 compile as written, 67 do not. None of the 67 is BROKEN: each is a statement-level snippet (needs an enclosing method, e.g. `for`/`if` lines), a template with `...`/`/* */`/helper names, or a deliberately buggy line. No snippet edits were needed, no lesson file was changed.
- 31 complete brute-force / memoisation / rolling-row methods were run against an independent oracle (iterative DP, bitmask enumeration, binomial, or a different algorithm) on 26-40 small random inputs each (fixed seed 42): 0 mismatches.
- 66 'catch the bug' / numeric claims were reproduced by running the buggy code in a full method: 64 match the text exactly. The 2 differences were mistakes in my harness (an expected-string typo, and a missing seed `put(0,1)`), not in the lessons; rerun with the seed gave 4 as the text says. Corrections made: 0.

## Classification of the 96 blocks

| block (file_line) | class |
|---|---|
| advanced-graphs_281 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| advanced-graphs_1070 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| advanced-graphs_1362 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| backtracking_64 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| backtracking_260 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| binary-search_76 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| binary-search_139 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| binary-search_261 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| binary-search_280 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| binary-search_592 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| binary-search_721 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| binary-search_846 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| bit-manipulation_133 | COMPILES |
| bit-manipulation_320 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| bit-manipulation_949 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| bit-manipulation_1974 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| dp-1d_323 | COMPILES |
| dp-1d_431 | COMPILES |
| dp-1d_526 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| dp-1d_561 | COMPILES |
| dp-1d_734 | COMPILES |
| dp-1d_870 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| dp-1d_967 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| dp-1d_1005 | COMPILES |
| dp-1d_1179 | COMPILES |
| dp-1d_1354 | COMPILES |
| dp-1d_1629 | COMPILES |
| dp-1d_1739 | COMPILES |
| dp-1d_1836 | COMPILES |
| dp-1d_2037 | COMPILES |
| dp-1d_2152 | COMPILES |
| dp-2d_179 | COMPILES |
| dp-2d_192 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| dp-2d_278 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| dp-2d_335 | COMPILES |
| dp-2d_401 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| dp-2d_466 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| dp-2d_508 | COMPILES |
| dp-2d_585 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| dp-2d_616 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| dp-2d_708 | COMPILES |
| dp-2d_822 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| dp-2d_864 | COMPILES |
| dp-2d_965 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| dp-2d_1058 | COMPILES |
| dp-2d_1166 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| dp-2d_1208 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| dp-2d_1304 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| dp-2d_1352 | COMPILES |
| dp-2d_1445 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| dp-2d_1533 | COMPILES |
| dp-2d_1627 | COMPILES |
| dp-2d_1723 | COMPILES |
| dp-2d_1820 | COMPILES |
| dp-2d_1839 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| dp-2d_1919 | COMPILES |
| dp-2d_2016 | COMPILES |
| graphs_283 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| graphs_416 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| graphs_1253 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| greedy_216 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| greedy_335 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| hashing_207 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| hashing_322 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| hashing_377 | COMPILES |
| hashing_403 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| hashing_509 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| hashing_804 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| hashing_966 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| hashing_1126 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| hashing_1287 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| heaps_490 | COMPILES |
| intervals_233 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| linked-lists_54 | COMPILES |
| linked-lists_294 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| linked-lists_706 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| matrix_247 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| matrix_421 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| matrix_611 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| matrix_786 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| prefix-sum_566 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| prefix-sum_906 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| sliding-window_89 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| sliding-window_599 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| sliding-window_691 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| sliding-window_959 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| stacks_86 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| stacks_331 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| stacks_436 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| trees-bfs_267 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| trees-bfs_471 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| trees-bfs_660 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| trees-dfs_339 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| tries_265 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| tries_418 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |
| tries_635 | INTENTIONALLY PARTIAL (statement snippet / template / bug line; needs method or lesson context) |

Notes on context-dependent snippets that look like whole methods but are not standalone: dp-1d_870 (uses `INF = amount + 1`, defined in a comment), dp-2d_192 (uses `m`, `n`), dp-2d_1208 (uses `DIRS`, `inside`). Each was run with that context supplied and matched its oracle. dp-1d_1005 growth: calls for `a^n b` with words a, aa, aaa were 120, 554, 2556, 11792, 54402 for n = 10, 14, 18, 22, 26 (about x4.6 per +4, exponential as the text says).

## Complete methods run against an oracle (all OK, no mismatches)

dp-1d: 1005 wordBreak, 1179 LIS, 1354 isPal, 1629 delete-and-earn, 1739 perfect squares, 1836 subset sum, 2037 k-steps, 2152 tickets, 323 climb cost, 431 rob, 561 rob II, 734 decode ways, 870 coin change.
dp-2d: 1058 stock cooldown, 1352 burst balloons, 1533 unique paths II, 1627 min path sum, 1723 LPS, 179 unique paths, 192 memo, 1820 distinct subsequences, 1839 rolling distinct subsequences, 1919 target sum, 2016 stock K, 335 LCS, 401 rolling LCS, 508 edit distance, 585 rolling edit distance, 708 partition, 864 coin change II, 1208 longest increasing path.
binary-search: 76 / 139 / 280 templates (first >=, last <=, closed range) vs linear scan: 30/30. bit-manipulation_133 (byte widening): -16, -16, 240 as the comments say. hashing_377 Point without hashCode: two equal Points both stored (size 2) in this run, as the text says (text also says it is only 'almost always').

## 'Catch the bug' claims reproduced (CLAIM-OK = output equals the text)

- advanced-graphs_281 one-flag DFS on the diamond: false (true answer true). _1070 eager lock: 5 (correct 2). _1362 visited-Dijkstra, k=1: -1 (correct 6).
- backtracking_260: 5th result is [1, 2, 3, 3].
- binary-search_261 [1,5] t=5: -1. _592 [1,2,3]: 3. _721 [4,5,6,7,0,1,2] t=0: -1. _846: five piles of 1e9 at speed 2 gives -1794967296 and the buggy check says fast enough.
- bit-manipulation_1974 1534236469: 1056389759. _320: -8,-4,-2,-1,-1,-1. _949 reverseBits(1): 1.
- dp-1d_526 [2,1,1,2]: 3 vs 4. _967 coins [2], amount 3: dp[3] = -2147483648.
- dp-2d_278 3x3: 4. _466 'aa' vs 'a': 2. _616 'ab'->'b': 0. _822 [1,2,5]: true. _965 [1,2] amount 3: 3. _1166 [1,2,3,0,2]: 4. _1304 [[1,1]]: StackOverflowError. _1445 [3,1,5,8]: 63 (descending-i fix gives 167).
- graphs_416 2x2 land: 5. _283 [['1','1']]: StackOverflowError. _1253 hit->cog without cog: 5.
- greedy_216 [-3,-1,-2]: 0. _335 [-2,3,-4,-1]: 96.
- hashing_207 [1,2]: set size 1 so reports duplicate. _322 [3,2,4] t=6: [0,0]. _403 hashes 994 -> 30817, buckets 2 then 1, both contains() false. _509 route is 32 moves, buggy key reports a crossing, true answer none. _804 keys equal. _966 steps = 5,000,050,000. _1126 StringIndexOutOfBoundsException. _1287 'ab'x100 vs 'cd'x100: false.
- heaps_490 compare(2e9, -2e9) is negative.
- intervals_233 bug 1: [[1,3],[4,5]]. bug 2: [[1,3],[2,6],[8,10]] gives [[1,6]], last range dropped.
- linked-lists_294 true on the first check; _706 on [1,2,3] returns [1].
- matrix_247 [[1,2],[3,4]]: [[2,1],[4,3]]. _421 3x4 gives 13 values ending 5,6,7,6; single row 1,2,3,2,1; single column 1,2,3,2. _611 first grid wiped to all zeros; mirror grid [[0,0,0],[0,0,0],[0,0,9]]. _786 myPow(2.0, MIN_VALUE): 1.0.
- prefix-sum_566 [1] k=0: 1; [1,2,3] k=3 without seed: 1 (correct 2); [1,-1,1,-1] k=0 with seed: 4. _906 [-1,5] k=5: HashMap version 0, int[k] version ArrayIndexOutOfBounds, floorMod gives 1.
- sliding-window_599 'abba': 3. _691 [1,2,3,2,2]: ArrayIndexOutOfBoundsException. _959 [2,3,1,2,4,3] t=7: 1; `if` version on [1,1,1,10] t=10: 4.
- stacks_331 push 1000, 999, pop: getMin 999 (with 10, 9 it works by luck). _436 `5 3 -`: -2. _86 peek/pop/isEmpty: 9, 9, false.
- trees-bfs_267 [3,9,20,null,null,15,7]: [[3,9],[20,15],[7]]. _471 tree 1..7: [[1],[3,2],[6,7,4,5]]. _660 [1,2,3,4]: [1,3] (and [1,2,3,null,5,null,4]: [1,3,4], correct by luck). trees-dfs_339: [4,7,7,9,9,9,9].
- tries_265 search('app') after insert('apple'): true. _418 '.y' with ax, by: false. _635 [[a,a]] ['a']: [a, a].

## Could not verify

None of the above. Not checked: the text's big-O wording around the brute forces (only the word-break growth was measured).
