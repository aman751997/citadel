# Quiz review sd4

Lessons: pattern-contention, pattern-geospatial, pattern-async-jobs, pattern-partitioning, pattern-timeseries. 97 quizzes, 203 questions. Every question was solved first, then compared with the marked answer; every explain was read. Date 2026-10-19.

Runs: MySQL 8.0 and redis:7 throwaway containers (removed). MySQL: isolation Q1/Q2 (A prints 10,10,8 final 8; app-computed write gives final 9), 1062 then plain SELECT returns zero rows, SERIALIZABLE read-then-update gives deadlock 1213, SKIP LOCKED x3 gives 101/102/103, conditional seat UPDATE gives B=0, generated-column unique index allows re-book after CANCELLED, listing_nights gives one winner via 1062 and no deadlock, ON DUPLICATE KEY no-op gives ROW_COUNT 1 then 0. Redis: GEO key expiry returns d3 only, SET NX gives OK/nil/R1, release script returns 0, PEXPIRE on B's key returns 1 and on a missing key 0, PFCOUNT over two keys = union (4). Python: mod N 4->8 = 0.5, 20->19 stays 5%, 10->11 stays 1/11, 30->29 stays 3.3%, H10 = 2.93, phi at mean 3 s for 5 s = 0.72, Bloom 0.1% for 10B = 18 GB, 386 pages/s = 309 Mbps, 150x2/0.7 = 429, 300x60x4 = 72,000, ranking score = 0.794, hash-tag slots equal (15880).

Not run: Connector/J behaviour of rowcount for ON DUPLICATE KEY (some drivers report found rows, so a no-op upsert may return 1). COULD NOT VERIFY (no driver run); mentioned in report.

