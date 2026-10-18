# SQL and Redis verification

Run on 2026-10-18 in throwaway containers (mysql:8.0 = 8.0.46, redis:7 = 7.4.11, redis:6.2.24 for one check, a cluster-enabled redis:7 for key slots). All removed afterwards. Default settings: REPEATABLE READ, innodb_lock_wait_timeout=50, innodb_rollback_on_timeout=0, maxmemory-policy=noeviction.

Two-session tests ran as two concurrent `mysql` clients with `SELECT SLEEP()` for ordering.

## pattern-contention.mdx (MySQL)

| # | Claim | Result | Observed |
|---|---|---|---|
| 1 | Every SQL statement and table definition parses and runs on 8.0 (hold, multi-seat, confirm, sweeper, counters, CHECK, unique, ODKU, generated-column unique, SKIP LOCKED, version CAS, fence, idempotency table, outbox, ledger, job_runs, listing_nights, room_inventory, GET_LOCK) | VERIFIED | Schema built with no errors. Only expected errors (1062, 3819) appeared. |
| 2 | Conditional UPDATE: loser gets 0 rows (RR, second waits for first) | VERIFIED | S1 `ROW_COUNT()=1`; S2 plain read still AVAILABLE, then `ROW_COUNT()=0` |
| 3 | Read-then-unconditional-update: both succeed at RR | VERIFIED | both sessions `ROW_COUNT()=1`; last writer wins |
| 4 | FOR UPDATE on a missing row at RR: gap lock, then both inserts deadlock | VERIFIED | S1: `ERROR 1213 (40001) Deadlock found...`; S2 insert succeeded. Control at READ COMMITTED: no deadlock, S1 got `1062` |
| 5 | Plain SELECT after 1062 does not see the other row at RR | CORRECTED (quiz code) | With a table read first (or `START TRANSACTION WITH CONSISTENT SNAPSHOT`): plain SELECT returned 0 rows, `FOR SHARE` returned the row, transaction stayed usable. With `SELECT 1;` (no table) the snapshot is NOT taken, and the plain SELECT saw the row. Fixed quiz code: `SELECT 1;` became `SELECT COUNT(*) FROM stock;` |
| 6 | SERIALIZABLE turns plain SELECT into a shared lock | VERIFIED | `data_locks`: `RECORD S,REC_NOT_GAP 77, 'B-4-17'`. At RR the same SELECT held 0 locks |
| 7 | SERIALIZABLE read-then-write pair deadlocks, one aborted | VERIFIED | one session `ERROR 1213`, other succeeded |
| 8 | 1205 rolls back only the statement | VERIFIED | with timeout 2s: `ERROR 1205 (HY000) Lock wait timeout exceeded`; earlier UPDATE in the same transaction still visible and committed (`EARLIER`) |
| 9 | Default lock wait timeout 50 s | VERIFIED | `@@innodb_lock_wait_timeout = 50`, `@@innodb_rollback_on_timeout = 0` |
| 10 | CHECK constraint enforced (8.0.16+) | VERIFIED on 8.0.46; version boundary COULD NOT TEST | `ERROR 3819 Check constraint 'inventory_chk_1' is violated`. Pre-8.0.16 behaviour not tested. |
| 11 | ROW_COUNT() = changed rows, not matched, by default | VERIFIED (server default) | `UPDATE stock SET qty=10` where qty already 10: `ROW_COUNT()=0`. The `CLIENT_FOUND_ROWS` driver flag COULD NOT TEST (no driver available). |
| 12 | SKIP LOCKED gives different rows | VERIFIED | S1 got ticket 1, S2 got ticket 2 |
| 13 | NOWAIT error 3572 | VERIFIED | `ERROR 3572 (HY000) Statement aborted because lock(s) could not be acquired immediately and NOWAIT is set.` Plain FOR UPDATE control waited about 1.5 s |
| 14 | `ON DUPLICATE KEY UPDATE col = col`: 1 new, 0 existing | VERIFIED | new row `ROW_COUNT()=1`, existing `ROW_COUNT()=0` (coupon and job_runs) |
| 15 | Generated column replaces partial unique index | VERIFIED | Second live `A1` row: 1062. After CANCELLED, re-book allowed. Two CANCELLED rows allowed (live_seat NULL) |
| 16 | Fence `fence <= :token` | VERIFIED | token 33: 1; token 34: 1; zombie 33 afterwards: 0. Same token again: 1 (because `paid_at` changes). Note: an identical retry that changes no column would report 0. |
| 17 | Version compare-and-set | VERIFIED | first `ROW_COUNT()=1`, second with stale version 0 |
| 18 | Opposite-order multi-row locking deadlocks (1213) | VERIFIED | `ERROR 1213` |
| 19 | Isolation table (below) | VERIFIED | see below |
| 20 | Quiz sequence: snapshot then `qty = qty - 1` | VERIFIED | printed 10, 10, 8; final 8 |
| 21 | Write skew fix: lock shared parent row at RR | VERIFIED | on-call total stayed 1 (without it: 0) |

