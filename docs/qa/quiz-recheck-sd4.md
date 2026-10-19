# Quiz re-check sd4 (after length rebalance)

Date 2026-10-19. Files: pattern-contention, pattern-geospatial, pattern-async-jobs, pattern-partitioning, pattern-timeseries. Every question was solved blind from the stem/code (numbers recomputed; earlier runs in quiz-review-sd4.md cover MySQL 8.0 / redis:7 behaviour; geohash decoded again in Python for geo-geohash), then compared with the marked answer, options and explains.

Checks: `node scripts/check-quiz-integrity.mjs` -> 201 questions, 0 problems. `node scripts/quiz-balance-src.mjs` -> longest 28% / shortest 25%, mean ratio 1.02 (per file longest 23-31%, shortest 15-34%, ratio 0.99-1.04).

No edits were needed: no option was found that is also correct, no marked answer was false, no explain described an old option.

Notes: (1) aj-effects Q1 rowcount 0 for a no-op ON DUPLICATE KEY UPDATE holds on the server default and on PyMySQL/Connector-Python; Connector/J and mysql2 report 1 (see pattern-contention note). The lesson code is Python, so left as is. (2) Cassandra `max_hint_window` 3 h: already VERIFIED in docs-claims-B.md.

| lesson | quiz id | questions | verdict |
|---|---|---|---|
| pattern-contention | contention-prologue | 1 | OK |
| pattern-contention | contention-problem | 2 | OK |
| pattern-contention | contention-atomic | 3 | OK |
| pattern-contention | contention-dblocks | 4 | OK |
| pattern-contention | contention-isolation | 4 | OK |
| pattern-contention | contention-locks | 3 | OK |
| pattern-contention | contention-serialize | 2 | OK |
| pattern-contention | contention-holds | 3 | OK |
| pattern-contention | contention-waitingroom | 2 | OK |
| pattern-contention | contention-idempotency | 4 | OK |
| pattern-contention | contention-exactlyonce | 2 | OK |
| pattern-contention | contention-ledger | 3 | OK |
| pattern-contention | contention-payments | 2 | OK |
| pattern-contention | contention-scheduler | 3 | OK |
| pattern-contention | contention-ticketmaster | 2 | OK |
| pattern-contention | contention-payments-walk | 2 | OK |
| pattern-contention | contention-scheduler-walk | 2 | OK |
| pattern-contention | contention-transfer | 2 | OK |
| pattern-contention | contention-drills-quiz | 5 | OK |
| pattern-geospatial | geo-naive | 2 | OK |
| pattern-geospatial | geo-distance | 2 | OK |
| pattern-geospatial | geo-geohash | 2 | OK |
| pattern-geospatial | geo-edges | 2 | OK |
| pattern-geospatial | geo-quadtree | 2 | OK |
| pattern-geospatial | geo-s2h3 | 2 | OK |
| pattern-geospatial | geo-offshelf | 2 | OK |
| pattern-geospatial | geo-moving | 2 | OK |
| pattern-geospatial | geo-matching | 2 | OK |
| pattern-geospatial | geo-eta | 2 | OK |
| pattern-geospatial | geo-hot | 2 | OK |
| pattern-geospatial | geo-cache | 2 | OK |
| pattern-geospatial | geo-ranking | 2 | OK |
| pattern-geospatial | geo-yelp | 2 | OK |
| pattern-geospatial | geo-uber | 2 | OK |
| pattern-geospatial | geo-transfer | 2 | OK |
| pattern-geospatial | geo-final | 3 | OK |
| pattern-async-jobs | aj-prologue | 2 | OK |
| pattern-async-jobs | aj-why-async | 2 | OK |
| pattern-async-jobs | aj-template | 3 | OK |
| pattern-async-jobs | aj-state-machine | 2 | OK |
| pattern-async-jobs | aj-leases | 3 | OK |
| pattern-async-jobs | aj-retries | 2 | OK |
| pattern-async-jobs | aj-effects | 2 | OK |
| pattern-async-jobs | aj-fairness | 2 | OK |
| pattern-async-jobs | aj-scaling | 2 | OK |
| pattern-async-jobs | aj-progress | 2 | OK |
| pattern-async-jobs | aj-pipelines | 1 | OK |
| pattern-async-jobs | aj-fan-in | 2 | OK |
| pattern-async-jobs | aj-orchestration | 2 | OK |
| pattern-async-jobs | aj-scheduler | 2 | OK |
| pattern-async-jobs | aj-frontier | 3 | OK |
| pattern-async-jobs | aj-dedup | 2 | OK |
| pattern-async-jobs | aj-judge | 2 | OK |
| pattern-async-jobs | aj-youtube | 2 | OK |
| pattern-async-jobs | aj-crawler | 2 | OK |
| pattern-async-jobs | aj-mixed | 4 | OK |
| pattern-partitioning | pp-why | 2 | OK |
| pattern-partitioning | pp-modn | 2 | OK |
| pattern-partitioning | pp-ring | 2 | OK |
| pattern-partitioning | pp-vnodes | 2 | OK |
| pattern-partitioning | pp-rdv | 1 | OK |
| pattern-partitioning | pp-slots | 3 | OK |
| pattern-partitioning | pp-ranges | 2 | OK |
| pattern-partitioning | pp-hot | 2 | OK |
| pattern-partitioning | pp-rebalance | 2 | OK |
| pattern-partitioning | pp-repl | 2 | OK |
| pattern-partitioning | pp-quorum | 3 | OK |
| pattern-partitioning | pp-conflicts | 3 | OK |
| pattern-partitioning | pp-merkle | 2 | OK |
| pattern-partitioning | pp-gossip | 2 | OK |
| pattern-partitioning | pp-routing | 2 | OK |
| pattern-partitioning | pp-storage | 2 | OK |
| pattern-partitioning | pp-sizing | 2 | OK |
| pattern-partitioning | pp-cache-round | 2 | OK |
| pattern-partitioning | pp-kv-round | 2 | OK |
| pattern-partitioning | pp-unlocks | 2 | OK |
| pattern-partitioning | pp-drills | 4 | OK |
| pattern-timeseries | ts-prologue | 1 | OK |
| pattern-timeseries | ts-ingest | 1 | OK |
| pattern-timeseries | ts-tsdb | 1 | OK |
| pattern-timeseries | ts-cardinality | 1 | OK |
| pattern-timeseries | ts-rollups | 1 | OK |
| pattern-timeseries | ts-windows | 1 | OK |
| pattern-timeseries | ts-watermarks | 2 | OK |
| pattern-timeseries | ts-percentiles | 1 | OK |
| pattern-timeseries | ts-counters | 1 | OK |
| pattern-timeseries | ts-hll | 1 | OK |
| pattern-timeseries | ts-cms | 1 | OK |
| pattern-timeseries | ts-topk | 2 | OK |
| pattern-timeseries | ts-leaderboard | 1 | OK |
| pattern-timeseries | ts-adclicks | 1 | OK |
| pattern-timeseries | ts-alerting | 1 | OK |
| pattern-timeseries | ts-sketch-ads | 1 | OK |
| pattern-timeseries | ts-sketch-leaderboard | 1 | OK |
| pattern-timeseries | ts-sketch-trending | 1 | OK |
| pattern-timeseries | ts-family | 1 | OK |
| pattern-timeseries | ts-final | 4 | OK |