| lesson | quiz id | Q# | verdict | note |
|---|---|---|---|---|
| pattern-contention | contention-prologue | 1-1 | OK | solved independently, matches marked answer, explains consistent |
| pattern-contention | contention-problem | 1-2 | OK | solved independently, matches marked answer, explains consistent |
| pattern-contention | contention-atomic | 1-3 | OK | solved independently, matches marked answer, explains consistent |
| pattern-contention | contention-dblocks | 1-4 | OK | solved independently, matches marked answer, explains consistent |
| pattern-contention | contention-isolation | 1-4 | OK | solved independently, matches marked answer, explains consistent |
| pattern-contention | contention-locks | 1-3 | OK | solved independently, matches marked answer, explains consistent |
| pattern-contention | contention-serialize | 1-2 | OK | solved independently, matches marked answer, explains consistent |
| pattern-contention | contention-holds | 1-3 | OK | solved independently, matches marked answer, explains consistent |
| pattern-contention | contention-waitingroom | 1-2 | OK | solved independently, matches marked answer, explains consistent |
| pattern-contention | contention-idempotency | 1-5 | OK | solved independently, matches marked answer, explains consistent |
| pattern-contention | contention-exactlyonce | 1-2 | OK | solved independently, matches marked answer, explains consistent |
| pattern-contention | contention-ledger | 1-3 | OK | solved independently, matches marked answer, explains consistent |
| pattern-contention | contention-payments | 1-2 | OK | solved independently, matches marked answer, explains consistent |
| pattern-contention | contention-scheduler | 1-3 | OK | solved independently, matches marked answer, explains consistent |
| pattern-contention | contention-ticketmaster | 1-2 | OK | solved independently, matches marked answer, explains consistent |
| pattern-contention | contention-payments-walk | 1-2 | OK | solved independently, matches marked answer, explains consistent |
| pattern-contention | contention-scheduler-walk | 1-2 | OK | solved independently, matches marked answer, explains consistent |
| pattern-contention | contention-transfer | 1-2 | FIXED | Q1 FIXED: claimed a deadlock is possible; ran both orders in MySQL 8.0: no deadlock (same date order), loser gets 1062. Text corrected. |
| pattern-contention | contention-drills-quiz | 1-5 | FIXED (wording) | Q1 explain wording: wrong option labelled 'Correct but slow' -> 'Works, but slow'. |
| pattern-geospatial | geo-naive | 1-2 | OK | solved independently, matches marked answer, explains consistent |
| pattern-geospatial | geo-distance | 1-2 | FIXED | Q2 FIXED: 50 x 1 ms = 5% of a core, not 'under 5%'. |
| pattern-geospatial | geo-geohash | 1-2 | FIXED | Q1 FIXED: full 7-char third hash tdr1vcq decodes to about 1.1 km east, so 'could be 20 m' was false; stem now says the hash starts with tdr1vc (adjacent cell, verified by decoding). |
| pattern-geospatial | geo-edges | 1-2 | FIXED | Q1 FIXED: option said precision 4 or 5; precision 5 shorter side is 4.76 km (< 5 km), so only precision 4 works. |
| pattern-geospatial | geo-quadtree | 1-2 | OK | solved independently, matches marked answer, explains consistent |
| pattern-geospatial | geo-s2h3 | 1-2 | OK | solved independently, matches marked answer, explains consistent |
| pattern-geospatial | geo-offshelf | 1-2 | FIXED | Q1 FIXED: stem 'second command' was ambiguous; now 'the final GEOSEARCH'. Ran on redis:7 (EXPIRE 2 s): returns d3 only. |
| pattern-geospatial | geo-moving | 1-2 | OK | solved independently, matches marked answer, explains consistent |
| pattern-geospatial | geo-matching | 1-2 | OK | solved independently, matches marked answer, explains consistent |
| pattern-geospatial | geo-eta | 1-2 | OK | solved independently, matches marked answer, explains consistent |
| pattern-geospatial | geo-hot | 1-2 | OK | solved independently, matches marked answer, explains consistent |
| pattern-geospatial | geo-cache | 1-2 | OK | solved independently, matches marked answer, explains consistent |
| pattern-geospatial | geo-ranking | 1-2 | OK | solved independently, matches marked answer, explains consistent |
| pattern-geospatial | geo-yelp | 1-2 | OK | solved independently, matches marked answer, explains consistent |
| pattern-geospatial | geo-uber | 1-2 | OK | solved independently, matches marked answer, explains consistent |
| pattern-geospatial | geo-transfer | 1-2 | OK | solved independently, matches marked answer, explains consistent |
| pattern-geospatial | geo-final | 1-4 | OK | solved independently, matches marked answer, explains consistent |
| pattern-async-jobs | aj-prologue | 1-2 | OK | solved independently, matches marked answer, explains consistent |
| pattern-async-jobs | aj-why-async | 1-2 | OK | solved independently, matches marked answer, explains consistent |
| pattern-async-jobs | aj-template | 1-3 | OK | solved independently, matches marked answer, explains consistent |
| pattern-async-jobs | aj-state-machine | 1-2 | OK | solved independently, matches marked answer, explains consistent |
| pattern-async-jobs | aj-leases | 1-3 | OK | solved independently, matches marked answer, explains consistent |
| pattern-async-jobs | aj-retries | 1-2 | OK | solved independently, matches marked answer, explains consistent |
| pattern-async-jobs | aj-effects | 1-2 | OK | solved independently, matches marked answer, explains consistent |
| pattern-async-jobs | aj-fairness | 1-2 | OK | solved independently, matches marked answer, explains consistent |
| pattern-async-jobs | aj-scaling | 1-2 | OK | solved independently, matches marked answer, explains consistent |
| pattern-async-jobs | aj-progress | 1-2 | OK | solved independently, matches marked answer, explains consistent |
| pattern-async-jobs | aj-pipelines | 1-1 | OK | solved independently, matches marked answer, explains consistent |
| pattern-async-jobs | aj-fan-in | 1-2 | OK | solved independently, matches marked answer, explains consistent |
| pattern-async-jobs | aj-orchestration | 1-2 | OK | solved independently, matches marked answer, explains consistent |
| pattern-async-jobs | aj-scheduler | 1-2 | OK | solved independently, matches marked answer, explains consistent |
| pattern-async-jobs | aj-frontier | 1-3 | FIXED | Q1 FIXED: explain for 500 said '1-second gap'; 500 hosts = 0.5 s gap (1,000 = 1 s gap). |
| pattern-async-jobs | aj-dedup | 1-2 | OK | solved independently, matches marked answer, explains consistent |
| pattern-async-jobs | aj-judge | 1-2 | OK | solved independently, matches marked answer, explains consistent |
| pattern-async-jobs | aj-youtube | 1-2 | OK | solved independently, matches marked answer, explains consistent |
| pattern-async-jobs | aj-crawler | 1-2 | OK | solved independently, matches marked answer, explains consistent |
| pattern-async-jobs | aj-mixed | 1-4 | OK | solved independently, matches marked answer, explains consistent |
| pattern-partitioning | pp-why | 1-2 | OK | solved independently, matches marked answer, explains consistent |
| pattern-partitioning | pp-modn | 1-2 | FIXED | Q1 FIXED: explain claimed 0.25 is the ideal; ran code = 0.5 (half the keys must move anyway). |
| pattern-partitioning | pp-ring | 1-2 | FIXED | Q1 FIXED: 'nearly double' -> 1.75x (C arc 40 -> 70). |
| pattern-partitioning | pp-vnodes | 1-2 | OK | solved independently, matches marked answer, explains consistent |
| pattern-partitioning | pp-rdv | 1-1 | OK | solved independently, matches marked answer, explains consistent |
| pattern-partitioning | pp-slots | 1-3 | FIXED | Q1 FIXED: confusing explain for 4,096 reworded. |
| pattern-partitioning | pp-ranges | 1-2 | OK | solved independently, matches marked answer, explains consistent |
| pattern-partitioning | pp-hot | 1-2 | OK | solved independently, matches marked answer, explains consistent |
| pattern-partitioning | pp-rebalance | 1-2 | OK | solved independently, matches marked answer, explains consistent |
| pattern-partitioning | pp-repl | 1-2 | OK | solved independently, matches marked answer, explains consistent |
| pattern-partitioning | pp-quorum | 1-3 | FIXED | Q2 FIXED: stem did not state R; explain assumed R = 2. Stem now says R = 2. |
| pattern-partitioning | pp-conflicts | 1-3 | OK | solved independently, matches marked answer, explains consistent |
| pattern-partitioning | pp-merkle | 1-2 | OK | solved independently, matches marked answer, explains consistent |
| pattern-partitioning | pp-gossip | 1-2 | OK | solved independently, matches marked answer, explains consistent |
| pattern-partitioning | pp-routing | 1-2 | OK | solved independently, matches marked answer, explains consistent |
| pattern-partitioning | pp-storage | 1-2 | OK | solved independently, matches marked answer, explains consistent |
| pattern-partitioning | pp-sizing | 1-2 | OK | solved independently, matches marked answer, explains consistent |
| pattern-partitioning | pp-cache-round | 1-2 | OK | solved independently, matches marked answer, explains consistent |
| pattern-partitioning | pp-kv-round | 1-2 | OK | solved independently, matches marked answer, explains consistent |
| pattern-partitioning | pp-unlocks | 1-2 | OK | solved independently, matches marked answer, explains consistent |
| pattern-partitioning | pp-drills | 1-4 | OK | solved independently, matches marked answer, explains consistent |
| pattern-timeseries | ts-prologue | 1-1 | OK | solved independently, matches marked answer, explains consistent |
| pattern-timeseries | ts-ingest | 1-1 | OK | solved independently, matches marked answer, explains consistent |
| pattern-timeseries | ts-tsdb | 1-1 | OK | solved independently, matches marked answer, explains consistent |
| pattern-timeseries | ts-cardinality | 1-1 | OK | solved independently, matches marked answer, explains consistent |
| pattern-timeseries | ts-rollups | 1-1 | OK | solved independently, matches marked answer, explains consistent |
| pattern-timeseries | ts-windows | 1-1 | OK | solved independently, matches marked answer, explains consistent |
| pattern-timeseries | ts-watermarks | 1-2 | OK | solved independently, matches marked answer, explains consistent |
| pattern-timeseries | ts-percentiles | 1-1 | OK | solved independently, matches marked answer, explains consistent |
| pattern-timeseries | ts-counters | 1-1 | OK | solved independently, matches marked answer, explains consistent |
| pattern-timeseries | ts-hll | 1-1 | OK | solved independently, matches marked answer, explains consistent |
| pattern-timeseries | ts-cms | 1-1 | FIXED | Q1 FIXED: stem gave the true count (800,000) which contradicted the premise of not knowing it; removed. |
| pattern-timeseries | ts-topk | 1-2 | OK | solved independently, matches marked answer, explains consistent |
| pattern-timeseries | ts-leaderboard | 1-1 | OK | solved independently, matches marked answer, explains consistent |
| pattern-timeseries | ts-adclicks | 1-1 | OK | solved independently, matches marked answer, explains consistent |
| pattern-timeseries | ts-alerting | 1-1 | OK | solved independently, matches marked answer, explains consistent |
| pattern-timeseries | ts-sketch-ads | 1-1 | OK | solved independently, matches marked answer, explains consistent |
| pattern-timeseries | ts-sketch-leaderboard | 1-1 | OK | solved independently, matches marked answer, explains consistent |
| pattern-timeseries | ts-sketch-trending | 1-1 | OK | solved independently, matches marked answer, explains consistent |
| pattern-timeseries | ts-family | 1-1 | OK | solved independently, matches marked answer, explains consistent |
| pattern-timeseries | ts-final | 1-4 | FIXED (wording) | Q1 explain for option 4 reworded (5-minute p99 is fine for that one view; wrong for any other grouping/window). |
