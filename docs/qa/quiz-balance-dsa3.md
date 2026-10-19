# Quiz balance: dsa3 (dp-1d, dp-2d, tries, bit-manipulation, greedy, hashing, matrix)

Measured with `node scripts/quiz-balance-src.mjs` (correct-is-longest %, mean length ratio correct / others).

| Lesson | n | Before longest / ratio | After longest / ratio |
|---|---|---|---|
| dp-1d | 14 | 50% / 1.56 | 14% / 0.99 |
| dp-2d | 12 | 75% / 5.86 | 33% / 1.03 |
| tries | 12 | 50% / 1.36 | 25% / 1.10 |
| bit-manipulation | 18 | 39% / 1.39 | 11% / 0.97 |
| greedy | 13 | 31% / 1.47 | 23% / 0.95 |
| hashing | 11 | 36% / 1.79 | 9% / 1.05 |
| matrix | 12 | 42% / 1.07 | 17% / 0.94 |
| Total | 92 | 46% / 2.01 | 18% / 1.00 |

47 questions rewritten (options and the affected explain lines). Numeric and short code-output questions were left unless a wrong option was a strawman or the ratio exceeded 1.3.

## Representative rewrites
1. dp-2d Target Sum [1, 1], target 3. Before: `0: the target is out of reach (3 > total 2)` vs `1` vs `2`. After: `0: the target 3 is out of reach, since the total is 2` vs `1: integer division gives (2 + 3) / 2 = 2, one subset` vs `2: the two 1s can be signed in 2 distinct ways`. Recomputed: sign sums are 2, 0, 0, -2; Java int (2+3)/2 = 2.
2. dp-1d House Robber II single house. Before: `Returns 7` / `Returns 0, because both streets are empty` / `Throws an exception`. After: three same-length claims, each with a mechanism (first street keeps house 0, both streets empty, second street out of range).
3. hashing "comma join". Before: `Commas are slow` / long correct / `Commas cannot be decoded`. After: `Joining thousands of strings with commas is O(n²)` / `Data may contain commas: ["a,b"] and ["a","b"] collide` / `Commas are special characters in a Java string literal`; explains say the true behaviour (join is O(n), commas are ordinary characters).
4. bit-manipulation reverse(2147483647). Before wrong option `7463847412` (cannot be an int, obvious). After `-1126087180`, the value a wrapped overflow gives (python: 7463847412 mod 2^32 as signed = -1126087180).
5. matrix Valid Square. Before: `Squares are faster to compute` / `They stay exact integers, so == is safe` / `sqrt is not available in Java`. After: `Squaring is cheaper than taking a root` / same correct / `Math.sqrt only accepts integers below 2^16`, explain: Math.sqrt takes any double, the trouble is rounding.

## Not changed
Questions whose options are single numbers, booleans or short outputs (e.g. predict questions) stay as they are: lengths already match. Result note: the correct option is now rarely the longest (18% overall, fair is 33%); a few lessons are below fair, so shortness is mildly a tell in the other direction.