### Isolation anomalies observed (InnoDB 8.0.46)

| Level | Dirty read | Non-repeatable | Phantom (plain SELECT) | Lost update (app-computed) | Write skew |
|---|---|---|---|---|---|
| READ UNCOMMITTED | saw 99 | 10 then 9 | 0 then 1 | final 9 (one lost) | on-call 0 |
| READ COMMITTED | saw 10 | 10 then 9 | 0 then 1 | final 9 | on-call 0 |
| REPEATABLE READ | saw 10 | 10 then 10 | 0 then 0 | final 9 | on-call 0 |
| SERIALIZABLE | saw 10 | 10 then 10 | 0 then 0 | one session `1213` | one session `1213`, on-call 1 |

This matches the lesson table. No change needed.

## caching.mdx (Redis 7.4.11)

| Claim | Result | Observed |
|---|---|---|
| `SET key token NX PX 30000` | VERIFIED | `OK`; second attempt returns nil; `PTTL` 29936 |
| Compare-and-delete release script (both the `else` and no-`else` forms) | VERIFIED | wrong token: `0`, key untouched; right token: `1`; again: `0` |
| Versioned compare-and-set (SET_IF_NEWER) | VERIFIED | v1 new: 1; same v1: 0; v3: 1; stale v2: 0 |
| Tombstone (empty data, short PEXPIRE) blocks stale reader | VERIFIED | tombstone v4 with 5000 ms: PTTL 4938; stale v3 write: 0; `data` is empty |
| After plain DEL a stale reader can re-cache | VERIFIED | `DEL` then stale v3: 1 |
| Once the tombstone expires a slow reader can still insert old value | VERIFIED | tombstone 300 ms, wait 500 ms, stale v3: 1 |
| Default maxmemory-policy is noeviction | VERIFIED | `maxmemory-policy noeviction`, `maxmemory 0` |
| EVAL return conventions | VERIFIED | `return 1` integer 1; `return 0` integer 0; Lua `false` becomes nil; `true` becomes 1; 3.7 becomes 3; Lua error from wrong type: `WRONGTYPE ... script:` |
| WAIT | PARTLY TESTED | single node `WAIT 1 100` returns 0 (no replicas). Behaviour with replicas COULD NOT TEST |
| Cluster key-slot claims | VERIFIED on a cluster-enabled node | CROSSSLOT error for multi-key `MSET`/script across slots; same-tag keys work |
| Replication loses last writes on failover, Redis Cluster behaviour | COULD NOT TEST (single node) | |

## rate-limiter.mdx (Redis 7.4.11)

