# Quiz re-check: dsa3 (dp-1d, dp-2d, tries, bit-manipulation, greedy, hashing, matrix)

Method: solved each question blind from the stem. Java behaviour (shifts, overflow, Math.abs(MIN_VALUE), byte widening, reverse bits, getSum, isPowerOfTwo, coin-change overflow, numDecodings, forward partition loop) run with javac/java. DP and edit-distance/cooldown numbers rerun in python3. Counts (5.7M, 1.7e11, 39,365) recomputed.

93 questions reviewed: 92 OK, 1 FIXED (0 answer indices changed).

| lesson | quiz id | Q | verdict | note |
|---|---|---|---|---|
| dp-1d | dp-1d-part-one / two / three / four / tools | all (14) | OK | Java: 16, -2147483648, 1, true. |
| dp-2d | part-two..side-quests | all (12) | OK | python: ed("ab","b") 0 vs 1 with base; cooldown 3 vs 4. |
| tries | all 4 quizzes | all (12) | OK | 5.7M / 1.7e11 recomputed. |
| bit-manipulation | all 5 quizzes | all (18) | OK | Java output matches every number (-4 15, -8, 32 8, -128, 4, 6/2, 3, 3, -191651326, 5 4 / 9, -1126087180). |
| greedy | all 4 quizzes | all (13) | OK | traced by hand. |
| hashing | all 4 quizzes | all (11) | OK | traced; windowed set matches lesson code line 1351. |
| matrix | valid-square quiz etc. | spiral Q2 | FIXED | distractor "Stop the whole loop immediately" was partly correct (all 12 cells already read) -> "Skip the bottom walk only if left > right"; explain rewritten (bottom walk is guarded by rows). |
| matrix | other | rest (11) | OK | |
