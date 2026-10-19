# Quiz balance nudge (tie-aware metric)

Command: `node scripts/quiz-balance-src.mjs <files>`; integrity: `node scripts/check-quiz-integrity.mjs <files>` -> 228 questions checked, 0 problem(s).
Band: longest and shortest each 15%-42% (n < 12: 10%-50%).

| File | n | Before longest / shortest | After longest / shortest | Questions edited |
|---|---|---|---|---|
| src/lessons/databases.mdx | 44 | 11 / 50 | 29 / 33 | 8 (correct option lengthened with a reason or mechanism) |
| src/lessons/llm-gateway.mdx | 27 | 36 / 9 | 22 / 23 | 5 (correct option trimmed; one distractor given matching detail) |
| src/lessons/recsys.mdx | 26 | 37 / 10 | 22 / 24 | 4 (correct option trimmed) |
| src/dsa-lessons/backtracking.mdx | 14 | 10 / 27 | 38 / 27 | 4 (correct option lengthened) |
| src/dsa-lessons/binary-search.mdx | 20 | 24 / 44 | 34 / 34 | 2 |
| src/dsa-lessons/dp-2d.mdx | 12 | 47 / 22 | 31 / 22 | 2 (distractors given comparable detail) |
| src/dsa-lessons/intervals.mdx | 11 | 24 / 61 | 42 / 42 | 2 |
| src/dsa-lessons/two-pointers.mdx | 18 | 48 / 31 | 37 / 31 | 2 (distractors made comparable) |
| src/lld-lessons/behavioral-patterns.mdx | 27 | 2 / 35 | 20 / 31 | 5 |
| src/lld-lessons/concurrency-for-lld.mdx | 9 | 33 / 50 | 44 / 39 | 1 |
| src/lld-lessons/creational-patterns.mdx | 17 | 53 / 32 | 41 / 32 | 2 (correct option trimmed) |

Whole site (src): longest 30% / shortest 27% (was 29 / 28).

Representative rewrites (correct option; answer index, ids, fixed flags, option counts unchanged):
- databases: "Keep the copy; update all 1,000 rows in the same transaction as the event." -> "... as the event, since reads far outnumber reschedules."
- llm-gateway: "Head-sample routine traffic at 10%; tail-sample all errors, ..." -> "... tail-sample errors, ..." and the head-sampling distractor lengthened to "Head-sample 10% of all traffic and accept that some failing requests have no trace".
- backtracking: "A later coin could still fit after a break" -> "A smaller coin later in the list could still fit after a break".
- two-pointers: distractor "It throws an exception" -> "It throws an ArrayIndexOutOfBoundsException" (correct option stays the same).
- behavioral-patterns: "Listeners saw a change that never committed; publish after commit" -> "Listeners acted on a change that never committed; publish after the commit succeeds".

Blind re-solve: every touched question re-read; the correct option is unchanged in meaning, each new detail is true (integer division rounds down; new String(...) is a distinct object so compareAndSet by reference returns false; a smaller coin after a larger one is skipped by break on unsorted input), and every changed distractor is still false and still matches its existing explain. No numeric answers were changed. No Java blocks touched.