| Claim | Result | Observed |
|---|---|---|
| `MULTI / INCR / EXPIRE 120 / EXEC` | VERIFIED | replies `1`, `1`; `TTL` 120 |
| `EXPIRE ... NX` sets TTL only if none; Redis 7+ | VERIFIED | first: 1 (TTL 100); second with 500: 0, TTL stayed 100. On redis:6.2.24: `ERR wrong number of arguments for 'expire' command` |
| INCR without EXPIRE leaves no TTL (blocked-forever trap) | VERIFIED | counts 1,2,3; `TTL` -1 |
| Sliding-log Lua (limit 3) | VERIFIED | 3 admitted, 4th: 0; at t=1999 (window 1000): 0; at t=2000: 1 (entry at 1000 dropped). Same member twice: ZCARD 1 (collapse) |
| Token bucket script (cap 5, one call each, no refill) | VERIFIED | remaining 4,3,2,1,0 then `0 0 9989` (not allowed, retry 9989 ms). Cost 6 > capacity 5: `0 5 100`, never passes |
| `TIME` then write inside script | VERIFIED | allowed on 7.4 |
| Lease (partial grant) script | VERIFIED | want 60: grant 60 left 40; want 60: grant 40 left 0; want 60: grant 0. PTTL about 1,000,993 ms |
| `register_script`: EVALSHA, falls back to EVAL | CORRECTED | Server side: EVALSHA of unknown script returns `NOSCRIPT No matching script. Please use EVAL.` The redis-py client catches NoScriptError, runs `SCRIPT LOAD`, then retries EVALSHA (client library source; redis-py not installed so not run). Lesson text changed. |
| Hash tag = first `{...}`; slot of `rl:{tenant42}:{user7}:min` is 14,826 | VERIFIED (slot) / CORRECTED (wording) | `CLUSTER KEYSLOT` gives 14826 for both `{tenant42}:x` and `rl:{tenant42}:{user7}:min`. `rl:{t42:u7}:min` = 13352; `rl:{k_8f3a}:all` and `rl:{k_8f3a}:ep:search` both 209. For `a{}b{c}` the slot (7353) differs from `{c}` (7365), so an empty first pair means the whole key is hashed (not "first non-empty pair"). Text corrected in 3 places. |
| "Not run against a live Redis" | UPDATED | Now it has been; sentence changed |
| Cross-slot script rejected | VERIFIED | `CROSSSLOT Keys in request don't hash to the same slot` |
| Cross-region, failover, circuit-breaker behaviour | COULD NOT TEST | design claims, not commands |
| Python snippets (redis-py) | COULD NOT TEST | no redis-py installed; commands inside them were tested directly |

---

# Second pass (2026-10-19): databases, queues-streams, pattern-async-jobs, url-shortener, llm-gateway, feature-flags, pattern-fanout, pattern-realtime

Throwaway containers mysql:8.0 (8.0.46, ROW binlog, strict mode default), a second mysql:8.0 with GTID on, redis:7 (7.4.11), redis:6.2 (one check). All removed. Concurrent sessions were two backgrounded `docker exec mysql` clients with `SELECT SLEEP()`.

## databases.mdx (MySQL 8.0.46)

