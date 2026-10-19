# Quiz balance, tag sd4

Lessons: pattern-contention, pattern-geospatial, pattern-async-jobs, pattern-partitioning, pattern-timeseries.
Method: `node scripts/quiz-balance-src.mjs <lessons>` (reads MDX source) before and after. Each rewrite was re-solved blind, numbers recomputed by hand (see notes below), and every changed option's `explain` rewritten so it stays true. Answer indices, `why`, ids, option counts and question text were not changed. A local check confirmed every question still has `explain[answer]` starting with "Correct" and no other explain doing so.

| Lesson | n | longest before -> after | length ratio before -> after |
|---|---|---|---|
| pattern-contention | 51 | 94% -> 31% | 3.11 -> 1.04 |
| pattern-geospatial | 35 | 97% -> 23% | 3.59 -> 0.99 |
| pattern-async-jobs | 44 | 80% -> 27% | 2.62 -> 1.02 |
| pattern-partitioning | 46 | 87% -> 30% | 2.50 -> 1.04 |
| pattern-timeseries | 25 | 96% -> 28% | 3.08 -> 1.02 |

About 185 of the 201 questions were rewritten. Left alone because the options were already short, numeric and parallel: contention (code-output questions on qty values, the Lua release result, the weighted share), async-jobs (arithmetic answers), partitioning (hash-move fraction, vector sums), timeseries (tree comparisons, G-counter merge).

## Numbers recomputed
- Seat/ring: C owns (40,80] = 40 wide, becomes (10,80] = 70 wide: 70/40 = 1.75. If A took B's keys, A goes from (80,10] = 30 to (80,30] = 50: 1.67.
- 16,384 / 5 = 3,277 slots (20%); the distractor 13,107 = 80%.
- Little's law: 50 x 40 = 2,000; the distractor 4,000 counts each request twice.
- Backoff 1+2+4+8+16 = 31 s. 1,000,000 / 500 = 2,000 s = 33 min; 1,000,000 / 3,600 = 278/s.
- Rank score: smoothed = (190 + 10) / 52 = 3.846; 0.5 x 3.846/5 = 0.385; 0.5 x exp(-0.2) = 0.409; total 0.79. Unsmoothed 0.5 + 0.409 = 0.91.
- 1e9 pages x 100 KB / 2.6e6 s = 38.5 MB/s = 308 Mbps.
- Sizing: (100,000 x 2 + 20,000) / 20,000 = 11 and (100,000 + 60,000) / 20,000 = 8, versus 13 correct.

## Five representative rewrites

1. contention #1 (double charge vs two seat owners). Before: correct = 203 chars with the tools named inside the option; wrong = "Both are the same bug, so one fix (a global lock) solves both" (61). After: correct "The first is duplication (one request twice); the second is contention (two requests racing)" (92); wrong "Both are the same bug, so one global lock around checkout fixes both the double charge and the double seat" (106). The tool names moved into the explain.
2. partitioning #6 (cancelled booking must not block re-booking). Before wrong: "UNIQUE (event_id, seat_id) on the tickets table" (47). After wrong: "UNIQUE (event_id, seat_id, status) on the tickets table, so a cancelled row has its own key" (91), a real mistake. Explain now says why it breaks: a second cancellation of the same seat collides with the first CANCELLED row.
3. timeseries #9 (histogram buckets, SLO 300 ms). Before wrong: "Nothing: histograms are exact" (29) and "Histograms cannot represent p99" (31). After wrong: "Bucket counts from different hosts cannot be added, so no fleet p99 exists" and "The +inf bucket makes the p99 undefined, so the histogram must drop its last bucket". Explains state that bucket counts do add and the +inf bucket only catches values above the last bound.
4. async-jobs #24 (fan-in counter with DECR). Before wrong: "The counter must be a float" (27), "Redis cannot hold a counter that large" (38). After wrong: "The counter overflows past 255, so it wraps to a negative value before reaching zero" and "The counter has to be a float, so DECR drifts and never hits exactly zero". Explain states Redis counters are 64-bit integers and exact.
5. geospatial #25 (ranking score). Before wrong: "About 0.85: five stars wins" (27), "About 0.50" (10). After wrong: "About 0.91: the 5.0 rating counts in full, and distance adds about 0.41" and "About 0.38: smoothing pulls it to about 3.85, and distance adds nothing". Each is the result of one specific mistake (skip smoothing, forget the distance term).

## Could not balance / notes
- Numeric and code-output questions with 1 to 5 character options were kept as is where wrong values were already plausible; a few had a wrong value swapped (async-jobs Little's law, partitioning sizing) so all options have a similar format.
- Concurrent edits: other agents edit these files. Each apply replaced the options and explain arrays as they stood at that moment, keeping existing explain text where I did not change an option. If a verification agent corrected an option or explain in these arrays between my read and write, that correction could have been overwritten; the coordinator should re-run its fact checks on these five lessons.
- Distractors that make claims about real products (Redis, MySQL/InnoDB, Kafka, Cassandra, Postgres) were written to be false and their explains state the true behaviour already evidenced in the lessons and docs/qa files (for example: PEXPIRE does not check ownership; ZREM removes the member; GEOADD does not revive an expired key; MySQL default isolation; Redis replication is asynchronous). Nothing new was run against live systems for this task.
