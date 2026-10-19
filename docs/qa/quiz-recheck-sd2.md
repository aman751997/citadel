# Quiz re-check sd2 (caching, queues-streams, load-balancing, blob-cdn, search)

Method: each question solved blind from stem/code; all numbers recomputed with Python (e.g. 50000/48=1041.7, 28232/1000=28.2 s, 20 MB/s x 86400 x 30 x 3 = 155.5 TB, mod 4->5 keeps 20% (80% move), mod 10->11 keeps 1/11, BM25 TF 1.375 vs 2.174, 128x0.5/20=3.2, 603//4=150, 30 GB/s x 5% = 1.5 and x 1% = 0.3). Facts about Redis/MySQL/Kafka/S3 cross-checked against docs/qa/*.md (mysql 0 affected rows on no-op upsert, 1062, RabbitMQ DLX triggers, FIFO 5 min dedup window). Integrity: 150 questions, 0 problems. Balance: longest 28%, shortest 23%, ratio 1.03.

| lesson | questions | OK | FIXED |
|---|---|---|---|
| caching | 34 | 34 | 0 |
| queues-streams | 28 | 27 | 1 |
| load-balancing | 29 | 28 | 1 |
| blob-cdn | 40 | 39 | 1 |
| search | 19 | 19 | 0 |

## Fixes
- queues-streams qs-queue-vs-log Q1, option 0 explain: "each team would see a quarter" -> "only a third" (3 teams share one queue).
- load-balancing lb-retries Q1 stem: "each retry 3 times" -> "each make up to 3 attempts" (matches the lesson's 3 x 3 x 3 = 27 and "triples, then triples again").
- blob-cdn blob-ch9 Q1 option 1 and its explain: "1.5 -> 1.2 GB/s" was not the result of any coherent mistake; now "1.5 -> 1.44 GB/s, a 4% improvement", explain "reads the 4-point gain as a 4% cut ... misses fell from 5% to 1%, an 80% cut".

## Notes (OK, not changed)
- qs-lag Q2: "committed offset out of range" is a simplification (committed offsets can also expire after offsets.retention); both paths lead to auto.offset.reset=latest. Left as is.
- lb-outliers Q1: "no cap" is a hypothetical; Envoy defaults to max_ejection_percent 10. Stem says "no cap", fine.