| Claim | Result | Observed |
|---|---|---|
| Dashboard query on `(seller_id, status, created_at DESC)`: `type: ref`, `Extra: NULL` (no filesort), key used | VERIFIED | `type: ref, key: listings_by_seller, key_len: 50, Extra: NULL` (8 + 42 bytes: both columns used) |
| Covering index shows `Using index`; `SELECT id WHERE seller_id=42` covered by a plain seller_id-prefix index (PK implicit) | VERIFIED | `key_len: 8, Extra: Using index`; with `(…, price_cents, title)` appended, the 3-column dashboard query: `Extra: Using index` |
| type values const / ref / range / index / ALL | VERIFIED | `const` (PK), `ref`, `range` (`Using where; Using index`), `index` (full covering-index scan) |
| `Using temporary`, `Using filesort`, `Using index for group-by` | VERIFIED | DISTINCT over a non-prefix column: `Using where; Using index; Using temporary`; ORDER BY not matching an index: `Using filesort` |
| Leading wildcard / function on column cannot seek | VERIFIED | both gave `type: index` (full scan of the smallest covering index, 20175 rows), no seek |
| Partition pruning shows in `partitions` column | VERIFIED | `created_at >= '2026-11-02'`: `partitions: p202611,pmax`; filter on conversation_id only: all three partitions |
| PK must include the partition column | VERIFIED | `ERROR 1503 A PRIMARY KEY must include all columns in the table's partitioning function` |
| No FKs on partitioned InnoDB tables | VERIFIED | `ERROR 1506 Foreign keys are not yet supported in conjunction with partitioning` |
| `DROP PARTITION` removes old rows | VERIFIED | row count 2 to 1 |
| Partition count limit 8,192 | COULD NOT TEST | documented limit, not created |
| `UUID_TO_BIN(uuid, 1)` swaps time bits | VERIFIED | `6ccd780c-baba-1026-…` gives `1026BABA6CCD780C95645B8C656024DB`; with flag 0: `6CCD780CBABA1026…` |
| Gap and next-key locks at REPEATABLE READ; none at READ COMMITTED | VERIFIED | `BETWEEN 12 AND 25 FOR UPDATE` on keys 10,20,30: RR `X` on 20 plus `X,GAP` on 30; RC only `X,REC_NOT_GAP` on 20 |
| Un-indexed locking write locks every row and the supremum | VERIFIED | `UPDATE … WHERE c=2` (c unindexed): X on supremum, 1, 2, 3 |
| READ COMMITTED needs row-based binlog | CORRECTED (wording) | `binlog_format=STATEMENT`: `ERROR 1665 … InnoDB is limited to row-logging when transaction isolation level is READ COMMITTED`. MIXED works. Text now says ROW or MIXED, STATEMENT fails with 1665 |
| 1213 / 1205 / consistent vs current reads | VERIFIED in first pass (see pattern-contention) | |
| Default `lock_wait_timeout` is a year | VERIFIED | `31536000` |
| `ADD COLUMN … NULL, ALGORITHM=INSTANT` | VERIFIED | succeeded |
| `ADD INDEX … ALGORITHM=INPLACE, LOCK=NONE` | VERIFIED | succeeded; `ALGORITHM=INSTANT` on ADD INDEX: `ERROR 1845 ALGORITHM=INSTANT is not supported for this operation` |
| Making a column NOT NULL is in-place (not instant), after backfill | VERIFIED | INSTANT: `ERROR 1845`; INPLACE, LOCK=NONE after backfill: OK; before backfill: `ERROR 1138 Invalid use of NULL value` |
| MDL: ALTER waits behind an open transaction and new queries queue behind the ALTER | VERIFIED | session A open txn on `g`; `ALTER` showed `Waiting for table metadata lock`; a new `SELECT` with `lock_wait_timeout=2` failed `ERROR 1205`; ALTER finished only after A committed |
| `WAIT_FOR_EXECUTED_GTID_SET` | VERIFIED | own gtid set: `0`; unknown set with 1 s timeout: `1` |
| `session_track_gtids = OWN_GTID` | PARTLY TESTED | variable accepts `OWN_GTID` (default `OFF`); the OK-packet contents are only visible to a driver, COULD NOT TEST |

## queues-streams.mdx, pattern-async-jobs.mdx, llm-gateway.mdx, url-shortener.mdx (MySQL)

