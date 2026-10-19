# Quiz balance, TAG dsa2

Measured with `node scripts/quiz-balance-src.mjs` (source, no build). "longest" = share of questions where the correct option is the single longest; ratio = correct length / mean length of the others.

| Lesson | n | before longest | before ratio | after longest | after ratio | rewritten |
|---|---|---|---|---|---|---|
| heaps | 18 | 28% | 1.51 | 11% | 0.92 | 6 |
| trees-dfs | 22 | 59% | 1.56 | 18% | 1.00 | 16 |
| trees-bfs | 12 | 33% | 1.18 | 8% | 0.97 | 5 |
| graphs | 18 | 50% | 3.71 | 11% | 0.94 | 12 |
| advanced-graphs | 14 | 64% | 2.20 | 7% | 0.99 | 10 |
| backtracking | 14 | 64% | 1.73 | 7% | 0.91 | 10 |
| TOTAL | 98 | 50% | 2.02 | 11% | 0.95 | 59 |

Number check: Graphs BFS-queue question. Entries with mark-at-poll and no skip = sum over cells of the number of shortest routes = C(20,10) - 1 = 184755; routes to the far corner alone = C(18,9) = 48620 (Python `math.comb`). The old wrong option 181 was replaced by 48,620.

`node scripts/check-java.mjs <slug>` passes for all six lessons after the edits.

## Five representative rewrites

1. graphs, 1000 x 1000 flood
   - before: "Recursive DFS: it is O(R·C) either way" / "An explicit stack or queue, marking when you push" / "Recursive DFS that marks squares after its recursive calls"
   - after: "Recursive DFS marking squares on entry" / "An explicit stack or queue, marking on push" / "Recursive DFS marking squares on the way out"
2. heaps, comparator `a - b`
   - before: "A positive number, as expected" / "A negative number: the subtraction overflowed" / "Zero"
   - after: "A positive number, the true difference" / "A negative number, after wrapping" / "A positive number capped at 2³¹ − 1" (explain: Java ints wrap, they do not saturate)
3. advanced-graphs, Path With Minimum Effort
   - before: "Because max is faster to compute" / "Because extending a route can never lower its cost, so a popped entry is still final" / "Because the grid is unweighted"
   - after: "Because max is cheaper than adding" / "Because routes never get cheaper" / "Because every step costs the same"
4. backtracking, Palindrome Partitioning with start + 1
   - before: "Pieces are re-cut so the results do not spell the input" / "It is slower but correct" / "It returns nothing"
   - after: "Pieces overlap and do not spell \"aab\"" / "It is correct but takes longer to run" / "It returns nothing, as no cut is accepted"
5. trees-dfs, House Robber III pair
   - before: "To save memory" / "The parent needs to know the child's best both when it is skipped and when it is taken" / "Java cannot return one number from a recursive call"
   - after: "To pass the node's depth down to its children" / "The parent needs the child's with and without totals" / "The pair stores the left and right child values"

## Not fully balanced / notes

- Correct options are now often the shortest-to-middle in the rewritten questions (longest 7-18%, below the 33% fair level). Targets are met; a reviewer may want to lengthen a few correct options.
- Numeric and single-digit predict questions were left unchanged (already equal length). Questions where the right answer is inherently short (Combination Sum `[[7]]`) keep a ratio below 1.
