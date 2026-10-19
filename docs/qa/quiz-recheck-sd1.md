# Quiz re-check sd1 (2026-10-19)

Files: src/lessons/{delivery-framework,estimation,core-concepts,networking,databases}.mdx. 80 Quiz blocks, 153 questions read in full, answers solved blind (arithmetic recomputed in Python/by hand; MySQL EXPLAIN claims run in throwaway container vfy-recheck-my, mysql:8.0, removed).

Result: 153 reviewed, 147 OK, 6 FIXED (wording only; no answer index changed).
Integrity: `check-quiz-integrity.mjs` 0 problems. Balance: total longest 14% / shortest 31% / ratio 0.99.

| lesson | quiz id | Q# | verdict | note |
|---|---|---|---|---|
| delivery-framework | all 14 quizzes | all | OK | 43.2 min (99.9%), 52.6 min/yr (99.99%), 1.8e9/3.5e12 = 1 in ~2,000, 200 B x 1M x 365 = 73 GB all recomputed |
| estimation | all 18 quizzes | all | OK | 2^31/2M = 1,073 days; 0.9995^2 x 0.999 = 0.998 (86 min); 15/0.667 = 22.5 -> 24; 3.65e13 vs 62^7/62^8; 3 nodes for memory; Little's law items; all recomputed |
| estimation | estimation-drills | Q3 | FIXED | distractor "Bandwidth: splitting the network load across three nodes" was partly defensible; now "Latency: three nodes answer each lookup faster than one node" |
| core-concepts | core-prologue | Q1 | FIXED | explains cited "all 200" threads and "7:02" not in the story; now generic |
| core-concepts | core-isolation | Q1 | FIXED | "far more than any pool" overclaim -> "a normal pool" |
| core-concepts | core-mixed | Q3 | FIXED | explain said quorum reads are "not a precise guarantee" (W+R>N gives overlap); now says it works but costs more than needed |
| core-concepts | other 13 quizzes | all | OK | 1-0.99^20 = 0.182; 0.999^4 = 0.996; mod 10 -> 11 remaps 100 of 110; 2f+1; W+R>N all recomputed |
| networking | net-ch2 | Q1 | FIXED | explain claimed "many [browsers/OS] ignore a low TTL"; unsupported, softened |
| networking | other 12 quizzes | all | OK | 3 RTT + 30 = 330 ms; 20+20+20+20+150+40 = 270; 3x3x3 = 27; 3x3 = 9 recomputed |
| databases | databases-ids / drills | drills Q4 | FIXED | explain said both UUIDs "unique for practical purposes"; now states v7 has fewer random bits (74 vs 122) than v4 |
| databases | all 18 quizzes | all | OK | EXPLAIN run on mysql:8.0: (seller_id,status,created_at) with status<> gives type range + Using filesort; (tag_id,created_at) with PK (photo_id,tag_id) gives Using index; secondary index on user_id covers `SELECT id` but not `SELECT total`; FK without index gets auto KEY. 730 GB/yr, 307 TB / 10 = 31 recomputed. Other MySQL claims (CHECK, partition FK error, UUID_TO_BIN, MDL, SKIP LOCKED, 1213) are covered by docs/qa/sql-redis-verification.md |

Not re-run this pass (relied on earlier evidence): lost-update 150/170 and ROW_COUNT()=0 under RR (docs/qa/sql-redis-verification.md), innodb_flush_log_at_trx_commit=2 behaviour (needs a power loss; hedged in the explain).