| Claim | Result | Observed |
|---|---|---|
| INSERT IGNORE on duplicate: 0 rows | VERIFIED | `ROW_COUNT()=0` |
| INSERT IGNORE only swallows duplicates | CORRECTED (lesson recommended it for dedup) | `CHAR(36)` with a 40-char value: plain INSERT `ERROR 1406 Data too long`; IGNORE inserted `012345678901234567890123456789012345` (truncated, row_count 1). `NULL` into NOT NULL: plain `ERROR 1048`; IGNORE inserted `''` (row_count 1). Omitted NOT NULL column without default: plain `ERROR 1364`; IGNORE inserted `''`. |
| `ON DUPLICATE KEY UPDATE col = col` is safer | VERIFIED | truncation `ERROR 1406`, NULL `ERROR 1048` still raised; new row `ROW_COUNT()=1`; duplicate `0`. Same on `usage_event` (1 then 0) and on `jobs` with both unique keys (1, 0, 0) |
| `CLIENT_FOUND_ROWS` makes a no-op ODKU report 1 | COULD NOT TEST (no driver); documented MySQL behaviour, added as a one-line caveat |
| Lessons now use `INSERT … ON DUPLICATE KEY UPDATE x = x` in queues-streams (code, diagram, quiz), pattern-async-jobs (effects marker, quiz, scheduler tick), llm-gateway (ledger) | CORRECTED | caveat added in queues-streams |
| Claim query `ORDER BY priority DESC, created_at LIMIT 1 FOR UPDATE SKIP LOCKED` with `ix_claim(status, run_after, priority)` gives each worker a different row | CORRECTED | EXPLAIN: `Using index condition; Using filesort`. Worker 1 got id 1 and held X locks on all 4 queued rows (`data_locks`); worker 2 got an **empty** result. Same for the quiz query (`ORDER BY created_at`). With `ORDER BY status, run_after` (index order, no filesort): 2 record locks, S1=1, S2=2. Also `status='queued' ORDER BY run_after`: S1=1, S2=2. Code, quiz and paragraph changed |
| Reminders `LIMIT 100 FOR UPDATE SKIP LOCKED` table and query | VERIFIED | parses and runs |
| `jobs` and `effects` / `execution_key` DDL | VERIFIED | created without error |
| Case-insensitive default collation trap | VERIFIED | server default `utf8mb4_0900_ai_ci`: `aZ3` then `az3` gives `ERROR 1062`; with `ascii_bin` both rows accepted |
| `LAST_INSERT_ID(expr)` block reservation | VERIFIED | `UPDATE … SET next_id = LAST_INSERT_ID(next_id + 10000)`: `LAST_INSERT_ID()-10000` = 0, then 10000; row ends at 20000 |
| Transaction state after 1062 | VERIFIED | inside `BEGIN`, duplicate insert raised 1062, a following insert and `COMMIT` both worked (both rows present): the transaction stays open |
| Five-ways table | CORRECTED (one row) | IGNORE: `ROW_COUNT()=0` so the conflict IS visible as a count (old text said you cannot tell); ODKU: overwrote `long_url` (row_count 2); REPLACE: replaced row (row_count 2). Table row now says IGNORE also hides truncation/NULL errors |

## llm-gateway.mdx, pattern-fanout.mdx, feature-flags.mdx, pattern-realtime.mdx (Redis 7.4.11)

| Claim | Result | Observed |
|---|---|---|
| Reservation Lua script (TIME, HMGET, HSET, EXPIRE) | VERIFIED | first call cap 1.5M cost 2500: `1 0`, tokens 1497500; cost 99,999,999: `0 657` |
| `HINCRBYFLOAT` refund | VERIFIED | `1497500` + 700 = `1498200` |
| Refund after key expiry recreates key with only `tokens` | CORRECTED (detail) | `PEXPIRE 1`, key gone, `HINCRBYFLOAT … 500`: hash has only `tokens=500`, `TTL` = `-1` (no expiry). Next script run: tokens 400 (starts from 500, not full), TTL set again. Text now says no TTL and bucket restarts from the refunded amount |
| `HINCRBYFLOAT` on a non-hash | VERIFIED | `WRONGTYPE` |
| Debt (negative tokens) refills | VERIFIED | `tokens -450, ts 1`: admitted |
| `TIME` then write inside a script | VERIFIED | works on 7.4 and on 6.2.24 |
| `SET key 1 NX EX 86400` dedup | VERIFIED | first `OK`, second nil, `TTL 86400` |
| ZADD same member same score is a no-op | VERIFIED | second ZADD returns `0`; ZCARD unchanged |
| `ZREMRANGEBYRANK tl:42 0 -801` keeps newest 800; empty when N <= 800 | VERIFIED | 805 entries: removed 5, ZCARD 800, oldest score 1791457200006; 1-entry set: removes 0 |
| `ZRANGE key +inf -inf BYSCORE REV LIMIT 0 25 WITHSCORES` newest first; cursor form with inclusive bound | VERIFIED | newest score 1791457200805 first; bound `…803` returned 803, 802, 801 (inclusive) |
| Needs Redis 6.2+ | VERIFIED on 6.2.24 | `ZRANGE … BYSCORE REV LIMIT` works on 6.2; the redis:5 image was not run, so "fails before 6.2" is COULD NOT TEST |
| 64-bit post id as score | VERIFIED (for that value) | `ZSCORE` returned 1840221933092847616; scores are doubles (lesson says use ms time), general precision loss not exercised |
| feature-flags.mdx, pattern-realtime.mdx | NO REDIS COMMANDS TESTED | feature-flags has none; pattern-realtime only names Redis structures and counts writes |
