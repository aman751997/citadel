# Live tests 2 (task `live-tests-2`)

Run 2026-10-19 on real throwaway containers (all removed). Versions: Cassandra 5.0.9 (`cassandra:5`, heap 512M), MySQL 8.0.46, Kafka `apache/kafka:latest` (KRaft, 1 broker) with confluent-kafka 2.16.0 / librdkafka 2.16.0, Connector/J 9.4.0, mysql2 (npm latest), go-sql-driver/mysql 1.10.1, Temurin 17 (17.0.20.1), Redis 7 (`redis:7`).

Counts: VERIFIED 9, CORRECTED 5, COULD NOT VERIFY 1.

## 1. Cassandra
- pattern-timeseries.mdx (samples, TWCS, `default_time_to_live`): VERIFIED. Runs as written on 5.0.9. `DESCRIBE TABLE` shows `compaction = {'class': 'org.apache.cassandra.db.compaction.TimeWindowCompactionStrategy', 'compaction_window_size': '1', 'compaction_window_unit': 'DAYS', ...}`, `default_time_to_live = 1296000`. Comment "check current docs for compaction options" CORRECTED to "runs as written on Cassandra 5.0". File-level "expiry drops whole files" not measured.
- pattern-partitioning.mdx (events, `CLUSTERING ORDER BY (ts DESC)`): VERIFIED. Range query on one partition returned the two rows in the hour, newest first (09:45, 09:30). `DESCRIBE` shows `PRIMARY KEY (device_id, ts)` and `CLUSTERING ORDER BY (ts DESC)`.
- Hinted handoff / `max_hint_window` 3h: VERIFIED (`cassandra.yaml`: `hinted_handoff_enabled: true`, `max_hint_window: 3h`; `nodetool getmaxhintwindow` = 10800000 ms). `gc_grace_seconds = 864000` (10 days): VERIFIED in `DESCRIBE`. Lessons already say three hours and ten days.

## 2. MySQL drivers and CLIENT_FOUND_ROWS (MySQL 8.0.46)
No-op `INSERT ... ON DUPLICATE KEY UPDATE col = col` and no-op `UPDATE ... SET col = 5` on a row already holding 5:

| Driver (default settings) | new row | no-op upsert | no-op UPDATE | changing upsert |
|---|---|---|---|---|
| Connector/J 9.4.0 (`useAffectedRows=false`) | 1 | **1** | **1** | 2 |
| Connector/J with `useAffectedRows=true` | 1 | 0 | 0 | 2 |
| Node mysql2 | 1 | **1** | **1** | 2 |
| mysql2 with `flags: ['-FOUND_ROWS']` | 1 | 0 | 0 | 2 |
| Go go-sql-driver/mysql (`clientFoundRows` off) | 1 | **0** | **0** | 2 |
| Go with `clientFoundRows=true` | 1 | 1 | 1 | 2 |
| PyMySQL, Connector/Python (earlier run) | 1 | 0 | 0 | 2 |

CORRECTED (pattern-contention.mdx, queues-streams.mdx twice): lessons now say PyMySQL, Connector/Python and Go leave the flag off (report 0); Connector/J and mysql2 turn it on by default (report 1). Previously only two Python drivers were named.

## 3. Kafka
- Exceeding `max.poll.interval.ms` (6000, session.timeout 6000, no poll for 10 s, manual commit): VERIFIED.
```
3.5s got offset 0; sleeping 10s without polling
%4|MAXPOLL| Application maximum poll interval (6000ms) exceeded by 432ms: leaving group
13.5s commit error: Commit failed: Broker: Unknown member   (UNKNOWN_MEMBER_ID)
13.5s poll error _MAX_POLL_EXCEEDED ; LOST [0]
16.5s ASSIGN [0] ; poll got offset 0 again (uncommitted record redelivered)
```
  queues-streams.mdx: added a sentence with this result. (Java client throws `CommitFailedException`; not run, librdkafka shown.)
