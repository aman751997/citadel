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
