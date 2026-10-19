# Quiz review sd1 (delivery-framework, estimation, core-concepts, networking, databases)

## Method and global notes
- Every question solved independently first, then compared with the marked answer. No marked answer was wrong.
- Numbers recomputed in Python (62^7, 99.x% nines, Little's law, shard/server counts, 0.99^20, 1-0.99^100, 10/110 modulo remap, 2^31, etc.).
- SQL (MySQL 8.0.46 in a throwaway `vfy-quiz-sd1` container, removed): composite-index EXPLAIN (`<>`, `IN`, equality, reordered index) and the photo_tags covering index (`Backward index scan; Using index`, OK). Isolation, lost-update, conditional UPDATE, SKIP LOCKED and UUID_TO_BIN claims in the quizzes were already run in docs/qa/sql-redis-verification.md; not repeated.
- Answer-position bias: before this pass 137 of 153 marked answers were option index 1 (and usually the longest). A script permuted options + explain + answer together (checked: each marked-correct text and its explain line moved as a pair; arrays still equal length; all quiz literals evaluate). 80 questions moved. Questions with ordered numeric options, or options like Yes/No/Both/Only A/Neither, were left in place. Marked correctness unchanged.
- Style of correct options being the longest/most specific is still visible in many questions (not rewritten: would need new distractors; listed as a residual).
- Not reviewed (out of scope): Trace data, Reveal blocks, RevisionCards.

## Table
| lesson | quiz id | Q# | verdict | note |
|---|---|---|---|---|
| delivery-framework | clock-checkpoints | 1 | OK | numbers recomputed / logic checked by hand |
| delivery-framework | clock-checkpoints | 2 | FIXED | stem said "mostly" but dives get 7 of 15 minutes; now "biggest share"; why text matches table (checked vs 45/60 budget table) |
| delivery-framework | drive-checkpoint | 1 | OK | numbers recomputed / logic checked by hand |
| delivery-framework | drive-checkpoint | 2 | FIXED | "five of your six requirement minutes" was an unsupported number; now "a big part" |
| delivery-framework | requirements-checkpoint | 1 | OK | numbers recomputed / logic checked by hand |
| delivery-framework | requirements-checkpoint | 2 | OK | numbers recomputed / logic checked by hand |
| delivery-framework | entities-checkpoint | 1 | OK | numbers recomputed / logic checked by hand |
| delivery-framework | api-checkpoint | 1 | OK | numbers recomputed / logic checked by hand |
| delivery-framework | api-checkpoint | 2 | OK | numbers recomputed / logic checked by hand |
| delivery-framework | high-level-checkpoint | 1 | OK | numbers recomputed / logic checked by hand |
| delivery-framework | high-level-checkpoint | 2 | OK | numbers recomputed / logic checked by hand |
| delivery-framework | deep-dives-checkpoint | 1 | OK | numbers recomputed / logic checked by hand |
| delivery-framework | deep-dives-checkpoint | 2 | OK | numbers recomputed / logic checked by hand |
| delivery-framework | wrap-up-checkpoint | 1 | OK | numbers recomputed / logic checked by hand |
| delivery-framework | tradeoffs-checkpoint | 1 | OK | numbers recomputed / logic checked by hand |
| delivery-framework | dont-know-checkpoint | 1 | OK | numbers recomputed / logic checked by hand |
| delivery-framework | whiteboard-checkpoint | 1 | OK | numbers recomputed / logic checked by hand |
| delivery-framework | recovery-checkpoint | 1 | FIXED | stem gave no context for "that node"; now "id-generator node" (matches lesson scene) |
| delivery-framework | walkthrough-checkpoint | 1 | OK | numbers recomputed / logic checked by hand |
| delivery-framework | walkthrough-checkpoint | 2 | OK | numbers recomputed / logic checked by hand |
| delivery-framework | delivery-framework-final | 1 | OK | numbers recomputed / logic checked by hand |
| delivery-framework | delivery-framework-final | 2 | OK | numbers recomputed / logic checked by hand |
| delivery-framework | delivery-framework-final | 3 | OK | numbers recomputed / logic checked by hand |
| estimation | estimation-prologue | 1 | OK | numbers recomputed / logic checked by hand |
| estimation | estimation-powers | 1 | OK | numbers recomputed / logic checked by hand |
| estimation | estimation-powers | 2 | OK | numbers recomputed / logic checked by hand |
| estimation | estimation-time | 1 | OK | numbers recomputed / logic checked by hand |
| estimation | estimation-time | 2 | OK | numbers recomputed / logic checked by hand |
| estimation | estimation-latency | 1 | OK | numbers recomputed / logic checked by hand |
| estimation | estimation-storage | 1 | FIXED | distractor 3.65 PB did not equal 2x5x3x365 (=10.95 PB); option and why now "11 PB" |
| estimation | estimation-bandwidth | 1 | OK | numbers recomputed / logic checked by hand |
| estimation | estimation-memory | 1 | OK | numbers recomputed / logic checked by hand |
| estimation | estimation-servers | 1 | OK | numbers recomputed / logic checked by hand |
| estimation | estimation-servers | 2 | OK | numbers recomputed / logic checked by hand |
| estimation | estimation-nines | 1 | OK | numbers recomputed / logic checked by hand |
| estimation | estimation-nines | 2 | OK | numbers recomputed / logic checked by hand |
| estimation | estimation-sharding | 1 | OK | numbers recomputed / logic checked by hand |
| estimation | estimation-moments | 1 | OK | numbers recomputed / logic checked by hand |
| estimation | estimation-chat | 1 | FIXED | stem said 73 TB/year but 73 shards come from 146 TB over 2 years; stem corrected, numbers match lesson |
| estimation | estimation-shortener | 1 | FIXED | distractor explanation was muddled; "12 chars is a million times too many" was wrong (3.2e21/3.65e13 = 8.8e7) -> "roughly 100 million times" |
| estimation | estimation-metrics | 1 | OK | numbers recomputed / logic checked by hand |
| estimation | estimation-video | 1 | OK | numbers recomputed / logic checked by hand |
| estimation | estimation-sanity | 1 | OK | numbers recomputed / logic checked by hand |
| estimation | estimation-skip | 1 | OK | numbers recomputed / logic checked by hand |
| estimation | estimation-drills | 1 | OK | numbers recomputed / logic checked by hand |
| estimation | estimation-drills | 2 | OK | numbers recomputed / logic checked by hand |
| estimation | estimation-drills | 3 | OK | numbers recomputed / logic checked by hand |
| estimation | estimation-drills | 4 | OK | numbers recomputed / logic checked by hand |
| estimation | estimation-drills | 5 | OK | numbers recomputed / logic checked by hand |
| estimation | estimation-drills | 6 | OK | numbers recomputed / logic checked by hand |
| core-concepts | core-prologue | 1 | OK | numbers recomputed / logic checked by hand |
| core-concepts | core-prologue | 2 | OK | numbers recomputed / logic checked by hand |
| core-concepts | core-layers | 1 | OK | numbers recomputed / logic checked by hand |
| core-concepts | core-layers | 2 | OK | numbers recomputed / logic checked by hand |
| core-concepts | core-scaling | 1 | OK | numbers recomputed / logic checked by hand |
| core-concepts | core-scaling | 2 | OK | numbers recomputed / logic checked by hand |
| core-concepts | core-throughput | 1 | OK | numbers recomputed / logic checked by hand |
| core-concepts | core-throughput | 2 | FIXED | explain said "last 30%"; now "last stretch of utilisation" |
| core-concepts | core-tail | 1 | OK | numbers recomputed / logic checked by hand |
| core-concepts | core-tail | 2 | OK | numbers recomputed / logic checked by hand |
| core-concepts | core-availability | 1 | OK | numbers recomputed / logic checked by hand |
| core-concepts | core-availability | 2 | OK | numbers recomputed / logic checked by hand |
| core-concepts | core-liveness | 1 | OK | numbers recomputed / logic checked by hand |
| core-concepts | core-liveness | 2 | OK | numbers recomputed / logic checked by hand |
| core-concepts | core-replication | 1 | OK | numbers recomputed / logic checked by hand |
| core-concepts | core-replication | 2 | OK | numbers recomputed / logic checked by hand |
| core-concepts | core-cap | 1 | OK | numbers recomputed / logic checked by hand |
| core-concepts | core-cap | 2 | OK | numbers recomputed / logic checked by hand |
| core-concepts | core-consistency | 1 | OK | numbers recomputed / logic checked by hand |
| core-concepts | core-consistency | 2 | OK | numbers recomputed / logic checked by hand |
| core-concepts | core-consistency | 3 | OK | numbers recomputed / logic checked by hand |
| core-concepts | core-partitioning | 1 | OK | numbers recomputed / logic checked by hand |
| core-concepts | core-partitioning | 2 | OK | numbers recomputed / logic checked by hand |
| core-concepts | core-ids | 1 | OK | numbers recomputed / logic checked by hand |
| core-concepts | core-ids | 2 | OK | numbers recomputed / logic checked by hand |
| core-concepts | core-retries | 1 | FIXED | "retry 3 times" is 4 attempts (=64), answer 27 assumes 3 attempts; stem now says "up to 3 attempts in total" |
| core-concepts | core-retries | 2 | OK | numbers recomputed / logic checked by hand |
| core-concepts | core-isolation | 1 | OK | numbers recomputed / logic checked by hand |
| core-concepts | core-isolation | 2 | OK | numbers recomputed / logic checked by hand |
| core-concepts | core-overload | 1 | OK | numbers recomputed / logic checked by hand |
| core-concepts | core-overload | 2 | OK | numbers recomputed / logic checked by hand |
| core-concepts | core-mixed | 1 | OK | numbers recomputed / logic checked by hand |
| core-concepts | core-mixed | 2 | OK | numbers recomputed / logic checked by hand |
| core-concepts | core-mixed | 3 | OK | numbers recomputed / logic checked by hand |
| core-concepts | core-mixed | 4 | OK | numbers recomputed / logic checked by hand |
| networking | net-ch1 | 1 | OK | numbers recomputed / logic checked by hand |
| networking | net-ch1 | 2 | OK | numbers recomputed / logic checked by hand |
| networking | net-ch2 | 1 | OK | numbers recomputed / logic checked by hand |
| networking | net-ch2 | 2 | OK | numbers recomputed / logic checked by hand |
| networking | net-ch3 | 1 | OK | numbers recomputed / logic checked by hand |
| networking | net-ch4 | 1 | OK | numbers recomputed / logic checked by hand |
| networking | net-ch4 | 2 | OK | numbers recomputed / logic checked by hand |
| networking | net-ch5 | 1 | OK | numbers recomputed / logic checked by hand |
| networking | net-ch6 | 1 | OK | numbers recomputed / logic checked by hand |
| networking | net-ch6 | 2 | OK | numbers recomputed / logic checked by hand |
| networking | net-ch7 | 1 | OK | numbers recomputed / logic checked by hand |
| networking | net-ch7 | 2 | OK | numbers recomputed / logic checked by hand |
| networking | net-ch8 | 1 | OK | numbers recomputed / logic checked by hand |
| networking | net-ch8 | 2 | OK | numbers recomputed / logic checked by hand |
| networking | net-ch9 | 1 | OK | numbers recomputed / logic checked by hand |
| networking | net-ch10 | 1 | FIXED | distractor 620 ms was not the direct-path figure (20+450+40=510); option and explain now exact |
| networking | net-ch10 | 2 | OK | numbers recomputed / logic checked by hand |
| networking | net-ch11 | 1 | OK | numbers recomputed / logic checked by hand |
| networking | net-ch12 | 1 | FIXED | "retry 3 times" vs 3x3x3=27; now "up to 3 attempts per call" |
| networking | net-ch12 | 2 | OK | numbers recomputed / logic checked by hand |
| networking | net-ch12 | 3 | OK | numbers recomputed / logic checked by hand |
| networking | net-ch13 | 1 | OK | numbers recomputed / logic checked by hand |
| networking | net-review | 1 | FIXED | same attempts/retries wording for 3x3=9; also "Latency graphs" -> "Traffic graphs" |
| networking | net-review | 2 | OK | numbers recomputed / logic checked by hand |
| databases | databases-prologue | 1 | OK | numbers recomputed / logic checked by hand |
| databases | databases-prologue | 2 | OK | numbers recomputed / logic checked by hand |
| databases | databases-choose-store | 1 | OK | numbers recomputed / logic checked by hand |
| databases | databases-choose-store | 2 | OK | numbers recomputed / logic checked by hand |
| databases | databases-modeling | 1 | OK | numbers recomputed / logic checked by hand |
| databases | databases-modeling | 2 | FIXED | garbled stem rewritten; InnoDB "requires" an index -> "creates one if you did not" (documented FK behaviour) |
| databases | databases-many-to-many | 1 | OK | numbers recomputed / logic checked by hand |
| databases | databases-many-to-many | 2 | OK | numbers recomputed / logic checked by hand |
| databases | databases-storage | 1 | OK | numbers recomputed / logic checked by hand |
| databases | databases-storage | 2 | FIXED | UUID_TO_BIN(uuid,1) only reorders version-1 UUIDs; explain now says so (already verified in sql-redis-verification.md) |
| databases | databases-composite | 1 | FIXED | ran on MySQL 8.0.46: plan is type: range, Using where; Using index; Using filesort (not type: ref). Suggested fix status IN(...) STILL filesorts (verified); correct fix is index (seller_id, created_at, status): Backward index scan, no filesort |
| databases | databases-composite | 2 | OK | numbers recomputed / logic checked by hand |
| databases | databases-composite | 3 | OK | numbers recomputed / logic checked by hand |
| databases | databases-acid | 1 | OK | numbers recomputed / logic checked by hand |
| databases | databases-acid | 2 | OK | numbers recomputed / logic checked by hand |
| databases | databases-isolation | 1 | OK | numbers recomputed / logic checked by hand |
| databases | databases-isolation | 2 | OK | numbers recomputed / logic checked by hand |
| databases | databases-isolation | 3 | OK | numbers recomputed / logic checked by hand |
| databases | databases-concurrency | 1 | OK | numbers recomputed / logic checked by hand |
| databases | databases-concurrency | 2 | OK | numbers recomputed / logic checked by hand |
| databases | databases-concurrency | 3 | OK | numbers recomputed / logic checked by hand |
| databases | databases-replication | 1 | OK | numbers recomputed / logic checked by hand |
| databases | databases-replication | 2 | OK | numbers recomputed / logic checked by hand |
| databases | databases-replication | 3 | OK | numbers recomputed / logic checked by hand |
| databases | databases-multi-leader | 1 | OK | numbers recomputed / logic checked by hand |
| databases | databases-multi-leader | 2 | OK | numbers recomputed / logic checked by hand |
| databases | databases-capacity | 1 | OK | numbers recomputed / logic checked by hand |
| databases | databases-capacity | 2 | OK | numbers recomputed / logic checked by hand |
| databases | databases-sharding | 1 | OK | numbers recomputed / logic checked by hand |
| databases | databases-sharding | 2 | OK | numbers recomputed / logic checked by hand |
| databases | databases-sharding | 3 | OK | numbers recomputed / logic checked by hand |
| databases | databases-ids | 1 | FIXED | UUID_TO_BIN(uuid,1) does nothing for a v4 UUID; option now says version-1 UUID |
| databases | databases-ids | 2 | OK | numbers recomputed / logic checked by hand |
| databases | databases-pooling | 1 | OK | numbers recomputed / logic checked by hand |
| databases | databases-pooling | 2 | OK | numbers recomputed / logic checked by hand |
| databases | databases-replicas-cache | 1 | OK | numbers recomputed / logic checked by hand |
| databases | databases-replicas-cache | 2 | OK | numbers recomputed / logic checked by hand |
| databases | databases-migrations | 1 | OK | numbers recomputed / logic checked by hand |
| databases | databases-migrations | 2 | OK | numbers recomputed / logic checked by hand |
| databases | databases-drills | 1 | OK | numbers recomputed / logic checked by hand |
| databases | databases-drills | 2 | OK | numbers recomputed / logic checked by hand |
| databases | databases-drills | 3 | OK | numbers recomputed / logic checked by hand |
| databases | databases-drills | 4 | OK | numbers recomputed / logic checked by hand |
| databases | databases-drills | 5 | OK | numbers recomputed / logic checked by hand |
