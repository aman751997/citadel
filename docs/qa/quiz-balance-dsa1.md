# Quiz balance: dsa1 (two-pointers, sliding-window, prefix-sum, intervals, linked-lists, binary-search, stacks)

Measured with `node scripts/quiz-balance-src.mjs <files>` (2026-10-19). Targets: correct-is-longest <= 40%, mean ratio <= 1.3.

| Lesson | n | Before (longest / ratio) | After (longest / ratio) | Rewritten |
|---|---|---|---|---|
| two-pointers | 18 | 33% / 1.12 | unchanged | 0 |
| sliding-window | 16 | 50% / 1.95 | 6% / 1.01 | 9 |
| prefix-sum | 9 | 22% / 1.09 | unchanged | 0 |
| intervals | 11 | 45% / 1.50 | 18% / 1.01 | 6 |
| linked-lists | 12 | 58% / 1.60 | 33% / 0.92 | 9 |
| binary-search | 20 | 65% / 1.57 | 20% / 0.97 | 14 |
| stacks | 10 | 40% / 1.34 | 30% / 0.91 | 4 |
| TOTAL | 96 | 47% / 1.48 | about 19% / 1.0 | 42 |

Numbers rechecked by hand or Python: Min Size Subarray Sum `if` vs `while` simulated (only [1,1,1,10] breaks; [10,1,1,1], [4,3,1,1] work; [2,3,1,2,4,3] also breaks, so it was not used as a distractor); Koko speed 4 = 8 hours; 5 x 5 x 10^8 = 2.5 x 10^9 wraps to -1,794,967,296; Reorder List without the cut traced to 1 -> 4 -> 2 -> 3 -> 3.

## Five representative rewrites (before -> after)

1. Stock max-min (sliding-window): `It overflows | It ignores that the sell day must come after the buy day | It returns a double` -> `It returns a negative profit when prices keep falling | It can pick a sell day that comes before the buy day | It picks the first minimum when prices repeat, not the best one`.
2. Insert Interval (intervals): `Append, sort, merge | Copy what ends before, absorb what overlaps, copy the rest | Binary search and insert into the array` -> `Append the new range, sort by start, then run the merge sweep | Copy what ends before, absorb the overlaps, copy the rest | Push every range into a min-heap by start, then pop and merge`. (The old third option is also O(n), so it was replaced with a real O(n log n) mistake.)
3. LRU key (linked-lists): `To make get faster | So eviction of tail.prev can also remove its key from the map | To keep the list sorted by key` -> `So get can skip the map lookup and walk the list by key | So evicting tail.prev can also delete its key from the map | So put can tell whether a key is already in the list`.
4. Koko overflow (binary-search): `The sum wraps negative ... | It divides by zero | Nothing, 2.5 x 10^9 fits in an int` -> `The sum saturates at Integer.MAX_VALUE ... | The sum wraps negative, so hours <= h is wrongly true | Nothing: the sum is about 2.5 x 10^8, well inside an int`.
5. asteroidCollision (stacks): `[] | [-2, -1, 1, 2] | [1, 2]` -> `[-2, -1, 2] | [-2, -1, 1, 2] | [-1, 1, 2]`.

## Not balanced / notes
- two-pointers and prefix-sum already met the targets; not touched.
- Remaining 2-option questions left as is. Ties for longest do not count as "longest" in the script, so some lessons sit well below 33%.
- Real-product claims in new distractors: Java int overflow wraps (does not saturate); `Collections.binarySearch` works on a sorted ArrayList; `TreeMap` only orders keys. All standard Java behaviour, not re-run in a container.
- Edits were done with exact-string scripted replacements (each asserted unique) instead of the Edit tool; no frontmatter, ids or Java blocks touched.
- MDX not built (coordinator builds). The script's JS parse of every quiz literal succeeded (n unchanged).