- Committed offset falls off retention (topic `retention.ms=5000`, `segment.ms=1000`, broker `log.retention.check.interval.ms=2000`; committed offset 3, offsets 0-10 deleted, 5 new records at 11-15 still on disk): CORRECTED text (added detail). Log start 11, log end 16.
```
latest   -> no records read (reset to END 16; skipped the 5 records still on disk)
earliest -> new0..new4 at offsets 11..15 (reset to BEGINNING = log start)
error (librdkafka)  -> _AUTO_OFFSET_RESET "Offset out of range"
none (Java console consumer) -> OffsetOutOfRangeException: Fetch position offset=3 is out of range
```
  The existing text (latest jumps to the newest record with no error) is VERIFIED; added earliest/none behaviour.
- Consumer lag after the pause: `kafka-consumer-groups --describe`: CURRENT-OFFSET 3, LOG-END-OFFSET 16, LAG 13, although offsets 0-10 no longer existed. So lag counts deleted records. Added to queues-streams.mdx. VERIFIED.
- Note: the `apache/kafka` image ignores its default config when any `KAFKA_*` env var is set; the broker needs the full KRaft env set (done).

## 4. Threads then OutOfMemoryError (`docker run --memory=1g --memory-swap=1g`, Temurin 17, max heap 247 MB, idle sleeping threads)
- No pids limit: the process printed `threads=16000` and was then killed by the kernel (exit 137, `Killed`). No `OutOfMemoryError`. With `-Xss256k`: killed after more than 17,000 threads. So in a 1 GB container the limit hit is memory (container OOM kill), not a Java error. CORRECTED.
- With `--pids-limit=4000`: `java.lang.OutOfMemoryError: unable to create native thread: possibly out of memory or process/resource limits reached` at 3,983 threads (`pthread_create failed (EAGAIN)`, stack size 2040k), heap used 8 MB of 247 MB. So the exact message appears when a process or thread limit is reached, and the heap is not the problem.
- concurrency-for-lld.mdx: "9,000 threads" changed to "thousands", with a sentence that the count depends on stack size, memory and limits, with these two observations. The "9,000" figure was invented, not measured.

## 5. Redis
- Cluster failover (3 primaries + 3 replicas, `cluster-node-timeout 2000`, primary killed with `docker kill`, a writer looping `SET foo` through `redis-cli -c`): writes to the shard failed for about 3.9 s (first run, 50 ms loop; second run 3.7 s including about 0.15 s of `docker exec` overhead). Replica log: election started, 2 of 3 votes needed, "Failover election won". caching.mdx: added the ~4 s figure. VERIFIED.
- Acknowledged write lost on failover: replica cut off with `docker network disconnect`, primary acknowledged `SET {bar}lost v2` (OK), primary killed, replica reconnected and was promoted. Result: `{bar}kept` (written and replicated before the cut) = `v1`; `{bar}lost` missing. VERIFIED (caching.mdx claim "a failover can lose the last writes"). Failover in that run took 36 s because the replica was cut off from the cluster bus and rejoined; not a normal failover time, not quoted.
- LRU vs LFU (single Redis 7, `maxmemory 4mb`, 100-byte values, 50,000 keys, Zipf s=1.0, cache-aside, 300k warmup requests, 100k measured; then a one-time scan of 40,000 never-seen keys; then 5 windows of 10k Zipf requests):
```
allkeys-lru  steady hit 0.856  top-1000 hot keys left after scan: 13    after scan: 0.577 0.692 0.730 0.747 0.755
allkeys-lfu  steady hit 0.879  top-1000 hot keys left after scan: 1000  after scan: 0.858 0.866 0.864 0.872 0.872
```
  (With `maxmemory 16mb` everything fit and nothing was evicted; discarded.) VERIFIED the claim that LRU suffers scan pollution and LFU resists it (caching.mdx; numbers added). Not tested: LFU adapting slowly to a changed hot set (lesson card claim).

## COULD NOT VERIFY
- Java client `CommitFailedException` by name and the "adding a fourth node moves 25%" figure were not run (the first is librdkafka behaviour shown above; the second is arithmetic).
